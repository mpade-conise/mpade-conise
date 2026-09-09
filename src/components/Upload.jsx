import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ArrowLeft,
  Upload as UploadIcon,
  Camera,
  Video,
  Image as ImageIcon,
  Music,
  Search,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RotateCcw,
  RotateCw,
  Crop,
  Scissors,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Sparkles,
  Wand2,
  Type,
  Smile,
  Captions,
  Palette,
  SlidersHorizontal,
  Layers,
  Clock3,
  CalendarDays,
  MapPin,
  Globe2,
  Lock,
  Users,
  UserCheck,
  Download,
  Eye,
  EyeOff,
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Hash,
  AtSign,
  Link,
  ShoppingBag,
  Megaphone,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Save,
  Send,
  Settings2,
  Zap,
  Gauge,
  Grid3X3,
  FlipHorizontal2,
  FlipVertical2,
  Maximize2,
  Minimize2,
  Rotate3D,
  Volume1,
  AudioLines,
  Subtitles,
  ListVideo,
  BarChart3,
  FileVideo,
  HardDrive,
  Wifi,
  WifiOff,
  Signal,
  Smartphone,
  Monitor,
  CheckCircle2,
  CircleAlert,
  Info,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Copy,
  Replace,
  MoveHorizontal,
  Timer,
  Circle,
  Square,
  Focus,
  Sun,
  Lightbulb,
  UserRound,
  ScanFace,
  Eraser,
  Paintbrush,
  CircleDot,
  SquareDashed,
  RotateCcw as ResetIcon
} from "lucide-react";

import confetti from "canvas-confetti";

import { supabase } from "../lib/supabaseClient";

import AIFilters from "./AIFilters";

/* ============================================================
   CONSTANTS
   ============================================================ */

const VIDEO_BUCKET = "videos";

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_DURATION_SECONDS = 600;

const DEFAULT_FILTERS = [
  {
    id: "original",
    name: "Original",
    css: "none"
  },
  {
    id: "cinema",
    name: "Cinema",
    css: "contrast(1.08) saturate(0.9)"
  },
  {
    id: "vibrant",
    name: "Vibrant",
    css: "saturate(1.35) contrast(1.08)"
  },
  {
    id: "warm",
    name: "Golden Hour",
    css: "sepia(.15) saturate(1.2) contrast(1.03)"
  },
  {
    id: "cool",
    name: "Electric Blue",
    css: "saturate(1.15) hue-rotate(8deg) contrast(1.05)"
  },
  {
    id: "bw",
    name: "B&W Cinema",
    css: "grayscale(1) contrast(1.12)"
  },
  {
    id: "vintage",
    name: "Vintage 90s",
    css: "sepia(.28) saturate(.9) contrast(.95)"
  },
  {
    id: "midnight",
    name: "Midnight",
    css: "brightness(.78) contrast(1.15) saturate(.9)"
  },
  {
    id: "neon",
    name: "Neon Cyber",
    css: "saturate(1.6) contrast(1.2) hue-rotate(20deg)"
  }
];

const CATEGORIES = [
  "Entertainment",
  "Music & Beats",
  "Gaming & Esports",
  "AI & Tech",
  "Comedy & Humor",
  "Fitness & Wellness",
  "Fashion & Beauty",
  "Education & How-To",
  "Crypto & Web3",
  "Travel & Adventure",
  "Food & Culinary",
  "Art & VFX"
];

const ASPECT_RATIOS = [
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 }
];

const SPEEDS = [0.3, 0.5, 0.75, 1, 1.5, 2, 3];

const RECORDING_SPEEDS = [0.5, 1, 2, 3];

const TRENDING_HASHTAGS = [
  "fyp",
  "universe",
  "viral",
  "mpade",
  "creator",
  "trending",
  "dance",
  "afrobeats",
  "tech",
  "vibes",
  "malawi",
  "malawitiktok"
];

const AI_HOOKS = [
  "Wait until you see what happens next 👀",
  "Nobody expected this 😂",
  "This changed everything 🔥",
  "POV: you finally understand it",
  "I was not ready for this 😭",
  "You need to see this before scrolling",
  "The ending is crazy 🤯",
  "Tell me you noticed this too 👀"
];

const FONT_OPTIONS = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Impact"
];

const TEXT_ANIMATIONS = [
  "none",
  "fade",
  "pop",
  "slide-up",
  "slide-left",
  "zoom"
];

const TRANSITIONS = [
  "none",
  "crossfade",
  "fade",
  "slide",
  "zoom"
];

const PRIVACY_OPTIONS = [
  {
    value: "public",
    label: "Everyone",
    icon: Globe2
  },
  {
    value: "followers",
    label: "Followers",
    icon: Users
  },
  {
    value: "private",
    label: "Only me",
    icon: Lock
  }
];

const INITIAL_DRAFT = {
  title: "",
  caption: "",
  category: "Entertainment",
  language: "English",
  location: "",
  privacy: "public",
  isPrivate: false,
  allowComments: true,
  allowDuet: true,
  allowStitch: true,
  allowDownload: true,
  ageRestricted: false,
  isCommercial: false,
  sponsorTag: "",
  contentWarning: "",
  blockedWords: [],
  countryRestrictions: [],
  audienceSettings: {},
  tags: [],
  mentions: [],
  creatorNotes: "",
  scheduledAt: "",
  isDraft: false
};

/* ============================================================
   HELPERS
   ============================================================ */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "00:00";

  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function safeFileName(name = "video") {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 80);
}

function extractHashtags(text = "") {
  return [
    ...new Set(
      [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((match) =>
        match[1].toLowerCase()
      )
    )
  ];
}

function extractMentions(text = "") {
  return [
    ...new Set(
      [...text.matchAll(/@([\p{L}\p{N}_.-]+)/gu)].map((match) =>
        match[1]
      )
    )
  ];
}

function isVideoFile(file) {
  return Boolean(
    file &&
      (file.type?.startsWith("video/") ||
        /\.(mp4|webm|mov|m4v|avi|mkv|3gp)$/i.test(file.name))
  );
}

function getVideoMimeType(file) {
  if (file?.type) return file.type;

  const extension = file?.name?.split(".").pop()?.toLowerCase();

  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  if (extension === "m4v") return "video/x-m4v";

  return "video/mp4";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function revokeObjectUrl(url) {
  if (!url) return;

  try {
    URL.revokeObjectURL(url);
  } catch {
    // noop
  }
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4"
  ];

  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ""
  );
}

function normalizeMediaError(error) {
  const message = error?.message || String(error || "");

  if (/permission|denied|notallowed/i.test(message)) {
    return "Camera or microphone permission was denied.";
  }

  if (/cors|cross-origin/i.test(message)) {
    return "This audio source cannot be mixed in the browser because its server does not allow cross-origin media access.";
  }

  if (/network|fetch|offline/i.test(message)) {
    return "Network connection interrupted. Check your connection and try again.";
  }

  if (/decode|codec|not supported|unsupported/i.test(message)) {
    return "This media format cannot be processed by your browser.";
  }

  return message || "Something went wrong while processing the media.";
}

function getAspectRatio(width, height) {
  if (!width || !height) return "9:16";

  const ratio = width / height;

  const closest = ASPECT_RATIOS.reduce(
    (best, item) =>
      Math.abs(item.value - ratio) < Math.abs(best.value - ratio)
        ? item
        : best,
    ASPECT_RATIOS[0]
  );

  return closest.id;
}

/* ============================================================
   VIDEO METADATA
   ============================================================ */

function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No video file selected."));
      return;
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    let settled = false;

    const cleanup = () => {
      revokeObjectUrl(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      if (settled) return;

      const metadata = {
        duration: Number(video.duration || 0),
        width: Number(video.videoWidth || 0),
        height: Number(video.videoHeight || 0),
        aspectRatio: getAspectRatio(video.videoWidth, video.videoHeight),
        mimeType: getVideoMimeType(file),
        fileSize: file.size,
        fileName: file.name,
        lastModified: file.lastModified
      };

      if (!metadata.duration || !metadata.width || !metadata.height) {
        fail(new Error("The selected video appears to be corrupted."));
        return;
      }

      settled = true;
      cleanup();
      resolve(metadata);
    };

    video.onerror = () => {
      fail(new Error("The selected video could not be decoded."));
    };

    video.src = objectUrl;
  });
}

/* ============================================================
   THUMBNAIL
   ============================================================ */

function generateThumbnail(file, time = 0.1, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    let loaded = false;

    const cleanup = () => {
      revokeObjectUrl(url);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const targetTime = clamp(
        Number(time) || 0,
        0,
        Math.max(0, video.duration - 0.05)
      );

      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if (loaded) return;
      loaded = true;

      const canvas = document.createElement("canvas");

      const width = Math.min(video.videoWidth || 720, 1280);
      const height = Math.max(
        1,
        Math.round(
          width *
            ((video.videoHeight || 1280) /
              (video.videoWidth || 720))
        )
      );

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        cleanup();
        reject(new Error("Thumbnail canvas is unavailable."));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          cleanup();

          if (!blob) {
            reject(new Error("Could not generate video thumbnail."));
            return;
          }

          resolve(
            new File(
              [blob],
              `thumbnail_${Date.now()}.jpg`,
              {
                type: "image/jpeg",
                lastModified: Date.now()
              }
            )
          );
        },
        "image/jpeg",
        quality
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not generate a thumbnail from this video."));
    };

    video.src = url;
  });
}

/* ============================================================
   AUDIO MIXING
   ============================================================ */

async function loadAudioElement(source, crossOrigin = true) {
  const audio = document.createElement("audio");

  audio.preload = "auto";

  if (crossOrigin) {
    audio.crossOrigin = "anonymous";
  }

  audio.src = source;

  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Audio source timed out while loading."));
    }, 20000);

    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve();
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Music source could not be loaded."));
    };

    audio.load();
  });

  return audio;
}

async function mergeVideoWithMusic({
  videoFile,
  musicUrl,
  originalVolume = 1,
  musicVolume = 1,
  musicOffset = 0,
  musicDuration = 0,
  fadeIn = 0,
  fadeOut = 0,
  onProgress
}) {
  if (!videoFile) {
    throw new Error("No source video is available.");
  }

  if (!musicUrl) {
    return videoFile;
  }

  if (!window.AudioContext && !window.webkitAudioContext) {
    throw new Error(
      "Your browser does not support browser audio mixing."
    );
  }

  if (!window.MediaRecorder) {
    throw new Error(
      "Your browser does not support final video rendering."
    );
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  const audioContext = new AudioContextClass();

  const sourceVideo = document.createElement("video");
  const music = document.createElement("audio");

  const videoUrl = URL.createObjectURL(videoFile);

  sourceVideo.src = videoUrl;
  sourceVideo.muted = true;
  sourceVideo.playsInline = true;
  sourceVideo.preload = "auto";

  music.crossOrigin = "anonymous";
  music.src = musicUrl;
  music.preload = "auto";

  const cleanup = () => {
    try {
      sourceVideo.pause();
      music.pause();
    } catch {
      // noop
    }

    revokeObjectUrl(videoUrl);

    try {
      sourceVideo.removeAttribute("src");
      music.removeAttribute("src");
      sourceVideo.load();
      music.load();
    } catch {
      // noop
    }

    try {
      audioContext.close();
    } catch {
      // noop
    }
  };

  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        sourceVideo.onloadedmetadata = resolve;
        sourceVideo.onerror = () =>
          reject(new Error("Source video could not be decoded."));
        sourceVideo.load();
      }),
      new Promise((resolve, reject) => {
        music.onloadedmetadata = resolve;
        music.onerror = () =>
          reject(
            new Error(
              "Music could not be loaded. The music source may not permit browser mixing."
            )
          );
        music.load();
      })
    ]);

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const canvas = document.createElement("canvas");

    const sourceWidth = sourceVideo.videoWidth || 720;
    const sourceHeight = sourceVideo.videoHeight || 1280;

    const maxWidth = 1080;

    const canvasWidth = Math.min(sourceWidth, maxWidth);
    const canvasHeight = Math.max(
      1,
      Math.round(
        canvasWidth * (sourceHeight / sourceWidth)
      )
    );

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Video rendering canvas is unavailable.");
    }

    const stream = canvas.captureStream(30);

    const originalSource =
      audioContext.createMediaElementSource(sourceVideo);

    const musicSource =
      audioContext.createMediaElementSource(music);

    const originalGain = audioContext.createGain();
    const musicGain = audioContext.createGain();

    const destination =
      audioContext.createMediaStreamDestination();

    originalGain.gain.value = clamp(
      Number(originalVolume),
      0,
      2
    );

    musicGain.gain.value = clamp(
      Number(musicVolume),
      0,
      2
    );

    originalSource.connect(originalGain);
    musicSource.connect(musicGain);

    originalGain.connect(destination);
    musicGain.connect(destination);

    const audioTracks = destination.stream.getAudioTracks();

    audioTracks.forEach((track) => {
      stream.addTrack(track);
    });

    const mimeType = getSupportedRecorderMimeType();

    if (!mimeType) {
      throw new Error(
        "No compatible video recording format is available in this browser."
      );
    }

    const chunks = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000
    });

    const videoDuration = Number(sourceVideo.duration || 0);

    let animationFrame = null;
    let startedAt = 0;

    const drawFrame = () => {
      if (sourceVideo.readyState >= 2) {
        ctx.drawImage(
          sourceVideo,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      const current = Number(sourceVideo.currentTime || 0);

      if (videoDuration > 0) {
        onProgress?.(
          clamp((current / videoDuration) * 100, 0, 100)
        );
      }

      if (!sourceVideo.ended) {
        animationFrame = requestAnimationFrame(drawFrame);
      }
    };

    const recorderDone = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        reject(new Error("Final video rendering failed."));
      };

      recorder.onstop = () => {
        resolve();
      };
    });

    sourceVideo.currentTime = 0;

    const safeMusicOffset = Math.max(
      0,
      Number(musicOffset) || 0
    );

    const requestedMusicDuration = Number(musicDuration) || 0;

    const actualMusicDuration =
      requestedMusicDuration > 0
        ? Math.min(requestedMusicDuration, music.duration)
        : music.duration;

    const startMusic = () => {
      try {
        music.currentTime = clamp(
          safeMusicOffset,
          0,
          Math.max(0, music.duration - 0.05)
        );
      } catch {
        // noop
      }

      const musicStartTime =
        audioContext.currentTime;

      if (fadeIn > 0) {
        musicGain.gain.cancelScheduledValues(
          musicStartTime
        );

        musicGain.gain.setValueAtTime(
          0,
          musicStartTime
        );

        musicGain.gain.linearRampToValueAtTime(
          clamp(Number(musicVolume), 0, 2),
          musicStartTime + Number(fadeIn)
        );
      }

      if (fadeOut > 0 && actualMusicDuration > fadeOut) {
        const fadeStart =
          musicStartTime +
          actualMusicDuration -
          Number(fadeOut);

        musicGain.gain.setValueAtTime(
          clamp(Number(musicVolume), 0, 2),
          fadeStart
        );

        musicGain.gain.linearRampToValueAtTime(
          0,
          musicStartTime + actualMusicDuration
        );
      }

      music.play().catch(() => {});
    };

    recorder.start(250);

    startedAt = performance.now();

    await sourceVideo.play();

    drawFrame();
    startMusic();

    await new Promise((resolve) => {
      const check = () => {
        if (
          sourceVideo.ended ||
          sourceVideo.currentTime >= videoDuration - 0.03
        ) {
          resolve();
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    sourceVideo.pause();
    music.pause();

    recorder.stop();

    await recorderDone;

    const blob = new Blob(chunks, {
      type: mimeType
    });

    if (!blob.size) {
      throw new Error("Final rendered video is empty.");
    }

    const extension = mimeType.includes("mp4")
      ? "mp4"
      : "webm";

    const file = new File(
      [blob],
      `Made_Universe_Final_${Date.now()}.${extension}`,
      {
        type: mimeType,
        lastModified: Date.now()
      }
    );

    onProgress?.(100);

    return file;
  } finally {
    cleanup();
  }
}

/* ============================================================
   SINGLE CLIP EDIT PROCESSOR
   ============================================================ */

async function processVideoWithCanvas({
  videoFile,
  trimStart = 0,
  trimEnd = 0,
  filterCss = "none",
  brightness = 1,
  contrast = 1,
  saturation = 1,
  rotation = 0,
  flipX = false,
  flipY = false,
  scale = 1,
  aspectRatio = "9:16",
  volume = 1,
  playbackSpeed = 1,
  onProgress
}) {
  if (!videoFile) {
    throw new Error("No video is available for processing.");
  }

  if (!window.MediaRecorder) {
    throw new Error(
      "Your browser does not support video rendering."
    );
  }

  const mimeType = getSupportedRecorderMimeType();

  if (!mimeType) {
    throw new Error(
      "No supported recording format is available."
    );
  }

  const video = document.createElement("video");
  const sourceUrl = URL.createObjectURL(videoFile);

  video.src = sourceUrl;
  video.muted = volume <= 0;
  video.playsInline = true;
  video.preload = "auto";

  const cleanup = () => {
    revokeObjectUrl(sourceUrl);

    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch {
      // noop
    }
  };

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () =>
        reject(
          new Error(
            "The video could not be decoded for editing."
          )
        );
      video.load();
    });

    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;

    const ratio =
      ASPECT_RATIOS.find(
        (item) => item.id === aspectRatio
      ) || ASPECT_RATIOS[0];

    const outputWidth =
      ratio.id === "9:16"
        ? 720
        : ratio.id === "16:9"
        ? 1280
        : ratio.id === "1:1"
        ? 720
        : 720;

    const outputHeight = Math.round(
      outputWidth / ratio.value
    );

    const canvas = document.createElement("canvas");

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Canvas rendering is not supported."
      );
    }

    const stream = canvas.captureStream(30);

    const audioContext =
      window.AudioContext || window.webkitAudioContext
        ? new (window.AudioContext ||
            window.webkitAudioContext)()
        : null;

    let destination = null;
    let audioSource = null;
    let gainNode = null;

    if (audioContext && volume > 0) {
      destination =
        audioContext.createMediaStreamDestination();

      audioSource =
        audioContext.createMediaElementSource(video);

      gainNode = audioContext.createGain();

      gainNode.gain.value = clamp(volume, 0, 2);

      audioSource.connect(gainNode);
      gainNode.connect(destination);

      destination.stream
        .getAudioTracks()
        .forEach((track) => stream.addTrack(track));

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    }

    const chunks = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000
    });

    const start =
      clamp(Number(trimStart) || 0, 0, video.duration);

    const end =
      Number(trimEnd) > start
        ? clamp(
            Number(trimEnd),
            start + 0.05,
            video.duration
          )
        : video.duration;

    const duration = Math.max(0.05, end - start);

    const draw = () => {
      const progress =
        ((video.currentTime - start) / duration) * 100;

      onProgress?.(clamp(progress, 0, 100));

      ctx.save();

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const outputRatio =
        canvas.width / canvas.height;

      const sourceRatio =
        sourceWidth / sourceHeight;

      let drawWidth;
      let drawHeight;

      if (sourceRatio > outputRatio) {
        drawHeight = canvas.height;
        drawWidth =
          drawHeight * sourceRatio;
      } else {
        drawWidth = canvas.width;
        drawHeight =
          drawWidth / sourceRatio;
      }

      drawWidth *= scale;
      drawHeight *= scale;

      const x =
        (canvas.width - drawWidth) / 2;

      const y =
        (canvas.height - drawHeight) / 2;

      ctx.translate(
        canvas.width / 2,
        canvas.height / 2
      );

      ctx.rotate(
        (rotation * Math.PI) / 180
      );

      ctx.scale(
        flipX ? -1 : 1,
        flipY ? -1 : 1
      );

      ctx.translate(
        -canvas.width / 2,
        -canvas.height / 2
      );

      ctx.filter = [
        filterCss !== "none"
          ? filterCss
          : "",
        `brightness(${brightness})`,
        `contrast(${contrast})`,
        `saturate(${saturation})`
      ]
        .filter(Boolean)
        .join(" ");

      ctx.drawImage(
        video,
        x,
        y,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      if (
        !video.paused &&
        !video.ended &&
        video.currentTime < end
      ) {
        requestAnimationFrame(draw);
      }
    };

    const recorderDone = new Promise(
      (resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data?.size) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = () => {
          reject(
            new Error(
              "Video processing failed."
            )
          );
        };

        recorder.onstop = resolve;
      }
    );

    video.currentTime = start;

    await new Promise((resolve) => {
      const check = () => {
        if (
          Math.abs(video.currentTime - start) <
            0.08 ||
          video.readyState >= 3
        ) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };

      check();
    });

    recorder.start(250);

    await video.play();

    draw();

    await new Promise((resolve) => {
      const monitor = () => {
        if (
          video.currentTime >= end ||
          video.ended
        ) {
          resolve();
          return;
        }

        requestAnimationFrame(monitor);
      };

      monitor();
    });

    video.pause();

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    await recorderDone;

    const blob = new Blob(chunks, {
      type: mimeType
    });

    if (!blob.size) {
      throw new Error(
        "The processed video is empty."
      );
    }

    const extension = mimeType.includes("mp4")
      ? "mp4"
      : "webm";

    const output = new File(
      [blob],
      `Made_Universe_Edit_${Date.now()}.${extension}`,
      {
        type: mimeType,
        lastModified: Date.now()
      }
    );

    onProgress?.(100);

    return output;
  } finally {
    cleanup();

    try {
      await audioContext?.close();
    } catch {
      // noop
    }
  }
}

/* ============================================================
   COMPONENT
   ============================================================ */

function Upload({
  onComplete,
  onClose,
  initialFile = null,
  initialDraft = null
}) {
  /* ----------------------------------------------------------
     CORE STATE
     ---------------------------------------------------------- */

  const [activeTool, setActiveTool] = useState("media");
  const [activeEditorTab, setActiveEditorTab] =
    useState("adjust");

  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] =
    useState(null);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const [isDragging, setIsDragging] =
    useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [processingStage, setProcessingStage] =
    useState("");

  const [processingProgress, setProcessingProgress] =
    useState(0);

  const [isUploading, setIsUploading] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [uploadStage, setUploadStage] =
    useState("");

  const [networkOnline, setNetworkOnline] =
    useState(navigator.onLine);

  const [lowDataMode, setLowDataMode] =
    useState(false);

  const [showPublishPanel, setShowPublishPanel] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  const [isSavingDraft, setIsSavingDraft] =
    useState(false);

  const [lastSavedAt, setLastSavedAt] =
    useState(null);

  /* ----------------------------------------------------------
     CAMERA
     ---------------------------------------------------------- */

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraFacing, setCameraFacing] =
    useState("user");

  const [cameraStream, setCameraStream] =
    useState(null);

  const [cameraPermission, setCameraPermission] =
    useState("unknown");

  const [cameraError, setCameraError] =
    useState("");

  const [cameraDevices, setCameraDevices] =
    useState([]);

  const [selectedCameraId, setSelectedCameraId] =
    useState("");

  const [selectedMicId, setSelectedMicId] =
    useState("");

  const [cameraResolution, setCameraResolution] =
    useState("1080");

  const [cameraFps, setCameraFps] =
    useState("30");

  const [cameraMicEnabled, setCameraMicEnabled] =
    useState(true);

  const [cameraGrid, setCameraGrid] =
    useState(false);

  const [cameraCountdown, setCameraCountdown] =
    useState(3);

  const [cameraSpeed, setCameraSpeed] =
    useState(1);

  const [handsFree, setHandsFree] =
    useState(false);

  const [torchEnabled, setTorchEnabled] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  const [recordingCountdown, setRecordingCountdown] =
    useState(null);

  const [cameraZoom, setCameraZoom] =
    useState(1);

  const [cameraBrightness, setCameraBrightness] =
    useState(1);

  const [cameraBeauty, setCameraBeauty] =
    useState(0);

  const [cameraAiEnabled, setCameraAiEnabled] =
    useState(false);

  const [cameraAiEffect, setCameraAiEffect] =
    useState("none");

  /* ----------------------------------------------------------
     VIDEO EDITOR
     ---------------------------------------------------------- */

  const [selectedFilter, setSelectedFilter] =
    useState("original");

  const [filterIntensity, setFilterIntensity] =
    useState(100);

  const [brightness, setBrightness] =
    useState(1);

  const [contrast, setContrast] =
    useState(1);

  const [saturation, setSaturation] =
    useState(1);

  const [temperature, setTemperature] =
    useState(0);

  const [sharpness, setSharpness] =
    useState(0);

  const [rotation, setRotation] =
    useState(0);

  const [flipX, setFlipX] =
    useState(false);

  const [flipY, setFlipY] =
    useState(false);

  const [editorScale, setEditorScale] =
    useState(1);

  const [aspectRatio, setAspectRatio] =
    useState("9:16");

  const [fitMode, setFitMode] =
    useState("fill");

  const [playbackSpeed, setPlaybackSpeed] =
    useState(1);

  const [reverseVideo, setReverseVideo] =
    useState(false);

  const [freezeFrame, setFreezeFrame] =
    useState(false);

  const [transition, setTransition] =
    useState("none");

  const [fadeIn, setFadeIn] =
    useState(0);

  const [fadeOut, setFadeOut] =
    useState(0);

  const [trimStart, setTrimStart] =
    useState(0);

  const [trimEnd, setTrimEnd] =
    useState(0);

  /* ----------------------------------------------------------
     AUDIO
     ---------------------------------------------------------- */

  const [originalAudioEnabled, setOriginalAudioEnabled] =
    useState(true);

  const [originalAudioVolume, setOriginalAudioVolume] =
    useState(1);

  const [musicVolume, setMusicVolume] =
    useState(0.7);

  const [musicOffset, setMusicOffset] =
    useState(0);

  const [musicDuration, setMusicDuration] =
    useState(0);

  const [musicFadeIn, setMusicFadeIn] =
    useState(0);

  const [musicFadeOut, setMusicFadeOut] =
    useState(0);

  const [audioEnhancement, setAudioEnhancement] =
    useState(false);

  const [noiseReduction, setNoiseReduction] =
    useState(false);

  const [voiceIsolation, setVoiceIsolation] =
    useState(false);

  const [autoDucking, setAutoDucking] =
    useState(false);

  const [normalizeAudio, setNormalizeAudio] =
    useState(true);

  const [musicQuery, setMusicQuery] =
    useState("");

  const [musicResults, setMusicResults] =
    useState([]);

  const [musicLoading, setMusicLoading] =
    useState(false);

  const [selectedMusic, setSelectedMusic] =
    useState(null);

  const [musicPlayingId, setMusicPlayingId] =
    useState(null);

  const musicPreviewRef = useRef(null);

  /* ----------------------------------------------------------
     TEXT / OVERLAYS
     ---------------------------------------------------------- */

  const [textLayers, setTextLayers] =
    useState([]);

  const [selectedTextId, setSelectedTextId] =
    useState(null);

  const [coverText, setCoverText] =
    useState("");

  const [textDraft, setTextDraft] =
    useState("");

  const [textFont, setTextFont] =
    useState("Inter");

  const [textSize, setTextSize] =
    useState(48);

  const [textColor, setTextColor] =
    useState("#ffffff");

  const [textBackground, setTextBackground] =
    useState("transparent");

  const [textOutline, setTextOutline] =
    useState(true);

  const [textShadow, setTextShadow] =
    useState(true);

  const [textAnimation, setTextAnimation] =
    useState("fade");

  const [textStart, setTextStart] =
    useState(0);

  const [textEnd, setTextEnd] =
    useState(5);

  const [stickers, setStickers] =
    useState([]);

  const [drawingEnabled, setDrawingEnabled] =
    useState(false);

  const [censorMode, setCensorMode] =
    useState(false);

  /* ----------------------------------------------------------
     CAPTIONS
     ---------------------------------------------------------- */

  const [subtitlesEnabled, setSubtitlesEnabled] =
    useState(false);

  const [subtitleLanguage, setSubtitleLanguage] =
    useState("English");

  const [subtitleStyle, setSubtitleStyle] =
    useState("classic");

  const [subtitleSize, setSubtitleSize] =
    useState(32);

  const [subtitleColor, setSubtitleColor] =
    useState("#ffffff");

  const [subtitleBackground, setSubtitleBackground] =
    useState("black");

  const [subtitleData, setSubtitleData] =
    useState([]);

  const [subtitleGenerating, setSubtitleGenerating] =
    useState(false);

  /* ----------------------------------------------------------
     CHAPTERS
     ---------------------------------------------------------- */

  const [chapters, setChapters] =
    useState([]);

  const [chapterTitle, setChapterTitle] =
    useState("");

  const [chapterTime, setChapterTime] =
    useState(0);

  /* ----------------------------------------------------------
     POLL
     ---------------------------------------------------------- */

  const [pollEnabled, setPollEnabled] =
    useState(false);

  const [pollQuestion, setPollQuestion] =
    useState("");

  const [pollOptions, setPollOptions] =
    useState(["", ""]);

  const [pollDuration, setPollDuration] =
    useState(24);

  const [pollAnonymous, setPollAnonymous] =
    useState(false);

  /* ----------------------------------------------------------
     PRODUCT
     ---------------------------------------------------------- */

  const [productEnabled, setProductEnabled] =
    useState(false);

  const [productTitle, setProductTitle] =
    useState("");

  const [productPrice, setProductPrice] =
    useState("");

  const [productCurrency, setProductCurrency] =
    useState("MWK");

  const [productUrl, setProductUrl] =
    useState("");

  const [productCta, setProductCta] =
    useState("Shop now");

  /* ----------------------------------------------------------
     THUMBNAIL
     ---------------------------------------------------------- */

  const [thumbnailFile, setThumbnailFile] =
    useState(null);

  const [thumbnailPreview, setThumbnailPreview] =
    useState("");

  const [thumbnailTime, setThumbnailTime] =
    useState(0.1);

  const [thumbnailPosition, setThumbnailPosition] =
    useState("center");

  const [thumbnailFilter, setThumbnailFilter] =
    useState("original");

  /* ----------------------------------------------------------
     DRAFT / PUBLISH
     ---------------------------------------------------------- */

  const [draft, setDraft] = useState(() => ({
    ...INITIAL_DRAFT,
    ...(initialDraft || {})
  }));

  const [publishStep, setPublishStep] =
    useState("settings");

  const [uploadingFinalFile, setUploadingFinalFile] =
    useState(null);

  const [finalVideoUrl, setFinalVideoUrl] =
    useState("");

  const [finalThumbnailUrl, setFinalThumbnailUrl] =
    useState("");

  const [authenticatedUser, setAuthenticatedUser] =
    useState(null);

  /* ----------------------------------------------------------
     REFS
     ---------------------------------------------------------- */

  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const containerRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const dragCounterRef = useRef(0);

  /* ==========================================================
     COMPUTED
     ========================================================== */

  const selectedClip = useMemo(
    () =>
      clips.find(
        (clip) => clip.id === selectedClipId
      ) || null,
    [clips, selectedClipId]
  );

  const selectedFilterObject = useMemo(
    () =>
      DEFAULT_FILTERS.find(
        (filter) =>
          filter.id === selectedFilter
      ) || DEFAULT_FILTERS[0],
    [selectedFilter]
  );

  const totalDuration = useMemo(
    () =>
      clips.reduce(
        (sum, clip) =>
          sum +
          Math.max(
            0,
            Number(clip.trimEnd || clip.duration) -
              Number(clip.trimStart || 0)
          ),
        0
      ),
    [clips]
  );

  const captionCharacterCount =
    draft.caption.length;

  const currentClipDuration = useMemo(
    () =>
      selectedClip
        ? Number(
            selectedClip.trimEnd ||
              selectedClip.duration ||
              0
          ) -
          Number(selectedClip.trimStart || 0)
        : 0,
    [selectedClip]
  );

  const previewFilterCss = useMemo(() => {
    const filter =
      selectedFilterObject?.css || "none";

    if (filter === "none") {
      return [
        `brightness(${brightness})`,
        `contrast(${contrast})`,
        `saturate(${saturation})`
      ].join(" ");
    }

    return [
      filter,
      `brightness(${brightness})`,
      `contrast(${contrast})`,
      `saturate(${saturation})`
    ].join(" ");
  }, [
    selectedFilterObject,
    brightness,
    contrast,
    saturation
  ]);

  const uploadDisabled =
    clips.length === 0 ||
    isUploading ||
    isProcessing ||
    !networkOnline;

  /* ==========================================================
     NETWORK
     ========================================================== */

  useEffect(() => {
    const handleOnline = () =>
      setNetworkOnline(true);

    const handleOffline = () =>
      setNetworkOnline(false);

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  /* ==========================================================
     AUTH
     ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (mounted) {
        setAuthenticatedUser(user || null);
      }
    };

    loadUser();

    const {
      data: listener
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setAuthenticatedUser(
            session?.user || null
          );
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* ==========================================================
     INITIAL FILE
     ========================================================== */

  useEffect(() => {
    if (!initialFile) return;

    addFiles([initialFile]).catch((err) => {
      setError(normalizeMediaError(err));
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  /* ==========================================================
     CAMERA DEVICE ENUMERATION
     ========================================================== */

  const enumerateDevices = useCallback(
    async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      try {
        const devices =
          await navigator.mediaDevices.enumerateDevices();

        const cameras = devices.filter(
          (device) =>
            device.kind === "videoinput"
        );

        const microphones = devices.filter(
          (device) =>
            device.kind === "audioinput"
        );

        setCameraDevices([
          ...cameras,
          ...microphones
        ]);

        if (
          !selectedCameraId &&
          cameras[0]?.deviceId
        ) {
          setSelectedCameraId(
            cameras[0].deviceId
          );
        }

        if (
          !selectedMicId &&
          microphones[0]?.deviceId
        ) {
          setSelectedMicId(
            microphones[0].deviceId
          );
        }
      } catch {
        // Device enumeration may be unavailable
      }
    },
    [selectedCameraId, selectedMicId]
  );

  useEffect(() => {
    enumerateDevices();

    const handler = () => {
      enumerateDevices();
    };

    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      handler
    );

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        handler
      );
    };
  }, [enumerateDevices]);

  /* ==========================================================
     CAMERA STREAM PREVIEW
     ========================================================== */

  useEffect(() => {
    if (!cameraVideoRef.current) return;

    if (cameraStream) {
      cameraVideoRef.current.srcObject =
        cameraStream;

      cameraVideoRef.current
        .play()
        .catch(() => {});
    } else {
      cameraVideoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  /* ==========================================================
     CAMERA RECORDING TIMER
     ========================================================== */

  useEffect(() => {
    if (!recording) {
      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );
      }

      return;
    }

    recordingTimerRef.current =
      setInterval(() => {
        setRecordingTime((previous) => {
          const next = previous + 0.1;

          if (
            next >= MAX_DURATION_SECONDS
          ) {
            stopRecording();
            return MAX_DURATION_SECONDS;
          }

          return next;
        });
      }, 100);

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  /* ==========================================================
     PREVIEW TIME
     ========================================================== */

  useEffect(() => {
    const video = previewVideoRef.current;

    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onPlay = () =>
      setIsPlaying(true);

    const onPause = () =>
      setIsPlaying(false);

    const onEnded = () =>
      setIsPlaying(false);

    video.addEventListener(
      "timeupdate",
      onTimeUpdate
    );

    video.addEventListener(
      "play",
      onPlay
    );

    video.addEventListener(
      "pause",
      onPause
    );

    video.addEventListener(
      "ended",
      onEnded
    );

    return () => {
      video.removeEventListener(
        "timeupdate",
        onTimeUpdate
      );

      video.removeEventListener(
        "play",
        onPlay
      );

      video.removeEventListener(
        "pause",
        onPause
      );

      video.removeEventListener(
        "ended",
        onEnded
      );
    };
  }, [selectedClipId]);

  /* ==========================================================
     CLEANUP
     ========================================================== */

  useEffect(() => {
    return () => {
      clips.forEach((clip) => {
        if (clip.previewUrl) {
          revokeObjectUrl(
            clip.previewUrl
          );
        }
      });

      if (cameraStream) {
        cameraStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      if (recordingTimerRef.current) {
        clearInterval(
          recordingTimerRef.current
        );
      }

      if (countdownTimerRef.current) {
        clearInterval(
          countdownTimerRef.current
        );
      }

      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================
     FILE VALIDATION
     ========================================================== */

  const validateVideoFile = useCallback(
    async (file) => {
      if (!file) {
        throw new Error(
          "No video file was selected."
        );
      }

      if (!isVideoFile(file)) {
        throw new Error(
          "Please select a supported video file."
        );
      }

      if (file.size > MAX_VIDEO_SIZE) {
        throw new Error(
          `This video is too large. Maximum size is ${formatBytes(
            MAX_VIDEO_SIZE
          )}.`
        );
      }

      const metadata =
        await readVideoMetadata(file);

      if (
        metadata.duration <= 0 ||
        metadata.duration >
          MAX_DURATION_SECONDS
      ) {
        throw new Error(
          `Video duration must be between 1 second and ${Math.floor(
            MAX_DURATION_SECONDS / 60
          )} minutes.`
        );
      }

      if (
        metadata.width < 240 ||
        metadata.height < 240
      ) {
        throw new Error(
          "The video resolution is too small."
        );
      }

      return metadata;
    },
    []
  );

  /* ==========================================================
     ADD FILES
     ========================================================== */

  const addFiles = useCallback(
    async (files) => {
      const incoming = Array.from(
        files || []
      ).filter(Boolean);

      if (!incoming.length) return;

      setError("");
      setNotice("");

      const newClips = [];

      for (const file of incoming) {
        try {
          const metadata =
            await validateVideoFile(file);

          const previewUrl =
            URL.createObjectURL(file);

          const thumbnail =
            await generateThumbnail(
              file,
              Math.min(
                0.1,
                metadata.duration / 2
              )
            );

          const clip = {
            id: createId("clip"),
            file,
            previewUrl,
            thumbnail,
            name: file.name,
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
            mimeType: metadata.mimeType,
            fileSize: metadata.fileSize,
            aspectRatio:
              metadata.aspectRatio,
            trimStart: 0,
            trimEnd: metadata.duration,
            filter: "original",
            filterIntensity: 100,
            volume: 1,
            speed: 1,
            rotation: 0,
            flipX: false,
            flipY: false,
            scale: 1,
            transition: "none",
            crop: {
              x: 0,
              y: 0,
              width: 1,
              height: 1
            }
          };

          newClips.push(clip);
        } catch (err) {
          setError(
            `${file.name}: ${normalizeMediaError(
              err
            )}`
          );
        }
      }

      if (!newClips.length) return;

      setClips((previous) => [
        ...previous,
        ...newClips
      ]);

      setSelectedClipId(
        (previous) =>
          previous ||
          newClips[0].id
      );

      setActiveTool("edit");
      setNotice(
        `${newClips.length} video ${
          newClips.length === 1
            ? "clip"
            : "clips"
        } added.`
      );
    },
    [validateVideoFile]
  );

  /* ==========================================================
     DROP
     ========================================================== */

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    dragCounterRef.current -= 1;

    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(
      event.dataTransfer.files || []
    ).filter(isVideoFile);

    await addFiles(files);
  };

  /* ==========================================================
     REMOVE CLIP
     ========================================================== */

  const removeClip = useCallback(
    (clipId) => {
      setClips((previous) => {
        const clip = previous.find(
          (item) => item.id === clipId
        );

        if (clip?.previewUrl) {
          revokeObjectUrl(
            clip.previewUrl
          );
        }

        const remaining =
          previous.filter(
            (item) => item.id !== clipId
          );

        if (!remaining.length) {
          setSelectedClipId(null);
          setActiveTool("media");
        } else if (
          selectedClipId === clipId
        ) {
          setSelectedClipId(
            remaining[0].id
          );
        }

        return remaining;
      });
    },
    [selectedClipId]
  );

  /* ==========================================================
     REPLACE CLIP
     ========================================================== */

  const replaceClip = useCallback(
    async (clipId, file) => {
      try {
        const metadata =
          await validateVideoFile(file);

        const thumbnail =
          await generateThumbnail(
            file,
            Math.min(
              0.1,
              metadata.duration / 2
            )
          );

        const previewUrl =
          URL.createObjectURL(file);

        setClips((previous) =>
          previous.map((clip) => {
            if (clip.id !== clipId) {
              return clip;
            }

            revokeObjectUrl(
              clip.previewUrl
            );

            return {
              ...clip,
              file,
              previewUrl,
              thumbnail,
              name: file.name,
              duration: metadata.duration,
              width: metadata.width,
              height: metadata.height,
              mimeType: metadata.mimeType,
              fileSize: metadata.fileSize,
              aspectRatio:
                metadata.aspectRatio,
              trimStart: 0,
              trimEnd: metadata.duration
            };
          })
        );

        setNotice("Clip replaced.");
      } catch (err) {
        setError(
          normalizeMediaError(err)
        );
      }
    },
    [validateVideoFile]
  );

  /* ==========================================================
     REORDER CLIPS
     ========================================================== */

  const moveClip = useCallback(
    (clipId, direction) => {
      setClips((previous) => {
        const index =
          previous.findIndex(
            (clip) =>
              clip.id === clipId
          );

        if (index < 0) {
          return previous;
        }

        const target =
          direction === "left"
            ? index - 1
            : index + 1;

        if (
          target < 0 ||
          target >= previous.length
        ) {
          return previous;
        }

        const next = [...previous];

        [
          next[index],
          next[target]
        ] = [
          next[target],
          next[index]
        ];

        return next;
      });
    },
    []
  );

  /* ==========================================================
     SELECT CLIP
     ========================================================== */

  const selectClip = useCallback(
    (clipId) => {
      setSelectedClipId(clipId);

      const clip = clips.find(
        (item) => item.id === clipId
      );

      if (!clip) return;

      setTrimStart(
        Number(clip.trimStart || 0)
      );

      setTrimEnd(
        Number(
          clip.trimEnd ||
            clip.duration ||
            0
        )
      );

      setSelectedFilter(
        clip.filter || "original"
      );

      setFilterIntensity(
        Number(
          clip.filterIntensity || 100
        )
      );

      setPlaybackSpeed(
        Number(clip.speed || 1)
      );

      setOriginalAudioVolume(
        Number(clip.volume || 1)
      );

      setRotation(
        Number(clip.rotation || 0)
      );

      setFlipX(Boolean(clip.flipX));
      setFlipY(Boolean(clip.flipY));

      setEditorScale(
        Number(clip.scale || 1)
      );
    },
    [clips]
  );

  /* ==========================================================
     UPDATE SELECTED CLIP
     ========================================================== */

  const updateSelectedClip = useCallback(
    (patch) => {
      if (!selectedClipId) return;

      setClips((previous) =>
        previous.map((clip) =>
          clip.id === selectedClipId
            ? {
                ...clip,
                ...patch
              }
            : clip
        )
      );
    },
    [selectedClipId]
  );

  /* ==========================================================
     PLAYBACK
     ========================================================== */

  const togglePlayback = async () => {
    const video =
      previewVideoRef.current;

    if (!video || !selectedClip) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setError(
        "The preview could not be played."
      );
    }
  };

  const seekPreview = (event) => {
    const video =
      previewVideoRef.current;

    if (!video) return;

    const value =
      Number(event.target.value);

    video.currentTime = value;
    setCurrentTime(value);
  };

  /* ==========================================================
     CAMERA START
     ========================================================== */

  const startCamera = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Camera access is not supported by this browser."
      );
      return;
    }

    setCameraError("");
    setError("");

    try {
      if (cameraStream) {
        cameraStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      const width =
        cameraResolution === "720"
          ? 1280
          : 1920;

      const height =
        cameraResolution === "720"
          ? 720
          : 1080;

      const videoConstraints = {
        facingMode: cameraFacing,
        width: {
          ideal: width
        },
        height: {
          ideal: height
        },
        frameRate: {
          ideal: Number(cameraFps)
        }
      };

      if (selectedCameraId) {
        videoConstraints.deviceId = {
          exact: selectedCameraId
        };
      }

      const constraints = {
        video: videoConstraints,
        audio: cameraMicEnabled
          ? selectedMicId
            ? {
                deviceId: {
                  exact: selectedMicId
                }
              }
            : true
          : false
      };

      const stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      setCameraPermission("granted");
      setCameraStream(stream);
      setCameraOpen(true);

      await enumerateDevices();

      const videoTrack =
        stream.getVideoTracks()[0];

      if (
        videoTrack?.getCapabilities
      ) {
        const capabilities =
          videoTrack.getCapabilities();

        if (
          capabilities.zoom
        ) {
          const minimum =
            capabilities.zoom.min || 1;

          const maximum =
            capabilities.zoom.max || 1;

          setCameraZoom(
            clamp(
              cameraZoom,
              minimum,
              maximum
            )
          );
        }
      }
    } catch (err) {
      setCameraPermission("denied");

      setCameraError(
        normalizeMediaError(err)
      );
    }
  };

  /* ==========================================================
     CAMERA STOP
     ========================================================== */

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }

    setCameraStream(null);
    setCameraOpen(false);
    setRecording(false);
    setRecordingTime(0);

    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );
    }
  };

  /* ==========================================================
     CAMERA SWITCH
     ========================================================== */

  const switchCamera = async () => {
    setCameraFacing((previous) =>
      previous === "user"
        ? "environment"
        : "user"
    );

    await wait(100);

    startCamera();
  };

  /* ==========================================================
     CAMERA TRACK CONTROLS
     ========================================================== */

  const applyCameraTrackSettings =
    async () => {
      const track =
        cameraStream?.getVideoTracks?.()[0];

      if (!track?.getCapabilities) {
        return;
      }

      const capabilities =
        track.getCapabilities();

      const advanced = {};

      if (capabilities.zoom) {
        advanced.zoom = clamp(
          cameraZoom,
          capabilities.zoom.min,
          capabilities.zoom.max
        );
      }

      if (
        capabilities.torch &&
        torchEnabled !== undefined
      ) {
        advanced.torch = Boolean(
          torchEnabled
        );
      }

      if (Object.keys(advanced).length) {
        try {
          await track.applyConstraints({
            advanced: [advanced]
          });
        } catch {
          // Device may reject unsupported settings.
        }
      }
    };

  useEffect(() => {
    if (cameraStream) {
      applyCameraTrackSettings();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cameraZoom,
    torchEnabled,
    cameraStream
  ]);

  /* ==========================================================
     RECORD CAMERA
     ========================================================== */

  const startRecording = async () => {
    if (!cameraStream) {
      await startCamera();
      return;
    }

    if (
      !window.MediaRecorder
    ) {
      setCameraError(
        "Video recording is not supported by this browser."
      );
      return;
    }

    setCameraError("");
    setRecordingCountdown(
      cameraCountdown
    );

    let countdown =
      cameraCountdown;

    if (countdown > 0) {
      countdownTimerRef.current =
        setInterval(() => {
          countdown -= 1;

          if (countdown <= 0) {
            clearInterval(
              countdownTimerRef.current
            );

            setRecordingCountdown(
              null
            );

            beginMediaRecording();
          } else {
            setRecordingCountdown(
              countdown
            );
          }
        }, 1000);

      return;
    }

    beginMediaRecording();
  };

  const beginMediaRecording =
    () => {
      if (!cameraStream) return;

      const mimeType =
        getSupportedRecorderMimeType();

      if (!mimeType) {
        setCameraError(
          "No compatible recording format is supported."
        );
        return;
      }

      recordedChunksRef.current = [];

      let recorder;

      try {
        recorder =
          new MediaRecorder(
            cameraStream,
            {
              mimeType,
              videoBitsPerSecond:
                lowDataMode
                  ? 2_000_000
                  : 5_000_000,
              audioBitsPerSecond:
                128_000
            }
          );
      } catch (err) {
        setCameraError(
          normalizeMediaError(err)
        );
        return;
      }

      recorderRef.current =
        recorder;

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onerror = () => {
        setCameraError(
          "Camera recording failed."
        );

        setRecording(false);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(
            recordedChunksRef.current,
            {
              type: mimeType
            }
          );

          if (!blob.size) {
            throw new Error(
              "The recorded video is empty."
            );
          }

          const extension =
            mimeType.includes("mp4")
              ? "mp4"
              : "webm";

          const file = new File(
            [blob],
            `Camera_${Date.now()}.${extension}`,
            {
              type: mimeType,
              lastModified:
                Date.now()
            }
          );

          await addFiles([file]);

          setCameraError("");
          setRecordingTime(0);
        } catch (err) {
          setCameraError(
            normalizeMediaError(err)
          );
        }
      };

      try {
        recorder.start(250);
        setRecording(true);
        setRecordingTime(0);
      } catch (err) {
        setCameraError(
          normalizeMediaError(err)
        );
      }
    };

  const stopRecording = () => {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current
      );
    }
  };

  /* ==========================================================
     CAMERA DEVICE HELPERS
     ========================================================== */

  const cameras = useMemo(
    () =>
      cameraDevices.filter(
        (device) =>
          device.kind === "videoinput"
      ),
    [cameraDevices]
  );

  const microphones = useMemo(
    () =>
      cameraDevices.filter(
        (device) =>
          device.kind === "audioinput"
      ),
    [cameraDevices]
  );

  /* ==========================================================
     MUSIC SEARCH
     ========================================================== */

  const searchMusic = async () => {
    const query =
      musicQuery.trim();

    if (!query) {
      setMusicResults([]);
      return;
    }

    setMusicLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            query
          )}&entity=song&limit=20`
        );

      if (!response.ok) {
        throw new Error(
          "Music search failed."
        );
      }

      const data =
        await response.json();

      const results = (
        data.results || []
      )
        .filter(
          (item) =>
            item.previewUrl
        )
        .map((item) => ({
          id:
            item.trackId ||
            createId("music"),
          name:
            item.trackName ||
            "Unknown Track",
          artist:
            item.artistName ||
            "Unknown Artist",
          album:
            item.collectionName ||
            "",
          artwork:
            item.artworkUrl100 ||
            "",
          url:
            item.previewUrl ||
            "",
          source: "iTunes",
          copyrightStatus:
            "preview_source"
        }));

      setMusicResults(results);

      if (!results.length) {
        setNotice(
          "No playable music previews were found."
        );
      }
    } catch (err) {
      setError(
        normalizeMediaError(err)
      );
    } finally {
      setMusicLoading(false);
    }
  };

  /* ==========================================================
     MUSIC PREVIEW
     ========================================================== */

  const toggleMusicPreview = async (
    music
  ) => {
    if (
      musicPlayingId === music.id &&
      musicPreviewRef.current
    ) {
      musicPreviewRef.current.pause();
      musicPreviewRef.current = null;
      setMusicPlayingId(null);
      return;
    }

    try {
      if (musicPreviewRef.current) {
        musicPreviewRef.current.pause();
      }

      const audio =
        new Audio(music.url);

      audio.crossOrigin =
        "anonymous";

      musicPreviewRef.current =
        audio;

      setMusicPlayingId(music.id);

      audio.onended = () => {
        setMusicPlayingId(null);
        musicPreviewRef.current =
          null;
      };

      await audio.play();
    } catch (err) {
      setMusicPlayingId(null);

      setError(
        normalizeMediaError(err)
      );
    }
  };

  /* ==========================================================
     SELECT MUSIC
     ========================================================== */

  const selectMusic = (
    music
  ) => {
    setSelectedMusic(music);

    setMusicDuration(0);

    setMusicOffset(0);

    setNotice(
      `"${music.name}" selected. It will be embedded into the final video.`
    );
  };

  /* ==========================================================
     TEXT
     ========================================================== */

  const addTextLayer = () => {
    const content =
      textDraft.trim() ||
      "Your text";

    const layer = {
      id: createId("text"),
      text: content,
      x: 50,
      y: 50,
      width: 80,
      font: textFont,
      size: textSize,
      color: textColor,
      background:
        textBackground,
      outline: textOutline,
      shadow: textShadow,
      animation: textAnimation,
      start: textStart,
      end:
        textEnd ||
        Math.max(5, totalDuration),
      rotation: 0,
      scale: 1
    };

    setTextLayers((previous) => [
      ...previous,
      layer
    ]);

    setSelectedTextId(layer.id);
    setTextDraft("");
  };

  const updateTextLayer = (
    id,
    patch
  ) => {
    setTextLayers((previous) =>
      previous.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              ...patch
            }
          : layer
      )
    );
  };

  const removeTextLayer = (
    id
  ) => {
    setTextLayers((previous) =>
      previous.filter(
        (layer) =>
          layer.id !== id
      )
    );

    if (
      selectedTextId === id
    ) {
      setSelectedTextId(null);
    }
  };

  const addSticker = (
    emoji
  ) => {
    setStickers((previous) => [
      ...previous,
      {
        id: createId("sticker"),
        value: emoji,
        x: 50,
        y: 50,
        size: 64,
        rotation: 0
      }
    ]);
  };

  /* ==========================================================
     AI HOOK
     ========================================================== */

  const applyAIHook = (
    hook
  ) => {
    setDraft((previous) => ({
      ...previous,
      caption:
        previous.caption
          ? `${hook}\n\n${previous.caption}`
          : hook
    }));
  };

  /* ==========================================================
     CAPTION TAGS
     ========================================================== */

  useEffect(() => {
    const tags =
      extractHashtags(
        draft.caption
      );

    const mentions =
      extractMentions(
        draft.caption
      );

    setDraft((previous) => ({
      ...previous,
      tags,
      mentions
    }));
  }, [draft.caption]);

  const addHashtag = (
    hashtag
  ) => {
    const clean =
      String(hashtag)
        .replace(/^#/, "")
        .trim()
        .toLowerCase();

    if (!clean) return;

    const current =
      draft.caption.trim();

    const separator =
      current.length ? " " : "";

    setDraft((previous) => ({
      ...previous,
      caption: `${current}${separator}#${clean} `
    }));
  };

  /* ==========================================================
     CHAPTERS
     ========================================================== */

  const addChapter = () => {
    const title =
      chapterTitle.trim();

    const time =
      clamp(
        Number(chapterTime) || 0,
        0,
        totalDuration
      );

    if (!title) {
      setError(
        "Chapter title is required."
      );
      return;
    }

    if (
      chapters.some(
        (chapter) =>
          Math.abs(
            chapter.timestamp -
              time
          ) < 0.1
      )
    ) {
      setError(
        "A chapter already exists at this timestamp."
      );
      return;
    }

    setChapters((previous) =>
      [
        ...previous,
        {
          id: createId("chapter"),
          title,
          timestamp: time
        }
      ].sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      )
    );

    setChapterTitle("");
  };

  const removeChapter = (
    id
  ) => {
    setChapters((previous) =>
      previous.filter(
        (chapter) =>
          chapter.id !== id
      )
    );
  };

  /* ==========================================================
     POLL
     ========================================================== */

  const updatePollOption = (
    index,
    value
  ) => {
    setPollOptions((previous) =>
      previous.map(
        (option, optionIndex) =>
          optionIndex === index
            ? value
            : option
      )
    );
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) {
      return;
    }

    setPollOptions((previous) => [
      ...previous,
      ""
    ]);
  };

  const removePollOption = (
    index
  ) => {
    if (pollOptions.length <= 2) {
      return;
    }

    setPollOptions((previous) =>
      previous.filter(
        (_, optionIndex) =>
          optionIndex !== index
      )
    );
  };

  /* ==========================================================
     THUMBNAIL
     ========================================================== */

  const generateCover = async (
    time = thumbnailTime
  ) => {
    if (!selectedClip) {
      setError(
        "Add a video before creating a cover."
      );
      return;
    }

    try {
      const thumbnail =
        await generateThumbnail(
          selectedClip.file,
          time
        );

      const preview =
        URL.createObjectURL(
          thumbnail
        );

      if (thumbnailPreview) {
        revokeObjectUrl(
          thumbnailPreview
        );
      }

      setThumbnailFile(
        thumbnail
      );

      setThumbnailPreview(
        preview
      );

      setThumbnailTime(time);
    } catch (err) {
      setError(
        normalizeMediaError(err)
      );
    }
  };

  const handleThumbnailUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image for your cover."
      );
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "Cover image must be smaller than 10 MB."
      );
      return;
    }

    if (thumbnailPreview) {
      revokeObjectUrl(
        thumbnailPreview
      );
    }

    setThumbnailFile(file);

    setThumbnailPreview(
      URL.createObjectURL(file)
    );
  };

  /* ==========================================================
     DRAFT DATA
     ========================================================== */

  const buildEditorData =
    useCallback(
      () => ({
        version: 2,
        clips: clips.map(
          (clip) => ({
            id: clip.id,
            name: clip.name,
            duration:
              clip.duration,
            width:
              clip.width,
            height:
              clip.height,
            trimStart:
              clip.trimStart,
            trimEnd:
              clip.trimEnd,
            filter:
              clip.filter,
            filterIntensity:
              clip.filterIntensity,
            volume:
              clip.volume,
            speed:
              clip.speed,
            rotation:
              clip.rotation,
            flipX:
              clip.flipX,
            flipY:
              clip.flipY,
            scale:
              clip.scale,
            transition:
              clip.transition
          })
        ),
        editor: {
          selectedFilter,
          filterIntensity,
          brightness,
          contrast,
          saturation,
          temperature,
          sharpness,
          rotation,
          flipX,
          flipY,
          editorScale,
          aspectRatio,
          fitMode,
          playbackSpeed,
          reverseVideo,
          freezeFrame,
          transition,
          fadeIn,
          fadeOut
        },
        audio: {
          originalAudioEnabled,
          originalAudioVolume,
          musicVolume,
          musicOffset,
          musicDuration,
          musicFadeIn,
          musicFadeOut,
          audioEnhancement,
          noiseReduction,
          voiceIsolation,
          autoDucking,
          normalizeAudio,
          music: selectedMusic
            ? {
                name:
                  selectedMusic.name,
                artist:
                  selectedMusic.artist,
                source:
                  selectedMusic.source,
                artwork:
                  selectedMusic.artwork,
                copyrightStatus:
                  selectedMusic.copyrightStatus
              }
            : null
        },
        textLayers,
        stickers,
        subtitles: {
          enabled:
            subtitlesEnabled,
          language:
            subtitleLanguage,
          style:
            subtitleStyle,
          size:
            subtitleSize,
          color:
            subtitleColor,
          background:
            subtitleBackground,
          data:
            subtitleData
        },
        chapters,
        poll: {
          enabled:
            pollEnabled,
          question:
            pollQuestion,
          options:
            pollOptions,
          duration:
            pollDuration,
          anonymous:
            pollAnonymous
        },
        product: {
          enabled:
            productEnabled,
          title:
            productTitle,
          price:
            productPrice,
          currency:
            productCurrency,
          url:
            productUrl,
          cta:
            productCta
        },
        thumbnail: {
          time:
            thumbnailTime,
          position:
            thumbnailPosition,
          filter:
            thumbnailFilter
        }
      }),
      [
        clips,
        selectedFilter,
        filterIntensity,
        brightness,
        contrast,
        saturation,
        temperature,
        sharpness,
        rotation,
        flipX,
        flipY,
        editorScale,
        aspectRatio,
        fitMode,
        playbackSpeed,
        reverseVideo,
        freezeFrame,
        transition,
        fadeIn,
        fadeOut,
        originalAudioEnabled,
        originalAudioVolume,
        musicVolume,
        musicOffset,
        musicDuration,
        musicFadeIn,
        musicFadeOut,
        audioEnhancement,
        noiseReduction,
        voiceIsolation,
        autoDucking,
        normalizeAudio,
        selectedMusic,
        textLayers,
        stickers,
        subtitlesEnabled,
        subtitleLanguage,
        subtitleStyle,
        subtitleSize,
        subtitleColor,
        subtitleBackground,
        subtitleData,
        chapters,
        pollEnabled,
        pollQuestion,
        pollOptions,
        pollDuration,
        pollAnonymous,
        productEnabled,
        productTitle,
        productPrice,
        productCurrency,
        productUrl,
        productCta,
        thumbnailTime,
        thumbnailPosition,
        thumbnailFilter
      ]
    );

  const buildDraftPayload =
    useCallback(
      () => ({
        ...draft,
        editor_data:
          buildEditorData(),
        is_draft: true,
        status: "draft",
        processing_status:
          "draft",
        processing_progress: 0
      }),
      [
        draft,
        buildEditorData
      ]
    );

  /* ==========================================================
     SAVE DRAFT
     ========================================================== */

  const saveDraft = useCallback(
    async (
      silent = false
    ) => {
      if (!authenticatedUser) {
        if (!silent) {
          setError(
            "Please sign in before saving a draft."
          );
        }

        return null;
      }

      if (!clips.length) {
        if (!silent) {
          setError(
            "Add a video before saving a draft."
          );
        }

        return null;
      }

      setIsSavingDraft(true);

      try {
        const payload =
          buildDraftPayload();

        const firstClip =
          clips[0];

        const { data, error: dbError } =
          await supabase
            .from("videos")
            .insert({
              user_id:
                authenticatedUser.id,
              video_url:
                firstClip.previewUrl,
              caption:
                payload.caption || "",
              music_name:
                selectedMusic?.name ||
                "Original Audio",
              music_url: null,
              is_private:
                payload.privacy ===
                "private",
              views: 0,
              likes_count: 0,
              comments_count: 0,
              views_count: 0,
              favorites_count: 0,
              thumbnail_url:
                thumbnailPreview ||
                null,
              tags:
                payload.tags || [],
              mentions:
                payload.mentions || [],
              location:
                payload.location || null,
              privacy:
                payload.privacy ||
                "public",
              allow_duet:
                payload.allowDuet,
              allow_stitch:
                payload.allowStitch,
              allow_download:
                payload.allowDownload,
              allow_comments:
                payload.allowComments,
              is_commercial:
                payload.isCommercial,
              sponsor_tag:
                payload.sponsorTag ||
                null,
              age_restricted:
                payload.ageRestricted,
              filter_style:
                selectedFilter,
              category:
                payload.category,
              poll_data:
                pollEnabled
                  ? {
                      question:
                        pollQuestion,
                      options:
                        pollOptions,
                      duration:
                        pollDuration,
                      anonymous:
                        pollAnonymous
                    }
                  : null,
              product_link:
                productEnabled
                  ? productUrl
                  : null,
              chapters,
              subtitles:
                subtitlesEnabled
                  ? subtitleData
                  : null,
              audio_enhancement:
                audioEnhancement,
              scheduled_at:
                payload.scheduledAt ||
                null,
              thumbnail_text:
                coverText || null,
              is_pinned: false,
              title:
                payload.title || "",
              status: "draft",
              archived_at: null,
              deleted_at: null,
              is_featured: false,
              reposts_count: 0,
              shares_count: 0,
              saves_count: 0,
              completion_rate: 0,
              average_watch_seconds: 0,
              copyright_status:
                selectedMusic
                  ?.copyrightStatus ||
                "unknown",
              content_warning:
                payload.contentWarning ||
                null,
              ai_generated:
                false,
              processing_status:
                "draft",
              processing_progress: 0,
              language:
                payload.language ||
                "English",
              creator_notes:
                payload.creatorNotes ||
                null,
              audio_embedded:
                false,
              audio_source:
                selectedMusic
                  ? "selected_music_pending_merge"
                  : "original",
              ...(buildEditorData()
                ? {
                    editor_data:
                      buildEditorData(),
                    is_draft: true,
                    moderation_status:
                      "pending"
                  }
                : {})
            })
            .select()
            .single();

        if (dbError) {
          throw dbError;
        }

        setLastSavedAt(
          new Date()
        );

        if (!silent) {
          setNotice(
            "Draft saved successfully."
          );
        }

        return data;
      } catch (err) {
        if (!silent) {
          setError(
            normalizeMediaError(err)
          );
        }

        return null;
      } finally {
        setIsSavingDraft(false);
      }
    },
    [
      authenticatedUser,
      clips,
      buildDraftPayload,
      selectedMusic,
      thumbnailPreview,
      draft,
      selectedFilter,
      pollEnabled,
      pollQuestion,
      pollOptions,
      pollDuration,
      pollAnonymous,
      productEnabled,
      productUrl,
      chapters,
      subtitlesEnabled,
      subtitleData,
      audioEnhancement,
      coverText,
      buildEditorData
    ]
  );

  /* ==========================================================
     AUTOSAVE
     ========================================================== */

  useEffect(() => {
    if (
      !authenticatedUser ||
      !clips.length
    ) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(
        autosaveTimerRef.current
      );
    }

    autosaveTimerRef.current =
      setTimeout(() => {
        saveDraft(true);
      }, 5000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(
          autosaveTimerRef.current
        );
      }
    };
  }, [
    authenticatedUser,
    clips,
    draft,
    selectedMusic,
    selectedFilter,
    textLayers,
    subtitlesEnabled,
    subtitleData,
    chapters,
    pollEnabled,
    productEnabled,
    saveDraft
  ]);

  /* ==========================================================
     REAL-TIME STT EXTENSION
     ========================================================== */

  const generateSubtitles =
    async () => {
      if (!selectedClip) {
        setError(
          "Add a video before generating subtitles."
        );
        return;
      }

      setSubtitleGenerating(true);
      setError("");

      try {
        if (
          !window.SpeechRecognition &&
          !window.webkitSpeechRecognition
        ) {
          throw new Error(
            "Browser speech recognition is unavailable. Connect your backend speech-to-text service for automatic subtitles."
          );
        }

        setNotice(
          "Browser speech recognition is available, but reliable full-video subtitle generation requires a backend speech-to-text service."
        );
      } catch (err) {
        setError(
          normalizeMediaError(err)
        );
      } finally {
        setSubtitleGenerating(false);
      }
    };

  /* ==========================================================
     PROCESS FINAL VIDEO
     ========================================================== */

  const buildFinalVideo = async () => {
    if (!clips.length) {
      throw new Error(
        "No video clips are available."
      );
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      let workingFile =
        clips.length === 1
          ? clips[0].file
          : clips[0].file;

      if (clips.length > 1) {
        setProcessingStage(
          "Combining video clips..."
        );

        const first =
          clips[0];

        workingFile =
          await processVideoWithCanvas({
            videoFile:
              first.file,
            trimStart:
              first.trimStart,
            trimEnd:
              first.trimEnd,
            filterCss:
              DEFAULT_FILTERS.find(
                (filter) =>
                  filter.id ===
                  first.filter
              )?.css ||
              "none",
            brightness,
            contrast,
            saturation,
            rotation:
              first.rotation,
            flipX:
              first.flipX,
            flipY:
              first.flipY,
            scale:
              first.scale,
            aspectRatio,
            volume:
              originalAudioEnabled
                ? originalAudioVolume
                : 0,
            playbackSpeed:
              first.speed,
            onProgress:
              setProcessingProgress
          });
      } else {
        const clip =
          clips[0];

        const needsVideoProcessing =
          Number(
            clip.trimStart || 0
          ) > 0 ||
          Number(
            clip.trimEnd || 0
          ) <
            Number(
              clip.duration || 0
            ) ||
          clip.filter !==
            "original" ||
          clip.rotation !== 0 ||
          clip.flipX ||
          clip.flipY ||
          clip.scale !== 1 ||
          aspectRatio !==
            clip.aspectRatio ||
          brightness !== 1 ||
          contrast !== 1 ||
          saturation !== 1 ||
          playbackSpeed !== 1 ||
          !originalAudioEnabled;

        if (needsVideoProcessing) {
          setProcessingStage(
            "Applying video edits..."
          );

          workingFile =
            await processVideoWithCanvas({
              videoFile:
                clip.file,
              trimStart,
              trimEnd:
                trimEnd ||
                clip.duration,
              filterCss:
                selectedFilterObject.css,
              brightness,
              contrast,
              saturation,
              rotation,
              flipX,
              flipY,
              scale:
                editorScale,
              aspectRatio,
              volume:
                originalAudioEnabled
                  ? originalAudioVolume
                  : 0,
              playbackSpeed,
              onProgress:
                setProcessingProgress
            });
        }
      }

      if (selectedMusic?.url) {
        setProcessingStage(
          "Embedding selected music into the final video..."
        );

        workingFile =
          await mergeVideoWithMusic({
            videoFile:
              workingFile,
            musicUrl:
              selectedMusic.url,
            originalVolume:
              originalAudioEnabled
                ? originalAudioVolume
                : 0,
            musicVolume,
            musicOffset,
            musicDuration,
            fadeIn:
              musicFadeIn,
            fadeOut:
              musicFadeOut,
            onProgress:
              (progress) =>
                setProcessingProgress(
                  progress
                )
          });
      }

      setProcessingStage(
        "Preparing final video..."
      );

      setProcessingProgress(100);

      return workingFile;
    } finally {
      setIsProcessing(false);
    }
  };

  /* ==========================================================
     THUMBNAIL PREPARATION
     ========================================================== */

  const prepareThumbnail =
    async (videoFile) => {
      if (thumbnailFile) {
        return thumbnailFile;
      }

      const clip =
        clips[0];

      if (!clip) {
        return null;
      }

      return generateThumbnail(
        videoFile,
        thumbnailTime
      );
    };

  /* ==========================================================
     SUPABASE UPLOAD
     ========================================================== */

  const uploadFileWithProgress =
    async (
      bucket,
      path,
      file,
      accessToken
    ) => {
      if (!accessToken) {
        const { error: uploadError } =
          await supabase.storage
            .from(bucket)
            .upload(
              path,
              file,
              {
                cacheControl:
                  "3600",
                upsert: false,
                contentType:
                  file.type
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        setUploadProgress(100);

        return;
      }

      return new Promise(
        (resolve, reject) => {
          const xhr =
            new XMLHttpRequest();

          xhr.open(
            "POST",
            `${
              import.meta.env
                .VITE_SUPABASE_URL
            }/storage/v1/object/${bucket}/${encodeURIComponent(
              path
            )}`
          );

          xhr.setRequestHeader(
            "Authorization",
            `Bearer ${accessToken}`
          );

          xhr.setRequestHeader(
            "apikey",
            import.meta.env
              .VITE_SUPABASE_ANON_KEY
          );

          xhr.setRequestHeader(
            "x-upsert",
            "false"
          );

          xhr.setRequestHeader(
            "Content-Type",
            file.type ||
              "application/octet-stream"
          );

          xhr.upload.onprogress = (
            event
          ) => {
            if (event.lengthComputable) {
              setUploadProgress(
                Math.round(
                  (event.loaded /
                    event.total) *
                    100
                )
              );
            }
          };

          xhr.onerror = () => {
            reject(
              new Error(
                "Network error during upload."
              )
            );
          };

          xhr.ontimeout = () => {
            reject(
              new Error(
                "Upload timed out."
              )
            );
          };

          xhr.onload = () => {
            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {
              resolve();
              return;
            }

            let message =
              "Storage upload failed.";

            try {
              const parsed =
                JSON.parse(
                  xhr.responseText
                );

              message =
                parsed.message ||
                parsed.error ||
                message;
            } catch {
              // noop
            }

            reject(
              new Error(message)
            );
          };

          xhr.send(file);
        }
      );
    };

  /* ==========================================================
     FINAL PUBLISH
     ========================================================== */

  const handlePublish =
    async () => {
      setError("");
      setNotice("");

      if (!authenticatedUser) {
        setError(
          "Please sign in before publishing."
        );
        return;
      }

      if (!clips.length) {
        setError(
          "Add a video before publishing."
        );
        return;
      }

      if (!networkOnline) {
        setError(
          "You are offline. Reconnect before publishing."
        );
        return;
      }

      if (
        draft.caption.length >
        4000
      ) {
        setError(
          "Caption is too long."
        );
        return;
      }

      if (
        draft.isCommercial &&
        !draft.sponsorTag.trim()
      ) {
        setError(
          "Add a sponsor or branded-content disclosure."
        );
        return;
      }

      if (
        pollEnabled &&
        (!pollQuestion.trim() ||
          pollOptions.filter(
            (option) =>
              option.trim()
          ).length < 2)
      ) {
        setError(
          "Complete the poll before publishing."
        );
        return;
      }

      if (
        productEnabled &&
        productUrl.trim()
      ) {
        try {
          new URL(
            productUrl
          );
        } catch {
          setError(
            "Product URL is invalid."
          );
          return;
        }
      }

      setIsUploading(true);
      setUploadProgress(0);

      let finalFile = null;
      let thumbnail = null;

      try {
        setUploadStage(
          "Preparing media"
        );

        finalFile =
          await buildFinalVideo();

        setUploadingFinalFile(
          finalFile
        );

        setUploadStage(
          "Preparing cover"
        );

        thumbnail =
          await prepareThumbnail(
            finalFile
          );

        const {
          data: {
            session
          }
        } =
          await supabase.auth.getSession();

        const accessToken =
          session?.access_token;

        if (!accessToken) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const userId =
          session.user.id;

        const baseName =
          safeFileName(
            draft.title ||
              clips[0].name ||
              "video"
          );

        const timestamp =
          Date.now();

        const extension =
          finalFile.type.includes(
            "mp4"
          )
            ? "mp4"
            : "webm";

        const videoPath =
          `${userId}/videos/${timestamp}_${baseName}.${extension}`;

        const thumbnailPath =
          `${userId}/thumbnails/${timestamp}_${baseName}.jpg`;

        setUploadStage(
          "Uploading final video"
        );

        await uploadFileWithProgress(
          VIDEO_BUCKET,
          videoPath,
          finalFile,
          accessToken
        );

        setUploadProgress(100);

        let publicVideoUrl = "";

        {
          const {
            data: publicData
          } =
            supabase.storage
              .from(VIDEO_BUCKET)
              .getPublicUrl(
                videoPath
              );

          publicVideoUrl =
            publicData?.publicUrl ||
            "";
        }

        if (!publicVideoUrl) {
          throw new Error(
            "Could not create the public video URL."
          );
        }

        setFinalVideoUrl(
          publicVideoUrl
        );

        let publicThumbnailUrl =
          null;

        if (thumbnail) {
          setUploadStage(
            "Uploading cover"
          );

          await uploadFileWithProgress(
            VIDEO_BUCKET,
            thumbnailPath,
            thumbnail,
            accessToken
          );

          const {
            data: thumbnailPublic
          } =
            supabase.storage
              .from(VIDEO_BUCKET)
              .getPublicUrl(
                thumbnailPath
              );

          publicThumbnailUrl =
            thumbnailPublic?.publicUrl ||
            null;

          setFinalThumbnailUrl(
            publicThumbnailUrl || ""
          );
        }

        setUploadStage(
          "Publishing metadata"
        );

        const metadata =
          await readVideoMetadata(
            finalFile
          );

        const tags =
          extractHashtags(
            draft.caption
          );

        const mentions =
          extractMentions(
            draft.caption
          );

        const scheduledAt =
          draft.scheduledAt
            ? new Date(
                draft.scheduledAt
              ).toISOString()
            : null;

        const videoPayload = {
          user_id:
            userId,

          video_url:
            publicVideoUrl,

          caption:
            draft.caption || "",

          music_name:
            selectedMusic?.name ||
            "Original Audio",

          music_url: null,

          is_private:
            draft.privacy ===
            "private",

          views: 0,

          likes_count: 0,

          comments_count: 0,

          views_count: 0,

          favorites_count: 0,

          thumbnail_url:
            publicThumbnailUrl,

          tags,

          mentions,

          location:
            draft.location ||
            null,

          privacy:
            draft.privacy ||
            "public",

          allow_duet:
            draft.allowDuet,

          allow_stitch:
            draft.allowStitch,

          allow_download:
            draft.allowDownload,

          allow_comments:
            draft.allowComments,

          is_commercial:
            draft.isCommercial,

          sponsor_tag:
            draft.sponsorTag ||
            null,

          age_restricted:
            draft.ageRestricted,

          filter_style:
            selectedFilter,

          category:
            draft.category,

          poll_data:
            pollEnabled
              ? {
                  question:
                    pollQuestion,
                  options:
                    pollOptions.filter(
                      (option) =>
                        option.trim()
                    ),
                  duration:
                    pollDuration,
                  anonymous:
                    pollAnonymous,
                  expires_at:
                    new Date(
                      Date.now() +
                        pollDuration *
                          60 *
                          60 *
                          1000
                    ).toISOString()
                }
              : null,

          product_link:
            productEnabled
              ? productUrl ||
                null
              : null,

          chapters:
            chapters.length
              ? chapters
              : null,

          subtitles:
            subtitlesEnabled
              ? subtitleData
              : null,

          audio_enhancement:
            audioEnhancement,

          scheduled_at:
            scheduledAt,

          thumbnail_text:
            coverText ||
            null,

          is_pinned: false,

          title:
            draft.title || "",

          status:
            scheduledAt
              ? "scheduled"
              : "published",

          archived_at: null,

          deleted_at: null,

          is_featured: false,

          reposts_count: 0,

          shares_count: 0,

          saves_count: 0,

          completion_rate: 0,

          average_watch_seconds: 0,

          copyright_status:
            selectedMusic
              ?.copyrightStatus ||
            "unknown",

          content_warning:
            draft.contentWarning ||
            null,

          ai_generated: false,

          processing_status:
            "ready",

          processing_progress: 100,

          language:
            draft.language ||
            "English",

          creator_notes:
            draft.creatorNotes ||
            null,

          audio_embedded:
            Boolean(
              selectedMusic
            ),

          audio_source:
            selectedMusic
              ? "embedded_selected_music"
              : "original",

          video_duration_seconds:
            metadata.duration,

          video_width:
            metadata.width,

          video_height:
            metadata.height,

          video_file_size:
            finalFile.size,

          video_codec:
            extension === "mp4"
              ? "h264"
              : "vp8/vp9",

          aspect_ratio:
            aspectRatio,

          music_artist:
            selectedMusic?.artist ||
            null,

          music_source:
            selectedMusic?.source ||
            "original",

          music_offset_seconds:
            selectedMusic
              ? musicOffset
              : 0,

          music_duration_seconds:
            selectedMusic
              ? musicDuration ||
                null
              : null,

          original_audio_volume:
            originalAudioEnabled
              ? originalAudioVolume
              : 0,

          music_volume:
            selectedMusic
              ? musicVolume
              : 0,

          audio_fade_in_seconds:
            selectedMusic
              ? musicFadeIn
              : 0,

          audio_fade_out_seconds:
            selectedMusic
              ? musicFadeOut
              : 0,

          editor_data:
            buildEditorData(),

          is_draft: false,

          processing_error: null,

          moderation_status:
            "pending",

          country_restrictions:
            draft.countryRestrictions,

          audience_settings:
            draft.audienceSettings,

          blocked_words:
            draft.blockedWords
        };

        let insertedVideo =
          null;

        let insertError =
          null;

        {
          const {
            data,
            error: richError
          } =
            await supabase
              .from("videos")
              .insert(
                videoPayload
              )
              .select()
              .single();

          insertedVideo =
            data;

          insertError =
            richError;
        }

        if (insertError) {
          const fallbackPayload = {
            user_id:
              userId,

            video_url:
              publicVideoUrl,

            caption:
              draft.caption || "",

            music_name:
              selectedMusic?.name ||
              "Original Audio",

            music_url: null,

            is_private:
              draft.privacy ===
              "private",

            views: 0,

            likes_count: 0,

            comments_count: 0,

            views_count: 0,

            favorites_count: 0,

            thumbnail_url:
              publicThumbnailUrl,

            tags,

            mentions,

            location:
              draft.location ||
              null,

            privacy:
              draft.privacy ||
              "public",

            allow_duet:
              draft.allowDuet,

            allow_stitch:
              draft.allowStitch,

            allow_download:
              draft.allowDownload,

            allow_comments:
              draft.allowComments,

            is_commercial:
              draft.isCommercial,

            sponsor_tag:
              draft.sponsorTag ||
              null,

            age_restricted:
              draft.ageRestricted,

            filter_style:
              selectedFilter,

            category:
              draft.category,

            poll_data:
              pollEnabled
                ? {
                    question:
                      pollQuestion,
                    options:
                      pollOptions,
                    duration:
                      pollDuration
                  }
                : null,

            product_link:
              productEnabled
                ? productUrl ||
                  null
                : null,

            chapters:
              chapters.length
                ? chapters
                : null,

            subtitles:
              subtitlesEnabled
                ? subtitleData
                : null,

            audio_enhancement:
              audioEnhancement,

            scheduled_at:
              scheduledAt,

            thumbnail_text:
              coverText ||
              null,

            title:
              draft.title || "",

            status:
              scheduledAt
                ? "scheduled"
                : "published",

            reposts_count: 0,

            shares_count: 0,

            saves_count: 0,

            copyright_status:
              selectedMusic
                ?.copyrightStatus ||
              "unknown",

            content_warning:
              draft.contentWarning ||
              null,

            ai_generated:
              false,

            processing_status:
              "ready",

            processing_progress:
              100,

            language:
              draft.language ||
              "English",

            creator_notes:
              draft.creatorNotes ||
              null,

            audio_embedded:
              Boolean(
                selectedMusic
              ),

            audio_source:
              selectedMusic
                ? "embedded_selected_music"
                : "original"
          };

          const fallback =
            await supabase
              .from("videos")
              .insert(
                fallbackPayload
              )
              .select()
              .single();

          if (fallback.error) {
            throw fallback.error;
          }

          insertedVideo =
            fallback.data;
        }

        setUploadStage(
          "Published successfully"
        );

        setNotice(
          scheduledAt
            ? "Video scheduled successfully."
            : "Video published successfully."
        );

        confetti({
          particleCount: 120,
          spread: 90,
          origin: {
            y: 0.65
          }
        });

        onComplete?.(
          insertedVideo
        );
      } catch (err) {
        setError(
          normalizeMediaError(err)
        );
      } finally {
        setIsUploading(false);
        setUploadingFinalFile(null);
      }
    };

  /* ==========================================================
     UI RESET
     ========================================================== */

  const resetEditor = () => {
    setSelectedFilter(
      "original"
    );

    setFilterIntensity(100);
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setTemperature(0);
    setSharpness(0);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setEditorScale(1);
    setAspectRatio("9:16");
    setFitMode("fill");
    setPlaybackSpeed(1);
    setReverseVideo(false);
    setFreezeFrame(false);
    setTransition("none");
    setFadeIn(0);
    setFadeOut(0);

    updateSelectedClip({
      filter: "original",
      filterIntensity: 100,
      rotation: 0,
      flipX: false,
      flipY: false,
      scale: 1,
      speed: 1
    });
  };

  /* ==========================================================
     PREVIEW STYLE
     ========================================================== */

  const previewStyle = {
    filter: previewFilterCss,
    transform: [
      `rotate(${rotation}deg)`,
      `scaleX(${flipX ? -1 : 1})`,
      `scaleY(${flipY ? -1 : 1})`,
      `scale(${editorScale})`
    ].join(" ")
  };

  /* ==========================================================
     TOOLS
     ========================================================== */

  const tools = [
    {
      id: "media",
      label: "Media",
      icon: FileVideo
    },
    {
      id: "edit",
      label: "Edit",
      icon: Scissors
    },
    {
      id: "audio",
      label: "Audio",
      icon: Music
    },
    {
      id: "text",
      label: "Text",
      icon: Type
    },
    {
      id: "effects",
      label: "Effects",
      icon: Sparkles
    },
    {
      id: "captions",
      label: "Captions",
      icon: Captions
    },
    {
      id: "cover",
      label: "Cover",
      icon: ImageIcon
    },
    {
      id: "publish",
      label: "Publish",
      icon: Send
    }
  ];

  /* ==========================================================
     RENDER HELPERS
     ========================================================== */

  const renderToggle = (
    checked,
    onChange,
    label,
    description
  ) => (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
      aria-pressed={checked}
    >
      <div>
        <div className="text-sm font-medium text-white">
          {label}
        </div>

        {description && (
          <div className="mt-1 text-xs text-white/45">
            {description}
          </div>
        )}
      </div>

      <div
        className={`relative h-6 w-11 rounded-full transition ${
          checked
            ? "bg-violet-500"
            : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </div>
    </button>
  );

  const renderSlider = (
    label,
    value,
    min,
    max,
    step,
    onChange,
    suffix = ""
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/65">
          {label}
        </span>

        <span className="text-xs font-medium text-white">
          {Number(value).toFixed(
            step < 1 ? 1 : 0
          )}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Number(event.target.value)
          )
        }
        className="w-full accent-violet-500"
        aria-label={label}
      />
    </div>
  );

  const renderSectionHeader = (
    icon,
    title,
    description
  ) => {
    const Icon = icon;

    return (
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl bg-violet-500/10 p-2 text-violet-300">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-white/45">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  };

  /* ==========================================================
     MEDIA PANEL
     ========================================================== */

  const renderMediaPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          FileVideo,
          "Media",
          "Import clips, record with your camera, or build your video from multiple clips."
        )}

        <div
          onDragEnter={
            handleDragEnter
          }
          onDragLeave={
            handleDragLeave
          }
          onDragOver={
            handleDragOver
          }
          onDrop={
            handleDrop
          }
          className={`rounded-2xl border border-dashed p-6 text-center transition ${
            isDragging
              ? "border-violet-400 bg-violet-500/10"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <UploadIcon
              size={24}
              className="text-violet-300"
            />
          </div>

          <h3 className="text-sm font-semibold text-white">
            Drop your video here
          </h3>

          <p className="mt-1 text-xs text-white/45">
            MP4, WebM, MOV and other browser-supported formats
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <UploadIcon size={16} />
              Upload video
            </button>

            <button
              type="button"
              onClick={() =>
                setCameraOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Camera size={16} />
              Camera
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(event) => {
              addFiles(
                event.target.files
              );

              event.target.value =
                "";
            }}
          />
        </div>

        {lowDataMode && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <Signal
              size={18}
              className="mt-0.5 text-amber-300"
            />

            <div>
              <div className="text-sm font-medium text-amber-100">
                Low-data mode enabled
              </div>

              <div className="mt-1 text-xs leading-5 text-amber-100/60">
                Recording and preview quality will be reduced where possible to save data and memory.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              setLowDataMode(
                (previous) =>
                  !previous
              )
            }
            className={`rounded-xl border p-4 text-left transition ${
              lowDataMode
                ? "border-violet-400/40 bg-violet-500/10"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <Signal
              size={18}
              className="mb-3 text-violet-300"
            />

            <div className="text-sm font-medium text-white">
              Data Saver
            </div>

            <div className="mt-1 text-xs text-white/45">
              Reduce processing and upload size
            </div>
          </button>

          <button
            type="button"
            onClick={
              startCamera
            }
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
          >
            <Camera
              size={18}
              className="mb-3 text-violet-300"
            />

            <div className="text-sm font-medium text-white">
              Record
            </div>

            <div className="mt-1 text-xs text-white/45">
              Use your phone or webcam
            </div>
          </button>
        </div>

        {clips.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Clips
                </h3>

                <p className="text-xs text-white/40">
                  {clips.length} clip
                  {clips.length === 1
                    ? ""
                    : "s"} ·{" "}
                  {formatTime(
                    totalDuration
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/5"
              >
                <Plus
                  size={14}
                  className="mr-1 inline"
                />
                Add clip
              </button>
            </div>

            <div className="space-y-2">
              {clips.map(
                (clip, index) => (
                  <div
                    key={clip.id}
                    className={`group flex items-center gap-3 rounded-xl border p-2 transition ${
                      clip.id ===
                      selectedClipId
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selectClip(
                          clip.id
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
                        {clip.thumbnail && (
                          <img
                            src={URL.createObjectURL(
                              clip.thumbnail
                            )}
                            alt=""
                            className="h-full w-full object-cover"
                            onLoad={(event) =>
                              revokeObjectUrl(
                                event.currentTarget
                                  .src
                              )
                            }
                          />
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[9px] text-white">
                          {formatTime(
                            clip.duration
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {index + 1}.{" "}
                          {clip.name}
                        </div>

                        <div className="mt-1 text-xs text-white/40">
                          {formatBytes(
                            clip.fileSize
                          )}{" "}
                          ·{" "}
                          {clip.width}×
                          {clip.height}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          moveClip(
                            clip.id,
                            "left"
                          )
                        }
                        className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Move clip left"
                      >
                        <ChevronLeft
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveClip(
                            clip.id,
                            "right"
                          )
                        }
                        className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Move clip right"
                      >
                        <ChevronRight
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeClip(
                            clip.id
                          )
                        }
                        className="rounded-lg p-2 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Remove clip"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-white">
              <Wifi
                size={16}
                className={
                  networkOnline
                    ? "text-emerald-300"
                    : "text-red-300"
                }
              />

              <span className="text-sm font-medium">
                {networkOnline
                  ? "Online"
                  : "Offline"}
              </span>
            </div>

            <div className="mt-2 text-xs text-white/40">
              Uploads require a stable connection.
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-white">
              <HardDrive
                size={16}
                className="text-violet-300"
              />

              <span className="text-sm font-medium">
                Max file
              </span>
            </div>

            <div className="mt-2 text-xs text-white/40">
              {formatBytes(
                MAX_VIDEO_SIZE
              )}
            </div>
          </div>
        </div>
      </div>
    );

  /* ==========================================================
     EDIT PANEL
     ========================================================== */

  const renderEditPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Scissors,
          "Video editor",
          "Trim, transform, crop, resize and control the visual look of each clip."
        )}

        {!selectedClip ? (
          <EmptyState
            icon={Scissors}
            title="Select a clip"
            description="Import a video and select a clip to begin editing."
          />
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                [
                  "adjust",
                  "Adjust",
                  SlidersHorizontal
                ],
                [
                  "transform",
                  "Transform",
                  Rotate3D
                ],
                [
                  "speed",
                  "Speed",
                  Gauge
                ],
                [
                  "filters",
                  "Filters",
                  Palette
                ]
              ].map(
                ([
                  id,
                  label,
                  Icon
                ]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setActiveEditorTab(
                        id
                      )
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      activeEditorTab ===
                      id
                        ? "bg-violet-500 text-white"
                        : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={14}
                    />
                    {label}
                  </button>
                )
              )}
            </div>

            {activeEditorTab ===
              "adjust" && (
              <div className="space-y-5">
                {renderSlider(
                  "Brightness",
                  brightness,
                  0.5,
                  1.5,
                  0.01,
                  (value) => {
                    setBrightness(
                      value
                    );
                  }
                )}

                {renderSlider(
                  "Contrast",
                  contrast,
                  0.5,
                  1.5,
                  0.01,
                  setContrast
                )}

                {renderSlider(
                  "Saturation",
                  saturation,
                  0,
                  2,
                  0.01,
                  setSaturation
                )}

                {renderSlider(
                  "Temperature",
                  temperature,
                  -100,
                  100,
                  1,
                  setTemperature
                )}

                {renderSlider(
                  "Sharpness",
                  sharpness,
                  0,
                  100,
                  1,
                  setSharpness,
                  "%"
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">
                    Aspect ratio
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIOS.map(
                      (item) => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() => {
                            setAspectRatio(
                              item.id
                            );

                            updateSelectedClip(
                              {
                                aspectRatio:
                                  item.id
                              }
                            );
                          }}
                          className={`rounded-lg border px-2 py-3 text-xs font-medium transition ${
                            aspectRatio ===
                            item.id
                              ? "border-violet-400 bg-violet-500/10 text-violet-200"
                              : "border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFitMode(
                        "fit"
                      );
                    }}
                    className={`rounded-xl border p-4 text-left ${
                      fitMode ===
                      "fit"
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <Minimize2
                      size={17}
                      className="mb-2 text-violet-300"
                    />

                    <div className="text-sm font-medium text-white">
                      Fit
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      Preserve the whole frame
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFitMode(
                        "fill"
                      );
                    }}
                    className={`rounded-xl border p-4 text-left ${
                      fitMode ===
                      "fill"
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <Maximize2
                      size={17}
                      className="mb-2 text-violet-300"
                    />

                    <div className="text-sm font-medium text-white">
                      Fill
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      Fill the selected frame
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeEditorTab ===
              "transform" && (
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const value =
                        rotation ===
                        270
                          ? 0
                          : rotation +
                            90;

                      setRotation(
                        value
                      );

                      updateSelectedClip(
                        {
                          rotation:
                            value
                        }
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-white/70 hover:bg-white/10"
                  >
                    <RotateCw
                      size={17}
                      className="mx-auto mb-1"
                    />
                    <span className="text-[10px]">
                      Rotate
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const value =
                        !flipX;

                      setFlipX(
                        value
                      );

                      updateSelectedClip(
                        {
                          flipX: value
                        }
                      );
                    }}
                    className={`rounded-xl border p-3 text-center ${
                      flipX
                        ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-white/[0.03] text-white/70"
                    }`}
                  >
                    <FlipHorizontal2
                      size={17}
                      className="mx-auto mb-1"
                    />
                    <span className="text-[10px]">
                      Flip H
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const value =
                        !flipY;

                      setFlipY(
                        value
                      );

                      updateSelectedClip(
                        {
                          flipY: value
                        }
                      );
                    }}
                    className={`rounded-xl border p-3 text-center ${
                      flipY
                        ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-white/[0.03] text-white/70"
                    }`}
                  >
                    <FlipVertical2
                      size={17}
                      className="mx-auto mb-1"
                    />
                    <span className="text-[10px]">
                      Flip V
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      resetEditor
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-white/70 hover:bg-white/10"
                  >
                    <ResetIcon
                      size={17}
                      className="mx-auto mb-1"
                    />
                    <span className="text-[10px]">
                      Reset
                    </span>
                  </button>
                </div>

                {renderSlider(
                  "Zoom",
                  editorScale,
                  0.5,
                  2,
                  0.01,
                  (value) => {
                    setEditorScale(
                      value
                    );

                    updateSelectedClip(
                      {
                        scale:
                          value
                      }
                    );
                  },
                  "×"
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">
                    Crop
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveEditorTab(
                          "adjust"
                        )
                      }
                      className="rounded-lg bg-white/5 px-3 py-3 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Crop
                        size={15}
                        className="mr-2 inline"
                      />
                      Smart crop
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveEditorTab(
                          "adjust"
                        )
                      }
                      className="rounded-lg bg-white/5 px-3 py-3 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Focus
                        size={15}
                        className="mr-2 inline"
                      />
                      Auto reframe
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeEditorTab ===
              "speed" && (
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-2">
                  {SPEEDS.map(
                    (speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => {
                          setPlaybackSpeed(
                            speed
                          );

                          updateSelectedClip(
                            {
                              speed
                            }
                          );
                        }}
                        className={`rounded-lg border px-2 py-3 text-xs ${
                          playbackSpeed ===
                          speed
                            ? "border-violet-400 bg-violet-500/10 text-violet-200"
                            : "border-white/10 bg-white/[0.02] text-white/50"
                        }`}
                      >
                        {speed}×
                      </button>
                    )
                  )}
                </div>

                {renderToggle(
                  reverseVideo,
                  setReverseVideo,
                  "Reverse",
                  "Reverse playback during final processing."
                )}

                {renderToggle(
                  freezeFrame,
                  setFreezeFrame,
                  "Freeze frame",
                  "Hold a selected frame for emphasis."
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">
                    Speed curve
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "Montage",
                      "Hero",
                      "Smooth"
                    ].map(
                      (curve) => (
                        <button
                          key={curve}
                          type="button"
                          className="rounded-lg bg-white/5 px-3 py-3 text-xs text-white/55 hover:bg-white/10 hover:text-white"
                        >
                          {curve}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeEditorTab ===
              "filters" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {DEFAULT_FILTERS.map(
                    (filter) => (
                      <button
                        key={
                          filter.id
                        }
                        type="button"
                        onClick={() => {
                          setSelectedFilter(
                            filter.id
                          );

                          updateSelectedClip(
                            {
                              filter:
                                filter.id
                            }
                          );
                        }}
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          selectedFilter ===
                          filter.id
                            ? "border-violet-400/60 bg-violet-500/10"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <div
                          className="h-16 bg-gradient-to-br from-violet-400/30 via-white/5 to-fuchsia-400/20"
                          style={{
                            filter:
                              filter.css
                          }}
                        />

                        <div className="px-2 py-2 text-[10px] font-medium text-white">
                          {
                            filter.name
                          }
                        </div>
                      </button>
                    )
                  )}
                </div>

                {renderSlider(
                  "Intensity",
                  filterIntensity,
                  0,
                  100,
                  1,
                  (value) => {
                    setFilterIntensity(
                      value
                    );

                    updateSelectedClip(
                      {
                        filterIntensity:
                          value
                      }
                    );
                  },
                  "%"
                )}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    Trim
                  </div>

                  <div className="text-xs text-white/40">
                    {formatTime(
                      trimStart
                    )}{" "}
                    —{" "}
                    {formatTime(
                      trimEnd ||
                        selectedClip.duration
                    )}
                  </div>
                </div>

                <Scissors
                  size={17}
                  className="text-violet-300"
                />
              </div>

              {renderSlider(
                "Start",
                trimStart,
                0,
                Math.max(
                  0,
                  selectedClip.duration -
                    0.1
                ),
                0.1,
                (value) => {
                  const next =
                    Math.min(
                      value,
                      (trimEnd ||
                        selectedClip.duration) -
                        0.1
                    );

                  setTrimStart(
                    next
                  );

                  updateSelectedClip(
                    {
                      trimStart:
                        next
                    }
                  );
                },
                "s"
              )}

              {renderSlider(
                "End",
                trimEnd ||
                  selectedClip.duration,
                Math.min(
                  0.1,
                  selectedClip.duration
                ),
                selectedClip.duration,
                0.1,
                (value) => {
                  const next =
                    Math.max(
                      value,
                      trimStart + 0.1
                    );

                  setTrimEnd(
                    next
                  );

                  updateSelectedClip(
                    {
                      trimEnd:
                        next
                    }
                  );
                },
                "s"
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/45">
                Transitions
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TRANSITIONS.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setTransition(
                          item
                        );

                        updateSelectedClip(
                          {
                            transition:
                              item
                          }
                        );
                      }}
                      className={`rounded-lg border px-2 py-3 text-xs capitalize ${
                        transition ===
                        item
                          ? "border-violet-400 bg-violet-500/10 text-violet-200"
                          : "border-white/10 text-white/50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );

  /* ==========================================================
     AUDIO PANEL
     ========================================================== */

  const renderAudioPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Music,
          "Audio studio",
          "Search a song, mix it with the original audio, and embed the final mix directly into the uploaded video."
        )}

        {renderToggle(
          originalAudioEnabled,
          setOriginalAudioEnabled,
          "Original video audio",
          "Keep the microphone and source audio in the final video."
        )}

        {renderSlider(
          "Original audio",
          originalAudioVolume,
          0,
          2,
          0.01,
          setOriginalAudioVolume,
          "×"
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                Add music
              </div>

              <div className="mt-1 text-xs text-white/40">
                Search music and choose a preview.
              </div>
            </div>

            <Music
              size={18}
              className="text-violet-300"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                value={musicQuery}
                onChange={(
                  event
                ) =>
                  setMusicQuery(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    searchMusic();
                  }
                }}
                placeholder="Song, artist or album"
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/50"
              />
            </div>

            <button
              type="button"
              onClick={
                searchMusic
              }
              disabled={
                musicLoading
              }
              className="rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {musicLoading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                "Search"
              )}
            </button>
          </div>

          {selectedMusic && (
            <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3">
              <div className="flex items-center gap-3">
                {selectedMusic.artwork ? (
                  <img
                    src={
                      selectedMusic.artwork
                    }
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                    <Music
                      size={18}
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">
                    {
                      selectedMusic.name
                    }
                  </div>

                  <div className="truncate text-xs text-white/45">
                    {
                      selectedMusic.artist
                    }
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedMusic(
                      null
                    )
                  }
                  className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
                  aria-label="Remove music"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>

              <div className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-white/45">
                <Info
                  size={14}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  The selected music is not stored as a separate audio asset. It is mixed with the video and embedded into the final video file before upload.
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {musicResults.map(
              (music) => (
                <div
                  key={music.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2"
                >
                  {music.artwork ? (
                    <img
                      src={
                        music.artwork
                      }
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                      <Music
                        size={16}
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {music.name}
                    </div>

                    <div className="truncate text-xs text-white/40">
                      {
                        music.artist
                      }
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleMusicPreview(
                        music
                      )
                    }
                    className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    {musicPlayingId ===
                    music.id ? (
                      <Pause
                        size={15}
                      />
                    ) : (
                      <Play
                        size={15}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectMusic(
                        music
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      selectedMusic?.id ===
                      music.id
                        ? "bg-violet-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {selectedMusic?.id ===
                    music.id
                      ? "Selected"
                      : "Use"}
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {selectedMusic && (
          <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/45">
              Music timing & mix
            </div>

            {renderSlider(
              "Music volume",
              musicVolume,
              0,
              1.5,
              0.01,
              setMusicVolume,
              "×"
            )}

            {renderSlider(
              "Music offset",
              musicOffset,
              0,
              60,
              0.1,
              setMusicOffset,
              "s"
            )}

            {renderSlider(
              "Music duration",
              musicDuration,
              0,
              Math.max(
                1,
                musicDuration ||
                  30
              ),
              0.1,
              setMusicDuration,
              "s"
            )}

            {renderSlider(
              "Fade in",
              musicFadeIn,
              0,
              10,
              0.1,
              setMusicFadeIn,
              "s"
            )}

            {renderSlider(
              "Fade out",
              musicFadeOut,
              0,
              10,
              0.1,
              setMusicFadeOut,
              "s"
            )}
          </div>
        )}

        <div className="space-y-2">
          {renderToggle(
            normalizeAudio,
            setNormalizeAudio,
            "Normalize audio",
            "Reduce large loudness differences."
          )}

          {renderToggle(
            audioEnhancement,
            setAudioEnhancement,
            "Voice enhancement",
            "Prepare voice-focused processing metadata."
          )}

          {renderToggle(
            noiseReduction,
            setNoiseReduction,
            "Noise reduction",
            "Prepare noise-reduction processing."
          )}

          {renderToggle(
            voiceIsolation,
            setVoiceIsolation,
            "Voice isolation",
            "Prepare voice-focused audio processing."
          )}

          {renderToggle(
            autoDucking,
            setAutoDucking,
            "Automatic ducking",
            "Lower music when speech is detected during final processing."
          )}
        </div>

        {selectedMusic && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 text-amber-300"
              />

              <div>
                <div className="text-sm font-medium text-amber-100">
                  Copyright metadata
                </div>

                <div className="mt-1 text-xs leading-5 text-amber-100/55">
                  Music licensing and rights verification must be handled by the music provider/backend. The browser editor only embeds the selected playable source into the final file.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  /* ==========================================================
     TEXT PANEL
     ========================================================== */

  const renderTextPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Type,
          "Text & overlays",
          "Add timed text, stickers, emojis, drawings and censor overlays."
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex gap-2">
            <input
              value={textDraft}
              onChange={(
                event
              ) =>
                setTextDraft(
                  event.target.value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  addTextLayer();
                }
              }}
              placeholder="Write something..."
              className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/50"
            />

            <button
              type="button"
              onClick={
                addTextLayer
              }
              className="rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white"
            >
              Add
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-white/50">
              Font
              <select
                value={textFont}
                onChange={(
                  event
                ) =>
                  setTextFont(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              >
                {FONT_OPTIONS.map(
                  (font) => (
                    <option
                      key={font}
                      value={font}
                      className="bg-black"
                    >
                      {font}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="text-xs text-white/50">
              Animation
              <select
                value={
                  textAnimation
                }
                onChange={(
                  event
                ) =>
                  setTextAnimation(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              >
                {TEXT_ANIMATIONS.map(
                  (animation) => (
                    <option
                      key={
                        animation
                      }
                      value={
                        animation
                      }
                      className="bg-black"
                    >
                      {animation}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {renderSlider(
              "Size",
              textSize,
              12,
              120,
              1,
              setTextSize,
              "px"
            )}

            {renderSlider(
              "Start",
              textStart,
              0,
              Math.max(
                1,
                totalDuration
              ),
              0.1,
              setTextStart,
              "s"
            )}

            {renderSlider(
              "End",
              textEnd,
              0.1,
              Math.max(
                1,
                totalDuration
              ),
              0.1,
              setTextEnd,
              "s"
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-white/50">
              Text color
              <input
                type="color"
                value={textColor}
                onChange={(
                  event
                ) =>
                  setTextColor(
                    event.target.value
                  )
                }
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/20"
              />
            </label>

            <label className="text-xs text-white/50">
              Background
              <select
                value={
                  textBackground
                }
                onChange={(
                  event
                ) =>
                  setTextBackground(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
              >
                <option
                  value="transparent"
                  className="bg-black"
                >
                  None
                </option>
                <option
                  value="black"
                  className="bg-black"
                >
                  Black
                </option>
                <option
                  value="white"
                  className="bg-black"
                >
                  White
                </option>
                <option
                  value="violet"
                  className="bg-black"
                >
                  Violet
                </option>
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {renderToggle(
              textOutline,
              setTextOutline,
              "Outline",
              "Improve text readability."
            )}

            {renderToggle(
              textShadow,
              setTextShadow,
              "Shadow",
              "Add depth behind text."
            )}
          </div>
        </div>

        {textLayers.length > 0 && (
          <div className="space-y-2">
            {textLayers.map(
              (layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    selectedTextId ===
                    layer.id
                      ? "border-violet-400/40 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTextId(
                        layer.id
                      )
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium text-white">
                      {
                        layer.text
                      }
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      {layer.start}s
                      {" — "}
                      {layer.end}s
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeTextLayer(
                        layer.id
                      )
                    }
                    className="rounded-lg p-2 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2
                      size={15}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Stickers & emoji
          </div>

          <div className="grid grid-cols-6 gap-2">
            {[
              "😂",
              "🔥",
              "❤️",
              "😭",
              "😍",
              "👀",
              "💯",
              "✨",
              "🤣",
              "🎉",
              "😎",
              "🤯"
            ].map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    addSticker(
                      emoji
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xl hover:bg-white/10"
                >
                  {emoji}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {renderToggle(
            drawingEnabled,
            setDrawingEnabled,
            "Drawing",
            "Enable a drawing layer."
          )}

          {renderToggle(
            censorMode,
            setCensorMode,
            "Censor / blur",
            "Redact sensitive visual areas."
          )}
        </div>
      </div>
    );

  /* ==========================================================
     EFFECTS PANEL
     ========================================================== */

  const renderEffectsPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Sparkles,
          "Effects & AI",
          "Professional effects, beauty controls and AI camera tools."
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-violet-300"
            />

            <div>
              <div className="text-sm font-semibold text-white">
                AI camera filters
              </div>

              <div className="text-xs text-white/40">
                Real-time effects available through AIFilters.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCameraAiEnabled(
                (previous) =>
                  !previous
              )
            }
            className={`w-full rounded-xl border p-3 text-left ${
              cameraAiEnabled
                ? "border-violet-400/40 bg-violet-500/10"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                Enable AI camera
              </span>

              <div
                className={`h-5 w-9 rounded-full ${
                  cameraAiEnabled
                    ? "bg-violet-500"
                    : "bg-white/15"
                }`}
              >
                <div
                  className={`mt-1 h-3 w-3 rounded-full bg-white transition ${
                    cameraAiEnabled
                      ? "ml-5"
                      : "ml-1"
                  }`}
                />
              </div>
            </div>
          </button>

          {cameraAiEnabled && (
            <div className="mt-4">
              <AIFilters
                value={
                  cameraAiEffect
                }
                onChange={
                  setCameraAiEffect
                }
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {renderToggle(
            false,
            () => {
              setNotice(
                "Skin smoothing is prepared as an AI processing option."
              );
            },
            "Skin smoothing",
            "Natural portrait enhancement."
          )}

          {renderToggle(
            false,
            () => {
              setNotice(
                "Background blur is prepared as an AI processing option."
              );
            },
            "Background blur",
            "Separate subject from background."
          )}

          {renderToggle(
            false,
            () => {
              setNotice(
                "Background replacement requires AI segmentation."
              );
            },
            "Background replacement",
            "Replace the scene behind the subject."
          )}

          {renderToggle(
            false,
            () => {
              setNotice(
                "Object tracking requires a vision processing service."
              );
            },
            "Object tracking",
            "Track an object through the video."
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            AI analysis
          </div>

          <div className="space-y-2">
            {[
              [
                "Smart thumbnail",
                "Select a strong cover frame."
              ],
              [
                "Scene detection",
                "Detect visual scene changes."
              ],
              [
                "Sensitive-content analysis",
                "Flag content requiring review."
              ],
              [
                "Spam analysis",
                "Check repetitive or abusive content."
              ],
              [
                "Copyright risk",
                "Check music/video rights metadata."
              ]
            ].map(
              ([title, description]) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 p-3"
                >
                  <div>
                    <div className="text-xs font-medium text-white">
                      {title}
                    </div>

                    <div className="mt-1 text-[10px] text-white/35">
                      {description}
                    </div>
                  </div>

                  <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[9px] text-amber-200">
                    Backend
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );

  /* ==========================================================
     CAPTIONS PANEL
     ========================================================== */

  const renderCaptionsPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Captions,
          "Captions & subtitles",
          "Create timed subtitles, import subtitle data, and prepare multilingual caption metadata."
        )}

        {renderToggle(
          subtitlesEnabled,
          setSubtitlesEnabled,
          "Enable subtitles",
          "Include subtitle metadata with this video."
        )}

        {subtitlesEnabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/50">
                Language
                <select
                  value={
                    subtitleLanguage
                  }
                  onChange={(
                    event
                  ) =>
                    setSubtitleLanguage(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                >
                  {[
                    "English",
                    "Chichewa",
                    "Tumbuka",
                    "Yao",
                    "French",
                    "Portuguese",
                    "Swahili"
                  ].map(
                    (language) => (
                      <option
                        key={
                          language
                        }
                        value={
                          language
                        }
                        className="bg-black"
                      >
                        {language}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="text-xs text-white/50">
                Style
                <select
                  value={
                    subtitleStyle
                  }
                  onChange={(
                    event
                  ) =>
                    setSubtitleStyle(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                >
                  {[
                    "classic",
                    "bold",
                    "minimal",
                    "karaoke"
                  ].map(
                    (style) => (
                      <option
                        key={style}
                        value={style}
                        className="bg-black"
                      >
                        {style}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            {renderSlider(
              "Text size",
              subtitleSize,
              16,
              72,
              1,
              setSubtitleSize,
              "px"
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-white/50">
                Text color
                <input
                  type="color"
                  value={
                    subtitleColor
                  }
                  onChange={(
                    event
                  ) =>
                    setSubtitleColor(
                      event.target.value
                    )
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/20"
                />
              </label>

              <label className="text-xs text-white/50">
                Background
                <select
                  value={
                    subtitleBackground
                  }
                  onChange={(
                    event
                  ) =>
                    setSubtitleBackground(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                >
                  <option
                    value="black"
                    className="bg-black"
                  >
                    Black
                  </option>
                  <option
                    value="transparent"
                    className="bg-black"
                  >
                    Transparent
                  </option>
                  <option
                    value="white"
                    className="bg-black"
                  >
                    White
                  </option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={
                generateSubtitles
              }
              disabled={
                subtitleGenerating
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 disabled:opacity-50"
            >
              {subtitleGenerating ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Wand2
                  size={16}
                />
              )}

              Generate automatic subtitles
            </button>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/60">
              Full-video speech-to-text, subtitle timing, translation and burn-in should be performed by a backend processing service for production reliability.
            </div>
          </>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                Chapters
              </div>

              <div className="text-xs text-white/40">
                Add clickable sections to long videos.
              </div>
            </div>

            <ListVideo
              size={18}
              className="text-violet-300"
            />
          </div>

          <div className="grid grid-cols-[1fr_100px_auto] gap-2">
            <input
              value={
                chapterTitle
              }
              onChange={(
                event
              ) =>
                setChapterTitle(
                  event.target.value
                )
              }
              placeholder="Chapter title"
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25"
            />

            <input
              type="number"
              min="0"
              max={totalDuration}
              step="0.1"
              value={
                chapterTime
              }
              onChange={(
                event
              ) =>
                setChapterTime(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none"
            />

            <button
              type="button"
              onClick={
                addChapter
              }
              className="rounded-lg bg-violet-500 px-3 text-xs font-semibold text-white"
            >
              Add
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {chapters.map(
              (chapter) => (
                <div
                  key={
                    chapter.id
                  }
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                >
                  <Clock3
                    size={14}
                    className="text-violet-300"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white">
                      {
                        chapter.title
                      }
                    </div>

                    <div className="text-[10px] text-white/40">
                      {formatTime(
                        chapter.timestamp
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeChapter(
                        chapter.id
                      )
                    }
                    className="text-white/35 hover:text-red-300"
                  >
                    <X
                      size={14}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );

  /* ==========================================================
     COVER PANEL
     ========================================================== */

  const renderCoverPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          ImageIcon,
          "Cover",
          "Choose a strong frame, upload your own cover, and add cover text."
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              generateCover(
                thumbnailTime
              )
            }
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]"
          >
            <ImageIcon
              size={18}
              className="mb-3 text-violet-300"
            />

            <div className="text-sm font-medium text-white">
              Use video frame
            </div>

            <div className="mt-1 text-xs text-white/40">
              Capture a frame from your video.
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              thumbnailInputRef.current?.click()
            }
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]"
          >
            <UploadIcon
              size={18}
              className="mb-3 text-violet-300"
            />

            <div className="text-sm font-medium text-white">
              Upload cover
            </div>

            <div className="mt-1 text-xs text-white/40">
              Use a custom image.
            </div>
          </button>
        </div>

        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={
            handleThumbnailUpload
          }
        />

        {selectedClip && (
          <>
            {renderSlider(
              "Frame position",
              thumbnailTime,
              0,
              Math.max(
                0.1,
                selectedClip.duration
              ),
              0.1,
              (value) => {
                setThumbnailTime(
                  value
                );
              },
              "s"
            )}

            <button
              type="button"
              onClick={() =>
                generateCover(
                  thumbnailTime
                )
              }
              className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white"
            >
              Generate cover
            </button>
          </>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <label className="block text-xs font-medium text-white/55">
            Cover text
            <input
              value={coverText}
              onChange={(
                event
              ) =>
                setCoverText(
                  event.target.value
                )
              }
              placeholder="Add a title to your cover"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/50"
            />
          </label>

          <div className="mt-3 flex items-center justify-between text-xs text-white/35">
            <span>
              Recommended for a readable cover.
            </span>

            <span>
              {
                coverText.length
              }
              /80
            </span>
          </div>
        </div>

        {thumbnailPreview && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="aspect-[9/16] max-h-[420px]">
              <img
                src={
                  thumbnailPreview
                }
                alt="Video cover preview"
                className="h-full w-full object-cover"
                style={{
                  filter:
                    DEFAULT_FILTERS.find(
                      (filter) =>
                        filter.id ===
                        thumbnailFilter
                    )?.css ||
                    "none"
                }}
              />
            </div>
          </div>
        )}
      </div>
    );

  /* ==========================================================
     PUBLISH PANEL
     ========================================================== */

  const renderPublishPanel =
    () => (
      <div className="space-y-6">
        {renderSectionHeader(
          Send,
          "Publish",
          "Configure your audience, engagement permissions, metadata, scheduling and commercial disclosure."
        )}

        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/55">
            Title
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft(
                  (previous) => ({
                    ...previous,
                    title:
                      event.target
                        .value
                  })
                )
              }
              placeholder="Add a title"
              maxLength={150}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/50"
            />
          </label>

          <label className="block text-xs font-medium text-white/55">
            Caption
            <textarea
              value={draft.caption}
              onChange={(event) =>
                setDraft(
                  (previous) => ({
                    ...previous,
                    caption:
                      event.target
                        .value
                  })
                )
              }
              rows={5}
              maxLength={4000}
              placeholder="Write a caption, add hashtags or mention people..."
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-violet-400/50"
            />

            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-white/30">
                {draft.tags.length} hashtags
                {" · "}
                {draft.mentions.length} mentions
              </span>

              <span
                className={`text-[10px] ${
                  captionCharacterCount >
                  3800
                    ? "text-amber-300"
                    : "text-white/30"
                }`}
              >
                {
                  captionCharacterCount
                }
                /4000
              </span>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              size={16}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              AI hooks
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {AI_HOOKS.map(
              (hook) => (
                <button
                  key={hook}
                  type="button"
                  onClick={() =>
                    applyAIHook(
                      hook
                    )
                  }
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                >
                  {hook}
                </button>
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Hash
              size={16}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              Hashtags
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TRENDING_HASHTAGS.map(
              (tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    addHashtag(
                      tag
                    )
                  }
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 hover:bg-violet-500/10 hover:text-violet-200"
                >
                  #{tag}
                </button>
              )
            )}
          </div>
        </div>

        <label className="block text-xs font-medium text-white/55">
          Category
          <select
            value={
              draft.category
            }
            onChange={(
              event
            ) =>
              setDraft(
                (previous) => ({
                  ...previous,
                  category:
                    event.target
                      .value
                })
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
          >
            {CATEGORIES.map(
              (category) => (
                <option
                  key={
                    category
                  }
                  value={
                    category
                  }
                  className="bg-black"
                >
                  {category}
                </option>
              )
            )}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-white/55">
            Language
            <select
              value={
                draft.language
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (previous) => ({
                    ...previous,
                    language:
                      event.target
                        .value
                  })
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
            >
              {[
                "English",
                "Chichewa",
                "Tumbuka",
                "Yao",
                "French",
                "Portuguese",
                "Swahili"
              ].map(
                (language) => (
                  <option
                    key={
                      language
                    }
                    value={
                      language
                    }
                    className="bg-black"
                  >
                    {language}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="text-xs font-medium text-white/55">
            Location
            <div className="relative mt-2">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                value={
                  draft.location
                }
                onChange={(
                  event
                ) =>
                  setDraft(
                    (previous) => ({
                      ...previous,
                      location:
                        event
                          .target
                          .value
                    })
                  )
                }
                placeholder="City or place"
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Audience
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRIVACY_OPTIONS.map(
              (option) => {
                const Icon =
                  option.icon;

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      setDraft(
                        (
                          previous
                        ) => ({
                          ...previous,
                          privacy:
                            option.value,
                          isPrivate:
                            option.value ===
                            "private"
                        })
                      )
                    }
                    className={`rounded-xl border p-3 text-left ${
                      draft.privacy ===
                      option.value
                        ? "border-violet-400/50 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <Icon
                      size={16}
                      className="mb-2 text-violet-300"
                    />

                    <div className="text-xs font-medium text-white">
                      {
                        option.label
                      }
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-3 space-y-2">
            {renderToggle(
              draft.allowComments,
              (value) =>
                setDraft(
                  (
                    previous
                  ) => ({
                    ...previous,
                    allowComments:
                      value
                  })
                ),
              "Comments",
              "Allow people to comment."
            )}

            {renderToggle(
              draft.allowDuet,
              (value) =>
                setDraft(
                  (
                    previous
                  ) => ({
                    ...previous,
                    allowDuet:
                      value
                  })
                ),
              "Duet",
              "Allow remix-style duets."
            )}

            {renderToggle(
              draft.allowStitch,
              (value) =>
                setDraft(
                  (
                    previous
                  ) => ({
                    ...previous,
                    allowStitch:
                      value
                  })
                ),
              "Stitch",
              "Allow clips to be reused."
            )}

            {renderToggle(
              draft.allowDownload,
              (value) =>
                setDraft(
                  (
                    previous
                  ) => ({
                    ...previous,
                    allowDownload:
                      value
                  })
                ),
              "Downloads",
              "Allow viewers to download the video."
            )}

            {renderToggle(
              draft.ageRestricted,
              (value) =>
                setDraft(
                  (
                    previous
                  ) => ({
                    ...previous,
                    ageRestricted:
                      value
                  })
                ),
              "Age restricted",
              "Restrict this video to appropriate audiences."
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays
              size={17}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              Schedule
            </span>
          </div>

          <input
            type="datetime-local"
            value={
              draft.scheduledAt
            }
            onChange={(
              event
            ) =>
              setDraft(
                (previous) => ({
                  ...previous,
                  scheduledAt:
                    event.target
                      .value
                })
              )
            }
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
          />

          {draft.scheduledAt && (
            <button
              type="button"
              onClick={() =>
                setDraft(
                  (previous) => ({
                    ...previous,
                    scheduledAt:
                      ""
                  })
              }
              className="mt-2 text-xs text-white/40 hover:text-white"
            >
              Clear schedule
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone
              size={17}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              Commercial content
            </span>
          </div>

          {renderToggle(
            draft.isCommercial,
            (value) =>
              setDraft(
                (previous) => ({
                  ...previous,
                  isCommercial:
                    value
                })
              ),
            "Branded content",
            "Disclose paid or sponsored content."
          )}

          {draft.isCommercial && (
            <input
              value={
                draft.sponsorTag
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (previous) => ({
                    ...previous,
                    sponsorTag:
                      event.target
                        .value
                  })
                )
              }
              placeholder="Sponsor / brand name"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle
              size={17}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              Poll
            </span>
          </div>

          {renderToggle(
            pollEnabled,
            setPollEnabled,
            "Add poll",
            "Let viewers vote."
          )}

          {pollEnabled && (
            <div className="mt-3 space-y-2">
              <input
                value={
                  pollQuestion
                }
                onChange={(
                  event
                ) =>
                  setPollQuestion(
                    event.target
                      .value
                  )
                }
                placeholder="Ask a question"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />

              {pollOptions.map(
                (
                  option,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className="flex gap-2"
                  >
                    <input
                      value={
                        option
                      }
                      onChange={(
                        event
                      ) =>
                        updatePollOption(
                          index,
                          event.target
                            .value
                        )
                      }
                      placeholder={`Option ${
                        index +
                        1
                      }`}
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/25"
                    />

                    {pollOptions.length >
                      2 && (
                      <button
                        type="button"
                        onClick={() =>
                          removePollOption(
                            index
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 text-white/40 hover:text-red-300"
                      >
                        <X
                          size={14}
                        />
                      </button>
                    )}
                  </div>
                )
              )}

              {pollOptions.length <
                6 && (
                <button
                  type="button"
                  onClick={
                    addPollOption
                  }
                  className="text-xs font-medium text-violet-300"
                >
                  + Add option
                </button>
              )}

              {renderToggle(
                pollAnonymous,
                setPollAnonymous,
                "Anonymous voting",
                "Do not show individual votes."
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag
              size={17}
              className="text-violet-300"
            />

            <span className="text-sm font-semibold text-white">
              Product
            </span>
          </div>

          {renderToggle(
            productEnabled,
            setProductEnabled,
            "Add product",
            "Attach a product or external shop link."
          )}

          {productEnabled && (
            <div className="mt-3 space-y-2">
              <input
                value={
                  productTitle
                }
                onChange={(
                  event
                ) =>
                  setProductTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Product title"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={
                    productPrice
                  }
                  onChange={(
                    event
                  ) =>
                    setProductPrice(
                      event.target
                        .value
                    )
                  }
                  placeholder="Price"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none"
                />

                <select
                  value={
                    productCurrency
                  }
                  onChange={(
                    event
                  ) =>
                    setProductCurrency(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none"
                >
                  {[
                    "MWK",
                    "USD",
                    "ZAR",
                    "GBP",
                    "EUR"
                  ].map(
                    (currency) => (
                      <option
                        key={
                          currency
                        }
                        value={
                          currency
                        }
                        className="bg-black"
                      >
                        {
                          currency
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="relative">
                <Link
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />

                <input
                  value={
                    productUrl
                  }
                  onChange={(
                    event
                  ) =>
                    setProductUrl(
                      event.target
                        .value
                    )
                  }
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>
          )}
        </div>

        <label className="block text-xs font-medium text-white/55">
          Content warning
          <input
            value={
              draft.contentWarning
            }
            onChange={(
              event
            ) =>
              setDraft(
                (previous) => ({
                  ...previous,
                  contentWarning:
                    event.target
                      .value
                })
              )
            }
            placeholder="Optional warning"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
          />
        </label>

        <label className="block text-xs font-medium text-white/55">
          Creator notes
          <textarea
            value={
              draft.creatorNotes
            }
            onChange={(
              event
            ) =>
              setDraft(
                (previous) => ({
                  ...previous,
                  creatorNotes:
                    event.target
                      .value
                })
              )
            }
            rows={3}
            placeholder="Private notes for your workflow"
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
          />
        </label>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <div className="flex gap-3">
            <ShieldCheck
              size={18}
              className="mt-0.5 text-amber-300"
            />

            <div>
              <div className="text-sm font-medium text-amber-100">
                Publishing checks
              </div>

              <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-100/55">
                <li>
                  • Video must be processed successfully.
                </li>
                <li>
                  • Music is embedded into the final video when selected.
                </li>
                <li>
                  • Moderation and copyright services can review the published media.
                </li>
                <li>
                  • Scheduled posts require a backend scheduler/cron.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={
            uploadDisabled
          }
          onClick={
            handlePublish
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUploading ||
          isProcessing ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              {uploadStage ||
                processingStage ||
                "Processing..."}
            </>
          ) : draft.scheduledAt ? (
            <>
              <CalendarDays
                size={18}
              />
              Schedule video
            </>
          ) : (
            <>
              <Send size={18} />
              Publish video
            </>
          )}
        </button>
      </div>
    );

  /* ==========================================================
     CAMERA MODAL
     ========================================================== */

  const renderCamera =
    () => {
      if (!cameraOpen) {
        return null;
      }

      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-full max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Camera
                    size={18}
                    className="text-violet-300"
                  />

                  <h2 className="text-sm font-semibold text-white">
                    Camera studio
                  </h2>
                </div>

                <p className="mt-1 text-xs text-white/40">
                  Record directly into your video timeline.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  stopCamera
                }
                className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close camera"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_320px]">
              <div className="relative flex min-h-0 items-center justify-center bg-black p-4">
                <div className="relative h-full max-h-[760px] aspect-[9/16] overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl">
                  <video
                    ref={
                      cameraVideoRef
                    }
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${
                      cameraFacing ===
                      "user"
                        ? "scale-x-[-1]"
                        : ""
                    }`}
                    style={{
                      filter: `brightness(${cameraBrightness}) saturate(${
                        1 +
                        cameraBeauty /
                          200
                      })`,
                      transform: `scale(${
                        cameraZoom
                      })`
                    }}
                  />

                  {cameraGrid && (
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute left-1/3 top-0 h-full w-px bg-white/20" />
                      <div className="absolute left-2/3 top-0 h-full w-px bg-white/20" />
                      <div className="absolute left-0 top-1/3 h-px w-full bg-white/20" />
                      <div className="absolute left-0 top-2/3 h-px w-full bg-white/20" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur">
                      {recording
                        ? formatTime(
                            recordingTime
                          )
                        : "Ready"}
                    </div>

                    {recording && (
                      <div className="flex items-center gap-2 rounded-full bg-red-500/80 px-3 py-1.5 text-xs font-medium text-white">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        Recording
                      </div>
                    )}
                  </div>

                  {recordingCountdown !==
                    null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="text-8xl font-black text-white drop-shadow-2xl">
                        {
                          recordingCountdown
                        }
                      </div>
                    </div>
                  )}

                  {!cameraStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-8 text-center">
                      <Camera
                        size={36}
                        className="mb-4 text-white/20"
                      />

                      <div className="text-sm font-medium text-white">
                        Camera is not active
                      </div>

                      <div className="mt-2 text-xs leading-5 text-white/40">
                        Allow camera and microphone access to start recording.
                      </div>

                      <button
                        type="button"
                        onClick={
                          startCamera
                        }
                        className="mt-5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        Enable camera
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-x-4 bottom-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 backdrop-blur">
                      <div className="flex gap-2">
                        <CircleAlert
                          size={16}
                          className="mt-0.5 shrink-0 text-red-300"
                        />

                        <div className="text-xs leading-5 text-red-100/80">
                          {
                            cameraError
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {cameraStream && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12">
                      <button
                        type="button"
                        onClick={
                          switchCamera
                        }
                        disabled={
                          recording
                        }
                        className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 disabled:opacity-40"
                        aria-label="Switch camera"
                      >
                        <RotateCcw
                          size={19}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={
                          recording
                            ? stopRecording
                            : startRecording
                        }
                        className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 ${
                          recording
                            ? "bg-red-500"
                            : "bg-white/10"
                        }`}
                        aria-label={
                          recording
                            ? "Stop recording"
                            : "Start recording"
                        }
                      >
                        {recording ? (
                          <Square
                            size={26}
                            fill="currentColor"
                          />
                        ) : (
                          <Circle
                            size={48}
                            className="text-red-400"
                            fill="currentColor"
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={
                          stopCamera
                        }
                        className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
                        aria-label="Close camera"
                      >
                        <Check
                          size={19}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto border-t border-white/10 p-4 lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                      Camera
                    </div>

                    <select
                      value={
                        selectedCameraId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedCameraId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white outline-none"
                    >
                      {cameras.map(
                        (
                          camera,
                          index
                        ) => (
                          <option
                            key={
                              camera.deviceId
                            }
                            value={
                              camera.deviceId
                            }
                            className="bg-black"
                          >
                            {camera.label ||
                              `Camera ${
                                index +
                                1
                              }`}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                      Microphone
                    </div>

                    <select
                      value={
                        selectedMicId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedMicId(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white outline-none"
                    >
                      {microphones.map(
                        (
                          microphone,
                          index
                        ) => (
                          <option
                            key={
                              microphone.deviceId
                            }
                            value={
                              microphone.deviceId
                            }
                            className="bg-black"
                          >
                            {microphone.label ||
                              `Microphone ${
                                index +
                                1
                              }`}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-white/45">
                      Resolution
                      <select
                        value={
                          cameraResolution
                        }
                        onChange={(
                          event
                        ) =>
                          setCameraResolution(
                            event.target
                              .value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none"
                      >
                        <option
                          value="720"
                          className="bg-black"
                        >
                          720p
                        </option>
                        <option
                          value="1080"
                          className="bg-black"
                        >
                          1080p
                        </option>
                      </select>
                    </label>

                    <label className="text-xs text-white/45">
                      FPS
                      <select
                        value={
                          cameraFps
                        }
                        onChange={(
                          event
                        ) =>
                          setCameraFps(
                            event.target
                              .value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none"
                      >
                        {[
                          "24",
                          "30",
                          "60"
                        ].map(
                          (fps) => (
                            <option
                              key={
                                fps
                              }
                              value={
                                fps
                              }
                              className="bg-black"
                            >
                              {fps}
                              fps
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                      Recording speed
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {RECORDING_SPEEDS.map(
                        (speed) => (
                          <button
                            key={
                              speed
                            }
                            type="button"
                            onClick={() =>
                              setCameraSpeed(
                                speed
                              )
                            }
                            className={`rounded-lg border px-2 py-2 text-xs ${
                              cameraSpeed ===
                              speed
                                ? "border-violet-400 bg-violet-500/10 text-violet-200"
                                : "border-white/10 text-white/50"
                            }`}
                          >
                            {speed}×
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {renderSlider(
                    "Zoom",
                    cameraZoom,
                    1,
                    4,
                    0.1,
                    setCameraZoom,
                    "×"
                  )}

                  {renderSlider(
                    "Exposure",
                    cameraBrightness,
                    0.6,
                    1.4,
                    0.01,
                    setCameraBrightness
                  )}

                  {renderSlider(
                    "Beauty",
                    cameraBeauty,
                    0,
                    100,
                    1,
                    setCameraBeauty,
                    "%"
                  )}

                  {renderToggle(
                    cameraMicEnabled,
                    setCameraMicEnabled,
                    "Microphone",
                    "Record camera audio."
                  )}

                  {renderToggle(
                    cameraGrid,
                    setCameraGrid,
                    "Grid",
                    "Show composition guides."
                  )}

                  {renderToggle(
                    handsFree,
                    setHandsFree,
                    "Hands-free",
                    "Prepare hands-free recording workflow."
                  )}

                  {renderToggle(
                    torchEnabled,
                    setTorchEnabled,
                    "Torch",
                    "Use the device torch when supported."
                  )}

                  <label className="block text-xs text-white/45">
                    Countdown
                    <select
                      value={
                        cameraCountdown
                      }
                      onChange={(
                        event
                      ) =>
                        setCameraCountdown(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none"
                    >
                      <option
                        value="0"
                        className="bg-black"
                      >
                        Off
                      </option>
                      <option
                        value="3"
                        className="bg-black"
                      >
                        3 seconds
                      </option>
                      <option
                        value="5"
                        className="bg-black"
                      >
                        5 seconds
                      </option>
                      <option
                        value="10"
                        className="bg-black"
                      >
                        10 seconds
                      </option>
                    </select>
                  </label>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-2">
                      <Info
                        size={15}
                        className="mt-0.5 text-violet-300"
                      />

                      <div className="text-[11px] leading-5 text-white/45">
                        Tap-to-focus, exposure and optical zoom depend on browser/device camera capabilities. Unsupported controls are safely ignored.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

  /* ==========================================================
     PREVIEW
     ========================================================== */

  const renderPreview =
    () => (
      <div className="flex min-h-[500px] flex-1 flex-col items-center justify-center bg-[#050506] p-4 lg:p-6">
        {!selectedClip ? (
          <div className="flex aspect-[9/16] w-full max-w-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10">
              <Video
                size={28}
                className="text-violet-300"
              />
            </div>

            <h2 className="text-lg font-semibold text-white">
              Your video preview
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Upload a video or record from your camera to start creating.
            </p>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="mt-5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add video
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex w-full max-w-[420px] items-center justify-center">
              <div
                className="relative aspect-[9/16] w-full max-h-[72vh] overflow-hidden rounded-[28px] bg-black shadow-2xl ring-1 ring-white/10"
                ref={
                  containerRef
                }
              >
                <video
                  ref={
                    previewVideoRef
                  }
                  key={
                    selectedClip.id
                  }
                  src={
                    selectedClip.previewUrl
                  }
                  playsInline
                  muted
                  className="h-full w-full object-contain"
                  style={
                    previewStyle
                  }
                  onLoadedMetadata={(
                    event
                  ) => {
                    const video =
                      event.currentTarget;

                    if (
                      trimEnd > 0 &&
                      trimEnd <
                        video.duration
                    ) {
                      video.currentTime =
                        trimStart;
                    }
                  }}
                  onTimeUpdate={(
                    event
                  ) => {
                    const value =
                      event.currentTarget
                        .currentTime;

                    setCurrentTime(
                      value
                    );

                    if (
                      trimEnd > 0 &&
                      value >=
                        trimEnd
                    ) {
                      event.currentTarget.pause();
                      event.currentTarget.currentTime =
                        trimStart;
                    }
                  }}
                />

                <div className="pointer-events-none absolute inset-0">
                  {textLayers.map(
                    (layer) => {
                      if (
                        currentTime <
                          layer.start ||
                        currentTime >
                          layer.end
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={
                            layer.id
                          }
                          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap text-center"
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            width: `${layer.width}%`,
                            fontFamily:
                              layer.font,
                            fontSize:
                              `${Math.max(
                                12,
                                layer.size *
                                  0.5
                              )}px`,
                            color:
                              layer.color,
                            background:
                              layer.background ===
                              "transparent"
                                ? "transparent"
                                : layer.background,
                            padding:
                              layer.background ===
                              "transparent"
                                ? 0
                                : "6px 10px",
                            borderRadius:
                              8,
                            WebkitTextStroke:
                              layer.outline
                                ? "1px rgba(0,0,0,.65)"
                                : "0",
                            textShadow:
                              layer.shadow
                                ? "0 2px 8px rgba(0,0,0,.75)"
                                : "none",
                            transform:
                              `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`
                          }}
                        >
                          {
                            layer.text
                          }
                        </div>
                      );
                    }
                  )}

                  {stickers.map(
                    (sticker) => (
                      <div
                        key={
                          sticker.id
                        }
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${sticker.x}%`,
                          top: `${sticker.y}%`,
                          fontSize: `${Math.max(
                            20,
                            sticker.size *
                              0.5
                          )}px`,
                          transform:
                            `translate(-50%, -50%) rotate(${sticker.rotation}deg)`
                        }}
                      >
                        {
                          sticker.value
                        }
                      </div>
                    )
                  )}

                  {coverText && (
                    <div className="absolute bottom-5 left-1/2 max-w-[80%] -translate-x-1/2 rounded-lg bg-black/55 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur">
                      {
                        coverText
                      }
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
                  <div className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] text-white backdrop-blur">
                    {draft.title ||
                      "Preview"}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsFullscreen(
                        (previous) =>
                          !previous
                      )
                    }
                    className="pointer-events-auto rounded-full bg-black/40 p-2 text-white/80 backdrop-blur hover:bg-black/60 hover:text-white"
                    aria-label="Toggle fullscreen preview"
                  >
                    <Maximize2
                      size={15}
                    />
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-16">
                  <div className="mb-3 flex items-center justify-between text-[10px] text-white/65">
                    <span>
                      {formatTime(
                        currentTime
                      )}
                    </span>

                    <span>
                      {formatTime(
                        selectedClip.duration
                      )}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={
                      selectedClip.duration ||
                      0
                    }
                    step="0.01"
                    value={clamp(
                      currentTime,
                      0,
                      selectedClip.duration ||
                        0
                    )}
                    onChange={
                      seekPreview
                    }
                    className="pointer-events-auto w-full accent-violet-500"
                    aria-label="Video progress"
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={
                        togglePlayback
                      }
                      className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20"
                      aria-label={
                        isPlaying
                          ? "Pause"
                          : "Play"
                      }
                    >
                      {isPlaying ? (
                        <Pause
                          size={17}
                        />
                      ) : (
                        <Play
                          size={17}
                        />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTool(
                            "audio"
                          )
                        }
                        className="rounded-full bg-white/10 p-2.5 text-white/80 backdrop-blur hover:bg-white/20"
                        aria-label="Audio"
                      >
                        {originalAudioEnabled ? (
                          <Volume2
                            size={16}
                          />
                        ) : (
                          <VolumeX
                            size={16}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveTool(
                            "effects"
                          )
                        }
                        className="rounded-full bg-white/10 p-2.5 text-white/80 backdrop-blur hover:bg-white/20"
                        aria-label="Effects"
                      >
                        <Sparkles
                          size={16}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 w-full max-w-[520px]">
              <div className="mb-2 flex items-center justify-between text-[10px] text-white/35">
                <span>
                  {clips.length} clip
                  {clips.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <span>
                  {formatTime(
                    totalDuration
                  )}
                </span>
              </div>

              <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
                {clips.map(
                  (
                    clip,
                    index
                  ) => (
                    <button
                      key={
                        clip.id
                      }
                      type="button"
                      onClick={() =>
                        selectClip(
                          clip.id
                        )
                      }
                      className={`relative h-14 w-10 shrink-0 overflow-hidden rounded-lg ${
                        selectedClipId ===
                        clip.id
                          ? "ring-2 ring-violet-400"
                          : "opacity-70"
                      }`}
                    >
                      {clip.thumbnail && (
                        <img
                          src={URL.createObjectURL(
                            clip.thumbnail
                          )}
                          alt=""
                          className="h-full w-full object-cover"
                          onLoad={(
                            event
                          ) =>
                            revokeObjectUrl(
                              event
                                .currentTarget
                                .src
                            )
                          }
                        />
                      )}

                      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[8px] text-white">
                        {index +
                          1}
                      </span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 text-white/30 hover:bg-white/5 hover:text-white"
                >
                  <Plus
                    size={15}
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );

  /* ==========================================================
     STATUS BAR
     ========================================================== */

  const renderStatus =
    () => {
      if (
        !error &&
        !notice &&
        !isProcessing &&
        !isUploading
      ) {
        return null;
      }

      return (
        <div className="border-b border-white/10 bg-[#0b0b0e] px-4 py-2">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3">
            {error ? (
              <>
                <CircleAlert
                  size={16}
                  className="shrink-0 text-red-300"
                />

                <span className="flex-1 text-xs text-red-100/75">
                  {error}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <X
                    size={14}
                  />
                </button>
              </>
            ) : isProcessing ||
              isUploading ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin text-violet-300"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white">
                    {processingStage ||
                      uploadStage ||
                      "Working..."}
                  </div>

                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{
                        width: `${Math.max(
                          processingProgress,
                          uploadProgress
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <span className="text-xs text-white/45">
                  {Math.max(
                    processingProgress,
                    uploadProgress
                  )}
                  %
                </span>
              </>
            ) : (
              <>
                <CheckCircle2
                  size={16}
                  className="text-emerald-300"
                />

                <span className="text-xs text-emerald-100/75">
                  {notice}
                </span>
              </>
            )}
          </div>
        </div>
      );
    };

  /* ==========================================================
     MAIN
     ========================================================== */

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#050506] text-white ${
        isFullscreen
          ? "p-0"
          : ""
      }`}
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b]/95 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (
                isUploading ||
                isProcessing
              ) {
                return;
              }

              onClose?.();
            }}
            className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close upload studio"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Sparkles
                size={16}
                className="text-violet-300"
              />

              <h1 className="text-sm font-bold tracking-tight">
                Create
              </h1>
            </div>

            <div className="hidden text-[10px] text-white/35 sm:block">
              Made Universe Studio
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 lg:flex">
          {tools.map(
            (tool) => {
              const Icon =
                tool.icon;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() =>
                    setActiveTool(
                      tool.id
                    )
                  }
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    activeTool ===
                    tool.id
                      ? "bg-violet-500 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    size={14}
                  />

                  {tool.label}
                </button>
              );
            }
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-[10px] text-white/35 md:flex">
            {networkOnline ? (
              <Wifi
                size={14}
                className="text-emerald-300"
              />
            ) : (
              <WifiOff
                size={14}
                className="text-red-300"
              />
            )}

            {lastSavedAt
              ? `Saved ${lastSavedAt.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                )}`
              : "Autosave on"}
          </div>

          <button
            type="button"
            onClick={() =>
              saveDraft(false)
            }
            disabled={
              isSavingDraft ||
              !clips.length
            }
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40 sm:flex"
          >
            {isSavingDraft ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Save
                size={14}
              />
            )}
            Save draft
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTool(
                "publish"
              )
            }
            disabled={
              !clips.length
            }
            className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
          >
            <Send
              size={14}
            />
            Publish
          </button>
        </div>
      </header>

      {renderStatus()}

      <div className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          <aside className="hidden w-[230px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#09090b] p-3 lg:block">
            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Studio
            </div>

            <div className="space-y-1">
              {tools.map(
                (tool) => {
                  const Icon =
                    tool.icon;

                  return (
                    <button
                      key={
                        tool.id
                      }
                      type="button"
                      onClick={() =>
                        setActiveTool(
                          tool.id
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                        activeTool ===
                        tool.id
                          ? "bg-violet-500/10 text-violet-200"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={17}
                      />

                      <span className="flex-1">
                        {
                          tool.label
                        }
                      </span>

                      {activeTool ===
                        tool.id && (
                        <ChevronRight
                          size={14}
                          className="text-violet-300"
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div className="my-5 border-t border-white/10" />

            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setShowSettings(
                    (previous) =>
                      !previous
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/50 hover:bg-white/5 hover:text-white"
              >
                <Settings2
                  size={17}
                />

                <span className="flex-1">
                  Studio settings
                </span>

                {showSettings ? (
                  <ChevronUp
                    size={14}
                  />
                ) : (
                  <ChevronDown
                    size={14}
                  />
                )}
              </button>

              {showSettings && (
                <div className="space-y-2 px-2">
                  {renderToggle(
                    lowDataMode,
                    setLowDataMode,
                    "Low-data",
                    "Reduce media workload."
                  )}
                </div>
              )}
            </div>
          </aside>

          <main className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col xl:flex-row">
                <section className="flex min-h-0 flex-1 overflow-y-auto border-b border-white/10 xl:border-b-0">
                  {renderPreview()}
                </section>

                <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#09090b] xl:block">
                  <div className="p-5">
                    {activeTool ===
                      "media" &&
                      renderMediaPanel()}

                    {activeTool ===
                      "edit" &&
                      renderEditPanel()}

                    {activeTool ===
                      "audio" &&
                      renderAudioPanel()}

                    {activeTool ===
                      "text" &&
                      renderTextPanel()}

                    {activeTool ===
                      "effects" &&
                      renderEffectsPanel()}

                    {activeTool ===
                      "captions" &&
                      renderCaptionsPanel()}

                    {activeTool ===
                      "cover" &&
                      renderCoverPanel()}

                    {activeTool ===
                      "publish" &&
                      renderPublishPanel()}
                  </div>
                </aside>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#09090b] p-2 xl:hidden">
              <div className="flex gap-1 overflow-x-auto">
                {tools.map(
                  (tool) => {
                    const Icon =
                      tool.icon;

                    return (
                      <button
                        key={
                          tool.id
                        }
                        type="button"
                        onClick={() =>
                          setActiveTool(
                            tool.id
                          )
                        }
                        className={`flex min-w-[68px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] ${
                          activeTool ===
                          tool.id
                            ? "bg-violet-500/15 text-violet-200"
                            : "text-white/40"
                        }`}
                      >
                        <Icon
                          size={16}
                        />

                        {
                          tool.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="max-h-[48vh] overflow-y-auto border-t border-white/10 bg-[#09090b] xl:hidden">
              <div className="p-4">
                {activeTool ===
                  "media" &&
                  renderMediaPanel()}

                {activeTool ===
                  "edit" &&
                  renderEditPanel()}

                {activeTool ===
                  "audio" &&
                  renderAudioPanel()}

                {activeTool ===
                  "text" &&
                  renderTextPanel()}

                {activeTool ===
                  "effects" &&
                  renderEffectsPanel()}

                {activeTool ===
                  "captions" &&
                  renderCaptionsPanel()}

                {activeTool ===
                  "cover" &&
                  renderCoverPanel()}

                {activeTool ===
                  "publish" &&
                  renderPublishPanel()}
              </div>
            </div>
          </main>
        </div>
      </div>

      {renderCamera()}

      {isFullscreen &&
        selectedClip && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black p-4">
            <div className="relative h-full max-h-[95vh] aspect-[9/16] overflow-hidden rounded-3xl bg-black">
              <video
                src={
                  selectedClip.previewUrl
                }
                autoPlay
                loop
                playsInline
                muted
                className="h-full w-full object-contain"
                style={
                  previewStyle
                }
              />

              <button
                type="button"
                onClick={() =>
                  setIsFullscreen(
                    false
                  )
                }
                className="absolute right-4 top-4 rounded-full bg-black/50 p-3 text-white backdrop-blur"
              >
                <X
                  size={18}
                />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  icon: Icon,
  title,
  description
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
        <Icon
          size={22}
          className="text-white/30"
        />
      </div>

      <div className="text-sm font-semibold text-white">
        {title}
      </div>

      <div className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/40">
        {description}
      </div>
    </div>
  );
}

export default Upload;
