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
MessageCircle,
UserPlus,
UserCheck,
Copy,
Check,
Maximize,
Volume2,
VolumeX
} from 'lucide-react';

import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';
import LiveStreamGoalBar from '../../../components/live/LiveStreamGoalBar.jsx';
import { MultiHostPKBattleBar } from '../../../components/live/MultiHostPKBattleBar';

const STREAM_END_STATUSES = ['ended', 'offline', 'cancelled', 'canceled', 'finished'];

const formatCount = value => {
const count = Math.max(0, Number(value) || 0);
if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}M`;
if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
return String(count);
};

const isStreamLive = stream => {
if (!stream) return false;
if (typeof stream.status === 'string') {
return !STREAM_END_STATUSES.includes(stream.status.toLowerCase());
}
if (typeof stream.is_live === 'boolean') return stream.is_live;
return true;
};

const LivePlayer = () => {
const { streamId } = useParams();
const navigate = useNavigate();

const mountedRef = useRef(true);
const redirectingRef = useRef(false);
const heartCountRef = useRef(0);
const streamChannelRef = useRef(null);
const cohostChannelRef = useRef(null);
const notificationTimerRef = useRef(null);
const reconnectTimerRef = useRef(null);

const [streamData, setStreamData] = useState(null);
const [loading, setLoading] = useState(true);
const [streamError, setStreamError] = useState('');
const [streamEnded, setStreamEnded] = useState(false);

const [showGifts, setShowGifts] = useState(false);
const [showChat, setShowChat] = useState(true);
const [showShareList, setShowShareList] = useState(false);

const [heartCount, setHeartCount] = useState(0);
const [viewerCount, setViewerCount] = useState(0);

const [isCameraOff, setIsCameraOff] = useState(false);
const [hostFollowed, setHostFollowed] = useState(false);
const [followLoading, setFollowLoading] = useState(false);

const [followers, setFollowers] = useState([]);
const [sentInvites, setSentInvites] = useState([]);
const [followersLoading, setFollowersLoading] = useState(false);

const [activeCohostsList, setActiveCohostsList] = useState([]);
const [cohostLoading, setCohostLoading] = useState(true);

const [networkStatus, setNetworkStatus] = useState(
typeof navigator !== 'undefined' && navigator.onLine ? 'connected' : 'offline'
);
const [isReconnecting, setIsReconnecting] = useState(false);
const [playerMuted, setPlayerMuted] = useState(false);

const [eventNotification, setEventNotification] = useState(null);
const [copied, setCopied] = useState(false);

const [currentUserId, setCurrentUserId] = useState(null);

const battleData = useMemo(() => {
const raw = streamData?.battle || streamData?.pk_battle || streamData?.settings?.battle;

```
if (!raw || typeof raw !== 'object') return null;
if (raw.active === false || raw.is_active === false) return null;
if (!Array.isArray(raw.hosts) || raw.hosts.length < 2) return null;

return raw;
```

}, [streamData]);

const isBattleMode = Boolean(battleData);

const showNotification = useCallback(notification => {
if (!mountedRef.current) return;

```
setEventNotification(notification);

if (notificationTimerRef.current) {
  clearTimeout(notificationTimerRef.current);
}

notificationTimerRef.current = setTimeout(() => {
  if (!mountedRef.current) return;
  setEventNotification(null);
  notificationTimerRef.current = null;
}, 3000);
```

}, []);

const goToLive = useCallback(() => {
if (redirectingRef.current) return;

```
redirectingRef.current = true;
navigate('/live');
```

}, [navigate]);

const goToEnded = useCallback(() => {
if (redirectingRef.current) return;

```
redirectingRef.current = true;
setStreamEnded(true);

window.setTimeout(() => {
  if (mountedRef.current) {
    navigate('/live/ended');
  }
}, 1200);
```

}, [navigate]);

const loadFollowers = useCallback(async () => {
if (!mountedRef.current) return;

```
setFollowersLoading(true);

try {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !mountedRef.current) return;

  const { data: followRows, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id);

  if (error || !followRows?.length) {
    if (mountedRef.current) setFollowers([]);
    return;
  }

  const ids = [...new Set(followRows.map(row => row.follower_id).filter(Boolean))];

  if (!ids.length) {
    if (mountedRef.current) setFollowers([]);
    return;
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);

  if (!mountedRef.current) return;

  if (profileError) {
    console.error('Failed to load followers:', profileError);
    setFollowers([]);
    return;
  }

  setFollowers(profiles || []);
} catch (error) {
  console.error('Follower loading error:', error);
  if (mountedRef.current) setFollowers([]);
} finally {
  if (mountedRef.current) setFollowersLoading(false);
}
```

}, []);

const checkFollowStatus = useCallback(async (userId, hostId) => {
if (!userId || !hostId || userId === hostId) return;

```
const { data, error } = await supabase
  .from('follows')
  .select('follower_id')
  .eq('follower_id', userId)
  .eq('following_id', hostId)
  .maybeSingle();

if (!error && mountedRef.current) {
  setHostFollowed(Boolean(data));
}
```

}, []);

const handleFollowHost = useCallback(async () => {
if (!streamData?.host_id || followLoading) return;

```
const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  showNotification({
    type: 'auth',
    name: 'Sign in required',
    message: 'Sign in to follow this host.',
    avatar: null
  });
  return;
}

if (user.id === streamData.host_id) return;

setFollowLoading(true);

try {
  if (hostFollowed) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', streamData.host_id);

    if (error) throw error;

    if (mountedRef.current) setHostFollowed(false);
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: streamData.host_id
      });

    if (error && error.code !== '23505') throw error;

    if (mountedRef.current) setHostFollowed(true);
  }
} catch (error) {
  console.error('Follow action failed:', error);

  showNotification({
    type: 'error',
    name: 'Follow failed',
    message: 'Please try again.',
    avatar: null
  });
} finally {
  if (mountedRef.current) setFollowLoading(false);
}
```

}, [followLoading, hostFollowed, showNotification, streamData?.host_id]);

const handleSendInvite = useCallback(async recipientId => {
if (!streamId || !recipientId || sentInvites.includes(recipientId)) return;

```
const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  showNotification({
    type: 'auth',
    name: 'Sign in required',
    message: 'Sign in to send invitations.',
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
  showNotification({
    type: 'error',
    name: 'Invite failed',
    message: 'Unable to send invitation.',
    avatar: null
  });
  return;
}

if (mountedRef.current) {
  setSentInvites(prev => prev.includes(recipientId) ? prev : [...prev, recipientId]);
}
```

}, [sentInvites, showNotification, streamId]);

const handleShare = useCallback(async () => {
const url = `${window.location.origin}/live/watch/${streamId}`;
const title = streamData?.title || 'Watch this live on Made Universe';

```
try {
  if (navigator.share) {
    await navigator.share({
      title,
      text: title,
      url
    });

    return;
  }

  await navigator.clipboard.writeText(url);

  if (mountedRef.current) {
    setCopied(true);
    window.setTimeout(() => {
      if (mountedRef.current) setCopied(false);
    }, 2000);
  }
} catch (error) {
  if (error?.name !== 'AbortError') {
    console.error('Share failed:', error);
  }
}
```

}, [streamData?.title, streamId]);

const handleCopyLink = useCallback(async () => {
const url = `${window.location.origin}/live/watch/${streamId}`;

```
try {
  await navigator.clipboard.writeText(url);

  if (!mountedRef.current) return;

  setCopied(true);

  window.setTimeout(() => {
    if (mountedRef.current) setCopied(false);
  }, 2000);
} catch (error) {
  console.error('Copy failed:', error);
}
```

}, [streamId]);

const refreshStream = useCallback(async () => {
if (!streamId || !mountedRef.current) return;

```
setIsReconnecting(true);

try {
  const { data, error } = await supabase
    .from('live_streams')
    .select('*, host:host_id(username, avatar_url)')
    .eq('id', streamId)
    .maybeSingle();

  if (!mountedRef.current) return;

  if (error || !data) {
    setStreamError('This live stream is no longer available.');
    setIsReconnecting(false);
    return;
  }

  if (!isStreamLive(data)) {
    setStreamEnded(true);
    setIsReconnecting(false);
    goToEnded();
    return;
  }

  setStreamData(data);
  setIsCameraOff(
    data.is_camera_on === false ||
    data.is_video_off === true
  );

  setViewerCount(Math.max(0, Number(data.viewer_count) || 0));

  const likes = Math.max(0, Number(data.likes) || 0);
  heartCountRef.current = likes;
  setHeartCount(likes);
  setNetworkStatus('connected');
} catch (error) {
  console.error('Stream refresh failed:', error);
  if (mountedRef.current) setNetworkStatus('failed');
} finally {
  if (mountedRef.current) setIsReconnecting(false);
}
```

}, [goToEnded, streamId]);

const loadStream = useCallback(async () => {
if (!streamId) {
setStreamError('Invalid live stream.');
setLoading(false);
return;
}

```
setLoading(true);
setStreamError('');

try {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (mountedRef.current) {
    setCurrentUserId(user?.id || null);
  }

  const { data, error } = await supabase
    .from('live_streams')
    .select('*, host:host_id(username, avatar_url)')
    .eq('id', streamId)
    .maybeSingle();

  if (!mountedRef.current) return;

  if (error || !data) {
    setStreamError('This live stream does not exist or is no longer available.');
    setLoading(false);
    return;
  }

  if (!isStreamLive(data)) {
    setStreamEnded(true);
    setLoading(false);
    goToEnded();
    return;
  }

  setStreamData(data);
  setIsCameraOff(
    data.is_camera_on === false ||
    data.is_video_off === true
  );

  const likes = Math.max(0, Number(data.likes) || 0);
  heartCountRef.current = likes;

  setHeartCount(likes);
  setViewerCount(Math.max(0, Number(data.viewer_count) || 0));

  if (user?.id && data.host_id) {
    await checkFollowStatus(user.id, data.host_id);
  }
} catch (error) {
  console.error('Failed to load live stream:', error);

  if (mountedRef.current) {
    setStreamError('Unable to load this live stream.');
  }
} finally {
  if (mountedRef.current) setLoading(false);
}
```

}, [checkFollowStatus, goToEnded, streamId]);

const loadCohosts = useCallback(async () => {
if (!streamId || !mountedRef.current) return;

```
setCohostLoading(true);

try {
  const { data: requests, error } = await supabase
    .from('live_guest_requests')
    .select('id, user_id, status, role')
    .eq('stream_id', streamId)
    .eq('status', 'approved');

  if (!mountedRef.current) return;

  if (error) {
    console.error('Failed to load active co-hosts:', error);
    setActiveCohostsList([]);
    return;
  }

  const rows = requests || [];
  const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];

  if (!userIds.length) {
    setActiveCohostsList([]);
    return;
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_verified, verified_status, online')
    .in('id', userIds);

  if (!mountedRef.current) return;

  if (profileError) {
    console.error('Failed to load co-host profiles:', profileError);
  }

  const profileMap = new Map(
    (profiles || []).map(profile => [profile.id, profile])
  );

  const cohosts = rows.map(row => {
    const profile = profileMap.get(row.user_id);

    return {
      id: row.user_id,
      requestId: row.id,
      role: row.role || 'cohost',
      username: profile?.username || 'Co-Host',
      avatar_url: profile?.avatar_url || null,
      is_verified: Boolean(
        profile?.is_verified ||
        profile?.verified_status === 'verified'
      ),
      online: profile?.online !== false
    };
  });

  setActiveCohostsList(cohosts);
} catch (error) {
  console.error('Co-host loading error:', error);

  if (mountedRef.current) {
    setActiveCohostsList([]);
  }
} finally {
  if (mountedRef.current) setCohostLoading(false);
}
```

}, [streamId]);

const handleLike = useCallback(async () => {
if (!streamId || !currentUserId) {
showNotification({
type: 'auth',
name: 'Sign in required',
message: 'Sign in to like the live.',
avatar: null
});
return;
}

```
const nextCount = Math.max(0, heartCountRef.current + 1);

heartCountRef.current = nextCount;
setHeartCount(nextCount);

try {
  const { error } = await supabase.rpc('increment_likes', {
    stream_id_input: streamId
  });

  if (error) {
    console.error('Failed to increment likes:', error);
  }
} catch (error) {
  console.error('Like error:', error);
}
```

}, [currentUserId, showNotification, streamId]);

const handleJoinGuest = useCallback(() => {
if (!streamId) return;
navigate(`/live/watch/${streamId}/join-guest`);
}, [navigate, streamId]);

useEffect(() => {
mountedRef.current = true;
redirectingRef.current = false;

```
loadStream();

return () => {
  mountedRef.current = false;
};
```

}, [loadStream]);

useEffect(() => {
if (!streamData?.host_id || !currentUserId) return;
checkFollowStatus(currentUserId, streamData.host_id);
}, [checkFollowStatus, currentUserId, streamData?.host_id]);

useEffect(() => {
if (!showShareList) return;
loadFollowers();
}, [loadFollowers, showShareList]);

useEffect(() => {
if (!streamId) return;

```
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

channel.on(
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
      goToEnded();
      return;
    }

    setStreamData(prev => prev ? { ...prev, ...updated } : updated);

    setIsCameraOff(
      updated.is_camera_on === false ||
      updated.is_video_off === true
    );

    if (typeof updated.viewer_count === 'number') {
      setViewerCount(Math.max(0, updated.viewer_count));
    }

    if (typeof updated.likes === 'number') {
      const nextLikes = Math.max(0, updated.likes);

      if (nextLikes > heartCountRef.current) {
        showNotification({
          type: 'like',
          name: 'A viewer',
          message: 'liked the live',
          avatar: null
        });
      }

      heartCountRef.current = nextLikes;
      setHeartCount(nextLikes);
    }
  }
).subscribe(status => {
  if (!active || !mountedRef.current) return;

  if (status === 'SUBSCRIBED') {
    setNetworkStatus('connected');
  }

  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    setNetworkStatus('reconnecting');
  }
});

return () => {
  active = false;

  if (streamChannelRef.current === channel) {
    streamChannelRef.current = null;
  }

  supabase.removeChannel(channel);
};
```

}, [goToEnded, showNotification, streamId]);

useEffect(() => {
if (!streamId) return;

```
let active = true;

const channel = supabase.channel(`live-cohosts-${streamId}`);

cohostChannelRef.current = channel;

channel.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'live_guest_requests',
    filter: `stream_id=eq.${streamId}`
  },
  payload => {
    if (!active || !mountedRef.current) return;

    const row = payload?.new || payload?.old;

    if (
      row?.status === 'approved' ||
      row?.status === 'removed' ||
      row?.status === 'left' ||
      row?.status === 'rejected'
    ) {
      loadCohosts();
    } else {
      loadCohosts();
    }
  }
).subscribe();

loadCohosts();

return () => {
  active = false;

  if (cohostChannelRef.current === channel) {
    cohostChannelRef.current = null;
  }

  supabase.removeChannel(channel);
};
```

}, [loadCohosts, streamId]);

useEffect(() => {
const handleOnline = () => {
if (!mountedRef.current) return;

```
  setNetworkStatus('connected');
  setIsReconnecting(false);
  refreshStream();
};

const handleOffline = () => {
  if (!mountedRef.current) return;
  setNetworkStatus('offline');
  setIsReconnecting(true);
};

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

return () => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};
```

}, [refreshStream]);

useEffect(() => {
if (networkStatus !== 'reconnecting' || !streamData || streamEnded) return;

```
if (reconnectTimerRef.current) {
  clearTimeout(reconnectTimerRef.current);
}

reconnectTimerRef.current = setTimeout(() => {
  if (mountedRef.current) refreshStream();
  reconnectTimerRef.current = null;
}, 3000);

return () => {
  if (reconnectTimerRef.current) {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }
};
```

}, [networkStatus, refreshStream, streamData, streamEnded]);

useEffect(() => {
return () => {
mountedRef.current = false;

```
  if (notificationTimerRef.current) {
    clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = null;
  }

  if (reconnectTimerRef.current) {
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
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
```

}, []);

if (loading) {
return ( <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-4 text-white"> <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"> <Loader2 size={24} className="animate-spin text-white/60" /> </div> <div className="text-center"> <p className="text-sm font-black">Preparing live</p> <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Connecting to stream</p> </div> </div>
);
}

if (streamError) {
return ( <div className="h-screen w-screen bg-black flex items-center justify-center p-6 text-white"> <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center"> <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4"> <WifiOff size={28} className="text-red-400" /> </div>

```
      <h1 className="text-lg font-black">Live unavailable</h1>
      <p className="text-xs text-white/50 mt-2 leading-relaxed">{streamError}</p>

      <div className="flex gap-2 mt-6">
        <button
          onClick={refreshStream}
          className="flex-1 h-11 rounded-2xl bg-white/10 border border-white/10 text-xs font-black flex items-center justify-center gap-2"
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
```

}

if (!streamData) return null;

return ( <div className="h-screen w-screen bg-black relative overflow-hidden flex flex-col"> <style>
{`           .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `} </style>

```
  <div className="relative w-full h-full z-0 overflow-hidden bg-black">
    <DynamicStreamGrid
      streamId={streamId}
      hostVideo={<VideoPlayer streamId={streamId} isHost={false} />}
      hostInfo={{
        id: streamData.host_id,
        username: streamData?.host?.username || 'Host',
        avatar_url: streamData?.host?.avatar_url || null,
        is_verified: Boolean(
          streamData?.host?.is_verified ||
          streamData?.host?.verified_status === 'verified'
        )
      }}
      coHosts={activeCohostsList}
      isHostView={false}
      isBattleMode={isBattleMode}
      activeSmallGift={null}
    />

    <AnimatePresence>
      {isCameraOff && !streamEnded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[45] bg-black/55 backdrop-blur-md flex items-center justify-center p-6 text-center pointer-events-none"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              {streamData?.host?.avatar_url ? (
                <img
                  src={streamData.host.avatar_url}
                  alt={streamData?.host?.username || 'Host'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <VideoOff size={36} className="text-white/40" />
              )}
            </div>

            <div>
              <h2 className="text-white font-black text-lg">
                {streamData?.host?.username || 'Host'}
              </h2>
              <p className="text-white/45 text-[10px] uppercase tracking-widest mt-1">
                Camera is currently off
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[9px] text-white/60 font-black uppercase">
                Waiting for host
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {streamEnded && (
      <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <WifiOff size={28} className="text-white/50" />
          </div>

          <h2 className="text-white font-black text-xl mt-5">Live ended</h2>
          <p className="text-white/40 text-xs mt-2">
            This stream is no longer live.
          </p>

          <button
            onClick={goToLive}
            className="mt-6 px-6 h-11 rounded-full bg-white text-black text-xs font-black"
          >
            Back to Live
          </button>
        </div>
      </div>
    )}
  </div>

  <div className="absolute inset-0 pointer-events-none z-40">
    <FloatingHearts count={heartCount} streamId={streamId} />
  </div>

  <div className="fixed top-0 left-0 right-0 z-50 p-4 pt-8 bg-gradient-to-b from-black/90 via-black/30 to-transparent pointer-events-none flex flex-col gap-2">
    <div className="pointer-events-auto flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <StreamHeader
          data={streamData}
          isHost={false}
          viewerCount={viewerCount}
          onLeave={goToLive}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="px-2.5 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
          {networkStatus === 'connected' ? (
            <Wifi size={13} className="text-green-400" />
          ) : (
            <WifiOff size={13} className="text-yellow-400" />
          )}

          <span className="text-[9px] text-white/70 font-black uppercase">
            {networkStatus === 'connected'
              ? 'Live'
              : networkStatus === 'offline'
                ? 'Offline'
                : 'Reconnecting'}
          </span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 pointer-events-auto">
      <div className="flex-1 min-w-0">
        <LiveStreamGoalBar streamId={streamId} isHost={false} />
      </div>

      {isReconnecting && (
        <button
          onClick={refreshStream}
          className="shrink-0 h-8 px-3 rounded-full bg-black/60 border border-white/10 text-white text-[9px] font-black flex items-center gap-1.5"
        >
          <RefreshCw size={12} className="animate-spin" />
          Reconnecting
        </button>
      )}
    </div>

    {isBattleMode && battleData?.hosts?.length >= 2 && (
      <div className="w-full max-w-lg mx-auto pointer-events-auto">
        <MultiHostPKBattleBar
          hosts={battleData.hosts}
          duration={Number(battleData.duration) || 180}
        />
      </div>
    )}
  </div>

  <div className="absolute top-28 left-4 z-50 pointer-events-none">
    <AnimatePresence>
      {eventNotification && (
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="bg-black/55 backdrop-blur-xl border border-white/10 rounded-full pl-1 pr-4 py-1 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
            {eventNotification.avatar ? (
              <img src={eventNotification.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs">●</div>
            )}
          </div>

          <div>
            <p className="text-white text-[10px] font-black">
              {eventNotification.name}
            </p>
            <p className="text-white/55 text-[9px]">
              {eventNotification.message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>

  <div className="absolute bottom-28 left-4 z-50 pointer-events-none">
    <div className="pointer-events-auto max-w-[340px]">
      {showChat && (
        <div className="h-[310px] overflow-hidden hide-scrollbar">
          <LiveChat streamId={streamId} hideMessages={false} />
        </div>
      )}
    </div>
  </div>

  <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 z-50 flex items-end justify-between pointer-events-none">
    <div className="pointer-events-auto flex items-center gap-2">
      <button
        onClick={() => setShowChat(prev => !prev)}
        aria-label={showChat ? 'Hide chat' : 'Show chat'}
        className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center"
      >
        <MessageCircle size={20} />
      </button>

      <button
        onClick={handleJoinGuest}
        aria-label="Join as guest"
        className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center"
      >
        <Users size={20} />
      </button>
    </div>

    <div className="pointer-events-auto flex items-center gap-2">
      <button
        onClick={() => setPlayerMuted(prev => !prev)}
        aria-label={playerMuted ? 'Unmute' : 'Mute'}
        className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center"
      >
        {playerMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>

      <button
        onClick={handleLike}
        aria-label="Like live"
        className="flex flex-col items-center gap-1"
      >
        <div className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 text-[#fe2c55] flex items-center justify-center">
          <Heart size={21} fill="currentColor" />
        </div>

        <span className="text-[8px] text-white/70 font-black">
          {formatCount(heartCount)}
        </span>
      </button>

      <button
        onClick={() => setShowGifts(true)}
        aria-label="Open gifts"
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500 text-white flex items-center justify-center shadow-lg"
      >
        <GiftIcon size={23} />
      </button>

      <button
        onClick={handleShare}
        aria-label="Share live"
        className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center"
      >
        <Share2 size={19} />
      </button>
    </div>
  </div>

  <div className="absolute left-4 bottom-24 z-50 pointer-events-none">
    <div className="pointer-events-auto flex items-center gap-2">
      {streamData?.host_id && currentUserId !== streamData.host_id && (
        <button
          onClick={handleFollowHost}
          disabled={followLoading}
          className={`h-9 px-3 rounded-full border backdrop-blur-xl flex items-center gap-1.5 text-[9px] font-black ${
            hostFollowed
              ? 'bg-white/10 border-white/10 text-white'
              : 'bg-[#fe2c55] border-[#fe2c55] text-white'
          }`}
        >
          {followed => null}

          {followLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : hostFollowed ? (
            <UserCheck size={12} />
          ) : (
            <UserPlus size={12} />
          )}

          {hostFollowed ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  </div>

  {showShareList && (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowShareList(false)}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-lg bg-zinc-950 border-t border-white/10 rounded-t-3xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-black text-sm">Share live</h3>
            <p className="text-white/40 text-[9px] mt-1">
              Invite people or copy the live link
            </p>
          </div>

          <button
            onClick={() => setShowShareList(false)}
            aria-label="Close share"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            <X size={15} className="text-white/60" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={handleShare}
            className="h-11 rounded-2xl bg-white text-black text-[10px] font-black flex items-center justify-center gap-2"
          >
            <Share2 size={15} />
            Share
          </button>

          <button
            onClick={handleCopyLink}
            className="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-[10px] font-black flex items-center justify-center gap-2"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">
            Invite followers
          </span>

          {followersLoading && (
            <Loader2 size={13} className="text-white/40 animate-spin" />
          )}
        </div>

        <div className="max-h-56 overflow-y-auto hide-scrollbar flex flex-col gap-2">
          {followers.length === 0 && !followersLoading ? (
            <div className="py-8 text-center">
              <Users size={22} className="mx-auto text-white/20" />
              <p className="text-white/35 text-[10px] font-bold mt-2">
                No followers available
              </p>
            </div>
          ) : (
            followers.map(follower => {
              const sent = sentInvites.includes(follower.id);

              return (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {follower.avatar_url ? (
                      <img
                        src={follower.avatar_url}
                        alt={follower.username || 'Follower'}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                        <Users size={15} />
                      </div>
                    )}

                    <span className="text-[10px] text-white font-bold truncate">
                      {follower.username || 'User'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSendInvite(follower.id)}
                    disabled={sent}
                    className={`px-3 h-8 rounded-full text-[9px] font-black ${
                      sent
                        ? 'bg-green-500/15 text-green-400'
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
    </div>
  )}

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
