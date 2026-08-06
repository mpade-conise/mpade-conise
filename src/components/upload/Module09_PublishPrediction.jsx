// src/components/upload/Module09_PublishPrediction.jsx
import React, { useState } from 'react';
import { Sparkles, Rocket, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Module09_PublishPrediction = ({ formData, onPrev, onComplete }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePublish = async () => {
    setIsPublishing(true);
    setProgress(20);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Session expired. Please sign in again.");

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 200);

      // INSERT into 'videos' table matching your actual database schema
      const { data, error } = await supabase
        .from('videos')
        .insert([
          {
            user_id: user.id,
            video_url: formData.videoUrl || formData.fileUrl || '',
            caption: formData.caption || '',
            music_name: formData.selectedMusic?.name || 'Original Audio',
            music_url: formData.selectedMusic?.url || null,
            is_private: formData.audience === 'private',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setTimeout(() => {
        setIsPublishing(false);
        if (onComplete) onComplete(data);
      }, 400);

    } catch (err) {
      console.error("❌ [UPLOAD ERROR]:", err);
      setIsPublishing(false);
      alert(`Failed to publish: ${err.message || 'Check console details'}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div>
        <h2 className="text-xl font-black tracking-wide text-white drop-shadow-[0_0_8px_rgba(254,44,85,0.6)]">
          REVIEW & PUBLISH
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">
          Predicted reach score and final confirmation
        </p>
      </div>

      <div className="flex-1 my-4 space-y-4 overflow-y-auto hide-scrollbar pr-1">
        
        {/* Prediction Card */}
        <div className="p-5 rounded-3xl bg-zinc-950/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400 drop-shadow-[0_0_8px_#06b6d4]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Predicted Reach
              </span>
            </div>
            <span className="text-xs font-black text-pink-400 drop-shadow-[0_0_6px_rgba(254,44,85,0.8)]">
              High Potential (92%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-zinc-900/60 p-3 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Estimated Views</span>
              <span className="text-sm font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
                12.5K – 28K
              </span>
            </div>
            <div className="bg-zinc-900/60 p-3 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Best Time</span>
              <span className="text-sm font-black text-pink-400 drop-shadow-[0_0_6px_rgba(254,44,85,0.6)]">
                7:30 PM
              </span>
            </div>
          </div>
        </div>

        {/* Post Summary Overview */}
        <div className="p-4 rounded-3xl bg-zinc-950/60 space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Summary Details
          </span>
          <div className="text-xs text-cyan-100 line-clamp-2">
            <span className="font-bold text-pink-400">Caption: </span>
            {formData?.caption || 'No caption added.'}
          </div>
          <div className="text-xs text-cyan-100">
            <span className="font-bold text-cyan-400">Audio: </span>
            {formData?.selectedMusic?.name || 'Original Audio'}
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isPublishing && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold text-cyan-300">
              <span>Publishing Content...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-[#fe2c55] h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={isPublishing}
          className="w-1/3 py-4 rounded-full font-bold text-xs uppercase tracking-wider text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-all border-none disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="w-2/3 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white bg-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.6)] hover:shadow-[0_0_25px_rgba(254,44,85,0.9)] active:scale-95 transition-all flex items-center justify-center gap-2 border-none disabled:opacity-50"
        >
          {isPublishing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Rocket size={16} fill="white" />
          )}
          {isPublishing ? 'Publishing...' : 'Publish Post Now'}
        </button>
      </div>
    </div>
  );
};

export default Module09_PublishPrediction;
