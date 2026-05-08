import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, Users, MessageSquare, DollarSign, 
  Zap, ShieldCheck, Star, ArrowUpRight, Lightbulb,
  Video, ChevronRight, Heart, TrendingUp, RefreshCcw,
  Coins, Crown, Rocket, Gift, BarChart3, LayoutDashboard,
  Settings, ShoppingBag, Radio, Bell, ListVideo, Sparkles, Eye
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const UniverseTools = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [myVideos, setMyVideos] = useState([]);
  const [aiTip, setAiTip] = useState("Analyzing trends...");
  
  const [stats, setStats] = useState({
    views: '0', followers: '0', likes: '0', revenue: '0', coins: '0'
  });

  const creatorTips = [
    "Trending: Use 'glassmorphism' tags to reach more developers.",
    "Peak Hour: Post at 7:00 PM CAT for maximum Malawian reach.",
    "Engagement Tip: Reply to 3 comments to boost video rank.",
    "Monetization: You're close to a payout! Keep streaming."
  ];

  useEffect(() => {
    fetchRealtimeStats();
    setAiTip(creatorTips[Math.floor(Math.random() * creatorTips.length)]);
  }, []);

  const fetchRealtimeStats = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile and Videos in parallel
      const [profileRes, videoRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (videoRes.data) setMyVideos(videoRes.data);

      const totalViews = videoRes.data?.reduce((acc, curr) => acc + (curr.views_count || 0), 0) || 0;
      const totalLikes = videoRes.data?.reduce((acc, curr) => acc + (curr.likes_count || 0), 0) || 0;
      
      // 🔥 REVENUE CALCULATION: 1 Coin = 0.10 MWK
      const rawCoins = profileRes.data?.coins || 0;
      const calculatedRevenue = (rawCoins * 0.10).toFixed(2);

      const formatNum = (n) => n >= 1000 ? (n/1000).toFixed(1)+'K' : n;

      setStats({
        views: formatNum(totalViews),
        followers: formatNum(profileRes.data?.followers_count || 0),
        likes: formatNum(totalLikes),
        revenue: parseFloat(calculatedRevenue).toLocaleString(), 
        coins: formatNum(rawCoins)
      });

    } catch (error) {
      console.error("Studio Sync Error:", error);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-32 overflow-x-hidden">
      {/* --- FX LAYER --- */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* --- HEADER --- */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-2xl z-[100]">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full">
            <ChevronLeft size={20} />
          </motion.button>
          <h2 className="text-sm font-black tracking-[4px] uppercase italic text-zinc-400">Universe Studio</h2>
        </div>
        <div className="flex items-center gap-4">
           <Bell size={18} className="text-zinc-500 hover:text-white transition-colors" />
           <motion.button 
             animate={{ rotate: syncing ? 360 : 0 }} 
             transition={{ repeat: syncing ? Infinity : 0, duration: 1 }}
             onClick={fetchRealtimeStats}
           >
             <RefreshCcw size={18} className="text-cyan-400" />
           </motion.button>
        </div>
      </nav>

      <main className="px-5 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="mb-8 p-5 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 rounded-[30px] flex gap-4 items-center">
                <div className="p-3 bg-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">AI Assistant</p>
                  <p className="text-xs font-bold text-zinc-200 mt-1 leading-relaxed">{aiTip}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <StatCard label="My Coins" value={stats.coins} icon={<Coins size={16}/>} color="from-yellow-500/20" iconColor="text-yellow-400" />
                <StatCard label="Revenue (MWK)" value={`MK ${stats.revenue}`} icon={<DollarSign size={16}/>} color="from-green-500/20" iconColor="text-green-400" />
              </div>

              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-4">Latest Insights</h3>
              <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 mb-8 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Profile Reach</p>
                    <p className="text-3xl font-black italic">{stats.views}</p>
                  </div>
                  <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-bold">+12%</div>
                </div>
                {/* Visualizing Data based on view count strength */}
                <div className="flex gap-1 items-end h-20">
                  {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <div key={i} className="flex-1 bg-cyan-500/20 rounded-t-lg relative group">
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${h}%` }} 
                        className="bg-cyan-500 w-full rounded-t-lg transition-all group-hover:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div key="cont" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
               <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-6">Your Content ({myVideos.length})</h3>
               <div className="space-y-4">
                 {myVideos.length > 0 ? myVideos.map(video => (
                   <div key={video.id} className="bg-zinc-900/50 p-3 rounded-[24px] border border-white/5 flex gap-4 items-center">
                     <div className="w-16 h-20 bg-zinc-800 rounded-xl overflow-hidden relative">
                       <img src={video.thumbnail_url || video.video_url} className="w-full h-full object-cover opacity-50" alt="v" />
                       <Play size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                     </div>
                     <div className="flex-1">
                        <h4 className="text-xs font-bold truncate w-40">{video.caption || "Untitled Video"}</h4>
                        <div className="flex gap-3 mt-2">
                           <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Eye size={10}/> {video.views_count || 0}</span>
                           <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Heart size={10}/> {video.likes_count || 0}</span>
                        </div>
                     </div>
                     <ChevronRight size={18} className="text-zinc-700" />
                   </div>
                 )) : (
                   <div className="text-center py-20 opacity-30 uppercase font-black tracking-widest text-xs">No Videos Found</div>
                 )}
               </div>
            </motion.div>
          )}

          {activeTab === 'monetization' && (
            <motion.div key="mon" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-gradient-to-br from-purple-600 to-blue-700 p-8 rounded-[40px] mb-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <p className="text-[10px] font-black uppercase tracking-[4px] opacity-70">Estimated MWK</p>
                <h2 className="text-4xl font-black italic mt-2">K{stats.revenue}</h2>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/payouts')}
                  className="mt-6 bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
                >
                  Withdraw via Mpamba/Airtel
                </motion.button>
              </div>
              <div className="space-y-3">
                <ToolCard icon={<Crown size={22} className="text-purple-400" />} title="Creator Fund" desc="Earned from high-view count videos" badge="Eligible" />
                <ToolCard icon={<Gift size={22} className="text-pink-500" />} title="Gift Store" desc="1 Coin = 0.10 MWK conversion rate" />
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div key="ana" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[3px] mb-6">Engagement Analytics</h3>
              <div className="space-y-4">
                <div className="bg-zinc-900/50 p-6 rounded-[32px] border border-white/5">
                   <div className="space-y-4">
                      <GeoProgress label="Total Views" percent={100} />
                      <GeoProgress label="Follower Growth" percent={Math.min((parseInt(stats.followers) / 100) * 100, 100)} />
                      <GeoProgress label="Like-to-View Ratio" percent={35} />
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FLOATING NAV --- */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-[40px] p-2 flex items-center justify-around shadow-2xl z-[100]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20}/>} label="Home" />
        <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<ListVideo size={20}/>} label="Videos" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={20}/>} label="Insights" />
        <NavButton active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} icon={<DollarSign size={20}/>} label="Earn" />
      </div>
    </div>
  );
};
// --- COMPONENTS ---

const GeoProgress = ({ label, percent }) => (
  <div>
    <div className="flex justify-between text-[10px] font-bold mb-2">
      <span className="text-zinc-400">{label}</span>
      <span>{percent}%</span>
    </div>
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-cyan-500" />
    </div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <motion.button 
    whileTap={{ scale: 0.9 }}
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 px-5 py-3 rounded-full transition-all ${active ? 'bg-white text-black' : 'text-zinc-500'}`}
  >
    {icon}
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </motion.button>
);

const StatCard = ({ label, value, color, iconColor, icon }) => (
  <div className={`bg-zinc-900/40 border border-white/5 p-5 rounded-[32px] bg-gradient-to-br ${color} to-transparent backdrop-blur-sm`}>
    <div className={`w-8 h-8 rounded-xl bg-black flex items-center justify-center mb-3 ${iconColor} border border-white/10 shadow-lg`}>
      {icon}
    </div>
    <p className="text-xl font-black italic">{value}</p>
    <p className="text-[8px] font-bold text-zinc-500 uppercase mt-1 tracking-widest">{label}</p>
  </div>
);

const ToolCard = ({ icon, title, desc, badge }) => (
  <motion.div whileTap={{ scale: 0.98 }} className="flex items-center gap-4 p-5 bg-[#0D0D0D] border border-white/5 rounded-[28px] cursor-pointer hover:border-white/20 transition-all group">
    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-zinc-900">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h4 className="text-[13px] font-black text-zinc-100">{title}</h4>
        {badge && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-cyan-500 text-black uppercase">{badge}</span>}
      </div>
      <p className="text-[10px] text-zinc-500 mt-1 leading-tight">{desc}</p>
    </div>
    <ChevronRight size={18} className="text-zinc-800 group-hover:text-cyan-400 transition-colors" />
  </motion.div>
);

export default UniverseTools;