import React, { useState, useEffect, useMemo } from 'react';
import { Users, Heart, Share2, X, CheckCircle2, Plus, Trophy, Target, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const StreamHeader = ({ data, isHost, viewerCount, onLeave }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [duration, setDuration] = useState('00:00:00');
  const [isConnected, setIsConnected] = useState(true);
  
  const [liveMetrics, setLiveMetrics] = useState({
    likes: data?.likes || 0,
    current_goal: data?.gift_goal_current || 0,
    total_goal: data?.gift_goal_total || 1000
  });
  const [topGifters, setTopGifters] = useState([]);

  // Stream Duration Timer
  useEffect(() => {
    if (!data?.created_at) return;
    const timer = setInterval(() => {
      const start = new Date(data.created_at).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setDuration(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.created_at]);

  // Check Follow Status
  useEffect(() => {
    const checkFollow = async () => {
      if (isHost || !data?.host_id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', data.host_id)
        .single();

      if (followData) setIsFollowing(true);
    };
    checkFollow();
  }, [data?.host_id, isHost]);

  const handleToggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', data.host_id);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert([{ follower_id: user.id, following_id: data.host_id }]);
      setIsFollowing(true);
    }
  };

  // Real-time Database Updates
  useEffect(() => {
    if (!data?.id) return;

    const fetchStreamMetrics = async () => {
      const { data: stream, error } = await supabase
        .from('live_streams')
        .select('likes, gift_goal_current, gift_goal_total')
        .eq('id', data.id)
        .single();
      
      if (!error && stream) {
        setLiveMetrics({
          likes: stream.likes || 0,
          current_goal: stream.gift_goal_current || 0,
          total_goal: stream.gift_goal_total || 1000
        });
      }
    };

    const fetchTopGifters = async () => {
      const { data: gifts, error: giftError } = await supabase
        .from('live_gifts')
        .select(`sender_id, price_total`)
        .eq('stream_id', data.id);
      
      if (giftError) return;

      if (gifts && gifts.length > 0) {
        const grouped = gifts.reduce((acc, curr) => {
          if (!acc[curr.sender_id]) {
            acc[curr.sender_id] = { sender_id: curr.sender_id, price_total: 0 };
          }
          acc[curr.sender_id].price_total += curr.price_total;
          return acc;
        }, {});

        const sortedUnique = Object.values(grouped)
          .sort((a, b) => b.price_total - a.price_total)
          .slice(0, 3);

        const userIds = sortedUnique.map(g => g.sender_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, avatar_url, username')
          .in('id', userIds);

        if (!profileError && profiles) {
          const merged = sortedUnique.map((gift, index) => ({
            ...gift,
            rank: index + 1,
            profiles: profiles.find(p => p.id === gift.sender_id)
          }));
          setTopGifters(merged);
        }
      }
    };

    fetchTopGifters();
    fetchStreamMetrics();

    const streamSub = supabase
      .channel(`stream-${data.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_streams',
        filter: `id=eq.${data.id}`
      }, (payload) => {
        setLiveMetrics({
          likes: payload.new.likes || 0,
          current_goal: payload.new.gift_goal_current || 0,
          total_goal: payload.new.gift_goal_total || 1000
        });
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    const giftSub = supabase
      .channel(`gifts-${data.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_gifts',
        filter: `stream_id=eq.${data.id}`
      }, () => {
        fetchTopGifters();
        fetchStreamMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(streamSub);
      supabase.removeChannel(giftSub);
    };
  }, [data?.id]);

  const goalPercent = useMemo(() => {
    const effectiveTotalGoal = liveMetrics.total_goal || 1;
    return Math.min(((liveMetrics.current_goal || 0) / effectiveTotalGoal) * 100, 100);
  }, [liveMetrics.current_goal, liveMetrics.total_goal]);

  const isGoalExceeded = (liveMetrics.current_goal || 0) >= (liveMetrics.total_goal || 1000);

  return (
    <header className="absolute top-0 left-0 right-0 p-4 flex flex-col gap-2.5 z-50 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none select-none">
      
      {/* ================= MAIN HEADER ROW ================= */}
      <div className="flex justify-between items-center w-full">
        
        {/* LEFT COLUMN: Host Bubble & Viewer Count Block */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          
          {/* Host Info Profile Container */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 pr-2.5 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-cyan-400/80 overflow-hidden relative shadow-[0_0_8px_rgba(6,182,212,0.5)]">
              <img 
                src={data?.host?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data?.host_id}`} 
                className="w-full h-full object-cover"
                alt="host"
              />
            </div>
            
            <div className="flex flex-col max-w-[75px]">
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                  {data?.host?.username || 'Creator'}
                </span>
                <CheckCircle2 size={9} className="text-cyan-400 fill-cyan-400 flex-shrink-0 drop-shadow-[0_0_6px_#06b6d4]" />
              </div>
              <span className="text-[8px] font-medium text-cyan-200/80 leading-none drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]">
                {liveMetrics.likes >= 1000 ? `${(liveMetrics.likes / 1000).toFixed(1)}k` : liveMetrics.likes} Likes
              </span>
            </div>

            {!isHost && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFollow}
                className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isFollowing 
                    ? 'bg-zinc-800/80 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                    : 'bg-[#fe2c55] text-white border border-rose-400/50 shadow-[0_0_12px_rgba(254,44,85,0.6)] hover:shadow-[0_0_18px_rgba(254,44,85,0.8)]'
                }`}
              >
                {isFollowing ? <CheckCircle2 size={10} className="drop-shadow-[0_0_4px_#06b6d4]" /> : <Plus size={11} className="stroke-[3] drop-shadow-[0_0_4px_#ffffff]" />}
              </motion.button>
            )}
          </div>

          {/* Active Viewer Count Badge */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] h-[38px]">
            <Users size={11} className="text-cyan-400 drop-shadow-[0_0_6px_#06b6d4]" />
            <span className="text-[10px] font-bold text-cyan-100 tracking-wide drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
              {viewerCount >= 1000 ? `${(viewerCount / 1000).toFixed(1)}k` : viewerCount || '0'}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Top Gifters list & Stream Control Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Top Gifters Avatars Array */}
          <div className="flex items-center -space-x-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] h-[38px]">
            {topGifters.map((gifter, i) => (
              <div 
                key={gifter.sender_id} 
                className={`w-6 h-6 rounded-full border relative z-[${3-i}] bg-zinc-900 overflow-hidden ${
                  i === 0 
                    ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' 
                    : i === 1 
                    ? 'border-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.5)]' 
                    : 'border-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                }`}
              >
                <img 
                  src={gifter.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gifter.sender_id}`} 
                  className="w-full h-full object-cover"
                  alt="top-gifter" 
                />
              </div>
            ))}
            {topGifters.length === 0 && (
              <span className="text-[9px] text-cyan-200/50 px-1 font-medium drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]">No Gifters</span>
            )}
          </div>

          {/* Core Controls */}
          <button className="w-[38px] h-[38px] flex items-center justify-center bg-black/40 hover:bg-cyan-500/20 transition-all rounded-full text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(6,182,212,0.5)]">
            <Share2 size={14} className="drop-shadow-[0_0_6px_#06b6d4]" />
          </button>
          <button 
            onClick={onLeave} 
            className="w-[38px] h-[38px] flex items-center justify-center bg-black/50 hover:bg-red-500/20 active:scale-95 transition-all rounded-full text-red-400 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
          >
            <X size={16} className="drop-shadow-[0_0_6px_#ef4444]" />
          </button>
        </div>
      </div>

      {/* ================= SECONDARY SYSTEM METRICS ROW ================= */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        
        {/* Stream Run Duration Block */}
        <div className="flex items-center gap-1.5 pointer-events-auto self-start">
          <div className="bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-pink-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)] flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#fe2c55] shadow-[0_0_8px_#fe2c55]' : 'bg-zinc-500'} animate-pulse`} />
            <span className="text-[9px] font-bold text-pink-200 font-mono tracking-wider drop-shadow-[0_0_5px_rgba(244,63,94,0.6)]">{duration}</span>
          </div>

          <AnimatePresence>
            {!isConnected && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
                className="bg-amber-950/50 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-1"
              >
                <WifiOff size={9} className="text-amber-400 drop-shadow-[0_0_5px_#f59e0b]" />
                <span className="text-[8px] font-bold text-amber-300 uppercase tracking-tight drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">Reconnecting...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Gift Goal Indicator Panel */}
        <div className="w-full max-w-[180px] bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)] pointer-events-auto">
          <div className="flex justify-between items-center mb-1 px-0.5">
            <div className="flex items-center gap-1 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]">
              <Target size={10} className="drop-shadow-[0_0_4px_#facc15]" />
              <span className="text-[8px] font-bold uppercase tracking-wider">
                {isGoalExceeded ? 'Goal Reached!' : 'Live Goal'}
              </span>
            </div>
            <span className="text-[8px] font-bold text-yellow-200 font-mono drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
              {liveMetrics.current_goal}/{liveMetrics.total_goal}
            </span>
          </div>
          
          <div className="h-1 w-full bg-zinc-900/80 rounded-full overflow-hidden relative border border-yellow-500/20">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${goalPercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              className={`h-full rounded-full ${
                isGoalExceeded 
                  ? 'bg-yellow-400 shadow-[0_0_12px_#facc15]' 
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.7)]'
              }`}
            />
          </div>
        </div>

      </div>
    </header>
  );
};

export default StreamHeader;
