import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, Play, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const Discovery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("For You");
  const [categories] = useState(["For You", "Trends", "Music", "News", "Gaming"]);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(username, avatar_url)')
        .order('likes_count', { ascending: false });
      
      if (!error) {
        setVideos(data || []);
        setFilteredVideos(data || []);
      }
      setLoading(false);
    };
    fetchDiscoveryData();
  }, []);

  // --- FILTER LOGIC ---
  useEffect(() => {
    let result = [...videos];

    // Category Filtering
    if (activeTab !== "For You") {
      result = result.filter(v => {
        const tabLower = activeTab.toLowerCase();
        
        const matchesCategory = v.category?.toLowerCase() === tabLower;
        const matchesCaption = v.caption?.toLowerCase().includes(tabLower);
        
        if (tabLower === 'trends') {
          return (v.likes_count > 10) || v.category?.toLowerCase() === 'trends';
        }

        return matchesCategory || matchesCaption;
      });
    }

    // Search Query Filtering
    if (searchQuery.trim() !== "") {
      result = result.filter(v => 
        v.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVideos(result);
  }, [searchQuery, activeTab, videos]);

  const handleVideoClick = (videoId) => {
    navigate('/', { state: { scrollToId: videoId } });
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* --- Sticky Glassmorphic Search & Categories Header --- */}
      <div className="shrink-0 z-50 p-4 bg-black/60 backdrop-blur-2xl border-b border-cyan-500/30 shadow-[0_10px_30px_rgba(6,182,212,0.25)]">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 group-focus-within:text-fuchsia-400 transition-colors drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" size={18} />
          <input 
            type="text"
            placeholder="Search Mpade Universe..."
            className="w-full bg-zinc-900/80 border border-cyan-500/50 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] focus:shadow-[0_0_35px_rgba(217,70,239,0.6)] transition-all text-sm font-medium placeholder-cyan-500/50 text-cyan-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 mt-4 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveTab(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${
                activeTab === cat 
                ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.9),0_0_50px_rgba(217,70,239,0.6)] scale-105' 
                : 'bg-zinc-900/80 border-cyan-500/20 text-zinc-300 hover:border-fuchsia-500 hover:text-fuchsia-300 hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* --- Scrollable Body Container --- */}
      <div className="flex-1 overflow-y-auto pb-28 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] opacity-80">
            <Loader2 className="animate-spin text-cyan-400 mb-3 drop-shadow-[0_0_15px_rgba(6,182,212,1)]" size={36} />
            <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]">Initializing Discovery</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {/* --- Trending Horizontal Section --- */}
            <section className="mt-6">
              <div className="px-4 flex justify-between items-end mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-pink-500/20 rounded-xl border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                    <Hash className="text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,1)]" size={16} />
                  </div>
                  <h2 className="font-black text-xs uppercase tracking-widest text-pink-300 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">Trending in Malawi</h2>
                </div>
                <span 
                  onClick={() => setActiveTab("Trends")}
                  className="text-[10px] text-cyan-400 font-bold uppercase tracking-tighter hover:text-fuchsia-400 cursor-pointer transition-colors drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                >
                  See All
                </span>
              </div>
              
              <div className="flex gap-3 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-fuchsia-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                {videos.slice(0, 6).map((vid) => (
                  <motion.div 
                    whileTap={{ scale: 0.96 }}
                    key={vid.id} 
                    onClick={() => handleVideoClick(vid.id)}
                    className="relative min-w-[150px] h-52 bg-zinc-900 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] hover:border-fuchsia-500 cursor-pointer transition-all duration-300 p-1"
                  >
                    <video src={`${vid.video_url}#t=0.1`} className="w-full h-full object-cover opacity-80 rounded-xl" muted playsInline preload="metadata" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent rounded-2xl" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      <div className="bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-md p-1 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                        <Play size={8} fill="#22d3ee" className="text-cyan-400" />
                      </div>
                      <span className="text-[10px] font-black tracking-tighter text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">{vid.likes_count || '0'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* --- Explore Grid --- */}
            <section className="mt-8 px-4">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  <TrendingUp className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,1)]" size={16} />
                </div>
                <h2 className="font-black text-xs uppercase tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                  {searchQuery ? `Results for "${searchQuery}"` : `Explore ${activeTab}`}
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <AnimatePresence>
                  {filteredVideos.map((vid) => (
                    <motion.div 
                      layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      key={vid.id} 
                      onClick={() => handleVideoClick(vid.id)}
                      className="relative aspect-[10/14] bg-zinc-900 rounded-2xl overflow-hidden border border-cyan-500/30 group shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5),0_0_15px_rgba(6,182,212,0.5)] hover:border-fuchsia-500 cursor-pointer transition-all duration-300 p-1"
                    >
                      <video src={`${vid.video_url}#t=0.5`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 rounded-xl" muted playsInline preload="metadata" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity rounded-2xl" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-[10px] font-bold line-clamp-2 leading-tight mb-2 text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{vid.caption}</p>
                        <div className="flex items-center gap-2">
                          <img src={vid.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vid.profiles?.username}`} className="w-5 h-5 rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] object-cover" alt="" />
                          <span className="text-[9px] font-bold text-cyan-300 truncate drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">@{vid.profiles?.username}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* No Results Fallback */}
                {!loading && filteredVideos.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-60">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">No content found in {activeTab}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
