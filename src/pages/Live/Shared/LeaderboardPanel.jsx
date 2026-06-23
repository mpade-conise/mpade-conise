// src/pages/Live/Shared/LeaderboardPanel.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { ArrowLeft, BarChart3, Flame, Gem, Loader2 } from 'lucide-react';

const LeaderboardPanel = ({ streamId, onBack }) => {
  const [activeTab, setActiveTab] = useState('gifters'); // 'gifters' | 'hosts'
  const [gifters, setGifters] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [hostRank, setHostRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboardData() {
      setLoading(true);
      try {
        // 1. FETCH PRODUCTION REAL-TIME DATA: TOP GIFTERS FOR THIS STREAM
        // Assumes a 'gift_logs' transaction table with an aggregation layout
        const { data: giftData, error: giftError } = await supabase
          .from('gift_logs')
          .select(`
            sender_id,
            gift_points,
            profiles:sender_id (username, avatar_url)
          `)
          .eq('stream_id', streamId);

        if (!giftError && giftData) {
          // Aggregate points by unique user profiles safely
          const userMap = {};
          giftData.forEach(log => {
            const userId = log.sender_id;
            const username = log.profiles?.username || 'anonymous';
            const avatar = log.profiles?.avatar_url || '👤';
            const points = parseInt(log.gift_points || 0, 10);

            if (!userMap[userId]) {
              userMap[userId] = { username, avatar, points: 0 };
            }
            userMap[userId].points += points;
          });

          const sortedGifters = Object.values(userMap)
            .sort((a, b) => b.points - a.points)
            .map((item, index) => ({
              rank: index + 1,
              username: item.username,
              points: item.points.toLocaleString(),
              avatar: item.avatar.startsWith('http') ? '💎' : item.avatar
            }));
          
          setGifters(sortedGifters.slice(0, 20)); // Cap viewport to top 20 nodes
        }

        // 2. FETCH PRODUCTION REAL-TIME DATA: TRENDING LIVE CHANNELS
        const { data: streamRooms, error: streamError } = await supabase
          .from('live_streams')
          .select(`
            id,
            viewer_count,
            host:host_id (id, username, avatar_url)
          `)
          .eq('status', 'live')
          .order('viewer_count', { ascending: false });

        if (!streamError && streamRooms) {
          let targetedIndexPosition = null;

          const formattedHosts = streamRooms.map((room, index) => {
            const currentRank = index + 1;
            const isCurrentStream = room.id === streamId;
            
            if (isCurrentStream) {
              targetedIndexPosition = currentRank;
            }

            return {
              rank: currentRank,
              username: room.host?.username || 'Host',
              points: (room.viewer_count || 0).toLocaleString(),
              avatar: room.host?.avatar_url?.startsWith('http') ? '👑' : (room.host?.avatar_url || '🎥'),
              isCurrent: isCurrentStream
            };
          });

          setHosts(formattedHosts.slice(0, 20));
          setHostRank(targetedIndexPosition);
        }
      } catch (err) {
        console.error("❌ Failed to resolve pipeline nodes:", err);
      } finally {
        setLoading(false);
      }
    }

    if (streamId) {
      loadLeaderboardData();
    }
  }, [streamId, activeTab]);

  return (
    <div className="h-full flex flex-col space-y-4 text-white font-sans">
      
      {/* Navigation Header */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group"
      >
        <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform" /> 
        Back to Menu
      </button>

      {/* Regional Rank Summary Header Badge */}
      <div className="p-3 bg-gradient-to-r from-zinc-900 to-cyan-950/40 rounded-xl border border-white/5 flex items-center gap-3 shadow-md">
        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <BarChart3 size={20} className="text-cyan-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hourly Trend Node</p>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            {hostRank ? (
              <>Ranked <span className="text-cyan-400 font-black">#{hostRank}</span> in Region</>
            ) : (
              <span className="text-zinc-400 italic">Calculating stream rank...</span>
            )}
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-900/80 rounded-xl border border-white/5 text-xs">
        <button
          onClick={() => setActiveTab('gifters')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'gifters' 
              ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-white/5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Gem size={13} />
          Top Gifters
        </button>
        <button
          onClick={() => setActiveTab('hosts')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'hosts' 
              ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-white/5' 
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Flame size={13} />
          Trending Hosts
        </button>
      </div>

      {/* Loader Engine Viewport state tracking */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 size={20} className="animate-spin text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Querying Matrix Records...</span>
        </div>
      ) : (
        /* Leaderboard Scroll List */
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {(activeTab === 'gifters' ? gifters : hosts).length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500 italic">
              No metrics logged for this window yet.
            </div>
          ) : (
            (activeTab === 'gifters' ? gifters : hosts).map((item) => {
              const isTopThree = item.rank <= 3;
              
              return (
                <div
                  key={`${item.username}-${item.rank}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                    item.isCurrent
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-zinc-900/40 border-white/[0.03] hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Left Side: Rank, Avatar, Profile Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-5 text-center font-sans font-black text-xs">
                      {item.rank === 1 && '🥇'}
                      {item.rank === 2 && '🥈'}
                      {item.rank === 3 && '🥉'}
                      {item.rank > 3 && <span className="text-zinc-500 text-[11px]">{item.rank}</span>}
                    </div>
                    
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-sm shadow-inner">
                      {item.avatar}
                    </div>
                    
                    <div className="truncate max-w-[130px]">
                      <p className={`text-xs font-bold truncate ${item.isCurrent ? 'text-cyan-400' : 'text-zinc-200'}`}>
                        @{item.username}
                      </p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-tight">
                        {activeTab === 'gifters' ? 'Contributed' : 'Viewers'}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Score Metric Badge */}
                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-950/60 border border-white/5 ${
                      isTopThree ? 'text-amber-400' : 'text-zinc-400'
                    }`}>
                      {item.points}
                    </span>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPanel;
