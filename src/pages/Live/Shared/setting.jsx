import React from 'react';
import { X, Sliders, Shield, Volume2, Video } from 'lucide-react';

/**
 * SettingsPanel - Production Safe Deployment Configuration
 * @param {string} streamId - The active live room unique identifier
 * @param {object} streamData - Supabase stream metadata payload
 * @param {function} onClose - React state callback to toggle panel drawer visibility
 */
const SettingsPanel = ({ streamId, streamData, onClose }) => {
  
  // 1. DEPLOYMENT GUARD: Prevent crash if component mounts before stream data resolves from database
  const streamTitle = streamData?.title || "Mpade Live Session";
  const streamCategory = streamData?.category || "General";
  
  // 2. HARDWARE CHECK GUARD: Safe execution block for media environments (e.g., SSR or non-media systems)
  const handleDeviceRequery = () => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          console.log("🚀 Production Hardware Sync verified:", devices.length);
        })
        .catch((err) => console.warn("⚠️ Media device access deferred:", err));
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-zinc-950 text-white select-none">
      
      {/* PANEL HEADER */}
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-200">Stream Settings</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* METADATA PREVIEW BLOCK */}
        <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 mb-4">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Active Room Instance</p>
          <p className="text-xs font-semibold truncate text-cyan-400">{streamId || "No Stream ID linked"}</p>
          <p className="text-[11px] text-zinc-300 mt-2 truncate font-medium">Title: <span className="text-white font-normal">{streamTitle}</span></p>
          <p className="text-[11px] text-zinc-300 truncate font-medium">Category: <span className="text-white font-normal">{streamCategory}</span></p>
        </div>

        {/* HARDWARE TOGGLE SECTIONS (MOCK / EXPANDABLE UI DOCK) */}
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">Hardware & Quality</p>
          
          <button 
            onClick={handleDeviceRequery}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-left"
          >
            <div className="flex items-center gap-2.5">
              <Video size={14} className="text-zinc-400" />
              <span className="text-xs font-medium">Refresh Source Inputs</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded font-bold text-zinc-400 uppercase">Auto</span>
          </button>

          <div className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2.5">
              <Volume2 size={14} className="text-zinc-400" />
              <span className="text-xs font-medium">Audio Noise Suppression</span>
            </div>
            <div className="w-7 h-4 bg-cyan-500 rounded-full p-0.5 cursor-pointer flex justify-end">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SYSTEM VERSION */}
      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
        <div className="flex items-center gap-1">
          <Shield size={10} />
          <span>Secure Matrix</span>
        </div>
        <span>v1.0.4-PROD</span>
      </div>

    </div>
  );
};

export default SettingsPanel;
