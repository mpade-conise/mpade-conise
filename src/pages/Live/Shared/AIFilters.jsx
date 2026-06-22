import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

const AIFilters = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs font-medium">Beautify Filter</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-500">LVL 4/5</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 opacity-50">
          <span className="text-xs font-medium">Cinematic Retro LUT</span>
          <span className="text-[10px] font-bold text-zinc-600">OFF</span>
        </div>
      </div>
    </div>
  );
};

export default AIFilters;
