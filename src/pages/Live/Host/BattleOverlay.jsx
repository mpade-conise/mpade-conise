import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy } from 'lucide-react';

const BattleOverlay = ({ score }) => {
  const total = (score.host + score.challenger) || 1;
  const hostWidth = (score.host / total) * 100;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center pt-24 px-4">
      {/* Dynamic Battle Bar */}
      <div className="w-full max-w-md bg-black/40 backdrop-blur-md rounded-full h-6 border border-white/10 overflow-hidden flex shadow-2xl">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${hostWidth}%` }}
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center px-3"
        >
          <span className="text-[10px] font-black italic">{score.host}</span>
        </motion.div>
        <div className="flex-1 bg-gradient-to-l from-rose-500 to-purple-600 flex items-center justify-end px-3">
          <span className="text-[10px] font-black italic">{score.challenger}</span>
        </div>
      </div>
      
      {/* VS Badge */}
      <div className="bg-[#fe2c55] p-2 rounded-full -mt-3 shadow-lg border-2 border-white animate-bounce">
        <Swords size={16} className="text-white" />
      </div>

      {/* Real-time Indicator */}
      <div className="mt-4 bg-black/60 backdrop-blur-xl px-4 py-1 rounded-full border border-white/10">
        <p className="text-[10px] font-black uppercase tracking-[3px] text-white animate-pulse">
          Live Competition
        </p>
      </div>
    </div>
  );
};

export default BattleOverlay;
