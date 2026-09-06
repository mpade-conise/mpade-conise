// src/components/DynamicStreamGrid.jsx

import React, {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import {
  Users,
  Radio,
  Trophy
} from 'lucide-react';

import FloatingGiftEmojis from './live/FloatingGiftEmojis';

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
    return (coins / 1000000).toFixed(1) + 'M';
  }

  if (coins >= 1000) {
    return (coins / 1000).toFixed(1) + 'k';
  }

  return String(Math.round(coins));
};

const assignRef = (ref, value) => {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  try {
    ref.current = value;
  } catch {
    // Ignore readonly refs.
  }
};

export const DynamicStreamGrid = ({
  streamId,
  hostVideo,
  hostStream,
  hostInfo = DEFAULT_HOST_INFO,

  coHosts: propCoHosts = null,

  coHostStream = null,
  coHostVideo = null,
  coHostInfo = null,

  coHostStreams = EMPTY_ARRAY,
  coHostVideos = EMPTY_ARRAY,

  isHostView = false,
  isBattleMode = false,

  activeSmallGift = null,
  onClearSmallGift,

  topGifters = null,

  className = ''
}) => {
  const hostVideoElementRef = useRef(null);
  const coHostVideoElementRefs = useRef({});

  const coHostStreamsRef = useRef(coHostStreams);
  const coHostVideosRef = useRef(coHostVideos);

  useEffect(() => {
    coHostStreamsRef.current = coHostStreams;
  }, [coHostStreams]);

  useEffect(() => {
    coHostVideosRef.current = coHostVideos;
  }, [coHostVideos]);

  /*
   * ------------------------------------------------------------
   * Co-host list
   * ------------------------------------------------------------
   */
  const coHostList = useMemo(() => {
    if (propCoHosts !== null) {
      return getSafeArray(propCoHosts).slice(
        0,
        MAX_CO_HOSTS
      );
    }

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
    1 +
    Math.min(
      MAX_CO_HOSTS,
      coHostList.length
    );

  const isCoHosting =
    totalHostsCount > 1;

  /*
   * ------------------------------------------------------------
   * Co-host stream resolver
   * ------------------------------------------------------------
   */
  const getCoHostStream = index => {
    const cohost = coHostList[index];

    if (!cohost) {
      return null;
    }

    const streams = coHostStreamsRef.current;

    if (
      Array.isArray(streams) &&
      streams[index]
    ) {
      return streams[index];
    }

    if (cohost.stream) {
      return cohost.stream;
    }

    if (cohost.mediaStream) {
      return cohost.mediaStream;
    }

    if (cohost.remoteStream) {
      return cohost.remoteStream;
    }

    if (cohost.videoStream) {
      return cohost.videoStream;
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
   * Co-host supplied video resolver
   * ------------------------------------------------------------
   */
  const getCoHostVideo = index => {
    const cohost = coHostList[index];

    if (!cohost) {
      return null;
    }

    const videos = coHostVideosRef.current;

    if (
      Array.isArray(videos) &&
      videos[index]
    ) {
      return videos[index];
    }

    if (cohost.videoElement) {
      return cohost.videoElement;
    }

    if (cohost.video) {
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

  /*
   * ------------------------------------------------------------
   * Host video
   * ------------------------------------------------------------
   */
  const renderedHostVideo = useMemo(() => {
    if (
      !hostVideo ||
      !isValidElement(hostVideo)
    ) {
      return null;
    }

    const originalRef =
      hostVideo.ref || null;

    return cloneElement(
      hostVideo,
      {
        ref: node => {
          hostVideoElementRef.current = node;

          assignRef(
            originalRef,
            node
          );
        },

        autoPlay: true,
        muted: true,
        playsInline: true
      }
    );
  }, [hostVideo]);

  /*
   * ------------------------------------------------------------
   * Host stream binding
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const video =
      hostVideoElementRef.current;

    if (!video || !hostStream) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer = null;

    const attemptPlay = async () => {
      if (cancelled) {
        return;
      }

      try {
        if (video.srcObject !== hostStream) {
          video.srcObject = hostStream;
        }

        if (
          video.readyState >= 1 &&
          video.paused
        ) {
          await video.play();
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(
            '⚠️ [DynamicStreamGrid] Host video playback failed:',
            error?.message || error
          );
        }
      }
    };

    const handleLoadedMetadata = () => {
      attemptPlay();
    };

    video.addEventListener(
      'loadedmetadata',
      handleLoadedMetadata
    );

    attemptPlay();

    retryTimer = setTimeout(() => {
      attemptPlay();
    }, 500);

    return () => {
      cancelled = true;

      video.removeEventListener(
        'loadedmetadata',
        handleLoadedMetadata
      );

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [
    hostStream,
    renderedHostVideo
  ]);

  /*
   * ------------------------------------------------------------
   * Bind a co-host stream to a video element
   *
   * IMPORTANT:
   * This does not stop or destroy the MediaStream.
   * WebRTC owns the stream lifecycle.
   * ------------------------------------------------------------
   */
  const bindCoHostVideo = (
    index,
    video
  ) => {
    if (!video) {
      return;
    }

    const stream =
      getCoHostStream(index);

    if (!stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const attemptPlay = async () => {
      try {
        if (
          video.srcObject !== stream
        ) {
          video.srcObject = stream;
        }

        if (
          video.readyState >= 1 &&
          video.paused
        ) {
          await video.play();

          console.log(
            '▶️ [DynamicStreamGrid] Co-host ' +
              (index + 1) +
              ' video is playing.'
          );
        }
      } catch (error) {
        console.warn(
          '⚠️ [DynamicStreamGrid] Co-host ' +
            (index + 1) +
            ' playback waiting:',
          error?.message || error
        );
      }
    };

    const handleLoadedMetadata = () => {
      attemptPlay();
    };

    video.addEventListener(
      'loadedmetadata',
      handleLoadedMetadata
    );

    /*
     * Try now.
     */
    attemptPlay();

    /*
     * Try once more after the browser has
     * had time to attach the MediaStream.
     */
    const retryTimer = setTimeout(() => {
      attemptPlay();
    }, 300);

    /*
     * Store cleanup on the element.
     * This prevents duplicate metadata listeners
     * when React reuses the element.
     */
    video.__mpadeCoHostCleanup = () => {
      video.removeEventListener(
        'loadedmetadata',
        handleLoadedMetadata
      );

      clearTimeout(retryTimer);
    };
  };

  /*
   * ------------------------------------------------------------
   * Co-host video callback refs
   *
   * This is the important part of the repair.
   *
   * When React creates the actual <video> element,
   * we immediately bind the current MediaStream.
   * ------------------------------------------------------------
   */
  const setCoHostVideoRef = (
    index,
    node
  ) => {
    const previous =
      coHostVideoElementRefs.current[index];

    if (
      previous &&
      previous !== node
    ) {
      if (
        previous.__mpadeCoHostCleanup
      ) {
        previous.__mpadeCoHostCleanup();
        previous.__mpadeCoHostCleanup = null;
      }

      previous.srcObject = null;
    }

    if (!node) {
      delete coHostVideoElementRefs.current[index];
      return;
    }

    coHostVideoElementRefs.current[index] =
      node;

    bindCoHostVideo(
      index,
      node
    );
  };

  /*
   * ------------------------------------------------------------
   * Co-host stream synchronization
   *
   * Handles the case where WebRTC delivers the
   * MediaStream after the video element already exists.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    coHostList.forEach((_, index) => {
      const video =
        coHostVideoElementRefs.current[index];

      if (!video) {
        return;
      }

      const stream =
        getCoHostStream(index);

      if (!stream) {
        return;
      }

      if (video.srcObject !== stream) {
        if (
          video.__mpadeCoHostCleanup
        ) {
          video.__mpadeCoHostCleanup();
          video.__mpadeCoHostCleanup = null;
        }

        bindCoHostVideo(
          index,
          video
        );
      }
    });
  }, [
    coHostList,
    coHostStreams,
    coHostStream
  ]);

  /*
   * ------------------------------------------------------------
   * Remove stale co-host refs
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
      const numericIndex =
        Number(index);

      if (
        !activeIndexes.has(
          numericIndex
        )
      ) {
        const video =
          coHostVideoElementRefs.current[
            index
          ];

        if (video) {
          if (
            video.__mpadeCoHostCleanup
          ) {
            video.__mpadeCoHostCleanup();
            video.__mpadeCoHostCleanup = null;
          }

          video.srcObject = null;
        }

        delete coHostVideoElementRefs
          .current[index];
      }
    });
  }, [coHostList]);

  /*
   * ------------------------------------------------------------
   * Grid layout
   * ------------------------------------------------------------
   */
  const getGridLayoutClass = () => {
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
   * PK gifters
   * ------------------------------------------------------------
   */
  const resolvedTopGifters =
    topGifters || {};

  const getGiftersForHost = key => {
    const data =
      resolvedTopGifters[key];

    return getSafeArray(data)
      .slice(0, 2);
  };

  /*
   * ------------------------------------------------------------
   * Host panel
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
        <div className="absolute inset-0 z-0">
          {renderedHostVideo ? (
            <div className="w-full h-full">
              {renderedHostVideo}
            </div>
          ) : hostStream ? (
            <video
              ref={hostVideoElementRef}
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
                    src={hostInfo.avatar_url}
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
                        'host-gifter-' +
                          index
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
   * Co-host panel
   * ------------------------------------------------------------
   */
  const renderCoHostPanel = (
    cohost,
    index
  ) => {
    const suppliedVideo =
      getCoHostVideo(index);

    const stream =
      getCoHostStream(index);

    const gifters =
      getGiftersForHost(
        'coHost' +
          (index + 1)
      );

    const username =
      getDisplayName(
        cohost,
        'Host ' +
          (index + 2)
      );

    const avatar =
      getAvatar(cohost);

    /*
     * If the parent supplied an actual React
     * video element, preserve it.
     *
     * Otherwise create our own video element.
     */
    let videoContent = null;

    if (
      suppliedVideo &&
      isValidElement(suppliedVideo)
    ) {
      const originalRef =
        suppliedVideo.ref || null;

      videoContent = cloneElement(
        suppliedVideo,
        {
          ref: node => {
            setCoHostVideoRef(
              index,
              node
            );

            assignRef(
              originalRef,
              node
            );
          },

          autoPlay: true,
          playsInline: true
        }
      );
    } else if (stream) {
      videoContent = (
        <video
          ref={node => {
            setCoHostVideoRef(
              index,
              node
            );
          }}
          autoPlay
          playsInline
          muted={false}
          className="
            w-full
            h-full
            object-cover
          "
        />
      );
    }

    return (
      <motion.div
        key={
          cohost?.id ||
          cohost?.user_id ||
          cohost?.socketId ||
          'cohost-' +
            index
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
        <div className="absolute inset-0 z-0">
          {videoContent ? (
            <div className="w-full h-full">
              {videoContent}
            </div>
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
                    className="text-cyan-400"
                  />
                )}
              </div>
            </div>
          )}
        </div>

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
                  (
                    gifter,
                    gifterIndex
                  ) => (
                    <div
                      key={
                        gifter.id ||
                        'cohost-' +
                          index +
                          '-gifter-' +
                          gifterIndex
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

  /*
   * ------------------------------------------------------------
   * Main render
   * ------------------------------------------------------------
   */
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
      data-stream-id={
        streamId || undefined
      }
    >
      <FloatingGiftEmojis
        activeSmallGift={activeSmallGift}
        onClear={onClearSmallGift}
      />

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
        {renderHostPanel()}

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
