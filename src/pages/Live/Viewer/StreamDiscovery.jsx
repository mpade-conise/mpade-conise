import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Radio, Video, Play, Users, Heart, Gift, ShieldCheck,
  Crown, Swords, SlidersHorizontal, RefreshCw, X, Share2, Flag, EyeOff,
  WifiOff, ChevronDown, UserPlus, UserCheck, Sparkles, Globe2
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const PAGE_SIZE = 30;

const TABS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'New' }
];

const FALLBACK_AVATAR = 'https://via.placeholder.com/160';

const normalize = value => String(value || '').trim().toLowerCase();

const getSettings = stream => {
  if (!stream?.settings) return {};
  if (typeof stream.settings === 'object') return stream.settings;
  try {
    return JSON.parse(stream.settings);
  } catch {
    return {};
  }
};

const getTags = stream => {
  if (Array.isArray(stream?.tags)) return stream.tags;
  if (typeof stream?.tags === 'string') {
    return stream.tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  return [];
};

const getRegion = stream => {
  const settings = getSettings(stream);
  return stream?.region || stream?.district || settings.region || settings.district || '';
};

const getLanguage = stream => {
  const settings = getSettings(stream);
  return stream?.language || settings.language || settings.lang || '';
};

const isAgeRestricted = stream => {
  const settings = getSettings(stream);
  return Boolean(
    stream?.age_restricted ||
    stream?.is_age_restricted ||
    settings.age_restricted ||
    settings.ageRestricted ||
    settings.adult_only
  );
};

const hasBattle = stream => {
  const settings = getSettings(stream);
  return Boolean(
    stream?.battle_id ||
    stream?.battle_status === 'active' ||
    settings.battle_id ||
    settings.battleId ||
    settings.battle_status === 'active' ||
    settings.pk_active
  );
};

const hasCoHost = stream => Boolean(stream?.co_host_id);

const hasGiftGoal = stream => Boolean(
  Number(stream?.gift_goal_total || 0) > 0 ||
  Number(stream?.gift_goal_current || 0) > 0
);

const viewerNumber = value => {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
};

const timeScore = startedAt => {
  if (!startedAt) return 0;
  const time = new Date(startedAt).getTime();
  return Number.isFinite(time) ? time : 0;
};

const trendScore = stream => {
  const viewers = Number(stream?.viewer_count || 0);
  const peak = Number(stream?.peak_viewers || 0);
  const likes = Number(stream?.likes || 0);
  const gifts = Number(stream?.gifts_count || stream?.total_gifts || 0);
  const shares = Number(stream?.shares_count || 0);
  const ageHours = Math.max(0.25, (Date.now() - timeScore(stream?.started_at)) / 3600000);
  return (viewers * 5) + (peak * 1.5) + (likes * 0.8) + (gifts * 3) + (shares * 2) + (1 / ageHours) * 100;
};

const formatStarted = startedAt => {
  if (!startedAt) return 'LIVE NOW';
  const time = new Date(startedAt).getTime();
  if (!Number.isFinite(time)) return 'LIVE NOW';

  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M LIVE`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H LIVE`;

  return `${Math.floor(hours / 24)}D LIVE`;
};

const StreamDiscovery = () => {
  const navigate = useNavigate();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeTab, setActiveTab] = useState('recommended');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [category, setCategory] = useState('All');
  const [region, setRegion] = useState('All');
  const [language, setLanguage] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [followingIds, setFollowingIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [followBusy, setFollowBusy] = useState({});

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const realtimeChannelRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const searchTimerRef = useRef(null);
  const filterRef = useRef({
    activeTab: 'recommended',
    category: 'All',
    region: 'All',
    language: 'All',
    searchQuery: ''
  });

  const sentinelRef = useRef(null);

  useEffect(() => {
    filterRef.current = {
      activeTab,
      category,
      region,
      language,
      searchQuery
    };
  }, [activeTab, category, region, language, searchQuery]);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
      setHasMore(true);
    }, 350);

    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  const fetchHostProfiles = useCallback(async hostIds => {
    const ids = [...new Set(hostIds.filter(Boolean))];
    if (!ids.length) return {};

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, verified_status, is_verified, online')
        .in('id', ids);

      if (profileError) throw profileError;

      return (data || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {});
    } catch (err) {
      console.error('Failed to load live host profiles:', err.message);
      return {};
    }
  }, []);

  const fetchFollowing = useCallback(async userId => {
    if (!userId) {
      setFollowingIds([]);
      return;
    }

    try {
      const { data, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      if (isMountedRef.current) {
        setFollowingIds((data || []).map(row => row.following_id).filter(Boolean));
      }
    } catch (err) {
      console.warn('Following list unavailable:', err.message);
      if (isMountedRef.current) setFollowingIds([]);
    }
  }, []);

  const loadStreams = useCallback(async (targetPage = 0, append = false) => {
    if (loadingRef.current) return;
    if (append && !hasMore) return;

    loadingRef.current = true;

    if (append) setLoadingMore(true);
    else if (targetPage === 0) setLoading(true);

    setError('');

    try {
      let query = supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .range(targetPage * PAGE_SIZE, (targetPage + 1) * PAGE_SIZE - 1);

      const { data, error: streamError } = await query;

      if (streamError) throw streamError;

      const rows = data || [];
      const profiles = await fetchHostProfiles(rows.map(stream => stream.host_id));

      const prepared = rows.map(stream => ({
        ...stream,
        host: profiles[stream.host_id] || {
          id: stream.host_id,
          username: 'Universe Host',
          avatar_url: null,
          verified_status: false,
          is_verified: false,
          online: true
        }
      }));

      if (!isMountedRef.current) return;

      setStreams(prev => {
        if (!append) return prepared;

        const merged = [...prev];

        prepared.forEach(stream => {
          const index = merged.findIndex(item => item.id === stream.id);

          if (index >= 0) merged[index] = { ...merged[index], ...stream };
          else merged.push(stream);
        });

        return merged;
      });

      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error('Universe Live discovery error:', err.message);

      if (isMountedRef.current) {
        setError(err.message || 'Unable to load live streams.');
        if (!append) setStreams([]);
      }
    } finally {
      loadingRef.current = false;

      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [fetchHostProfiles, hasMore]);

  useEffect(() => {
    isMountedRef.current = true;

    const initialise = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!isMountedRef.current) return;

        const userId = user?.id || null;
        setCurrentUserId(userId);

        await fetchFollowing(userId);
      } catch (err) {
        console.warn('Unable to resolve current user:', err.message);
      }
    };

    initialise();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchFollowing]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadStreams(0, false);
  }, [activeTab, category, region, language, searchQuery]);

  useEffect(() => {
    const channelName = `public-live-discovery-${Math.random().toString(36).slice(2, 10)}`;

    realtimeChannelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, async payload => {
        if (!isMountedRef.current) return;

        const event = payload.event || payload.eventType;
        const incoming = payload.new;
        const old = payload.old;

        if (event === 'INSERT') {
          if (incoming?.status !== 'live') return;

          const profileMap = await fetchHostProfiles([incoming.host_id]);
          const stream = {
            ...incoming,
            host: profileMap[incoming.host_id] || {
              id: incoming.host_id,
              username: 'Universe Host',
              avatar_url: null,
              online: true
            }
          };

          setStreams(prev => {
            if (prev.some(item => item.id === stream.id)) return prev;
            return [stream, ...prev];
          });

          return;
        }

        if (event === 'UPDATE') {
          if (!incoming?.id) return;

          if (incoming.status !== 'live') {
            setStreams(prev => prev.filter(stream => stream.id !== incoming.id));
            return;
          }

          setStreams(prev => {
            const exists = prev.some(stream => stream.id === incoming.id);

            if (!exists) {
              fetchHostProfiles([incoming.host_id]).then(profileMap => {
                if (!isMountedRef.current) return;

                const stream = {
                  ...incoming,
                  host: profileMap[incoming.host_id] || {
                    id: incoming.host_id,
                    username: 'Universe Host',
                    avatar_url: null
                  }
                };

                setStreams(current => {
                  if (current.some(item => item.id === stream.id)) return current;
                  return [stream, ...current];
                });
              });

              return prev;
            }

            return prev.map(stream =>
              stream.id === incoming.id
                ? { ...stream, ...incoming, host: stream.host }
                : stream
            );
          });

          return;
        }

        if (event === 'DELETE') {
          const id = old?.id;

          if (id) {
            setStreams(prev => prev.filter(stream => stream.id !== id));
          }
        }
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Live discovery realtime channel error.');
        }
      });

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [fetchHostProfiles]);

  const categories = useMemo(() => {
    const values = new Set();

    streams.forEach(stream => {
      if (stream.category) values.add(String(stream.category));
    });

    return ['All', ...Array.from(values).sort()];
  }, [streams]);

  const regions = useMemo(() => {
    const values = new Set();

    streams.forEach(stream => {
      const value = getRegion(stream);
      if (value) values.add(String(value));
    });

    return ['All', ...Array.from(values).sort()];
  }, [streams]);

  const languages = useMemo(() => {
    const values = new Set();

    streams.forEach(stream => {
      const value = getLanguage(stream);
      if (value) values.add(String(value));
    });

    return ['All', ...Array.from(values).sort()];
  }, [streams]);

  const matchesSearch = useCallback((stream, query) => {
    if (!query) return true;

    const value = normalize(query);
    const username = normalize(stream.host?.username);
    const title = normalize(stream.title);
    const streamCategory = normalize(stream.category);
    const tags = getTags(stream).map(normalize);

    return (
      username.includes(value) ||
      title.includes(value) ||
      streamCategory.includes(value) ||
      tags.some(tag => tag.includes(value))
    );
  }, []);

  const filteredStreams = useMemo(() => {
    let result = streams.filter(stream => {
      if (hiddenIds.includes(stream.id)) return false;
      if (stream.status !== 'live') return false;
      if (stream.privacy && normalize(stream.privacy) !== 'public') return false;

      if (category !== 'All' && normalize(stream.category) !== normalize(category)) return false;

      if (region !== 'All' && normalize(getRegion(stream)) !== normalize(region)) return false;

      if (language !== 'All' && normalize(getLanguage(stream)) !== normalize(language)) return false;

      if (!matchesSearch(stream, searchQuery)) return false;

      return true;
    });

    if (activeTab === 'following') {
      result = result.filter(stream => followingIds.includes(stream.host_id));
    }

    if (activeTab === 'trending') {
      result = [...result].sort((a, b) => trendScore(b) - trendScore(a));
    } else if (activeTab === 'popular') {
      result = [...result].sort((a, b) => Number(b.viewer_count || 0) - Number(a.viewer_count || 0));
    } else if (activeTab === 'new') {
      result = [...result].sort((a, b) => timeScore(b.started_at) - timeScore(a.started_at));
    } else if (activeTab === 'recommended') {
      result = [...result].sort((a, b) => {
        const aFollow = followingIds.includes(a.host_id) ? 1 : 0;
        const bFollow = followingIds.includes(b.host_id) ? 1 : 0;

        return (
          bFollow - aFollow ||
          trendScore(b) - trendScore(a)
        );
      });
    }

    return result;
  }, [
    streams,
    hiddenIds,
    category,
    region,
    language,
    searchQuery,
    activeTab,
    followingIds,
    matchesSearch
  ]);

  const handleRefresh = async () => {
    if (loadingRef.current) return;

    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await loadStreams(0, false);
  };

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    const nextPage = page + 1;

    setPage(nextPage);
    await loadStreams(nextPage, true);
  }, [hasMore, page, loadStreams]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: '500px' }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [handleLoadMore]);

  const handleResume = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/live/dashboard/${id}`);
  };

  const handleOpenStream = stream => {
    if (!stream?.id) return;

    if (currentUserId === stream.host_id) {
      navigate(`/live/dashboard/${stream.id}`);
      return;
    }

    navigate(`/live/watch/${stream.id}`);
  };

  const handleHostProfile = (event, hostId) => {
    event.preventDefault();
    event.stopPropagation();

    if (hostId) navigate(`/profile/${hostId}`);
  };

  const handleFollow = async (event, stream) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId || !stream?.host_id || currentUserId === stream.host_id) return;

    const hostId = stream.host_id;
    const isFollowing = followingIds.includes(hostId);

    setFollowBusy(prev => ({ ...prev, [hostId]: true }));

    try {
      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', hostId);

        if (deleteError) throw deleteError;

        setFollowingIds(prev => prev.filter(id => id !== hostId));
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: hostId
          });

        if (insertError) throw insertError;

        setFollowingIds(prev => [...new Set([...prev, hostId])]);
      }
    } catch (err) {
      console.error('Follow action failed:', err.message);
    } finally {
      if (isMountedRef.current) {
        setFollowBusy(prev => ({ ...prev, [hostId]: false }));
      }
    }
  };

  const handleShare = async (event, stream) => {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/live/watch/${stream.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: stream.title || `${stream.host?.username || 'Universe Host'} is live`,
          text: `Watch ${stream.host?.username || 'this creator'} live on Made Universe.`,
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('Share failed:', err.message);
      }
    }
  };

  const handleHide = (event, streamId) => {
    event.preventDefault();
    event.stopPropagation();

    setHiddenIds(prev => [...new Set([...prev, streamId])]);
  };

  const handleReport = (event, stream) => {
    event.preventDefault();
    event.stopPropagation();

    const reason = window.prompt(
      `Report ${stream.host?.username || 'this live stream'}?\n\nEnter a reason:`
    );

    if (!reason?.trim()) return;

    console.log('Live report submitted locally:', {
      stream_id: stream.id,
      host_id: stream.host_id,
      reason: reason.trim()
    });

    window.alert('Thanks. The live stream has been reported.');
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const clearFilters = () => {
    setCategory('All');
    setRegion('All');
    setLanguage('All');
  };

  const activeFilterCount = [
    category !== 'All',
    region !== 'All',
    language !== 'All'
  ].filter(Boolean).length;

  const renderSkeletons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-10">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="flex flex-col items-center animate-pulse">
          <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/5" />
          <div className="w-20 h-2 mt-5 rounded bg-zinc-900" />
          <div className="w-28 h-2 mt-2 rounded bg-zinc-900" />
        </div>
      ))}
    </div>
  );

  const renderStreamCard = stream => {
    const isHost = currentUserId === stream.host_id;
    const isFollowing = followingIds.includes(stream.host_id);
    const verified = Boolean(stream.host?.verified_status || stream.host?.is_verified);
    const regionValue = getRegion(stream);
    const languageValue = getLanguage(stream);
    const battle = hasBattle(stream);
    const coHost = hasCoHost(stream);
    const giftGoal = hasGiftGoal(stream);
    const ageRestricted = isAgeRestricted(stream);

    return (
      <article
        key={stream.id}
        className="stream-card group relative flex flex-col items-center min-w-0"
      >
        <div className="absolute inset-x-4 top-2 h-24 rounded-full bg-fuchsia-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <button
          type="button"
          onClick={() => handleOpenStream(stream)}
          className="relative w-[94px] h-[94px] rounded-full p-[3px] neon-ring overflow-visible transition-all duration-500 hover:scale-110 active:scale-95"
          aria-label={isHost ? 'Resume your live stream' : `Watch ${stream.host?.username || 'live stream'}`}
        >
          <span className="absolute inset-0 rounded-full bg-black" />

          <span className="relative block w-full h-full rounded-full p-[2px] bg-black overflow-hidden">
            {stream.thumbnail_url ? (
              <img
                src={stream.thumbnail_url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
            ) : null}

            <img
              src={stream.host?.avatar_url || FALLBACK_AVATAR}
              alt={stream.host?.username || 'Universe Host'}
              loading="lazy"
              className="relative w-full h-full rounded-full object-cover bg-zinc-950"
              onError={event => {
                event.currentTarget.src = FALLBACK_AVATAR;
              }}
            />
          </span>

          <span className="absolute -top-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-black border border-white/10 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_#ff0055]" />
          </span>

          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-600 border-2 border-black text-[7px] font-black tracking-widest shadow-[0_0_12px_rgba(255,0,85,.65)]">
            LIVE
          </span>

          {battle ? (
            <span className="absolute top-1 -left-2 w-6 h-6 rounded-full flex items-center justify-center bg-purple-600 border-2 border-black shadow-[0_0_12px_rgba(139,92,246,.7)]">
              <Swords size={11} />
            </span>
          ) : null}

          {coHost ? (
            <span className="absolute bottom-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center bg-blue-600 border-2 border-black shadow-[0_0_12px_rgba(37,99,235,.7)]">
              <Users size={10} />
            </span>
          ) : null}
        </button>

        <div className="relative w-full mt-5 px-1 text-center">
          <button
            type="button"
            onClick={event => handleHostProfile(event, stream.host_id)}
            className="max-w-full inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-tight text-zinc-100 hover:text-white"
          >
            <span className="truncate max-w-[100px]">
              {stream.host?.username || 'Universe Host'}
            </span>
            {verified ? <ShieldCheck size={11} className="shrink-0 text-cyan-400" /> : null}
          </button>

          <p className="mt-1 text-[8px] text-zinc-500 truncate">
            {stream.title || 'Live on Made Universe'}
          </p>

          <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
            {stream.category ? (
              <span className="max-w-[90px] truncate px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[7px] font-bold text-zinc-400 uppercase">
                {stream.category}
              </span>
            ) : null}

            <span className="flex items-center gap-1 text-[7px] font-black text-zinc-500 uppercase">
              <Users size={9} />
              {viewerNumber(stream.viewer_count)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 min-h-[14px]">
            {regionValue ? (
              <span className="flex items-center gap-1 text-[7px] text-zinc-600">
                <Globe2 size={8} />
                {regionValue}
              </span>
            ) : null}

            {languageValue ? (
              <span className="text-[7px] text-zinc-600 uppercase">
                {languageValue}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {isHost ? (
              <button
                type="button"
                onClick={event => handleResume(event, stream.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-[7px] font-black uppercase tracking-widest shadow-[0_0_14px_rgba(37,99,235,.4)] active:scale-95"
              >
                <Play size={9} fill="currentColor" />
                Resume
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={event => handleFollow(event, stream)}
                  disabled={followBusy[stream.host_id]}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[7px] font-black uppercase tracking-wider transition-all ${
                    isFollowing
                      ? 'bg-white/10 border-white/10 text-white'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {isFollowing ? <UserCheck size={9} /> : <UserPlus size={9} />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>

                <button
                  type="button"
                  onClick={event => handleShare(event, stream)}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/10 text-zinc-500 hover:text-white"
                  aria-label="Share live"
                >
                  <Share2 size={10} />
                </button>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center justify-center gap-2">
            {giftGoal ? (
              <span title="Gift goal active" className="text-yellow-400">
                <Gift size={10} />
              </span>
            ) : null}

            {battle ? (
              <span title="Battle active" className="text-purple-400">
                <Swords size={10} />
              </span>
            ) : null}

            {ageRestricted ? (
              <span title="Age restricted" className="text-orange-400 text-[7px] font-black">
                18+
              </span>
            ) : null}

            {stream.likes ? (
              <span className="flex items-center gap-1 text-[7px] text-zinc-600">
                <Heart size={9} />
                {viewerNumber(stream.likes)}
              </span>
            ) : null}

            {stream.gifts_count || stream.total_gifts ? (
              <span className="flex items-center gap-1 text-[7px] text-zinc-600">
                <Gift size={9} />
                {viewerNumber(stream.gifts_count || stream.total_gifts)}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[7px] text-zinc-700 uppercase tracking-wider">
            {formatStarted(stream.started_at)}
          </div>
        </div>

        <div className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <button
            type="button"
            onClick={event => handleHide(event, stream.id)}
            className="w-6 h-6 rounded-full bg-black/90 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white"
            title="Hide live"
          >
            <EyeOff size={9} />
          </button>

          <button
            type="button"
            onClick={event => handleReport(event, stream)}
            className="w-6 h-6 rounded-full bg-black/90 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-red-400"
            title="Report live"
          >
            <Flag size={9} />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
      <style>{`
        @keyframes universe-neon {
          0% {
            border-color: #ff0055;
            box-shadow: 0 0 12px rgba(255,0,85,.65), 0 0 30px rgba(255,0,85,.18);
          }
          20% {
            border-color: #ff7a00;
            box-shadow: 0 0 12px rgba(255,122,0,.65), 0 0 30px rgba(255,122,0,.18);
          }
          40% {
            border-color: #ffe600;
            box-shadow: 0 0 12px rgba(255,230,0,.65), 0 0 30px rgba(255,230,0,.18);
          }
          60% {
            border-color: #00f2ff;
            box-shadow: 0 0 12px rgba(0,242,255,.65), 0 0 30px rgba(0,242,255,.18);
          }
          80% {
            border-color: #7000ff;
            box-shadow: 0 0 12px rgba(112,0,255,.65), 0 0 30px rgba(112,0,255,.18);
          }
          100% {
            border-color: #ff0055;
            box-shadow: 0 0 12px rgba(255,0,85,.65), 0 0 30px rgba(255,0,85,.18);
          }
        }

        @keyframes universe-pulse {
          0%, 100% { opacity: .55; transform: scale(.95); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        .neon-ring {
          border: 3px solid #ff0055;
          animation: universe-neon 5s linear infinite;
        }

        .stream-card:nth-child(2n) .neon-ring { animation-delay: -.8s; }
        .stream-card:nth-child(3n) .neon-ring { animation-delay: -1.6s; }
        .stream-card:nth-child(4n) .neon-ring { animation-delay: -2.4s; }
        .stream-card:nth-child(5n) .neon-ring { animation-delay: -3.2s; }

        .universe-scroll::-webkit-scrollbar {
          height: 5px;
          width: 5px;
        }

        .universe-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,.035);
          border-radius: 999px;
        }

        .universe-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #ff0055, #7000ff, #00f2ff);
          border-radius: 999px;
        }

        .universe-scroll {
          scrollbar-width: thin;
          scrollbar-color: #7000ff rgba(255,255,255,.035);
        }

        .glass {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.07);
          backdrop-filter: blur(14px);
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Radio size={17} className="text-red-500 animate-pulse" />
                <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter">
                  UNIVERSE <span className="text-red-500">LIVE</span>
                </h1>
              </div>
              <p className="hidden sm:block text-[8px] uppercase tracking-[.25em] text-zinc-600 font-bold">
                Discover creators broadcasting now
              </p>
            </div>

            <div className="relative hidden sm:block w-64 lg:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Search creators, titles, categories..."
                className="w-full h-9 rounded-full bg-white/[0.04] border border-white/[0.07] pl-9 pr-9 text-[10px] outline-none focus:border-white/20 placeholder:text-zinc-700"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className={`w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white ${refreshing ? 'animate-spin' : ''}`}
              aria-label="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/live/go-live')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,.3)]"
            >
              <Video size={12} />
              Go Live
            </button>
          </div>

          <div className="relative mt-3 sm:hidden">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search live..."
              className="w-full h-10 rounded-full bg-white/[0.04] border border-white/[0.07] pl-9 pr-9 text-[10px] outline-none focus:border-white/20 placeholder:text-zinc-700"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto universe-scroll pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-[0_0_18px_rgba(255,255,255,.12)]'
                    : 'bg-white/[0.035] border border-white/[0.06] text-zinc-500 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowFilters(value => !value)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
                showFilters || activeFilterCount
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                  : 'border-white/[0.06] bg-white/[0.035] text-zinc-500'
              }`}
            >
              <SlidersHorizontal size={10} />
              Filters
              {activeFilterCount ? ` ${activeFilterCount}` : ''}
            </button>
          </div>

          {showFilters ? (
            <div className="mt-3 flex gap-2 overflow-x-auto universe-scroll pb-2">
              <div className="relative shrink-0">
                <select
                  value={category}
                  onChange={event => {
                    setCategory(event.target.value);
                    setPage(0);
                  }}
                  className="appearance-none bg-white/[0.04] border border-white/[0.07] rounded-full pl-3 pr-8 py-2 text-[8px] uppercase font-black text-zinc-400 outline-none"
                >
                  {categories.map(value => <option key={value} value={value} className="bg-zinc-950">{value === 'All' ? 'Category' : value}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600" />
              </div>

              <div className="relative shrink-0">
                <select
                  value={region}
                  onChange={event => {
                    setRegion(event.target.value);
                    setPage(0);
                  }}
                  className="appearance-none bg-white/[0.04] border border-white/[0.07] rounded-full pl-3 pr-8 py-2 text-[8px] uppercase font-black text-zinc-400 outline-none"
                >
                  {regions.map(value => <option key={value} value={value} className="bg-zinc-950">{value === 'All' ? 'Region' : value}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600" />
              </div>

              <div className="relative shrink-0">
                <select
                  value={language}
                  onChange={event => {
                    setLanguage(event.target.value);
                    setPage(0);
                  }}
                  className="appearance-none bg-white/[0.04] border border-white/[0.07] rounded-full pl-3 pr-8 py-2 text-[8px] uppercase font-black text-zinc-400 outline-none"
                >
                  {languages.map(value => <option key={value} value={value} className="bg-zinc-950">{value === 'All' ? 'Language' : value}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600" />
              </div>

              {activeFilterCount ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 px-3 py-2 rounded-full text-[8px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20"
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {offline ? (
        <div className="mx-4 mt-4 max-w-[1500px] lg:mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-3 text-zinc-400">
          <WifiOff size={15} className="text-orange-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            You are offline. Showing available live data.
          </span>
        </div>
      ) : null}

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-7 pb-28">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2">
              {activeTab === 'trending' ? <Sparkles size={14} className="text-yellow-400" /> : null}
              {activeTab === 'popular' ? <Crown size={14} className="text-yellow-400" /> : null}
              {activeTab === 'following' ? <UserCheck size={14} className="text-cyan-400" /> : null}
              <h2 className="text-sm sm:text-base font-black uppercase tracking-[.16em]">
                {searchQuery ? 'Search results' : `${TABS.find(tab => tab.id === activeTab)?.label || 'Live'} lives`}
              </h2>
            </div>

            <p className="mt-1 text-[8px] text-zinc-600 uppercase tracking-[.18em]">
              {filteredStreams.length} live broadcast{filteredStreams.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => navigate('/live/go-live')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-600 text-[8px] font-black uppercase"
            >
              <Video size={10} />
              Go Live
            </button>
          </div>
        </div>

        {loading ? (
          renderSkeletons()
        ) : error ? (
          <div className="min-h-[350px] rounded-[30px] border border-red-500/10 bg-red-500/[0.02] flex flex-col items-center justify-center text-center px-5">
            <Radio size={42} className="text-red-500/30" />
            <h3 className="mt-5 text-sm font-black uppercase">Unable to load live streams</h3>
            <p className="mt-2 max-w-md text-[9px] text-zinc-600">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[8px] font-black uppercase tracking-widest"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          </div>
        ) : filteredStreams.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-10">
              {filteredStreams.map(renderStreamCard)}
            </div>

            <div ref={sentinelRef} className="h-20 flex items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-zinc-600">
                  <RefreshCw size={12} className="animate-spin" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Loading more</span>
                </div>
              ) : hasMore ? (
                <span className="text-[7px] text-zinc-800 uppercase tracking-[.3em]">Continue discovering</span>
              ) : (
                <span className="text-[7px] text-zinc-800 uppercase tracking-[.3em]">End of live discovery</span>
              )}
            </div>
          </>
        ) : (
          <div className="min-h-[350px] rounded-[30px] border border-white/[0.05] bg-white/[0.015] flex flex-col items-center justify-center text-center px-5">
            {searchQuery ? (
              <>
                <Search size={42} className="text-zinc-800" />
                <h3 className="mt-5 text-sm font-black uppercase">No live results</h3>
                <p className="mt-2 text-[9px] text-zinc-600">
                  No active broadcast matches your search or filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearSearch();
                    clearFilters();
                  }}
                  className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-[8px] font-black uppercase tracking-widest"
                >
                  Clear search
                </button>
              </>
            ) : activeTab === 'following' ? (
              <>
                <UserCheck size={42} className="text-zinc-800" />
                <h3 className="mt-5 text-sm font-black uppercase">Nobody you follow is live</h3>
                <p className="mt-2 text-[9px] text-zinc-600">
                  Explore recommended and trending creators instead.
                </p>
              </>
            ) : (
              <>
                <Radio size={42} className="text-zinc-800" />
                <h3 className="mt-5 text-sm font-black uppercase">No active lives</h3>
                <p className="mt-2 text-[9px] text-zinc-600">
                  There are no public live broadcasts matching these filters.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/live/go-live')}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-[8px] font-black uppercase tracking-widest"
                >
                  <Video size={10} />
                  Start a Live
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StreamDiscovery;
