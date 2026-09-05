import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  UserPlus,
  Globe,
  X,
  MessageSquare,
  UserMinus,
  Users,
  Check,
  Sparkles
} from 'lucide-react';
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
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const authUser = session?.user;

      setCurrentUser(authUser);

      if (authUser) {
        // 1. Fetch profiles
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', authUser.id)
          .order('username', { ascending: true });

        // 2. Fetch users currently being followed
        const { data: following, error: fError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authUser.id);

        if (pError || fError) {
          throw pError || fError;
        }

        setUsers(profiles || []);
        setFollowingIds(
          new Set((following || []).map((f) => f.following_id))
        );
      }
    } catch (err) {
      console.error('Error finding friends:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.add(targetUserId);
      return next;
    });

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUser.id,
        following_id: targetUserId
      });

    if (error) {
      // Rollback
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });

      console.error('Follow error:', error.message);
    } else {
      // Notify target user
      await supabase.from('activities').insert({
        user_id: targetUserId,
        actor_id: currentUser.id,
        user_name:
          currentUser.user_metadata?.username || 'Someone',
        type: 'follow',
        description: 'started following you'
      });
    }
  };

  const handleUnfollow = async (targetUserId) => {
    // Optimistic update
    setFollowingIds((prev) => {
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
      // Rollback
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.add(targetUserId);
        return next;
      });

      console.error('Unfollow error:', error.message);
    }
  };

  const removeUserFromList = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const filteredUsers = users.filter((u) => {
    const username = u.username?.toLowerCase() || '';
    const bio = u.bio?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return username.includes(query) || bio.includes(query);
  });

  return (
    <div className="fixed inset-0 bg-[#050505] text-white font-sans flex flex-col overflow-hidden">

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/[0.06] rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-80 h-60 bg-blue-500/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-50 shrink-0 border-b border-white/[0.07] bg-[#050505]/90 backdrop-blur-2xl">

        <div className="px-4 sm:px-6 py-4">

          <div className="flex items-center gap-3">

            {/* Back */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border border-white/[0.07] bg-white/[0.03] transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={21} />
            </motion.button>

            {/* Title */}
            <div className="hidden sm:block shrink-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-400 font-bold">
                Universe
              </p>
              <h1 className="text-lg font-semibold tracking-tight">
                Find Friends
              </h1>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-2xl mx-auto">

              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                size={18}
              />

              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full
                  h-11
                  bg-white/[0.045]
                  border border-white/[0.08]
                  rounded-xl
                  pl-11
                  pr-10
                  text-sm
                  text-white
                  placeholder:text-zinc-600
                  outline-none
                  transition-all
                  focus:bg-white/[0.06]
                  focus:border-cyan-400/40
                  focus:ring-2
                  focus:ring-cyan-400/10
                "
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* User count */}
            <div className="hidden md:flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Users size={15} className="text-zinc-500" />
              <span className="text-xs text-zinc-400">
                {users.length}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="relative flex-1 overflow-y-auto no-scrollbar">

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

          {/* SECTION HEADER */}
          <div className="flex items-end justify-between mb-5">

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/10 flex items-center justify-center">
                  <Sparkles
                    size={14}
                    className="text-cyan-400"
                  />
                </div>

                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-cyan-400">
                  Discover
                </span>
              </div>

              <h2 className="text-xl font-semibold tracking-tight">
                People you may know
              </h2>

              <p className="text-xs text-zinc-500 mt-1">
                Connect with people across the Universe.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-zinc-600">
              <Globe size={14} />
              <span className="text-[10px] uppercase tracking-wider">
                Global
              </span>
            </div>

          </div>

          {/* LOADING */}
          {loading ? (
            <div className="space-y-3">

              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-[82px] rounded-2xl bg-white/[0.035] border border-white/[0.06] overflow-hidden relative"
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/[0.025] to-transparent" />

                  <div className="h-full flex items-center px-4 gap-3">

                    <div className="w-12 h-12 rounded-full bg-white/[0.06]" />

                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 rounded bg-white/[0.06]" />
                      <div className="h-2.5 w-40 rounded bg-white/[0.04]" />
                    </div>

                    <div className="w-20 h-9 rounded-xl bg-white/[0.05]" />

                  </div>
                </div>
              ))}

            </div>
          ) : filteredUsers.length > 0 ? (

            /* USER LIST */
            <div className="space-y-2.5">

              <AnimatePresence mode="popLayout">

                {filteredUsers.map((u) => {

                  const isFollowing = followingIds.has(u.id);

                  return (
                    <motion.div
                      layout
                      initial={{
                        opacity: 0,
                        y: 12
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.97
                      }}
                      transition={{
                        duration: 0.2
                      }}
                      key={u.id}
                      className="
                        group
                        relative
                        flex
                        items-center
                        justify-between
                        gap-4
                        p-3
                        sm:p-4
                        rounded-2xl
                        bg-white/[0.025]
                        hover:bg-white/[0.045]
                        border
                        border-white/[0.065]
                        hover:border-white/[0.11]
                        transition-all
                      "
                    >

                      {/* subtle accent */}
                      <div
                        className={`
                          absolute left-0 top-4 bottom-4 w-[2px] rounded-r-full
                          transition-all
                          ${
                            isFollowing
                              ? 'bg-zinc-700'
                              : 'bg-cyan-400/70 opacity-0 group-hover:opacity-100'
                          }
                        `}
                      />

                      {/* USER INFO */}
                      <div className="flex items-center gap-3 min-w-0">

                        {/* Avatar */}
                        <div className="relative shrink-0">

                          <div
                            className={`
                              w-12 h-12 rounded-full p-[1.5px]
                              ${
                                isFollowing
                                  ? 'bg-white/10'
                                  : 'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500'
                              }
                            `}
                          >

                            <div className="w-full h-full rounded-full bg-[#080808] p-[2px]">

                              <img
                                src={
                                  u.avatar_url ||
                                  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.id}`
                                }
                                className="w-full h-full rounded-full object-cover"
                                alt={u.username || 'User avatar'}
                              />

                            </div>

                          </div>

                          {/* Online-style indicator */}
                          {isFollowing && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#080808] flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            </div>
                          )}

                        </div>

                        {/* Details */}
                        <div className="min-w-0">

                          <div className="flex items-center gap-1.5">

                            <h3 className="font-semibold text-sm truncate max-w-[180px] sm:max-w-[260px]">
                              @{u.username || 'unknown'}
                            </h3>

                            {isFollowing && (
                              <div className="shrink-0 w-4 h-4 rounded-full bg-cyan-400/10 flex items-center justify-center">
                                <Check
                                  size={10}
                                  className="text-cyan-400"
                                />
                              </div>
                            )}

                          </div>

                          <p className="text-xs text-zinc-500 truncate max-w-[180px] sm:max-w-[300px] mt-0.5">
                            {u.bio || 'Exploring the Universe'}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Globe
                              size={10}
                              className="text-zinc-700"
                            />
                            <span className="text-[9px] uppercase tracking-wider text-zinc-600">
                              Universe member
                            </span>
                          </div>

                        </div>

                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 shrink-0">

                        {isFollowing ? (
                          <>
                            {/* Message */}
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() =>
                                navigate(`/messaging?userId=${u.id}`)
                              }
                              className="
                                h-9
                                w-9
                                rounded-xl
                                flex
                                items-center
                                justify-center
                                bg-white/[0.05]
                                border
                                border-white/[0.07]
                                text-zinc-300
                                hover:text-white
                                hover:bg-white/[0.09]
                                transition-all
                              "
                              title="Message"
                            >
                              <MessageSquare size={16} />
                            </motion.button>

                            {/* Unfollow */}
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() =>
                                handleUnfollow(u.id)
                              }
                              className="
                                h-9
                                px-3
                                rounded-xl
                                flex
                                items-center
                                gap-1.5
                                bg-transparent
                                border
                                border-white/[0.07]
                                text-zinc-500
                                hover:text-red-400
                                hover:border-red-400/20
                                hover:bg-red-400/[0.05]
                                transition-all
                              "
                              title="Unfollow"
                            >
                              <UserMinus size={14} />

                              <span className="hidden sm:inline text-[11px] font-medium">
                                Following
                              </span>
                            </motion.button>
                          </>
                        ) : (
                          <>
                            {/* Follow */}
                            <motion.button
                              whileTap={{ scale: 0.94 }}
                              onClick={() =>
                                handleFollow(u.id)
                              }
                              className="
                                h-9
                                px-4
                                rounded-xl
                                flex
                                items-center
                                gap-1.5
                                bg-white
                                text-black
                                hover:bg-cyan-300
                                font-semibold
                                text-xs
                                transition-all
                                shadow-lg
                                shadow-white/[0.03]
                              "
                            >
                              <UserPlus size={14} />
                              Follow
                            </motion.button>

                            {/* Remove */}
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() =>
                                removeUserFromList(u.id)
                              }
                              className="
                                h-9
                                w-9
                                rounded-xl
                                flex
                                items-center
                                justify-center
                                bg-white/[0.025]
                                border
                                border-white/[0.06]
                                text-zinc-600
                                hover:text-white
                                hover:bg-white/[0.07]
                                transition-all
                              "
                              title="Remove"
                            >
                              <X size={15} />
                            </motion.button>
                          </>
                        )}

                      </div>

                    </motion.div>
                  );
                })}

              </AnimatePresence>

            </div>

          ) : (

            /* EMPTY STATE */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                min-h-[360px]
                flex
                flex-col
                items-center
                justify-center
                rounded-3xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                text-center
                px-6
              "
            >

              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
                <Search
                  size={26}
                  strokeWidth={1.5}
                  className="text-zinc-500"
                />
              </div>

              <h3 className="text-sm font-semibold mb-1">
                No people found
              </h3>

              <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                {searchQuery
                  ? `We couldn't find anyone matching "${searchQuery}".`
                  : 'There are no new people to discover right now.'}
              </p>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-5 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-zinc-300 hover:bg-white/[0.08] transition-colors"
                >
                  Clear search
                </button>
              )}

            </motion.div>
          )}

        </div>
      </main>

      {/* Bottom accent */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

    </div>
  );
};

export default FindFriends;
