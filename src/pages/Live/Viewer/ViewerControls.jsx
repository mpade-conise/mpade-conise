import React, { useState } from 'react';
import { 
  Heart, Share2, ShieldAlert, 
  Maximize, Volume2, VolumeX 
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const ViewerControls = ({ streamId }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // 1. Handle Real-time Likes
  const handleLike = async () => {
    setIsLiked(true);
    
    // Increment like count in DB
    // This triggers the 'postgres_changes' on the Host side to show the glow
    await supabase.rpc('increment_stream_likes', { p_stream_id: streamId });

    // Reset local heart color after a second for the "tap" effect
    setTimeout(() => setIsLiked(false), 1000);
  };

  // 2. Native Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Watch this Live on Mpade Universe!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col gap-3 items-center">
      {/* Social Actions */}
      <div className="flex flex-col gap-4 bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/5">
        
        {/* Like Button with Animation logic */}
        <button 
          onClick={handleLike}
          className={`p-3 rounded-full transition-all active:scale-150 ${
            isLiked ? 'bg-[#fe2c55] text-white' : 'bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
        </button>

        <button 
          onClick={handleShare}
          className="p-3 bg-white/5 text-white hover:bg-white/10 rounded-full transition-all"
        >
          <Share2 size={24} />
        </button>

        <button 
          onClick={() => alert("Reported to Moderators")} // Hook to useModeration.js later
          className="p-3 bg-white/5 text-zinc-500 hover:text-yellow-500 rounded-full transition-all"
        >
          <ShieldAlert size={24} />
        </button>
      </div>

      {/* Video Settings Actions */}
      <div className="flex flex-col gap-4 bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/5">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 text-zinc-400 hover:text-white transition-all"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <button className="p-3 text-zinc-400 hover:text-white transition-all">
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};

export default ViewerControls;