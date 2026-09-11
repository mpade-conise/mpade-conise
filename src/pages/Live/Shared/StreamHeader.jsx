import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Share2,
  X,
  CheckCircle2,
  Plus,
  Target,
  WifiOff,
  Wifi,
  Copy,
  Check,
  Gift,
  Clock3,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const DEFAULT_GOAL = 1000;
const FOLLOWER_DUPLICATE_CODE = '23505';

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatCompactNumber = value => {
  const number = safeNumber(value);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}m`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return number;
};

const formatGiftValue = value => {
  const number = safeNumber(value);

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}m`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return Math.round(number).toLocaleString();
};

const getAvatarUrl = (avatarUrl, seed) => {
  if (avatarUrl) {
    return avatarUrl;
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'user')}`;
};

const getConnectionState = status => {
  if (status === 'SUBSCRIBED') {
    return 'connected';
  }

  if (
    status === 'CHANNEL_ERROR' ||
    status === 'TIMED_OUT' ||
    status === 'CLOSED'
  ) {
    return 'disconnected';
  }

  return 'connecting';
};

const StreamHeader = ({
  data,
  isHost,
  viewerCount,
  onLeave
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [duration, setDuration] = useState('00:00:00');
  const [connectionState, setConnectionState] = useState('connecting');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [topGifters, setTopGifters] = useState([]);
  const [giftValue, setGiftValue] = useState(0);
  const [giftLoading, setGiftLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(false);

  const [liveMetrics, setLiveMetrics] = useState({
    likes: safeNumber(data?.likes),
    current_goal: safeNumber(data?.gift_goal_current),
    total_goal:
      safeNumber(data?.gift_goal_total, DEFAULT_GOAL) ||
      DEFAULT_GOAL
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setLiveMetrics({
      likes: safeNumber(data.likes),
      current_goal: safeNumber(data.gift_goal_current),
      total_goal:
        safeNumber(data.gift_goal_total, DEFAULT_GOAL) ||
        DEFAULT_GOAL
    });
  }, [
    data?.likes,
    data?.gift_goal_current,
    data?.gift_goal_total
  ]);

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

    return () => clearInterval(timer);
  }, [data?.created_at]);

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

        if (
          authError ||
          !authData?.user ||
          cancelled
        ) {
          return;
        }

        const {
          data: followData,
          error
        } = await supabase
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
        showToast('Please sign in to follow creators.', 'error');
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
          showToast('Could not unfollow this creator.', 'error');
          return;
        }

        setIsFollowing(false);
        showToast('Unfollowed successfully.', 'success');
        return;
      }

      const { error } = await supabase
        .from('follows')
        .insert([
          {
            follower_id: userId,
            following_id: data.host_id
          }
        ]);

      if (error) {
        if (error.code === FOLLOWER_DUPLICATE_CODE) {
          setIsFollowing(true);
          showToast('You are already following this creator.', 'info');
          return;
        }

        console.error(
          '[StreamHeader] Follow failed:',
          error
        );

        showToast('Could not follow this creator.', 'error');
        return;
      }

      setIsFollowing(true);
      showToast('Following creator.', 'success');
    } catch (error) {
      console.error(
        '[StreamHeader] Follow action failed:',
        error
      );
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setIsFollowLoading(false);
    }
  };

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

      setMetricsError(false);
    };

    const fetchStreamMetrics = async () => {
      const {
        data: stream,
        error
      } = await supabase
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
        setMetricsError(true);
        return;
      }

      if (stream) {
        updateMetrics(stream);
      }
    };

    const fetchTopGifters = async () => {
      setGiftLoading(true);

      try {
        const {
          data: gifts,
          error: giftError
        } = await supabase
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
          setTopGifters([]);
          setGiftValue(0);
          return;
        }

        if (!gifts?.length) {
          setTopGifters([]);
          setGiftValue(0);
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

        const totalValue = gifts.reduce(
          (total, gift) =>
            total + safeNumber(gift?.price_total),
          0
        );

        setGiftValue(totalValue);

        const sortedGifters = Object.values(grouped)
          .sort(
            (a, b) =>
              b.price_total - a.price_total
          )
          .slice(0, 3);

        if (!sortedGifters.length) {
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

        const profileList = profiles || [];

        if (profileError) {
          console.warn(
            '[StreamHeader] Gifter profiles fetch failed:',
            profileError.message
          );
        }

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
      } finally {
        if (!cancelled) {
          setGiftLoading(false);
        }
      }
    };

    fetchStreamMetrics();
    fetchTopGifters();

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

        setConnectionState(
          getConnectionState(status)
        );
      });

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
        async payload => {
          if (
            cancelled ||
            !payload?.new
          ) {
            return;
          }

          const gift = payload.new;
          const senderId = gift.sender_id;
          const price = safeNumber(
            gift.price_total
          );

          if (!senderId) {
            return;
          }

          setGiftValue(previous => previous + price);

          setTopGifters(previous => {
            const existing = previous.find(
              item =>
                item.sender_id === senderId
            );

            if (existing) {
              const updated = previous.map(
                item =>
                  item.sender_id === senderId
                    ? {
                        ...item,
                        price_total:
                          item.price_total +
                          price
                      }
                    : item
              );

              return updated
                .sort(
                  (a, b) =>
                    b.price_total -
                    a.price_total
                )
                .slice(0, 3)
                .map((item, index) => ({
                  ...item,
                  rank: index + 1
                }));
            }

            return previous;
          });

          const exists = topGifters.some(
            item =>
              item.sender_id === senderId
          );

          if (!exists) {
            const {
              data: profile
            } = await supabase
              .from('profiles')
              .select(
                'id, avatar_url, username'
              )
              .eq('id', senderId)
              .maybeSingle();

            if (cancelled) {
              return;
            }

            setTopGifters(previous => {
              const updated = [
                ...previous,
                {
                  sender_id: senderId,
                  price_total: price,
                  rank: 0,
                  profiles: profile || null
                }
              ]
                .sort(
                  (a, b) =>
                    b.price_total -
                    a.price_total
                )
                .slice(0, 3)
                .map((item, index) => ({
                  ...item,
                  rank: index + 1
                }));

              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(streamChannel);
      supabase.removeChannel(giftChannel);
    };
  }, [data?.id]);

  const handleShare = async () => {
    if (isShareLoading) {
      return;
    }

    setIsShareLoading(true);
    setShareCopied(false);

    try {
      const streamUrl = window.location.href;
      const title =
        data?.title ||
        data?.stream_title ||
        `${data?.host?.username || 'Creator'} is live on Made Universe`;

      if (
        navigator.share &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title,
          text: `Watch ${data?.host?.username || 'this creator'} live on Made Universe.`,
          url: streamUrl
        });

        showToast('Stream shared successfully.', 'success');
        return;
      }

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(
          streamUrl
        );

        setShareCopied(true);
        showToast(
          'Live stream link copied.',
          'success'
        );

        setTimeout(() => {
          setShareCopied(false);
        }, 2000);

        return;
      }

      const textArea =
        document.createElement('textarea');

      textArea.value = streamUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      setShareCopied(true);
      showToast(
        'Live stream link copied.',
        'success'
      );
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      console.error(
        '[StreamHeader] Share failed:',
        error
      );

      showToast(
        'Could not share this stream.',
        'error'
      );
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleLeave = () => {
    if (isHost) {
      setLeaveConfirm(true);
      return;
    }

    if (typeof onLeave === 'function') {
      onLeave();
    }
  };

  const confirmLeave = () => {
    setLeaveConfirm(false);

    if (typeof onLeave === 'function') {
      onLeave();
    }
  };

  const goalPercent = useMemo(() => {
    const currentGoal = Math.max(
      0,
      safeNumber(
        liveMetrics.current_goal
      )
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
    safeNumber(
      liveMetrics.current_goal
    ) >=
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

  const hostUsername =
    data?.host?.username ||
    data?.username ||
    'Creator';

  const streamTitle =
    data?.title ||
    data?.stream_title ||
    data?.description ||
    '';

  const streamCategory =
    data?.category ||
    data?.category_name ||
    '';

  const streamLanguage =
    data?.language ||
    data?.stream_language ||
    '';

  const streamRegion =
    data?.region ||
    data?.district ||
    '';

  const isAgeRestricted =
    Boolean(
      data?.age_restricted ||
      data?.is_age_restricted ||
      data?.age_limit >= 18
    );

  const isVerified =
    Boolean(
      data?.host?.verified_status ||
      data?.host?.is_verified ||
      data?.host?.verified
    );

  const connectionLabel =
    connectionState === 'connected'
      ? 'Connected'
      : connectionState === 'connecting'
        ? 'Connecting'
        : 'Reconnecting';

  const connectionIcon =
    connectionState === 'connected'
      ? Wifi
      : connectionState === 'connecting'
        ? Loader2
        : WifiOff;

  const ConnectionIcon =
    connectionIcon;

  return (
    <>
      <header
        className="
          absolute
          top-0
          left-0
          right-0
          z-50
          pointer-events-none
          select-none
          px-2.5
          pt-2.5
          sm:px-4
          sm:pt-4
        "
      >
        <div className="w-full max-w-screen-2xl mx-auto flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pointer-events-auto">
              <div
                className="
                  flex items-center min-w-0 gap-1.5 sm:gap-2
                  rounded-2xl border border-white/10
                  bg-zinc-950/80 backdrop-blur-xl
                  px-1.5 py-1.5
                  shadow-lg shadow-black/30
                "
              >
                <div
                  className="
                    relative h-9 w-9 sm:h-10 sm:w-10
                    shrink-0 overflow-hidden rounded-full
                    border border-white/20 bg-zinc-800
                  "
                >
                  <img
                    src={hostAvatar}
                    className="h-full w-full object-cover"
                    alt={`${hostUsername} profile`}
                    loading="eager"
                  />

                  <span
                    className="
                      absolute bottom-0.5 right-0.5
                      h-2 w-2 rounded-full
                      bg-red-500 ring-2 ring-zinc-950
                    "
                    aria-label="Live"
                  />
                </div>

                <div className="min-w-0 max-w-[110px] sm:max-w-[180px] leading-none">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="truncate text-[11px] sm:text-xs font-semibold text-white">
                      {hostUsername}
                    </span>

                    {isVerified && (
                      <CheckCircle2
                        size={11}
                        className="shrink-0 text-cyan-400"
                        aria-label="Verified creator"
                      />
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[9px] sm:text-[10px] text-zinc-400">
                      {formattedLikes} likes
                    </span>

                    {isAgeRestricted && (
                      <span
                        className="
                          shrink-0 rounded-md
                          border border-red-400/20
                          bg-red-500/10 px-1
                          text-[7px] font-bold
                          text-red-300
                        "
                      >
                        18+
                      </span>
                    )}
                  </div>
                </div>

                {!isHost && (
                  <motion.button
                    type="button"
                    disabled={isFollowLoading}
                    whileTap={{
                      scale: isFollowLoading ? 1 : 0.92
                    }}
                    onClick={handleToggleFollow}
                    aria-label={
                      isFollowing
                        ? `Unfollow ${hostUsername}`
                        : `Follow ${hostUsername}`
                    }
                    className={`
                      shrink-0 flex h-7 w-7
                      items-center justify-center
                      rounded-full transition-all
                      ${
                        isFollowing
                          ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-400'
                          : 'border border-rose-400/30 bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      }
                      ${
                        isFollowLoading
                          ? 'opacity-50 cursor-wait'
                          : ''
                      }
                    `}
                  >
                    {isFollowLoading ? (
                      <Loader2
                        size={13}
                        className="animate-spin"
                      />
                    ) : isFollowing ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Plus
                        size={14}
                        className="stroke-[3]"
                      />
                    )}
                  </motion.button>
                )}
              </div>

              <div
                className="
                  flex h-[42px] shrink-0
                  items-center gap-1.5
                  rounded-2xl border border-white/10
                  bg-zinc-950/80 px-2.5 sm:px-3
                  backdrop-blur-xl
                  shadow-lg shadow-black/30
                "
                aria-label={`${viewerCount || 0} viewers`}
              >
                <Users
                  size={13}
                  className="text-cyan-400"
                />

                <span className="text-[10px] sm:text-[11px] font-semibold text-white">
                  {formattedViewerCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
              <div
                className="
                  hidden sm:flex h-[42px]
                  items-center gap-2
                  rounded-2xl border border-white/10
                  bg-zinc-950/80 px-2.5
                  backdrop-blur-xl
                  shadow-lg shadow-black/30
                "
                aria-label={`Gift value ${formatGiftValue(giftValue)}`}
              >
                <Gift
                  size={13}
                  className="text-yellow-400"
                />

                {giftLoading ? (
                  <Loader2
                    size={12}
                    className="animate-spin text-zinc-500"
                  />
                ) : (
                  <span className="text-[9px] font-semibold text-zinc-200">
                    {formatGiftValue(giftValue)}
                  </span>
                )}

                {topGifters.length > 0 && (
                  <div className="flex items-center -space-x-1.5 ml-0.5">
                    {topGifters.map((gifter, index) => {
                      const avatar = getAvatarUrl(
                        gifter.profiles?.avatar_url,
                        gifter.sender_id
                      );

                      const rankClass =
                        index === 0
                          ? 'border-yellow-400'
                          : index === 1
                            ? 'border-zinc-300'
                            : 'border-amber-600';

                      return (
                        <div
                          key={gifter.sender_id}
                          title={`${gifter.profiles?.username || 'Top Gifter'} • ${formatGiftValue(gifter.price_total)}`}
                          className={`
                            relative h-7 w-7 overflow-hidden
                            rounded-full border-2 bg-zinc-900
                            ${rankClass}
                          `}
                        >
                          <img
                            src={avatar}
                            className="h-full w-full object-cover"
                            alt={`${gifter.profiles?.username || 'Top gifter'} avatar`}
                            loading="lazy"
                          />

                          <span
                            className="
                              absolute bottom-0 right-0
                              min-w-2.5 h-2.5 rounded-full
                              bg-black/80 px-0.5
                              text-center text-[6px]
                              font-bold text-white
                            "
                          >
                            {gifter.rank}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleShare}
                disabled={isShareLoading}
                aria-label="Share live stream"
                className="
                  flex h-[42px] w-[42px] shrink-0
                  items-center justify-center
                  rounded-2xl border border-white/10
                  bg-zinc-950/80 text-zinc-200
                  backdrop-blur-xl transition
                  hover:border-cyan-400/40
                  hover:bg-cyan-400/10
                  hover:text-cyan-300
                  active:scale-95
                  disabled:cursor-wait disabled:opacity-60
                "
              >
                {isShareLoading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : shareCopied ? (
                  <Check size={15} />
                ) : (
                  <Share2 size={15} />
                )}
              </button>

              <button
                type="button"
                onClick={handleLeave}
                aria-label={
                  isHost
                    ? 'End or leave live stream'
                    : 'Leave live stream'
                }
                className="
                  flex h-[42px] w-[42px] shrink-0
                  items-center justify-center
                  rounded-2xl border border-red-500/20
                  bg-red-500/10 text-red-400
                  backdrop-blur-xl transition
                  hover:border-red-400/50
                  hover:bg-red-500/20
                  hover:text-red-300
                  active:scale-95
                "
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {(streamTitle ||
            streamCategory ||
            streamLanguage ||
            streamRegion) && (
            <div className="pointer-events-auto flex min-w-0 max-w-[min(100%,520px)]">
              <div
                className="
                  min-w-0 max-w-full
                  rounded-xl border border-white/10
                  bg-zinc-950/75 px-2.5 py-2
                  backdrop-blur-xl shadow-lg shadow-black/20
                "
              >
                {streamTitle && (
                  <p className="truncate text-[10px] sm:text-[11px] font-semibold text-white">
                    {streamTitle}
                  </p>
                )}

                {(streamCategory ||
                  streamLanguage ||
                  streamRegion) && (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
                    {streamCategory && (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[7px] font-medium text-zinc-300">
                        {streamCategory}
                      </span>
                    )}

                    {streamLanguage && (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[7px] font-medium text-zinc-300">
                        {streamLanguage}
                      </span>
                    )}

                    {streamRegion && (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[7px] font-medium text-zinc-300">
                        {streamRegion}
                      </span>
                    )}

                    {isAgeRestricted && (
                      <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[7px] font-bold text-red-300">
                        18+
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 pointer-events-auto">
              <div
                className="
                  flex h-7 items-center gap-1.5
                  rounded-xl border border-white/10
                  bg-zinc-950/75 px-2.5
                  backdrop-blur-xl
                "
                aria-label={`Live duration ${duration}`}
              >
                <Clock3
                  size={10}
                  className="text-red-400"
                />

                <span className="font-mono text-[9px] font-semibold tracking-wide text-zinc-200">
                  {duration}
                </span>
              </div>

              <div
                className={`
                  flex h-7 items-center gap-1.5
                  rounded-xl border px-2
                  backdrop-blur-xl
                  ${
                    connectionState === 'connected'
                      ? 'border-emerald-400/20 bg-emerald-500/10'
                      : connectionState === 'connecting'
                        ? 'border-cyan-400/20 bg-cyan-500/10'
                        : 'border-amber-400/20 bg-amber-500/10'
                  }
                `}
                aria-live="polite"
              >
                <ConnectionIcon
                  size={10}
                  className={`
                    ${
                      connectionState === 'connected'
                        ? 'text-emerald-400'
                        : connectionState === 'connecting'
                          ? 'text-cyan-400 animate-spin'
                          : 'text-amber-400'
                    }
                  `}
                />

                <span
                  className={`
                    text-[8px] font-semibold
                    uppercase tracking-wide
                    ${
                      connectionState === 'connected'
                        ? 'text-emerald-300'
                        : connectionState === 'connecting'
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                    }
                  `}
                >
                  {connectionLabel}
                </span>
              </div>

              <AnimatePresence>
                {metricsError && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -3
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      y: -3
                    }}
                    className="
                      flex h-7 items-center gap-1
                      rounded-xl border
                      border-red-400/20
                      bg-red-500/10 px-2
                      backdrop-blur-xl
                    "
                  >
                    <AlertCircle
                      size={10}
                      className="text-red-400"
                    />

                    <span className="text-[8px] font-semibold text-red-300">
                      Sync issue
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {connectionState !== 'connected' && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -3
                    }}
                    animate={{
                      opacity: 1,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      y: -3
                    }}
                    className="
                      flex h-7 items-center gap-1
                      rounded-xl border
                      border-amber-500/20
                      bg-amber-500/10 px-2
                      backdrop-blur-xl
                    "
                  >
                    <WifiOff
                      size={10}
                      className="text-amber-400"
                    />

                    <span className="text-[8px] font-semibold uppercase tracking-wide text-amber-300">
                      Reconnecting
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              className="
                pointer-events-auto
                w-[150px] sm:w-[200px]
                shrink-0 rounded-xl
                border border-white/10
                bg-zinc-950/80 p-2
                backdrop-blur-xl
                shadow-lg shadow-black/20
              "
              aria-label={`Gift goal ${Math.round(goalPercent)} percent complete`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Target
                    size={11}
                    className={
                      isGoalExceeded
                        ? 'shrink-0 text-yellow-400'
                        : 'shrink-0 text-amber-400'
                    }
                  />

                  <span
                    className={`
                      truncate text-[8px] sm:text-[9px]
                      font-semibold uppercase
                      tracking-wider
                      ${
                        isGoalExceeded
                          ? 'text-yellow-300'
                          : 'text-amber-300'
                      }
                    `}
                  >
                    {isGoalExceeded
                      ? 'Goal reached'
                      : 'Live goal'}
                  </span>
                </div>

                <span className="shrink-0 font-mono text-[8px] sm:text-[9px] font-semibold text-zinc-300">
                  {formatGiftValue(
                    liveMetrics.current_goal
                  )}
                  /
                  {formatGiftValue(
                    liveMetrics.total_goal
                  )}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${goalPercent}%`
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 50,
                    damping: 15
                  }}
                  className={`
                    h-full rounded-full
                    ${
                      isGoalExceeded
                        ? 'bg-yellow-400'
                        : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300'
                    }
                  `}
                />
              </div>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-[7px] text-zinc-500">
                  {Math.round(goalPercent)}% complete
                </span>

                {giftValue > 0 && (
                  <span className="flex items-center gap-1 text-[7px] text-zinc-500">
                    <Gift size={8} />
                    {formatGiftValue(giftValue)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.96
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.96
            }}
            className="
              pointer-events-none
              fixed left-1/2 top-4 z-[100]
              -translate-x-1/2
              rounded-xl border
              border-white/10
              bg-zinc-950/95
              px-3 py-2
              shadow-2xl shadow-black/40
              backdrop-blur-xl
            "
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2
                  size={14}
                  className="text-emerald-400"
                />
              ) : toast.type === 'error' ? (
                <AlertCircle
                  size={14}
                  className="text-red-400"
                />
              ) : (
                <Wifi
                  size={14}
                  className="text-cyan-400"
                />
              )}

              <span className="text-[10px] font-medium text-white">
                {toast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="
              fixed inset-0 z-[90]
              flex items-center justify-center
              bg-black/60 px-4
              backdrop-blur-sm
              pointer-events-auto
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-live-title"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 12,
                scale: 0.96
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.96
              }}
              className="
                w-full max-w-sm
                rounded-2xl border
                border-white/10
                bg-zinc-950
                p-5 shadow-2xl
                shadow-black/50
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                  <X size={18} />
                </div>

                <div className="min-w-0">
                  <h2
                    id="leave-live-title"
                    className="text-sm font-semibold text-white"
                  >
                    Leave live stream?
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    You are currently hosting this live.
                    Leaving may end your active host session
                    depending on the room controller.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLeaveConfirm(false)
                  }
                  className="
                    flex-1 rounded-xl
                    border border-white/10
                    bg-white/5 px-3 py-2.5
                    text-xs font-semibold
                    text-zinc-200 transition
                    hover:bg-white/10
                  "
                >
                  Stay
                </button>

                <button
                  type="button"
                  onClick={confirmLeave}
                  className="
                    flex-1 rounded-xl
                    bg-red-500 px-3 py-2.5
                    text-xs font-semibold
                    text-white transition
                    hover:bg-red-400
                    active:scale-[0.98]
                  "
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StreamHeader;
