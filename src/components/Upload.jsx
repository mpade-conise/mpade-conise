import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient';
import {
  X, UploadCloud, Camera, Film, Music, Search, Play, Pause, Check, Loader2,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Mic, MicOff, Video, VideoOff,
  RotateCcw, Sparkles, SlidersHorizontal, Image as ImageIcon, Globe2, Lock,
  Users, MapPin, Hash, AtSign, MessageCircle, Download, Scissors, Layers,
  Wand2, Clock3, Send, Trash2, Plus, Minus, Settings2, Zap, ShieldCheck,
  AlertCircle, CheckCircle2, RefreshCw, Smartphone, MonitorPlay, Eye, EyeOff
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'https://mpade-backend.onrender.com').replace(/\/+$/, '');

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 8 * 1024 * 1024;

const FILTERS = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'neon_cyber', name: 'Neon', css: 'saturate(1.35) contrast(1.12) hue-rotate(8deg)' },
  { id: 'electric', name: 'Electric', css: 'saturate(1.55) contrast(1.2) brightness(1.04)' },
  { id: 'cinema', name: 'Cinema', css: 'contrast(1.16) saturate(.82) brightness(.96)' },
  { id: 'golden_hour', name: 'Golden', css: 'sepia(.18) saturate(1.25) contrast(1.05) brightness(1.04)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(.35) saturate(.78) contrast(1.06)' },
  { id: 'midnight', name: 'Midnight', css: 'brightness(.78) contrast(1.2) saturate(.82)' },
  { id: 'vibrant_pop', name: 'Vibrant', css: 'saturate(1.7) contrast(1.08) brightness(1.03)' }
];

const CATEGORIES = [
  'Entertainment', 'Music', 'Comedy', 'Education', 'Gaming', 'Sports',
  'Lifestyle', 'Fashion', 'Food', 'Technology', 'Travel', 'News', 'Other'
];

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Everyone', icon: Globe2 },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'private', label: 'Only me', icon: Lock }
];

const AUDIO_ENHANCEMENTS = [
  { id: 'none', name: 'Original', description: 'Keep the audio natural' },
  { id: 'crystal_voice', name: 'Clear Voice', description: 'Improve speech clarity' },
  { id: 'studio_master', name: 'Studio', description: 'Balanced compression and limiting' },
  { id: 'bass_boost', name: 'Bass Boost', description: 'Add low-end presence' }
];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getExtension = (name = '', type = '') => {
  const fromName = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (fromName) return fromName;
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('ogg')) return 'ogv';
  return 'mp4';
};

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const revokeObjectUrl = url => {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
};

const getSessionToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return token;
};

const apiRequest = async (path, options = {}) => {
  const token = await getSessionToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  }

  return data;
};

const uploadToSignedUrl = (url, file, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();

  xhr.open('PUT', url, true);
  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

  xhr.upload.onprogress = event => {
    if (event.lengthComputable && onProgress) {
      onProgress(Math.round((event.loaded / event.total) * 100));
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve();
    } else {
      reject(new Error(`Storage upload failed (${xhr.status})`));
    }
  };

  xhr.onerror = () => reject(new Error('Network error while uploading media.'));
  xhr.ontimeout = () => reject(new Error('Media upload timed out.'));
  xhr.timeout = 0;
  xhr.send(file);
});

const requestUploadUrl = async ({ folder, fileName, contentType, fileSize }) => {
  return apiRequest('/api/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify({ folder, fileName, contentType, fileSize })
  });
};

const createThumbnail = (video, time = 0, filterCss = 'none', coverText = '') => new Promise((resolve, reject) => {
  if (!video) {
    reject(new Error('Video preview is unavailable.'));
    return;
  }

  const canvas = document.createElement('canvas');
  const width = 720;
  const height = Math.round((video.videoHeight / video.videoWidth) * width) || 1280;

  canvas.width = width;
  canvas.height = height;

  const draw = () => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable.');

      ctx.save();
      ctx.filter = filterCss && filterCss !== 'none' ? filterCss : 'none';
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();

      if (coverText.trim()) {
        const fontSize = Math.max(28, Math.round(width * 0.045));
        const padding = Math.round(width * 0.045);

        ctx.fillStyle = 'rgba(0,0,0,.58)';
        ctx.fillRect(0, height - fontSize * 2.8, width, fontSize * 2.8);

        ctx.fillStyle = '#fff';
        ctx.font = `700 ${fontSize}px Arial`;
        ctx.textBaseline = 'middle';

        const maxWidth = width - padding * 2;
        const words = coverText.trim().split(/\s+/);
        const lines = [];
        let current = '';

        words.forEach(word => {
          const test = current ? `${current} ${word}` : word;
          if (ctx.measureText(test).width <= maxWidth) {
            current = test;
          } else {
            if (current) lines.push(current);
            current = word;
          }
        });

        if (current) lines.push(current);

        lines.slice(0, 2).forEach((line, index) => {
          ctx.fillText(
            line,
            padding,
            height - fontSize * (1.7 - index * 0.9)
          );
        });
      }

      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Could not create thumbnail.'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.88);
    } catch (error) {
      reject(error);
    }
  };

  const previousTime = video.currentTime;
  const wasPaused = video.paused;

  const finish = () => {
    video.removeEventListener('seeked', finish);
    try {
      if (wasPaused) video.pause();
      video.currentTime = previousTime;
    } catch {}
    draw();
  };

  try {
    video.pause();
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
    video.addEventListener('seeked', finish, { once: true });

    setTimeout(() => {
      if (video.readyState >= 2) {
        video.removeEventListener('seeked', finish);
        draw();
      }
    }, 500);
  } catch {
    draw();
  }
});

const parseTags = text => {
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) || [];
  return [...new Set(matches.map(item => item.slice(1).toLowerCase()))].slice(0, 30);
};

const parseMentions = text => {
  const matches = text.match(/@[\p{L}\p{N}_.-]+/gu) || [];
  return [...new Set(matches.map(item => item.slice(1)))].slice(0, 30);
};

const Upload = ({ onComplete, onClose }) => {
  const [step, setStep] = useState('media');
  const [ingestMode, setIngestMode] = useState('dropzone');

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoMetadata, setVideoMetadata] = useState({
    width: 0,
    height: 0,
    duration: 0,
    size: 0,
    type: ''
  });

  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbScrubTime, setThumbScrubTime] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [selectedFilter, setSelectedFilter] = useState(() => {
    try {
      return localStorage.getItem('made-universe-upload-filter') || 'original';
    } catch {
      return 'original';
    }
  });

  const [audioEnhancement, setAudioEnhancement] = useState('none');
  const [videoVolume, setVideoVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(65);

  const [selectedMusic, setSelectedMusic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingTrackUrl, setPlayingTrackUrl] = useState('');
  const [musicError, setMusicError] = useState('');

  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [category, setCategory] = useState('Entertainment');
  const [location, setLocation] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [commercialContent, setCommercialContent] = useState(false);
  const [sponsorTag, setSponsorTag] = useState('');

  const [coverText, setCoverText] = useState('');
  const [productLink, setProductLink] = useState('');
  const [pollData, setPollData] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [subtitles, setSubtitles] = useState('');

  const [scheduledAt, setScheduledAt] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [cameraMuted, setCameraMuted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showThumbnailEditor, setShowThumbnailEditor] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [videoDuration, setVideoDuration] = useState(0);
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);

  const videoRef = useRef(null);
  const editorVideoRef = useRef(null);
  const cameraVideoRef = useRef(null);

  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const audioPreviewRef = useRef(null);

  const selectedFilterObject = useMemo(
    () => FILTERS.find(item => item.id === selectedFilter) || FILTERS[0],
    [selectedFilter]
  );

  const progressStep = useMemo(() => {
    if (step === 'media') return 1;
    if (step === 'audio') return 2;
    if (step === 'edit') return 3;
    return 4;
  }, [step]);

  const hasMedia = !!videoFile;
  const hasMusic = !!selectedMusic;
  const videoAspect = videoMetadata.width && videoMetadata.height
    ? videoMetadata.width / videoMetadata.height
    : 9 / 16;

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => {});
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !cameraMuted;

      setCameraReady(true);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Camera permission could not be granted.');
      setCameraReady(false);
    }
  }, [cameraFacing, cameraMuted, stopCamera]);

  useEffect(() => {
    const online = () => setNetworkOnline(true);
    const offline = () => setNetworkOnline(false);

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('made-universe-upload-filter', selectedFilter);
    } catch {}
  }, [selectedFilter]);

  useEffect(() => {
    if (!videoFile) return;

    const url = URL.createObjectURL(videoFile);
    setVideoPreview(url);

    return () => revokeObjectUrl(url);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(videoPreview);
      revokeObjectUrl(thumbnailPreview);
      stopCamera();

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraVideoRef.current?.srcObject) return;

    const audioTrack = cameraVideoRef.current.srcObject.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !cameraMuted;
  }, [cameraMuted]);

  useEffect(() => {
    if (!showCamera) {
      stopCamera();
      return;
    }

    startCamera();
  }, [showCamera, cameraFacing, startCamera, stopCamera]);

  useEffect(() => {
    if (!selectedMusic?.previewUrl) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }
      setPlayingTrackUrl('');
      return;
    }

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio();
      audioPreviewRef.current.preload = 'none';
    }

    const audio = audioPreviewRef.current;
    audio.src = selectedMusic.previewUrl;
    audio.volume = Math.max(0, Math.min(1, musicVolume / 100));
    audio.onended = () => setPlayingTrackUrl('');
  }, [selectedMusic, musicVolume]);

  const toggleTrackPreview = async track => {
    if (!track?.previewUrl) {
      setMusicError('This track does not provide a playable preview.');
      return;
    }

    try {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }

      const audio = audioPreviewRef.current;

      if (playingTrackUrl === track.previewUrl) {
        audio.pause();
        setPlayingTrackUrl('');
        return;
      }

      audio.src = track.previewUrl;
      audio.volume = Math.max(0, Math.min(1, musicVolume / 100));
      await audio.play();
      setPlayingTrackUrl(track.previewUrl);
      setMusicError('');
    } catch {
      setPlayingTrackUrl('');
      setMusicError('This online preview could not be played.');
    }
  };

  const searchMusic = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setMusicError('');

    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`
      );

      if (!response.ok) throw new Error('Music search failed.');

      const data = await response.json();

      const tracks = (data.results || [])
        .filter(track => track.previewUrl)
        .map(track => ({
          id: String(track.trackId),
          title: track.trackName || 'Unknown track',
          artist: track.artistName || 'Unknown artist',
          album: track.collectionName || '',
          artwork: track.artworkUrl100 || '',
          previewUrl: track.previewUrl,
          source: 'iTunes'
        }));

      setSearchResults(tracks);
    } catch (error) {
      setSearchResults([]);
      setMusicError(error?.message || 'Could not search online music.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim().length >= 2) searchMusic();
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadVideoFile = file => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setErrorMessage('This video is larger than the 1 GB upload limit.');
      return;
    }

    setErrorMessage('');
    setVideoFile(file);
    setThumbnailBlob(null);
    setThumbnailPreview('');
    setCurrentTime(0);
    setVideoDuration(0);

    const probeUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');

    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      setVideoMetadata({
        width: probe.videoWidth,
        height: probe.videoHeight,
        duration: probe.duration || 0,
        size: file.size,
        type: file.type
      });
      setVideoDuration(probe.duration || 0);
      URL.revokeObjectUrl(probeUrl);
    };

    probe.onerror = () => {
      URL.revokeObjectUrl(probeUrl);
      setErrorMessage('The selected video could not be read.');
    };

    probe.src = probeUrl;
  };

  const handleFileInput = event => {
    const file = event.target.files?.[0];
    if (file) loadVideoFile(file);
    event.target.value = '';
  };

  const handleDrop = event => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) loadVideoFile(file);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoMetadata({
      width: 0,
      height: 0,
      duration: 0,
      size: 0,
      type: ''
    });
    setThumbnailBlob(null);
    setThumbnailPreview('');
    setCurrentTime(0);
    setVideoDuration(0);
    setStep('media');
  };

  const generateCurrentThumbnail = async () => {
    const sourceVideo = editorVideoRef.current || videoRef.current;

    if (!sourceVideo || !videoFile) return;

    try {
      const blob = await createThumbnail(
        sourceVideo,
        thumbScrubTime,
        selectedFilterObject.css,
        coverText
      );

      if (blob.size > MAX_THUMBNAIL_SIZE) {
        setErrorMessage('Generated thumbnail is too large.');
        return;
      }

      const url = URL.createObjectURL(blob);

      setThumbnailBlob(blob);
      setThumbnailPreview(previous => {
        revokeObjectUrl(previous);
        return url;
      });

      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error?.message || 'Could not generate thumbnail.');
    }
  };

  const handleThumbnailFile = event => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image thumbnail.');
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setErrorMessage('Thumbnail must be smaller than 8 MB.');
      return;
    }

    const url = URL.createObjectURL(file);

    setThumbnailBlob(file);
    setThumbnailPreview(previous => {
      revokeObjectUrl(previous);
      return url;
    });

    event.target.value = '';
  };

  const chooseMusic = track => {
    setSelectedMusic(track);
    setMusicError('');
    setPlayingTrackUrl('');

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
  };

  const clearMusic = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }

    setSelectedMusic(null);
    setPlayingTrackUrl('');
    setMusicError('');
  };

  const startRecording = async () => {
    if (!cameraStreamRef.current) {
      await startCamera();
    }

    const stream = cameraStreamRef.current;

    if (!stream) {
      setErrorMessage('Camera is not ready.');
      return;
    }

    let mimeType = '';

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';

    if (!mimeType) {
      setErrorMessage('This browser cannot record video in a supported format.');
      return;
    }

    try {
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
        audioBitsPerSecond: 128_000
      });

      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onerror = event => {
        setErrorMessage(event?.error?.message || 'Recording failed.');
        setRecording(false);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (!blob.size) {
          setErrorMessage('No recorded video was produced.');
          return;
        }

        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File(
          [blob],
          `made-universe-recording-${Date.now()}.${extension}`,
          { type: mimeType, lastModified: Date.now() }
        );

        loadVideoFile(file);
        setShowCamera(false);
        setRecording(false);
        setRecordingSeconds(0);

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      setRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(previous => previous + 1);
      }, 1000);
    } catch (error) {
      setErrorMessage(error?.message || 'Could not start recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(previous => previous === 'user' ? 'environment' : 'user');
  };

  const toggleCameraMute = () => {
    setCameraMuted(previous => !previous);
  };

  const addChapter = () => {
    const time = Math.max(0, Math.min(currentTime, videoDuration || 0));

    setChapters(previous => [
      ...previous,
      {
        id: createId(),
        time,
        title: `Chapter ${previous.length + 1}`
      }
    ].sort((a, b) => a.time - b.time));
  };

  const updateChapter = (id, field, value) => {
    setChapters(previous => previous.map(chapter => (
      chapter.id === id ? { ...chapter, [field]: value } : chapter
    )));
  };

  const removeChapter = id => {
    setChapters(previous => previous.filter(chapter => chapter.id !== id));
  };

  const addPoll = () => {
    setPollData({
      question: '',
      options: ['', '']
    });
  };

  const updatePollOption = (index, value) => {
    setPollData(previous => {
      if (!previous) return previous;

      const options = [...previous.options];
      options[index] = value;

      return { ...previous, options };
    });
  };

  const addPollOption = () => {
    setPollData(previous => {
      if (!previous || previous.options.length >= 4) return previous;
      return { ...previous, options: [...previous.options, ''] };
    });
  };

  const removePollOption = index => {
    setPollData(previous => {
      if (!previous || previous.options.length <= 2) return previous;

      return {
        ...previous,
        options: previous.options.filter((_, optionIndex) => optionIndex !== index)
      };
    });
  };

  const validateBeforeUpload = () => {
    if (!videoFile) {
      setErrorMessage('Add a video before publishing.');
      setStep('media');
      return false;
    }

    if (!networkOnline) {
      setErrorMessage('You are offline. Reconnect to the internet before publishing.');
      return false;
    }

    if (!caption.trim()) {
      setErrorMessage('Add a caption before publishing.');
      setStep('publish');
      return false;
    }

    if (isScheduled && scheduledAt) {
      const date = new Date(scheduledAt);

      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        setErrorMessage('Choose a valid future publishing time.');
        return false;
      }
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateBeforeUpload()) return;

    setUploading(true);
    setErrorMessage('');
    setStatusMessage('');
    setUploadProgress(0);

    let sourceObjectKey = null;
    let finalObjectKey = null;
    let thumbnailObjectKey = null;

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in to publish.');

      const sourceExtension = getExtension(videoFile.name, videoFile.type);

      setUploadStage('Preparing source video');
      setStatusMessage('Preparing your video for secure upload…');
      setUploadProgress(3);

      const sourceUpload = await requestUploadUrl({
        folder: 'videos',
        fileName: `source-${Date.now()}.${sourceExtension}`,
        contentType: videoFile.type || 'video/webm',
        fileSize: videoFile.size
      });

      sourceObjectKey = sourceUpload.objectKey;

      setUploadStage('Uploading source video');
      setStatusMessage('Uploading source video directly to storage…');

      await uploadToSignedUrl(
        sourceUpload.uploadUrl,
        videoFile,
        progress => setUploadProgress(5 + Math.round(progress * 0.55))
      );

      setUploadProgress(62);

      const needsProcessing =
        sourceExtension !== 'mp4' ||
        !!selectedMusic ||
        selectedFilter !== 'original' ||
        videoVolume !== 100 ||
        musicVolume !== 100 ||
        audioEnhancement !== 'none';

      if (needsProcessing) {
        setUploadStage('Processing video');
        setStatusMessage(
          selectedMusic
            ? 'Embedding the selected music into the final MP4…'
            : 'Converting and preparing the final MP4…'
        );
        setUploadProgress(64);

        const mergeResponse = await apiRequest('/api/storage/merge-video', {
          method: 'POST',
          body: JSON.stringify({
            sourceObjectKey,
            audioUrl: selectedMusic?.previewUrl || null,
            audioName: selectedMusic?.title || null,
            videoVolume: Number(videoVolume),
            musicVolume: Number(musicVolume),
            audioEnhancement,
            filter: selectedFilter
          })
        });

        finalObjectKey = mergeResponse.objectKey;

        setUploadProgress(82);
      } else {
        finalObjectKey = sourceObjectKey;
        setUploadProgress(80);
      }

      if (!thumbnailBlob) {
        setUploadStage('Creating cover');
        setStatusMessage('Generating your video cover…');

        const sourceVideo = editorVideoRef.current || videoRef.current;

        if (sourceVideo) {
          try {
            const generatedThumbnail = await createThumbnail(
              sourceVideo,
              thumbScrubTime,
              selectedFilterObject.css,
              coverText
            );

            setThumbnailBlob(generatedThumbnail);
          } catch {}
        }
      }

      const finalThumbnail = thumbnailBlob;

      if (finalThumbnail) {
        setUploadStage('Uploading cover');
        setStatusMessage('Uploading video cover…');

        const thumbnailUpload = await requestUploadUrl({
          folder: 'covers',
          fileName: `cover-${Date.now()}.jpg`,
          contentType: finalThumbnail.type || 'image/jpeg',
          fileSize: finalThumbnail.size
        });

        thumbnailObjectKey = thumbnailUpload.objectKey;

        await uploadToSignedUrl(
          thumbnailUpload.uploadUrl,
          finalThumbnail,
          progress => setUploadProgress(82 + Math.round(progress * 0.08))
        );
      }

      setUploadStage('Publishing');
      setStatusMessage('Saving your post…');
      setUploadProgress(92);

      const tags = parseTags(caption);
      const mentions = parseMentions(caption);

      const payload = {
        user_id: user.id,
        video_url: finalObjectKey,
        caption: caption.trim(),
        music_name: selectedMusic?.title || null,
        music_url: selectedMusic?.previewUrl || null,
        is_private: privacy === 'private',
        views: 0,
        likes_count: 0,
        comments_count: 0,
        category,
        privacy,
        location: location.trim() || null,
        tags,
        mentions,
        filter_style: selectedFilter,
        thumbnail_url: thumbnailObjectKey,
        comments_enabled: commentsEnabled,
        allow_download: allowDownload,
        allow_duet: allowDuet,
        allow_stitch: allowStitch,
        age_restricted: ageRestricted,
        commercial_content: commercialContent,
        sponsor_tag: sponsorTag.trim() || null,
        cover_text: coverText.trim() || null,
        product_link: productLink.trim() || null,
        poll_data: pollData,
        chapters,
        subtitles: subtitles.trim() || null,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: isScheduled ? 'scheduled' : 'published'
      };

      let insertResult = await supabase
        .from('videos')
        .insert(payload)
        .select()
        .single();

      if (insertResult.error) {
        const fallbackPayload = {
          user_id: user.id,
          video_url: finalObjectKey,
          caption: caption.trim(),
          music_name: selectedMusic?.title || null,
          music_url: selectedMusic?.previewUrl || null,
          is_private: privacy === 'private',
          views: 0,
          likes_count: 0,
          comments_count: 0,
          category
        };

        insertResult = await supabase
          .from('videos')
          .insert(fallbackPayload)
          .select()
          .single();
      }

      if (insertResult.error) {
        throw insertResult.error;
      }

      setUploadProgress(100);
      setUploadStage('Complete');
      setStatusMessage(isScheduled ? 'Your video has been scheduled.' : 'Your video is now published.');

      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.65 }
      });

      if (onComplete) {
        onComplete(insertResult.data);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 900);
    } catch (error) {
      console.error('Upload failed:', error);

      setErrorMessage(error?.message || 'Upload failed. Please try again.');
      setStatusMessage('');

      setUploadStage('Upload failed');

      if (sourceObjectKey && finalObjectKey && finalObjectKey !== sourceObjectKey) {
        try {
          await apiRequest('/api/storage/object', {
            method: 'DELETE',
            body: JSON.stringify({ objectKey: finalObjectKey })
          });
        } catch {}
      }
    } finally {
      setUploading(false);
    }
  };

  const nextStep = () => {
    if (step === 'media') {
      if (!videoFile) {
        setErrorMessage('Add a video first.');
        return;
      }
      setErrorMessage('');
      setStep('audio');
      return;
    }

    if (step === 'audio') {
      setErrorMessage('');
      setStep('edit');
      return;
    }

    if (step === 'edit') {
      setErrorMessage('');
      setStep('publish');
    }
  };

  const previousStep = () => {
    if (uploading) return;

    if (step === 'audio') setStep('media');
    else if (step === 'edit') setStep('audio');
    else if (step === 'publish') setStep('edit');
  };

  const setVideoTime = value => {
    const time = Number(value);
    setCurrentTime(time);

    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }

    if (editorVideoRef.current) {
      editorVideoRef.current.currentTime = time;
    }
  };

  const toggleVideoPlayback = async () => {
    const video = editorVideoRef.current || videoRef.current;

    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
        setIsVideoPlaying(true);
      } else {
        video.pause();
        setIsVideoPlaying(false);
      }
    } catch {}
  };

  const handleVideoTimeUpdate = event => {
    const time = event.currentTarget.currentTime || 0;
    setCurrentTime(time);

    if (step === 'media') {
      setThumbScrubTime(time);
    }
  };

  const handleVideoLoadedMetadata = event => {
    const video = event.currentTarget;
    setVideoDuration(video.duration || 0);

    if (!videoMetadata.width || !videoMetadata.height) {
      setVideoMetadata(previous => ({
        ...previous,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration || 0
      }));
    }
  };

  const selectPrivacy = id => {
    setPrivacy(id);
  };

  const renderPreview = (compact = false) => (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-[28px] bg-black ${compact ? 'h-full w-full' : 'aspect-[9/16] w-full max-w-[430px]'}`}>
      {videoPreview ? (
        <>
          <video
            ref={compact ? editorVideoRef : videoRef}
            src={videoPreview}
            className="h-full w-full object-contain"
            style={{ filter: selectedFilterObject.css }}
            playsInline
            preload="metadata"
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onEnded={() => setIsVideoPlaying(false)}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <div className="rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </div>

            {selectedMusic && (
              <div className="flex max-w-[55%] items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
                <Music size={12} />
                <span className="truncate">{selectedMusic.title}</span>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5 pt-14">
            <button
              type="button"
              onClick={toggleVideoPlayback}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105"
            >
              {isVideoPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
            </button>

            <input
              type="range"
              min="0"
              max={videoDuration || 0}
              step="0.01"
              value={Math.min(currentTime, videoDuration || 0)}
              onChange={event => setVideoTime(event.target.value)}
              className="w-full accent-white"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 px-8 text-center text-white/60">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
            <Film size={28} />
          </div>
          <div>
            <p className="font-semibold text-white">Your preview appears here</p>
            <p className="mt-1 text-sm">Choose a video or record one with your camera.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderMediaStep = () => (
    <div className="space-y-5">
      {!videoFile ? (
        <>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setIngestMode('dropzone')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${ingestMode === 'dropzone' ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setIngestMode('camera');
                setShowCamera(true);
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${ingestMode === 'camera' ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}
            >
              Camera
            </button>
          </div>

          <div
            onDragOver={event => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group cursor-pointer rounded-[28px] border border-dashed p-8 text-center transition md:p-12 ${
              isDragging
                ? 'border-white bg-white/10'
                : 'border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.05]'
            }`}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 transition group-hover:scale-105">
              <UploadCloud size={29} />
            </div>

            <h3 className="mt-5 text-lg font-bold">Drop your video here</h3>
            <p className="mt-2 text-sm text-white/45">
              MP4, WebM, MOV and other browser-supported video formats
            </p>

            <div className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">
              Choose video
            </div>

            <p className="mt-4 text-xs text-white/30">Maximum file size: 1 GB</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [Zap, 'Fast upload', 'Direct storage upload'],
              [Music, 'Audio mixing', 'Embed music into MP4'],
              [ShieldCheck, 'Secure storage', 'Private B2 media']
            ].map(([Icon, title, description]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <Icon size={18} className="text-white/80" />
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/35">{description}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Film size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{videoFile.name}</p>
                  <p className="mt-0.5 text-xs text-white/35">
                    {(videoFile.size / 1024 / 1024).toFixed(1)} MB · {formatTime(videoDuration)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={removeVideo}
                className="grid h-9 w-9 place-items-center rounded-xl text-white/45 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="p-3">
              {renderPreview()}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(previous => !previous)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-4"
          >
            <span className="flex items-center gap-3">
              <SlidersHorizontal size={18} />
              <span>
                <span className="block text-left text-sm font-semibold">Visual filter</span>
                <span className="block text-left text-xs text-white/35">{selectedFilterObject.name}</span>
              </span>
            </span>
            <ChevronRight size={17} className={`transition ${showFilters ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FILTERS.map(filter => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedFilter(filter.id)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selectedFilter === filter.id
                          ? 'border-white bg-white text-black'
                          : 'border-white/8 bg-white/[0.025] hover:border-white/20'
                      }`}
                    >
                      <div
                        className="mb-3 aspect-video overflow-hidden rounded-xl bg-neutral-900"
                        style={{ filter: filter.css }}
                      >
                        {videoPreview && (
                          <video
                            src={videoPreview}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <p className="text-xs font-semibold">{filter.name}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => {
              setShowCamera(true);
              setIngestMode('camera');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3.5 text-sm font-semibold transition hover:bg-white/[0.06]"
          >
            <Camera size={17} />
            Record another video
          </button>
        </div>
      )}
    </div>
  );

  const renderAudioStep = () => (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Audio mix</p>
            <p className="mt-1 text-xs leading-5 text-white/40">
              Your selected online track will be mixed into the final MP4 on the server.
            </p>
          </div>
          <div className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            Embedded
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-white/55">Original video audio</span>
              <span className="font-semibold">{videoVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={videoVolume}
              onChange={event => setVideoVolume(Number(event.target.value))}
              className="w-full accent-white"
            />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-white/55">Music volume</span>
              <span className="font-semibold">{musicVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={musicVolume}
              onChange={event => setMusicVolume(Number(event.target.value))}
              className="w-full accent-white"
            />
          </div>
        </div>
      </div>

      {selectedMusic ? (
        <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-4">
            {selectedMusic.artwork ? (
              <img
                src={selectedMusic.artwork}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                <Music size={24} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{selectedMusic.title}</p>
              <p className="mt-1 truncate text-sm text-white/40">{selectedMusic.artist}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-white/25">
                Online preview · {selectedMusic.source}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleTrackPreview(selectedMusic)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black"
            >
              {playingTrackUrl === selectedMusic.previewUrl
                ? <Pause size={16} />
                : <Play size={16} fill="currentColor" />}
            </button>

            <button
              type="button"
              onClick={clearMusic}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/45 hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/5 px-3 py-2.5 text-xs text-emerald-200/75">
            <CheckCircle2 size={15} />
            This audio is sent to the backend for final video mixing.
          </div>
        </div>
      ) : (
        <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <Music size={25} className="mx-auto text-white/40" />
          <p className="mt-3 text-sm font-semibold">No music selected</p>
          <p className="mt-1 text-xs text-white/35">
            Your original video audio will be preserved.
          </p>
        </div>
      )}

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
            <Search size={17} />
          </div>
          <div>
            <p className="text-sm font-bold">Find online music</p>
            <p className="text-xs text-white/35">Search available previews</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') searchMusic();
              }}
              placeholder="Search song or artist"
              className="h-11 w-full rounded-xl border border-white/8 bg-black/20 pl-10 pr-3 text-sm outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>

          <button
            type="button"
            onClick={searchMusic}
            disabled={isSearching}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-black disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
          </button>
        </div>

        {musicError && (
          <div className="mt-3 flex gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{musicError}</span>
          </div>
        )}

        <div className="mt-4 max-h-[390px] space-y-2 overflow-y-auto pr-1">
          {searchResults.map(track => (
            <div
              key={track.id}
              className="flex items-center gap-3 rounded-2xl border border-white/6 bg-black/15 p-3 transition hover:border-white/15"
            >
              {track.artwork ? (
                <img
                  src={track.artwork}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10">
                  <Music size={17} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{track.title}</p>
                <p className="mt-0.5 truncate text-xs text-white/40">{track.artist}</p>
              </div>

              <button
                type="button"
                onClick={() => toggleTrackPreview(track)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/8 text-white/70 hover:bg-white/15 hover:text-white"
              >
                {playingTrackUrl === track.previewUrl
                  ? <Pause size={14} />
                  : <Play size={14} />}
              </button>

              <button
                type="button"
                onClick={() => chooseMusic(track)}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black"
              >
                Add
              </button>
            </div>
          ))}

          {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="py-8 text-center text-xs text-white/30">
              No playable previews found.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="mb-4 flex items-center gap-3">
          <SlidersHorizontal size={18} />
          <div>
            <p className="text-sm font-bold">Audio enhancement</p>
            <p className="text-xs text-white/35">Applied during final encoding</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {AUDIO_ENHANCEMENTS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAudioEnhancement(item.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                audioEnhancement === item.id
                  ? 'border-white bg-white text-black'
                  : 'border-white/8 bg-black/15 hover:border-white/20'
              }`}
            >
              <p className="text-xs font-bold">{item.name}</p>
              <p className={`mt-1 text-[10px] leading-4 ${audioEnhancement === item.id ? 'text-black/55' : 'text-white/35'}`}>
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Video cover</p>
            <p className="mt-1 text-xs text-white/35">Choose what appears before playback.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowThumbnailEditor(previous => !previous)}
            className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold hover:bg-white/15"
          >
            {showThumbnailEditor ? 'Close' : 'Edit'}
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-black">
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Video cover" className="h-full w-full object-cover" />
            ) : videoPreview ? (
              <video
                src={videoPreview}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                style={{ filter: selectedFilterObject.css }}
              />
            ) : (
              <div className="grid h-full place-items-center">
                <ImageIcon size={25} className="text-white/25" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <input
              value={coverText}
              onChange={event => setCoverText(event.target.value)}
              placeholder="Optional cover text"
              maxLength={80}
              className="h-11 w-full rounded-xl border border-white/8 bg-black/20 px-3 text-sm outline-none placeholder:text-white/25 focus:border-white/25"
            />

            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailFile}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generateCurrentThumbnail}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-black"
              >
                <Sparkles size={14} />
                Generate cover
              </button>

              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2.5 text-xs font-semibold hover:bg-white/15"
              >
                <ImageIcon size={14} />
                Use image
              </button>
            </div>

            {showThumbnailEditor && (
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="mb-2 flex justify-between text-[11px] text-white/40">
                  <span>Frame position</span>
                  <span>{formatTime(thumbScrubTime)}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={videoDuration || 0}
                  step="0.01"
                  value={Math.min(thumbScrubTime, videoDuration || 0)}
                  onChange={event => setThumbScrubTime(Number(event.target.value))}
                  className="w-full accent-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Chapters</p>
            <p className="mt-1 text-xs text-white/35">Optional timestamps for longer videos.</p>
          </div>

          <button
            type="button"
            onClick={addChapter}
            className="flex items-center gap-2 rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold hover:bg-white/15"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {chapters.length ? (
          <div className="space-y-2">
            {chapters.map(chapter => (
              <div key={chapter.id} className="flex items-center gap-2 rounded-xl bg-black/20 p-2">
                <input
                  type="number"
                  min="0"
                  max={videoDuration}
                  step="1"
                  value={Math.round(chapter.time)}
                  onChange={event => updateChapter(chapter.id, 'time', Number(event.target.value))}
                  className="w-20 rounded-lg bg-white/8 px-2 py-2 text-xs outline-none"
                />

                <input
                  value={chapter.title}
                  onChange={event => updateChapter(chapter.id, 'title', event.target.value)}
                  className="min-w-0 flex-1 rounded-lg bg-white/8 px-2 py-2 text-xs outline-none"
                />

                <button
                  type="button"
                  onClick={() => removeChapter(chapter.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-black/15 p-4 text-center text-xs text-white/30">
            No chapters added.
          </div>
        )}
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <button
          type="button"
          onClick={() => setShowAdvanced(previous => !previous)}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-3">
            <Settings2 size={18} />
            <span className="text-sm font-bold">Advanced options</span>
          </span>
          <ChevronRight size={17} className={`transition ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 space-y-5 border-t border-white/8 pt-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/55">
                    Subtitles / captions
                  </label>
                  <textarea
                    value={subtitles}
                    onChange={event => setSubtitles(event.target.value)}
                    rows={4}
                    placeholder="Optional subtitle text or caption data"
                    className="w-full resize-none rounded-xl border border-white/8 bg-black/20 p-3 text-sm outline-none placeholder:text-white/25 focus:border-white/25"
                  />
                </div>

                <div className="rounded-2xl bg-black/15 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Interactive poll</p>
                      <p className="mt-1 text-xs text-white/35">Add a poll to the post.</p>
                    </div>

                    {pollData ? (
                      <button
                        type="button"
                        onClick={() => setPollData(null)}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={addPoll}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black"
                      >
                        Add poll
                      </button>
                    )}
                  </div>

                  {pollData && (
                    <div className="mt-4 space-y-2">
                      <input
                        value={pollData.question}
                        onChange={event => setPollData(previous => ({
                          ...previous,
                          question: event.target.value
                        }))}
                        placeholder="Poll question"
                        className="h-10 w-full rounded-xl bg-white/8 px-3 text-xs outline-none"
                      />

                      {pollData.options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={option}
                            onChange={event => updatePollOption(index, event.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="h-10 min-w-0 flex-1 rounded-xl bg-white/8 px-3 text-xs outline-none"
                          />
                          {pollData.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removePollOption(index)}
                              className="grid h-10 w-10 place-items-center rounded-xl bg-white/8"
                            >
                              <Minus size={14} />
                            </button>
                          )}
                        </div>
                      ))}

                      {pollData.options.length < 4 && (
                        <button
                          type="button"
                          onClick={addPollOption}
                          className="text-xs font-semibold text-white/55 hover:text-white"
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Allow downloads', allowDownload, setAllowDownload, Download],
                    ['Allow Duet', allowDuet, setAllowDuet, Users],
                    ['Allow Stitch', allowStitch, setAllowStitch, Layers],
                    ['Age restricted', ageRestricted, setAgeRestricted, ShieldCheck]
                  ].map(([label, value, setter, Icon]) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setter(previous => !previous)}
                      className="flex items-center justify-between rounded-xl bg-black/15 p-3"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold">
                        <Icon size={15} />
                        {label}
                      </span>

                      <span className={`h-5 w-9 rounded-full p-0.5 transition ${value ? 'bg-white' : 'bg-white/15'}`}>
                        <span className={`block h-4 w-4 rounded-full transition ${value ? 'translate-x-4 bg-black' : 'bg-white/45'}`} />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-black/15 p-3">
                  <div>
                    <p className="text-xs font-semibold">Commercial content</p>
                    <p className="mt-1 text-[10px] text-white/30">Declare sponsored content.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCommercialContent(previous => !previous)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${commercialContent ? 'bg-white text-black' : 'bg-white/8 text-white/45'}`}
                  >
                    {commercialContent ? 'Enabled' : 'Off'}
                  </button>
                </div>

                {commercialContent && (
                  <input
                    value={sponsorTag}
                    onChange={event => setSponsorTag(event.target.value)}
                    placeholder="Sponsor or brand name"
                    className="h-11 w-full rounded-xl bg-black/20 px-3 text-sm outline-none"
                  />
                )}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/55">
                    Product link
                  </label>
                  <input
                    value={productLink}
                    onChange={event => setProductLink(event.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl bg-black/20 px-3 text-sm outline-none placeholder:text-white/25"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderPublishStep = () => (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center gap-3">
          <MessageCircle size={18} />
          <div>
            <p className="text-sm font-bold">Caption</p>
            <p className="text-xs text-white/35">Tell people what your video is about.</p>
          </div>
        </div>

        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          rows={6}
          maxLength={2200}
          placeholder="Write a caption… #MadeUniverse"
          className="mt-4 w-full resize-none rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-white/25"
        />

        <div className="mt-2 flex justify-between text-[10px] text-white/25">
          <span>
            {parseTags(caption).length} hashtags · {parseMentions(caption).length} mentions
          </span>
          <span>{caption.length}/2200</span>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="mb-4 flex items-center gap-3">
          <Globe2 size={18} />
          <div>
            <p className="text-sm font-bold">Audience</p>
            <p className="text-xs text-white/35">Choose who can see your post.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {PRIVACY_OPTIONS.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPrivacy(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  privacy === item.id
                    ? 'border-white bg-white text-black'
                    : 'border-white/8 bg-black/15 hover:border-white/20'
                }`}
              >
                <Icon size={18} />
                <p className="mt-3 text-xs font-bold">{item.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/55">
            <Hash size={15} />
            Category
          </label>

          <select
            value={category}
            onChange={event => setCategory(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/8 bg-black/20 px-3 text-sm outline-none"
          >
            {CATEGORIES.map(item => (
              <option key={item} value={item} className="bg-neutral-900">
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
          <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/55">
            <MapPin size={15} />
            Location
          </label>

          <input
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="Optional location"
            className="h-11 w-full rounded-xl border border-white/8 bg-black/20 px-3 text-sm outline-none placeholder:text-white/25"
          />
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Comments</p>
            <p className="mt-1 text-xs text-white/35">Allow people to comment on this post.</p>
          </div>

          <button
            type="button"
            onClick={() => setCommentsEnabled(previous => !previous)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${commentsEnabled ? 'bg-white text-black' : 'bg-white/8 text-white/45'}`}
          >
            {commentsEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center gap-3">
          <Clock3 size={18} />
          <div>
            <p className="text-sm font-bold">Publishing</p>
            <p className="text-xs text-white/35">Publish now or schedule it.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/15 p-4">
          <div>
            <p className="text-xs font-semibold">Schedule post</p>
            <p className="mt-1 text-[10px] text-white/30">
              {isScheduled ? 'The video will publish later.' : 'Publish immediately.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsScheduled(previous => !previous)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${isScheduled ? 'bg-white text-black' : 'bg-white/8 text-white/45'}`}
          >
            {isScheduled ? 'Scheduled' : 'Now'}
          </button>
        </div>

        {isScheduled && (
          <input
            type="datetime-local"
            value={scheduledAt}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            onChange={event => setScheduledAt(event.target.value)}
            className="mt-3 h-11 w-full rounded-xl border border-white/8 bg-black/20 px-3 text-sm outline-none"
          />
        )}
      </div>

      <div className="rounded-[26px] border border-emerald-400/10 bg-emerald-400/[0.035] p-5">
        <div className="flex gap-3">
          <ShieldCheck size={20} className="shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-bold text-emerald-100">Ready to publish</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/50">
              Your source is uploaded directly to secure storage. If music is selected,
              the backend creates one final MP4 with the audio embedded before publishing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCameraModal = () => {
    if (!showCamera) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
        <div className="relative flex h-[min(850px,94vh)] w-full max-w-[480px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-neutral-950 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-bold">Record video</p>
              <p className="mt-1 text-[10px] text-white/35">Your recording will be converted during publishing.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (recording) stopRecording();
                setShowCamera(false);
              }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/8"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 bg-black">
            <video
              ref={cameraVideoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            {!cameraReady && (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 size={30} className="animate-spin text-white/40" />
              </div>
            )}

            {recording && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                {formatTime(recordingSeconds)}
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black via-black/60 to-transparent p-5 pt-20">
              <button
                type="button"
                onClick={toggleCameraMute}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10"
              >
                {cameraMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`grid h-20 w-20 place-items-center rounded-full border-[5px] ${
                  recording ? 'border-red-400 bg-red-500' : 'border-white bg-white/15'
                }`}
              >
                {recording ? <span className="h-7 w-7 rounded-md bg-white" /> : <div className="h-14 w-14 rounded-full bg-red-500" />}
              </button>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-3 backdrop-blur-xl sm:p-5">
        <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1400px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b0d] shadow-2xl sm:min-h-[calc(100vh-40px)]">
          <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {step !== 'media' && !uploading && (
                <button
                  type="button"
                  onClick={previousStep}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/6 hover:bg-white/10"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={17} />
                  <h1 className="text-base font-bold">Create</h1>
                </div>
                <p className="mt-0.5 text-[10px] text-white/30">
                  {step === 'media' && 'Add your video'}
                  {step === 'audio' && 'Build your sound'}
                  {step === 'edit' && 'Polish your post'}
                  {step === 'publish' && 'Publish to Made Universe'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/6 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <X size={18} />
            </button>
          </header>

          <div className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center justify-center gap-1 sm:gap-3">
              {[
                ['media', 'Media'],
                ['audio', 'Sound'],
                ['edit', 'Edit'],
                ['publish', 'Publish']
              ].map(([id, label], index) => {
                const active = step === id;
                const completed = progressStep > index + 1;

                return (
                  <React.Fragment key={id}>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        if (completed) setStep(id);
                      }}
                      className={`flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition sm:px-4 ${
                        active
                          ? 'bg-white text-black'
                          : completed
                            ? 'bg-white/10 text-white'
                            : 'text-white/30'
                      }`}
                    >
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-black/10">
                        {completed ? <Check size={12} /> : index + 1}
                      </span>
                      <span className="hidden sm:block">{label}</span>
                    </button>

                    {index < 3 && (
                      <div className={`h-px w-5 sm:w-10 ${completed ? 'bg-white/35' : 'bg-white/8'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(360px,0.85fr)_minmax(500px,1.15fr)]">
            <section className="hidden min-h-0 border-r border-white/8 bg-[#070709] p-5 lg:flex lg:flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div className="w-full max-w-[420px]">
                  {renderPreview()}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/[0.035] p-3">
                  <p className="text-[10px] text-white/30">Duration</p>
                  <p className="mt-1 text-sm font-bold">{formatTime(videoDuration)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.035] p-3">
                  <p className="text-[10px] text-white/30">Format</p>
                  <p className="mt-1 truncate text-sm font-bold">
                    {videoFile ? getExtension(videoFile.name, videoFile.type).toUpperCase() : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.035] p-3">
                  <p className="text-[10px] text-white/30">Audio</p>
                  <p className="mt-1 truncate text-sm font-bold">
                    {selectedMusic ? 'Mixed' : 'Original'}
                  </p>
                </div>
              </div>
            </section>

            <section className="min-h-0 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
                <div className="mb-5 lg:hidden">
                  <div className="mx-auto max-w-[360px]">
                    {renderPreview()}
                  </div>
                </div>

                {!networkOnline && (
                  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-3 text-xs text-yellow-100/75">
                    <AlertCircle size={16} />
                    You are offline. Publishing is disabled until the connection returns.
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/10 bg-red-500/8 p-3.5 text-xs text-red-100/80">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage('')}
                      className="ml-auto text-red-100/40 hover:text-red-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {step === 'media' && renderMediaStep()}
                {step === 'audio' && renderAudioStep()}
                {step === 'edit' && renderEditStep()}
                {step === 'publish' && renderPublishStep()}
              </div>
            </section>
          </main>

          <footer className="shrink-0 border-t border-white/8 bg-[#0b0b0d] px-4 py-3 sm:px-6">
            {uploading ? (
              <div className="mx-auto flex max-w-3xl items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 font-semibold">
                      <Loader2 size={13} className="animate-spin" />
                      {uploadStage || 'Processing'}
                    </span>
                    <span className="text-white/45">{uploadProgress}%</span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>

                  <p className="mt-2 truncate text-[10px] text-white/30">
                    {statusMessage}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <div className="hidden text-[10px] text-white/25 sm:block">
                  {step === 'publish'
                    ? 'Review your settings before publishing.'
                    : 'Your changes are saved locally while creating.'}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {step !== 'media' && (
                    <button
                      type="button"
                      onClick={previousStep}
                      className="flex items-center gap-2 rounded-xl bg-white/7 px-4 py-2.5 text-xs font-semibold hover:bg-white/12"
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  )}

                  {step !== 'publish' ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={step === 'media' && !videoFile}
                      className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Continue
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading || !videoFile || !networkOnline}
                      className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {isScheduled ? <Clock3 size={14} /> : <Send size={14} />}
                      {isScheduled ? 'Schedule video' : 'Publish video'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </footer>
        </div>
      </div>

      {renderCameraModal()}
    </>
  );
};

export default Upload;
