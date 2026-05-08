import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Sparkles, Zap, Coins, 
  Loader2, ShieldCheck, CreditCard,
  Trophy, Orbit // Added these two to fix the ReferenceError
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const Recharge = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const coinPackages = [
  { 
    id: 1, 
    coins: 500, 
    price: 1000, 
    label: 'Starter', 
    icon: <Zap size={20} />, 
    color: 'from-blue-400 to-blue-600',
    description: 'Perfect for beginners'
  },
  { 
    id: 2, 
    coins: 1500, 
    price: 2500, 
    label: 'Popular', 
    icon: <Sparkles size={20} />, 
    recommended: true,
    color: 'from-cyan-400 to-cyan-600',
    description: 'Most chosen by users'
  },
  { 
    id: 3, 
    coins: 5000, 
    price: 7500, 
    label: 'Pro', 
    icon: <Coins size={20} />, 
    color: 'from-purple-500 to-indigo-600',
    description: 'Best value for active users'
  },
  { 
    id: 4, 
    coins: 12000, 
    price: 15000, 
    label: 'Elite', 
    icon: <Trophy size={20} />, 
    color: 'from-amber-400 to-orange-600',
    description: 'Get 2,000 bonus coins!' 
  },
  { 
    id: 5, 
    coins: 30000, 
    price: 35000, 
    label: 'Universe', 
    icon: <Orbit size={20} />, 
    color: 'from-pink-500 to-rose-600',
    description: 'Ultimate power for whales'
  }
];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(data);
    }
  };

  const handlePurchase = async (pkg) => {
    if (loading || !userProfile) return;
    setLoading(true);

    // Format: RCG-[TIMESTAMP]-[COINS_TO_ADD]-[USER_ID]
    // The Edge Function will split this by '-' to identify the transaction details safely
    const transactionRef = `RCG-${Date.now()}-${pkg.coins}-${userProfile.id}`;

    try {
      const response = await fetch('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PAYCHANGU_SECRET_KEY}` 
        },
        body: JSON.stringify({
          amount: pkg.price,
          currency: "MWK",
          email: userProfile.email || "user@mpade.com",
          first_name: userProfile.username || "Universe",
          last_name: "Member",
          tx_ref: transactionRef,
          callback_url: `${window.location.origin}/payment-verify`, 
          return_url: window.location.href,
          customization: {
            title: "Universe Credits",
            description: `Buying ${pkg.coins} Coins`
          }
        })
      });

      const data = await response.json();

      if (data.status === 'success' && data.data.checkout_url) {
        // Hand off to PayChangu's secure hosted page
        window.location.href = data.data.checkout_url;
      } else {
        throw new Error(data.message || "Initialization failed");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Could not connect to payment gateway. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />

      <nav className="flex items-center justify-between px-6 py-5 sticky top-0 bg-black/50 backdrop-blur-xl z-50 border-b border-white/5">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full">
          <ChevronLeft size={24} />
        </motion.button>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">Universe Bank</span>
        <div className="w-10" />
      </nav>

      <main className="px-6 pt-10 pb-24 relative z-10 max-w-lg mx-auto">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 rounded-full mb-4">
            <ShieldCheck size={14} className="text-cyan-400" />
            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Encrypted Checkout</span>
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter mb-2 text-white">Recharge Credits</h2>
          <p className="text-zinc-500 text-xs font-medium">Instant top-up via Airtel Money or TNM Mpamba</p>
        </header>

        <div className="space-y-4">
          {coinPackages.map((pkg) => (
            <motion.div
              key={pkg.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePurchase(pkg)}
              className={`relative overflow-hidden p-6 rounded-[35px] border transition-all cursor-pointer ${
                pkg.recommended ? 'bg-zinc-900 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'bg-zinc-900/50 border-white/5'
              }`}
            >
              {pkg.recommended && (
                <div className="absolute top-0 right-10 bg-cyan-500 text-black text-[8px] font-black px-4 py-1 rounded-b-xl uppercase tracking-tighter">
                  Popular Choice
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${pkg.recommended ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white'}`}>
                    {pkg.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic text-white">{pkg.coins} Coins</h3>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{pkg.label} Bundle</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black tracking-tighter text-white">K{pkg.price.toLocaleString()}</p>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">MWK</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-[40px] bg-gradient-to-br from-zinc-900 to-black border border-white/5 text-center">
           <CreditCard className="mx-auto mb-4 text-zinc-700" size={32} />
           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
             Secure payment powered by PayChangu.<br />
             Funds are credited instantly after verification.
           </p>
        </div>
      </main>

      {/* Modern transition loader */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-cyan-500 mb-6" size={48} />
          <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Establishing Secure Connection...</p>
        </div>
      )}
    </div>
  );
};

export default Recharge;