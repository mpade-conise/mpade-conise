import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { io } from 'socket.io-client';
import VideoPlayer from './Shared/VideoPlayer';
import StreamHeader from './Shared/StreamHeader';
import { 
  Camera, Users, Gamepad2, Settings, Sparkles, Wand2, 
  X, UserPlus, Mic, MicOff, VideoOff, Video,
  RefreshCw, Radio, Lock, Unlock, Swords,
  UserX, Zap, Search, Copy, Check, Link, Send, UserCheck, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// UPDATE THIS TO YOUR ACTIVE BACKEND SOCKET URL
const SOCKET_URL = 'https://mpade-backend.onrender.com';

// Audio Chime Generator using Web Audio API for realtime alerts
const playAudioChime = (type = 'request') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'request') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    } else if (type === 'accept') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25); // A3
    }

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // AudioContext silenced or blocked
  }
};

const GuestLiveSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { streamId } = useParams();
  
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Guest Hangout");
  const [privacy, setPrivacy] = useState("public");
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [streamData, setStreamData] = useState(null);

  // FETCH STREAM DETAILS FOR STREAMHEADER
  useEffect(() => {
    if (!streamId) return;
    supabase
      .from('live_streams')
      .select('*, host:host_id(username, avatar_url)')
      .eq('id', streamId)
      .single()
      .then(({ data }) => {
        if (data) setStreamData(data);
      });
  }, [streamId]);

  // MEDIA & WEBRTC STATE
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [stream, setStream] = useState(null);

  // CO-HOST TOPIC & BATTLE MODE
  const [roomTopic, setRoomTopic] = useState("🔥 8-Guest Live Hangout & Q&A");
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleScores, setBattleScores] = useState({ red: 120, blue: 95 });

  // 7 GUEST PANELS
  const [guestSlots, setGuestSlots] = useState([
    { id: 1, label: "Slot 1", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 2, label: "Slot 2", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 3, label: "Slot 3", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 4, label: "Slot 4", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 5, label: "Slot 5", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 6, label: "Slot 6", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
    { id: 7, label: "Slot 7", occupant: null, isLocked: false, isMuted: false, isVideoOff: false, isSpeaking: false, giftCount: 0 },
  ]);

  // REALTIME GUEST REQUEST QUEUE & DRAWER
  const [showRequestDrawer, setShowRequestDrawer] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // REAL INVITING STATE & MODALS
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState([]);

  // REALTIME USER SEARCH FOR CO-HOST INVITATIONS
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .or(`username.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`)
        .limit(10);
      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dynamically compute selected slot for management modal to avoid stale state
  const selectedSlotForManage = guestSlots.find(s => s.id === selectedSlotId);
  const activeCoHosts = guestSlots.filter(s => s.occupant !== null);
  const isCoHostingActive = activeCoHosts.length > 0 || isBattleMode;

  // INITIALIZE WEBRTC & SOCKET CONNECTION
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('WebRTC Socket connected:', socketRef.current.id);
      if (streamId) {
        socketRef.current.emit('join_room', { roomId: streamId });
      }
    });

    // Realtime guest request listener
    socketRef.current.on('guest_cohost_request', (data) => {
      console.log('📥 Incoming Guest Co-Host Request:', data);
      playAudioChime('request');
      setPendingRequests(prev => {
        if (prev.some(r => r.userId === data.userId)) return prev;
        return [...prev, {
          id: data.requestId || Date.now().toString(),
          userId: data.userId,
          username: data.username || 'User',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          mode: data.mode || 'video'
        }];
      });
    });

    socketRef.current.on('cohost_reaction_burst', (data) => {
      triggerReactionBurst(data.emoji, data.slotId);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const handleGuestApproved = useCallback((approvedGuest) => {
    setGuestSlots(prev => {
      const alreadyOccupied = prev.some(s => s.occupant?.userId === approvedGuest.user_id);
      if (alreadyOccupied) return prev;

      const updated = [...prev];
      const freeSlotIndex = updated.findIndex(s => !s.occupant && !s.isLocked);
      if (freeSlotIndex !== -1) {
        updated[freeSlotIndex] = {
          ...updated[freeSlotIndex],
          occupant: {
            userId: approvedGuest.user_id,
            username: approvedGuest.username || 'Guest',
            avatar: approvedGuest.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            joinedAt: new Date()
          },
          isMuted: false,
          isVideoOff: approvedGuest.mode === 'audio'
        };
        playAudioChime('join');
      }
      return updated;
    });
  }, []);

  // SUPABASE REALTIME DB LISTENERS FOR PENDING & APPROVED REQUESTS
  useEffect(() => {
    if (!streamId) return;

    // Fetch existing pending and approved requests
    supabase
      .from('live_guest_requests')
      .select('*')
      .eq('stream_id', streamId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const pending = data.filter(r => r.status === 'pending');
          setPendingRequests(pending.map(r => ({
            id: r.id,
            userId: r.user_id,
            username: r.username || 'User',
            avatar: r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            mode: r.mode || 'video'
          })));

          const approved = data.filter(r => r.status === 'approved');
          approved.forEach(r => handleGuestApproved(r));
        }
      });

    const channel = supabase
      .channel(`cohost_requests_${streamId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'live_guest_requests', 
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        if (payload.new) {
          if (payload.new.status === 'pending') {
            playAudioChime('request');
            setPendingRequests(prev => [
              ...prev.filter(r => r.userId !== payload.new.user_id),
              {
                id: payload.new.id,
                userId: payload.new.user_id,
                username: payload.new.username || 'User',
                avatar: payload.new.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                mode: payload.new.mode || 'video'
              }
            ]);
          } else if (payload.new.status === 'approved') {
            handleGuestApproved(payload.new);
            setPendingRequests(prev => prev.filter(r => r.userId !== payload.new.user_id));
          } else if (payload.new.status === 'rejected' || payload.new.status === 'kicked') {
            setPendingRequests(prev => prev.filter(r => r.userId !== payload.new.user_id));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, handleGuestApproved]);

  // SIMULATE ACTIVE SPEAKERS & RANDOM REACTION BURSTS FOR DYNAMIC EXPERIENCE
  useEffect(() => {
    const interval = setInterval(() => {
      setGuestSlots(prev => prev.map(s => {
        if (!s.occupant) return s;
        const isSpeaking = Math.random() > 0.6;
        return { ...s, isSpeaking };
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // CAMERA PREVIEW LIFECYCLE
  useEffect(() => {
    if (isCamOn) startPreview();
    else stopPreview();
    return () => stopPreview();
  }, [isCamOn]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCamOn]);

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: isMicOn 
      });
      setStream(mediaStream);
    } catch (err) {
      console.warn("Camera preview blocked or unavailable:", err);
      setIsCamOn(false);
    }
  };

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleSlotLock = (id) => {
    setGuestSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, isLocked: !slot.isLocked } : slot
    ));
  };

  // ACCEPT GUEST REQUEST
  const handleAcceptRequest = async (request, mode = 'video') => {
    playAudioChime('accept');
    
    // Find first unlocked & empty slot
    const emptySlot = guestSlots.find(s => !s.occupant && !s.isLocked);
    if (!emptySlot) {
      alert("All co-host slots are filled or locked!");
      return;
    }

    setGuestSlots(prev => prev.map(slot => {
      if (slot.id === emptySlot.id) {
        return {
          ...slot,
          occupant: {
            userId: request.userId,
            username: request.username,
            avatar: request.avatar,
            mode: mode
          },
          isVideoOff: mode === 'audio',
          isMuted: false
        };
      }
      return slot;
    }));

    setPendingRequests(prev => prev.filter(r => r.userId !== request.userId));

    // Update DB & emit socket signal
    if (streamId) {
      await supabase
        .from('live_guest_requests')
        .update({ status: 'approved', mode: mode })
        .eq('stream_id', streamId)
        .eq('user_id', request.userId);
    }

    if (socketRef.current) {
      socketRef.current.emit('approve_cohost', { streamId, guestId: request.userId, mode });
    }
  };

  // REJECT GUEST REQUEST
  const handleRejectRequest = async (request) => {
    playAudioChime('reject');
    setPendingRequests(prev => prev.filter(r => r.userId !== request.userId));

    if (streamId) {
      await supabase
        .from('live_guest_requests')
        .update({ status: 'rejected' })
        .eq('stream_id', streamId)
        .eq('user_id', request.userId);
    }
  };

  // SLOT ACTION CONTROLS (MUTE, DISABLE VIDEO, KICK)
  const toggleMuteGuestSlot = (slotId) => {
    setGuestSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        const nextMuted = !s.isMuted;
        if (socketRef.current && s.occupant) {
          socketRef.current.emit('mute_cohost_audio', { streamId, guestId: s.occupant.userId, isMuted: nextMuted });
        }
        return { ...s, isMuted: nextMuted };
      }
      return s;
    }));
  };

  const toggleVideoGuestSlot = (slotId) => {
    setGuestSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        const nextVideoOff = !s.isVideoOff;
        return { ...s, isVideoOff: nextVideoOff };
      }
      return s;
    }));
  };

  const kickGuestSlot = (slotId) => {
    setGuestSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        if (s.occupant && socketRef.current) {
          socketRef.current.emit('kick_cohost', { streamId, guestId: s.occupant.userId });
        }
        return { ...s, occupant: null, isMuted: false, isVideoOff: false, giftCount: 0 };
      }
      return s;
    }));
    setSelectedSlotId(null);
  };

  const triggerReactionBurst = (emoji, slotId) => {
    const id = Date.now() + Math.random();
    setFloatingReactions(prev => [...prev, { id, emoji, slotId }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2200);
  };

  // SEND REAL DIRECT CO-HOST INVITATION TO USER
  const handleSendDirectInvite = async (invitedUser, mode = 'video') => {
    if (!streamId) {
      alert("Please start the room first before sending direct invitations!");
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const hostUser = authData?.user;

      // Insert invitation into Supabase with status 'invited'
      const { error } = await supabase
        .from('live_guest_requests')
        .upsert({
          stream_id: streamId,
          user_id: invitedUser.id,
          username: invitedUser.username || invitedUser.full_name || 'Guest',
          avatar_url: invitedUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          status: 'invited',
          mode: mode
        }, { onConflict: 'stream_id,user_id' });

      if (error) {
        console.error("Invite insert error:", error);
      }

      // Create activity record so user gets instant notification in Inbox
      if (hostUser?.id) {
        await supabase.from('activities').insert({
          user_id: invitedUser.id,
          actor_id: hostUser.id,
          type: 'live_invite',
          description: JSON.stringify({
            stream_id: streamId,
            mode: mode,
            host_name: hostUser.user_metadata?.username || 'Host'
          })
        });
      }

      if (socketRef.current) {
        socketRef.current.emit('send_direct_invite', {
          streamId,
          invitedUserId: invitedUser.id,
          hostName: hostUser?.user_metadata?.username || 'Host',
          mode
        });
      }

      setInvitedUserIds(prev => [...prev, invitedUser.id]);
    } catch (err) {
      console.error("Error inviting user:", err);
    }
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}/live/watch/${streamId || 'room'}/join-guest`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleStartGuestStream = async () => {
    if (streamId) return;

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        alert("Authentication session missing. Please log in.");
        setLoading(false);
        return;
      }

      const streamData = {
        title: title || `${user.user_metadata?.username || 'User'}'s Multi-Guest Room`,
        host_id: user.id,
        category,
        privacy,
        status: 'live',
        stream_type: 'multi_guest',
        max_guests: 7,
        is_locked: isRoomLocked
      };

      const { data, error } = await supabase
        .from('live_streams')
        .insert([streamData])
        .select()
        .single();

      if (error) {
        console.error("Database Insert Error:", error);
        alert(`Error starting stream: ${error.message}`);
      } else if (data) {
        if (socketRef.current) {
          socketRef.current.emit('create_room', { roomId: data.id, hostId: user.id });
        }
        navigate(`/live/guest/${data.id}`, { replace: true });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'DEVICE CAMERA', path: '/live/device-camera', icon: <Camera size={14}/> },
    { name: 'GO WITH GUEST', action: 'direct_guest_stream', icon: <Users size={14}/> },
    { name: 'MOBILE GAMING', path: '/live/gaming', icon: <Gamepad2 size={14}/> },
  ];

  const handleTabClick = (tab) => {
    if (tab.action === 'direct_guest_stream') {
      handleStartGuestStream();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative select-none">
      
      {/* BACKGROUND GLOWS */}
      <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP STREAM HEADER & BAR CONTROLS */}
      <div className="w-full z-50 p-2 sm:p-4 flex justify-between items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex-1 max-w-[65%] sm:max-w-md">
          <StreamHeader 
            data={streamData || {
              title: title || roomTopic || 'Guest Multi-Live Room',
              category: category || 'Guest Hangout',
              created_at: new Date().toISOString()
            }} 
            isHost={true} 
            viewerCount={activeCoHosts.length + 1} 
            onLeave={() => navigate(-1)} 
          />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          {/* PENDING REQUEST BADGE BUTTON */}
          <button 
            onClick={() => setShowRequestDrawer(true)}
            className="relative p-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl border border-pink-400/50 shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all active:scale-95 flex items-center gap-1.5"
          >
            <UserPlus size={18} />
            <span className="text-[10px] font-black uppercase hidden sm:inline">Requests</span>
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-400 text-black w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center animate-bounce border-2 border-black">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <ControlIconButton 
            icon={isRoomLocked ? <Lock size={18}/> : <Unlock size={18}/>} 
            label={isRoomLocked ? "Locked" : "Open"} 
            onClick={() => setIsRoomLocked(!isRoomLocked)}
          />
        </div>
      </div>

      {/* WEBRTC LIVE BROADCAST PIPELINE FOR VIEWERS */}
      {streamId && (
        <div className="hidden">
          <VideoPlayer streamId={streamId} isHost={true} customStream={stream} />
        </div>
      )}

      {/* CO-HOST BATTLE SCORE BAR & CO-HOSTING SPLIT INDICATOR */}
      <div className="w-full max-w-4xl mx-auto px-4 z-40 space-y-2">
        {isCoHostingActive && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-r from-pink-500/20 via-cyan-500/20 to-purple-500/20 border border-cyan-400/50 rounded-xl px-4 py-2 backdrop-blur-xl flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase text-cyan-300 tracking-wider">
                ⚡ CO-HOSTING ACTIVE ({activeCoHosts.length} Connected)
              </span>
            </div>
            <span className="text-[9px] font-black uppercase text-pink-300 bg-pink-500/30 px-3 py-1 rounded-full border border-pink-400/40 tracking-widest shadow-sm">
              SPLIT STAGE ACCEPTED
            </span>
          </motion.div>
        )}

        <AnimatePresence>
          {isBattleMode && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-2.5 backdrop-blur-xl flex items-center justify-between gap-3 shadow-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-black text-rose-400">RED TEAM: {battleScores.red} pts</span>
                </div>
                <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-400 border border-amber-500/30">
                  <Swords size={12} /> 1v1 Co-Host Battle
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-cyan-400">BLUE TEAM: {battleScores.blue} pts</span>
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STAGE & GUEST SEATS CONTAINER */}
      <div className="flex-1 relative p-2 sm:p-4 overflow-y-auto no-scrollbar z-20">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* PRIMARY HOST STAGE (MAIN DISPLAY) */}
          <div className="relative rounded-3xl overflow-hidden bg-zinc-950 border-2 border-pink-500/90 aspect-video sm:aspect-[16/9] min-h-[220px] sm:min-h-[320px] shadow-[0_0_30px_rgba(244,63,94,0.3)] flex flex-col justify-between">
            {isCamOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 absolute inset-0">
                <VideoOff size={40} className="text-pink-500/50 mb-2" />
                <span className="text-xs font-bold text-zinc-400">Host Camera Off</span>
              </div>
            )}

            {/* Host Header Badges */}
            <div className="relative z-10 p-3 flex justify-between items-center pointer-events-none">
              <div className="bg-pink-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-pink-400/50 shadow-lg text-white pointer-events-auto">
                <Radio size={12} className="animate-pulse text-white"/> HOST
              </div>
              {isCoHostingActive && (
                <div className="bg-cyan-500/90 text-black px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Sparkles size={12} /> CO-HOSTING ACTIVE
                </div>
              )}
            </div>

            {/* COMPACT CO-HOST FLOATING OVERLAY PANEL (~20% MOBILE FIT) */}
            {activeCoHosts.length > 0 && (() => {
              const primarySlot = activeCoHosts[0];
              const isAudioOnly = primarySlot.occupant?.mode === 'audio' || primarySlot.isVideoOff;

              return (
                <div 
                  key={primarySlot.id}
                  onClick={() => setSelectedSlotId(primarySlot.id)}
                  className="absolute bottom-14 right-3 sm:bottom-16 sm:right-4 w-24 h-32 sm:w-32 sm:h-44 rounded-2xl overflow-hidden bg-zinc-950 border-2 border-cyan-400/90 shadow-[0_0_25px_rgba(34,211,238,0.6)] z-30 flex flex-col justify-between cursor-pointer group"
                >
                  {/* CO-HOST CONTENT: AUDIO ONLY vs VIDEO */}
                  {isAudioOnly ? (
                    <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center p-2 text-center relative">
                      <div className="relative mb-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse">
                          <img src={primarySlot.occupant.avatar} alt="Co-Host Avatar" className="w-full h-full rounded-full object-cover" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-cyan-500 text-black rounded-full border border-black shadow">
                          <Mic size={9} />
                        </span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black text-cyan-200 truncate max-w-full px-1">
                        @{primarySlot.occupant.username}
                      </span>
                      <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                        🎙️ Audio Only
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center p-2 text-center relative">
                      <img src={primarySlot.occupant.avatar} alt="Co-Host" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-cyan-400 object-cover shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse mb-1" />
                      <span className="text-[9px] font-black text-white truncate max-w-full">@{primarySlot.occupant.username}</span>
                    </div>
                  )}

                  {/* Co-Host Overlay Badges */}
                  <div className="absolute top-1 left-1 z-20">
                    <span className="bg-cyan-500 text-black font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      CO-HOST
                    </span>
                  </div>

                  <div className="absolute bottom-1 right-1 z-20 bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/10">
                    {primarySlot.isMuted ? (
                      <MicOff size={10} className="text-rose-400" />
                    ) : (
                      <Mic size={10} className="text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Host Footer Bar */}
            <div className="relative z-10 p-2.5">
              <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                <span className="text-xs font-bold text-white truncate">@Host (You)</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setIsMicOn(!isMicOn)} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                    {isMicOn ? <Mic size={14}/> : <MicOff size={14} className="text-rose-400"/>}
                  </button>
                  <button onClick={() => setIsCamOn(!isCamOn)} className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                    {isCamOn ? <Video size={14}/> : <VideoOff size={14} className="text-rose-400"/>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COMPACT AUDIENCE / GUEST SEATS GRID (SMALL 20x20 TILES FOR MOBILE) */}
          <div className="bg-zinc-950/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Audience Guest Seats (20x20)</p>
              <span className="text-[9px] text-cyan-400 font-bold">{activeCoHosts.length}/7 Active</span>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {guestSlots.map((slot) => {
                const isOccupied = !!slot.occupant;
                const isAudioOnly = slot.occupant?.mode === 'audio' || slot.isVideoOff;

                return (
                  <div 
                    key={slot.id} 
                    onClick={() => isOccupied ? setSelectedSlotId(slot.id) : setShowRequestDrawer(true)}
                    className={`relative rounded-xl border flex flex-col items-center justify-between p-1.5 min-h-[75px] sm:min-h-[85px] transition-all cursor-pointer group ${
                      slot.isSpeaking 
                        ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-zinc-900' 
                        : slot.isLocked 
                        ? 'bg-black/60 border-zinc-800 opacity-60' 
                        : isOccupied
                        ? 'bg-zinc-900 border-cyan-500/40 text-cyan-300'
                        : 'bg-black/40 border-white/10 hover:border-cyan-400/50 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {/* Floating Reactions */}
                    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                      {floatingReactions.filter(r => r.slotId === slot.id).map(r => (
                        <motion.div
                          key={r.id}
                          initial={{ y: 20, opacity: 0, scale: 0.5 }}
                          animate={{ y: -40, opacity: [0, 1, 0], scale: 1.3 }}
                          transition={{ duration: 1.5 }}
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-lg"
                        >
                          {r.emoji}
                        </motion.div>
                      ))}
                    </div>

                    {/* Slot Header */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                        isOccupied ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500'
                      }`}>
                        {slot.label}
                      </span>
                      {isOccupied && (
                        <span className="text-[7px]">
                          {isAudioOnly ? '🎙️' : '📹'}
                        </span>
                      )}
                    </div>

                    {/* Slot Content */}
                    <div className="flex-1 flex flex-col items-center justify-center my-0.5">
                      {isOccupied ? (
                        <div className="flex flex-col items-center gap-0.5 text-center">
                          <img src={slot.occupant.avatar} alt="Guest" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-cyan-400 object-cover shadow-sm" />
                          <span className="text-[8px] font-bold text-cyan-100 truncate max-w-[55px]">@{slot.occupant.username}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 opacity-70 group-hover:opacity-100">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                            <UserPlus size={12} className="text-cyan-400" />
                          </div>
                          <span className="text-[7px] font-bold uppercase text-zinc-400">Invite</span>
                        </div>
                      )}
                    </div>

                    {/* Slot Footer Indicator */}
                    {isOccupied && (
                      <div className="w-full flex items-center justify-between bg-black/60 px-1 py-0.5 rounded text-[8px]">
                        {slot.isMuted ? (
                          <MicOff size={8} className="text-rose-400" />
                        ) : (
                          <div className="flex items-center gap-0.5 h-2">
                            <div className="w-0.5 bg-cyan-400 h-full animate-pulse" />
                            <div className="w-0.5 bg-cyan-400 h-1 animate-bounce" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ACTION CONTROLS */}
      <div className="w-full flex flex-col items-center px-4 sm:px-8 gap-2.5 z-40 my-2">
        {!streamId && (
          <div className="w-full max-w-md bg-black/50 backdrop-blur-2xl p-2.5 sm:p-3 rounded-2xl border border-cyan-500/40">
            <input 
              type="text"
              placeholder="Room Title (e.g. 8-Guest Talk Show)..."
              className="bg-transparent w-full border-none outline-none font-bold text-xs sm:text-sm text-cyan-50 placeholder:text-cyan-200/40 px-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 w-full max-w-md">
          <button 
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl font-bold text-xs border border-cyan-500/40 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          >
            <UserPlus size={15} className="text-cyan-400" /> Invite Friends
          </button>

          <button 
            onClick={handleStartGuestStream}
            disabled={loading || !!streamId}
            className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] text-xs sm:text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
          >
            {loading ? (
              <RefreshCw className="animate-spin w-5 h-5" />
            ) : (
              <span>{streamId ? "Room Active (Live Co-Host)" : "Start 8-Panel Room"}</span>
            )}
          </button>
        </div>
      </div>

      {/* REAL USER INVITE MODAL DRAWER */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-zinc-950 border-t border-cyan-500/40 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(34,211,238,0.2)] z-10 max-h-[85vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Invite Co-Hosts</h3>
                    <p className="text-[10px] text-zinc-400">Search registered users or share room link</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowInviteModal(false)} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Shareable Link Box */}
              <div className="bg-zinc-900 border border-cyan-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Shareable Room Link</p>
                    <p className="text-xs text-cyan-200 font-mono truncate">
                      {window.location.origin}/live/watch/{streamId || 'room'}/join-guest
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleCopyInviteLink}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shrink-0 ${
                    copiedLink ? 'bg-emerald-500 text-black' : 'bg-cyan-500 text-black hover:bg-cyan-400'
                  }`}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* User Search Input */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search user by @username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Search Results List */}
              <div className="space-y-2 min-h-[140px]">
                {isSearching ? (
                  <div className="text-center py-8 text-zinc-500 text-xs font-bold flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-cyan-400" /> Searching users...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => {
                    const isAlreadyInvited = invitedUserIds.includes(user.id);
                    return (
                      <div key={user.id} className="bg-zinc-900/80 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                            alt="" 
                            className="w-10 h-10 rounded-full border border-cyan-400/50 object-cover" 
                          />
                          <div>
                            <p className="text-xs font-bold text-white">@{user.username || user.full_name || 'User'}</p>
                            <p className="text-[10px] text-zinc-400">{user.full_name || 'App Member'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isAlreadyInvited ? (
                            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1">
                              <UserCheck size={12} /> Invite Sent
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendDirectInvite(user, 'audio')}
                                className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-[10px] font-black uppercase border border-cyan-500/30 flex items-center gap-1"
                              >
                                <Mic size={12} /> Mic
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendDirectInvite(user, 'video')}
                                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-pink-600/30 flex items-center gap-1"
                              >
                                <Video size={12} /> Video
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : searchQuery.trim() ? (
                  <div className="text-center py-8 text-zinc-500 text-xs font-medium">
                    No registered users found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-xs font-medium space-y-1">
                    <p className="text-zinc-400 font-bold">Type a username above to invite registered friends directly</p>
                    <p className="text-[10px] text-zinc-600">Invited users receive an instant co-host notification</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUEST REQUEST DRAWER OVERLAY */}
      <AnimatePresence>
        {showRequestDrawer && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestDrawer(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-zinc-950 border-t border-white/10 rounded-t-3xl p-6 shadow-2xl z-10 max-h-[75vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-pink-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Co-Host Join Requests ({pendingRequests.length})
                  </h3>
                </div>
                <button type="button" onClick={() => setShowRequestDrawer(false)} className="p-1.5 bg-white/5 rounded-full text-zinc-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <UserPlus size={36} className="text-zinc-600 mx-auto animate-pulse" />
                  <p className="text-xs text-zinc-400 font-medium">No pending co-host requests right now.</p>
                  <p className="text-[10px] text-zinc-500">Viewers can tap "Join Co-Host" on their screen to request a slot.</p>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowRequestDrawer(false); setShowInviteModal(true); }}
                      className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <UserPlus size={14} /> Invite Users Directly
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Copy size={14} /> Copy Room Link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-zinc-900 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={req.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-pink-500/50 object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white">@{req.username}</p>
                          <p className="text-[10px] text-cyan-400 font-mono mt-0.5 capitalize">Requesting {req.mode} seat</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => handleAcceptRequest(req, 'audio')} 
                          className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-[10px] font-black uppercase border border-cyan-500/30 flex items-center gap-1"
                        >
                          <Mic size={12} /> Mic Only
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleAcceptRequest(req, 'video')} 
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-pink-600/30 flex items-center gap-1"
                        >
                          <Video size={12} /> Video
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleRejectRequest(req)} 
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLOT MANAGEMENT MODAL (When Host Taps An Occupied Slot) */}
      <AnimatePresence>
        {selectedSlotForManage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSlotId(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-950 border border-white/10 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl z-10 space-y-4"
            >
              <img src={selectedSlotForManage.occupant.avatar} className="w-16 h-16 rounded-full border-2 border-cyan-400 mx-auto object-cover" />
              <div>
                <h4 className="text-sm font-black text-white">@{selectedSlotForManage.occupant.username}</h4>
                <p className="text-[10px] text-cyan-400 uppercase font-mono mt-0.5">Occupying {selectedSlotForManage.label}</p>
              </div>

              {/* Quick Reactions to send to slot */}
              <div className="flex justify-center gap-2 py-2">
                {['❤️', '🔥', '👏', '🎉', '🌌'].map(emoji => (
                  <button 
                    key={emoji}
                    type="button"
                    onClick={() => triggerReactionBurst(emoji, selectedSlotForManage.id)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-lg transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <button 
                  type="button"
                  onClick={() => toggleMuteGuestSlot(selectedSlotForManage.id)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/10"
                >
                  {selectedSlotForManage.isMuted ? <Mic size={14} className="text-emerald-400"/> : <MicOff size={14} className="text-rose-400"/>}
                  {selectedSlotForManage.isMuted ? "Unmute Guest Mic" : "Mute Guest Mic"}
                </button>

                <button 
                  type="button"
                  onClick={() => toggleVideoGuestSlot(selectedSlotForManage.id)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/10"
                >
                  {selectedSlotForManage.isVideoOff ? <Video size={14} className="text-cyan-400"/> : <VideoOff size={14} className="text-rose-400"/>}
                  {selectedSlotForManage.isVideoOff ? "Enable Guest Camera" : "Disable Guest Camera"}
                </button>

                <button 
                  type="button"
                  onClick={() => kickGuestSlot(selectedSlotForManage.id)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                >
                  <UserX size={14} /> Remove Co-Host
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM TAB BAR */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-3 pb-6 sm:pb-8 px-4 overflow-x-auto no-scrollbar relative z-50">
        <div className="flex items-center justify-start sm:justify-center gap-6 sm:gap-8 min-w-max relative z-10 px-2">
          {tabs.map((tab) => {
            const isActive = tab.name === 'GO WITH GUEST';
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
                  <span className={isActive ? 'text-pink-400' : 'text-cyan-300'}>
                    {tab.icon}
                  </span>
                )}
                <span className={`text-[10px] sm:text-[11px] font-black tracking-widest whitespace-nowrap ${
                  isActive ? 'text-pink-400' : 'text-cyan-100'
                }`}>
                  {tab.name}
                </span>
                {isActive && (
                  <motion.div layoutId="tab-underline" className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
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
    <div className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-xl rounded-xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 transition-all">
      {icon}
    </div>
    <span className="text-[8px] sm:text-[9px] font-bold uppercase text-cyan-200/80 group-hover:text-pink-300">{label}</span>
  </button>
);

export default GuestLiveSetup;

