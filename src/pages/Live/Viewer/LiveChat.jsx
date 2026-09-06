
// src/pages/Live/Viewer/LiveChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveChat = ({ streamId, hideMessages = false }) => {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!streamId) return;

    let isMounted = true;

    const fetchChatAndGifts = async () => {
      // Fetch initial comments
      const { data: comments } = await supabase
        .from('live_comments')
        .select(`
          id,
          text,
          message,
          content,
          user_name,
          user_id,
          created_at,
          profiles:user_id (
            avatar_url,
            username
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(40);

      // Fetch initial gifts
      const { data: gifts } = await supabase
        .from('live_gifts')
        .select(`
          id,
          sender_id,
          gift_name,
          price_total,
          icon,
          created_at,
          profiles:sender_id (
            avatar_url,
            username
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (!isMounted) return;

      const formattedComments = (comments || []).map((c) => ({
        type: 'comment',
        id: c.id,
        user_id: c.user_id,
        user_name:
          c.profiles?.username ||
          c.user_name ||
          'Viewer',
        avatar_url:
          c.profiles?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
        text: c.text || c.message || c.content || '',
        created_at: c.created_at
      }));

      const formattedGifts = (gifts || []).map((g) => ({
        type: 'gift',
        id: `gift-${g.id}`,
        user_id: g.sender_id,
        user_name:
          g.profiles?.username ||
          'Supporter',
        avatar_url:
          g.profiles?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${g.sender_id}`,
        giftName:
          g.gift_name ||
          'Virtual Gift',
        icon:
          g.icon ||
          '🎁',
        price:
          g.price_total ||
          50,
        created_at: g.created_at
      }));

      const merged = [
        ...formattedComments,
        ...formattedGifts
      ].sort(
        (a, b) =>
          new Date(a.created_at || 0) -
          new Date(b.created_at || 0)
      );

      setItems(merged.slice(-50));
    };

    fetchChatAndGifts();

    // Supabase realtime channel
    const channel = supabase
      .channel(`viewer-chat-${streamId}`)

      // COMMENTS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('avatar_url, username')
            .eq('id', payload.new.user_id)
            .single();

          if (!isMounted) return;

          const newComment = {
            type: 'comment',
            id: payload.new.id,
            user_id: payload.new.user_id,
            user_name:
              userData?.username ||
              payload.new.user_name ||
              'Viewer',
            avatar_url:
              userData?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.user_id}`,
            text:
              payload.new.text ||
              payload.new.message ||
              payload.new.content ||
              '',
            created_at:
              payload.new.created_at ||
              new Date().toISOString()
          };

          setItems((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) {
              return prev;
            }

            return [
              ...prev.slice(-49),
              newComment
            ];
          });
        }
      )

      // GIFTS
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('avatar_url, username')
            .eq('id', payload.new.sender_id)
            .single();

          if (!isMounted) return;

          const newGift = {
            type: 'gift',
            id: `gift-${payload.new.id || Date.now()}`,
            user_id: payload.new.sender_id,
            user_name:
              userData?.username ||
              'Supporter',
            avatar_url:
              userData?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.sender_id}`,
            giftName:
              payload.new.gift_name ||
              'Virtual Gift',
            icon:
              payload.new.icon ||
              '🎁',
            price:
              payload.new.price_total ||
              50,
            created_at:
              payload.new.created_at ||
              new Date().toISOString()
          };

          setItems((prev) => [
            ...prev.slice(-49),
            newGift
          ]);
        }
      )
      .subscribe();

    // Local gift event
    const handleLocalGift = (e) => {
      if (!e.detail || !isMounted) return;

      setItems((prev) => [
        ...prev.slice(-49),
        {
          type: 'gift',
          id: `local-gift-${Date.now()}`,
          user_name:
            e.detail.username ||
            'Supporter',
          avatar_url:
            e.detail.avatar ||
            'https://api.dicebear.com/7.x/avataaars/svg?seed=gift',
          giftName:
            e.detail.giftName ||
            'Virtual Gift',
          icon:
            e.detail.icon ||
            '🎁',
          price:
            e.detail.price ||
            50,
          created_at:
            new Date().toISOString()
        }
      ]);
    };

    window.addEventListener(
      'mpade_gift_received',
      handleLocalGift
    );

    return () => {
      isMounted = false;

      supabase.removeChannel(channel);

      window.removeEventListener(
        'mpade_gift_received',
        handleLocalGift
      );
    };
  }, [streamId]);

  // Auto-scroll
  useEffect(() => {
    if (
      !hideMessages &&
      items.length > 0
    ) {
      chatEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [items, hideMessages]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();

    const currentInput = input.trim();

    if (!currentInput || !streamId) {
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    setInput('');

    const { error } = await supabase
      .from('live_comments')
      .insert([
        {
          stream_id: streamId,
          user_id: user?.id,
          user_name:
            user?.user_metadata?.username ||
            user?.email?.split('@')[0] ||
            'Viewer',
          text: currentInput
        }
      ]);

    if (error) {
      console.error(
        'Send Error:',
        error.message
      );

      setInput(currentInput);
    }
  };

  return (
    <div
      className="
        relative
        z-30
        flex
        h-full
        min-h-0
        w-full
        max-w-full
        flex-col
        overflow-hidden
        border-none
        shadow-none
        pointer-events-none
      "
    >
      {/* MESSAGE AREA */}
      {!hideMessages && (
        <div
          className="
            flex-1
            min-h-0
            w-full
            max-w-full
            overflow-y-auto
            overflow-x-hidden
            px-2
            py-2
            sm:px-3
            sm:py-3
            space-y-1.5
            sm:space-y-2
            pointer-events-auto
            hide-scrollbar
            mask-chat
          "
        >
          {items.length === 0 ? (
            <div
              className="
                w-fit
                max-w-[90%]
                rounded-2xl
                bg-black/25
                px-3
                py-2
                text-[11px]
                sm:text-xs
                italic
                leading-relaxed
                text-cyan-400/70
                backdrop-blur-sm
                drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]
              "
            >
              Welcome to the live stream chat! Say hello 👋
            </div>
          ) : (
            items.map((m) => {
              {/* GIFT MESSAGE */}
              if (m.type === 'gift') {
                return (
                  <motion.div
                    key={m.id}
                    initial={{
                      opacity: 0,
                      scale: 0.96,
                      x: -8
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: 0
                    }}
                    transition={{
                      duration: 0.2
                    }}
                    className="
                      flex
                      w-fit
                      max-w-[96%]
                      items-center
                      gap-2
                      overflow-hidden
                      rounded-2xl
                      border
                      border-amber-400/40
                      bg-gradient-to-r
                      from-amber-500/25
                      via-pink-500/20
                      to-black/30
                      px-2.5
                      py-1.5
                      backdrop-blur-md
                      shadow-[0_0_15px_rgba(245,158,11,0.3)]
                      sm:max-w-[90%]
                      sm:px-3
                    "
                  >
                    {/* Avatar */}
                    <img
                      src={m.avatar_url}
                      className="
                        h-6
                        w-6
                        flex-shrink-0
                        rounded-full
                        border-2
                        border-amber-400
                        object-cover
                        shadow-[0_0_8px_rgba(245,158,11,0.6)]
                        sm:h-7
                        sm:w-7
                      "
                      alt=""
                    />

                    {/* Gift information */}
                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          flex-wrap
                          items-center
                          gap-x-1.5
                          gap-y-0.5
                        "
                      >
                        <span
                          className="
                            max-w-[45vw]
                            truncate
                            text-[9px]
                            font-black
                            uppercase
                            tracking-wide
                            text-amber-300
                            sm:max-w-[120px]
                            sm:text-[10px]
                          "
                        >
                          {m.user_name}
                        </span>

                        <span
                          className="
                            truncate
                            text-[8px]
                            font-bold
                            uppercase
                            text-pink-300
                            sm:text-[9px]
                          "
                        >
                          sent {m.giftName}
                        </span>
                      </div>

                      <div
                        className="
                          mt-0.5
                          flex
                          min-w-0
                          items-center
                          gap-1.5
                          text-[10px]
                          font-bold
                          text-amber-200
                          sm:text-[11px]
                        "
                      >
                        <span className="flex-shrink-0">
                          {m.icon}
                        </span>

                        <span
                          className="
                            truncate
                            font-mono
                            text-[8px]
                            text-cyan-300
                            sm:text-[9px]
                          "
                        >
                          ✨ {m.price} Coins
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              {/* REGULAR COMMENT */}
              return (
                <motion.div
                  key={m.id}
                  initial={{
                    opacity: 0,
                    y: 3
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  className="
                    flex
                    w-full
                    min-w-0
                    items-start
                    gap-1.5
                    sm:gap-2
                  "
                >
                  {/* Avatar */}
                  <div
                    className="
                      mt-0.5
                      h-6
                      w-6
                      flex-shrink-0
                      overflow-hidden
                      rounded-full
                      border
                      border-pink-500/50
                      bg-black/20
                      sm:h-7
                      sm:w-7
                    "
                  >
                    <img
                      src={m.avatar_url}
                      className="
                        h-full
                        w-full
                        rounded-full
                        object-cover
                      "
                      alt=""
                    />
                  </div>

                  {/* Message bubble */}
                  <div
                    className="
                      min-w-0
                      max-w-[calc(100%-2rem)]
                      overflow-hidden
                      rounded-2xl
                      border
                      border-cyan-500/25
                      bg-black/40
                      px-2.5
                      py-1.5
                      backdrop-blur-md
                      shadow-[0_0_10px_rgba(6,182,212,0.15)]
                      sm:max-w-[88%]
                      sm:px-3
                      sm:py-1.5
                    "
                  >
                    {/* Username */}
                    <div
                      className="
                        mb-0.5
                        max-w-full
                        truncate
                        text-[9px]
                        font-bold
                        text-pink-400
                        drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]
                        sm:text-[10px]
                      "
                    >
                      {m.user_name}
                    </div>

                    {/* Message */}
                    <div
                      dir="ltr"
                      className="
                        max-w-full
                        whitespace-pre-wrap
                        break-words
                        text-left
                        text-[12px]
                        font-medium
                        leading-[1.35]
                        text-cyan-50
                        drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]
                        sm:text-[13px]
                        sm:leading-snug
                      "
                    >
                      {m.text}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          <div
            ref={chatEndRef}
            className="h-px w-full"
          />
        </div>
      )}

      {/* INPUT AREA */}
      <div
        className="
          w-full
          flex-shrink-0
          px-2
          pb-[max(0.5rem,env(safe-area-inset-bottom))]
          pt-2
          sm:px-3
          sm:pb-3
          pointer-events-auto
        "
      >
        <form
          onSubmit={sendMessage}
          className="
            relative
            mx-auto
            flex
            w-full
            max-w-2xl
            items-center
          "
        >
          <input
            type="text"
            dir="ltr"
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            placeholder="Send a comment..."
            enterKeyHint="send"
            autoComplete="off"
            className="
              box-border
              h-11
              w-full
              min-w-0
              rounded-full
              border
              border-cyan-500/30
              bg-black/60
              py-2.5
              pl-4
              pr-12
              text-[14px]
              font-normal
              text-white
              placeholder:text-zinc-400
              backdrop-blur-xl
              shadow-[0_0_15px_rgba(0,0,0,0.6)]
              outline-none
              focus:border-cyan-400
              focus:ring-1
              focus:ring-cyan-400
              sm:h-12
              sm:pl-5
              sm:pr-14
              sm:text-[14px]
            "
            style={{
              direction: 'ltr',
              textAlign: 'left'
            }}
          />

          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="
              absolute
              right-1.5
              flex
              h-8
              w-8
              flex-shrink-0
              items-center
              justify-center
              rounded-full
              bg-gradient-to-r
              from-pink-500
              to-rose-600
              text-white
              shadow-[0_0_12px_rgba(244,63,94,0.8)]
              transition-all
              active:scale-90
              disabled:opacity-40
              disabled:shadow-none
              sm:right-2
              sm:h-9
              sm:w-9
            "
          >
            <Send
              size={14}
              fill="currentColor"
            />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;
