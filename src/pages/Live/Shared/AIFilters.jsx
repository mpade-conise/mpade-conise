
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  FilesetResolver,
  ImageSegmenter
} from "@mediapipe/tasks-vision";

import {
  Sparkles,
  Wand2,
  Camera,
  CameraOff,
  SlidersHorizontal,
  Zap,
  CircleCheck,
  CircleAlert,
  Loader2,
  RefreshCw,
  ChevronDown,
  Eye,
  EyeOff,
  ScanFace,
  Layers,
  Maximize2
} from "lucide-react";

/* =========================================================
   MEDIA PIPE CONFIGURATION
   ========================================================= */

const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const SELFIE_SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

/* =========================================================
   EFFECT DEFINITIONS
   ========================================================= */

const EFFECTS = [
  {
    id: "none",
    name: "Original",
    description: "Natural camera",
    icon: Eye,
    color: "cyan",
    requiresAI: false
  },
  {
    id: "background-blur",
    name: "Blur",
    description: "Soft background",
    icon: Layers,
    color: "violet",
    requiresAI: true
  },
  {
    id: "background-remove",
    name: "Cutout",
    description: "Remove background",
    icon: Maximize2,
    color: "fuchsia",
    requiresAI: true
  },
  {
    id: "face-focus",
    name: "Focus",
    description: "Cinematic focus",
    icon: ScanFace,
    color: "emerald",
    requiresAI: false
  }
];

/* =========================================================
   SMALL UTILITY
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

/* =========================================================
   SELF-CONTAINED AI EFFECTS COMPONENT
   ========================================================= */

const AIEffects = ({
  stream = null,
  videoRef = null,
  onProcessedStream = null,
  onProcessedTrack = null,
  className = "",
  compact = false
}) => {
  /* =======================================================
     STATE
     ======================================================= */

  const [enabled, setEnabled] = useState(true);
  const [effect, setEffect] = useState("none");
  const [intensity, setIntensity] = useState(55);

  const [engineState, setEngineState] =
    useState("idle");

  const [error, setError] = useState("");

  const [showAdvanced, setShowAdvanced] =
    useState(false);

  const [previewOpen, setPreviewOpen] =
    useState(true);

  const [fps, setFps] = useState(0);

  /* =======================================================
     REFS
     ======================================================= */

  const mountedRef = useRef(true);

  const segmenterRef = useRef(null);

  const sourceStreamRef = useRef(null);

  const sourceVideoRef = useRef(null);

  const canvasRef = useRef(null);

  const canvasContextRef = useRef(null);

  const maskCanvasRef = useRef(null);

  const maskContextRef = useRef(null);

  const outputStreamRef = useRef(null);

  const outputTrackRef = useRef(null);

  const animationFrameRef = useRef(null);

  const lastFrameTimeRef = useRef(0);

  const fpsCounterRef = useRef({
    frames: 0,
    time: 0
  });

  const effectRef = useRef(effect);

  const intensityRef =
    useRef(intensity);

  const enabledRef =
    useRef(enabled);

  const processingRef =
    useRef(false);

  const initializingRef =
    useRef(false);

  const previewVideoRef =
    useRef(null);

  /* =======================================================
     KEEP EFFECT REFS SYNCHRONIZED
     ======================================================= */

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /* =======================================================
     GET SOURCE STREAM
     ======================================================= */

  const getSourceStream = useCallback(() => {
    if (stream) {
      return stream;
    }

    if (
      videoRef &&
      videoRef.current &&
      videoRef.current.srcObject
    ) {
      return videoRef.current.srcObject;
    }

    return null;
  }, [stream, videoRef]);

  /* =======================================================
     INITIALIZE MEDIA PIPE
     ======================================================= */

  const initializeAI = useCallback(
    async () => {
      if (segmenterRef.current) {
        return segmenterRef.current;
      }

      if (initializingRef.current) {
        return null;
      }

      initializingRef.current = true;

      try {
        setError("");
        setEngineState("loading");

        const vision =
          await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM
          );

        if (!mountedRef.current) {
          return null;
        }

        const segmenter =
          await ImageSegmenter.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  SELFIE_SEGMENTER_MODEL,
                delegate: "GPU"
              },

              runningMode: "VIDEO",

              outputCategoryMask: true,

              outputConfidenceMasks: false
            }
          );

        if (!mountedRef.current) {
          segmenter.close();
          return null;
        }

        segmenterRef.current =
          segmenter;

        setEngineState("ready");

        return segmenter;
      } catch (err) {
        console.error(
          "[AIEffects] MediaPipe initialization failed:",
          err
        );

        setEngineState("error");

        setError(
          err?.message ||
            "The AI engine could not be initialized."
        );

        return null;
      } finally {
        initializingRef.current = false;
      }
    },
    []
  );

  /* =======================================================
     CREATE SOURCE VIDEO
     ======================================================= */

  const createSourceVideo =
    useCallback(
      async source => {
        if (!source) {
          throw new Error(
            "No camera stream is available."
          );
        }

        /*
         * Reuse existing source video when possible.
         */

        if (
          sourceVideoRef.current &&
          sourceVideoRef.current.srcObject ===
            source
        ) {
          return sourceVideoRef.current;
        }

        const video =
          document.createElement("video");

        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        video.srcObject = source;

        await new Promise(
          (resolve, reject) => {
            let finished = false;

            const cleanup = () => {
              video.removeEventListener(
                "loadedmetadata",
                handleLoaded
              );

              video.removeEventListener(
                "error",
                handleError
              );
            };

            const handleLoaded = () => {
              if (finished) return;

              finished = true;

              cleanup();

              resolve();
            };

            const handleError = () => {
              if (finished) return;

              finished = true;

              cleanup();

              reject(
                new Error(
                  "Unable to load the camera stream."
                )
              );
            };

            video.addEventListener(
              "loadedmetadata",
              handleLoaded
            );

            video.addEventListener(
              "error",
              handleError
            );

            /*
             * If metadata is already available.
             */

            if (
              video.readyState >= 1
            ) {
              handleLoaded();
            }
          }
        );

        await video.play().catch(() => {});

        sourceVideoRef.current =
          video;

        return video;
      },
      []
    );

  /* =======================================================
     CREATE CANVASES
     ======================================================= */

  const prepareCanvases =
    useCallback(
      (width, height) => {
        if (!canvasRef.current) {
          canvasRef.current =
            document.createElement(
              "canvas"
            );
        }

        canvasRef.current.width =
          width;

        canvasRef.current.height =
          height;

        canvasContextRef.current =
          canvasRef.current.getContext(
            "2d",
            {
              alpha: true,
              desynchronized: true
            }
          );

        if (!maskCanvasRef.current) {
          maskCanvasRef.current =
            document.createElement(
              "canvas"
            );
        }

        maskCanvasRef.current.width =
          width;

        maskCanvasRef.current.height =
          height;

        maskContextRef.current =
          maskCanvasRef.current.getContext(
            "2d",
            {
              alpha: true
            }
          );
      },
      []
    );

  /* =======================================================
     CREATE OUTPUT STREAM
     ======================================================= */

  const createOutputStream =
    useCallback(() => {
      if (!canvasRef.current) {
        return null;
      }

      /*
       * Stop the previous generated video
       * track before creating another one.
       */

      if (outputTrackRef.current) {
        try {
          outputTrackRef.current.stop();
        } catch {
          // Already stopped.
        }
      }

      const output =
        canvasRef.current.captureStream(
          30
        );

      outputStreamRef.current =
        output;

      outputTrackRef.current =
        output.getVideoTracks()[0] ||
        null;

      /*
       * Preserve microphone/audio.
       */

      const source =
        sourceStreamRef.current;

      if (source) {
        source
          .getAudioTracks()
          .forEach(track => {
            try {
              output.addTrack(track);
            } catch {
              // Track may already exist.
            }
          });
      }

      return output;
    }, []);

  /* =======================================================
     DRAW ORIGINAL
     ======================================================= */

  const drawOriginal =
    useCallback(
      (
        video,
        ctx,
        width,
        height
      ) => {
        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        ctx.drawImage(
          video,
          0,
          0,
          width,
          height
        );
      },
      []
    );

  /* =======================================================
     BUILD SEGMENTATION MASK
     ======================================================= */

  const buildMask =
    useCallback(
      (
        result,
        width,
        height
      ) => {
        const mask =
          result?.categoryMask;

        if (!mask) {
          return null;
        }

        const maskWidth =
          mask.width || width;

        const maskHeight =
          mask.height || height;

        const data =
          mask.getAsUint8Array();

        if (!data) {
          return null;
        }

        const image =
          new ImageData(
            width,
            height
          );

        /*
         * MediaPipe's mask can have a
         * different resolution than the
         * camera frame. Map it into the
         * output resolution.
         */

        for (
          let y = 0;
          y < height;
          y++
        ) {
          const sourceY =
            Math.floor(
              (y / height) *
                maskHeight
            );

          for (
            let x = 0;
            x < width;
            x++
          ) {
            const sourceX =
              Math.floor(
                (x / width) *
                  maskWidth
              );

            const sourceIndex =
              sourceY *
                maskWidth +
              sourceX;

            const value =
              data[sourceIndex] ||
              0;

            const outputIndex =
              (y * width + x) *
              4;

            /*
             * Selfie segmenter:
             * non-zero values represent
             * the foreground/person.
             */

            const alpha =
              value > 0 ? 255 : 0;

            image.data[
              outputIndex
            ] = 255;

            image.data[
              outputIndex + 1
            ] = 255;

            image.data[
              outputIndex + 2
            ] = 255;

            image.data[
              outputIndex + 3
            ] = alpha;
          }
        }

        return image;
      },
      []
    );

  /* =======================================================
     BACKGROUND BLUR
     ======================================================= */

  const drawBackgroundBlur =
    useCallback(
      (
        video,
        ctx,
        maskCtx,
        result,
        width,
        height
      ) => {
        const mask =
          buildMask(
            result,
            width,
            height
          );

        if (!mask) {
          drawOriginal(
            video,
            ctx,
            width,
            height
          );

          return;
        }

        /*
         * Render the blurred frame
         * first.
         */

        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        const blur =
          3 +
          (intensityRef.current /
            100) *
            22;

        ctx.save();

        ctx.filter =
          `blur(${blur}px)`;

        ctx.drawImage(
          video,
          -blur,
          -blur,
          width +
            blur * 2,
          height +
            blur * 2
        );

        ctx.restore();

        /*
         * Save blurred background.
         */

        const backgroundCanvas =
          document.createElement(
            "canvas"
          );

        backgroundCanvas.width =
          width;

        backgroundCanvas.height =
          height;

        const backgroundCtx =
          backgroundCanvas.getContext(
            "2d"
          );

        backgroundCtx.drawImage(
          ctx.canvas,
          0,
          0
        );

        /*
         * Draw sharp video.
         */

        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        ctx.drawImage(
          video,
          0,
          0,
          width,
          height
        );

        /*
         * Keep foreground only.
         */

        maskCtx.clearRect(
          0,
          0,
          width,
          height
        );

        maskCtx.putImageData(
          mask,
          0,
          0
        );

        ctx.globalCompositeOperation =
          "destination-in";

        ctx.drawImage(
          maskCanvasRef.current,
          0,
          0,
          width,
          height
        );

        /*
         * Put blurred background
         * behind the sharp subject.
         */

        ctx.globalCompositeOperation =
          "destination-over";

        ctx.drawImage(
          backgroundCanvas,
          0,
          0
        );

        ctx.globalCompositeOperation =
          "source-over";
      },
      [
        buildMask,
        drawOriginal
      ]
    );

  /* =======================================================
     BACKGROUND REMOVAL
     ======================================================= */

  const drawBackgroundRemoval =
    useCallback(
      (
        video,
        ctx,
        maskCtx,
        result,
        width,
        height
      ) => {
        const mask =
          buildMask(
            result,
            width,
            height
          );

        if (!mask) {
          drawOriginal(
            video,
            ctx,
            width,
            height
          );

          return;
        }

        /*
         * Draw the camera.
         */

        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        ctx.drawImage(
          video,
          0,
          0,
          width,
          height
        );

        /*
         * Apply the segmentation
         * mask as alpha.
         */

        maskCtx.clearRect(
          0,
          0,
          width,
          height
        );

        maskCtx.putImageData(
          mask,
          0,
          0
        );

        ctx.globalCompositeOperation =
          "destination-in";

        ctx.drawImage(
          maskCanvasRef.current,
          0,
          0,
          width,
          height
        );

        ctx.globalCompositeOperation =
          "source-over";
      },
      [
        buildMask,
        drawOriginal
      ]
    );

  /* =======================================================
     FACE FOCUS
     ======================================================= */

  const drawFaceFocus =
    useCallback(
      (
        video,
        ctx,
        width,
        height
      ) => {
        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        ctx.drawImage(
          video,
          0,
          0,
          width,
          height
        );

        /*
         * Cinematic vignette.
         *
         * This effect does not claim
         * to detect the face. Actual
         * face detection can be added
         * later without changing the UI.
         */

        const strength =
          0.08 +
          (intensityRef.current /
            100) *
            0.42;

        const gradient =
          ctx.createRadialGradient(
            width * 0.5,
            height * 0.42,
            Math.min(
              width,
              height
            ) * 0.12,
            width * 0.5,
            height * 0.5,
            Math.max(
              width,
              height
            ) * 0.75
          );

        gradient.addColorStop(
          0,
          "rgba(0,0,0,0)"
        );

        gradient.addColorStop(
          0.55,
          "rgba(0,0,0,0.02)"
        );

        gradient.addColorStop(
          1,
          `rgba(0,0,0,${strength})`
        );

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          0,
          0,
          width,
          height
        );
      },
      []
    );

  /* =======================================================
     PROCESS ONE FRAME
     ======================================================= */

  const processFrame =
    useCallback(
      timestamp => {
        if (
          !processingRef.current ||
          !mountedRef.current
        ) {
          return;
        }

        const video =
          sourceVideoRef.current;

        const canvas =
          canvasRef.current;

        const ctx =
          canvasContextRef.current;

        const maskCtx =
          maskContextRef.current;

        if (
          !video ||
          !canvas ||
          !ctx ||
          video.readyState < 2
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          return;
        }

        const width =
          video.videoWidth;

        const height =
          video.videoHeight;

        if (!width || !height) {
          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          return;
        }

        if (
          canvas.width !== width ||
          canvas.height !== height
        ) {
          prepareCanvases(
            width,
            height
          );
        }

        try {
          const activeEffect =
            enabledRef.current
              ? effectRef.current
              : "none";

          /*
           * No AI required.
           */

          if (
            activeEffect === "none"
          ) {
            drawOriginal(
              video,
              ctx,
              width,
              height
            );
          }

          /*
           * Face focus.
           */

          else if (
            activeEffect ===
            "face-focus"
          ) {
            drawFaceFocus(
              video,
              ctx,
              width,
              height
            );
          }

          /*
           * Segmentation effects.
           */

          else {
            const segmenter =
              segmenterRef.current;

            if (!segmenter) {
              drawOriginal(
                video,
                ctx,
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
                activeEffect ===
                "background-blur"
              ) {
                drawBackgroundBlur(
                  video,
                  ctx,
                  maskCtx,
                  result,
                  width,
                  height
                );
              }

              if (
                activeEffect ===
                "background-remove"
              ) {
                drawBackgroundRemoval(
                  video,
                  ctx,
                  maskCtx,
                  result,
                  width,
                  height
                );
              }

              /*
               * Release MediaPipe result.
               */

              result?.categoryMask?.close?.();
            }
          }

          /*
           * FPS counter.
           */

          const now =
            performance.now();

          fpsCounterRef.current.frames++;

          if (
            !fpsCounterRef.current.time
          ) {
            fpsCounterRef.current.time =
              now;
          }

          if (
            now -
              fpsCounterRef.current
                .time >=
            1000
          ) {
            const currentFPS =
              fpsCounterRef.current
                .frames;

            setFps(
              Math.round(
                currentFPS
              )
            );

            fpsCounterRef.current = {
              frames: 0,
              time: now
            };
          }
        } catch (err) {
          console.warn(
            "[AIEffects] Frame processing error:",
            err
          );
        }

        lastFrameTimeRef.current =
          timestamp;

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );
      },
      [
        drawOriginal,
        drawFaceFocus,
        drawBackgroundBlur,
        drawBackgroundRemoval,
        prepareCanvases
      ]
    );

  /* =======================================================
     START PROCESSING
     ======================================================= */

  const startProcessing =
    useCallback(
      async source => {
        if (
          processingRef.current
        ) {
          return outputStreamRef.current;
        }

        const video =
          await createSourceVideo(
            source
          );

        if (!video) {
          throw new Error(
            "Camera video is unavailable."
          );
        }

        const width =
          video.videoWidth || 1280;

        const height =
          video.videoHeight || 720;

        prepareCanvases(
          width,
          height
        );

        const output =
          createOutputStream();

        if (!output) {
          throw new Error(
            "Your browser does not support canvas video processing."
          );
        }

        processingRef.current =
          true;

        setEngineState(
          "processing"
        );

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

        /*
         * Notify StreamDashboard.
         */

        if (
          onProcessedStream
        ) {
          onProcessedStream(
            output
          );
        }

        if (
          onProcessedTrack &&
          outputTrackRef.current
        ) {
          onProcessedTrack(
            outputTrackRef.current,
            output
          );
        }

        return output;
      },
      [
        createSourceVideo,
        prepareCanvases,
        createOutputStream,
        processFrame,
        onProcessedStream,
        onProcessedTrack
      ]
    );

  /* =======================================================
     STOP PROCESSING
     ======================================================= */

  const stopProcessing =
    useCallback(() => {
      processingRef.current =
        false;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }

      setFps(0);

      if (
        segmenterRef.current
      ) {
        setEngineState(
          "ready"
        );
      }
    }, []);

  /* =======================================================
     ATTACH STREAM
     ======================================================= */

  const attachStream =
    useCallback(
      async source => {
        if (!source) {
          setError(
            "No camera stream is available."
          );

          return null;
        }

        try {
          setError("");

          sourceStreamRef.current =
            source;

          /*
           * AI segmentation is only
           * necessary for segmentation
           * effects.
           */

          if (
            effectRef.current ===
              "background-blur" ||
            effectRef.current ===
              "background-remove"
          ) {
            await initializeAI();
          }

          const output =
            await startProcessing(
              source
            );

          return output;
        } catch (err) {
          console.error(
            "[AIEffects] Stream attachment failed:",
            err
          );

          setError(
            err?.message ||
              "Unable to start AI processing."
          );

          setEngineState(
            "error"
          );

          return null;
        }
      },
      [
        initializeAI,
        startProcessing
      ]
    );

  /* =======================================================
     RESTART ENGINE
     ======================================================= */

  const restart =
    useCallback(
      async () => {
        const source =
          getSourceStream();

        stopProcessing();

        if (
          source
        ) {
          await attachStream(
            source
          );
        }
      },
      [
        getSourceStream,
        stopProcessing,
        attachStream
      ]
    );

  /* =======================================================
     EFFECT CHANGE
     ======================================================= */

  const handleEffectChange =
    useCallback(
      async nextEffect => {
        setEffect(
          nextEffect
        );

        effectRef.current =
          nextEffect;

        /*
         * Load MediaPipe only when
         * an AI segmentation effect
         * is selected.
         */

        if (
          nextEffect ===
            "background-blur" ||
          nextEffect ===
            "background-remove"
        ) {
          await initializeAI();
        }
      },
      [initializeAI]
    );

  /* =======================================================
     ENABLE/DISABLE
     ======================================================= */

  const handleEnabled =
    useCallback(
      value => {
        setEnabled(value);

        enabledRef.current =
          value;
      },
      []
    );

  /* =======================================================
     SOURCE STREAM CHANGES
     ======================================================= */

  useEffect(() => {
    const source =
      getSourceStream();

    if (!source) {
      return;
    }

    /*
     * Do not automatically steal
     * the stream from WebRTC.
     *
     * We process a copy/reference
     * of the existing stream.
     */

    attachStream(source);

    return () => {
      stopProcessing();
    };
  }, [
    getSourceStream,
    attachStream,
    stopProcessing
  ]);

  /* =======================================================
     PREVIEW CONNECTION
     ======================================================= */

  useEffect(() => {
    const preview =
      previewVideoRef.current;

    const output =
      outputStreamRef.current;

    if (
      preview &&
      output &&
      preview.srcObject !== output
    ) {
      preview.srcObject =
        output;
    }
  }, [
    effect,
    enabled
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      processingRef.current =
        false;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      if (
        sourceVideoRef.current
      ) {
        sourceVideoRef.current.pause();

        sourceVideoRef.current.srcObject =
          null;

        sourceVideoRef.current =
          null;
      }

      /*
       * Only stop the generated
       * video track.
       *
       * Never stop the original
       * camera/microphone tracks.
       */

      if (
        outputStreamRef.current
      ) {
        outputStreamRef.current
          .getVideoTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Ignore.
            }
          });
      }

      if (
        segmenterRef.current
      ) {
        try {
          segmenterRef.current.close();
        } catch {
          // Ignore.
        }
      }

      segmenterRef.current =
        null;

      outputStreamRef.current =
        null;

      outputTrackRef.current =
        null;
    };
  }, []);

  /* =======================================================
     UI STATUS
     ======================================================= */

  const status = useMemo(() => {
    if (error) {
      return {
        label: "AI unavailable",
        icon: CircleAlert,
        className:
          "text-red-300 bg-red-500/10 border-red-400/20"
      };
    }

    if (
      engineState === "loading"
    ) {
      return {
        label: "Loading AI",
        icon: Loader2,
        className:
          "text-amber-300 bg-amber-500/10 border-amber-400/20"
      };
    }

    if (
      engineState === "processing"
    ) {
      return {
        label: "Processing",
        icon: Zap,
        className:
          "text-cyan-300 bg-cyan-500/10 border-cyan-400/20"
      };
    }

    if (
      engineState === "ready"
    ) {
      return {
        label: "AI Ready",
        icon: CircleCheck,
        className:
          "text-emerald-300 bg-emerald-500/10 border-emerald-400/20"
      };
    }

    return {
      label: "Standby",
      icon: Sparkles,
      className:
        "text-white/60 bg-white/5 border-white/10"
    };
  }, [
    engineState,
    error
  ]);

  const StatusIcon =
    status.icon;

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={`
        relative
        w-full
        text-white
        ${className}
      `}
    >
      <div
        className="
          overflow-hidden
          rounded-[28px]
          border
          border-white/[0.08]
          bg-[#08090d]/95
          shadow-[0_25px_80px_rgba(0,0,0,0.55)]
          backdrop-blur-3xl
        "
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <div
          className="
            relative
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-white/[0.07]
            px-5
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-2xl
                bg-cyan-400/10
                text-cyan-300
              "
            >
              <Sparkles size={19} />

              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  h-2
                  w-2
                  rounded-full
                  bg-cyan-300
                  shadow-[0_0_12px_rgba(34,211,238,0.9)]
                "
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-tight">
                  AI Effects Studio
                </h2>

                <span
                  className="
                    rounded-full
                    border
                    border-cyan-400/20
                    bg-cyan-400/10
                    px-2
                    py-0.5
                    text-[8px]
                    font-black
                    uppercase
                    tracking-widest
                    text-cyan-300
                  "
                >
                  LIVE
                </span>
              </div>

              <p className="mt-0.5 text-[9px] font-semibold text-white/35">
                Real-time camera enhancement
              </p>
            </div>
          </div>

          {/* ENABLE SWITCH */}

          <button
            type="button"
            onClick={() =>
              handleEnabled(!enabled)
            }
            className={`
              relative
              h-8
              w-14
              rounded-full
              border
              transition-all
              duration-300
              ${
                enabled
                  ? "border-cyan-300/30 bg-cyan-400/20"
                  : "border-white/10 bg-white/5"
              }
            `}
          >
            <span
              className={`
                absolute
                top-1
                h-6
                w-6
                rounded-full
                transition-all
                duration-300
                ${
                  enabled
                    ? "left-7 bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.6)]"
                    : "left-1 bg-white/30"
                }
              `}
            />
          </button>
        </div>

        {/* =================================================
            STATUS BAR
            ================================================= */}

        <div className="px-5 pt-4">
          <div
            className={`
              flex
              items-center
              justify-between
              rounded-2xl
              border
              px-3
              py-2.5
              ${status.className}
            `}
          >
            <div className="flex items-center gap-2">
              <StatusIcon
                size={14}
                className={
                  engineState ===
                  "loading"
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="text-[9px] font-black uppercase tracking-widest">
                {status.label}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {fps > 0 && (
                <span className="text-[8px] font-bold text-white/35">
                  {fps} FPS
                </span>
              )}

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-current
                "
              />
            </div>
          </div>
        </div>

        {/* =================================================
            PREVIEW
            ================================================= */}

        {!compact &&
          previewOpen && (
            <div className="px-5 pt-4">
              <div
                className="
                  relative
                  aspect-video
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-white/[0.08]
                  bg-black
                "
              >
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                />

                {!enabled && (
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      bg-black/55
                      backdrop-blur-sm
                    "
                  >
                    <div className="text-center">
                      <EyeOff
                        size={22}
                        className="mx-auto mb-2 text-white/35"
                      />

                      <p className="text-[9px] font-black uppercase tracking-widest text-white/45">
                        AI Effects Disabled
                      </p>
                    </div>
                  </div>
                )}

                <div
                  className="
                    absolute
                    left-3
                    top-3
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-white/10
                    bg-black/60
                    px-3
                    py-1.5
                    backdrop-blur-xl
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      animate-pulse
                      rounded-full
                      bg-cyan-300
                    "
                  />

                  <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                    Live Preview
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewOpen(false)
                  }
                  className="
                    absolute
                    right-3
                    top-3
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/10
                    bg-black/60
                    text-white/55
                    backdrop-blur-xl
                    transition
                    hover:bg-white/10
                    hover:text-white
                  "
                >
                  <EyeOff size={14} />
                </button>
              </div>
            </div>
          )}

        {/* =================================================
            EFFECTS
            ================================================= */}

        <div className="px-5 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                Effects
              </p>

              <p className="mt-1 text-xs font-bold text-white/75">
                Choose your live look
              </p>
            </div>

            {!previewOpen && (
              <button
                type="button"
                onClick={() =>
                  setPreviewOpen(true)
                }
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-white/5
                  px-2.5
                  py-1.5
                  text-[8px]
                  font-black
                  uppercase
                  tracking-wider
                  text-white/55
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
              >
                <Eye size={12} />
                Preview
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {EFFECTS.map(item => {
              const Icon =
                item.icon;

              const selected =
                effect === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleEffectChange(
                      item.id
                    )
                  }
                  className={`
                    group
                    relative
                    overflow-hidden
                    rounded-2xl
                    border
                    p-3
                    text-left
                    transition-all
                    duration-200
                    ${
                      selected
                        ? "border-cyan-300/30 bg-cyan-400/[0.09] shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]"
                    }
                  `}
                >
                  {selected && (
                    <span
                      className="
                        absolute
                        right-2
                        top-2
                        flex
                        h-4
                        w-4
                        items-center
                        justify-center
                        rounded-full
                        bg-cyan-300
                        text-black
                      "
                    >
                      <CircleCheck
                        size={10}
                      />
                    </span>
                  )}

                  <div
                    className={`
                      mb-2
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-xl
                      transition
                      ${
                        selected
                          ? "bg-cyan-300 text-black"
                          : "bg-white/5 text-white/45 group-hover:text-white/75"
                      }
                    `}
                  >
                    <Icon size={16} />
                  </div>

                  <p
                    className={`
                      text-[10px]
                      font-black
                      ${
                        selected
                          ? "text-white"
                          : "text-white/70"
                      }
                    `}
                  >
                    {item.name}
                  </p>

                  <p className="mt-0.5 text-[8px] font-semibold text-white/30">
                    {item.description}
                  </p>

                  {item.requiresAI && (
                    <div className="mt-2 flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-cyan-300/60">
                      <Sparkles size={8} />
                      AI
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================
            INTENSITY
            ================================================= */}

        <div className="px-5 pt-5">
          <div
            className="
              rounded-2xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              p-4
            "
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={13}
                  className="text-white/40"
                />

                <span className="text-[9px] font-black uppercase tracking-widest text-white/55">
                  Intensity
                </span>
              </div>

              <span className="text-[10px] font-black tabular-nums text-cyan-300">
                {intensity}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={event =>
                setIntensity(
                  clamp(
                    Number(
                      event.target.value
                    ),
                    0,
                    100
                  )
                )
              }
              className="
                h-1.5
                w-full
                cursor-pointer
                appearance-none
                rounded-full
                bg-white/10
                accent-cyan-300
              "
            />

            <div className="mt-2 flex justify-between text-[7px] font-bold uppercase tracking-wider text-white/20">
              <span>Subtle</span>
              <span>Strong</span>
            </div>
          </div>
        </div>

        {/* =================================================
            ADVANCED
            ================================================= */}

        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={() =>
              setShowAdvanced(
                previous =>
                  !previous
              )
            }
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-xl
              px-2
              py-2
              text-left
              transition
              hover:bg-white/[0.03]
            "
          >
            <div className="flex items-center gap-2">
              <Wand2
                size={13}
                className="text-white/30"
              />

              <span className="text-[8px] font-black uppercase tracking-widest text-white/35">
                Advanced processing
              </span>
            </div>

            <ChevronDown
              size={13}
              className={`
                text-white/25
                transition-transform
                ${
                  showAdvanced
                    ? "rotate-180"
                    : ""
                }
              `}
            />
          </button>

          {showAdvanced && (
            <div
              className="
                mt-1
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-3
              "
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
                  <Sparkles size={14} />
                </div>

                <div>
                  <p className="text-[9px] font-black text-white/65">
                    Browser AI Processing
                  </p>

                  <p className="mt-1 text-[8px] leading-relaxed text-white/30">
                    AI frames are processed in
                    your browser. Your original
                    camera and microphone tracks
                    are not stopped by this panel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={restart}
                className="
                  mt-3
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.03]
                  py-2.5
                  text-[8px]
                  font-black
                  uppercase
                  tracking-widest
                  text-white/45
                  transition
                  hover:bg-white/[0.07]
                  hover:text-white
                "
              >
                <RefreshCw
                  size={12}
                />
                Restart AI Engine
              </button>
            </div>
          )}
        </div>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="px-5 pt-3">
            <div
              className="
                flex
                gap-3
                rounded-2xl
                border
                border-red-400/15
                bg-red-500/[0.06]
                p-3
              "
            >
              <CircleAlert
                size={15}
                className="mt-0.5 shrink-0 text-red-300"
              />

              <div className="min-w-0">
                <p className="text-[9px] font-black text-red-200">
                  AI Effects Error
                </p>

                <p className="mt-1 break-words text-[8px] leading-relaxed text-red-200/50">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            FOOTER
            ================================================= */}

        <div
          className="
            mt-5
            border-t
            border-white/[0.06]
            px-5
            py-3
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                <span className="text-[7px] font-black uppercase tracking-widest text-white/25">
                  Camera protected
                </span>
              </div>
            </div>

            <span className="text-[7px] font-bold text-white/20">
              MPade AI Studio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEffects;

