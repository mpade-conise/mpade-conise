import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  Eye,
  Filter,
  Flame,
  Globe2,
  Heart,
  Languages,
  MoreHorizontal,
  Play,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Video,
  X,
  Zap
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const PAGE_SIZE = 24;
const SEARCH_DELAY = 350;

const TABS = [
  { id: 'recommended', label: 'Recommended', icon: Sparkles },
  { id: 'following', label: 'Following', icon: UserPlus },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'popular', label: 'Popular', icon: Trophy },
  { id: 'new', label: 'New', icon: Zap }
];

const DEFAULT_FILTERS = {
  category: 'All',
  region: 'All',
  language: 'All',
  age: 'All'
};

const normalize = value => String(value || '').trim().toLowerCase();

const formatNumber = value => {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
};

const timeAgo = date => {
  if (!date) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const getSettings = stream => {
  if (!stream?.settings) return {};
  if (typeof stream.settings === 'object') return stream.settings;
  try {
    return JSON.parse(stream.settings);
  } catch {
    return {};
  }
};

const getRegion = stream => {
  const settings = getSettings(stream);
  return stream?.region || stream?.district || settings.region || settings.district || '';
};

const getLanguage = stream => {
  const settings = getSettings(stream);
  return stream?.language || settings.language || '';
};

const isAgeRestricted = stream => {
  const settings = getSettings(stream);
  return Boolean(
    stream?.age_restricted ||
    stream?.is_age_restricted ||
    settings.age_restricted ||
    settings.is_age_restricted ||
    settings.ageRestriction
  );
};

const isPrivateStream = stream => {
  const privacy = normalize(stream?.privacy);
  return privacy === 'private' || privacy === 'followers' || privacy === 'subscriber';
};

const hasBattle = stream => {
  const settings = getSettings(stream);
  return Boolean(
    stream?.battle_id ||
    stream?.battle_stream_id ||
    stream?.is_battle ||
    settings.battle_id ||
    settings.battleId ||
    settings.battle
  );
};

const hasCoHost = stream => Boolean(stream?.co_host_id || stream?.cohost_id);

const getGoalValue = stream => Number(stream?.gift_goal_total || stream?.goal?.total || 0);

const getEngagement = stream => {
  const viewers = Number(stream?.viewer_count || 0);
  const likes = Number(stream?.likes || 0);
  const gifts = Number(stream?.gifts_count || stream?.total_gifts || 0);
  return viewers + likes * 2 + gifts * 5;
};

const getTrendingScore = stream => {
  const viewers = Number(stream?.viewer_count || 0);
  const peak = Number(stream?.peak_viewers || 0);
  const likes = Number(stream?.likes || 0);
  const gifts = Number(stream?.gifts_count || stream?.total_gifts || 0);
  const ageHours = Math.max(
    0.25,
    (Date.now() - new Date(stream?.started_at || Date.now()).getTime()) / 3600000
  );

  return viewers * 4 + peak * 1.5 + likes * 2 + gifts * 6 + 100 / ageHours;
};

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] animate-pulse">
    <div className="aspect-[4/5] bg-zinc-900" />
    <div className="space-y-3 p-4">
      <div className="h-3 w-2/3 rounded bg-zinc-800" />
      <div className="h-3 w-1/2 rounded bg-zinc-800" />
      <div className="h-8 w-full rounded-full bg-zinc-900" />
    </div>
  </div>
);

const StreamDiscovery = () => {
  const navigate = useNavigate();

  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [hiddenIds, setHiddenIds] = useState(new Set());

  const [activeTab, setActiveTab] = useState('recommended');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showRegion, setShowRegion] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [menuId, setMenuId] = useState(null);
  const [notice, setNotice] = useState('');

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const realtimeChannelRef = useRef(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);
  const filtersRef = useRef(filters);
  const activeTabRef = useRef(activeTab);
  const searchQueryRef = useRef(searchQuery);
  const followedIdsRef = useRef(new Set());
  const hiddenIdsRef = useRef(new Set());

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    followedIdsRef.current = followedIds;
  }, [followedIds]);

  useEffect(() => {
    hiddenIdsRef.current = hiddenIds;
  }, [hiddenIds]);

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
    const saved = localStorage.getItem('made-universe-live-data-saver');
    if (saved === 'true') setDataSaver(true);

    const hidden = localStorage.getItem('made-universe-hidden-live-streams');
    if (hidden) {
      try {
        setHiddenIds(new Set(JSON.parse(hidden)));
      } catch {}
    }
  }, []);

  const showNotice = useCallback(message => {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 2600);
  }, []);

  const fetchHostProfiles = useCallback(async hostIds => {
    const ids = [...new Set(hostIds.filter(Boolean))];
    if (!ids.length) return {};

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, verified_status, is_verified, online')
      .in('id', ids);

    if (profileError) {
      console.warn('Live profile lookup failed:', profileError.message);
      return {};
    }

    return (data || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {});
  }, []);

  const mergeProfiles = useCallback(async rows => {
    if (!rows?.length) return [];

    const profileMap = await fetchHostProfiles(rows.map(row => row.host_id));

    return rows.map(row => ({
      ...row,
      host: profileMap[row.host_id] || {
        id: row.host_id,
        username: 'Universe Host',
        avatar_url: null,
        verified_status: false,
        is_verified: false,
        online: true
      }
    }));
  }, [fetchHostProfiles]);

  const loadFollowedCreators = useCallback(async userId => {
    if (!userId) {
      setFollowedIds(new Set());
      return;
    }

    const { data, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError) {
      console.warn('Follow lookup failed:', followError.message);
      return;
    }

    setFollowedIds(new Set((data || []).map(item => item.following_id).filter(Boolean)));
  }, []);

  const streamMatchesFilters = useCallback(stream => {
    if (!stream || stream.status !== 'live' || isPrivateStream(stream)) return false;
    if (hiddenIdsRef.current.has(stream.id)) return false;

    const currentFilters = filtersRef.current;
    const currentSearch = normalize(searchQueryRef.current);

    if (currentFilters.category !== 'All' && normalize(stream.category) !== normalize(currentFilters.category)) {
      return false;
    }

    if (currentFilters.region !== 'All' && normalize(getRegion(stream)) !== normalize(currentFilters.region)) {
      return false;
    }

    if (currentFilters.language !== 'All' && normalize(getLanguage(stream)) !== normalize(currentFilters.language)) {
      return false;
    }

    if (currentFilters.age === '18+' && !isAgeRestricted(stream)) return false;
    if (currentFilters.age === 'All ages' && isAgeRestricted(stream)) return false;

    if (activeTabRef.current === 'following' && !followedIdsRef.current.has(stream.host_id)) {
      return false;
    }

    if (currentSearch) {
      const username = normalize(stream.host?.username);
      const title = normalize(stream.title);
      const category = normalize(stream.category);

      if (!username.includes(currentSearch) && !title.includes(currentSearch) && !category.includes(currentSearch)) {
        return false;
      }
    }

    return true;
  }, []);

  const sortStreams = useCallback(list => {
    const result = [...list];

    if (activeTabRef.current === 'trending') {
      return result.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    }

    if (activeTabRef.current === 'popular') {
      return result.sort((a, b) => Number(b.viewer_count || 0) - Number(a.viewer_count || 0));
    }

    if (activeTabRef.current === 'new') {
      return result.sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime());
    }

    if (activeTabRef.current === 'following') {
      return result.sort((a, b) => {
        const followedA = followedIdsRef.current.has(a.host_id) ? 1 : 0;
        const followedB = followedIdsRef.current.has(b.host_id) ? 1 : 0;
        return followedB - followedA || getTrendingScore(b) - getTrendingScore(a);
      });
    }

    return result.sort((a, b) => {
      const followedA = followedIdsRef.current.has(a.host_id) ? 1 : 0;
      const followedB = followedIdsRef.current.has(b.host_id) ? 1 : 0;
      return followedB - followedA || getTrendingScore(b) - getTrendingScore(a);
    });
  }, []);

  const fetchStreams = useCallback(async (pageNumber = 0, append = false) => {
    if (loadingRef.current) return;

    loadingRef.current = true;

    if (append) setLoadingMore(true);
    else if (pageNumber === 0) setLoading(true);

    setError('');

    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .range(from, to);

      if (streamError) throw streamError;

      const rows = data || [];
      const enriched = await mergeProfiles(rows);
      const visible = enriched.filter(streamMatchesFilters);

      if (!isMountedRef.current) return;

      setStreams(prev => {
        const combined = append ? [...prev, ...visible] : visible;
        const unique = new Map();

        combined.forEach(stream => {
          unique.set(stream.id, stream);
        });

        return sortStreams([...unique.values()]);
      });

      setPage(pageNumber);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error('Universe Live Discovery Error:', err);

      if (isMountedRef.current) {
        setError(err?.message || 'Unable to load live streams.');
      }
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoadingMore(false);
        setLoading(false);
      }
    }
  }, [mergeProfiles, sortStreams, streamMatchesFilters]);

  useEffect(() => {
    isMountedRef.current = true;

    const initialise = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!isMountedRef.current) return;

        if (user) {
          setCurrentUserId(user.id);
          await loadFollowedCreators(user.id);
        }

        await fetchStreams(0, false);
      } catch (err) {
        console.error('Live discovery initialization failed:', err);

        if (isMountedRef.current) {
          setError(err?.message || 'Unable to initialize Live.');
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStreams, loadFollowedCreators]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchStreams(0, false);
  }, [activeTab, filters.category, filters.region, filters.language, filters.age, searchQuery]);

  useEffect(() => {
    const channel = supabase
      .channel('public-live-stream-discovery')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams'
        },
        async payload => {
          const event = payload.event || payload.eventType;
          const nextStream = payload.new;
          const oldStream = payload.old;

          if (!isMountedRef.current) return;

          if (event === 'INSERT') {
            if (!streamMatchesFilters(nextStream)) return;

            const [enriched] = await mergeProfiles([nextStream]);

            if (!isMountedRef.current) return;

            setStreams(prev => {
              if (prev.some(stream => stream.id === enriched.id)) return prev;
              return sortStreams([enriched, ...prev]);
            });

            return;
          }

          if (event === 'UPDATE') {
            if (!nextStream?.id) return;

            if (!streamMatchesFilters(nextStream)) {
              setStreams(prev => prev.filter(stream => stream.id !== nextStream.id));
              return;
            }

            setStreams(prev => {
              const exists = prev.some(stream => stream.id === nextStream.id);

              if (!exists) {
                mergeProfiles([nextStream]).then(([enriched]) => {
                  if (!isMountedRef.current) return;

                  setStreams(current => {
                    if (current.some(stream => stream.id === enriched.id)) return current;
                    return sortStreams([enriched, ...current]);
                  });
                });

                return prev;
              }

              return sortStreams(
                prev.map(stream =>
                  stream.id === nextStream.id
                    ? { ...stream, ...nextStream, host: stream.host }
                    : stream
                )
              );
            });

            return;
          }

          if (event === 'DELETE') {
            const oldId = oldStream?.id;

            if (oldId) {
              setStreams(prev => prev.filter(stream => stream.id !== oldId));
            }
          }
        }
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Live discovery realtime channel error.');
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [mergeProfiles, sortStreams, streamMatchesFilters]);

  useEffect(() => {
    if (!bottomRef.current || !hasMore) return undefined;

    observerRef.current = new IntersectionObserver(
      entries => {
        const first = entries[0];

        if (first?.isIntersecting && !loadingRef.current && !loading && !loadingMore) {
          fetchStreams(page + 1, true);
        }
      },
      { rootMargin: '500px' }
    );

    observerRef.current.observe(bottomRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [fetchStreams, hasMore, loading, loadingMore, page]);

  const refresh = async () => {
    if (loadingRef.current) return;

    setRefreshing(true);

    try {
      await fetchStreams(0, false);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  };

  const handleResume = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/live/dashboard/${id}`);
  };

  const openStream = stream => {
    if (currentUserId === stream.host_id) return;
    navigate(`/live/watch/${stream.id}`);
  };

  const openProfile = (event, hostId) => {
    event.preventDefault();
    event.stopPropagation();
    if (hostId) navigate(`/profile/${hostId}`);
  };

  const toggleFollow = async (event, stream) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId) {
      showNotice('Sign in to follow creators.');
      return;
    }

    const hostId = stream.host_id;
    const currentlyFollowing = followedIdsRef.current.has(hostId);

    try {
      if (currentlyFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', hostId);

        if (deleteError) throw deleteError;

        setFollowedIds(prev => {
          const next = new Set(prev);
          next.delete(hostId);
          return next;
        });

        showNotice('Unfollowed creator.');
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: hostId
          });

        if (insertError) throw insertError;

        setFollowedIds(prev => new Set([...prev, hostId]));
        showNotice('Following creator.');
      }
    } catch (err) {
      console.error('Follow action failed:', err);
      showNotice(err?.message || 'Unable to update follow.');
    }
  };

  const hideStream = (event, streamId) => {
    event.preventDefault();
    event.stopPropagation();

    setHiddenIds(prev => {
      const next = new Set(prev);
      next.add(streamId);

      localStorage.setItem(
        'made-universe-hidden-live-streams',
        JSON.stringify([...next])
      );

      return next;
    });

    setStreams(prev => prev.filter(stream => stream.id !== streamId));
    setMenuId(null);
    showNotice('Live hidden from discovery.');
  };

  const reportStream = (event, stream) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuId(null);
    showNotice(`Report opened for ${stream.host?.username || 'this live stream'}.`);
  };

  const shareStream = async (event, stream) => {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/live/watch/${stream.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: stream.title || 'Made Universe Live',
          text: `Watch ${stream.host?.username || 'this creator'} live on Made Universe.`,
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showNotice('Live link copied.');
      } else {
        showNotice('Copy this live link from your browser.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        showNotice('Unable to share this live.');
      }
    }
  };

  const toggleDataSaver = () => {
    setDataSaver(prev => {
      const next = !prev;
      localStorage.setItem('made-universe-live-data-saver', String(next));
      return next;
    });
  };

  const categories = useMemo(() => {
    const values = streams
      .map(stream => stream.category)
      .filter(Boolean);

    return ['All', ...new Set(values)].slice(0, 30);
  }, [streams]);

  const regions = useMemo(() => {
    const values = streams
      .map(getRegion)
      .filter(Boolean);

    return ['All', ...new Set(values)].slice(0, 30);
  }, [streams]);

  const languages = useMemo(() => {
    const values = streams
      .map(getLanguage)
      .filter(Boolean);

    return ['All', ...new Set(values)].slice(0, 30);
  }, [streams]);

  const visibleStreams = useMemo(
    () => streams.filter(streamMatchesFilters),
    [streams, streamMatchesFilters, hiddenIds, followedIds, filters, activeTab, searchQuery]
  );

  const isSearching = Boolean(searchQuery);

  const activeFilterCount = [
    filters.category !== 'All',
    filters.region !== 'All',
    filters.language !== 'All',
    filters.age !== 'All'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  const selectTab = tab => {
    setActiveTab(tab);
    setSearchInput('');
    setSearchQuery('');
  };

  const renderStreamCard = stream => {
    const isHost = currentUserId === stream.host_id;
    const following = followedIds.has(stream.host_id);
    const verified = Boolean(stream.host?.verified_status || stream.host?.is_verified);
    const region = getRegion(stream);
    const language = getLanguage(stream);
    const ageRestricted = isAgeRestricted(stream);
    const battle = hasBattle(stream);
    const coHost = hasCoHost(stream);
    const goal = getGoalValue(stream);
    const thumbnail = stream.thumbnail_url;
    const title = stream.title || 'Live on Made Universe';

    return (
      <article
        key={stream.id}
        className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/30 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => openStream(stream)}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
            {thumbnail && !dataSaver ? (
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/40">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-600/10">
                  <Radio className="text-red-500" size={32} />
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>

              {battle && (
                <span className="rounded-full bg-purple-600/90 px-2 py-1 text-[8px] font-black uppercase">
                  PK
                </span>
              )}

              {ageRestricted && (
                <span className="rounded-full bg-black/80 px-2 py-1 text-[8px] font-black">
                  18+
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1.5 backdrop-blur-md">
                <Eye size={12} className="text-red-400" />
                <span className="text-[9px] font-black">
                  {formatNumber(stream.viewer_count)}
                </span>
              </div>

              {timeAgo(stream.started_at) && (
                <span className="rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold text-zinc-300">
                  {timeAgo(stream.started_at)}
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={event => openProfile(event, stream.host_id)}
                className="relative shrink-0"
              >
                <img
                  src={stream.host?.avatar_url || 'https://via.placeholder.com/96'}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 rounded-full border border-white/10 bg-zinc-900 object-cover"
                />
                {stream.host?.online !== false && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-green-500" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-xs font-black text-white">
                    {stream.host?.username || 'Universe Host'}
                  </h3>

                  {verified && (
                    <ShieldCheck size={13} className="shrink-0 text-blue-400" />
                  )}
                </div>

                <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                  {title}
                </p>
              </div>

              <button
                type="button"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuId(menuId === stream.id ? null : stream.id);
                }}
                className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Stream options"
              >
                <MoreHorizontal size={17} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {stream.category && (
                <span className="rounded-full bg-white/5 px-2 py-1 text-[8px] font-bold uppercase text-zinc-400">
                  {stream.category}
                </span>
              )}

              {region && (
                <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[8px] font-bold text-zinc-400">
                  <Globe2 size={9} />
                  {region}
                </span>
              )}

              {language && (
                <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[8px] font-bold text-zinc-400">
                  <Languages size={9} />
                  {language}
                </span>
              )}

              {coHost && (
                <span className="rounded-full bg-purple-500/10 px-2 py-1 text-[8px] font-bold text-purple-300">
                  Co-host
                </span>
              )}

              {goal > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-[8px] font-bold text-yellow-300">
                  <Heart size={9} />
                  Gift goal
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {isHost ? (
                <button
                  type="button"
                  onClick={event => handleResume(event, stream.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition hover:bg-blue-500 active:scale-95"
                >
                  <Play size={11} fill="currentColor" />
                  Resume
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={event => toggleFollow(event, stream)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition active:scale-95 ${
                      following
                        ? 'bg-white/10 text-white'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    <UserPlus size={11} />
                    {following ? 'Following' : 'Follow'}
                  </button>

                  <button
                    type="button"
                    onClick={event => shareStream(event, stream)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Share live"
                  >
                    <Share2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </button>

        {menuId === stream.id && (
          <div className="absolute right-3 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={event => hideStream(event, stream.id)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[9px] font-bold uppercase text-zinc-300 hover:bg-white/10"
            >
              <Ban size={13} />
              Hide live
            </button>

            <button
              type="button"
              onClick={event => reportStream(event, stream)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[9px] font-bold uppercase text-zinc-300 hover:bg-white/10"
            >
              <ShieldCheck size={13} />
              Report
            </button>

            <button
              type="button"
              onClick={event => shareStream(event, stream)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[9px] font-bold uppercase text-zinc-300 hover:bg-white/10"
            >
              <Share2 size={13} />
              Share
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <style>{`
        @keyframes live-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: .55; transform: scale(.92); }
        }
        .live-dot { animation: live-pulse 1.4s ease-in-out infinite; }
        .live-scrollbar::-webkit-scrollbar { display: none; }
        .live-scrollbar { scrollbar-width: none; }
      `}</style>

      {notice && (
        <div className="fixed left-1/2 top-5 z-[100] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/95 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-2xl backdrop-blur-xl">
          {notice}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <Radio className="shrink-0 text-red-500" size={22} />
              <div>
                <h1 className="text-lg font-black italic tracking-tighter">
                  UNIVERSE <span className="text-red-500">LIVE</span>
                </h1>
                <p className="hidden text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-600 sm:block">
                  Discover active broadcasts
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDataSaver}
                className={`hidden rounded-full border px-3 py-2 text-[8px] font-black uppercase tracking-wider sm:flex ${
                  dataSaver
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : 'border-white/10 bg-white/5 text-zinc-400'
                }`}
              >
                {dataSaver ? 'Data Saver On' : 'Data Saver'}
              </button>

              <button
                type="button"
                onClick={refresh}
                disabled={refreshing || loading}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
                aria-label="Refresh live streams"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/live/go-live')}
                className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest shadow-[0_0_25px_rgba(220,38,38,0.25)] transition hover:bg-red-500 active:scale-95"
              >
                <Video size={13} />
                <span className="hidden sm:inline">Go Live</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3">
            <Search size={16} className="shrink-0 text-zinc-500" />

            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search creators, live titles or categories..."
              className="min-w-0 flex-1 bg-transparent py-3 text-xs text-white outline-none placeholder:text-zinc-600"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                className="text-zinc-500 hover:text-white"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6">
        {offline && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <div>
              <p className="text-[10px] font-black uppercase text-yellow-400">
                You are offline
              </p>
              <p className="mt-1 text-[9px] text-zinc-500">
                Live discovery will reconnect automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="rounded-full bg-yellow-500/10 px-3 py-2 text-[8px] font-black uppercase text-yellow-400"
            >
              Retry
            </button>
          </div>
        )}

        <div className="live-scrollbar flex gap-2 overflow-x-auto pb-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition ${
                  active
                    ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                    : 'border border-white/10 bg-white/5 text-zinc-500 hover:text-white'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="live-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setShowCategories(!showCategories)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
              filters.category !== 'All'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            <Radio size={11} />
            {filters.category === 'All' ? 'Categories' : filters.category}
            <ChevronDown size={11} />
          </button>

          <button
            type="button"
            onClick={() => setShowRegion(!showRegion)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
              filters.region !== 'All'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            <Globe2 size={11} />
            {filters.region === 'All' ? 'Region' : filters.region}
            <ChevronDown size={11} />
          </button>

          <button
            type="button"
            onClick={() => setShowLanguage(!showLanguage)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
              filters.language !== 'All'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            <Languages size={11} />
            {filters.language === 'All' ? 'Language' : filters.language}
            <ChevronDown size={11} />
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
              activeFilterCount
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            <Filter size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[7px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleDataSaver}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black uppercase ${
              dataSaver
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            <Zap size={11} />
            {dataSaver ? 'Saver On' : 'Low Data'}
          </button>
        </div>

        {(showCategories || showRegion || showLanguage || showFilters) && (
          <div className="mt-3 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            {showCategories && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Categories
                  </p>
                  <button type="button" onClick={() => setShowCategories(false)}>
                    <X size={13} className="text-zinc-600" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, category }));
                        setShowCategories(false);
                      }}
                      className={`rounded-full px-3 py-2 text-[8px] font-bold ${
                        filters.category === category
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showRegion && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Regions / Districts
                  </p>
                  <button type="button" onClick={() => setShowRegion(false)}>
                    <X size={13} className="text-zinc-600" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {regions.map(region => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, region }));
                        setShowRegion(false);
                      }}
                      className={`rounded-full px-3 py-2 text-[8px] font-bold ${
                        filters.region === region
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showLanguage && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Languages
                  </p>
                  <button type="button" onClick={() => setShowLanguage(false)}>
                    <X size={13} className="text-zinc-600" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {languages.map(language => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, language }));
                        setShowLanguage(false);
                      }}
                      className={`rounded-full px-3 py-2 text-[8px] font-bold ${
                        filters.language === language
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showFilters && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    Content filters
                  </p>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[8px] font-black uppercase text-red-400"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {['All', 'All ages', '18+'].map(age => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, age }))}
                      className={`rounded-full px-3 py-2 text-[8px] font-bold ${
                        filters.age === age
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-zinc-400'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-500">
              {isSearching ? 'Search results' : activeTab}
            </p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {visibleStreams.length} live broadcast{visibleStreams.length === 1 ? '' : 's'}
            </p>
          </div>

          {dataSaver && (
            <div className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1.5 text-[8px] font-black uppercase text-green-400">
              <Zap size={10} />
              Low data
            </div>
          )}
        </div>

        {error && !loading && (
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <Video size={34} className="mx-auto text-red-500/60" />
            <h2 className="mt-4 text-sm font-black uppercase">
              Live discovery unavailable
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-zinc-500">
              {error}
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-5 rounded-full bg-red-600 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : !error && visibleStreams.length > 0 ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visibleStreams.map(renderStreamCard)}
            </div>

            <div ref={bottomRef} className="flex min-h-24 items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                  <RefreshCw size={12} className="animate-spin" />
                  Loading more lives
                </div>
              )}

              {!hasMore && visibleStreams.length > 0 && (
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-800">
                  You reached the end
                </p>
              )}
            </div>
          </>
        ) : !error ? (
          <div className="mt-6 rounded-[32px] border border-white/5 bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-white/[0.03]">
              {isSearching ? (
                <Search size={30} className="text-zinc-700" />
              ) : (
                <Radio size={30} className="text-zinc-700" />
              )}
            </div>

            <h2 className="mt-5 text-sm font-black uppercase tracking-wide text-zinc-300">
              {isSearching ? 'No live results' : 'No active lives'}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-[10px] leading-5 text-zinc-600">
              {isSearching
                ? 'Try another creator name, title, category, or clear your filters.'
                : activeTab === 'following'
                  ? 'Creators you follow are not live right now.'
                  : 'There are no public live broadcasts matching your current filters.'}
            </p>

            <div className="mt-5 flex justify-center gap-2">
              {(isSearching || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    clearFilters();
                    setActiveTab('recommended');
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-300"
                >
                  Clear search
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/live/go-live')}
                className="rounded-full bg-red-600 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest"
              >
                Go Live
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default StreamDiscovery;
