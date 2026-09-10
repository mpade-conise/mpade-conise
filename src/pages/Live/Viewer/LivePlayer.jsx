// LivePlayer.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  Maximize,
  Volume2,
  VolumeX,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';

import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';
import LiveStreamGoalBar from '../../../components/live/LiveStreamGoalBar.jsx';
import { MultiHostPKBattleBar } from '../../../components/live/MultiHostPKBattleBar';

const END_STATUSES = new Set(['ended', 'offline', 'cancelled', 'canceled', 'stopped', 'terminated']);
const LIVE_STATUSES = new Set(['live', 'LIVE', 'streaming', 'active', 'started']);

const formatCount = value => {
  const count = Math.max(0, Number(value) || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
  return String(count);
};

const isStreamLive = stream => {
  if (!stream) return false;
  if (typeof stream.is_live === 'boolean') return stream.is_live;
  if (typeof stream.status === 'string') {
    if (END_STATUSES.has(stream.status)) return false;
    if (LIVE_STATUSES.has(stream.status)) return true;
  }
  return true;
};

const getAvatar = profile => profile?.avatar_url || profile?.avatar || null;

const getBattleData = stream => {
  const settings = stream?.settings && typeof stream.settings === 'object' ? stream.settings : {};
  const battle = settings.battle && typeof settings.battle === 'object' ? settings.battle : {};
  return battle;
};

const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const mountedRef = useRef(true);
  const streamChannelRef = useRef(null);
  const cohostChannelRef = useRef(null);
  const followerRequestRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const heartCountRef = useRef(0);
  const viewerCountRef = useRef(0);
  const redirectTimerRef = useRef(null);
  const lastLikeEventRef = useRef(0);
  const processedEventsRef = useRef(new Set());

  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState('');
  const [streamEnded, setStreamEnded] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');

  const [showGifts, setShowGifts] = useState(false);
  const [showShareList, setShowShareList] = useState(false);
  const [showChat, setShowChat] = useState(true);

  const [heartCount, setHeartCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);

  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);

  const [activeCohostsList, setActiveCohostsList] = useState([]);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleData, setBattleData] = useState(null);

  const [eventNotification, setEventNotification] = useState(null);
  const [followed, setFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const playerRef = useRef(null);

  const streamStatusLabel = useMemo(() => {
    if (streamEnded) return 'Stream ended';
    if (connectionState === 'failed') return 'Connection failed';
    if (connectionState === 'reconnecting') return 'Reconnecting';
    if (connectionState === 'connected') return 'Live';
    return 'Connecting';
  }, [connectionState, streamEnded]);

  const notify = useCallback((notification, duration = 3000) => {
    if (!mountedRef.current) return;

    setEventNotification(notification);

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setEventNotification(null);
      notificationTimerRef.current = null;
    }, duration);
  }, []);

  const goToLive = useCallback(() => {
    if (!mountedRef.current) return;

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    navigate('/live', { replace: true });
  }, [navigate]);

  const handleStreamEnded = useCallback(() => {
    if (!mountedRef.current) return;

    setStreamEnded(true);
    setConnectionState('ended');
    setIsReconnecting(false);
    notify({
      type: 'system',
      name: 'Live',
      message: 'This live stream has ended.',
      avatar: null
    }, 2500);

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        navigate('/live', { replace: true });
      }
    }, 2800);
  }, [navigate, notify]);

  const loadStream = useCallback(async () => {
    if (!streamId) {
      setStreamError('Invalid live stream.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setStreamError('');

    const { data, error } = await supabase
      .from('live_streams')
      .select('*, host:host_id(id, username, avatar_url, verified_status, is_verified, online)')
      .eq('id', streamId)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load live stream:', error);
      setStreamData(null);
      setStreamError('Unable to load this live stream.');
      setLoading(false);
      return;
    }

    if (!data) {
      setStreamData(null);
      setStreamError('This live stream does not exist.');
      setLoading(false);
      return;
    }

    if (!isStreamLive(data)) {
      setStreamData(data);
      setStreamEnded(true);
      setLoading(false);
      return;
    }

    const likes = Math.max(0, Number(data.likes) || 0);
    const viewers = Math.max(0, Number(data.viewer_count) || 0);

    heartCountRef.current = likes;
    viewerCountRef.current = viewers;

    setStreamData(data);
    setHeartCount(likes);
    setViewerCount(viewers);
    setIsCameraOff(data.is_camera_on === false || data.is_video_off === true);
    setIsMuted(data.is_muted === true);
    setLoading(false);
    setStreamEnded(false);

    const battle = getBattleData(data);
    setBattleData(battle);
    setIsBattleMode(Boolean(battle?.active || data.is_battle_active === true));
  }, [streamId]);

  const loadCohosts = useCallback(async () => {
    if (!streamId) return;

    const { data, error } = await supabase
      .from('live_guest_requests')
      .select('id, user_id, status, role')
      .eq('stream_id', streamId)
      .eq('status', 'approved');

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load active co-hosts:', error);
      return;
    }

    const requests = data || [];

    if (!requests.length) {
      setActiveCohostsList([]);
      return;
    }

    const userIds = [...new Set(requests.map(item => item.user_id).filter(Boolean))];

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, verified_status, is_verified, online')
      .in('id', userIds);

    if (!mountedRef.current) return;

    if (profileError) {
      console.error('Failed to load co-host profiles:', profileError);
    }

    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));

    const cohosts = requests.map(request => {
      const profile = profileMap.get(request.user_id);

      return {
        id: request.user_id,
        requestId: request.id,
        username: profile?.username || 'Co-Host',
        avatar_url: profile?.avatar_url || null,
        verified_status: profile?.verified_status || false,
        is_verified: profile?.is_verified || false,
        online: profile?.online !== false,
        role: request.role || 'cohost'
      };
    });

    setActiveCohostsList(cohosts);
  }, [streamId]);

  const loadFollowers = useCallback(async () => {
    if (!showShareList || !mountedRef.current) return;

    setFollowersLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !mountedRef.current) {
      setFollowersLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id);

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load followers:', error);
      setFollowers([]);
      setFollowersLoading(false);
      return;
    }

    const ids = [...new Set((data || []).map(item => item.follower_id).filter(Boolean))];

    if (!ids.length) {
      setFollowers([]);
      setFollowersLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    if (!mountedRef.current) return;

    if (profileError) {
      console.error('Failed to load follower profiles:', profileError);
      setFollowers([]);
    } else {
      setFollowers(profiles || []);
    }

    setFollowersLoading(false);
  }, [showShareList]);

  const checkFollowStatus = useCallback(async () => {
    if (!streamData?.host_id) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !mountedRef.current || user.id === streamData.host_id) return;

    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', streamData.host_id)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (!error) {
      setFollowed(Boolean(data));
    }
  }, [streamData?.host_id]);

  const handleFollow = useCallback(async () => {
    if (!streamData?.host_id || followLoading) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      notify({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in to follow the host.',
        avatar: null
      });
      return;
    }

    if (user.id === streamData.host_id) return;

    setFollowLoading(true);

    if (followed) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', streamData.host_id);

      if (!error && mountedRef.current) {
        setFollowed(false);
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: streamData.host_id
        });

      if (!error && mountedRef.current) {
        setFollowed(true);
      }
    }

    if (mountedRef.current) {
      setFollowLoading(false);
    }
  }, [followed, followLoading, notify, streamData?.host_id]);

  const handleSendInvite = useCallback(async recipientId => {
    if (!streamId || !recipientId || sentInvites.includes(recipientId)) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      notify({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in to send an invite.',
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

    if (error) {
      console.error('Failed to send live invite:', error);
      notify({
        type: 'error',
        name: 'Invite failed',
        message: 'The invite could not be sent.',
        avatar: null
      });
      return;
    }

    if (mountedRef.current) {
      setSentInvites(prev => prev.includes(recipientId) ? prev : [...prev, recipientId]);
      notify({
        type: 'invite',
        name: 'Invite sent',
        message: 'Your friend has been invited.',
        avatar: null
      });
    }
  }, [notify, sentInvites, streamId]);

  const handleLike = useCallback(async () => {
    if (!streamId) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      notify({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in to like this live.',
        avatar: null
      });
      return;
    }

    const newCount = Math.max(0, heartCountRef.current + 1);

    heartCountRef.current = newCount;

    if (mountedRef.current) {
      setHeartCount(newCount);
    }

    const { error } = await supabase.rpc('increment_likes', {
      stream_id_input: streamId
    });

    if (error) {
      console.error('Failed to increment likes:', error);
    }
  }, [notify, streamId]);

  const handleRetry = useCallback(async () => {
    if (!streamId) return;

    setIsReconnecting(true);
    setConnectionState('reconnecting');
    setStreamError('');

    await loadStream();
    await loadCohosts();

    if (mountedRef.current) {
      setIsReconnecting(false);
      setConnectionState(streamEnded ? 'failed' : 'connected');
    }
  }, [loadCohosts, loadStream, streamEnded, streamId]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await playerRef.current?.requestFullscreen?.();
        if (mountedRef.current) setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        if (mountedRef.current) setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!streamId) return undefined;

    let cancelled = false;

    const initialize = async () => {
      await loadStream();

      if (cancelled || !mountedRef.current) return;

      await loadCohosts();
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [streamId, loadCohosts, loadStream]);

  useEffect(() => {
    if (!streamData?.host_id) return undefined;

    checkFollowStatus();

    return undefined;
  }, [checkFollowStatus, streamData?.host_id]);

  useEffect(() => {
    if (showShareList) {
      loadFollowers();
    }
  }, [loadFollowers, showShareList]);

  useEffect(() => {
    if (!streamId) return undefined;

    let active = true;

    const channel = supabase.channel(`live-stream-${streamId}`, {
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
          if (!active || !mountedRef.current || !payload?.new) return;

          const updated = payload.new;

          if (!isStreamLive(updated)) {
            handleStreamEnded();
            return;
          }

          setStreamData(prev => prev ? { ...prev, ...updated } : updated);

          if (typeof updated.viewer_count === 'number') {
            const count = Math.max(0, updated.viewer_count);
            viewerCountRef.current = count;
            setViewerCount(count);
          }

          if (typeof updated.likes === 'number') {
            const likes = Math.max(0, updated.likes);

            if (likes > heartCountRef.current) {
              const now = Date.now();

              if (now - lastLikeEventRef.current > 500) {
                lastLikeEventRef.current = now;
                notify({
                  type: 'like',
                  name: 'A viewer',
                  message: 'liked the live video',
                  avatar: null
                });
              }
            }

            heartCountRef.current = likes;
            setHeartCount(likes);
          }

          if (typeof updated.is_camera_on === 'boolean') {
            setIsCameraOff(!updated.is_camera_on);
          } else if (typeof updated.is_video_off === 'boolean') {
            setIsCameraOff(updated.is_video_off);
          }

          if (typeof updated.is_muted === 'boolean') {
            setIsMuted(updated.is_muted);
          }

          const battle = getBattleData(updated);

          if (battle && Object.keys(battle).length) {
            setBattleData(battle);
            setIsBattleMode(Boolean(battle.active));
          }
        }
      )
      .subscribe(status => {
        if (!active || !mountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setConnectionState(prev => prev === 'failed' ? prev : 'connected');
          setIsReconnecting(false);
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('reconnecting');
          setIsReconnecting(true);
        }
      });

    return () => {
      active = false;

      if (streamChannelRef.current === channel) {
        streamChannelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [handleStreamEnded, notify, streamId]);

  useEffect(() => {
    if (!streamId) return undefined;

    let active = true;

    const channel = supabase.channel(`live-cohosts-${streamId}`);

    cohostChannelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!active || !mountedRef.current) return;

          const request = payload?.new || payload?.old;

          if (request?.status === 'approved') {
            notify({
              type: 'cohost',
              name: 'Co-host joined',
              message: 'A new co-host joined the live.',
              avatar: null
            });
          }

          if (
            request?.status === 'removed' ||
            request?.status === 'left' ||
            request?.status === 'rejected'
          ) {
            notify({
              type: 'cohost',
              name: 'Co-host left',
              message: 'A co-host left the live panel.',
              avatar: null
            });
          }

          loadCohosts();
        }
      )
      .subscribe();

    return () => {
      active = false;

      if (cohostChannelRef.current === channel) {
        cohostChannelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [loadCohosts, notify, streamId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mountedRef.current) {
        setIsFullscreen(Boolean(document.fullscreenElement));
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const connection = navigator.connection;

    if (!connection) return undefined;

    const updateNetwork = () => {
      if (!mountedRef.current) return;

      const slow =
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        connection.effectiveType === '3g';

      if (slow) {
        setLowDataMode(true);
      }
    };

    updateNetwork();
    connection.addEventListener?.('change', updateNetwork);

    return () => {
      connection.removeEventListener?.('change', updateNetwork);
    };
  }, []);

  const battleHosts = useMemo(() => {
    if (!isBattleMode || !battleData) return [];

    const participants = Array.isArray(battleData.participants)
      ? battleData.participants
      : [];

    return participants
      .filter(Boolean)
      .map(participant => ({
        id: participant.id,
        username: participant.username || 'Participant',
        avatar: participant.avatar || participant.avatar_url || null,
        score: Math.max(0, Number(participant.score) || 0),
        topGifters: Array.isArray(participant.topGifters)
          ? participant.topGifters.map(gifter => ({
              id: gifter.id,
              username: gifter.username || 'Supporter',
              avatar: gifter.avatar || null,
              amount: Math.max(0, Number(gifter.amount) || 0)
            }))
          : []
      }));
  }, [battleData, isBattleMode]);

  const hasActiveCohosts = activeCohostsList.length > 0;

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={30} className="text-white/60 animate-spin" />
          <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
            Preparing live
          </span>
        </div>
      </div>
    );
  }

  if (streamError || !streamData) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>

          <h1 className="text-white text-lg font-black">
            Stream unavailable
          </h1>

          <p className="text-white/45 text-sm mt-2">
            {streamError || 'This live stream could not be found.'}
          </p>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleRetry}
              className="flex-1 h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} />
              Retry
            </button>

            <button
              onClick={goToLive}
              className="flex-1 h-11 rounded-2xl bg-white text-black text-xs font-black"
            >
              Back to Live
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (streamEnded) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <VideoOff size={28} className="text-white/40" />
          </div>

          <h1 className="text-white text-lg font-black">
            Stream ended
          </h1>

          <p className="text-white/45 text-sm mt-2">
            This live stream is no longer available.
          </p>

          <button
            onClick={goToLive}
            className="mt-6 w-full h-11 rounded-2xl bg-white text-black text-xs font-black"
          >
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden flex flex-col">
      <div ref={playerRef} className="relative w-full h-full z-0 overflow-hidden">
        <DynamicStreamGrid
          streamId={streamId}
          hostVideo={
            <VideoPlayer
              streamId={streamId}
              isHost={false}
              lowDataMode={lowDataMode}
            />
          }
          hostInfo={{
            id: streamData?.host?.id || streamData?.host_id,
            username: streamData?.host?.username || 'Host',
            avatar_url: getAvatar(streamData?.host),
            verified_status: streamData?.host?.verified_status,
            is_verified: streamData?.host?.is_verified,
            online: streamData?.host?.online !== false
          }}
          coHosts={activeCohostsList}
          isHostView={false}
          isBattleMode={isBattleMode}
          lowDataMode={lowDataMode}
        />

        <AnimatePresence>
          {isCameraOff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[45] bg-black/45 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                  {getAvatar(streamData?.host) ? (
                    <img
                      src={getAvatar(streamData.host)}
                      alt={streamData?.host?.username || 'Host'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <VideoOff size={34} className="text-white/35" />
                  )}
                </div>

                <h2 className="text-white font-black text-lg mt-4">
                  {streamData?.host?.username || 'Host'}
                </h2>

                <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-1">
                  Camera is off
                </p>

                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-black/40 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-white/60 text-[9px] font-bold uppercase">
                    Waiting for host
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isReconnecting && (
          <div className="absolute inset-x-0 top-1/2 z-[55] flex justify-center pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/10 flex items-center gap-2">
              <RefreshCw size={14} className="text-yellow-400 animate-spin" />
              <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                Reconnecting
              </span>
            </div>
          </div>
        )}

        {connectionState === 'failed' && (
          <div className="absolute inset-x-0 top-1/2 z-[55] flex justify-center">
            <div className="w-[calc(100%-40px)] max-w-xs rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 p-5 text-center">
              <WifiOff size={24} className="mx-auto text-red-400" />

              <h3 className="text-white font-black text-sm mt-3">
                Connection failed
              </h3>

              <p className="text-white/45 text-[10px] mt-1">
                The live connection was interrupted.
              </p>

              <button
                onClick={handleRetry}
                className="mt-4 w-full h-10 rounded-2xl bg-white text-black text-[10px] font-black uppercase"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-40 pointer-events-none">
        <FloatingHearts
          count={heartCount}
          streamId={streamId}
          lowDataMode={lowDataMode}
        />
      </div>

      <div className="fixed top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/90 via-black/30 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <StreamHeader
                data={streamData}
                isHost={false}
                viewerCount={viewerCount}
                onLeave={goToLive}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <div className="px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center gap-1.5">
                {connectionState === 'connected' ? (
                  <Wifi size={11} className="text-green-400" />
                ) : (
                  <Wifi size={11} className="text-yellow-400" />
                )}

                <span className="text-white text-[8px] font-black uppercase">
                  {streamStatusLabel}
                </span>
              </div>

              <button
                onClick={goToLive}
                aria-label="Leave live stream"
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <div className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center gap-1.5 shrink-0">
              <Users size={12} className="text-white/60" />
              <span className="text-white text-[9px] font-black">
                {formatCount(viewerCount)}
              </span>
            </div>

            {streamData?.category && (
              <div className="px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 text-white/60 text-[9px] font-bold shrink-0">
                {streamData.category}
              </div>
            )}

            {lowDataMode && (
              <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-[9px] font-black shrink-0">
                DATA SAVER
              </div>
            )}

            {hasActiveCohosts && (
              <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[9px] font-black shrink-0">
                {activeCohostsList.length} CO-HOST{activeCohostsList.length === 1 ? '' : 'S'}
              </div>
            )}
          </div>

          <div className="pointer-events-auto">
            <LiveStreamGoalBar
              streamId={streamId}
              isHost={false}
            />
          </div>

          {isBattleMode && battleHosts.length >= 2 && (
            <div className="w-full max-w-lg mx-auto pointer-events-auto">
              <MultiHostPKBattleBar
                hosts={battleHosts}
                duration={Math.max(1, Number(battleData?.duration) || 180)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-28 left-4 z-50 pointer-events-none">
        <AnimatePresence>
          {eventNotification && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl"
            >
              <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                {eventNotification.avatar ? (
                  <img
                    src={eventNotification.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <MessageCircle size={13} className="text-white/50" />
                )}
              </div>

              <div>
                <div className="text-white text-[9px] font-black">
                  {eventNotification.name}
                </div>

                <div className="text-white/55 text-[8px]">
                  {eventNotification.message}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-50 flex items-end justify-between pointer-events-none bg-gradient-to-t from-black/80 via-black/20 to-transparent">
        {showChat ? (
          <div className="flex-1 max-w-[340px] h-[340px] pointer-events-auto overflow-hidden hide-scrollbar">
            <LiveChat
              streamId={streamId}
              hideMessages={false}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowChat(true)}
            aria-label="Show chat"
            className="pointer-events-auto w-11 h-11 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
          >
            <MessageCircle size={19} />
          </button>
        )}

        <div className="flex items-center gap-2 pl-3 pb-2 pointer-events-auto">
          <button
            onClick={() => setShowChat(prev => !prev)}
            aria-label={showChat ? 'Hide chat' : 'Show chat'}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
              <MessageCircle size={18} />
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              Chat
            </span>
          </button>

          <button
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
              <Maximize size={18} />
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              Full
            </span>
          </button>

          <button
            onClick={() => setLowDataMode(prev => !prev)}
            aria-label="Toggle data saver"
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center ${lowDataMode ? 'bg-green-500/20 border-green-400/30 text-green-300' : 'bg-black/50 border-white/10 text-white'}`}>
              <Wifi size={18} />
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              Data
            </span>
          </button>

          <button
            onClick={() => setIsMuted(prev => !prev)}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              {isMuted ? 'Muted' : 'Sound'}
            </span>
          </button>

          <button
            onClick={handleJoinGuest}
            aria-label="Join as guest"
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
              <Users size={19} />
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              Guest
            </span>
          </button>

          <button
            onClick={handleLike}
            aria-label="Like live stream"
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-[#fe2c55]">
              <Heart size={21} fill="currentColor" />
            </div>
            <span className="text-[8px] text-white/60 font-bold">
              {formatCount(heartCount)}
            </span>
          </button>

          <button
            onClick={() => setShowGifts(true)}
            aria-label="Open gifts"
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg">
              <GiftIcon size={23} />
            </div>
            <span className="text-[8px] text-white/70 font-bold uppercase">
              Gift
            </span>
          </button>

          <div className="relative flex flex-col items-center gap-1">
            <button
              onClick={() => setShowShareList(prev => !prev)}
              aria-label="Share live stream"
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
            >
              <Share2 size={18} />
            </button>

            <span className="text-[8px] text-white/60 font-bold uppercase">
              Share
            </span>

            <AnimatePresence>
              {showShareList && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.96 }}
                  className="absolute bottom-16 right-0 w-72 max-w-[calc(100vw-32px)] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl z-[60]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white text-[10px] font-black uppercase tracking-widest">
                        Share live
                      </div>
                      <div className="text-white/40 text-[8px] mt-1">
                        Invite people to watch
                      </div>
                    </div>

                    <button
                      onClick={() => setShowShareList(false)}
                      aria-label="Close share list"
                      className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center"
                    >
                      <X size={13} className="text-white/50" />
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      const url = window.location.href;

                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: streamData?.title || 'Live on Made Universe',
                            text: `Watch ${streamData?.host?.username || 'this'} live.`,
                            url
                          });
                        } else {
                          await navigator.clipboard.writeText(url);

                          if (mountedRef.current) {
                            notify({
                              type: 'share',
                              name: 'Link copied',
                              message: 'Live link copied to clipboard.',
                              avatar: null
                            });
                          }
                        }
                      } catch (error) {
                        if (error?.name !== 'AbortError') {
                          console.error('Share failed:', error);
                        }
                      }
                    }}
                    className="w-full h-10 rounded-2xl bg-white text-black text-[10px] font-black uppercase flex items-center justify-center gap-2 mb-3"
                  >
                    <Share2 size={14} />
                    Share live link
                  </button>

                  <div className="max-h-60 overflow-y-auto hide-scrollbar space-y-2">
                    {followersLoading ? (
                      <div className="py-8 flex justify-center">
                        <Loader2 size={18} className="text-white/40 animate-spin" />
                      </div>
                    ) : followers.length === 0 ? (
                      <div className="py-6 text-center">
                        <UserPlus size={20} className="mx-auto text-white/20" />
                        <div className="text-white/40 text-[9px] font-bold uppercase mt-2">
                          No followers available
                        </div>
                      </div>
                    ) : (
                      followers.map(follower => {
                        const sent = sentInvites.includes(follower.id);

                        return (
                          <div
                            key={follower.id}
                            className="flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/5"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                              {follower.avatar_url ? (
                                <img
                                  src={follower.avatar_url}
                                  alt={follower.username || 'Follower'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/30">
                                  <Users size={13} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-white text-[9px] font-bold truncate">
                                {follower.username || 'User'}
                              </div>
                            </div>

                            <button
                              onClick={() => handleSendInvite(follower.id)}
                              disabled={sent}
                              className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${sent ? 'bg-green-500/15 text-green-300' : 'bg-white text-black'}`}
                            >
                              {sent ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  Sent
                                </span>
                              ) : (
                                'Send'
                              )}
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

          <button
            onClick={goToLive}
            aria-label="Leave live stream"
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70">
              <X size={18} />
            </div>
            <span className="text-[8px] text-white/60 font-bold uppercase">
              Leave
            </span>
          </button>
        </div>
      </div>

      <div className="absolute top-24 left-4 z-50 pointer-events-auto">
        <button
          onClick={handleFollow}
          disabled={followLoading}
          className={`px-3.5 py-2 rounded-full backdrop-blur-xl border text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${followed ? 'bg-green-500/15 border-green-400/20 text-green-300' : 'bg-black/50 border-white/10 text-white'}`}
        >
          {followLoading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : followed ? (
            <CheckCircle2 size={11} />
          ) : (
            <UserPlus size={11} />
          )}

          {followed ? 'Following' : 'Follow'}
        </button>
      </div>

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
    </div>
  );
};

export default LivePlayer;
