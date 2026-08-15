// src/pages/Live/Viewer/LiveChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Send, Gift, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LiveChat = ({ streamId, hideMessages = false }) => {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;
    let isMounted = true;

    const fetchChatAndGifts = async () => {
      // Fetch initial comments
      const { data: comments } = await supabase
        .from('live_comments')
        .select(`
          id, text, message, content, user_name, user_id, created_at,
          profiles:user_id ( avatar_url, username )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(40);

      // Fetch initial gifts
      const { data: gifts } = await supabase
        .from('live_gifts')
        .select(`
          id, sender_id, gift_name, price_total, icon, created_at,
          profiles:sender_id ( avatar_url, username )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!isMounted) return;

      const formattedComments = (comments || []).map(c => ({
        type: 'comment',
        id: c.id,
        user_id: c.user_id,
        user_name: c.profiles?.username || c.user_name || 'Viewer',
        avatar_url: c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
        text: c.text || c.message || c.content,
        created_at: c.created_at
      }));

      const formattedGifts = (gifts || []).map(g => ({
        type: 'gift',
        id: `gift-${g.id}`,
        user_id: g.sender_id,
        user_name: g.profiles?.username || 'Supporter',
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

    fetchChatAndGifts();

    // Supabase Real-time Channel for comments & gifts
    const channel = supabase.channel(`viewer-chat-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${streamId}`,
      }, async (payload) => {
        const { data: userData } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', payload.new.user_id)
          .single();

        if (isMounted) {
          const newComment = {
            type: 'comment',
            id: payload.new.id,
            user_id: payload.new.user_id,
            user_name: userData?.username || payload.new.user_name || 'Viewer',
            avatar_url: userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.user_id}`,
            text: payload.new.text || payload.new.message || payload.new.content,
            created_at: payload.new.created_at || new Date().toISOString()
          };

          setItems((prev) => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev.slice(-49), newComment];
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_gifts',
        filter: `stream_id=eq.${streamId}`,
      }, async (payload) => {
        const { data: userData } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', payload.new.sender_id)
          .single();

        if (isMounted) {
          const newGift = {
            type: 'gift',
            id: `gift-${payload.new.id || Date.now()}`,
            user_id: payload.new.sender_id,
            user_name: userData?.username || 'Supporter',
            avatar_url: userData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.sender_id}`,
            giftName: payload.new.gift_name || 'Virtual Gift',
            icon: payload.new.icon || '🎁',
            price: payload.new.price_total || 50,
            created_at: payload.new.created_at || new Date().toISOString()
          };

          setItems((prev) => [...prev.slice(-49), newGift]);
        }
      })
      .subscribe();

    // Listen to local gift dispatch events
    const handleLocalGift = (e) => {
      if (e.detail && isMounted) {
        setItems((prev) => [...prev.slice(-49), {
          type: 'gift',
          id: `local-gift-${Date.now()}`,
          user_name: e.detail.username || 'Supporter',
          avatar_url: e.detail.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=gift',
          giftName: e.detail.giftName || 'Virtual Gift',
          icon: e.detail.icon || '🎁',
          price: e.detail.price || 50,
          created_at: new Date().toISOString()
        }]);
      }
    };
    window.addEventListener('mpade_gift_received', handleLocalGift);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('mpade_gift_received', handleLocalGift);
    };
  }, [streamId]);

  // Handle auto-scroll
  useEffect(() => {
    if (!hideMessages && items.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [items, hideMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const currentInput = input.trim();
    setInput("");

    const { error } = await supabase.from('live_comments').insert([{
      stream_id: streamId,
      user_id: user?.id,
      user_name: user?.user_metadata?.username || user?.email?.split('@')[0] || "Viewer",
      text: currentInput
    }]);

    if (error) {
      console.error("Send Error:", error.message);
      setInput(currentInput); 
    }
  };

  return (
    <div className="flex flex-col h-full w-full pointer-events-none relative z-30 border-none shadow-none">
      
      {/* MESSAGE LIST - Borderless Transparent Stream */}
      {!hideMessages && (
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pointer-events-auto hide-scrollbar mask-chat">
          {items.length === 0 ? (
            <div className="text-cyan-400/60 text-[11px] p-3 italic drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
              Welcome to the live stream chat! Say hello 👋
            </div>
          ) : (
            items.map((m) => {
              if (m.type === 'gift') {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500/25 via-pink-500/20 to-black/30 backdrop-blur-md px-3 py-1.5 rounded-2xl w-fit max-w-[92%] border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    <img 
                      src={m.avatar_url} 
                      className="w-6 h-6 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] flex-shrink-0" 
                      alt="" 
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-amber-300 uppercase tracking-wide truncate max-w-[90px]">
                          {m.user_name}
                        </span>
                        <span className="text-[9px] font-bold text-pink-300 uppercase">
                          sent {m.giftName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200">
                        <span>{m.icon}</span>
                        <span className="text-[9px] font-mono text-cyan-300">✨ {m.price} Coins</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // Regular Chat Bubble
              return (
                <div key={m.id} className="flex items-start gap-2 max-w-full">
                  <div className="w-6 h-6 rounded-full bg-transparent flex-shrink-0 overflow-hidden mt-0.5 border border-pink-500/50">
                    <img src={m.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                  </div>
                  <div className="flex flex-col bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-cyan-500/25 max-w-[88%] shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                    <span className="text-[10px] font-bold text-pink-400 mb-0.5 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]">
                      {m.user_name}
                    </span>
                    <span 
                      dir="ltr"
                      className="text-[13px] text-cyan-50 font-medium leading-snug break-words drop-shadow-[0_0_4px_rgba(6,182,212,0.5)] text-left"
                    >
                      {m.text}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* FIXED INPUT AREA - Eliminates any word illusion or letter reversal */}
      <div className="p-3 pointer-events-auto">
        <form onSubmit={sendMessage} className="relative flex items-center w-full">
          <input 
            type="text"
            dir="ltr"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a comment..."
            className="w-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-full py-2.5 pl-4 pr-12 text-[14px] text-white placeholder:text-zinc-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-[0_0_15px_rgba(0,0,0,0.6)] text-left font-normal"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="absolute right-1.5 w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white shadow-[0_0_12px_rgba(244,63,94,0.8)] hover:brightness-110 active:scale-90 transition-all disabled:opacity-40 disabled:shadow-none"
          >
            <Send size={13} fill="currentColor" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;
