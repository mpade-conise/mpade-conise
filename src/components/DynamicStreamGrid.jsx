// src/components/DynamicStreamGrid.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Mic, MicOff, Users, Radio, Sparkles, UserCheck, Flame, Trophy, Crown } from 'lucide-react';
import FloatingGiftEmojis from './live/FloatingGiftEmojis';

/**
 * DynamicStreamGrid Component
 * - When No Co-hosting: Host occupies 100% full screen.
 * - When Co-hosting (up to 4 hosts limit): Upper 50% of the screen is dedicated to streaming video,
 *   cleanly split into 2, 3, or 4 equal host panels with embedded features (60px info bars, mic/cam states).
 * - During PK Battle: Displays Top 2 gifters per host directly below each host's video frame.
 */
export const DynamicStreamGrid = ({
  streamId,
  hostVideo,
  hostStream,
  hostInfo = { username: 'Host 1', avatar_url: null },
  coHosts: propCoHosts = null,
  coHostStream = null,
  coHostVideo = null,
  coHostInfo = null,
  isHostView = false,
  isBattleMode = false,
  activeSmallGift = null,
  onClearSmallGift,
  className = ''
}) => {
  const [activeCoHosts, setActiveCoHosts] = useState([]);

  // Mock Top 2 Gifters per host for PK Battle
  const topGiftersData = {
    host: [
      { id: 'g1', name: 'CyberWhale', coins: 3400, avatar: '👑' },
      { id: 'g2', name: 'NeonKnight', coins: 1850, avatar: '💎' },
    ],
    coHost1: [
      { id: 'g3', name: 'Solaris', coins: 2900, avatar: '🦄' },
      { id: 'g4', name: 'Vortex', coins: 1400, avatar: '⚡' },
    ],
    coHost2: [
      { id: 'g5', name: 'AuraLord', coins: 2100, avatar: '🌟' },
      { id: 'g6', name: 'NovaX', coins: 950, avatar: '🔥' },
    ],
    coHost3: [
      { id: 'g7', name: 'TitanKing', coins: 1750, avatar: '🛡️' },
      { id: 'g8', name: 'EchoGamer', coins: 820, avatar: '🚀' },
    ]
  };

  // Co-host database synchronization
  useEffect(() => {
    if (propCoHosts !== null) {
      setActiveCoHosts(propCoHosts.slice(0, 3)); // Max 3 co-hosts (total 4 with main host)
      return;
    }

    if (!streamId) return;
    let isMounted = true;

    const fetchApprovedCoHosts = async () => {
      const { data, error } = await supabase
        .from('live_guest_requests')
        .select('*')
        .eq('stream_id', streamId)
        .eq('status', 'approved')
        .limit(3);

      if (!error && data && isMounted) {
        setActiveCoHosts(data);
      }
    };

    fetchApprovedCoHosts();

    const channel = supabase.channel(`dynamic_cohosts_${streamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_guest_requests', filter: `stream_id=eq.${streamId}` },
        () => {
          fetchApprovedCoHosts();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId, propCoHosts]);

  // Aggregate total active hosts (Host + up to 3 co-hosts = max 4)
  const coHostList = activeCoHosts.length > 0 
    ? activeCoHosts 
    : (coHostStream || coHostVideo || coHostInfo ? [coHostInfo || { username: 'Co-Host 1' }] : []);

  const totalHostsCount = 1 + Math.min(3, coHostList.length);
  const isCoHosting = totalHostsCount > 1;

  // Grid layout class based on host count
  const getGridLayoutClass = () => {
    switch (totalHostsCount) {
      case 2:
        return 'grid grid-cols-2 grid-rows-1';
      case 3:
        return 'grid grid-cols-3 grid-rows-1';
      case 4:
        return 'grid grid-cols-2 grid-rows-2';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div 
      className={`relative w-full overflow-hidden bg-black transition-all duration-500 ease-in-out ${
        isCoHosting ? 'h-[50vh] min-h-[300px] border-b border-cyan-500/20 shadow-2xl' : 'h-full'
      } ${className}`}
    >
      {/* Floating Small Gift Particles (< 50 coins) */}
      <FloatingGiftEmojis activeSmallGift={activeSmallGift} onClear={onClearSmallGift} />

      {/* Main Grid Wrapper */}
      <div className={`w-full h-full gap-1.5 p-1 bg-[#05050d] ${getGridLayoutClass()}`}>
        
        {/* ================= HOST 1 PANEL ================= */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 flex flex-col justify-between shadow-inner">
          {/* Host Video Stream */}
          <div className="absolute inset-0 z-0">
            {hostVideo ? (
              <div className="w-full h-full">{hostVideo}</div>
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
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 border-2 border-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                  {hostInfo?.avatar_url ? (
                    <img src={hostInfo.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users size={24} className="text-pink-400" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Top Host Status Badge (60px compact zone) */}
          <div className="relative z-10 p-2 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-pink-500/40 shadow-md">
              <span className="w-2 h-2 rounded-full bg-[#fe2c55] animate-ping" />
              <span className="text-[9px] font-black uppercase text-pink-300">HOST</span>
              <span className="text-[10px] font-bold text-white max-w-[70px] truncate">{hostInfo?.username || 'Host 1'}</span>
            </div>
            
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] text-cyan-400 font-mono">
              <Radio size={10} className="text-emerald-400 animate-pulse" /> LIVE
            </div>
          </div>

          {/* Bottom PK Top 2 Gifters Display (Only during PK Battle) */}
          {isBattleMode && (
            <div className="relative z-10 p-1.5 bg-black/80 backdrop-blur-md border-t border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[8px] font-mono text-cyan-300 font-bold uppercase">
                <Trophy size={10} className="text-amber-400" /> Top Gifters
              </div>
              <div className="flex items-center gap-1.5">
                {topGiftersData.host.map((g, idx) => (
                  <div key={g.id} className="flex items-center gap-1 bg-zinc-900/90 px-1.5 py-0.5 rounded-lg border border-white/10 text-[8px]">
                    <span>{g.avatar}</span>
                    <span className="text-white font-bold max-w-[45px] truncate">{g.name}</span>
                    <span className="text-cyan-400 font-mono font-bold">{(g.coins / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= CO-HOST PANELS (UP TO 3) ================= */}
        {isCoHosting && coHostList.map((cohost, index) => {
          const key = `coHost${index + 1}`;
          const gifters = topGiftersData[key] || topGiftersData.coHost1;

          return (
            <motion.div
              key={cohost.id || index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-cyan-500/40 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              {/* Co-Host Video / Avatar View */}
              <div className="absolute inset-0 z-0">
                {index === 0 && coHostVideo ? (
                  <div className="w-full h-full">{coHostVideo}</div>
                ) : index === 0 && coHostStream ? (
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
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-[#090d1f] to-black flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                      {cohost.avatar_url ? (
                        <img src={cohost.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users size={22} className="text-cyan-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Co-Host Top Info Header */}
              <div className="relative z-10 p-2 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-400/40 shadow-md">
                  <span className="text-[9px] font-black uppercase text-cyan-300">HOST {index + 2}</span>
                  <span className="text-[10px] font-bold text-white max-w-[70px] truncate">
                    {cohost.username || `Host ${index + 2}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LINKED
                </div>
              </div>

              {/* Bottom PK Top 2 Gifters Display for Co-Host */}
              {isBattleMode && (
                <div className="relative z-10 p-1.5 bg-black/80 backdrop-blur-md border-t border-cyan-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[8px] font-mono text-pink-400 font-bold uppercase">
                    <Trophy size={10} className="text-amber-400" /> Top Gifters
                  </div>
                  <div className="flex items-center gap-1.5">
                    {gifters.map((g) => (
                      <div key={g.id} className="flex items-center gap-1 bg-zinc-900/90 px-1.5 py-0.5 rounded-lg border border-white/10 text-[8px]">
                        <span>{g.avatar}</span>
                        <span className="text-white font-bold max-w-[45px] truncate">{g.name}</span>
                        <span className="text-pink-400 font-mono font-bold">{(g.coins / 1000).toFixed(1)}k</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DynamicStreamGrid;
