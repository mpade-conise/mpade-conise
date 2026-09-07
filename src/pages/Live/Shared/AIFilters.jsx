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
 * Your project currently uses:
 *
 * @mediapipe/tasks-vision@0.10.17
 *
 * Therefore the fallback CDN MUST use the same version.
 *
 * The local path is preferred because the WASM files have
 * already been copied into:
 *
 * public/mediapipe/wasm/
 */

const LOCAL_MEDIAPIPE_WASM = "/mediapipe/wasm";

const CDN_MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";

/*
 * Selfie segmentation model.
 */
const SELFIE_SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

/*
 * We deliberately start with CPU.
 *
 * This avoids the GPU "ModuleFactory not set" failure
 * while we verify that the WASM runtime itself is healthy.
 *
 * Once the CPU version is confirmed working, GPU can be
 * introduced separately.
 */
const MEDIAPIPE_DELEGATE = "CPU";

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

/* =========================================================
   AI EFFECTS
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

  const [effect, setEffect] =
    useState("none");

  const [intensity, setIntensity] =
    useState(55);

  const [engineState, setEngineState] =
    useState("idle");

  const [error, setError] =
    useState("");

  const [showAdvanced, setShowAdvanced] =
    useState(false);

  const [previewOpen, setPreviewOpen] =
    useState(true);

  const [fps, setFps] =
    useState(0);

  /* =======================================================
     REFS
     ======================================================= */

  const mountedRef =
    useRef(true);

  const segmenterRef =
    useRef(null);

  const segmenterPromiseRef =
    useRef(null);

  const sourceStreamRef =
    useRef(null);

  const sourceVideoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const canvasContextRef =
    useRef(null);

  const maskCanvasRef =
    useRef(null);

  const maskContextRef =
    useRef(null);

  /*
   * Reusable background canvas.
   *
   * Creating a new canvas on every frame is expensive.
   */
  const backgroundCanvasRef =
    useRef(null);

  const backgroundContextRef =
    useRef(null);

  const outputStreamRef =
    useRef(null);

  const outputTrackRef =
    useRef(null);

  const animationFrameRef =
    useRef(null);

  const effectRef =
    useRef(effect);

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

  const fpsCounterRef =
    useRef({
      frames: 0,
      time: 0
    });

  /* =======================================================
     KEEP REFS SYNCHRONIZED
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

  const getSourceStream =
    useCallback(() => {
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
    }, [
      stream,
      videoRef
    ]);

  /* =======================================================
     CHECK LOCAL MEDIAPIPE FILE
     ======================================================= */

  const checkLocalWasm =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            `${LOCAL_MEDIAPIPE_WASM}/vision_wasm_internal.js`,
            {
              method: "GET",
              cache: "no-store"
            }
          );

        if (!response.ok) {
          return false;
        }

        /*
         * This is important.
         *
         * If Vercel/Vite returns index.html here,
         * the response will have HTML rather than
         * MediaPipe's JavaScript.
         */
        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes("text/html")
        ) {
          console.warn(
            "[AIEffects] Local MediaPipe JS returned HTML instead of JavaScript."
          );

          return false;
        }

        const text =
          await response.text();

        if (
          text.trim().startsWith("<!doctype") ||
          text.trim().startsWith("<html")
        ) {
          console.warn(
            "[AIEffects] Local MediaPipe JS contains HTML."
          );

          return false;
        }

        return true;
      } catch (err) {
        console.warn(
          "[AIEffects] Local MediaPipe WASM check failed:",
          err
        );

        return false;
      }
    }, []);

  /* =======================================================
     GET VALID MEDIAPIPE WASM PATH
     ======================================================= */

  const getMediaPipeWasmPath =
    useCallback(async () => {
      /*
       * First try the local files.
       */
      const localWorks =
        await checkLocalWasm();

      if (localWorks) {
        console.log(
          "[AIEffects] Using local MediaPipe WASM:",
          LOCAL_MEDIAPIPE_WASM
        );

        return LOCAL_MEDIAPIPE_WASM;
      }

      /*
       * If the local deployment is broken,
       * use the matching 0.10.17 CDN.
       */
      console.warn(
        "[AIEffects] Local MediaPipe WASM unavailable."
      );

      console.log(
        "[AIEffects] Falling back to MediaPipe CDN:",
        CDN_MEDIAPIPE_WASM
      );

      return CDN_MEDIAPIPE_WASM;
    }, [
      checkLocalWasm
    ]);

  /* =======================================================
     INITIALIZE MEDIA PIPE
     ======================================================= */

  const initializeAI =
    useCallback(async () => {
      /*
       * Already initialized.
       */
      if (
        segmenterRef.current
      ) {
        return segmenterRef.current;
      }

      /*
       * Another initialization is already running.
       *
       * Return the same promise instead of starting
       * another MediaPipe instance.
       */
      if (
        segmenterPromiseRef.current
      ) {
        return segmenterPromiseRef.current;
      }

      setError("");
      setEngineState("loading");

      initializingRef.current = true;

      const initialization =
        (async () => {
          try {
            console.log(
              "[AIEffects] Initializing MediaPipe..."
            );

            const wasmPath =
              await getMediaPipeWasmPath();

            console.log(
              "[AIEffects] WASM path:",
              wasmPath
            );

            /*
             * Create the Tasks Vision runtime.
             */
            const vision =
              await FilesetResolver.forVisionTasks(
                wasmPath
              );

            if (
              !mountedRef.current
            ) {
              return null;
            }

            console.log(
              "[AIEffects] Creating ImageSegmenter..."
            );

            /*
             * CPU is intentional here.
             *
             * The current error is:
             *
             * ModuleFactory not set
             *
             * We should first make sure the WASM
             * runtime works correctly before enabling
             * GPU.
             */
            console.log(
              "[AIEffects] Using CPU delegate..."
            );

            let segmenter = null;

            try {
              segmenter =
                await ImageSegmenter.createFromOptions(
                  vision,
                  {
                    baseOptions: {
                      modelAssetPath:
                        SELFIE_SEGMENTER_MODEL,

                      delegate:
                        MEDIAPIPE_DELEGATE
                    },

                    runningMode:
                      "VIDEO",

                    outputCategoryMask:
                      true,

                    outputConfidenceMasks:
                      false
                  }
                );
            } catch (cpuError) {
              console.error(
                "[AIEffects] CPU ImageSegmenter creation failed:",
                cpuError
              );

              throw cpuError;
            }

            if (
              !mountedRef.current
            ) {
              try {
                segmenter.close();
              } catch {
                // Ignore cleanup failure.
              }

              return null;
            }

            segmenterRef.current =
              segmenter;

            setEngineState(
              "ready"
            );

            console.log(
              "[AIEffects] MediaPipe initialized successfully."
            );

            return segmenter;
          } catch (err) {
            console.error(
              "[AIEffects] MediaPipe initialization failed:",
              err
            );

            setEngineState(
              "error"
            );

            const message =
              err?.message ||
              "The AI engine could not be initialized.";

            /*
             * Give a useful message for the known
             * ModuleFactory problem.
             */
            if (
              message
                .toLowerCase()
                .includes("modulefactory")
            ) {
              setError(
                "MediaPipe WASM failed to load correctly. Check /mediapipe/wasm assets or use the CDN fallback."
              );
            } else {
              setError(
                message
              );
            }

            return null;
          } finally {
            initializingRef.current =
              false;

            segmenterPromiseRef.current =
              null;
          }
        })();

      segmenterPromiseRef.current =
        initialization;

      return initialization;
    }, [
      getMediaPipeWasmPath
    ]);

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
         * Reuse the existing video.
         */
        if (
          sourceVideoRef.current &&
          sourceVideoRef.current.srcObject ===
            source
        ) {
          return sourceVideoRef.current;
        }

        /*
         * Clean old helper video.
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

        const video =
          document.createElement(
            "video"
          );

        video.autoplay =
          true;

        video.muted =
          true;

        video.playsInline =
          true;

        video.setAttribute(
          "playsinline",
          ""
        );

        video.srcObject =
          source;

        await new Promise(
          (resolve, reject) => {
            let finished =
              false;

            const cleanup =
              () => {
                video.removeEventListener(
                  "loadedmetadata",
                  handleLoaded
                );

                video.removeEventListener(
                  "error",
                  handleError
                );
              };

            const handleLoaded =
              () => {
                if (
                  finished
                ) {
                  return;
                }

                finished =
                  true;

                cleanup();

                resolve();
              };

            const handleError =
              () => {
                if (
                  finished
                ) {
                  return;
                }

                finished =
                  true;

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

            if (
              video.readyState >= 1
            ) {
              handleLoaded();
            }
          }
        );

        try {
          await video.play();
        } catch {
          /*
           * Camera streams are normally allowed to
           * autoplay because the helper video is
           * muted.
           */
        }

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
        /*
         * Main output canvas.
         */
        if (
          !canvasRef.current
        ) {
          canvasRef.current =
            document.createElement(
              "canvas"
            );
        }

        canvasRef.current.width =
          width;

        canvasRef.current.height =
          height;

        if (
          !canvasContextRef.current
        ) {
          canvasContextRef.current =
            canvasRef.current.getContext(
              "2d",
              {
                alpha: true,
                desynchronized: true
              }
            );
        }

        /*
         * Mask canvas.
         */
        if (
          !maskCanvasRef.current
        ) {
          maskCanvasRef.current =
            document.createElement(
              "canvas"
            );
        }

        maskCanvasRef.current.width =
          width;

        maskCanvasRef.current.height =
          height;

        if (
          !maskContextRef.current
        ) {
          maskContextRef.current =
            maskCanvasRef.current.getContext(
              "2d",
              {
                alpha: true
              }
            );
        }

        /*
         * Background canvas.
         */
        if (
          !backgroundCanvasRef.current
        ) {
          backgroundCanvasRef.current =
            document.createElement(
              "canvas"
            );
        }

        backgroundCanvasRef.current.width =
          width;

        backgroundCanvasRef.current.height =
          height;

        if (
          !backgroundContextRef.current
        ) {
          backgroundContextRef.current =
            backgroundCanvasRef.current.getContext(
              "2d"
            );
        }
      },
      []
    );

  /* =======================================================
     CREATE OUTPUT STREAM
     ======================================================= */

  const createOutputStream =
    useCallback(() => {
      if (
        !canvasRef.current
      ) {
        return null;
      }

      /*
       * Do not stop the source camera.
       *
       * Only stop our generated output track.
       */
      if (
        outputTrackRef.current
      ) {
        try {
          outputTrackRef.current.stop();
        } catch {
          // Ignore.
        }

        outputTrackRef.current =
          null;
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
       * Preserve source audio.
       */
      const source =
        sourceStreamRef.current;

      if (source) {
        source
          .getAudioTracks()
          .forEach(track => {
            try {
              output.addTrack(
                track
              );
            } catch {
              // Ignore duplicate track.
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
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter =
          "none";

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
     BUILD MASK
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
          mask.width ||
          width;

        const maskHeight =
          mask.height ||
          height;

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
              data[sourceIndex] ||
              0;

            const outputIndex =
              (y * width + x) *
              4;

            /*
             * Selfie segmentation category mask:
             *
             * 0 = background
             * 1 = person
             *
             * Treat non-zero as foreground.
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
         * Draw blurred source to reusable
         * background canvas.
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
          width +
            blur * 2,
          height +
            blur * 2
        );

        backgroundCtx.restore();

        /*
         * Draw sharp source.
         */
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter =
          "none";

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
         * Prepare mask.
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
         * Keep foreground.
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
         * Place blurred background behind
         * the foreground.
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

        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter =
          "none";
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

        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter =
          "none";

        ctx.clearRect(
          0,
          0,
          width,
          height
        );

        /*
         * Draw source.
         */
        ctx.drawImage(
          video,
          0,
          0,
          width,
          height
        );

        /*
         * Prepare mask.
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
         * Keep only the person.
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
        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter =
          "none";

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
         * focus effect, not actual face detection.
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
     PROCESS FRAME
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

        if (
          !width ||
          !height
        ) {
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
           * ORIGINAL
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
           * FACE FOCUS
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
           * AI SEGMENTATION
           */
          else {
            const segmenter =
              segmenterRef.current;

            /*
             * If AI isn't ready yet,
             * show original camera instead
             * of producing a broken frame.
             */
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
               * Release the MediaPipe mask.
               */
              try {
                result?.categoryMask?.close?.();
              } catch {
                // Ignore.
              }
            }
          }

          /*
           * FPS
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
            setFps(
              fpsCounterRef.current
                .frames
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
          video.videoWidth ||
          1280;

        const height =
          video.videoHeight ||
          720;

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
          segmenterRef.current
            ? "processing"
            : "ready"
        );

        fpsCounterRef.current = {
          frames: 0,
          time: performance.now()
        };

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

        /*
         * Give StreamDashboard the
         * processed MediaStream.
         */
        if (
          onProcessedStream
        ) {
          onProcessedStream(
            output
          );
        }

        /*
         * Give StreamDashboard the
         * processed video track.
         */
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
           * AI is required only for
           * segmentation effects.
           */
          const needsAI =
            effectRef.current ===
              "background-blur" ||
            effectRef.current ===
              "background-remove";

          if (needsAI) {
            const segmenter =
              await initializeAI();

            /*
             * Do not stop camera processing
             * if MediaPipe failed.
             *
             * The original camera will still
             * be rendered.
             */
            if (!segmenter) {
              console.warn(
                "[AIEffects] AI unavailable. Continuing with original video."
              );
            }
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

        /*
         * If an old segmenter exists,
         * close it completely.
         */
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

        segmenterPromiseRef.current =
          null;

        setError("");

        setEngineState(
          "idle"
        );

        /*
         * If current effect requires AI,
         * initialize it again.
         */
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

        setError("");

        /*
         * AI effects require MediaPipe.
         */
        if (
          nextEffect ===
            "background-blur" ||
          nextEffect ===
            "background-remove"
        ) {
          const segmenter =
            await initializeAI();

          if (!segmenter) {
            return;
          }

          /*
           * If processing wasn't started
           * for some reason, attach now.
           */
          if (
            !processingRef.current
          ) {
            const source =
              getSourceStream();

            if (source) {
              await startProcessing(
                source
              );
            }
          }
        }
      },
      [
        initializeAI,
        getSourceStream,
        startProcessing
      ]
    );

  /* =======================================================
     ENABLE / DISABLE
     ======================================================= */

  const handleEnabled =
    useCallback(
      value => {
        setEnabled(
          value
        );

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
      return undefined;
    }

    attachStream(
      source
    );

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

      preview
        .play()
        .catch(() => {});
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
       * Clean helper video.
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
       * IMPORTANT:
       *
       * Never stop the original camera
       * or microphone tracks here.
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

      segmenterPromiseRef.current =
        null;

      outputStreamRef.current =
        null;

      outputTrackRef.current =
        null;

      canvasRef.current =
        null;

      canvasContextRef.current =
        null;

      maskCanvasRef.current =
        null;

      maskContextRef.current =
        null;

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
        engineState ===
        "loading"
      ) {
        return {
          label: "Loading AI",
          icon: Loader2,
          className:
            "text-amber-300 bg-amber-500/10 border-amber-400/20"
        };
      }

      if (
        engineState ===
        "processing"
      ) {
        return {
          label: "Processing",
          icon: Zap,
          className:
            "text-cyan-300 bg-cyan-500/10 border-cyan-400/20"
        };
      }

      if (
        engineState ===
        "ready"
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
        {/* HEADER */}

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

        {/* STATUS */}

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

        {/* PREVIEW */}

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
                  ref={
                    previewVideoRef
                  }
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
                    setPreviewOpen(
                      false
                    )
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
                  <EyeOff
                    size={14}
                  />
                </button>
              </div>
            </div>
          )}

        {/* EFFECTS */}

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
                  setPreviewOpen(
                    true
                  )
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
                effect ===
                item.id;

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
                    <Icon
                      size={16}
                    />
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
                      <Sparkles
                        size={8}
                      />
                      AI
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* INTENSITY */}

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
              value={
                intensity
              }
              onChange={event =>
                setIntensity(
                  clamp(
                    Number(
                      event.target
                        .value
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
              <span>
                Subtle
              </span>

              <span>
                Strong
              </span>
            </div>
          </div>
        </div>

        {/* ADVANCED */}

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
                  <Sparkles
                    size={14}
                  />
                </div>

                <div>
                  <p className="text-[9px] font-black text-white/65">
                    Browser AI Processing
                  </p>

                  <p className="mt-1 text-[8px] leading-relaxed text-white/30">
                    AI frames are processed
                    directly in your browser.
                    Your original camera and
                    microphone tracks remain
                    untouched.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  restart
                }
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

        {/* ERROR */}

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

        {/* FOOTER */}

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
