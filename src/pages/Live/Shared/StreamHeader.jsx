import React, { useState, useEffect } from 'react';
import { Users, Heart, Share2, MoreVertical, X, CheckCircle2, Plus, Trophy, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const StreamHeader = ({ data, isHost, viewerCount, onLeave }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [duration, setDuration] = useState('00:00:00');
  
  const [liveMetrics, setLiveMetrics] = useState({
    likes: data?.likes || 0,
    current_goal: data?.gift_goal_current || 0,
    total_goal: data?.gift_goal_total || 1000
  });
  const [topGifters, setTopGifters] = useState([]);

  // 1. Live Duration Timer
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

  // 2. REAL-TIME DATA
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
        // Group gifts by sender_id to avoid duplicate key errors
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
          const merged = sortedUnique.map(gift => ({
            ...gift,
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
      .subscribe();

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

  // Logic for Unlimited Goal: If exceeded, bar stays at 100% with a unique effect
  const effectiveTotalGoal = liveMetrics.total_goal || 1;
  const isGoalExceeded = liveMetrics.current_goal >= effectiveTotalGoal;
  const goalPercent = isGoalExceeded ? 100 : (liveMetrics.current_goal / effectiveTotalGoal) * 100;

  return (
    <header className="absolute top-0 left-0 right-0 p-3 flex flex-col gap-3 z-50 bg-gradient-to-b from-black/90 via-black/20 to-transparent pointer-events-none">
      
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-2xl p-1 pr-3 rounded-full border border-white/10 shadow-2xl">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border-2 border-[#fe2c55] overflow-hidden">
              <img 
                src={data?.host?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data?.host_id}`} 
                className="w-full h-full object-cover"
                alt="host"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <h1 className="text-[10px] font-black text-white uppercase truncate max-w-[70px]">
                  {data?.host?.username || 'Creator'}
                </h1>
                <CheckCircle2 size={10} className="text-blue-400 fill-blue-400" />
              </div>
              <p className="text-[8px] font-bold text-[#fe2c55] uppercase tracking-widest leading-none">
                {isHost ? 'HOST' : 'LIVE'}
              </p>
            </div>
            {!isHost && (
              <button 
                onClick={handleToggleFollow}
                className={`ml-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isFollowing ? 'bg-white/10 text-white' : 'bg-[#fe2c55] text-white shadow-lg'}`}
              >
                {isFollowing ? <CheckCircle2 size={12} /> : <Plus size={14} />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
              <Users size={12} className="text-white/70" />
              <span className="text-[10px] font-black text-white">{viewerCount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-1.5">
              <Heart size={12} className="text-[#fe2c55] fill-[#fe2c55]" />
              <span className="text-[10px] font-black text-white">{liveMetrics.likes}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center -space-x-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 mr-1">
            {topGifters.map((gifter, i) => (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                key={gifter.sender_id} 
                className={`w-7 h-7 rounded-full border-2 ${i === 0 ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]' : 'border-zinc-500'} bg-zinc-900 overflow-hidden shadow-xl`}
              >
                <img 
                  src={gifter.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gifter.sender_id}`} 
                  className="w-full h-full object-cover"
                  alt="top gifter" 
                />
              </motion.div>
            ))}
            {topGifters.length > 0 && (
              <div className="pl-3 pr-1 flex items-center">
                <Trophy size={12} className="text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-2 bg-black/30 rounded-full text-white border border-white/5"><Share2 size={16} /></button>
            <button onClick={onLeave} className="p-2 bg-[#fe2c55] rounded-full text-white shadow-lg"><X size={18} /></button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[240px] pointer-events-auto">
        <div className="flex justify-between items-end mb-1 px-1">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Target size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">Goal</span>
          </div>
          <span className="text-[9px] font-black text-yellow-400">
            {liveMetrics.current_goal} <span className="text-white/40">/</span> {liveMetrics.total_goal}
          </span>
        </div>
        <div className="h-2 w-full bg-black/60 rounded-full border border-white/10 overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${goalPercent}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            className={`h-full rounded-full ${isGoalExceeded ? 'bg-gradient-to-r from-yellow-500 via-white to-yellow-500 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'bg-gradient-to-r from-yellow-600 to-yellow-200'}`}
          />
        </div>
      </div>

      <div className="flex gap-2 px-1">
        <div className="bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-2 shadow-2xl">
          <div className="w-1.5 h-1.5 bg-[#fe2c55] rounded-full animate-pulse shadow-[0_0_8px_#fe2c55]" />
          <span className="text-[10px] font-black text-white/90 tracking-widest font-mono uppercase">{duration}</span>
        </div>
      </div>
    </header>
  );
};

export default StreamHeader;