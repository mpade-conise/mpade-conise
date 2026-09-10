// src/.../LivePlayer.jsx

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
  ShieldAlert,
  UserPlus,
  Check,
  Copy,
  Radio,
  MessageCircle
} from 'lucide-react';

import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';
import LiveStreamGoalBar from '../../../components/live/LiveStreamGoalBar.jsx';
import { MultiHostPKBattleBar } from '../../../components/live/MultiHostPKBattleBar';

const MAX_NOTIFICATIONS = 3;
const NOTIFICATION_TIMEOUT = 3200;
const REDIRECT_DELAY = 2200;

const normalizeGiftKey = value =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const formatCompactNumber = value => {
  const number = Math.max(0, Number(value) || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
};

const getStreamIsLive = stream => {
  if (!stream) return false;
  if (typeof stream.is_live === 'boolean') return stream.is_live;
  const status = String(stream.status || '').toLowerCase();
  return ['live', 'active', 'streaming', 'started', 'ongoing'].includes(status);
};

const getStreamEnded = stream => {
  if (!stream) return true;
  const status = String(stream.status || '').toLowerCase();
  return Boolean(stream.is_live === false) || ['ended', 'offline', 'cancelled', 'canceled', 'finished', 'closed'].includes(status);
};

const getHostCameraOff = stream => {
  if (!stream) return false;
  if (typeof stream.is_camera_on === 'boolean') return stream.is_camera_on === false;
  if (typeof stream.is_video_off === 'boolean') return stream.is_video_off;
  if (typeof stream.has_camera === 'boolean') return stream.has_camera === false;
  return false;
};

const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const mountedRef = useRef(true);
  const streamChannelRef = useRef(null);
  const viewerChannelRef = useRef(null);
  const cohostChannelRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const notificationTimersRef = useRef(new Map());
  const smallGiftTimerRef = useRef(null);
  const likeRequestRef = useRef(false);
  const lastRealtimeLikesRef = useRef(0);
  const lastGiftIdRef = useRef(null);

  const [streamData, setStreamData] = useState(null);
  const [streamState, setStreamState] = useState('loading');
  const [streamError, setStreamError] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [latestGift, setLatestGift] = useState(null);
  const [activeSmallGift, setActiveSmallGift] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [showShareList, setShowShareList] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);

  const [activeCohostsList, setActiveCohostsList] = useState([]);
  const [hasActiveCohosts, setHasActiveCohosts] = useState(false);

  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleData, setBattleData] = useState(null);

  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('good');
  const [playerState, setPlayerState] = useState('connecting');
  const [showPlayerControls, setShowPlayerControls] = useState(true);

  const playerContainerRef = useRef(null);

  const GIFTS_LIST = useMemo(
    () => [
      { id: 'rose', name: 'Rose', price: 1, icon: '🌹', model: '/models/Rose.glb' },
      { id: 'fire', name: 'Campfire', price: 5, icon: '🔥', model: '/models/Campfire.glb' },
      { id: 'weights', name: 'Flex', price: 3, icon: '💪', model: '/models/Dumbell.glb' },
      { id: 'clap', name: 'Clap', price: 2, icon: '👏', model: '/models/Claptrap.glb' },
      { id: 'star', name: 'Star', price: 3, icon: '⭐', model: '/models/Star.glb' },
      { id: 'heart', name: 'Heart', price: 10, icon: '❤️', model: '/models/Heart.glb' },
      { id: 'pizza', name: 'Pizza', price: 30, icon: '🍕', model: '/models/Pizza%3A0.glb' },
      { id: 'burger', name: 'Burger', price: 20, icon: '🍔', model: '/models/Double Cheeseburger.glb' },
      { id: 'diamond', name: 'Diamond', price: 50, icon: '💎', model: '/models/diamond.glb' },
      { id: 'balloon', name: 'Balloon', price: 15, icon: '🎈', model: '/models/Balloons.glb' },
      { id: 'crown', name: 'Crown', price: 100, icon: '👑', model: '/models/Crown.glb' },
      { id: 'guitar', name: 'Guitar', price: 150, icon: '🎸', model: '/models/Guitar.glb' },
      { id: 'car', name: 'Car', price: 300, icon: '🚗', model: '/models/CAR Model.glb' },
      { id: 'drone', name: 'Drone', price: 400, icon: '🚁', model: '/models/Drone.glb' },
      { id: 'dj', name: 'DJ', price: 350, icon: '🎧', model: '/models/DJ gear.glb' },
      { id: 'castle', name: 'Castle', price: 2500, icon: '🏰', model: '/models/Castle Fortress.glb' },
      { id: 'lion', name: 'Lion', price: 5000, icon: '🦁', model: '/models/Lion.glb' },
      { id: 'money', name: 'Money Rain', price: 250, icon: '💸', model: '/models/Money.glb' },
      { id: 'helicopter', name: 'Helicopter', price: 4000, icon: '🚁', model: '/models/Helicopter.glb' },
      { id: 'ship', name: 'Cruise Ship', price: 3000, icon: '🚢', model: '/models/Cruise liner.glb' },
      { id: 'dragon', name: 'Dragon', price: 10000, icon: '🐉', model: '/models/Red Dragon.glb' },
      { id: 'universe', name: 'Universe', price: 15000, icon: '🌌', model: '/models/Solar System.glb' },
      { id: 'space', name: 'Space', price: 12000, icon: '🚀', model: '/models/Space Shuttle.glb' },
      { id: 'world', name: 'World', price: 8000, icon: '🌍', model: '/models/Simple Worlds.glb' },
      { id: 'xwing', name: 'X-Wing', price: 5500, icon: '✈️', model: '/models/T-65 X-Wing Starfighter.glb' },
      { id: 'cow', name: 'Cow', price: 120, icon: '🐄', model: '/models/Cow.glb' },
      { id: 'whale', name: 'Whale', price: 900, icon: '🐋', model: '/models/Whale.glb' },
      { id: 'horse', name: 'Horse', price: 350, icon: '🐎', model: '/models/Horse.glb' },
      { id: 'spider', name: 'Spider', price: 40, icon: '🕷️', model: '/models/Spider.glb' },
      { id: 'wolf', name: 'Wolf', price: 600, icon: '🐺', model: '/models/Wolf.glb' },
      { id: 'shark', name: 'Shark', price: 1200, icon: '🦈', model: '/models/Shark.glb' },
      { id: 'bunny', name: 'Bunny', price: 50, icon: '🐰', model: '/models/Bunny ears.glb' },
      { id: 'stag', name: 'Stag', price: 400, icon: '🦌', model: '/models/Stag.glb' }
    ],
    []
  );

  const giftMap = useMemo(() => {
    const map = {};
    GIFTS_LIST.forEach(gift => {
      map[normalizeGiftKey(gift.id)] = gift;
      map[normalizeGiftKey(gift.name)] = gift;
    });
    return map;
  }, [GIFTS_LIST]);

  const addNotification = useCallback(notification => {
    if (!mountedRef.current) return;

    const id = `${Date.now()}-${Math.random()}`;

    setNotifications(prev => [
      ...prev.slice(-(MAX_NOTIFICATIONS - 1)),
      { ...notification, id }
    ]);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      setNotifications(prev => prev.filter(item => item.id !== id));
      notificationTimersRef.current.delete(id);
    }, NOTIFICATION_TIMEOUT);

    notificationTimersRef.current.set(id, timer);
  }, []);

  const finishStream = useCallback(() => {
    if (!mountedRef.current) return;

    setStreamState('ended');

    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    redirectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) navigate('/live');
    }, REDIRECT_DELAY);
  }, [navigate]);

  const loadCohosts = useCallback(async () => {
    if (!streamId || !mountedRef.current) return;

    const { data: requests, error } = await supabase
      .from('live_guest_requests')
      .select('id,user_id,status,role')
      .eq('stream_id', streamId)
      .eq('status', 'approved');

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load active co-hosts:', error);
      return;
    }

    const rows = requests || [];
    const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];

    if (userIds.length === 0) {
      setActiveCohostsList([]);
      setHasActiveCohosts(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,username,avatar_url,verified_status,is_verified,online')
      .in('id', userIds);

    if (!mountedRef.current) return;

    if (profilesError) {
      console.error('Failed to load co-host profiles:', profilesError);
    }

    const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));

    const cohosts = rows.map((row, index) => {
      const profile = profileMap.get(row.user_id);

      return {
        id: profile?.id || row.user_id || `cohost-${index}`,
        request_id: row.id,
        role: row.role || 'cohost',
        username: profile?.username || 'Co-Host',
        avatar_url: profile?.avatar_url || null,
        verified: Boolean(profile?.verified_status || profile?.is_verified),
        online: profile?.online !== false
      };
    });

    setActiveCohostsList(cohosts);
    setHasActiveCohosts(cohosts.length > 0);
  }, [streamId]);

  const loadStream = useCallback(async () => {
    if (!streamId) {
      setStreamError('No live stream was specified.');
      setStreamState('unavailable');
      return;
    }

    setStreamState('loading');
    setStreamError('');

    const { data, error } = await supabase
      .from('live_streams')
      .select('*, host:host_id(id,username,avatar_url,verified_status,is_verified,online)')
      .eq('id', streamId)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load live stream:', error);
      setStreamError('We could not load this live stream.');
      setStreamState('unavailable');
      return;
    }

    if (!data) {
      setStreamError('This live stream does not exist or is no longer available.');
      setStreamState('unavailable');
      return;
    }

    if (getStreamEnded(data) || !getStreamIsLive(data)) {
      setStreamData(data);
      setIsCameraOff(getHostCameraOff(data));
      setStreamState('ended');
      return;
    }

    setStreamData(data);
    setIsCameraOff(getHostCameraOff(data));
    setHeartCount(Math.max(0, Number(data.likes) || 0));
    heartCountRef.current = Math.max(0, Number(data.likes) || 0);
    lastRealtimeLikesRef.current = heartCountRef.current;
    setViewerCount(Math.max(0, Number(data.viewer_count) || 0));

    const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    const battle = data.battle || data.pk_battle || settings.battle || settings.pk_battle || null;

    setBattleData(battle);
    setIsBattleMode(Boolean(battle?.active || battle?.status === 'active' || data.is_battle));

    setStreamState('live');

    await loadCohosts();
  }, [streamId, loadCohosts]);

  useEffect(() => {
    mountedRef.current = true;
    loadStream();

    return () => {
      mountedRef.current = false;
    };
  }, [loadStream]);

  useEffect(() => {
    if (!streamId) return undefined;

    const channel = supabase
      .channel(`live-stream-state-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        payload => {
          if (!mountedRef.current || !payload?.new) return;

          const updated = payload.new;

          if (getStreamEnded(updated) || !getStreamIsLive(updated)) {
            setStreamData(prev => (prev ? { ...prev, ...updated } : updated));
            setIsCameraOff(true);
            addNotification({
              type: 'system',
              message: 'The live stream has ended.'
            });
            finishStream();
            return;
          }

          setStreamData(prev => (prev ? { ...prev, ...updated } : updated));
          setIsCameraOff(getHostCameraOff(updated));

          if (typeof updated.viewer_count === 'number') {
            setViewerCount(Math.max(0, updated.viewer_count));
          }

          if (typeof updated.likes === 'number') {
            const nextLikes = Math.max(0, updated.likes);

            if (nextLikes > lastRealtimeLikesRef.current) {
              addNotification({
                type: 'like',
                message: 'liked the live',
                name: 'A viewer',
                avatar: null
              });
            }

            setHeartCount(nextLikes);
            heartCountRef.current = nextLikes;
            lastRealtimeLikesRef.current = nextLikes;
          }

          const settings = updated.settings && typeof updated.settings === 'object' ? updated.settings : {};
          const battle = updated.battle || updated.pk_battle || settings.battle || settings.pk_battle || null;

          setBattleData(battle);
          setIsBattleMode(Boolean(battle?.active || battle?.status === 'active' || updated.is_battle));
        }
      )
      .subscribe();

    streamChannelRef.current = channel;

    return () => {
      if (streamChannelRef.current === channel) streamChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [streamId, addNotification, finishStream]);

  useEffect(() => {
    if (!streamId) return undefined;

    let alive = true;

    const channel = supabase
      .channel(`live-cohosts-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!alive || !mountedRef.current) return;

          const status = String(payload?.new?.status || payload?.old?.status || '').toLowerCase();

          if (status === 'approved') {
            addNotification({
              type: 'cohost',
              message: 'joined the live panel',
              name: 'A co-host'
            });
          }

          if (['removed', 'rejected', 'left', 'cancelled', 'canceled'].includes(status)) {
            addNotification({
              type: 'cohost',
              message: 'left the live panel',
              name: 'A co-host'
            });
          }

          loadCohosts();
        }
      )
      .subscribe();

    cohostChannelRef.current = channel;

    loadCohosts();

    return () => {
      alive = false;
      if (cohostChannelRef.current === channel) cohostChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [streamId, loadCohosts, addNotification]);

  const handleGiftRealtime = useCallback(async payload => {
    if (!mountedRef.current || !payload?.new) return;

    const row = payload.new;

    if (row.id && lastGiftIdRef.current === row.id) return;
    lastGiftIdRef.current = row.id || null;

    let username = row.sender_name || row.username || 'Supporter';
    let avatarUrl = row.sender_avatar || row.avatar_url || null;

    if (row.sender_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username,avatar_url')
        .eq('id', row.sender_id)
        .maybeSingle();

      if (profile) {
        username = profile.username || username;
        avatarUrl = profile.avatar_url || avatarUrl;
      }
    }

    const matchedGift = giftMap[normalizeGiftKey(row.gift_id)] || giftMap[normalizeGiftKey(row.gift_name)];

    const giftName = row.gift_name || matchedGift?.name || 'Gift';
    const giftIcon = row.gift_icon || row.icon || matchedGift?.icon || '✨';
    const price = Number(row.price || matchedGift?.price || 0);
    const priceTotal = Number(row.price_total || price || 0);
    const quantity = Math.max(1, Number(row.quantity) || 1);

    const formattedGift = {
      id: row.id,
      stream_id: row.stream_id || streamId,
      sender_id: row.sender_id || null,
      username,
      avatar: avatarUrl,
      sender_name: username,
      sender_avatar: avatarUrl,
      gift_id: row.gift_id || matchedGift?.id || null,
      gift_name: giftName,
      gift_icon: giftIcon,
      icon: giftIcon,
      gift_image: row.gift_image || row.image || null,
      image: row.gift_image || row.image || null,
      gift_sound: row.gift_sound || row.sound || null,
      sound: row.gift_sound || row.sound || null,
      gift_animation: row.gift_animation || row.animation || null,
      animation: row.gift_animation || row.animation || null,
      gift_rarity: row.gift_rarity || row.rarity || null,
      rarity: row.gift_rarity || row.rarity || null,
      quantity,
      price,
      price_total: priceTotal,
      priceTotal,
      giftName,
      giftModel: matchedGift?.model || null,
      created_at: row.created_at || new Date().toISOString()
    };

    if (priceTotal < 50) {
      setActiveSmallGift(formattedGift);

      if (smallGiftTimerRef.current) clearTimeout(smallGiftTimerRef.current);

      smallGiftTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setActiveSmallGift(null);
        smallGiftTimerRef.current = null;
      }, 2600);
    } else {
      setLatestGift(formattedGift);
    }

    addNotification({
      type: 'gift',
      giftName,
      name: username,
      avatar: avatarUrl
    });
  }, [giftMap, streamId, addNotification]);

  useEffect(() => {
    if (!streamId) return undefined;

    const channel = supabase
      .channel(`live-viewer-events-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        handleGiftRealtime
      )
      .subscribe();

    viewerChannelRef.current = channel;

    return () => {
      if (viewerChannelRef.current === channel) viewerChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [streamId, handleGiftRealtime]);

  useEffect(() => {
    if (!showShareList) return undefined;

    let cancelled = false;

    const fetchFollowers = async () => {
      setFollowersLoading(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setFollowersLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('follows')
        .select('follower_id, profiles!follower_id(id,username,avatar_url)')
        .eq('following_id', user.id);

      if (!cancelled) {
        if (error) {
          console.error('Failed to load followers:', error);
          setFollowers([]);
        } else {
          setFollowers((data || []).map(item => item.profiles).filter(Boolean));
        }

        setFollowersLoading(false);
      }
    };

    fetchFollowers();

    return () => {
      cancelled = true;
    };
  }, [showShareList]);

  useEffect(() => {
    let cancelled = false;

    const checkFollowing = async () => {
      if (!streamData?.host_id) return;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || user.id === streamData.host_id || cancelled) return;

      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', streamData.host_id)
        .maybeSingle();

      if (!cancelled) setIsFollowingHost(Boolean(data));
    };

    checkFollowing();

    return () => {
      cancelled = true;
    };
  }, [streamData?.host_id]);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection) {
      setNetworkQuality(navigator.onLine ? 'good' : 'offline');
      return undefined;
    }

    const updateNetwork = () => {
      if (!navigator.onLine) {
        setNetworkQuality('offline');
        return;
      }

      const type = String(connection.effectiveType || '').toLowerCase();

      if (['slow-2g', '2g'].includes(type)) setNetworkQuality('poor');
      else if (type === '3g') setNetworkQuality('fair');
      else setNetworkQuality('good');
    };

    updateNetwork();
    connection.addEventListener?.('change', updateNetwork);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);

    return () => {
      connection.removeEventListener?.('change', updateNetwork);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, []);

  useEffect(() => {
    if (networkQuality === 'poor' && !dataSaver) {
      setDataSaver(true);
    }
  }, [networkQuality, dataSaver]);

  const handleLike = useCallback(async () => {
    if (!streamId || likeRequestRef.current) return;

    const previous = heartCountRef.current;
    const optimistic = previous + 1;

    heartCountRef.current = optimistic;
    setHeartCount(optimistic);
    likeRequestRef.current = true;

    const { error } = await supabase.rpc('increment_likes', {
      stream_id_input: streamId
    });

    likeRequestRef.current = false;

    if (error) {
      console.error('Failed to increment likes:', error);
      heartCountRef.current = previous;
      setHeartCount(previous);
    }
  }, [streamId]);

  const handleFollowHost = useCallback(async () => {
    if (!streamData?.host_id || followLoading) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      addNotification({
        type: 'system',
        message: 'Sign in to follow this host.'
      });
      return;
    }

    if (user.id === streamData.host_id) return;

    setFollowLoading(true);

    if (isFollowingHost) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', streamData.host_id);

      if (!error && mountedRef.current) setIsFollowingHost(false);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: streamData.host_id
        });

      if (!error && mountedRef.current) {
        setIsFollowingHost(true);
        addNotification({
          type: 'system',
          message: `You are now following ${streamData.host?.username || 'the host'}.`
        });
      }
    }

    if (mountedRef.current) setFollowLoading(false);
  }, [streamData, followLoading, isFollowingHost, addNotification]);

  const handleSendInvite = useCallback(async recipientId => {
    if (!streamId || !recipientId || sentInvites.includes(recipientId)) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      addNotification({
        type: 'system',
        message: 'Sign in to invite followers.'
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
      addNotification({
        type: 'system',
        message: 'The invite could not be sent.'
      });
      return;
    }

    if (mountedRef.current) {
      setSentInvites(prev => (prev.includes(recipientId) ? prev : [...prev, recipientId]));
      addNotification({
        type: 'system',
        message: 'Invite sent.'
      });
    }
  }, [streamId, sentInvites, addNotification]);

  const handleCopyShareLink = useCallback(async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      addNotification({
        type: 'system',
        message: 'Live link copied.'
      });

      setTimeout(() => {
        if (mountedRef.current) setShareCopied(false);
      }, 1800);
    } catch (error) {
      console.error('Failed to copy live link:', error);
      addNotification({
        type: 'system',
        message: 'Copying the live link failed.'
      });
    }
  }, [addNotification]);

  const handleNativeShare = useCallback(async () => {
    const url = window.location.href;
    const title = streamData?.title || 'Live on Made Universe';

    if (!navigator.share) {
      await handleCopyShareLink();
      return;
    }

    try {
      await navigator.share({
        title,
        text: `Watch ${streamData?.host?.username || 'this host'} live on Made Universe.`,
        url
      });

      if (streamId) {
        await supabase
          .from('live_streams')
          .update({ shares_count: Math.max(0, Number(streamData?.shares_count) || 0) + 1 })
          .eq('id', streamId);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Live share failed:', error);
      }
    }
  }, [streamData, streamId, handleCopyShareLink]);

  const handleFullscreen = useCallback(async () => {
    const element = playerContainerRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await element.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen failed:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mountedRef.current) setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleReconnect = useCallback(() => {
    setPlayerState('connecting');
    setStreamState('connecting');

    setTimeout(() => {
      if (!mountedRef.current) return;

      setStreamState(prev => (prev === 'connecting' ? 'live' : prev));
      setPlayerState('connected');
      loadStream();
      loadCohosts();
    }, 700);
  }, [loadStream, loadCohosts]);

  const handleJoinGuest = useCallback(() => {
    if (!streamId || !getStreamIsLive(streamData)) return;
    navigate(`/live/watch/${streamId}/join-guest`);
  }, [streamId, streamData, navigate]);

  const handleLeave = useCallback(() => {
    navigate('/live');
  }, [navigate]);

  useEffect(() => {
    if (streamState === 'live') {
      setPlayerState('connected');
      return;
    }

    if (streamState === 'connecting') {
      setPlayerState('connecting');
      return;
    }

    if (streamState === 'ended' || streamState === 'unavailable') {
      setPlayerState('failed');
    }
  }, [streamState]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (smallGiftTimerRef.current) clearTimeout(smallGiftTimerRef.current);

      notificationTimersRef.current.forEach(timer => clearTimeout(timer));
      notificationTimersRef.current.clear();

      if (streamChannelRef.current) {
        supabase.removeChannel(streamChannelRef.current);
        streamChannelRef.current = null;
      }

      if (viewerChannelRef.current) {
        supabase.removeChannel(viewerChannelRef.current);
        viewerChannelRef.current = null;
      }

      if (cohostChannelRef.current) {
        supabase.removeChannel(cohostChannelRef.current);
        cohostChannelRef.current = null;
      }
    };
  }, []);

  const host = streamData?.host || {};
  const hostName = host.username || 'Host';
  const hostAvatar = host.avatar_url || null;
  const hostVerified = Boolean(host.verified_status || host.is_verified);

  const battleHosts = useMemo(() => {
    if (!isBattleMode || !battleData) return [];

    const participants = Array.isArray(battleData.participants)
      ? battleData.participants
      : Array.isArray(battleData.hosts)
        ? battleData.hosts
        : [];

    if (participants.length > 0) {
      return participants.map((participant, index) => ({
        id: participant.id || participant.user_id || `participant-${index}`,
        username: participant.username || (index === 0 ? hostName : 'Co-Host'),
        avatar: participant.avatar || participant.avatar_url || null,
        score: Math.max(0, Number(participant.score || participant.points || participant.coins || 0)),
        topGifters: Array.isArray(participant.topGifters)
          ? participant.topGifters
          : Array.isArray(participant.top_gifters)
            ? participant.top_gifters
            : []
      }));
    }

    const hostScore = Number(battleData.host_score || battleData.hostScore || 0);

    const fallbackParticipants = [
      {
        id: streamData?.host_id || 'host',
        username: hostName,
        avatar: hostAvatar,
        score: Math.max(0, hostScore),
        topGifters: Array.isArray(battleData.host_top_gifters) ? battleData.host_top_gifters : []
      }
    ];

    activeCohostsList.forEach((cohost, index) => {
      const score = Number(
        battleData?.cohost_scores?.[cohost.id] ||
        battleData?.scores?.[cohost.id] ||
        0
      );

      fallbackParticipants.push({
        id: cohost.id || `cohost-${index}`,
        username: cohost.username || 'Co-Host',
        avatar: cohost.avatar_url || null,
        score: Math.max(0, score),
        topGifters: battleData?.top_gifters?.[cohost.id] || []
      });
    });

    return fallbackParticipants;
  }, [isBattleMode, battleData, activeCohostsList, hostName, hostAvatar, streamData?.host_id]);

  if (streamState === 'loading' || !streamData) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Loader2 size={25} className="text-white/60 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white text-sm font-bold">Preparing live stream</p>
            <p className="text-white/40 text-[10px] mt-1">Connecting to the room...</p>
          </div>
        </div>
      </div>
    );
  }

  if (streamState === 'unavailable') {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <WifiOff size={28} className="text-red-400" />
          </div>
          <h2 className="text-white text-lg font-black">Live unavailable</h2>
          <p className="text-white/50 text-xs mt-2 leading-relaxed">
            {streamError || 'This live stream could not be found.'}
          </p>
          <button
            onClick={() => navigate('/live')}
            className="mt-5 w-full h-11 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider"
          >
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  if (streamState === 'ended') {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Radio size={27} className="text-white/50" />
          </div>
          <h2 className="text-white text-lg font-black">Live ended</h2>
          <p className="text-white/45 text-xs mt-2">
            {hostName}'s live stream has ended.
          </p>
          <button
            onClick={() => navigate('/live')}
            className="mt-5 w-full h-11 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider"
          >
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerContainerRef}
      className={`h-screen w-screen bg-black relative overflow-hidden flex flex-col ${isFullscreen ? 'rounded-none' : ''}`}
    >
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div
        className="relative w-full h-full z-0 overflow-hidden"
        onClick={() => setShowPlayerControls(prev => !prev)}
      >
        <DynamicStreamGrid
          streamId={streamId}
          hostVideo={<VideoPlayer streamId={streamId} isHost={false} />}
          hostInfo={{
            id: streamData?.host_id,
            username: hostName,
            avatar_url: hostAvatar,
            verified: hostVerified
          }}
          coHosts={activeCohostsList}
          isHostView={false}
          isBattleMode={isBattleMode}
          activeSmallGift={activeSmallGift}
        />

        {isCameraOff && (
          <div className="absolute inset-0 z-[45] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center text-center px-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shadow-2xl">
                {hostAvatar ? (
                  <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
                ) : (
                  <VideoOff size={36} className="text-white/35" />
                )}
              </div>

              <h2 className="mt-4 text-white text-lg font-black">{hostName}</h2>

              <div className="mt-2 flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-3 py-1.5">
                <VideoOff size={12} className="text-white/50" />
                <span className="text-[9px] text-white/60 font-black uppercase tracking-wider">
                  Camera off
                </span>
              </div>

              <p className="mt-3 text-white/40 text-[10px]">
                Waiting for the host to turn the camera back on
              </p>
            </div>
          </div>
        )}

        {playerState === 'connecting' && (
          <div className="absolute inset-0 z-[35] flex items-center justify-center pointer-events-none">
            <div className="rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 px-4 py-3 flex items-center gap-3">
              <Loader2 size={16} className="text-white animate-spin" />
              <span className="text-white text-[10px] font-black uppercase tracking-wider">
                Connecting
              </span>
            </div>
          </div>
        )}

        {playerState === 'failed' && streamState === 'live' && (
          <div className="absolute inset-0 z-[46] flex items-center justify-center bg-black/45 backdrop-blur-sm">
            <div className="rounded-3xl bg-black/75 border border-white/10 p-5 text-center max-w-xs">
              <WifiOff size={25} className="mx-auto text-red-400" />
              <h3 className="text-white font-black mt-3">Connection lost</h3>
              <p className="text-white/45 text-xs mt-1">
                The live video connection needs to be restored.
              </p>
              <button
                onClick={handleReconnect}
                className="mt-4 h-10 px-5 rounded-xl bg-white text-black text-[10px] font-black uppercase flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={13} />
                Reconnect
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none z-40">
        <FloatingHearts count={heartCount} streamId={streamId} />

        {latestGift && (
          <div className="absolute inset-0 pointer-events-none">
            <GiftAlertOverlay gift={latestGift} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPlayerControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 z-50 pointer-events-none"
          >
            <div className="p-4 pt-8 bg-gradient-to-b from-black/90 via-black/35 to-transparent">
              <div className="pointer-events-auto">
                <StreamHeader
                  data={streamData}
                  isHost={false}
                  viewerCount={viewerCount}
                  onLeave={handleLeave}
                />
              </div>

              <div className="mt-2 flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5">
                  {networkQuality === 'offline' ? (
                    <WifiOff size={12} className="text-red-400" />
                  ) : networkQuality === 'poor' ? (
                    <Wifi size={12} className="text-red-400" />
                  ) : networkQuality === 'fair' ? (
                    <Wifi size={12} className="text-yellow-400" />
                  ) : (
                    <Wifi size={12} className="text-green-400" />
                  )}

                  <span className="text-white/75 text-[9px] font-bold uppercase">
                    {networkQuality === 'good' ? 'Good connection' : networkQuality === 'fair' ? 'Fair connection' : networkQuality === 'poor' ? 'Poor connection' : 'Offline'}
                  </span>
                </div>

                {dataSaver && (
                  <div className="rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5">
                    <span className="text-white/70 text-[9px] font-black uppercase">
                      Data Saver
                    </span>
                  </div>
                )}

                {hasActiveCohosts && (
                  <div className="rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-1.5">
                    <Users size={11} className="text-white/70" />
                    <span className="text-white/70 text-[9px] font-black">
                      {activeCohostsList.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 pointer-events-auto">
                <LiveStreamGoalBar streamId={streamId} isHost={false} />
              </div>

              {isBattleMode && battleHosts.length > 0 && (
                <div className="w-full max-w-lg mx-auto mt-2 pointer-events-auto">
                  <MultiHostPKBattleBar
                    hosts={battleHosts}
                    duration={Number(battleData?.duration || battleData?.duration_seconds || 180)}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-28 right-4 z-50 pointer-events-none">
        <div className="flex flex-col gap-2 items-end">
          {streamData?.category && (
            <div className="rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5">
              <span className="text-white/65 text-[9px] font-bold">
                #{streamData.category}
              </span>
            </div>
          )}

          <div className="rounded-full bg-black/45 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-1.5">
            <Users size={11} className="text-white/65" />
            <span className="text-white text-[9px] font-black">
              {formatCompactNumber(viewerCount)}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-28 left-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[270px]">
        <AnimatePresence initial={false}>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -15, scale: 0.96 }}
              className="bg-black/55 backdrop-blur-xl border border-white/10 rounded-full pl-1 pr-4 py-1 flex items-center gap-2.5 shadow-2xl"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10 flex-shrink-0">
                {notification.avatar ? (
                  <img src={notification.avatar} alt="" className="w-full h-full object-cover" />
                ) : notification.type === 'gift' ? (
                  <div className="w-full h-full flex items-center justify-center text-sm">
                    {giftMap[normalizeGiftKey(notification.giftName)]?.icon || '✨'}
                  </div>
                ) : notification.type === 'like' ? (
                  <Heart size={13} className="mx-auto mt-2 text-red-400" fill="currentColor" />
                ) : (
                  <Radio size={13} className="mx-auto mt-2 text-white/50" />
                )}
              </div>

              <div className="min-w-0">
                <span className="block text-white text-[10px] font-black truncate">
                  {notification.name || 'Made Universe'}
                </span>
                <span className="block text-white/55 text-[9px] truncate">
                  {notification.type === 'gift'
                    ? `sent ${notification.giftName}`
                    : notification.message}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPlayerControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-4 pb-5 z-50 pointer-events-none"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0 max-w-[350px] pointer-events-auto">
                <div className="mb-2 flex items-center gap-2">
                  {hostAvatar ? (
                    <img
                      src={hostAvatar}
                      alt={hostName}
                      className="w-9 h-9 rounded-full object-cover border border-white/15"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                      <Users size={15} className="text-white/50" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-xs font-black truncate max-w-[150px]">
                        {hostName}
                      </span>
                      {hostVerified && (
                        <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black">
                          ✓
                        </span>
                      )}
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    </div>

                    <p className="text-white/45 text-[9px] truncate max-w-[220px]">
                      {streamData.title || 'Live now'}
                    </p>
                  </div>

                  <button
                    onClick={handleFollowHost}
                    disabled={followLoading}
                    className={`ml-1 h-8 px-3 rounded-full text-[9px] font-black uppercase border transition-all ${
                      isFollowingHost
                        ? 'bg-white/10 border-white/15 text-white/70'
                        : 'bg-[#fe2c55] border-[#fe2c55] text-white'
                    }`}
                  >
                    {isFollowingHost ? (
                      <span className="flex items-center gap-1">
                        <Check size={11} />
                        Following
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus size={11} />
                        Follow
                      </span>
                    )}
                  </button>
                </div>

                {(streamData.description || streamData.tags) && (
                  <div className="mb-2 px-1">
                    {streamData.description && (
                      <p className="text-white/65 text-[10px] leading-relaxed line-clamp-2">
                        {streamData.description}
                      </p>
                    )}

                    {Array.isArray(streamData.tags) && streamData.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 overflow-hidden">
                        {streamData.tags.slice(0, 4).map(tag => (
                          <span
                            key={String(tag)}
                            className="text-white/45 text-[8px] font-bold whitespace-nowrap"
                          >
                            #{String(tag).replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="h-[270px] max-h-[34vh] overflow-hidden hide-scrollbar">
                  <LiveChat
                    streamId={streamId}
                    hideMessages={false}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pointer-events-auto pb-1">
                <button
                  onClick={() => setShowGifts(true)}
                  aria-label="Open gifts"
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg">
                    <GiftIcon size={23} />
                  </div>
                  <span className="text-[8px] text-white/65 font-black uppercase">
                    Gift
                  </span>
                </button>

                <button
                  onClick={handleLike}
                  aria-label="Like live"
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-[#fe2c55]">
                    <Heart size={22} fill="currentColor" />
                  </div>
                  <span className="text-[8px] text-white/65 font-black">
                    {formatCompactNumber(heartCount)}
                  </span>
                </button>

                <button
                  onClick={handleJoinGuest}
                  aria-label="Join as guest"
                  className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white">
                    <Users size={20} />
                  </div>
                  <span className="text-[8px] text-white/65 font-black uppercase">
                    Guest
                  </span>
                </button>

                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  aria-label={isMuted ? 'Unmute player' : 'Mute player'}
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                >
                  {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>

                <button
                  onClick={() => setDataSaver(prev => !prev)}
                  aria-label="Toggle data saver"
                  className={`w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center ${
                    dataSaver
                      ? 'bg-green-500/20 border-green-400/30 text-green-300'
                      : 'bg-black/45 border-white/10 text-white'
                  }`}
                >
                  <Wifi size={18} />
                </button>

                <button
                  onClick={handleReconnect}
                  aria-label="Reconnect stream"
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                >
                  <RefreshCw size={18} />
                </button>

                <button
                  onClick={handleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                >
                  <Maximize size={18} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowShareList(prev => !prev)}
                    aria-label="Share live"
                    className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white"
                  >
                    <Share2 size={19} />
                  </button>

                  <AnimatePresence>
                    {showShareList && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        className="absolute bottom-14 right-0 w-72 rounded-3xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Share2 size={14} className="text-white/60" />
                            <span className="text-white text-[10px] font-black uppercase tracking-wider">
                              Share live
                            </span>
                          </div>

                          <button
                            onClick={() => setShowShareList(false)}
                            aria-label="Close share panel"
                          >
                            <X size={15} className="text-white/40" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <button
                            onClick={handleNativeShare}
                            className="h-10 rounded-xl bg-white text-black text-[9px] font-black uppercase flex items-center justify-center gap-2"
                          >
                            <Share2 size={13} />
                            Share
                          </button>

                          <button
                            onClick={handleCopyShareLink}
                            className="h-10 rounded-xl bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase flex items-center justify-center gap-2"
                          >
                            {shareCopied ? <Check size={13} /> : <Copy size={13} />}
                            {shareCopied ? 'Copied' : 'Copy link'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Users size={12} className="text-white/40" />
                          <span className="text-white/60 text-[9px] font-black uppercase tracking-wider">
                            Invite followers
                          </span>
                        </div>

                        <div className="max-h-56 overflow-y-auto flex flex-col gap-2 hide-scrollbar">
                          {followersLoading ? (
                            <div className="py-6 flex justify-center">
                              <Loader2 size={17} className="text-white/40 animate-spin" />
                            </div>
                          ) : followers.length === 0 ? (
                            <div className="py-5 text-center">
                              <MessageCircle size={20} className="mx-auto text-white/20" />
                              <p className="text-white/35 text-[9px] font-bold mt-2">
                                No followers available
                              </p>
                            </div>
                          ) : (
                            followers.map(follower => {
                              const sent = sentInvites.includes(follower.id);

                              return (
                                <div
                                  key={follower.id}
                                  className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 border border-white/5 p-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {follower.avatar_url ? (
                                      <img
                                        src={follower.avatar_url}
                                        alt={follower.username || 'Follower'}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <Users size={12} className="text-white/40" />
                                      </div>
                                    )}

                                    <span className="text-white text-[10px] font-bold truncate">
                                      {follower.username || 'User'}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleSendInvite(follower.id)}
                                    disabled={sent}
                                    className={`h-7 px-3 rounded-full text-[8px] font-black uppercase ${
                                      sent
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/10'
                                        : 'bg-[#fe2c55] text-white'
                                    }`}
                                  >
                                    {sent ? 'Sent' : 'Invite'}
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
                  onClick={handleLeave}
                  aria-label="Leave live"
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-xl border border-red-500/20 flex items-center justify-center text-red-300"
                >
                  <X size={19} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGifts && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGifts(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
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

      <div className="absolute top-4 left-4 z-[60] pointer-events-auto">
        <button
          onClick={() => {
            addNotification({
              type: 'system',
              message: 'Use the report/block controls available in the live moderation interface.'
            });
          }}
          aria-label="Safety and moderation"
          className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/45"
        >
          <ShieldAlert size={15} />
        </button>
      </div>

      {dataSaver && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="rounded-full bg-black/60 backdrop-blur-xl border border-green-500/20 px-3 py-1.5 flex items-center gap-2">
            <Wifi size={11} className="text-green-400" />
            <span className="text-green-300 text-[8px] font-black uppercase tracking-wider">
              Data Saver Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePlayer;
