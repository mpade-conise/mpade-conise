import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  ArrowLeft,
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
  Wand2,
  X
} from "lucide-react";

/*
 * ============================================================
 * EFFECTS
 * ============================================================
 */

const EFFECTS = [
  {
    id: "none",
    name: "Original",
    description: "Natural camera",
    category: "Basic"
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Soft skin glow",
    category: "Beauty"
  },
  {
    id: "face-light",
    name: "Face Light",
    description: "Brightens the face",
    category: "Beauty"
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Teal and orange film look",
    category: "Cinematic"
  },
  {
    id: "vivid",
    name: "Vivid",
    description: "Boosted colors",
    category: "Color"
  },
  {
    id: "warm",
    name: "Warm",
    description: "Warm golden tones",
    category: "Color"
  },
  {
    id: "cool",
    name: "Cool",
    description: "Cool blue tones",
    category: "Color"
  },
  {
    id: "noir",
    name: "Noir",
    description: "Black and white",
    category: "Cinematic"
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Classic film colors",
    category: "Cinematic"
  },
  {
    id: "dream",
    name: "Dream",
    description: "Soft dreamy glow",
    category: "Creative"
  },
  {
    id: "purple-glow",
    name: "Purple Glow",
    description: "Purple cinematic glow",
    category: "Creative"
  },
  {
    id: "neon",
    name: "Neon",
    description: "Bright neon colors",
    category: "Creative"
  },
  {
    id: "drama",
    name: "Drama",
    description: "Deep cinematic contrast",
    category: "Cinematic"
  },
  {
    id: "film",
    name: "Film",
    description: "Warm film finish",
    category: "Cinematic"
  },
  {
    id: "soft-focus",
    name: "Soft Focus",
    description: "Soft glowing image",
    category: "Beauty"
  },
  {
    id: "face-focus",
    name: "Face Focus",
    description: "Cinematic face emphasis",
    category: "Beauty"
  },
  {
    id: "hdr",
    name: "HDR",
    description: "High dynamic range look",
    category: "Color"
  },
  {
    id: "duo-tone",
    name: "Duo Tone",
    description: "Blue and purple cinematic tone",
    category: "Creative"
  }
];

const CATEGORIES = [
  "All",
  "Basic",
  "Beauty",
  "Color",
  "Cinematic",
  "Creative"
];

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function cx() {
  return Array.prototype.slice
    .call(arguments)
    .filter(Boolean)
    .join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isUsableStream(source) {
  return (
    source &&
    typeof source.getVideoTracks === "function" &&
    source.getVideoTracks().some(
      (track) => track && track.readyState !== "ended"
    )
  );
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const AIFilters = ({
  stream = null,
  videoRef = null,
  onProcessedStream = null,
  onProcessedTrack = null,
  className = "",
  compact = false,
  defaultOpen = false
}) => {
  /*
   * ==========================================================
   * UI STATE
   * ==========================================================
   */

  const [open, setOpen] = useState(defaultOpen);
  const [enabled, setEnabled] = useState(true);
  const [effect, setEffect] = useState("none");
  const [intensity, setIntensity] = useState(55);
  const [category, setCategory] = useState("All");
  const [engineState, setEngineState] = useState("idle");
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [fps, setFps] = useState(0);

  /*
   * ==========================================================
   * LIFECYCLE REFS
   * ==========================================================
   */

  const mountedRef = useRef(false);
  const startingRef = useRef(false);

  /*
   * ==========================================================
   * CAMERA REFS
   * ==========================================================
   */

  const sourceStreamRef = useRef(null);
  const sourceVideoRef = useRef(null);

  /*
   * ==========================================================
   * CANVAS REFS
   * ==========================================================
   */

  const canvasRef = useRef(null);
  const canvasContextRef = useRef(null);

  /*
   * ==========================================================
   * OUTPUT REFS
   * ==========================================================
   */

  const outputStreamRef = useRef(null);
  const outputTrackRef = useRef(null);

  /*
   * ==========================================================
   * PROCESSING REFS
   * ==========================================================
   */

  const animationFrameRef = useRef(null);
  const processingRef = useRef(false);
  const processedSourceRef = useRef(null);

  /*
   * ==========================================================
   * VALUE REFS
   * ==========================================================
   */

  const effectRef = useRef(effect);
  const intensityRef = useRef(intensity);
  const enabledRef = useRef(enabled);

  /*
   * ==========================================================
   * CALLBACK REFS
   * ==========================================================
   */

  const onProcessedStreamRef = useRef(onProcessedStream);
  const onProcessedTrackRef = useRef(onProcessedTrack);

  /*
   * ==========================================================
   * PREVIEW
   * ==========================================================
   */

  const previewVideoRef = useRef(null);

  /*
   * ==========================================================
   * FPS
   * ==========================================================
   */

  const fpsCounterRef = useRef({
    frames: 0,
    time: 0
  });

  /*
   * ==========================================================
   * KEEP CALLBACKS CURRENT
   * ==========================================================
   */

  useEffect(() => {
    onProcessedStreamRef.current = onProcessedStream;
  }, [onProcessedStream]);

  useEffect(() => {
    onProcessedTrackRef.current = onProcessedTrack;
  }, [onProcessedTrack]);

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
   * ==========================================================
   * SOURCE STREAM
   * ==========================================================
   */

  const getSourceStream = useCallback(() => {
    if (isUsableStream(stream)) {
      return stream;
    }

    if (
      videoRef &&
      videoRef.current &&
      isUsableStream(videoRef.current.srcObject)
    ) {
      return videoRef.current.srcObject;
    }

    if (isUsableStream(sourceStreamRef.current)) {
      return sourceStreamRef.current;
    }

    return null;
  }, [stream, videoRef]);

  /*
   * ==========================================================
   * STOP ANIMATION
   * ==========================================================
   */

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /*
   * ==========================================================
   * CLEAN PROCESSED OUTPUT
   *
   * IMPORTANT:
   * This ONLY stops the canvas-created video track.
   *
   * It NEVER stops the real camera track.
   * ==========================================================
   */

  const cleanupOutput = useCallback(() => {
    const output = outputStreamRef.current;

    if (output) {
      const tracks = output.getVideoTracks();

      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          // Ignore cleanup errors.
        }
      });
    }

    outputStreamRef.current = null;
    outputTrackRef.current = null;
  }, []);

  /*
   * ==========================================================
   * CLEAN HIDDEN SOURCE VIDEO
   *
   * This does NOT stop camera tracks.
   * ==========================================================
   */

  const cleanupSourceVideo = useCallback(() => {
    const video = sourceVideoRef.current;

    if (!video) {
      return;
    }

    try {
      video.pause();
    } catch (err) {
      // Ignore.
    }

    try {
      video.srcObject = null;
    } catch (err) {
      // Ignore.
    }

    sourceVideoRef.current = null;
  }, []);

  /*
   * ==========================================================
   * RESTORE ORIGINAL CAMERA TRACK
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * The original camera track is restored BEFORE the processed
   * canvas track is stopped.
   *
   * We intentionally do NOT send the original stream through
   * onProcessedStream because the parent may have cleanup logic
   * that stops tracks belonging to that stream.
   * ==========================================================
   */

  const restoreOriginalCamera = useCallback(() => {
    const source =
      sourceStreamRef.current ||
      getSourceStream();

    if (!source) {
      if (onProcessedTrackRef.current) {
        onProcessedTrackRef.current(null);
      }

      if (onProcessedStreamRef.current) {
        onProcessedStreamRef.current(null);
      }

      return null;
    }

    const originalVideoTracks =
      typeof source.getVideoTracks === "function"
        ? source.getVideoTracks()
        : [];

    const originalTrack =
      originalVideoTracks.find(
        (track) =>
          track &&
          track.readyState !== "ended"
      ) || null;

    /*
     * First restore the original video track.
     */
    if (onProcessedTrackRef.current) {
      onProcessedTrackRef.current(
        originalTrack
      );
    }

    /*
     * Clear processed stream reference.
     *
     * DO NOT send source here.
     */
    if (onProcessedStreamRef.current) {
      onProcessedStreamRef.current(null);
    }

    return originalTrack;
  }, [getSourceStream]);

  /*
   * ==========================================================
   * FULL PROCESSING CLEANUP
   * ==========================================================
   */

  const cleanupProcessing = useCallback(() => {
    processingRef.current = false;
    startingRef.current = false;

    stopAnimation();

    /*
     * MOST IMPORTANT ORDER:
     *
     * 1. Restore original camera track.
     * 2. Give React/WebRTC a frame to switch tracks.
     * 3. Stop processed canvas track.
     */

    restoreOriginalCamera();

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        cleanupOutput();
        cleanupSourceVideo();
      });
    } else {
      cleanupOutput();
      cleanupSourceVideo();
    }

    processedSourceRef.current = null;

    fpsCounterRef.current = {
      frames: 0,
      time: 0
    };

    if (mountedRef.current) {
      setEngineState("idle");
      setFps(0);
    }
  }, [
    cleanupOutput,
    cleanupSourceVideo,
    restoreOriginalCamera,
    stopAnimation
  ]);

  /*
   * ==========================================================
   * INDEPENDENT BACK BUTTON
   * ==========================================================
   */

  const handleBack = useCallback(() => {
    setError("");

    /*
     * Restore camera before visually closing.
     */
    cleanupProcessing();

    /*
     * UI closes independently.
     */
    setOpen(false);
  }, [cleanupProcessing]);

  /*
   * ==========================================================
   * OPEN
   * ==========================================================
   */

  const handleOpen = useCallback(() => {
    setError("");
    setOpen(true);
  }, []);

  /*
   * ==========================================================
   * CREATE HIDDEN SOURCE VIDEO
   * ==========================================================
   */

  const createSourceVideo = useCallback(
    async (source) => {
      if (!isUsableStream(source)) {
        throw new Error(
          "No usable camera stream was found."
        );
      }

      const video =
        document.createElement("video");

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      video.setAttribute(
        "playsinline",
        "true"
      );

      video.srcObject = source;

      await new Promise(
        (resolve, reject) => {
          let finished = false;

          const finish = (callback) => {
            if (finished) {
              return;
            }

            finished = true;

            video.onloadedmetadata = null;
            video.onerror = null;

            callback();
          };

          const timeout =
            window.setTimeout(() => {
              if (video.readyState >= 1) {
                finish(resolve);
              } else {
                finish(() => {
                  reject(
                    new Error(
                      "Camera video metadata could not be loaded."
                    )
                  );
                });
              }
            }, 5000);

          video.onloadedmetadata = () => {
            window.clearTimeout(timeout);
            finish(resolve);
          };

          video.onerror = () => {
            window.clearTimeout(timeout);

            finish(() => {
              reject(
                new Error(
                  "Unable to read the camera video."
                )
              );
            });
          };
        }
      );

      try {
        await video.play();
      } catch (err) {
        /*
         * Autoplay may already be allowed.
         */
      }

      return video;
    },
    []
  );

  /*
   * ==========================================================
   * PREPARE CANVAS
   * ==========================================================
   */

  const prepareCanvas = useCallback(
    (width, height) => {
      let canvas = canvasRef.current;

      if (!canvas) {
        canvas =
          document.createElement(
            "canvas"
          );

        canvasRef.current = canvas;
      }

      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d", {
          alpha: false,
          desynchronized: true
        });

      if (!context) {
        throw new Error(
          "Your browser does not support the required canvas engine."
        );
      }

      canvasContextRef.current = context;

      return {
        canvas,
        context
      };
    },
    []
  );

  /*
   * ==========================================================
   * CREATE OUTPUT STREAM
   * ==========================================================
   */

  const createOutputStream =
    useCallback((source, canvas) => {
      if (
        !canvas ||
        typeof canvas.captureStream !==
          "function"
      ) {
        throw new Error(
          "Canvas streaming is not supported by this browser."
        );
      }

      const output =
        canvas.captureStream(30);

      const videoTracks =
        output.getVideoTracks();

      if (!videoTracks.length) {
        throw new Error(
          "Unable to create the processed camera track."
        );
      }

      /*
       * Preserve original camera audio.
       *
       * The audio tracks are NOT stopped by
       * cleanupOutput().
       */
      const sourceAudioTracks =
        typeof source.getAudioTracks ===
        "function"
          ? source.getAudioTracks()
          : [];

      sourceAudioTracks.forEach(
        (track) => {
          try {
            output.addTrack(track);
          } catch (err) {
            /*
             * Ignore duplicate audio errors.
             */
          }
        }
      );

      outputStreamRef.current = output;
      outputTrackRef.current =
        videoTracks[0];

      return output;
    }, []);

  /*
   * ==========================================================
   * DRAW BASE
   * ==========================================================
   */

  const drawBase = useCallback(
    (
      video,
      context,
      width,
      height,
      filter
    ) => {
      context.save();

      context.filter =
        filter || "none";

      context.globalCompositeOperation =
        "source-over";

      context.globalAlpha = 1;

      context.drawImage(
        video,
        0,
        0,
        width,
        height
      );

      context.restore();
    },
    []
  );

  /*
   * ==========================================================
   * DRAW OVERLAY
   * ==========================================================
   */

  const drawOverlay = useCallback(
    (
      context,
      width,
      height,
      color,
      alpha,
      composite
    ) => {
      context.save();

      context.globalCompositeOperation =
        composite || "screen";

      context.globalAlpha = alpha;
      context.fillStyle = color;

      context.fillRect(
        0,
        0,
        width,
        height
      );

      context.restore();
    },
    []
  );

  /*
   * ==========================================================
   * VIGNETTE
   * ==========================================================
   */

  const drawVignette = useCallback(
    (
      context,
      width,
      height,
      strength
    ) => {
      const gradient =
        context.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(
            width,
            height
          ) * 0.18,
          width / 2,
          height / 2,
          Math.max(
            width,
            height
          ) * 0.72
        );

      gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
      );

      gradient.addColorStop(
        1,
        "rgba(0,0,0," +
          clamp(
            strength,
            0,
            1
          ) +
          ")"
      );

      context.save();

      context.globalCompositeOperation =
        "multiply";

      context.fillStyle = gradient;

      context.fillRect(
        0,
        0,
        width,
        height
      );

      context.restore();
    },
    []
  );

  /*
   * ==========================================================
   * FACE LIGHT
   * ==========================================================
   */

  const drawFaceLight =
    useCallback(
      (
        context,
        width,
        height,
        strength
      ) => {
        const gradient =
          context.createRadialGradient(
            width * 0.5,
            height * 0.38,
            Math.min(
              width,
              height
            ) * 0.05,
            width * 0.5,
            height * 0.4,
            Math.min(
              width,
              height
            ) * 0.7
          );

        gradient.addColorStop(
          0,
          "rgba(255,255,255," +
            clamp(
              strength,
              0,
              0.35
            ) +
            ")"
        );

        gradient.addColorStop(
          0.45,
          "rgba(255,225,205," +
            clamp(
              strength * 0.35,
              0,
              0.2
            ) +
            ")"
        );

        gradient.addColorStop(
          1,
          "rgba(255,255,255,0)"
        );

        context.save();

        context.globalCompositeOperation =
          "screen";

        context.fillStyle =
          gradient;

        context.fillRect(
          0,
          0,
          width,
          height
        );

        context.restore();
      },
      []
    );

  /*
   * ==========================================================
   * DUO TONE
   * ==========================================================
   */

  const drawDuoTone =
    useCallback(
      (
        context,
        width,
        height,
        strength
      ) => {
        const gradient =
          context.createLinearGradient(
            0,
            0,
            width,
            height
          );

        gradient.addColorStop(
          0,
          "rgba(48,90,255," +
            clamp(
              strength,
              0,
              0.45
            ) +
            ")"
        );

        gradient.addColorStop(
          0.5,
          "rgba(140,65,255," +
            clamp(
              strength,
              0,
              0.35
            ) +
            ")"
        );

        gradient.addColorStop(
          1,
          "rgba(255,105,55," +
            clamp(
              strength,
              0,
              0.4
            ) +
            ")"
        );

        context.save();

        context.globalCompositeOperation =
          "soft-light";

        context.fillStyle =
          gradient;

        context.fillRect(
          0,
          0,
          width,
          height
        );

        context.restore();
      },
      []
    );

  /*
   * ==========================================================
   * EFFECT ENGINE
   * ==========================================================
   */

  const drawEffect = useCallback(
    (
      video,
      context,
      width,
      height
    ) => {
      const selected =
        effectRef.current;

      const amount = clamp(
        intensityRef.current / 100,
        0,
        1
      );

      if (
        !enabledRef.current ||
        selected === "none"
      ) {
        drawBase(
          video,
          context,
          width,
          height,
          "none"
        );

        return;
      }

      switch (selected) {
        case "beauty":
          drawBase(
            video,
            context,
            width,
            height,
            "blur(" +
              (
                0.25 +
                amount * 0.9
              ).toFixed(2) +
              "px) brightness(" +
              (
                1 +
                amount * 0.08
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.12
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,220,210,1)",
            amount * 0.08,
            "screen"
          );
          break;

        case "face-light":
          drawBase(
            video,
            context,
            width,
            height,
            "brightness(" +
              (
                1 +
                amount * 0.16
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.06
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.08
              ).toFixed(2) +
              ")"
          );

          drawFaceLight(
            context,
            width,
            height,
            amount
          );
          break;

        case "cinematic":
          drawBase(
            video,
            context,
            width,
            height,
            "contrast(" +
              (
                1 +
                amount * 0.2
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.1
              ).toFixed(2) +
              ") brightness(" +
              (
                1 -
                amount * 0.04
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(10,120,120,1)",
            amount * 0.11,
            "soft-light"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,125,50,1)",
            amount * 0.07,
            "screen"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.32
          );
          break;

        case "vivid":
          drawBase(
            video,
            context,
            width,
            height,
            "saturate(" +
              (
                1 +
                amount * 0.75
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.16
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.04
              ).toFixed(2) +
              ")"
          );
          break;

        case "warm":
          drawBase(
            video,
            context,
            width,
            height,
            "sepia(" +
              (
                amount * 0.3
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.3
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.04
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,150,65,1)",
            amount * 0.1,
            "soft-light"
          );
          break;

        case "cool":
          drawBase(
            video,
            context,
            width,
            height,
            "hue-rotate(" +
              (
                -amount * 12
              ).toFixed(1) +
              "deg) saturate(" +
              (
                1 +
                amount * 0.18
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.03
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(50,130,255,1)",
            amount * 0.1,
            "soft-light"
          );
          break;

        case "noir":
          drawBase(
            video,
            context,
            width,
            height,
            "grayscale(1) contrast(" +
              (
                1 +
                amount * 0.45
              ).toFixed(2) +
              ") brightness(" +
              (
                1 -
                amount * 0.06
              ).toFixed(2) +
              ")"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.5
          );
          break;

        case "vintage":
          drawBase(
            video,
            context,
            width,
            height,
            "sepia(" +
              (
                amount * 0.48
              ).toFixed(2) +
              ") saturate(" +
              (
                1 -
                amount * 0.1
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.1
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.03
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(120,70,30,1)",
            amount * 0.08,
            "multiply"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.25
          );
          break;

        case "dream":
          drawBase(
            video,
            context,
            width,
            height,
            "blur(" +
              (
                0.25 +
                amount * 1.2
              ).toFixed(2) +
              "px) brightness(" +
              (
                1 +
                amount * 0.08
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.1
              ).toFixed(2) +
              ") contrast(" +
              (
                1 -
                amount * 0.04
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,180,225,1)",
            amount * 0.08,
            "screen"
          );
          break;

        case "purple-glow":
          drawBase(
            video,
            context,
            width,
            height,
            "saturate(" +
              (
                1 +
                amount * 0.2
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.1
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(155,65,255,1)",
            amount * 0.15,
            "soft-light"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.28
          );
          break;

        case "neon":
          drawBase(
            video,
            context,
            width,
            height,
            "saturate(" +
              (
                1 +
                amount * 0.8
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.2
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.05
              ).toFixed(2) +
              ") hue-rotate(" +
              (
                amount * 12
              ).toFixed(1) +
              "deg)"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(0,255,255,1)",
            amount * 0.08,
            "screen"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,0,190,1)",
            amount * 0.06,
            "soft-light"
          );
          break;

        case "drama":
          drawBase(
            video,
            context,
            width,
            height,
            "contrast(" +
              (
                1 +
                amount * 0.5
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.12
              ).toFixed(2) +
              ") brightness(" +
              (
                1 -
                amount * 0.08
              ).toFixed(2) +
              ")"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.55
          );
          break;

        case "film":
          drawBase(
            video,
            context,
            width,
            height,
            "contrast(" +
              (
                1 +
                amount * 0.16
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.04
              ).toFixed(2) +
              ") brightness(" +
              (
                1 -
                amount * 0.02
              ).toFixed(2) +
              ") sepia(" +
              (
                amount * 0.16
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,145,65,1)",
            amount * 0.06,
            "soft-light"
          );

          drawVignette(
            context,
            width,
            height,
            amount * 0.2
          );
          break;

        case "soft-focus":
          drawBase(
            video,
            context,
            width,
            height,
            "blur(" +
              (
                0.2 +
                amount * 1.25
              ).toFixed(2) +
              "px) brightness(" +
              (
                1 +
                amount * 0.07
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.08
              ).toFixed(2) +
              ")"
          );

          drawOverlay(
            context,
            width,
            height,
            "rgba(255,255,255,1)",
            amount * 0.07,
            "screen"
          );
          break;

        case "face-focus":
          drawBase(
            video,
            context,
            width,
            height,
            "contrast(" +
              (
                1 +
                amount * 0.14
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.1
              ).toFixed(2) +
              ")"
          );

          drawVignette(
            context,
            width,
            height,
            0.18 +
              amount * 0.38
          );
          break;

        case "hdr":
          drawBase(
            video,
            context,
            width,
            height,
            "contrast(" +
              (
                1 +
                amount * 0.38
              ).toFixed(2) +
              ") saturate(" +
              (
                1 +
                amount * 0.25
              ).toFixed(2) +
              ") brightness(" +
              (
                1 +
                amount * 0.03
              ).toFixed(2) +
              ")"
          );
          break;

        case "duo-tone":
          drawBase(
            video,
            context,
            width,
            height,
            "saturate(" +
              (
                1 +
                amount * 0.18
              ).toFixed(2) +
              ") contrast(" +
              (
                1 +
                amount * 0.12
              ).toFixed(2) +
              ")"
          );

          drawDuoTone(
            context,
            width,
            height,
            amount
          );
          break;

        default:
          drawBase(
            video,
            context,
            width,
            height,
            "none"
          );
      }
    },
    [
      drawBase,
      drawDuoTone,
      drawFaceLight,
      drawOverlay,
      drawVignette
    ]
  );

  /*
   * ==========================================================
   * FRAME PROCESSOR
   * ==========================================================
   */

  const processFrame = useCallback(() => {
    if (
      !processingRef.current ||
      !mountedRef.current ||
      !open
    ) {
      animationFrameRef.current = null;
      return;
    }

    const video =
      sourceVideoRef.current;

    const canvas =
      canvasRef.current;

    const context =
      canvasContextRef.current;

    if (
      !video ||
      !canvas ||
      !context
    ) {
      animationFrameRef.current =
        requestAnimationFrame(
          processFrame
        );

      return;
    }

    if (video.readyState < 2) {
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

    drawEffect(
      video,
      context,
      width,
      height
    );

    const now =
      performance.now();

    if (
      !fpsCounterRef.current.time
    ) {
      fpsCounterRef.current.time =
        now;
    }

    fpsCounterRef.current.frames += 1;

    if (
      now -
        fpsCounterRef.current.time >=
      1000
    ) {
      if (mountedRef.current) {
        setFps(
          fpsCounterRef.current.frames
        );
      }

      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.time = now;
    }

    animationFrameRef.current =
      requestAnimationFrame(
        processFrame
      );
  }, [drawEffect, open]);

  /*
   * ==========================================================
   * START PROCESSING
   * ==========================================================
   */

  const startProcessing =
    useCallback(
      async (source) => {
        if (
          !mountedRef.current ||
          !open ||
          !isUsableStream(source)
        ) {
          return null;
        }

        if (
          processingRef.current &&
          processedSourceRef.current === source &&
          outputStreamRef.current
        ) {
          return outputStreamRef.current;
        }

        if (startingRef.current) {
          return outputStreamRef.current;
        }

        startingRef.current = true;

        setError("");
        setEngineState("loading");

        try {
          stopAnimation();

          /*
           * We are replacing an old processed output.
           * The source camera is never stopped.
           */
          cleanupOutput();
          cleanupSourceVideo();

          processedSourceRef.current =
            source;

          sourceStreamRef.current =
            source;

          const video =
            await createSourceVideo(
              source
            );

          if (
            !mountedRef.current ||
            !open
          ) {
            try {
              video.pause();
              video.srcObject = null;
            } catch (err) {
              // Ignore.
            }

            return null;
          }

          sourceVideoRef.current =
            video;

          const width =
            video.videoWidth || 1280;

          const height =
            video.videoHeight || 720;

          const prepared =
            prepareCanvas(
              width,
              height
            );

          const output =
            createOutputStream(
              source,
              prepared.canvas
            );

          if (
            !mountedRef.current ||
            !open
          ) {
            cleanupOutput();
            cleanupSourceVideo();

            return null;
          }

          processingRef.current =
            true;

          fpsCounterRef.current = {
            frames: 0,
            time: performance.now()
          };

          setEngineState(
            "processing"
          );

          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          if (
            onProcessedStreamRef.current
          ) {
            onProcessedStreamRef.current(
              output
            );
          }

          if (
            onProcessedTrackRef.current &&
            outputTrackRef.current
          ) {
            onProcessedTrackRef.current(
              outputTrackRef.current
            );
          }

          return output;
        } catch (err) {
          if (mountedRef.current) {
            setEngineState("error");

            setError(
              err &&
                err.message
                ? err.message
                : "Unable to start AI Effects."
            );
          }

          return null;
        } finally {
          startingRef.current = false;
        }
      },
      [
        cleanupOutput,
        cleanupSourceVideo,
        createOutputStream,
        createSourceVideo,
        open,
        prepareCanvas,
        processFrame,
        stopAnimation
      ]
    );

  /*
   * ==========================================================
   * STOP PROCESSING WITHOUT CLOSING UI
   * ==========================================================
   */

  const stopProcessing =
    useCallback(() => {
      processingRef.current = false;

      stopAnimation();

      if (mountedRef.current) {
        setEngineState("idle");
        setFps(0);
      }
    }, [stopAnimation]);

  /*
   * ==========================================================
   * ATTACH CAMERA
   * ==========================================================
   */

  const attachStream =
    useCallback(
      async (source) => {
        if (
          !open ||
          !isUsableStream(source)
        ) {
          return;
        }

        try {
          await startProcessing(
            source
          );
        } catch (err) {
          if (mountedRef.current) {
            setEngineState("error");

            setError(
              err &&
                err.message
                ? err.message
                : "Unable to attach camera stream."
            );
          }
        }
      },
      [open, startProcessing]
    );

  /*
   * ==========================================================
   * RESTART ENGINE
   * ==========================================================
   */

  const restart = useCallback(
    async () => {
      if (!open) {
        return;
      }

      const source =
        getSourceStream();

      /*
       * Restore the real camera first.
       */
      restoreOriginalCamera();

      stopProcessing();

      cleanupOutput();
      cleanupSourceVideo();

      processedSourceRef.current =
        null;

      sourceStreamRef.current =
        source;

      setError("");
      setEngineState("idle");

      if (source) {
        await attachStream(source);
      }
    },
    [
      attachStream,
      cleanupOutput,
      cleanupSourceVideo,
      getSourceStream,
      open,
      restoreOriginalCamera,
      stopProcessing
    ]
  );

  /*
   * ==========================================================
   * EFFECT CONTROLS
   * ==========================================================
   */

  const handleEffectChange =
    useCallback(
      (nextEffect) => {
        setEffect(nextEffect);
        effectRef.current =
          nextEffect;
      },
      []
    );

  const handleEnabledChange =
    useCallback(
      (nextEnabled) => {
        setEnabled(nextEnabled);
        enabledRef.current =
          nextEnabled;
      },
      []
    );

  /*
   * ==========================================================
   * MOUNT
   * ==========================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * ==========================================================
   * CAMERA WATCHER
   * ==========================================================
   */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const checkSource =
      async () => {
        if (
          cancelled ||
          !mountedRef.current ||
          !open
        ) {
          return;
        }

        const source =
          getSourceStream();

        if (
          isUsableStream(source)
        ) {
          await attachStream(
            source
          );

          return;
        }

        timer =
          window.setTimeout(
            checkSource,
            250
          );
      };

    checkSource();

    return () => {
      cancelled = true;

      if (timer) {
        window.clearTimeout(
          timer
        );
      }
    };
  }, [
    attachStream,
    getSourceStream,
    open
  ]);

  /*
   * ==========================================================
   * SOURCE CHANGES
   * ==========================================================
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    const source =
      getSourceStream();

    if (!source) {
      return;
    }

    if (
      source !==
        processedSourceRef.current &&
      !startingRef.current
    ) {
      attachStream(source);
    }
  }, [
    attachStream,
    getSourceStream,
    open,
    stream
  ]);

  /*
   * ==========================================================
   * PREVIEW
   * ==========================================================
   */

  useEffect(() => {
    const preview =
      previewVideoRef.current;

    if (!preview || !open) {
      return;
    }

    const output =
      outputStreamRef.current;

    if (output) {
      preview.srcObject =
        output;

      const playPreview =
        async () => {
          try {
            await preview.play();
          } catch (err) {
            // Autoplay may be blocked.
          }
        };

      playPreview();
    }

    return () => {
      if (
        preview &&
        preview.srcObject ===
          output
      ) {
        preview.srcObject = null;
      }
    };
  }, [
    engineState,
    effect,
    enabled,
    open,
    previewOpen
  ]);

  /*
   * ==========================================================
   * CLOSED STATE
   * ==========================================================
   *
   * When closed, only the independent launcher is rendered.
   * ==========================================================
   */

  if (!open) {
    return (
      <div
        className={cx(
          "fixed bottom-24 right-4 z-[220]",
          className
        )}
      >
        <button
          type="button"
          onClick={handleOpen}
          className="group flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-950/95 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-xl transition-all hover:border-cyan-300/60 hover:bg-cyan-500/10 hover:text-cyan-200"
          aria-label="Open AI Effects"
          title="AI Effects"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 transition group-hover:bg-cyan-400/20">
            <Sparkles size={17} />
          </span>

          <span>
            AI Effects
          </span>
        </button>
      </div>
    );
  }

  /*
   * ==========================================================
   * FILTERED EFFECTS
   * ==========================================================
   */

  const visibleEffects =
    category === "All"
      ? EFFECTS
      : EFFECTS.filter(
          (item) =>
            item.category ===
            category
        );

  const selectedEffect =
    EFFECTS.find(
      (item) =>
        item.id === effect
    ) || EFFECTS[0];

  /*
   * ==========================================================
   * STATUS
   * ==========================================================
   */

  let status = {
    label: "Ready",
    icon: Sparkles,
    className:
      "text-slate-300"
  };

  if (
    engineState === "loading"
  ) {
    status = {
      label: "Starting AI engine",
      icon: Loader2,
      className:
        "text-cyan-300"
    };
  } else if (
    engineState ===
    "processing"
  ) {
    status = {
      label: enabled
        ? "AI effects active"
        : "Camera processing",
      icon: CircleCheck,
      className:
        "text-emerald-300"
    };
  } else if (
    engineState === "error"
  ) {
    status = {
      label: "AI engine error",
      icon: CircleAlert,
      className:
        "text-red-300"
    };
  }

  const StatusIcon =
    status.icon;

  /*
   * ==========================================================
   * OPEN STUDIO
   * ==========================================================
   */

  return (
    <div
      className={cx(
        "fixed inset-0 z-[220] flex items-start justify-end bg-black/45 backdrop-blur-[2px]",
        className
      )}
    >
      <div
        className={cx(
          "relative flex h-full w-full flex-col overflow-hidden border-l border-cyan-400/20 bg-slate-950/98 text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-xl",
          compact
            ? "max-w-xl"
            : "sm:max-w-5xl"
        )}
      >
        {/* TOP BAR */}

        <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleBack}
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-200"
            aria-label="Go back"
          >
            <ArrowLeft
              size={17}
              className="transition-transform group-hover:-translate-x-0.5"
            />

            <span>
              Back
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                MPade AI
              </div>

              <div className="text-[9px] text-slate-500">
                Live camera effects
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
              aria-label="Close AI Effects"
              title="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* CONTENT */}

        <div className="h-full overflow-y-auto pt-16">
          {/* HEADER */}

          <div className="border-b border-white/10 bg-white/[0.025] px-5 pb-4 pt-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 shadow-lg shadow-cyan-500/10">
                  <Wand2
                    size={21}
                    className="text-cyan-300"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-bold sm:text-xl">
                      AI Effects Studio
                    </h2>

                    <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                      LIVE
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Real-time camera visual effects
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleEnabledChange(
                    !enabled
                  )
                }
                className={cx(
                  "relative flex h-9 w-16 shrink-0 items-center rounded-full border p-1 transition-all",
                  enabled
                    ? "border-cyan-400/40 bg-cyan-500/20"
                    : "border-white/10 bg-white/5"
                )}
                aria-label={
                  enabled
                    ? "Disable AI effects"
                    : "Enable AI effects"
                }
              >
                <span
                  className={cx(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                    enabled
                      ? "translate-x-7 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/30"
                      : "translate-x-0 bg-slate-600 text-slate-300"
                  )}
                >
                  {enabled ? (
                    <Eye size={15} />
                  ) : (
                    <EyeOff size={15} />
                  )}
                </span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <div
                className={cx(
                  "flex items-center gap-1.5",
                  status.className
                )}
              >
                <StatusIcon
                  size={14}
                  className={
                    engineState ===
                    "loading"
                      ? "animate-spin"
                      : ""
                  }
                />

                <span>
                  {status.label}
                </span>
              </div>

              {engineState ===
                "processing" && (
                <>
                  <span className="text-slate-700">
                    •
                  </span>

                  <span className="text-slate-400">
                    {fps > 0
                      ? fps +
                        " FPS"
                      : "Live"}
                  </span>
                </>
              )}

              <span className="text-slate-700">
                •
              </span>

              <span className="text-slate-400">
                {selectedEffect.name}
              </span>
            </div>
          </div>

          {/* PREVIEW */}

          {!compact &&
            previewOpen && (
              <div className="px-4 pt-4 sm:px-6">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <video
                    ref={
                      previewVideoRef
                    }
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md">
                    <span
                      className={cx(
                        "h-2 w-2 rounded-full",
                        enabled
                          ? "animate-pulse bg-emerald-400"
                          : "bg-slate-500"
                      )}
                    />

                    <span className="text-slate-200">
                      {enabled
                        ? "Effect preview"
                        : "Original camera"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewOpen(
                        false
                      )
                    }
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70"
                    aria-label="Hide preview"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
              </div>
            )}

          {!compact &&
            !previewOpen && (
              <div className="px-4 pt-4 sm:px-6">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewOpen(
                      true
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Eye size={16} />
                  Show preview
                </button>
              </div>
            )}

          {/* EFFECTS */}

          <div className="px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={17}
                    className="text-cyan-300"
                  />

                  <h3 className="font-semibold">
                    Effects
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Choose a visual style for your live camera
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 sm:flex">
                <Zap
                  size={13}
                  className="text-yellow-300"
                />

                Real-time
              </div>
            </div>

            {/* CATEGORIES */}

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setCategory(
                        item
                      )
                    }
                    className={cx(
                      "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                      category ===
                        item
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-lg shadow-cyan-500/10"
                        : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            {/* EFFECT GRID */}

            <div
              className={cx(
                "grid gap-3",
                compact
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {visibleEffects.map(
                (item) => {
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
                      className={cx(
                        "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                        selected
                          ? "border-cyan-400/50 bg-cyan-400/[0.09] shadow-lg shadow-cyan-500/10"
                          : "border-white/10 bg-white/[0.025] hover:border-cyan-400/25 hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cx(
                            "flex h-9 w-9 items-center justify-center rounded-xl border transition-all",
                            selected
                              ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-200"
                              : "border-white/10 bg-white/5 text-slate-400 group-hover:text-cyan-300"
                          )}
                        >
                          {item.id ===
                          "none" ? (
                            <Eye
                              size={
                                16
                              }
                            />
                          ) : (
                            <Sparkles
                              size={
                                16
                              }
                            />
                          )}
                        </div>

                        {selected && (
                          <CircleCheck
                            size={
                              17
                            }
                            className="shrink-0 text-cyan-300"
                          />
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-semibold">
                          {
                            item.name
                          }
                        </div>

                        <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {
                            item.description
                          }
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {/* INTENSITY */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal
                    size={16}
                    className="text-cyan-300"
                  />

                  <span className="text-sm font-semibold">
                    Intensity
                  </span>
                </div>

                <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-300">
                  {intensity}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(
                  event
                ) =>
                  setIntensity(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="w-full accent-cyan-400"
                aria-label="Effect intensity"
              />

              <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                <span>
                  Subtle
                </span>

                <span>
                  Strong
                </span>
              </div>
            </div>

            {/* ADVANCED */}

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              <button
                type="button"
                onClick={() =>
                  setShowAdvanced(
                    !showAdvanced
                  )
                }
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2">
                  <Zap
                    size={16}
                    className="text-purple-300"
                  />

                  <div>
                    <div className="text-sm font-semibold">
                      Advanced processing
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Camera processing and performance
                    </div>
                  </div>
                </div>

                <ChevronDown
                  size={17}
                  className={cx(
                    "text-slate-500 transition-transform",
                    showAdvanced
                      ? "rotate-180"
                      : ""
                  )}
                />
              </button>

              {showAdvanced && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs leading-relaxed text-slate-500">
                      AI Effects runs locally on the camera feed. Original camera audio is preserved.
                    </div>

                    <button
                      type="button"
                      onClick={
                        restart
                      }
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-200"
                    >
                      <RefreshCw
                        size={14}
                      />

                      Restart engine
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4">
                <CircleAlert
                  size={18}
                  className="mt-0.5 shrink-0 text-red-300"
                />

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-red-200">
                    AI Effects unavailable
                  </div>

                  <div className="mt-1 text-xs leading-relaxed text-red-300/70">
                    {error}
                  </div>

                  <button
                    type="button"
                    onClick={
                      restart
                    }
                    className="mt-3 flex items-center gap-2 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-400/15"
                  >
                    <RefreshCw
                      size={13}
                    />

                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="border-t border-white/10 bg-white/[0.02] px-5 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-600">
              <div className="flex items-center gap-2">
                <CircleCheck
                  size={12}
                  className="text-emerald-400/70"
                />

                Camera protected
              </div>

              <div className="flex items-center gap-2">
                <Sparkles
                  size={12}
                  className="text-cyan-400/70"
                />

                MPade AI Studio
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFilters;
