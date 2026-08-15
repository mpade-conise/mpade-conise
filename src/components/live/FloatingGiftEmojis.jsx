// src/components/live/FloatingGiftEmojis.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GIFT_EMOJIS_MAP = {
  rose: '🌹',
  heart: '💖',
  star: '⭐',
  fire: '🔥',
  weights: '💪',
  clap: '👏',
  pizza: '🍕',
  burger: '🍔',
  balloon: '🎈',
  spider: '🕷️',
  bunny: '🐰',
  diamond: '💎',
  default: '✨'
};

export const FloatingGiftEmojis = ({ activeSmallGift, onClear }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!activeSmallGift) return;

    const emoji = GIFT_EMOJIS_MAP[activeSmallGift.giftId] || activeSmallGift.icon || GIFT_EMOJIS_MAP.default;
    const count = Math.min(8, activeSmallGift.count || 4);

    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      emoji,
      sender: activeSmallGift.username || 'Supporter',
      startX: 15 + Math.random() * 70, // % from left
      driftX: (Math.random() - 0.5) * 80, // px drift
      scale: 0.8 + Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.0,
      delay: i * 0.15
    }));

    setParticles((prev) => [...prev.slice(-20), ...newParticles]);

    const timer = setTimeout(() => {
      onClear?.();
    }, 3500);

    return () => clearTimeout(timer);
  }, [activeSmallGift, onClear]);

  // Clean up completed particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles((prev) => prev.slice(4));
    }, 4000);
    return () => clearTimeout(timer);
  }, [particles]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ 
              opacity: 0, 
              scale: 0.3, 
              bottom: '10%', 
              left: `${p.startX}%`,
              x: 0
            }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0.3, p.scale, p.scale * 1.2, p.scale * 0.8], 
              bottom: '90%', 
              x: p.driftX,
              rotate: [0, p.driftX > 0 ? 20 : -20, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: p.duration, 
              delay: p.delay,
              ease: 'easeOut'
            }}
            className="absolute flex flex-col items-center select-none"
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_rgba(254,44,85,0.8)]">
              {p.emoji}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FloatingGiftEmojis;
