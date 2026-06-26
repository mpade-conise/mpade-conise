import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { Send, Image, Smile, CheckCheck, Circle, MessageSquare } from 'lucide-react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const RealtimeChatEngine = ({ currentUserId, activeRoomId, peerUserMetadata }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  
  const socketRef = useRef(null);
  const scrollAnchorRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- 1. HISTORICAL BASE FETCH & SOCKET CONNECTION LOOP ---
  useEffect(() => {
    if (!currentUserId || !peerUserMetadata?.id) return;

    // Establish persistent socket connections
    socketRef.current = io(SOCKET_SERVER_URL);

    // Identify user profile to the node socket cluster map
    socketRef.current.emit('user_going_online', currentUserId);
    
    // We can continue to use activeRoomId for socket room scoping
    if (activeRoomId) {
      socketRef.current.emit('join_chat_room', { roomId: activeRoomId });
    }

    // Load old messages directly from the public.messages table
    const loadChatHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerUserMetadata.id}),and(sender_id.eq.${peerUserMetadata.id},receiver_id.eq.${currentUserId})`)
        .order('updated_at', { ascending: true }); // Using updated_at or created_at sequence

      if (!error && data) setMessages(data);
    };

    loadChatHistory();

    // --- SOCKET EVENT INTERFACES INCOMING ---
    socketRef.current.on('received_chat_message', (incomingMessage) => {
      // Ensure the incoming message belongs to this conversation pair
      const isFromPeer = incomingMessage.sender_id === peerUserMetadata.id && incomingMessage.receiver_id === currentUserId;
      const isFromMe = incomingMessage.sender_id === currentUserId && incomingMessage.receiver_id === peerUserMetadata.id;
      
      if (isFromPeer || isFromMe) {
        setMessages(prev => [...prev, incomingMessage]);
      }
    });

    socketRef.current.on('peer_typing_state_changed', ({ userId, isTyping }) => {
      if (userId === peerUserMetadata.id) {
        setIsPeerTyping(isTyping);
      }
    });

    socketRef.current.on('friend_presence_changed', ({ userId, status }) => {
      if (userId === peerUserMetadata?.id) {
        setIsPeerOnline(status === 'online');
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [currentUserId, peerUserMetadata, activeRoomId]);

  // --- 2. AUTOMATIC SCROLL SYNC ---
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  // --- 3. DISPATCH CHAT ACTION ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !peerUserMetadata?.id) return;

    // Construct object to strictly match your table parameters
    const temporaryMessageObject = {
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
      user_name: peerUserMetadata.username || 'User',
      last_msg: newMessage.trim(), // maps straight to last_msg text field
      unread: true,
      online: false,
      receiver_id: peerUserMetadata.id,
      sender_id: currentUserId,
      type: 'text',
      metadata: {},
      media_url: null,
      call_duration: 0
    };

    // Optimistic UI updates
    setMessages(prev => [...prev, temporaryMessageObject]);
    setNewMessage("");

    // Halt typing states instantly on trigger submit
    if (activeRoomId) {
      socketRef.current.emit('user_typing_state', { room_id: activeRoomId, userId: currentUserId, isTyping: false });
    }

    // Broadcast live over WebSocket pipeline
    socketRef.current.emit('send_chat_message', temporaryMessageObject);

    // Save permanently to the actual production table
    await supabase.from('messages').insert({
      id: temporaryMessageObject.id,
      updated_at: temporaryMessageObject.updated_at,
      user_name: temporaryMessageObject.user_name,
      last_msg: temporaryMessageObject.last_msg,
      unread: temporaryMessageObject.unread,
      online: temporaryMessageObject.online,
      receiver_id: temporaryMessageObject.receiver_id,
      sender_id: temporaryMessageObject.sender_id,
      type: temporaryMessageObject.type,
      metadata: temporaryMessageObject.metadata,
      media_url: temporaryMessageObject.media_url,
      call_duration: temporaryMessageObject.call_duration
    });
  };

  // --- 4. TYPING STATE PROPAGATION LOOP ---
  const handleInputChange = (textString) => {
    setNewMessage(textString);

    if (activeRoomId) {
      socketRef.current.emit('user_typing_state', { room_id: activeRoomId, userId: currentUserId, isTyping: true });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('user_typing_state', { room_id: activeRoomId, userId: currentUserId, isTyping: false });
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* HEADER SECTION LAYOUT */}
      <div className="px-6 py-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black shadow-md text-white">
            {peerUserMetadata?.username?.substring(0, 2).toUpperCase() || "MP"}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white">@{peerUserMetadata?.username || "Chat Member"}</h3>
            <div className="flex items-center gap-1.5">
              <Circle size={8} className={`fill-current ${isPeerOnline ? 'text-emerald-500' : 'text-zinc-500'}`} />
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">
                {isPeerOnline ? 'Active Now' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES CORE SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                isMe 
                  ? 'bg-cyan-500 text-black font-medium rounded-br-none shadow-lg shadow-cyan-500/10' 
                  : 'bg-zinc-900 text-zinc-100 rounded-bl-none border border-white/5'
              }`}>
                {/* Content text pulled directly from last_msg schema key */}
                <p>{msg.last_msg}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className={`text-[8px] font-bold ${isMe ? 'text-black/60' : 'text-zinc-500'}`}>
                    {new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && <CheckCheck size={10} className="text-black/60" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* TYPING DOT INDICATION FIELD */}
        {isPeerTyping && (
          <div className="flex justify-start items-center gap-2 text-zinc-500 text-xs italic font-medium animate-pulse pl-1">
            <MessageSquare size={12} className="text-cyan-500" />
            <span>@{peerUserMetadata?.username || "Someone"} is typing...</span>
          </div>
        )}
        <div ref={scrollAnchorRef} />
      </div>

      {/* FOOTER TEXT INPUT CONSOLE PANEL */}
      <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900/40 border-t border-white/10 flex items-center gap-3">
        <button type="button" className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Image size={20} />
        </button>
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Aa"
          className="flex-1 bg-zinc-900 text-white border border-white/5 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-zinc-500"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="p-2.5 bg-cyan-500 text-black rounded-full hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-all active:scale-95 shadow-md shadow-cyan-500/10"
        >
          <Send size={16} className="fill-current" />
        </button>
      </form>
    </div>
  );
};

export default RealtimeChatEngine;
