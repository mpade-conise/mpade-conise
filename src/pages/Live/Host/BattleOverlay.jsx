import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, User } from 'lucide-react';

const BattleOverlay = ({ score, hostProfile, coHost }) => {
  const total = (score.host + score.challenger) || 1;
  const hostWidth = (score.host / total) * 100;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center pt-24 px-4 select-none">
      
      {/* MATCHED PROFILES HEADER */}
      <div className="w-full max-w-md flex justify-between items-center mb-2 px-1">
        {/* HOST INFO */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md py-1 px-3 rounded-full border border-white/5">
          <img 
            src={hostProfile?.avatar_url || 'https://via.placeholder.com/150'} 
            className="w-5 h-5 rounded-full border border-blue-400 object-cover" 
            alt="" 
          />
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-200 max-w-[80px] truncate">
            {hostProfile?.username || 'Host'}
          </span>
        </div>

        {/* CO-HOST / OPPONENT INFO */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md py-1 px-3 rounded-full border border-white/5">
          <AnimatePresence mode="wait">
            {coHost ? (
              <motion.div 
                key="active-opponent"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-200 max-w-[80px] truncate">
                  {coHost.username || 'Opponent'}
                </span>
                <img 
                  src={coHost.avatar_url || 'https://via.placeholder.com/150'} 
                  className="w-5 h-5 rounded-full border border-rose-500 object-cover" 
                  alt="" 
                />
              </motion.div>
            ) : (
              <motion.div 
                key="waiting-opponent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 text-rose-400 italic"
              >
                <span className="text-[9px] font-bold uppercase tracking-tight animate-pulse">Waiting for co-host...</span>
                <User size={12} className="animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DYNAMIC BATTLE PROGRESS BAR */}
      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-md rounded-full h-7 border border-white/10 overflow-hidden flex shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
        {/* Host Side (Blue) */}
        <motion.div 
          initial={{ width: '50%' }}
          animate={{ width: `${hostWidth}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 flex items-center px-4 justify-start relative shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)]"
        >
          <span className="text-xs font-black italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score.host}
          </span>
        </motion.div>
        
        {/* Challenger Side (Rose/Purple) */}
        <div className="flex-1 bg-gradient-to-l from-rose-600 to-purple-600 flex items-center justify-end px-4 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.2)]">
          <span className="text-xs font-black italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score.challenger}
          </span>
        </div>
      </div>
      
      {/* VS SWORDS BADGE */}
      <div className="bg-gradient-to-b from-rose-500 to-red-600 p-2 rounded-full -mt-3.5 shadow-[0_4px_15px_rgba(239,68,68,0.5)] border-2 border-white z-10">
        <Swords size={14} className="text-white" />
      </div>

      {/* MATCH MATCH METADATA INDICATOR */}
      <div className="mt-4 bg-black/60 backdrop-blur-xl px-4 py-1 rounded-full border border-white/10 shadow-lg">
        <p className="text-[9px] font-black uppercase tracking-[3px] text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
          {coHost ? "LIVE COMPETITION" : "ROOM OPEN FOR CHALLENGE"}
        </p>
      </div>
    </div>
  );
};

export default BattleOverlay;
