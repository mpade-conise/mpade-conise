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
  coHostStream = null,
  coHostVideo = null,
  coHostInfo = null,
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

  // Derived state: Co-host is active if coHostStream/coHostVideo/coHostInfo or activeCoHosts array is present
  const primaryCoHost = activeCoHosts.length > 0 ? activeCoHosts[0] : (coHostInfo || (coHostStream ? { username: 'Co-Host' } : null));
  const isCoHostActive = Boolean(coHostStream || coHostVideo || primaryCoHost);

  const effectiveCoHostInfo = {
    username: coHostInfo?.username || primaryCoHost?.username || 'Co-Host',
    avatar_url: coHostInfo?.avatar_url || primaryCoHost?.avatar_url,
    mode: coHostInfo?.mode || primaryCoHost?.mode || 'video',
    isMuted: coHostInfo?.isMuted || primaryCoHost?.isMuted || false
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black flex flex-col ${className}`}>
      {/* Dynamic Grid Container */}
      <motion.div 
        className="w-full h-full flex flex-col md:flex-row relative overflow-hidden transition-all duration-500 ease-in-out"
        layout
      >
        {/* HOST 1 STREAM CONTAINER (Occupies 100% of background stage) */}
        <motion.div 
          layout
          className="relative w-full h-full overflow-hidden flex items-center justify-center z-0"
        >
          {/* Host Video Render / Fallback */}
          {hostVideo ? (
            <div className="w-full h-full object-cover">{hostVideo}</div>
          ) : hostStream ? (
            <video 
              ref={(node) => {
                if (node && hostStream && node.srcObject !== hostStream) {
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
              HOST 1
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

        {/* HOST 2 / CO-HOST STREAM CONTAINER (Compact Picture-in-Picture Floating Panel ~20% size fitting mobile) */}
        <AnimatePresence>
          {isCoHostActive && (
            <motion.div 
              layout
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 150 }}
              className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 w-24 h-32 sm:w-32 sm:h-44 rounded-2xl overflow-hidden bg-zinc-950 border-2 border-cyan-400/90 shadow-[0_0_25px_rgba(34,211,238,0.6)] z-30 flex flex-col justify-between"
            >
              {/* If mode is 'audio', hide video and display audio tile with hidden audio player */}
              {effectiveCoHostInfo.mode === 'audio' ? (
                <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center p-2 text-center relative">
                  {/* Invisible audio element to transmit and play audio stream */}
                  {coHostStream && (
                    <audio 
                      ref={(node) => {
                        if (node && coHostStream && node.srcObject !== coHostStream) {
                          node.srcObject = coHostStream;
                        }
                      }}
                      autoPlay
                    />
                  )}
                  <div className="relative mb-1">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-pulse">
                      {effectiveCoHostInfo.avatar_url ? (
                        <img src={effectiveCoHostInfo.avatar_url} alt="Co-Host Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserCheck className="text-cyan-400" size={20} />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-cyan-500 text-black rounded-full border border-black shadow">
                      <Mic size={9} />
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-cyan-200 truncate max-w-full px-1">
                    @{effectiveCoHostInfo.username}
                  </span>
                  <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                    🎙️ Audio Only
                  </span>
                </div>
              ) : coHostVideo ? (
                <div className="w-full h-full object-cover">{coHostVideo}</div>
              ) : coHostStream ? (
                <video 
                  ref={(node) => {
                    if (node && coHostStream && node.srcObject !== coHostStream) {
                      node.srcObject = coHostStream;
                    }
                  }}
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : primaryCoHost?.stream ? (
                <video 
                  ref={(node) => {
                    if (node && primaryCoHost.stream && node.srcObject !== primaryCoHost.stream) {
                      node.srcObject = primaryCoHost.stream;
                    }
                  }}
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center relative p-2 text-center">
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse">
                      {effectiveCoHostInfo.avatar_url ? (
                        <img src={effectiveCoHostInfo.avatar_url} alt="Co-Host Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserCheck className="text-cyan-400" size={20} />
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-[9px] sm:text-[10px] font-black text-white truncate max-w-full px-1">
                    @{effectiveCoHostInfo.username}
                  </p>
                </div>
              )}

              {/* Co-Host Badge Overlay */}
              <div className="absolute top-1 left-1 z-20 flex items-center gap-1">
                <span className="bg-cyan-500 text-black font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow border border-cyan-300">
                  CO-HOST
                </span>
              </div>

              {/* Co-Host Mic Status */}
              <div className="absolute bottom-1 right-1 z-20 bg-black/70 backdrop-blur-md p-1 rounded-full border border-white/10">
                {effectiveCoHostInfo.isMuted ? (
                  <MicOff size={10} className="text-rose-400" />
                ) : (
                  <Mic size={10} className="text-cyan-400" />
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
