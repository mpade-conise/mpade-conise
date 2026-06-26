// src/pages/Live/Shared/TopGifterTracker.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { ArrowLeft, Loader2 } from 'lucide-react';

const TopGifterTracker = ({ streamId, onBack }) => {
  const [gifters, setGifters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopGifters() {
      if (!streamId) return;
      setLoading(true);
      try {
        const { data: giftData, error: giftError } = await supabase
          .from('live_gifts')
          .select(`
            sender_id,
            price_total,
            profiles:sender_id (username)
          `)
          .eq('stream_id', streamId);

        if (giftError) {
          console.warn("⚠️ live_gifts row fetch unresolvable on tracker:", giftError.message);
          setGifters([]);
        } else if (giftData) {
          // Process and group gift totals per user
          const userMap = {};
          giftData.forEach(log => {
            const userId = log.sender_id;
            const username = log.profiles?.username || 'anonymous';
            const coins = parseInt(log.price_total || 0, 10);

            if (!userMap[userId]) {
              userMap[userId] = { name: username, coins: 0 };
            }
            userMap[userId].coins += coins;
          });

          // Sort descending and format array structure
          const sorted = Object.values(userMap)
            .sort((a, b) => b.coins - a.coins)
            .map((item, index) => ({
              rank: index + 1,
              name: item.name,
              coins: item.coins.toLocaleString()
            }));

          setGifters(sorted.slice(0, 10)); // Keep to top 10 rows for tracking summary panels
        }
      } catch (err) {
        console.error("❌ Tracker aggregation breakdown:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopGifters();
  }, [streamId]);

  return (
    <div className="space-y-4 text-white font-sans">
      {/* Back Switch Navigation Control */}
      <button 
        onClick={onBack} 
        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors w-fit group"
      >
        <ArrowLeft size={14} className="transform group-hover:-translate-x-0.5 transition-transform" /> 
        Back to Menu
      </button>

      {/* Render Lifecycle Wrapper */}
      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center text-zinc-500 gap-1.5">
          <Loader2 size={16} className="animate-spin text-cyan-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Syncing Ledger Node...</span>
        </div>
      ) : gifters.length === 0 ? (
        <div className="text-center py-6 text-xs text-zinc-500 italic">
          No gift events logged for this session.
        </div>
      ) : (
        /* Dynamic Tracker Item Grid Wrapper */
        <div className="space-y-1.5">
          {gifters.map((user) => (
            <div 
              key={`${user.name}-${user.rank}`} 
              className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-white/[0.03] hover:bg-zinc-900/70 rounded-xl text-xs transition-all"
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 flex items-center justify-center rounded-md font-black text-[10px] ${
                  user.rank === 1 ? 'bg-amber-400 text-black' : 
                  user.rank === 2 ? 'bg-zinc-300 text-black' :
                  user.rank === 3 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {user.rank}
                </span>
                <span className="font-semibold text-zinc-200">@{user.name}</span>
              </div>
              <span className="font-bold font-mono text-cyan-400">{user.coins} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopGifterTracker;
