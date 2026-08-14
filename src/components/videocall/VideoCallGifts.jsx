import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, Coins, Zap, Trophy, Crown, Heart, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CALL_GIFTS = [
  { id: 'rose', name: 'Neon Rose', price: 10, icon: '🌹', color: 'from-pink-500 to-rose-600' },
  { id: 'heart-fire', name: 'Heart Flame', price: 50, icon: '❤️‍🔥', color: 'from-orange-500 to-red-600' },
  { id: 'champagne', name: 'Celebration', price: 100, icon: '🍾', color: 'from-amber-400 to-yellow-600' },
  { id: 'diamond', name: 'Diamond Gem', price: 250, icon: '💎', color: 'from-cyan-400 to-blue-600' },
  { id: 'golden-crown', name: 'Royal Crown', price: 500, icon: '👑', color: 'from-amber-300 to-amber-600' },
  { id: 'rocket', name: 'Space Rocket', price: 1000, icon: '🚀', color: 'from-purple-500 to-indigo-600' },
  { id: 'universe-lion', name: 'Golden Lion', price: 2500, icon: '🦁', color: 'from-yellow-500 to-amber-700' },
  { id: 'mega-planet', name: 'Galaxy Orb', price: 5000, icon: '🪐', color: 'from-fuchsia-500 to-cyan-500' },
];

const VideoCallGifts = ({ 
  isOpen, 
  onClose, 
  onSendGift, 
  userCoins = 0 
}) => {
  const [selectedGift, setSelectedGift] = useState(CALL_GIFTS[0]);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedGift) return;
    setSending(true);

    // Trigger visual confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#ec4899', '#f59e0b', '#8b5cf6']
      });
    } catch (e) {
      console.warn("Confetti effect failed:", e);
    }

    onSendGift(selectedGift);
    setTimeout(() => {
      setSending(false);
      onClose();
    }, 400);
  };

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      className="absolute inset-x-0 bottom-0 z-40 bg-zinc-950/95 border-t border-white/15 backdrop-blur-2xl p-4 rounded-t-3xl shadow-2xl"
    >
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-pink-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Send In-Call Luxury Gift</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-black text-amber-400">
            <Coins size={13} />
            <span>{Number(userCoins).toLocaleString()} Coins</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Gifts Grid */}
      <div className="grid grid-cols-4 gap-2.5 my-4">
        {CALL_GIFTS.map((g) => {
          const isSelected = selectedGift?.id === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGift(g)}
              className={`relative p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected
                  ? 'bg-pink-500/20 border-pink-400 scale-105 shadow-lg shadow-pink-500/30'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{g.icon}</span>
              <span className="text-[10px] font-bold text-zinc-200 truncate w-full text-center">{g.name}</span>
              <span className="text-[10px] font-mono font-black text-amber-400 flex items-center gap-0.5">
                <Coins size={10} /> {g.price}
              </span>
            </button>
          );
        })}
      </div>

      {/* Send Gift Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending}
          className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-gradient-to-r ${
            selectedGift?.color || 'from-pink-500 to-rose-600'
          } text-white shadow-xl shadow-pink-500/25 transition-transform active:scale-98`}
        >
          <Sparkles size={16} />
          <span>Send {selectedGift?.name} ({selectedGift?.price} Coins)</span>
        </button>
      </div>
    </motion.div>
  );
};

export default VideoCallGifts;
