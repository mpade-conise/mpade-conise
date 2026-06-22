import React from 'react';
import { ArrowLeft, Swords } from 'lucide-react';

const BattleController = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="p-4 bg-zinc-900 rounded-xl border border-white/5 text-center">
        <Swords size={28} className="text-red-400 mx-auto mb-2 animate-bounce" />
        <h4 className="text-xs font-bold uppercase tracking-wider mb-1">PK Matchmaking</h4>
        <p className="text-[11px] text-zinc-400 mb-4">Launch a 5-minute points race challenge against an active co-host.</p>
        <button className="w-full py-2 bg-gradient-to-r from-red-500 to-amber-500 text-white text-xs font-black rounded-lg shadow-lg">
          Match Opponent
        </button>
      </div>
    </div>
  );
};

export default BattleController;
