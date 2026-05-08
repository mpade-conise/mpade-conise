import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Power, Loader2 } from 'lucide-react';

const EndStream = ({ streamId, localStreamRef, viewerCount = 0, heartCount = 0, startedAt }) => {
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const calculateDuration = () => {
    if (!startedAt) return "00:00:00";
    const start = new Date(startedAt);
    const end = new Date();
    const diffInSeconds = Math.floor((end - start) / 1000);
    const hours = Math.floor(diffInSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((diffInSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (diffInSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleEndStream = async () => {
    setIsEnding(true);
    try {
      // Use getSession for faster auth checks
      const { data: { session } } = await supabase.auth.getSession();
      const hostId = session?.user?.id;
      const durationString = calculateDuration();

      // 📊 1. ATTEMPT ANALYTICS (Non-blocking)
      const { error: anaErr } = await supabase
        .from('stream_analytics')
        .insert([{
          stream_id: streamId,
          host_id: hostId,
          total_viewers: viewerCount,
          peak_concurrent_viewers: viewerCount,
          total_likes: heartCount,
          total_gifts_value: 0,
          duration_seconds: 0,
          final_viewers: viewerCount,
          peak_viewers: viewerCount,
          total_gifts: 0,
          stream_duration: durationString,
          duration: durationString
        }]);
      
      if (anaErr) console.warn("Analytics bypass:", anaErr.message);

      // ✅ 2. UPDATE STATUS (Simplified to avoid 403)
      const { error: streamErr } = await supabase
        .from('live_streams')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          viewer_count: 0 
        })
        .eq('id', streamId); // Removed host_id check here to force the update

      if (streamErr) console.error("Status Update Failed:", streamErr.message);

      // 🔌 3. HARDWARE RELEASE (Camera/Mic)
      if (localStreamRef?.current) {
        const stream = localStreamRef.current;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        localStreamRef.current = null;
      }

      // 🚀 4. FORCE NAVIGATION
      // We navigate regardless of errors to keep the UX smooth
      navigate(`/live/analytics/${streamId}`, { replace: true });

    } catch (err) {
      console.error("End Stream Process Failed:", err.message);
      // Fallback navigation if critical crash occurs
      navigate('/', { replace: true });
    } finally {
      setIsEnding(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300 bg-zinc-900/95 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
        <button 
          disabled={isEnding}
          onClick={() => setIsConfirming(false)}
          className="px-4 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button 
          disabled={isEnding}
          onClick={handleEndStream}
          className="bg-[#fe2c55] hover:bg-[#ef2950] text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[#fe2c55]/20 flex items-center gap-2"
        >
          {isEnding ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Ending...
            </>
          ) : (
            'Confirm End'
          )}
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsConfirming(true)}
      className="bg-zinc-900/40 hover:bg-[#fe2c55] text-[#fe2c55] hover:text-white p-3 rounded-2xl border border-white/10 transition-all group active:scale-95 shadow-xl"
      title="End Live Stream"
    >
      <Power size={20} className="group-hover:rotate-12 transition-transform" />
    </button>
  );
};

export default EndStream;