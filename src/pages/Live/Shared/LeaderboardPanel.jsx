// src/pages/Live/Shared/LeaderboardPanel.jsx
import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Trophy, Flame, Gem } from 'lucide-react';

const LeaderboardPanel = ({ streamId, onBack }) => {
  const [activeTab, setActiveTab] = useState('gifters'); // 'gifters' | 'hosts'

  // Mock data matching the dynamic streaming environment setup
  const topGifters = [
    { rank: 1, username: 'alpha_malawi', points: '45,200', avatar: '🇲🇼' },
    { rank: 2, username: 'crypto_king', points: '38,900', avatar: '💎' },
    { rank: 3, username: 'chiza_tech', points: '29,450', avatar: '🔥' },
    { rank: 4, username: 'matrix_runner', points: '18,200', avatar: '💻' },
    { rank: 5, username: 'zodiak_fan', points: '12,100', avatar: '🎧' },
  ];

  const trendingHosts = [
    { rank: 1, username: 'mpade_official', points: '120k', avatar: '👑' },
    { rank: 2, username: 'stream_queen', points: '94k', avatar: '✨' },
    { rank: 3, username: 'blantyre_vibes', points: '81k', avatar: '🎵' },
    { rank: 14, username: 'you_are_here', points: '14k', avatar: '🚀', isCurrent: true },
  ];

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
            Ranked <span className="text-cyan-400 font-black">#14</span> in Region
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

      {/* Leaderboard Scroll List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
        {(activeTab === 'gifters' ? topGifters : trendingHosts).map((item) => {
          const isTopThree = item.rank <= 3;
          
          return (
            <div
              key={item.rank}
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
                    {activeTab === 'gifters' ? 'Contributed' : 'Score'}
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
        })}
      </div>
    </div>
  );
};

export default LeaderboardPanel;
