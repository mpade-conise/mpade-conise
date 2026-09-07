
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

/*
 * IMPORTANT:
 *
 * The MediaPipe WASM files were copied into:
 *
 * public/mediapipe/wasm/
 *
 * Vite serves the public folder from the root URL.
 *
 * Therefore:
 *
 * public/mediapipe/wasm/
 *
 * becomes:
 *
 * /mediapipe/wasm
 *
 * Do NOT use /public/mediapipe/wasm.
 */
const MEDIAPIPE_WASM = "/mediapipe/wasm";

/*
 * Selfie segmentation model.
 *
 * This model is hosted by Google's MediaPipe model storage.
 */
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
   UTILITY
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function isSegmentationEffect(effect) {
  return (
    effect === "background-blur" ||
    effect === "background-remove"
  );
}

/* =========================================================
   AI EFFECTS COMPONENT
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

  const mountedRef = useRef(false);

  const segmenterRef = useRef(null);

  const sourceStreamRef = useRef(null);

  const sourceVideoRef = useRef(null);

  const canvasRef = useRef(null);

  const canvasContextRef = useRef(null);

  const maskCanvasRef = useRef(null);

  const maskContextRef = useRef(null);

  /*
   * Reusable background canvas.
   *
   * The previous implementation created this canvas
   * on every frame. That causes unnecessary garbage
   * collection and can reduce FPS significantly.
   */
  const backgroundCanvasRef = useRef(null);

  const backgroundContextRef = useRef(null);

  const outputStreamRef = useRef(null);

  const outputTrackRef = useRef(null);

  const animationFrameRef = useRef(null);

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

  const fpsCounterRef = useRef({
    frames: 0,
    time: 0
  });

  const lastTimestampRef = useRef(0);

  /* =======================================================
     SYNCHRONIZE REFS
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
    /*
     * Prefer the explicitly supplied stream.
     */
    if (stream) {
      return stream;
    }

    /*
     * Otherwise try the supplied video element.
     */
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
      /*
       * Already initialized.
       */
      if (segmenterRef.current) {
        return segmenterRef.current;
      }

      /*
       * Prevent multiple simultaneous initialization
       * requests.
       */
      if (initializingRef.current) {
        return null;
      }

      initializingRef.current = true;

      try {
        setError("");
        setEngineState("loading");

        console.log(
          "[AIEffects] Initializing MediaPipe..."
        );

        console.log(
          "[AIEffects] WASM path:",
          MEDIAPIPE_WASM
        );

        /*
         * Load MediaPipe Tasks Vision WASM locally.
         */
        const vision =
          await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM
          );

        if (!mountedRef.current) {
          return null;
        }

        let segmenter = null;

        /*
         * Try GPU first.
         */
        try {
          console.log(
            "[AIEffects] Trying GPU delegate..."
          );

          segmenter =
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

          console.log(
            "[AIEffects] GPU delegate initialized."
          );
        } catch (gpuError) {
          console.warn(
            "[AIEffects] GPU initialization failed. Falling back to CPU.",
            gpuError
          );

          /*
           * CPU fallback.
           */
          segmenter =
            await ImageSegmenter.createFromOptions(
              vision,
              {
                baseOptions: {
                  modelAssetPath:
                    SELFIE_SEGMENTER_MODEL,
                  delegate: "CPU"
                },

                runningMode: "VIDEO",

                outputCategoryMask: true,

                outputConfidenceMasks: false
              }
            );

          console.log(
            "[AIEffects] CPU delegate initialized."
          );
        }

        if (!mountedRef.current) {
          try {
            segmenter.close();
          } catch {
            // Ignore cleanup errors.
          }

          return null;
        }

        segmenterRef.current =
          segmenter;

        setEngineState("ready");

        console.log(
          "[AIEffects] MediaPipe is ready."
        );

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

  const createSourceVideo = useCallback(
    async source => {
      if (!source) {
        throw new Error(
          "No camera stream is available."
        );
      }

      /*
       * Reuse existing video if it already points
       * to the same MediaStream.
       */
      if (
        sourceVideoRef.current &&
        sourceVideoRef.current.srcObject ===
          source
      ) {
        const existing =
          sourceVideoRef.current;

        if (
          existing.readyState >= 2 &&
          existing.videoWidth > 0
        ) {
          return existing;
        }

        await existing.play().catch(() => {});

        return existing;
      }

      /*
       * If a previous source video exists,
       * disconnect it first.
       */
      if (sourceVideoRef.current) {
        try {
          sourceVideoRef.current.pause();
          sourceVideoRef.current.srcObject =
            null;
        } catch {
          // Ignore.
        }

        sourceVideoRef.current = null;
      }

      const video =
        document.createElement("video");

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      /*
       * Important for some browsers.
       */
      video.setAttribute(
        "playsinline",
        "true"
      );

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
              "canplay",
              handleLoaded
            );

            video.removeEventListener(
              "error",
              handleError
            );
          };

          const handleLoaded = () => {
            if (finished) return;

            if (
              video.videoWidth <= 0 ||
              video.videoHeight <= 0
            ) {
              return;
            }

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
            "canplay",
            handleLoaded
          );

          video.addEventListener(
            "error",
            handleError
          );

          /*
           * Metadata may already be available.
           */
          if (
            video.readyState >= 1 &&
            video.videoWidth > 0
          ) {
            handleLoaded();
          }
        }
      );

      await video.play().catch(error => {
        console.warn(
          "[AIEffects] Source video play warning:",
          error
        );
      });

      sourceVideoRef.current = video;

      return video;
    },
    []
  );

  /* =======================================================
     PREPARE CANVASES
     ======================================================= */

  const prepareCanvases = useCallback(
    (width, height) => {
      /*
       * Main output canvas.
       */
      if (!canvasRef.current) {
        canvasRef.current =
          document.createElement("canvas");
      }

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      canvasContextRef.current =
        canvasRef.current.getContext(
          "2d",
          {
            alpha: true,
            desynchronized: true
          }
        );

      /*
       * Segmentation mask canvas.
       */
      if (!maskCanvasRef.current) {
        maskCanvasRef.current =
          document.createElement("canvas");
      }

      maskCanvasRef.current.width = width;
      maskCanvasRef.current.height =
        height;

      maskContextRef.current =
        maskCanvasRef.current.getContext(
          "2d",
          {
            alpha: true
          }
        );

      /*
       * Reusable blurred background canvas.
       */
      if (!backgroundCanvasRef.current) {
        backgroundCanvasRef.current =
          document.createElement("canvas");
      }

      backgroundCanvasRef.current.width =
        width;

      backgroundCanvasRef.current.height =
        height;

      backgroundContextRef.current =
        backgroundCanvasRef.current.getContext(
          "2d",
          {
            alpha: true,
            desynchronized: true
          }
        );
    },
    []
  );

  /* =======================================================
     CREATE OUTPUT STREAM
     ======================================================= */

  const createOutputStream = useCallback(
    () => {
      if (!canvasRef.current) {
        return null;
      }

      /*
       * Stop only the previously generated
       * video track.
       *
       * NEVER stop the original camera track.
       */
      if (outputTrackRef.current) {
        try {
          outputTrackRef.current.stop();
        } catch {
          // Ignore.
        }

        outputTrackRef.current = null;
      }

      /*
       * captureStream is supported by modern
       * Chrome, Edge and most Chromium browsers.
       */
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
       * Preserve original microphone tracks.
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
              /*
               * Track may already be attached.
               */
            }
          });
      }

      return output;
    },
    []
  );

  /* =======================================================
     DRAW ORIGINAL
     ======================================================= */

  const drawOriginal = useCallback(
    (
      video,
      ctx,
      width,
      height
    ) => {
      ctx.globalCompositeOperation =
        "source-over";

      ctx.filter = "none";

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

  const buildMask = useCallback(
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
        mask.getAsUint8Array?.();

      if (!data) {
        return null;
      }

      const image =
        new ImageData(
          width,
          height
        );

      /*
       * Convert the MediaPipe mask into
       * a transparent foreground mask.
       */
      for (
        let y = 0;
        y < height;
        y++
      ) {
        const sourceY =
          Math.min(
            maskHeight - 1,
            Math.floor(
              (y / height) *
                maskHeight
            )
          );

        for (
          let x = 0;
          x < width;
          x++
        ) {
          const sourceX =
            Math.min(
              maskWidth - 1,
              Math.floor(
                (x / width) *
                  maskWidth
              )
            );

          const sourceIndex =
            sourceY *
              maskWidth +
            sourceX;

          const value =
            data[sourceIndex] || 0;

          const outputIndex =
            (y * width + x) * 4;

          /*
           * Selfie segmenter category mask:
           * foreground = non-zero.
           */
          const alpha =
            value > 0
              ? 255
              : 0;

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
     DRAW BACKGROUND BLUR
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

        const backgroundCanvas =
          backgroundCanvasRef.current;

        const backgroundCtx =
          backgroundContextRef.current;

        if (
          !backgroundCanvas ||
          !backgroundCtx
        ) {
          drawOriginal(
            video,
            ctx,
            width,
            height
          );

          return;
        }

        const blur =
          3 +
          (intensityRef.current /
            100) *
            22;

        /*
         * -----------------------------------
         * STEP 1: Draw blurred frame
         * -----------------------------------
         */

        backgroundCtx.clearRect(
          0,
          0,
          width,
          height
        );

        backgroundCtx.save();

        backgroundCtx.filter =
          `blur(${blur}px)`;

        backgroundCtx.drawImage(
          video,
          -blur,
          -blur,
          width + blur * 2,
          height + blur * 2
        );

        backgroundCtx.restore();

        /*
         * -----------------------------------
         * STEP 2: Draw sharp foreground
         * -----------------------------------
         */

        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter = "none";

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
         * -----------------------------------
         * STEP 3: Apply foreground mask
         * -----------------------------------
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
         * -----------------------------------
         * STEP 4: Put blurred background
         * behind foreground
         * -----------------------------------
         */

        ctx.globalCompositeOperation =
          "destination-over";

        ctx.drawImage(
          backgroundCanvas,
          0,
          0,
          width,
          height
        );

        /*
         * Reset canvas state.
         */
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter = "none";
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
         * Draw original frame.
         */
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter = "none";

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
         * Put mask into mask canvas.
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

        /*
         * Keep foreground only.
         */
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
         * Reset.
         */
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter = "none";
      },
      [
        buildMask,
        drawOriginal
      ]
    );

  /* =======================================================
     FACE FOCUS
     ======================================================= */

  const drawFaceFocus = useCallback(
    (
      video,
      ctx,
      width,
      height
    ) => {
      ctx.globalCompositeOperation =
        "source-over";

      ctx.filter = "none";

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
       * This is intentionally a visual
       * focus effect rather than claiming
       * to perform face detection.
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

  const processFrame = useCallback(
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

      /*
       * If video isn't ready yet,
       * keep trying.
       */
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

      /*
       * Resize canvases if camera
       * resolution changes.
       */
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
         * =================================
         * ORIGINAL
         * =================================
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
         * =================================
         * FACE FOCUS
         * =================================
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
         * =================================
         * AI SEGMENTATION
         * =================================
         */

        else if (
          isSegmentationEffect(
            activeEffect
          )
        ) {
          const segmenter =
            segmenterRef.current;

          if (!segmenter) {
            /*
             * AI is still loading.
             * Show original video instead
             * of a blank frame.
             */
            drawOriginal(
              video,
              ctx,
              width,
              height
            );
          } else {
            /*
             * MediaPipe VIDEO mode requires
             * monotonically increasing timestamps.
             */
            let mediaTimestamp =
              Math.round(timestamp);

            if (
              mediaTimestamp <=
              lastTimestampRef.current
            ) {
              mediaTimestamp =
                lastTimestampRef.current +
                1;
            }

            lastTimestampRef.current =
              mediaTimestamp;

            const result =
              segmenter.segmentForVideo(
                video,
                mediaTimestamp
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
            } else if (
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
             * Release MediaPipe result
             * resources when supported.
             */
            try {
              result?.categoryMask?.close?.();
            } catch {
              // Ignore.
            }

            try {
              result?.confidenceMasks?.forEach(
                mask => {
                  mask?.close?.();
                }
              );
            } catch {
              // Ignore.
            }
          }
        }

        /*
         * =================================
         * FPS COUNTER
         * =================================
         */

        const now =
          performance.now();

        fpsCounterRef.current.frames += 1;

        if (
          !fpsCounterRef.current.time
        ) {
          fpsCounterRef.current.time =
            now;
        }

        if (
          now -
            fpsCounterRef.current.time >=
          1000
        ) {
          const currentFPS =
            fpsCounterRef.current.frames;

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

        /*
         * Don't kill the entire processing
         * loop because of one bad frame.
         */
      }

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
        /*
         * Already processing this stream.
         */
        if (
          processingRef.current &&
          sourceStreamRef.current === source
        ) {
          return outputStreamRef.current;
        }

        /*
         * Stop old processing loop.
         * This does NOT stop the camera.
         */
        if (
          processingRef.current
        ) {
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

        lastTimestampRef.current =
          0;

        fpsCounterRef.current = {
          frames: 0,
          time: 0
        };

        setFps(0);

        setEngineState(
          isSegmentationEffect(
            effectRef.current
          )
            ? segmenterRef.current
              ? "processing"
              : "loading"
            : "processing"
        );

        /*
         * Attach output to preview immediately.
         */
        const preview =
          previewVideoRef.current;

        if (preview) {
          preview.srcObject =
            output;

          preview.play().catch(() => {});
        }

        /*
         * Start rendering.
         */
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
      } else {
        setEngineState(
          "idle"
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
           * Initialize AI only when needed.
           */
          if (
            isSegmentationEffect(
              effectRef.current
            )
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

          setEngineState(
            "error"
          );

          setError(
            err?.message ||
              "Unable to start AI processing."
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

        if (!source) {
          setError(
            "No camera stream is available."
          );

          return;
        }

        /*
         * Completely reset MediaPipe.
         */
        stopProcessing();

        if (
          segmenterRef.current
        ) {
          try {
            segmenterRef.current.close();
          } catch {
            // Ignore.
          }

          segmenterRef.current =
            null;
        }

        /*
         * Reinitialize.
         */
        await attachStream(
          source
        );
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
        setError("");

        setEffect(
          nextEffect
        );

        effectRef.current =
          nextEffect;

        /*
         * AI segmentation effects require
         * MediaPipe.
         */
        if (
          isSegmentationEffect(
            nextEffect
          )
        ) {
          const segmenter =
            await initializeAI();

          /*
           * If initialization failed,
           * keep the original camera running
           * instead of breaking the stream.
           */
          if (!segmenter) {
            return;
          }

          /*
           * If processing is already running,
           * the next animation frame will
           * automatically use the new effect.
           */
          if (
            processingRef.current
          ) {
            setEngineState(
              "processing"
            );
          }
        } else {
          /*
           * No AI required.
           */
          if (
            processingRef.current
          ) {
            setEngineState(
              "processing"
            );
          }
        }
      },
      [initializeAI]
    );

  /* =======================================================
     ENABLE / DISABLE
     ======================================================= */

  const handleEnabled =
    useCallback(
      value => {
        setEnabled(value);

        enabledRef.current =
          value;

        /*
         * Keep processing alive.
         *
         * When disabled, processFrame
         * automatically renders the
         * original camera.
         */
        if (
          processingRef.current
        ) {
          setEngineState(
            value
              ? "processing"
              : "ready"
          );
        }
      },
      []
    );

  /* =======================================================
     SOURCE STREAM EFFECT
     ======================================================= */

  useEffect(() => {
    mountedRef.current =
      true;

    const source =
      getSourceStream();

    if (!source) {
      return () => {
        mountedRef.current =
          false;
      };
    }

    let cancelled = false;

    const start = async () => {
      const output =
        await attachStream(
          source
        );

      if (
        cancelled &&
        output
      ) {
        /*
         * Don't stop the original
         * source stream.
         *
         * Only generated output may
         * be stopped.
         */
        return;
      }
    };

    start();

    return () => {
      cancelled = true;

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

      preview.play().catch(() => {});
    }
  }, [
    effect,
    enabled,
    engineState
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

      /*
       * Cancel animation loop.
       */
      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }

      /*
       * Disconnect preview.
       */
      if (
        previewVideoRef.current
      ) {
        try {
          previewVideoRef.current.pause();

          previewVideoRef.current.srcObject =
            null;
        } catch {
          // Ignore.
        }
      }

      /*
       * Disconnect source video.
       *
       * IMPORTANT:
       * This does NOT stop camera tracks.
       */
      if (
        sourceVideoRef.current
      ) {
        try {
          sourceVideoRef.current.pause();

          sourceVideoRef.current.srcObject =
            null;
        } catch {
          // Ignore.
        }

        sourceVideoRef.current =
          null;
      }

      /*
       * Stop ONLY generated video tracks.
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

      /*
       * Close MediaPipe.
       */
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

      sourceStreamRef.current =
        null;

      /*
       * Release canvases.
       */
      canvasRef.current = null;
      canvasContextRef.current = null;

      maskCanvasRef.current = null;
      maskContextRef.current = null;

      backgroundCanvasRef.current =
        null;

      backgroundContextRef.current =
        null;
    };
  }, []);

  /* =======================================================
     UI STATUS
     ======================================================= */

  const status =
    useMemo(() => {
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
            aria-label={
              enabled
                ? "Disable AI effects"
                : "Enable AI effects"
            }
            onClick={() =>
              handleEnabled(
                !enabled
              )
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
                  aria-label="Hide preview"
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
                    AI frames are processed
                    directly in your browser.
                    Your original camera and
                    microphone tracks are not
                    stopped by this panel.
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

