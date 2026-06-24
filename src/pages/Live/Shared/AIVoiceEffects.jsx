// src/pages/Live/Shared/AIVoiceEffects.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, AudioLines } from 'lucide-react';

const AIVoiceEffects = ({ streamId, onBack, onSelectEffect }) => {
  // Sync state with localStorage to allow dashboard audio hooks to consume choices seamlessly
  const [selectedFx, setSelectedFx] = useState(() => {
    return localStorage.getItem(`mpade_voice_fx_${streamId}`) || 'studio';
  });

  const voiceProfiles = [
    { id: 'studio', name: 'Studio Pure', desc: 'Crystal clear, compressed room tone and vocal enhancement' },
    { id: 'bass', name: 'Deep Bass Monster', desc: 'Pitch lowered sub-harmonic node for deep resonant vocal presence' },
    { id: 'robot', name: 'Robot Network', desc: 'Ring-modulated metallic cybernetic synthesis' },
    { id: 'helium', name: 'Helium Echo', desc: 'High pitch multiplier with rapid acoustic delay loop' },
    
    /* 🔥 11 NEW EXTRA VOICE EFFECT PROFILES 🔥 */
    { id: 'autotune-major', name: 'AI Pitch Correct', desc: 'Real-time chromatic scale snapping and auto-tuning' },
    { id: 'stadium', name: 'Arena Echo Arena', desc: 'Massive acoustic hall model with slow decay reverb trails' },
    { id: 'radio-1930', name: 'Vintage AM Radio', desc: 'High bandpass audio filter with authentic crackle layer' },
    { id: 'cyberpunk-glitch', name: 'Cyber Overdrive', desc: 'Slight bitcrushed distortion with robotic glitch intervals' },
    { id: 'whisper-synth', name: 'Ghostly Whisper', desc: 'High-frequency harmonic exciter with ethereal noise trails' },
    { id: 'chipmunk', name: 'Squeak Velocity', desc: 'Maximum format shifting up for localized high-frequency pitch' },
    { id: 'space-captain', name: 'Cosmic Walkie-Talkie', desc: 'Astronaut comms emulation with periodic static beeps' },
    { id: 'demon-lord', name: 'Underworld Dread', desc: 'Dual-pitch shifting engine combining sub-bass with distortion' },
    { id: 'telephone', name: 'Legacy Landline', desc: 'Tight mid-range telephone telephone acoustics' },
    { id: 'choir-ensemble', name: 'Synth Harmony', desc: 'Multi-voice pitch chorus simulating backing vocals' },
    { id: 'reverse-texture', name: 'Dream Matrix Shift', desc: 'Psychedelic sub-delay phase reversing audio elements' }
  ];

  useEffect(() => {
    // Write choice directly into the local data layer context cache
    localStorage.setItem(`mpade_voice_fx_${streamId}`, selectedFx);
  }, [selectedFx, streamId]);

  const handleEffectSelect = (id) => {
    setSelectedFx(id);
    if (onSelectEffect) {
      onSelectEffect(id); // Pipelines the DSP profile identifier up if connected via props
    }
  };

  return (
    <div className="space-y-4 text-white font-sans max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
      
      {/* Navigation Return Link Control */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group sticky top-0 bg-black/40 backdrop-blur-md py-1 z-10"
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
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/5'
                  : 'bg-zinc-900/40 border-white/[0.03] hover:bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex flex-col gap-0.5 truncate pr-4">
                <span className="text-xs font-bold tracking-wide">{fx.name}</span>
                <span className="text-[10px] text-zinc-500 font-normal whitespace-normal line-clamp-1 group-hover:text-zinc-400 transition-colors">
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
