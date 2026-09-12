import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Film,
  Globe2,
  Hash,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Lock,
  MapPin,
  Mic,
  Mic2,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap
} from 'lucide-react';

const API_BASE = 'https://mpade-backend.onrender.com';

const STEPS = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'sound', label: 'Sound', icon: Music },
  { id: 'edit', label: 'Edit', icon: Wand2 },
  { id: 'publish', label: 'Publish', icon: Send }
];

const FILTERS = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'neon_cyber', name: 'Neon', css: 'saturate(1.35) contrast(1.15) hue-rotate(12deg)' },
  { id: 'electric', name: 'Electric', css: 'saturate(1.5) contrast(1.2) brightness(1.05)' },
  { id: 'cinema', name: 'Cinema', css: 'contrast(1.12) saturate(0.88) brightness(0.96)' },
  { id: 'golden_hour', name: 'Golden', css: 'sepia(.18) saturate(1.3) contrast(1.05) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(.35) saturate(.8) contrast(1.05)' },
  { id: 'midnight', name: 'Midnight', css: 'brightness(.78) contrast(1.2) saturate(.9)' },
  { id: 'vibrant_pop', name: 'Vibrant', css: 'saturate(1.65) contrast(1.1)' }
];

const CATEGORIES = [
  'Entertainment',
  'Music',
  'Comedy',
  'Education',
  'Technology',
  'Gaming',
  'Sports',
  'Lifestyle',
  'Fashion',
  'Food',
  'Travel',
  'News',
  'Art',
  'Business',
  'Other'
];

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Everyone', description: 'Anyone can discover this video', icon: Globe2 },
  { value: 'followers', label: 'Followers', description: 'Only people who follow you', icon: Users },
  { value: 'private', label: 'Only me', description: 'Only you can view this video', icon: Lock }
];

const AUDIO_ENHANCEMENTS = [
  { id: 'none', name: 'Original', description: 'Keep the original sound' },
  { id: 'crystal_voice', name: 'Clear Voice', description: 'Improve voice clarity' },
  { id: 'studio_master', name: 'Studio', description: 'Balanced loudness and clarity' },
  { id: 'bass_boost', name: 'Bass Boost', description: 'Add low-end depth' }
];

const AI_HOOKS = [
  'Watch until the end 👀',
  'You need to see this 🔥',
  'Wait for it...',
  'This changed everything.',
  'Malawi, what do you think? 🇲🇼',
  'Would you try this?'
];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getExtension = (fileName = '', fallback = 'mp4') => {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || fallback;
};

const formatBytes = bytes => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return '00:00';
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
  }

  return payload;
};

const uploadToB2 = ({ uploadUrl, file, onProgress }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Media upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading media.'));
    xhr.ontimeout = () => reject(new Error('Media upload timed out.'));
    xhr.timeout = 30 * 60 * 1000;
    xhr.send(file);
  });

const generateVideoThumbnail = (file, time = 0) =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const targetTime = Math.min(Math.max(0, time), Math.max(0, video.duration || 0));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = Math.min(video.videoWidth || 720, 1280);
        const height = Math.round(width * ((video.videoHeight || 1280) / (video.videoWidth || 720)));

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d', { alpha: false });
        context.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('Could not create thumbnail.'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          0.86
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video for thumbnail.'));
    };

    video.src = url;
  });

const normalizeMusicResult = track => ({
  id: track.trackId || track.collectionId || createId(),
  name: track.trackName || 'Unknown track',
  artist: track.artistName || 'Unknown artist',
  album: track.collectionName || '',
  artwork: track.artworkUrl100 || track.artworkUrl60 || '',
  url: track.previewUrl || '',
  source: 'itunes'
});

function Upload({ onComplete, onClose }) {
  const [step, setStep] = useState('media');
  const [ingestMode, setIngestMode] = useState('dropzone');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoMetadata, setVideoMetadata] = useState({
    width: 0,
    height: 0,
    duration: 0,
    size: 0
  });

  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailTime, setThumbnailTime] = useState(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [selectedMusic, setSelectedMusic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);

  const [videoVolume, setVideoVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(70);
  const [audioEnhancement, setAudioEnhancement] = useState('none');
  const [musicLoop, setMusicLoop] = useState(true);

  const [selectedFilter, setSelectedFilter] = useState(
    () => localStorage.getItem('made_universe_upload_filter') || 'original'
  );

  const [coverText, setCoverText] = useState('');
  const [coverBadgeStyle, setCoverBadgeStyle] = useState('clean');

  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [privacy, setPrivacy] = useState('public');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionInput, setMentionInput] = useState('');

  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [ageRestricted, setAgeRestricted] = useState(false);

  const [commercialContent, setCommercialContent] = useState(false);
  const [sponsorTag, setSponsorTag] = useState('');

  const [pollData, setPollData] = useState({
    enabled: false,
    question: '',
    options: ['', '']
  });

  const [productLink, setProductLink] = useState('');
  const [chapters, setChapters] = useState([]);
  const [subtitles, setSubtitles] = useState('');
  const [hookText, setHookText] = useState('');

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [cameraMuted, setCameraMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [isDragging, setIsDragging] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [showProductEditor, setShowProductEditor] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const musicAudioRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const selectedFilterData = useMemo(
    () => FILTERS.find(item => item.id === selectedFilter) || FILTERS[0],
    [selectedFilter]
  );

  const currentStepIndex = STEPS.findIndex(item => item.id === step);

  const registerObjectUrl = useCallback(url => {
    if (url) objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectUrl = useCallback(url => {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('made_universe_upload_filter', selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    if (!videoPreview || !videoRef.current) return;

    videoRef.current.load();
    setCurrentTime(0);
    setIsPlaying(false);
  }, [videoPreview]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = videoVolume / 100;
  }, [videoVolume]);

  useEffect(() => {
    if (!musicAudioRef.current) return;
    musicAudioRef.current.volume = musicVolume / 100;
  }, [musicVolume]);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraActive(false);
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

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !cameraMuted;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
    } catch (error) {
      setUploadError(error?.message || 'Camera permission was denied or unavailable.');
    }
  }, [cameraFacing, cameraMuted, stopCamera]);

  useEffect(() => {
    if (ingestMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [ingestMode, startCamera, stopCamera]);

  const toggleCameraMute = () => {
    const stream = cameraStreamRef.current;
    const track = stream?.getAudioTracks?.()[0];

    if (track) {
      track.enabled = cameraMuted;
    }

    setCameraMuted(value => !value);
  };

  const switchCamera = async () => {
    setCameraFacing(value => (value === 'user' ? 'environment' : 'user'));
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecording(false);
  }, []);

  const startRecording = () => {
    const stream = cameraStreamRef.current;

    if (!stream) {
      setUploadError('Camera is not ready.');
      return;
    }

    recordedChunksRef.current = [];

    let mimeType = 'video/webm;codecs=vp9,opus';

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_500_000,
        audioBitsPerSecond: 128_000
      });

      recorder.ondataavailable = event => {
        if (event.data?.size) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = event => {
        setUploadError(event.error?.message || 'Camera recording failed.');
        setRecording(false);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mimeType
        });

        if (!blob.size) {
          setUploadError('The recording was empty.');
          return;
        }

        const file = new File(
          [blob],
          `made-universe-${Date.now()}.webm`,
          { type: mimeType }
        );

        handleVideoFile(file);
        setIngestMode('dropzone');
        setStep('media');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      setRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(seconds => seconds + 1);
      }, 1000);
    } catch (error) {
      setUploadError(error?.message || 'Unable to start recording.');
    }
  };

  const handleVideoFile = async file => {
    if (!file) return;

    setUploadError('');

    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file.');
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      setUploadError('Video is larger than the 1 GB upload limit.');
      return;
    }

    if (videoPreview) revokeObjectUrl(videoPreview);
    if (thumbnailPreview) revokeObjectUrl(thumbnailPreview);

    const previewUrl = registerObjectUrl(URL.createObjectURL(file));

    setVideoFile(file);
    setVideoPreview(previewUrl);
    setThumbnailBlob(null);
    setThumbnailPreview('');
    setCurrentTime(0);

    const metadataVideo = document.createElement('video');
    const metadataUrl = URL.createObjectURL(file);

    metadataVideo.preload = 'metadata';

    metadataVideo.onloadedmetadata = async () => {
      const metadata = {
        width: metadataVideo.videoWidth || 0,
        height: metadataVideo.videoHeight || 0,
        duration: Number.isFinite(metadataVideo.duration) ? metadataVideo.duration : 0,
        size: file.size
      };

      setVideoMetadata(metadata);

      try {
        const thumbnail = await generateVideoThumbnail(file, 0);
        const thumbnailUrl = registerObjectUrl(URL.createObjectURL(thumbnail));

        setThumbnailBlob(thumbnail);
        setThumbnailPreview(thumbnailUrl);
      } catch {
        setThumbnailBlob(null);
        setThumbnailPreview('');
      }

      URL.revokeObjectURL(metadataUrl);
    };

    metadataVideo.onerror = () => {
      URL.revokeObjectURL(metadataUrl);
      setUploadError('Could not read the selected video.');
    };

    metadataVideo.src = metadataUrl;
  };

  const handleFileInput = event => {
    const file = event.target.files?.[0];
    if (file) handleVideoFile(file);
    event.target.value = '';
  };

  const handleDrop = event => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleVideoFile(file);
  };

  const clearVideo = () => {
    if (videoPreview) revokeObjectUrl(videoPreview);
    if (thumbnailPreview) revokeObjectUrl(thumbnailPreview);

    setVideoFile(null);
    setVideoPreview('');
    setThumbnailBlob(null);
    setThumbnailPreview('');
    setVideoMetadata({
      width: 0,
      height: 0,
      duration: 0,
      size: 0
    });
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const togglePreview = async () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      await videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const seekVideo = event => {
    const value = Number(event.target.value);
    if (!videoRef.current) return;

    videoRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const updateThumbnail = async time => {
    if (!videoFile) return;

    try {
      const blob = await generateVideoThumbnail(videoFile, time);
      const nextUrl = registerObjectUrl(URL.createObjectURL(blob));

      if (thumbnailPreview) revokeObjectUrl(thumbnailPreview);

      setThumbnailBlob(blob);
      setThumbnailPreview(nextUrl);
      setThumbnailTime(time);
    } catch {
      setUploadError('Could not generate the selected cover image.');
    }
  };

  const searchMusic = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`
      );

      if (!response.ok) {
        throw new Error('Music search failed.');
      }

      const data = await response.json();

      setSearchResults(
        (data.results || [])
          .filter(track => track.previewUrl)
          .map(normalizeMusicResult)
      );
    } catch (error) {
      setUploadError(error?.message || 'Unable to search music right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const previewMusic = track => {
    if (!track?.url) return;

    if (playingTrackId === track.id) {
      musicAudioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    if (!musicAudioRef.current) {
      musicAudioRef.current = new Audio();
    }

    const audio = musicAudioRef.current;
    audio.src = track.url;
    audio.volume = musicVolume / 100;
    audio.currentTime = 0;

    audio.onended = () => setPlayingTrackId(null);

    audio.play()
      .then(() => setPlayingTrackId(track.id))
      .catch(() => {
        setUploadError('This music preview could not be played.');
        setPlayingTrackId(null);
      });
  };

  const selectMusic = track => {
    setSelectedMusic(track);
    setPlayingTrackId(null);

    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
  };

  const removeMusic = () => {
    setSelectedMusic(null);

    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.src = '';
    }

    setPlayingTrackId(null);
  };

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '');

    if (!value || tags.includes(value)) return;

    setTags(current => [...current, value]);
    setTagInput('');
  };

  const removeTag = tag => {
    setTags(current => current.filter(item => item !== tag));
  };

  const addMention = () => {
    const value = mentionInput.trim().replace(/^@/, '');

    if (!value || mentions.includes(value)) return;

    setMentions(current => [...current, value]);
    setMentionInput('');
  };

  const removeMention = mention => {
    setMentions(current => current.filter(item => item !== mention));
  };

  const addChapter = () => {
    const nextTime = Math.floor(currentTime);

    if (chapters.some(item => Math.abs(item.time - nextTime) < 2)) return;

    setChapters(current => [
      ...current,
      {
        id: createId(),
        time: nextTime,
        title: `Chapter ${current.length + 1}`
      }
    ].sort((a, b) => a.time - b.time));
  };

  const removeChapter = id => {
    setChapters(current => current.filter(item => item.id !== id));
  };

  const updateChapter = (id, title) => {
    setChapters(current =>
      current.map(item => item.id === id ? { ...item, title } : item)
    );
  };

  const applyHook = hook => {
    setHookText(hook);
    setCaption(current => current ? `${hook}\n${current}` : hook);
  };

  const addPollOption = () => {
    if (pollData.options.length >= 4) return;

    setPollData(current => ({
      ...current,
      options: [...current.options, '']
    }));
  };

  const removePollOption = index => {
    if (pollData.options.length <= 2) return;

    setPollData(current => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index)
    }));
  };

  const updatePollOption = (index, value) => {
    setPollData(current => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    }));
  };

  const validateBeforePublish = () => {
    if (!videoFile) {
      setUploadError('Add a video before publishing.');
      setStep('media');
      return false;
    }

    if (!caption.trim()) {
      setUploadError('Add a caption so people know what your video is about.');
      setStep('publish');
      return false;
    }

    if (pollData.enabled) {
      const validOptions = pollData.options.filter(option => option.trim());

      if (!pollData.question.trim() || validOptions.length < 2) {
        setUploadError('Complete the poll question and at least two options.');
        setStep('edit');
        return false;
      }
    }

    return true;
  };

  const uploadThumbnail = async () => {
    if (!thumbnailBlob) return null;

    const fileName = `cover-${Date.now()}.jpg`;

    const signed = await apiRequest('/api/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        folder: 'covers',
        fileName,
        contentType: 'image/jpeg',
        fileSize: thumbnailBlob.size
      })
    });

    const thumbnailFile = new File([thumbnailBlob], fileName, {
      type: 'image/jpeg'
    });

    await uploadToB2({
      uploadUrl: signed.uploadUrl,
      file: thumbnailFile,
      onProgress: () => {}
    });

    return signed.objectKey;
  };

  const uploadSourceVideo = async () => {
    const fileName = videoFile.name || `source-${Date.now()}.${getExtension(videoFile.name, 'webm')}`;

    const signed = await apiRequest('/api/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        folder: 'videos',
        fileName,
        contentType: videoFile.type || 'video/webm',
        fileSize: videoFile.size
      })
    });

    await uploadToB2({
      uploadUrl: signed.uploadUrl,
      file: videoFile,
      onProgress: progress => {
        setUploadProgress(Math.round(progress * 0.45));
      }
    });

    return signed.objectKey;
  };

  const processVideo = async sourceObjectKey => {
    setUploadStage(selectedMusic ? 'Mixing audio and encoding video' : 'Encoding video');
    setUploadProgress(48);

    const response = await apiRequest('/api/storage/merge-video', {
      method: 'POST',
      body: JSON.stringify({
        sourceObjectKey,
        audioUrl: selectedMusic?.url || null,
        videoVolume,
        musicVolume: selectedMusic ? musicVolume : 0,
        musicLoop,
        audioEnhancement,
        filter: selectedFilter,
        title: caption.slice(0, 100)
      })
    });

    setUploadProgress(80);

    if (!response?.objectKey) {
      throw new Error('The server did not return the final video.');
    }

    return response;
  };

  const insertVideoRecord = async ({
    finalObjectKey,
    thumbnailObjectKey,
    sourceObjectKey
  }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;

    const user = userData?.user;

    if (!user?.id) {
      throw new Error('Your account session is no longer available.');
    }

    const isPrivate = privacy === 'private';

    const basePayload = {
      video_url: finalObjectKey,
      caption: caption.trim(),
      music_name: selectedMusic?.name || null,
      music_url: selectedMusic?.url || null,
      user_id: user.id,
      is_private: isPrivate,
      views: 0,
      likes_count: 0,
      comments_count: 0
    };

    const extendedPayload = {
      ...basePayload,
      category,
      privacy,
      location: location.trim() || null,
      tags,
      mentions,
      thumbnail_url: thumbnailObjectKey,
      thumbnail_object_key: thumbnailObjectKey,
      video_object_key: finalObjectKey,
      source_object_key: sourceObjectKey,
      filter_style: selectedFilter,
      audio_enhancement: audioEnhancement,
      video_volume: videoVolume,
      music_volume: selectedMusic ? musicVolume : 0,
      allow_comments: allowComments,
      allow_download: allowDownload,
      allow_duet: allowDuet,
      allow_stitch: allowStitch,
      age_restricted: ageRestricted,
      commercial_content: commercialContent,
      sponsor_tag: sponsorTag.trim() || null,
      cover_text: coverText.trim() || null,
      cover_badge_style: coverBadgeStyle,
      subtitles: subtitles.trim() || null,
      chapters,
      poll_data: pollData.enabled
        ? {
            question: pollData.question.trim(),
            options: pollData.options.filter(option => option.trim())
          }
        : null,
      product_link: productLink.trim() || null,
      hook_text: hookText.trim() || null,
      scheduled_for: scheduleEnabled && scheduleDate ? scheduleDate : null
    };

    const firstInsert = await supabase
      .from('videos')
      .insert(extendedPayload)
      .select()
      .single();

    if (!firstInsert.error) {
      return firstInsert.data;
    }

    const fallback = await supabase
      .from('videos')
      .insert(basePayload)
      .select()
      .single();

    if (fallback.error) {
      throw fallback.error;
    }

    return fallback.data;
  };

  const handleUpload = async () => {
    if (uploading) return;
    if (!validateBeforePublish()) return;

    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    let sourceObjectKey = null;

    try {
      setUploadStage('Preparing upload');

      sourceObjectKey = await uploadSourceVideo();

      setUploadStage('Source uploaded');
      setUploadProgress(46);

      const finalVideo = await processVideo(sourceObjectKey);

      setUploadStage('Creating cover');
      setUploadProgress(84);

      const thumbnailObjectKey = await uploadThumbnail();

      setUploadStage('Publishing');
      setUploadProgress(92);

      const videoRecord = await insertVideoRecord({
        finalObjectKey: finalVideo.objectKey,
        thumbnailObjectKey,
        sourceObjectKey
      });

      setUploadStage('Published');
      setUploadProgress(100);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.7 }
      });

      onComplete?.(videoRecord);

      setTimeout(() => {
        if (onClose) onClose();
      }, 900);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error?.message || 'Upload failed. Please try again.');
      setUploadStage('');
    } finally {
      setUploading(false);
    }
  };

  const goNext = () => {
    setUploadError('');

    if (step === 'media' && !videoFile) {
      setUploadError('Add a video first.');
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      setStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    setUploadError('');

    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const closeUpload = () => {
    if (uploading) return;

    stopCamera();
    onClose?.();
  };

  const setPreviewPlaying = playing => {
    setIsPlaying(playing);
  };

  const duration = videoMetadata.duration || 0;
  const progressPercent = duration
    ? Math.min(100, (currentTime / duration) * 100)
    : 0;

  const renderPreview = () => (
    <div className="relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden rounded-[28px] bg-black">
      {videoPreview ? (
        <>
          <video
            ref={videoRef}
            src={videoPreview}
            className="h-full max-h-[720px] w-full object-contain"
            style={{ filter: selectedFilterData.css }}
            playsInline
            preload="metadata"
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setPreviewPlaying(true)}
            onPause={() => setPreviewPlaying(false)}
            onEnded={() => setPreviewPlaying(false)}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

          {hookText && (
            <div className="pointer-events-none absolute left-5 right-5 top-6">
              <div className="mx-auto w-fit max-w-full rounded-full bg-black/65 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur-md">
                {hookText}
              </div>
            </div>
          )}

          {coverText && (
            <div className="pointer-events-none absolute bottom-20 left-5 right-5">
              <div className="text-center text-2xl font-black text-white drop-shadow-lg">
                {coverText}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePreview}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/25"
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>

          {selectedMusic && (
            <div className="absolute left-4 top-4 flex max-w-[75%] items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs text-white backdrop-blur-xl">
              <Music size={13} />
              <span className="truncate">{selectedMusic.name}</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center px-8 text-center text-white/50">
          <Film size={48} strokeWidth={1.2} />
          <p className="mt-4 text-sm">Your video preview will appear here</p>
        </div>
      )}
    </div>
  );

  const renderMediaStep = () => (
    <div className="space-y-5">
      <SectionHeader
        icon={<Film size={18} />}
        title="Add your video"
        description="Upload an existing video or record one directly from your camera."
      />

      {!videoFile ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setIngestMode('dropzone');
              fileInputRef.current?.click();
            }}
            className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-left transition hover:border-white/20 hover:bg-white/[0.055]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <UploadCloud size={22} />
            </div>
            <h3 className="mt-5 text-lg font-bold">Upload video</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              MP4, WebM and other browser-supported video formats up to 1 GB.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75">
              Choose video <ArrowRight size={15} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIngestMode('camera')}
            className="group rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-left transition hover:border-white/20 hover:bg-white/[0.055]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Camera size={22} />
            </div>
            <h3 className="mt-5 text-lg font-bold">Record video</h3>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Use your camera and microphone. The recording is converted to MP4 during processing.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75">
              Open camera <ArrowRight size={15} />
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{videoFile.name}</p>
                <p className="mt-1 text-xs text-white/40">
                  {formatBytes(videoFile.size)} · {videoMetadata.width}×{videoMetadata.height} · {formatTime(videoMetadata.duration)}
                </p>
              </div>

              <button
                type="button"
                onClick={clearVideo}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/10"
              >
                <Trash2 size={14} />
                Replace
              </button>
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-3xl border transition ${
              isDragging ? 'border-white/50 bg-white/[0.08]' : 'border-white/10 bg-white/[0.025]'
            }`}
            onDragOver={event => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {renderPreview()}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePreview}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>

              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={Math.min(currentTime, duration || 0)}
                onChange={seekVideo}
                className="min-w-0 flex-1 accent-white"
              />

              <span className="w-20 text-right text-xs text-white/45">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={<Volume2 size={17} />}
              title="Original audio"
              description={`${videoVolume}% volume`}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={videoVolume}
                onChange={event => setVideoVolume(Number(event.target.value))}
                className="w-full accent-white"
              />
            </SettingCard>

            <SettingCard
              icon={<ImageIcon size={17} />}
              title="Cover frame"
              description={thumbnailPreview ? `Frame at ${formatTime(thumbnailTime)}` : 'Use the first frame'}
            >
              <div className="flex items-center gap-3">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="Video cover"
                    className="h-16 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-white/10">
                    <ImageIcon size={18} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowCoverEditor(true)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Choose frame
                </button>
              </div>
            </SettingCard>
          </div>
        </div>
      )}

      {ingestMode === 'camera' && (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
          <div className="relative aspect-[9/16] max-h-[620px] w-full">
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center">
                <Camera size={42} className="text-white/40" />
                <p className="mt-4 text-sm text-white/55">
                  Camera permission is required.
                </p>
              </div>
            )}

            <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => setIngestMode('dropzone')}
                className="rounded-full bg-black/50 p-2 text-white backdrop-blur-md"
              >
                <X size={18} />
              </button>

              <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/75 backdrop-blur-md">
                {recording ? `Recording ${formatTime(recordingSeconds)}` : 'Camera'}
              </span>

              <button
                type="button"
                onClick={switchCamera}
                className="rounded-full bg-black/50 p-2 text-white backdrop-blur-md"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-5 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
              <button
                type="button"
                onClick={toggleCameraMute}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"
              >
                {cameraMuted ? <MicOffIcon /> : <Mic2 size={18} />}
              </button>

              <button
                type="button"
                disabled={!cameraActive}
                onClick={recording ? stopRecording : startRecording}
                className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/40 ${
                  recording ? 'bg-white text-black' : 'bg-red-500 text-white'
                } disabled:opacity-40`}
              >
                {recording ? <SquareIcon /> : <span className="h-7 w-7 rounded-full bg-white" />}
              </button>

              <div className="h-11 w-11" />
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={handleFileInput}
      />
    </div>
  );

  const renderSoundStep = () => (
    <div className="space-y-5">
      <SectionHeader
        icon={<Music size={18} />}
        title="Sound"
        description="Choose online music and control how it is mixed with your original audio."
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Final audio mix</p>
            <p className="mt-1 text-xs text-white/40">
              The selected music is sent to the server and embedded into the final MP4.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">
            <Zap size={13} />
            Server-side mix
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <VolumeControl
            icon={<Volume2 size={16} />}
            label="Original video"
            value={videoVolume}
            onChange={setVideoVolume}
          />

          <VolumeControl
            icon={<Music size={16} />}
            label="Selected music"
            value={selectedMusic ? musicVolume : 0}
            onChange={setMusicVolume}
            disabled={!selectedMusic}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <SelectField
            label="Audio enhancement"
            value={audioEnhancement}
            onChange={setAudioEnhancement}
            options={AUDIO_ENHANCEMENTS.map(item => ({
              value: item.id,
              label: item.name
            }))}
          />

          <ToggleRow
            label="Loop music when necessary"
            description="Repeat the selected track if it ends before the video."
            enabled={musicLoop}
            onChange={setMusicLoop}
          />
        </div>
      </div>

      {selectedMusic && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center gap-4">
            {selectedMusic.artwork ? (
              <img
                src={selectedMusic.artwork}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <Music size={22} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{selectedMusic.name}</p>
              <p className="mt-1 truncate text-xs text-white/45">{selectedMusic.artist}</p>
              <p className="mt-2 text-[11px] text-white/30">
                Audio will be embedded into your published video.
              </p>
            </div>

            <button
              type="button"
              onClick={removeMusic}
              className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') searchMusic();
              }}
              placeholder="Search music..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>

          <button
            type="button"
            onClick={searchMusic}
            disabled={isSearching}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-black disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
            Search
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-12 text-sm text-white/40">
              <Loader2 size={20} className="mr-2 animate-spin" />
              Searching music...
            </div>
          ) : searchResults.length ? (
            searchResults.map(track => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-white/10 hover:bg-white/[0.04]"
              >
                {track.artwork ? (
                  <img
                    src={track.artwork}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Music size={17} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{track.name}</p>
                  <p className="truncate text-xs text-white/40">{track.artist}</p>
                </div>

                <button
                  type="button"
                  onClick={() => previewMusic(track)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/10"
                >
                  {playingTrackId === track.id ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => selectMusic(track)}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-black"
                >
                  <Plus size={14} />
                  Use
                </button>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <Music size={30} className="mx-auto text-white/20" />
              <p className="mt-3 text-sm text-white/35">
                Search for a song to add music.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-amber-500/[0.05] p-4 text-xs leading-5 text-white/45">
        <div className="flex gap-3">
          <CircleHelp size={16} className="mt-0.5 shrink-0 text-white/50" />
          <p>
            Music previews can be used to select a track, but publishing music should comply
            with the applicable rights and licensing rules. The selected audio is embedded
            during final server-side processing rather than being played as a separate
            browser audio layer.
          </p>
        </div>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="space-y-5">
      <SectionHeader
        icon={<Wand2 size={18} />}
        title="Edit"
        description="Make the video look and sound right before publishing."
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Visual style</p>
            <p className="mt-1 text-xs text-white/40">
              The selected style is preserved with the video metadata.
            </p>
          </div>
          <Settings2 size={18} className="text-white/35" />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              className={`group overflow-hidden rounded-2xl border ${
                selectedFilter === filter.id
                  ? 'border-white/60 bg-white/10'
                  : 'border-white/10 bg-white/[0.025]'
              }`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-black">
                {videoPreview ? (
                  <video
                    src={videoPreview}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                    style={{ filter: filter.css }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Film size={18} className="text-white/25" />
                  </div>
                )}
              </div>
              <div className="px-1 py-2 text-[10px] font-semibold text-white/55">
                {filter.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <Sparkles size={17} />
            <div>
              <p className="text-sm font-bold">Opening hook</p>
              <p className="mt-1 text-xs text-white/40">Optional caption starter.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {AI_HOOKS.map(hook => (
              <button
                key={hook}
                type="button"
                onClick={() => applyHook(hook)}
                className={`rounded-full border px-3 py-2 text-xs transition ${
                  hookText === hook
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-white/55 hover:bg-white/10'
                }`}
              >
                {hook}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <Layers3 size={17} />
            <div>
              <p className="text-sm font-bold">Chapters</p>
              <p className="mt-1 text-xs text-white/40">Add useful points in longer videos.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={addChapter}
            className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/10"
          >
            <Plus size={14} />
            Add current position
          </button>

          <div className="mt-3 space-y-2">
            {chapters.map(chapter => (
              <div key={chapter.id} className="flex items-center gap-2">
                <span className="w-12 text-xs text-white/35">
                  {formatTime(chapter.time)}
                </span>
                <input
                  value={chapter.title}
                  onChange={event => updateChapter(chapter.id, event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeChapter(chapter.id)}
                  className="rounded-lg p-2 text-white/35 hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EditorCard
          icon={<Hash size={17} />}
          title="Tags"
          description="Help people discover your video."
        >
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={event => setTagInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add hashtag"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs outline-none"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-xl bg-white px-3 text-black"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs"
              >
                #{tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </EditorCard>

        <EditorCard
          icon={<Tag size={17} />}
          title="Mentions"
          description="Mention people connected to the video."
        >
          <div className="flex gap-2">
            <input
              value={mentionInput}
              onChange={event => setMentionInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addMention();
                }
              }}
              placeholder="@username"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs outline-none"
            />
            <button
              type="button"
              onClick={addMention}
              className="rounded-xl bg-white px-3 text-black"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {mentions.map(mention => (
              <span
                key={mention}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs"
              >
                @{mention}
                <button type="button" onClick={() => removeMention(mention)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </EditorCard>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.035]">
        <button
          type="button"
          onClick={() => setShowAdvanced(value => !value)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <Settings2 size={18} />
            <div>
              <p className="text-sm font-bold">Advanced tools</p>
              <p className="mt-1 text-xs text-white/40">
                Polls, products, subtitles and additional metadata.
              </p>
            </div>
          </div>

          <ChevronDown
            size={18}
            className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setShowPollEditor(true)}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4 text-left hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Poll</span>
                    {pollData.enabled && <Check size={15} />}
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    Ask viewers a question.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProductEditor(true)}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4 text-left hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Product</span>
                    {productLink && <Check size={15} />}
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    Attach a product or external link.
                  </p>
                </button>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <label className="text-sm font-bold">Subtitles</label>
                  <textarea
                    value={subtitles}
                    onChange={event => setSubtitles(event.target.value)}
                    placeholder="Paste subtitle text..."
                    rows={3}
                    className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-xs outline-none"
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
      <SectionHeader
        icon={<Send size={18} />}
        title="Publish"
        description="Add your caption, visibility and publishing options."
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <label className="text-sm font-bold">Caption</label>

        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          rows={5}
          maxLength={2200}
          placeholder="Tell people what this video is about..."
          className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-white/25"
        />

        <div className="mt-2 flex justify-end text-[11px] text-white/30">
          {caption.length}/2200
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <Eye size={17} />
            <div>
              <p className="text-sm font-bold">Visibility</p>
              <p className="mt-1 text-xs text-white/40">Choose who can view it.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {PRIVACY_OPTIONS.map(option => {
              const Icon = option.icon;
              const active = privacy === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPrivacy(option.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-white/30 bg-white/[0.08]'
                      : 'border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{option.label}</p>
                    <p className="mt-1 text-[11px] text-white/35">
                      {option.description}
                    </p>
                  </div>

                  {active && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <Layers3 size={17} />
            <div>
              <p className="text-sm font-bold">Post details</p>
              <p className="mt-1 text-xs text-white/40">Category and location.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map(item => ({
                value: item,
                label: item
              }))}
            />

            <div>
              <label className="mb-2 block text-xs font-semibold text-white/55">
                Location
              </label>

              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  placeholder="Optional location"
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-3">
          <Settings2 size={17} />
          <div>
            <p className="text-sm font-bold">Viewer controls</p>
            <p className="mt-1 text-xs text-white/40">Control interactions on the post.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="Allow comments"
            description="People can comment on the video."
            enabled={allowComments}
            onChange={setAllowComments}
          />

          <ToggleRow
            label="Allow downloads"
            description="Allow viewers to save the video."
            enabled={allowDownload}
            onChange={setAllowDownload}
          />

          <ToggleRow
            label="Allow Duet"
            description="Allow other creators to duet."
            enabled={allowDuet}
            onChange={setAllowDuet}
          />

          <ToggleRow
            label="Allow Stitch"
            description="Allow clips from this video."
            enabled={allowStitch}
            onChange={setAllowStitch}
          />

          <ToggleRow
            label="Age restricted"
            description="Restrict this content to adults."
            enabled={ageRestricted}
            onChange={setAgeRestricted}
          />

          <ToggleRow
            label="Commercial content"
            description="Mark sponsored or commercial content."
            enabled={commercialContent}
            onChange={setCommercialContent}
          />
        </div>

        {commercialContent && (
          <div className="mt-3">
            <input
              value={sponsorTag}
              onChange={event => setSponsorTag(event.target.value)}
              placeholder="Brand or sponsor name"
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs outline-none"
            />
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-3">
          <Clock3 size={17} />
          <div>
            <p className="text-sm font-bold">Schedule</p>
            <p className="mt-1 text-xs text-white/40">
              Publish now or schedule for later.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <ToggleRow
            label="Schedule this video"
            description="Keep it unpublished until the selected time."
            enabled={scheduleEnabled}
            onChange={setScheduleEnabled}
          />

          {scheduleEnabled && (
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={event => setScheduleDate(event.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none"
            />
          )}
        </div>
      </div>

      {selectedMusic && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3">
            <AudioLines size={18} />
            <div>
              <p className="text-sm font-bold">Final audio</p>
              <p className="mt-1 text-xs text-white/40">
                {selectedMusic.name} · {selectedMusic.artist}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Original" value={`${videoVolume}%`} />
            <SummaryItem label="Music" value={`${musicVolume}%`} />
            <SummaryItem
              label="Enhancement"
              value={
                AUDIO_ENHANCEMENTS.find(item => item.id === audioEnhancement)?.name ||
                'Original'
              }
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#070707] text-white">
      <div className="flex h-full min-h-0 flex-col">
        <header className="relative z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 bg-[#080808]/95 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={closeUpload}
              disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/10 disabled:opacity-40"
            >
              <X size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold sm:text-base">
                  Create video
                </span>
                <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/35 sm:inline-flex">
                  Made Universe
                </span>
              </div>
              <p className="text-[11px] text-white/35">
                {STEPS[currentStepIndex]?.label}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const active = item.id === step;
              const complete = index < currentStepIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!uploading && (complete || active)) setStep(item.id);
                  }}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs transition ${
                    active
                      ? 'bg-white text-black'
                      : complete
                        ? 'text-white/75 hover:bg-white/10'
                        : 'text-white/30'
                  }`}
                >
                  {complete ? <Check size={14} /> : <Icon size={14} />}
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {videoFile && (
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/45 sm:flex">
                <Film size={12} />
                {formatBytes(videoFile.size)}
              </span>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
            <div className="mx-auto grid max-w-[1500px] gap-6 px-4 pb-[180px] pt-5 sm:px-6 lg:grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)] lg:px-8 lg:pb-[170px] lg:pt-7">
              <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-150px)]">
                <div className="h-full min-h-[430px] rounded-[30px] border border-white/10 bg-white/[0.025] p-2">
                  {renderPreview()}
                </div>

                <div className="mt-3 hidden rounded-2xl border border-white/10 bg-white/[0.025] p-3 lg:block">
                  <div className="flex items-center gap-2 text-xs text-white/45">
                    <AudioLines size={14} />
                    {selectedMusic
                      ? `Mixing ${selectedMusic.name}`
                      : 'Original video audio'}
                  </div>
                </div>
              </aside>

              <main className="min-w-0">
                <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-1 md:hidden">
                  {STEPS.map(item => {
                    const Icon = item.icon;
                    const active = item.id === step;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStep(item.id)}
                        className={`flex min-w-[92px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                          active ? 'bg-white text-black' : 'text-white/40'
                        }`}
                      >
                        <Icon size={14} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {step === 'media' && renderMediaStep()}
                    {step === 'sound' && renderSoundStep()}
                    {step === 'edit' && renderEditStep()}
                    {step === 'publish' && renderPublishStep()}
                  </motion.div>
                </AnimatePresence>

                {uploadError && !uploading && (
                  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">
                    <div className="flex gap-3">
                      <CircleHelp size={17} className="mt-0.5 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-40">
          <div className="pointer-events-auto border-t border-white/10 bg-[#080808]/98 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-6">
            <div className="mx-auto max-w-[1500px]">
              {uploading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{uploadStage || 'Processing...'}</p>
                        <p className="mt-1 text-[11px] text-white/35">
                          Please keep this window open while your video is being processed.
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-bold text-white/70">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={currentStepIndex === 0}
                    className="flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-semibold text-white/65 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-0"
                  >
                    <ChevronLeft size={17} />
                    Back
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="hidden text-[11px] text-white/30 sm:inline">
                      Step {currentStepIndex + 1} of {STEPS.length}
                    </span>

                    {currentStepIndex < STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-black transition hover:bg-white/90"
                      >
                        Continue
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!videoFile}
                        className="flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <UploadCloud size={16} />
                        {scheduleEnabled ? 'Schedule video' : 'Publish video'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showCoverEditor && videoFile && (
            <Modal title="Choose cover frame" onClose={() => setShowCoverEditor(false)}>
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl bg-black">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Selected cover"
                      className="mx-auto max-h-[420px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <ImageIcon size={32} className="text-white/20" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between text-xs text-white/45">
                    <span>Video position</span>
                    <span>{formatTime(thumbnailTime)}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={thumbnailTime}
                    onChange={event => {
                      const time = Number(event.target.value);
                      setThumbnailTime(time);
                      updateThumbnail(time);
                    }}
                    className="w-full accent-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCoverEditor(false)}
                    className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black"
                  >
                    Done
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {showPollEditor && (
            <Modal title="Add poll" onClose={() => setShowPollEditor(false)}>
              <div className="space-y-4">
                <ToggleRow
                  label="Enable poll"
                  description="Add a question for viewers."
                  enabled={pollData.enabled}
                  onChange={enabled => setPollData(current => ({ ...current, enabled }))}
                />

                <input
                  value={pollData.question}
                  onChange={event =>
                    setPollData(current => ({
                      ...current,
                      question: event.target.value
                    }))
                  }
                  placeholder="Ask a question..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs outline-none"
                />

                {pollData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={option}
                      onChange={event => updatePollOption(index, event.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-xs outline-none"
                    />
                    {pollData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        className="rounded-xl border border-white/10 px-3 text-white/45 hover:bg-white/10"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}

                {pollData.options.length < 4 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/10"
                  >
                    <Plus size={14} />
                    Add option
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPollEditor(false)}
                  className="w-full rounded-xl bg-white py-3 text-xs font-bold text-black"
                >
                  Save poll
                </button>
              </div>
            </Modal>
          )}

          {showProductEditor && (
            <Modal title="Product or link" onClose={() => setShowProductEditor(false)}>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-white/55">
                    Link
                  </label>
                  <input
                    value={productLink}
                    onChange={event => setProductLink(event.target.value)}
                    placeholder="https://..."
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowProductEditor(false)}
                  className="w-full rounded-xl bg-white py-3 text-xs font-bold text-black"
                >
                  Save link
                </button>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">{description}</p>
      </div>
    </div>
  );
}

function SettingCard({ icon, title, description, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold">{title}</p>
          <p className="mt-1 text-[11px] text-white/35">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EditorCard({ icon, title, description, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs text-white/40">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function VolumeControl({ icon, label, value, onChange, disabled = false }) {
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/65">
          {icon}
          {label}
        </div>
        <span className="text-xs text-white/40">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        disabled={disabled}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full accent-white"
      />
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-3 text-left transition hover:bg-white/[0.04]"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-1 text-[11px] leading-4 text-white/35">{description}</p>
      </div>

      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? 'bg-white' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full transition ${
            enabled ? 'left-6 bg-black' : 'left-1 bg-white/45'
          }`}
        />
      </span>
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-white/55">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-black/20 px-3 pr-10 text-xs text-white outline-none"
        >
          {options.map(option => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#111] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35"
        />
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-1 text-xs font-bold text-white/75">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[calc(100vh-32px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-sm font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/45 hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 pb-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function MicOffIcon() {
  return <Mic size={18} className="opacity-60" />;
}

function SquareIcon() {
  return <span className="h-5 w-5 rounded-md bg-black" />;
}

export default Upload;
