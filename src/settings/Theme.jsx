// src/pages/Live/Shared/BackgroundChanger.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Sparkles } from 'lucide-react';

const BackgroundChanger = ({ streamId, onBack, onSelectBackground }) => {
  const [selectedBg, setSelectedBg] = useState(() => {
    return localStorage.getItem(`mpade_bg_${streamId}`) || 'none';
  });

  const backgroundOptions = [
    {
      id: 'none',
      name: 'None (Passthrough)',
      className: 'bg-zinc-900 border-zinc-800',
      css: ''
    },
    {
      id: 'neon-stage',
      name: 'Neon Stage',
      className: 'bg-gradient-to-tr from-purple-950 to-indigo-900 border-purple-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(to top right, #2e1065, #0f172a) !important;
          background-image: linear-gradient(to top right, #2e1065, #0f172a) !important;
        }
      `
    },
    {
      id: 'blur-light',
      name: 'Minimal Blur',
      className: 'bg-zinc-800 border-zinc-700/50 backdrop-blur-sm',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: rgba(24, 24, 27, 0.75) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }
      `
    },
    {
      id: 'cyber-grid',
      name: 'Cyber Grid',
      className: 'bg-zinc-950 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] border-zinc-800',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background-color: #09090b !important;
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px) !important;
          background-size: 24px 24px !important;
        }
      `
    },
    /* 🔥 EXTRA NEON & GLOW DESIGNS 🔥 */
    {
      id: 'neon-pool',
      name: 'Neon Pool',
      className: 'bg-gradient-to-b from-cyan-950 via-slate-900 to-emerald-950 border-cyan-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: radial-gradient(circle at 50% 120%, rgba(6, 182, 212, 0.15), #020617 70%) !important;
          box-shadow: inset 0 -100px 150px -50px rgba(6, 182, 212, 0.3) !important;
        }
      `
    },
    {
      id: 'ai-neon-city',
      name: 'AI Neon City',
      className: 'bg-gradient-to-tr from-fuchsia-950 via-zinc-950 to-indigo-950 border-fuchsia-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(135deg, #090514 0%, #020205 100%) !important;
          background-image: radial-gradient(at 0% 0%, rgba(217, 70, 239, 0.12) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.15) 0px, transparent 50%) !important;
        }
      `
    },
    {
      id: 'synthwave-sunset',
      name: 'Synthwave Glow',
      className: 'bg-gradient-to-t from-pink-950 to-neutral-950 border-pink-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(to bottom, #030712, #111827, #31102f) !important;
          box-shadow: inset 0 -40px 100px rgba(236, 72, 153, 0.1) !important;
        }
      `
    },
    {
      id: 'matrix-matrix',
      name: 'Digital Matrix',
      className: 'bg-zinc-950 border-emerald-500/10',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background-color: #020617 !important;
          background-image: linear-gradient(rgba(16, 185, 129, 0.03) 2px, transparent 2px),
                            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 2px, transparent 2px) !important;
          background-size: 30px 30px !important;
        }
      `
    },
    /* 🎬 HIGH CONTRAST STUDIO FILTER MODELS 🎬 */
    {
      id: 'crimson-eclipse',
      name: 'Crimson Eclipse',
      className: 'bg-gradient-to-br from-rose-950 to-stone-950 border-rose-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: radial-gradient(circle at 50% 30%, #25030a 0%, #000000 80%) !important;
        }
      `
    },
    {
      id: 'toxic-radiation',
      name: 'Acid Neon',
      className: 'bg-gradient-to-tr from-lime-950 to-neutral-950 border-lime-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(135deg, #022c22 0%, #050505 100%) !important;
          box-shadow: inset 0 0 80px rgba(132, 204, 22, 0.05) !important;
        }
      `
    },
    {
      id: 'deep-ocean',
      name: 'Deep Abyss',
      className: 'bg-gradient-to-b from-blue-950 to-black border-blue-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(to bottom, #000a1f, #000000) !important;
        }
      `
    },
    {
      id: 'gold-lux',
      name: 'Liquid Gold',
      className: 'bg-gradient-to-r from-amber-950 to-zinc-950 border-amber-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.08), #09090b 60%) !important;
        }
      `
    },
    {
      id: 'obsidian-smooth',
      name: 'Pure Obsidian',
      className: 'bg-stone-950 border-stone-800',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: #050505 !important;
        }
      `
    },
    {
      id: 'violet-pulse',
      name: 'Violet Nebula',
      className: 'bg-gradient-to-tr from-violet-950 to-slate-950 border-violet-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.15), transparent 60%),
                      radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.1), transparent 60%) !important;
          background-color: #0c0a0f !important;
        }
      `
    },
    {
      id: 'magma-flow',
      name: 'Magma Core',
      className: 'bg-gradient-to-tr from-orange-950 via-stone-950 to-black border-orange-500/20',
      css: `
        body, .min-h-screen, .h-screen, [class*="bg-black"], [class*="bg-zinc"] {
          background: linear-gradient(to top left, #1c0a00, #000000 70%) !important;
          box-shadow: inset 0 0 100px rgba(249, 115, 22, 0.04) !important;
        }
      `
    }
  ];

  useEffect(() => {
    let styleElement = document.getElementById('mpade-live-dynamic-theme');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'mpade-live-dynamic-theme';
      document.head.appendChild(styleElement);
    }

    const activeConfig = backgroundOptions.find(b => b.id === selectedBg);
    if (activeConfig) {
      styleElement.innerHTML = activeConfig.css;
    }

    localStorage.setItem(`mpade_bg_${streamId}`, selectedBg);
  }, [selectedBg, streamId]);

  const handleSelect = (id) => {
    setSelectedBg(id);
    if (onSelectBackground) {
      onSelectBackground(id);
    }
  };

  return (
    <div className="space-y-4 text-white font-sans max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
      
      {/* Navigation Return Button */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group sticky top-0 bg-black/40 backdrop-blur-md py-1 z-10"
      >
        <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform" /> 
        Back to Menu
      </button>

      {/* Grid Selection Layout Container */}
      <div className="grid grid-cols-2 gap-2">
        {backgroundOptions.map((bg) => {
          const isActive = selectedBg === bg.id;

          return (
            <div
              key={bg.id}
              onClick={() => handleSelect(bg.id)}
              className={`aspect-video rounded-xl flex flex-col items-center justify-center p-3 text-center text-[10px] font-bold cursor-pointer border relative transition-all group overflow-hidden select-none ${bg.className} ${
                isActive 
                  ? 'border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10' 
                  : 'text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
            >
              {/* Decorative Subtle Icon Layer for Visual Depth */}
              <div className="absolute top-1.5 right-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                {bg.id === 'none' && <Image size={11} />}
                {bg.id !== 'none' && <Sparkles size={11} className={isActive ? "text-cyan-400" : "text-zinc-500"} />}
              </div>

              <span className="tracking-wide px-1">{bg.name}</span>

              {/* Mini Status Dot */}
              {isActive && (
                <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-glow" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundChanger;
