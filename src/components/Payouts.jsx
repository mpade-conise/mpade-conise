import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, ArrowRightLeft, Wallet, Loader2, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Payout = () => {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [provider, setProvider] = useState('TNM');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { fetchBalance(); }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');
    const { data } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
    setCoins(data?.coins || 0);
  };

  const handleWithdraw = async () => {
    setErrorMsg('');
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { 
          amountInCoins: parseInt(withdrawAmount),
          mobileNumber,
          mobileProvider: provider,
          userId: user.id
        }
      });

      if (error) {
        const errJson = await error.context.json();
        throw new Error(errJson.error || "Server error");
      }

      if (data?.success) {
        alert("Success! Cashout initiated.");
        setWithdrawAmount('');
        fetchBalance();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const receiveAmount = withdrawAmount ? Math.floor(withdrawAmount * 0.7) : 0;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <nav className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full"><ChevronLeft /></button>
        <h1 className="text-xl font-black italic text-cyan-500 uppercase">Universe Cashout</h1>
      </nav>

      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-gradient-to-br from-cyan-600 to-blue-800 p-8 rounded-[40px] mb-8 relative overflow-hidden">
        <p className="text-[10px] font-black uppercase opacity-70">Current Balance</p>
        <h2 className="text-5xl font-black italic">{coins.toLocaleString()}</h2>
        <Wallet className="absolute -bottom-4 -right-4 opacity-10" size={120} />
      </motion.div>

      <div className="space-y-6 max-w-md mx-auto">
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
              <AlertCircle size={16} /> {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <input 
          type="number" placeholder="Amount (Min 500)" value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          className="w-full bg-zinc-900 border border-white/5 p-6 rounded-[30px] text-3xl font-black outline-none focus:border-cyan-500"
        />

        <div className="bg-zinc-900 border border-white/5 p-6 rounded-[30px] flex justify-between items-center italic">
          <p className="text-green-400 font-black">You Get: K{receiveAmount.toLocaleString()}</p>
          <p className="text-zinc-500 text-xs">Fee: 30%</p>
        </div>

        <div className="flex gap-3">
          {['TNM', 'Airtel'].map((op) => (
            <button key={op} onClick={() => setProvider(op)} 
              className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${provider === op ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-zinc-900 bg-zinc-900 text-zinc-500'}`}>
              {op}
            </button>
          ))}
        </div>

        <input 
          type="tel" placeholder="088... or 099..." value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          className="w-full bg-zinc-900 border border-white/5 p-5 rounded-[25px] font-bold outline-none"
        />

        <motion.button 
          whileTap={{ scale: 0.98 }} disabled={loading || coins < 500} onClick={handleWithdraw}
          className="w-full bg-white text-black py-6 rounded-[35px] font-black uppercase flex items-center justify-center gap-3 disabled:opacity-20 transition-all hover:bg-cyan-500"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Landmark /> Confirm Withdrawal</>}
        </motion.button>
      </div>
    </div>
  );
};

export default Payout;