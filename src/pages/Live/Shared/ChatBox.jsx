import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const ChatBox = ({ streamId }) => {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // 1. Fetch existing messages & Listen for new ones
  useEffect(() => {
    if (!streamId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('live_comments')
        .select('id, text, message, content, user_id, profiles(username, avatar_url)')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data) setMessages(data);
    };

    fetchMessages();

    // Realtime subscription for independent functionality
    const channel = supabase
      .channel(`chat-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${streamId}`
      }, async (payload) => {
        // Fetch profile for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        const newMessage = {
          ...payload.new,
          profiles: profile
        };

        setMessages((prev) => [...prev.slice(-49), newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // 2. Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden relative">
      {/* Messages Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-2 hide-scrollbar mask-chat"
        style={{ 
          maskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)'
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              /* Added Cyan neon border, background blur, and glowing box shadow */
              className="flex items-start gap-2 bg-black/40 backdrop-blur-md p-2.5 rounded-2xl w-fit max-w-[90%] border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <img 
                src={msg.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`} 
                alt="" 
                /* Added Pink neon border and glowing shadow to avatars */
                className="w-7 h-7 rounded-full object-cover border border-pink-500/80 shadow-[0_0_10px_rgba(244,63,94,0.6)] flex-shrink-0"
              />
              <div className="flex flex-col pt-0.5">
                <span 
                  /* Added Pink glowing text for the username */
                  className="text-[10px] font-black text-pink-400 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                >
                  {msg.profiles?.username || 'User'}
                </span>
                <p 
                  /* Added Cyan glowing text for the message content */
                  className="text-[12px] font-medium text-cyan-50 leading-tight drop-shadow-[0_0_4px_rgba(6,182,212,0.6)] mt-0.5"
                >
                  {/* Fallback check for text, message, or content column names */}
                  {msg.text || msg.message || msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Decorative Overlays - Darkened slightly to make the neon pop more */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
};

export default ChatBox;
