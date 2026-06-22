import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Sliders } from 'lucide-react';

const AIFilters = ({ streamId, onBack }) => {
  const [beautifyLevel, setBeautifyLevel] = useState(3);
  const [activeLUT, setActiveLUT] = useState('none');

  // Broadcasts filter modifications immediately to the local video wrapper element
  const updateStreamFX = (type, value) => {
    const filterEvent = new CustomEvent('mpade-video-filter', {
      detail: { type, value }
    });
    window.dispatchEvent(filterEvent);
  };

  const handleBeautifyChange = (e) => {
    const level = parseInt(e.target.value);
    setBeautifyLevel(level);
    updateStreamFX('beautify', level);
  };

  const toggleLUT = (lutName) => {
    const newLut = activeLUT === lutName ? 'none' : lutName;
    setActiveLUT(newLut);
    updateStreamFX('lut', newLut);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>

      <div className="space-y-3">
        {/* BEAUTIFY CONFIGURATION */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-medium">AI Skin Smoothing</span>
            </div>
            <span className="text-[10px] font-bold text-cyan-400">LVL {beautifyLevel}/5</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="5" 
            value={beautifyLevel} 
            onChange={handleBeautifyChange}
            className="w-full accent-cyan-400 bg-zinc-800 h-1 rounded-lg cursor-pointer" 
          />
        </div>

        {/* LUT COLOR FILTERS */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Cinematic LUTs</p>
          
          <button 
            onClick={() => toggleLUT('retro')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
              activeLUT === 'retro' 
                ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                : 'bg-white/5 border-white/5 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders size={14} />
              <span className="text-xs font-medium">1990s Retro Film</span>
            </div>
            <span className="text-[10px] uppercase font-bold">{activeLUT === 'retro' ? 'Active' : 'Off'}</span>
          </button>

          <button 
            onClick={() => toggleLUT('cyberpunk')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
              activeLUT === 'cyberpunk' 
                ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                : 'bg-white/5 border-white/5 text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders size={14} />
              <span className="text-xs font-medium">Cyberpunk Neon</span>
            </div>
            <span className="text-[10px] uppercase font-bold">{activeLUT === 'cyberpunk' ? 'Active' : 'Off'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIFilters;
