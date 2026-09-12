import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient';
import {
  X, UploadCloud, Video, Camera, Music, Search, Play, Pause, Trash2,
  ChevronLeft, ChevronRight, Check, Volume2, VolumeX, SlidersHorizontal,
  Sparkles, Image as ImageIcon, Globe2, Lock, Users, MapPin, Hash,
  MessageCircle, Download, Shield, Loader2, RefreshCw, Plus, Minus,
  Clock3, CalendarDays, Film, Mic2, Wand2, Eye, EyeOff, RotateCcw
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'https://mpade-backend.onrender.com').replace(/\/+$/, '');

const FILTERS = [
  { id: 'original', name: 'Original', css: 'none' },
  { id: 'neon_cyber', name: 'Neon', css: 'contrast(1.08) saturate(1.35) hue-rotate(12deg)' },
  { id: 'electric', name: 'Electric', css: 'contrast(1.18) saturate(1.5) hue-rotate(24deg)' },
  { id: 'cinema', name: 'Cinema', css: 'contrast(1.12) saturate(.82) sepia(.08)' },
  { id: 'golden_hour', name: 'Golden', css: 'contrast(1.06) saturate(1.25) sepia(.18)' },
  { id: 'vintage', name: 'Vintage', css: 'contrast(.96) saturate(.72) sepia(.2)' },
  { id: 'midnight', name: 'Midnight', css: 'brightness(.78) contrast(1.18) saturate(.9)' },
  { id: 'vibrant_pop', name: 'Vibrant', css: 'contrast(1.08) saturate(1.65)' }
];

const CATEGORIES = [
  'Entertainment',
  'Music',
  'Comedy',
  'Gaming',
  'Education',
  'Sports',
  'Lifestyle',
  'Technology',
  'News',
  'Travel',
  'Food',
  'Fashion',
  'Art',
  'Other'
];

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Public', icon: Globe2 },
  { id: 'followers', label: 'Followers', icon: Users },
  { id: 'private', label: 'Private', icon: Lock }
];

const AUDIO_ENHANCEMENTS = [
  { id: 'none', name: 'Original', description: 'Keep the original sound' },
  { id: 'crystal_voice', name: 'Crystal Voice', description: 'Improve speech clarity' },
  { id: 'studio_master', name: 'Studio Master', description: 'Balanced compression and limiting' },
  { id: 'bass_boost', name: 'Bass Boost', description: 'Add controlled low-end depth' }
];

function formatBytes(bytes = 0) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds = 0) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(value / 60);
  const secs = value % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function getExtension(name = '', type = '') {
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (match) return `.${match[1].toLowerCase()}`;

  if (type.includes('webm')) return '.webm';
  if (type.includes('quicktime')) return '.mov';
  if (type.includes('ogg')) return '.ogv';
  return '.mp4';
}

function getSupabaseSession() {
  return supabase.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    if (!data?.session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    return data.session;
  });
}

async function authenticatedFetch(url, options = {}) {
  const session = await getSupabaseSession();

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

function Upload({ onComplete }) {
  const [activeTab, setActiveTab] = useState('media');

  const [ingestMode, setIngestMode] = useState('dropzone');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoMetadata, setVideoMetadata] = useState({ duration: 0, width: 0, height: 0 });

  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  const [selectedMusic, setSelectedMusic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingTrackUrl, setPlayingTrackUrl] = useState('');
  const [isPlayingTrack, setIsPlayingTrack] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState(() => {
    try {
      return localStorage.getItem('made_universe_upload_filter') || 'original';
    } catch {
      return 'original';
    }
  });

  const [audioEnhancement, setAudioEnhancement] = useState('none');
  const [videoVolume, setVideoVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(70);

  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [privacy, setPrivacy] = useState('public');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [mentions, setMentions] = useState('');

  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [ageRestricted, setAgeRestricted] = useState(false);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [coverText, setCoverText] = useState('');
  const [coverBadgeStyle, setCoverBadgeStyle] = useState('none');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState('');

  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioPreviewRef = useRef(null);

  const filter = useMemo(
    () => FILTERS.find(item => item.id === selectedFilter) || FILTERS[0],
    [selectedFilter]
  );

  const hasMusic = Boolean(selectedMusic?.previewUrl || selectedMusic?.url);

  const tabs = [
    { id: 'media', label: 'Media', icon: Film },
    { id: 'sound', label: 'Sound', icon: Music },
    { id: 'edit', label: 'Edit', icon: SlidersHorizontal },
    { id: 'publish', label: 'Publish', icon: Globe2 }
  ];

  const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  useEffect(() => {
    try {
      localStorage.setItem('made_universe_upload_filter', selectedFilter);
    } catch {}
  }, [selectedFilter]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [videoPreview, thumbnailPreview]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopRecordingTimer();
    };
  }, []);

  useEffect(() => {
    if (!audioPreviewRef.current) return;

    audioPreviewRef.current.volume = Math.max(0, Math.min(1, musicVolume / 100));

    if (playingTrackUrl) {
      audioPreviewRef.current.src = playingTrackUrl;
      audioPreviewRef.current.load();
    }
  }, [playingTrackUrl, musicVolume]);

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopRecordingTimer();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
    setIsRecording(false);
  }, [stopRecordingTimer]);

  const startCamera = async () => {
    try {
      setCameraError('');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;
      setIsCameraOpen(true);

      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      setCameraError(error.message || 'Unable to access the camera.');
    }
  };

  const switchCamera = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);

    if (isCameraOpen) {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: nextFacing,
            width: { ideal: 1080 },
            height: { ideal: 1920 }
          },
          audio: true
        });

        mediaStreamRef.current = stream;

        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play().catch(() => {});
        }
      } catch (error) {
        setCameraError(error.message || 'Unable to switch camera.');
      }
    }
  };

  const generateThumbnail = useCallback((file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      video.onloadedmetadata = () => {
        const seekTime = Math.min(Math.max(video.duration * 0.15, 0.2), Math.max(video.duration - 0.1, 0.2));
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 1080;
          const height = video.videoHeight || 1920;
          const maxWidth = 1080;
          const scale = Math.min(1, maxWidth / width);

          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);

          const context = canvas.getContext('2d');

          context.filter = filter.css === 'none' ? 'none' : filter.css;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (coverText.trim()) {
            const padding = Math.max(20, canvas.width * 0.035);
            const fontSize = Math.max(28, canvas.width * 0.045);

            context.filter = 'none';
            context.font = `700 ${fontSize}px Arial`;
            context.textBaseline = 'bottom';

            const textWidth = context.measureText(coverText.trim()).width;

            context.fillStyle = 'rgba(0,0,0,.58)';
            context.fillRect(
              padding - 12,
              canvas.height - padding - fontSize - 18,
              textWidth + 24,
              fontSize + 28
            );

            context.fillStyle = '#fff';
            context.fillText(
              coverText.trim(),
              padding,
              canvas.height - padding
            );
          }

          canvas.toBlob(
            blob => {
              cleanup();
              resolve(blob);
            },
            'image/jpeg',
            0.86
          );
        } catch {
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };

      video.src = url;
    });
  }, [coverText, filter.css]);

  const loadVideoFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file.');
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      setUploadError('The maximum supported video size is 1 GB.');
      return;
    }

    setUploadError('');
    setUploadMessage('');
    setVideoFile(file);

    const nextUrl = URL.createObjectURL(file);
    setVideoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });

    const metadata = await new Promise(resolve => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration || 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve({ duration: 0, width: 0, height: 0 });
        URL.revokeObjectURL(video.src);
      };
      video.src = nextUrl;
    });

    setVideoMetadata(metadata);

    const thumbnail = await generateThumbnail(file);

    if (thumbnail) {
      setThumbnailBlob(thumbnail);

      const thumbnailUrl = URL.createObjectURL(thumbnail);

      setThumbnailPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return thumbnailUrl;
      });
    }

    setActiveTab('sound');
  };

  const handleFileInput = async event => {
    const file = event.target.files?.[0];
    if (file) await loadVideoFile(file);
    event.target.value = '';
  };

  const handleDrop = async event => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) await loadVideoFile(file);
  };

  const startRecording = () => {
    const stream = mediaStreamRef.current;

    if (!stream) {
      setCameraError('Start the camera before recording.');
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
        videoBitsPerSecond: 5_000_000,
        audioBitsPerSecond: 128_000
      });

      recorder.ondataavailable = event => {
        if (event.data?.size) recordedChunksRef.current.push(event.data);
      };

      recorder.onerror = event => {
        setCameraError(event.error?.message || 'Recording failed.');
        setIsRecording(false);
        stopRecordingTimer();
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File(
          [blob],
          `made-universe-recording-${Date.now()}.${extension}`,
          { type: mimeType }
        );

        await loadVideoFile(file);
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500);

      setRecordingSeconds(0);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(value => value + 1);
      }, 1000);
    } catch (error) {
      setCameraError(error.message || 'Unable to start recording.');
    }
  };

  const stopRecording = () => {
    stopRecordingTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const togglePreview = async () => {
    if (!videoRef.current) return;

    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setPreviewPlaying(true);
      } else {
        videoRef.current.pause();
        setPreviewPlaying(false);
      }
    } catch {}
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setPreviewCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekVideo = event => {
    const value = Number(event.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
    setPreviewCurrentTime(value);
  };

  const searchMusic = async () => {
    const query = searchQuery.trim();

    if (!query) return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`
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
          duration: track.trackTimeMillis ? track.trackTimeMillis / 1000 : 30,
          provider: 'itunes'
        }));

      setSearchResults(tracks);
    } catch (error) {
      setUploadError(error.message || 'Unable to search music right now.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectMusic = track => {
    setSelectedMusic(track);
    setPlayingTrackUrl(track.previewUrl || '');
    setIsPlayingTrack(false);
    setUploadError('');
  };

  const toggleMusicPreview = async track => {
    const url = track.previewUrl;

    if (!url) return;

    if (playingTrackUrl === url && isPlayingTrack) {
      audioPreviewRef.current?.pause();
      setIsPlayingTrack(false);
      return;
    }

    setPlayingTrackUrl(url);

    requestAnimationFrame(async () => {
      if (!audioPreviewRef.current) return;

      audioPreviewRef.current.src = url;

      try {
        await audioPreviewRef.current.play();
        setIsPlayingTrack(true);
      } catch {
        setIsPlayingTrack(false);
      }
    });
  };

  const clearMusic = () => {
    audioPreviewRef.current?.pause();
    setSelectedMusic(null);
    setPlayingTrackUrl('');
    setIsPlayingTrack(false);
  };

  const uploadToB2 = async (file, folder, onProgress) => {
    const response = await authenticatedFetch(`${API_BASE}/api/storage/upload-url`, {
      method: 'POST',
      body: JSON.stringify({
        folder,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.uploadUrl || !data?.objectKey) {
      throw new Error(data?.error || data?.message || 'Unable to create B2 upload URL.');
    }

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', data.uploadUrl);
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
          reject(new Error(`B2 upload failed with status ${xhr.status}.`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading to B2.'));
      xhr.onabort = () => reject(new Error('Upload was cancelled.'));

      xhr.send(file);
    });

    return data.objectKey;
  };

  const mergeVideoOnServer = async sourceObjectKey => {
    const payload = {
      sourceObjectKey,
      audioUrl: selectedMusic?.previewUrl || null,
      videoVolume,
      musicVolume: hasMusic ? musicVolume : 0,
      audioEnhancement,
      filter: selectedFilter
    };

    const response = await authenticatedFetch(`${API_BASE}/api/storage/merge-video`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Video processing failed.');
    }

    if (!data?.objectKey) {
      throw new Error('The server did not return the processed video.');
    }

    return data;
  };

  const createThumbnailUpload = async () => {
    if (!thumbnailBlob) return null;

    const file = new File(
      [thumbnailBlob],
      `cover-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    return uploadToB2(file, 'covers', () => {});
  };

  const insertVideoRecord = async ({ videoObjectKey, thumbnailObjectKey }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!userData?.user) throw new Error('You must be signed in to publish.');

    const userId = userData.user.id;

    const cleanTags = tags
      .split(',')
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(Boolean);

    const cleanMentions = mentions
      .split(',')
      .map(item => item.trim().replace(/^@/, ''))
      .filter(Boolean);

    const payload = {
      user_id: userId,
      video_url: videoObjectKey,
      caption: caption.trim(),
      music_name: selectedMusic?.title || null,
      music_url: selectedMusic?.previewUrl || null,
      is_private: privacy === 'private',
      category,
      thumbnail_url: thumbnailObjectKey || null,
      location: location.trim() || null,
      tags: cleanTags.length ? cleanTags : null,
      mentions: cleanMentions.length ? cleanMentions : null,
      privacy,
      allow_comments: allowComments,
      allow_download: allowDownload,
      allow_duet: allowDuet,
      allow_stitch: allowStitch,
      age_restricted: ageRestricted,
      filter_style: selectedFilter,
      audio_enhancement: audioEnhancement,
      video_volume: videoVolume,
      music_volume: musicVolume,
      scheduled_at: scheduleEnabled && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null
    };

    const firstAttempt = await supabase
      .from('videos')
      .insert(payload)
      .select()
      .single();

    if (!firstAttempt.error) return firstAttempt.data;

    const basePayload = {
      user_id: userId,
      video_url: videoObjectKey,
      caption: caption.trim(),
      music_name: selectedMusic?.title || null,
      music_url: selectedMusic?.previewUrl || null,
      is_private: privacy === 'private',
      category
    };

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
    if (!videoFile) {
      setUploadError('Please select or record a video first.');
      setActiveTab('media');
      return;
    }

    if (!caption.trim() && !videoFile) {
      setUploadError('Add a caption or video before publishing.');
      return;
    }

    if (scheduleEnabled && (!scheduleDate || !scheduleTime)) {
      setUploadError('Choose both a schedule date and time.');
      setActiveTab('publish');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadMessage('');
    setUploadProgress(0);

    try {
      setUploadStage('Preparing your video');
      setUploadMessage('Preparing the source file...');

      const sourceObjectKey = await uploadToB2(
        videoFile,
        'videos',
        progress => {
          setUploadStage('Uploading source video');
          setUploadMessage(`${progress}% uploaded`);
          setUploadProgress(Math.round(progress * 0.35));
        }
      );

      setUploadStage(hasMusic ? 'Mixing video and music' : 'Converting video');
      setUploadMessage(
        hasMusic
          ? 'Embedding the selected audio into the final MP4...'
          : 'Preparing the final MP4...'
      );
      setUploadProgress(45);

      const merged = await mergeVideoOnServer(sourceObjectKey);

      setUploadStage('Creating cover');
      setUploadMessage('Preparing your video thumbnail...');
      setUploadProgress(75);

      const thumbnailObjectKey = await createThumbnailUpload();

      setUploadStage('Publishing');
      setUploadMessage('Saving your video details...');
      setUploadProgress(88);

      const record = await insertVideoRecord({
        videoObjectKey: merged.objectKey,
        thumbnailObjectKey
      });

      setUploadStage('Complete');
      setUploadMessage(
        scheduleEnabled
          ? 'Your video has been scheduled successfully.'
          : 'Your video is now ready.'
      );
      setUploadProgress(100);

      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.65 }
      });

      if (typeof onComplete === 'function') {
        await onComplete(record);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error?.message || 'Something went wrong while publishing your video.');
      setUploadStage('');
      setUploadMessage('');
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = () => {
    if (uploading) return;

    setVideoFile(null);
    setVideoMetadata({ duration: 0, width: 0, height: 0 });

    setVideoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });

    setThumbnailBlob(null);

    setThumbnailPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });

    setPreviewCurrentTime(0);
    setPreviewPlaying(false);
    setActiveTab('media');
  };

  const goToNextTab = () => {
    if (activeTab === 'media' && !videoFile) {
      setUploadError('Select or record a video before continuing.');
      return;
    }

    if (activeTabIndex < tabs.length - 1) {
      setUploadError('');
      setActiveTab(tabs[activeTabIndex + 1].id);
    }
  };

  const goToPreviousTab = () => {
    if (activeTabIndex > 0) {
      setUploadError('');
      setActiveTab(tabs[activeTabIndex - 1].id);
    }
  };

  const renderPreview = () => {
    if (isCameraOpen) {
      return (
        <div className="relative h-full w-full overflow-hidden bg-black">
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-xl">
            {isRecording ? `Recording ${formatTime(recordingSeconds)}` : 'Camera'}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-5 pb-6 pt-16">
            <button
              type="button"
              onClick={switchCamera}
              disabled={isRecording}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl disabled:opacity-40"
            >
              <RefreshCw size={19} />
            </button>

            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-red-500 text-white shadow-2xl"
              >
                <span className="h-6 w-6 rounded-full bg-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-red-500 text-white shadow-2xl"
              >
                <span className="h-6 w-6 rounded-md bg-white" />
              </button>
            )}

            <button
              type="button"
              onClick={stopCamera}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl"
            >
              <X size={19} />
            </button>
          </div>
        </div>
      );
    }

    if (!videoPreview) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(99,102,241,.16),transparent_55%)] p-8 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[.06]">
            <Film size={34} className="text-white/70" />
          </div>

          <h3 className="text-lg font-semibold text-white">Your video preview</h3>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">
            Select a video or record directly from your camera.
          </p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoPreview}
          playsInline
          preload="metadata"
          onTimeUpdate={handleVideoTimeUpdate}
          onPlay={() => setPreviewPlaying(true)}
          onPause={() => setPreviewPlaying(false)}
          onEnded={() => setPreviewPlaying(false)}
          className="h-full w-full object-contain"
          style={{ filter: filter.css }}
        />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <div className="rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-xl">
            {videoMetadata.width && videoMetadata.height
              ? `${videoMetadata.width} × ${videoMetadata.height}`
              : 'Video'}
          </div>

          <button
            type="button"
            onClick={removeVideo}
            disabled={uploading}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {hasMusic && (
          <div className="absolute bottom-20 left-4 right-4">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl">
              <Music size={15} className="text-white/80" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {selectedMusic.title}
                </p>
                <p className="truncate text-[10px] text-white/45">
                  {selectedMusic.artist}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreview}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black"
            >
              {previewPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <input
              type="range"
              min="0"
              max={videoMetadata.duration || 0}
              step="0.01"
              value={Math.min(previewCurrentTime, videoMetadata.duration || 0)}
              onChange={seekVideo}
              className="min-w-0 flex-1 accent-white"
            />

            <span className="text-[11px] tabular-nums text-white/65">
              {formatTime(previewCurrentTime)} / {formatTime(videoMetadata.duration)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderMediaTab = () => (
    <div className="space-y-5">
      {!videoFile && !isCameraOpen && (
        <div
          onDragOver={event => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex min-h-[270px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition ${
            dragActive
              ? 'border-white/50 bg-white/[.09]'
              : 'border-white/10 bg-white/[.025] hover:border-white/25 hover:bg-white/[.045]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[.07] text-white">
            <UploadCloud size={28} />
          </div>

          <h3 className="text-base font-semibold text-white">
            Drop your video here
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
            MP4, WebM, MOV and other browser-supported video formats.
            Maximum size: 1 GB.
          </p>

          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Choose video
          </button>
        </div>
      )}

      {!videoFile && !isCameraOpen && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      )}

      {!videoFile && !isCameraOpen && (
        <button
          type="button"
          onClick={startCamera}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-5 py-4 text-sm font-medium text-white transition hover:bg-white/[.08]"
        >
          <Camera size={19} />
          Record with camera
        </button>
      )}

      {cameraError && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
          {cameraError}
        </div>
      )}

      {videoFile && !isCameraOpen && (
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/[.05]">
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film size={19} className="text-white/40" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {videoFile.name}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {formatBytes(videoFile.size)} · {formatTime(videoMetadata.duration)}
              </p>
            </div>

            <button
              type="button"
              onClick={removeVideo}
              disabled={uploading}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      )}

      {videoFile && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white transition hover:bg-white/[.08]"
          >
            <UploadCloud size={17} />
            Replace video
          </button>

          <button
            type="button"
            onClick={startCamera}
            disabled={uploading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white transition hover:bg-white/[.08]"
          >
            <Camera size={17} />
            Record new
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="mt-0.5 text-white/60" />
          <div>
            <p className="text-sm font-medium text-white">Private media storage</p>
            <p className="mt-1 text-xs leading-5 text-white/40">
              Your original and final media are uploaded directly to secure object storage.
              The browser does not need to store the published video on Vercel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSoundTab = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.07]">
            <Music size={19} className="text-white/80" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Sound mix</h3>
            <p className="mt-1 text-xs text-white/40">
              Both audio sources are mixed into one final MP4 on the server.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-white/65">Original video audio</span>
              <span className="text-xs tabular-nums text-white/40">{videoVolume}%</span>
            </div>

            <div className="flex items-center gap-3">
              {videoVolume === 0 ? (
                <VolumeX size={17} className="text-white/40" />
              ) : (
                <Volume2 size={17} className="text-white/50" />
              )}

              <input
                type="range"
                min="0"
                max="100"
                value={videoVolume}
                onChange={event => setVideoVolume(Number(event.target.value))}
                className="flex-1 accent-white"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-white/65">Selected music</span>
              <span className="text-xs tabular-nums text-white/40">
                {hasMusic ? `${musicVolume}%` : 'Not selected'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Music size={17} className="text-white/40" />

              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                disabled={!hasMusic}
                onChange={event => setMusicVolume(Number(event.target.value))}
                className="flex-1 accent-white disabled:opacity-30"
              />
            </div>
          </div>
        </div>
      </div>

      {selectedMusic && (
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center gap-3">
            <img
              src={selectedMusic.artwork}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {selectedMusic.title}
              </p>
              <p className="mt-1 truncate text-xs text-white/45">
                {selectedMusic.artist}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleMusicPreview(selectedMusic)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            >
              {isPlayingTrack ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              type="button"
              onClick={clearMusic}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-500/[.06] px-3 py-2.5">
            <Check size={15} className="text-emerald-300" />
            <span className="text-xs text-emerald-100/70">
              The selected audio will be embedded into the final video.
            </span>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />

            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') searchMusic();
              }}
              placeholder="Search music..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>

          <button
            type="button"
            onClick={searchMusic}
            disabled={isSearching || !searchQuery.trim()}
            className="flex min-w-[82px] items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {searchResults.map(track => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-white/[.05]"
              >
                <img
                  src={track.artwork}
                  alt=""
                  className="h-11 w-11 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{track.title}</p>
                  <p className="truncate text-xs text-white/35">{track.artist}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMusicPreview(track)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/65 hover:bg-white/[.06]"
                >
                  {playingTrackUrl === track.previewUrl && isPlayingTrack ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => selectMusic(track)}
                  className="rounded-xl bg-white/[.08] px-3 py-2 text-xs font-medium text-white hover:bg-white/[.13]"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-5 text-white/30">
          Online previews are used for selection and preview. Publishing requires
          the server to be able to retrieve the selected audio source.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Mic2 size={17} className="text-white/55" />
          <div>
            <p className="text-sm font-medium text-white">Audio enhancement</p>
            <p className="text-xs text-white/35">Applied during final processing.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {AUDIO_ENHANCEMENTS.map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => setAudioEnhancement(item.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                audioEnhancement === item.id
                  ? 'border-white/25 bg-white/[.09]'
                  : 'border-white/10 bg-white/[.025] hover:bg-white/[.05]'
              }`}
            >
              <p className="text-xs font-semibold text-white">{item.name}</p>
              <p className="mt-1 text-[10px] leading-4 text-white/35">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEditTab = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-white/60" />
          <div>
            <h3 className="text-sm font-semibold text-white">Visual style</h3>
            <p className="mt-1 text-xs text-white/35">
              Preview the selected look while editing.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {FILTERS.map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedFilter(item.id)}
              className={`overflow-hidden rounded-xl border transition ${
                selectedFilter === item.id
                  ? 'border-white/40 bg-white/[.08]'
                  : 'border-white/10 bg-white/[.025]'
              }`}
            >
              <div
                className="h-14 bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-cyan-500/20"
                style={{ filter: item.css }}
              />
              <span className="block truncate px-1.5 py-2 text-[10px] text-white/65">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon size={18} className="text-white/55" />
          <div>
            <h3 className="text-sm font-semibold text-white">Cover</h3>
            <p className="mt-1 text-xs text-white/35">
              Create a clean cover from your selected video frame.
            </p>
          </div>
        </div>

        <input
          value={coverText}
          onChange={event => setCoverText(event.target.value)}
          placeholder="Optional cover text"
          maxLength={70}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />

        <div className="mt-3 flex gap-2">
          {['none', 'dark', 'light'].map(style => (
            <button
              type="button"
              key={style}
              onClick={() => setCoverBadgeStyle(style)}
              className={`rounded-xl border px-3 py-2 text-xs ${
                coverBadgeStyle === style
                  ? 'border-white/30 bg-white/[.08] text-white'
                  : 'border-white/10 text-white/40'
              }`}
            >
              {style === 'none' ? 'No badge' : style === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Hash size={18} className="text-white/55" />
          <div>
            <h3 className="text-sm font-semibold text-white">Discovery metadata</h3>
            <p className="mt-1 text-xs text-white/35">
              Help people discover your content.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={tags}
            onChange={event => setTags(event.target.value)}
            placeholder="Tags, separated by commas"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
          />

          <input
            value={mentions}
            onChange={event => setMentions(event.target.value)}
            placeholder="Mentions, separated by commas"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
          />

          <div className="relative">
            <MapPin
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
            />
            <input
              value={location}
              onChange={event => setLocation(event.target.value)}
              placeholder="Location"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-white/55" />
          <div>
            <h3 className="text-sm font-semibold text-white">Interaction</h3>
            <p className="mt-1 text-xs text-white/35">
              Control what viewers can do with your post.
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {[
            ['Allow comments', allowComments, setAllowComments, MessageCircle],
            ['Allow downloads', allowDownload, setAllowDownload, Download],
            ['Allow Duet', allowDuet, setAllowDuet, Users],
            ['Allow Stitch', allowStitch, setAllowStitch, LayersIcon]
          ].map(([label, value, setter, Icon]) => (
            <button
              type="button"
              key={label}
              onClick={() => setter(!value)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-white/[.04]"
            >
              <Icon size={16} className="text-white/40" />
              <span className="flex-1 text-sm text-white/70">{label}</span>
              <span
                className={`relative h-6 w-10 rounded-full transition ${
                  value ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full transition ${
                    value ? 'left-5 bg-black' : 'left-1 bg-white/45'
                  }`}
                />
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setAgeRestricted(!ageRestricted)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-white/[.04]"
          >
            <Shield size={16} className="text-white/40" />
            <span className="flex-1 text-sm text-white/70">18+ content</span>
            <span
              className={`relative h-6 w-10 rounded-full transition ${
                ageRestricted ? 'bg-white' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full transition ${
                  ageRestricted ? 'left-5 bg-black' : 'left-1 bg-white/45'
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPublishTab = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-white/55" />
          <div>
            <h3 className="text-sm font-semibold text-white">Caption</h3>
            <p className="mt-1 text-xs text-white/35">
              Tell viewers what your video is about.
            </p>
          </div>
        </div>

        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          maxLength={2200}
          rows={5}
          placeholder="Write a caption..."
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />

        <div className="mt-2 text-right text-[10px] text-white/25">
          {caption.length}/2200
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Globe2 size={18} className="text-white/55" />
          <div>
            <h3 className="text-sm font-semibold text-white">Visibility</h3>
            <p className="mt-1 text-xs text-white/35">
              Choose who can see your video.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PRIVACY_OPTIONS.map(option => {
            const Icon = option.icon;

            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setPrivacy(option.id)}
                className={`rounded-2xl border p-3 transition ${
                  privacy === option.id
                    ? 'border-white/30 bg-white/[.09]'
                    : 'border-white/10 bg-white/[.025]'
                }`}
              >
                <Icon size={17} className="mx-auto text-white/65" />
                <span className="mt-2 block text-xs text-white/70">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs text-white/45">Category</label>
          <select
            value={category}
            onChange={event => setCategory(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
          >
            {CATEGORIES.map(item => (
              <option key={item} value={item} className="bg-neutral-900">
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <button
          type="button"
          onClick={() => setScheduleEnabled(!scheduleEnabled)}
          className="flex w-full items-center gap-3 text-left"
        >
          <Clock3 size={18} className="text-white/55" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Schedule post</p>
            <p className="mt-1 text-xs text-white/35">
              Publish at a later date and time.
            </p>
          </div>

          <span
            className={`relative h-6 w-10 rounded-full transition ${
              scheduleEnabled ? 'bg-white' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full transition ${
                scheduleEnabled ? 'left-5 bg-black' : 'left-1 bg-white/45'
              }`}
            />
          </span>
        </button>

        {scheduleEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs text-white/40">Date</label>
              <input
                type="date"
                value={scheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={event => setScheduleDate(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/40">Time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={event => setScheduleTime(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="mt-0.5 text-white/55" />
          <div>
            <p className="text-sm font-semibold text-white">Final processing</p>
            <p className="mt-1 text-xs leading-5 text-white/40">
              Your source video is uploaded to secure storage. The backend then
              converts it into a browser-friendly MP4 and embeds the selected
              music into the final file before publishing.
            </p>
          </div>
        </div>

        {hasMusic && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-3">
              <Music size={16} className="text-white/50" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {selectedMusic.title}
                </p>
                <p className="truncate text-[10px] text-white/35">
                  {selectedMusic.artist}
                </p>
              </div>
              <Check size={16} className="text-emerald-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === 'media') return renderMediaTab();
    if (activeTab === 'sound') return renderSoundTab();
    if (activeTab === 'edit') return renderEditTab();
    return renderPublishTab();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-0 flex-col overflow-hidden bg-[#080808] text-white">
      <style>{`
        .made-upload-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,.22) transparent;
          overscroll-behavior: contain;
        }
        .made-upload-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .made-upload-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .made-upload-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.20);
          border-radius: 999px;
        }
        .made-upload-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,.35);
        }
        .made-upload-select option {
          background: #111;
          color: #fff;
        }
      `}</style>

      <audio
        ref={audioPreviewRef}
        preload="none"
        onEnded={() => setIsPlayingTrack(false)}
        onPause={() => setIsPlayingTrack(false)}
        onPlay={() => setIsPlayingTrack(true)}
      />

      <header className="relative z-30 flex h-[68px] shrink-0 items-center border-b border-white/10 bg-[#090909]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onComplete}
            disabled={uploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 transition hover:bg-white/[.08] disabled:opacity-30"
          >
            <X size={19} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white sm:text-base">
              Create video
            </h1>
            <p className="hidden text-[11px] text-white/35 sm:block">
              Edit, mix and publish
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  if (!uploading) setActiveTab(tab.id);
                }}
                disabled={uploading}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-white/45 hover:bg-white/[.05] hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="ml-3 flex items-center gap-2">
          <span className="hidden text-xs text-white/30 sm:block">
            {activeTabIndex + 1}/{tabs.length}
          </span>

          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,.6)]" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[46%] min-w-[390px] max-w-[680px] items-center justify-center border-r border-white/10 bg-[#050505] p-8 lg:flex">
          <div className="flex h-full max-h-[calc(100vh-132px)] w-full items-center justify-center">
            <div className="relative h-full max-h-[760px] aspect-[9/16] overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl">
              {renderPreview()}
            </div>
          </div>
        </aside>

        <main className="made-upload-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[760px] px-4 pb-[190px] pt-5 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="relative mx-auto h-[440px] w-[248px] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
                {renderPreview()}
              </div>
            </div>

            <div className="mb-5 md:hidden">
              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[.025] p-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;

                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => !uploading && setActiveTab(tab.id)}
                      disabled={uploading}
                      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] transition ${
                        active
                          ? 'bg-white text-black'
                          : 'text-white/40'
                      }`}
                    >
                      <Icon size={15} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>

            {uploadError && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                {uploadError}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-40 shrink-0 border-t border-white/10 bg-[#090909]/96 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-15px_40px_rgba(0,0,0,.5)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            {uploading ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-white/60" />
                  <span className="truncate text-xs font-medium text-white/75">
                    {uploadStage || 'Processing'}
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>

                {uploadMessage && (
                  <p className="mt-1 truncate text-[10px] text-white/30">
                    {uploadMessage}
                  </p>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs font-medium text-white/65">
                  {videoFile ? videoFile.name : 'No video selected'}
                </p>
                <p className="mt-1 text-[10px] text-white/30">
                  {hasMusic ? 'Video + music will be merged into one final MP4.' : 'Ready when you are.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={goToPreviousTab}
              disabled={uploading || activeTabIndex === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-sm text-white/70 transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronLeft size={17} />
              <span className="hidden sm:inline">Back</span>
            </button>

            {activeTabIndex < tabs.length - 1 ? (
              <button
                type="button"
                onClick={goToNextTab}
                disabled={uploading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ChevronRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !videoFile}
                className="flex h-11 min-w-[145px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Publishing
                  </>
                ) : (
                  <>
                    <UploadCloud size={17} />
                    {scheduleEnabled ? 'Schedule' : 'Publish'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Upload;
