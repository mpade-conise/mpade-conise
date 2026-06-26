import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Phone, Video, MoreVertical, Send, Image, Smile, Mic, Paperclip, 
  CornerUpLeft, Trash2, Edit2, Copy, Pin, Star, Languages, Shield, AlertTriangle, 
  Trash, EyeOff, Radio, Users, Check, CheckCheck, Clock, Camera, FileText, MapPin, 
  BarChart2, SmilePlus, X 
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

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

    // Load entire history cleanly targeting complete dual communication vectors
    const loadConversationStream = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true }); // Switched to created_at to avoid timeline distortion

      if (!error && data) {
        setMessages(data);
        
        // Mark peer's messages as read
        await supabase
          .from('messages')
          .update({ unread: false, status: 'read' })
          .eq('sender_id', peerUserId)
          .eq('receiver_id', currentUserId);
      }
    };

    loadConversationStream();

    // Socket Realtime Message Ingestion Flow
    socketRef.current.on('received_chat_message', (incoming) => {
      const isRelevant = 
        (incoming.sender_id === peerUserId && incoming.receiver_id === currentUserId) ||
        (incoming.sender_id === currentUserId && incoming.receiver_id === peerUserId);

      if (isRelevant) {
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

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [currentUserId, peerUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping, isPeerRecording]);

  // --- Typing State Transmission Engine ---
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

  // --- Send & Edit Execution Engine ---
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

    const payload = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_name: currentUserProfile?.username || 'User',
      last_msg: newMessage.trim(),
      unread: true,
      online: false,
      receiver_id: peerUserId,
      sender_id: currentUserId,
      type: 'text',
      metadata: replyingTo ? { reply_to_id: replyingTo.id, reply_body: replyingTo.last_msg } : {},
      media_url: null,
      call_duration: 0,
      status: 'sent',
      reactions: {}
    };

    // Optimistically update state pipeline matrix
    setMessages(prev => [...prev, payload]);
    setNewMessage("");
    setReplyingTo(null);
    triggerTypingState(false, 'text');

    // Broadcast through socket socketRef and write straight to database
    socketRef.current?.emit('send_chat_message', payload);
    await supabase.from('messages').insert(payload);
  };

  // --- Interactions Vector ---
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

  const handleMediaUploadMock = async (type) => {
    alert(`Selecting File from your device ecosystem: [${type}]`);
  };

  const filteredConversationMessages = messages.filter(m => 
    m.last_msg?.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#08080a] text-white flex flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-4 py-3 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative cursor-pointer" onClick={() => navigate(`/user/${peerProfile?.id}`)}>
            <img 
              src={peerProfile?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${peerUserId}`} 
              className="w-10 h-10 rounded-full object-cover border border-white/10" 
              alt="Avatar" 
            />
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${isPeerOnline ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
          </div>

          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-sm font-bold tracking-tight">@{peerProfile?.username || 'user'}</h2>
              {peerProfile?.is_verified && <span className="w-3.5 h-3.5 bg-cyan-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">✓</span>}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
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
              className="bg-zinc-900 border border-white/10 rounded-full px-3 py-1 text-xs focus:outline-none w-40 text-white"
            />
          )}
          <button onClick={() => setShowSearchInput(!showSearchInput)} className="p-2 text-zinc-400 hover:text-white"><EyeOff size={18} /></button>
          <button className="p-2 text-zinc-400 hover:text-white" onClick={() => alert("Initiating high-fidelity audio stream...")}><Phone size={18} /></button>
          <button className="p-2 text-zinc-400 hover:text-white" onClick={() => alert("Initiating secure video capture stream...")}><Video size={18} /></button>
          
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-400 hover:text-white"><MoreVertical size={18} /></button>
            <AnimatePresence>
              {showMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
                  <button onClick={() => { alert("Notifications muted."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2"><Shield size={14} /> Mute Notifications</button>
                  <button onClick={() => { alert("User restricted."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-amber-500"><AlertTriangle size={14} /> Restrict User</button>
                  <button onClick={() => { alert("User reported."); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-red-500"><AlertTriangle size={14} /> Report User</button>
                  <button onClick={() => { setMessages([]); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-red-500"><Trash size={14} /> Clear History</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* MESSAGES VIEW CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#08080a]">
        {filteredConversationMessages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              
              {msg.metadata?.reply_to_id && (
                <div className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1 px-2 opacity-60">
                  <CornerUpLeft size={10} />
                  <span>Replied to: "{msg.metadata.reply_body}"</span>
                </div>
              )}

              <div className="group relative flex flex-col max-w-[75%]">
                {/* Micro Hover Controls */}
                <div className={`absolute -top-7 hidden group-hover:flex bg-zinc-900 border border-white/10 rounded-full px-2 py-1 gap-2 shadow-xl z-10 ${isMe ? 'right-0' : 'left-0'}`}>
                  <button onClick={() => setReplyingTo(msg)} className="text-zinc-400 hover:text-white"><CornerUpLeft size={12} /></button>
                  <button onClick={() => toggleStarMessage(msg)} className={`hover:text-amber-400 ${msg.is_starred ? 'text-amber-400' : 'text-zinc-400'}`}><Star size={12} /></button>
                  <button onClick={() => togglePinMessage(msg)} className={`hover:text-cyan-400 ${msg.is_pinned ? 'text-cyan-400' : 'text-zinc-400'}`}><Pin size={12} /></button>
                  {isMe && <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.last_msg); }} className="text-zinc-400 hover:text-cyan-400"><Edit2 size={12} /></button>}
                  {isMe && <button onClick={() => deleteMessage(msg.id)} className="text-zinc-400 hover:text-red-500"><Trash2 size={12} /></button>}
                </div>

                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe ? 'bg-cyan-500 text-black font-semibold rounded-br-none' : 'bg-zinc-900 text-zinc-100 rounded-bl-none border border-white/5'
                }`}>
                  <p>{msg.last_msg}</p>
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {msg.is_edited && <span className={`text-[8px] italic font-bold ${isMe ? 'text-black/40' : 'text-zinc-600'}`}>Edited</span>}
                    <span className={`text-[8px] font-black ${isMe ? 'text-black/60' : 'text-zinc-500'}`}>
                      {new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="text-black/60">
                        {msg.status === 'read' ? <CheckCheck size={10} className="text-blue-900" /> : <Check size={10} />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Micro Reactions */}
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => addReaction(msg.id, '❤️')} className="text-[10px] opacity-40 hover:opacity-100">❤️</button>
                  <button onClick={() => addReaction(msg.id, '👍')} className="text-[10px] opacity-40 hover:opacity-100">👍</button>
                  <button onClick={() => addReaction(msg.id, '😂')} className="text-[10px] opacity-40 hover:opacity-100">😂</button>
                  
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center bg-zinc-900 border border-white/10 rounded-full px-1.5 py-0.5 text-[9px] gap-0.5">
                      {Object.values(msg.reactions).map((emoji, idx) => <span key={idx}>{emoji}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isPeerTyping && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs pl-2 italic animate-pulse">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            <span>@{peerProfile?.username} is typing...</span>
          </div>
        )}
        {isPeerRecording && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs pl-2 italic animate-pulse">
            <Mic size={12} className="text-[#fe2c55] animate-spin" />
            <span>@{peerProfile?.username} is recording audio note...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER INPUT COMPOSER */}
      <footer className="p-4 bg-zinc-950 border-t border-white/5 flex flex-col gap-2 z-50">
        
        {replyingTo && (
          <div className="bg-zinc-900/50 border border-white/5 p-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <CornerUpLeft size={14} />
              <p className="truncate">Replying to: <span className="italic text-zinc-200">"{replyingTo.last_msg}"</span></p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {editingMessage && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyan-400">
              <Edit2 size={14} />
              <p>Editing message...</p>
            </div>
            <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="text-cyan-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => handleMediaUploadMock('image')} className="p-2 text-zinc-400 hover:text-white"><Image size={20} /></button>
            <button type="button" onClick={() => handleMediaUploadMock('file')} className="p-2 text-zinc-400 hover:text-white"><Paperclip size={20} /></button>
            <button type="button" onMouseDown={() => triggerTypingState(true, 'audio')} onMouseUp={() => triggerTypingState(false, 'audio')} className="p-2 text-zinc-400 hover:text-[#fe2c55] active:scale-90 transition-transform"><Mic size={20} /></button>
          </div>

          <div className="flex-1 relative">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Message..."
              className="w-full bg-zinc-900 border border-white/5 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-cyan-500/40 text-white placeholder-zinc-500 pr-10"
            />
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <Smile size={18} />
            </button>
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-cyan-500 text-black rounded-full hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/10"
          >
            <Send size={16} className="fill-current" />
          </button>
        </form>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50 bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <Picker data={data} onEmojiSelect={(emoji) => { setNewMessage(prev => prev + emoji.native); setShowEmojiPicker(false); }} theme="dark" />
          </div>
        )}
      </footer>
    </div>
  );
};

export default Messaging;
