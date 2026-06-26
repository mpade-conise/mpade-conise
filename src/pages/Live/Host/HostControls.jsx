// src/pages/Live/Shared/HostAnalytics.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { 
  Users, Clock, Home, DollarSign, 
  ShieldCheck, Zap, BarChart2, Award,
  ArrowUpRight, Share2, Download
} from 'lucide-react';
import { motion } from 'framer-motion';

const HostAnalytics = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topFans, setTopFans] = useState([]);
  const [newFollows, setNewFollows] = useState(0);

  useEffect(() => {
    const fetchUniverseData = async () => {
      try {
        const { data: ana, error: anaErr } = await supabase
          .from('stream_analytics')
          .select(`*, live_streams(*)`)
          .eq('stream_id', streamId)
          .maybeSingle();

        if (anaErr) throw anaErr;
        const stream = ana?.live_streams;

        // Fetching structural raw transactional gift lines
        const { data: gifts } = await supabase
          .from('live_gifts')
          .select(`sender_id, price_total, profiles:sender_id(username)`)
          .eq('stream_id', streamId);

        // Aggregate records per sender account safely
        if (gifts) {
          const userAggregationMap = {};
          gifts.forEach(row => {
            const uid = row.sender_id;
            const uname = row.profiles?.username || 'anonymous';
            const value = parseInt(row.price_total || 0, 10);

            if (!userAggregationMap[uid]) {
              userAggregationMap[uid] = { sender_id: uid, username: uname, total: 0 };
            }
            userAggregationMap[uid].total += value;
          });

          const sortedFans = Object.values(userAggregationMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);

          setTopFans(sortedFans);
        }

        if (stream) {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', stream.host_id)
            .gte('created_at', stream.started_at)
            .lte('created_at', stream.ended_at || new Date().toISOString());
          setNewFollows(count || 0);
        }

        const baselineViewers = ana?.final_viewers || 0;
        const baselineLikes = ana?.total_likes || 0;

        setStats({
          title: stream?.title || "Untitled Session",
          viewers: baselineViewers,
          coins: ana?.total_gifts_value || 0,
          duration: ana?.duration || "00:00:00",
          peak: ana?.peak_viewers || 0,
          likes: baselineLikes,
          engagement: baselineViewers > 0 
            ? ((baselineLikes / baselineViewers) * 10).toFixed(1) 
            : "0.0"
        });
      } catch (err) {
        console.error("❌ Universe Sync Failed:", err.message);
      } finally {
        setLoading(false); // Corrected syntax safely
      }
    };

    if (streamId) fetchUniverseData();
  }, [streamId]);

  if (loading) return (
    <div className="h-screen bg-[#020202] flex items-center justify-center">
      <div className="relative">
        <div className="w-20 h-20 border-2 border-[#fe2c55]/20 border-t-[#fe2c55] rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#fe2c55] animate-pulse">MPADE</div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#050505] text-zinc-100 font-sans selection:bg-[#fe2c55]/30 overflow-y-auto no-scrollbar">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Decorative Blur Backdrops */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#fe2c55]/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-10 lg:px-12 relative z-10 flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <nav className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#fe2c55] to-[#ff6b81] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(254,44,85,0.4)]">
              <Zap size={20} fill="white" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase">Mpade Analytics</h2>
              <p className="text-[10px] font-mono text-zinc-600">SID_{streamId?.slice(0,12)}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all active:scale-95"
          >
            <Home size={16} className="group-hover:text-[#fe2c55] transition-colors" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Exit</span>
          </button>
        </nav>

        {/* Content Header Title */}
        <header className="mb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter uppercase leading-[0.8] mb-6">
              Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Summary.</span>
            </h1>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="px-4 py-1.5 bg-[#fe2c55] text-white text-[10px] font-black uppercase rounded-full shadow-[0_0_15px_rgba(254,44,85,0.3)]">Ended</span>
              <p className="text-zinc-400 font-medium tracking-tight">Data report for <span className="text-white font-bold">"{stats?.title}"</span></p>
              <div className="h-4 w-px bg-zinc-800 mx-2 hidden md:block" />
              <p className="text-zinc-500 text-xs font-mono">{new Date().toLocaleDateString()} • {stats?.duration}</p>
            </div>
          </motion.div>
        </header>

        {/* Metrics Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
          <StatCard label="Final Viewers" value={stats?.viewers?.toLocaleString()} icon={<Users />} />
          <StatCard label="Universe Coins" value={stats?.coins?.toLocaleString()} icon={<DollarSign />} color="text-yellow-400" glow="shadow-yellow-500/10" />
          <StatCard label="Peak Reach" value={stats?.peak?.toLocaleString()} icon={<BarChart2 />} />
          <StatCard label="Engagement" value={`${stats?.engagement}%`} icon={<Zap />} color="text-[#fe2c55]" />

          {/* Graphical Pulse Element Section */}
          <div className="lg:col-span-3 bg-zinc-900/20 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Audience Pulse</h3>
                <p className="text-[10px] text-zinc-600 font-mono">Interaction density node mapping</p>
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 italic">PEAK: {stats?.peak}</div>
            </div>

            <div className="flex-grow flex items-end gap-2 md:gap-3 min-h-[200px]">
              {[30, 50, 45, 80, 100, 70, 90, 60, 40, 85, 30].map((h, i) => (
                <motion.div 
                  key={`pulse-bar-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.03, duration: 0.8, ease: "circOut" }}
                  className="flex-1 group relative"
                >
                  <div className="w-full h-full bg-gradient-to-t from-[#fe2c55]/5 via-[#fe2c55]/30 to-[#fe2c55] rounded-t-xl group-hover:brightness-125 transition-all" />
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] border-t border-white/5 pt-4">
              <span>Start</span>
              <span>Peak Pulse</span>
              <span>Session End</span>
            </div>
          </div>

          {/* Sidebar Modules */}
          <div className="space-y-4">
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">
              <h3 className="text-[9px] font-black uppercase tracking-widest mb-6 flex items-center justify-between text-yellow-500">
                <span className="flex items-center gap-2"><Award size={14}/> Top Gifters</span>
              </h3>
              <div className="space-y-4">
                {topFans.length === 0 ? (
                  <p className="text-zinc-600 text-[10px] italic py-2">No gift totals logged.</p>
                ) : (
                  topFans.map((fan) => (
                    <div key={fan.sender_id} className="flex items-center justify-between group">
                      <span className="text-[10px] font-bold tracking-tight text-zinc-300">@{fan.username}</span>
                      <span className="text-[10px] font-mono font-black text-yellow-400">{fan.total.toLocaleString()} 🪙</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#fe2c55]/5 border border-[#fe2c55]/10 rounded-[32px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={16} className="text-[#fe2c55]" />
                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Stream Health & Growth</h3>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xl font-black italic text-zinc-100">0 Flags</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">+{newFollows} Follows</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Pipeline Matrix */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 mt-10 pt-8 pb-4">
          <ActionButton icon={<Download size={18}/>} label="Export Report" primary />
          <ActionButton icon={<Share2 size={18}/>} label="Share Statistics" />
          <ActionButton icon={<ArrowUpRight size={18}/>} label="Review Replay" />
        </footer>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "text-white", glow = "shadow-transparent" }) => (
  <motion.div 
    whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.08)" }}
    className={`bg-zinc-900/40 border border-white/5 p-6 rounded-[32px] backdrop-blur-md transition-all ${glow}`}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="p-2 bg-white/5 rounded-xl text-zinc-400">{icon}</div>
      <div className="text-[7px] font-black text-[#fe2c55] bg-[#fe2c55]/10 px-2 py-0.5 rounded uppercase tracking-wider">Session</div>
    </div>
    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">{label}</p>
    <h4 className={`text-4xl font-black italic tracking-tighter leading-none ${color}`}>{value}</h4>
  </motion.div>
);

const ActionButton = ({ icon, label, primary = false }) => (
  <button className={`
    flex items-center justify-center gap-3 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95
    ${primary 
      ? "bg-[#fe2c55] text-white shadow-[0_10px_30px_rgba(254,44,85,0.3)] hover:brightness-110" 
      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"}
  `}>
    {icon} {label}
  </button>
);

export default HostAnalytics;
