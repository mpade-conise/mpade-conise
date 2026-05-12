import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Send, Mic, Image, Smile, Phone, Video as VideoIcon, 
  MoreVertical, CheckCheck, Play, X, Loader2,
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
  const [isRecording, setIsRecording] = useState(false);
  const [reactions, setReactions] = useState({});
  
  const scrollRef = useRef();
  const channelRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // --- FIX: FETCH SELECTED USER ---
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

  // --- FIX: REALTIME LOGIC (Show both sent and received) ---
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const channelId = [currentUser.id, selectedUser.id].sort().join("-");
    const channel = supabase.channel(`chat:${channelId}`);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        // VALIDATION: Only add message if it belongs to this specific conversation
        const isRelated = 
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id) ||
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id);

        if (isRelated) {
          setMessages(prev => {
            // Prevent duplicate entries
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.receiver_id === currentUser.id) markAsRead(msg.id);
          scrollToBottom();
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        setReactions(prev => ({ ...prev, [payload.messageId]: payload.emoji }));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineStatus(!!state[selectedUser.id]);
      })
      .subscribe();

    channelRef.current = channel;
    fetchMessages();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, currentUser]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order('updated_at', { ascending: true });
    if (data) setMessages(data);
    scrollToBottom();
  };

  const handleSendMessage = async (type = 'text', mediaUrl = null) => {
    if (type === 'text' && !newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      last_msg: type === 'text' ? newMessage : `Sent a ${type}`,
      type: type,
      media_url: mediaUrl,
      unread: true,
      user_name: currentUser.username || 'User'
    });

    if (!error) {
      setNewMessage("");
      // No need to manually add to state; the Realtime listener handles the INSERT event
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const markAsRead = async (msgId) => {
    await supabase.from('messages').update({ unread: false }).eq('id', msgId);
  };

  if (!selectedUser) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#050505] text-white">
      {/* HEADER: Compressed & Sticky */}
      <header className="flex-none p-3 border-b border-white/5 flex items-center justify-between backdrop-blur-2xl bg-black/60 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-cyan-500/30 overflow-hidden bg-zinc-800">
             <img src={selectedUser?.avatar_url} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">@{selectedUser?.username}</h3>
            <p className="text-[8px] text-cyan-500 font-black uppercase tracking-widest">
              {onlineStatus ? 'Interstellar' : 'Deep Space'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-zinc-400">
          <Phone size={18} className="hover:text-cyan-400" />
          <VideoIcon size={18} className="hover:text-pink-500" />
        </div>
      </header>

      {/* MESSAGES AREA: Auto-fit flex-grow */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className="relative group max-w-[85%] sm:max-w-[70%]">
              <div className={`px-4 py-2.5 rounded-2xl shadow-lg ${
                msg.sender_id === currentUser.id 
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-black rounded-tr-none' 
                : 'bg-zinc-900/90 border border-white/10 text-white rounded-tl-none'
              }`}>
                <p className="text-[13px] leading-relaxed">{msg.last_msg}</p>
                
                <div className={`flex items-center gap-1 mt-1 opacity-40 text-[8px] font-bold ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                   {msg.updated_at ? formatDistanceToNow(new Date(msg.updated_at), { addSuffix: true }) : 'now'}
                   {msg.sender_id === currentUser.id && <CheckCheck size={10} className={msg.unread ? 'text-black/40' : 'text-blue-900'} />}
                </div>

                {reactions[msg.id] && (
                  <div className="absolute -bottom-2 -right-2 bg-zinc-800 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] shadow-xl">
                    {reactions[msg.id]}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </main>

      {/* INPUT AREA: Fixed Bottom */}
      <footer className="flex-none p-3 bg-black/90 backdrop-blur-3xl border-t border-white/5">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center bg-zinc-900/80 rounded-2xl px-3 border border-white/5 focus-within:border-cyan-500/50 transition-all">
            <input 
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-zinc-600"
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="p-2 text-zinc-500 hover:text-cyan-400 transition-colors">
              <Mic size={18} />
            </button>
          </div>
          
          <button 
            onClick={() => handleSendMessage()}
            className="p-3.5 bg-cyan-500 rounded-xl text-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Messages;
