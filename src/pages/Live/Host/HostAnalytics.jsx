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
    <div className="h-screen bg-[#020202] flex items-center justify-center relative overflow-hidden">
      {/* Background Neon Spinner Halos */}
      <div className="absolute w-72 h-72 bg-pink-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse delay-500 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="w-20 h-20 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin shadow-[0_0_25px_rgba(244,63,94,0.8)]" />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-pink-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,1)]">MPADE</div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#030308] text-zinc-100 font-sans selection:bg-pink-500/40 overflow-y-auto no-scrollbar relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Complex Ambient Neon Glows & Floor Reflections */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse delay-1000" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-cyan-950/5 to-black/80 pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 py-10 lg:px-12 relative z-10 flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <nav className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.8)] border border-pink-400/50">
              <Zap size={20} fill="white" className="drop-shadow-[0_0_6px_#ffffff]" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-[0.3em] text-pink-400 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">Mpade Analytics</h2>
              <p className="text-[10px] font-mono text-cyan-400/70 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">SID_{streamId?.slice(0,12)}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 bg-black/40 hover:bg-pink-500/10 border border-pink-500/30 px-6 py-3 rounded-2xl transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:border-pink-500/80 backdrop-blur-md"
          >
            <Home size={16} className="group-hover:text-pink-400 transition-colors drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-pink-100 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]">Exit</span>
          </button>
        </nav>

        {/* Content Header Title */}
        <header className="mb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter uppercase leading-[0.8] mb-6 drop-shadow-[0_0_20px_rgba(254,44,85,0.4)]">
              Stream <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">Summary.</span>
            </h1>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="px-4 py-1.5 bg-pink-500 text-white text-[10px] font-black uppercase rounded-full shadow-[0_0_20px_rgba(244,63,94,0.8)] border border-pink-300/50">Ended</span>
              <p className="text-zinc-300 font-medium tracking-tight">Data report for <span className="text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">"{stats?.title}"</span></p>
              <div className="h-4 w-px bg-pink-500/30 mx-2 hidden md:block" />
              <p className="text-cyan-400/80 text-xs font-mono drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">{new Date().toLocaleDateString()} • {stats?.duration}</p>
            </div>
          </motion.div>
        </header>

        {/* Metrics Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
          <StatCard label="Final Viewers" value={stats?.viewers?.toLocaleString()} icon={<Users className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />} border="border-cyan-500/40" glow="shadow-[0_0_20px_rgba(6,182,212,0.25)]" />
          <StatCard label="Universe Coins" value={stats?.coins?.toLocaleString()} icon={<DollarSign className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />} color="text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" border="border-amber-500/40" glow="shadow-[0_0_20px_rgba(251,191,36,0.25)]" />
          <StatCard label="Peak Reach" value={stats?.peak?.toLocaleString()} icon={<BarChart2 className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />} border="border-purple-500/40" glow="shadow-[0_0_20px_rgba(192,132,252,0.25)]" />
          <StatCard label="Engagement" value={`${stats?.engagement}%`} icon={<Zap className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />} color="text-pink-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" border="border-pink-500/40" glow="shadow-[0_0_20px_rgba(244,63,94,0.25)]" />

          {/* Graphical Pulse Element Section */}
          <div className="lg:col-span-3 bg-black/40 border border-pink-500/30 rounded-[40px] p-8 backdrop-blur-xl relative overflow-hidden flex flex-col shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            {/* Top Internal Reflection Line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400/60 to-transparent" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 mb-1 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">Audience Pulse</h3>
                <p className="text-[10px] text-cyan-400/80 font-mono drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">Interaction density node mapping</p>
              </div>
              <div className="px-3 py-1 bg-pink-500/10 rounded-lg text-[9px] font-bold border border-pink-500/30 text-pink-300 italic shadow-[0_0_10px_rgba(244,63,94,0.3)]">PEAK: {stats?.peak}</div>
            </div>

            <div className="flex-grow flex items-end gap-2 md:gap-3 min-h-[200px] relative z-10">
              {[30, 50, 45, 80, 100, 70, 90, 60, 40, 85, 30].map((h, i) => (
                <motion.div 
                  key={`pulse-bar-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.03, duration: 0.8, ease: "circOut" }}
                  className="flex-1 group relative"
                >
                  {/* Neon Bar Body */}
                  <div className="w-full h-full bg-gradient-to-t from-cyan-500/20 via-pink-500/60 to-pink-400 rounded-t-xl group-hover:brightness-150 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.8)] transition-all shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                  {/* Neon Tip Glow */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#ffffff]" />
                </motion.div>
              ))}
            </div>

            {/* Bottom Reflection Effect */}
            <div className="flex justify-between mt-6 text-[8px] font-black text-pink-300/60 uppercase tracking-[0.4em] border-t border-pink-500/20 pt-4 relative z-10">
              <span className="drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]">Start</span>
              <span className="drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]">Peak Pulse</span>
              <span className="drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]">Session End</span>
            </div>
            
            {/* Floor Ambient Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-pink-500/10 to-transparent pointer-events-none" />
          </div>

          {/* Sidebar Modules */}
          <div className="space-y-4">
            <div className="bg-black/40 border border-amber-500/30 rounded-[32px] p-6 backdrop-blur-xl shadow-[0_0_25px_rgba(251,191,36,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              
              <h3 className="text-[9px] font-black uppercase tracking-widest mb-6 flex items-center justify-between text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                <span className="flex items-center gap-2"><Award size={14} className="drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"/> Top Gifters</span>
              </h3>
              <div className="space-y-4">
                {topFans.length === 0 ? (
                  <p className="text-zinc-500 text-[10px] italic py-2">No gift totals logged.</p>
                ) : (
                  topFans.map((fan) => (
                    <div key={fan.sender_id} className="flex items-center justify-between group p-1.5 rounded-xl hover:bg-amber-500/10 transition-all">
                      <span className="text-[10px] font-bold tracking-tight text-cyan-200 group-hover:text-pink-300 transition-colors drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">@{fan.username}</span>
                      <span className="text-[10px] font-mono font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">{fan.total.toLocaleString()} 🪙</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-black/40 border border-pink-500/30 rounded-[32px] p-6 backdrop-blur-xl shadow-[0_0_25px_rgba(244,63,94,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent" />
              
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={16} className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <h3 className="text-[9px] font-black uppercase tracking-widest text-pink-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]">Stream Health & Growth</h3>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xl font-black italic text-cyan-200 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">0 Flags</p>
                <p className="text-xs font-mono text-emerald-300 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">+{newFollows} Follows</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Pipeline Matrix */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-pink-500/20 mt-10 pt-8 pb-4">
          <ActionButton icon={<Download size={18} className="drop-shadow-[0_0_6px_#ffffff]" />} label="Export Report" primary />
          <ActionButton icon={<Share2 size={18} className="drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]" />} label="Share Statistics" />
          <ActionButton icon={<ArrowUpRight size={18} className="drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />} label="Review Replay" />
        </footer>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = "text-cyan-200 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]", border = "border-cyan-500/30", glow = "shadow-none" }) => (
  <motion.div 
    whileHover={{ y: -4, borderColor: "rgba(244,63,94,0.6)" }}
    className={`bg-black/40 border ${border} p-6 rounded-[32px] backdrop-blur-md transition-all ${glow} relative overflow-hidden`}
  >
    {/* Specular Reflection Highlight */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    
    <div className="flex items-center justify-between mb-6 relative z-10">
      <div className="p-2.5 bg-black/50 border border-white/10 rounded-xl">{icon}</div>
      <div className="text-[7px] font-black text-pink-300 bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(244,63,94,0.4)]">Session</div>
    </div>
    <p className="text-[9px] font-black text-pink-300/80 uppercase tracking-[0.2em] mb-1 relative z-10 drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]">{label}</p>
    <h4 className={`text-4xl font-black italic tracking-tighter leading-none relative z-10 ${color}`}>{value}</h4>
  </motion.div>
);

const ActionButton = ({ icon, label, primary = false }) => (
  <button className={`
    flex items-center justify-center gap-3 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 relative overflow-hidden backdrop-blur-md
    ${primary 
      ? "bg-pink-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.8)] border border-pink-400/50 hover:bg-pink-500 hover:shadow-[0_0_35px_rgba(244,63,94,1)]" 
      : "bg-black/40 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"}
  `}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    {icon} <span className="drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]">{label}</span>
  </button>
);

export default HostAnalytics;
