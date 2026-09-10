```jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ThumbsUp, Star, Flame, Laugh, Sparkles } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const DEFAULT_ICONS = [
  { type: 'heart', icon: Heart, color: '#fe2c55' },
  { type: 'like', icon: ThumbsUp, color: '#3b82f6' },
  { type: 'star', icon: Star, color: '#facc15' },
  { type: 'fire', icon: Flame, color: '#ff6b35' },
  { type: 'laugh', icon: Laugh, color: '#fbbf24' },
  { type: 'sparkle', icon: Sparkles, color: '#a855f7' }
];

const FloatingHearts = ({
  count,
  streamId,
  reactionType = 'heart',
  sender,
  avatar,
  duration = 2,
  maxHearts = 40,
  burstSize = 1,
  reactionIcons = DEFAULT_ICONS,
  enableRealtime = true,
  throttleMs = 120,
  onReaction
}) => {
  const [hearts, setHearts] = useState([]);
  const timers = useRef(new Map());
  const queue = useRef([]);
  const processing = useRef(false);
  const lastReaction = useRef(0);
  const previousCount = useRef(Number(count || 0));
  const mounted = useRef(false);
  const tapTimer = useRef(null);
  const tapCount = useRef(0);

  const getReaction = useCallback((type) => {
    return reactionIcons.find(item => item.type === type) || reactionIcons[0] || DEFAULT_ICONS[0];
  }, [reactionIcons]);

  const removeHeart = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);

    if (mounted.current) {
      setHearts(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const addHeart = useCallback((type = 'heart', meta = {}) => {
    if (!mounted.current) return;

    const now = Date.now();

    if (!meta.realtime && now - lastReaction.current < throttleMs) return;

    lastReaction.current = now;

    const reaction = getReaction(type);
    const id = String(now) + '-' + Math.random().toString(36).slice(2, 8);

    const heart = {
      id,
      type,
      Icon: reaction.icon,
      color: reaction.color,
      left: String(Math.random() * 80 + 10) + '%',
      rotation: Math.random() * 40 - 20,
      drift: Math.random() * 100 - 50,
      scale: 0.7 + Math.random() * 0.6,
      size: 22 + Math.random() * 12,
      sender: meta.sender || sender,
      avatar: meta.avatar || avatar
    };

    setHearts(prev => {
      const next = [...prev, heart];
      return next.length > maxHearts ? next.slice(-maxHearts) : next;
    });

    const timer = setTimeout(() => removeHeart(id), Math.max(0.2, Number(duration)) * 1000 + 300);

    timers.current.set(id, timer);

    if (typeof onReaction === 'function') {
      onReaction(heart);
    }
  }, [avatar, duration, getReaction, maxHearts, onReaction, removeHeart, sender, throttleMs]);

  const enqueue = useCallback((type = 'heart', meta = {}, amount = 1) => {
    const safeAmount = Math.min(Math.max(Number(amount) || 1, 1), 10);

    for (let i = 0; i < safeAmount; i += 1) {
      queue.current.push({ type, meta });
    }

    if (processing.current) return;

    processing.current = true;

    const process = () => {
      if (!mounted.current || queue.current.length === 0) {
        processing.current = false;
        return;
      }

      const item = queue.current.shift();

      addHeart(item.type, item.meta);

      setTimeout(process, 45);
    };

    process();
  }, [addHeart]);

  const triggerLikeInDB = useCallback(async () => {
    if (!streamId) return false;

    const { error } = await supabase.rpc('increment_likes', {
      stream_id_input: streamId
    });

    if (error) {
      console.error('Error updating likes:', error.message);
      return false;
    }

    return true;
  }, [streamId]);

  useEffect(() => {
    const current = Math.max(0, Number(count || 0));
    const previous = Math.max(0, Number(previousCount.current || 0));
    const difference = Math.min(Math.max(current - previous, 0), 10);

    previousCount.current = current;

    if (difference > 0) {
      enqueue(reactionType, { realtime: true }, Math.min(difference * burstSize, 10));
    }
  }, [count, burstSize, enqueue, reactionType]);

  useEffect(() => {
    if (!enableRealtime || !streamId || count !== undefined && count !== null) {
      return undefined;
    }

    const channel = supabase
      .channel('live-stream-likes-' + streamId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: 'id=eq.' + streamId
        },
        payload => {
          const current = Math.max(0, Number(payload.new?.likes || 0));
          const previous = Math.max(0, Number(previousCount.current || 0));
          const difference = Math.min(Math.max(current - previous, 0), 10);

          previousCount.current = current;

          if (difference > 0) {
            enqueue(
              reactionType,
              { realtime: true },
              Math.min(difference * burstSize, 10)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, streamId, count, enqueue, reactionType, burstSize]);

  useEffect(() => {
    const handleLike = () => {
      enqueue(reactionType, {}, burstSize);
      triggerLikeInDB();
    };

    window.addEventListener('made-universe-live-like', handleLike);

    return () => {
      window.removeEventListener('made-universe-live-like', handleLike);
    };
  }, [enqueue, reactionType, burstSize, triggerLikeInDB]);

  useEffect(() => {
    const handleDoubleClick = event => {
      if (event?.target?.closest?.('button,input,textarea,select,a')) return;

      enqueue(reactionType, {}, 3);
      triggerLikeInDB();
    };

    document.addEventListener('dblclick', handleDoubleClick);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [enqueue, reactionType, triggerLikeInDB]);

  useEffect(() => {
    const handlePointerUp = event => {
      if (event?.target?.closest?.('button,input,textarea,select,a')) return;

      tapCount.current += 1;

      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
      }

      tapTimer.current = setTimeout(() => {
        if (tapCount.current === 1) {
          enqueue(reactionType, {}, 1);
          triggerLikeInDB();
        }

        tapCount.current = 0;
        tapTimer.current = null;
      }, 250);
    };

    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointerup', handlePointerUp);

      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
    };
  }, [enqueue, reactionType, triggerLikeInDB]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      queue.current = [];
      processing.current = false;

      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }

      timers.current.forEach(timer => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" aria-hidden="true">
      <AnimatePresence initial={false}>
        {hearts.map(heart => {
          const Icon = heart.Icon || Heart;

          return (
            <motion.div
              key={heart.id}
              initial={{
                y: reducedMotion ? 0 : '100%',
                x: 0,
                opacity: 1,
                scale: reducedMotion ? 1 : 0.5,
                rotate: heart.rotation
              }}
              animate={{
                y: reducedMotion ? '-20%' : '-20vh',
                x: reducedMotion ? 0 : heart.drift,
                opacity: 0,
                scale: heart.scale,
                rotate: heart.rotation
              }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{
                duration: reducedMotion ? 0.35 : Math.max(0.2, Number(duration)),
                ease: 'easeOut'
              }}
              className="absolute bottom-0"
              style={{
                left: heart.left,
                willChange: 'transform, opacity'
              }}
            >
              {heart.avatar ? (
                <div className="relative">
                  <img
                    src={heart.avatar}
                    alt=""
                    className="absolute -top-3 -right-2 w-4 h-4 rounded-full object-cover ring-1 ring-white/50"
                  />
                  <Icon
                    size={heart.size}
                    fill={heart.color}
                    color={heart.color}
                    strokeWidth={1.5}
                    className="drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]"
                  />
                </div>
              ) : (
                <Icon
                  size={heart.size}
                  fill={heart.color}
                  color={heart.color}
                  strokeWidth={1.5}
                  className="drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FloatingHearts;
```
