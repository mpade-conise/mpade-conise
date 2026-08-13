import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Heart, 
  Flame, 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap, 
  BarChart2, 
  PieChart as PieIcon, 
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Neon Theme Palette for Recharts SVG elements
const GRAPH_COLORS = {
  viewers: '#00f3ff',     // Neon Cyan
  reactions: '#fe2c55',   // Neon Pink
  gifts: '#f59e0b',       // Amber Gold
  comments: '#a855f7',    // Velvet Purple
  peak: '#10b981'         // Emerald
};

const EMOJI_PALETTE = {
  '❤️': '#fe2c55',
  '🔥': '#f97316',
  '👏': '#eab308',
  '🎉': '#a855f7',
  '🚀': '#00f3ff',
  '💎': '#3b82f6',
  '😮': '#ec4899',
  '💯': '#10b981'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] text-xs text-white space-y-1 font-mono">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black text-white">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StreamMetricsDashboard = ({
  streamId = 'demo-stream',
  socket = null,
  currentViewers: propViewers = 24,
  compact = false,
  className = ''
}) => {
  // Real-time timeline historical dataset
  const [timelineData, setTimelineData] = useState(() => {
    const initial = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const timeStr = new Date(now - i * 5000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      initial.push({
        timestamp: timeStr,
        viewers: Math.max(12, Math.floor(propViewers + (Math.random() * 8 - 4))),
        reactions: Math.floor(Math.random() * 15 + 5),
        comments: Math.floor(Math.random() * 8 + 2),
      });
    }
    return initial;
  });

  // Reaction Emoji frequency distribution
  const [reactionCounts, setReactionCounts] = useState({
    '❤️': 42,
    '🔥': 28,
    '👏': 18,
    '🎉': 12,
    '🚀': 25,
    '💎': 9,
    '😮': 14,
    '💯': 16
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reactions' | 'density'
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // ms
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reaction frequency accumulator for current window
  const [currentReactionRate, setCurrentReactionRate] = useState(18);

  // Listen to WebSocket events if provided
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data) => {
      const emoji = data?.type || data?.emoji || '❤️';
      setReactionCounts((prev) => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + 1
      }));

      // Increment latest timeline reaction count
      setTimelineData((prev) => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        last.reactions = (last.reactions || 0) + 1;
        return [...prev.slice(0, -1), last];
      });
    };

    const handleComment = () => {
      setTimelineData((prev) => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        last.comments = (last.comments || 0) + 1;
        return [...prev.slice(0, -1), last];
      });
    };

    socket.on('received_reaction', handleReaction);
    socket.on('reaction', handleReaction);
    socket.on('chat_message', handleComment);

    return () => {
      socket.off('received_reaction', handleReaction);
      socket.off('reaction', handleReaction);
      socket.off('chat_message', handleComment);
    };
  }, [socket]);

  // Trigger a new data point refresh
  const triggerDataRefresh = () => {
    setIsRefreshing(true);
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const randomViewers = Math.max(8, Math.floor(propViewers + (Math.random() * 10 - 5)));
    const randomReactions = Math.floor(Math.random() * 22 + 4);
    const randomComments = Math.floor(Math.random() * 10 + 1);

    setCurrentReactionRate(randomReactions * 12);
    setLastUpdatedTime(timeStr);
    setSecondsRemaining(Math.ceil(refreshInterval / 1000));

    setTimelineData((prev) => {
      const next = [
        ...prev.slice(-20),
        {
          timestamp: timeStr,
          viewers: randomViewers,
          reactions: randomReactions,
          comments: randomComments
        }
      ];
      return next;
    });

    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Reset seconds countdown whenever interval changes
  useEffect(() => {
    setSecondsRemaining(Math.ceil(refreshInterval / 1000));
  }, [refreshInterval]);

  // Periodic 1-second countdown tick for auto-refresh
  useEffect(() => {
    if (!autoSimulate) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          triggerDataRefresh();
          return Math.ceil(refreshInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSimulate, refreshInterval, propViewers]);

  // Derived Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (timelineData.length === 0) {
      return { totalReactions: 0, peakViewers: 0, avgViewers: 0, totalComments: 0 };
    }
    const totalRx = timelineData.reduce((acc, curr) => acc + (curr.reactions || 0), 0);
    const totalCm = timelineData.reduce((acc, curr) => acc + (curr.comments || 0), 0);
    const maxV = Math.max(...timelineData.map((d) => d.viewers || 0));
    const avgV = Math.round(timelineData.reduce((acc, curr) => acc + (curr.viewers || 0), 0) / timelineData.length);

    return {
      totalReactions: totalRx,
      totalComments: totalCm,
      peakViewers: maxV,
      avgViewers: avgV
    };
  }, [timelineData]);

  // Transform reaction counts into Recharts data structure
  const pieReactionData = useMemo(() => {
    return Object.entries(reactionCounts).map(([emoji, count]) => ({
      name: emoji,
      value: count,
      color: EMOJI_PALETTE[emoji] || '#00f3ff'
    }));
  }, [reactionCounts]);

  const latestPoint = timelineData[timelineData.length - 1] || { viewers: propViewers, reactions: 0 };

  return (
    <div className={`bg-zinc-950/95 border border-white/10 rounded-3xl p-4 md:p-6 text-white backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col gap-5 ${className}`}>
      {/* Background Neon ambient glows */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* DASHBOARD HEADER & TAB TOGGLES */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-[0_0_15px_rgba(0,243,255,0.4)]">
            <Activity size={18} className="text-black font-black" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              Live Stream Analytics
              <span className="flex items-center gap-1 bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> REAL-TIME
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">Stream ID: {streamId?.slice(0, 14)}</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,243,255,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp size={12} /> Viewership & Reactions
          </button>

          <button
            onClick={() => setActiveTab('reactions')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'reactions'
                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(254,44,85,0.5)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PieIcon size={12} /> Emoji Breakdown
          </button>
        </div>
      </div>

      {/* AUTO-REFRESH TIMER CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 border border-white/10 px-3.5 py-2 rounded-2xl relative z-10 text-xs font-mono">
        <div className="flex items-center gap-3">
          {/* Pause / Play Toggle */}
          <button
            type="button"
            onClick={() => setAutoSimulate(!autoSimulate)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
              autoSimulate
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title={autoSimulate ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}
          >
            <span className={`w-2 h-2 rounded-full ${autoSimulate ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            {autoSimulate ? 'Auto-Refresh ON' : 'Paused'}
          </button>

          {/* Interval Selector */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-0.5 text-[10px]">
            <Clock size={12} className="text-zinc-400 ml-1.5" />
            {[3000, 5000, 10000, 15000].map((ms) => (
              <button
                key={ms}
                onClick={() => setRefreshInterval(ms)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  refreshInterval === ms
                    ? 'bg-cyan-500 text-black font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>

          {/* Countdown timer badge & progress bar */}
          {autoSimulate && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_8px_#00f3ff]"
                  style={{
                    width: `${((refreshInterval / 1000 - secondsRemaining) / (refreshInterval / 1000)) * 100}%`
                  }}
                />
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">
                Next update in <span className="text-white font-black">{secondsRemaining}s</span>
              </span>
            </div>
          )}
        </div>

        {/* Right side: Manual Refresh & Last Updated Timestamp */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-400">
            Updated: <span className="text-zinc-200 font-bold">{lastUpdatedTime}</span>
          </span>

          <button
            type="button"
            onClick={triggerDataRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_10px_rgba(0,243,255,0.2)]"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-cyan-300' : ''} />
            Refresh Now
          </button>
        </div>
      </div>

      {/* METRICS QUICK STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        <div className="bg-zinc-900/60 border border-cyan-500/30 p-3 rounded-2xl relative overflow-hidden group hover:border-cyan-400 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">Current Viewers</span>
            <Users size={14} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black italic tracking-tight text-white">
            {latestPoint.viewers?.toLocaleString()}
          </div>
          <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 mt-1">
            <span className="text-emerald-400 font-bold">Peak: {summaryMetrics.peakViewers}</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-rose-500/30 p-3 rounded-2xl relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">Reaction Velocity</span>
            <Flame size={14} className="text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black italic tracking-tight text-white">
            {currentReactionRate} <span className="text-xs font-normal text-zinc-400 font-mono">/min</span>
          </div>
          <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 mt-1">
            <span className="text-rose-400 font-bold">Total: {summaryMetrics.totalReactions}</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-purple-500/30 p-3 rounded-2xl relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Avg Viewers</span>
            <TrendingUp size={14} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black italic tracking-tight text-white">
            {summaryMetrics.avgViewers}
          </div>
          <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 mt-1">
            <span>Session Stability</span>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-amber-500/30 p-3 rounded-2xl relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Chat Density</span>
            <Zap size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black italic tracking-tight text-white">
            {summaryMetrics.totalComments} <span className="text-xs font-normal text-zinc-400 font-mono">msgs</span>
          </div>
          <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-1 mt-1">
            <span className="text-amber-300 font-bold">Active Chatters</span>
          </div>
        </div>
      </div>

      {/* MAIN RECHARTS VISUALIZATION CONTAINER */}
      <div className="bg-black/60 border border-white/10 rounded-2xl p-3 md:p-4 relative z-10">
        {activeTab === 'overview' ? (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <BarChart2 size={12} className="text-cyan-400" /> Live Viewership & Reaction Timeline
              </span>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-cyan-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff]" /> Viewers
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#fe2c55]" /> Reactions
                </span>
              </div>
            </div>

            <div className={`${compact ? 'h-[180px]' : 'h-[260px]'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GRAPH_COLORS.viewers} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={GRAPH_COLORS.viewers} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReactions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GRAPH_COLORS.reactions} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={GRAPH_COLORS.reactions} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#71717a"
                    tick={{ fontSize: 9, fill: '#a1a1aa' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fontSize: 9, fill: '#a1a1aa' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="viewers"
                    name="Viewers"
                    stroke={GRAPH_COLORS.viewers}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViewers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="reactions"
                    name="Reactions"
                    stroke={GRAPH_COLORS.reactions}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReactions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* EMOJI BREAKDOWN TAB */
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <PieIcon size={12} className="text-rose-400" /> Emoji Reaction Distribution
              </span>
              <span className="text-[10px] font-mono text-rose-400">Total Sent: {summaryMetrics.totalReactions}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className={`${compact ? 'h-[180px]' : 'h-[220px]'} w-full`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieReactionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={ compact ? 35 : 50 }
                      outerRadius={ compact ? 65 : 85 }
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieReactionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.8)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Reaction Legend Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {pieReactionData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-white/5"
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <span className="text-base">{item.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Reaction</span>
                    </span>
                    <span className="font-black text-white font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamMetricsDashboard;
