import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, Users, Radio, Sparkles, UserCheck, Flame } from 'lucide-react';

/**
 * DynamicStreamGrid Component
 * Automatically splits the video stream container into two equal halves (50/50)
 * when a co-host joins, and switches back to full-screen mode when the co-host disconnects.
 */
const DynamicStreamGrid = ({
  streamId,
  hostVideo,
  hostStream,
  hostInfo = { username: 'Host', avatar_url: null },
  coHosts: propCoHosts = null,
  isHostView = false,
  className = ''
}) => {
  const [activeCoHosts, setActiveCoHosts] = useState([]);

  // Determine if co-host is passed via props or needs realtime subscription
  useEffect(() => {
    if (propCoHosts !== null) {
      setActiveCoHosts(propCoHosts);
      return;
    }

    if (!streamId) return;

    let isMounted = true;

    // Fetch initial approved co-hosts
    const fetchApprovedCoHosts = async () => {
      const { data, error } = await supabase
        .from('live_guest_requests')
        .select('*')
        .eq('stream_id', streamId)
        .eq('status', 'approved');

      if (!error && data && isMounted) {
        setActiveCoHosts(data);
      }
    };

    fetchApprovedCoHosts();

    // Subscribe to realtime co-host request updates
    const channel = supabase.channel(`dynamic_grid_${streamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_guest_requests', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          console.log('⚡ [DynamicStreamGrid Realtime] Co-Host state change detected:', payload);
          fetchApprovedCoHosts();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId, propCoHosts]);

  // Derived state: Co-host is active if activeCoHosts array has at least 1 entry
  const primaryCoHost = activeCoHosts.length > 0 ? activeCoHosts[0] : null;
  const isCoHostActive = Boolean(primaryCoHost);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black flex flex-col ${className}`}>
      {/* Dynamic Grid Container */}
      <motion.div 
        className="w-full h-full flex flex-col md:flex-row relative overflow-hidden transition-all duration-500 ease-in-out"
        layout
      >
        {/* HOST STREAM CONTAINER (Occupies 100% when solo, 50% when co-hosting) */}
        <motion.div 
          layout
          initial={false}
          animate={{
            height: isCoHostActive ? '50%' : '100%',
            width: isCoHostActive ? '100%' : '100%'
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className={`relative overflow-hidden flex items-center justify-center transition-all duration-500 ${
            isCoHostActive 
              ? 'border-b-2 md:border-b-0 md:border-r-2 border-pink-500/80 shadow-[0_0_20px_rgba(244,63,94,0.3)] z-10' 
              : 'z-0'
          }`}
        >
          {/* Host Video Render / Fallback */}
          {hostVideo ? (
            <div className="w-full h-full object-cover">{hostVideo}</div>
          ) : hostStream ? (
            <video 
              ref={(node) => {
                if (node && hostStream) {
                  node.srcObject = hostStream;
                }
              }} 
              autoPlay 
              playsInline 
              muted={isHostView}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center relative">
              <div className="w-20 h-20 rounded-full bg-pink-500/20 border-2 border-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse">
                {hostInfo.avatar_url ? (
                  <img src={hostInfo.avatar_url} alt="Host Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="text-pink-400" size={32} />
                )}
              </div>
            </div>
          )}

          {/* Host Tag Overlay */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <span className="bg-pink-600/90 text-white font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-pink-400/40">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              HOST
            </span>
            <span className="text-white text-xs font-bold drop-shadow-md bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {hostInfo.username || 'Host'}
            </span>
          </div>

          {/* Audio Wave Visualizer Indicator */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <span className="w-1 h-3 bg-pink-500 rounded-full animate-bounce" />
            <span className="w-1 h-4 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1 h-2 bg-pink-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[9px] text-zinc-300 font-bold ml-1 uppercase">LIVE</span>
          </div>
        </motion.div>

        {/* CO-HOST SPLIT DIVIDER BAR (Appears dynamically when co-host joins) */}
        <AnimatePresence>
          {isCoHostActive && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center"
            >
              <div className="bg-zinc-950/90 border-2 border-cyan-400 text-cyan-300 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.6)] flex items-center gap-1.5 backdrop-blur-xl">
                <Sparkles size={12} className="text-cyan-400 animate-spin" />
                <span>50/50 CO-HOST STAGE</span>
                <Flame size={12} className="text-pink-500" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CO-HOST STREAM CONTAINER (Occupies 50% when active, hidden/collapsed when disconnected) */}
        <AnimatePresence>
          {isCoHostActive && (
            <motion.div 
              layout
              initial={{ height: '0%', opacity: 0 }}
              animate={{ height: '50%', opacity: 1 }}
              exit={{ height: '0%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="relative w-full md:w-full overflow-hidden bg-zinc-950 flex items-center justify-center border-t-2 md:border-t-0 md:border-l-2 border-cyan-500/80 shadow-[0_0_20px_rgba(34,211,238,0.3)] z-10"
            >
              {/* Co-Host Video Stream or Avatar Tile */}
              {primaryCoHost.stream ? (
                <video 
                  ref={(node) => {
                    if (node && primaryCoHost.stream) {
                      node.srcObject = primaryCoHost.stream;
                    }
                  }}
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center relative p-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.5)] animate-pulse">
                      {primaryCoHost.avatar_url ? (
                        <img src={primaryCoHost.avatar_url} alt="Co-Host Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserCheck className="text-cyan-400" size={32} />
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-5 h-5 bg-cyan-500 rounded-full border-2 border-black flex items-center justify-center shadow">
                      <Radio size={10} className="text-black" />
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-black text-white tracking-wide">
                    {primaryCoHost.username || 'Co-Host Guest'}
                  </p>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    {primaryCoHost.mode === 'audio' ? '🎙️ Audio Guest' : '📹 Video Co-Host'}
                  </p>
                </div>
              )}

              {/* Co-Host Tag Overlay */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="bg-cyan-500 text-black font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                  CO-HOST
                </span>
                <span className="text-white text-xs font-bold drop-shadow-md bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {primaryCoHost.username || 'Co-Host'}
                </span>
              </div>

              {/* Co-Host Controls / Status */}
              <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {primaryCoHost.isMuted ? (
                  <span className="flex items-center gap-1 text-rose-400 text-[10px] font-bold">
                    <MicOff size={12} /> Muted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-cyan-400 text-[10px] font-bold">
                    <Mic size={12} /> Mic On
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DynamicStreamGrid;
