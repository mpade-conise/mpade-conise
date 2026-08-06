// src/components/upload/Module08_AdvancedSettings.jsx
import React from 'react';
import { Calendar, Cpu, ShieldCheck, Save, Clock } from 'lucide-react';

const Module08_AdvancedSettings = ({ formData, updateField, onNext, onPrev }) => {
  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
          ADVANCED SETTINGS
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Encoding quality, publishing schedules, and copyrights
        </p>
      </div>

      <div className="flex-1 my-4 space-y-4 overflow-y-auto hide-scrollbar pr-1">
        
        {/* Quality and Encoding Mode */}
        <div className="p-4 rounded-3xl bg-zinc-950/70 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-widest">
            <Cpu size={16} />
            <span>Upload Encoding</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateField('compressQuality', 'original')}
              className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all border-none ${
                formData.compressQuality === 'original'
                  ? 'bg-cyan-500/20 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-zinc-900/60 text-zinc-500'
              }`}
            >
              Original Ultra Quality
            </button>
            <button
              onClick={() => updateField('compressQuality', 'ai_compressed')}
              className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all border-none ${
                formData.compressQuality === 'ai_compressed'
                  ? 'bg-[#fe2c55]/20 text-pink-400 drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]'
                  : 'bg-zinc-900/60 text-zinc-500'
              }`}
            >
              Smart AI Compression
            </button>
          </div>
        </div>

        {/* Schedule Post */}
        <div className="p-4 rounded-3xl bg-zinc-950/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Calendar size={16} />
              <span>Schedule Release</span>
            </div>
            <Clock size={14} className="text-zinc-500" />
          </div>

          <input
            type="datetime-local"
            value={formData.scheduleTime || ''}
            onChange={(e) => updateField('scheduleTime', e.target.value)}
            className="w-full bg-zinc-900/80 border-none rounded-2xl py-2.5 px-4 text-xs text-cyan-100 focus:outline-none"
          />
        </div>

        {/* Automated Guard Checks */}
        <div className="p-4 rounded-3xl bg-zinc-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-cyan-400 drop-shadow-[0_0_8px_#06b6d4]" />
            <div>
              <h4 className="text-xs font-bold text-white">Run AI Copyright & Safety Scan</h4>
              <p className="text-[10px] text-zinc-500">Verifies audio rights and content safety</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex gap-4">
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
          Next: Publish Review →
        </button>
      </div>
    </div>
  );
};

export default Module08_AdvancedSettings;
