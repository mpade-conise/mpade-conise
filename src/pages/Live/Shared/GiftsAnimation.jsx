import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const GiftsAnimation = ({ streamId }) => {
  const [activeGift, setActiveGift] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel(`gifts-${streamId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_gifts', 
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        triggerAnimation(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [streamId]);

  const triggerAnimation = (gift) => {
    setActiveGift(gift);
    // Clear the animation after 3 seconds
    setTimeout(() => setActiveGift(null), 3000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <AnimatePresence>
        {activeGift && (
          <motion.div 
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1.2, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -100 }}
            className="flex flex-col items-center"
          >
            {/* Massive Emoji with Neon Glow */}
            <div className="text-8xl drop-shadow-[0_0_30px_rgba(254,44,85,0.8)] mb-4">
              {activeGift.gift_id === 'rose' ? '🌹' : 
               activeGift.gift_id === 'crown' ? '👑' : '🔥'}
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
              <p className="text-white font-black uppercase italic tracking-tighter">
                {activeGift.sender_name || 'Fan'} sent a {activeGift.gift_id}!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GiftsAnimation;