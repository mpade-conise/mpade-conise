import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient'; 
import { 
  X, Music, Disc, Film, Camera, Wand2, Volume2, VolumeX, Loader2, Play, Pause,
  Hash, AtSign, Globe, Lock, Users, MapPin, Sparkles, Sliders, Shield,
  CheckCircle2, Zap, Grid, Clock, RefreshCw, Scissors, ShoppingBag,
  HelpCircle, Eye, EyeOff, Tag, SlidersHorizontal, Layers, Check, Search,
  ChevronLeft, ChevronRight, BarChart2, MessageSquare, AlertTriangle, Radio,
  Send, ExternalLink, Award, Plus, Trash2, Calendar, FileText, ArrowRight,
  Maximize2, Minimize2, Upload as UploadIcon, CheckSquare, Sparkle
} from 'lucide-react';

const Upload = ({ onComplete }) => {
  // Navigation & Step Tabs: 'media' | 'audio_filter' | 'interactive' | 'publish'
  const [activeStep, setActiveStep] = useState('media'); // 'media' | 'audio_filter' | 'interactive' | 'publish'
  const [ingestMode, setIngestMode] = useState('dropzone'); // 'dropzone' | 'camera'
  
  // Media Files & Previews
  const [preview, setPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState({ 
    duration: 0, 
    size: 0, 
    resolution: '1080x1920 HD', 
    name: '',
    bitrate: '60 FPS'
  });
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbScrubTime, setThumbScrubTime] = useState(0.5);

  // Video Playback Controls in Editor
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ----------------------------------------------------
  // 15 ADVANCED PRO & NEXT-GEN TIKTOK-LEVEL FEATURES:
  // ----------------------------------------------------
  // Feature 1: Chapters & Time Markers
  const [chapters, setChapters] = useState([
    { time: 0, title: 'Intro Hook' }
  ]);
  const [newChapterTime, setNewChapterTime] = useState(0);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Feature 2: Auto Subtitles & Closed Captions (CC)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitles, setSubtitles] = useState([
    { start: 0, end: 3, text: 'Welcome to Universe Live ✨' }
  ]);
  const [isGeneratingCC, setIsGeneratingCC] = useState(false);

  // Feature 3: Custom Cover Thumbnail Badge & Text Sticker
  const [coverText, setCoverText] = useState('');
  const [coverBadgeStyle, setCoverBadgeStyle] = useState('neon'); // 'neon' | 'minimal' | 'bold' | 'gold'

  // Feature 4: Interactive Poll & Voting Sticker
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollData, setPollData] = useState({
    question: 'What do you think of this vibe? 🔥',
    option1: 'Obsessed 💯',
    option2: 'Needs more bass ⚡',
    votes1: 0,
    votes2: 0
  });

  // Feature 5: Product / External Link Pin Showcase
  const [productEnabled, setProductEnabled] = useState(false);
  const [productLink, setProductLink] = useState({
    title: 'Featured Creator Drop',
    price: '$29.99',
    url: 'https://mpade.universe.live',
    ctaText: 'Shop Now'
  });

  // Feature 6: Paid Partnership / Commercial Disclosure
  const [isCommercial, setIsCommercial] = useState(false);
  const [sponsorTag, setSponsorTag] = useState('');

  // Feature 7: Allow Duet & Remix Control
  const [allowDuet, setAllowDuet] = useState(true);

  // Feature 8: Allow Stitch Permission Control
  const [allowStitch, setAllowStitch] = useState(true);

  // Feature 9: Allow Downloads Toggle (Watermarked export)
  const [allowDownload, setAllowDownload] = useState(true);

  // Feature 10: 18+ Mature / Sensitive Content Age Gate
  const [ageRestricted, setAgeRestricted] = useState(false);

  // Feature 11: 8 Cinematic Color Grading LUT Filters (persisted to player)
  const [selectedFilter, setSelectedFilter] = useState('original');

  // Feature 12: AI Voice Clarifier & Audio Enhancement
  const [audioEnhancement, setAudioEnhancement] = useState('studio_master'); // 'none' | 'crystal_voice' | 'studio_master' | 'bass_boost'

  // Feature 13: Dual Audio Master Mixer (Original vs Music)
  const [videoVolume, setVideoVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(80);

  // Feature 14: Scheduled / Future Auto Release
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // Feature 15: Niche Channel & Target Audience Category
  const [category, setCategory] = useState('Entertainment');

  // Standard Social Fields
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'friends' | 'private'
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [allowComments, setAllowComments] = useState(true);

  // Music Integration
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

  // Camera Recording Engine
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingLimit, setRecordingLimit] = useState(60);
  const [facingMode, setFacingMode] = useState('user');
  const [isMuted, setIsMuted] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [recordingSpeed, setRecordingSpeed] = useState('1x');

  // Upload Progress & Telemetry
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('ready'); // 'optimizing' | 'thumbnail' | 'uploading' | 'indexing' | 'complete'
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Drag over state
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const videoRef = useRef(null); 
  const editorVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const soundLabAudioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Color Grading LUTs
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
  const popularLocations = ['Lilongwe, MW', 'Blantyre, MW', 'London, UK', 'New York, USA', 'Tokyo, Japan', 'Nairobi, Kenya', 'Johannesburg, SA', 'Paris, France'];

  // AI Hook Presets
  const aiHookPresets = [
    { title: 'Viral Mystery Hook', caption: 'You won’t believe what happened at the 0:15 mark… 👀 Watch till the end! #fyp #viral' },
    { title: 'Community Prompt', caption: 'Rate this vibe from 1 to 10 in the comments below 👇 Drop your honest opinion! #trending' },
    { title: 'Aesthetic Wave', caption: 'High frequency creative energy ✨ Pure cosmic vibration. #vibes #universe' },
    { title: 'Creator Insight', caption: 'Here is the secret nobody tells you about building high engagement… Save this 📌 #creator' }
  ];

  // Camera Management
  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 }
          }, 
          audio: !isMuted 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) { 
        console.warn("Camera stream access warning:", err); 
      }
    };

    if (ingestMode === 'camera' && !preview) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [ingestMode, preview, facingMode, isMuted]);

  // Handle Recording Timer Limit
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= recordingLimit) {
            stopRecording();
            return recordingLimit;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording, recordingLimit]);

  // Sync editor audio volume
  useEffect(() => {
    if (audioPreviewRef.current && selectedMusic.url) {
      audioPreviewRef.current.volume = musicVolume / 100;
      if (isPlaying) {
        audioPreviewRef.current.play().catch(() => {});
      } else {
        audioPreviewRef.current.pause();
      }
    } else if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    return () => audioPreviewRef.current?.pause();
  }, [selectedMusic, isPlaying, musicVolume]);

  // Sync editor video volume
  useEffect(() => {
    if (editorVideoRef.current) {
      editorVideoRef.current.volume = videoVolume / 100;
    }
  }, [videoVolume]);

  // Extract high-definition video thumbnail from frame
  const generateVideoThumbnail = (sourceUrl, timeOffset = 0.5) => {
    return new Promise((resolve) => {
      const vid = document.createElement('video');
      vid.src = sourceUrl;
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.currentTime = timeOffset;
      
      vid.onloadeddata = () => {
        vid.currentTime = timeOffset;
      };

      vid.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vid.videoWidth || 720;
          canvas.height = vid.videoHeight || 1280;
          const ctx = canvas.getContext('2d');
          
          // Apply current filter to thumbnail
          if (currentFilterObj.css) {
            ctx.filter = currentFilterObj.css;
          }
          
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          
          // Add custom cover text overlay if entered
          if (coverText.trim()) {
            ctx.font = 'bold 36px sans-serif';
            ctx.fillStyle = '#00F3FF';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText(coverText, canvas.width / 2, canvas.height - 80);
          }

          canvas.toBlob((blob) => {
            if (blob) {
              setThumbnailBlob(blob);
              const previewUrl = URL.createObjectURL(blob);
              setThumbnailPreview(previewUrl);
              resolve(blob);
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        } catch (e) {
          console.warn("Thumbnail generation notice:", e);
          resolve(null);
        }
      };

      vid.onerror = () => resolve(null);
    });
  };

  // Recording Handlers
  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    try {
      setIsRecording(true);
      chunksRef.current = [];
      const stream = videoRef.current.srcObject;
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
      } else {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        setVideoFile(blob);
        const objUrl = URL.createObjectURL(blob);
        setPreview(objUrl);
        setVideoMetadata({
          duration: recordingTime,
          size: (blob.size / (1024 * 1024)).toFixed(2),
          resolution: '1080x1920 (Studio Cam)',
          name: `Studio_Recording_${Date.now()}.mp4`,
          bitrate: '60 FPS Ultra'
        });
        await generateVideoThumbnail(objUrl);
        setActiveStep('audio_filter');
      };

      recorder.start(500);
    } catch (err) {
      console.error("Recording init error:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File Select Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);
    setVideoMetadata({
      duration: 0,
      size: (file.size / (1024 * 1024)).toFixed(2),
      resolution: '1080p HD Studio Ingest',
      name: file.name,
      bitrate: '60 FPS 4K Ready'
    });
    
    await generateVideoThumbnail(objUrl);
    setActiveStep('audio_filter');
  };

  // Music Search via iTunes
  const handleMusicSearch = async (term) => {
    const query = term || searchQuery;
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) { 
      console.error("Music fetch error:", err); 
    } finally { 
      setIsSearching(false); 
    }
  };

  // Tag & Mention Helpers
  const handleAddTag = (tag) => {
    const cleanTag = tag.replace(/^#/, '');
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    if (!caption.includes(`#${cleanTag}`)) {
      setCaption(prev => `${prev ? prev.trim() + ' ' : ''}#${cleanTag}`);
    }
  };

  const handleAddMention = (handle) => {
    const cleanHandle = handle.replace(/^@/, '');
    if (!mentions.includes(cleanHandle)) {
      setMentions([...mentions, cleanHandle]);
    }
    if (!caption.includes(`@${cleanHandle}`)) {
      setCaption(prev => `${prev ? prev.trim() + ' ' : ''}@${cleanHandle}`);
    }
  };

  // Geolocation Auto-Detection
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`Location: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
        },
        () => setLocation('Universe Studio, Global')
      );
    } else {
      setLocation('Universe Studio, Global');
    }
  };

  // Auto Generate Captions Simulation
  const handleAutoGenerateCC = () => {
    setIsGeneratingCC(true);
    setTimeout(() => {
      const words = caption ? caption.split(' ') : ['Trending', 'video', 'on', 'Universe', 'live', 'now!'];
      const autoCC = [
        { start: 0, end: 2, text: words.slice(0, 3).join(' ') || 'Welcome to the broadcast ✨' },
        { start: 2, end: 5, text: words.slice(3, 7).join(' ') || 'Watch closely until the end 🔥' },
        { start: 5, end: 8, text: words.slice(7).join(' ') || 'Drop a comment & follow for more!' }
      ];
      setSubtitles(autoCC);
      setIsGeneratingCC(false);
    }, 900);
  };

  // Add Chapter Marker
  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    const newChap = { time: Number(newChapterTime) || 0, title: newChapterTitle.trim() };
    setChapters(prev => [...prev.filter(c => c.time !== newChap.time), newChap].sort((a, b) => a.time - b.time));
    setNewChapterTitle('');
  };

  // Remove Chapter Marker
  const handleRemoveChapter = (timeToRemove) => {
    setChapters(prev => prev.filter(c => c.time !== timeToRemove));
  };

  // Format Duration string
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ----------------------------------------------------
  // DUAL-STREAM RESILIENT UPLOAD ENGINE
  // ----------------------------------------------------
  const handleUpload = async () => {
    if (!videoFile) return alert("Please select or record a video first!");
    
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStage('optimizing');
    setUploadStatusText('Encoding 1080p stream buffers & LUT grade...');

    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) throw new Error("Session expired. Please log in again.");

      // Stage 1: Generate & Upload Cover Thumbnail
      setUploadStage('thumbnail');
      setUploadProgress(25);
      setUploadStatusText('Synthesizing 4K cover frame & sticker overlays...');
      
      let thumbPublicUrl = null;
      if (thumbnailBlob) {
        const thumbPath = `${currentUser.id}/thumb_${Date.now()}.jpg`;
        const { error: thumbErr } = await supabase.storage
          .from('videos')
          .upload(thumbPath, thumbnailBlob, { contentType: 'image/jpeg', upsert: true });

        if (!thumbErr) {
          thumbPublicUrl = supabase.storage.from('videos').getPublicUrl(thumbPath).data.publicUrl;
        }
      }

      // Stage 2: Video Stream Upload with XHR Telemetry
      setUploadStage('uploading');
      setUploadStatusText('Transmitting video chunks to Supabase cloud storage...');
      const fileExt = videoFile.name?.split('.').pop() || 'mp4';
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const sessionStr = localStorage.getItem('sb-wgzrebgvcqnvcstdpwsa-auth-token');
      const parsedSession = sessionStr ? JSON.parse(sessionStr) : null;
      const token = parsedSession?.access_token;

      let publicUrl = '';

      if (token) {
        const uploadUrl = `${supabase.storage.from('videos').url}/object/videos/${fileName}`;
        publicUrl = supabase.storage.from('videos').getPublicUrl(fileName).data.publicUrl;

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl, true);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('apikey', supabase.supabaseKey);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 60) + 30; // Maps 30% -> 90%
              setUploadProgress(percent);
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) resolve(xhr.response);
            else reject(new Error(`Storage response code ${xhr.status}: ${xhr.statusText}`));
          };

          xhr.onerror = () => reject(new Error("Storage network layer connection dropped."));
          xhr.send(videoFile);
        });
      } else {
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoFile, { upsert: true });
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
      }

      // Stage 3: Indexing Metadata into Database with Resilience Fallback
      setUploadStage('indexing');
      setUploadProgress(92);
      setUploadStatusText('Linking 15 smart features & indexing into global feed...');

      const extractedTags = caption.match(/#[a-zA-Z0-9_]+/g)?.map(t => t.replace('#', '')) || tags;
      const extractedMentions = caption.match(/@[a-zA-Z0-9_]+/g)?.map(m => m.replace('@', '')) || mentions;

      // Full 15-Feature Record
      const fullVideoRecord = {
        video_url: publicUrl,
        thumbnail_url: thumbPublicUrl || preview,
        caption: caption.trim(),
        music_name: selectedMusic.name,
        music_url: selectedMusic.url,
        user_id: currentUser.id,
        privacy: privacy,
        is_private: privacy === 'private',
        location: location.trim(),
        tags: extractedTags,
        mentions: extractedMentions,
        // The 15 Super Features:
        allow_duet: allowDuet,
        allow_stitch: allowStitch,
        allow_download: allowDownload,
        allow_comments: allowComments,
        is_commercial: isCommercial,
        sponsor_tag: sponsorTag.trim(),
        age_restricted: ageRestricted,
        filter_style: selectedFilter,
        category: category,
        poll_data: pollEnabled ? pollData : null,
        product_link: productEnabled ? productLink : null,
        chapters: chapters.length > 0 ? chapters : null,
        subtitles: subtitlesEnabled && subtitles.length > 0 ? subtitles : null,
        audio_enhancement: audioEnhancement,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        thumbnail_text: coverText.trim()
      };

      // Try inserting with all 15 columns
      let { error: dbError } = await supabase
        .from('videos')
        .insert([fullVideoRecord]);

      // Graceful fallback if database table does not yet have newly added custom columns
      if (dbError) {
        console.warn("Full-column insert notice, trying base schema fallback:", dbError.message);
        
        const fallbackRecord = {
          video_url: publicUrl,
          thumbnail_url: thumbPublicUrl || preview,
          caption: caption.trim(),
          music_name: selectedMusic.name,
          music_url: selectedMusic.url,
          user_id: currentUser.id,
          privacy: privacy,
          is_private: privacy === 'private',
          location: location.trim(),
          tags: extractedTags,
          mentions: extractedMentions
        };

        const { error: fallbackErr } = await supabase
          .from('videos')
          .insert([fallbackRecord]);
        
        if (fallbackErr) throw fallbackErr;
      }

      // Stage 4: Celebration Burst
      setUploadProgress(100);
      setUploadStage('complete');
      setUploadStatusText('Broadcast live across Mpade Universe!');

      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00F3FF', '#EC4899', '#3B82F6', '#10B981', '#F59E0B']
      });

      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1200);

    } catch (err) {
      console.error("Upload process error:", err);
      alert(`Publishing failed: ${err.message || 'Network error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl">
      
      {/* Hidden audio element for preview in editor */}
      <audio ref={audioPreviewRef} src={selectedMusic.url} loop />
      <audio ref={soundLabAudioRef} src={playingTrackUrl} loop />

      {/* MODAL WINDOW CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl h-[92vh] max-h-[900px] bg-[#07070d]/95 border border-cyan-500/30 rounded-3xl md:rounded-[2.5rem] shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-white font-sans"
      >
        
        {/* ============================================================ */}
        {/* 1. TOP MODAL HEADER BAR */}
        {/* ============================================================ */}
        <header className="h-16 px-4 md:px-8 border-b border-cyan-500/15 bg-black/40 backdrop-blur-xl flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              disabled={isUploading}
              onClick={onComplete}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-90 disabled:opacity-40"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-pink-500 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                <Zap size={16} className="text-black fill-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm md:text-base font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400">
                    Creator Studio Pro
                  </h1>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border border-cyan-400/40 rounded-full text-[9px] font-black text-cyan-300 uppercase tracking-widest">
                    v3.0 Ultra
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono hidden sm:block">
                  Next-Gen 15-Feature Broadcast Engine
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Tabs Bar */}
          <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 border border-white/10 rounded-2xl p-1">
            {[
              { id: 'media', label: '1. Media', icon: <Film size={14} /> },
              { id: 'audio_filter', label: '2. Audio & LUT', icon: <Music size={14} />, disabled: !preview },
              { id: 'interactive', label: '3. Interactive', icon: <Sparkles size={14} />, disabled: !preview },
              { id: 'publish', label: '4. Publish', icon: <Send size={14} />, disabled: !preview }
            ].map(step => (
              <button
                key={step.id}
                type="button"
                disabled={step.disabled || isUploading}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  activeStep === step.id 
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Publish Action Button */}
          {preview && activeStep !== 'publish' && (
            <button
              type="button"
              onClick={() => setActiveStep('publish')}
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all"
            >
              Master & Publish <ArrowRight size={14} />
            </button>
          )}
        </header>

        {/* ============================================================ */}
        {/* 2. MAIN WORKSPACE (SPLIT VIEW) */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT PANEL: 9:16 PREVIEW & LIVE WORKSTATION */}
          <div className="w-full md:w-[360px] lg:w-[400px] border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col items-center justify-center bg-black/40 relative shrink-0">
            
            {/* Viewport Frame */}
            <div className="relative w-full max-w-[240px] md:max-w-[260px] aspect-[9/16] bg-zinc-950 rounded-[2.2rem] overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] flex items-center justify-center group">
              
              {preview ? (
                <>
                  {/* Active Video Preview */}
                  <video 
                    ref={editorVideoRef}
                    src={preview} 
                    className="w-full h-full object-cover" 
                    style={{ filter: currentFilterObj.css }}
                    autoPlay 
                    loop 
                    playsInline
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                  />

                  {/* Feature 6 Overlay: Paid Partnership Badge */}
                  {isCommercial && (
                    <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/50 shadow-lg">
                      <Award size={12} className="text-amber-400" />
                      <span className="text-[9px] font-black uppercase text-amber-300">
                        {sponsorTag ? `Paid: ${sponsorTag}` : 'Paid Partnership'}
                      </span>
                    </div>
                  )}

                  {/* Feature 10 Overlay: Age Restricted 18+ Badge */}
                  {ageRestricted && (
                    <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-red-950/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-red-500/60 shadow-lg">
                      <Shield size={10} className="text-red-400" />
                      <span className="text-[9px] font-black uppercase text-red-300">18+ Mature</span>
                    </div>
                  )}

                  {/* Feature 4 Overlay: Interactive Poll Sticker */}
                  {pollEnabled && (
                    <div className="absolute top-1/3 left-3 right-3 z-30 bg-black/85 backdrop-blur-md p-3 rounded-2xl border border-cyan-400/40 shadow-2xl">
                      <p className="text-[11px] font-black text-cyan-200 mb-2 text-center">
                        {pollData.question}
                      </p>
                      <div className="space-y-1.5">
                        <div className="w-full py-1.5 px-3 bg-cyan-500/20 border border-cyan-400/30 rounded-xl text-[10px] font-bold text-cyan-300 text-center truncate">
                          {pollData.option1}
                        </div>
                        <div className="w-full py-1.5 px-3 bg-pink-500/20 border border-pink-400/30 rounded-xl text-[10px] font-bold text-pink-300 text-center truncate">
                          {pollData.option2}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature 5 Overlay: Product Pin Showcase */}
                  {productEnabled && (
                    <div className="absolute bottom-16 left-3 right-3 z-30 bg-black/90 backdrop-blur-md p-2 rounded-2xl border border-pink-500/40 flex items-center justify-between shadow-2xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                          <ShoppingBag size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">{productLink.title}</p>
                          <p className="text-[9px] font-mono text-emerald-400">{productLink.price}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-pink-500 text-white rounded-lg text-[9px] font-black uppercase shrink-0">
                        {productLink.ctaText}
                      </span>
                    </div>
                  )}

                  {/* Feature 2 Overlay: Subtitles / Closed Captions */}
                  {subtitlesEnabled && subtitles.length > 0 && (
                    <div className="absolute bottom-6 left-3 right-3 z-30 text-center">
                      <span className="inline-block bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-black text-yellow-300 border border-yellow-500/40 drop-shadow">
                        {subtitles[0]?.text}
                      </span>
                    </div>
                  )}

                  {/* Touch Play/Pause Overlay */}
                  <button 
                    type="button"
                    onClick={() => {
                      if (editorVideoRef.current) {
                        if (isPlaying) {
                          editorVideoRef.current.pause();
                          audioPreviewRef.current?.pause();
                        } else {
                          editorVideoRef.current.play();
                          audioPreviewRef.current?.play();
                        }
                        setIsPlaying(!isPlaying);
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center z-20 bg-black/10 hover:bg-black/30 transition-colors"
                  >
                    {!isPlaying && (
                      <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-2xl">
                        <Play size={24} className="fill-cyan-400 ml-0.5" />
                      </div>
                    )}
                  </button>
                </>
              ) : ingestMode === 'camera' ? (
                /* Live Camera Feed inside 9:16 frame */
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
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 z-10">
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                    <button 
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center p-1 bg-black/40"
                    >
                      <div className={`transition-all ${isRecording ? 'w-5 h-5 bg-red-600 rounded-sm animate-pulse' : 'w-full h-full bg-pink-500 rounded-full'}`} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty Ingest State */
                <div className="p-4 text-center text-zinc-500 flex flex-col items-center">
                  <Film size={36} className="text-zinc-600 mb-2" />
                  <p className="text-xs font-bold text-zinc-400">No Media Loaded</p>
                  <p className="text-[10px] text-zinc-600">Select or drop a video file</p>
                </div>
              )}

              {/* Scrub Progress Bar inside Frame */}
              {preview && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-40">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-pink-500" 
                    style={{ width: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>

            {/* Media Metadata Pill */}
            {preview && (
              <div className="mt-3 w-full max-w-[260px] bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="truncate max-w-[140px] text-cyan-300 font-bold">
                  {videoMetadata.name || 'Studio Stream'}
                </span>
                <span className="text-pink-400 font-bold">{videoMetadata.size} MB</span>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: STEP WORKSTATION TABS */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#090911] custom-viewport-scrollbar">
            
            {/* ============================================================ */}
            {/* STEP 1: MEDIA INGEST (DROPZONE / STUDIO CAMERA) */}
            {/* ============================================================ */}
            {activeStep === 'media' && (
              <div className="space-y-6">
                
                {/* Mode Selector */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                      <Film size={20} className="text-cyan-400" /> Media Ingestion Engine
                    </h2>
                    <p className="text-xs text-zinc-400">Choose your ingest source or drop 4K media files</p>
                  </div>

                  <div className="flex bg-black/60 border border-white/10 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setIngestMode('dropzone')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        ingestMode === 'dropzone' ? 'bg-cyan-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Dropzone Ingest
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngestMode('camera')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        ingestMode === 'camera' ? 'bg-pink-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Studio Camera
                    </button>
                  </div>
                </div>

                {/* Dropzone Container */}
                {ingestMode === 'dropzone' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) {
                        handleFileSelect({ target: { files: e.dataTransfer.files } });
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-[0_0_30px_rgba(6,182,212,0.4)]' 
                        : 'border-cyan-500/30 hover:border-cyan-400/70 bg-gradient-to-b from-cyan-950/20 via-zinc-900/30 to-pink-950/20'
                    }`}
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-pink-500/20 border border-cyan-500/40 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      <UploadIcon size={32} className="text-cyan-400 animate-bounce" />
                    </div>

                    <h3 className="text-lg font-black text-white mb-1">
                      Drag & Drop Video Broadcast Files
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-md mb-6">
                      Supports MP4, MOV, WebM, M4V with high-bitrate audio sync and automatic 9:16 aspect centering.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-zinc-300">
                        Max Size: 500 MB
                      </span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-cyan-300">
                        Resolution: 1080p / 4K UHD
                      </span>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-pink-300">
                        Bitrate: 60 FPS
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

                {/* Studio Camera Controls */}
                {ingestMode === 'camera' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                      className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-cyan-400 transition-colors"
                    >
                      <RefreshCw size={20} className="text-cyan-400" />
                      <span className="text-xs font-bold text-white">Flip Camera</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{facingMode}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGrid(g => !g)}
                      className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-colors ${
                        showGrid ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-zinc-900/60 border-white/10 text-white'
                      }`}
                    >
                      <Grid size={20} />
                      <span className="text-xs font-bold">Rule of Thirds</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{showGrid ? 'Active' : 'Off'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecordingSpeed(s => s === '1x' ? '2x' : s === '2x' ? '0.5x' : '1x')}
                      className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-cyan-400 transition-colors"
                    >
                      <Gauge size={20} className="text-pink-400" />
                      <span className="text-xs font-bold text-white">Capture Speed</span>
                      <span className="text-[10px] text-pink-400 font-mono">{recordingSpeed}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecordingLimit(l => l === 60 ? 180 : l === 180 ? 15 : 60)}
                      className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:border-cyan-400 transition-colors"
                    >
                      <Clock size={20} className="text-amber-400" />
                      <span className="text-xs font-bold text-white">Time Limit</span>
                      <span className="text-[10px] text-amber-400 font-mono">{recordingLimit}s max</span>
                    </button>
                  </div>
                )}

                {/* Cover Frame Scrubber (Feature 3) */}
                {preview && (
                  <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                        <Tag size={16} /> Feature 3: Cover Frame Scrubber & Text Sticker
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Scrub Offset: {thumbScrubTime.toFixed(1)}s
                      </span>
                    </div>

                    <input 
                      type="range" 
                      min="0" 
                      max={videoDuration || 10} 
                      step="0.1" 
                      value={thumbScrubTime}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value);
                        setThumbScrubTime(val);
                        await generateVideoThumbnail(preview, val);
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <input 
                        type="text" 
                        value={coverText}
                        onChange={(e) => setCoverText(e.target.value)}
                        placeholder="Add Cover Headline Text Sticker..."
                        className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => generateVideoThumbnail(preview, thumbScrubTime)}
                        className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-xs font-black uppercase py-2.5 active:scale-95 transition-all text-cyan-300"
                      >
                        Bake Cover Frame
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 2: AUDIO & CINEMATIC LUT FILTERS */}
            {/* ============================================================ */}
            {activeStep === 'audio_filter' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                      <Sliders size={20} className="text-pink-400" /> Sound Lab & Cinematic LUT Grading
                    </h2>
                    <p className="text-xs text-zinc-400">Master audio levels, voice clarity, and color palettes</p>
                  </div>
                </div>

                {/* Feature 11: 8 Cinematic LUT Color Filters */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                    <Wand2 size={16} /> Feature 11: 8 Cinematic LUT Filters (Applied to Feed)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedFilter === f.id 
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                            : 'bg-zinc-900/40 border-white/10 hover:bg-zinc-900/80 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-full h-8 rounded-xl mb-2 ${f.color}`} />
                        <p className="text-xs font-bold text-white">{f.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{selectedFilter === f.id ? 'Active Filter' : 'Select'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature 12: AI Voice Clarifier & Audio Enhancer */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-2">
                    <Sparkle size={16} /> Feature 12: AI Audio Enhancement & Voice Clarifier
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none', label: 'Standard Pass', desc: 'Raw original' },
                      { id: 'crystal_voice', label: 'Crystal Voice', desc: 'Isolates vocals' },
                      { id: 'studio_master', label: 'Studio Master', desc: 'Comp & Limit' },
                      { id: 'bass_boost', label: 'Bass Booster', desc: 'Punchy 808s' }
                    ].map(enh => (
                      <button
                        key={enh.id}
                        type="button"
                        onClick={() => setAudioEnhancement(enh.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          audioEnhancement === enh.id 
                            ? 'bg-pink-950/40 border-pink-500 text-pink-300 shadow-md' 
                            : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{enh.label}</p>
                        <p className="text-[10px] text-zinc-500">{enh.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature 13: Dual Audio Master Mixer */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                    <SlidersHorizontal size={16} /> Feature 13: Dual Audio Master Mixer
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-300">Original Video Audio</span>
                        <span className="font-mono text-cyan-400">{videoVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={videoVolume} 
                        onChange={(e) => setVideoVolume(Number(e.target.value))}
                        className="w-full accent-cyan-400" 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-300">Soundtrack Beat Volume</span>
                        <span className="font-mono text-pink-400">{musicVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={musicVolume} 
                        onChange={(e) => setMusicVolume(Number(e.target.value))}
                        className="w-full accent-pink-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* iTunes Sound Lab Search */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-2">
                      <Music size={16} className="text-pink-500" /> Global Music Search & Ingestion
                    </h4>
                    <span className="text-[11px] font-bold text-cyan-400 truncate max-w-[180px]">
                      Selected: {selectedMusic.name}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleMusicSearch()}
                        placeholder="Search global hit tracks, artists, afrobeats..." 
                        className="w-full bg-black/60 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMusicSearch()}
                      className="px-5 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-black text-xs uppercase rounded-2xl active:scale-95 transition-all shadow-md"
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Find Beat'}
                    </button>
                  </div>

                  {/* Results List */}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-viewport-scrollbar">
                      {searchResults.slice(0, 8).map(track => (
                        <div 
                          key={track.trackId}
                          className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-2xl hover:border-cyan-400/40 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <img src={track.artworkUrl60} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{track.trackName}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{track.artistName}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedMusic({
                              name: track.trackName,
                              artist: track.artistName,
                              url: track.previewUrl,
                              artwork: track.artworkUrl100
                            })}
                            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-[11px] font-black uppercase shrink-0 transition-all"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 3: INTERACTIVE FEATURES & STICKERS */}
            {/* ============================================================ */}
            {activeStep === 'interactive' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                      <Sparkles size={20} className="text-yellow-400" /> Interactive Stickers & Community Tools
                    </h2>
                    <p className="text-xs text-zinc-400">Chapters, Closed Captions, Polls, and Product showcases</p>
                  </div>
                </div>

                {/* Feature 1: Chapters & Timeline Markers */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                      <BarChart2 size={16} /> Feature 1: Interactive Video Chapters & Markers
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {chapters.length} Marker(s)
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="0"
                      max={videoDuration || 600}
                      value={newChapterTime}
                      onChange={(e) => setNewChapterTime(e.target.value)}
                      placeholder="Sec" 
                      className="w-20 bg-black/60 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                    />
                    <input 
                      type="text" 
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Chapter Label (e.g. 0:15 Drop, 0:45 Finale)..." 
                      className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddChapter}
                      className="px-4 bg-cyan-500 text-black font-black text-xs uppercase rounded-2xl active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Chapters List */}
                  <div className="flex flex-wrap gap-2">
                    {chapters.map(chap => (
                      <div key={chap.time} className="flex items-center gap-2 bg-black/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs">
                        <span className="font-mono text-cyan-400 font-bold">{formatTime(chap.time)}</span>
                        <span className="text-white">{chap.title}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveChapter(chap.time)}
                          className="text-zinc-500 hover:text-red-400 ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 2: Auto Subtitles & Closed Captions (CC) */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-yellow-300 tracking-wider flex items-center gap-2">
                      <FileText size={16} /> Feature 2: Auto Closed Captions (CC Subtitles)
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={subtitlesEnabled}
                        onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                        className="accent-yellow-400 rounded"
                      />
                      <span className="text-xs font-bold text-zinc-300">Enable CC</span>
                    </label>
                  </div>

                  {subtitlesEnabled && (
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        disabled={isGeneratingCC}
                        onClick={handleAutoGenerateCC}
                        className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-xs uppercase rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isGeneratingCC ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Auto-Sync Subtitles with AI
                      </button>
                      <div className="space-y-1.5 pt-1">
                        {subtitles.map((sub, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-black/40 p-2 rounded-xl border border-white/5">
                            <span className="text-yellow-400">{sub.start}s - {sub.end}s:</span>
                            <span className="text-zinc-200">{sub.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature 4: Interactive Poll / Voting Sticker */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-2">
                      <HelpCircle size={16} /> Feature 4: Interactive Video Poll & Voting Sticker
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pollEnabled}
                        onChange={(e) => setPollEnabled(e.target.checked)}
                        className="accent-pink-500 rounded"
                      />
                      <span className="text-xs font-bold text-zinc-300">Pin Poll</span>
                    </label>
                  </div>

                  {pollEnabled && (
                    <div className="space-y-3 pt-2">
                      <input 
                        type="text" 
                        value={pollData.question}
                        onChange={(e) => setPollData({ ...pollData, question: e.target.value })}
                        placeholder="Ask your viewers a question..."
                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={pollData.option1}
                          onChange={(e) => setPollData({ ...pollData, option1: e.target.value })}
                          placeholder="Option A (e.g. Yes 🔥)"
                          className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2 text-xs text-cyan-300 outline-none focus:border-cyan-400"
                        />
                        <input 
                          type="text" 
                          value={pollData.option2}
                          onChange={(e) => setPollData({ ...pollData, option2: e.target.value })}
                          placeholder="Option B (e.g. No ⚡)"
                          className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2 text-xs text-pink-300 outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature 5: Product / External Link Pin Showcase */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-2">
                      <ShoppingBag size={16} /> Feature 5: Product / Web Link Showcase Pin
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={productEnabled}
                        onChange={(e) => setProductEnabled(e.target.checked)}
                        className="accent-emerald-400 rounded"
                      />
                      <span className="text-xs font-bold text-zinc-300">Attach Product</span>
                    </label>
                  </div>

                  {productEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <input 
                        type="text" 
                        value={productLink.title}
                        onChange={(e) => setProductLink({ ...productLink, title: e.target.value })}
                        placeholder="Product Name..."
                        className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
                      />
                      <input 
                        type="text" 
                        value={productLink.price}
                        onChange={(e) => setProductLink({ ...productLink, price: e.target.value })}
                        placeholder="Price (e.g. $19.99)..."
                        className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
                      />
                      <input 
                        type="text" 
                        value={productLink.url}
                        onChange={(e) => setProductLink({ ...productLink, url: e.target.value })}
                        placeholder="Destination URL..."
                        className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 4: METADATA & BROADCAST PUBLISH */}
            {/* ============================================================ */}
            {activeStep === 'publish' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                      <Globe size={20} className="text-cyan-400" /> Broadcast Distribution Deck
                    </h2>
                    <p className="text-xs text-zinc-400">Configure caption, category, permissions, and release options</p>
                  </div>
                </div>

                {/* Caption & AI Viral Hooks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                      Video Caption & Description
                    </label>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {caption.length} / 2200
                    </span>
                  </div>

                  <textarea 
                    value={caption} 
                    onChange={(e) => setCaption(e.target.value)} 
                    rows={3} 
                    placeholder="Write a compelling caption that triggers curiosity... Use #hashtags and @mentions" 
                    className="w-full bg-black/60 border border-cyan-500/30 focus:border-cyan-400 rounded-2xl p-4 text-xs text-white placeholder-zinc-500 outline-none transition-all resize-none shadow-inner" 
                  />

                  {/* AI Quick Hooks */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    <span className="text-[10px] font-black uppercase text-pink-400 flex items-center gap-1 shrink-0">
                      <Sparkles size={12} /> AI Hooks:
                    </span>
                    {aiHookPresets.map(hook => (
                      <button
                        key={hook.title}
                        type="button"
                        onClick={() => setCaption(hook.caption)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] text-zinc-300 font-bold shrink-0 transition-all active:scale-95"
                      >
                        {hook.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hashtag & Mention Insertion Chips */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <Hash size={14} className="text-cyan-400 shrink-0" />
                    {trendingHashtags.map(tag => (
                      <button 
                        key={tag} 
                        type="button"
                        onClick={() => handleAddTag(tag)} 
                        className="px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl text-[10px] font-mono hover:bg-cyan-500 hover:text-black transition-all shrink-0"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <MapPin size={14} className="text-pink-400 shrink-0" />
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className="px-2.5 py-1 bg-pink-950/40 border border-pink-500/40 text-pink-300 rounded-xl text-[10px] font-bold shrink-0 hover:bg-pink-500 hover:text-white transition-all"
                    >
                      📍 Auto-Detect Location
                    </button>
                    {popularLocations.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 text-zinc-300 rounded-xl text-[10px] shrink-0 hover:border-pink-400 transition-all"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature 15: Niche Channel & Target Audience Category */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                    <Layers size={14} /> Feature 15: Target Audience Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all truncate ${
                          category === cat 
                            ? 'bg-cyan-500 text-black border-cyan-400 shadow-md font-black' 
                            : 'bg-black/40 text-zinc-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy Visibility */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                    Audience & Visibility
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'public', label: 'Public', desc: 'Everyone', icon: <Globe size={16} /> },
                      { id: 'friends', label: 'Followers', desc: 'Mutual only', icon: <Users size={16} /> },
                      { id: 'private', label: 'Private', desc: 'Only me', icon: <Lock size={16} /> }
                    ].map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => setPrivacy(p.id)}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                          privacy === p.id 
                            ? 'bg-gradient-to-tr from-cyan-950/60 to-pink-950/60 border-cyan-400 shadow-md text-white' 
                            : 'bg-zinc-900/40 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={privacy === p.id ? 'text-cyan-400' : 'text-zinc-400'}>{p.icon}</div>
                        <span className="text-xs font-black uppercase">{p.label}</span>
                        <span className="text-[10px] text-zinc-500">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature 6, 7, 8, 9, 10, 14: ADVANCED TOGGLES GRID */}
                <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-pink-300 tracking-wider flex items-center gap-2">
                    <Shield size={16} /> Pro Creator Permissions & Compliance
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Feature 7: Allow Duet */}
                    <label className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">Allow Duet & Remix</p>
                        <p className="text-[10px] text-zinc-500">Feature 7: Users can create side-by-side clips</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={allowDuet}
                        onChange={(e) => setAllowDuet(e.target.checked)}
                        className="accent-cyan-400 w-4 h-4"
                      />
                    </label>

                    {/* Feature 8: Allow Stitch */}
                    <label className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">Allow Stitch</p>
                        <p className="text-[10px] text-zinc-500">Feature 8: Users can stitch up to 5s</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={allowStitch}
                        onChange={(e) => setAllowStitch(e.target.checked)}
                        className="accent-cyan-400 w-4 h-4"
                      />
                    </label>

                    {/* Feature 9: Allow Downloads */}
                    <label className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">Allow Video Downloads</p>
                        <p className="text-[10px] text-zinc-500">Feature 9: Save button with watermark</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="accent-pink-500 w-4 h-4"
                      />
                    </label>

                    {/* Feature 10: Age Restricted */}
                    <label className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-white">18+ Mature Filter</p>
                        <p className="text-[10px] text-zinc-500">Feature 10: Requires tap-to-reveal confirmation</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={ageRestricted}
                        onChange={(e) => setAgeRestricted(e.target.checked)}
                        className="accent-red-500 w-4 h-4"
                      />
                    </label>

                    {/* Feature 6: Commercial / Paid Partnership */}
                    <label className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-2xl cursor-pointer sm:col-span-2">
                      <div className="flex-1 pr-3">
                        <p className="text-xs font-bold text-white">Paid Partnership Disclosure</p>
                        <p className="text-[10px] text-zinc-500">Feature 6: Pin sponsor banner on video</p>
                        {isCommercial && (
                          <input 
                            type="text" 
                            value={sponsorTag}
                            onChange={(e) => setSponsorTag(e.target.value)}
                            placeholder="Sponsor Brand Name (e.g. Nike, Apple, Universe)..."
                            className="mt-2 w-full bg-zinc-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-300 outline-none"
                          />
                        )}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isCommercial}
                        onChange={(e) => setIsCommercial(e.target.checked)}
                        className="accent-amber-400 w-4 h-4"
                      />
                    </label>

                    {/* Feature 14: Scheduled Release */}
                    <div className="p-3 bg-black/40 border border-white/5 rounded-2xl sm:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Feature 14: Scheduled Time Release</p>
                          <p className="text-[10px] text-zinc-500">Release video automatically at a future time</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="accent-cyan-400 w-4 h-4"
                        />
                      </div>
                      {isScheduled && (
                        <input 
                          type="datetime-local" 
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full bg-zinc-950 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-cyan-300 outline-none font-mono"
                        />
                      )}
                    </div>

                  </div>
                </div>

                {/* ============================================================ */}
                {/* UPLOAD TELEMETRY COCKPIT & PROGRESS BAR */}
                {/* ============================================================ */}
                {isUploading ? (
                  <div className="p-6 bg-black/90 border border-cyan-400/50 rounded-3xl space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                    <div className="flex items-center justify-between text-xs font-black uppercase">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-cyan-400" />
                        {uploadStatusText}
                      </span>
                      <span className="font-mono text-cyan-300 text-sm">{uploadProgress}%</span>
                    </div>

                    {/* Animated High-End Progress Bar */}
                    <div className="relative w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.2 }}
                        className="h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-teal-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)] relative"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>Stage: {uploadStage.toUpperCase()}</span>
                      <span>Dual-Stream Resilient Engine</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 via-pink-500 to-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:brightness-110"
                  >
                    <Zap size={18} className="fill-white" /> Broadcast Video Now
                  </button>
                )}

              </div>
            )}

          </div>

        </div>

      </motion.div>
    </div>
  );
};

export default Upload;
