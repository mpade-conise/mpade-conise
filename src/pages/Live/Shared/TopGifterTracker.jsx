import React from 'react';
import { ArrowLeft, Award } from 'lucide-react';

const TopGifterTracker = ({ streamId, onBack }) => {
  const users = [
    { rank: 1, name: 'MalawiKing', coins: '14,200' },
    { rank: 2, name: 'TNM_Guy', coins: '8,900' },
    { rank: 3, name: 'ChaloDev', coins: '4,100' }
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <div className="space-y-1.5">
        {users.map((user) => (
          <div key={user.rank} className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-xl border border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded-md font-black text-[10px] ${
                user.rank === 1 ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>{user.rank}</span>
              <span className="font-semibold text-zinc-200">@{user.name}</span>
            </div>
            <span className="font-bold text-cyan-400">{user.coins} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopGifterTracker;
