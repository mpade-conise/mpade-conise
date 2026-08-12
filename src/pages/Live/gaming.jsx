import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from './Shared/VideoPlayer';
import { 
  Users, Gift, Share2, X, Mic, MicOff, Video, VideoOff, Settings, Radio,
  Camera, Gamepad2, Sparkles, RefreshCw, Monitor, Search, Shield, Play,
  Volume2, VolumeX, Flame, Trophy, Zap, MessageCircle, Send, Heart, Smile,
  Maximize2, Copy, Check, Award, Music, Sliders, Activity, Clock, Crown
} from 'lucide-react';

// --- WEB AUDIO API SYNTHESIZER FOR INTERACTIVE SOUNDBOARD ---
const playSoundEffect = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const createNote = (freq, startTime, duration, type = 'sine', gainVal = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    if (type === 'victory') {
      // Fanfare ascending triad
      createNote(523.25, 0, 0.25, 'triangle', 0.4); // C5
      createNote(659.25, 0.15, 0.25, 'triangle', 0.4); // E5
      createNote(783.99, 0.30, 0.25, 'triangle', 0.4); // G5
      createNote(1046.50, 0.45, 0.50, 'triangle', 0.5); // C6
    } else if (type === 'defeat') {
      // Descending game over tune
      createNote(392.00, 0, 0.3, 'sawtooth', 0.3); // G4
      createNote(349.23, 0.2, 0.3, 'sawtooth', 0.3); // F4
      createNote(311.13, 0.4, 0.3, 'sawtooth', 0.3); // Eb4
      createNote(261.63, 0.6, 0.6, 'sawtooth', 0.4); // C4
    } else if (type === 'gg') {
      // High double chime
      createNote(1318.51, 0, 0.15, 'sine', 0.3); // E6
      createNote(1760.00, 0.12, 0.30, 'sine', 0.4); // A6
    } else if (type === 'airhorn') {
      // Staccato synth pulse
      createNote(370, 0, 0.1, 'sawtooth', 0.5);
      createNote(370, 0.12, 0.1, 'sawtooth', 0.5);
      createNote(370, 0.24, 0.25, 'sawtooth', 0.6);
    } else if (type === 'hype') {
      // Energetic chord sweep
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        createNote(freq, idx * 0.08, 0.35, 'square', 0.2);
      });
    } else if (type === 'clap') {
      // Applause noise burst
      for (let i = 0; i < 6; i++) {
        createNote(200 + Math.random() * 800, i * 0.06, 0.08, 'square', 0.15);
      }
    }
  } catch (e) {
    console.error("Audio synth error:", e);
  }
};

const MobileGamingSetup = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('MOBILE GAMING');

  // WEBRTC & SIGNALING REFS
  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);

  // STREAM & GAME STATE
  const [title, setTitle] = useState("");
  const [selectedGame, setSelectedGame] = useState("PUBG Mobile");
  const [customGameSearch, setCustomGameSearch] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [streamQuality, setStreamQuality] = useState("1080p 60FPS");
  const [activeStreamData, setActiveStreamData] = useState(null);

  // MEDIA CAPTURE STATE
  const [screenStream, setScreenStream] = useState(null);
  const [camStream, setCamStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCamOverlayOn, setIsCamOverlayOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [camPosition, setCamPosition] = useState("bottom-right"); // 'top-left', 'top-right', 'bottom-left', 'bottom-right'

  // AUDIO LEVEL VISUALIZER
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // IN-STREAM INTERACTIVE MODALS & OVERLAYS
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChatOverlay, setShowChatOverlay] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [streamEndSummary, setStreamEndSummary] = useState(null);

  // SQUAD / CO-HOST SEARCH STATE
  const [squadSearchQuery, setSquadSearchQuery] = useState("");
  const [squadUsersList, setSquadUsersList] = useState([]);
  const [squadInvitesSent, setSquadInvitesSent] = useState(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  // LIVE STREAM HUD METRICS & CHAT
  const [streamUptime, setStreamUptime] = useState(0);
  const [viewerCount, setViewerCount] = useState(124);
  const [likesCount, setLikesCount] = useState(850);
  const [coinsEarned, setCoinsEarned] = useState(320);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [recentGifts, setRecentGifts] = useState([]);

  // POPULAR MOBILE & PC GAMES LIST
  const popularGames = [
    "PUBG Mobile", "Free Fire", "Call of Duty: Mobile", 
    "Mobile Legends", "Genshin Impact", "Roblox", "Fortnite",
    "Apex Legends", "Minecraft", "GTA V", "Valorant", "EA SPORTS FC",
    "Wild Rift", "Clash Royale", "Brawl Stars"
  ];

  const filteredGames = popularGames.filter(g => 
    g.toLowerCase().includes(customGameSearch.toLowerCase())
  );

  // STREAM TITLE TEMPLATES
  const titleTemplates = [
    `Streaming ${selectedGame} Ranked Push! 🎮🔥`,
    `Live ${selectedGame} Squad Tournament 🏆`,
    `Playing ${selectedGame} with Viewers! 💬`,
    `${selectedGame} Pro Gameplay & Chill Chat ✨`
  ];

  // FETCH ACTIVE STREAM DATA
  useEffect(() => {
    if (streamId) {
      const fetchStream = async () => {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*, profiles:host_id(username, avatar_url)')
          .eq('id', streamId)
          .single();
        if (data) {
          setActiveStreamData(data);
          if (data.category) setSelectedGame(data.category);
          if (data.title) setTitle(data.title);
        }
      };
      fetchStream();
    }
  }, [streamId]);

  // STREAM UPTIME TIMER & RANDOM ENGAGEMENT SIMULATOR
  useEffect(() => {
    if (!streamId) return;

    const timer = setInterval(() => {
      setStreamUptime(prev => prev + 1);
    }, 1000);

    const engagementInterval = setInterval(() => {
      setViewerCount(prev => Math.max(10, prev + Math.floor(Math.random() * 5) - 2));
      setLikesCount(prev => prev + Math.floor(Math.random() * 3));
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(engagementInterval);
    };
  }, [streamId]);

  // BIND MEDIA STREAMS TO VIDEO ELEMENTS
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, streamId, isScreenSharing]);

  useEffect(() => {
    if (camVideoRef.current && camStream) {
      camVideoRef.current.srcObject = camStream;
    }
  }, [camStream, streamId, isCamOverlayOn]);

  // START SCREEN SHARE CAPTURE
  const startScreenCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Display media sharing is not supported on this browser. Please use a desktop browser or camera mode.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", frameRate: 60 },
        audio: true
      });
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      displayStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
      };
    } catch (err) {
      console.error("Screen capture cancelled or failed", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  // WEBCAM OVERLAY PREVIEW & MIC AUDIO METER
  useEffect(() => {
    if (isCamOverlayOn && !camStream) startCamPreview();
    else if (!isCamOverlayOn) stopCamPreview();

    return () => {
      if (!streamId) stopCamPreview();
    };
  }, [isCamOverlayOn]);

  const startCamPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setCamStream(mediaStream);

      // Setup audio level analyzer for mic indicator
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(average * 2)));
          if (camStream) requestAnimationFrame(checkAudio);
        };
        checkAudio();
      } catch (audioErr) {
        console.warn("Audio meter setup warning:", audioErr);
      }

    } catch (err) {
      console.warn("Webcam preview access error:", err);
      setIsCamOverlayOn(false);
    }
  };

  const stopCamPreview = () => {
    if (camStream) {
      camStream.getTracks().forEach(track => track.stop());
      setCamStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // TOGGLE MIC MUTE
  const toggleMic = () => {
    if (camStream) {
      const audioTrack = camStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  // INITIALIZE WEBRTC & REALTIME SIGNALING
  const initWebRTCSignaling = async (targetStreamId) => {
    const iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    if (screenStream) {
      screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }
    if (isCamOverlayOn && camStream) {
      camStream.getTracks().forEach(track => pc.addTrack(track, camStream));
    }

    const channel = supabase.channel(`stream_signaling:${targetStreamId}`, {
      config: { broadcast: { self: false } }
    });
    signalingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'viewer-answer' }, async ({ payload }) => {
        if (payload.answer && pc.signalingState !== 'closed') {
          console.log("📡 [WebRTC] Received Viewer SDP Answer");
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      })
      .on('broadcast', { event: 'viewer-ice-candidate' }, async ({ payload }) => {
        if (payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe((status) => {
        console.log(`📡 [Supabase Realtime] Gaming signaling status: ${status}`);
        if (status === 'SUBSCRIBED') {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'host-ice-candidate',
                payload: { candidate: event.candidate }
              });
            }
          };
        }
      });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const { error: updateError } = await supabase
      .from('live_streams')
      .update({ 
        offer: offer,
        status: 'live' 
      })
      .eq('id', targetStreamId);

    if (updateError) {
      console.error("❌ Failed to update stream offer:", updateError);
    }
  };

  // START GAMING STREAM
  const handleStartGamingStream = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const finalTitle = title.trim() || `${user?.user_metadata?.username || 'Gamer'}'s ${selectedGame} Stream 🎮`;

      const { data, error } = await supabase
        .from('live_streams')
        .insert([{ 
          title: finalTitle,
          host_id: user?.id,
          category: selectedGame,
          privacy,
          status: 'pending'
        }])
        .select().single();

      if (!error && data) {
        await initWebRTCSignaling(data.id);
        navigate(`/live/gaming/${data.id}`);
      } else {
        console.error("❌ Failed to create gaming stream in Supabase:", error);
        alert("Failed to create stream session. Please check connection.");
      }
    } catch (err) {
      console.error("⚠️ Error starting gaming stream:", err);
    } finally {
      setLoading(false);
    }
  };

  // END GAMING STREAM
  const handleConfirmEndStream = async () => {
    if (streamId) {
      await supabase
        .from('live_streams')
        .update({ status: 'ended' })
        .eq('id', streamId);
    }

    setStreamEndSummary({
      duration: formatTime(streamUptime),
      peakViewers: viewerCount,
      totalLikes: likesCount,
      coinsEarned: coinsEarned,
      game: selectedGame
    });

    stopScreenCapture();
    stopCamPreview();
    setShowEndConfirm(false);
  };

  // SQUAD / CO-HOST USERS SEARCH
  const handleSearchSquadUsers = async (query) => {
    setSquadSearchQuery(query);
    if (!query.trim()) {
      setSquadUsersList([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(8);

      if (data) setSquadUsersList(data);
    } catch (err) {
      console.error("Squad search error:", err);
    }
  };

  // SEND SQUAD DIRECT CO-HOST INVITE
  const handleInviteSquadMember = async (user) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      await supabase.from('live_guest_requests').upsert({
        stream_id: streamId || 'pending_gaming',
        user_id: user.id,
        username: user.username || 'Gamer',
        avatar_url: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'invited',
        mode: 'audio'
      });

      if (currentUser?.id) {
        await supabase.from('activities').insert({
          user_id: user.id,
          actor_id: currentUser.id,
          type: 'live_invite',
          description: JSON.stringify({
            stream_id: streamId || '',
            mode: 'audio',
            host_name: currentUser.user_metadata?.username || 'Host Gamer'
          })
        });
      }

      setSquadInvitesSent(prev => new Set([...prev, user.id]));
    } catch (err) {
      console.error("Squad invite error:", err);
    }
  };

  // COPY STREAM SHARE LINK
  const handleCopyStreamLink = () => {
    const link = `${window.location.origin}/live/watch/${streamId || ''}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // SEND CHAT MESSAGE
  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'You (Streamer)',
      text: chatInput.trim(),
      isHost: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput("");
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // TRIGGER SOUND EFFECT & BROADCAST
  const handleTriggerSound = (type) => {
    playSoundEffect(type);
    setShowSoundboard(false);
  };

  // BOTTOM NAVIGATION TABS
  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'DEVICE CAMERA', path: '/live/device-camera', mode: 'camera', icon: <Camera size={14}/> },
    { name: 'GO WITH GUEST', path: '/live/guest', mode: 'guest', icon: <Users size={14}/> },
    { name: 'MOBILE GAMING', mode: 'gaming', icon: <Gamepad2 size={14}/> },
  ];

  const handleTabClick = (tab) => {
    if (tab.mode === 'gaming') return;
    if (tab.path) navigate(tab.path);
  };

  // TIME FORMATTER
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // CAM PIP CORNER POSITION CLASSES
  const getCamPositionClass = () => {
    switch (camPosition) {
      case 'top-left': return 'top-3 left-3';
      case 'top-right': return 'top-3 right-3';
      case 'bottom-left': return 'bottom-3 left-3';
      default: return 'bottom-3 right-3';
    }
  };

  // ----------------------------------------------------
  // RENDER END SESSION SUMMARY MODAL
  // ----------------------------------------------------
  if (streamEndSummary) {
    return (
      <div className="h-[100dvh] bg-[#030308] text-white flex items-center justify-center p-4 relative font-sans overflow-hidden">
        <div className="fixed inset-0 bg-pink-600/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="w-full max-w-md bg-zinc-900/90 border border-pink-500/40 p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-6 text-center backdrop-blur-2xl relative z-10">
          <div className="w-16 h-16 bg-pink-500/20 border border-pink-400 rounded-full flex items-center justify-center mx-auto text-pink-400 shadow-lg">
            <Trophy size={32} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Gaming Stream Ended
            </h2>
            <p className="text-xs text-pink-300 font-medium mt-1">
              Category: <span className="font-bold text-white">{streamEndSummary.game}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-black/50 border border-cyan-500/30 p-3 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-cyan-300">Duration</p>
              <p className="text-lg font-black text-white mt-0.5">{streamEndSummary.duration}</p>
            </div>
            <div className="bg-black/50 border border-pink-500/30 p-3 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-pink-300">Peak Viewers</p>
              <p className="text-lg font-black text-white mt-0.5">{streamEndSummary.peakViewers}</p>
            </div>
            <div className="bg-black/50 border border-pink-500/30 p-3 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-pink-300">Total Likes</p>
              <p className="text-lg font-black text-white mt-0.5">{streamEndSummary.totalLikes}</p>
            </div>
            <div className="bg-black/50 border border-amber-500/30 p-3 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-amber-300">Coins Earned</p>
              <p className="text-lg font-black text-amber-400 mt-0.5">{streamEndSummary.coinsEarned} 🪙</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/live')}
            className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // IF STREAM IS ACTIVE (BROADCAST HUD DASHBOARD)
  // ----------------------------------------------------
  if (streamId) {
    return (
      <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative">
        {/* WEBRTC LIVE BROADCAST PIPELINE FOR VIEWERS */}
        <div className="hidden">
          <VideoPlayer streamId={streamId} isHost={true} streamType="gaming" customStream={screenStream || camStream} />
        </div>

        {/* NEON BACKGROUND AMBIENT GLOW */}
        <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
        <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

        {/* TOP GAMING HUD BAR */}
        <div className="w-full z-50 p-3 sm:p-5 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
          {/* LEFT BADGES */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-pink-500/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <span className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-ping" />
              <span className="text-[10px] sm:text-xs font-black uppercase text-pink-300 tracking-wider">LIVE</span>
              <span className="text-zinc-500">|</span>
              <span className="text-[10px] sm:text-xs font-bold text-zinc-200">{selectedGame}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-black/50 border border-cyan-500/30 px-3 py-1.5 rounded-full text-[10px] text-cyan-300 font-mono">
              <Clock size={12} className="text-cyan-400" />
              <span>{formatTime(streamUptime)}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-black/50 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[10px] text-emerald-400 font-mono font-bold">
              <span>{streamQuality}</span>
            </div>
          </div>

          {/* RIGHT METRICS & END BUTTON */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold">
              <Users size={14} className="text-cyan-400" />
              <span className="text-cyan-200">{viewerCount}</span>
            </div>

            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-bold">
              <Gift size={14} className="text-amber-400" />
              <span className="text-amber-300">{coinsEarned} 🪙</span>
            </div>

            <button 
              onClick={() => setShowEndConfirm(true)}
              className="px-4 py-1.5 bg-red-600/90 hover:bg-red-500 border border-red-400 rounded-full text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all active:scale-95"
            >
              End Stream
            </button>
          </div>
        </div>

        {/* MAIN GAME DISPLAY STAGE & CHAT OVERLAY */}
        <div className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
          
          <div className="w-full max-w-5xl h-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-pink-500/40 shadow-[0_0_40px_rgba(244,63,94,0.25)] relative bg-black flex items-center justify-center">
            
            {/* SCREEN SHARE GAMEPLAY DISPLAY */}
            <video 
              ref={screenVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-contain ${screenStream ? 'block' : 'hidden'}`} 
            />

            {/* FALLBACK WHEN SCREEN IS NOT CAPTURED */}
            {!screenStream && (
              <div className="flex flex-col items-center gap-3 p-6 text-center z-10">
                <div className="w-16 h-16 bg-pink-500/20 border border-pink-500/40 rounded-full flex items-center justify-center text-pink-400 shadow-xl">
                  <Gamepad2 size={36} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-pink-300 uppercase tracking-widest">
                    Broadcasting {selectedGame}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Select your game display or window to share live gameplay with your audience.
                  </p>
                </div>
                <button 
                  onClick={startScreenCapture}
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-cyan-600 border border-pink-400/60 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.5)] hover:scale-105 active:scale-95 transition-all"
                >
                  Share Game Screen
                </button>
              </div>
            )}

            {/* PIP FACE-CAM OVERLAY */}
            {isCamOverlayOn && (
              <div className={`absolute ${getCamPositionClass()} w-24 h-24 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] bg-zinc-900 z-30 group transition-all`}>
                <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                
                {/* MIC INDICATOR BAR */}
                <div className="absolute bottom-1 left-1 right-1 h-1 bg-black/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  />
                </div>

                {/* CORNER POSITION TOGGLE CONTROLS ON HOVER */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button 
                    onClick={() => setCamPosition(camPosition === 'bottom-right' ? 'bottom-left' : 'bottom-right')}
                    className="p-1 bg-white/20 hover:bg-white/40 rounded text-white text-[9px] font-bold"
                  >
                    Move
                  </button>
                </div>
              </div>
            )}

            {/* FLOATING TRANSPARENT CHAT OVERLAY */}
            {showChatOverlay && (
              <div className="absolute left-3 bottom-3 w-64 sm:w-80 max-h-48 sm:max-h-64 flex flex-col justify-end pointer-events-auto z-20">
                <div className="space-y-1.5 overflow-y-auto max-h-40 no-scrollbar p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                  {chatMessages.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 italic px-2">Live stream chat messages will appear here...</p>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className="text-[11px] leading-tight px-2 py-1 rounded bg-black/30">
                        <span className={`font-bold mr-1 ${msg.isHost ? 'text-pink-400' : 'text-cyan-300'}`}>
                          {msg.sender}:
                        </span>
                        <span className="text-zinc-200">{msg.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* IN-STREAM CHAT INPUT */}
                <form onSubmit={handleSendChat} className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder="Send chat to viewers..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400"
                  />
                  <button 
                    type="submit"
                    className="p-1.5 bg-pink-600 rounded-xl text-white hover:bg-pink-500"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM FLOATING GAMING TOOLBAR */}
        <div className="w-full z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-2xl border-t border-cyan-500/30 flex items-center justify-center gap-3 sm:gap-6 flex-wrap pointer-events-auto">
          <button 
            onClick={startScreenCapture}
            className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
              isScreenSharing 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor size={18} />
            <span className="hidden sm:inline">{isScreenSharing ? 'Screen On' : 'Share Screen'}</span>
          </button>

          <button 
            onClick={() => setIsCamOverlayOn(!isCamOverlayOn)}
            className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
              isCamOverlayOn 
                ? 'bg-pink-500/20 border-pink-400 text-pink-300' 
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isCamOverlayOn ? <Video size={18} /> : <VideoOff size={18} />}
            <span className="hidden sm:inline">{isCamOverlayOn ? 'Cam On' : 'Cam Off'}</span>
          </button>

          <button 
            onClick={toggleMic}
            className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
              isMicOn 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                : 'bg-red-500/20 border-red-400 text-red-300'
            }`}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            <span className="hidden sm:inline">{isMicOn ? 'Mic Active' : 'Mic Muted'}</span>
          </button>

          <button 
            onClick={() => setShowSoundboard(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Music size={18} />
            <span className="hidden sm:inline">Soundboard</span>
          </button>

          <button 
            onClick={() => setShowSquadModal(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Users size={18} />
            <span className="hidden sm:inline">Squad / Co-Hosts</span>
          </button>

          <button 
            onClick={() => setShowChatOverlay(!showChatOverlay)}
            className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold transition-all ${
              showChatOverlay 
                ? 'bg-purple-500/20 border-purple-400 text-purple-300' 
                : 'bg-zinc-900 border-white/10 text-zinc-400'
            }`}
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">Chat Overlay</span>
          </button>
        </div>

        {/* MODAL: SOUNDBOARD */}
        <AnimatePresence>
          {showSoundboard && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/40 p-6 rounded-3xl space-y-4 text-center">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Music size={20} />
                    <h3 className="font-black text-sm uppercase tracking-wider text-white">Stream Soundboard</h3>
                  </div>
                  <button onClick={() => setShowSoundboard(false)} className="text-zinc-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleTriggerSound('victory')}
                    className="p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Trophy size={24} className="text-amber-400" />
                    <span className="text-xs font-black uppercase text-amber-200">Victory Fanfare</span>
                  </button>

                  <button 
                    onClick={() => handleTriggerSound('defeat')}
                    className="p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Flame size={24} className="text-red-400" />
                    <span className="text-xs font-black uppercase text-red-200">Defeat Tune</span>
                  </button>

                  <button 
                    onClick={() => handleTriggerSound('gg')}
                    className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Sparkles size={24} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase text-emerald-200">Good Game (GG)</span>
                  </button>

                  <button 
                    onClick={() => handleTriggerSound('airhorn')}
                    className="p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Zap size={24} className="text-cyan-400" />
                    <span className="text-xs font-black uppercase text-cyan-200">Airhorn Pulse</span>
                  </button>

                  <button 
                    onClick={() => handleTriggerSound('hype')}
                    className="p-4 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Crown size={24} className="text-pink-400" />
                    <span className="text-xs font-black uppercase text-pink-200">Hype Chords</span>
                  </button>

                  <button 
                    onClick={() => handleTriggerSound('clap')}
                    className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                  >
                    <Award size={24} className="text-purple-400" />
                    <span className="text-xs font-black uppercase text-purple-200">Applause</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: SQUAD / CO-HOST MANAGER */}
        <AnimatePresence>
          {showSquadModal && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-zinc-900 border border-indigo-500/40 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Users size={20} />
                    <h3 className="font-black text-sm uppercase tracking-wider text-white">Invite Gaming Squad</h3>
                  </div>
                  <button onClick={() => setShowSquadModal(false)} className="text-zinc-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search gamers by username..."
                    value={squadSearchQuery}
                    onChange={(e) => handleSearchSquadUsers(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-400"
                  />
                </div>

                {/* SEARCH RESULTS */}
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {squadUsersList.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-black/30 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                          alt="" 
                          className="w-8 h-8 rounded-full object-cover border border-indigo-400"
                        />
                        <span className="text-xs font-bold text-white">@{u.username}</span>
                      </div>

                      <button
                        onClick={() => handleInviteSquadMember(u)}
                        disabled={squadInvitesSent.has(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          squadInvitesSent.has(u.id)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {squadInvitesSent.has(u.id) ? 'Invited ✓' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* SHARE LINK */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Direct Stream Link:</span>
                  <button
                    onClick={handleCopyStreamLink}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl text-white flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: CONFIRM END STREAM */}
        <AnimatePresence>
          {showEndConfirm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <div className="w-full max-w-xs bg-zinc-900 border border-red-500/40 p-6 rounded-3xl space-y-4 text-center">
                <div className="w-12 h-12 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto text-red-400">
                  <Radio size={24} className="animate-pulse" />
                </div>

                <div>
                  <h3 className="font-black text-base uppercase text-white">End Gaming Stream?</h3>
                  <p className="text-xs text-zinc-400 mt-1">Your stream will stop broadcasting for all viewers.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleConfirmEndStream}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg active:scale-95"
                  >
                    End Stream
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs uppercase rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ----------------------------------------------------
  // PRE-STREAM GAMING SETUP VIEW (PRE-LIVE MODE)
  // ----------------------------------------------------
  return (
    <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative">
      
      {/* BACKGROUND NEON GLOW HALOS */}
      <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP HEADER CONTROLS */}
      <div className="w-full z-50 p-4 sm:p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-pink-500/80 pointer-events-auto transition-all">
          <X size={20} className="sm:w-6 sm:h-6 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
        </button>

        <div className="flex flex-col gap-2 sm:gap-3 pointer-events-auto items-end">
          <ControlIconButton 
            icon={<Settings size={18} className="sm:w-5 sm:h-5"/>} 
            label="Settings" 
            onClick={() => setShowSettingsModal(!showSettingsModal)}
          />
          <ControlIconButton 
            icon={isCamOverlayOn ? <Video size={18} className="sm:w-5 sm:h-5"/> : <VideoOff size={18} className="sm:w-5 sm:h-5"/>} 
            label={isCamOverlayOn ? "Cam On" : "Cam Off"} 
            onClick={() => setIsCamOverlayOn(!isCamOverlayOn)}
          />
          <ControlIconButton 
            icon={isMicOn ? <Mic size={18} className="sm:w-5 sm:h-5"/> : <MicOff size={18} className="sm:w-5 sm:h-5"/>} 
            label={isMicOn ? "Mic Active" : "Mic Muted"} 
            onClick={toggleMic}
          />
        </div>
      </div>

      {/* SCREEN CAPTURE & OVERLAY CANVAS */}
      <div className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto no-scrollbar">
        
        {/* MAIN DISPLAY CANVAS / PREVIEW */}
        <div className="w-full max-w-2xl aspect-video max-h-[35vh] sm:max-h-none rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] relative bg-black flex items-center justify-center">
          {isScreenSharing ? (
            <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2.5 p-2 text-center">
              <Monitor className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400/50 animate-pulse" />
              <button 
                onClick={startScreenCapture}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/60 rounded-xl text-cyan-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:text-black transition-all"
              >
                Select Game Screen / Display
              </button>
            </div>
          )}

          {/* PIP FACE-CAM OVERLAY PREVIEW */}
          {isCamOverlayOn && (
            <div className={`absolute ${getCamPositionClass()} w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] bg-zinc-900 z-30`}>
              <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* GAME SELECTOR & SEARCH */}
        <div className="w-full max-w-2xl mt-3 sm:mt-4 z-30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-cyan-300 tracking-wider">Select Game Category</span>
            <div className="relative w-36 sm:w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={customGameSearch}
                onChange={(e) => setCustomGameSearch(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/30 rounded-xl pl-7 pr-2 py-1 text-[10px] text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filteredGames.map((game) => (
              <button
                key={game}
                onClick={() => {
                  setSelectedGame(game);
                  setTitle(`Streaming ${game} Ranked Push! 🎮🔥`);
                }}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedGame === game
                    ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-105'
                    : 'bg-black/40 border-cyan-500/30 text-cyan-200/70 hover:border-cyan-400'
                }`}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

        {/* TITLE TEMPLATES */}
        <div className="w-full max-w-2xl mt-2 z-30">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {titleTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => setTitle(template)}
                className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] sm:text-[10px] font-medium text-zinc-300 hover:border-pink-400/50 hover:text-white whitespace-nowrap"
              >
                + {template}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTROLS AND STREAM INPUT SECTION */}
      <div className="w-full flex flex-col items-center px-4 sm:px-8 gap-2.5 z-40 my-2">
        {/* STREAM TITLE INPUT */}
        <div className="w-full max-w-md bg-black/50 backdrop-blur-2xl p-2.5 sm:p-3 rounded-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
          <input 
            type="text"
            placeholder={`Title for ${selectedGame} broadcast...`}
            className="bg-transparent w-full border-none outline-none font-bold text-xs sm:text-sm text-cyan-50 placeholder:text-cyan-200/40 px-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* START GAMING STREAM BUTTON */}
        <button 
          onClick={handleStartGamingStream}
          disabled={loading}
          className="w-full max-w-md bg-pink-600 hover:bg-pink-500 text-white py-3 sm:py-3.5 rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <span>Start Gaming Stream</span>}
        </button>
      </div>

      {/* SETTINGS DRAWER MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-zinc-900 border border-cyan-500/40 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-sm uppercase tracking-wider text-cyan-300">Gaming Stream Settings</h3>
                <button onClick={() => setShowSettingsModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* STREAM QUALITY */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Stream Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1080p 60FPS', '720p 60FPS', '480p 30FPS'].map(q => (
                    <button
                      key={q}
                      onClick={() => setStreamQuality(q)}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        streamQuality === q 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                          : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRIVACY */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Audience Privacy</label>
                <div className="grid grid-cols-3 gap-2">
                  {['public', 'followers', 'private'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPrivacy(p)}
                      className={`py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${
                        privacy === p 
                          ? 'bg-pink-500/20 border-pink-400 text-pink-300' 
                          : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* CAM PIP POSITION */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Face-Cam Overlay Position</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'top-left', name: 'Top Left' },
                    { id: 'top-right', name: 'Top Right' },
                    { id: 'bottom-left', name: 'Bottom Left' },
                    { id: 'bottom-right', name: 'Bottom Right' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setCamPosition(pos.id)}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        camPosition === pos.id 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                          : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      {pos.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 bg-cyan-600 text-black font-black text-xs uppercase rounded-xl"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-3 pb-6 sm:pb-8 px-4 overflow-x-auto no-scrollbar relative z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="flex items-center justify-start sm:justify-center gap-6 sm:gap-8 min-w-max relative z-10 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab)}
                disabled={loading}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                }`}
              >
                {tab.icon && (
                  <span className={isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-300'}>
                    {tab.icon}
                  </span>
                )}
                <span className={`text-[10px] sm:text-[11px] font-black tracking-widest whitespace-nowrap ${
                  isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-100 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]'
                }`}>
                  {tab.name}
                </span>
                {isActive && (
                  <motion.div layoutId="tab-underline" className="w-1.5 h-1.5 bg-pink-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ControlIconButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className="p-2 sm:p-3 bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 group-hover:border-pink-400 group-hover:text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]">
      {icon}
    </div>
    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter text-cyan-200/80 group-hover:text-pink-300 transition-colors">{label}</span>
  </button>
);

export default MobileGamingSetup;
