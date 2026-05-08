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
  Edit3,         // Added for Edit Profile
  ExternalLink    // Added for Share Profile
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

  /**
   * UPDATED: handleFollowBack
   * Now relies on Database Trigger 'on_user_followed' to create activities.
   * Only performs the insert into 'follows'.
   */
  const handleFollowBack = async (targetId) => {
    if (!user?.id || !targetId) return;

    // Optimistic Update
    setMyFollowingIds(prev => new Set(prev).add(targetId));
    
    try {
      // Simplified insert: Trigger handles the rest!
      const { error } = await supabase
        .from('follows')
        .insert({ 
          follower_id: user.id, 
          following_id: targetId 
        });

      if (error) throw error;

      // Update local stat
      setStats(prev => ({ ...prev, following: prev.following + 1 }));

    } catch (err) {
      console.error("Follow Back Failed:", err.message);
      // Rollback UI state if DB insert fails
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
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="text-zinc-500 font-bold italic tracking-widest animate-pulse mb-4 uppercase">Initializing Universe...</div>
      <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#06b6d4]" />
    </div>
  );

  return (
    <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden">
      
      <nav className="flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-lg z-50 shrink-0">
        <Link to="/find-friends" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <UserPlus size={24} />
        </Link>
        <h2 className="text-sm font-black tracking-tight uppercase">{profile?.username || 'Username'}</h2>
        <div className="flex gap-2">
          <Link to="/share-profile" className="p-2 hover:bg-zinc-900 rounded-full"><Share2 size={22} /></Link>
          <Link to="/settings" className="p-2 hover:bg-zinc-900 rounded-full"><Settings size={22} /></Link>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar">
        
        <section className="flex flex-col items-center pt-4 pb-4">
          <div className="relative mb-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#00f2ea] via-[#ff0050] to-[#face15] shadow-[0_0_25px_rgba(255,0,80,0.4)]"
            >
              <div className="w-full h-full rounded-full bg-black p-1">
                <img 
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="Profile" 
                />
              </div>
            </motion.div>
            <div className="absolute bottom-1 right-1 bg-blue-500 p-1 rounded-full border-2 border-black">
              <Check size={12} className="text-white" strokeWidth={4} />
            </div>
          </div>

          <h1 className="text-lg font-black mb-1">@{profile?.username || 'mpade'}</h1>
          
          <div className="flex gap-8 my-5">
            <button onClick={() => openFollowList('following')} className="flex flex-col items-center active:scale-95 transition-transform">
              <span className="font-black text-lg">{formatCount(stats.following)}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Following</span>
            </button>
            <button onClick={() => openFollowList('followers')} className="flex flex-col items-center active:scale-95 transition-transform">
              <span className="font-black text-lg">{formatCount(stats.followers)}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Followers</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="font-black text-lg">{formatCount(stats.likes)}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Likes</span>
            </div>
          </div>

          <div className="flex gap-2 w-full px-6 mb-3">
            <Link to="/edit-profile" className="flex-1 py-2.5 bg-zinc-900 rounded-md font-bold text-[13px] border border-white/5 flex items-center justify-center gap-2">
              <Edit3 size={14} /> Edit Profile
            </Link>
            <Link to="/share-profile" className="flex-1 py-2.5 bg-zinc-900 rounded-md font-bold text-[13px] border border-white/5 flex items-center justify-center gap-2">
              <ExternalLink size={14} /> Share Profile
            </Link>
          </div>

          <div className="flex gap-2 w-full px-6 mb-6">
            <Link to="/universe-tools" className="flex-1 py-2.5 bg-[#1A1A1A] rounded-md font-bold text-[11px] border border-cyan-500/30 flex items-center justify-center gap-2 text-cyan-400">
              <BarChart3 size={16} /> CON-UNIVERSE TOOLS
            </Link>
           <Link 
  to="/live" 
  className="flex-1 py-2.5 bg-[#1A1A1A] rounded-md font-bold text-[11px] border border-red-500/30 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 transition-all"
>
  <Radio size={16} /> LIVE UNIVERSE
</Link>
          </div>

          <p className="text-xs text-center px-12 text-zinc-500 font-medium italic">
            {profile?.bio || "the progress developer"}
          </p>
        </section>

        <div className="sticky top-0 bg-black z-40 border-b border-white/5">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex justify-center py-4 relative transition-colors ${
                  activeTab === tab.id ? 'text-white' : 'text-zinc-600'
                }`}
              >
                {tab.icon}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 w-10 h-0.5 bg-white shadow-[0_0_10px_white]" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[1.5px]">
          {loading ? (
            [1,2,3,4,5,6].map(i => <div key={i} className="aspect-[3/4] bg-zinc-900 animate-pulse" />)
          ) : displayVideos.length > 0 ? (
            displayVideos.map((video) => (
              <div 
                key={video.id} 
                onClick={() => navigate('/', { state: { scrollToId: video.id } })}
                className="relative aspect-[3/4] bg-zinc-900 overflow-hidden group cursor-pointer active:scale-95 transition-transform"
              >
                <video 
                  src={video.video_url} 
                  className="w-full h-full object-cover"
                  muted playsInline loop
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 drop-shadow-md">
                  <Play size={10} className="fill-white text-white" />
                  <span className="text-[11px] font-black tracking-tighter">
                    {formatCount(video.views_count)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-24 flex flex-col items-center opacity-20">
              <Grid size={48} strokeWidth={1} className="mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-[3px]">Empty Universe</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="font-black uppercase tracking-widest text-sm">{modalType}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-900 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {followList.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img src={item.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.id}`} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm font-bold">@{item.username}</p>
                      <p className="text-[10px] text-zinc-500 italic">{item.bio?.substring(0, 20)}...</p>
                    </div>
                  </div>
                  
                  {!myFollowingIds.has(item.id) ? (
                    <button 
                      onClick={() => handleFollowBack(item.id)}
                      className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase active:scale-90 transition-transform"
                    >
                      Follow Back
                    </button>
                  ) : (
                    <span className="text-zinc-600 text-[10px] font-black uppercase px-2">Following</span>
                  )}
                </div>
              ))}
              {followList.length === 0 && (
                <div className="text-center py-20 opacity-20 italic">No lifeforms found here.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent bottom-0 absolute shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
    </div>
  );
};

export default Profile;