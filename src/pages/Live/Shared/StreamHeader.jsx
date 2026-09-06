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

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}m`;
  }

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
    total_goal:
      safeNumber(data?.gift_goal_total, DEFAULT_GOAL) ||
      DEFAULT_GOAL
  });

  const [topGifters, setTopGifters] = useState([]);

  /*
   * ============================================================
   * SYNC STREAM METRICS
   * ============================================================
   */

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

  /*
   * ============================================================
   * STREAM DURATION
   * ============================================================
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

      const minutes = Math.floor(
        (diff % 3600000) / 60000
      )
        .toString()
        .padStart(2, '0');

      const seconds = Math.floor(
        (diff % 60000) / 1000
      )
        .toString()
        .padStart(2, '0');

      setDuration(
        `${hours}:${minutes}:${seconds}`
      );
    };

    updateDuration();

    const timer = setInterval(
      updateDuration,
      1000
    );

    return () => clearInterval(timer);
  }, [data?.created_at]);

  /*
   * ============================================================
   * FOLLOW STATUS
   * ============================================================
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
          .eq(
            'follower_id',
            authData.user.id
          )
          .eq(
            'following_id',
            data.host_id
          )
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
   * ============================================================
   * FOLLOW / UNFOLLOW
   * ============================================================
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

      if (
        authError ||
        !authData?.user
      ) {
        return;
      }

      const userId = authData.user.id;

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq(
            'follower_id',
            userId
          )
          .eq(
            'following_id',
            data.host_id
          );

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
   * ============================================================
   * LIVE METRICS + TOP GIFTERS
   * ============================================================
   */

  useEffect(() => {
    if (!data?.id) {
      return undefined;
    }

    let cancelled = false;

    const streamId = data.id;

    const updateMetrics = stream => {
      if (
        cancelled ||
        !stream
      ) {
        return;
      }

      setLiveMetrics({
        likes: safeNumber(stream.likes),
        current_goal: safeNumber(
          stream.gift_goal_current
        ),
        total_goal:
          safeNumber(
            stream.gift_goal_total,
            DEFAULT_GOAL
          ) || DEFAULT_GOAL
      });
    };

    const fetchStreamMetrics =
      async () => {
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

          return;
        }

        if (stream) {
          updateMetrics(stream);
        }
      };

    const fetchTopGifters =
      async () => {
        const {
          data: gifts,
          error: giftError
        } = await supabase
          .from('live_gifts')
          .select(
            'sender_id, price_total'
          )
          .eq(
            'stream_id',
            streamId
          );

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

        if (
          !gifts ||
          gifts.length === 0
        ) {
          setTopGifters([]);
          return;
        }

        const grouped =
          gifts.reduce(
            (
              accumulator,
              gift
            ) => {
              if (
                !gift?.sender_id
              ) {
                return accumulator;
              }

              if (
                !accumulator[
                  gift.sender_id
                ]
              ) {
                accumulator[
                  gift.sender_id
                ] = {
                  sender_id:
                    gift.sender_id,
                  price_total: 0
                };
              }

              accumulator[
                gift.sender_id
              ].price_total +=
                safeNumber(
                  gift.price_total
                );

              return accumulator;
            },
            {}
          );

        const sortedGifters =
          Object.values(grouped)
            .sort(
              (a, b) =>
                b.price_total -
                a.price_total
            )
            .slice(0, 3);

        if (
          sortedGifters.length === 0
        ) {
          setTopGifters([]);
          return;
        }

        const userIds =
          sortedGifters.map(
            gifter =>
              gifter.sender_id
          );

        const {
          data: profiles,
          error: profileError
        } = await supabase
          .from('profiles')
          .select(
            'id, avatar_url, username'
          )
          .in(
            'id',
            userIds
          );

        if (cancelled) {
          return;
        }

        if (profileError) {
          console.warn(
            '[StreamHeader] Gifter profiles fetch failed:',
            profileError.message
          );

          setTopGifters(
            sortedGifters.map(
              (
                gifter,
                index
              ) => ({
                ...gifter,
                rank:
                  index + 1,
                profiles:
                  null
              })
            )
          );

          return;
        }

        const profileList =
          profiles || [];

        const merged =
          sortedGifters.map(
            (
              gifter,
              index
            ) => ({
              ...gifter,
              rank:
                index + 1,
              profiles:
                profileList.find(
                  profile =>
                    profile.id ===
                    gifter.sender_id
                ) || null
            })
          );

        setTopGifters(
          merged
        );
      };

    fetchStreamMetrics();
    fetchTopGifters();

    /*
     * ONE stream metrics realtime channel.
     */

    const streamChannel =
      supabase
        .channel(
          `stream-header-${streamId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'live_streams',
            filter: `id=eq.${streamId}`
          },
          payload => {
            if (
              cancelled ||
              !payload?.new
            ) {
              return;
            }

            updateMetrics(
              payload.new
            );
          }
        )
        .subscribe(
          status => {
            if (cancelled) {
              return;
            }

            setIsConnected(
              status ===
                'SUBSCRIBED'
            );
          }
        );

    /*
     * Gift leaderboard channel.
     */

    const giftChannel =
      supabase
        .channel(
          `stream-header-gifts-${streamId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_gifts',
            filter: `stream_id=eq.${streamId}`
          },
          () => {
            if (
              cancelled
            ) {
              return;
            }

            fetchTopGifters();
          }
        )
        .subscribe();

    return () => {
      cancelled = true;

      supabase.removeChannel(
        streamChannel
      );

      supabase.removeChannel(
        giftChannel
      );
    };
  }, [data?.id]);

  /*
   * ============================================================
   * DERIVED VALUES
   * ============================================================
   */

  const goalPercent =
    useMemo(() => {
      const currentGoal =
        Math.max(
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
        (currentGoal /
          totalGoal) *
          100,
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

  const formattedLikes =
    formatCompactNumber(
      liveMetrics.likes
    );

  const formattedViewerCount =
    formatCompactNumber(
      viewerCount
    );

  const hostAvatar =
    getAvatarUrl(
      data?.host?.avatar_url,
      data?.host_id
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <header
      className="
        absolute
        top-0
        left-0
        right-0
        z-50
        pointer-events-none
        select-none
        px-3
        pt-3
        sm:px-4
        sm:pt-4
      "
    >
      {/* ======================================================
          HEADER CONTAINER
      ====================================================== */}

      <div
        className="
          w-full
          max-w-screen-2xl
          mx-auto
          flex
          flex-col
          gap-2
        "
      >
        {/* ====================================================
            PRIMARY HEADER
        ==================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-2
            min-w-0
          "
        >
          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-2
              min-w-0
              pointer-events-auto
            "
          >
            {/* HOST CARD */}

            <div
              className="
                flex
                items-center
                min-w-0
                gap-2
                rounded-2xl
                border
                border-white/10
                bg-zinc-950/75
                backdrop-blur-xl
                px-1.5
                py-1.5
                shadow-lg
                shadow-black/20
              "
            >
              {/* Avatar */}

              <div
                className="
                  relative
                  h-9
                  w-9
                  sm:h-10
                  sm:w-10
                  shrink-0
                  overflow-hidden
                  rounded-full
                  border
                  border-white/20
                  bg-zinc-800
                "
              >
                <img
                  src={hostAvatar}
                  className="
                    h-full
                    w-full
                    object-cover
                  "
                  alt="host"
                />

                {/* Live indicator */}

                <span
                  className="
                    absolute
                    bottom-0.5
                    right-0.5
                    h-2
                    w-2
                    rounded-full
                    bg-red-500
                    ring-2
                    ring-zinc-950
                  "
                />
              </div>

              {/* Host details */}

              <div
                className="
                  min-w-0
                  max-w-[115px]
                  sm:max-w-[180px]
                  leading-none
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-1
                    min-w-0
                  "
                >
                  <span
                    className="
                      truncate
                      text-[11px]
                      sm:text-xs
                      font-semibold
                      text-white
                    "
                  >
                    {data?.host?.username ||
                      'Creator'}
                  </span>

                  <CheckCircle2
                    size={11}
                    className="
                      shrink-0
                      text-cyan-400
                    "
                  />
                </div>

                <span
                  className="
                    mt-1
                    block
                    truncate
                    text-[9px]
                    sm:text-[10px]
                    text-zinc-400
                  "
                >
                  {formattedLikes} likes
                </span>
              </div>

              {/* Follow */}

              {!isHost && (
                <motion.button
                  type="button"
                  disabled={
                    isFollowLoading
                  }
                  whileTap={{
                    scale:
                      isFollowLoading
                        ? 1
                        : 0.92
                  }}
                  onClick={
                    handleToggleFollow
                  }
                  aria-label={
                    isFollowing
                      ? 'Unfollow host'
                      : 'Follow host'
                  }
                  className={`
                    shrink-0
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    transition-all
                    ${
                      isFollowing
                        ? `
                          border
                          border-cyan-400/20
                          bg-cyan-400/10
                          text-cyan-400
                        `
                        : `
                          border
                          border-rose-400/30
                          bg-rose-500
                          text-white
                          shadow-md
                          shadow-rose-500/20
                        `
                    }
                    ${
                      isFollowLoading
                        ? 'opacity-50 cursor-wait'
                        : ''
                    }
                  `}
                >
                  {isFollowing ? (
                    <CheckCircle2
                      size={13}
                    />
                  ) : (
                    <Plus
                      size={14}
                      className="stroke-[3]"
                    />
                  )}
                </motion.button>
              )}
            </div>

            {/* VIEWERS */}

            <div
              className="
                flex
                h-[42px]
                shrink-0
                items-center
                gap-1.5
                rounded-2xl
                border
                border-white/10
                bg-zinc-950/75
                px-3
                backdrop-blur-xl
                shadow-lg
                shadow-black/20
              "
            >
              <Users
                size={13}
                className="
                  text-cyan-400
                "
              />

              <span
                className="
                  text-[10px]
                  sm:text-[11px]
                  font-semibold
                  text-white
                "
              >
                {formattedViewerCount}
              </span>
            </div>
          </div>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div
            className="
              flex
              items-center
              gap-1.5
              shrink-0
              pointer-events-auto
            "
          >
            {/* TOP GIFTERS */}

            <div
              className="
                hidden
                sm:flex
                h-[42px]
                items-center
                rounded-2xl
                border
                border-white/10
                bg-zinc-950/75
                px-2.5
                backdrop-blur-xl
                shadow-lg
                shadow-black/20
              "
            >
              {topGifters.length >
              0 ? (
                <div
                  className="
                    flex
                    items-center
                    -space-x-1.5
                  "
                >
                  {topGifters.map(
                    (
                      gifter,
                      index
                    ) => {
                      const avatar =
                        getAvatarUrl(
                          gifter
                            .profiles
                            ?.avatar_url,
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
                          key={
                            gifter.sender_id
                          }
                          title={
                            gifter
                              .profiles
                              ?.username ||
                            'Top Gifter'
                          }
                          className={`
                            relative
                            h-7
                            w-7
                            overflow-hidden
                            rounded-full
                            border-2
                            bg-zinc-900
                            ${rankClass}
                          `}
                        >
                          <img
                            src={avatar}
                            className="
                              h-full
                              w-full
                              object-cover
                            "
                            alt="top-gifter"
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <span
                  className="
                    text-[9px]
                    font-medium
                    text-zinc-500
                  "
                >
                  No gifters yet
                </span>
              )}
            </div>

            {/* SHARE */}

            <button
              type="button"
              aria-label="Share stream"
              className="
                flex
                h-[42px]
                w-[42px]
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-zinc-950/75
                text-zinc-200
                backdrop-blur-xl
                transition
                hover:border-cyan-400/40
                hover:bg-cyan-400/10
                hover:text-cyan-300
                active:scale-95
              "
            >
              <Share2
                size={15}
              />
            </button>

            {/* LEAVE */}

            <button
              type="button"
              onClick={onLeave}
              aria-label="Leave stream"
              className="
                flex
                h-[42px]
                w-[42px]
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/10
                text-red-400
                backdrop-blur-xl
                transition
                hover:border-red-400/50
                hover:bg-red-500/20
                hover:text-red-300
                active:scale-95
              "
            >
              <X
                size={17}
              />
            </button>
          </div>
        </div>

        {/* ====================================================
            SECONDARY INFORMATION
        ==================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-2
            min-w-0
          "
        >
          {/* LEFT STATUS */}

          <div
            className="
              flex
              min-w-0
              flex-wrap
              items-center
              gap-1.5
              pointer-events-auto
            "
          >
            {/* LIVE / DURATION */}

            <div
              className="
                flex
                h-7
                items-center
                gap-1.5
                rounded-xl
                border
                border-white/10
                bg-zinc-950/70
                px-2.5
                backdrop-blur-xl
              "
            >
              <span
                className={`
                  h-1.5
                  w-1.5
                  shrink-0
                  rounded-full
                  ${
                    isConnected
                      ? 'bg-red-500'
                      : 'bg-zinc-500'
                  }
                  ${
                    isConnected
                      ? 'animate-pulse'
                      : ''
                  }
                `}
              />

              <span
                className="
                  font-mono
                  text-[9px]
                  font-semibold
                  tracking-wide
                  text-zinc-200
                "
              >
                {duration}
              </span>
            </div>

            {/* RECONNECTING */}

            <AnimatePresence>
              {!isConnected && (
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
                    flex
                    h-7
                    items-center
                    gap-1
                    rounded-xl
                    border
                    border-amber-500/20
                    bg-amber-500/10
                    px-2
                    backdrop-blur-xl
                  "
                >
                  <WifiOff
                    size={10}
                    className="
                      text-amber-400
                    "
                  />

                  <span
                    className="
                      text-[8px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-amber-300
                    "
                  >
                    Reconnecting
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ==================================================
              GIFT GOAL
          ================================================== */}

          <div
            className="
              pointer-events-auto
              w-[150px]
              sm:w-[190px]
              shrink-0
              rounded-xl
              border
              border-white/10
              bg-zinc-950/75
              p-2
              backdrop-blur-xl
              shadow-lg
              shadow-black/20
            "
          >
            <div
              className="
                mb-1.5
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-1.5
                "
              >
                <Target
                  size={11}
                  className="
                    shrink-0
                    text-yellow-400
                  "
                />

                <span
                  className="
                    truncate
                    text-[8px]
                    sm:text-[9px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-yellow-300
                  "
                >
                  {isGoalExceeded
                    ? 'Goal reached'
                    : 'Live goal'}
                </span>
              </div>

              <span
                className="
                  shrink-0
                  font-mono
                  text-[8px]
                  sm:text-[9px]
                  font-semibold
                  text-zinc-300
                "
              >
                {safeNumber(
                  liveMetrics.current_goal
                )}
                /
                {safeNumber(
                  liveMetrics.total_goal,
                  DEFAULT_GOAL
                ) ||
                  DEFAULT_GOAL}
              </span>
            </div>

            <div
              className="
                h-1.5
                w-full
                overflow-hidden
                rounded-full
                bg-white/10
              "
            >
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
                className={`
                  h-full
                  rounded-full
                  ${
                    isGoalExceeded
                      ? 'bg-yellow-400'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300'
                  }
                `}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StreamHeader;
