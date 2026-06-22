import React from 'react';
import { ArrowLeft, Gift } from 'lucide-react';

const GiftSender = ({ streamId, onBack }) => {
  const mockGifts = [
    { id: 'g1', name: 'Zondle', cost: '10 Coins', icon: '🔥' },
    { id: 'g2', name: 'Chalo', cost: '50 Coins', icon: '💎' },
    { id: 'g3', name: 'Kwacha Burst', cost: '100 Coins', icon: '🚀' }
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Menu
      </button>
      <p className="text-[11px] text-zinc-400 px-1">Trigger server sandbox gifts to verify system alert routing overlays.</p>
      <div className="grid grid-cols-1 gap-2">
        {mockGifts.map((gift) => (
          <button key={gift.id} className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 flex items-center justify-between text-left transition-all">
            <div className="flex items-center gap-2">
              <span className="text-lg">{gift.icon}</span>
              <div>
                <p className="text-xs font-bold text-white">{gift.name}</p>
                <p className="text-[10px] text-zinc-500">{gift.cost}</p>
              </div>
            </div>
            <Gift size={14} className="text-zinc-500" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default GiftSender;
