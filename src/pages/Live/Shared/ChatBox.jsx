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
        .select('id, content, user_id, profiles(username, avatar_url)')
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
              className="flex items-start gap-2 bg-black/20 backdrop-blur-sm p-2 rounded-2xl w-fit max-w-[90%] border border-white/5"
            >
              <img 
                src={msg.profiles?.avatar_url || 'https://via.placeholder.com/50'} 
                alt="" 
                className="w-6 h-6 rounded-full object-cover border border-white/10"
              />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">
                  {msg.profiles?.username || 'User'}
                </span>
                <p className="text-[11px] font-medium text-white leading-tight">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Decorative Overlays (No UI elements here) */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};

export default ChatBox;