// src/components/upload/Module05_CaptionHashtags.jsx
import React, { useState } from 'react';
import { Hash, MapPin, UserPlus, Smile, Sparkles } from 'lucide-react';

const SUGGESTED_TAGS = ['Viral', 'Mpade', 'Tech', 'Music', 'Trending', 'NeonVibes'];

const Module05_CaptionHashtags = ({ formData, updateField, onNext, onPrev }) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddHashtag = (tag) => {
    const cleanTag = tag.replace(/#/g, '').trim();
    if (!cleanTag) return;
    if (!formData.hashtags.includes(cleanTag)) {
      updateField('hashtags', [...formData.hashtags, cleanTag]);
    }
    setTagInput('');
  };

  const removeHashtag = (tagToRemove) => {
    updateField(
      'hashtags',
      formData.hashtags.filter((t) => t !== tagToRemove)
    );
  };

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]">
          POST DETAILS
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Add captions, trending tags, and tag location
        </p>
      </div>

      <div className="flex-1 my-4 space-y-4 overflow-y-auto hide-scrollbar pr-1">
        
        {/* Caption Text Input */}
        <div className="relative">
          <textarea
            rows={4}
            value={formData.caption}
            onChange={(e) => updateField('caption', e.target.value)}
            placeholder="Write a caption..."
            maxLength={2200}
            className="w-full bg-zinc-950/70 rounded-2xl p-4 text-xs text-cyan-50 placeholder:text-zinc-600 focus:outline-none resize-none shadow-none border-none drop-shadow-[0_0_6px_rgba(6,182,212,0.2)]"
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-zinc-500 font-mono">
            {formData.caption.length}/2200
          </div>
        </div>

        {/* Hashtags Input & Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-zinc-950/70 rounded-full px-4 py-2">
            <Hash size={14} className="text-pink-400" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag(tagInput))}
              placeholder="Add hashtag and press Enter..."
              className="w-full bg-transparent text-xs text-cyan-100 focus:outline-none border-none shadow-none placeholder:text-zinc-600"
            />
          </div>

          {/* Active Hashtags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {formData.hashtags.map((tag, idx) => (
              <span
                key={idx}
                onClick={() => removeHashtag(tag)}
                className="cursor-pointer text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-full drop-shadow-[0_0_6px_rgba(6,182,212,0.5)] hover:bg-[#fe2c55]/20 hover:text-pink-400 transition-all"
              >
                #{tag} ×
              </span>
            ))}
          </div>

          {/* Quick Add Trending Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase whitespace-nowrap">Suggested:</span>
            {SUGGESTED_TAGS.map((stag) => (
              <button
                key={stag}
                onClick={() => handleAddHashtag(stag)}
                className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full hover:text-white transition-all border-none"
              >
                +{stag}
              </button>
            ))}
          </div>
        </div>

        {/* Location & Tag People Shortcuts */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => updateField('location', formData.location ? null : 'Blantyre, Malawi')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold transition-all border-none ${
              formData.location
                ? 'bg-cyan-500/20 text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : 'bg-zinc-950/70 text-zinc-400 hover:text-white'
            }`}
          >
            <MapPin size={14} className={formData.location ? 'text-cyan-400' : ''} />
            <span className="truncate">{formData.location || 'Add Location'}</span>
          </button>

          <button
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-zinc-950/70 text-zinc-400 hover:text-white transition-all border-none"
          >
            <UserPlus size={14} className="text-pink-400" />
            <span>Tag People</span>
          </button>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex gap-4 mt-2">
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
          Next: Privacy →
        </button>
      </div>
    </div>
  );
};

export default Module05_CaptionHashtags;
