// src/components/DynamicStreamGrid.jsx

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Radio,
  Trophy
} from 'lucide-react';

import FloatingGiftEmojis from './live/FloatingGiftEmojis';

/**
 * DynamicStreamGrid
 *
 * Responsibilities:
 * - Display the main host stream.
 * - Display up to 3 co-hosts.
 * - Support 1, 2, 3 or 4 video panels.
 * - Display fallback avatars when media is unavailable.
 * - Display PK gift information when real data is supplied.
 *
 * It intentionally does NOT:
 * - create WebRTC connections
 * - create Socket.IO connections
 * - approve/reject co-hosts
 * - subscribe to Supabase realtime
 *
 * Those responsibilities belong to the parent/live-stream logic.
 */

const MAX_CO_HOSTS = 3;

const DEFAULT_HOST_INFO = {
  username: 'Host 1',
  avatar_url: null
};

const EMPTY_ARRAY = [];

const getSafeArray = value => {
  return Array.isArray(value) ? value : EMPTY_ARRAY;
};

const getDisplayName = (person, fallback) => {
  return (
    person?.username ||
    person?.name ||
    fallback
  );
};

const getAvatar = person => {
  return (
    person?.avatar_url ||
    person?.avatar ||
    null
  );
};

const formatCoins = value => {
  const coins = Number(value);

  if (!Number.isFinite(coins)) {
    return '0';
  }

  if (coins >= 1000000) {
    return `${(coins / 1000000).toFixed(1)}M`;
  }

  if (coins >= 1000) {
    return `${(coins / 1000).toFixed(1)}k`;
  }

  return String(Math.round(coins));
};

export const DynamicStreamGrid = ({
  streamId,
  hostVideo,
  hostStream,
  hostInfo = DEFAULT_HOST_INFO,

  coHosts: propCoHosts = null,

  /*
   * Existing single co-host API.
   */
  coHostStream = null,
  coHostVideo = null,
  coHostInfo = null,

  /*
   * Optional multi-co-host media support.
   *
   * These do not require a backend change.
   * They simply allow the parent to provide:
   *
   * coHostStreams={[stream1, stream2, stream3]}
   *
   * or:
   *
   * coHostVideos={[video1, video2, video3]}
   */
  coHostStreams = EMPTY_ARRAY,
  coHostVideos = EMPTY_ARRAY,

  isHostView = false,
  isBattleMode = false,

  activeSmallGift = null,
  onClearSmallGift,

  /*
   * Real PK data can be passed from the parent.
   *
   * Expected shape:
   *
   * {
   *   host: [...],
   *   coHost1: [...],
   *   coHost2: [...],
   *   coHost3: [...]
   * }
   */
  topGifters = null,

  className = ''
}) => {
  const hostVideoElementRef = useRef(null);
  const coHostVideoElementRefs = useRef({});

  /*
   * ------------------------------------------------------------
   * Co-host list
   *
   * StreamDashboard is the preferred owner.
   * ------------------------------------------------------------
   */
  const coHostList = useMemo(() => {
    if (propCoHosts !== null) {
      return getSafeArray(propCoHosts)
        .slice(0, MAX_CO_HOSTS);
    }

    /*
     * Backward-compatible fallback for places that still
     * provide the older single co-host props.
     */
    if (
      coHostInfo ||
      coHostStream ||
      coHostVideo
    ) {
      return [
        coHostInfo || {
          username: 'Co-Host 1'
        }
      ];
    }

    return [];
  }, [
    propCoHosts,
    coHostInfo,
    coHostStream,
    coHostVideo
  ]);

  const totalHostsCount =
    1 + Math.min(
      MAX_CO_HOSTS,
      coHostList.length
    );

  const isCoHosting =
    totalHostsCount > 1;

  /*
   * ------------------------------------------------------------
   * Resolve media for an individual co-host.
   *
   * Priority:
   * 1. coHostVideos[index]
   * 2. coHostStreams[index]
   * 3. cohost.video
   * 4. cohost.videoElement
   * 5. old single coHostVideo/coHostStream for index 0
   * ------------------------------------------------------------
   */
  const getCoHostVideo = index => {
    const cohost =
      coHostList[index];

    if (!cohost) {
      return null;
    }

    if (
      coHostVideos &&
      coHostVideos[index]
    ) {
      return coHostVideos[index];
    }

    if (
      coHostStreams &&
      coHostStreams[index]
    ) {
      return null;
    }

    if (
      cohost.videoElement
    ) {
      return cohost.videoElement;
    }

    if (
      cohost.video
    ) {
      return cohost.video;
    }

    if (
      index === 0 &&
      coHostVideo
    ) {
      return coHostVideo;
    }

    return null;
  };

  const getCoHostStream = index => {
    const cohost =
      coHostList[index];

    if (!cohost) {
      return null;
    }

    if (
      coHostStreams &&
      coHostStreams[index]
    ) {
      return coHostStreams[index];
    }

    if (
      cohost.stream
    ) {
      return cohost.stream;
    }

    if (
      cohost.mediaStream
    ) {
      return cohost.mediaStream;
    }

    if (
      index === 0 &&
      coHostStream
    ) {
      return coHostStream;
    }

    return null;
  };

  /*
   * ------------------------------------------------------------
   * Bind host MediaStream.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const video =
      hostVideoElementRef.current;

    if (!video || !hostStream) {
      return;
    }

    if (
      video.srcObject !== hostStream
    ) {
      video.srcObject = hostStream;

      const playPromise =
        video.play();

      if (playPromise?.catch) {
        playPromise.catch(error => {
          console.warn(
            '⚠️ [DynamicStreamGrid] Host video autoplay prevented:',
            error?.message || error
          );
        });
      }
    }

    return () => {
      /*
       * Do not stop the stream here.
       *
       * The stream belongs to WebRTC/useStreamWebRTC.
       */
    };
  }, [hostStream]);

  /*
   * ------------------------------------------------------------
   * Bind co-host MediaStreams.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    coHostList.forEach((_, index) => {
      const stream =
        getCoHostStream(index);

      const video =
        coHostVideoElementRefs
          .current[index];

      if (
        !video ||
        !stream
      ) {
        return;
      }

      if (
        video.srcObject !== stream
      ) {
        video.srcObject = stream;

        const playPromise =
          video.play();

        if (playPromise?.catch) {
          playPromise.catch(error => {
            console.warn(
              `⚠️ [DynamicStreamGrid] Co-host ${index + 1} autoplay prevented:`,
              error?.message || error
            );
          });
        }
      }
    });
  }, [
    coHostList,
    coHostStreams,
    coHostStream
  ]);

  /*
   * ------------------------------------------------------------
   * Clear stale video references when co-hosts disappear.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const activeIndexes =
      new Set(
        coHostList.map(
          (_, index) => index
        )
      );

    Object.keys(
      coHostVideoElementRefs.current
    ).forEach(index => {
      if (
        !activeIndexes.has(
          Number(index)
        )
      ) {
        const video =
          coHostVideoElementRefs
            .current[index];

        if (video) {
          video.srcObject = null;
        }

        delete coHostVideoElementRefs
          .current[index];
      }
    });
  }, [coHostList]);

  /*
   * ------------------------------------------------------------
   * Grid layout.
   * ------------------------------------------------------------
   */
  const getGridLayoutClass =
    () => {
      switch (totalHostsCount) {
        case 2:
          return 'grid grid-cols-2 grid-rows-1';

        case 3:
          return 'grid grid-cols-3 grid-rows-1';

        case 4:
          return 'grid grid-cols-2 grid-rows-2';

        default:
          return 'grid grid-cols-1 grid-rows-1';
      }
    };

  /*
   * ------------------------------------------------------------
   * PK gifters.
   *
   * No fake data.
   * ------------------------------------------------------------
   */
  const resolvedTopGifters =
    topGifters || {};

  const getGiftersForHost =
    key => {
      const data =
        resolvedTopGifters[key];

      return getSafeArray(data)
        .slice(0, 2);
    };

  /*
   * ------------------------------------------------------------
   * Host panel.
   * ------------------------------------------------------------
   */
  const renderHostPanel = () => {
    const gifters =
      getGiftersForHost('host');

    return (
      <div
        className="
          relative
          w-full
          h-full
          rounded-2xl
          overflow-hidden
          bg-zinc-950
          border
          border-white/10
          flex
          flex-col
          justify-between
          shadow-inner
        "
      >
        {/* Host media */}
        <div className="absolute inset-0 z-0">
          {hostVideo ? (
            <div className="w-full h-full">
              {hostVideo}
            </div>
          ) : hostStream ? (
            <video
              ref={
                hostVideoElementRef
              }
              autoPlay
              playsInline
              muted
              className="
                w-full
                h-full
                object-cover
                scale-x-[-1]
              "
            />
          ) : (
            <div
              className="
                w-full
                h-full
                bg-gradient-to-b
                from-zinc-900
                to-black
                flex
                items-center
                justify-center
              "
            >
              <div
                className="
                  w-16
                  h-16
                  rounded-full
                  bg-pink-500/20
                  border-2
                  border-pink-500
                  flex
                  items-center
                  justify-center
                  overflow-hidden
                  shadow-[0_0_20px_rgba(244,63,94,0.4)]
                "
              >
                {hostInfo?.avatar_url ? (
                  <img
                    src={
                      hostInfo.avatar_url
                    }
                    alt=""
                    className="
                      w-full
                      h-full
                      rounded-full
                      object-cover
                    "
                  />
                ) : (
                  <Users
                    size={24}
                    className="text-pink-400"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Host status */}
        <div
          className="
            relative
            z-10
            p-2
            flex
            items-center
            justify-between
            pointer-events-none
            bg-gradient-to-b
            from-black/70
            to-transparent
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              bg-black/60
              backdrop-blur-md
              px-2
              py-0.5
              rounded-full
              border
              border-pink-500/40
              shadow-md
            "
          >
            <span
              className="
                w-2
                h-2
                rounded-full
                bg-[#fe2c55]
                animate-ping
              "
            />

            <span
              className="
                text-[9px]
                font-black
                uppercase
                text-pink-300
              "
            >
              HOST
            </span>

            <span
              className="
                text-[10px]
                font-bold
                text-white
                max-w-[100px]
                truncate
              "
            >
              {getDisplayName(
                hostInfo,
                'Host 1'
              )}
            </span>
          </div>

          <div
            className="
              flex
              items-center
              gap-1
              bg-black/50
              backdrop-blur-md
              px-2
              py-0.5
              rounded-full
              border
              border-white/10
              text-[9px]
              text-cyan-400
              font-mono
            "
          >
            <Radio
              size={10}
              className="
                text-emerald-400
                animate-pulse
              "
            />

            LIVE
          </div>
        </div>

        {/* Host PK gifters */}
        {isBattleMode &&
          gifters.length > 0 && (
            <div
              className="
                relative
                z-10
                p-1.5
                bg-black/80
                backdrop-blur-md
                border-t
                border-cyan-500/30
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-[8px]
                  font-mono
                  text-cyan-300
                  font-bold
                  uppercase
                  shrink-0
                "
              >
                <Trophy
                  size={10}
                  className="text-amber-400"
                />

                Top Gifters
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-1.5
                  min-w-0
                "
              >
                {gifters.map(
                  (gifter, index) => (
                    <div
                      key={
                        gifter.id ||
                        `host-gifter-${index}`
                      }
                      className="
                        flex
                        items-center
                        gap-1
                        bg-zinc-900/90
                        px-1.5
                        py-0.5
                        rounded-lg
                        border
                        border-white/10
                        text-[8px]
                        min-w-0
                      "
                    >
                      {gifter.avatar ? (
                        <span>
                          {gifter.avatar}
                        </span>
                      ) : null}

                      <span
                        className="
                          text-white
                          font-bold
                          max-w-[55px]
                          truncate
                        "
                      >
                        {gifter.name ||
                          gifter.username ||
                          'User'}
                      </span>

                      <span
                        className="
                          text-cyan-400
                          font-mono
                          font-bold
                        "
                      >
                        {formatCoins(
                          gifter.coins
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
      </div>
    );
  };

  /*
   * ------------------------------------------------------------
   * Co-host panel.
   * ------------------------------------------------------------
   */
  const renderCoHostPanel =
    (cohost, index) => {
      const videoContent =
        getCoHostVideo(index);

      const stream =
        getCoHostStream(index);

      const gifters =
        getGiftersForHost(
          `coHost${index + 1}`
        );

      const username =
        getDisplayName(
          cohost,
          `Host ${index + 2}`
        );

      const avatar =
        getAvatar(cohost);

      return (
        <motion.div
          key={
            cohost?.id ||
            cohost?.user_id ||
            cohost?.socketId ||
            `cohost-${index}`
          }
          initial={{
            scale: 0.96,
            opacity: 0
          }}
          animate={{
            scale: 1,
            opacity: 1
          }}
          exit={{
            scale: 0.96,
            opacity: 0
          }}
          transition={{
            duration: 0.2
          }}
          className="
            relative
            w-full
            h-full
            rounded-2xl
            overflow-hidden
            bg-zinc-950
            border
            border-cyan-500/40
            flex
            flex-col
            justify-between
            shadow-[0_0_20px_rgba(6,182,212,0.15)]
          "
        >
          {/* Co-host media */}
          <div className="absolute inset-0 z-0">
            {videoContent ? (
              <div className="w-full h-full">
                {videoContent}
              </div>
            ) : stream ? (
              <video
                ref={node => {
                  if (node) {
                    coHostVideoElementRefs
                      .current[index] =
                      node;
                  }
                }}
                autoPlay
                playsInline
                className="
                  w-full
                  h-full
                  object-cover
                "
              />
            ) : (
              <div
                className="
                  w-full
                  h-full
                  bg-gradient-to-b
                  from-[#090d1f]
                  to-black
                  flex
                  items-center
                  justify-center
                "
              >
                <div
                  className="
                    w-14
                    h-14
                    rounded-full
                    bg-cyan-500/20
                    border-2
                    border-cyan-400
                    flex
                    items-center
                    justify-center
                    overflow-hidden
                    shadow-[0_0_20px_rgba(6,182,212,0.5)]
                  "
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="
                        w-full
                        h-full
                        rounded-full
                        object-cover
                      "
                    />
                  ) : (
                    <Users
                      size={22}
                      className="
                        text-cyan-400
                      "
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Co-host information */}
          <div
            className="
              relative
              z-10
              p-2
              flex
              items-center
              justify-between
              pointer-events-none
              bg-gradient-to-b
              from-black/70
              to-transparent
            "
          >
            <div
              className="
                flex
                items-center
                gap-1.5
                bg-black/60
                backdrop-blur-md
                px-2
                py-0.5
                rounded-full
                border
                border-cyan-400/40
                shadow-md
              "
            >
              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  text-cyan-300
                "
              >
                HOST {index + 2}
              </span>

              <span
                className="
                  text-[10px]
                  font-bold
                  text-white
                  max-w-[90px]
                  truncate
                "
              >
                {username}
              </span>
            </div>

            <div
              className="
                flex
                items-center
                gap-1
                bg-black/50
                backdrop-blur-md
                px-2
                py-0.5
                rounded-full
                border
                border-white/10
                text-[9px]
                text-emerald-400
                font-mono
              "
            >
              <span
                className="
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-emerald-400
                  animate-pulse
                "
              />

              LINKED
            </div>
          </div>

          {/* Co-host PK gifters */}
          {isBattleMode &&
            gifters.length > 0 && (
              <div
                className="
                  relative
                  z-10
                  p-1.5
                  bg-black/80
                  backdrop-blur-md
                  border-t
                  border-cyan-500/30
                  flex
                  items-center
                  justify-between
                  gap-2
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-1
                    text-[8px]
                    font-mono
                    text-pink-400
                    font-bold
                    uppercase
                    shrink-0
                  "
                >
                  <Trophy
                    size={10}
                    className="text-amber-400"
                  />

                  Top Gifters
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                    min-w-0
                  "
                >
                  {gifters.map(
                    (gifter, gifterIndex) => (
                      <div
                        key={
                          gifter.id ||
                          `cohost-${index}-gifter-${gifterIndex}`
                        }
                        className="
                          flex
                          items-center
                          gap-1
                          bg-zinc-900/90
                          px-1.5
                          py-0.5
                          rounded-lg
                          border
                          border-white/10
                          text-[8px]
                          min-w-0
                        "
                      >
                        {gifter.avatar ? (
                          <span>
                            {gifter.avatar}
                          </span>
                        ) : null}

                        <span
                          className="
                            text-white
                            font-bold
                            max-w-[55px]
                            truncate
                          "
                        >
                          {gifter.name ||
                            gifter.username ||
                            'User'}
                        </span>

                        <span
                          className="
                            text-pink-400
                            font-mono
                            font-bold
                          "
                        >
                          {formatCoins(
                            gifter.coins
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </motion.div>
      );
    };

  return (
    <div
      className={`
        relative
        w-full
        overflow-hidden
        bg-black
        transition-all
        duration-500
        ease-in-out
        ${
          isCoHosting
            ? 'h-[50vh] min-h-[300px] border-b border-cyan-500/20 shadow-2xl'
            : 'h-full'
        }
        ${className}
      `}
      data-stream-id={streamId || undefined}
    >
      {/* Small gifts */}
      <FloatingGiftEmojis
        activeSmallGift={
          activeSmallGift
        }
        onClear={
          onClearSmallGift
        }
      />

      {/* Main stream grid */}
      <div
        className={`
          w-full
          h-full
          gap-1.5
          p-1
          bg-[#05050d]
          ${getGridLayoutClass()}
        `}
      >
        {/* Main host */}
        {renderHostPanel()}

        {/* Co-hosts */}
        <AnimatePresence mode="popLayout">
          {isCoHosting &&
            coHostList.map(
              (cohost, index) =>
                renderCoHostPanel(
                  cohost,
                  index
                )
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DynamicStreamGrid;
