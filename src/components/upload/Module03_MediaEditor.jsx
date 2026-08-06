// src/components/upload/Module03_MediaEditor.jsx
import React from 'react';
import { 
  Sliders, RotateCw, Sun, Scissors, Volume2, 
  Sparkles, Check, ChevronLeft 
} from 'lucide-react';

const FILTERS = [
  { id: 'none', label: 'Normal' },
  { id: 'neon-cyan', label: 'Cyan Glow' },
  { id: 'neon-[#fe2c55]', label: 'Pink Pulse' },
  { id: 'vintage', label: 'Cyberpunk' },
  { id: 'bw', label: 'Monochrome' },
];

const Module03_MediaEditor = ({ mediaFiles, edits, updateEdits, onNext, onPrev }) => {
  const activeMedia = mediaFiles[0]; // Edits primary file

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]">
          MEDIA EDITOR
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Tune your media with neon filters and controls
        </p>
      </div>

      {/* Main Preview Box */}
      <div className="relative w-full aspect-video sm:aspect-square max-h-[260px] my-4 rounded-3xl overflow-hidden bg-zinc-950 flex items-center justify-center">
        {activeMedia?.type === 'video' ? (
          <video
            src={activeMedia.url}
            className="w-full h-full object-contain"
            controls
            style={{
              filter: `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturation(${edits.saturation}%)`,
            }}
          />
        ) : (
          <img
            src={activeMedia?.url}
            alt="Edit preview"
            className="w-full h-full object-contain transition-all duration-200"
            style={{
              filter: `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturation(${edits.saturation}%)`,
            }}
          />
        )}
      </div>

      {/* Editing Controls */}
      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-4 px-1">
        
        {/* Filter Selector */}
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 mb-2 block">
            Neon Presets
          </span>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => updateEdits('filter', f.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border-none ${
                  edits.filter === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Area */}
        <div className="space-y-3 bg-zinc-900/40 p-4 rounded-3xl backdrop-blur-md">
          {/* Brightness */}
          <div className="flex items-center gap-3">
            <Sun size={16} className="text-pink-400" />
            <input
              type="range"
              min="50"
              max="150"
              value={edits.brightness}
              onChange={(e) => updateEdits('brightness', Number(e.target.value))}
              className="w-full accent-[#fe2c55] cursor-pointer"
            />
            <span className="text-[10px] text-zinc-400 w-8 font-mono">{edits.brightness}%</span>
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-3">
            <Sliders size={16} className="text-cyan-400" />
            <input
              type="range"
              min="50"
              max="150"
              value={edits.contrast}
              onChange={(e) => updateEdits('contrast', Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-400 w-8 font-mono">{edits.contrast}%</span>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={onPrev}
          className="w-1/3 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-all border-none"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="w-2/3 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white bg-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.6)] hover:shadow-[0_0_25px_rgba(254,44,85,0.9)] active:scale-95 transition-all border-none"
        >
          Next: AI Assistant →
        </button>
      </div>
    </div>
  );
};

export default Module03_MediaEditor;
