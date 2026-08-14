import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Phone, Video, MoreVertical, Send, Image, Smile, Mic, Paperclip, 
  CornerUpLeft, Trash2, Edit2, Pin, Star, Shield, AlertTriangle, 
  Trash, EyeOff, Check, CheckCheck, FileText, X, Play, Pause,
  Copy, Sparkles, Zap, Radio, Search, Download, Maximize2, Activity,
  Cpu, Flame, RefreshCw, Lock, Volume2, Share2, Sticker, Clock
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import confetti from 'canvas-confetti';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

// Futuristic Animated Audio Player with Equalizer Waveform
const AudioPlayer = ({ url }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={togglePlay} 
          className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-black flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </button>

        <audio 
          ref={audioRef} 
          src={url} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); }} 
          className="hidden" 
        />

        {/* Futuristic Equalizer Waveform Bars */}
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex items-end gap-[3px] h-6 px-1">
            {[40, 75, 55, 90, 65, 80, 45, 95, 60, 70, 85, 50, 60, 75].map((height, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all duration-150 ${
                  (i / 14) * 100 <= progress ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-white/20'
                }`}
                style={{ 
                  height: isPlaying ? `${Math.max(20, (height * (0.6 + Math.random() * 0.6)))}%` : `${height * 0.6}%` 
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300/80 px-1 font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Cyber Cyberpunk Stickers Collection
const CYBER_STICKERS = [
  { id: '1', emoji: '🤖', label: 'CYBER BOT', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' },
  { id: '2', emoji: '⚡', label: 'OVERCHARGE', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200' },
  { id: '3', emoji: '🚀', label: 'HYPERSPEED', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200' },
  { id: '4', emoji: '💎', label: 'QUANTUM GEM', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200' },
  { id: '5', emoji: '🔥', label: 'CYBER FLAME', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200' },
  { id: '6', emoji: '🛸', label: 'NEO MATRIX', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200' }
];

// Smart AI Quick Prompt Suggestions
const SMART_SUGGESTIONS = [
  "⚡ Quantum Ping",
  "🚀 Meet on Live Video",
  "🔥 Check this out!",
  "✨ Let's collaborate!",
  "💎 Awesome work",
  "🤝 Catch you soon!"
];

const Messaging = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');

  // Core State
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Advanced Features State
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerRecording, setIsPeerRecording] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'starred' | 'pinned' | 'media' | 'audio'

  // Futuristic HUD Lightbox & Toast States
  const [previewImage, setPreviewImage] = useState(null);
  const [hudToast, setHudToast] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Appended Signaled Realtime Call Modality Mapping
  const [incomingCall, setIncomingCall] = useState(null);

  // Media Attachment Handling References
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // HUD Toast Notification Trigger
  const showToast = (text) => {
    setHudToast(text);
    setTimeout(() => setHudToast(null), 2500);
  };

  // --- Initialize App & Profiles ---
  useEffect(() => {
    const initProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [myProf, individualProf] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('*').eq('id', peerUserId).single()
      ]);

      if (myProf.data) setCurrentUserProfile(myProf.data);
      if (individualProf.data) setPeerProfile(individualProf.data);
    };
    if (peerUserId) initProfiles();
  }, [peerUserId]);

  // --- Realtime Engine Pipelines ---
  useEffect(() => {
    if (!currentUserId || !peerUserId) return;

    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.emit('user_going_online', currentUserId);

    // Initial query targeting direct communication match matrix
    const loadConversationStream = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUserId})`)
        .order('updated_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Mark messages as read when viewing conversation thread
        await supabase
          .from('messages')
          .update({ unread: false, status: 'read' })
          .eq('sender_id', peerUserId)
          .eq('receiver_id', currentUserId);
      }
    };

    loadConversationStream();

    // Socket Event Pipeline Matrix Mapping
    socketRef.current.on('received_chat_message', (incoming) => {
      if ((incoming.sender_id === peerUserId && incoming.receiver_id === currentUserId) ||
          (incoming.sender_id === currentUserId && incoming.receiver_id === peerUserId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    });

    socketRef.current.on('message_updated_realtime', (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    });

    socketRef.current.on('peer_typing_state_changed', ({ userId, isTyping, mode }) => {
      if (userId === peerUserId) {
        if (mode === 'audio') {
          setIsPeerRecording(isTyping);
        } else {
          setIsPeerTyping(isTyping);
        }
      }
    });

    socketRef.current.on('friend_presence_changed', ({ userId, status }) => {
      if (userId === peerUserId) setIsPeerOnline(status === 'online');
    });

    // --- SIGNAL EXTENSION: REALTIME SIGNALING CHANNEL FOR CALL DETECTIONS ---
    socketRef.current.on('incoming_call_signal', (data) => {
      if (data.receiverId === currentUserId) {
        setIncomingCall(data);
      }
    });

    socketRef.current.on('call_cancelled_by_caller', () => {
      setIncomingCall(null);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [currentUserId, peerUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping, isPeerRecording]);

  // --- Typing State Engine Transmission ---
  const triggerTypingState = (isTyping, mode = 'text') => {
    if (socketRef.current) {
      socketRef.current.emit('user_typing_state', { 
        room_id: `${currentUserId}-${peerUserId}`, 
        userId: currentUserId, 
        isTyping,
        mode 
      });
    }
  };

  const handleInputChange = (val) => {
    setNewMessage(val);
    triggerTypingState(true, 'text');

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      triggerTypingState(false, 'text');
    }, 2000);
  };

  // --- Supabase Global Media File Streaming Upload Engine ---
  const uploadMediaAttachment = async (file, bucketName = 'message-attachments') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("Storage upload failed:", err.message);
      return null;
    }
  };

  const handleFileInputChange = async (e, messageType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast(`Uploading ${messageType}...`);
    const uploadedUrl = await uploadMediaAttachment(file);
    if (!uploadedUrl) {
      showToast("Upload failed, please retry.");
      return;
    }

    sendStructuredPayload(file.name, messageType, uploadedUrl);
    showToast("Attachment sent!");
  };

  // --- Voice Note Capturing Streams with Timer & Live Waveform ---
  const handleToggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      // Stop and finalize recording
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      triggerTypingState(false, 'audio');
      clearInterval(recordingTimerRef.current);
    } else {
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          clearInterval(recordingTimerRef.current);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          
          showToast("Sending voice audio...");
          const uploadedUrl = await uploadMediaAttachment(audioFile);
          if (uploadedUrl) {
            sendStructuredPayload("Voice Note", 'audio', uploadedUrl);
            showToast("Voice note sent!");
          }
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecordingVoice(true);
        triggerTypingState(true, 'audio');

        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Microphone device access denied:", err);
        showToast("Microphone access needed!");
      }
    }
  };

  const handleCancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.onstop = null; // discard onstop handler
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      triggerTypingState(false, 'audio');
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
      showToast("Voice recording discarded");
    }
  };

  // --- Unified Payload Dispatcher ---
  const sendStructuredPayload = async (textText, messageType = 'text', mediaUrl = null, extraMetadata = {}) => {
    const payload = {
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
      user_name: currentUserProfile?.username || 'User',
      last_msg: textText,
      unread: true,
      online: false,
      receiver_id: peerUserId,
      sender_id: currentUserId,
      type: messageType,
      metadata: {
        ...(replyingTo ? { reply_to_id: replyingTo.id, reply_body: replyingTo.last_msg } : {}),
        ...extraMetadata
      },
      media_url: mediaUrl,
      call_duration: 0,
      status: 'sent',
      reactions: {}
    };

    setMessages(prev => [...prev, payload]);
    setNewMessage("");
    setReplyingTo(null);
    setShowStickerDrawer(false);
    triggerTypingState(false, 'text');

    socketRef.current?.emit('send_chat_message', payload);
    await supabase.from('messages').insert(payload);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (editingMessage) {
      const updatedPayload = { 
        ...editingMessage, 
        last_msg: newMessage.trim(), 
        is_edited: true, 
        updated_at: new Date().toISOString()
      };

      setMessages(prev => prev.map(m => m.id === editingMessage.id ? updatedPayload : m));
      setEditingMessage(null);
      setNewMessage("");

      await supabase.from('messages').update({ last_msg: updatedPayload.last_msg, is_edited: true }).eq('id', updatedPayload.id);
      socketRef.current?.emit('broadcast_message_update', updatedPayload);
      showToast("Message updated");
      return;
    }

    sendStructuredPayload(newMessage.trim(), 'text');
  };

  // --- Advanced Interactivity Matrix (Reactions, Delete, Star, Pin, Copy) ---
  const addReaction = async (msgId, emojiStr) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    // Trigger futuristic confetti burst on special reactions!
    if (['🚀', '💎', '🔥', '❤️', '⚡'].includes(emojiStr)) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#ec4899', '#a855f7', '#10b981']
        });
      } catch {
        // ignore
      }
    }

    const currentReactions = msg.reactions || {};
    currentReactions[currentUserId] = emojiStr;

    const updated = { ...msg, reactions: currentReactions };
    setMessages(prev => prev.map(m => m.id === msgId ? updated : m));

    await supabase.from('messages').update({ reactions: currentReactions }).eq('id', msgId);
    socketRef.current?.emit('broadcast_message_update', updated);
  };

  const deleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from('messages').delete().eq('id', msgId);
    showToast("Message deleted");
  };

  const togglePinMessage = async (msg) => {
    const updated = { ...msg, is_pinned: !msg.is_pinned };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    await supabase.from('messages').update({ is_pinned: updated.is_pinned }).eq('id', msg.id);
    showToast(updated.is_pinned ? "Message pinned to HUD" : "Message unpinned");
  };

  const toggleStarMessage = async (msg) => {
    const updated = { ...msg, is_starred: !msg.is_starred };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    await supabase.from('messages').update({ is_starred: updated.is_starred }).eq('id', msg.id);
    showToast(updated.is_starred ? "Starred in Cyber Vault" : "Removed from Starred");
  };

  const handleCopyMessage = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast("Copied to Cyberdeck!");
  };

  // Pinned Messages list for HUD Header Ribbon
  const pinnedMessages = messages.filter(m => m.is_pinned);

  // Filter messages based on search & active filter tabs
  const filteredConversationMessages = messages.filter(m => {
    // Search Query Match
    const matchesSearch = !messageSearchQuery.trim() || 
      m.last_msg?.toLowerCase().includes(messageSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filter Chips Match
    if (activeFilter === 'starred') return m.is_starred;
    if (activeFilter === 'pinned') return m.is_pinned;
    if (activeFilter === 'media') return m.type === 'image' || m.type === 'file';
    if (activeFilter === 'audio') return m.type === 'audio';

    return true;
  });

  return (
    <div className="fixed inset-0 bg-[#060609] text-white flex flex-col font-sans overflow-hidden select-none">
      
      {/* BACKGROUND FUTURISTIC GRID MESH OVERLAY */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#060609] to-[#040407] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]" 
      />

      {/* FLOATING HUD TOAST NOTIFICATION */}
      <AnimatePresence>
        {hudToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[130] bg-[#0c0c16]/95 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.4)] px-4 py-2 rounded-full text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 backdrop-blur-xl"
          >
            <Sparkles size={13} className="text-cyan-400 animate-spin" />
            <span>{hudToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* REALTIME MODAL GATEWAY FOR CAPTURING INCOMING DETECTED CALLS */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[140] p-6 text-center"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 via-pink-500/20 to-purple-500/20 border-2 border-cyan-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                {incomingCall.callType === 'video' ? <Video size={40} className="text-cyan-400" /> : <Phone size={40} className="text-cyan-400" />}
              </div>
              <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-50" />
            </div>
            
            <div className="space-y-1 mb-8">
              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-mono uppercase tracking-widest font-black">
                {incomingCall.callType === 'video' ? 'Holographic Video Stream' : 'Encrypted Audio Link'}
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white mt-2">Incoming Transmission</h2>
              <p className="text-sm text-zinc-400 font-medium">@{incomingCall.callerName || 'user'} is requesting a secure link</p>
            </div>
            
            <div className="flex items-center gap-8">
              <button 
                onClick={() => {
                  socketRef.current?.emit('decline_call', { callerId: incomingCall.callerId });
                  setIncomingCall(null);
                }}
                className="w-16 h-16 bg-gradient-to-tr from-red-600 to-rose-600 text-white rounded-2xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.5)] border border-rose-400/40"
              >
                <X size={24} />
                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Decline</span>
              </button>
              
              <button 
                onClick={() => {
                  const targetCallRoute = incomingCall.callType === 'video' ? '/video-call' : '/voice-call';
                  const callerId = incomingCall.callerId;
                  setIncomingCall(null);
                  navigate(`${targetCallRoute}?userId=${callerId}&role=receiver`);
                }}
                className="w-16 h-16 bg-gradient-to-tr from-cyan-400 via-teal-400 to-emerald-400 text-black rounded-2xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.8)] border border-cyan-300"
              >
                <Check size={26} className="stroke-[3px]" />
                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Accept</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN CYBER LIGHTBOX IMAGE INSPECTOR */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <a 
                href={previewImage} 
                target="_blank" 
                rel="noreferrer" 
                download 
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 bg-white/10 hover:bg-cyan-500 hover:text-black rounded-xl text-white transition-colors"
                title="Download"
              >
                <Download size={18} />
              </a>
              <button 
                onClick={() => setPreviewImage(null)} 
                className="p-2.5 bg-white/10 hover:bg-rose-500 rounded-xl text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
              <img 
                src={previewImage} 
                alt="Enlarged visual hologram" 
                crossOrigin="anonymous" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[80vh]"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>HOLOGRAM_VIEWER // HIGH_RES</span>
                <span>STATUS: READY</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HIDDEN MEDIA CORE HARDWARE INTERFACE DEVICE CAPTURING REFERENCE LABELS */}
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'image')} />
      <input type="file" ref={fileInputRef} accept="*/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'file')} />

      {/* 1. FUTURISTIC CYBER CHAT HEADER */}
      <header className="px-4 py-3 bg-[#0a0a12]/90 backdrop-blur-2xl border-b border-cyan-500/20 flex flex-col gap-2 z-50 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div 
              className="relative cursor-pointer group" 
              onClick={() => navigate(`/profile/${peerProfile?.id || peerUserId}`)}
              title="View Cyber Profile"
            >
              <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-purple-600 shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
                <img 
                  src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerUserId}`} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-black" 
                  alt="Avatar" 
                />
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a12] shadow-md ${
                isPeerOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse' : 'bg-zinc-600'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-cyan-200">
                  @{peerProfile?.username || 'user'}
                </h2>
                {peerProfile?.is_verified && (
                  <span className="w-3.5 h-3.5 bg-cyan-400 text-black text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${isPeerOnline ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                <span className={isPeerOnline ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                  {isPeerOnline ? 'HUD: ONLINE' : 'STATUS: OFFLINE'}
                </span>
                <span className="text-zinc-600 font-normal">• 256-BIT P2P</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search Input Toggle */}
            <button 
              onClick={() => setShowSearchInput(!showSearchInput)} 
              className={`p-2 rounded-xl border transition-all ${
                showSearchInput ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
              title="Search chat history"
            >
              <Search size={16} />
            </button>
            
            {/* Start Voice Call Button */}
            <button 
              className="p-2 bg-white/5 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 rounded-xl transition-all active:scale-95 shadow-sm" 
              title="Start Encrypted Voice Call"
              onClick={async () => {
                const callData = {
                  receiverId: peerUserId,
                  callerId: currentUserId,
                  callerName: currentUserProfile?.username || 'user',
                  callType: 'voice',
                  roomId: [currentUserId, peerUserId].sort().join("-")
                };

                socketRef.current?.emit('initiate_call_signal', callData);

                const realtimeChan = supabase.channel(`user-call-signals-${peerUserId}`);
                realtimeChan.subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    realtimeChan.send({
                      type: 'broadcast',
                      event: 'incoming_call_broadcast',
                      payload: callData
                    });
                  }
                });

                sendStructuredPayload("📞 Voice Call Initiated", 'call_log', null, { callType: 'voice', status: 'initiated' });
                navigate(`/voice-call?userId=${peerUserId}&role=caller`);
              }}
            >
              <Phone size={16} />
            </button>

            {/* Start Video Call Button */}
            <button 
              className="p-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500 hover:to-teal-400 text-cyan-300 hover:text-black border border-cyan-500/30 rounded-xl transition-all active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.2)]" 
              title="Start Holographic Video Call"
              onClick={async () => {
                const callData = {
                  receiverId: peerUserId,
                  callerId: currentUserId,
                  callerName: currentUserProfile?.username || 'user',
                  callType: 'video',
                  roomId: [currentUserId, peerUserId].sort().join("-")
                };

                socketRef.current?.emit('initiate_call_signal', callData);

                const realtimeChan = supabase.channel(`user-call-signals-${peerUserId}`);
                realtimeChan.subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                    realtimeChan.send({
                      type: 'broadcast',
                      event: 'incoming_call_broadcast',
                      payload: callData
                    });
                  }
                });

                sendStructuredPayload("📹 Video Call Initiated", 'call_log', null, { callType: 'video', status: 'initiated' });
                navigate(`/video-call?userId=${peerUserId}&role=caller`);
              }}
            >
              <Video size={16} />
            </button>
            
            {/* Extended Options Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-xl transition-colors"
              >
                <MoreVertical size={16} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                    className="absolute right-0 mt-2 w-52 bg-[#0d0d16] border border-cyan-500/30 rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl"
                  >
                    <button 
                      onClick={() => { showToast("Conversation notifications muted"); setShowMenu(false); }} 
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
                    >
                      <Shield size={14} className="text-cyan-400" /> Mute Notifications
                    </button>
                    <button 
                      onClick={() => { showToast("User flagged in restriction sandbox"); setShowMenu(false); }} 
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <AlertTriangle size={14} /> Restrict User
                    </button>
                    <button 
                      onClick={() => { showToast("Report submitted to moderation matrix"); setShowMenu(false); }} 
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <AlertTriangle size={14} /> Report User
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button 
                      onClick={() => { setMessages([]); setShowMenu(false); showToast("Chat stream cleared locally"); }} 
                      className="w-full text-left px-3 py-2 text-xs hover:bg-rose-500/10 rounded-xl flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash size={14} /> Clear Local Stream
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SEARCH BAR (WHEN TOGGLED) */}
        <AnimatePresence>
          {showSearchInput && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="relative flex items-center pt-1"
            >
              <Search size={14} className="absolute left-3 text-cyan-400" />
              <input 
                type="text"
                placeholder="Search encrypted message stream..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="w-full bg-[#141420] border border-cyan-500/30 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                autoFocus
              />
              {messageSearchQuery && (
                <button onClick={() => setMessageSearchQuery('')} className="absolute right-3 text-zinc-400 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PINNED MESSAGES HUD RIBBON */}
        {pinnedMessages.length > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/60 to-purple-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs">
            <Pin size={13} className="text-cyan-400 shrink-0" />
            <div className="flex-1 truncate text-zinc-300">
              <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase mr-1.5">Pinned:</span>
              <span className="italic">{pinnedMessages[pinnedMessages.length - 1].last_msg}</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
              {pinnedMessages.length}
            </span>
          </div>
        )}

        {/* HUD CHIPS FILTER BAR (All, Starred, Pinned, Media, Audio) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {[
            { id: 'all', label: 'All', icon: <Zap size={11} /> },
            { id: 'starred', label: 'Starred', icon: <Star size={11} /> },
            { id: 'pinned', label: 'Pinned', icon: <Pin size={11} /> },
            { id: 'media', label: 'Media', icon: <Image size={11} /> },
            { id: 'audio', label: 'Voice Notes', icon: <Mic size={11} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all shrink-0 border ${
                activeFilter === tab.id
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 2. MESSAGE STREAM CORE DISPLAY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
        {filteredConversationMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <Cpu size={28} />
            </div>
            <p className="text-sm font-black text-zinc-300">Secure Direct Link Established</p>
            <p className="text-xs text-zinc-500 max-w-xs font-mono">
              Send encrypted text, holographic voice messages, attachments, or initiate live calls.
            </p>
          </div>
        ) : (
          filteredConversationMessages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div key={msg.id} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                
                {/* Replying Banner Linkage */}
                {msg.metadata?.reply_to_id && (
                  <div className="text-[10px] font-mono text-cyan-300/80 flex items-center gap-1 mb-1 px-2.5 bg-cyan-950/30 border border-cyan-500/20 rounded-md py-0.5 max-w-[75%] truncate">
                    <CornerUpLeft size={10} className="text-cyan-400 shrink-0" />
                    <span className="truncate">Replied to: "{msg.metadata.reply_body}"</span>
                  </div>
                )}

                <div className="group relative flex flex-col max-w-[80%] sm:max-w-[70%]">
                  
                  {/* FUTURISTIC FLOATING QUICK ACTION MATRIX TOOLBAR ON HOVER */}
                  <div className={`absolute -top-8 hidden group-hover:flex items-center bg-[#0d0d16]/95 border border-cyan-500/30 rounded-xl px-2 py-1 gap-1.5 shadow-[0_0_15px_rgba(0,0,0,0.8)] z-20 backdrop-blur-xl ${
                    isMe ? 'right-0' : 'left-0'
                  }`}>
                    {/* Quick Reactions Matrix */}
                    <button onClick={() => addReaction(msg.id, '❤️')} className="text-xs hover:scale-125 transition-transform" title="Love">❤️</button>
                    <button onClick={() => addReaction(msg.id, '🔥')} className="text-xs hover:scale-125 transition-transform" title="Fire">🔥</button>
                    <button onClick={() => addReaction(msg.id, '⚡')} className="text-xs hover:scale-125 transition-transform" title="Lightning">⚡</button>
                    <button onClick={() => addReaction(msg.id, '🚀')} className="text-xs hover:scale-125 transition-transform" title="Rocket">🚀</button>
                    
                    <div className="w-px h-3 bg-white/10 mx-0.5" />

                    {/* Actions */}
                    <button onClick={() => setReplyingTo(msg)} className="p-1 text-zinc-400 hover:text-cyan-300" title="Reply">
                      <CornerUpLeft size={12} />
                    </button>
                    <button onClick={() => handleCopyMessage(msg.last_msg)} className="p-1 text-zinc-400 hover:text-cyan-300" title="Copy to Cyberdeck">
                      <Copy size={12} />
                    </button>
                    <button onClick={() => toggleStarMessage(msg)} className={`p-1 hover:text-amber-400 ${msg.is_starred ? 'text-amber-400' : 'text-zinc-400'}`} title="Star Message">
                      <Star size={12} />
                    </button>
                    <button onClick={() => togglePinMessage(msg)} className={`p-1 hover:text-cyan-400 ${msg.is_pinned ? 'text-cyan-400' : 'text-zinc-400'}`} title="Pin Message">
                      <Pin size={12} />
                    </button>
                    {isMe && msg.type === 'text' && (
                      <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.last_msg); }} className="p-1 text-zinc-400 hover:text-cyan-300" title="Edit">
                        <Edit2 size={12} />
                      </button>
                    )}
                    {isMe && (
                      <button onClick={() => deleteMessage(msg.id)} className="p-1 text-zinc-400 hover:text-rose-400" title="Delete">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* MESSAGE BUBBLE */}
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed transition-all relative overflow-hidden ${
                    isMe 
                      ? 'bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-400 text-black font-medium rounded-br-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-cyan-300' 
                      : 'bg-[#12121e]/90 text-zinc-100 rounded-bl-sm border border-cyan-500/20 shadow-lg shadow-black/40'
                  }`}>
                    
                    {/* Visual Star/Pin Indicators on Card */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none opacity-80">
                      {msg.is_pinned && <Pin size={11} className={isMe ? 'text-black/60' : 'text-cyan-400'} />}
                      {msg.is_starred && <Star size={11} className={isMe ? 'text-black/60' : 'text-amber-400 fill-amber-400'} />}
                    </div>

                    {/* Image Multimedia Renderer */}
                    {msg.type === 'image' && msg.media_url && (
                      <div 
                        onClick={() => setPreviewImage(msg.media_url)}
                        className="relative rounded-xl overflow-hidden mb-1.5 border border-white/10 cursor-pointer group/img max-h-64 shadow-md"
                      >
                        <img 
                          src={msg.media_url} 
                          crossOrigin="anonymous" 
                          referrerPolicy="no-referrer" 
                          alt="Holographic attachment" 
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2 rounded-full bg-black/60 text-cyan-300 backdrop-blur-md">
                            <Maximize2 size={16} />
                          </span>
                        </div>
                      </div>
                    )}

                    {/* File Attachment Renderer */}
                    {msg.type === 'file' && msg.media_url && (
                      <a 
                        href={msg.media_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1.5 border text-xs font-mono font-bold tracking-tight transition-all ${
                          isMe 
                            ? 'bg-black/10 border-black/15 text-black hover:bg-black/20' 
                            : 'bg-white/5 border-white/10 text-cyan-300 hover:bg-white/10'
                        }`}
                      >
                        <FileText size={18} className={isMe ? 'text-black' : 'text-cyan-400'} />
                        <span className="truncate max-w-[180px]">{msg.last_msg}</span>
                        <Download size={13} className="ml-auto opacity-70" />
                      </a>
                    )}

                    {/* Futuristic Audio Player */}
                    {msg.type === 'audio' && msg.media_url && (
                      <AudioPlayer url={msg.media_url} />
                    )}

                    {/* Call Log Event Display */}
                    {msg.type === 'call_log' && (
                      <div className="flex items-center gap-2.5 py-1 min-w-[200px]">
                        <div className={`p-2.5 rounded-xl ${
                          msg.metadata?.callType === 'video' 
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {msg.metadata?.callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-black ${isMe ? 'text-black' : 'text-zinc-100'}`}>{msg.last_msg}</p>
                          <span className={`text-[9px] font-mono ${isMe ? 'text-black/70' : 'text-cyan-400/80'}`}>
                            {msg.call_duration ? `${Math.floor(msg.call_duration / 60)}m ${msg.call_duration % 60}s` : 'Transmission Log'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const isVideo = msg.metadata?.callType === 'video';
                            const route = isVideo ? '/video-call' : '/voice-call';
                            const callData = {
                              receiverId: peerUserId,
                              callerId: currentUserId,
                              callerName: currentUserProfile?.username || 'user',
                              callType: isVideo ? 'video' : 'voice',
                              roomId: [currentUserId, peerUserId].sort().join("-")
                            };
                            socketRef.current?.emit('initiate_call_signal', callData);
                            navigate(`${route}?userId=${peerUserId}&role=caller`);
                          }}
                          className={`text-[9px] font-mono font-extrabold uppercase px-2.5 py-1.5 rounded-lg transition-transform active:scale-95 ${
                            isMe ? 'bg-black/20 text-black hover:bg-black/30' : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
                          }`}
                        >
                          Redial
                        </button>
                      </div>
                    )}

                    {/* Standard Text Renderer */}
                    {msg.type === 'text' && (
                      <p className="whitespace-pre-wrap break-words">{msg.last_msg}</p>
                    )}
                    
                    {/* Timestamp & Status Metadata */}
                    <div className="flex items-center justify-end gap-1.5 mt-1.5 font-mono text-[9px]">
                      {msg.is_edited && (
                        <span className={`italic font-bold ${isMe ? 'text-black/50' : 'text-zinc-500'}`}>Edited</span>
                      )}
                      <span className={`font-bold ${isMe ? 'text-black/70' : 'text-zinc-400'}`}>
                        {new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span className="text-black/70">
                          {msg.status === 'read' ? (
                            <CheckCheck size={11} className="text-blue-900 stroke-[2.5px]" />
                          ) : (
                            <Check size={11} className="stroke-[2.5px]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reactions Badge Matrix */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center bg-[#0d0d16] border border-cyan-500/30 rounded-full px-2 py-0.5 text-[10px] gap-1 shadow-md mt-1 w-fit">
                      {Object.values(msg.reactions).map((emoji, idx) => (
                        <span key={idx} className="hover:scale-125 transition-transform cursor-pointer">{emoji}</span>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}

        {/* Peer Typing Indicator */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 text-cyan-300 text-xs pl-2 italic font-mono animate-pulse">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <span>@{peerProfile?.username || 'user'} is encoding message...</span>
          </div>
        )}

        {/* Peer Recording Indicator */}
        {isPeerRecording && (
          <div className="flex items-center gap-2 text-rose-400 text-xs pl-2 italic font-mono animate-pulse">
            <Mic size={14} className="text-rose-500 animate-spin" />
            <span>@{peerProfile?.username || 'user'} is recording quantum voice note...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. CYBER STICKER / GIF DRAWER */}
      <AnimatePresence>
        {showStickerDrawer && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#0b0b14] border-t border-cyan-500/20 p-3 z-40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-cyan-400 flex items-center gap-1">
                <Sticker size={12} /> Quantum Cyber Stickers
              </span>
              <button onClick={() => setShowStickerDrawer(false)} className="text-zinc-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {CYBER_STICKERS.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => sendStructuredPayload(`${stk.emoji} [${stk.label}]`, 'text')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/40 transition-all active:scale-95 group"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">{stk.emoji}</span>
                  <span className="text-[8px] font-mono text-zinc-400 group-hover:text-cyan-300 mt-1 truncate max-w-full">
                    {stk.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. SMART AI SUGGESTIONS CHIPS */}
      {!isRecordingVoice && (
        <div className="px-3 pt-2 bg-[#090910] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-30">
          <Sparkles size={13} className="text-cyan-400 shrink-0 ml-1 mr-0.5 animate-pulse" />
          {SMART_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setNewMessage(suggestion)}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-[11px] font-mono shrink-0 transition-all active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 5. CYBER COMPOSER CONSOLE */}
      <footer className="p-3.5 bg-[#090910] border-t border-cyan-500/20 flex flex-col gap-2 z-50 shadow-[0_-5px_25px_rgba(0,0,0,0.7)]">
        
        {/* Reply Preview Banner */}
        {replyingTo && (
          <div className="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyan-300">
              <CornerUpLeft size={14} className="text-cyan-400" />
              <p className="truncate font-mono">Replying to: <span className="italic text-white">"{replyingTo.last_msg}"</span></p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {/* Edit Message Banner */}
        {editingMessage && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-300">
              <Edit2 size={14} />
              <p>Editing Cyber Protocol Stream...</p>
            </div>
            <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="text-cyan-300 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {/* VOICE RECORDING ACTIVE HUD OVERLAY */}
        {isRecordingVoice ? (
          <div className="flex items-center justify-between bg-[#121220] border border-rose-500/40 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-400">
                RECORDING // {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
              {/* Equalizer Frequency Indicator */}
              <div className="flex items-center gap-1 h-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <span 
                    key={i} 
                    className="w-1 bg-rose-500 rounded-full animate-bounce" 
                    style={{ animationDelay: `${i * 0.15}s`, height: `${(i % 3 + 1) * 5}px` }} 
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelVoiceRecording}
                className="px-3 py-1.5 bg-white/10 hover:bg-rose-600/30 text-zinc-300 hover:text-rose-300 rounded-xl text-xs font-mono font-bold transition-all"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleToggleVoiceRecording}
                className="px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-rose-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Send size={12} /> Send Audio
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            
            {/* Attachment Controls */}
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => imageInputRef.current?.click()} 
                className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-white/5 rounded-xl transition-all"
                title="Send Photo"
              >
                <Image size={18} />
              </button>
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-white/5 rounded-xl transition-all"
                title="Send File"
              >
                <Paperclip size={18} />
              </button>
              
              <button 
                type="button" 
                onClick={() => setShowStickerDrawer(!showStickerDrawer)} 
                className={`p-2 rounded-xl transition-all ${
                  showStickerDrawer ? 'text-cyan-400 bg-cyan-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Cyber Stickers"
              >
                <Sticker size={18} />
              </button>
            </div>

            {/* Message Input Box */}
            <div className="flex-1 relative">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type a quantum transmission..."
                className="w-full bg-[#141422] border border-cyan-500/30 rounded-2xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-white placeholder-zinc-500 transition-all font-mono"
              />
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-300 transition-colors"
                title="Insert Emoji"
              >
                <Smile size={18} />
              </button>
            </div>

            {/* Voice Record or Send Action Button */}
            {newMessage.trim() ? (
              <button 
                type="submit"
                className="p-2.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                title="Transmit Message"
              >
                <Send size={16} className="fill-current" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleToggleVoiceRecording}
                className="p-2.5 bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 rounded-2xl active:scale-95 transition-all"
                title="Hold to Record Voice Note"
              >
                <Mic size={18} />
              </button>
            )}
          </form>
        )}

        {/* EMOJI PICKER POPUP */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50 bg-[#0d0d18] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)]">
            <Picker 
              data={data} 
              onEmojiSelect={(emoji) => { 
                setNewMessage(prev => prev + emoji.native); 
                setShowEmojiPicker(false); 
              }} 
              theme="dark" 
            />
          </div>
        )}
      </footer>
    </div>
  );
};

export default Messaging;
