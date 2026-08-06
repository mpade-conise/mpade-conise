// src/components/upload/Module04_AIAssistant.jsx
import React, { useState } from 'react';
import { Sparkles, Wand2, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

const Module04_AIAssistant = ({ formData, updateField, onNext, onPrev }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = () => {
    setIsGenerating(true);

    // Simulated AI Processing trigger
    setTimeout(() => {
      const generatedCaption = "Creating future-ready digital experiences! 🚀 #Mpade #Tech #Innovation";
      const generatedHashtags = ["Mpade", "SocialTech", "NeonVibes", "WebDev", "Viral"];
      
      updateField('caption', generatedCaption);
      updateField('hashtags', generatedHashtags);
      updateField('aiSuggestions', {
        caption: generatedCaption,
        hashtags: generatedHashtags,
        seoKeywords: ["mpade", "neon theme", "react", "social network"],
      });

      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]" size={22} />
          <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            AI ASSISTANT
          </h2>
        </div>
        <p className="text-xs text-cyan-200/60 mt-1">
          Auto-generate captions, trending tags, and boost reach
        </p>
      </div>

      {/* Main AI Card */}
      <div className="flex-1 my-6 bg-zinc-950/80 rounded-3xl p-6 flex flex-col justify-between border-none relative overflow-hidden">
        {/* Glow accent element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#fe2c55]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">
              Generated Preview
            </span>
            {formData.aiSuggestions.caption && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                <CheckCircle2 size={12} /> Ready
              </span>
            )}
          </div>

          <div className="min-h-[100px] p-4 bg-zinc-900/60 rounded-2xl text-xs text-cyan-100 font-normal leading-relaxed drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
            {formData.aiSuggestions.caption || (
              <span className="text-zinc-600 italic">
                Click generate to auto-create engaging captions and optimal hashtags...
              </span>
            )}
          </div>

          {/* Hashtag Pills */}
          {formData.aiSuggestions.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.aiSuggestions.hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Generate Trigger Button */}
        <button
          onClick={handleGenerateAI}
          disabled={isGenerating}
          className="w-full mt-4 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-[#fe2c55] shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(254,44,85,0.7)] active:scale-95 transition-all flex items-center justify-center gap-2 border-none disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Wand2 size={16} />
          )}
          {isGenerating ? 'Generating Magic...' : 'Generate Magic Caption'}
        </button>
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
          Next: Details →
        </button>
      </div>
    </div>
  );
};

export default Module04_AIAssistant;
