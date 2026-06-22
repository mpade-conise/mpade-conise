import React from 'react';
import { ArrowLeft, Image } from 'lucide-react';

const BackgroundChanger = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="grid grid-cols-2 gap-2">
        <div className="aspect-video bg-zinc-900 border-2 border-cyan-500 rounded-lg flex items-center justify-center text-[10px] text-cyan-400 font-bold cursor-pointer">
          None (Passthrough)
        </div>
        <div className="aspect-video bg-gradient-to-tr from-purple-900 to-indigo-900 rounded-lg flex items-center justify-center text-[10px] text-zinc-500 font-medium hover:border-white/20 border border-transparent cursor-pointer">
          Neon Stage
        </div>
        <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] text-zinc-500 font-medium hover:border-white/20 border border-transparent cursor-pointer">
          Minimal Blur
        </div>
      </div>
    </div>
  );
};

export default BackgroundChanger;
