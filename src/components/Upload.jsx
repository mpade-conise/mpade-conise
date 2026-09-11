import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient';
import {
X, Music, Film, Camera, Wand2, Volume2, Loader2, Play, Pause, Hash, Globe,
Lock, Users, MapPin, Sparkles, Sliders, Shield, CheckCircle2, Zap, Grid,
Clock, RefreshCw, Gauge, Tag, SlidersHorizontal, Layers, Check, Search,
ChevronLeft, ChevronRight, BarChart2, HelpCircle, ShoppingBag, FileText,
Plus, ArrowRight, Upload as UploadIcon, Smartphone, Award, Send
} from 'lucide-react';

const MAX_SOURCE_SIZE = 500 * 1024 * 1024;
const TARGET_WIDTH = 720;
const TARGET_HEIGHT = 1280;
const TARGET_FPS = 30;
const TARGET_VIDEO_BITRATE = 2_500_000;
const TARGET_AUDIO_BITRATE = 128_000;

const Upload = ({ onComplete }) => {
const [activeStep, setActiveStep] = useState('media');
const [ingestMode, setIngestMode] = useState('dropzone');
const [showMobilePreview, setShowMobilePreview] = useState(false);

const [preview, setPreview] = useState(null);
const [videoFile, setVideoFile] = useState(null);
const [videoMetadata, setVideoMetadata] = useState({
duration: 0, size: 0, resolution: '720p optimized', name: '', bitrate: '30 FPS'
});
const [thumbnailBlob, setThumbnailBlob] = useState(null);
const [thumbnailPreview, setThumbnailPreview] = useState(null);
const [thumbScrubTime, setThumbScrubTime] = useState(0.5);

const [isPlaying, setIsPlaying] = useState(true);
const [currentTime, setCurrentTime] = useState(0);
const [videoDuration, setVideoDuration] = useState(0);

const [chapters, setChapters] = useState([{ time: 0, title: 'Intro Hook' }]);
const [newChapterTime, setNewChapterTime] = useState(0);
const [newChapterTitle, setNewChapterTitle] = useState('');

const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
const [subtitles, setSubtitles] = useState([
{ start: 0, end: 3, text: 'Welcome to Universe Live ✨' }
]);
const [isGeneratingCC, setIsGeneratingCC] = useState(false);

const [coverText, setCoverText] = useState('');
const [coverBadgeStyle, setCoverBadgeStyle] = useState('neon');

const [pollEnabled, setPollEnabled] = useState(false);
const [pollData, setPollData] = useState({
question: 'What do you think of this vibe? 🔥',
option1: 'Obsessed 💯',
option2: 'Needs more bass ⚡',
votes1: 0,
votes2: 0
});

const [productEnabled, setProductEnabled] = useState(false);
const [productLink, setProductLink] = useState({
title: 'Featured Creator Drop',
price: '$29.99',
url: 'https://mpade.universe.live',
ctaText: 'Shop Now'
});

const [isCommercial, setIsCommercial] = useState(false);
const [sponsorTag, setSponsorTag] = useState('');
const [allowDuet, setAllowDuet] = useState(true);
const [allowStitch, setAllowStitch] = useState(true);
const [allowDownload, setAllowDownload] = useState(true);
const [ageRestricted, setAgeRestricted] = useState(false);

const [selectedFilter, setSelectedFilter] = useState(() => {
try {
return localStorage.getItem('mpade_last_selected_filter') || 'original';
} catch {
return 'original';
}
});

const [audioEnhancement, setAudioEnhancement] = useState('studio_master');
const [videoVolume, setVideoVolume] = useState(100);
const [musicVolume, setMusicVolume] = useState(80);

const [isScheduled, setIsScheduled] = useState(false);
const [scheduledAt, setScheduledAt] = useState('');
const [category, setCategory] = useState('Entertainment');

const [caption, setCaption] = useState('');
const [privacy, setPrivacy] = useState('public');
const [location, setLocation] = useState('');
const [tags, setTags] = useState([]);
const [mentions, setMentions] = useState([]);
const [allowComments, setAllowComments] = useState(true);

const [selectedMusic, setSelectedMusic] = useState({
name: 'Original Audio',
artist: 'Original Creator',
url: null,
artwork: null
});
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const [playingTrackUrl, setPlayingTrackUrl] = useState(null);

const [isRecording, setIsRecording] = useState(false);
const [recordingTime, setRecordingTime] = useState(0);
const [recordingLimit, setRecordingLimit] = useState(60);
const [facingMode, setFacingMode] = useState('user');
const [isMuted, setIsMuted] = useState(false);
const [showGrid, setShowGrid] = useState(false);
const [recordingSpeed, setRecordingSpeed] = useState('1x');

const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStage, setUploadStage] = useState('ready');
const [uploadStatusText, setUploadStatusText] = useState('');

const [isDragging, setIsDragging] = useState(false);
const [processingInfo, setProcessingInfo] = useState({
originalSize: 0,
finalSize: 0,
compressionRatio: 0,
duration: 0,
mimeType: ''
});

const videoRef = useRef(null);
const editorVideoRef = useRef(null);
const mobileEditorVideoRef = useRef(null);
const mediaRecorderRef = useRef(null);
const chunksRef = useRef([]);
const recordingTimerRef = useRef(null);
const audioPreviewRef = useRef(null);
const soundLabAudioRef = useRef(null);
const fileInputRef = useRef(null);
const cameraStreamRef = useRef(null);
const objectUrlsRef = useRef([]);
const processingAbortRef = useRef(false);

const filters = [
{ id: 'original', name: 'Original', css: '', color: 'bg-zinc-800' },
{ id: 'neon_cyber', name: 'Neon Cyber', css: 'hue-rotate(90deg) saturate(200%) brightness(1.1) contrast(110%)', color: 'bg-gradient-to-tr from-cyan-500 to-pink-500' },
{ id: 'electric', name: 'Electric Blue', css: 'contrast(140%) saturate(160%) hue-rotate(180deg) brightness(1.15)', color: 'bg-gradient-to-tr from-blue-500 to-purple-600' },
{ id: 'cinema', name: 'B&W Cinema', css: 'grayscale(100%) contrast(150%) brightness(0.95)', color: 'bg-gradient-to-tr from-zinc-900 to-zinc-400' },
{ id: 'golden_hour', name: 'Golden Hour', css: 'sepia(50%) saturate(190%) hue-rotate(-25deg) contrast(110%)', color: 'bg-gradient-to-tr from-amber-500 to-orange-600' },
{ id: 'vintage', name: 'Vintage 90s', css: 'sepia(30%) contrast(90%) brightness(1.1) saturate(85%)', color: 'bg-gradient-to-tr from-emerald-600 to-amber-700' },
{ id: 'midnight', name: 'Midnight Deep', css: 'brightness(0.8) contrast(130%) saturate(130%) hue-rotate(20deg)', color: 'bg-gradient-to-tr from-indigo-900 to-blue-700' },
{ id: 'vibrant_pop', name: 'Vibrant Pop', css: 'saturate(220%) contrast(120%) brightness(1.05)', color: 'bg-gradient-to-tr from-rose-500 to-cyan-400' }
];

const currentFilterObj = filters.find(f => f.id === selectedFilter) || filters[0];

const categories = [
'Entertainment', 'Music & Beats', 'Gaming & Esports', 'AI & Tech',
'Comedy & Humor', 'Fitness & Wellness', 'Fashion & Beauty', 'Education & How-To',
'Crypto & Web3', 'Travel & Adventure', 'Food & Culinary', 'Art & VFX'
];

const trendingHashtags = ['fyp', 'universe', 'viral', 'mpade', 'creator', 'trending', 'dance', 'afrobeats', 'tech', 'vibes'];

const popularLocations = [
'Lilongwe, MW', 'Blantyre, MW', 'London, UK', 'New York, USA',
'Tokyo, Japan', 'Nairobi, Kenya', 'Johannesburg, SA', 'Paris, France'
];

const aiHookPresets = [
{ title: 'Viral Mystery Hook', caption: 'You won’t believe what happened at the 0:15 mark… 👀 Watch till the end! #fyp #viral' },
{ title: 'Community Prompt', caption: 'Rate this vibe from 1 to 10 in the comments below 👇 Drop your honest opinion! #trending' },
{ title: 'Aesthetic Wave', caption: 'High frequency creative energy ✨ Pure cosmic vibration. #vibes #universe' },
{ title: 'Creator Insight', caption: 'Here is the secret nobody tells you about building high engagement… Save this 📌 #creator' }
];

const createObjectUrl = useCallback((blob) => {
const url = URL.createObjectURL(blob);
objectUrlsRef.current.push(url);
return url;
}, []);

const cleanupObjectUrls = useCallback(() => {
objectUrlsRef.current.forEach(url => {
try { URL.revokeObjectURL(url); } catch {}
});
objectUrlsRef.current = [];
}, []);

useEffect(() => {
return () => {
clearInterval(recordingTimerRef.current);
cameraStreamRef.current?.getTracks().forEach(track => track.stop());
cleanupObjectUrls();
};
}, [cleanupObjectUrls]);

useEffect(() => {
if (ingestMode !== 'camera' || preview) {
cameraStreamRef.current?.getTracks().forEach(track => track.stop());
cameraStreamRef.current = null;
return;
}

```
let cancelled = false;

const startCamera = async () => {
  try {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1080 },
        height: { ideal: 1920 }
      },
      audio: !isMuted
    });

    if (cancelled) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    cameraStreamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  } catch (error) {
    console.warn('Camera access:', error);
  }
};

startCamera();

return () => {
  cancelled = true;
  cameraStreamRef.current?.getTracks().forEach(track => track.stop());
  cameraStreamRef.current = null;
};
```

}, [ingestMode, preview, facingMode, isMuted]);

useEffect(() => {
if (!isRecording) {
clearInterval(recordingTimerRef.current);
return;
}

```
recordingTimerRef.current = setInterval(() => {
  setRecordingTime(previous => {
    if (previous >= recordingLimit - 1) {
      stopRecording();
      return recordingLimit;
    }
    return previous + 1;
  });
}, 1000);

return () => clearInterval(recordingTimerRef.current);
```

}, [isRecording, recordingLimit]);

useEffect(() => {
if (audioPreviewRef.current) {
audioPreviewRef.current.volume = musicVolume / 100;
}
}, [musicVolume]);

useEffect(() => {
[editorVideoRef.current, mobileEditorVideoRef.current].forEach(video => {
if (video) video.volume = videoVolume / 100;
});
}, [videoVolume]);

const getSupportedMimeType = () => {
const types = [
'video/webm;codecs=vp9,opus',
'video/webm;codecs=vp8,opus',
'video/webm'
];

```
return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
```

};

const waitForVideoMetadata = (video) => new Promise((resolve, reject) => {
if (video.readyState >= 1 && video.duration) {
resolve();
return;
}

```
const timeout = setTimeout(() => reject(new Error('Video metadata could not be loaded.')), 15000);

video.onloadedmetadata = () => {
  clearTimeout(timeout);
  resolve();
};

video.onerror = () => {
  clearTimeout(timeout);
  reject(new Error('The selected video could not be decoded by this browser.'));
};
```

});

const loadVideoElement = async (source) => {
const video = document.createElement('video');
video.preload = 'auto';
video.playsInline = true;
video.muted = true;

```
if (typeof source === 'string') {
  video.crossOrigin = 'anonymous';
  video.src = source;
} else {
  video.src = createObjectUrl(source);
}

await waitForVideoMetadata(video);
await video.play().catch(() => {});
video.pause();

return video;
```

};

const generateVideoThumbnail = async (sourceUrl, timeOffset = 0.5, overrideFilterId = null) => {
try {
const vid = await loadVideoElement(sourceUrl);
const safeTime = Math.min(Math.max(0, Number(timeOffset) || 0), Math.max(0, vid.duration - 0.05));

```
  await new Promise(resolve => {
    const done = () => {
      vid.removeEventListener('seeked', done);
      resolve();
    };
    vid.addEventListener('seeked', done);
    vid.currentTime = safeTime;
  });

  const canvas = document.createElement('canvas');
  const sourceWidth = vid.videoWidth || TARGET_WIDTH;
  const sourceHeight = vid.videoHeight || TARGET_HEIGHT;
  const scale = Math.min(1, TARGET_WIDTH / sourceWidth, TARGET_HEIGHT / sourceHeight);

  canvas.width = Math.max(320, Math.round(sourceWidth * scale));
  canvas.height = Math.max(320, Math.round(sourceHeight * scale));

  const ctx = canvas.getContext('2d');
  const activeFilter = filters.find(f => f.id === (overrideFilterId || selectedFilter)) || filters[0];

  ctx.filter = activeFilter.css || 'none';
  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  if (coverText.trim()) {
    const fontSize = Math.max(22, Math.round(canvas.width / 18));
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.fillStyle = '#00F3FF';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 12;
    ctx.fillText(coverText.trim(), canvas.width / 2, canvas.height - fontSize * 1.8);
  }

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));

  if (!blob) return null;

  setThumbnailBlob(blob);

  if (thumbnailPreview) {
    try { URL.revokeObjectURL(thumbnailPreview); } catch {}
  }

  const thumbUrl = URL.createObjectURL(blob);
  objectUrlsRef.current.push(thumbUrl);
  setThumbnailPreview(thumbUrl);

  return blob;
} catch (error) {
  console.warn('Thumbnail generation:', error);
  return null;
}
```

};

const handleFilterSelect = async (filterId) => {
setSelectedFilter(filterId);

```
try {
  localStorage.setItem('mpade_last_selected_filter', filterId);
} catch {}

if (preview) {
  await generateVideoThumbnail(preview, thumbScrubTime, filterId);
}
```

};

const startRecording = () => {
const stream = cameraStreamRef.current || videoRef.current?.srcObject;

```
if (!stream || typeof MediaRecorder === 'undefined') {
  alert('This browser does not support camera recording.');
  return;
}

const mimeType = getSupportedMimeType();

try {
  chunksRef.current = [];

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: TARGET_VIDEO_BITRATE })
    : new MediaRecorder(stream);

  mediaRecorderRef.current = recorder;

  recorder.ondataavailable = event => {
    if (event.data?.size) chunksRef.current.push(event.data);
  };

  recorder.onerror = event => {
    console.error('Recording error:', event.error);
    setIsRecording(false);
  };

  recorder.onstop = async () => {
    const actualMime = recorder.mimeType || mimeType || 'video/webm';
    const extension = actualMime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunksRef.current, { type: actualMime });

    if (!blob.size) {
      alert('Recording produced an empty video.');
      return;
    }

    const file = new File(
      [blob],
      `Studio_Recording_${Date.now()}.${extension}`,
      { type: actualMime, lastModified: Date.now() }
    );

    setVideoFile(file);
    setProcessingInfo({
      originalSize: file.size,
      finalSize: file.size,
      compressionRatio: 0,
      duration: recordingTime,
      mimeType: actualMime
    });

    const url = createObjectUrl(file);
    setPreview(url);

    setVideoMetadata({
      duration: recordingTime,
      size: (file.size / 1048576).toFixed(2),
      resolution: 'Camera source',
      name: file.name,
      bitrate: 'Optimized 30 FPS'
    });

    await generateVideoThumbnail(url, Math.min(0.5, Math.max(0, recordingTime - 0.1)));
    setActiveStep('audio_filter');
  };

  recorder.start(500);
  setIsRecording(true);
  setRecordingTime(0);
} catch (error) {
  console.error('Recording initialization:', error);
  alert(error.message || 'Unable to start recording.');
  setIsRecording(false);
}
```

};

const stopRecording = () => {
clearInterval(recordingTimerRef.current);

```
if (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== 'inactive') {
  mediaRecorderRef.current.stop();
}

setIsRecording(false);
```

};

const readVideoMetadata = async (file, url) => {
try {
const video = await loadVideoElement(url);
const duration = Number.isFinite(video.duration) ? video.duration : 0;

```
  setVideoDuration(duration);

  setVideoMetadata({
    duration,
    size: (file.size / 1048576).toFixed(2),
    resolution: `${video.videoWidth || 0}x${video.videoHeight || 0}`,
    name: file.name,
    bitrate: video.videoWidth >= 1920 ? 'High Resolution' : 'Standard'
  });

  setThumbScrubTime(Math.min(0.5, Math.max(0, duration - 0.1)));
} catch (error) {
  console.warn('Metadata:', error);
}
```

};

const handleFileSelect = async (event) => {
const file = event.target.files?.[0];

```
if (!file) return;

if (!file.type.startsWith('video/')) {
  alert('Please select a valid video file.');
  return;
}

if (file.size > MAX_SOURCE_SIZE) {
  alert('The source video is larger than the 500 MB limit.');
  return;
}

setVideoFile(file);
setProcessingInfo({
  originalSize: file.size,
  finalSize: 0,
  compressionRatio: 0,
  duration: 0,
  mimeType: ''
});

const url = createObjectUrl(file);
setPreview(url);

await readVideoMetadata(file, url);
await generateVideoThumbnail(url, 0.5);

setActiveStep('audio_filter');
```

};

const handleMusicSearch = async (term) => {
const query = (term || searchQuery).trim();

```
if (!query) return;

setIsSearching(true);

try {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`
  );

  if (!response.ok) throw new Error('Music search failed.');

  const data = await response.json();
  setSearchResults(data.results || []);
} catch (error) {
  console.error('Music search:', error);
  alert('Unable to search music right now.');
} finally {
  setIsSearching(false);
}
```

};

const handleAddTag = tag => {
const cleanTag = tag.replace(/^#/, '');

```
setTags(previous => previous.includes(cleanTag) ? previous : [...previous, cleanTag]);

setCaption(previous =>
  previous.includes(`#${cleanTag}`)
    ? previous
    : `${previous ? previous.trim() + ' ' : ''}#${cleanTag}`
);
```

};

const handleAddMention = handle => {
const cleanHandle = handle.replace(/^@/, '');

```
setMentions(previous => previous.includes(cleanHandle) ? previous : [...previous, cleanHandle]);

setCaption(previous =>
  previous.includes(`@${cleanHandle}`)
    ? previous
    : `${previous ? previous.trim() + ' ' : ''}@${cleanHandle}`
);
```

};

const handleDetectLocation = () => {
if (!navigator.geolocation) {
setLocation('Universe Studio, Global');
return;
}

```
navigator.geolocation.getCurrentPosition(
  position => {
    const { latitude, longitude } = position.coords;
    setLocation(`Location: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
  },
  () => setLocation('Universe Studio, Global'),
  { enableHighAccuracy: false, timeout: 8000 }
);
```

};

const handleAutoGenerateCC = () => {
setIsGeneratingCC(true);

```
setTimeout(() => {
  const words = caption.trim()
    ? caption.split(/\s+/)
    : ['Trending', 'video', 'on', 'Universe', 'live', 'now!'];

  setSubtitles([
    { start: 0, end: 2, text: words.slice(0, 3).join(' ') || 'Welcome to the broadcast ✨' },
    { start: 2, end: 5, text: words.slice(3, 7).join(' ') || 'Watch closely until the end 🔥' },
    { start: 5, end: 8, text: words.slice(7).join(' ') || 'Drop a comment & follow for more!' }
  ]);

  setIsGeneratingCC(false);
}, 900);
```

};

const handleAddChapter = () => {
if (!newChapterTitle.trim()) return;

```
const chapter = {
  time: Number(newChapterTime) || 0,
  title: newChapterTitle.trim()
};

setChapters(previous =>
  [...previous.filter(item => item.time !== chapter.time), chapter]
    .sort((a, b) => a.time - b.time)
);

setNewChapterTitle('');
```

};

const handleRemoveChapter = time => {
setChapters(previous => previous.filter(chapter => chapter.time !== time));
};

const formatTime = seconds => {
const m = Math.floor(seconds / 60);
const s = Math.floor(seconds % 60);
return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const waitForPlayback = async video => {
try {
await video.play();
} catch {}
};

/*

* IMPORTANT:
* This is the actual processing engine.
*
* Original source:
* videoFile
*
* Processing:
* * scales to 720p maximum
* * 30 FPS
* * applies selected LUT
* * captures original video audio
* * captures selected soundtrack
* * mixes both audio streams
* * encodes one final compressed WebM
*
* The original source is NEVER uploaded.
  */

const processVideoForUpload = async () => {
if (!videoFile) throw new Error('No video selected.');

```
if (!window.MediaRecorder) {
  throw new Error('Your browser does not support video processing.');
}

const outputMime = getSupportedMimeType();

if (!outputMime) {
  throw new Error('This browser cannot encode a supported compressed video format.');
}

processingAbortRef.current = false;

setUploadStage('optimizing');
setUploadProgress(3);
setUploadStatusText('Preparing video for low-data upload...');

const sourceUrl = preview || createObjectUrl(videoFile);
const sourceVideo = await loadVideoElement(sourceUrl);

const duration = Number.isFinite(sourceVideo.duration) ? sourceVideo.duration : 0;

if (!duration) {
  throw new Error('The video duration could not be detected.');
}

setVideoDuration(duration);

const sourceWidth = sourceVideo.videoWidth || TARGET_WIDTH;
const sourceHeight = sourceVideo.videoHeight || TARGET_HEIGHT;

const sourceScale = Math.min(
  1,
  TARGET_WIDTH / sourceWidth,
  TARGET_HEIGHT / sourceHeight
);

const outputWidth = Math.max(2, Math.round(sourceWidth * sourceScale / 2) * 2);
const outputHeight = Math.max(2, Math.round(sourceHeight * sourceScale / 2) * 2);

const canvas = document.createElement('canvas');
canvas.width = outputWidth;
canvas.height = outputHeight;

const context = canvas.getContext('2d', { alpha: false });

if (!context) {
  throw new Error('Video canvas processing is unavailable.');
}

const canvasStream = canvas.captureStream(TARGET_FPS);

const sourceStream = typeof sourceVideo.captureStream === 'function'
  ? sourceVideo.captureStream()
  : typeof sourceVideo.mozCaptureStream === 'function'
    ? sourceVideo.mozCaptureStream()
    : null;

if (!sourceStream) {
  throw new Error('This browser cannot capture the source video for processing.');
}

let audioContext = null;
let destination = null;
let sourceAudioNode = null;
let musicAudio = null;
let musicAudioNode = null;

try {
  const hasSourceAudio = sourceStream.getAudioTracks().length > 0;
  const hasMusic = Boolean(selectedMusic.url);

  if (hasSourceAudio || hasMusic) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    destination = audioContext.createMediaStreamDestination();

    if (hasSourceAudio) {
      try {
        sourceAudioNode = audioContext.createMediaStreamSource(sourceStream);
        const sourceGain = audioContext.createGain();
        sourceGain.gain.value = videoVolume / 100;
        sourceAudioNode.connect(sourceGain);
        sourceGain.connect(destination);
      } catch (error) {
        console.warn('Original audio mixing:', error);
      }
    }

    if (hasMusic) {
      musicAudio = new Audio();
      musicAudio.crossOrigin = 'anonymous';
      musicAudio.preload = 'auto';
      musicAudio.src = selectedMusic.url;
      musicAudio.loop = true;
      musicAudio.volume = 1;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Selected music could not be loaded for embedding.')),
          15000
        );

        musicAudio.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve();
        };

        musicAudio.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Selected music cannot be embedded because the audio source rejected cross-origin processing.'));
        };

        musicAudio.load();
      });

      musicAudioNode = audioContext.createMediaElementSource(musicAudio);
      const musicGain = audioContext.createGain();
      musicGain.gain.value = musicVolume / 100;
      musicAudioNode.connect(musicGain);
      musicGain.connect(destination);
    }
  }

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(destination ? destination.stream.getAudioTracks() : [])
  ]);

  const recorderOptions = {
    mimeType: outputMime,
    videoBitsPerSecond: TARGET_VIDEO_BITRATE,
    audioBitsPerSecond: TARGET_AUDIO_BITRATE
  };

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const outputChunks = [];

  recorder.ondataavailable = event => {
    if (event.data?.size) outputChunks.push(event.data);
  };

  const processingPromise = new Promise((resolve, reject) => {
    recorder.onerror = event => {
      reject(event.error || new Error('Video encoding failed.'));
    };

    recorder.onstop = () => {
      const blob = new Blob(outputChunks, { type: outputMime });

      if (!blob.size) {
        reject(new Error('The optimized video is empty.'));
        return;
      }

      resolve(blob);
    };
  });

  recorder.start(1000);

  if (audioContext?.state === 'suspended') {
    await audioContext.resume().catch(() => {});
  }

  if (musicAudio) {
    await musicAudio.play().catch(error => {
      throw new Error(`Music could not be embedded: ${error.message}`);
    });
  }

  await waitForPlayback(sourceVideo);

  const startTime = performance.now();

  await new Promise(resolve => {
    let lastProgress = -1;

    const drawFrame = () => {
      if (processingAbortRef.current) {
        try { recorder.stop(); } catch {}
        resolve();
        return;
      }

      if (sourceVideo.ended || sourceVideo.currentTime >= duration - 0.05) {
        try { recorder.stop(); } catch {}
        resolve();
        return;
      }

      const activeFilter = filters.find(f => f.id === selectedFilter) || filters[0];

      context.filter = activeFilter.css || 'none';
      context.drawImage(sourceVideo, 0, 0, outputWidth, outputHeight);
      context.filter = 'none';

      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(86, Math.round((sourceVideo.currentTime / duration) * 82) + 5);

      if (progress !== lastProgress) {
        lastProgress = progress;
        setUploadProgress(progress);
        setUploadStatusText(
          `Encoding optimized ${outputWidth}×${outputHeight} video... ${Math.round((sourceVideo.currentTime / duration) * 100)}%`
        );
      }

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  });

  const processedBlob = await processingPromise;

  musicAudio?.pause();
  sourceVideo.pause();

  canvasStream.getTracks().forEach(track => track.stop());
  sourceStream.getTracks().forEach(track => track.stop());
  combinedStream.getTracks().forEach(track => track.stop());

  if (audioContext) {
    await audioContext.close().catch(() => {});
  }

  const extension = outputMime.includes('mp4') ? 'mp4' : 'webm';
  const processedFile = new File(
    [processedBlob],
    `universe_${Date.now()}.${extension}`,
    { type: outputMime, lastModified: Date.now() }
  );

  const originalSize = videoFile.size;
  const finalSize = processedFile.size;
  const compressionRatio = originalSize
    ? Math.max(0, Math.round((1 - finalSize / originalSize) * 100))
    : 0;

  setProcessingInfo({
    originalSize,
    finalSize,
    compressionRatio,
    duration,
    mimeType: outputMime
  });

  setUploadProgress(88);
  setUploadStage('optimized');
  setUploadStatusText(
    `Optimized ${(finalSize / 1048576).toFixed(2)} MB • ${compressionRatio}% smaller`
  );

  return processedFile;
} catch (error) {
  try { sourceVideo.pause(); } catch {}
  canvasStream?.getTracks().forEach(track => track.stop());
  sourceStream?.getTracks().forEach(track => track.stop());
  if (audioContext) await audioContext.close().catch(() => {});
  throw error;
}
```

};

const uploadFileWithProgress = async (file, path, userId) => {
setUploadStage('uploading');
setUploadProgress(90);
setUploadStatusText('Uploading optimized video...');

```
const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData?.session?.access_token;

if (!token) {
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false
    });

  if (error) throw error;

  return supabase.storage.from('videos').getPublicUrl(path).data.publicUrl;
}

const uploadUrl = `${supabase.storage.from('videos').url}/object/videos/${path}`;

return new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();

  xhr.open('POST', uploadUrl, true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.setRequestHeader('apikey', supabase.supabaseKey);
  xhr.setRequestHeader('x-upsert', 'false');
  xhr.setRequestHeader('cache-control', '31536000');
  xhr.setRequestHeader('content-type', file.type);

  xhr.upload.onprogress = event => {
    if (!event.lengthComputable) return;

    const progress = 90 + Math.round((event.loaded / event.total) * 7);

    setUploadProgress(Math.min(97, progress));
    setUploadStatusText(
      `Uploading optimized video... ${Math.round((event.loaded / event.total) * 100)}%`
    );
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve(
        supabase.storage.from('videos').getPublicUrl(path).data.publicUrl
      );
    } else {
      reject(new Error(`Storage upload failed (${xhr.status}).`));
    }
  };

  xhr.onerror = () => reject(new Error('Network connection dropped during upload.'));
  xhr.onabort = () => reject(new Error('Upload was interrupted.'));
  xhr.send(file);
});
```

};

const handleUpload = async () => {
if (!videoFile) {
alert('Please select or record a video first.');
return;
}

```
if (isScheduled && scheduledAt && new Date(scheduledAt) <= new Date()) {
  alert('Scheduled release must be in the future.');
  return;
}

setIsUploading(true);
processingAbortRef.current = false;

try {
  const {
    data: { user: currentUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    throw new Error('Session expired. Please log in again.');
  }

  setUploadStage('optimizing');
  setUploadProgress(2);
  setUploadStatusText('Compressing video and preparing embedded soundtrack...');

  const processedFile = await processVideoForUpload();

  if (!processedFile?.size) {
    throw new Error('Video processing produced no output.');
  }

  setUploadStage('thumbnail');
  setUploadProgress(88);
  setUploadStatusText('Creating optimized cover thumbnail...');

  let thumbPublicUrl = null;

  const finalPreviewUrl = createObjectUrl(processedFile);

  if (!thumbnailBlob) {
    await generateVideoThumbnail(
      finalPreviewUrl,
      Math.min(thumbScrubTime, Math.max(0, videoDuration - 0.1))
    );
  }

  if (thumbnailBlob) {
    const thumbPath = `${currentUser.id}/thumb_${Date.now()}.jpg`;

    const { error: thumbError } = await supabase.storage
      .from('videos')
      .upload(thumbPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false
      });

    if (thumbError) {
      console.warn('Thumbnail upload:', thumbError.message);
    } else {
      thumbPublicUrl = supabase.storage
        .from('videos')
        .getPublicUrl(thumbPath)
        .data.publicUrl;
    }
  }

  const extension = processedFile.type.includes('mp4') ? 'mp4' : 'webm';
  const videoPath = `${currentUser.id}/${Date.now()}_optimized.${extension}`;

  const publicUrl = await uploadFileWithProgress(
    processedFile,
    videoPath,
    currentUser.id
  );

  setUploadStage('indexing');
  setUploadProgress(98);
  setUploadStatusText('Saving video metadata and creator settings...');

  const extractedTags = caption
    .match(/#[a-zA-Z0-9_]+/g)
    ?.map(tag => tag.replace('#', '')) || [];

  const extractedMentions = caption
    .match(/@[a-zA-Z0-9_]+/g)
    ?.map(mention => mention.replace('@', '')) || [];

  const persistentTags = Array.from(
    new Set([
      ...tags,
      ...extractedTags,
      `filter_${selectedFilter}`
    ])
  );

  try {
    localStorage.setItem(
      `mpade_filter_${publicUrl}`,
      selectedFilter
    );
  } catch {}

  /*
   * IMPORTANT:
   * music_url is intentionally NULL when music has been embedded.
   *
   * The soundtrack already exists inside video_url.
   * There is no separate audio upload.
   */

  const fullVideoRecord = {
    video_url: publicUrl,
    thumbnail_url: thumbPublicUrl,
    caption: caption.trim(),
    music_name: selectedMusic.url ? selectedMusic.name : 'Original Audio',
    music_url: null,
    user_id: currentUser.id,
    privacy,
    is_private: privacy === 'private',
    location: location.trim(),
    tags: persistentTags,
    mentions: extractedMentions,
    allow_duet: allowDuet,
    allow_stitch: allowStitch,
    allow_download: allowDownload,
    allow_comments: allowComments,
    is_commercial: isCommercial,
    sponsor_tag: sponsorTag.trim(),
    age_restricted: ageRestricted,
    filter_style: selectedFilter,
    category,
    poll_data: pollEnabled ? pollData : null,
    product_link: productEnabled ? productLink : null,
    chapters: chapters.length ? chapters : null,
    subtitles: subtitlesEnabled && subtitles.length ? subtitles : null,
    audio_enhancement: audioEnhancement,
    scheduled_at: isScheduled && scheduledAt
      ? new Date(scheduledAt).toISOString()
      : null,
    thumbnail_text: coverText.trim()
  };

  let { error: dbError } = await supabase
    .from('videos')
    .insert([fullVideoRecord]);

  if (dbError) {
    console.warn(
      'Extended video schema unavailable. Falling back:',
      dbError.message
    );

    const fallbackRecord = {
      video_url: publicUrl,
      thumbnail_url: thumbPublicUrl,
      caption: caption.trim(),
      music_name: selectedMusic.url ? selectedMusic.name : 'Original Audio',
      music_url: null,
      user_id: currentUser.id,
      privacy,
      is_private: privacy === 'private',
      location: location.trim(),
      tags: persistentTags,
      mentions: extractedMentions
    };

    const { error: fallbackError } = await supabase
      .from('videos')
      .insert([fallbackRecord]);

    if (fallbackError) throw fallbackError;
  }

  setUploadProgress(100);
  setUploadStage('complete');
  setUploadStatusText(
    selectedMusic.url
      ? 'Published with embedded soundtrack.'
      : 'Published optimized video.'
  );

  confetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.6 }
  });

  setTimeout(() => {
    if (onComplete) onComplete();
  }, 1200);
} catch (error) {
  console.error('Publishing error:', error);

  setUploadStage('error');
  setUploadStatusText(error.message || 'Publishing failed.');

  alert(`Publishing failed: ${error.message || 'Network error'}`);
} finally {
  setIsUploading(false);
}
```

};

const stepList = [
{ id: 'media', stepNum: 1, label: 'Media', icon: <Film size={15} /> },
{ id: 'audio_filter', stepNum: 2, label: 'Audio & LUT', icon: <Music size={15} />, disabled: !preview },
{ id: 'interactive', stepNum: 3, label: 'Interactive', icon: <Sparkles size={15} />, disabled: !preview },
{ id: 'publish', stepNum: 4, label: 'Publish', icon: <Send size={15} />, disabled: !preview }
];

const currentStepIndex = stepList.findIndex(step => step.id === activeStep);

const goToNextStep = () => {
if (currentStepIndex < stepList.length - 1 && preview) {
setActiveStep(stepList[currentStepIndex + 1].id);
}
};

const goToPrevStep = () => {
if (currentStepIndex > 0) {
setActiveStep(stepList[currentStepIndex - 1].id);
}
};

return ( <div className="fixed inset-0 z-[120] flex flex-col md:items-center md:justify-center bg-black/95 md:bg-black/85 md:backdrop-blur-2xl md:p-4 overflow-hidden select-none">
<audio ref={audioPreviewRef} src={selectedMusic.url || undefined} loop />
<audio ref={soundLabAudioRef} src={playingTrackUrl || undefined} loop />

```
  <motion.div
    initial={{ opacity: 0, scale: 0.98, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    className="relative w-full h-[100dvh] md:h-[92vh] md:max-h-[920px] md:max-w-6xl bg-[#080811] md:border md:border-cyan-500/30 md:rounded-[2.5rem] md:shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-white font-sans"
  >
    <header className="h-14 sm:h-16 px-3 sm:px-6 border-b border-cyan-500/15 bg-black/70 backdrop-blur-xl flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          disabled={isUploading}
          onClick={onComplete}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-pink-500 flex items-center justify-center">
            <Zap size={15} className="text-black fill-black" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400">
              Studio Pro
            </h1>
            <span className="hidden sm:block text-[8px] text-cyan-300 font-black tracking-widest">
              OPTIMIZED MEDIA ENGINE
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-2xl p-1 max-w-[55%] overflow-x-auto">
        {stepList.map(step => (
          <button
            key={step.id}
            type="button"
            disabled={step.disabled || isUploading}
            onClick={() => setActiveStep(step.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase shrink-0 ${
              activeStep === step.id
                ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {step.icon}
            <span className="hidden md:inline">{step.label}</span>
            <span className="md:hidden">{step.stepNum}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {preview && (
          <button
            type="button"
            onClick={() => setShowMobilePreview(value => !value)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10"
          >
            <Smartphone size={16} />
          </button>
        )}

        {preview && activeStep !== 'publish' && (
          <button
            type="button"
            onClick={() => setActiveStep('publish')}
            className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs px-3 py-2 rounded-xl"
          >
            Publish <ArrowRight size={14} />
          </button>
        )}
      </div>
    </header>

    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex md:w-[340px] lg:w-[380px] border-r border-white/10 p-5 flex-col items-center justify-center bg-black/40 overflow-y-auto">
        <div className="relative w-full max-w-[260px] aspect-[9/16] bg-zinc-950 rounded-[2.2rem] overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)]">
          {preview ? (
            <>
              <video
                ref={editorVideoRef}
                src={preview}
                className="w-full h-full object-cover"
                style={{ filter: currentFilterObj.css }}
                autoPlay
                loop
                muted={videoVolume === 0}
                playsInline
                onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={event => setVideoDuration(event.currentTarget.duration || 0)}
              />

              {selectedFilter !== 'original' && (
                <div className="absolute bottom-3 left-3 bg-black/80 px-2 py-1 rounded-full text-[9px] font-black text-cyan-300">
                  <Wand2 size={10} className="inline mr-1" />
                  {currentFilterObj.name}
                </div>
              )}

              {isCommercial && (
                <div className="absolute top-3 left-3 bg-black/80 px-2 py-1 rounded-full text-[9px] font-black text-amber-300">
                  <Award size={10} className="inline mr-1" />
                  {sponsorTag || 'Paid Partnership'}
                </div>
              )}

              {ageRestricted && (
                <div className="absolute top-3 right-3 bg-red-950/90 px-2 py-1 rounded-full text-[9px] font-black text-red-300">
                  18+ Mature
                </div>
              )}

              {pollEnabled && (
                <div className="absolute top-1/3 left-3 right-3 bg-black/85 p-3 rounded-2xl border border-cyan-400/40">
                  <p className="text-[11px] font-black text-cyan-200 text-center mb-2">
                    {pollData.question}
                  </p>
                  <div className="space-y-1">
                    <div className="py-1.5 bg-cyan-500/20 rounded-xl text-[10px] text-center">
                      {pollData.option1}
                    </div>
                    <div className="py-1.5 bg-pink-500/20 rounded-xl text-[10px] text-center">
                      {pollData.option2}
                    </div>
                  </div>
                </div>
              )}

              {productEnabled && (
                <div className="absolute bottom-16 left-3 right-3 bg-black/90 p-2 rounded-2xl border border-pink-500/40">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-pink-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate">{productLink.title}</p>
                      <p className="text-[9px] text-emerald-400">{productLink.price}</p>
                    </div>
                  </div>
                </div>
              )}

              {subtitlesEnabled && subtitles.length > 0 && (
                <div className="absolute bottom-6 left-3 right-3 text-center">
                  <span className="inline-block bg-black/80 px-3 py-1 rounded-xl text-[11px] font-black text-yellow-300">
                    {subtitles[0]?.text}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const video = editorVideoRef.current;
                  if (!video) return;

                  if (video.paused) {
                    video.play().catch(() => {});
                    audioPreviewRef.current?.play().catch(() => {});
                    setIsPlaying(true);
                  } else {
                    video.pause();
                    audioPreviewRef.current?.pause();
                    setIsPlaying(false);
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/10"
              >
                {!isPlaying && (
                  <div className="w-14 h-14 rounded-full bg-black/70 border border-cyan-400/50 flex items-center justify-center">
                    <Play size={24} className="fill-cyan-400 text-cyan-400" />
                  </div>
                )}
              </button>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500"
                  style={{ width: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%` }}
                />
              </div>
            </>
          ) : ingestMode === 'camera' ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ filter: currentFilterObj.css }}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div key={index} className="border border-white/10" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-500">
              <Film size={36} className="mx-auto mb-2" />
              <p className="text-xs font-bold">No Media Loaded</p>
            </div>
          )}
        </div>

        {preview && (
          <div className="mt-3 w-full max-w-[260px] bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between text-[11px] font-mono">
            <span className="truncate max-w-[145px] text-cyan-300">
              {videoMetadata.name}
            </span>
            <span className="text-pink-400">
              {processingInfo.finalSize
                ? `${(processingInfo.finalSize / 1048576).toFixed(2)} MB`
                : `${videoMetadata.size} MB`}
            </span>
          </div>
        )}

        {processingInfo.finalSize > 0 && (
          <div className="mt-2 w-full max-w-[260px] p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[9px] font-mono text-emerald-300">
            Optimized: {processingInfo.compressionRatio}% smaller
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMobilePreview && preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-cyan-500/20 bg-black/90 p-3 flex flex-col items-center"
          >
            <div className="relative w-36 aspect-[9/16] rounded-2xl overflow-hidden border border-cyan-500/40">
              <video
                ref={mobileEditorVideoRef}
                src={preview}
                className="w-full h-full object-cover"
                style={{ filter: currentFilterObj.css }}
                autoPlay
                loop
                playsInline
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#090911] pb-24 md:pb-8">
        {activeStep === 'media' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-black uppercase flex items-center gap-2">
                  <Film size={18} className="text-cyan-400" />
                  Media Ingestion Engine
                </h2>
                <p className="text-xs text-zinc-400">
                  Select a video or record directly from your camera
                </p>
              </div>

              <div className="flex bg-black/60 border border-white/10 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIngestMode('dropzone')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                    ingestMode === 'dropzone' ? 'bg-cyan-500 text-black' : 'text-zinc-400'
                  }`}
                >
                  Dropzone
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode('camera')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                    ingestMode === 'camera' ? 'bg-pink-500 text-white' : 'text-zinc-400'
                  }`}
                >
                  Camera
                </button>
              </div>
            </div>

            {ingestMode === 'dropzone' && (
              <div
                onDragOver={event => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={event => {
                  event.preventDefault();
                  setIsDragging(false);
                  handleFileSelect({ target: { files: event.dataTransfer.files } });
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-pink-950/20'
                }`}
              >
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center mb-4">
                  <UploadIcon size={30} className="text-cyan-400" />
                </div>

                <h3 className="text-lg font-black">
                  {preview ? 'Change / Replace Video' : 'Select or Drop Video'}
                </h3>

                <p className="text-xs text-zinc-400 max-w-md mt-2 mb-5">
                  MP4, MOV, WebM and M4V are accepted. The source is compressed locally before upload.
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px]">
                    Max 500 MB
                  </span>
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] text-cyan-300">
                    Output: 720p
                  </span>
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] text-pink-300">
                    30 FPS
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {ingestMode === 'camera' && (
              <div className="space-y-4">
                <div className="md:hidden relative aspect-[9/16] max-h-[420px] mx-auto bg-black rounded-3xl overflow-hidden border-2 border-pink-500/40">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ filter: currentFilterObj.css }}
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {showGrid && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="border border-white/10" />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-white p-1 bg-black/40"
                  >
                    <div className={`w-full h-full ${isRecording ? 'bg-red-600 rounded-md' : 'bg-pink-500 rounded-full'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFacingMode(value => value === 'user' ? 'environment' : 'user')}
                    className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-1.5"
                  >
                    <RefreshCw size={18} className="text-cyan-400" />
                    <span className="text-xs font-bold">Flip Camera</span>
                    <span className="text-[10px] text-zinc-500">{facingMode}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGrid(value => !value)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 ${
                      showGrid ? 'bg-cyan-500/20 border-cyan-400' : 'bg-zinc-900/60 border-white/10'
                    }`}
                  >
                    <Grid size={18} />
                    <span className="text-xs font-bold">Grid</span>
                    <span className="text-[10px] text-zinc-500">{showGrid ? 'Active' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecordingSpeed(value => value === '1x' ? '2x' : value === '2x' ? '0.5x' : '1x')}
                    className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-1.5"
                  >
                    <Gauge size={18} className="text-pink-400" />
                    <span className="text-xs font-bold">Speed</span>
                    <span className="text-[10px] text-pink-400">{recordingSpeed}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecordingLimit(value => value === 60 ? 180 : value === 180 ? 15 : 60)}
                    className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-1.5"
                  >
                    <Clock size={18} className="text-amber-400" />
                    <span className="text-xs font-bold">Limit</span>
                    <span className="text-[10px] text-amber-400">{recordingLimit}s</span>
                  </button>
                </div>

                {isRecording && (
                  <div className="text-center text-sm font-mono text-red-400">
                    Recording {formatTime(recordingTime)} / {formatTime(recordingLimit)}
                  </div>
                )}
              </div>
            )}

            {preview && (
              <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-cyan-300 flex items-center gap-1.5">
                    <Tag size={15} />
                    Cover Frame
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {thumbScrubTime.toFixed(1)}s
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={videoDuration || 10}
                  step="0.1"
                  value={Math.min(thumbScrubTime, videoDuration || 10)}
                  onChange={async event => {
                    const value = Number(event.target.value);
                    setThumbScrubTime(value);
                    await generateVideoThumbnail(preview, value);
                  }}
                  className="w-full accent-cyan-400"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={coverText}
                    onChange={event => setCoverText(event.target.value)}
                    placeholder="Cover headline..."
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => generateVideoThumbnail(preview, thumbScrubTime)}
                    className="bg-white/10 border border-white/15 rounded-2xl text-xs font-black uppercase py-2.5 text-cyan-300"
                  >
                    Bake Cover
                  </button>
                </div>

                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt="Video cover preview"
                    className="w-24 aspect-[9/16] object-cover rounded-xl border border-cyan-500/30"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {activeStep === 'audio_filter' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="pb-3 border-b border-white/10">
              <h2 className="text-lg font-black uppercase flex items-center gap-2">
                <Sliders size={18} className="text-pink-400" />
                Sound Lab & Cinematic LUT
              </h2>
              <p className="text-xs text-zinc-400">
                The selected soundtrack will be embedded into the final compressed video.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-cyan-300">
                  8 Cinematic LUT Filters
                </h4>
                <span className="text-[10px] text-zinc-400">
                  Active: {currentFilterObj.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => handleFilterSelect(filter.id)}
                    className={`p-3 rounded-2xl border text-left ${
                      selectedFilter === filter.id
                        ? 'bg-cyan-950/50 border-cyan-400'
                        : 'bg-zinc-900/40 border-white/10'
                    }`}
                  >
                    <div className={`w-full h-10 rounded-xl mb-2 flex items-center justify-center ${filter.color}`}>
                      {selectedFilter === filter.id && <Check size={16} />}
                    </div>
                    <p className="text-xs font-bold truncate">{filter.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-pink-300">
                AI Audio Enhancement
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Standard' },
                  { id: 'crystal_voice', label: 'Crystal Voice' },
                  { id: 'studio_master', label: 'Studio Master' },
                  { id: 'bass_boost', label: 'Bass Booster' }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAudioEnhancement(option.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold ${
                      audioEnhancement === option.id
                        ? 'bg-pink-950/40 border-pink-500 text-pink-300'
                        : 'bg-black/40 border-white/10 text-zinc-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-cyan-300">
                Dual Audio Master Mixer
              </h4>

              <div>
                <div className="flex justify-between text-xs">
                  <span>Original Video Audio</span>
                  <span className="text-cyan-400">{videoVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoVolume}
                  onChange={event => setVideoVolume(Number(event.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span>Embedded Soundtrack</span>
                  <span className="text-pink-400">{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={event => setMusicVolume(Number(event.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-zinc-300">
                  Global Music Search
                </h4>
                <span className="text-[10px] text-cyan-400 truncate max-w-[180px]">
                  {selectedMusic.name}
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && handleMusicSearch()}
                    placeholder="Search songs, artists, Afrobeats..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleMusicSearch()}
                  className="px-5 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-black text-xs rounded-2xl"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Find Beat'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-52 overflow-y-auto space-y-2">
                  {searchResults.slice(0, 8).map(track => (
                    <div
                      key={track.trackId}
                      className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-2xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {track.artworkUrl60 && (
                          <img
                            src={track.artworkUrl60}
                            className="w-10 h-10 rounded-xl object-cover"
                            alt=""
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{track.trackName}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{track.artistName}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMusic({
                            name: track.trackName,
                            artist: track.artistName,
                            url: track.previewUrl,
                            artwork: track.artworkUrl100
                          });
                          setPlayingTrackUrl(track.previewUrl);
                        }}
                        className="px-3 py-1.5 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedMusic.url && (
                <div className="p-3 bg-pink-950/20 border border-pink-500/30 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">{selectedMusic.name}</p>
                    <p className="text-[10px] text-zinc-400">{selectedMusic.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMusic({
                        name: 'Original Audio',
                        artist: 'Original Creator',
                        url: null,
                        artwork: null
                      });
                      setPlayingTrackUrl(null);
                    }}
                    className="text-xs text-red-400 font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeStep === 'interactive' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="pb-3 border-b border-white/10">
              <h2 className="text-lg font-black uppercase flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-400" />
                Interactive Features
              </h2>
              <p className="text-xs text-zinc-400">
                Configure chapters, captions, polls and product links.
              </p>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-cyan-300">
                  Chapters & Markers
                </h4>
                <span className="text-[10px] text-zinc-500">{chapters.length} marker(s)</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={videoDuration || 600}
                  value={newChapterTime}
                  onChange={event => setNewChapterTime(event.target.value)}
                  className="w-20 bg-black/60 border border-white/10 rounded-2xl px-3 py-2.5 text-xs"
                  placeholder="Sec"
                />
                <input
                  value={newChapterTitle}
                  onChange={event => setNewChapterTitle(event.target.value)}
                  placeholder="Chapter title..."
                  className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="px-4 bg-cyan-500 text-black rounded-2xl"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {chapters.map(chapter => (
                  <div
                    key={`${chapter.time}-${chapter.title}`}
                    className="flex items-center gap-2 bg-black/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs"
                  >
                    <span className="text-cyan-400 font-mono">{formatTime(chapter.time)}</span>
                    <span>{chapter.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChapter(chapter.time)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-yellow-300">
                  Auto Closed Captions
                </h4>
                <input
                  type="checkbox"
                  checked={subtitlesEnabled}
                  onChange={event => setSubtitlesEnabled(event.target.checked)}
                  className="accent-yellow-400"
                />
              </div>

              {subtitlesEnabled && (
                <>
                  <button
                    type="button"
                    disabled={isGeneratingCC}
                    onClick={handleAutoGenerateCC}
                    className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xs uppercase rounded-2xl"
                  >
                    {isGeneratingCC ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Auto-Sync Subtitles'}
                  </button>

                  <div className="space-y-1.5">
                    {subtitles.map((subtitle, index) => (
                      <div key={index} className="text-xs bg-black/40 p-2 rounded-xl">
                        <span className="text-yellow-400 font-mono">
                          {subtitle.start}s-{subtitle.end}s
                        </span>{' '}
                        {subtitle.text}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-pink-300">
                  Poll & Voting
                </h4>
                <input
                  type="checkbox"
                  checked={pollEnabled}
                  onChange={event => setPollEnabled(event.target.checked)}
                  className="accent-pink-500"
                />
              </div>

              {pollEnabled && (
                <>
                  <input
                    value={pollData.question}
                    onChange={event => setPollData({ ...pollData, question: event.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                    placeholder="Question..."
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={pollData.option1}
                      onChange={event => setPollData({ ...pollData, option1: event.target.value })}
                      className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                      placeholder="Option A"
                    />
                    <input
                      value={pollData.option2}
                      onChange={event => setPollData({ ...pollData, option2: event.target.value })}
                      className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                      placeholder="Option B"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-emerald-300">
                  Product / External Link
                </h4>
                <input
                  type="checkbox"
                  checked={productEnabled}
                  onChange={event => setProductEnabled(event.target.checked)}
                  className="accent-emerald-400"
                />
              </div>

              {productEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    value={productLink.title}
                    onChange={event => setProductLink({ ...productLink, title: event.target.value })}
                    placeholder="Product"
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                  />
                  <input
                    value={productLink.price}
                    onChange={event => setProductLink({ ...productLink, price: event.target.value })}
                    placeholder="Price"
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                  />
                  <input
                    value={productLink.url}
                    onChange={event => setProductLink({ ...productLink, url: event.target.value })}
                    placeholder="URL"
                    className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeStep === 'publish' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            <div className="pb-3 border-b border-white/10">
              <h2 className="text-lg font-black uppercase flex items-center gap-2">
                <Globe size={18} className="text-cyan-400" />
                Broadcast Distribution
              </h2>
              <p className="text-xs text-zinc-400">
                Final metadata, audience and publishing controls.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-black uppercase">Caption</label>
                <span className="text-[10px] text-zinc-500">{caption.length}/2200</span>
              </div>

              <textarea
                value={caption}
                onChange={event => setCaption(event.target.value.slice(0, 2200))}
                rows={4}
                placeholder="Write your caption..."
                className="w-full bg-black/60 border border-cyan-500/30 rounded-2xl p-4 text-xs outline-none resize-none"
              />

              <div className="flex gap-2 overflow-x-auto">
                {aiHookPresets.map(hook => (
                  <button
                    key={hook.title}
                    type="button"
                    onClick={() => setCaption(hook.caption)}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] shrink-0"
                  >
                    {hook.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto">
                <Hash size={14} className="text-cyan-400 shrink-0" />
                {trendingHashtags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl text-[10px] shrink-0"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto">
                <MapPin size={14} className="text-pink-400 shrink-0" />
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="px-2.5 py-1 bg-pink-950/40 border border-pink-500/40 text-pink-300 rounded-xl text-[10px] shrink-0"
                >
                  Auto-Detect
                </button>

                {popularLocations.map(place => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => setLocation(place)}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-[10px] shrink-0"
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-cyan-300">
                Target Category
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left truncate ${
                      category === item
                        ? 'bg-cyan-500 text-black border-cyan-400'
                        : 'bg-black/40 text-zinc-400 border-white/10'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-300">
                Audience & Visibility
              </label>

              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'public', label: 'Public', icon: <Globe size={16} /> },
                  { id: 'friends', label: 'Followers', icon: <Users size={16} /> },
                  { id: 'private', label: 'Private', icon: <Lock size={16} /> }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPrivacy(option.id)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1 ${
                      privacy === option.id
                        ? 'bg-cyan-950/60 border-cyan-400'
                        : 'bg-zinc-900/40 border-white/10'
                    }`}
                  >
                    {option.icon}
                    <span className="text-xs font-black">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-pink-300">
                Creator Permissions & Compliance
              </h4>

              {[
                ['Allow Duet & Remix', allowDuet, setAllowDuet],
                ['Allow Stitch', allowStitch, setAllowStitch],
                ['Allow Downloads', allowDownload, setAllowDownload],
                ['18+ Mature Content', ageRestricted, setAgeRestricted],
                ['Paid Partnership', isCommercial, setIsCommercial],
                ['Allow Comments', allowComments, setAllowComments]
              ].map(([label, value, setter]) => (
                <label
                  key={label}
                  className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl"
                >
                  <span className="text-xs font-bold">{label}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={event => setter(event.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
              ))}

              {isCommercial && (
                <input
                  value={sponsorTag}
                  onChange={event => setSponsorTag(event.target.value)}
                  placeholder="Sponsor brand name..."
                  className="w-full bg-black border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300"
                />
              )}

              <div className="p-3 bg-black/40 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Scheduled Release</p>
                    <p className="text-[10px] text-zinc-500">Publish automatically later</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={event => setIsScheduled(event.target.checked)}
                    className="accent-cyan-400"
                  />
                </div>

                {isScheduled && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={event => setScheduledAt(event.target.value)}
                    className="mt-3 w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300"
                  />
                )}
              </div>
            </div>

            {processingInfo.finalSize > 0 && !isUploading && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-black">
                  <CheckCircle2 size={16} />
                  VIDEO OPTIMIZATION READY
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div>
                    <p className="text-[10px] text-zinc-500">Original</p>
                    <p className="text-xs font-mono">
                      {(processingInfo.originalSize / 1048576).toFixed(1)} MB
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500">Final</p>
                    <p className="text-xs font-mono text-cyan-300">
                      {(processingInfo.finalSize / 1048576).toFixed(1)} MB
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-zinc-500">Saved</p>
                    <p className="text-xs font-mono text-emerald-300">
                      {processingInfo.compressionRatio}%
                    </p>
                  </div>
                </div>

                {selectedMusic.url && (
                  <p className="text-[10px] text-pink-300 mt-3">
                    🎵 {selectedMusic.name} will be embedded into the final video.
                  </p>
                )}
              </div>
            )}

            {isUploading ? (
              <div className="p-5 bg-black/90 border border-cyan-400/50 rounded-3xl space-y-4">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-cyan-300 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {uploadStatusText}
                  </span>
                  <span className="font-mono text-cyan-300">
                    {uploadProgress}%
                  </span>
                </div>

                <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-teal-400 rounded-full"
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>{uploadStage.toUpperCase()}</span>
                  <span>{currentFilterObj.name}</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpload}
                disabled={!videoFile}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 via-pink-500 to-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-40"
              >
                <Zap size={18} className="inline mr-2 fill-white" />
                Broadcast Video Now
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    <footer className="md:hidden border-t border-cyan-500/15 bg-black/90 p-3 flex items-center justify-between gap-2 shrink-0">
      {currentStepIndex > 0 ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={goToPrevStep}
          className="px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      ) : (
        <div />
      )}

      {activeStep !== 'publish' && preview ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={goToNextStep}
          className="flex-1 max-w-[200px] py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5"
        >
          Next Step
          <ChevronRight size={16} />
        </button>
      ) : activeStep === 'publish' && !isUploading ? (
        <button
          type="button"
          onClick={handleUpload}
          disabled={!videoFile}
          className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs uppercase rounded-xl disabled:opacity-40"
        >
          <Zap size={15} className="inline mr-1 fill-white" />
          Broadcast
        </button>
      ) : null}
    </footer>
  </motion.div>
</div>
```

);
};

export default Upload;
