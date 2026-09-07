
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

const LOCAL_MEDIAPIPE_WASM = "/mediapipe/wasm";

const CDN_MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";

const SELFIE_SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

/*
 * Start with CPU.
 *
 * Once everything is confirmed working, GPU can be tested
 * separately. CPU avoids introducing GPU/WebGL variables
 * while fixing the WASM runtime.
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
  return Math.min(max, Math.max(min, value));
}

function isAIEffect(effect) {
  return (
    effect === "background-blur" ||
    effect === "background-remove"
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
  const [effect, setEffect] = useState("none");
  const [intensity, setIntensity] = useState(55);
  const [engineState, setEngineState] = useState("idle");
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [fps, setFps] = useState(0);

  /* =======================================================
     REFS
     ======================================================= */

  const mountedRef = useRef(true);

  const segmenterRef = useRef(null);
  const segmenterPromiseRef = useRef(null);

  const sourceStreamRef = useRef(null);
  const sourceVideoRef = useRef(null);

  const canvasRef = useRef(null);
  const canvasContextRef = useRef(null);

  const maskCanvasRef = useRef(null);
  const maskContextRef = useRef(null);

  const backgroundCanvasRef = useRef(null);
  const backgroundContextRef = useRef(null);

  const outputStreamRef = useRef(null);
  const outputTrackRef = useRef(null);

  const animationFrameRef = useRef(null);

  const effectRef = useRef(effect);
  const intensityRef = useRef(intensity);
  const enabledRef = useRef(enabled);

  const processingRef = useRef(false);
  const initializingRef = useRef(false);

  const previewVideoRef = useRef(null);

  const fpsCounterRef = useRef({
    frames: 0,
    time: 0
  });

  /*
   * Prevent multiple stream attachment operations from
   * running simultaneously.
   */
  const attachPromiseRef = useRef(null);

  /*
   * Used to ignore an old async attach operation when
   * the source stream changes.
   */
  const streamGenerationRef = useRef(0);

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
     CHECK MEDIAPIPE ASSET
     ======================================================= */

  const checkAsset = useCallback(async url => {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        console.warn(
          "[AIEffects] Asset request failed:",
          url,
          response.status
        );

        return false;
      }

      const contentType =
        response.headers.get("content-type") || "";

      /*
       * This catches the exact problem where Vercel's
       * SPA fallback returns index.html instead of the
       * requested MediaPipe file.
       */
      if (
        contentType.toLowerCase().includes("text/html")
      ) {
        console.warn(
          "[AIEffects] MediaPipe asset returned HTML:",
          url
        );

        return false;
      }

      return true;
    } catch (err) {
      console.warn(
        "[AIEffects] MediaPipe asset check failed:",
        url,
        err
      );

      return false;
    }
  }, []);

  /* =======================================================
     CHECK LOCAL WASM
     ======================================================= */

  const checkLocalWasm = useCallback(async () => {
    try {
      const jsUrl =
        `${LOCAL_MEDIAPIPE_WASM}/vision_wasm_internal.js`;

      const wasmUrl =
        `${LOCAL_MEDIAPIPE_WASM}/vision_wasm_internal.wasm`;

      console.log(
        "[AIEffects] Checking local MediaPipe JS:",
        jsUrl
      );

      const jsWorks =
        await checkAsset(jsUrl);

      if (!jsWorks) {
        return false;
      }

      console.log(
        "[AIEffects] Checking local MediaPipe WASM:",
        wasmUrl
      );

      const wasmWorks =
        await checkAsset(wasmUrl);

      if (!wasmWorks) {
        return false;
      }

      return true;
    } catch (err) {
      console.warn(
        "[AIEffects] Local MediaPipe check failed:",
        err
      );

      return false;
    }
  }, [checkAsset]);

  /* =======================================================
     GET VALID WASM PATH
     ======================================================= */

  const getMediaPipeWasmPath = useCallback(async () => {
    const localWorks =
      await checkLocalWasm();

    if (localWorks) {
      console.log(
        "[AIEffects] Using local MediaPipe WASM:",
        LOCAL_MEDIAPIPE_WASM
      );

      return LOCAL_MEDIAPIPE_WASM;
    }

    console.warn(
      "[AIEffects] Local MediaPipe WASM unavailable."
    );

    console.log(
      "[AIEffects] Falling back to MediaPipe CDN:",
      CDN_MEDIAPIPE_WASM
    );

    return CDN_MEDIAPIPE_WASM;
  }, [checkLocalWasm]);

  /* =======================================================
     CLOSE SEGMENTER
     ======================================================= */

  const closeSegmenter = useCallback(() => {
    if (segmenterRef.current) {
      try {
        segmenterRef.current.close();
      } catch (err) {
        console.warn(
          "[AIEffects] Segmenter cleanup warning:",
          err
        );
      }

      segmenterRef.current = null;
    }
  }, []);

  /* =======================================================
     INITIALIZE MEDIA PIPE
     ======================================================= */

  const initializeAI = useCallback(async () => {
    /*
     * Already initialized.
     */
    if (segmenterRef.current) {
      return segmenterRef.current;
    }

    /*
     * Initialization already running.
     */
    if (segmenterPromiseRef.current) {
      return segmenterPromiseRef.current;
    }

    setError("");
    setEngineState("loading");

    initializingRef.current = true;

    const initialization = (async () => {
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
        let vision;

        try {
          vision =
            await FilesetResolver.forVisionTasks(
              wasmPath
            );
        } catch (localOrPrimaryError) {
          /*
           * If local WASM failed inside MediaPipe even
           * though the preflight passed, try the exact
           * package-version CDN.
           */
          if (
            wasmPath !==
            CDN_MEDIAPIPE_WASM
          ) {
            console.warn(
              "[AIEffects] Local WASM initialization failed. Trying CDN fallback...",
              localOrPrimaryError
            );

            vision =
              await FilesetResolver.forVisionTasks(
                CDN_MEDIAPIPE_WASM
              );
          } else {
            throw localOrPrimaryError;
          }
        }

        if (!mountedRef.current) {
          return null;
        }

        console.log(
          "[AIEffects] Creating ImageSegmenter..."
        );

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

          /*
           * Some MediaPipe/browser combinations can fail
           * during the first runtime initialization.
           *
           * Rebuild the runtime from the exact CDN once.
           */
          if (
            wasmPath !==
            CDN_MEDIAPIPE_WASM
          ) {
            console.warn(
              "[AIEffects] Retrying ImageSegmenter using CDN runtime..."
            );

            const cdnVision =
              await FilesetResolver.forVisionTasks(
                CDN_MEDIAPIPE_WASM
              );

            segmenter =
              await ImageSegmenter.createFromOptions(
                cdnVision,
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
          } else {
            throw cpuError;
          }
        }

        if (!segmenter) {
          throw new Error(
            "MediaPipe ImageSegmenter could not be created."
          );
        }

        if (!mountedRef.current) {
          try {
            segmenter.close();
          } catch {
            // Ignore.
          }

          return null;
        }

        segmenterRef.current =
          segmenter;

        setEngineState("ready");

        console.log(
          "[AIEffects] MediaPipe initialized successfully."
        );

        return segmenter;
      } catch (err) {
        console.error(
          "[AIEffects] MediaPipe initialization failed:",
          err
        );

        closeSegmenter();

        if (mountedRef.current) {
          setEngineState("error");

          const message =
            err?.message ||
            "The AI engine could not be initialized.";

          if (
            message
              .toLowerCase()
              .includes("modulefactory")
          ) {
            setError(
              "MediaPipe WASM failed to load. The app tried the local files and the matching 0.10.17 CDN."
            );
          } else {
            setError(message);
          }
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
    getMediaPipeWasmPath,
    closeSegmenter
  ]);

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
       * Reuse helper video when the same stream is used.
       */
      if (
        sourceVideoRef.current &&
        sourceVideoRef.current.srcObject ===
          source
      ) {
        const existing =
          sourceVideoRef.current;

        if (
          existing.readyState < 2
        ) {
          try {
            await existing.play();
          } catch {
            // Ignore autoplay restrictions.
          }
        }

        return existing;
      }

      /*
       * Clean previous helper video.
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

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      video.setAttribute(
        "playsinline",
        ""
      );

      video.setAttribute(
        "muted",
        ""
      );

      video.srcObject =
        source;

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
              handleCanPlay
            );

            video.removeEventListener(
              "error",
              handleError
            );
          };

          const complete = () => {
            if (finished) {
              return;
            }

            finished = true;

            cleanup();

            resolve();
          };

          const handleLoaded =
            () => {
              complete();
            };

          const handleCanPlay =
            () => {
              complete();
            };

          const handleError =
            () => {
              if (finished) {
                return;
              }

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
            handleCanPlay
          );

          video.addEventListener(
            "error",
            handleError
          );

          if (
            video.readyState >= 1
          ) {
            complete();
          }
        }
      );

      try {
        await video.play();
      } catch (err) {
        console.warn(
          "[AIEffects] Helper video autoplay warning:",
          err
        );
      }

      if (!mountedRef.current) {
        return null;
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

  const prepareCanvases = useCallback(
    (width, height) => {
      /*
       * Main canvas.
       */
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
       * Reusable background canvas.
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
      if (!canvasRef.current) {
        return null;
      }

      /*
       * Stop only the old generated video track.
       *
       * NEVER stop the original camera track here.
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
       * Preserve microphone audio.
       */
      const source =
        sourceStreamRef.current;

      if (source) {
        source
          .getAudioTracks()
          .forEach(track => {
            try {
              if (
                !output
                  .getAudioTracks()
                  .some(
                    existing =>
                      existing.id ===
                      track.id
                  )
              ) {
                output.addTrack(
                  track
                );
              }
            } catch (err) {
              console.warn(
                "[AIEffects] Could not add audio track:",
                err
              );
            }
          });
      }

      /*
       * Immediately connect preview.
       */
      const preview =
        previewVideoRef.current;

      if (
        preview &&
        preview.srcObject !== output
      ) {
        preview.srcObject =
          output;

        preview
          .play()
          .catch(() => {});
      }

      return output;
    }, []);

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
     BUILD MASK
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
          ] =
            value > 0
              ? 255
              : 0;
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
         * Draw blurred background.
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
         * Draw sharp foreground.
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
         * Build mask.
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
         * Keep person.
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
         * Put blurred background behind.
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

        ctx.globalCompositeOperation =
          "source-over";

        ctx.filter = "none";

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
           * Original.
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
           * Cinematic focus.
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
           * AI segmentation.
           */
          else {
            const segmenter =
              segmenterRef.current;

            if (
              !segmenter
            ) {
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
               * Release mask resources.
               */
              try {
                result
                  ?.categoryMask
                  ?.close?.();
              } catch {
                // Ignore.
              }
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
              fpsCounterRef.current.time >=
            1000
          ) {
            setFps(
              fpsCounterRef.current.frames
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
          !source
        ) {
          throw new Error(
            "Camera stream is unavailable."
          );
        }

        if (
          processingRef.current &&
          outputStreamRef.current
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

        /*
         * Save source before creating output,
         * because audio is copied into output.
         */
        sourceStreamRef.current =
          source;

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
          segmenterRef.current &&
            isAIEffect(
              effectRef.current
            )
            ? "processing"
            : "ready"
        );

        fpsCounterRef.current = {
          frames: 0,
          time: performance.now()
        };

        if (
          animationFrameRef.current
        ) {
          cancelAnimationFrame(
            animationFrameRef.current
          );
        }

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

        /*
         * Immediately connect StreamDashboard.
         */
        if (
          onProcessedStream
        ) {
          try {
            onProcessedStream(
              output
            );
          } catch (callbackError) {
            console.warn(
              "[AIEffects] onProcessedStream callback failed:",
              callbackError
            );
          }
        }

        if (
          onProcessedTrack &&
          outputTrackRef.current
        ) {
          try {
            onProcessedTrack(
              outputTrackRef.current,
              output
            );
          } catch (callbackError) {
            console.warn(
              "[AIEffects] onProcessedTrack callback failed:",
              callbackError
            );
          }
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

        /*
         * Prevent duplicate attachment operations.
         */
        if (
          attachPromiseRef.current
        ) {
          return attachPromiseRef.current;
        }

        const generation =
          ++streamGenerationRef.current;

        const operation =
          (async () => {
            try {
              setError("");

              sourceStreamRef.current =
                source;

              const needsAI =
                isAIEffect(
                  effectRef.current
                );

              /*
               * Initialize MediaPipe only when required.
               */
              if (needsAI) {
                const segmenter =
                  await initializeAI();

                /*
                 * The stream should still work even if
                 * AI initialization fails.
                 */
                if (!segmenter) {
                  console.warn(
                    "[AIEffects] AI unavailable. Continuing with original video."
                  );
                }
              }

              /*
               * Ignore stale operation.
               */
              if (
                generation !==
                streamGenerationRef.current
              ) {
                return null;
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

              if (mountedRef.current) {
                setError(
                  err?.message ||
                    "Unable to start AI processing."
                );

                setEngineState(
                  "error"
                );
              }

              return null;
            } finally {
              attachPromiseRef.current =
                null;
            }
          })();

        attachPromiseRef.current =
          operation;

        return operation;
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

        streamGenerationRef.current++;

        stopProcessing();

        /*
         * Close old MediaPipe instance.
         */
        closeSegmenter();

        segmenterPromiseRef.current =
          null;

        setError("");
        setEngineState("idle");

        if (source) {
          await attachStream(
            source
          );
        }
      },
      [
        getSourceStream,
        stopProcessing,
        closeSegmenter,
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
         * Original / Focus do not require AI.
         */
        if (
          !isAIEffect(
            nextEffect
          )
        ) {
          if (
            segmenterRef.current
          ) {
            setEngineState(
              "ready"
            );
          } else {
            setEngineState(
              processingRef.current
                ? "ready"
                : "idle"
            );
          }

          return;
        }

        /*
         * AI effects require MediaPipe.
         */
        const segmenter =
          await initializeAI();

        if (!segmenter) {
          return;
        }

        /*
         * If processing isn't running,
         * attach the current camera.
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
        } else {
          setEngineState(
            "processing"
          );
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

        /*
         * The processing loop remains active.
         *
         * Disabling simply makes it draw the
         * original camera frame.
         */
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
      streamGenerationRef.current++;

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

  /*
   * Also attach preview whenever the preview element
   * itself is mounted after conditional rendering.
   */
  useEffect(() => {
    const preview =
      previewVideoRef.current;

    const output =
      outputStreamRef.current;

    if (
      preview &&
      output
    ) {
      preview.srcObject =
        output;

      preview
        .play()
        .catch(() => {});
    }
  }, [
    previewOpen
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

      streamGenerationRef.current++;

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
       * Never stop the original camera or
       * microphone tracks here.
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

      sourceStreamRef.current =
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
      className={`relative w-full text-white ${className}`}
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
