import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Send, Mic, Video, Image, Smile, Phone, Video as VideoIcon, 
  MoreVertical, CheckCheck, Play, Pause, Paperclip, X, Loader2,
  Heart, ThumbsUp, Laugh
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const Messages = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // --- NEW STATES FOR ADVANCED FEATURES ---
  const [isRecording, setIsRecording] = useState(false);
  const [reactions, setReactions] = useState({}); // { messageId: { emoji: count } }
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const scrollRef = useRef();
  const channelRef = useRef(null);
  const fileInputRef = useRef();

  // 1. REAL-TIME REACTIONS LOGIC
  const sendReaction = (messageId, emoji) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { messageId, emoji, userId: currentUser.id }
    });
    // Optimistic update
    updateReactionState(messageId, emoji);
  };

  const updateReactionState = (messageId, emoji) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: emoji
    }));
  };

  // 2. VOICE NOTE LOGIC
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/ogg; codecs=opus' });
      const fileName = `voice_${Date.now()}.ogg`;
      const { data, error } = await supabase.storage.from('media').upload(`chat/${fileName}`, audioBlob);
      if (!error) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(`chat/${fileName}`);
        handleSendMessage('audio_note', urlData.publicUrl, { duration: 'Voice Note' });
      }
      audioChunks.current = [];
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  // 3. CORE REALTIME CHANNEL (Updated)
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const channelId = [currentUser.id, selectedUser.id].sort().join("-");
    const channel = supabase.channel(`chat:${channelId}`);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (msg.receiver_id === currentUser.id) {
          setMessages(prev => [...prev, msg]);
          markAsRead(msg.id); // Mark specific message as read
        }
      })
      // LISTEN FOR BROADCAST REACTIONS
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        updateReactionState(payload.messageId, payload.emoji);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineStatus(!!state[selectedUser.id]);
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, currentUser]);

  const markAsRead = async (msgId) => {
    await supabase.from('messages').update({ unread: false }).eq('id', msgId);
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between backdrop-blur-xl bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-cyan-500/30 overflow-hidden">
             <img src={selectedUser?.avatar_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">@{selectedUser?.username}</h3>
            <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest animate-pulse">
              {onlineStatus ? 'Interstellar' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className="relative group max-w-[70%]">
              <div className={`px-4 py-3 rounded-2xl ${
                msg.sender_id === currentUser.id 
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-black' 
                : 'bg-zinc-900 border border-white/10'
              }`}>
                {/* Render Content */}
                {msg.type === 'audio_note' ? (
                   <div className="flex items-center gap-3">
                     <Play size={16} fill="currentColor" />
                     <div className="h-1 w-24 bg-white/20 rounded-full" />
                     <span className="text-[10px] font-bold">VOICE</span>
                   </div>
                ) : (
                  <p className="text-sm">{msg.last_msg}</p>
                )}

                {/* Reaction Overlay */}
                {reactions[msg.id] && (
                  <div className="absolute -bottom-2 -right-2 bg-zinc-800 border border-white/10 rounded-full px-1.5 py-0.5 text-[12px] shadow-lg">
                    {reactions[msg.id]}
                  </div>
                )}
              </div>

              {/* Reaction Picker on Hover */}
              <div className="absolute top-0 -left-20 opacity-0 group-hover:opacity-100 transition-all flex gap-1 bg-black/50 p-1 rounded-full border border-white/5 backdrop-blur-md">
                 <Heart size={14} className="hover:text-red-500 cursor-pointer" onClick={() => sendReaction(msg.id, '❤️')} />
                 <ThumbsUp size={14} className="hover:text-blue-500 cursor-pointer" onClick={() => sendReaction(msg.id, '👍')} />
                 <Laugh size={14} className="hover:text-yellow-500 cursor-pointer" onClick={() => sendReaction(msg.id, '😂')} />
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Real-time Input Area */}
      <div className="p-4 bg-black/80 backdrop-blur-2xl border-t border-white/5">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2">
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                RECORDING VOICE NOTE...
              </div>
              <button onClick={stopRecording} className="text-white bg-red-500 p-2 rounded-full"><Send size={16}/></button>
            </div>
          ) : (
            <div className="flex-1 flex items-center bg-zinc-900 rounded-2xl px-3 border border-white/5">
              <input 
                className="flex-1 bg-transparent py-3 text-sm outline-none"
                placeholder="Message the Universe..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button onClick={startRecording} className="p-2 text-zinc-500 hover:text-cyan-400">
                <Mic size={20} />
              </button>
              <button className="p-2 text-zinc-500 hover:text-cyan-400">
                <Image size={20} />
              </button>
            </div>
          )}
          
          {!isRecording && (
            <button 
              onClick={() => handleSendMessage('text', null)}
              className="p-4 bg-cyan-500 rounded-2xl text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-90 transition-all"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
