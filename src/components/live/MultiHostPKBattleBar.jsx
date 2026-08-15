// src/components/live/MultiHostPKBattleBar.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Zap, Flame, Crown, Gift, Sparkles, X, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

const HOST_COLOR_PALETTES = [
  { gradient: 'from-blue-600 to-cyan-400', hex: '#00f3ff', border: 'border-cyan-400' },
  { gradient: 'from-rose-600 to-pink-500', hex: '#fe2c55', border: 'border-pink-500' },
  { gradient: 'from-purple-600 to-indigo-400', hex: '#a855f7', border: 'border-purple-400' },
  { gradient: 'from-amber-600 to-yellow-400', hex: '#f59e0b', border: 'border-amber-400' },
];

export const MultiHostPKBattleBar = ({
  isOpen = true,
  hosts = [
    { id: 'h1', username: 'Host 1', avatar: '', score: 1420 },
    { id: 'h2', username: 'Host 2', avatar: '', score: 980 },
  ],
  onClose,
  onSendBattleGift,
  isHost = false
}) => {
  const [battleTimeLeft, setBattleTimeLeft] = useState(180);
  const [isFrenzy, setIsFrenzy] = useState(false);
  const [winner, setWinner] = useState(null);
  const [localScores, setLocalScores] = useState(() => {
    return hosts.map(h => h.score || 0);
  });

  useEffect(() => {
    setLocalScores(hosts.map(h => h.score || 0));
  }, [hosts]);

  // Battle countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setBattleTimeLeft((prev) => {
        if (prev === 60) setIsFrenzy(true);
        if (prev <= 1) {
          clearInterval(timer);
          let highest = 0;
          let winIndex = 0;
          localScores.forEach((s, idx) => {
            if (s > highest) {
              highest = s;
              winIndex = idx;
            }
          });
          setWinner(hosts[winIndex]?.username || 'Champion');
          try {
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.5 },
              colors: ['#00f3ff', '#fe2c55', '#a855f7', '#ffd700']
            });
          } catch (e) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, localScores, hosts]);

  if (!isOpen) return null;

  // Calculate dynamic proportional widths for 2, 3, or 4 hosts
  const totalScore = localScores.reduce((a, b) => a + b, 0) || 1;
  const minPercent = Math.floor(100 / (hosts.length * 3)); // Minimum visibility width
  
  const rawPercentages = localScores.map(score => {
    return Math.max(minPercent, (score / totalScore) * 100);
  });
  
  const rawSum = rawPercentages.reduce((a, b) => a + b, 0);
  const normalizedPercentages = rawPercentages.map(p => (p / rawSum) * 100);

  return (
    <div className="w-full max-w-xl mx-auto pointer-events-auto bg-black/85 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl p-3 shadow-[0_0_35px_rgba(0,0,0,0.9)] select-none">
      {/* Header bar: Timer, Frenzy tag, Swords */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Swords size={16} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            PK Battle Arena ({hosts.length} Hosts)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFrenzy && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-[9px] font-black text-white uppercase animate-bounce shadow-[0_0_10px_rgba(244,63,94,0.8)]">
              🔥 2X FRENZY!
            </span>
          )}
          <div className="px-2.5 py-0.5 rounded-full bg-[#121224] border border-white/10 text-xs font-mono font-bold text-white shadow-inner">
            ⏱️ {Math.floor(battleTimeLeft / 60)}:{(battleTimeLeft % 60).toString().padStart(2, '0')}
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Multi-Segment Progressive Tug-of-War Bar */}
      <div className="relative h-7 rounded-2xl bg-zinc-900/90 overflow-hidden flex border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
        {hosts.map((host, idx) => {
          const palette = HOST_COLOR_PALETTES[idx % HOST_COLOR_PALETTES.length];
          const pct = normalizedPercentages[idx] || (100 / hosts.length);
          const score = localScores[idx] || 0;

          return (
            <motion.div
              key={host.id || idx}
              initial={{ width: `${100 / hosts.length}%` }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 14 }}
              className={`h-full bg-gradient-to-r ${palette.gradient} flex items-center justify-between px-2.5 relative border-r last:border-r-0 border-black/30`}
            >
              <span className="text-[10px] font-black font-mono text-black truncate max-w-[70px] drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]">
                {host.username}
              </span>
              <span className="text-[11px] font-black font-mono text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {score.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Winner Splash Alert */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2.5 p-2 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 flex items-center justify-center gap-2 text-center"
        >
          <Crown size={16} className="text-amber-400 animate-bounce" />
          <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
            🎉 {winner} Wins the Battle!
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default MultiHostPKBattleBar;
