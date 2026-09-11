import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Share2,
  X,
  Gift as GiftIcon,
  Users,
  VideoOff,
  Loader2,
  Wifi,
  WifiOff,
  MessageCircle,
  Maximize2,
  Minimize2,
  UserPlus,
  UserCheck,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';

// Components
import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';
import LiveStreamGoalBar from '../../../components/live/LiveStreamGoalBar.jsx';
import { MultiHostPKBattleBar } from '../../../components/live/MultiHostPKBattleBar';

const LIVE_STATUSES = new Set(['live', 'active', 'streaming', 'ongoing']);
const ENDED_STATUSES = new Set(['ended', 'offline', 'cancelled', 'canceled', 'terminated', 'stopped']);

const isStreamLive = stream => {
  if (!stream) return false;

  const status = String(stream.status || '').trim().toLowerCase();

  if (status) {
    if (ENDED_STATUSES.has(status)) return false;
    if (LIVE_STATUSES.has(status)) return true;
  }

  return stream.is_live !== false;
};

const formatCompactNumber = value => {
  const number = Number(value) || 0;

  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;

  return String(number);
};

const getNetworkState = () => {
  if (typeof navigator === 'undefined') {
    return { online: true, label: 'Online', quality: 'good' };
  }

  if (!navigator.onLine) {
    return { online: false, label: 'Offline', quality: 'offline' };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return { online: true, label: 'Online', quality: 'good' };
  }

  const effectiveType = String(connection.effectiveType || '').toLowerCase();

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return { online: true, label: 'Poor', quality: 'poor' };
  }

  if (effectiveType === '3g') {
    return { online: true, label: 'Fair', quality: 'fair' };
  }

  return { online: true, label: 'Good', quality: 'good' };
};

const parseSettings = settings => {
  if (!settings) return {};

  if (typeof settings === 'object') {
    return settings;
  }

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return {};
    }
  }

  return {};
};

const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showGifts, setShowGifts] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [eventNotification, setEventNotification] = useState(null);

  const [isCameraOff, setIsCameraOff] = useState(false);

  const [showShareList, setShowShareList] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);

  const [activeCohostsList, setActiveCohostsList] = useState([]);
  const [hasActiveCohosts, setHasActiveCohosts] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [chatVisible, setChatVisible] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);

  const [networkState, setNetworkState] = useState(getNetworkState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reconnectToken, setReconnectToken] = useState(0);

  const [retryNonce, setRetryNonce] = useState(0);

  const heartCountRef = useRef(0);
  const streamChannelRef = useRef(null);
  const cohostChannelRef = useRef(null);

  const eventNotificationTimerRef = useRef(null);
  const cohostRefreshTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);

  const mountedRef = useRef(true);
  const redirectedRef = useRef(false);
  const playerRef = useRef(null);

  /*
   * ---------------------------------------------------------
   * AUTH USER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!cancelled) {
        setCurrentUser(user || null);
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * NETWORK MONITOR
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const updateNetwork = () => {
      if (!mountedRef.current) return;

      const state = getNetworkState();
      setNetworkState(state);

      if (state.quality === 'poor' && !dataSaver) {
        setDataSaver(true);
      }
    };

    const connection = typeof navigator !== 'undefined'
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null;

    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    if (connection) {
      connection.addEventListener?.('change', updateNetwork);
    }

    updateNetwork();

    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);

      if (connection) {
        connection.removeEventListener?.('change', updateNetwork);
      }
    };
  }, [dataSaver]);

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!mountedRef.current) return;

      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const target = playerRef.current;

    if (!target) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen unavailable:', error);
    }
  };

  /*
   * ---------------------------------------------------------
   * STREAM DATA + STREAM REALTIME
   *
   * IMPORTANT:
   * This effect only depends on streamId/retryNonce.
   * It does not depend on changing stream state.
   * This prevents realtime updates from recreating the
   * subscription and causing refresh-like loops.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!streamId) return undefined;

    let isMounted = true;

    mountedRef.current = true;
    redirectedRef.current = false;

    const redirectToEnded = () => {
      if (!isMounted || redirectedRef.current) return;

      redirectedRef.current = true;

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }

      redirectTimerRef.current = setTimeout(() => {
        if (!isMounted) return;

        navigate('/live/ended', {
          replace: true,
          state: { streamId }
        });
      }, 500);
    };

    const fetchStream = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', streamId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        console.error('Failed to load live stream:', error);
        setLoadError('This live stream could not be loaded.');
        setLoading(false);
        return;
      }

      if (!isStreamLive(data)) {
        redirectToEnded();
        setLoading(false);
        return;
      }

      let hostProfile = null;

      if (data.host_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, verified_status, is_verified, online')
          .eq('id', data.host_id)
          .maybeSingle();

        hostProfile = profile || null;
      }

      if (!isMounted) return;

      const mergedStream = {
        ...data,
        host: hostProfile
      };

      setStreamData(mergedStream);

      const cameraOff =
        data.is_video_off === true ||
        data.is_camera_on === false;

      setIsCameraOff(cameraOff);

      const initialLikes = Number(data.likes) || 0;

      setHeartCount(initialLikes);
      heartCountRef.current = initialLikes;

      setViewerCount(Number(data.viewer_count) || 0);

      setLoading(false);

      if (currentUser?.id && data.host_id) {
        const { data: followRow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', data.host_id)
          .maybeSingle();

        if (isMounted) {
          setIsFollowing(Boolean(followRow));
        }
      }
    };

    fetchStream();

    const channelName = `live-player:${streamId}`;

    const channel = supabase.channel(channelName, {
      config: {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    });

    streamChannelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        payload => {
          if (!isMounted || !payload?.new) return;

          const updatedStream = payload.new;

          if (!isStreamLive(updatedStream)) {
            redirectToEnded();
            return;
          }

          const cameraOff =
            updatedStream.is_video_off === true ||
            updatedStream.is_camera_on === false;

          setIsCameraOff(previous => (
            previous === cameraOff ? previous : cameraOff
          ));

          setStreamData(previous => {
            if (!previous) return previous;

            const next = {
              ...previous,
              ...updatedStream
            };

            if (
              updatedStream.host_id === previous.host_id &&
              previous.host
            ) {
              next.host = previous.host;
            }

            return next;
          });

          if (typeof updatedStream.viewer_count === 'number') {
            setViewerCount(previous => (
              previous === updatedStream.viewer_count
                ? previous
                : updatedStream.viewer_count
            ));
          }

          if (typeof updatedStream.likes === 'number') {
            const serverLikes = Number(updatedStream.likes) || 0;

            if (serverLikes > heartCountRef.current) {
              setEventNotification({
                type: 'like',
                message: 'liked the live video',
                name: 'A viewer',
                avatar: null
              });

              if (eventNotificationTimerRef.current) {
                clearTimeout(eventNotificationTimerRef.current);
              }

              eventNotificationTimerRef.current = setTimeout(() => {
                if (!isMounted) return;

                setEventNotification(null);
                eventNotificationTimerRef.current = null;
              }, 3000);

              heartCountRef.current = serverLikes;
              setHeartCount(serverLikes);
            } else if (serverLikes >= heartCountRef.current) {
              heartCountRef.current = serverLikes;
              setHeartCount(serverLikes);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }

      if (eventNotificationTimerRef.current) {
        clearTimeout(eventNotificationTimerRef.current);
        eventNotificationTimerRef.current = null;
      }

      if (streamChannelRef.current === channel) {
        streamChannelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [streamId, retryNonce, navigate]);

  /*
   * ---------------------------------------------------------
   * FOLLOW HOST
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!currentUser?.id || !streamData?.host_id) return undefined;

    let cancelled = false;

    const checkFollowing = async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', streamData.host_id)
        .maybeSingle();

      if (!cancelled && !error) {
        setIsFollowing(Boolean(data));
      }
    };

    checkFollowing();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, streamData?.host_id]);

  const handleFollow = async () => {
    if (!currentUser?.id || !streamData?.host_id || followLoading) return;

    setFollowLoading(true);

    const currentlyFollowing = isFollowing;

    if (currentlyFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', streamData.host_id);

      if (error) {
        console.error('Failed to unfollow host:', error);
      } else {
        setIsFollowing(false);
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: streamData.host_id
        });

      if (error) {
        if (error.code === '23505') {
          setIsFollowing(true);
        } else {
          console.error('Failed to follow host:', error);
        }
      } else {
        setIsFollowing(true);
      }
    }

    setFollowLoading(false);
  };

  /*
   * ---------------------------------------------------------
   * FRIEND / SHARE LIST
   *
   * Uses two separate queries instead of relying on the
   * profiles!follower_id relationship.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!showShareList || !currentUser?.id) return undefined;

    let cancelled = false;

    const fetchFollowers = async () => {
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUser.id);

      if (cancelled || error) return;

      const ids = [...new Set(
        (followRows || [])
          .map(row => row.follower_id)
          .filter(Boolean)
      )];

      if (!ids.length) {
        setFollowers([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids);

      if (!cancelled && !profileError) {
        setFollowers(profiles || []);
      }
    };

    fetchFollowers();

    return () => {
      cancelled = true;
    };
  }, [showShareList, currentUser?.id]);

  const handleSendInvite = async recipientId => {
    if (!streamId || !recipientId || sentInvites.includes(recipientId)) return;

    const user = currentUser;

    if (!user) {
      setEventNotification({
        type: 'info',
        message: 'Sign in to invite friends',
        name: 'Made Universe',
        avatar: null
      });

      return;
    }

    const { error } = await supabase
      .from('live_comments')
      .insert({
        stream_id: streamId,
        user_id: user.id,
        content: "I'm watching this live! Join me.",
        type: 'invite'
      });

    if (!error) {
      setSentInvites(previous => (
        previous.includes(recipientId)
          ? previous
          : [...previous, recipientId]
      ));
    } else {
      console.error('Failed to send live invite:', error);
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/live/watch/${streamId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: streamData?.title || 'Live on Made Universe',
          text: `Watch ${streamData?.host?.username || 'this creator'} live on Made Universe`,
          url: shareUrl
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);

        setEventNotification({
          type: 'info',
          message: 'Live link copied',
          name: 'Made Universe',
          avatar: null
        });

        if (eventNotificationTimerRef.current) {
          clearTimeout(eventNotificationTimerRef.current);
        }

        eventNotificationTimerRef.current = setTimeout(() => {
          setEventNotification(null);
          eventNotificationTimerRef.current = null;
        }, 2500);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Share failed:', error);
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * CO-HOST REALTIME
   *
   * No profiles:user_id nested relationship.
   * This avoids the PGRST200 schema-cache error.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!streamId) return undefined;

    let isMounted = true;

    const refreshCohosts = async () => {
      const { data: requests, error } = await supabase
        .from('live_guest_requests')
        .select('id, user_id, status, role')
        .eq('stream_id', streamId)
        .eq('status', 'approved');

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load active co-hosts:', error);
        return;
      }

      const rows = requests || [];

      const userIds = [...new Set(
        rows
          .map(row => row.user_id)
          .filter(Boolean)
      )];

      let profiles = [];

      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, verified_status, is_verified, online')
          .in('id', userIds);

        if (profileError) {
          console.warn('Failed to load co-host profiles:', profileError);
        } else {
          profiles = profileRows || [];
        }
      }

      if (!isMounted) return;

      const profileMap = new Map(
        profiles.map(profile => [profile.id, profile])
      );

      const cohosts = rows.map(row => {
        const profile = profileMap.get(row.user_id);

        return {
          id: row.user_id || row.id,
          request_id: row.id,
          username: profile?.username || 'Co-Host',
          avatar_url: profile?.avatar_url || null,
          verified_status: profile?.verified_status || null,
          is_verified: Boolean(profile?.is_verified),
          online: Boolean(profile?.online),
          role: row.role || 'cohost'
        };
      });

      setActiveCohostsList(previous => {
        const previousIds = previous.map(item => item.id).join(',');
        const nextIds = cohosts.map(item => item.id).join(',');

        if (previousIds === nextIds) {
          return previous;
        }

        return cohosts;
      });

      setHasActiveCohosts(previous => {
        const next = cohosts.length > 0;
        return previous === next ? previous : next;
      });
    };

    const scheduleRefresh = () => {
      if (cohostRefreshTimerRef.current) {
        clearTimeout(cohostRefreshTimerRef.current);
      }

      cohostRefreshTimerRef.current = setTimeout(() => {
        cohostRefreshTimerRef.current = null;
        refreshCohosts();
      }, 250);
    };

    refreshCohosts();

    const channelName = `live-player-cohosts:${streamId}`;
    const cohostChannel = supabase.channel(channelName);

    cohostChannelRef.current = cohostChannel;

    cohostChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      isMounted = false;

      if (cohostRefreshTimerRef.current) {
        clearTimeout(cohostRefreshTimerRef.current);
        cohostRefreshTimerRef.current = null;
      }

      if (cohostChannelRef.current === cohostChannel) {
        cohostChannelRef.current = null;
      }

      supabase.removeChannel(cohostChannel);
    };
  }, [streamId]);

  /*
   * ---------------------------------------------------------
   * LIKE
   * ---------------------------------------------------------
   */

  const handleLike = async () => {
    if (!streamId) return;

    const newCount = heartCountRef.current + 1;

    heartCountRef.current = newCount;
    setHeartCount(newCount);

    const { error } = await supabase.rpc('increment_likes', {
      stream_id_input: streamId
    });

    if (error) {
      console.error('Failed to increment likes:', error);
    }
  };

  /*
   * ---------------------------------------------------------
   * JOIN AS GUEST
   * ---------------------------------------------------------
   */

  const handleJoinGuest = () => {
    if (!streamId) return;

    navigate(`/live/watch/${streamId}/join-guest`);
  };

  /*
   * ---------------------------------------------------------
   * RETRY
   * ---------------------------------------------------------
   */

  const handleRetry = () => {
    redirectedRef.current = false;
    setLoadError(null);
    setLoading(true);
    setReconnectToken(previous => previous + 1);
    setRetryNonce(previous => previous + 1);
  };

  /*
   * ---------------------------------------------------------
   * BATTLE DATA
   *
   * No fake challenger, scores, or gifters.
   * Only render the PK component when real battle data
   * exists in live_streams.settings.
   * ---------------------------------------------------------
   */

  const settings = parseSettings(streamData?.settings);
  const battle = settings?.battle || null;

  const battleHosts = Array.isArray(battle?.hosts)
    ? battle.hosts
        .filter(Boolean)
        .map((host, index) => ({
          id: host.id || `battle-host-${index}`,
          username: host.username || 'Host',
          avatar: host.avatar || host.avatar_url || null,
          score: Number(host.score) || 0,
          topGifters: Array.isArray(host.topGifters)
            ? host.topGifters
            : []
        }))
    : [];

  const isBattleMode = Boolean(
    battle?.active === true ||
    streamData?.battle_active === true ||
    streamData?.is_battle === true
  );

  /*
   * ---------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (eventNotificationTimerRef.current) {
        clearTimeout(eventNotificationTimerRef.current);
      }

      if (cohostRefreshTimerRef.current) {
        clearTimeout(cohostRefreshTimerRef.current);
      }

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }

      if (streamChannelRef.current) {
        supabase.removeChannel(streamChannelRef.current);
        streamChannelRef.current = null;
      }

      if (cohostChannelRef.current) {
        supabase.removeChannel(cohostChannelRef.current);
        cohostChannelRef.current = null;
      }
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading && !streamData) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={30} className="text-white/50 animate-spin" />
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Loading live
          </span>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (loadError && !streamData) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
            <WifiOff size={24} className="text-white/40" />
          </div>

          <h2 className="text-white font-black text-lg">
            Live unavailable
          </h2>

          <p className="text-white/40 text-xs mt-2">
            {loadError}
          </p>

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => navigate('/live')}
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-bold"
            >
              Back to Live
            </button>

            <button
              onClick={handleRetry}
              className="flex-1 py-3 rounded-2xl bg-[#fe2c55] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!streamData) return null;

  /*
   * ---------------------------------------------------------
   * VIEWER UI
   * ---------------------------------------------------------
   */

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden flex flex-col">
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }

          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* PLAYER / STREAM */}
      <div
        ref={playerRef}
        className="relative w-full h-full z-0 overflow-hidden bg-black"
      >
        <DynamicStreamGrid
          streamId={streamId}
          hostVideo={
            <VideoPlayer
              streamId={streamId}
              isHost={false}
              dataSaver={dataSaver}
              quality={quality}
              reconnectToken={reconnectToken}
            />
          }
          hostInfo={{
            id: streamData?.host_id,
            username: streamData?.host?.username || 'Host',
            avatar_url: streamData?.host?.avatar_url || null,
            verified_status: streamData?.host?.verified_status || null,
            is_verified: Boolean(streamData?.host?.is_verified),
            online: Boolean(streamData?.host?.online)
          }}
          coHosts={activeCohostsList}
          isHostView={false}
          isBattleMode={isBattleMode}
        />

        {/* HOST CAMERA OFF */}
        <AnimatePresence>
          {isCameraOff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[45] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <VideoOff size={40} className="text-white/40" />
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="text-white font-black text-xl uppercase tracking-widest">
                    Host is busy
                  </h2>

                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">
                    The camera is currently disabled. Stay tuned!
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  <Loader2 size={12} className="text-[#fe2c55] animate-spin" />

                  <span className="text-[9px] text-white/80 font-black uppercase">
                    Waiting for host...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PLAYER STATUS */}
        <div className="absolute top-4 right-4 z-[48] flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            {networkState.online ? (
              <Wifi size={12} className="text-green-400" />
            ) : (
              <WifiOff size={12} className="text-red-400" />
            )}

            <span className="text-[9px] font-bold text-white/80 uppercase">
              {networkState.label}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10"
          >
            {isFullscreen ? (
              <Minimize2 size={15} />
            ) : (
              <Maximize2 size={15} />
            )}
          </button>
        </div>
      </div>

      {/* FLOATING HEARTS ONLY */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <FloatingHearts
          count={heartCount}
          streamId={streamId}
        />
      </div>

      {/* TOP UI */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/90 via-black/30 to-transparent pointer-events-none flex flex-col gap-2.5">
        <div className="pointer-events-auto">
          <StreamHeader
            data={streamData}
            isHost={false}
            viewerCount={viewerCount}
            onLeave={() => navigate('/live')}
          />
        </div>

        {/* HOST INFO / FOLLOW */}
        <div className="pointer-events-auto flex items-center justify-between gap-3 max-w-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10">
              {streamData?.host?.avatar_url ? (
                <img
                  src={streamData.host.avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60 text-xs">
                  👤
                </div>
              )}

              {streamData?.host?.online && (
                <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-black truncate max-w-[150px]">
                  {streamData?.host?.username || 'Host'}
                </span>

                {(
                  streamData?.host?.is_verified ||
                  streamData?.host?.verified_status === 'verified'
                ) && (
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-black">
                    ✓
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[9px] text-white/50">
                <span>{formatCompactNumber(viewerCount)} watching</span>

                {streamData?.category && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[100px]">
                      {streamData.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {currentUser?.id && currentUser.id !== streamData?.host_id && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${
                isFollowing
                  ? 'bg-white/10 border border-white/10 text-white'
                  : 'bg-[#fe2c55] text-white'
              }`}
            >
              {followLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isFollowing ? (
                <UserCheck size={12} />
              ) : (
                <UserPlus size={12} />
              )}

              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* GOAL BAR */}
        <div className="flex justify-start pl-1 pointer-events-auto">
          <LiveStreamGoalBar
            streamId={streamId}
            isHost={false}
          />
        </div>

        {/* REAL PK BATTLE ONLY */}
        {isBattleMode && battleHosts.length >= 2 && (
          <div className="w-full max-w-lg mx-auto pt-1 pointer-events-auto">
            <MultiHostPKBattleBar
              hosts={battleHosts}
              duration={Number(battle?.duration) || 180}
            />
          </div>
        )}
      </div>

      {/* EVENT NOTIFICATION */}
      <div className="absolute bottom-28 left-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {eventNotification && (
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full pl-1 pr-4 py-1 flex items-center gap-3 shadow-2xl"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/20">
                {eventNotification.avatar ? (
                  <img
                    src={eventNotification.avatar}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white">
                    👤
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-white text-[10px] font-black">
                  {eventNotification.name}
                </span>

                <span className="text-white/70 text-[9px] font-medium">
                  {eventNotification.message}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM UI */}
      <div className="absolute inset-x-0 bottom-0 z-50 pointer-events-none">
        {/* CHAT + ACTIONS
         *
         * Mobile layout intentionally stacks the chat above the action
         * controls. This prevents the action rail from covering the chat
         * input/messages on narrow phones.
         */}
        <div className="w-full px-3 pb-3 sm:px-4 sm:pb-4 sm:flex sm:items-end sm:justify-between sm:gap-4">
          {/* CHAT */}
          <AnimatePresence>
            {chatVisible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full sm:max-w-[340px] h-[250px] sm:h-[340px] mb-2 sm:mb-0 pointer-events-auto overflow-hidden hide-scrollbar"
              >
                <LiveChat
                  streamId={streamId}
                  hideMessages={false}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTION BUTTONS */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-1.5 sm:gap-2.5 pointer-events-auto">
          {/* CHAT TOGGLE */}
          <button
            onClick={() => setChatVisible(previous => !previous)}
            title={chatVisible ? 'Hide chat' : 'Show chat'}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover:bg-white/10 transition-colors">
              <MessageCircle size={18} />
            </div>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              Chat
            </span>
          </button>

          {/* GUEST */}
          <button
            onClick={handleJoinGuest}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white group-hover:bg-white/10 transition-colors">
              <Users size={20} />
            </div>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              Guest
            </span>
          </button>

          {/* LIKE */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-[#fe2c55]">
              <Heart size={22} fill="currentColor" />
            </div>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              {formatCompactNumber(heartCount)}
            </span>
          </button>

          {/* GIFT */}
          <button
            onClick={() => setShowGifts(true)}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <GiftIcon size={24} />
            </div>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              Gift
            </span>
          </button>

          {/* SHARE */}
          <div className="flex flex-col items-center gap-1 group relative">
            <button
              onClick={() => setShowShareList(previous => !previous)}
              className="w-11 h-11 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all"
              aria-label="Share live"
            >
              <Share2 size={20} />
            </button>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              Share
            </span>

            <AnimatePresence>
              {showShareList && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.96 }}
                  className="absolute bottom-16 right-0 w-72 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl z-[60]"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Share Live
                    </span>

                    <button
                      onClick={() => setShowShareList(false)}
                      aria-label="Close share menu"
                    >
                      <X size={14} className="text-white/40" />
                    </button>
                  </div>

                  <button
                    onClick={handleNativeShare}
                    className="w-full mb-3 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} />
                    Share link
                  </button>

                  <div className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-2">
                    Send to followers
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-2 hide-scrollbar">
                    {followers.length === 0 ? (
                      <div className="text-center py-4">
                        <span className="text-white/40 text-[9px] uppercase font-bold">
                          No followers found
                        </span>
                      </div>
                    ) : (
                      followers.map(follower => {
                        const sent = sentInvites.includes(follower.id);

                        return (
                          <div
                            key={follower.id}
                            className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {follower.avatar_url ? (
                                <img
                                  src={follower.avatar_url}
                                  className="w-8 h-8 rounded-full object-cover"
                                  alt=""
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-[10px]">
                                  👤
                                </div>
                              )}

                              <span className="text-[10px] font-bold text-white truncate w-24">
                                {follower.username || 'User'}
                              </span>
                            </div>

                            <button
                              onClick={() => handleSendInvite(follower.id)}
                              disabled={sent}
                              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${
                                sent
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-[#fe2c55] text-white'
                              }`}
                            >
                              {sent ? 'Sent' : 'Send'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PLAYER SETTINGS */}
          <div className="relative flex flex-col items-center gap-1">
            <button
              onClick={() => setShowPlayerSettings(previous => !previous)}
              className="w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white"
              aria-label="Player settings"
            >
              <MoreHorizontal size={19} />
            </button>

            <span className="text-[8px] text-white/60 font-bold uppercase tracking-tighter">
              More
            </span>

            <AnimatePresence>
              {showPlayerSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                  className="absolute bottom-14 right-0 w-52 rounded-3xl bg-black/90 backdrop-blur-2xl border border-white/10 p-3 shadow-2xl"
                >
                  <div className="text-[9px] text-white/40 uppercase font-black tracking-widest mb-2">
                    Playback
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-[10px] text-white font-bold">
                      Data Saver
                    </span>

                    <button
                      onClick={() => setDataSaver(previous => !previous)}
                      className={`w-10 h-5 rounded-full transition-colors ${
                        dataSaver ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                          dataSaver ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-2">
                    <span className="text-[9px] text-white/40 uppercase font-bold">
                      Quality
                    </span>

                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {['auto', '360p', '480p', '720p'].map(option => (
                        <button
                          key={option}
                          onClick={() => setQuality(option)}
                          className={`py-1.5 rounded-lg text-[8px] font-black uppercase ${
                            quality === option
                              ? 'bg-white text-black'
                              : 'bg-white/5 text-white/50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowPlayerSettings(false);
                      setReconnectToken(previous => previous + 1);
                    }}
                    className="w-full mt-3 py-2 rounded-xl bg-white/5 text-white text-[9px] font-black uppercase flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={12} />
                    Reconnect
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>

      {/* GIFT PANEL
       *
       * Gift handling lives here.
       * LivePlayer does NOT listen to live_gifts anymore.
       * GiftPanel owns the sending flow.
       */}
      <AnimatePresence>
        {showGifts && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGifts(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-w-lg"
            >
              <GiftPanel
                streamId={streamId}
                onClose={() => setShowGifts(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LivePlayer;
