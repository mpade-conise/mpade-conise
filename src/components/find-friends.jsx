import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, UserPlus, Globe, X, MessageSquare, UserMinus } from 'lucide-react';
import { supabase } from '../supabaseClient';

const FindFriends = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      setCurrentUser(authUser);

      if (authUser) {
        // 1. Fetch profiles
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', authUser.id)
          .order('username', { ascending: true });

        // 2. Fetch who you are currently following from 'follows' table
        const { data: following, error: fError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authUser.id);

        if (pError || fError) throw pError || fError;

        setUsers(profiles || []);
        setFollowingIds(new Set(following.map(f => f.following_id)));
      }
    } catch (err) {
      console.error("Error finding friends:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    // Optimistic Update: UI changes immediately
    setFollowingIds(prev => new Set(prev).add(targetUserId));

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: currentUser.id, following_id: targetUserId });

    if (error) {
      // Rollback on error
      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } else {
      // Add to activities table so they see it in their Inbox
      await supabase.from('activities').insert({
        user_id: targetUserId,
        actor_id: currentUser.id,
        user_name: currentUser.user_metadata?.username || 'Someone',
        type: 'follow',
        description: 'started following you'
      });
    }
  };

  const handleUnfollow = async (targetUserId) => {
    // Optimistic Update: UI changes immediately
    setFollowingIds(prev => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUserId);

    if (error) {
      // Rollback on error
      setFollowingIds(prev => new Set(prev).add(targetUserId));
    }
  };

  const removeUserFromList = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black text-white font-sans flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="px-6 py-4 flex items-center gap-4 bg-black/80 backdrop-blur-md z-50 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="Search the Universe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </header>

      {/* USER LIST */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="mb-4 flex items-center gap-2 px-2">
          <Globe size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[2px] text-zinc-500">Discovering New Users</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid gap-3">
            <AnimatePresence mode='popLayout'>
              {filteredUsers.map((u) => {
                const isFollowing = followingIds.has(u.id);

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    key={u.id}
                    className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-2xl backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full p-[2px] ${isFollowing ? 'bg-zinc-700' : 'bg-gradient-to-tr from-cyan-500 to-[#ff0050]'}`}>
                          <div className="w-full h-full rounded-full bg-black p-0.5">
                            <img 
                              src={u.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.id}`} 
                              className="w-full h-full rounded-full object-cover" 
                              alt="Avatar" 
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm tracking-tight">@{u.username}</h3>
                        <p className="text-[10px] text-zinc-500 truncate w-24">{u.bio || "Inhabitant of the Universe"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isFollowing ? (
                        <>
                          <button 
                           onClick={() => navigate(`/inbox?openChat=${u.id}`)}
                            className="bg-zinc-800 p-2.5 rounded-full text-white active:scale-90 transition-transform"
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button 
                            onClick={() => handleUnfollow(u.id)}
                            className="bg-zinc-800 p-2.5 rounded-full text-red-500 active:scale-90 transition-transform"
                          >
                            <UserMinus size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="bg-white text-black px-5 py-1.5 rounded-full text-xs font-black hover:bg-cyan-400 transition-colors active:scale-90"
                            onClick={() => handleFollow(u.id)}
                          >
                            Follow
                          </button>
                          <button 
                            onClick={() => removeUserFromList(u.id)}
                            className="bg-zinc-900/50 text-zinc-500 p-2 rounded-full hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Search size={48} strokeWidth={1} className="mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">No Lifeforms Found</p>
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent bottom-0 absolute shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
    </div>
  );
};

export default FindFriends;