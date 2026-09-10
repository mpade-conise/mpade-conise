```jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DEFAULT_DURATION = 3000;
const MAX_QUEUE = 30;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getDuration = gift => {
  const seconds = Number(gift?.animation_duration ?? gift?.gift_animation_duration ?? gift?.sound_duration ?? gift?.gift_sound_duration);
  return Number.isFinite(seconds) && seconds > 0 ? clamp(seconds * 1000, 700, 15000) : DEFAULT_DURATION;
};

const getQuantity = gift => {
  const quantity = Number(gift?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getPrice = gift => {
  const total = Number(gift?.price_total);
  if (Number.isFinite(total) && total >= 0) return total;
  const price = Number(gift?.price);
  return Number.isFinite(price) && price >= 0 ? price * getQuantity(gift) : 0;
};

const getRarity = gift => {
  const rarity = String(gift?.rarity ?? gift?.gift_rarity ?? 'common').toLowerCase();
  return ['common', 'rare', 'epic', 'legendary'].includes(rarity) ? rarity : 'common';
};

const getAnimation = gift => {
  const animation = String(gift?.animation ?? gift?.gift_animation ?? 'float').toLowerCase();
  return ['float', 'bounce', 'pulse', 'sparkle', 'flame', 'slide', 'rain', 'grand'].includes(animation) ? animation : 'float';
};

const getIcon = gift => gift?.gift_icon || gift?.icon || '🎁';

const getGiftName = gift => gift?.gift_name || gift?.giftName || 'Gift';

const getUsername = gift => gift?.username || gift?.sender_username || 'Someone';

const getAvatar = gift => gift?.avatar || gift?.avatar_url || gift?.sender_avatar || '';

const getSound = gift => gift?.gift_sound || gift?.sound || '';

const getImage = gift => gift?.gift_image || gift?.image || '';

const getKey = gift => gift?.id || `${gift?.gift_id || getGiftName(gift)}-${gift?.sender_id || getUsername(gift)}-${gift?.created_at || Date.now()}-${Math.random()}`;

const rarityConfig = {
  common: { glow: 'shadow-xl', ring: 'border-white/10', label: 'Common', scale: 1 },
  rare: { glow: 'shadow-[0_0_35px_rgba(59,130,246,.35)]', ring: 'border-blue-400/30', label: 'Rare', scale: 1.08 },
  epic: { glow: 'shadow-[0_0_45px_rgba(168,85,247,.45)]', ring: 'border-purple-400/40', label: 'Epic', scale: 1.16 },
  legendary: { glow: 'shadow-[0_0_65px_rgba(250,204,21,.65)]', ring: 'border-yellow-300/60', label: 'Legendary', scale: 1.28 }
};

const animationVariants = {
  float: {
    initial: { opacity: 0, y: 70, scale: 0.65 },
    animate: { opacity: 1, y: [20, -12, 5, -8, 0], scale: 1 },
    exit: { opacity: 0, y: -45, scale: 0.8 }
  },
  bounce: {
    initial: { opacity: 0, y: 100, scale: 0.5 },
    animate: { opacity: 1, y: [60, -25, 15, -8, 0], scale: [0.6, 1.18, 0.92, 1.06, 1] },
    exit: { opacity: 0, y: 45, scale: 0.7 }
  },
  pulse: {
    initial: { opacity: 0, scale: 0.45 },
    animate: { opacity: 1, scale: [0.75, 1.12, 0.95, 1.08, 1] },
    exit: { opacity: 0, scale: 0.45 }
  },
  sparkle: {
    initial: { opacity: 0, y: 50, scale: 0.4, rotate: -15 },
    animate: { opacity: 1, y: [20, -10, 0], scale: [0.55, 1.2, 1], rotate: [-10, 8, 0] },
    exit: { opacity: 0, y: -35, scale: 0.5, rotate: 15 }
  },
  flame: {
    initial: { opacity: 0, y: 80, scale: 0.5 },
    animate: { opacity: 1, y: [35, -8, 0], scale: [0.6, 1.15, 1], rotate: [-5, 5, 0] },
    exit: { opacity: 0, y: -70, scale: 0.65 }
  },
  slide: {
    initial: { opacity: 0, x: -180, scale: 0.75 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 180, scale: 0.75 }
  },
  rain: {
    initial: { opacity: 0, y: -180, scale: 0.45, rotate: -20 },
    animate: { opacity: 1, y: [ -40, 10, -5, 0 ], scale: [0.5, 1.15, 0.95, 1], rotate: [-15, 12, -5, 0] },
    exit: { opacity: 0, y: 100, scale: 0.5 }
  },
  grand: {
    initial: { opacity: 0, y: 100, scale: 0.25, rotate: -8 },
    animate: { opacity: 1, y: [45, -15, 5, 0], scale: [0.3, 1.3, 0.92, 1.12, 1], rotate: [-8, 5, -2, 0] },
    exit: { opacity: 0, y: -100, scale: 0.35, rotate: 8 }
  }
};

const sparklePositions = [
  { left: '8%', top: '15%' },
  { left: '22%', top: '65%' },
  { left: '76%', top: '18%' },
  { left: '88%', top: '58%' },
  { left: '48%', top: '8%' },
  { left: '60%', top: '78%' }
];

const GiftVisual = ({ gift, duration, isBig, rarity, quantity, lowData }) => {
  const image = getImage(gift);
  const icon = getIcon(gift);
  const animation = getAnimation(gift);
  const config = rarityConfig[rarity];
  const quantityBoost = quantity >= 100 ? 1.35 : quantity >= 10 ? 1.15 : 1;
  const iconScale = (isBig ? 1.35 : 1) * config.scale * quantityBoost;

  return (
    <div className="relative flex items-center justify-center shrink-0 w-[150px] h-[150px] sm:w-[190px] sm:h-[190px]" aria-hidden="true">
      {!lowData && (
        <motion.div
          className="absolute inset-2 rounded-full bg-white/5 blur-2xl"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0.2, 0.8, 0.35], scale: [0.6, 1.15, 0.9] }}
          transition={{ duration: Math.min(duration / 1000, 4), ease: 'easeInOut' }}
        />
      )}

      {isBig && !lowData && (
        <motion.div
          className="absolute inset-0 rounded-full border border-white/10"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 1.45] }}
          transition={{ duration: Math.min(duration / 1000, 3), ease: 'easeOut' }}
        />
      )}

      {!lowData && ['sparkle', 'grand', 'rain'].includes(animation) && sparklePositions.map((position, index) => (
        <motion.span
          key={index}
          className="absolute text-sm sm:text-lg"
          style={position}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4], y: [10, -12, 8] }}
          transition={{ duration: 1.4, delay: index * 0.08, repeat: Math.max(1, Math.floor(duration / 1400) - 1), ease: 'easeInOut' }}
        >
          ✦
        </motion.span>
      ))}

      <motion.div
        variants={animationVariants[animation]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: Math.min(duration / 1000, 1.1), ease: 'easeOut' }}
        className={`relative flex items-center justify-center rounded-full border ${config.ring} ${config.glow} ${isBig ? 'bg-black/20' : 'bg-black/10'} backdrop-blur-sm`}
        style={{ width: isBig ? 142 : 118, height: isBig ? 142 : 118 }}
      >
        {image && !lowData ? (
          <img src={image} alt="" className="w-[72%] h-[72%] object-contain drop-shadow-2xl" />
        ) : (
          <span className="leading-none select-none" style={{ fontSize: `${62 * iconScale}px` }}>{icon}</span>
        )}
      </motion.div>
    </div>
  );
};

const GiftAlertOverlay = ({ gift, lowData = false, onComplete }) => {
  const [queue, setQueue] = useState([]);
  const [activeGift, setActiveGift] = useState(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch {}
    audioRef.current = null;
  }, []);

  const finishGift = useCallback(() => {
    stopAudio();
    setActiveGift(null);
    onComplete?.();
  }, [onComplete, stopAudio]);

  const playSound = useCallback(soundUrl => {
    stopAudio();
    if (!soundUrl || lowData === false && !soundUrl) return;

    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 1;
      audio.src = soundUrl;
      audioRef.current = audio;
      const playPromise = audio.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch {}
  }, [lowData, stopAudio]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopAudio();
    };
  }, [stopAudio]);

  useEffect(() => {
    if (!gift) return;

    const incoming = { ...gift, _alertKey: getKey(gift) };

    setQueue(previous => {
      const next = [...previous, incoming];
      return next.length > MAX_QUEUE ? next.slice(next.length - MAX_QUEUE) : next;
    });
  }, [gift]);

  useEffect(() => {
    if (activeGift || queue.length === 0) return;

    const nextGift = queue[0];

    setQueue(previous => previous.slice(1));
    setActiveGift(nextGift);

    const duration = getDuration(nextGift);
    const sound = getSound(nextGift);

    playSound(sound);

    timerRef.current = setTimeout(() => {
      if (mountedRef.current) finishGift();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeGift, queue, finishGift, playSound]);

  const data = useMemo(() => {
    if (!activeGift) return null;

    const quantity = getQuantity(activeGift);
    const price = getPrice(activeGift);
    const rarity = getRarity(activeGift);
    const animation = getAnimation(activeGift);
    const duration = getDuration(activeGift);
    const isBig = Boolean(activeGift.big || activeGift.is_big || price >= 100);
    const config = rarityConfig[rarity];

    return { quantity, price, rarity, animation, duration, isBig, config };
  }, [activeGift]);

  if (!activeGift || !data) return null;

  const name = getGiftName(activeGift);
  const username = getUsername(activeGift);
  const avatar = getAvatar(activeGift);
  const icon = getIcon(activeGift);
  const rarityLabel = data.config.label;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeGift._alertKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none z-[100] overflow-hidden flex items-end justify-center px-3 pb-4 sm:pb-8"
        role="status"
        aria-live="polite"
        aria-label={`${username} sent ${data.quantity} ${name} gift worth ${data.price} coins`}
      >
        {data.isBig && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.65] }}
            exit={{ opacity: 0 }}
            transition={{ duration: Math.min(data.duration / 1000, 1) }}
            aria-hidden="true"
          />
        )}

        {!lowData && data.isBig && (
          <motion.div
            className="absolute left-1/2 bottom-8 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[650px] max-h-[650px] rounded-full blur-3xl bg-white/10"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.8, 0.25], scale: [0.3, 1, 1.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: Math.min(data.duration / 1000, 2.5) }}
            aria-hidden="true"
          />
        )}

        <motion.div
          className={`relative w-full max-w-2xl flex flex-col items-center ${data.isBig ? 'gap-1' : 'gap-0'}`}
          initial={{ opacity: 0, y: 70, scale: data.isBig ? 0.8 : 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.88 }}
          transition={{ duration: Math.min(data.duration / 1000, 0.55), ease: 'easeOut' }}
        >
          <GiftVisual gift={activeGift} duration={data.duration} isBig={data.isBig} rarity={data.rarity} quantity={data.quantity} lowData={lowData} />

          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-2xl max-w-[92vw] ${data.isBig ? 'bg-black/55 border-white/20 shadow-2xl' : 'bg-black/60 border-white/10 shadow-xl'}`}
          >
            <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] shrink-0 ${data.rarity === 'legendary' ? 'bg-yellow-300' : data.rarity === 'epic' ? 'bg-purple-400' : data.rarity === 'rare' ? 'bg-blue-400' : 'bg-white/30'}`}>
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full rounded-full object-cover bg-black/30" />
              ) : (
                <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-lg">👤</div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white font-black text-sm sm:text-base truncate">{username}</span>
                <span className="text-[9px] uppercase tracking-widest font-black text-white/50 shrink-0">{rarityLabel}</span>
              </div>

              <div className="flex items-center gap-2 mt-1 min-w-0">
                <span className="text-base shrink-0" aria-hidden="true">{icon}</span>
                <span className="text-yellow-300 font-bold text-xs sm:text-sm truncate">{data.quantity}× {name}</span>
                <span className="text-white/50 text-[10px] shrink-0">•</span>
                <span className="text-yellow-200 font-black text-[10px] sm:text-xs shrink-0">{data.price.toLocaleString()} coins</span>
              </div>
            </div>
          </motion.div>

          {data.quantity >= 10 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: [0.9, 1.12, 1], y: 0 }}
              className={`mt-1 font-black uppercase tracking-widest ${data.quantity >= 100 ? 'text-yellow-300 text-lg' : 'text-white text-xs'}`}
              aria-hidden="true"
            >
              {data.quantity >= 100 ? `${data.quantity}× MEGA GIFT` : `${data.quantity}× GIFT`}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GiftAlertOverlay;
```
