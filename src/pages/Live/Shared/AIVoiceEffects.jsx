import React from 'react';
import { ArrowLeft, Mic } from 'lucide-react';

const AIVoiceEffects = ({ streamId, onBack }) => {
  const profiles = ['Studio Pure', 'Deep Bass Monster', 'Robot Network', 'Helium Echo'];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="space-y-1.5">
        {profiles.map((fx, idx) => (
          <button key={idx} className={`w-full p-3 rounded-xl text-left text-xs font-medium flex items-center justify-between border transition-all ${
            idx === 0 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/5 text-zinc-400'
          }`}>
            <span>{fx}</span>
            <Mic size={12} className={idx === 0 ? 'text-cyan-400' : 'text-zinc-600'} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIVoiceEffects;
