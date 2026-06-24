// src/pages/Live/Shared/BackgroundChanger.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Image, Sparkles } from 'lucide-react';

const BackgroundChanger = ({ streamId, onBack, onSelectBackground }) => {
  // Sync initial state from localStorage if available to keep state persistent
  const [selectedBg, setSelectedBg] = useState(() => {
    return localStorage.getItem(`mpade_bg_${streamId}`) || 'none';
  });

  const backgroundOptions = [
    {
      id: 'none',
      name: 'None (Passthrough)',
      className: 'bg-zinc-900 border-zinc-800',
      styles: { background: '', backgroundImage: '' }
    },
    {
      id: 'neon-stage',
      name: 'Neon Stage',
      className: 'bg-gradient-to-tr from-purple-950 to-indigo-900 border-purple-500/20',
      styles: { background: 'linear-gradient(to top right, #3b0764, #1e1b4b)' }
    },
    {
      id: 'blur-light',
      name: 'Minimal Blur',
      className: 'bg-zinc-800 border-zinc-700/50 backdrop-blur-sm',
      styles: { backdropFilter: 'blur(8px)', background: 'rgba(39, 39, 42, 0.4)' }
    },
    {
      id: 'cyber-grid',
      name: 'Cyber Grid',
      className: 'bg-zinc-950 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] border-zinc-800',
      styles: {
        background: '#09090b',
        backgroundImage: 'linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }
    }
  ];

  // Side effect that applies visual characteristics directly to the DOM matrix
  useEffect(() => {
    const activeConfig = backgroundOptions.find(b => b.id === selectedBg);
    
    // Strategy A: Find any deep dashboard stream panels or video canvas wrappers dynamically
    const streamPanels = document.querySelectorAll('.min-h-screen, .h-screen, video, [class*="dashboard"]');
    
    // Strategy B: Inject directly via document body or root fallback variables 
    if (activeConfig) {
      if (selectedBg === 'none') {
        document.body.style.background = '';
        document.body.style.backgroundImage = '';
        document.body.style.backdropFilter = '';
      } else {
        Object.assign(document.body.style, activeConfig.styles);
      }
    }

    // Save selection context
    localStorage.setItem(`mpade_bg_${streamId}`, selectedBg);
  }, [selectedBg, streamId]);

  const handleSelect = (id) => {
    setSelectedBg(id);
    if (onSelectBackground) {
      onSelectBackground(id); // Pipelines choice to upper video matrix if supported
    }
  };

  return (
    <div className="space-y-4 text-white font-sans">
      
      {/* Navigation Return Button */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group"
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

              <span className="tracking-wide">{bg.name}</span>

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
