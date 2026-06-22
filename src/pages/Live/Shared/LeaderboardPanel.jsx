import React from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';

const LeaderboardPanel = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 flex items-center gap-3">
        <BarChart3 size={20} className="text-cyan-400" />
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase">Hourly Trend Node</p>
          <p className="text-xs font-bold text-white">Ranked #14 in Region</p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPanel;
