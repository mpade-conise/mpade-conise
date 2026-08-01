import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  UserPlus, 
  Share2, 
  Grid, 
  Heart, 
  Lock, 
  Check,
  Bookmark,
  Play,
  BarChart3,
  Radio,
  X,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('videos');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayVideos, setDisplayVideos] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('followers'); 
  const [followList, setFollowList] = useState([]);
  const [myFollowingIds, setMyFollowingIds] = useState(new Set());

  const [stats, setStats] = useState({
    following: 0,
    followers: 0,
    likes: 0
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTabData();
    }
  }, [activeTab, user]);

  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num || 0;
  };

  const fetchProfileData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;

      if (authUser) {
        setUser(authUser);
        
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setProfile(profileData);

        const [following, followers, videosForLikes, myFollows] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', authUser.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', authUser.id),
          supabase.from('videos').select('likes_count').eq('user_id', authUser.id),
          supabase.from('follows').select('following_id').eq('follower_id', authUser.id)
        ]);

        const totalLikes = videosForLikes.data?.reduce((acc, video) => acc + (video.likes_count || 0), 0) || 0;

        setStats({
          following: following.count || 0,
          followers: followers.count || 0,
          likes: totalLikes
        });
        
        setMyFollowingIds(new Set(myFollows.data?.map(f => f.following_id)));
      }
    } catch (err) {
      console.error("Profile Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openFollowList = async (type) => {
    setModalType(type);
    setIsModalOpen(true);
    setLoading(true);
    try {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select(type === 'followers' ? 'follower_id' : 'following_id')
        .eq(type === 'followers' ? 'following_id' : 'follower_id', user.id);

      if (followError) throw followError;

      if (followData && followData.length > 0) {
        const userIds = followData.map(item => type === 'followers' ? item.follower_id : item.following_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', userIds);

        if (profileError) throw profileError;
        setFollowList(profiles || []);
      } else {
        setFollowList([]);
      }
    } catch (err) {
      console.error("Error fetching follow list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowBack = async (targetId) => {
    if (!user?.id || !targetId) return;

    setMyFollowingIds(prev => new Set(prev).add(targetId));
    
    try {
      const { error } = await supabase
        .from('follows')
        .insert({ 
          follower_id: user.id, 
          following_id: targetId 
        });

      if (error) throw error;
      setStats(prev => ({ ...prev, following: prev.following + 1 }));

    } catch (err) {
      console.error("Follow Back Failed:", err.message);
      setMyFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      let videosData = [];

      if (activeTab === 'videos') {
        const { data } = await supabase
          .from('videos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        videosData = data || [];
      } 
      else if (activeTab === 'liked') {
        const { data: likedRefs, error } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id);
        if (!error && likedRefs?.length > 0) {
          const ids = likedRefs.map(ref => ref.video_id);
          const { data } = await supabase.from('videos').select('*').in('id', ids);
          videosData = data || [];
        }
      } 
      else if (activeTab === 'saved') {
        const { data: savedRefs, error } = await supabase.from('favorites').select('video_id').eq('user_id', user.id);
        if (!error && savedRefs?.length > 0) {
          const ids = savedRefs.map(ref => ref.video_id);
          const { data } = await supabase.from('videos').select('*').in('id', ids);
          videosData = data || [];
        }
      }
      else if (activeTab === 'private') {
        const { data } = await supabase.from('videos').select('*').eq('user_id', user.id).eq('is_private', true);
        videosData = data || [];
      }

      setDisplayVideos(videosData);
    } catch (err) {
      console.error("Tab Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = async (e) => {
    try {
      const playPromise = e.target.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {}
  };

  const handleMouseLeave = (e) => {
    e.target.pause();
    e.target.currentTime = 0;
  };

  const tabs = [
    { id: 'videos', icon: <Grid size={20} /> },
    { id: 'liked', icon: <Heart size={20} /> },
    { id: 'private', icon: <Lock size={20} /> },
    { id: 'saved', icon: <Bookmark size={20} /> },
  ];

  if (!user && loading) return (
    <div className="h-screen bg-[#050508] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[120px]" />
      <div className="text-cyan-400 font-black italic tracking-widest animate-pulse mb-4 uppercase drop-shadow-[0_0_12px_#00f3ff]">
        Initializing Neon Universe...
      </div>
      <div className="w-48 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f3ff]" />
    </div>
  );

  return (
    <div className="h-screen bg-[#06060c] text-white font-sans flex flex-col overflow-hidden relative">
      
      {/* Ambient Everywhere Neon Aura */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-500/10 blur-[130px] rounded-full" />
      </div>

      <nav className="flex items-center justify-between px-6 py-4 bg-[#0a0a14]/80 backdrop-blur-xl border-b border-cyan-500/30 z-50 shrink-0 shadow-[0_0_20px_rgba(0,243,255,0.15)]">
        <Link to="/find-friends" className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)] active:translate-y-[2px] transition-all">
          <UserPlus size={22} />
        </Link>
        
        <h2 className="text-sm font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
          {profile?.username || 'Username'}
        </h2>
        
        <div className="flex gap-3">
          <Link to="/share-profile" className="p-2 bg-[#0d0d1a] border border-pink-500/40 hover:border-pink-400 rounded-full text-pink-500 shadow-[0_0_10px_rgba(255,0,80,0.3)] active:translate-y-[2px] transition-all">
            <Share2 size={20} />
          </Link>
          <Link to="/settings" className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)] active:translate-y-[2px] transition-all">
            <Settings size={20} />
          </Link>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar relative z-10">
        
        <section className="flex flex-col items-center pt-6 pb-4">
          <div className="relative mb-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(0,243,255,0.6)]"
            >
              <div className="w-full h-full rounded-full bg-[#090912] p-1">
                <img 
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="Profile" 
                />
              </div>
            </motion.div>
            <div className="absolute bottom-1 right-1 bg-cyan-400 p-1 rounded-full border-2 border-black shadow-[0_0_10px_#00f3ff]">
              <Check size={12} className="text-black" strokeWidth={4} />
            </div>
          </div>

          <h1 className="text-lg font-black mb-1 text-white tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            @{profile?.username || 'mpade'}
          </h1>
          
          <div className="flex gap-8 my-5">
            <button onClick={() => openFollowList('following')} className="flex flex-col items-center active:scale-95 transition-transform group">
              <span className="font-black text-lg text-cyan-400 drop-shadow-[0_0_8px_#00f3ff]">{formatCount(stats.following)}</span>
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest group-hover:text-cyan-300">Following</span>
            </button>
            <button onClick={() => openFollowList('followers')} className="flex flex-col items-center active:scale-95 transition-transform group">
              <span className="font-black text-lg text-pink-500 drop-shadow-[0_0_8px_#ff0050]">{formatCount(stats.followers)}</span>
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest group-hover:text-pink-400">Followers</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="font-black text-lg text-purple-400 drop-shadow-[0_0_8px_#a855f7]">{formatCount(stats.likes)}</span>
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Likes</span>
            </div>
          </div>

          {/* 3D Everywhere Neon Controls */}
          <div className="flex gap-3 w-full px-6 mb-3">
            <Link to="/edit-profile" className="flex-1 py-2.5 bg-gradient-to-b from-[#101424] to-[#0a0d18] rounded-xl font-black text-[12px] uppercase tracking-wider text-cyan-400 border border-cyan-500/50 border-b-cyan-950 border-b-4 flex items-center justify-center gap-2 active:translate-y-[2px] active:border-b-2 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all">
              <Edit3 size={14} /> Edit Profile
            </Link>
            <Link to="/share-profile" className="flex-1 py-2.5 bg-gradient-to-b from-[#24101a] to-[#180a12] rounded-xl font-black text-[12px] uppercase tracking-wider text-pink-500 border border-pink-500/50 border-b-pink-950 border-b-4 flex items-center justify-center gap-2 active:translate-y-[2px] active:border-b-2 shadow-[0_0_15px_rgba(255,0,80,0.2)] hover:shadow-[0_0_20px_rgba(255,0,80,0.4)] transition-all">
              <ExternalLink size={14} /> Share Profile
            </Link>
          </div>

          <div className="flex gap-3 w-full px-6 mb-6">
            <Link to="/universe-tools" className="flex-1 py-2.5 bg-gradient-to-b from-[#0a1e28] to-[#051118] rounded-xl font-black text-[11px] uppercase tracking-wider border border-cyan-400/60 border-b-cyan-950 border-b-4 flex items-center justify-center gap-2 text-cyan-300 active:translate-y-[2px] active:border-b-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all">
              <BarChart3 size={16} /> CON-UNIVERSE TOOLS
            </Link>
            <Link 
              to="/live" 
              className="flex-1 py-2.5 bg-gradient-to-b from-[#2b0810] to-[#180308] rounded-xl font-black text-[11px] uppercase tracking-wider border border-red-500/60 border-b-red-950 border-b-4 flex items-center justify-center gap-2 text-red-400 active:translate-y-[2px] active:border-b-2 shadow-[0_0_20px_rgba(255,0,80,0.3)] transition-all"
            >
              <Radio size={16} /> LIVE UNIVERSE
            </Link>
          </div>

          <p className="text-xs text-center px-12 text-cyan-200/60 font-medium italic drop-shadow-[0_0_5px_rgba(0,243,255,0.2)]">
            {profile?.bio || "the progress developer"}
          </p>
        </section>

        {/* Neon Active Tab Selector Bar */}
        <div className="sticky top-0 bg-[#06060c]/90 backdrop-blur-md z-40 border-y border-cyan-500/20">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex justify-center py-4 relative transition-all ${
                  activeTab === tab.id ? 'text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {tab.icon}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 w-12 h-[3px] bg-cyan-400 shadow-[0_0_15px_#00f3ff] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[2px] bg-cyan-500/10 p-[1px]">
          {loading ? (
            [1,2,3,4,5,6].map(i => <div key={i} className="aspect-[3/4] bg-[#0c0c16] animate-pulse border border-cyan-500/10" />)
          ) : displayVideos.length > 0 ? (
            displayVideos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => navigate('/', { state: { scrollToId: video.id } })}
                className="relative aspect-[3/4] bg-[#0c0c16] overflow-hidden group cursor-pointer active:scale-95 transition-transform border border-cyan-500/20 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
              >
                <video 
                  src={video.video_url} 
                  className="w-full h-full object-cover"
                  muted playsInline loop
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 drop-shadow-[0_0_5px_#00f3ff]">
                  <Play size={10} className="fill-cyan-400 text-cyan-400" />
                  <span className="text-[11px] font-black tracking-tighter text-cyan-200">
                    {formatCount(video.views_count)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-24 flex flex-col items-center opacity-40 text-cyan-400">
              <Grid size={48} strokeWidth={1} className="mb-2 drop-shadow-[0_0_10px_#00f3ff]" />
              <p className="text-[10px] font-bold uppercase tracking-[3px]">Empty Neon Universe</p>
            </div>
          )}
        </div>
      </div>

      {/* Everywhere Neon Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-[#070712] flex flex-col border-t border-cyan-500/40 shadow-[0_-10px_40px_rgba(0,243,255,0.2)]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
              <h3 className="font-black uppercase tracking-widest text-sm text-cyan-400 drop-shadow-[0_0_8px_#00f3ff]">{modalType}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-[#0d0d1a] border border-cyan-500/40 text-cyan-400 rounded-full active:translate-y-[2px]">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {followList.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[#0d0d1a]/80 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(0,243,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <img src={item.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.id}`} className="w-10 h-10 rounded-full border border-cyan-400/50" />
                    <div>
                      <p className="text-sm font-bold text-white">@{item.username}</p>
                      <p className="text-[10px] text-zinc-400 italic">{item.bio?.substring(0, 20)}...</p>
                    </div>
                  </div>
                  
                  {!myFollowingIds.has(item.id) ? (
                    <button 
                      onClick={() => handleFollowBack(item.id)}
                      className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-[0_0_15px_rgba(0,243,255,0.4)] active:translate-y-[2px] transition-all"
                    >
                      Follow Back
                    </button>
                  ) : (
                    <span className="text-cyan-400/60 text-[10px] font-black uppercase px-2">Following</span>
                  )}
                </div>
              ))}
              {followList.length === 0 && (
                <div className="text-center py-20 text-cyan-500/40 italic">No lifeforms found here.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Everywhere Neon Footer Glow Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500 bottom-0 absolute shadow-[0_0_20px_#00f3ff] z-50" />
    </div>
  );
};

export default Profile;
