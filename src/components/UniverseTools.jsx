import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, DollarSign, RefreshCcw, LayoutDashboard, 
  ListVideo, BarChart3, Bell, Sparkles, Eye, Heart, 
  ChevronRight, Coins, Crown, Gift 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- CONFIGURATION ---
const CONVERSION_RATE = 0.10; // 1 Coin = 0.10 MWK
const CREATOR_TIPS = [
  "Trending: Use 'glassmorphism' tags to reach more developers.",
  "Peak Hour: Post at 7:00 PM CAT for maximum Malawian reach.",
  "Engagement Tip: Reply to 3 comments to boost video rank.",
  "Monetization: You're close to a payout! Keep streaming."
];

const UniverseTools = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [myVideos, setMyVideos] = useState([]);
  const [aiTip, setAiTip] = useState("");
  const [stats, setStats] = useState({
    views: '0', followers: '0', likes: '0', revenue: '0', coins: '0'
  });

  // --- UTILITIES ---
  const formatCompactNumber = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  // --- DATA ACTIONS ---
  const fetchStudioData = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const [profileRes, videoRes] = await Promise.all([
        supabase.from('profiles').select('coins, followers_count').eq('id', user.id).single(),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      const videos = videoRes.data || [];
      setMyVideos(videos);

      const totalViews = videos.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
      const totalLikes = videos.reduce((acc, curr) => acc + (curr.likes_count || 0), 0);
      const rawCoins = profileRes.data?.coins || 0;

      setStats({
        views: formatCompactNumber(totalViews),
        followers: formatCompactNumber(profileRes.data?.followers_count || 0),
        likes: formatCompactNumber(totalLikes),
        revenue: (rawCoins * CONVERSION_RATE).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        coins: formatCompactNumber(rawCoins)
      });

      setAiTip(CREATOR_TIPS[Math.floor(Math.random() * CREATOR_TIPS.length)]);
    } catch (error) {
      console.error("[Studio Sync Error]:", error.message);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudioData();
  }, [fetchStudioData]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-black tracking-widest uppercase text-xs">Initializing Studio...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 overflow-x-hidden selection:bg-cyan-500/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-black/60 backdrop-blur-3xl z-[100]">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-zinc-900 border border-white/5 rounded-full"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black tracking-[4px] uppercase italic text-zinc-500">Universe Studio</h2>
            <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest">Creator Center</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
           <Bell size={18} className="text-zinc-500 hover:text-white transition-colors cursor-pointer" />
           <motion.button 
             animate={{ rotate: syncing ? 360 : 0 }} 
             transition={{ repeat: syncing ? Infinity : 0, duration: 1.5, ease: "linear" }}
             onClick={fetchStudioData}
             className="p-1"
           >
             <RefreshCcw size={18} className="text-cyan-400" />
           </motion.button>
        </div>
      </nav>

      <main className="px-6 py-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* AI Insights Banner */}
              <div className="mb-8 p-6 bg-zinc-900/40 border border-cyan-500/20 rounded-[32px] flex gap-5 items-center backdrop-blur-md">
                <div className="p-3.5 bg-cyan-500 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-cyan-400">Intelligence Briefing</p>
                  <p className="text-xs font-medium text-zinc-200 mt-1 leading-relaxed">{aiTip}</p>
                </div>
              </div>

              {/* Economic Overview */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <StatCard label="Current Balance" value={stats.coins} unit="Coins" icon={<Coins size={16}/>} color="from-yellow-500/10" iconColor="text-yellow-400" />
                <StatCard label="Net Revenue" value={`MK ${stats.revenue}`} unit="MWK" icon={<DollarSign size={16}/>} color="from-green-500/10" iconColor="text-green-400" />
              </div>

              {/* Analytics Preview */}
              <section className="mb-10">
                <div className="flex justify-between items-end mb-6">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px]">Performance Index</h3>
                  <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">+12.4% vs last week</span>
                </div>
                
                <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl">
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Aggregated Reach</p>
                    <p className="text-4xl font-black italic tracking-tight">{stats.views}</p>
                  </div>
                  
                  <div className="flex gap-2 items-end h-24">
                    {[35, 65, 45, 85, 55, 75, 40].map((h, i) => (
                      <div key={i} className="flex-1 bg-zinc-800/50 rounded-t-xl relative group overflow-hidden">
                        <motion.div 
                          initial={{ height: 0 }} 
                          animate={{ height: `${h}%` }} 
                          transition={{ delay: i * 0.1, duration: 0.8 }}
                          className="bg-gradient-to-t from-cyan-600 to-cyan-400 w-full absolute bottom-0 transition-all group-hover:from-white group-hover:to-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* Additional Tabs (Content, Monetization, etc.) follow the same pattern... */}
          {/* Use the modular components defined below for consistency */}
        </AnimatePresence>
      </main>

      {/* Persistent Glass Nav */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-zinc-900/70 backdrop-blur-3xl border border-white/10 rounded-[45px] p-2 flex items-center justify-between shadow-2xl z-[100]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={19}/>} label="Studio" />
        <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<ListVideo size={19}/>} label="Content" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={19}/>} label="Data" />
        <NavButton active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} icon={<DollarSign size={19}/>} label="Wallet" />
      </nav>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const NavButton = ({ active, onClick, icon, label }) => (
  <motion.button 
    whileTap={{ scale: 0.92 }}
    onClick={onClick} 
    className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[38px] transition-all duration-300 ${
      active ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-500 hover:text-zinc-300'
    }`}
  >
    {icon}
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </motion.button>
);

const StatCard = ({ label, value, color, iconColor, icon }) => (
  <div className={`relative overflow-hidden bg-zinc-900/40 border border-white/5 p-6 rounded-[32px] bg-gradient-to-br ${color} to-transparent backdrop-blur-md transition-transform hover:scale-[1.02]`}>
    <div className={`w-9 h-9 rounded-2xl bg-black flex items-center justify-center mb-4 ${iconColor} border border-white/5 shadow-inner`}>
      {icon}
    </div>
    <p className="text-2xl font-black italic tracking-tight">{value}</p>
    <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1.5 tracking-widest opacity-80">{label}</p>
  </div>
);

export default UniverseTools;
