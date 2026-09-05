import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Share2,
  X,
  CheckCircle2,
  Plus,
  Target,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const DEFAULT_GOAL = 1000;

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatCompactNumber = value => {
  const number = safeNumber(value);

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return number;
};

const getAvatarUrl = (avatarUrl, seed) => {
  if (avatarUrl) {
    return avatarUrl;
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    seed || 'user'
  )}`;
};

const StreamHeader = ({
  data,
  isHost,
  viewerCount,
  onLeave
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [duration, setDuration] = useState('00:00:00');
  const [isConnected, setIsConnected] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [liveMetrics, setLiveMetrics] = useState({
    likes: safeNumber(data?.likes),
    current_goal: safeNumber(data?.gift_goal_current),
    total_goal: safeNumber(data?.gift_goal_total, DEFAULT_GOAL) || DEFAULT_GOAL
  });

  const [topGifters, setTopGifters] = useState([]);

  /*
   * Keep metrics synchronized if the parent receives
   * a new stream object.
   */
  useEffect(() => {
    if (!data) {
      return;
    }

    setLiveMetrics({
      likes: safeNumber(data.likes),
      current_goal: safeNumber(data.gift_goal_current),
      total_goal:
        safeNumber(data.gift_goal_total, DEFAULT_GOAL) || DEFAULT_GOAL
    });
  }, [
    data?.likes,
    data?.gift_goal_current,
    data?.gift_goal_total
  ]);

  /*
   * Stream duration timer
   */
  useEffect(() => {
    if (!data?.created_at) {
      setDuration('00:00:00');
      return undefined;
    }

    const updateDuration = () => {
      const start = new Date(data.created_at).getTime();
      const now = Date.now();

      if (!Number.isFinite(start)) {
        setDuration('00:00:00');
        return;
      }

      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / 3600000)
        .toString()
        .padStart(2, '0');

      const minutes = Math.floor((diff % 3600000) / 60000)
        .toString()
        .padStart(2, '0');

      const seconds = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, '0');

      setDuration(`${hours}:${minutes}:${seconds}`);
    };

    updateDuration();

    const timer = setInterval(updateDuration, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [data?.created_at]);

  /*
   * Check whether the current viewer follows the host.
   */
  useEffect(() => {
    let cancelled = false;

    const checkFollowStatus = async () => {
      if (isHost || !data?.host_id) {
        if (!cancelled) {
          setIsFollowing(false);
        }
        return;
      }

      try {
        const {
          data: authData,
          error: authError
        } = await supabase.auth.getUser();

        if (authError || !authData?.user || cancelled) {
          return;
        }

        const { data: followData, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', authData.user.id)
          .eq('following_id', data.host_id)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (error) {
          console.warn(
            '[StreamHeader] Follow status check failed:',
            error.message
          );
          setIsFollowing(false);
          return;
        }

        setIsFollowing(Boolean(followData));
      } catch (error) {
        if (!cancelled) {
          console.warn(
            '[StreamHeader] Follow status error:',
            error
          );
        }
      }
    };

    checkFollowStatus();

    return () => {
      cancelled = true;
    };
  }, [data?.host_id, isHost]);

  /*
   * Follow / unfollow host.
   */
  const handleToggleFollow = async () => {
    if (
      isHost ||
      !data?.host_id ||
      isFollowLoading
    ) {
      return;
    }

    setIsFollowLoading(true);

    try {
      const {
        data: authData,
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        return;
      }

      const userId = authData.user.id;

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', data.host_id);

        if (error) {
          console.error(
            '[StreamHeader] Unfollow failed:',
            error
          );
          return;
        }

        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: userId,
              following_id: data.host_id
            }
          ]);

        if (error) {
          console.error(
            '[StreamHeader] Follow failed:',
            error
          );
          return;
        }

        setIsFollowing(true);
      }
    } catch (error) {
      console.error(
        '[StreamHeader] Follow action failed:',
        error
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  /*
   * Live stream metrics + top gifters.
   *
   * This component only reads live-stream data.
   * It does NOT create Socket.IO or WebRTC connections.
   */
  useEffect(() => {
    if (!data?.id) {
      return undefined;
    }

    let cancelled = false;

    const streamId = data.id;

    const updateMetrics = stream => {
      if (cancelled || !stream) {
        return;
      }

      setLiveMetrics({
        likes: safeNumber(stream.likes),
        current_goal: safeNumber(stream.gift_goal_current),
        total_goal:
          safeNumber(
            stream.gift_goal_total,
            DEFAULT_GOAL
          ) || DEFAULT_GOAL
      });
    };

    const fetchStreamMetrics = async () => {
      const { data: stream, error } = await supabase
        .from('live_streams')
        .select(
          'likes, gift_goal_current, gift_goal_total'
        )
        .eq('id', streamId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn(
          '[StreamHeader] Stream metrics fetch failed:',
          error.message
        );
        return;
      }

      if (stream) {
        updateMetrics(stream);
      }
    };

    const fetchTopGifters = async () => {
      const { data: gifts, error: giftError } = await supabase
        .from('live_gifts')
        .select('sender_id, price_total')
        .eq('stream_id', streamId);

      if (cancelled) {
        return;
      }

      if (giftError) {
        console.warn(
          '[StreamHeader] Gift leaderboard fetch failed:',
          giftError.message
        );
        return;
      }

      if (!gifts || gifts.length === 0) {
        setTopGifters([]);
        return;
      }

      const grouped = gifts.reduce(
        (accumulator, gift) => {
          if (!gift?.sender_id) {
            return accumulator;
          }

          if (!accumulator[gift.sender_id]) {
            accumulator[gift.sender_id] = {
              sender_id: gift.sender_id,
              price_total: 0
            };
          }

          accumulator[gift.sender_id].price_total += safeNumber(
            gift.price_total
          );

          return accumulator;
        },
        {}
      );

      const sortedGifters = Object.values(grouped)
        .sort(
          (a, b) =>
            b.price_total - a.price_total
        )
        .slice(0, 3);

      if (sortedGifters.length === 0) {
        setTopGifters([]);
        return;
      }

      const userIds = sortedGifters.map(
        gifter => gifter.sender_id
      );

      const {
        data: profiles,
        error: profileError
      } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', userIds);

      if (cancelled) {
        return;
      }

      if (profileError) {
        console.warn(
          '[StreamHeader] Gifter profiles fetch failed:',
          profileError.message
        );

        setTopGifters(
          sortedGifters.map((gifter, index) => ({
            ...gifter,
            rank: index + 1,
            profiles: null
          }))
        );

        return;
      }

      const profileList = profiles || [];

      const merged = sortedGifters.map(
        (gifter, index) => ({
          ...gifter,
          rank: index + 1,
          profiles:
            profileList.find(
              profile =>
                profile.id === gifter.sender_id
            ) || null
        })
      );

      setTopGifters(merged);
    };

    fetchStreamMetrics();
    fetchTopGifters();

    /*
     * One realtime channel for live stream metrics.
     */
    const streamChannel = supabase
      .channel(`stream-header-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        payload => {
          if (cancelled || !payload?.new) {
            return;
          }

          updateMetrics(payload.new);
        }
      )
      .subscribe(status => {
        if (cancelled) {
          return;
        }

        setIsConnected(
          status === 'SUBSCRIBED'
        );
      });

    /*
     * Gift changes refresh the leaderboard.
     */
    const giftChannel = supabase
      .channel(`stream-header-gifts-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          if (cancelled) {
            return;
          }

          fetchTopGifters();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;

      supabase.removeChannel(streamChannel);
      supabase.removeChannel(giftChannel);
    };
  }, [data?.id]);

  /*
   * Gift goal percentage.
   */
  const goalPercent = useMemo(() => {
    const currentGoal = Math.max(
      0,
      safeNumber(liveMetrics.current_goal)
    );

    const totalGoal =
      safeNumber(
        liveMetrics.total_goal,
        DEFAULT_GOAL
      ) || DEFAULT_GOAL;

    return Math.min(
      (currentGoal / totalGoal) * 100,
      100
    );
  }, [
    liveMetrics.current_goal,
    liveMetrics.total_goal
  ]);

  const isGoalExceeded =
    safeNumber(liveMetrics.current_goal) >=
    (
      safeNumber(
        liveMetrics.total_goal,
        DEFAULT_GOAL
      ) || DEFAULT_GOAL
    );

  const formattedLikes = formatCompactNumber(
    liveMetrics.likes
  );

  const formattedViewerCount =
    formatCompactNumber(viewerCount);

  const hostAvatar = getAvatarUrl(
    data?.host?.avatar_url,
    data?.host_id
  );

  return (
    <header className="absolute top-0 left-0 right-0 p-4 flex flex-col gap-2.5 z-50 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none select-none">

      {/* ================= MAIN HEADER ROW ================= */}

      <div className="flex justify-between items-center w-full">

        {/* LEFT COLUMN */}

        <div className="flex items-center gap-1.5 pointer-events-auto">

          {/* Host Info */}

          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 pr-2.5 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]">

            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-cyan-400/80 overflow-hidden relative shadow-[0_0_8px_rgba(6,182,212,0.5)]">

              <img
                src={hostAvatar}
                className="w-full h-full object-cover"
                alt="host"
              />

            </div>

            <div className="flex flex-col max-w-[75px]">

              <div className="flex items-center gap-0.5">

                <span className="text-[10px] font-bold text-white truncate drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                  {data?.host?.username || 'Creator'}
                </span>

                <CheckCircle2
                  size={9}
                  className="text-cyan-400 fill-cyan-400 flex-shrink-0 drop-shadow-[0_0_6px_#06b6d4]"
                />

              </div>

              <span className="text-[8px] font-medium text-cyan-200/80 leading-none drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]">
                {formattedLikes} Likes
              </span>

            </div>

            {!isHost && (
              <motion.button
                type="button"
                disabled={isFollowLoading}
                whileTap={{
                  scale: isFollowLoading ? 1 : 0.9
                }}
                onClick={handleToggleFollow}
                aria-label={
                  isFollowing
                    ? 'Unfollow host'
                    : 'Follow host'
                }
                className={`ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isFollowing
                    ? 'bg-zinc-800/80 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-[#fe2c55] text-white border border-rose-400/50 shadow-[0_0_12px_rgba(254,44,85,0.6)] hover:shadow-[0_0_18px_rgba(254,44,85,0.8)]'
                } ${
                  isFollowLoading
                    ? 'opacity-50 cursor-wait'
                    : ''
                }`}
              >
                {isFollowing ? (
                  <CheckCircle2
                    size={10}
                    className="drop-shadow-[0_0_4px_#06b6d4]"
                  />
                ) : (
                  <Plus
                    size={11}
                    className="stroke-[3] drop-shadow-[0_0_4px_#ffffff]"
                  />
                )}
              </motion.button>
            )}

          </div>

          {/* Viewer Count */}

          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] h-[38px]">

            <Users
              size={11}
              className="text-cyan-400 drop-shadow-[0_0_6px_#06b6d4]"
            />

            <span className="text-[10px] font-bold text-cyan-100 tracking-wide drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
              {formattedViewerCount}
            </span>

          </div>

        </div>

        {/* RIGHT COLUMN */}

        <div className="flex items-center gap-2 pointer-events-auto">

          {/* Top Gifters */}

          <div className="flex items-center -space-x-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] h-[38px]">

            {topGifters.map((gifter, index) => {

              const rankClass =
                index === 0
                  ? 'z-30 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                  : index === 1
                    ? 'z-20 border-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.5)]'
                    : 'z-10 border-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.5)]';

              const avatar = getAvatarUrl(
                gifter.profiles?.avatar_url,
                gifter.sender_id
              );

              return (
                <div
                  key={gifter.sender_id}
                  className={`w-6 h-6 rounded-full border relative bg-zinc-900 overflow-hidden ${rankClass}`}
                  title={
                    gifter.profiles?.username ||
                    'Top Gifter'
                  }
                >
                  <img
                    src={avatar}
                    className="w-full h-full object-cover"
                    alt="top-gifter"
                  />
                </div>
              );
            })}

            {topGifters.length === 0 && (
              <span className="text-[9px] text-cyan-200/50 px-1 font-medium drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]">
                No Gifters
              </span>
            )}

          </div>

          {/* Share */}

          <button
            type="button"
            aria-label="Share stream"
            className="w-[38px] h-[38px] flex items-center justify-center bg-black/40 hover:bg-cyan-500/20 transition-all rounded-full text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(6,182,212,0.5)]"
          >
            <Share2
              size={14}
              className="drop-shadow-[0_0_6px_#06b6d4]"
            />
          </button>

          {/* Leave */}

          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave stream"
            className="w-[38px] h-[38px] flex items-center justify-center bg-black/50 hover:bg-red-500/20 active:scale-95 transition-all rounded-full text-red-400 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
          >
            <X
              size={16}
              className="drop-shadow-[0_0_6px_#ef4444]"
            />
          </button>

        </div>

      </div>

      {/* ================= SECONDARY SYSTEM METRICS ROW ================= */}

      <div className="flex flex-col gap-1.5 mt-0.5">

        {/* Stream Duration */}

        <div className="flex items-center gap-1.5 pointer-events-auto self-start">

          <div className="bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-pink-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)] flex items-center gap-1.5">

            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected
                  ? 'bg-[#fe2c55] shadow-[0_0_8px_#fe2c55]'
                  : 'bg-zinc-500'
              } animate-pulse`}
            />

            <span className="text-[9px] font-bold text-pink-200 font-mono tracking-wider drop-shadow-[0_0_5px_rgba(244,63,94,0.6)]">
              {duration}
            </span>

          </div>

          <AnimatePresence>
            {!isConnected && (
              <motion.div
                initial={{
                  opacity: 0,
                  x: -5
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  x: -5
                }}
                className="bg-amber-950/50 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] flex items-center gap-1"
              >
                <WifiOff
                  size={9}
                  className="text-amber-400 drop-shadow-[0_0_5px_#f59e0b]"
                />

                <span className="text-[8px] font-bold text-amber-300 uppercase tracking-tight drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                  Reconnecting...
                </span>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Live Gift Goal */}

        <div className="w-full max-w-[180px] bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)] pointer-events-auto">

          <div className="flex justify-between items-center mb-1 px-0.5">

            <div className="flex items-center gap-1 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.7)]">

              <Target
                size={10}
                className="drop-shadow-[0_0_4px_#facc15]"
              />

              <span className="text-[8px] font-bold uppercase tracking-wider">
                {isGoalExceeded
                  ? 'Goal Reached!'
                  : 'Live Goal'}
              </span>

            </div>

            <span className="text-[8px] font-bold text-yellow-200 font-mono drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
              {safeNumber(
                liveMetrics.current_goal
              )}
              /
              {safeNumber(
                liveMetrics.total_goal,
                DEFAULT_GOAL
              ) || DEFAULT_GOAL}
            </span>

          </div>

          <div className="h-1 w-full bg-zinc-900/80 rounded-full overflow-hidden relative border border-yellow-500/20">

            <motion.div
              initial={{
                width: 0
              }}
              animate={{
                width: `${goalPercent}%`
              }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 15
              }}
              className={`h-full rounded-full ${
                isGoalExceeded
                  ? 'bg-yellow-400 shadow-[0_0_12px_#facc15]'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.7)]'
              }`}
            />

          </div>

        </div>

      </div>

    </header>
  );
};

export default StreamHeader;
