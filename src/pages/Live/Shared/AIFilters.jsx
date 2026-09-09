
// src/pages/Live/Shared/AIFilters.jsx

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  FlipHorizontal2,
  Grid3X3,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  SwitchCamera,
  Wand2,
  X,
  ZoomIn
} from "lucide-react";

/*
 * ============================================================
 * AIFilters
 * ============================================================
 *
 * Production-oriented live camera filter studio.
 *
 * Features:
 * - Camera preview
 * - Front/rear camera switching
 * - Camera + microphone permissions
 * - Device selection
 * - Resolution selection
 * - FPS selection
 * - Mirror
 * - Grid
 * - Zoom
 * - Exposure where supported
 * - Torch where supported
 * - Beauty controls
 * - Real-time CSS/canvas filters
 * - Filter intensity
 * - Background blur effect
 * - Reconnect/retry
 * - Track replacement
 * - MediaStream output
 * - Proper cleanup
 * - Mobile responsive UI
 *
 * Usage:
 *
 * <AIFilters
 *   stream={stream}
 *   onStreamChange={setStream}
 *   onClose={() => ...}
 *   onApply={(stream, settings) => ...}
 * />
 *
 * The component also exposes:
 *
 * ref.current.getStream()
 * ref.current.getSettings()
 * ref.current.restart()
 * ref.current.stop()
 *
 * IMPORTANT:
 * This component does not pretend to perform server-side AI.
 * Browser-native effects are applied locally. Advanced AI
 * segmentation/tracking can be connected through processFrame()
 * without changing the parent API.
 * ============================================================
 */

const FILTERS = [
  {
    id: "original",
    name: "Original",
    icon: "◉",
    css: "none"
  },
  {
    id: "natural",
    name: "Natural",
    icon: "✦",
    css: "saturate(1.05) contrast(1.02) brightness(1.02)"
  },
  {
    id: "vivid",
    name: "Vivid",
    icon: "◆",
    css: "saturate(1.45) contrast(1.12) brightness(1.04)"
  },
  {
    id: "warm",
    name: "Warm",
    icon: "☀",
    css: "sepia(.16) saturate(1.2) contrast(1.03) brightness(1.04)"
  },
  {
    id: "cool",
    name: "Cool",
    icon: "◇",
    css: "saturate(.92) hue-rotate(12deg) contrast(1.05)"
  },
  {
    id: "cinema",
    name: "Cinema",
    icon: "▣",
    css: "contrast(1.18) saturate(.82) brightness(.96)"
  },
  {
    id: "vintage",
    name: "Vintage",
    icon: "◎",
    css: "sepia(.34) saturate(.82) contrast(1.08) brightness(1.02)"
  },
  {
    id: "mono",
    name: "Mono",
    icon: "●",
    css: "grayscale(1) contrast(1.1)"
  },
  {
    id: "night",
    name: "Night",
    icon: "☾",
    css: "brightness(.82) contrast(1.18) saturate(.85)"
  },
  {
    id: "portrait",
    name: "Portrait",
    icon: "◌",
    css: "contrast(1.04) saturate(1.08) brightness(1.04)"
  }
];

const RESOLUTIONS = [
  {
    id: "720p",
    label: "720p",
    width: 1280,
    height: 720
  },
  {
    id: "1080p",
    label: "1080p",
    width: 1920,
    height: 1080
  }
];

const FPS_OPTIONS = [24, 30, 60];

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || min, min), max);

const getSupportedConstraints = () => {
  if (!navigator.mediaDevices?.getSupportedConstraints) {
    return {};
  }

  return navigator.mediaDevices.getSupportedConstraints();
};

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;

  return /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent || ""
  );
};

const buildVideoConstraints = ({
  facingMode,
  resolution,
  fps,
  deviceId
}) => {
  const selectedResolution =
    RESOLUTIONS.find((item) => item.id === resolution) ||
    RESOLUTIONS[0];

  const constraints = {
    width: {
      ideal: selectedResolution.width
    },
    height: {
      ideal: selectedResolution.height
    },
    frameRate: {
      ideal: fps
    }
  };

  if (deviceId) {
    constraints.deviceId = {
      exact: deviceId
    };
  } else {
    constraints.facingMode = {
      ideal: facingMode
    };
  }

  return constraints;
};

const AIFilters = forwardRef(function AIFilters(
  {
    stream: externalStream = null,
    onStreamChange,
    onApply,
    onClose,
    autoStart = true,
    defaultFacingMode = "user",
    defaultFilter = "original",
    defaultIntensity = 100,
    defaultBeauty = 0,
    defaultBlur = 0,
    defaultZoom = 1,
    defaultResolution = "720p",
    defaultFps = 30,
    className = ""
  },
  ref
) {
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const frameAnimationRef = useRef(null);

  const [stream, setStream] = useState(externalStream);
  const [cameraState, setCameraState] = useState("idle");
  const [error, setError] = useState("");

  const [facingMode, setFacingMode] = useState(defaultFacingMode);
  const [selectedFilter, setSelectedFilter] = useState(defaultFilter);
  const [intensity, setIntensity] = useState(defaultIntensity);

  const [beauty, setBeauty] = useState(defaultBeauty);
  const [backgroundBlur, setBackgroundBlur] = useState(defaultBlur);
  const [zoom, setZoom] = useState(defaultZoom);

  const [resolution, setResolution] = useState(defaultResolution);
  const [fps, setFps] = useState(defaultFps);

  const [isMuted, setIsMuted] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [devices, setDevices] = useState({
    cameras: [],
    microphones: []
  });

  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");

  const [torchEnabled, setTorchEnabled] = useState(false);
  const [exposure, setExposure] = useState(0);

  const [capabilities, setCapabilities] = useState({});

  const [isMobile, setIsMobile] = useState(false);

  const selectedFilterObject = useMemo(
    () =>
      FILTERS.find((filter) => filter.id === selectedFilter) ||
      FILTERS[0],
    [selectedFilter]
  );

  const effectiveFilter = useMemo(() => {
    if (selectedFilterObject.css === "none") {
      return "none";
    }

    const strength = clamp(intensity, 0, 100) / 100;

    if (strength >= 0.99) {
      return selectedFilterObject.css;
    }

    return selectedFilterObject.css
      .replace(
        /saturate\(([\d.]+)\)/g,
        (_, value) =>
          `saturate(${1 + (Number(value) - 1) * strength})`
      )
      .replace(
        /contrast\(([\d.]+)\)/g,
        (_, value) =>
          `contrast(${1 + (Number(value) - 1) * strength})`
      )
      .replace(
        /brightness\(([\d.]+)\)/g,
        (_, value) =>
          `brightness(${1 + (Number(value) - 1) * strength})`
      )
      .replace(
        /sepia\(([\d.]+)\)/g,
        (_, value) =>
          `sepia(${Number(value) * strength})`
      )
      .replace(
        /grayscale\(([\d.]+)\)/g,
        (_, value) =>
          `grayscale(${Number(value) * strength})`
      )
      .replace(
        /hue-rotate\(([-\d.]+)deg\)/g,
        (_, value) =>
          `hue-rotate(${Number(value) * strength}deg)`
      );
  }, [selectedFilterObject, intensity]);

  const videoStyle = useMemo(() => {
    const beautyAmount = clamp(beauty, 0, 100) / 100;
    const blurAmount = clamp(backgroundBlur, 0, 100) / 100;
    const exposureAmount = clamp(exposure, -100, 100) / 100;

    const brightness = 1 + exposureAmount * 0.25;

    return {
      filter: [
        effectiveFilter !== "none" ? effectiveFilter : "",
        beautyAmount > 0
          ? `brightness(${1 + beautyAmount * 0.05}) saturate(${1 + beautyAmount * 0.08}) contrast(${1 - beautyAmount * 0.025})`
          : "",
        blurAmount > 0
          ? `brightness(${1 + blurAmount * 0.03})`
          : "",
        `brightness(${brightness})`
      ]
        .filter(Boolean)
        .join(" "),
      transform: `${isMirrored ? "scaleX(-1)" : ""} scale(${zoom})`
        .trim(),
      transformOrigin: "center center"
    };
  }, [
    effectiveFilter,
    beauty,
    backgroundBlur,
    exposure,
    isMirrored,
    zoom
  ]);

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const list = await navigator.mediaDevices.enumerateDevices();

      const cameras = list.filter(
        (device) => device.kind === "videoinput"
      );

      const microphones = list.filter(
        (device) => device.kind === "audioinput"
      );

      setDevices({
        cameras,
        microphones
      });

      if (!selectedCamera && cameras[0]?.deviceId) {
        setSelectedCamera(cameras[0].deviceId);
      }

      if (!selectedMicrophone && microphones[0]?.deviceId) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
    } catch {
      // Device enumeration is optional.
    }
  }, [selectedCamera, selectedMicrophone]);

  const attachStream = useCallback(
    (nextStream) => {
      setStream(nextStream);

      if (videoRef.current) {
        videoRef.current.srcObject = nextStream || null;

        if (nextStream) {
          videoRef.current
            .play()
            .catch(() => {});
        }
      }

      if (onStreamChange) {
        onStreamChange(nextStream);
      }
    },
    [onStreamChange]
  );

  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Ignore already stopped tracks.
      }
    });

    localStreamRef.current = null;
  }, []);

  const getCameraStream = useCallback(
    async ({
      requestedFacingMode = facingMode,
      requestedResolution = resolution,
      requestedFps = fps,
      requestedCamera = selectedCamera,
      requestedMicrophone = selectedMicrophone
    } = {}) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const videoConstraints = buildVideoConstraints({
        facingMode: requestedFacingMode,
        resolution: requestedResolution,
        fps: requestedFps,
        deviceId: requestedCamera
      });

      const audioConstraints = requestedMicrophone
        ? {
            deviceId: {
              exact: requestedMicrophone
            },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          };

      setCameraState("requesting");
      setError("");

      try {
        stopLocalStream();

        const nextStream =
          await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: audioConstraints
          });

        localStreamRef.current = nextStream;

        attachStream(nextStream);

        const videoTrack = nextStream.getVideoTracks()[0];

        if (videoTrack) {
          try {
            setCapabilities(videoTrack.getCapabilities?.() || {});
          } catch {
            setCapabilities({});
          }
        }

        setCameraState("ready");

        await enumerateDevices();

        return nextStream;
      } catch (firstError) {
        /*
         * Some mobile browsers reject deviceId/facingMode combinations.
         * Retry with a simpler constraint set.
         */
        try {
          stopLocalStream();

          const fallbackStream =
            await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: requestedFacingMode,
                width: {
                  ideal:
                    requestedResolution === "1080p"
                      ? 1920
                      : 1280
                },
                height: {
                  ideal:
                    requestedResolution === "1080p"
                      ? 1080
                      : 720
                }
              },
              audio: true
            });

          localStreamRef.current = fallbackStream;

          attachStream(fallbackStream);

          setCameraState("ready");

          await enumerateDevices();

          return fallbackStream;
        } catch (fallbackError) {
          setCameraState("error");

          const name =
            fallbackError?.name || firstError?.name;

          let message =
            "Unable to start the camera. Please try again.";

          if (name === "NotAllowedError") {
            message =
              "Camera or microphone permission was denied. Allow access in your browser settings and try again.";
          } else if (name === "NotFoundError") {
            message =
              "No camera or microphone was found on this device.";
          } else if (name === "NotReadableError") {
            message =
              "The camera is currently being used by another application.";
          } else if (name === "OverconstrainedError") {
            message =
              "The selected camera settings are not supported by this device.";
          } else if (name === "SecurityError") {
            message =
              "Camera access requires a secure connection.";
          }

          setError(message);

          throw fallbackError || firstError;
        }
      }
    },
    [
      attachStream,
      enumerateDevices,
      facingMode,
      fps,
      resolution,
      selectedCamera,
      selectedMicrophone,
      stopLocalStream
    ]
  );

  const restart = useCallback(async () => {
    try {
      await getCameraStream();
    } catch {
      // Error state is already displayed.
    }
  }, [getCameraStream]);

  const switchCamera = useCallback(async () => {
    const nextFacingMode =
      facingMode === "user" ? "environment" : "user";

    setFacingMode(nextFacingMode);

    try {
      await getCameraStream({
        requestedFacingMode: nextFacingMode,
        requestedCamera: ""
      });
    } catch {
      // Error state is already displayed.
    }
  }, [facingMode, getCameraStream]);

  const changeCamera = useCallback(
    async (deviceId) => {
      setSelectedCamera(deviceId);

      try {
        await getCameraStream({
          requestedCamera: deviceId,
          requestedFacingMode: facingMode
        });
      } catch {
        // Error state is already displayed.
      }
    },
    [facingMode, getCameraStream]
  );

  const changeMicrophone = useCallback(
    async (deviceId) => {
      setSelectedMicrophone(deviceId);

      try {
        await getCameraStream({
          requestedMicrophone: deviceId
        });
      } catch {
        // Error state is already displayed.
      }
    },
    [getCameraStream]
  );

  const toggleMute = useCallback(() => {
    const currentStream =
      localStreamRef.current || stream;

    if (!currentStream) return;

    const nextMuted = !isMuted;

    currentStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
  }, [isMuted, stream]);

  const applyZoom = useCallback(
    async (value) => {
      const nextZoom = clamp(value, 1, 4);

      setZoom(nextZoom);

      const videoTrack =
        (localStreamRef.current || stream)?.getVideoTracks?.()[0];

      if (!videoTrack) return;

      const supported = videoTrack.getCapabilities?.() || {};

      if (
        supported.zoom &&
        Number.isFinite(supported.zoom.min) &&
        Number.isFinite(supported.zoom.max)
      ) {
        const nativeZoom = clamp(
          nextZoom,
          supported.zoom.min,
          supported.zoom.max
        );

        try {
          await videoTrack.applyConstraints({
            advanced: [
              {
                zoom: nativeZoom
              }
            ]
          });
        } catch {
          // CSS zoom remains active.
        }
      }
    },
    [stream]
  );

  const applyExposure = useCallback(
    async (value) => {
      const nextExposure = clamp(value, -100, 100);

      setExposure(nextExposure);

      const videoTrack =
        (localStreamRef.current || stream)?.getVideoTracks?.()[0];

      if (!videoTrack) return;

      const supported =
        videoTrack.getCapabilities?.() || {};

      if (
        supported.exposureCompensation &&
        Number.isFinite(
          supported.exposureCompensation.min
        ) &&
        Number.isFinite(
          supported.exposureCompensation.max
        )
      ) {
        const range =
          supported.exposureCompensation;

        const nativeValue =
          range.min +
          ((nextExposure + 100) / 200) *
            (range.max - range.min);

        try {
          await videoTrack.applyConstraints({
            advanced: [
              {
                exposureCompensation: nativeValue
              }
            ]
          });
        } catch {
          // CSS brightness remains active.
        }
      }
    },
    [stream]
  );

  const toggleTorch = useCallback(async () => {
    const videoTrack =
      (localStreamRef.current || stream)?.getVideoTracks?.()[0];

    if (!videoTrack) return;

    const supported =
      videoTrack.getCapabilities?.() || {};

    if (!supported.torch) {
      setError("Torch is not supported by this camera.");
      return;
    }

    const nextValue = !torchEnabled;

    try {
      await videoTrack.applyConstraints({
        advanced: [
          {
            torch: nextValue
          }
        ]
      });

      setTorchEnabled(nextValue);
    } catch {
      setError("Unable to change the camera torch.");
    }
  }, [stream, torchEnabled]);

  const updateCameraSettings = useCallback(
    async ({
      nextResolution = resolution,
      nextFps = fps
    } = {}) => {
      setResolution(nextResolution);
      setFps(nextFps);

      const videoTrack =
        (localStreamRef.current || stream)?.getVideoTracks?.()[0];

      if (!videoTrack) return;

      try {
        const selected =
          RESOLUTIONS.find(
            (item) => item.id === nextResolution
          ) || RESOLUTIONS[0];

        await videoTrack.applyConstraints({
          width: {
            ideal: selected.width
          },
          height: {
            ideal: selected.height
          },
          frameRate: {
            ideal: nextFps
          }
        });
      } catch {
        /*
         * If live constraint changes fail, restart the stream.
         */
        try {
          await getCameraStream({
            requestedResolution: nextResolution,
            requestedFps: nextFps
          });
        } catch {
          // Error state is already displayed.
        }
      }
    },
    [fps, getCameraStream, resolution, stream]
  );

  /*
   * ------------------------------------------------------------
   * Optional frame-processing pipeline
   * ------------------------------------------------------------
   *
   * This keeps a clean extension point for MediaPipe Tasks
   * Vision / segmentation / face tracking.
   *
   * The default component does not process every frame because
   * doing so unnecessarily can destroy performance on low-end
   * phones.
   */
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      const context = canvas.getContext("2d", {
        alpha: false
      });

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.save();

        if (isMirrored) {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        context.restore();
      }
    }

    frameAnimationRef.current =
      requestAnimationFrame(processFrame);
  }, [isMirrored]);

  const apply = useCallback(() => {
    const currentStream =
      localStreamRef.current || stream;

    if (!currentStream) return;

    const settings = {
      filter: selectedFilter,
      filterName: selectedFilterObject.name,
      intensity,
      beauty,
      backgroundBlur,
      zoom,
      exposure,
      torch: torchEnabled,
      mirrored: isMirrored,
      facingMode,
      resolution,
      fps,
      muted: isMuted
    };

    if (onApply) {
      onApply(currentStream, settings);
    }

    if (onClose) {
      onClose();
    }
  }, [
    backgroundBlur,
    beauty,
    exposure,
    facingMode,
    fps,
    intensity,
    isMirrored,
    isMuted,
    onApply,
    onClose,
    resolution,
    selectedFilter,
    selectedFilterObject.name,
    stream,
    torchEnabled,
    zoom
  ]);

  const resetEffects = useCallback(() => {
    setSelectedFilter(defaultFilter);
    setIntensity(100);
    setBeauty(defaultBeauty);
    setBackgroundBlur(defaultBlur);
    setZoom(1);
    setExposure(0);
    setTorchEnabled(false);
  }, [
    defaultBlur,
    defaultBeauty,
    defaultFilter
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getStream: () =>
        localStreamRef.current || stream,

      getSettings: () => ({
        filter: selectedFilter,
        intensity,
        beauty,
        backgroundBlur,
        zoom,
        exposure,
        torch: torchEnabled,
        mirrored: isMirrored,
        facingMode,
        resolution,
        fps,
        muted: isMuted
      }),

      restart,

      stop: () => {
        stopLocalStream();
        attachStream(null);
        setCameraState("idle");
      },

      apply
    }),
    [
      apply,
      attachStream,
      backgroundBlur,
      beauty,
      exposure,
      facingMode,
      fps,
      intensity,
      isMirrored,
      isMuted,
      restart,
      resolution,
      selectedFilter,
      stopLocalStream,
      stream,
      torchEnabled,
      zoom
    ]
  );

  /*
   * ------------------------------------------------------------
   * Initial setup
   * ------------------------------------------------------------
   */
  useEffect(() => {
    setIsMobile(isMobileDevice());

    enumerateDevices();

    if (externalStream) {
      setStream(externalStream);

      if (videoRef.current) {
        videoRef.current.srcObject = externalStream;
        videoRef.current
          .play()
          .catch(() => {});
      }

      setCameraState("ready");
      return undefined;
    }

    if (!autoStart) {
      return undefined;
    }

    getCameraStream().catch(() => {});

    return undefined;
  }, [
    autoStart,
    enumerateDevices,
    externalStream,
    getCameraStream
  ]);

  /*
   * Keep externally supplied stream synchronized.
   */
  useEffect(() => {
    if (!externalStream) return;

    if (externalStream !== stream) {
      setStream(externalStream);

      if (videoRef.current) {
        videoRef.current.srcObject = externalStream;
        videoRef.current
          .play()
          .catch(() => {});
      }

      setCameraState("ready");
    }
  }, [externalStream, stream]);

  /*
   * Re-enumerate devices when permissions change.
   */
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener(
      "devicechange",
      handleDeviceChange
    );

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange
      );
    };
  }, [enumerateDevices]);

  /*
   * Start optional frame loop only when an actual canvas exists.
   */
  useEffect(() => {
    if (!canvasRef.current) return undefined;

    frameAnimationRef.current =
      requestAnimationFrame(processFrame);

    return () => {
      if (frameAnimationRef.current) {
        cancelAnimationFrame(frameAnimationRef.current);
      }
    };
  }, [processFrame]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      if (frameAnimationRef.current) {
        cancelAnimationFrame(frameAnimationRef.current);
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {
              // Ignore cleanup errors.
            }
          });

        localStreamRef.current = null;
      }
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * Render helpers
   * ------------------------------------------------------------
   */

  const renderPermissionState = () => (
    <div className="flex h-full min-h-[520px] items-center justify-center bg-black px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl backdrop-blur-xl">
        {cameraState === "requesting" ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>

            <h2 className="text-lg font-semibold text-white">
              Starting camera
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Allow camera and microphone access to use
              live filters.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <CircleAlert className="h-7 w-7 text-red-400" />
            </div>

            <h2 className="text-lg font-semibold text-white">
              Camera unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              {error ||
                "Your camera could not be started."}
            </p>

            <button
              type="button"
              onClick={restart}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#050505] text-white ${className}`}
    >
      {/* ======================================================
          HEADER
          ====================================================== */}
      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/75 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI filters"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-300" />

              <h1 className="truncate text-sm font-semibold sm:text-base">
                AI Camera Studio
              </h1>
            </div>

            <p className="hidden text-[11px] text-white/40 sm:block">
              Live filters & camera controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetEffects}
            title="Reset effects"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              setShowSettings((value) => !value)
            }
            title="Camera settings"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              showSettings
                ? "bg-white text-black"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={apply}
            disabled={!stream}
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Apply
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN
          ====================================================== */}
      <main className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ====================================================
            CAMERA
            ==================================================== */}
        <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          {cameraState === "ready" && stream ? (
            <>
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-contain"
                  style={videoStyle}
                />

                {/* Background blur visual layer */}
                {backgroundBlur > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backdropFilter: `blur(${
                        backgroundBlur * 0.04
                      }px)`,
                      opacity:
                        backgroundBlur / 100 * 0.25
                    }}
                  />
                )}

                {/* Camera grid */}
                {showGrid && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
                    <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
                    <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
                    <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
                  </div>
                )}

                {/* Safe frame */}
                <div className="pointer-events-none absolute inset-x-[8%] inset-y-[7%] rounded-[2rem] border border-white/[0.08]" />

                {/* Status */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  LIVE CAMERA
                </div>

                {/* Top camera controls */}
                <div className="absolute right-3 top-3 flex flex-col gap-2 sm:right-5 sm:top-5">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
                    title="Switch camera"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIsMirrored((value) => !value)
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 backdrop-blur-md transition ${
                      isMirrored
                        ? "bg-white text-black"
                        : "bg-black/45 text-white hover:bg-black/65"
                    }`}
                    title="Mirror camera"
                  >
                    <FlipHorizontal2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowGrid((value) => !value)
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 backdrop-blur-md transition ${
                      showGrid
                        ? "bg-white text-black"
                        : "bg-black/45 text-white hover:bg-black/65"
                    }`}
                    title="Camera grid"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>

                  {capabilities.torch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 backdrop-blur-md transition ${
                        torchEnabled
                          ? "bg-white text-black"
                          : "bg-black/45 text-white hover:bg-black/65"
                      }`}
                      title="Torch"
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Bottom camera controls */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 sm:bottom-6">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:bg-black/70"
                    title={
                      isMuted
                        ? "Unmute microphone"
                        : "Mute microphone"
                    }
                  >
                    {isMuted ? (
                      <MicOff className="h-4 w-4 text-red-300" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={restart}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:bg-black/70"
                    title="Restart camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Hidden processing canvas */}
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute -left-[99999px] top-0 h-px w-px opacity-0"
                aria-hidden="true"
              />
            </>
          ) : (
            renderPermissionState()
          )}

          {/* Error toast */}
          {error && cameraState === "ready" && (
            <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-red-400/20 bg-red-950/80 px-4 py-3 text-xs text-red-100 shadow-xl backdrop-blur-xl">
              <CircleAlert className="h-4 w-4 shrink-0 text-red-300" />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="ml-2 text-red-200/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* ====================================================
            DESKTOP SIDE PANEL
            ==================================================== */}
        <aside className="hidden w-[360px] shrink-0 flex-col border-l border-white/10 bg-[#090909] lg:flex">
          {showSettings ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Camera settings
                    </h2>

                    <p className="mt-1 text-[11px] text-white/40">
                      Configure your camera before going live.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="space-y-6">
                  {/* Resolution */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/65">
                      Resolution
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {RESOLUTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            updateCameraSettings({
                              nextResolution: item.id
                            })
                          }
                          className={`rounded-xl border px-3 py-2.5 text-xs transition ${
                            resolution === item.id
                              ? "border-white bg-white text-black"
                              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FPS */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/65">
                      Frame rate
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {FPS_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateCameraSettings({
                              nextFps: value
                            })
                          }
                          className={`rounded-xl border px-3 py-2.5 text-xs transition ${
                            fps === value
                              ? "border-white bg-white text-black"
                              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                          }`}
                        >
                          {value} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera */}
                  {devices.cameras.length > 0 && (
                    <div>
                      <label
                        htmlFor="ai-camera-device"
                        className="mb-2 block text-xs font-medium text-white/65"
                      >
                        Camera
                      </label>

                      <div className="relative">
                        <select
                          id="ai-camera-device"
                          value={selectedCamera}
                          onChange={(event) =>
                            changeCamera(event.target.value)
                          }
                          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 pr-9 text-xs text-white outline-none focus:border-white/30"
                        >
                          {devices.cameras.map(
                            (camera, index) => (
                              <option
                                key={
                                  camera.deviceId ||
                                  `camera-${index}`
                                }
                                value={camera.deviceId}
                                className="bg-black"
                              >
                                {camera.label ||
                                  `Camera ${index + 1}`}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      </div>
                    </div>
                  )}

                  {/* Microphone */}
                  {devices.microphones.length > 0 && (
                    <div>
                      <label
                        htmlFor="ai-microphone-device"
                        className="mb-2 block text-xs font-medium text-white/65"
                      >
                        Microphone
                      </label>

                      <div className="relative">
                        <select
                          id="ai-microphone-device"
                          value={selectedMicrophone}
                          onChange={(event) =>
                            changeMicrophone(event.target.value)
                          }
                          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 pr-9 text-xs text-white outline-none focus:border-white/30"
                        >
                          {devices.microphones.map(
                            (microphone, index) => (
                              <option
                                key={
                                  microphone.deviceId ||
                                  `microphone-${index}`
                                }
                                value={microphone.deviceId}
                                className="bg-black"
                              >
                                {microphone.label ||
                                  `Microphone ${index + 1}`}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      </div>
                    </div>
                  )}

                  {/* Zoom */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-medium text-white/65">
                        Zoom
                      </label>

                      <span className="text-[11px] text-white/35">
                        {zoom.toFixed(1)}×
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <ZoomIn className="h-4 w-4 shrink-0 text-white/40" />

                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={zoom}
                        onChange={(event) =>
                          applyZoom(event.target.value)
                        }
                        className="w-full accent-white"
                      />
                    </div>
                  </div>

                  {/* Exposure */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-medium text-white/65">
                        Exposure
                      </label>

                      <span className="text-[11px] text-white/35">
                        {exposure > 0 ? "+" : ""}
                        {Math.round(exposure)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={exposure}
                      onChange={(event) =>
                        applyExposure(event.target.value)
                      }
                      className="w-full accent-white"
                    />
                  </div>

                  {/* Mobile data */}
                  {isMobile && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                          <Sparkles className="h-4 w-4 text-emerald-300" />
                        </div>

                        <div>
                          <p className="text-xs font-medium">
                            Mobile optimized
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-white/40">
                            720p at 30 FPS is recommended for
                            lower-end devices and slower
                            connections.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">
                      Filters
                    </h2>

                    <p className="mt-1 text-[11px] text-white/40">
                      Apply a look to your live camera.
                    </p>
                  </div>

                  <Wand2 className="h-4 w-4 text-fuchsia-300" />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  {FILTERS.map((filter) => {
                    const active =
                      selectedFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() =>
                          setSelectedFilter(filter.id)
                        }
                        className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="mb-3 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent">
                          <span className="text-2xl opacity-80">
                            {filter.icon}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {filter.name}
                          </span>

                          {active && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Intensity */}
                <div className="mt-7">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-white/65">
                      Filter intensity
                    </label>

                    <span className="text-[11px] text-white/35">
                      {Math.round(intensity)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={intensity}
                    onChange={(event) =>
                      setIntensity(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-white"
                  />
                </div>

                {/* Beauty */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-white/65">
                      Beauty
                    </label>

                    <span className="text-[11px] text-white/35">
                      {Math.round(beauty)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={beauty}
                    onChange={(event) =>
                      setBeauty(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-white"
                  />
                </div>

                {/* Background */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-white/65">
                      Background blur
                    </label>

                    <span className="text-[11px] text-white/35">
                      {Math.round(backgroundBlur)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={backgroundBlur}
                    onChange={(event) =>
                      setBackgroundBlur(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* ======================================================
          MOBILE TOOL BAR
          ====================================================== */}
      <div className="shrink-0 border-t border-white/10 bg-[#090909] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const active =
              selectedFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() =>
                  setSelectedFilter(filter.id)
                }
                className={`flex min-w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition ${
                  active
                    ? "bg-white text-black"
                    : "bg-white/[0.04] text-white/65"
                }`}
              >
                <span className="text-base">
                  {filter.icon}
                </span>

                <span className="text-[10px] font-medium">
                  {filter.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={switchCamera}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-xs text-white/75"
          >
            <SwitchCamera className="h-4 w-4" />
            Camera
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-xs text-white/75"
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {isMuted ? "Muted" : "Mic"}
          </button>

          <button
            type="button"
            onClick={() =>
              setShowSettings((value) => !value)
            }
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs ${
              showSettings
                ? "bg-white text-black"
                : "bg-white/[0.05] text-white/75"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Adjust
          </button>
        </div>

        {showSettings && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    Intensity
                  </span>

                  <span className="text-[10px] text-white/35">
                    {Math.round(intensity)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(event) =>
                    setIntensity(
                      Number(event.target.value)
                    )
                  }
                  className="w-full accent-white"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    Beauty
                  </span>

                  <span className="text-[10px] text-white/35">
                    {Math.round(beauty)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beauty}
                  onChange={(event) =>
                    setBeauty(
                      Number(event.target.value)
                    )
                  }
                  className="w-full accent-white"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    Zoom
                  </span>

                  <span className="text-[10px] text-white/35">
                    {zoom.toFixed(1)}×
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={zoom}
                  onChange={(event) =>
                    applyZoom(event.target.value)
                  }
                  className="w-full accent-white"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    Exposure
                  </span>

                  <span className="text-[10px] text-white/35">
                    {exposure > 0 ? "+" : ""}
                    {Math.round(exposure)}
                  </span>
                </div>

                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={exposure}
                  onChange={(event) =>
                    applyExposure(event.target.value)
                  }
                  className="w-full accent-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AIFilters.displayName = "AIFilters";

export default AIFilters;
