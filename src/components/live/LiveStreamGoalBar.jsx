// src/components/live/LiveStreamGoalBar.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Trophy, Settings, ChevronRight, Check } from 'lucide-react';

export const DEFAULT_GOALS = [
  { id: 'lion', name: 'Majestic Lion', icon: '🦁', price: 5000, target: 5, current: 2, color: '#f59e0b' },
  { id: 'galaxy', name: 'Cosmic Galaxy', icon: '🌌', price: 8000, target: 3, current: 1, color: '#8b5cf6' },
  { id: 'rose', name: 'Neon Rose', icon: '🌹', price: 1, target: 500, current: 342, color: '#fe2c55' },
  { id: 'dragon', name: 'Cyber Dragon', icon: '🐉', price: 10000, target: 2, current: 0, color: '#06b6d4' },
];

export const LiveStreamGoalBar = ({ 
  isHost = false, 
  goals = DEFAULT_GOALS, 
  onUpdateGoals,
  streamId
}) => {
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [activeGoals, setActiveGoals] = useState(() => {
    const saved = localStorage.getItem(`mpade_goals_${streamId}`);
    return saved ? JSON.parse(saved) : goals;
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Auto-cycle between prioritized goals every 6 seconds
  useEffect(() => {
    if (!activeGoals || activeGoals.length === 0) return;
    const interval = setInterval(() => {
      setCurrentGoalIndex((prev) => (prev + 1) % activeGoals.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeGoals]);

  // Synchronize when external goals prop updates
  useEffect(() => {
    if (goals && goals.length > 0) {
      setActiveGoals(goals);
    }
  }, [goals]);

  const currentGoal = activeGoals[currentGoalIndex] || activeGoals[0];
  if (!currentGoal) return null;

  const progressPercent = Math.min(100, Math.round((currentGoal.current / (currentGoal.target || 1)) * 100));
  const remaining = Math.max(0, currentGoal.target - currentGoal.current);

  const toggleGoalActive = (goalId) => {
    const updated = activeGoals.map(g => {
      if (g.id === goalId) {
        return { ...g, active: g.active === false ? true : false };
      }
      return g;
    });
    setActiveGoals(updated);
    localStorage.setItem(`mpade_goals_${streamId}`, JSON.stringify(updated));
    onUpdateGoals?.(updated);
  };

  return (
    <>
      <div className="relative group w-fit max-w-[260px] sm:max-w-[300px]">
        {/* Animated Cyber Glowing Backing */}
        <div 
          className="absolute -inset-0.5 rounded-2xl blur-sm opacity-50 transition-opacity group-hover:opacity-100 animate-pulse"
          style={{ background: `linear-gradient(90deg, ${currentGoal.color || '#06b6d4'}, #ec4899)` }}
        />

        {/* Main Goal Bar Pill */}
        <div className="relative bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2.5 overflow-hidden">
          {/* Goal Icon with Ring */}
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-lg border relative"
            style={{ 
              backgroundColor: `${currentGoal.color}20`,
              borderColor: currentGoal.color 
            }}
          >
            <span className="filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              {currentGoal.icon}
            </span>
          </div>

          {/* Goal Progress Details with Slide-fade Cycling */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentGoal.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-0.5"
              >
                {/* Title & Numbers */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider truncate text-zinc-200">
                    {currentGoal.name}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-cyan-300">
                    {currentGoal.current}/{currentGoal.target}
                  </span>
                </div>

                {/* Cyber Progress Bar */}
                <div className="w-full h-1.5 bg-zinc-800/90 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    className="h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundColor: currentGoal.color || '#06b6d4'
                    }}
                  />
                </div>

                {/* Dynamic Remaining Counter */}
                <div className="flex items-center justify-between text-[8px] font-bold text-zinc-400">
                  <span className="text-zinc-400">
                    {remaining === 0 ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Sparkles size={8} /> Goal Achieved!
                      </span>
                    ) : (
                      <span><b className="text-white">{remaining}</b> more to reach goal</span>
                    )}
                  </span>
                  <span className="text-[8px] font-mono text-cyan-400/80">
                    {progressPercent}%
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Host Setup Trigger */}
          {isHost && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Prioritize Live Goals"
            >
              <Settings size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Host Goal Customizer Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#0a0a14] border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.3)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Prioritize Live Stream Goals
                  </span>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="w-6 h-6 rounded-full bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Prioritized goals will smoothly rotate on the live stream every few seconds, displaying progress to all viewers.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeGoals.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-2xl bg-zinc-900/70 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{g.name}</div>
                        <div className="text-[9px] font-mono text-cyan-400">
                          Target: {g.target} ({g.price} coins)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleGoalActive(g.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                        g.active !== false
                          ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      <Check size={10} /> Active
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all"
              >
                Save & Broadcast Goals
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveStreamGoalBar;
