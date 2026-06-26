import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Sliders, Smile, User, Eye, Sun, Moon, Film, Zap, Maximize } from 'lucide-react';

const AIFilters = ({ streamId, onBack }) => {
  // Beauty & Reshaping Levels
  const [smoothing, setSmoothing] = useState(3);
  const [jawline, setJawline] = useState(0);
  const [eyeSize, setEyeSize] = useState(0);
  const [faceSlim, setFaceSlim] = useState(0);

  // Active Filter Selections
  const [activeLUT, setActiveLUT] = useState('none');
  const [activeFX, setActiveFX] = useState('none');

  // Unified global emitter matrix
  const updateStreamFX = (type, key, value) => {
    const filterEvent = new CustomEvent('mpade-video-filter', {
      detail: { type, key, value }
    });
    window.dispatchEvent(filterEvent);
  };

  const handleLUTToggle = (lutName) => {
    const nextLut = activeLUT === lutName ? 'none' : lutName;
    setActiveLUT(nextLut);
    updateStreamFX('lut', nextLut, null);
  };

  const handleFXToggle = (fxName) => {
    const nextFx = activeFX === fxName ? 'none' : fxName;
    setActiveFX(nextFx);
    updateStreamFX('fx', nextFx, null);
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto pr-1 custom-scrollbar">
      {/* HEADER NAVIGATION */}
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>

      {/* CATEGORY 1: AI FACE SHAPING & BEAUTY */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">AI Face Reshaping</p>
        
        {/* 1. SKIN SMOOTHING */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Sparkles size={13} className="text-amber-400" />
              <span>Skin Smoothing</span>
            </div>
            <span className="text-[10px] font-bold text-cyan-400">LVL {smoothing}</span>
          </div>
          <input type="range" min="0" max="5" value={smoothing} 
            onChange={(e) => { setSmoothing(e.target.value); updateStreamFX('morph', 'smoothing', e.target.value); }}
            className="w-full accent-cyan-400 bg-zinc-800 h-1 rounded" />
        </div>

        {/* 2. JAWLINE SLIMMER */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Smile size={13} className="text-purple-400" />
              <span>Jawline Sharpener</span>
            </div>
            <span className="text-[10px] font-bold text-purple-400">LVL {jawline}</span>
          </div>
          <input type="range" min="0" max="5" value={jawline} 
            onChange={(e) => { setJawline(e.target.value); updateStreamFX('morph', 'jawline', e.target.value); }}
            className="w-full accent-purple-400 bg-zinc-800 h-1 rounded" />
        </div>

        {/* 3. BIG EYES ENGINE */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Eye size={13} className="text-emerald-400" />
              <span>AI Eye Enlarger</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">LVL {eyeSize}</span>
          </div>
          <input type="range" min="0" max="5" value={eyeSize} 
            onChange={(e) => { setEyeSize(e.target.value); updateStreamFX('morph', 'eyes', e.target.value); }}
            className="w-full accent-emerald-400 bg-zinc-800 h-1 rounded" />
        </div>

        {/* 4. FACE SLIMMER */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <User size={13} className="text-blue-400" />
              <span>Oval Face Slimmer</span>
            </div>
            <span className="text-[10px] font-bold text-blue-400">LVL {faceSlim}</span>
          </div>
          <input type="range" min="0" max="5" value={faceSlim} 
            onChange={(e) => { setFaceSlim(e.target.value); updateStreamFX('morph', 'slim', e.target.value); }}
            className="w-full accent-blue-400 bg-zinc-800 h-1 rounded" />
        </div>
      </div>

      {/* CATEGORY 2: CINEMATIC COLOR LUTS (5 FILTERS) */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Cinematic grading (LUTs)</p>
        
        {/* 5. RETRO */}
        <button onClick={() => handleLUTToggle('retro')} className={`lut-btn ${activeLUT === 'retro' ? 'active-amber' : ''}`}>
          <div className="flex items-center gap-2"><Film size={13} /> <span>5. 1990s Retro Vintage</span></div>
          <span className="text-[9px] font-bold">{activeLUT === 'retro' ? 'ON' : 'OFF'}</span>
        </button>

        {/* 6. CYBERPUNK */}
        <button onClick={() => handleLUTToggle('cyberpunk')} className={`lut-btn ${activeLUT === 'cyberpunk' ? 'active-purple' : ''}`}>
          <div className="flex items-center gap-2"><Sliders size={13} /> <span>6. Cyberpunk Neon Dusk</span></div>
          <span className="text-[9px] font-bold">{activeLUT === 'cyberpunk' ? 'ON' : 'OFF'}</span>
        </button>

        {/* 7. MONOCHROME NOIR */}
        <button onClick={() => handleLUTToggle('noir')} className={`lut-btn ${activeLUT === 'noir' ? 'active-zinc' : ''}`}>
          <div className="flex items-center gap-2"><Moon size={13} /> <span>7. Deep Charcoal Noir</span></div>
          <span className="text-[9px] font-bold">{activeLUT === 'noir' ? 'ON' : 'OFF'}</span>
        </button>

        {/* 8. GOLDEN HOUR */}
        <button onClick={() => handleLUTToggle('golden')} className={`lut-btn ${activeLUT === 'golden' ? 'active-amber' : ''}`}>
          <div className="flex items-center gap-2"><Sun size={13} /> <span>8. Sunkissed Golden Hour</span></div>
          <span className="text-[9px] font-bold">{activeLUT === 'golden' ? 'ON' : 'OFF'}</span>
        </button>

        {/* 9. VIBRANT TROPIC */}
        <button onClick={() => handleLUTToggle('tropic')} className={`lut-btn ${activeLUT === 'tropic' ? 'active-emerald' : ''}`}>
          <div className="flex items-center gap-2"><Sparkles size={13} /> <span>9. Vibrant Tropic Flare</span></div>
          <span className="text-[9px] font-bold">{activeLUT === 'tropic' ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* CATEGORY 3: STYLIZED FX NODES (4 FILTERS) */}
      <div className="space-y-1.5 pb-4">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Stylized Render Shaders</p>

        {/* 10. VHS GLITCH */}
        <button onClick={() => handleFXToggle('vhs')} className={`lut-btn ${activeFX === 'vhs' ? 'active-cyan' : ''}`}>
          <div className="flex items-center gap-2"><Zap size={13} /> <span>10. Analog VHS Tape Tape</span></div>
          <span className="text-[9px] font-bold">{activeFX === 'vhs' ? 'ACTIVE' : 'OFF'}</span>
        </button>

        {/* 11. MANGA SKETCH */}
        <button onClick={() => handleFXToggle('manga')} className={`lut-btn ${activeFX === 'manga' ? 'active-zinc' : ''}`}>
          <div className="flex items-center gap-2"><Maximize size={13} /> <span>11. Comic Outline Ink</span></div>
          <span className="text-[9px] font-bold">{activeFX === 'manga' ? 'ACTIVE' : 'OFF'}</span>
        </button>

        {/* 12. THERMAL HEAT */}
        <button onClick={() => handleFXToggle('thermal')} className={`lut-btn ${activeFX === 'thermal' ? 'active-red' : ''}`}>
          <div className="flex items-center gap-2"><Sun size={13} /> <span>12. Infrared Vision Node</span></div>
          <span className="text-[9px] font-bold">{activeFX === 'thermal' ? 'ACTIVE' : 'OFF'}</span>
        </button>
      </div>

      {/* Embedded Component Isolation Styling */}
      <style>{`
        .lut-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 10px; border-radius: 10px; background-color: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.03); text-align: left; font-size: 11px; color: #d4d4d8;
          transition: all 0.15s ease-in-out;
        }
        .lut-btn:hover { background-color: rgba(255,255,255,0.07); color: #fff; }
        .active-amber { bg-color: rgba(245,158,11,0.1) !important; border-color: rgba(245,158,11,0.3) !important; color: #fbbf24 !important; }
        .active-purple { bg-color: rgba(168,85,247,0.1) !important; border-color: rgba(168,85,247,0.3) !important; color: #c084fc !important; }
        .active-emerald { bg-color: rgba(16,185,129,0.1) !important; border-color: rgba(16,185,129,0.3) !important; color: #34d399 !important; }
        .active-cyan { bg-color: rgba(6,182,212,0.1) !important; border-color: rgba(6,182,212,0.3) !important; color: #22d3ee !important; }
        .active-red { bg-color: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.3) !important; color: #f87171 !important; }
        .active-zinc { bg-color: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.2) !important; color: #ffffff !important; }
      `}</style>
    </div>
  );
};

export default AIFilters;
