import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Gift, Coins, RefreshCcw, ArrowDownUp, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VirtualGifts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) setCoins(profile.coins || 0);
    } catch (err) {
      console.error("❌ Token Inventory Sync Error:", err);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const exchangeRate = 0.10; // 1 Coin = 0.10 MWK
  const convertedMwk = (coins * exchangeRate).toFixed(2);

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-white font-sans flex flex-col overflow-hidden relative selection:bg-pink-500/20">
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-2xl z-10 shrink-0">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate(-1)} className="p-2 bg-zinc-900 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </motion.button>
          <h2 className="text-xs font-black tracking-[4px] uppercase italic text-zinc-400">Gift Exchange</h2>
        </div>
        <button onClick={fetchCoins} disabled={syncing} className="p-1.5 rounded-lg hover:bg-white/5">
          <RefreshCcw size={16} className={`text-pink-400 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto pb-12 relative z-10 px-5 py-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Balance Matrix Graphic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-[24px] bg-gradient-to-br from-yellow-500/10 to-transparent">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center mb-3 text-yellow-400 border border-white/10 shadow-md">
                <Coins size={14} />
              </div>
              <p className="text-2xl font-black font-mono italic">{coins.toLocaleString()}</p>
              <p className="text-[8px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Gift Coins Ledger</p>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-[24px] bg-gradient-to-br from-pink-500/10 to-transparent">
              <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center mb-3 text-pink-400 border border-white/10 shadow-md">
                <ArrowDownUp size={14} />
              </div>
              <p className="text-2xl font-black font-mono italic">MK {parseFloat(convertedMwk).toLocaleString()}</p>
              <p className="text-[8px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Liquidation Value</p>
            </div>
          </div>

          {/* Rates Framework Table */}
          <div className="space-y-3">
            <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] px-2">Live Exchange Standard Rates</h3>
            <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-2 backdrop-blur-md divide-y divide-white/5">
              <GiftRow name="Heart Aura" tokenCost={10} valuation="MK 1.00" iconColor="text-rose-500" />
              <GiftRow name="Super Engine" tokenCost={100} valuation="MK 10.00" iconColor="text-cyan-400" />
              <GiftRow name="Universe Matrix" tokenCost={1000} valuation="MK 100.00" iconColor="text-purple-400" />
            </div>
          </div>

          {/* Quick Notice Alert */}
          <div className="p-4 bg-gradient-to-r from-pink-500/10 to-transparent border border-pink-500/10 rounded-2xl flex gap-3 items-center">
            <Zap size={14} className="text-pink-400 shrink-0" />
            <p className="text-[10px] text-zinc-400 leading-tight">Virtual gifts are instantly converted to gift coins balance during stream interactions.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

// Internal Row Component
const GiftRow = ({ name, tokenCost, valuation, iconColor }) => (
  <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors first:rounded-t-2xl last:rounded-b-2xl">
    <div className="flex items-center gap-3">
      <Gift size={16} className={iconColor} />
      <span className="text-xs font-bold text-zinc-200">{name}</span>
    </div>
    <div className="flex items-center gap-4 font-mono text-[11px]">
      <span className="text-zinc-500 font-medium">{tokenCost} Coins</span>
      <span className="text-zinc-300 font-bold">{valuation}</span>
    </div>
  </div>
);

export default VirtualGifts;
