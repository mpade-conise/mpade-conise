import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Mic, Phone, Video as VideoIcon, MoreVertical, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const Messages = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineStatus, setOnlineStatus] = useState(false);
  
  const scrollRef = useRef();
  const channelRef = useRef(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      const fetchUser = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) setSelectedUser(data);
      };
      fetchUser();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    // Load existing messages
    const fetchInitialMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('updated_at', { ascending: true });
      if (data) setMessages(data);
      scrollToBottom();
    };

    fetchInitialMessages();

    // Real-time subscription
    const channelId = [currentUser.id, selectedUser.id].sort().join("-");
    const channel = supabase.channel(`chat:${channelId}`);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        // Verify this message belongs to the current open chat
        if (msg.sender_id === selectedUser.id || msg.sender_id === currentUser.id) {
          setMessages(prev => {
            // Avoid duplicates if optimistic update already added it
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempId = Math.random().toString();
    const messageData = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      last_msg: newMessage,
      type: 'text',
      unread: true,
      user_name: currentUser.username || 'User',
      updated_at: new Date().toISOString(),
      isSending: true // Local flag
    };

    // OPTIMISTIC UPDATE: Show it immediately
    setMessages(prev => [...prev, messageData]);
    setNewMessage("");
    scrollToBottom();

    const { error, data } = await supabase.from('messages').insert([{
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      last_msg: messageData.last_msg,
      type: 'text',
      unread: true,
      user_name: messageData.user_name
    }]).select();

    if (error) {
       console.error("Upload failed", error);
       // Optional: Remove the message or show error icon
    }
  };

  if (!selectedUser) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-cyan-400" /></div>;

  return (
    /* h-screen + overflow-hidden is key for Malawian mobile web views to prevent clipping */
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0b] text-white">
      
      {/* HEADER: flex-none ensures it never shrinks */}
      <header className="flex-none h-16 px-4 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-cyan-500/20 bg-zinc-800" />
          <div>
            <h3 className="text-sm font-bold tracking-tight">@{selectedUser.username}</h3>
            <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Connected</p>
          </div>
        </div>
        <div className="flex gap-4 text-zinc-500">
          <Phone size={20} className="hover:text-cyan-400 cursor-pointer transition-colors" />
          <MoreVertical size={20} />
        </div>
      </header>

      {/* MESSAGE LIST: flex-1 makes it take all remaining space */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-2xl relative shadow-lg ${
              msg.sender_id === currentUser.id 
              ? 'bg-cyan-600 text-black rounded-tr-none' 
              : 'bg-zinc-900 border border-white/5 rounded-tl-none'
            }`}>
              <p className="text-sm leading-relaxed">{msg.last_msg}</p>
              <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[9px] font-bold">
                {msg.updated_at && formatDistanceToNow(new Date(msg.updated_at), { addSuffix: true })}
                {msg.sender_id === currentUser.id && (
                  <CheckCheck size={12} className={msg.unread ? 'opacity-40' : 'text-blue-900'} />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} className="h-2" />
      </main>

      {/* INPUT: flex-none keeps it at the bottom */}
      <footer className="flex-none p-4 bg-black border-t border-white/5">
        <div className="flex items-center gap-2 bg-zinc-900/50 rounded-xl p-2 border border-white/5 focus-within:border-cyan-500/50 transition-all">
          <input 
            className="flex-1 bg-transparent border-none outline-none text-sm py-2 px-2"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            onClick={handleSendMessage}
            className="p-2.5 bg-cyan-500 rounded-lg text-black hover:scale-105 active:scale-95 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Messages;
