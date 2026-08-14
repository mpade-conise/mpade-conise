import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Sliders, Check, Sun, Eye, Flame, Moon, Wand2 } from 'lucide-react';

export const VIDEO_FILTERS = [
  { id: 'normal', name: 'Original', filter: 'none', icon: '✨' },
  { id: 'studio-glow', name: 'Studio Glow', filter: 'brightness(1.08) contrast(1.05) saturate(1.15)', icon: '💡' },
  { id: 'warm-sunset', name: 'Golden Hour', filter: 'sepia(0.2) saturate(1.3) contrast(1.05) hue-rotate(-10deg)', icon: '🌅' },
  { id: 'cyber-neon', name: 'Cyberpunk', filter: 'contrast(1.25) saturate(1.4) hue-rotate(15deg)', icon: '🔮' },
  { id: 'noir', name: 'B&W Crisp', filter: 'grayscale(1) contrast(1.35) brightness(1.05)', icon: '🎬' },
  { id: 'vibrant-4k', name: 'Vibrant 4K', filter: 'contrast(1.15) saturate(1.35) brightness(1.02)', icon: '🌈' },
  { id: 'soft-portrait', name: 'Soft Portrait', filter: 'brightness(1.05) blur(0.2px) contrast(0.98)', icon: '🌸' },
  { id: 'cinematic-teal', name: 'Teal & Orange', filter: 'contrast(1.15) hue-rotate(185deg) saturate(1.2) sepia(0.15)', icon: '🎞️' },
];

export const VIRTUAL_BACKDROPS = [
  { id: 'none', name: 'Natural Room', bg: 'none' },
  { id: 'blur-soft', name: 'Soft Bokeh Blur', bg: 'backdrop-blur-md bg-black/20' },
  { id: 'blur-heavy', name: 'Deep Studio Blur', bg: 'backdrop-blur-2xl bg-black/40' },
  { id: 'cyber-stage', name: 'Neon Cyber Grid', bg: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/60 via-purple-950/70 to-black' },
  { id: 'luxury-penthouse', name: 'Executive Suite', bg: 'bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-950/40 via-zinc-900/80 to-black' },
  { id: 'deep-space', name: 'Cosmic Nebula', bg: 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/60 via-slate-950 to-black' }
];

const VideoCallFilters = ({ 
  isOpen, 
  onClose, 
  activeFilter, 
  onSelectFilter, 
  activeBackdrop, 
  onSelectBackdrop,
  beautyGlow,
  onToggleBeautyGlow
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      className="absolute inset-x-0 bottom-0 z-40 bg-zinc-950/95 border-t border-white/15 backdrop-blur-2xl p-4 rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto no-scrollbar"
    >
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">AI Studio Looks & Backdrops</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* AI Beauty & Skin Smooth Toggle */}
      <div className="my-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">AI Studio Beauty Glow</p>
            <p className="text-[10px] text-zinc-400">Skin softening & facial lighting boost</p>
          </div>
        </div>
        <button
          onClick={onToggleBeautyGlow}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
            beautyGlow ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'bg-white/10 text-zinc-300 hover:bg-white/15'
          }`}
        >
          {beautyGlow ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Color Grading & Video Filter Presets */}
      <div className="my-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Video Color Presets</p>
        <div className="grid grid-cols-4 gap-2">
          {VIDEO_FILTERS.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFilter(f.id)}
                className={`p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{f.icon}</span>
                <span className="text-[10px] font-semibold text-center leading-tight truncate w-full">{f.name}</span>
                {isSelected && <Check size={12} className="text-cyan-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Virtual Backdrops */}
      <div className="mt-4 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Virtual Stage & Ambient Lighting</p>
        <div className="grid grid-cols-3 gap-2">
          {VIRTUAL_BACKDROPS.map((b) => {
            const isSelected = activeBackdrop === b.id;
            return (
              <button
                key={b.id}
                onClick={() => onSelectBackdrop(b.id)}
                className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between h-16 transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                <span className="text-[11px] font-bold leading-tight">{b.name}</span>
                {isSelected ? (
                  <span className="text-[9px] font-bold text-cyan-400 flex items-center gap-1">
                    <Check size={10} /> Active
                  </span>
                ) : (
                  <span className="text-[9px] text-zinc-500">Preset</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default VideoCallFilters;
