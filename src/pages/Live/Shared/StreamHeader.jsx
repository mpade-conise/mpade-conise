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
          likes: stream.likes,
          current_goal: stream.gift_goal_current,
          total_goal: stream.gift_goal_total
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

        if (!profileError) {
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
          likes: payload.new.likes,
          current_goal: payload.new.gift_goal_current,
          total_goal: payload.new.gift_goal_total
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
    return Math.min((liveMetrics.current_goal / effectiveTotalGoal) * 100, 100);
  }, [liveMetrics.current_goal, liveMetrics.total_goal]);

  const isGoalExceeded = liveMetrics.current_goal >= liveMetrics.total_goal;

  return (
    <header className="absolute top-0 left-0 right-0 p-4 flex flex-col gap-2.5 z-50 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none select-none">
      
      {/* ================= MAIN HEADER ROW ================= */}
      <div className="flex justify-between items-center w-full">
        
        {/* LEFT COLUMN: Host Bubble & Viewer Count Block */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          
          {/* Host Info Profile Container */}
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md p-1 pr-2.5 rounded-full border border-white/10">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/20 overflow-hidden relative">
              <img 
                src={data?.host?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data?.host_id}`} 
                className="w-full h-full object-cover"
                alt="host"
              />
            </div>
            
            <div className="flex flex-col max-w-[75px]">
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold text-white truncate">
                  {data?.host?.username || 'Creator'}
                </span>
                <CheckCircle2 size={9} className="text-blue-400 fill-blue-400 flex-shrink-0" />
              </div>
              <span className="text-[8px] font-medium text-white/70 leading-none">
                {liveMetrics.likes >= 1000 ? `${(liveMetrics.likes / 1000).toFixed(1)}k` : liveMetrics.likes} Likes
              </span>
            </div>

            {!isHost && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleFollow}
                className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isFollowing ? 'bg-white/10 text-white/60' : 'bg-[#fe2c55] text-white'
                }`}
              >
                {isFollowing ? <CheckCircle2 size={10} /> : <Plus size={11} className="stroke-[3]" />}
              </motion.button>
            )}
          </div>

          {/* Active Viewer Count Badge */}
          <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 h-[38px]">
            <Users size={11} className="text-white/90" />
            <span className="text-[10px] font-bold text-white tracking-wide">
              {viewerCount >= 1000 ? `${(viewerCount / 1000).toFixed(1)}k` : viewerCount || '0'}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Top Gifters list & Stream Control Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          
          {/* Top Gifters Avatars Array */}
          <div className="flex items-center -space-x-1.5 bg-black/25 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 h-[38px]">
            {topGifters.map((gifter, i) => (
              <div 
                key={gifter.sender_id} 
                className={`w-6 h-6 rounded-full border relative z-[${3-i}] bg-zinc-900 overflow-hidden ${
                  i === 0 ? 'border-yellow-400' : i === 1 ? 'border-zinc-300' : 'border-amber-600'
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
              <span className="text-[9px] text-white/40 px-1 font-medium">No Gifters</span>
            )}
          </div>

          {/* Core Controls */}
          <button className="w-[38px] h-[38px] flex items-center justify-center bg-black/25 hover:bg-black/40 transition-colors rounded-full text-white border border-white/10">
            <Share2 size={14} />
          </button>
          <button 
            onClick={onLeave} 
            className="w-[38px] h-[38px] flex items-center justify-center bg-black/40 hover:bg-zinc-900/60 active:scale-95 transition-all rounded-full text-white border border-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ================= SECONDARY SYSTEM METRICS ROW ================= */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        
        {/* Stream Run Duration Block */}
        <div className="flex items-center gap-1.5 pointer-events-auto self-start">
          <div className="bg-black/25 backdrop-blur-md px-2.5 py-0.5 rounded border border-white/5 flex items-center gap-1.5">
            <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-[#fe2c55]' : 'bg-zinc-500'} animate-pulse`} />
            <span className="text-[9px] font-bold text-white/90 font-mono tracking-wider">{duration}</span>
          </div>

          <AnimatePresence>
            {!isConnected && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
                className="bg-amber-500/20 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"
              >
                <WifiOff size={9} className="text-amber-400" />
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-tight">Reconnecting...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Gift Goal Indicator Panel */}
        <div className="w-full max-w-[180px] bg-black/25 backdrop-blur-md p-1.5 rounded-lg border border-white/5 pointer-events-auto">
          <div className="flex justify-between items-center mb-1 px-0.5">
            <div className="flex items-center gap-1 text-yellow-400">
              <Target size={10} />
              <span className="text-[8px] font-bold uppercase tracking-wider">
                {isGoalExceeded ? 'Goal Reached!' : 'Live Goal'}
              </span>
            </div>
            <span className="text-[8px] font-bold text-white/90 font-mono">
              {liveMetrics.current_goal}/{liveMetrics.total_goal}
            </span>
          </div>
          
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${goalPercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              className={`h-full rounded-full ${
                isGoalExceeded ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-gradient-to-r from-yellow-500 to-yellow-300'
              }`}
            />
          </div>
        </div>

      </div>
    </header>
  );
};

export default StreamHeader;
