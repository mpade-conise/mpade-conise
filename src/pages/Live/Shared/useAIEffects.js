
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";

/*
 * MediaPipe WASM files.
 *
 * These are loaded from Google's CDN so the application does not
 * need to bundle the large WASM files into the Vite build.
 */
const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const SEGMENTER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/" +
  "selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export function useAIEffects({
  effect = "none",
  intensity = 70,
  enabled = true,
} = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  /*
   * MediaPipe instance.
   */
  const segmenterRef = useRef(null);

  /*
   * Rendering elements used internally by the processor.
   */
  const sourceVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  /*
   * Output MediaStream.
   */
  const outputStreamRef = useRef(null);
  const outputTrackRef = useRef(null);

  /*
   * Original camera stream.
   */
  const sourceStreamRef = useRef(null);

  /*
   * Current processing state.
   */
  const effectRef = useRef(effect);
  const intensityRef = useRef(intensity);
  const enabledRef = useRef(enabled);

  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  /*
   * Keep refs synchronized without recreating the processor.
   */
  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /*
   * Initialize MediaPipe ImageSegmenter.
   */
  const initializeSegmenter = useCallback(async () => {
    if (segmenterRef.current) {
      return segmenterRef.current;
    }

    if (initializingRef.current) {
      return null;
    }

    initializingRef.current = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        MEDIAPIPE_WASM_URL
      );

      const segmenter = await ImageSegmenter.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: SEGMENTER_MODEL_URL,
            delegate: "GPU",
          },

          runningMode: "VIDEO",

          outputCategoryMask: true,
          outputConfidenceMasks: false,
        }
      );

      if (!mountedRef.current) {
        segmenter.close();
        return null;
      }

      segmenterRef.current = segmenter;
      setIsReady(true);

      return segmenter;
    } catch (error) {
      console.error(
        "[useAIEffects] MediaPipe initialization failed:",
        error
      );

      setIsReady(false);

      throw error;
    } finally {
      initializingRef.current = false;
    }
  }, []);

  /*
   * Create an internal video element.
   */
  const createSourceVideo = useCallback(() => {
    if (sourceVideoRef.current) {
      return sourceVideoRef.current;
    }

    const video = document.createElement("video");

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    video.style.position = "fixed";
    video.style.left = "-10000px";
    video.style.top = "-10000px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";

    document.body.appendChild(video);

    sourceVideoRef.current = video;

    return video;
  }, []);

  /*
   * Create the internal processing canvas.
   */
  const createCanvas = useCallback(() => {
    if (canvasRef.current) {
      return canvasRef.current;
    }

    const canvas = document.createElement("canvas");

    canvas.width = 1280;
    canvas.height = 720;

    canvasRef.current = canvas;

    return canvas;
  }, []);

  /*
   * Create a canvas-backed MediaStream.
   */
  const createOutputStream = useCallback(() => {
    const canvas = createCanvas();

    if (!outputStreamRef.current) {
      const stream = canvas.captureStream(30);

      outputStreamRef.current = stream;

      const [track] = stream.getVideoTracks();

      outputTrackRef.current = track || null;
    }

    return outputStreamRef.current;
  }, [createCanvas]);

  /*
   * Copy audio tracks from the original camera stream.
   *
   * The AI processor works on video, but livestream audio must remain
   * available.
   */
  const copyAudioTracks = useCallback((sourceStream) => {
    const outputStream = outputStreamRef.current;

    if (!outputStream || !sourceStream) {
      return;
    }

    outputStream
      .getAudioTracks()
      .forEach((track) => {
        outputStream.removeTrack(track);
      });

    sourceStream.getAudioTracks().forEach((track) => {
      outputStream.addTrack(track);
    });
  }, []);

  /*
   * Draw the original camera frame.
   */
  const drawOriginalFrame = useCallback(
    (ctx, video, width, height) => {
      ctx.save();

      ctx.clearRect(0, 0, width, height);

      ctx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      ctx.restore();
    },
    []
  );

  /*
   * Apply background blur.
   *
   * The segmentation mask identifies the person. The original
   * image is drawn first, then the background is blurred underneath
   * the person.
   */
  const drawBackgroundBlur = useCallback(
    (ctx, video, result, width, height) => {
      if (!result?.categoryMask) {
        drawOriginalFrame(
          ctx,
          video,
          width,
          height
        );

        return;
      }

      const mask = result.categoryMask;

      /*
       * Draw the blurred background.
       */
      ctx.save();

      ctx.filter = `blur(${Math.max(
        2,
        intensityRef.current / 8
      )}px)`;

      ctx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      ctx.restore();

      /*
       * Keep the person sharp.
       *
       * destination-in uses the segmentation mask as the alpha
       * channel for the sharp foreground.
       */
      const maskCanvas = document.createElement("canvas");

      maskCanvas.width = width;
      maskCanvas.height = height;

      const maskCtx = maskCanvas.getContext("2d");

      if (!maskCtx) {
        return;
      }

      const maskData = mask.getAsUint8Array();

      const maskImage = maskCtx.createImageData(
        width,
        height
      );

      const totalPixels = width * height;

      for (let i = 0; i < totalPixels; i++) {
        const value = maskData[i] > 0 ? 255 : 0;

        const offset = i * 4;

        maskImage.data[offset] = 255;
        maskImage.data[offset + 1] = 255;
        maskImage.data[offset + 2] = 255;
        maskImage.data[offset + 3] = value;
      }

      maskCtx.putImageData(maskImage, 0, 0);

      ctx.save();

      ctx.globalCompositeOperation =
        "destination-over";

      ctx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      ctx.globalCompositeOperation =
        "destination-in";

      ctx.drawImage(
        maskCanvas,
        0,
        0,
        width,
        height
      );

      ctx.restore();
    },
    [drawOriginalFrame]
  );

  /*
   * Draw background removal.
   *
   * The person remains visible while the background becomes
   * transparent.
   */
  const drawBackgroundRemoval = useCallback(
    (ctx, video, result, width, height) => {
      if (!result?.categoryMask) {
        drawOriginalFrame(
          ctx,
          video,
          width,
          height
        );

        return;
      }

      const mask = result.categoryMask;
      const maskData = mask.getAsUint8Array();

      const frameCanvas = document.createElement(
        "canvas"
      );

      frameCanvas.width = width;
      frameCanvas.height = height;

      const frameCtx =
        frameCanvas.getContext("2d");

      if (!frameCtx) {
        return;
      }

      frameCtx.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      const imageData =
        frameCtx.getImageData(
          0,
          0,
          width,
          height
        );

      const totalPixels = width * height;

      for (let i = 0; i < totalPixels; i++) {
        const maskValue = maskData[i];

        const offset = i * 4;

        /*
         * Gradually control transparency using intensity.
         */
        const alpha =
          (maskValue / 255) *
          Math.min(
            255,
            255 * (intensityRef.current / 70)
          );

        imageData.data[offset + 3] =
          Math.min(255, alpha);
      }

      frameCtx.putImageData(
        imageData,
        0,
        0
      );

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        frameCanvas,
        0,
        0,
        width,
        height
      );
    },
    [drawOriginalFrame]
  );

  /*
   * Face Focus currently uses the segmentation result as a
   * lightweight subject-focus effect.
   *
   * A dedicated FaceDetector can be added later without changing
   * the public hook API.
   */
  const drawFaceFocus = useCallback(
    (ctx, video, result, width, height) => {
      drawOriginalFrame(
        ctx,
        video,
        width,
        height
      );

      /*
       * Subtle vignette around the edges.
       */
      const strength =
        Math.max(0, intensityRef.current) / 100;

      const gradient =
        ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.2,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.7
        );

      gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
      );

      gradient.addColorStop(
        0.65,
        "rgba(0,0,0,0)"
      );

      gradient.addColorStop(
        1,
        `rgba(0,0,0,${0.45 * strength})`
      );

      ctx.save();

      ctx.fillStyle = gradient;

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      ctx.restore();
    },
    [drawOriginalFrame]
  );

  /*
   * Process one video frame.
   */
  const processFrame = useCallback(
    async (timestamp) => {
      const video = sourceVideoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        return;
      }

      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

        return;
      }

      const width =
        video.videoWidth || 1280;

      const height =
        video.videoHeight || 720;

      if (
        canvas.width !== width ||
        canvas.height !== height
      ) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx =
        canvas.getContext("2d", {
          alpha: true,
        });

      if (!ctx) {
        return;
      }

      try {
        const currentEffect =
          effectRef.current;

        /*
         * No AI effect means simply copy the camera.
         */
        if (
          !enabledRef.current ||
          currentEffect === "none"
        ) {
          drawOriginalFrame(
            ctx,
            video,
            width,
            height
          );
        } else {
          const segmenter =
            segmenterRef.current;

          if (!segmenter) {
            drawOriginalFrame(
              ctx,
              video,
              width,
              height
            );
          } else {
            const result =
              segmenter.segmentForVideo(
                video,
                timestamp
              );

            if (
              currentEffect ===
              "background-blur"
            ) {
              drawBackgroundBlur(
                ctx,
                video,
                result,
                width,
                height
              );
            } else if (
              currentEffect ===
              "background-remove"
            ) {
              drawBackgroundRemoval(
                ctx,
                video,
                result,
                width,
                height
              );
            } else if (
              currentEffect ===
              "face-focus"
            ) {
              drawFaceFocus(
                ctx,
                video,
                result,
                width,
                height
              );
            } else {
              drawOriginalFrame(
                ctx,
                video,
                width,
                height
              );
            }

            result?.categoryMask?.close?.();
          }
        }
      } catch (error) {
        console.error(
          "[useAIEffects] Frame processing error:",
          error
        );

        drawOriginalFrame(
          ctx,
          video,
          width,
          height
        );
      }

      if (mountedRef.current) {
        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );
      }
    },
    [
      drawOriginalFrame,
      drawBackgroundBlur,
      drawBackgroundRemoval,
      drawFaceFocus,
    ]
  );

  /*
   * Start processing.
   */
  const startProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );
    }

    animationFrameRef.current =
      requestAnimationFrame(
        processFrame
      );

    setIsProcessing(true);
  }, [processFrame]);

  /*
   * Stop processing.
   */
  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    setIsProcessing(false);
  }, []);

  /*
   * Attach a MediaStream to the processor.
   */
  const attachStream = useCallback(
    async (stream) => {
      if (!stream) {
        throw new Error(
          "No camera stream was provided."
        );
      }

      sourceStreamRef.current = stream;

      const video =
        createSourceVideo();

      const outputStream =
        createOutputStream();

      copyAudioTracks(stream);

      /*
       * Avoid repeatedly assigning the same stream.
       */
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      /*
       * Wait for metadata before processing.
       */
      if (video.readyState < 1) {
        await new Promise(
          (resolve, reject) => {
            const timeout =
              setTimeout(() => {
                reject(
                  new Error(
                    "Camera video did not become ready."
                  )
                );
              }, 10000);

            const handleLoaded = () => {
              clearTimeout(timeout);
              resolve();
            };

            const handleError = () => {
              clearTimeout(timeout);
              reject(
                new Error(
                  "Unable to load camera video."
                )
              );
            };

            video.addEventListener(
              "loadedmetadata",
              handleLoaded,
              { once: true }
            );

            video.addEventListener(
              "error",
              handleError,
              { once: true }
            );
          }
        );
      }

      await video.play().catch(() => {});

      /*
       * AI segmentation is only needed for effects that
       * actually require it.
       */
      if (
        enabledRef.current &&
        effectRef.current !== "none"
      ) {
        await initializeSegmenter();
      }

      if (!mountedRef.current) {
        return null;
      }

      startProcessing();

      return outputStream;
    },
    [
      createSourceVideo,
      createOutputStream,
      copyAudioTracks,
      initializeSegmenter,
      startProcessing,
    ]
  );

  /*
   * Return the processed MediaStream.
   */
  const getProcessedStream =
    useCallback(() => {
      if (!enabledRef.current) {
        return sourceStreamRef.current;
      }

      return (
        outputStreamRef.current ||
        sourceStreamRef.current ||
        null
      );
    }, []);

  /*
   * Return only the processed video track.
   */
  const getProcessedVideoTrack =
    useCallback(() => {
      if (!enabledRef.current) {
        return (
          sourceStreamRef.current
            ?.getVideoTracks()
            ?.at(0) || null
        );
      }

      return (
        outputTrackRef.current ||
        outputStreamRef.current
          ?.getVideoTracks()
          ?.at(0) ||
        sourceStreamRef.current
          ?.getVideoTracks()
          ?.at(0) ||
        null
      );
    }, []);

  /*
   * Destroy all resources.
   */
  const destroy = useCallback(() => {
    stopProcessing();

    if (sourceVideoRef.current) {
      try {
        sourceVideoRef.current.pause();
      } catch {
        // Ignore cleanup errors.
      }

      sourceVideoRef.current.srcObject =
        null;

      sourceVideoRef.current.remove();

      sourceVideoRef.current = null;
    }

    if (segmenterRef.current) {
      try {
        segmenterRef.current.close();
      } catch {
        // Ignore MediaPipe cleanup errors.
      }

      segmenterRef.current = null;
    }

    if (outputStreamRef.current) {
      outputStreamRef.current
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore cleanup errors.
          }
        });

      outputStreamRef.current = null;
    }

    outputTrackRef.current = null;
    sourceStreamRef.current = null;

    setIsReady(false);
  }, [stopProcessing]);

  /*
   * If the effect changes from "none" to an AI effect,
   * initialize MediaPipe automatically.
   */
  useEffect(() => {
    if (
      !enabled ||
      effect === "none" ||
      !sourceStreamRef.current
    ) {
      return;
    }

    initializeSegmenter().catch((error) => {
      console.error(
        "[useAIEffects] Unable to enable effect:",
        error
      );
    });
  }, [
    effect,
    enabled,
    initializeSegmenter,
  ]);

  /*
   * Keep the output audio synchronized with the source.
   */
  useEffect(() => {
    if (!sourceStreamRef.current) {
      return;
    }

    copyAudioTracks(
      sourceStreamRef.current
    );
  }, [streamAudioTracksKey(sourceStreamRef.current), copyAudioTracks]);

  /*
   * Global cleanup.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      destroy();
    };
  }, [destroy]);

  return {
    attachStream,
    getProcessedStream,
    getProcessedVideoTrack,
    destroy,
    isProcessing,
    isReady,
  };
}

/*
 * Produces a stable dependency value for the source audio tracks.
 *
 * This helper intentionally does not expose the actual MediaStream.
 */
function streamAudioTracksKey(stream) {
  if (!stream) {
    return "no-stream";
  }

  return stream
    .getAudioTracks()
    .map((track) => track.id)
    .join("|");
}
