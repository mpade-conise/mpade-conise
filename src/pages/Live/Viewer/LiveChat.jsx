import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Send } from 'lucide-react';

const LiveChat = ({ streamId, hideMessages = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;

    let isMounted = true;

    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('live_comments')
        .select(`
          *,
          profiles:user_id (
            avatar_url
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true });
      
      if (isMounted) {
        if (error) {
          console.error("Fetch Error:", error.message);
        } else {
          setMessages(data || []);
        }
      }
    };

    fetchChat();

    // Channel naming should be specific to Chat
    const channel = supabase.channel(`chat-room-${streamId}`);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${streamId}`,
      }, async (payload) => {
        // Fetch profile for the new message
        const { data: userData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        if (isMounted) {
          const messageWithAvatar = {
            ...payload.new,
            profiles: userData ? { avatar_url: userData.avatar_url } : null
          };

          setMessages((prev) => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, messageWithAvatar];
          });
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Handle auto-scroll
  useEffect(() => {
    if (!hideMessages && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, hideMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentInput = input;
    setInput("");

    const { error } = await supabase.from('live_comments').insert([{
      stream_id: streamId,
      user_id: user?.id,
      user_name: user?.user_metadata?.username || "Guest",
      text: currentInput
    }]);

    if (error) {
      console.error("Send Error:", error.message);
      setInput(currentInput); 
    }
  };

  return (
    <div className="flex flex-col h-full w-full pointer-events-none relative z-50">
      
      {/* MESSAGE LIST */}
      {!hideMessages && (
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pointer-events-auto hide-scrollbar">
          {messages.length === 0 ? (
            <div className="text-white/20 text-[10px] p-4 italic">Welcome to the live chat!</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2 max-w-full">
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden mt-0.5">
                  {m.profiles?.avatar_url && <img src={m.profiles.avatar_url} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="flex flex-col bg-black/30 rounded-2xl px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-[#fe2c55] mb-0.5">
                    {m.user_name}
                  </span>
                  <span className="text-[13px] text-white font-normal leading-tight break-words">
                    {m.text}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-4 pointer-events-auto">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add comment..."
            className="w-full bg-white/10 backdrop-blur-3xl border border-white/10 rounded-full py-2.5 pl-5 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-all shadow-lg"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="absolute right-1.5 w-8 h-8 bg-[#fe2c55] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform disabled:opacity-50"
          >
            <Send size={14} fill="currentColor" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;