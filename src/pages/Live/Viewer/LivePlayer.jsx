// src/.../LivePlayer.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  Gift as GiftIcon,
  Heart,
  Loader2,
  LogOut,
  Maximize,
  MessageCircle,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Share2,
  ShieldAlert,
  Users,
  VideoOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X
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
const STREAM_REDIRECT_DELAY = 2200;

const normalize = value => String(value || '').trim().toLowerCase();
const normalizeGiftKey = value => normalize(value).replace(/[^a-z0-9]+/g, '');

const compactNumber = value => {
  const number = Math.max(0, Number(value) || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(Math.floor(number));
};

const getStreamIsLive = stream => {
  if (!stream) return false;
  if (typeof stream.is_live === 'boolean') return stream.is_live;
  const status = normalize(stream.status);
  return status === 'live' || status === 'streaming' || status === 'active';
};

const getCameraOff = stream => {
  if (!stream) return false;
  if (typeof stream.is_camera_on === 'boolean') return !stream.is_camera_on;
  if (typeof stream.is_video_off === 'boolean') return stream.is_video_off;
  return false;
};

const getConnectionLabel = quality => {
  if (quality === 'excellent') return 'Excellent';
  if (quality === 'good') return 'Good';
  if (quality === 'fair') return 'Fair';
  if (quality === 'poor') return 'Poor';
  return 'Checking';
};

const getConnectionClass = quality => {
  if (quality === 'excellent') return 'text-emerald-400';
  if (quality === 'good') return 'text-green-400';
  if (quality === 'fair') return 'text-yellow-400';
  if (quality === 'poor') return 'text-red-400';
  return 'text-white/60';
};

const getGiftCatalogEntry = (catalog, gift) => {
  const keys = [
    gift?.gift_id,
    gift?.giftId,
    gift?.gift_name,
    gift?.giftName,
    gift?.name
  ].map(normalizeGiftKey).filter(Boolean);

  return catalog.find(item => {
    const itemKeys = [item.id, item.name].map(normalizeGiftKey);
    return keys.some(key => itemKeys.includes(key));
  });
};

const getGiftIcon = (catalog, gift) => {
  const known = getGiftCatalogEntry(catalog, gift);

  if (known?.icon) return known.icon;

  const supplied = gift?.gift_icon || gift?.icon;

  if (supplied && supplied !== '🎁') return supplied;

  return '✨';
};

const Notification = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-3 py-2.5 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
        {notification.avatar ? (
          <img src={notification.avatar} alt="" className="h-full w-full object-cover" />
        ) : notification.type === 'gift' ? (
          <span className="text-lg">{notification.icon || '✨'}</span>
        ) : notification.type === 'like' ? (
          <Heart size={15} className="text-pink-400" fill="currentColor" />
        ) : (
          <Users size={15} className="text-white/70" />
        )}
      </div>

      <div className="min-w-0">
        <div className="max-w-[180px] truncate text-[10px] font-black text-white">
          {notification.name || 'Viewer'}
        </div>
        <div className="max-w-[200px] truncate text-[9px] font-medium text-white/60">
          {notification.message}
        </div>
      </div>

      <button onClick={onClose} aria-label="Dismiss notification" className="ml-auto text-white/30 hover:text-white">
        <X size={13} />
      </button>
    </motion.div>
  );
};

const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const mountedRef = useRef(false);
  const redirectTimerRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const smallGiftTimerRef = useRef(null);
  const followerRequestRef = useRef(0);
  const senderCacheRef = useRef(new Map());
  const lastLikeRealtimeRef = useRef(0);
  const lastGiftIdsRef = useRef(new Set());
  const networkListenerRef = useRef(null);

  const streamChannelRef = useRef(null);
  const viewerChannelRef = useRef(null);
  const cohostChannelRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState('');
  const [streamEnded, setStreamEnded] = useState(false);
  const [streamData, setStreamData] = useState(null);

  const [showGifts, setShowGifts] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showShareList, setShowShareList] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const [heartCount, setHeartCount] = useState(0);
  const heartCountRef = useRef(0);

  const [viewerCount, setViewerCount] = useState(0);
  const [latestGift, setLatestGift] = useState(null);
  const [activeSmallGift, setActiveSmallGift] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [activeCohostsList, setActiveCohostsList] = useState([]);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleData, setBattleData] = useState(null);

  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersError, setFollowersError] = useState('');
  const [sentInvites, setSentInvites] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [networkQuality, setNetworkQuality] = useState('checking');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [dataSaver, setDataSaver] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const GIFTS_LIST = useMemo(
    () => [
      { id: 'rose', name: 'Rose', price: 1, icon: '🌹', big: false },
      { id: 'fire', name: 'Campfire', price: 5, icon: '🔥', big: false },
      { id: 'weights', name: 'Flex', price: 3, icon: '💪', big: false },
      { id: 'clap', name: 'Clap', price: 2, icon: '👏', big: false },
      { id: 'star', name: 'Star', price: 3, icon: '⭐', big: false },
      { id: 'heart', name: 'Heart', price: 10, icon: '❤️', big: false },
      { id: 'pizza', name: 'Pizza', price: 30, icon: '🍕', big: false },
      { id: 'burger', name: 'Burger', price: 20, icon: '🍔', big: false },
      { id: 'diamond', name: 'Diamond', price: 50, icon: '💎', big: false },
      { id: 'balloon', name: 'Balloon', price: 15, icon: '🎈', big: false },
      { id: 'crown', name: 'Crown', price: 100, icon: '👑', big: false },
      { id: 'guitar', name: 'Guitar', price: 150, icon: '🎸', big: false },
      { id: 'car', name: 'Car', price: 300, icon: '🚗', big: false },
      { id: 'drone', name: 'Drone', price: 400, icon: '🚁', big: false },
      { id: 'dj', name: 'DJ', price: 350, icon: '🎧', big: false },
      { id: 'castle', name: 'Castle', price: 2500, icon: '🏰', big: true },
      { id: 'lion', name: 'Lion', price: 5000, icon: '🦁', big: true },
      { id: 'money', name: 'Money Rain', price: 250, icon: '💰', big: false },
      { id: 'helicopter', name: 'Helicopter', price: 4000, icon: '🚁', big: true },
      { id: 'ship', name: 'Cruise Ship', price: 3000, icon: '🚢', big: true },
      { id: 'dragon', name: 'Dragon', price: 10000, icon: '🐉', big: true },
      { id: 'universe', name: 'Universe', price: 15000, icon: '🌌', big: true },
      { id: 'space', name: 'Space', price: 12000, icon: '🚀', big: true },
      { id: 'world', name: 'World', price: 8000, icon: '🌍', big: true },
      { id: 'xwing', name: 'X-Wing', price: 5500, icon: '✈️', big: true },
      { id: 'cow', name: 'Cow', price: 120, icon: '🐄', big: false },
      { id: 'whale', name: 'Whale', price: 900, icon: '🐋', big: false },
      { id: 'horse', name: 'Horse', price: 350, icon: '🐎', big: false },
      { id: 'spider', name: 'Spider', price: 40, icon: '🕷️', big: false },
      { id: 'wolf', name: 'Wolf', price: 600, icon: '🐺', big: false },
      { id: 'shark', name: 'Shark', price: 1200, icon: '🦈', big: false },
      { id: 'bunny', name: 'Bunny', price: 50, icon: '🐰', big: false },
      { id: 'stag', name: 'Stag', price: 400, icon: '🦌', big: false }
    ],
    []
  );

  const addNotification = useCallback(notification => {
    if (!mountedRef.current || !notification) return;

    setNotifications(prev => [
      ...prev.slice(-(MAX_NOTIFICATIONS - 1)),
      { id: `${Date.now()}-${Math.random()}`, ...notification }
    ]);
  }, []);

  const removeNotification = useCallback(id => {
    setNotifications(prev => prev.filter(item => item.id !== id));
  }, []);

  const navigateToEnded = useCallback(
    reason => {
      if (!mountedRef.current || streamEnded) return;

      setStreamEnded(true);
      setStreamError(reason || 'This live stream has ended.');

      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

      redirectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          navigate('/live/ended', {
            replace: true,
            state: {
              streamId,
              title: streamData?.title || ''
            }
          });
        }
      }, STREAM_REDIRECT_DELAY);
    },
    [navigate, streamEnded, streamData, streamId]
  );

  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!mountedRef.current) return null;

    setCurrentUser(user || null);
    return user || null;
  }, []);

  const loadStream = useCallback(async () => {
    if (!streamId) {
      setStreamError('No live stream was specified.');
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

    if (error || !data) {
      setStreamData(null);
      setStreamError('This live stream is unavailable or no longer exists.');
      setLoading(false);
      return;
    }

    if (!getStreamIsLive(data)) {
      setStreamData(data);
      setLoading(false);
      navigateToEnded('This live stream has ended.');
      return;
    }

    setStreamData(data);

    const likes = Math.max(0, Number(data.likes) || 0);
    const viewers = Math.max(0, Number(data.viewer_count) || 0);

    heartCountRef.current = likes;
    setHeartCount(likes);
    setViewerCount(viewers);

    const settings = data.settings || {};
    const battle = settings.battle || data.battle || null;
    const battleActive = Boolean(
      data.battle_active ||
      settings.battle_active ||
      battle?.active ||
      data.battle_status === 'active'
    );

    setIsBattleMode(battleActive);
    setBattleData(battleActive ? battle : null);
    setLoading(false);
  }, [navigateToEnded, streamId]);

  const checkFollowing = useCallback(
    async user => {
      if (!user?.id || !streamData?.host_id || user.id === streamData.host_id) {
        setIsFollowingHost(false);
        return;
      }

      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', streamData.host_id)
        .maybeSingle();

      if (mountedRef.current) setIsFollowingHost(Boolean(data));
    },
    [streamData?.host_id]
  );

  useEffect(() => {
    if (!currentUser || !streamData) return;
    checkFollowing(currentUser);
  }, [checkFollowing, currentUser, streamData]);

  const handleFollowHost = useCallback(async () => {
    if (!streamData?.host_id || followLoading) return;

    if (!currentUser) {
      addNotification({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in to follow this host.'
      });
      return;
    }

    if (currentUser.id === streamData.host_id) return;

    setFollowLoading(true);

    if (isFollowingHost) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', streamData.host_id);

      if (!error && mountedRef.current) {
        setIsFollowingHost(false);
        addNotification({
          type: 'follow',
          name: 'Following',
          message: 'You unfollowed the host.'
        });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: streamData.host_id
        });

      if (!error && mountedRef.current) {
        setIsFollowingHost(true);
        addNotification({
          type: 'follow',
          name: 'Following',
          message: 'You are now following the host.'
        });
      }
    }

    if (mountedRef.current) setFollowLoading(false);
  }, [
    addNotification,
    currentUser,
    followLoading,
    isFollowingHost,
    streamData?.host_id
  ]);

  const loadCohosts = useCallback(async () => {
    if (!streamId) return;

    const { data: requests, error } = await supabase
      .from('live_guest_requests')
      .select('id, user_id, status, role, mode')
      .eq('stream_id', streamId)
      .eq('status', 'approved');

    if (!mountedRef.current) return;

    if (error) {
      console.error('Failed to load active co-hosts:', error);
      return;
    }

    const rows = requests || [];
    const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];

    let profiles = [];

    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, verified_status, is_verified, online')
        .in('id', userIds);

      profiles = profileRows || [];
    }

    const profileMap = new Map(profiles.map(profile => [profile.id, profile]));

    const cohosts = rows.map(row => {
      const profile = profileMap.get(row.user_id);

      return {
        id: row.user_id || row.id,
        request_id: row.id,
        username: profile?.username || 'Co-Host',
        avatar_url: profile?.avatar_url || null,
        verified_status: profile?.verified_status,
        is_verified: profile?.is_verified,
        online: profile?.online,
        role: row.role || 'cohost',
        mode: row.mode || 'video',
        camera_off: row.mode === 'audio'
      };
    });

    setActiveCohostsList(cohosts);
  }, [streamId]);

  useEffect(() => {
    if (!streamId) return undefined;

    mountedRef.current = true;

    loadCurrentUser();
    loadStream();
    loadCohosts();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCohosts, loadCurrentUser, loadStream, streamId]);

  useEffect(() => {
    if (!streamId) return undefined;

    let active = true;

    const channel = supabase.channel(`live-stream-${streamId}`, {
      config: {
        realtime: {
          params: {
            eventsPerSecond: 20
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

          setStreamData(previous => ({
            ...(previous || {}),
            ...updated,
            host: previous?.host
          }));

          if (typeof updated.viewer_count === 'number') {
            setViewerCount(Math.max(0, updated.viewer_count));
          }

          if (typeof updated.likes === 'number') {
            const realtimeLikes = Math.max(0, Number(updated.likes));

            if (realtimeLikes !== lastLikeRealtimeRef.current) {
              lastLikeRealtimeRef.current = realtimeLikes;
              heartCountRef.current = realtimeLikes;
              setHeartCount(realtimeLikes);
            }
          }

          setStreamData(previous => {
            const host = previous?.host || streamData?.host;

            return {
              ...(previous || {}),
              ...updated,
              host
            };
          });

          if (!getStreamIsLive(updated)) {
            navigateToEnded('The host has ended this live stream.');
            return;
          }

          setIsCameraOff(getCameraOff(updated));

          const settings = updated.settings || {};
          const battle = settings.battle || updated.battle || null;
          const battleActive = Boolean(
            updated.battle_active ||
            settings.battle_active ||
            battle?.active ||
            updated.battle_status === 'active'
          );

          setIsBattleMode(battleActive);
          setBattleData(battleActive ? battle : null);
        }
      )
      .subscribe();

    return () => {
      active = false;

      if (streamChannelRef.current === channel) {
        streamChannelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [navigateToEnded, streamData?.host, streamId]);

  const isCameraOff = getCameraOff(streamData);

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

          loadCohosts();

          const row = payload?.new || payload?.old;
          const status = normalize(row?.status);

          if (payload?.eventType === 'INSERT' && status === 'approved') {
            addNotification({
              type: 'cohost',
              name: 'Co-host',
              message: 'A co-host joined the panel.'
            });
          }

          if (
            payload?.eventType === 'UPDATE' &&
            ['left', 'removed', 'rejected', 'cancelled'].includes(status)
          ) {
            addNotification({
              type: 'cohost',
              name: 'Co-host',
              message: 'A co-host left the panel.'
            });
          }
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
  }, [addNotification, loadCohosts, streamId]);

  const fetchSenderProfile = useCallback(async senderId => {
    if (!senderId) {
      return {
        username: 'Supporter',
        avatar_url: null
      };
    }

    if (senderCacheRef.current.has(senderId)) {
      return senderCacheRef.current.get(senderId);
    }

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', senderId)
      .maybeSingle();

    const profile = {
      username: data?.username || 'Supporter',
      avatar_url: data?.avatar_url || null
    };

    senderCacheRef.current.set(senderId, profile);
    return profile;
  }, []);

  const normalizeIncomingGift = useCallback(
    async giftRow => {
      const sender = await fetchSenderProfile(giftRow?.sender_id);

      const matchedGift = getGiftCatalogEntry(GIFTS_LIST, giftRow);

      const quantity = Math.max(1, Number(giftRow?.quantity) || 1);
      const price = Number(giftRow?.price) || Number(matchedGift?.price) || 0;
      const priceTotal =
        Number(giftRow?.price_total) ||
        price * quantity;

      const giftIcon = getGiftIcon(GIFTS_LIST, giftRow);

      return {
        id: giftRow?.id || `${Date.now()}-${giftRow?.sender_id || 'gift'}`,
        stream_id: giftRow?.stream_id || streamId,
        sender_id: giftRow?.sender_id || null,

        gift_id: giftRow?.gift_id || giftRow?.giftId || matchedGift?.id || null,
        gift_name:
          giftRow?.gift_name ||
          giftRow?.giftName ||
          matchedGift?.name ||
          'Gift',

        gift_icon: giftRow?.gift_icon || giftRow?.icon || giftIcon,
        icon: giftRow?.icon || giftRow?.gift_icon || giftIcon,

        gift_image: giftRow?.gift_image || giftRow?.image || null,
        image: giftRow?.image || giftRow?.gift_image || null,

        gift_sound: giftRow?.gift_sound || giftRow?.sound || null,
        sound: giftRow?.sound || giftRow?.gift_sound || null,

        gift_animation:
          giftRow?.gift_animation ||
          giftRow?.animation ||
          null,
        animation:
          giftRow?.animation ||
          giftRow?.gift_animation ||
          null,

        gift_rarity:
          giftRow?.gift_rarity ||
          giftRow?.rarity ||
          matchedGift?.rarity ||
          null,
        rarity:
          giftRow?.rarity ||
          giftRow?.gift_rarity ||
          matchedGift?.rarity ||
          null,

        quantity,
        price,
        price_total: priceTotal,

        username: sender.username,
        avatar: sender.avatar_url,
        avatar_url: sender.avatar_url,

        giftName:
          giftRow?.gift_name ||
          giftRow?.giftName ||
          matchedGift?.name ||
          'Gift',

        giftIcon,

        created_at:
          giftRow?.created_at ||
          new Date().toISOString(),

        big:
          Boolean(giftRow?.big) ||
          Boolean(matchedGift?.big) ||
          priceTotal >= 2500
      };
    },
    [GIFTS_LIST, fetchSenderProfile, streamId]
  );

  useEffect(() => {
    if (!streamId) return undefined;

    let active = true;

    const channel = supabase.channel(`live-events-${streamId}`);

    viewerChannelRef.current = channel;

    const handleGift = async payload => {
      if (!active || !mountedRef.current || !payload?.new) return;

      const giftRow = payload.new;

      if (giftRow.id && lastGiftIdsRef.current.has(giftRow.id)) return;

      if (giftRow.id) {
        lastGiftIdsRef.current.add(giftRow.id);

        if (lastGiftIdsRef.current.size > 200) {
          const first = lastGiftIdsRef.current.values().next().value;
          lastGiftIdsRef.current.delete(first);
        }
      }

      const formattedGift = await normalizeIncomingGift(giftRow);

      if (!active || !mountedRef.current) return;

      const total = Number(formattedGift.price_total) || 0;

      if (total < 50) {
        setActiveSmallGift(formattedGift);

        if (smallGiftTimerRef.current) {
          clearTimeout(smallGiftTimerRef.current);
        }

        smallGiftTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setActiveSmallGift(null);
          smallGiftTimerRef.current = null;
        }, dataSaver ? 1500 : 3000);
      } else {
        setLatestGift(formattedGift);

        addNotification({
          type: 'gift',
          name: formattedGift.username,
          avatar: formattedGift.avatar,
          icon: formattedGift.giftIcon,
          giftName: formattedGift.giftName,
          message: `sent ${formattedGift.giftName}${formattedGift.quantity > 1 ? ` ×${formattedGift.quantity}` : ''}`
        });
      }

      if (total >= 50) {
        setTimeout(() => {
          if (!mountedRef.current) return;

          setLatestGift(previous => {
            if (previous?.id === formattedGift.id) return previous;
            return previous;
          });
        }, 0);
      }
    };

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        handleGift
      )
      .subscribe();

    return () => {
      active = false;

      if (smallGiftTimerRef.current) {
        clearTimeout(smallGiftTimerRef.current);
        smallGiftTimerRef.current = null;
      }

      if (viewerChannelRef.current === channel) {
        viewerChannelRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [addNotification, dataSaver, normalizeIncomingGift, streamId]);

  useEffect(() => {
    if (!latestGift) return undefined;

    const timer = setTimeout(() => {
      if (mountedRef.current) setLatestGift(null);
    }, dataSaver ? 3500 : 7500);

    return () => clearTimeout(timer);
  }, [dataSaver, latestGift]);

  useEffect(() => {
    if (!streamId) return undefined;

    const updateNetwork = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      if (!connection) {
        setNetworkQuality('checking');
        return;
      }

      const effectiveType = normalize(connection.effectiveType);

      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        setNetworkQuality('poor');
      } else if (effectiveType === '3g') {
        setNetworkQuality('fair');
      } else if (effectiveType === '4g') {
        setNetworkQuality(connection.rtt > 300 ? 'fair' : 'good');
      } else {
        setNetworkQuality('good');
      }
    };

    updateNetwork();

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection?.addEventListener) {
      connection.addEventListener('change', updateNetwork);
      networkListenerRef.current = connection;
    }

    return () => {
      if (networkListenerRef.current?.removeEventListener) {
        networkListenerRef.current.removeEventListener('change', updateNetwork);
      }

      networkListenerRef.current = null;
    };
  }, [streamId]);

  useEffect(() => {
    if (networkQuality === 'poor' && !dataSaver) {
      setDataSaver(true);
    }
  }, [dataSaver, networkQuality]);

  const handleLike = useCallback(async () => {
    if (!streamId) return;

    if (!currentUser) {
      addNotification({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in to like this live.'
      });
      return;
    }

    const nextCount = Math.max(0, heartCountRef.current + 1);

    heartCountRef.current = nextCount;
    setHeartCount(nextCount);

    const { error } = await supabase.rpc('increment_likes', {
      stream_id_input: streamId
    });

    if (error) {
      console.error('Failed to increment likes:', error);
    }
  }, [addNotification, currentUser, streamId]);

  const handleJoinGuest = useCallback(() => {
    if (!streamId) return;

    if (!currentUser) {
      addNotification({
        type: 'auth',
        name: 'Sign in required',
        message: 'Sign in before requesting to join the panel.'
      });
      return;
    }

    navigate(`/live/watch/${streamId}/join-guest`);
  }, [addNotification, currentUser, navigate, streamId]);

  const loadFollowers = useCallback(async () => {
    if (!currentUser?.id) {
      setFollowers([]);
      return;
    }

    const requestId = ++followerRequestRef.current;

    setFollowersLoading(true);
    setFollowersError('');

    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUser.id)
      .limit(500);

    if (!mountedRef.current || requestId !== followerRequestRef.current) return;

    if (error) {
      setFollowersError('Unable to load followers.');
      setFollowersLoading(false);
      return;
    }

    const ids = [...new Set((data || []).map(row => row.follower_id).filter(Boolean))];

    if (!ids.length) {
      setFollowers([]);
      setFollowersLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', ids);

    if (!mountedRef.current || requestId !== followerRequestRef.current) return;

    if (profileError) {
      setFollowersError('Unable to load follower profiles.');
      setFollowersLoading(false);
      return;
    }

    setFollowers(profiles || []);
    setFollowersLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (showShareList) loadFollowers();
  }, [loadFollowers, showShareList]);

  const handleSendInvite = useCallback(
    async recipientId => {
      if (!streamId || !recipientId || !currentUser) return;
      if (sentInvites.includes(recipientId)) return;

      const { error } = await supabase
        .from('live_comments')
        .insert({
          stream_id: streamId,
          user_id: currentUser.id,
          content: "I'm watching this live! Join me.",
          type: 'invite'
        });

      if (!error && mountedRef.current) {
        setSentInvites(prev =>
          prev.includes(recipientId)
            ? prev
            : [...prev, recipientId]
        );

        addNotification({
          type: 'invite',
          name: 'Invite sent',
          message: 'Your live invitation was sent.'
        });
      }
    },
    [addNotification, currentUser, sentInvites, streamId]
  );

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    setIsSharing(true);

    try {
      if (navigator.share) {
        await navigator.share({
          title: streamData?.title || 'Live on Made Universe',
          text: `Watch ${streamData?.host?.username || 'this host'} live on Made Universe.`,
          url
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);

        addNotification({
          type: 'share',
          name: 'Link copied',
          message: 'Live link copied to your clipboard.'
        });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    } finally {
      if (mountedRef.current) setIsSharing(false);
    }
  }, [addNotification, streamData?.host?.username, streamData?.title]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);

      addNotification({
        type: 'share',
        name: 'Link copied',
        message: 'Live link copied to your clipboard.'
      });
    } catch (error) {
      console.error('Failed to copy live link:', error);
    }
  }, [addNotification]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen failed:', error);
    }
  }, []);

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

  const handleRetry = useCallback(async () => {
    if (retrying || !streamId) return;

    setRetrying(true);
    setConnectionFailed(false);
    setIsReconnecting(true);

    await loadStream();
    await loadCohosts();

    if (mountedRef.current) {
      setIsReconnecting(false);
      setRetrying(false);
    }
  }, [loadCohosts, loadStream, retrying, streamId]);

  const hostInfo = useMemo(
    () => ({
      id: streamData?.host_id,
      username: streamData?.host?.username || 'Host',
      avatar_url: streamData?.host?.avatar_url || null,
      verified_status: streamData?.host?.verified_status,
      is_verified: streamData?.host?.is_verified,
      online: streamData?.host?.online
    }),
    [streamData]
  );

  const hasActiveCohosts = activeCohostsList.length > 0;

  const battleParticipants = useMemo(() => {
    if (!isBattleMode || !battleData) return [];

    const participants = Array.isArray(battleData.participants)
      ? battleData.participants
      : [];

    return participants.map((participant, index) => ({
      id: participant.id || `participant-${index}`,
      username: participant.username || 'Participant',
      avatar: participant.avatar || participant.avatar_url || null,
      score: Math.max(0, Number(participant.score) || 0),
      topGifters: Array.isArray(participant.topGifters)
        ? participant.topGifters
        : Array.isArray(participant.top_gifters)
          ? participant.top_gifters
          : []
    }));
  }, [battleData, isBattleMode]);

  useEffect(() => {
    if (!streamData) return;

    if (streamData.host_id && streamData.host?.online === false) {
      addNotification({
        type: 'host',
        name: streamData.host?.username || 'Host',
        message: 'The host connection may have been interrupted.'
      });
    }
  }, [addNotification, streamData?.host?.online, streamData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
        notificationTimerRef.current = null;
      }

      if (smallGiftTimerRef.current) {
        clearTimeout(smallGiftTimerRef.current);
        smallGiftTimerRef.current = null;
      }

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

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Loader2 size={25} className="animate-spin text-white/60" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
            Preparing live
          </span>
        </div>
      </div>
    );
  }

  if (!streamData || streamEnded || streamError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            {streamEnded ? (
              <VideoOff size={27} className="text-white/50" />
            ) : (
              <AlertTriangle size={27} className="text-yellow-400/80" />
            )}
          </div>

          <h1 className="text-lg font-black text-white">
            {streamEnded ? 'Live stream ended' : 'Live unavailable'}
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/50">
            {streamError || 'This live stream is no longer available.'}
          </p>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => navigate('/live')}
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-white/15"
            >
              Back to Live
            </button>

            {!streamEnded && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-50"
              >
                <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black text-white">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar{display:none}
        .hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <DynamicStreamGrid
          streamId={streamId}
          hostVideo={
            <VideoPlayer
              streamId={streamId}
              isHost={false}
              quality={quality}
              dataSaver={dataSaver}
              muted={isMuted}
              volume={volume}
            />
          }
          hostInfo={hostInfo}
          coHosts={activeCohostsList}
          isHostView={false}
          isBattleMode={isBattleMode}
          activeSmallGift={activeSmallGift}
        />

        <AnimatePresence>
          {isCameraOff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 p-6 backdrop-blur-[3px]"
            >
              <div className="flex max-w-xs flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {hostInfo.avatar_url ? (
                      <img src={hostInfo.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <VideoOff size={32} className="text-white/35" />
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-zinc-800">
                    <VideoOff size={13} className="text-white/60" />
                  </div>
                </div>

                <h2 className="text-base font-black text-white">
                  {hostInfo.username}
                </h2>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/45">
                  Camera is off
                </p>

                <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5">
                  <Loader2 size={11} className="animate-spin text-white/50" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Waiting for host
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/90 via-black/35 to-transparent p-3 pb-12 pt-7">
        <div className="pointer-events-auto">
          <StreamHeader
            data={streamData}
            isHost={false}
            viewerCount={viewerCount}
            onLeave={() => navigate('/live')}
          />
        </div>

        <div className="pointer-events-auto mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
              {hostInfo.avatar_url ? (
                <img src={hostInfo.avatar_url} alt={`${hostInfo.username} avatar`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs">👤</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="max-w-[130px] truncate text-xs font-black text-white">
                  {hostInfo.username}
                </span>

                {(hostInfo.verified_status === 'verified' || hostInfo.is_verified) && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500">
                    <Check size={9} strokeWidth={4} />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wider text-white/45">
                <span className="flex items-center gap-1">
                  <Eye size={9} />
                  {compactNumber(viewerCount)}
                </span>

                {hasActiveCohosts && (
                  <span className="flex items-center gap-1">
                    <Users size={9} />
                    {activeCohostsList.length + 1} live
                  </span>
                )}
              </div>
            </div>
          </div>

          {currentUser?.id !== streamData.host_id && (
            <button
              onClick={handleFollowHost}
              disabled={followLoading}
              className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition ${
                isFollowingHost
                  ? 'border border-white/10 bg-white/10 text-white/70'
                  : 'bg-white text-black'
              }`}
            >
              {followLoading ? '...' : isFollowingHost ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        <div className="pointer-events-auto mt-2 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur-md ${getConnectionClass(networkQuality)}`}>
            {networkQuality === 'poor' ? <WifiOff size={11} /> : <Wifi size={11} />}
            <span className="text-[8px] font-black uppercase tracking-wider">
              {getConnectionLabel(networkQuality)}
            </span>
          </div>

          {dataSaver && (
            <div className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-yellow-300">
              Data Saver
            </div>
          )}

          {isReconnecting && (
            <div className="flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-black/55 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-yellow-300">
              <Loader2 size={10} className="animate-spin" />
              Reconnecting
            </div>
          )}

          {connectionFailed && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-red-300"
            >
              <RefreshCw size={10} className={retrying ? 'animate-spin' : ''} />
              Retry
            </button>
          )}
        </div>

        <div className="pointer-events-auto mt-2">
          <LiveStreamGoalBar streamId={streamId} isHost={false} />
        </div>

        {isBattleMode && battleParticipants.length > 0 && (
          <div className="pointer-events-auto mx-auto mt-1 w-full max-w-lg">
            <MultiHostPKBattleBar
              hosts={battleParticipants}
              duration={Number(battleData?.duration) || Number(battleData?.duration_seconds) || 0}
            />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-40">
        <FloatingHearts count={heartCount} streamId={streamId} />

        <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <AnimatePresence initial={false}>
            {notifications.map(notification => (
              <Notification
                key={notification.id}
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {latestGift && (
          <div className="absolute inset-0 flex items-center justify-center">
            <GiftAlertOverlay gift={latestGift} />
          </div>
        )}

        <AnimatePresence>
          {activeSmallGift && (
            <motion.div
              initial={{ opacity: 0, x: -20, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              className="absolute bottom-40 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 shadow-xl backdrop-blur-xl"
            >
              <span className="text-xl">
                {activeSmallGift.giftIcon || getGiftIcon(GIFTS_LIST, activeSmallGift)}
              </span>

              <div>
                <div className="text-[9px] font-black text-white">
                  {activeSmallGift.username}
                </div>

                <div className="text-[8px] font-bold text-white/55">
                  sent {activeSmallGift.giftName}
                  {activeSmallGift.quantity > 1 ? ` ×${activeSmallGift.quantity}` : ''}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-3 pb-5 pt-24">
        <div className="flex items-end justify-between gap-3">
          <div className={`${showChat ? 'block' : 'hidden'} pointer-events-auto h-[300px] w-full max-w-[350px] overflow-hidden`}>
            <LiveChat
              streamId={streamId}
              hideMessages={false}
            />
          </div>

          <div className="pointer-events-auto ml-auto flex shrink-0 items-end gap-2 pb-1">
            <button
              onClick={() => setShowChat(prev => !prev)}
              aria-label={showChat ? 'Hide chat' : 'Show chat'}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md">
                <MessageCircle size={18} />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                Chat
              </span>
            </button>

            <button
              onClick={handleJoinGuest}
              aria-label="Join as guest"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md">
                <Users size={18} />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                Guest
              </span>
            </button>

            <button
              onClick={handleLike}
              aria-label="Like live stream"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/15 text-pink-400 ring-1 ring-pink-400/20">
                <Heart size={21} fill="currentColor" />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                {compactNumber(heartCount)}
              </span>
            </button>

            <button
              onClick={() => setShowGifts(true)}
              aria-label="Open gifts"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 text-white shadow-lg">
                <GiftIcon size={22} />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                Gift
              </span>
            </button>

            <button
              onClick={handleShare}
              disabled={isSharing}
              aria-label="Share live stream"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md">
                {isSharing ? <Loader2 size={17} className="animate-spin" /> : <Share2 size={18} />}
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                Share
              </span>
            </button>

            <button
              onClick={handleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md">
                <Maximize size={17} />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                Full
              </span>
            </button>

            <button
              onClick={() => setShowMore(prev => !prev)}
              aria-label="More live controls"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md">
                <MoreHorizontal size={19} />
              </span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/55">
                More
              </span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-24 right-3 z-[80] w-72 rounded-3xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Live controls
              </span>

              <button onClick={() => setShowMore(false)} aria-label="Close controls">
                <X size={15} className="text-white/40" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDataSaver(prev => !prev)}
                className={`rounded-2xl border p-3 text-left ${
                  dataSaver
                    ? 'border-yellow-400/20 bg-yellow-400/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <Wifi size={16} className={dataSaver ? 'text-yellow-300' : 'text-white/60'} />
                <div className="mt-2 text-[9px] font-black uppercase text-white">
                  Data Saver
                </div>
                <div className="mt-1 text-[8px] text-white/40">
                  {dataSaver ? 'Enabled' : 'Disabled'}
                </div>
              </button>

              <button
                onClick={() => setIsMuted(prev => !prev)}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left"
              >
                {isMuted ? (
                  <VolumeX size={16} className="text-red-300" />
                ) : (
                  <Volume2 size={16} className="text-white/60" />
                )}
                <div className="mt-2 text-[9px] font-black uppercase text-white">
                  Sound
                </div>
                <div className="mt-1 text-[8px] text-white/40">
                  {isMuted ? 'Muted' : 'On'}
                </div>
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-wider text-white/50">
                  Quality
                </span>
                <span className="text-[8px] font-black uppercase text-white">
                  {quality}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {['auto', '1080p', '720p', '480p', '360p'].map(option => (
                  <button
                    key={option}
                    onClick={() => setQuality(option)}
                    className={`rounded-xl px-1 py-2 text-[7px] font-black uppercase ${
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

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              {networkQuality === 'poor' ? (
                <WifiOff size={15} className="text-red-300" />
              ) : (
                <Wifi size={15} className={getConnectionClass(networkQuality)} />
              )}

              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase text-white">
                  Network
                </div>
                <div className={`text-[8px] font-bold uppercase ${getConnectionClass(networkQuality)}`}>
                  {getConnectionLabel(networkQuality)}
                </div>
              </div>

              <button
                onClick={handleRetry}
                disabled={retrying}
                className="ml-auto rounded-full bg-white/10 p-2 text-white/70"
                aria-label="Reconnect stream"
              >
                <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-3 text-[8px] font-black uppercase text-white/70"
              >
                <Copy size={13} />
                Copy link
              </button>

              <button
                onClick={() => navigate('/live')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-3 text-[8px] font-black uppercase text-white/70"
              >
                <LogOut size={13} />
                Leave
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareList && (
          <div className="fixed inset-0 z-[9000] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareList(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg rounded-t-[30px] border border-white/10 bg-zinc-950 p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-white">Share live</h2>
                  <p className="mt-1 text-[9px] text-white/40">
                    Invite followers or share the live link.
                  </p>
                </div>

                <button
                  onClick={() => setShowShareList(false)}
                  aria-label="Close sharing"
                  className="rounded-full bg-white/5 p-2 text-white/50"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[9px] font-black uppercase text-black"
                >
                  <Share2 size={14} />
                  Share
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[9px] font-black uppercase text-white"
                >
                  <Copy size={14} />
                  Copy link
                </button>
              </div>

              <div className="my-5 h-px bg-white/5" />

              <div className="mb-3 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                  Followers
                </span>

                {followers.length > 0 && (
                  <span className="text-[8px] font-bold text-white/30">
                    {followers.length}
                  </span>
                )}
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1 hide-scrollbar">
                {followersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-white/40" />
                  </div>
                ) : followersError ? (
                  <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4 text-center">
                    <p className="text-[9px] font-bold text-red-300/70">
                      {followersError}
                    </p>
                  </div>
                ) : followers.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-center">
                    <Users size={20} className="mx-auto mb-2 text-white/20" />
                    <p className="text-[9px] font-black uppercase text-white/35">
                      No followers available
                    </p>
                  </div>
                ) : (
                  followers.map(follower => {
                    const sent = sentInvites.includes(follower.id);

                    return (
                      <div
                        key={follower.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-2"
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {follower.avatar_url ? (
                            <img src={follower.avatar_url} alt={`${follower.username || 'Follower'} avatar`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs">
                              👤
                            </div>
                          )}
                        </div>

                        <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-white">
                          {follower.username || 'Follower'}
                        </span>

                        <button
                          onClick={() => handleSendInvite(follower.id)}
                          disabled={sent}
                          className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase ${
                            sent
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : 'bg-white text-black'
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
          </div>
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
