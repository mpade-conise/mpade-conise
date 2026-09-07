
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Sparkles,
  SlidersHorizontal,
  Zap,
  CircleCheck,
  CircleAlert,
  Loader2,
  RefreshCw,
  ChevronDown,
  Eye,
  EyeOff,
  Wand2
} from "lucide-react";

/* =========================================================
   EFFECT DEFINITIONS
   ========================================================= */

const EFFECTS = [
  {
    id: "none",
    name: "Original",
    description: "Natural camera",
    icon: Eye,
    category: "Basic"
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Smooth skin look",
    icon: Sparkles,
    category: "Beauty"
  },
  {
    id: "face-light",
    name: "Face Light",
    description: "Bright studio light",
    icon: Sparkles,
    category: "Beauty"
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Movie-style color",
    icon: Wand2,
    category: "Cinematic"
  },
  {
    id: "vivid",
    name: "Vivid",
    description: "Rich vibrant color",
    icon: Sparkles,
    category: "Color"
  },
  {
    id: "warm",
    name: "Warm",
    description: "Golden warm tone",
    icon: Sparkles,
    category: "Color"
  },
  {
    id: "cool",
    name: "Cool",
    description: "Clean blue tone",
    icon: Sparkles,
    category: "Color"
  },
  {
    id: "noir",
    name: "Noir",
    description: "Black and white",
    icon: Wand2,
    category: "Cinematic"
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Classic film tone",
    icon: Wand2,
    category: "Cinematic"
  },
  {
    id: "dream",
    name: "Dream",
    description: "Soft glowing look",
    icon: Sparkles,
    category: "Beauty"
  },
  {
    id: "purple-glow",
    name: "Purple Glow",
    description: "Purple atmosphere",
    icon: Sparkles,
    category: "Creative"
  },
  {
    id: "neon",
    name: "Neon",
    description: "Electric color boost",
    icon: Zap,
    category: "Creative"
  },
  {
    id: "drama",
    name: "Drama",
    description: "Deep cinematic contrast",
    icon: Wand2,
    category: "Cinematic"
  },
  {
    id: "film",
    name: "Film",
    description: "Professional film look",
    icon: Wand2,
    category: "Cinematic"
  },
  {
    id: "soft-focus",
    name: "Soft Focus",
    description: "Gentle soft image",
    icon: Sparkles,
    category: "Beauty"
  },
  {
    id: "face-focus",
    name: "Face Focus",
    description: "Cinematic vignette",
    icon: Eye,
    category: "Cinematic"
  },
  {
    id: "hdr",
    name: "HDR-style",
    description: "Enhanced dynamic look",
    icon: Zap,
    category: "Color"
  },
  {
    id: "duo-tone",
    name: "Duo Tone",
    description: "Two-tone color",
    icon: Sparkles,
    category: "Creative"
  }
];

/* =========================================================
   CATEGORIES
   ========================================================= */

const CATEGORIES = [
  "All",
  "Basic",
  "Beauty",
  "Color",
  "Cinematic",
  "Creative"
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
   AIEffects
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

  const [enabled, setEnabled] =
    useState(true);

  const [effect, setEffect] =
    useState("none");

  const [intensity, setIntensity] =
    useState(55);

  const [category, setCategory] =
    useState("All");

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

  const sourceStreamRef =
    useRef(null);

  const sourceVideoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const canvasContextRef =
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

  const previewVideoRef =
    useRef(null);

  const fpsCounterRef =
    useRef({
      frames: 0,
      time: 0
    });

  /* =======================================================
     SYNC REFS
     ======================================================= */

  useEffect(() => {
    effectRef.current =
      effect;
  }, [effect]);

  useEffect(() => {
    intensityRef.current =
      intensity;
  }, [intensity]);

  useEffect(() => {
    enabledRef.current =
      enabled;
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

        if (
          sourceVideoRef.current &&
          sourceVideoRef.current.srcObject ===
            source
        ) {
          return sourceVideoRef.current;
        }

        if (
          sourceVideoRef.current
        ) {
          try {
            sourceVideoRef.current.pause();

            sourceVideoRef.current.srcObject =
              null;
          } catch {
            // Ignore cleanup errors.
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
                if (finished) {
                  return;
                }

                finished =
                  true;

                cleanup();

                resolve();
              };

            const handleError =
              () => {
                if (finished) {
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
          // Muted camera preview normally allows autoplay.
        }

        sourceVideoRef.current =
          video;

        return video;
      },
      []
    );

  /* =======================================================
     PREPARE CANVAS
     ======================================================= */

  const prepareCanvas =
    useCallback(
      (width, height) => {
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
                alpha: false,
                desynchronized: true
              }
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
     DRAW BASE IMAGE
     ======================================================= */

  const drawBase =
    useCallback(
      (
        video,
        ctx,
        width,
        height,
        filter = "none"
      ) => {
        ctx.save();

        ctx.globalCompositeOperation =
          "source-over";

        ctx.globalAlpha =
          1;

        ctx.filter =
          filter;

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

        ctx.restore();
      },
      []
    );

  /* =======================================================
     OVERLAY
     ======================================================= */

  const drawOverlay =
    useCallback(
      (
        ctx,
        width,
        height,
        color,
        alpha,
        mode = "source-over"
      ) => {
        ctx.save();

        ctx.globalCompositeOperation =
          mode;

        ctx.globalAlpha =
          clamp(alpha, 0, 1);

        ctx.fillStyle =
          color;

        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        ctx.restore();
      },
      []
    );

  /* =======================================================
     VIGNETTE
     ======================================================= */

  const drawVignette =
    useCallback(
      (
        ctx,
        width,
        height,
        strength
      ) => {
        const gradient =
          ctx.createRadialGradient(
            width * 0.5,
            height * 0.45,
            Math.min(
              width,
              height
            ) * 0.12,
            width * 0.5,
            height * 0.5,
            Math.max(
              width,
              height
            ) * 0.76
          );

        gradient.addColorStop(
          0,
          "rgba(0,0,0,0)"
        );

        gradient.addColorStop(
          0.55,
          "rgba(0,0,0,0.015)"
        );

        gradient.addColorStop(
          1,
          `rgba(0,0,0,${clamp(
            strength,
            0,
            0.9
          )})`
        );

        ctx.save();

        ctx.globalCompositeOperation =
          "source-over";

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        ctx.restore();
      },
      []
    );

  /* =======================================================
     FACE LIGHT
     ======================================================= */

  const drawFaceLight =
    useCallback(
      (
        ctx,
        width,
        height,
        amount
      ) => {
        const gradient =
          ctx.createRadialGradient(
            width * 0.5,
            height * 0.42,
            Math.min(
              width,
              height
            ) * 0.04,
            width * 0.5,
            height * 0.42,
            Math.min(
              width,
              height
            ) * 0.65
          );

        gradient.addColorStop(
          0,
          `rgba(255,245,225,${amount})`
        );

        gradient.addColorStop(
          0.45,
          `rgba(255,230,200,${amount * 0.35})`
        );

        gradient.addColorStop(
          1,
          "rgba(255,255,255,0)"
        );

        ctx.save();

        ctx.globalCompositeOperation =
          "screen";

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        ctx.restore();
      },
      []
    );

  /* =======================================================
     DUO TONE
     ======================================================= */

  const drawDuoTone =
    useCallback(
      (
        ctx,
        width,
        height,
        amount
      ) => {
        const gradient =
          ctx.createLinearGradient(
            0,
            0,
            width,
            height
          );

        gradient.addColorStop(
          0,
          `rgba(35,80,255,${amount})`
        );

        gradient.addColorStop(
          0.48,
          `rgba(80,30,160,${amount * 0.45})`
        );

        gradient.addColorStop(
          1,
          `rgba(255,110,80,${amount})`
        );

        ctx.save();

        ctx.globalCompositeOperation =
          "soft-light";

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        ctx.restore();
      },
      []
    );

  /* =======================================================
     DRAW EFFECT
     ======================================================= */

  const drawEffect =
    useCallback(
      (
        video,
        ctx,
        width,
        height
      ) => {
        const activeEffect =
          enabledRef.current
            ? effectRef.current
            : "none";

        const amount =
          intensityRef.current /
          100;

        /* -------------------------------------------------
           ORIGINAL
           ------------------------------------------------- */

        if (
          activeEffect ===
          "none"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height
          );

          return;
        }

        /* -------------------------------------------------
           BEAUTY / SKIN SMOOTH
           ------------------------------------------------- */

        if (
          activeEffect ===
          "beauty"
        ) {
          const blur =
            0.15 +
            amount * 0.9;

          const brightness =
            1.01 +
            amount * 0.08;

          const saturation =
            1.02 +
            amount * 0.12;

          drawBase(
            video,
            ctx,
            width,
            height,
            `blur(${blur}px) brightness(${brightness}) saturate(${saturation}) contrast(0.98)`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(255,225,205,1)",
            amount * 0.06,
            "screen"
          );

          return;
        }

        /* -------------------------------------------------
           FACE LIGHT
           ------------------------------------------------- */

        if (
          activeEffect ===
          "face-light"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `brightness(${1.03 + amount * 0.18}) contrast(${1 + amount * 0.04}) saturate(${1 + amount * 0.06})`
          );

          drawFaceLight(
            ctx,
            width,
            height,
            0.10 +
              amount * 0.24
          );

          return;
        }

        /* -------------------------------------------------
           CINEMATIC
           ------------------------------------------------- */

        if (
          activeEffect ===
          "cinematic"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `contrast(${1.04 + amount * 0.18}) saturate(${0.88 + amount * 0.25}) brightness(${0.98 + amount * 0.03})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(12,55,70,1)",
            amount * 0.08,
            "soft-light"
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(190,95,40,1)",
            amount * 0.045,
            "screen"
          );

          drawVignette(
            ctx,
            width,
            height,
            0.08 +
              amount * 0.18
          );

          return;
        }

        /* -------------------------------------------------
           VIVID
           ------------------------------------------------- */

        if (
          activeEffect ===
          "vivid"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `saturate(${1.15 + amount * 1.15}) contrast(${1.02 + amount * 0.18}) brightness(${1 + amount * 0.03})`
          );

          return;
        }

        /* -------------------------------------------------
           WARM
           ------------------------------------------------- */

        if (
          activeEffect ===
          "warm"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `sepia(${amount * 0.34}) saturate(${1.04 + amount * 0.3}) brightness(${1.01 + amount * 0.04})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(255,155,70,1)",
            amount * 0.10,
            "soft-light"
          );

          return;
        }

        /* -------------------------------------------------
           COOL
           ------------------------------------------------- */

        if (
          activeEffect ===
          "cool"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `hue-rotate(${amount * 10}deg) saturate(${1 + amount * 0.2}) brightness(${1.01 + amount * 0.04})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(50,130,255,1)",
            amount * 0.10,
            "soft-light"
          );

          return;
        }

        /* -------------------------------------------------
           NOIR
           ------------------------------------------------- */

        if (
          activeEffect ===
          "noir"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `grayscale(1) contrast(${1.05 + amount * 0.55}) brightness(${1.02 - amount * 0.08})`
          );

          drawVignette(
            ctx,
            width,
            height,
            0.10 +
              amount * 0.25
          );

          return;
        }

        /* -------------------------------------------------
           VINTAGE
           ------------------------------------------------- */

        if (
          activeEffect ===
          "vintage"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `sepia(${0.20 + amount * 0.38}) saturate(${0.82 + amount * 0.15}) contrast(${0.98 + amount * 0.12}) brightness(${1.02 - amount * 0.03})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(175,115,55,1)",
            amount * 0.08,
            "soft-light"
          );

          drawVignette(
            ctx,
            width,
            height,
            0.08 +
              amount * 0.20
          );

          return;
        }

        /* -------------------------------------------------
           DREAM
           ------------------------------------------------- */

        if (
          activeEffect ===
          "dream"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `blur(${0.15 + amount * 0.75}px) brightness(${1.03 + amount * 0.12}) saturate(${1.02 + amount * 0.25}) contrast(${0.96 - amount * 0.04})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(255,220,245,1)",
            0.04 +
              amount * 0.12,
            "screen"
          );

          return;
        }

        /* -------------------------------------------------
           PURPLE GLOW
           ------------------------------------------------- */

        if (
          activeEffect ===
          "purple-glow"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `saturate(${1.08 + amount * 0.7}) contrast(${1.01 + amount * 0.16})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(145,65,255,1)",
            0.08 +
              amount * 0.20,
            "soft-light"
          );

          drawVignette(
            ctx,
            width,
            height,
            0.04 +
              amount * 0.12
          );

          return;
        }

        /* -------------------------------------------------
           NEON
           ------------------------------------------------- */

        if (
          activeEffect ===
          "neon"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `saturate(${1.25 + amount * 1.4}) contrast(${1.08 + amount * 0.30}) brightness(${1.01 + amount * 0.05}) hue-rotate(${amount * 18}deg)`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(20,210,255,1)",
            amount * 0.08,
            "screen"
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(200,20,255,1)",
            amount * 0.07,
            "soft-light"
          );

          return;
        }

        /* -------------------------------------------------
           DRAMA
           ------------------------------------------------- */

        if (
          activeEffect ===
          "drama"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `contrast(${1.10 + amount * 0.50}) saturate(${0.92 + amount * 0.20}) brightness(${0.98 - amount * 0.05})`
          );

          drawVignette(
            ctx,
            width,
            height,
            0.13 +
              amount * 0.30
          );

          return;
        }

        /* -------------------------------------------------
           FILM
           ------------------------------------------------- */

        if (
          activeEffect ===
          "film"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `contrast(${1.02 + amount * 0.16}) saturate(${0.90 + amount * 0.18}) brightness(${1.01 - amount * 0.02}) sepia(${amount * 0.10})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(255,210,150,1)",
            amount * 0.04,
            "soft-light"
          );

          drawVignette(
            ctx,
            width,
            height,
            0.05 +
              amount * 0.16
          );

          return;
        }

        /* -------------------------------------------------
           SOFT FOCUS
           ------------------------------------------------- */

        if (
          activeEffect ===
          "soft-focus"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `blur(${0.25 + amount * 1.1}px) brightness(${1.01 + amount * 0.06}) saturate(${1.01 + amount * 0.08})`
          );

          drawOverlay(
            ctx,
            width,
            height,
            "rgba(255,255,255,1)",
            amount * 0.05,
            "screen"
          );

          return;
        }

        /* -------------------------------------------------
           FACE FOCUS
           ------------------------------------------------- */

        if (
          activeEffect ===
          "face-focus"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `contrast(${1.02 + amount * 0.10}) saturate(${1 + amount * 0.08})`
          );

          drawVignette(
            ctx,
            width,
            height,
            0.08 +
              amount * 0.38
          );

          return;
        }

        /* -------------------------------------------------
           HDR STYLE
           ------------------------------------------------- */

        if (
          activeEffect ===
          "hdr"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `contrast(${1.08 + amount * 0.42}) saturate(${1.08 + amount * 0.50}) brightness(${1.01 + amount * 0.05})`
          );

          return;
        }

        /* -------------------------------------------------
           DUO TONE
           ------------------------------------------------- */

        if (
          activeEffect ===
          "duo-tone"
        ) {
          drawBase(
            video,
            ctx,
            width,
            height,
            `saturate(${0.82 + amount * 0.28}) contrast(${1.02 + amount * 0.16})`
          );

          drawDuoTone(
            ctx,
            width,
            height,
            0.20 +
              amount * 0.35
          );

          return;
        }

        /* -------------------------------------------------
           FALLBACK
           ------------------------------------------------- */

        drawBase(
          video,
          ctx,
          width,
          height
        );
      },
      [
        drawBase,
        drawOverlay,
        drawVignette,
        drawFaceLight,
        drawDuoTone
      ]
    );

  /* =======================================================
     PROCESS FRAME
     ======================================================= */

  const processFrame =
    useCallback(
      () => {
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
          prepareCanvas(
            width,
            height
          );
        }

        try {
          drawEffect(
            video,
            ctx,
            width,
            height
          );

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
        drawEffect,
        prepareCanvas
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

        prepareCanvas(
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

        fpsCounterRef.current = {
          frames: 0,
          time: performance.now()
        };

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

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
        prepareCanvas,
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

      setEngineState(
        "idle"
      );
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

          setEngineState(
            "error"
          );

          return null;
        }

        try {
          setError("");

          sourceStreamRef.current =
            source;

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
              "Unable to start camera effects."
          );

          setEngineState(
            "error"
          );

          return null;
        }
      },
      [
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

        setError("");

        setEngineState(
          "idle"
        );

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

        outputStreamRef.current =
          null;

        outputTrackRef.current =
          null;

        if (source) {
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
      nextEffect => {
        setEffect(
          nextEffect
        );

        effectRef.current =
          nextEffect;

        setError("");

        if (
          !processingRef.current
        ) {
          const source =
            getSourceStream();

          if (source) {
            attachStream(
              source
            );
          }
        }
      },
      [
        getSourceStream,
        attachStream
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
      setEngineState(
        "idle"
      );

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
       * Never stop the original
       * camera or microphone tracks.
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

      outputStreamRef.current =
        null;

      outputTrackRef.current =
        null;

      canvasRef.current =
        null;

      canvasContextRef.current =
        null;
    };
  }, []);

  /* =======================================================
     FILTERED EFFECTS
     ======================================================= */

  const visibleEffects =
    useMemo(() => {
      if (
        category ===
        "All"
      ) {
        return EFFECTS;
      }

      return EFFECTS.filter(
        item =>
          item.category ===
          category
      );
    }, [
      category
    ]);

  /* =======================================================
     STATUS
     ======================================================= */

  const status =
    useMemo(() => {
      if (error) {
        return {
          label: "Effects error",
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
          label: "Starting camera",
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
          label: "Effects active",
          icon: Zap,
          className:
            "text-cyan-300 bg-cyan-500/10 border-cyan-400/20"
        };
      }

      return {
        label: "Ready",
        icon: CircleCheck,
        className:
          "text-emerald-300 bg-emerald-500/10 border-emerald-400/20"
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
              <Sparkles
                size={19}
              />

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
                Professional real-time camera effects
              </p>
            </div>
          </div>

          {/* ENABLE SWITCH */}

          <button
            type="button"
            aria-label={
              enabled
                ? "Disable effects"
                : "Enable effects"
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
            STATUS
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
                        Effects Disabled
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

                <div
                  className="
                    absolute
                    bottom-3
                    left-3
                    rounded-full
                    border
                    border-white/10
                    bg-black/60
                    px-3
                    py-1.5
                    backdrop-blur-xl
                  "
                >
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/60">
                    {
                      EFFECTS.find(
                        item =>
                          item.id ===
                          effect
                      )?.name
                    }
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

        {/* =================================================
            EFFECTS HEADER
            ================================================= */}

        <div className="px-5 pt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                Effects Library
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

          {/* =================================================
              CATEGORY FILTER
              ================================================= */}

          <div
            className="
              mb-3
              flex
              gap-1.5
              overflow-x-auto
              pb-1
              scrollbar-none
            "
          >
            {CATEGORIES.map(item => {
              const selected =
                category ===
                item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setCategory(
                      item
                    )
                  }
                  className={`
                    shrink-0
                    rounded-full
                    border
                    px-3
                    py-1.5
                    text-[8px]
                    font-black
                    uppercase
                    tracking-wider
                    transition
                    ${
                      selected
                        ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-300"
                        : "border-white/[0.06] bg-white/[0.025] text-white/35 hover:bg-white/[0.05] hover:text-white/65"
                    }
                  `}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* =================================================
              EFFECT GRID
              ================================================= */}

          <div
            className="
              grid
              grid-cols-2
              gap-2
              sm:grid-cols-3
            "
          >
            {visibleEffects.map(
              item => {
                const Icon =
                  item.icon;

                const selected =
                  effect ===
                  item.id;

                return (
                  <button
                    key={
                      item.id
                    }
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
                      {
                        item.description
                      }
                    </p>
                  </button>
                );
              }
            )}
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
                  <Sparkles
                    size={14}
                  />
                </div>

                <div>
                  <p className="text-[9px] font-black text-white/65">
                    Real-time browser effects
                  </p>

                  <p className="mt-1 text-[8px] leading-relaxed text-white/30">
                    Effects are processed
                    directly in your browser
                    using the camera video
                    canvas. Your original
                    camera and microphone
                    tracks remain untouched.
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

                Restart Effects Engine
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
                  Effects Error
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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

              <span className="text-[7px] font-black uppercase tracking-widest text-white/25">
                Camera protected
              </span>
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

