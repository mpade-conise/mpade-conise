// src/pages/Live/Shared/AIVoiceEffects.jsx
import React, { useState } from 'react';
import { ArrowLeft, Mic, AudioLines } from 'lucide-react';

const AIVoiceEffects = ({ streamId, onBack, onSelectEffect }) => {
  // Manage state tracking for active audio DSP filter configuration
  const [selectedFx, setSelectedFx] = useState('studio');

  const voiceProfiles = [
    { id: 'studio', name: 'Studio Pure', desc: 'Crystal clear, compressed room tone' },
    { id: 'bass', name: 'Deep Bass Monster', desc: 'Pitch lowered sub-harmonic node' },
    { id: 'robot', name: 'Robot Network', desc: 'Ring-modulated metallic synthesis' },
    { id: 'helium', name: 'Helium Echo', desc: 'High pitch multiplier with delay loop' },
  ];

  const handleEffectSelect = (id) => {
    setSelectedFx(id);
    if (onSelectEffect) {
      onSelectEffect(id); // Pipelines the DSP profile identifier up to the audio context
    }
  };

  return (
    <div className="space-y-4 text-white font-sans">
      
      {/* Navigation Return Link Control */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group"
      >
        <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform" /> 
        Back to Menu
      </button>

      {/* Vertical Interactive Effects Stack */}
      <div className="space-y-1.5">
        {voiceProfiles.map((fx) => {
          const isActive = selectedFx === fx.id;

          return (
            <button
              key={fx.id}
              onClick={() => handleEffectSelect(fx.id)}
              className={`w-full p-3 rounded-xl text-left flex items-center justify-between border transition-all group relative overflow-hidden ${
                isActive
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-zinc-900/40 border-white/[0.03] hover:bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex flex-col gap-0.5 truncate pr-4">
                <span className="text-xs font-bold tracking-wide">{fx.name}</span>
                <span className="text-[10px] text-zinc-500 font-normal truncate group-hover:text-zinc-400 transition-colors">
                  {fx.desc}
                </span>
              </div>

              <div className="flex items-center justify-center shrink-0">
                {isActive ? (
                  <AudioLines size={14} className="text-cyan-400 animate-pulse" />
                ) : (
                  <Mic size={13} className="text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AIVoiceEffects;
