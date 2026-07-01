// src/pages/Live/Shared/UniverseTools.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, DollarSign, Zap, ArrowUpRight, 
  ChevronRight, Heart, RefreshCcw, Coins, Crown, Gift, 
  BarChart3, LayoutDashboard, ListVideo, Sparkles, Eye, 
  Bell, Video, FileText
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const UniverseTools = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [myVideos, setMyVideos] = useState([]);
  const [aiTip, setAiTip] = useState("Analyzing trends...");
  
  // Drawer states
  const [selectedVideo, setSelectedVideo] = useState(null); 
  const [drawerMode, setDrawerMode] = useState('metrics'); // 'metrics' | 'preview'

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

      const [profileRes, videoRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (videoRes?.data) setMyVideos(videoRes.data);

      const totalViews = videoRes?.data?.reduce((acc, curr) => acc + (parseInt(curr.views_count || 0, 10)), 0) || 0;
      const totalLikes = videoRes?.data?.reduce((acc, curr) => acc + (parseInt(curr.likes_count || 0, 10)), 0) || 0;
      
      const rawCoins = profileRes?.data?.coins || 0;
      const calculatedRevenue = (rawCoins * 0.10).toFixed(2);

      const formatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n;

      setStats({
        views: formatNum(totalViews),
        followers: formatNum(profileRes?.data?.followers_count || 0),
        likes: formatNum(totalLikes),
        revenue: parseFloat(calculatedRevenue).toLocaleString(), 
        coins: formatNum(rawCoins)
      });

    } catch (error) {
      console.error("❌ Studio Pipeline Sync Error:", error);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const handleOpenDrawer = (video) => {
    setSelectedVideo(video);
    setDrawerMode('metrics');
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen w-full bg-black text-white font-sans flex flex-col overflow-hidden relative selection:bg-cyan-500/20">
      
      {/* Tailwind Custom Track Scrolling Configurations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-studio::-webkit-scrollbar { width: 5px; }
        .scrollbar-studio::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-studio::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.04); border-radius: 99px; }
        .scrollbar-studio::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.15); }
      `}} />

      {/* Atmospheric Ambient Glow Background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Sticky App Nav Header */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-2xl z-[100] shrink-0">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate(-1)} className="p-2 bg-zinc-900 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </motion.button>
          <h2 className="text-xs font-black tracking-[4px] uppercase italic text-zinc-400">Universe Studio</h2>
        </div>
        <div className="flex items-center gap-4">
           <Bell size={16} className="text-zinc-500 hover:text-white transition-colors cursor-pointer" />
           <button 
             onClick={fetchRealtimeStats}
             disabled={syncing}
             className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all"
           >
             <RefreshCcw size={16} className={`text-cyan-400 ${syncing ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </nav>

      {/* Main Container Content Canvas */}
      <div className="flex-1 overflow-y-auto scrollbar-studio pb-36 relative z-10">
        <main className="max-w-2xl mx-auto px-5 py-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="p-5 bg-gradient-to-r from-cyan-600/10 to-purple-600/10 border border-cyan-500/20 rounded-[28px] flex gap-4 items-center">
                  <div className="p-2.5 bg-cyan-500 rounded-xl shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Creator Intelligence</p>
                    <p className="text-xs font-medium text-zinc-300 mt-0.5 leading-relaxed">{aiTip}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="My Coins Balance" value={stats.coins} icon={<Coins size={14}/>} color="from-yellow-500/10" iconColor="text-yellow-400" />
                  <StatCard label="Estimated Revenue" value={`MK ${stats.revenue}`} icon={<DollarSign size={14}/>} color="from-green-500/10" iconColor="text-green-400" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] px-2">Performance Analytics</h3>
                  <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-6 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Aggregate Views</p>
                        <p className="text-3xl font-black italic mt-1 font-mono">{stats.views}</p>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold">+12.4%</div>
                    </div>
                    <div className="flex gap-1.5 items-end h-16 pt-2">
                      {[40, 70, 45, 90, 65, 80, 50, 60, 35, 75].map((h, i) => (
                        <div key={`bar-${i}`} className="flex-1 bg-cyan-500/10 rounded-t-md relative group h-full flex items-end">
                          <motion.div 
                            initial={{ height: 0 }} 
                            animate={{ height: `${h}%` }} 
                            className="bg-cyan-500/80 w-full rounded-t-md transition-all group-hover:bg-cyan-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

{activeTab === 'content' && (
  <motion.div key="cont" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
    <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] px-2">Video Framework Repositories ({myVideos.length})</h3>
    <div className="space-y-2.5">
      {myVideos.length > 0 ? myVideos.map(video => (
        <div 
          key={video.id} 
          onClick={() => handleOpenDrawer(video)}
          className="bg-zinc-900/30 p-3 rounded-2xl border border-white/5 flex gap-4 items-center cursor-pointer group hover:border-cyan-500/20 hover:bg-zinc-900/60 transition-all active:scale-[0.995]"
        >
          {/* Replaced image sandbox box with inline video preview context */}
          <div className="w-12 h-16 bg-zinc-800 rounded-xl overflow-hidden relative shadow-md shrink-0 border border-white/10 flex items-center justify-center">
            {video.video_url ? (
              <video 
                src={video.video_url} 
                className="w-full h-full object-cover pointer-events-none" 
                muted
                playsInline
                preload="metadata"
                // Optional UI Trick: Play short preview clip when user hovers over the row
                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                <Play size={14} fill="currentColor" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
             <h4 className="text-xs font-bold truncate text-zinc-200 italic">{video.caption || "Untitled Stream Instance"}</h4>
             <div className="flex gap-3 mt-1.5 font-mono">
                <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold"><Eye size={10} className="text-cyan-400"/> {video.views_count || 0}</span>
                <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold"><Heart size={10} className="text-rose-500"/> {video.likes_count || 0}</span>
             </div>
          </div>
          <ChevronRight size={16} className="text-zinc-700 group-hover:text-cyan-400 transition-colors shrink-0 ml-2" />
        </div>
      )) : (
        <div className="text-center py-20 opacity-20 uppercase font-black tracking-widest text-[10px]">No content lines indexed</div>
      )}
    </div>
  </motion.div>
)}
            {activeTab === 'monetization' && (
              <motion.div key="mon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/20 to-black p-8 rounded-[36px] text-center border border-purple-500/20 shadow-2xl relative overflow-hidden">
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-purple-400 opacity-80">Withdrawable Balance</p>
                  <h2 className="text-4xl font-black italic mt-2 tracking-tighter font-mono text-zinc-100">K{stats.revenue}</h2>
                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/payouts')}
                    className="mt-6 bg-white hover:bg-zinc-100 text-black px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-white/5"
                  >
                    Withdraw via Mpamba / Airtel
                  </motion.button>
                </div>
                <div className="space-y-2.5">
                  <ToolCard 
                    icon={<Crown size={18} className="text-purple-400" />} 
                    title="Creator Fund Pool" 
                    desc="Yield formulas evaluated out of organic aggregate video weight logs" 
                    badge="Eligible" 
                    onClick={() => navigate('./shared/creator-fund')}
                  />
                  <ToolCard 
                    icon={<Gift size={18} className="text-pink-400" />} 
                    title="Virtual Gift Exchange" 
                    desc="Standard network conversions computed at a 1 Coin = 0.10 MWK target threshold" 
                    onClick={() => navigate('./shared/gifts')}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div key="ana" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[3px] px-2">Algorithmic Insight Arrays</h3>
                <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-6 space-y-4">
                  <GeoProgress label="Retention Index" percent={64} color="bg-cyan-500" />
                  <GeoProgress label="Follower Compound Conversion" percent={Math.min((parseInt(stats.followers, 10) || 0), 100)} color="bg-purple-500" />
                  <GeoProgress label="Reaction to Extraction Frequency" percent={38} color="bg-emerald-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

     {/* --- REFACTORED INTERACTIVE PREVIEW DRAWER --- */}
<AnimatePresence>
  {selectedVideo && (
    <>
      {/* Backdrop Dimmer Overlay */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setSelectedVideo(null)}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
      />
      {/* Content Drawer Frame */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 24, stiffness: 180 }}
        className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 rounded-t-[32px] z-[201] p-6 pb-10 max-h-[85vh] flex flex-col"
      >
        <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-6 shrink-0" />
        
        {/* Drawer Identity Card Header */}
        <div className="flex items-start gap-4 mb-6 shrink-0 bg-white/[0.01] p-3 rounded-2xl border border-white/5">
          <div className="w-14 h-20 bg-zinc-900 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg flex items-center justify-center relative">
            {selectedVideo.video_url ? (
              <video 
                src={selectedVideo.video_url} 
                className="w-full h-full object-cover pointer-events-none" 
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <Play size={16} className="text-zinc-700" fill="currentColor" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black italic tracking-tight truncate text-zinc-100">{selectedVideo.caption || "Untitled Content Session"}</h2>
            <p className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-widest mt-1">ID: VID_{selectedVideo.id?.slice(0, 12)}</p>
            
            {/* Internal Tab Management Engine inside Drawer */}
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => setDrawerMode('metrics')}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${drawerMode === 'metrics' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-400'}`}
              >
                <FileText size={10} /> Metrics Array
              </button>
              <button 
                onClick={() => setDrawerMode('preview')}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${drawerMode === 'preview' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/10' : 'bg-white/5 text-zinc-400'}`}
              >
                <Video size={10} /> Render View
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Drawer Tab Sub-views Panel Content */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-studio mb-6 min-h-[140px]">
          <AnimatePresence mode="wait">
            {drawerMode === 'metrics' ? (
              <motion.div key="draw-met" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Total Engaged Views</p>
                    <p className="text-xl font-black italic mt-1 text-cyan-400">{selectedVideo.views_count || 0}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Organic Target Likes</p>
                    <p className="text-xl font-black italic mt-1 text-rose-500">{selectedVideo.likes_count || 0}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Audience Retention</p>
                    <p className="text-xl font-black italic mt-1 text-zinc-300">64.2%</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Average Watch Duration</p>
                    <p className="text-xl font-black italic mt-1 text-yellow-500">0:42s</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="draw-prev" initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} className="h-full flex items-center justify-center">
                {/* Active Video Player Viewbox Sandbox Area */}
                <div className="w-full max-w-xs aspect-[9/16] bg-zinc-950 border border-white/10 rounded-2xl relative group overflow-hidden shadow-2xl flex items-center justify-center">
                  {selectedVideo.video_url ? (
                    <video 
                      src={selectedVideo.video_url} 
                      className="w-full h-full object-contain z-10" 
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center z-10">
                      <Play size={24} className="text-zinc-600 mb-2" fill="currentColor" />
                      <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">No Stream Address Linked</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-zinc-900/40 z-0" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
      
              {/* Close Drawer Button */}
              <button 
                onClick={() => setSelectedVideo(null)}
                className="w-full py-4 bg-white hover:bg-zinc-100 text-black font-black uppercase tracking-[3px] text-xs rounded-xl shrink-0 transition-colors"
              >
                Exit Viewport Analysis
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BALANCED STICKY BOTTOM FLOATING CONTROL PANEL NAV --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-zinc-950/70 backdrop-blur-3xl border border-white/10 rounded-[28px] p-1.5 flex items-center justify-between shadow-2xl z-[100]">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16}/>} label="Home" />
        <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<ListVideo size={16}/>} label="Videos" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<BarChart3 size={16} />} label="Insights" />
        <NavButton active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} icon={<DollarSign size={16}/>} label="Earn" />
      </div>
    </div>
  );
};

// Reusable Sub-components
const GeoProgress = ({ label, percent, color = "bg-cyan-500" }) => (
  <div className="space-y-1.5 font-mono">
    <div className="flex justify-between text-[9px] font-bold">
      <span className="text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-zinc-300">{percent}%</span>
    </div>
    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.02]">
      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.8, ease: "circOut" }} className={`h-full ${color}`} />
    </div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <motion.button 
    whileTap={{ scale: 0.94 }}
    onClick={onClick} 
    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all ${active ? 'bg-white text-black shadow-lg shadow-white/5 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
  >
    {icon}
    <span className="text-[7.5px] font-black uppercase tracking-tighter">{label}</span>
  </motion.button>
);

const StatCard = ({ label, value, color, iconColor, icon }) => (
  <div className={`bg-zinc-900/20 border border-white/5 p-5 rounded-[24px] bg-gradient-to-br ${color} to-transparent backdrop-blur-sm`}>
    <div className={`w-7 h-7 rounded-lg bg-black flex items-center justify-center mb-3 ${iconColor} border border-white/10 shadow-md`}>
      {icon}
    </div>
    <p className="text-xl font-black italic tracking-tight font-mono">{value}</p>
    <p className="text-[8px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">{label}</p>
  </div>
);

const ToolCard = ({ icon, title, desc, badge, onClick }) => (
  <div 
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-zinc-900/20 border border-white/5 rounded-2xl hover:border-white/10 transition-all group cursor-pointer active:scale-[0.99]"
  >
    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/10 shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-bold text-zinc-200 tracking-wide">{title}</h4>
        {badge && <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded bg-cyan-500 text-black uppercase tracking-wide">{badge}</span>}
      </div>
      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight truncate">{desc}</p>
    </div>
    <ChevronRight size={14} className="text-zinc-700 group-hover:text-cyan-400 transition-colors shrink-0 ml-2" />
  </div>
);

export default UniverseTools;
