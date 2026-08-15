// src/pages/Live/Shared/ChatBox.jsx
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';

const ChatBox = ({ streamId }) => {
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  // 1. Fetch initial chat comments & gifts, then subscribe in real-time
  useEffect(() => {
    if (!streamId) return;
    let isMounted = true;

    const fetchActivity = async () => {
      // Fetch latest comments
      const { data: comments } = await supabase
        .from('live_comments')
        .select('id, text, message, content, user_id, user_name, created_at, profiles(username, avatar_url)')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(40);

      // Fetch recent gifts
      const { data: gifts } = await supabase
        .from('live_gifts')
        .select('id, sender_id, gift_name, price_total, icon, created_at, profiles:sender_id(username, avatar_url)')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!isMounted) return;

      const formattedComments = (comments || []).map(c => ({
        type: 'comment',
        id: c.id,
        user_id: c.user_id,
        username: c.profiles?.username || c.user_name || 'User',
        avatar_url: c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
        text: c.text || c.message || c.content,
        created_at: c.created_at
      }));

      const formattedGifts = (gifts || []).map(g => ({
        type: 'gift',
        id: `gift-${g.id}`,
        user_id: g.sender_id,
        username: g.profiles?.username || 'Supporter',
        avatar_url: g.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${g.sender_id}`,
        giftName: g.gift_name || 'Virtual Gift',
        icon: g.icon || '🎁',
        price: g.price_total || 50,
        created_at: g.created_at
      }));

      const merged = [...formattedComments, ...formattedGifts].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );

      setItems(merged.slice(-50));
    };

    fetchActivity();

    // Realtime comments listener
    const chatChannel = supabase
      .channel(`live-feed-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${streamId}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        const newComment = {
          type: 'comment',
          id: payload.new.id,
          user_id: payload.new.user_id,
          username: profile?.username || payload.new.user_name || 'User',
          avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.user_id}`,
          text: payload.new.text || payload.new.message || payload.new.content,
          created_at: payload.new.created_at || new Date().toISOString()
        };

        if (isMounted) {
          setItems((prev) => [...prev.slice(-49), newComment]);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_gifts',
        filter: `stream_id=eq.${streamId}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();

        const newGift = {
          type: 'gift',
          id: `gift-${payload.new.id || Date.now()}`,
          user_id: payload.new.sender_id,
          username: profile?.username || 'Supporter',
          avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.sender_id}`,
          giftName: payload.new.gift_name || 'Gift',
          icon: payload.new.icon || '🎁',
          price: payload.new.price_total || 50,
          created_at: payload.new.created_at || new Date().toISOString()
        };

        if (isMounted) {
          setItems((prev) => [...prev.slice(-49), newGift]);
        }
      })
      .subscribe();

    // Listen for client broadcast gifts
    const handleCustomGift = (e) => {
      if (e.detail) {
        setItems(prev => [...prev.slice(-49), {
          type: 'gift',
          id: `custom-gift-${Date.now()}`,
          username: e.detail.username || 'Supporter',
          avatar_url: e.detail.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=gift',
          giftName: e.detail.giftName || 'Virtual Gift',
          icon: e.detail.icon || '🎁',
          price: e.detail.price || 50,
          created_at: new Date().toISOString()
        }]);
      }
    };
    window.addEventListener('mpade_gift_received', handleCustomGift);

    return () => {
      isMounted = false;
      supabase.removeChannel(chatChannel);
      window.removeEventListener('mpade_gift_received', handleCustomGift);
    };
  }, [streamId]);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden relative border-none shadow-none">
      {/* Stream Messages Container - Purely Borderless & Floating */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 p-3 hide-scrollbar"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            if (item.type === 'gift') {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9, x: -12 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-transparent backdrop-blur-md p-2 rounded-2xl w-fit max-w-[95%] border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                >
                  <img 
                    src={item.avatar_url} 
                    alt="" 
                    className="w-7 h-7 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] flex-shrink-0"
                  />
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wide truncate max-w-[90px]">
                        {item.username}
                      </span>
                      <span className="text-[9px] font-bold text-pink-400 uppercase tracking-tight">
                        sent {item.giftName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[9px] font-mono text-cyan-300">✨ {item.price} Coins</span>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Normal Comment Bubble
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl w-fit max-w-[90%] border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              >
                <img 
                  src={item.avatar_url} 
                  alt="" 
                  className="w-6 h-6 rounded-full object-cover border border-pink-500/70 shadow-[0_0_8px_rgba(244,63,94,0.5)] flex-shrink-0 mt-0.5"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]">
                    {item.username}
                  </span>
                  <p className="text-[12px] font-medium text-cyan-50 leading-tight drop-shadow-[0_0_4px_rgba(6,182,212,0.5)] break-words">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatBox;
