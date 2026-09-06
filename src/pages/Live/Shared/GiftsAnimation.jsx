import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Sparkles,
  Crown,
  Flame
} from 'lucide-react';

const LARGE_GIFT_THRESHOLD = 50;
const SMALL_GIFT_DURATION = 2200;
const LARGE_GIFT_DURATION = 4000;
const MAX_QUEUE_SIZE = 12;

/*
 * ============================================================
 * FALLBACK GIFT DATA
 * ============================================================
 *
 * If your gift record does not contain an image URL,
 * these are used as fallbacks.
 *
 * You can later replace these with your real gift assets.
 */

const getGiftFallback = giftId => {
  const id = String(giftId || '').toLowerCase();

  if (id === 'rose') {
    return {
      emoji: '🌹',
      icon: Gift
    };
  }

  if (id === 'crown') {
    return {
      emoji: '👑',
      icon: Crown
    };
  }

  if (id === 'fire' || id === 'flame') {
    return {
      emoji: '🔥',
      icon: Flame
    };
  }

  if (id === 'diamond') {
    return {
      emoji: '💎',
      icon: Sparkles
    };
  }

  return {
    emoji: '🎁',
    icon: Gift
  };
};

/*
 * ============================================================
 * GET GIFT IMAGE
 * ============================================================
 *
 * Supports several possible column names so this component
 * can work with your existing gift records without changing
 * the database.
 */

const getGiftImage = gift => {
  if (!gift) {
    return null;
  }

  return (
    gift.image_url ||
    gift.gift_image ||
    gift.image ||
    gift.asset_url ||
    gift.thumbnail_url ||
    gift.icon_url ||
    null
  );
};

const getGiftName = gift => {
  if (!gift) {
    return 'Gift';
  }

  return (
    gift.gift_name ||
    gift.name ||
    gift.gift_id ||
    'Gift'
  );
};

const getGiftPrice = gift => {
  const possibleValues = [
    gift?.price_total,
    gift?.coins,
    gift?.price,
    gift?.amount,
    gift?.gift_price
  ];

  for (const value of possibleValues) {
    const number = Number(value);

    if (
      Number.isFinite(number)
    ) {
      return number;
    }
  }

  return 0;
};

const getSenderName = gift => {
  return (
    gift?.sender_name ||
    gift?.username ||
    gift?.sender_username ||
    'Fan'
  );
};

const getGiftUniqueId = gift => {
  return (
    gift?.id ||
    `${gift?.sender_id || 'anonymous'}-${gift?.gift_id || 'gift'}-${Date.now()}-${Math.random()}`
  );
};

const GiftsAnimation = ({
  streamId
}) => {
  const [activeGift, setActiveGift] =
    useState(null);

  const [giftQueue, setGiftQueue] =
    useState([]);

  const timerRef =
    useRef(null);

  const mountedRef =
    useRef(false);

  /*
   * ============================================================
   * COMPONENT LIFECYCLE
   * ============================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /*
   * ============================================================
   * DISPLAY NEXT GIFT
   * ============================================================
   */

  const showNextGift = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setGiftQueue(currentQueue => {
      if (
        !currentQueue ||
        currentQueue.length === 0
      ) {
        setActiveGift(null);
        return [];
      }

      const [nextGift, ...remaining] =
        currentQueue;

      setActiveGift(nextGift);

      const price =
        getGiftPrice(nextGift);

      const duration =
        price >= LARGE_GIFT_THRESHOLD
          ? LARGE_GIFT_DURATION
          : SMALL_GIFT_DURATION;

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }

      timerRef.current =
        setTimeout(() => {
          if (!mountedRef.current) {
            return;
          }

          setActiveGift(null);

          /*
           * Give AnimatePresence time to
           * complete the exit animation.
           */

          setTimeout(() => {
            showNextGift();
          }, 180);
        }, duration);

      return remaining;
    });
  }, []);

  /*
   * ============================================================
   * QUEUE GIFT
   * ============================================================
   */

  const triggerAnimation =
    useCallback(
      gift => {
        if (
          !gift ||
          !mountedRef.current
        ) {
          return;
        }

        const normalizedGift = {
          ...gift,
          __animationId:
            getGiftUniqueId(gift)
        };

        setGiftQueue(currentQueue => {
          /*
           * Don't allow an unlimited number of
           * animations to build up.
           */

          const nextQueue = [
            ...currentQueue,
            normalizedGift
          ].slice(-MAX_QUEUE_SIZE);

          /*
           * If there is currently no active
           * animation, start the queue.
           */

          if (!activeGift) {
            setTimeout(() => {
              showNextGift();
            }, 0);
          }

          return nextQueue;
        });
      },
      [
        activeGift,
        showNextGift
      ]
    );

  /*
   * ============================================================
   * SUPABASE REALTIME
   * ============================================================
   *
   * This is the SAME database event regardless of whether
   * the stream is:
   *
   * - Device Camera
   * - Guest
   * - Gaming
   *
   * streamId identifies the current room.
   */

  useEffect(() => {
    if (!streamId) {
      setActiveGift(null);
      setGiftQueue([]);

      return undefined;
    }

    let cancelled = false;

    const channel =
      supabase
        .channel(
          `gift-overlay-${streamId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_gifts',
            filter: `stream_id=eq.${streamId}`
          },
          payload => {
            if (
              cancelled ||
              !payload?.new
            ) {
              return;
            }

            triggerAnimation(
              payload.new
            );
          }
        )
        .subscribe(status => {
          if (cancelled) {
            return;
          }

          if (
            status !== 'SUBSCRIBED'
          ) {
            console.warn(
              '[GiftsAnimation] Realtime status:',
              status
            );
          }
        });

    return () => {
      cancelled = true;

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );

        timerRef.current = null;
      }

      setActiveGift(null);
      setGiftQueue([]);

      supabase.removeChannel(
        channel
      );
    };
  }, [
    streamId,
    triggerAnimation
  ]);

  /*
   * ============================================================
   * NOTHING TO DISPLAY
   * ============================================================
   */

  if (!activeGift) {
    return null;
  }

  const price =
    getGiftPrice(activeGift);

  const giftName =
    getGiftName(activeGift);

  const senderName =
    getSenderName(activeGift);

  const giftImage =
    getGiftImage(activeGift);

  const fallback =
    getGiftFallback(
      activeGift.gift_id
    );

  const isLargeGift =
    price >= LARGE_GIFT_THRESHOLD;

  const FallbackIcon =
    fallback.icon;

  /*
   * ============================================================
   * LARGE GIFT
   * ============================================================
   */

  if (isLargeGift) {
    return (
      <div
        className="
          absolute
          inset-0
          z-[80]
          flex
          items-center
          justify-center
          pointer-events-none
          px-4
        "
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={
              activeGift.__animationId
            }
            initial={{
              opacity: 0,
              scale: 0.55,
              y: 60
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 1.12,
              y: -70
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 15
            }}
            className="
              flex
              max-w-[90vw]
              flex-col
              items-center
            "
          >
            {/* Main gift */}

            <motion.div
              animate={{
                scale: [
                  1,
                  1.08,
                  1
                ],
                rotate: [
                  0,
                  -2,
                  2,
                  0
                ]
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                repeatDelay: 0.8
              }}
              className="
                relative
                flex
                h-32
                w-32
                sm:h-40
                sm:w-40
                items-center
                justify-center
              "
            >
              {/* Glow */}

              <div
                className="
                  absolute
                  inset-0
                  rounded-full
                  bg-cyan-400/20
                  blur-3xl
                "
              />

              {/* Gift image */}

              {giftImage ? (
                <img
                  src={giftImage}
                  alt={giftName}
                  className="
                    relative
                    z-10
                    max-h-full
                    max-w-full
                    object-contain
                    drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]
                  "
                />
              ) : (
                <span
                  className="
                    relative
                    z-10
                    text-8xl
                    sm:text-9xl
                    drop-shadow-[0_15px_35px_rgba(0,0,0,0.7)]
                  "
                >
                  {fallback.emoji}
                </span>
              )}
            </motion.div>

            {/* Information card */}

            <motion.div
              initial={{
                opacity: 0,
                y: 15
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.15
              }}
              className="
                mt-4
                flex
                max-w-[92vw]
                flex-col
                items-center
                rounded-2xl
                border
                border-white/15
                bg-black/70
                px-5
                py-3
                text-center
                shadow-2xl
                backdrop-blur-xl
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <FallbackIcon
                  size={15}
                  className="
                    text-yellow-400
                  "
                />

                <span
                  className="
                    text-xs
                    font-medium
                    text-zinc-300
                  "
                >
                  {senderName}
                </span>
              </div>

              <div
                className="
                  mt-1
                  text-base
                  sm:text-lg
                  font-bold
                  text-white
                "
              >
                sent a {giftName}
              </div>

              <div
                className="
                  mt-1
                  rounded-full
                  bg-yellow-400/10
                  px-3
                  py-1
                  text-[10px]
                  font-bold
                  text-yellow-300
                "
              >
                {price.toLocaleString()} coins
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /*
   * ============================================================
   * SMALL GIFT
   * ============================================================
   *
   * Small gifts don't interrupt the stream.
   * They appear as a compact notification.
   */

  return (
    <div
      className="
        absolute
        inset-0
        z-[75]
        pointer-events-none
      "
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={
            activeGift.__animationId
          }
          initial={{
            opacity: 0,
            x: -40,
            scale: 0.8
          }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            x: 30,
            scale: 0.9
          }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 18
          }}
          className="
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            sm:left-5
          "
        >
          <div
            className="
              flex
              items-center
              gap-2.5
              rounded-2xl
              border
              border-white/10
              bg-zinc-950/80
              px-2.5
              py-2
              shadow-xl
              backdrop-blur-xl
            "
          >
            {/* Gift image */}

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                bg-white/5
              "
            >
              {giftImage ? (
                <img
                  src={giftImage}
                  alt={giftName}
                  className="
                    h-full
                    w-full
                    object-contain
                  "
                />
              ) : (
                <span
                  className="
                    text-2xl
                  "
                >
                  {fallback.emoji}
                </span>
              )}
            </div>

            {/* Text */}

            <div
              className="
                min-w-0
                max-w-[170px]
              "
            >
              <div
                className="
                  truncate
                  text-[10px]
                  font-semibold
                  text-white
                "
              >
                {senderName}
              </div>

              <div
                className="
                  truncate
                  text-[9px]
                  text-zinc-400
                "
              >
                sent {giftName}
              </div>
            </div>

            {/* Coins */}

            <div
              className="
                shrink-0
                rounded-full
                bg-yellow-400/10
                px-2
                py-1
                text-[9px]
                font-bold
                text-yellow-300
              "
            >
              +{price}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GiftsAnimation;
