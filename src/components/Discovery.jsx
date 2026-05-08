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

  // --- UPDATED FILTER LOGIC ---
  useEffect(() => {
    let result = [...videos];

    // Category Filtering
    if (activeTab !== "For You") {
      result = result.filter(v => {
        const tabLower = activeTab.toLowerCase();
        
        // Target the specific category column OR look for the word in the caption
        const matchesCategory = v.category?.toLowerCase() === tabLower;
        const matchesCaption = v.caption?.toLowerCase().includes(tabLower);
        
        // Special logic for "Trends": filter by high like count or specific tag
        if (tabLower === 'trends') {
          return (v.likes_count > 10) || v.category?.toLowerCase() === 'trends';
        }

        return matchesCategory || matchesCaption;
      });
    }

    // Search Query Filtering (runs on top of category filter)
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
    <div className="min-h-screen bg-black text-white pb-28">
      {/* --- Sticky Glassmorphic Search --- */}
      <div className="sticky top-0 z-50 p-4 bg-black/40 backdrop-blur-2xl border-b border-white/5">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search Mpade Universe..."
            className="w-full bg-zinc-900/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar mt-4">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveTab(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${
                activeTab === cat 
                ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-50">
          <Loader2 className="animate-spin text-cyan-500 mb-2" size={32} />
          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Initializing Discovery</p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-700">
          {/* --- Trending Horizontal Section --- */}
          <section className="mt-6">
            <div className="px-4 flex justify-between items-end mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-pink-500/10 rounded-lg">
                  <Hash className="text-pink-500" size={16} />
                </div>
                <h2 className="font-black text-xs uppercase tracking-widest text-zinc-200">Trending in Malawi</h2>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter hover:text-white cursor-pointer transition-colors">See All</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
              {videos.slice(0, 6).map((vid) => (
                <motion.div 
                  whileTap={{ scale: 0.96 }}
                  key={vid.id} 
                  onClick={() => handleVideoClick(vid.id)}
                  className="relative min-w-[150px] h-52 bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl cursor-pointer"
                >
                  <video src={`${vid.video_url}#t=0.1`} className="w-full h-full object-cover opacity-70" muted playsInline preload="metadata" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <div className="bg-white/10 backdrop-blur-md p-1 rounded-full"><Play size={8} fill="white" className="text-white" /></div>
                    <span className="text-[10px] font-black tracking-tighter">{vid.likes_count || '0'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* --- Explore Grid --- */}
          <section className="mt-10 px-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                <TrendingUp className="text-cyan-400" size={16} />
              </div>
              <h2 className="font-black text-xs uppercase tracking-widest text-zinc-200">
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
                    className="relative aspect-[10/14] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group shadow-lg cursor-pointer"
                  >
                    <video src={`${vid.video_url}#t=0.5`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted playsInline preload="metadata" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-[10px] font-bold line-clamp-2 leading-tight mb-2 text-zinc-100">{vid.caption}</p>
                      <div className="flex items-center gap-2">
                        <img src={vid.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vid.profiles?.username}`} className="w-5 h-5 rounded-full border border-cyan-500/30 object-cover" alt="" />
                        <span className="text-[9px] font-bold text-cyan-400/80 truncate">@{vid.profiles?.username}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* No Results Fallback */}
              {!loading && filteredVideos.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No content found in {activeTab}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Discovery;