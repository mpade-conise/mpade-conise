import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Phone, Video, MoreVertical, Send, Image, Smile, Mic, Paperclip, 
  CornerUpLeft, Trash2, Edit2, Pin, Star, Shield, AlertTriangle, 
  Trash, EyeOff, Check, CheckCheck, FileText, X, Play, Pause
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const AudioPlayer = ({ url }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-2 rounded-xl border border-cyan-500/40 shadow-[0_0_15px_rgba(0,243,255,0.2)] min-w-[200px]">
      <button 
        type="button" 
        onClick={togglePlay} 
        className="p-2 bg-cyan-400 text-black rounded-full hover:bg-cyan-300 transition-colors shadow-[0_0_12px_#00f3ff]"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} className="hidden" />
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden shadow-[inset_0_0_4px_rgba(0,0,0,0.8)] border border-cyan-500/20">
        <div className={`h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 shadow-[0_0_10px_#00f3ff] ${isPlaying ? 'w-full transition-all duration-[15s] linear animate-pulse' : 'w-0'}`} />
      </div>
    </div>
  );
};

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
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerRecording, setIsPeerRecording] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Appended Signaled Realtime Call Modality Mapping
  const [incomingCall, setIncomingCall] = useState(null);

  // Media Attachment Handling References
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

    const uploadedUrl = await uploadMediaAttachment(file);
    if (!uploadedUrl) return;

    sendStructuredPayload(file.name, messageType, uploadedUrl);
  };

  // --- Voice Note Capturing Streams ---
  const handleToggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      triggerTypingState(false, 'audio');
    } else {
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          
          const uploadedUrl = await uploadMediaAttachment(audioFile);
          if (uploadedUrl) {
            sendStructuredPayload("Voice Note", 'audio', uploadedUrl);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecordingVoice(true);
        triggerTypingState(true, 'audio');
      } catch (err) {
        console.error("Microphone device access denied:", err);
      }
    }
  };

  // --- Unified Payload Dispatcher ---
  const sendStructuredPayload = async (textText, messageType = 'text', mediaUrl = null) => {
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
      metadata: replyingTo ? { reply_to_id: replyingTo.id, reply_body: replyingTo.last_msg } : {},
      media_url: mediaUrl,
      call_duration: 0,
      status: 'sent',
      reactions: {}
    };

    setMessages(prev => [...prev, payload]);
    setNewMessage("");
    setReplyingTo(null);
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
      return;
    }

    sendStructuredPayload(newMessage.trim(), 'text');
  };

  // --- Advanced Interactivity Matrix (Reactions, Delete, Star) ---
  const addReaction = async (msgId, emojiStr) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

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
  };

  const togglePinMessage = async (msg) => {
    const updated = { ...msg, is_pinned: !msg.is_pinned };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    await supabase.from('messages').update({ is_pinned: updated.is_pinned }).eq('id', msg.id);
  };

  const toggleStarMessage = async (msg) => {
    const updated = { ...msg, is_starred: !msg.is_starred };
    setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
    await supabase.from('messages').update({ is_starred: updated.is_starred }).eq('id', msg.id);
  };

  const filteredConversationMessages = messages.filter(m => 
    m.last_msg?.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#06060c] text-white flex flex-col font-sans overflow-hidden relative selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Ambient Neon Reflection Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      {/* REALTIME MODAL GATEWAY FOR CAPTURING DETECTED INTERFACES */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[100] p-6 text-center border-4 border-cyan-500/20 shadow-[inset_0_0_80px_rgba(0,243,255,0.15)]"
          >
            <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-400/60 flex items-center justify-center animate-pulse mb-6 shadow-[0_0_35px_rgba(0,243,255,0.4)]">
              {incomingCall.callType === 'video' ? <Video size={40} className="text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]" /> : <Phone size={40} className="text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]" />}
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 drop-shadow-[0_0_10px_rgba(0,243,255,0.3)]">
              Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
            </h2>
            <p className="text-sm text-cyan-200/70 font-medium mb-10 tracking-widest uppercase">@{incomingCall.callerName || 'user'} is calling you...</p>
            
            <div className="flex items-center gap-10">
              <button 
                onClick={() => {
                  socketRef.current?.emit('decline_call', { callerId: incomingCall.callerId });
                  setIncomingCall(null);
                }}
                className="w-16 h-16 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center border border-red-400/50 active:scale-95 transition-all shadow-[0_0_25px_rgba(239,68,68,0.5)]"
              >
                <X size={28} />
              </button>
              
              <button 
                onClick={() => {
                  const targetCallRoute = incomingCall.callType === 'video' ? '/video-call' : '/voice-call';
                  const callerId = incomingCall.callerId;
                  setIncomingCall(null);
                  navigate(`${targetCallRoute}?userId=${callerId}&role=receiver`);
                }}
                className="w-16 h-16 bg-emerald-400 text-black rounded-full flex items-center justify-center hover:bg-emerald-300 active:scale-95 transition-all shadow-[0_0_30px_rgba(52,211,153,0.8)]"
              >
                <Check size={28} className="stroke-[3px]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HIDDEN MEDIA CORE HARDWARE INTERFACE DEVICE CAPTURING REFERENCE LABELS */}
      <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'image')} />
      <input type="file" ref={fileInputRef} accept="*/*" className="hidden" onChange={(e) => handleFileInputChange(e, 'file')} />

      {/* 2. CHAT HEADER SECTION */}
      <header className="px-4 py-3 bg-black/60 backdrop-blur-2xl border-b border-cyan-500/20 flex items-center justify-between z-50 shadow-[0_5px_25px_rgba(0,243,255,0.08)] relative">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-cyan-500/10 rounded-full transition-colors text-zinc-300 hover:text-cyan-400">
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative cursor-pointer group" onClick={() => navigate(`/user/${peerProfile?.id}`)}>
            <img 
              src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${peerUserId}`} 
              className="w-10 h-10 rounded-full object-cover border border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.3)] group-hover:border-cyan-400 transition-all" 
              alt="Avatar" 
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isPeerOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">@{peerProfile?.username || 'user'}</h2>
              {peerProfile?.is_verified && <span className="w-3.5 h-3.5 bg-cyan-400 text-black text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_#00f3ff]">✓</span>}
            </div>
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${isPeerOnline ? 'text-cyan-400 drop-shadow-[0_0_5px_#00f3ff]' : 'text-zinc-500'}`}>
              {isPeerOnline ? 'Active Now' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showSearchInput && (
            <input 
              type="text"
              placeholder="Search chat history..."
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              className="bg-black/80 border border-cyan-500/40 rounded-full px-3 py-1 text-xs focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,243,255,0.4)] w-40 text-white placeholder-zinc-500 transition-all"
            />
          )}
          <button onClick={() => setShowSearchInput(!showSearchInput)} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors"><EyeOff size={18} /></button>
          
          {/* --- APPENDED REQUISITE CALL MATRIX SIGNALS FOR THE DIAL GENERATOR OUTLETS --- */}
          <button 
            className="p-2 text-zinc-400 hover:text-cyan-400 transition-all hover:drop-shadow-[0_0_8px_#00f3ff]" 
            onClick={() => {
              socketRef.current?.emit('initiate_call_signal', {
                receiverId: peerUserId,
                callerId: currentUserId,
                callerName: currentUserProfile?.username || 'user',
                callType: 'voice'
              });
              navigate(`/voice-call?userId=${peerUserId}&role=caller`);
            }}
          >
            <Phone size={18} />
          </button>
          <button 
            className="p-2 text-zinc-400 hover:text-fuchsia-400 transition-all hover:drop-shadow-[0_0_8px_#d946ef]" 
            onClick={() => {
              socketRef.current?.emit('initiate_call_signal', {
                receiverId: peerUserId,
                callerId: currentUserId,
                callerName: currentUserProfile?.username || 'user',
                callType: 'video'
              });
              navigate(`/video-call?userId=${peerUserId}&role=caller`);
            }}
          >
            <Video size={18} />
          </button>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors"><MoreVertical size={18} /></button>
            <AnimatePresence>
              {showMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2 shadow-[0_0_30px_rgba(0,243,255,0.2)] z-50">
                  <button onClick={() => { alert("Conversation notification tracking disabled."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl flex items-center gap-2 transition-colors"><Shield size={14} /> Mute Notifications</button>
                  <button onClick={() => { alert("User added to restriction sandbox database."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-amber-500/10 rounded-xl flex items-center gap-2 text-amber-400 transition-colors"><AlertTriangle size={14} /> Restrict User</button>
                  <button onClick={() => { alert("Conversation reported."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-400 transition-colors"><AlertTriangle size={14} /> Report User</button>
                  <button onClick={() => { setMessages([]); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-400 transition-colors"><Trash size={14} /> Clear History</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* 3. MESSAGE CORE LAYOUT FRAMEWORK */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar z-10 relative">
        {filteredConversationMessages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {msg.metadata?.reply_to_id && (
                <div className="text-[11px] text-cyan-300/70 flex items-center gap-1 mb-1 px-2 opacity-80 drop-shadow-[0_0_4px_rgba(0,243,255,0.4)]">
                  <CornerUpLeft size={10} />
                  <span>Replied to: "{msg.metadata.reply_body}"</span>
                </div>
              )}

              <div className="group relative flex flex-col max-w-[75%]">
                <div className={`absolute -top-8 hidden group-hover:flex bg-black/90 backdrop-blur-md border border-cyan-500/30 rounded-full px-2.5 py-1 gap-2.5 shadow-[0_0_15px_rgba(0,243,255,0.25)] z-20 ${isMe ? 'right-0' : 'left-0'}`}>
                  <button onClick={() => setReplyingTo(msg)} className="text-zinc-400 hover:text-cyan-400 transition-colors"><CornerUpLeft size={12} /></button>
                  <button onClick={() => toggleStarMessage(msg)} className={`hover:text-amber-400 transition-colors ${msg.is_starred ? 'text-amber-400 drop-shadow-[0_0_6px_#f59e0b]' : 'text-zinc-400'}`}><Star size={12} /></button>
                  <button onClick={() => togglePinMessage(msg)} className={`hover:text-cyan-400 transition-colors ${msg.is_pinned ? 'text-cyan-400 drop-shadow-[0_0_6px_#00f3ff]' : 'text-zinc-400'}`}><Pin size={12} /></button>
                  {isMe && msg.type === 'text' && <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.last_msg); }} className="text-zinc-400 hover:text-cyan-400 transition-colors"><Edit2 size={12} /></button>}
                  {isMe && <button onClick={() => deleteMessage(msg.id)} className="text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>}
                </div>

                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed backdrop-blur-md transition-all ${
                  isMe 
                    ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-black font-semibold rounded-br-none shadow-[0_0_20px_rgba(0,243,255,0.35)] border border-cyan-300/50' 
                    : 'bg-black/70 text-white rounded-bl-none border border-cyan-500/20 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                }`}>
                  
                  {/* MULTIMEDIA RENDERING MATRIX ROUTERS */}
                  {msg.type === 'image' && msg.media_url && (
                    <img src={msg.media_url} crossOrigin="anonymous" referrerPolicy="no-referrer" alt="Attachment" className="max-w-full rounded-xl mb-1 object-cover max-h-60 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]" />
                  )}

                  {msg.type === 'file' && msg.media_url && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl mb-1 border border-cyan-500/30 text-xs font-bold tracking-tight hover:underline shadow-[0_0_10px_rgba(0,243,255,0.15)]">
                      <FileText size={16} className="text-cyan-400 drop-shadow-[0_0_5px_#00f3ff]" />
                      <span className="truncate max-w-[180px]">{msg.last_msg}</span>
                    </a>
                  )}

                  {msg.type === 'audio' && msg.media_url && (
                    <AudioPlayer url={msg.media_url} />
                  )}

                  {msg.type === 'text' && <p>{msg.last_msg}</p>}
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {msg.is_edited && <span className={`text-[8px] italic font-bold ${isMe ? 'text-black/50' : 'text-zinc-500'}`}>Edited</span>}
                    <span className={`text-[8px] font-black ${isMe ? 'text-black/70' : 'text-cyan-300/60'}`}>
                      {new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="text-black/70">
                        {msg.status === 'read' ? <CheckCheck size={10} className="text-blue-950 stroke-[3px]" /> : <Check size={10} className="stroke-[2.5px]" />}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => addReaction(msg.id, '❤️')} className="text-[10px] opacity-40 hover:opacity-100 hover:scale-125 transition-all">❤️</button>
                  <button onClick={() => addReaction(msg.id, '👍')} className="text-[10px] opacity-40 hover:opacity-100 hover:scale-125 transition-all">👍</button>
                  <button onClick={() => addReaction(msg.id, '😂')} className="text-[10px] opacity-40 hover:opacity-100 hover:scale-125 transition-all">😂</button>
                  
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center bg-black/80 border border-cyan-500/30 rounded-full px-1.5 py-0.5 text-[9px] gap-0.5 shadow-[0_0_8px_rgba(0,243,255,0.2)]">
                      {Object.values(msg.reactions).map((emoji, idx) => <span key={idx}>{emoji}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isPeerTyping && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs pl-2 italic animate-pulse drop-shadow-[0_0_8px_#00f3ff]">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_8px_#00f3ff]" />
            <span>@{peerProfile?.username} is typing...</span>
          </div>
        )}
        {isPeerRecording && (
          <div className="flex items-center gap-2 text-fuchsia-400 text-xs pl-2 italic animate-pulse drop-shadow-[0_0_8px_#d946ef]">
            <Mic size={12} className="text-fuchsia-500 animate-spin" />
            <span>@{peerProfile?.username} is recording audio note...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. COMPOSER BOTTOM CONSOLE */}
      <footer className="p-4 bg-black/70 backdrop-blur-2xl border-t border-cyan-500/20 flex flex-col gap-2 z-50 shadow-[0_-5px_25px_rgba(0,243,255,0.08)] relative">
        
        {replyingTo && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 p-2 rounded-xl flex items-center justify-between text-xs shadow-[0_0_10px_rgba(0,243,255,0.1)]">
            <div className="flex items-center gap-2 text-cyan-300">
              <CornerUpLeft size={14} />
              <p className="truncate">Replying to: <span className="italic text-cyan-100">"{replyingTo.last_msg}"</span></p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-cyan-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {editingMessage && (
          <div className="bg-fuchsia-950/30 border border-fuchsia-500/40 p-2 rounded-xl flex items-center justify-between text-xs shadow-[0_0_10px_rgba(217,70,239,0.2)]">
            <div className="flex items-center gap-2 text-fuchsia-400">
              <Edit2 size={14} />
              <p>Editing selected message wrapper...</p>
            </div>
            <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="text-fuchsia-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors hover:drop-shadow-[0_0_6px_#00f3ff]"><Image size={20} /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors hover:drop-shadow-[0_0_6px_#00f3ff]"><Paperclip size={20} /></button>
            <button type="button" onClick={handleToggleVoiceRecording} className={`p-2 transition-all active:scale-90 ${isRecordingVoice ? 'text-fuchsia-500 animate-pulse scale-110 drop-shadow-[0_0_12px_#d946ef]' : 'text-zinc-400 hover:text-fuchsia-400'}`}><Mic size={20} /></button>
          </div>

          <div className="flex-1 relative">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={isRecordingVoice ? "Recording voice note..." : "Message..."}
              disabled={isRecordingVoice}
              className="w-full bg-black/80 border border-cyan-500/30 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(0,243,255,0.3)] text-white placeholder-zinc-500 pr-10 disabled:opacity-50 transition-all"
            />
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isRecordingVoice} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-400 transition-colors disabled:opacity-30">
              <Smile size={18} />
            </button>
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim() || isRecordingVoice}
            className="p-2.5 bg-cyan-400 text-black rounded-full hover:bg-cyan-300 disabled:opacity-30 disabled:hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(0,243,255,0.5)] active:scale-95"
          >
            <Send size={16} className="fill-current" />
          </button>
        </form>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50 bg-black/95 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,243,255,0.3)]">
            <Picker data={data} onEmojiSelect={(emoji) => { setNewMessage(prev => prev + emoji.native); setShowEmojiPicker(false); }} theme="dark" />
          </div>
        )}
      </footer>
    </div>
  );
};

export default Messaging;
