import React from 'react';
import { ArrowLeft, Radio } from 'lucide-react';

const GuestManager = ({ streamId, onBack }) => {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 text-center py-6">
        <Radio size={24} className="text-zinc-600 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-semibold text-zinc-300">Guest Queue is Empty</p>
        <p className="text-[10px] text-zinc-500 mt-1">Viewer requests to join audio/video will appear here.</p>
      </div>
    </div>
  );
};

export default GuestManager;
