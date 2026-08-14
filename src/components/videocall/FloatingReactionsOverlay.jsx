import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, Sparkles, Smile, Plus, Volume2, VolumeX, X } from 'lucide-react';

export const REACTION_PRESETS = [
  {
    id: 'heart',
    emoji: '❤️',
    name: 'Hearts',
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
    glow: 'rgba(244,63,94,0.5)',
    particles: ['❤️', '💖', '💕', '💗', '💓', '💘']
  },
  {
    id: 'fire',
    emoji: '🔥',
    name: 'Fire',
    icon: Flame,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(249,115,22,0.5)',
    particles: ['🔥', '💥', '⚡', '🌟', '✨', '🧨']
  },
  {
    id: 'sparkles',
    emoji: '✨',
    name: 'Sparkles',
    icon: Sparkles,
    color: 'from-yellow-400 to-amber-300',
    glow: 'rgba(250,204,21,0.5)',
    particles: ['✨', '⭐', '🌟', '💫', '🪄', '💎']
  },
  {
    id: 'party',
    emoji: '🎉',
    name: 'Celebration',
    icon: Smile,
    color: 'from-purple-500 to-pink-500',
    glow: 'rgba(168,85,247,0.5)',
    particles: ['🎉', '🎊', '🥳', '🎈', '🍾', '🎁']
  },
  {
    id: 'clap',
    emoji: '👏',
    name: 'Applause',
    color: 'from-blue-400 to-cyan-500',
    glow: 'rgba(56,189,248,0.5)',
    particles: ['👏', '🙌', '💯', '🦾', '🔥', '👑']
  },
  {
    id: 'love',
    emoji: '😍',
    name: 'Love Eyes',
    color: 'from-pink-500 to-rose-600',
    glow: 'rgba(236,72,153,0.5)',
    particles: ['😍', '🥰', '😘', '❤️', '🌹', '✨']
  },
  {
    id: 'rocket',
    emoji: '🚀',
    name: 'Rocket',
    color: 'from-cyan-400 to-blue-600',
    glow: 'rgba(6,182,212,0.5)',
    particles: ['🚀', '💨', '🪐', '🌌', '✨', '⚡']
  },
  {
    id: 'hundred',
    emoji: '💯',
    name: '100%',
    color: 'from-red-500 to-orange-500',
    glow: 'rgba(239,68,68,0.5)',
    particles: ['💯', '🔥', '👑', '🏆', '🎯', '⚡']
  }
];

export const EXTRA_EMOJIS = [
  '😂', '🤩', '😮', '😇', '😎', '💃', '🕺', '🦄', '🌈', '🍕', '🍻', '🥂', '⚡', '💎', '🌸', '👑', '🕊️', '🏆'
];

// Audio chime generator using Web Audio API
const playReactionChime = (type = 'sparkles') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const freqs = {
      heart: [523.25, 659.25], // C5 -> E5
      fire: [440.00, 554.37],  // A4 -> C#5
      sparkles: [783.99, 1046.50], // G5 -> C6
      party: [587.33, 880.00],
      default: [659.25, 783.99]
    };

    const notePair = freqs[type] || freqs.default;
    osc.frequency.setValueAtTime(notePair[0], now);
    osc.frequency.exponentialRampToValueAtTime(notePair[1], now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // Graceful fallback if audio context is blocked
  }
};

const FloatingReactionsOverlay = ({
  onTriggerReaction,
  externalReactions = [],
  peerName = 'User',
  soundEnabled = true
}) => {
  const [activeParticles, setActiveParticles] = useState([]);
  const [comboCount, setComboCount] = useState(0);
  const [lastEmoji, setLastEmoji] = useState(null);
  const [showExtendedPicker, setShowExtendedPicker] = useState(false);
  const [latestSenderToast, setLatestSenderToast] = useState(null);
  const comboTimerRef = useRef(null);

  // Trigger burst handler
  const triggerBurst = useCallback((emoji, senderName = 'You', isRemote = false) => {
    if (soundEnabled) {
      const presetMatch = REACTION_PRESETS.find(p => p.emoji === emoji || p.particles.includes(emoji));
      playReactionChime(presetMatch?.id || 'sparkles');
    }

    // Handle Combo Meter
    setComboCount(prev => {
      const next = prev + 1;
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setComboCount(0);
        setLastEmoji(null);
      }, 1800);
      return next;
    });
    setLastEmoji(emoji);

    // Show Sender Notification Pill if remote
    if (isRemote && senderName) {
      setLatestSenderToast({ emoji, senderName, id: Date.now() });
      setTimeout(() => setLatestSenderToast(null), 2500);
    }

    // Spawn 8-14 floating animated particles
    const preset = REACTION_PRESETS.find(p => p.emoji === emoji || p.particles.includes(emoji));
    const particleList = preset ? preset.particles : [emoji, emoji, '✨', '💖', emoji];
    const particleCount = 8 + Math.min(comboCount * 2, 8); // Scaled by combo
    
    const newParticles = Array.from({ length: particleCount }).map((_, i) => {
      const startX = 15 + Math.random() * 70; // 15% to 85% width
      const sway1 = (Math.random() - 0.5) * 60;
      const sway2 = (Math.random() - 0.5) * 80;
      const size = 26 + Math.random() * 24; // 26px to 50px
      const duration = 2.0 + Math.random() * 1.4; // 2s to 3.4s
      const delay = i * 0.05 + Math.random() * 0.1;
      const chosenEmoji = particleList[Math.floor(Math.random() * particleList.length)] || emoji;

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
        emoji: chosenEmoji,
        startX,
        sway1,
        sway2,
        size,
        duration,
        delay,
        rotate: (Math.random() - 0.5) * 50
      };
    });

    setActiveParticles(prev => [...prev, ...newParticles]);

    // Clean up particles when finished
    setTimeout(() => {
      const idsToRemove = new Set(newParticles.map(p => p.id));
      setActiveParticles(prev => prev.filter(p => !idsToRemove.has(p.id)));
    }, 4000);

    // If local click, notify parent for WebRTC socket broadcast
    if (!isRemote && onTriggerReaction) {
      onTriggerReaction(emoji);
    }
  }, [comboCount, onTriggerReaction, soundEnabled]);

  // Listen to incoming remote reaction bursts from parent component
  useEffect(() => {
    if (externalReactions && externalReactions.length > 0) {
      const latest = externalReactions[externalReactions.length - 1];
      if (latest && !latest._processed) {
        latest._processed = true;
        triggerBurst(latest.emoji, latest.senderName || peerName, true);
      }
    }
  }, [externalReactions, peerName, triggerBurst]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      
      {/* 1. Floating Animated Emoji Particles Over Video Stream */}
      <AnimatePresence>
        {activeParticles.map(p => (
          <motion.div
            key={p.id}
            initial={{
              x: `${p.startX}%`,
              y: '105%',
              opacity: 0,
              scale: 0.3,
              rotate: 0
            }}
            animate={{
              x: [`${p.startX}%`, `${p.startX + p.sway1 / 10}%`, `${p.startX + p.sway2 / 10}%`, `${p.startX + (p.sway1 * 0.5) / 10}%`],
              y: '-20%',
              opacity: [0, 1, 1, 0.9, 0],
              scale: [0.3, 1.4, 1.2, 0.9],
              rotate: [0, p.rotate, -p.rotate * 0.5, p.rotate]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            style={{
              fontSize: `${p.size}px`,
              filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(255,255,255,0.4))'
            }}
            className="absolute bottom-0 will-change-transform z-40"
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 2. Rapid-Fire Combo Burst Multiplier Indicator */}
      <AnimatePresence>
        {comboCount > 1 && lastEmoji && (
          <motion.div
            key={`combo-${comboCount}`}
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: [0.8, 1.3, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="absolute bottom-24 right-6 bg-gradient-to-r from-pink-600 to-amber-500 px-3 py-1.5 rounded-2xl border border-white/20 shadow-[0_0_25px_rgba(236,72,153,0.6)] flex items-center gap-2 pointer-events-none z-50"
          >
            <span className="text-xl animate-bounce">{lastEmoji}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">COMBO</span>
              <span className="text-sm font-black text-amber-200 font-mono tracking-tight">x{comboCount}!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Remote Participant Reaction Toast Pill */}
      <AnimatePresence>
        {latestSenderToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-pink-500/40 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 pointer-events-none z-50"
          >
            <span className="text-lg animate-pulse">{latestSenderToast.emoji}</span>
            <span className="text-xs font-bold text-zinc-200">
              <span className="text-cyan-400">@{latestSenderToast.senderName}</span> sent a reaction!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Interactive Floating Reaction Dock (Docked neatly on video) */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto flex flex-col gap-2">
        {/* Main Quick Reactions Tray */}
        <div className="flex items-center gap-1 bg-black/60 hover:bg-black/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/15 shadow-2xl transition-all">
          {REACTION_PRESETS.slice(0, 4).map(preset => (
            <motion.button
              key={preset.id}
              type="button"
              whileHover={{ scale: 1.25, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => triggerBurst(preset.emoji, 'You', false)}
              title={`Send ${preset.name} Burst (${preset.emoji})`}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-base relative group"
            >
              <span>{preset.emoji}</span>
              {/* Tooltip */}
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-black/90 text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {preset.name}
              </span>
            </motion.button>
          ))}

          {/* Expand More Emojis Button */}
          <button
            type="button"
            onClick={() => setShowExtendedPicker(!showExtendedPicker)}
            title="More Reactions & Emojis"
            className={`p-1.5 rounded-xl transition-all ${
              showExtendedPicker 
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30' 
                : 'hover:bg-white/20 text-zinc-300'
            }`}
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Extended Emoji Picker Popup */}
        <AnimatePresence>
          {showExtendedPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -10 }}
              className="bg-zinc-950/95 border border-white/20 backdrop-blur-2xl p-2.5 rounded-2xl shadow-2xl w-60 z-50 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <Sparkles size={11} /> Reaction Bursts
                </span>
                <button
                  type="button"
                  onClick={() => setShowExtendedPicker(false)}
                  className="text-zinc-400 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Extended Presets Grid */}
              <div className="grid grid-cols-4 gap-1">
                {REACTION_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      triggerBurst(preset.emoji, 'You', false);
                    }}
                    className="p-1.5 hover:bg-white/15 rounded-xl flex flex-col items-center gap-0.5 transition-transform active:scale-95 text-center group"
                  >
                    <span className="text-lg group-hover:scale-125 transition-transform">{preset.emoji}</span>
                    <span className="text-[8px] text-zinc-400 group-hover:text-cyan-300 font-medium truncate w-full">{preset.name}</span>
                  </button>
                ))}
              </div>

              {/* Extra Emoji Grid */}
              <div className="border-t border-white/10 pt-1.5">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Expressive Emojis</p>
                <div className="grid grid-cols-6 gap-1">
                  {EXTRA_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerBurst(emoji, 'You', false);
                      }}
                      className="p-1 hover:bg-white/20 rounded-lg text-base transition-transform hover:scale-130 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default FloatingReactionsOverlay;
