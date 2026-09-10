import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EXIT_MS = 260;
const DEFAULT_DURATION = 2200;
const MIN_DURATION = 900;
const MAX_DURATION = 8000;
const MAX_QUEUE = 30;

const giftIcons = {
  rose: "🌹",
  fire: "🔥",
  campfire: "🔥",
  weights: "💪",
  flex: "💪",
  clap: "👏",
  star: "⭐",
  heart: "❤️",
  pizza: "🍕",
  burger: "🍔",
  diamond: "💎",
  balloon: "🎈",
  crown: "👑",
  guitar: "🎸",
  car: "🚗",
  drone: "🚁",
  dj: "🎧",
  castle: "🏰",
  lion: "🦁",
  money: "💰",
  helicopter: "🚁",
  ship: "🚢",
  dragon: "🐉",
  universe: "🌌",
  space: "🚀",
  world: "🌍",
  xwing: "✈️",
  cow: "🐄",
  whale: "🐋",
  horse: "🐎",
  spider: "🕷️",
  wolf: "🐺",
  shark: "🦈",
  bunny: "🐰",
  stag: "🦌"
};

const giftNames = {
  rose: "Rose",
  fire: "Fire",
  campfire: "Fire",
  weights: "Weights",
  flex: "Weights",
  clap: "Clap",
  star: "Star",
  heart: "Heart",
  pizza: "Pizza",
  burger: "Burger",
  diamond: "Diamond",
  balloon: "Balloon",
  crown: "Crown",
  guitar: "Guitar",
  car: "Car",
  drone: "Drone",
  dj: "DJ",
  castle: "Castle",
  lion: "Lion",
  money: "Money",
  helicopter: "Helicopter",
  ship: "Ship",
  dragon: "Dragon",
  universe: "Universe",
  space: "Space",
  world: "World",
  xwing: "X-Wing",
  cow: "Cow",
  whale: "Whale",
  horse: "Horse",
  spider: "Spider",
  wolf: "Wolf",
  shark: "Shark",
  bunny: "Bunny",
  stag: "Stag"
};

const rarityStyles = {
  common: {
    label: "COMMON",
    className: "from-white/10 via-white/5 to-transparent border-white/15"
  },
  uncommon: {
    label: "UNCOMMON",
    className: "from-emerald-400/20 via-white/5 to-transparent border-emerald-300/30"
  },
  rare: {
    label: "RARE",
    className: "from-blue-400/25 via-white/5 to-transparent border-blue-300/35"
  },
  epic: {
    label: "EPIC",
    className: "from-purple-400/25 via-white/5 to-transparent border-purple-300/35"
  },
  legendary: {
    label: "LEGENDARY",
    className: "from-amber-400/30 via-orange-400/10 to-transparent border-amber-300/45"
  },
  mythic: {
    label: "MYTHIC",
    className: "from-fuchsia-400/30 via-purple-400/10 to-transparent border-fuchsia-300/45"
  }
};

const normalizeKey = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const getGiftCandidates = gift => [
  gift?.gift_id,
  gift?.id,
  gift?.gift_name,
  gift?.giftName,
  gift?.name,
  gift?.gift?.id,
  gift?.gift?.name
].map(normalizeKey).filter(Boolean);

const getGiftKey = gift => {
  const candidates = getGiftCandidates(gift);
  return candidates.find(key => giftIcons[key]) || candidates[0] || "gift";
};

const getGiftIcon = gift => {
  const candidates = getGiftCandidates(gift);

  for (const key of candidates) {
    if (giftIcons[key]) return giftIcons[key];
  }

  const supplied = gift?.gift_icon || gift?.icon || gift?.giftImage || gift?.image;

  if (supplied && supplied !== "🎁" && supplied !== "gift" && supplied !== "Gift") return supplied;

  return "✨";
};

const getGiftName = gift => {
  const candidates = getGiftCandidates(gift);
  const key = candidates.find(item => giftNames[item]) || getGiftKey(gift);

  if (giftNames[key]) return giftNames[key];

  return String(gift?.gift_name || gift?.giftName || gift?.name || "Gift").trim() || "Gift";
};

const getQuantity = gift => {
  const value = Number(gift?.quantity ?? gift?.count ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 9999) : 1;
};

const getPrice = gift => {
  const value = Number(gift?.price_total ?? gift?.price ?? gift?.amount ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const getDuration = gift => {
  const raw = Number(
    gift?.animation_duration ??
    gift?.animationDuration ??
    gift?.duration ??
    gift?.duration_ms
  );

  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_DURATION;

  const milliseconds = raw > 20 ? raw : raw * 1000;

  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, milliseconds));
};

const getRarity = gift => {
  const value = normalizeKey(gift?.gift_rarity || gift?.rarity || "common");

  if (value === "mythic") return "mythic";
  if (value === "legendary") return "legendary";
  if (value === "epic") return "epic";
  if (value === "rare") return "rare";
  if (value === "uncommon") return "uncommon";

  return "common";
};

const getSound = gift => {
  const value =
    gift?.gift_sound ||
    gift?.sound ||
    gift?.sound_url ||
    gift?.soundUrl ||
    gift?.gift?.sound ||
    null;

  if (!value || typeof value !== "string") return null;

  const url = value.trim();

  if (!url || url === "null" || url === "undefined") return null;

  return url;
};

const getAnimation = gift => normalizeKey(gift?.gift_animation || gift?.animation || "pop");

const getSenderName = gift =>
  String(
    gift?.sender_username ||
    gift?.username ||
    gift?.sender_name ||
    gift?.sender?.username ||
    "Someone"
  ).trim() || "Someone";

const getAlertKey = gift =>
  String(
    gift?._alertKey ||
    gift?.event_id ||
    gift?.transaction_id ||
    `${gift?.stream_id || "stream"}-${gift?.gift_id || gift?.gift_name || gift?.id || "gift"}-${gift?.created_at || Date.now()}`
  );

const GiftVisual = ({ gift, lowData }) => {
  const icon = getGiftIcon(gift);
  const name = getGiftName(gift);
  const animation = getAnimation(gift);
  const rarity = getRarity(gift);

  const isImage =
    typeof icon === "string" &&
    /^(https?:\/\/|data:image\/|\/)/i.test(icon);

  const visualVariants = {
    pop: {
      initial: { opacity: 0, scale: 0.35, rotate: -12 },
      animate: {
        opacity: 1,
        scale: [0.35, 1.18, 0.96, 1],
        rotate: [-12, 6, -2, 0],
        transition: { duration: 0.55, ease: "easeOut" }
      }
    },
    bounce: {
      initial: { opacity: 0, y: 35, scale: 0.65 },
      animate: {
        opacity: 1,
        y: [35, -12, 4, 0],
        scale: [0.65, 1.12, 0.98, 1],
        transition: { duration: 0.6, ease: "easeOut" }
      }
    },
    zoom: {
      initial: { opacity: 0, scale: 0.1 },
      animate: {
        opacity: 1,
        scale: [0.1, 1.25, 1],
        transition: { duration: 0.55, ease: "easeOut" }
      }
    },
    shake: {
      initial: { opacity: 0, scale: 0.8 },
      animate: {
        opacity: 1,
        scale: 1,
        x: [0, -7, 7, -5, 5, 0],
        transition: { duration: 0.6, ease: "easeOut" }
      }
    }
  };

  const selectedAnimation = visualVariants[animation] || visualVariants.pop;

  return (
    <motion.div
      variants={selectedAnimation}
      initial="initial"
      animate="animate"
      className="relative flex items-center justify-center"
    >
      {!lowData && (
        <>
          <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute inset-3 rounded-full border border-white/10 animate-pulse" />
        </>
      )}

      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-black/35 shadow-2xl backdrop-blur-md sm:h-32 sm:w-32">
        {isImage ? (
          <img
            src={icon}
            alt={name}
            className="h-20 w-20 object-contain drop-shadow-2xl sm:h-24 sm:w-24"
            onError={event => {
              event.currentTarget.style.display = "none";
              const fallback = event.currentTarget.parentElement?.querySelector("[data-fallback]");
              if (fallback) fallback.style.display = "block";
            }}
          />
        ) : null}

        <span
          data-fallback
          className={`${isImage ? "hidden" : "block"} select-none text-7xl leading-none drop-shadow-2xl sm:text-8xl`}
          aria-label={name}
        >
          {isImage ? "✨" : icon}
        </span>
      </div>
    </motion.div>
  );
};

const GiftAlertOverlay = ({
  gift,
  onComplete,
  lowData = false,
  position = "center",
  muted = false,
  className = ""
}) => {
  const [queue, setQueue] = useState([]);
  const [activeGift, setActiveGift] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const queuedKeysRef = useRef(new Set());
  const completingRef = useRef(false);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.onended = null;
    audio.onerror = null;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}

    audioRef.current = null;
  }, []);

  const playGiftSound = useCallback(async currentGift => {
    if (muted || lowData) return;

    const soundUrl = getSound(currentGift);

    if (!soundUrl) return;

    stopAudio();

    const audio = new Audio(soundUrl);
    audio.preload = "auto";
    audio.volume = 0.9;
    audioRef.current = audio;

    try {
      await audio.play();
    } catch (error) {
      if (
        error?.name !== "AbortError" &&
        error?.name !== "NotAllowedError"
      ) {
        console.warn("Gift sound unavailable:", error);
      }
    }
  }, [lowData, muted, stopAudio]);

  const completeActiveGift = useCallback(() => {
    if (completingRef.current) return;

    completingRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    stopAudio();
    setIsVisible(false);
  }, [stopAudio]);

  useEffect(() => {
    if (!gift) return;

    const alertKey = getAlertKey(gift);

    if (queuedKeysRef.current.has(alertKey)) return;

    queuedKeysRef.current.add(alertKey);

    const preparedGift = {
      ...gift,
      _alertKey: alertKey
    };

    setQueue(previous => {
      const next = [...previous, preparedGift];

      if (next.length <= MAX_QUEUE) return next;

      return next.slice(next.length - MAX_QUEUE);
    });

    const cleanupKey = setTimeout(() => {
      queuedKeysRef.current.delete(alertKey);
    }, 30000);

    return () => clearTimeout(cleanupKey);
  }, [gift]);

  useEffect(() => {
    if (activeGift || isVisible || queue.length === 0) return;

    const nextGift = queue[0];

    setQueue(previous => previous.slice(1));
    setActiveGift(nextGift);
    setIsVisible(true);
    completingRef.current = false;
  }, [activeGift, isVisible, queue]);

  useEffect(() => {
    if (!activeGift || !isVisible) return;

    const duration = getDuration(activeGift);
    const visibleDuration = Math.max(500, duration - EXIT_MS);

    playGiftSound(activeGift);

    timerRef.current = setTimeout(() => {
      completeActiveGift();
    }, visibleDuration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeGift, isVisible, completeActiveGift, playGiftSound]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopAudio();
    };
  }, [stopAudio]);

  const data = useMemo(() => {
    if (!activeGift) return null;

    const key = getGiftKey(activeGift);
    const rarity = getRarity(activeGift);
    const rarityInfo = rarityStyles[rarity] || rarityStyles.common;

    return {
      key,
      icon: getGiftIcon(activeGift),
      name: getGiftName(activeGift),
      sender: getSenderName(activeGift),
      quantity: getQuantity(activeGift),
      price: getPrice(activeGift),
      rarity,
      rarityLabel: rarityInfo.label,
      rarityClass: rarityInfo.className
    };
  }, [activeGift]);

  const positionClass =
    position === "top"
      ? "top-20"
      : position === "bottom"
        ? "bottom-24"
        : "top-1/2 -translate-y-1/2";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-4 ${positionClass} ${className}`}
    >
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          const finishedGift = activeGift;

          setActiveGift(null);
          setIsVisible(false);
          completingRef.current = false;

          if (finishedGift && typeof onComplete === "function") {
            onComplete(finishedGift);
          }
        }}
      >
        {activeGift && data && isVisible ? (
          <motion.div
            key={activeGift._alertKey}
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -12, transition: { duration: EXIT_MS / 1000, ease: "easeIn" } }}
            className="flex w-full max-w-md justify-center"
          >
            <div className="relative w-full overflow-hidden rounded-3xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${data.rarityClass}`} />

              {!lowData && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.8, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="absolute -inset-20 bg-white/10 blur-3xl"
                  />

                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-16 rounded-full border border-white/5"
                  />
                </>
              )}

              <div className="relative flex flex-col items-center rounded-3xl border border-white/10 bg-black/55 px-5 py-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
                  <span>{data.sender}</span>
                  <span className="text-white/40">sent</span>
                </div>

                <GiftVisual gift={activeGift} lowData={lowData} />

                <div className="mt-3 text-center">
                  <div className="text-xl font-black text-white">
                    {data.name}
                  </div>

                  {data.quantity > 1 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-1 text-lg font-black text-white"
                    >
                      ×{data.quantity}
                    </motion.div>
                  )}

                  <div className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-white/60">
                    {data.rarityLabel}
                  </div>

                  {data.price > 0 && (
                    <div className="mt-2 text-sm font-semibold text-white/60">
                      {data.price.toLocaleString()} coins
                    </div>
                  )}
                </div>

                {!lowData && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                    {[0, 1, 2, 3, 4, 5].map(index => (
                      <motion.span
                        key={index}
                        initial={{
                          opacity: 0,
                          x: `${50 + index * 5}%`,
                          y: "80%"
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          y: ["80%", "10%"],
                          x: `${35 + index * 12}%`
                        }}
                        transition={{
                          duration: 1.4 + index * 0.12,
                          delay: index * 0.08,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                        className="absolute text-xs text-white/60"
                      >
                        ✦
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default GiftAlertOverlay;
