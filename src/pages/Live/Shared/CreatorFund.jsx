import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Crown, Sparkles, BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CreatorFund = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ views: 0, points: 0, estimatedPayout: 0 });

  useEffect(() => {
    const calculateFundMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: videos } = await supabase
          .from('videos')
          .select('views_count, likes_count')
          .eq('user_id', user.id);

        const totalViews = videos?.reduce((acc, curr) => acc + (parseInt(curr.views_count || 0, 10)), 0) || 0;
        const totalLikes = videos?.reduce((acc, curr) => acc + (parseInt(curr.likes_count || 0, 10)), 0) || 0;

        // Mpade Algorithmic Fund Weight Equation
        const engagementPoints = (totalViews * 1.2) + (totalLikes * 3.5);
        const payoutMwk = engagementPoints * 0.05;

        setMetrics({
          views: totalViews,
          points: Math.round(engagementPoints),
          estimatedPayout: payoutMwk.toFixed(2)
        });
      } catch (err) {
        console.error("❌ Fund Matrix Compilation Error:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateFundMetrics();
  }, []);

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-white font-sans flex flex-col overflow-hidden relative selection:bg-purple-500/20">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-2xl z-10 shrink-0">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate(-1)} className="p-2 bg-zinc-900 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </motion.button>
          <h2 className="text-xs font-black tracking-[4px] uppercase italic text-zinc-400">Creator Fund</h2>
        </div>
        <Crown size={18} className="text-purple-400" />
      </nav>

      <div className="flex-1 overflow-y-auto pb-12 relative z-10 px-5 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Main Earnings Panel */}
          <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/40 to-black p-8 rounded-[36px] text-center border border-purple-500/20 shadow-2xl">
            <p className="text-[9px] font-black uppercase tracking-[3px] text-purple-400">Accrued Month Pool Yield</p>
            <h2 className="text-4xl font-black italic mt-2 tracking-tighter font-mono text-zinc-100">MK {parseFloat(metrics.estimatedPayout).toLocaleString()}</h2>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-mono text-purple-300">
              <TrendingUp size={10} /> +14.2% Growth Velocity
            </div>
          </div>

          {/* Breakdown Array */}
          <div className="space-y-3">
            <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] px-2">Weight Evaluation Sub-Metrics</h3>
            <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-6 space-y-4 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs text-zinc-400 font-medium">Aggregate Qualified Views</span>
                <span className="text-sm font-bold font-mono">{metrics.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs text-zinc-400 font-medium">Algorithmic Weight Points</span>
                <span className="text-sm font-bold font-mono text-purple-400">{metrics.points.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-medium">Distribution Status</span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wide">Active Collection</span>
              </div>
            </div>
          </div>

          {/* Knowledge Card */}
          <div className="p-5 bg-zinc-900/20 border border-white/5 rounded-[24px] flex gap-4 items-start">
            <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-200">How payouts are processed</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">The fund balances optimize dynamically every 24 hours based on video retention index curves, regional organic interactions, and direct audience extraction counts across Mpade.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreatorFund;
