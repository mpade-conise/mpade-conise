// src/pages/Live/Shared/AIVoiceEffects.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, AudioLines } from 'lucide-react';

const AIVoiceEffects = ({ streamId, onBack, onSelectEffect }) => {
  const [selectedFx, setSelectedFx] = useState(() => {
    return localStorage.getItem(`mpade_voice_fx_${streamId}`) || 'studio';
  });

  // Explicit, audibly distinct base processing target frequencies (Hz) for the DSP matrix
  const voiceProfiles = [
    { id: 'studio', name: 'Studio Pure', frequency: 1000, desc: 'Crystal clear vocal enhancement centered at 1.0 kHz' },
    { id: 'bass', name: 'Deep Bass Monster', frequency: 120, desc: 'Sub-harmonic sub-bass voice modulation at 120 Hz' },
    { id: 'robot', name: 'Robot Network', frequency: 440, desc: 'Metallic ring modulation centered at 440 Hz' },
    { id: 'helium', name: 'Helium Echo', frequency: 2500, desc: 'High-frequency pitch multiplier scaled at 2.5 kHz' },
    { id: 'autotune-major', name: 'AI Pitch Correct', frequency: 800, desc: 'Chromatic pitch tracking optimized at 800 Hz' },
    { id: 'stadium', name: 'Arena Echo Arena', frequency: 350, desc: 'Spacious hall resonance tuned around 350 Hz' },
    { id: 'radio-1930', name: 'Vintage AM Radio', frequency: 3000, desc: 'High bandpass crunch filter peaking at 3.0 kHz' },
    { id: 'cyberpunk-glitch', name: 'Cyber Overdrive', frequency: 1500, desc: 'Bitcrushed phase distortion tracking at 1.5 kHz' },
    { id: 'whisper-synth', name: 'Ghostly Whisper', frequency: 7000, desc: 'Ethereal air-noise excitation tracking at 7.0 kHz' },
    { id: 'chipmunk', name: 'Squeak Velocity', frequency: 4000, desc: 'Ultra high-frequency pitch shifting peaking at 4.0 kHz' },
    { id: 'space-captain', name: 'Cosmic Walkie-Talkie', frequency: 2200, desc: 'Radio communications filter bandpassing at 2.2 kHz' },
    { id: 'demon-lord', name: 'Underworld Dread', frequency: 90, desc: 'Heavy dark-matter resonance drops down to 90 Hz' },
    { id: 'telephone', name: 'Legacy Landline', frequency: 1800, desc: 'Narrow bandwidth vocal filter limited to 1.8 kHz' },
    { id: 'choir-ensemble', name: 'Synth Harmony', frequency: 600, desc: 'Multi-voice chord oscillator modulating around 600 Hz' },
    { id: 'reverse-texture', name: 'Dream Matrix Shift', frequency: 1200, desc: 'Psychedelic phase delays shifting patterns at 1.2 kHz' }
  ];

  useEffect(() => {
    // 1. Update the local context storage ledger
    localStorage.setItem(`mpade_voice_fx_${streamId}`, selectedFx);

    const activeProfile = voiceProfiles.find(v => v.id === selectedFx);
    
    // 2. Assign configuration to the global window context layer instantly
    if (activeProfile) {
      window.mpadeActiveVoiceDSP = {
        id: selectedFx,
        frequency: activeProfile.frequency,
        streamId: streamId
      };

      // 3. Fire a high-priority browser event that any active stream pipeline can catch
      const dspEvent = new CustomEvent('mpade_voice_change', {
        detail: { 
          id: selectedFx, 
          frequency: activeProfile.frequency, 
          streamId: streamId 
        }
      });
      window.dispatchEvent(dspEvent);
    }
  }, [selectedFx, streamId]);

  const handleEffectSelect = (id) => {
    setSelectedFx(id);
    if (onSelectEffect) {
      const selectedProfile = voiceProfiles.find(v => v.id === id);
      onSelectEffect(id, selectedProfile?.frequency); 
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wide">{fx.name}</span>
                  <span className="text-[8px] font-mono opacity-50 px-1 bg-zinc-800 rounded text-zinc-400">
                    {fx.frequency >= 1000 ? `${(fx.frequency / 1000).toFixed(1)}kHz` : `${fx.frequency}Hz`}
                  </span>
                </div>
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
