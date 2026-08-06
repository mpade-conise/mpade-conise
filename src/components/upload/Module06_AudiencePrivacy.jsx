// src/components/upload/Module06_AudiencePrivacy.jsx
import React from 'react';
import { Globe, Users, Lock, Star, MessageSquare, Download, EyeOff } from 'lucide-react';

const AUDIENCES = [
  { id: 'public', label: 'Everyone (Public)', icon: Globe, desc: 'Anyone on Mpade can view' },
  { id: 'friends', label: 'Friends Only', icon: Users, desc: 'Only mutual friends' },
  { id: 'subscribers', label: 'Subscribers', icon: Star, desc: 'Paid tier supporters' },
  { id: 'private', label: 'Only Me', icon: Lock, desc: 'Visible only to you' },
];

const Module06_AudiencePrivacy = ({ formData, updateField, onNext, onPrev }) => {
  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
          AUDIENCE & PRIVACY
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Control who can view and interact with your post
        </p>
      </div>

      <div className="flex-1 my-4 space-y-4 overflow-y-auto hide-scrollbar pr-1">
        {/* Audience Selector */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">
            Who can watch this?
          </span>
          <div className="space-y-2">
            {AUDIENCES.map((item) => {
              const Icon = item.icon;
              const isSelected = formData.audience === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => updateField('audience', item.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border-none ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isSelected ? 'text-cyan-400' : 'text-zinc-500'} />
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[10px] text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-zinc-700'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interaction Toggles */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
            Interactions
          </span>

          {/* Allow Downloads */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60">
            <div className="flex items-center gap-3">
              <Download size={16} className="text-pink-400" />
              <span className="text-xs font-bold text-white">Allow Video Downloads</span>
            </div>
            <input
              type="checkbox"
              checked={formData.allowDownloads}
              onChange={(e) => updateField('allowDownloads', e.target.checked)}
              className="accent-[#fe2c55] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Hide Likes */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60">
            <div className="flex items-center gap-3">
              <EyeOff size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">Hide Like Count</span>
            </div>
            <input
              type="checkbox"
              checked={formData.hideLikes}
              onChange={(e) => updateField('hideLikes', e.target.checked)}
              className="accent-cyan-400 w-4 h-4 cursor-pointer"
            />
          </div>
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
          Next: Monetization →
        </button>
      </div>
    </div>
  );
};

export default Module06_AudiencePrivacy;
