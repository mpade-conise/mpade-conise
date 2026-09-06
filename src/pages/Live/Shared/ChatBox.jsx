
// src/pages/Live/Shared/ChatBox.jsx

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_ITEMS = 50;

const getAvatar = (userId, fallbackSeed = 'user') => {
  const seed = encodeURIComponent(userId || fallbackSeed);

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const safeNumber = value => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const getCommentText = comment => {
  return (
    comment?.text ??
    comment?.message ??
    comment?.content ??
    ''
  );
};

const normalizeComment = comment => {
  if (!comment?.id) {
    return null;
  }

  const userId =
    comment.user_id || null;

  return {
    type: 'comment',

    id: String(comment.id),

    user_id: userId,

    username:
      comment.profiles?.username ||
      comment.user_name ||
      'User',

    avatar_url:
      comment.profiles?.avatar_url ||
      getAvatar(
        userId,
        comment.user_name || 'user'
      ),

    text: getCommentText(comment),

    created_at:
      comment.created_at ||
      new Date().toISOString()
  };
};

const normalizeGift = gift => {
  if (!gift?.id) {
    return null;
  }

  const senderId =
    gift.sender_id || null;

  return {
    type: 'gift',

    id: `gift-${String(gift.id)}`,

    user_id: senderId,

    username:
      gift.profiles?.username ||
      'Supporter',

    avatar_url:
      gift.profiles?.avatar_url ||
      getAvatar(
        senderId,
        'gift'
      ),

    giftName:
      gift.gift_name ||
      'Virtual Gift',

    icon:
      gift.icon ||
      '🎁',

    price: safeNumber(
      gift.price_total
    ),

    created_at:
      gift.created_at ||
      new Date().toISOString()
  };
};

const sortItems = items => {
  return [...items].sort(
    (a, b) =>
      new Date(a.created_at || 0) -
      new Date(b.created_at || 0)
  );
};

const mergeUniqueItems = (
  existing,
  incoming
) => {
  const map = new Map();

  [...existing, ...incoming].forEach(item => {
    if (!item?.id) {
      return;
    }

    map.set(
      String(item.id),
      item
    );
  });

  return sortItems(
    Array.from(map.values())
  ).slice(-MAX_ITEMS);
};

const ChatBox = ({ streamId }) => {
  const [items, setItems] = useState([]);

  const scrollRef =
    useRef(null);

  const mountedRef =
    useRef(false);

  /*
   * Only ChatBox owns this channel.
   *
   * It is deliberately NOT shared with:
   * - StreamDashboard
   * - useStreamSocket
   * - useStreamWebRTC
   * - GuestManager
   */

  const channelRef =
    useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * -------------------------------------------------------------
   * CHAT + GIFT DATA
   * -------------------------------------------------------------
   */

  useEffect(() => {
    if (!streamId) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;

    /*
     * -----------------------------------------------------------
     * INITIAL DATA
     * -----------------------------------------------------------
     */

    const loadInitialActivity =
      async () => {
        try {
          const [
            commentsResult,
            giftsResult
          ] = await Promise.all([
            supabase
              .from('live_comments')
              .select(`
                id,
                text,
                message,
                content,
                user_id,
                user_name,
                created_at,
                profiles(username, avatar_url)
              `)
              .eq(
                'stream_id',
                streamId
              )
              .order(
                'created_at',
                {
                  ascending: true
                }
              )
              .limit(40),

            supabase
              .from('live_gifts')
              .select(`
                id,
                sender_id,
                gift_name,
                price_total,
                icon,
                created_at,
                profiles:sender_id(username, avatar_url)
              `)
              .eq(
                'stream_id',
                streamId
              )
              .order(
                'created_at',
                {
                  ascending: true
                }
              )
              .limit(20)
          ]);

          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          if (
            commentsResult.error
          ) {
            console.warn(
              '⚠️ [ChatBox] Failed to load comments:',
              commentsResult.error.message
            );
          }

          if (
            giftsResult.error
          ) {
            console.warn(
              '⚠️ [ChatBox] Failed to load gifts:',
              giftsResult.error.message
            );
          }

          const comments =
            (
              commentsResult.data ||
              []
            )
              .map(
                normalizeComment
              )
              .filter(Boolean);

          const gifts =
            (
              giftsResult.data ||
              []
            )
              .map(
                normalizeGift
              )
              .filter(Boolean);

          const merged =
            mergeUniqueItems(
              [],
              [
                ...comments,
                ...gifts
              ]
            );

          setItems(merged);

        } catch (error) {
          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          console.error(
            '❌ [ChatBox] Initial activity load failed:',
            error
          );
        }
      };

    loadInitialActivity();

    /*
     * -----------------------------------------------------------
     * PROFILE LOOKUP
     * -----------------------------------------------------------
     */

    const getProfile =
      async userId => {
        if (!userId) {
          return null;
        }

        try {
          const {
            data,
            error
          } = await supabase
            .from('profiles')
            .select(
              'username, avatar_url'
            )
            .eq(
              'id',
              userId
            )
            .maybeSingle();

          if (error) {
            console.warn(
              '⚠️ [ChatBox] Profile lookup failed:',
              error.message
            );

            return null;
          }

          return data || null;

        } catch (error) {
          console.warn(
            '⚠️ [ChatBox] Profile lookup error:',
            error
          );

          return null;
        }
      };

    /*
     * -----------------------------------------------------------
     * REALTIME
     * -----------------------------------------------------------
     *
     * IMPORTANT:
     *
     * ChatBox does NOT retry by destroying/recreating the channel.
     *
     * A Realtime timeout is allowed to recover naturally.
     *
     * This prevents ChatBox from interfering with the rest of
     * StreamDashboard during host initialization.
     */

    const channelName =
      `live-chat-${streamId}`;

    console.log(
      `📡 [ChatBox] Creating isolated Realtime channel: ${channelName}`
    );

    const chatChannel =
      supabase
        .channel(channelName)

        /*
         * -------------------------------------------------------
         * NEW COMMENT
         * -------------------------------------------------------
         */

        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_comments',
            filter:
              `stream_id=eq.${streamId}`
          },

          async payload => {
            if (
              cancelled ||
              !mountedRef.current ||
              channelRef.current !==
                chatChannel ||
              !payload?.new
            ) {
              return;
            }

            const row =
              payload.new;

            const profile =
              await getProfile(
                row.user_id
              );

            if (
              cancelled ||
              !mountedRef.current ||
              channelRef.current !==
                chatChannel
            ) {
              return;
            }

            const comment =
              normalizeComment({
                ...row,
                profiles: profile
              });

            if (!comment) {
              return;
            }

            setItems(previous =>
              mergeUniqueItems(
                previous,
                [comment]
              )
            );
          }
        )

        /*
         * -------------------------------------------------------
         * NEW GIFT
         * -------------------------------------------------------
         */

        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_gifts',
            filter:
              `stream_id=eq.${streamId}`
          },

          async payload => {
            if (
              cancelled ||
              !mountedRef.current ||
              channelRef.current !==
                chatChannel ||
              !payload?.new
            ) {
              return;
            }

            const row =
              payload.new;

            const profile =
              await getProfile(
                row.sender_id
              );

            if (
              cancelled ||
              !mountedRef.current ||
              channelRef.current !==
                chatChannel
            ) {
              return;
            }

            const gift =
              normalizeGift({
                ...row,
                profiles: profile
              });

            if (!gift) {
              return;
            }

            setItems(previous =>
              mergeUniqueItems(
                previous,
                [gift]
              )
            );
          }
        );

    /*
     * Store ONLY this ChatBox channel.
     */

    channelRef.current =
      chatChannel;

    /*
     * -----------------------------------------------------------
     * SUBSCRIBE
     * -----------------------------------------------------------
     */

    chatChannel.subscribe(
      status => {
        if (
          cancelled ||
          !mountedRef.current
        ) {
          return;
        }

        /*
         * Ignore callbacks from an old channel.
         */

        if (
          channelRef.current !==
          chatChannel
        ) {
          console.log(
            `ℹ️ [ChatBox] Ignoring stale Realtime status: ${status}`
          );

          return;
        }

        /*
         * -------------------------------------------------------
         * CONNECTED
         * -------------------------------------------------------
         */

        if (
          status === 'SUBSCRIBED'
        ) {
          console.log(
            `🟢 [ChatBox] Realtime connected for stream ${streamId}`
          );

          return;
        }

        /*
         * -------------------------------------------------------
         * TIMEOUT
         * -------------------------------------------------------
         *
         * DO NOT recreate the channel here.
         *
         * Supabase may recover the existing channel and emit
         * SUBSCRIBED afterward.
         */

        if (
          status === 'TIMED_OUT'
        ) {
          console.warn(
            `⏱️ [ChatBox] Realtime handshake timed out for stream ${streamId}; waiting for recovery.`
          );

          return;
        }

        /*
         * -------------------------------------------------------
         * CHANNEL ERROR
         * -------------------------------------------------------
         */

        if (
          status ===
          'CHANNEL_ERROR'
        ) {
          console.warn(
            `⚠️ [ChatBox] Realtime channel error for stream ${streamId}.`
          );

          return;
        }

        /*
         * -------------------------------------------------------
         * CLOSED
         * -------------------------------------------------------
         */

        if (
          status === 'CLOSED'
        ) {
          console.warn(
            `⚠️ [ChatBox] Realtime channel closed for stream ${streamId}.`
          );

          return;
        }
      }
    );

    /*
     * -----------------------------------------------------------
     * LEGACY CLIENT-SIDE GIFT EVENT
     * -----------------------------------------------------------
     */

    const handleCustomGift =
      event => {
        if (
          cancelled ||
          !mountedRef.current ||
          !event?.detail
        ) {
          return;
        }

        const detail =
          event.detail;

        const customId =
          detail.id ||
          detail.giftId ||
          `local-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        const newGift = {
          type: 'gift',

          id:
            String(customId)
              .startsWith('gift-')
              ? String(customId)
              : `custom-gift-${customId}`,

          user_id:
            detail.user_id ||
            detail.sender_id ||
            null,

          username:
            detail.username ||
            'Supporter',

          avatar_url:
            detail.avatar ||
            detail.avatar_url ||
            getAvatar(
              detail.user_id ||
                detail.sender_id,
              'gift'
            ),

          giftName:
            detail.giftName ||
            detail.gift_name ||
            'Virtual Gift',

          icon:
            detail.icon ||
            '🎁',

          price: safeNumber(
            detail.price ??
              detail.price_total ??
              0
          ),

          created_at:
            detail.created_at ||
            new Date().toISOString()
        };

        setItems(previous =>
          mergeUniqueItems(
            previous,
            [newGift]
          )
        );
      };

    window.addEventListener(
      'mpade_gift_received',
      handleCustomGift
    );

    /*
     * -----------------------------------------------------------
     * CLEANUP
     * -----------------------------------------------------------
     */

    return () => {
      cancelled = true;

      window.removeEventListener(
        'mpade_gift_received',
        handleCustomGift
      );

      /*
       * Only remove OUR channel.
       */

      if (
        channelRef.current ===
        chatChannel
      ) {
        console.log(
          `🔴 [ChatBox] Removing isolated Realtime channel for stream ${streamId}`
        );

        channelRef.current =
          null;

        supabase.removeChannel(
          chatChannel
        );
      }
    };
  }, [streamId]);

  /*
   * -------------------------------------------------------------
   * AUTO-SCROLL
   * -------------------------------------------------------------
   */

  useEffect(() => {
    const container =
      scrollRef.current;

    if (!container) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        container.scrollTop =
          container.scrollHeight;
      });

    return () => {
      cancelAnimationFrame(
        frame
      );
    };
  }, [items]);

  /*
   * -------------------------------------------------------------
   * UI
   * -------------------------------------------------------------
   */

  return (
    <div className="h-full w-full bg-transparent flex flex-col overflow-hidden relative border-none shadow-none">

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 p-3 hide-scrollbar"
      >

        <AnimatePresence initial={false}>

          {items.map(item => {

            /*
             * ---------------------------------------------------
             * GIFT
             * ---------------------------------------------------
             */

            if (
              item.type === 'gift'
            ) {
              return (
                <motion.div
                  key={item.id}

                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    x: -12
                  }}

                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0
                  }}

                  exit={{
                    opacity: 0,
                    scale: 0.95
                  }}

                  transition={{
                    duration: 0.2
                  }}

                  className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-transparent backdrop-blur-md p-2 rounded-2xl w-fit max-w-[95%] border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                >

                  <img
                    src={item.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] flex-shrink-0"

                    onError={event => {
                      event.currentTarget.src =
                        getAvatar(
                          item.user_id,
                          'gift'
                        );
                    }}
                  />

                  <div className="flex flex-col min-w-0 pr-1">

                    <div className="flex items-center gap-1.5">

                      <span className="text-[10px] font-black text-amber-300 uppercase tracking-wide truncate max-w-[90px]">
                        {item.username}
                      </span>

                      <span className="text-[9px] font-bold text-pink-400 uppercase tracking-tight">
                        sent {item.giftName}
                      </span>

                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200">

                      <span className="text-sm">
                        {item.icon}
                      </span>

                      <span className="text-[9px] font-mono text-cyan-300">
                        ✨{' '}
                        {item.price.toLocaleString()}{' '}
                        Coins
                      </span>

                    </div>

                  </div>

                </motion.div>
              );
            }

            /*
             * ---------------------------------------------------
             * COMMENT
             * ---------------------------------------------------
             */

            return (
              <motion.div
                key={item.id}

                initial={{
                  opacity: 0,
                  x: -10
                }}

                animate={{
                  opacity: 1,
                  x: 0
                }}

                exit={{
                  opacity: 0,
                  x: -5
                }}

                transition={{
                  duration: 0.2
                }}

                className="flex items-start gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl w-fit max-w-[90%] border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              >

                <img
                  src={item.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-pink-500/70 shadow-[0_0_8px_rgba(244,63,94,0.5)] flex-shrink-0 mt-0.5"

                  onError={event => {
                    event.currentTarget.src =
                      getAvatar(
                        item.user_id,
                        'user'
                      );
                  }}
                />

                <div className="flex flex-col min-w-0">

                  <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]">
                    {item.username}
                  </span>

                  <p className="text-[12px] font-medium text-cyan-50 leading-tight drop-shadow-[0_0_4px_rgba(6,182,212,0.5)] break-words">
                    {item.text}
                  </p>

                </div>

              </motion.div>
            );
          })}

        </AnimatePresence>

      </div>
    </div>
  );
};

export default ChatBox;
