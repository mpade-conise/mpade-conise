// src/pages/Live/Shared/AIVoiceEffects.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, AudioLines, Sparkles } from 'lucide-react';
import liveVoiceEngine from '../../../components/live/LiveVoiceEngine';

const AIVoiceEffects = ({ streamId, onBack, onSelectEffect }) => {
  const [selectedFx, setSelectedFx] = useState(() => {
    return localStorage.getItem(`mpade_voice_fx_${streamId}`) || 'studio';
  });

  const voiceProfiles = [
    { id: 'studio', name: 'Studio Pure', desc: 'Real-time vocal cleanup, presence and compression' },
    { id: 'bass', name: 'Deep Bass Monster', desc: 'Real low-end voice enhancement with warmth and compression' },
    { id: 'robot', name: 'Robot Network', desc: 'Real ring modulation plus band-pass filtering and distortion' },
    { id: 'helium', name: 'Helium Echo', desc: 'Real upward pitch shift with a short echo' },
    { id: 'autotune-major', name: 'AI Pitch Lift', desc: 'Real-time upward pitch transformation with vocal tightening' },
    { id: 'stadium', name: 'Arena Echo', desc: 'Real spacious delay and resonance for a stadium-style voice' },
    { id: 'radio-1930', name: 'Vintage AM Radio', desc: 'Real telephone-style bandwidth limiting and saturation' },
    { id: 'cyberpunk-glitch', name: 'Cyber Overdrive', desc: 'Real distortion and ring modulation for a synthetic voice' },
    { id: 'whisper-synth', name: 'Ghostly Whisper', desc: 'Real high-pass air shaping with echo texture' },
    { id: 'chipmunk', name: 'Squeak Velocity', desc: 'Real upward pitch shift for a high cartoon-like voice' },
    { id: 'space-captain', name: 'Cosmic Walkie-Talkie', desc: 'Real radio band-pass, saturation and short delay' },
    { id: 'demon-lord', name: 'Underworld Dread', desc: 'Real downward pitch shift with bass and distortion' },
    { id: 'telephone', name: 'Legacy Landline', desc: 'Real narrow telephone bandwidth and saturation' },
    { id: 'choir-ensemble', name: 'Synth Harmony', desc: 'Real tremolo and delay for a synthetic layered texture' },
    { id: 'reverse-texture', name: 'Dream Matrix Shift', desc: 'Real ring modulation and regenerative delay texture' }
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
    liveVoiceEngine.setPreset(id);
    if (onSelectEffect) {
      const selectedProfile = voiceProfiles.find(v => v.id === id);
      onSelectEffect(id, selectedProfile); 
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
                    REAL DSP
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
