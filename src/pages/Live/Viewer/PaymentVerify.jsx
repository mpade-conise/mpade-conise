import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient'; // Adjust path as needed
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    const handleVerification = async () => {
      const tx_ref = searchParams.get('tx_ref');
      const statusFromUrl = searchParams.get('status');

      // If PayChangu says it's a success in the URL, verify it server-side
      if (statusFromUrl === 'success' && tx_ref) {
        try {
          // Call the Edge Function we just deployed
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { tx_ref: tx_ref }
          });

          if (error || !data?.success) {
            throw new Error('Verification failed');
          }

          setStatus('success');
          // Wait 3 seconds so they can see the success message, then go home
          setTimeout(() => navigate('/Liveplayer'), 3000);
        } catch (err) {
          console.error('Edge Function Error:', err);
          setStatus('error');
        }
      } else {
        setStatus('error');
      }
    };

    handleVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-sm w-full">
        {status === 'verifying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="animate-spin text-cyan-500 mx-auto mb-6" size={48} />
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white">Verifying Payment</h2>
            <p className="text-zinc-500 text-xs mt-2 uppercase font-bold tracking-widest">Securing your credits...</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-20 h-20 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <CheckCircle2 className="text-cyan-400" size={40} />
            </div>
            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Credits Added!</h2>
            <p className="text-zinc-400 text-sm mt-3 font-medium">Your Universe balance has been updated.</p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <XCircle className="text-red-500 mx-auto mb-6" size={64} />
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Transaction Failed</h2>
            <p className="text-zinc-500 text-sm mt-3 mb-8">We couldn't verify your payment. If funds were deducted, please contact support.</p>
            <button 
              onClick={() => navigate('/recharge')}
              className="w-full py-4 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>

      <footer className="fixed bottom-10 left-0 w-full flex justify-center gap-2 opacity-30">
        <ShieldCheck size={12} />
        <span className="text-[8px] font-black uppercase tracking-widest">Universe Secure Protocol</span>
      </footer>
    </div>
  );
};

export default PaymentVerify;