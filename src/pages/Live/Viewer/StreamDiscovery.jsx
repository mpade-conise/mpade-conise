import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronDown,
  Copy,
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
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wifi,
  X,
  Zap
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const PAGE_SIZE = 18;
const HIDDEN_KEY = 'made-universe-hidden-live-streams';

const tabs = [
  { id: 'recommended', label: 'Recommended', icon: Sparkles },
  { id: 'following', label: 'Following', icon: Heart },
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'popular', label: 'Popular', icon: Trophy },
  { id: 'new', label: 'New', icon: Zap }
];

const readHiddenStreams = () => {
  try {
    const value = localStorage.getItem(HIDDEN_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHiddenStreams = ids => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  } catch {}
};

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

const getRegion = stream => {
  const settings = getSettings(stream);
  return stream?.region || stream?.district || settings.region || settings.district || settings.location || '';
};

const getLanguage = stream => {
  const settings = getSettings(stream);
  return stream?.language || settings.language || settings.languages || '';
};

const isAgeRestricted = stream => {
  const settings = getSettings(stream);
  return Boolean(
    stream?.age_restricted ||
    stream?.is_age_restricted ||
    settings.age_restricted ||
    settings.ageRestricted ||
    settings.age_limit
  );
};

const isBattleActive = stream => {
  const settings = getSettings(stream);
  return Boolean(
    settings.battle_active ||
    settings.battleActive ||
    settings.pk_active ||
    settings.pkActive ||
    stream?.battle_active
  );
};

const hasGiftGoal = stream => {
  return Number(stream?.gift_goal_total || stream?.goal?.total || 0) > 0;
};

const getStreamDate = stream => {
  const value = stream?.started_at || stream?.created_at;
  const date = value ? new Date(value).getTime() : 0;
  return Number.isFinite(date) ? date : 0;
};

const formatNumber = value => {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toString();
};

const formatStarted = value => {
  if (!value) return '';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just started';
  if (minutes < 60) return `${minutes}m live`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h live`;
  return `${Math.floor(hours / 24)}d live`;
};

const getScore = stream => {
  const viewers = Number(stream?.viewer_count || 0);
  const peak = Number(stream?.peak_viewers || 0);
  const likes = Number(stream?.likes || 0);
  const gifts = Number(stream?.gifts_count || stream?.total_gifts || 0);
  const ageMinutes = Math.max(1, (Date.now() - getStreamDate(stream)) / 60000);
  const growth = viewers / ageMinutes;

  return viewers * 4 + peak * 1.5 + likes * 0.25 + gifts * 3 + growth * 12;
};

const StreamDiscovery = () => {
  const navigate = useNavigate();

  const [streams, setStreams] = useState([]);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeTab, setActiveTab] = useState('recommended');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [hiddenIds, setHiddenIds] = useState(() => new Set(readHiddenStreams()));
  const [menuId, setMenuId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const realtimeChannelRef = useRef(null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const followedIdsRef = useRef(new Set());
  const filtersRef = useRef({});
  const requestRef = useRef(0);

  const fetchProfiles = useCallback(async hostIds => {
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

  const mergeProfiles = useCallback(async rows => {
    const profiles = await fetchProfiles(rows.map(row => row.host_id));

    return rows.map(row => ({
      ...row,
      host: profiles[row.host_id] || {
        id: row.host_id,
        username: 'Universe Host',
        avatar_url: null,
        verified_status: false,
        is_verified: false,
        online: true
      }
    }));
  }, [fetchProfiles]);

  const loadFollowing = useCallback(async userId => {
    if (!userId) {
      followedIdsRef.current = new Set();
      setFollowedIds(new Set());
      return;
    }

    try {
      const { data, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followError) throw followError;

      const ids = new Set((data || []).map(row => row.following_id).filter(Boolean));
      followedIdsRef.current = ids;
      setFollowedIds(ids);
    } catch (err) {
      console.warn('Following feed unavailable:', err.message);
      followedIdsRef.current = new Set();
      setFollowedIds(new Set());
    }
  }, []);

  const getMatches = useCallback((stream, options = {}) => {
    const currentCategory = options.category ?? filtersRef.current.category;
    const currentRegion = options.region ?? filtersRef.current.region;
    const currentLanguage = options.language ?? filtersRef.current.language;
    const currentSearch = options.search ?? filtersRef.current.search;
    const currentTab = options.tab ?? filtersRef.current.tab;

    if (!stream || stream.status !== 'live') return false;
    if (hiddenIds.has(stream.id)) return false;

    const streamRegion = normalize(getRegion(stream));
    const streamLanguage = normalize(getLanguage(stream));
    const streamCategory = normalize(stream.category);
    const username = normalize(stream.host?.username);
    const title = normalize(stream.title);

    if (currentCategory && streamCategory !== normalize(currentCategory)) return false;
    if (currentRegion && !streamRegion.includes(normalize(currentRegion))) return false;
    if (currentLanguage && !streamLanguage.includes(normalize(currentLanguage))) return false;

    if (currentSearch) {
      const query = normalize(currentSearch);
      if (!username.includes(query) && !title.includes(query) && !streamCategory.includes(query)) return false;
    }

    if (currentTab === 'following' && !followedIdsRef.current.has(stream.host_id)) return false;

    return true;
  }, [hiddenIds]);

  const loadStreams = useCallback(async (requestedPage = 0, append = false) => {
    const requestId = ++requestRef.current;

    if (append) {
      if (loadingRef.current) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError('');
    }

    loadingRef.current = true;

    try {
      const from = requestedPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .range(from, to);

      if (streamError) throw streamError;
      if (!mountedRef.current || requestId !== requestRef.current) return;

      const rows = await mergeProfiles(data || []);
      if (!mountedRef.current || requestId !== requestRef.current) return;

      setStreams(prev => {
        if (!append) return rows;

        const map = new Map(prev.map(item => [item.id, item]));
        rows.forEach(item => {
          const existing = map.get(item.id);
          map.set(item.id, { ...existing, ...item, host: item.host || existing?.host });
        });

        return [...map.values()];
      });

      setHasMore((data || []).length === PAGE_SIZE);
      setError('');
    } catch (err) {
      if (!mountedRef.current || requestId !== requestRef.current) return;

      console.error('Universe live discovery error:', err.message);
      setError(err.message || 'Unable to load live streams.');
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }
  }, [mergeProfiles]);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!mountedRef.current) return;

        setCurrentUserId(user?.id || null);

        if (user?.id) await loadFollowing(user.id);
        await loadStreams(0, false);
      } catch (err) {
        if (mountedRef.current) {
          setLoading(false);
          setError(err.message || 'Unable to initialize Live Discovery.');
        }
      }
    };

    init();

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadFollowing, loadStreams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    filtersRef.current = {
      tab: activeTab,
      category,
      region,
      language,
      search: searchQuery
    };
  }, [activeTab, category, region, language, searchQuery]);

  useEffect(() => {
    setPage(0);
    loadStreams(0, false);
  }, [activeTab, category, region, language, loadStreams]);

  useEffect(() => {
    if (activeTab !== 'following') return;
    loadStreams(0, false);
  }, [followedIds, activeTab, loadStreams]);

  useEffect(() => {
    if (!searchQuery) return;

    filtersRef.current.search = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    const channelName = `public-live-stream-discovery-${Math.random().toString(36).slice(2)}`;

    realtimeChannelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams'
        },
        async payload => {
          if (!mountedRef.current) return;

          const event = payload.event || payload.eventType;

          if (event === 'INSERT') {
            if (payload.new?.status !== 'live') return;

            const profileMap = await fetchProfiles([payload.new.host_id]);
            const incoming = {
              ...payload.new,
              host: profileMap[payload.new.host_id] || {
                id: payload.new.host_id,
                username: 'Universe Host',
                avatar_url: null,
                verified_status: false,
                is_verified: false,
                online: true
              }
            };

            if (!getMatches(incoming)) return;

            setStreams(prev => {
              if (prev.some(stream => stream.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
          }

          if (event === 'UPDATE') {
            const updated = payload.new;

            if (!updated?.id) return;

            if (updated.status !== 'live') {
              setStreams(prev => prev.filter(stream => stream.id !== updated.id));
              return;
            }

            setStreams(prev => {
              const existing = prev.find(stream => stream.id === updated.id);

              if (!existing) {
                if (!getMatches(updated)) return prev;

                fetchProfiles([updated.host_id]).then(profileMap => {
                  if (!mountedRef.current) return;

                  const incoming = {
                    ...updated,
                    host: profileMap[updated.host_id] || {
                      id: updated.host_id,
                      username: 'Universe Host',
                      avatar_url: null,
                      verified_status: false,
                      is_verified: false,
                      online: true
                    }
                  };

                  if (!getMatches(incoming)) return;

                  setStreams(current => {
                    if (current.some(stream => stream.id === incoming.id)) return current;
                    return [incoming, ...current];
                  });
                });

                return prev;
              }

              const merged = { ...existing, ...updated, host: existing.host };

              if (!getMatches(merged)) {
                return prev.filter(stream => stream.id !== updated.id);
              }

              return prev.map(stream => stream.id === updated.id ? merged : stream);
            });
          }

          if (event === 'DELETE') {
            const deletedId = payload.old?.id;
            if (!deletedId) return;
            setStreams(prev => prev.filter(stream => stream.id !== deletedId));
          }
        }
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Live discovery realtime channel error.');
        }
      });

    return () => {
      const channel = realtimeChannelRef.current;
      realtimeChannelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchProfiles, getMatches]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700;

      if (nearBottom) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadStreams(nextPage, true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loading, loadingMore, hasMore, loadStreams]);

  const categories = useMemo(() => {
    const values = streams
      .map(stream => stream.category)
      .filter(Boolean)
      .map(value => String(value).trim());

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [streams]);

  const regions = useMemo(() => {
    const values = streams
      .map(getRegion)
      .filter(Boolean)
      .map(value => String(value).trim());

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [streams]);

  const languages = useMemo(() => {
    const values = streams
      .map(getLanguage)
      .filter(Boolean)
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [streams]);

  const visibleStreams = useMemo(() => {
    let result = streams.filter(stream =>
      getMatches(stream, {
        tab: activeTab,
        category,
        region,
        language,
        search: searchQuery
      })
    );

    if (activeTab === 'trending') {
      result.sort((a, b) => getScore(b) - getScore(a));
    } else if (activeTab === 'popular') {
      result.sort((a, b) => Number(b.viewer_count || 0) - Number(a.viewer_count || 0));
    } else if (activeTab === 'new') {
      result.sort((a, b) => getStreamDate(b) - getStreamDate(a));
    } else if (activeTab === 'recommended') {
      result.sort((a, b) => {
        const aFollowed = followedIds.has(a.host_id) ? 1 : 0;
        const bFollowed = followedIds.has(b.host_id) ? 1 : 0;
        return bFollowed - aFollowed || getScore(b) - getScore(a);
      });
    }

    return result;
  }, [
    streams,
    activeTab,
    category,
    region,
    language,
    searchQuery,
    followedIds,
    getMatches
  ]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setPage(0);

    try {
      await loadStreams(0, false);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  const handleHide = id => {
    const next = new Set(hiddenIds);
    next.add(id);

    setHiddenIds(next);
    saveHiddenStreams([...next]);
    setMenuId(null);
    setStreams(prev => prev.filter(stream => stream.id !== id));
  };

  const handleShare = async stream => {
    const url = `${window.location.origin}/live/watch/${stream.id}`;
    const title = stream.title || `${stream.host?.username || 'Universe Host'} is live`;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Watch ${title} on Made Universe`,
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiedId(stream.id);
        setTimeout(() => {
          if (mountedRef.current) setCopiedId(null);
        }, 1800);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('Share failed:', err.message);
    }

    setMenuId(null);
  };

  const handleCopyLink = async stream => {
    const url = `${window.location.origin}/live/watch/${stream.id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(stream.id);

      setTimeout(() => {
        if (mountedRef.current) setCopiedId(null);
      }, 1800);
    } catch (err) {
      console.warn('Copy failed:', err.message);
    }

    setMenuId(null);
  };

  const handleFollow = async (event, stream) => {
    event.stopPropagation();

    if (!currentUserId || followingLoading === stream.host_id || currentUserId === stream.host_id) return;

    setFollowingLoading(stream.host_id);

    const isFollowing = followedIdsRef.current.has(stream.host_id);

    try {
      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', stream.host_id);

        if (deleteError) throw deleteError;

        const next = new Set(followedIdsRef.current);
        next.delete(stream.host_id);
        followedIdsRef.current = next;
        setFollowedIds(next);
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: stream.host_id
          });

        if (insertError) throw insertError;

        const next = new Set(followedIdsRef.current);
        next.add(stream.host_id);
        followedIdsRef.current = next;
        setFollowedIds(next);
      }
    } catch (err) {
      console.error('Follow action failed:', err.message);
    } finally {
      if (mountedRef.current) setFollowingLoading(null);
    }
  };

  const handleReport = stream => {
    setMenuId(null);

    const reason = window.prompt(
      `Report ${stream.host?.username || 'this live stream'}.\nEnter a reason:`
    );

    if (reason?.trim()) {
      console.warn('Live report requested:', {
        stream_id: stream.id,
        reason: reason.trim()
      });
      window.alert('Thank you. Your report has been recorded locally for review.');
    }
  };

  const handleStreamClick = stream => {
    if (currentUserId === stream.host_id) {
      navigate(`/live/dashboard/${stream.id}`);
      return;
    }

    navigate(`/live/watch/${stream.id}`);
  };

  const clearFilters = () => {
    setCategory('');
    setRegion('');
    setLanguage('');
  };

  const hasFilters = Boolean(category || region || language);

  const isVerified = profile =>
    Boolean(profile?.is_verified || profile?.verified_status === true || profile?.verified_status === 'verified');

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] animate-pulse">
          <div className="aspect-[16/10] bg-white/[0.06]" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
            <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24">
      <style>{`
        @keyframes live-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.65; transform:scale(.92); }
        }
        .live-dot { animation:live-pulse 1.5s ease-in-out infinite; }
        .glass { background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.07); backdrop-filter:blur(16px); }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2 min-w-fit">
              <Radio size={21} className="text-red-500" />
              <div>
                <h1 className="font-black tracking-tight text-lg leading-none">
                  UNIVERSE <span className="text-red-500">LIVE</span>
                </h1>
                <p className="hidden sm:block text-[9px] text-zinc-500 uppercase tracking-[.2em] mt-1">
                  Discover active broadcasts
                </p>
              </div>
            </div>

            <div className="relative flex-1 max-w-2xl mx-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search creators, live titles or categories..."
                className="w-full h-11 rounded-2xl bg-white/[0.05] border border-white/[0.07] pl-11 pr-10 outline-none text-sm placeholder:text-zinc-600 focus:border-red-500/40 transition"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="hidden sm:flex w-10 h-10 rounded-full glass items-center justify-center hover:bg-white/10 transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/live/go-live')}
              className="h-10 px-4 sm:px-5 rounded-full bg-red-600 hover:bg-red-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition active:scale-95"
            >
              <Video size={14} />
              <span className="hidden sm:inline">Go Live</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6">
        {offline && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-300">
            <Wifi size={15} />
            You're offline. Showing the latest available live streams.
          </div>
        )}

        <section className="pt-7">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
                    active
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
            <button
              type="button"
              onClick={() => setShowFilters(value => !value)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition ${
                showFilters || hasFilters
                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasFilters && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]">
                  {[category, region, language].filter(Boolean).length}
                </span>
              )}
            </button>

            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-white/[0.04] border border-white/10 text-zinc-300 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
            >
              <option value="">All categories</option>
              {categories.map(item => <option key={item} value={item}>{item}</option>)}
            </select>

            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="bg-white/[0.04] border border-white/10 text-zinc-300 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
            >
              <option value="">All regions</option>
              {regions.map(item => <option key={item} value={item}>{item}</option>)}
            </select>

            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-white/[0.04] border border-white/10 text-zinc-300 rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
            >
              <option value="">All languages</option>
              {languages.map(item => <option key={item} value={item}>{item}</option>)}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10"
              >
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 glass rounded-2xl p-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase">
                <Filter size={14} />
                Discovery filters
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                <Globe2 size={13} />
                Region
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                <Languages size={13} />
                Language
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                <BadgeCheck size={13} />
                Verified creators are highlighted
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-[10px]">
                <Wifi size={13} />
                Discovery uses lightweight previews
              </div>
            </div>
          )}
        </section>

        <section className="pt-7">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {searchQuery ? `Results for "${searchQuery}"` : tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                {searchQuery && <Search size={17} className="text-red-500" />}
              </div>

              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[.18em] mt-1">
                {visibleStreams.length} active broadcast{visibleStreams.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[9px] text-zinc-600 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              Live updates enabled
            </div>
          </div>

          {loading && renderSkeletons()}

          {!loading && error && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.04] p-10 text-center">
              <Radio size={40} className="mx-auto text-red-500/60 mb-4" />
              <h3 className="font-black text-lg">Live Discovery unavailable</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={() => loadStreams(0, false)}
                className="mt-5 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase tracking-widest"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && visibleStreams.length === 0 && (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-16 text-center">
              {searchQuery ? (
                <>
                  <Search size={42} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="font-black text-lg">No live results</h3>
                  <p className="text-sm text-zinc-600 mt-2">Try another creator, title or category.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest"
                  >
                    Clear search
                  </button>
                </>
              ) : activeTab === 'following' ? (
                <>
                  <Heart size={42} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="font-black text-lg">No followed creators are live</h3>
                  <p className="text-sm text-zinc-600 mt-2">Discover other live creators while you wait.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('recommended')}
                    className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest"
                  >
                    Discover lives
                  </button>
                </>
              ) : (
                <>
                  <Video size={42} className="mx-auto text-zinc-800 mb-4" />
                  <h3 className="font-black text-lg">No active lives found</h3>
                  <p className="text-sm text-zinc-600 mt-2">There are no broadcasts matching these filters right now.</p>
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-5 px-5 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {!loading && !error && visibleStreams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visibleStreams.map(stream => {
                const isHost = currentUserId === stream.host_id;
                const verified = isVerified(stream.host);
                const regionName = getRegion(stream);
                const languageName = getLanguage(stream);
                const battle = isBattleActive(stream);
                const giftGoal = hasGiftGoal(stream);
                const ageRestricted = isAgeRestricted(stream);
                const followed = followedIds.has(stream.host_id);
                const thumbnail = stream.thumbnail_url;

                return (
                  <article
                    key={stream.id}
                    className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0b0b] hover:border-white/[0.14] transition-all duration-300"
                  >
                    <button
                      type="button"
                      onClick={() => handleStreamClick(stream)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={stream.title || 'Live stream'}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950/30">
                            <Radio size={40} className="text-zinc-700" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-lg text-[8px] font-black tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" />
                            LIVE
                          </span>

                          {ageRestricted && (
                            <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur text-[8px] font-black text-yellow-300">
                              18+
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          {battle && (
                            <span className="px-2 py-1 rounded-lg bg-purple-600/90 text-[8px] font-black uppercase">
                              PK Battle
                            </span>
                          )}

                          {giftGoal && (
                            <span className="px-2 py-1 rounded-lg bg-yellow-500/90 text-black text-[8px] font-black uppercase">
                              Gift Goal
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-white">
                            <Eye size={13} />
                            {formatNumber(stream.viewer_count)} watching
                          </span>

                          <span className="text-[9px] text-zinc-300 font-bold">
                            {formatStarted(stream.started_at)}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={stream.host?.avatar_url || 'https://via.placeholder.com/100'}
                              alt=""
                              loading="lazy"
                              className="w-11 h-11 rounded-full object-cover border border-white/10 bg-zinc-900"
                            />

                            {stream.host?.online !== false && (
                              <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0b0b0b]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-black text-sm truncate">
                                {stream.host?.username || 'Universe Host'}
                              </h3>

                              {verified && <BadgeCheck size={14} className="shrink-0 text-blue-400 fill-blue-400/10" />}
                            </div>

                            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                              {stream.title || 'Live on Made Universe'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {stream.category && (
                            <span className="px-2 py-1 rounded-lg bg-white/[0.05] text-[8px] font-bold text-zinc-400 uppercase truncate max-w-[130px]">
                              {stream.category}
                            </span>
                          )}

                          {regionName && (
                            <span className="px-2 py-1 rounded-lg bg-white/[0.05] text-[8px] font-bold text-zinc-500 truncate max-w-[120px]">
                              {regionName}
                            </span>
                          )}

                          {languageName && (
                            <span className="px-2 py-1 rounded-lg bg-white/[0.05] text-[8px] font-bold text-zinc-500 truncate max-w-[100px]">
                              {languageName}
                            </span>
                          )}

                          {stream.co_host_id && (
                            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-[8px] font-bold text-blue-400">
                              CO-HOST
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="px-4 pb-4 flex items-center gap-2">
                      {isHost ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/live/dashboard/${stream.id}`);
                          }}
                          className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition"
                        >
                          <Play size={12} fill="currentColor" />
                          Resume
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={e => handleFollow(e, stream)}
                            disabled={followingLoading === stream.host_id}
                            className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition ${
                              followed
                                ? 'bg-white/[0.07] text-white'
                                : 'bg-red-600 hover:bg-red-500'
                            }`}
                          >
                            {followed ? <Heart size={12} fill="currentColor" /> : <UserPlus size={12} />}
                            {followed ? 'Following' : 'Follow'}
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleShare(stream);
                            }}
                            className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition"
                            title="Share"
                          >
                            <Share2 size={14} />
                          </button>
                        </>
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setMenuId(menuId === stream.id ? null : stream.id);
                          }}
                          className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition"
                          title="More"
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {menuId === stream.id && (
                          <div className="absolute right-0 bottom-11 z-30 w-44 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl p-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(stream)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[10px] font-bold text-zinc-300 hover:bg-white/10"
                            >
                              <Copy size={14} />
                              {copiedId === stream.id ? 'Copied' : 'Copy link'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShare(stream)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[10px] font-bold text-zinc-300 hover:bg-white/10"
                            >
                              <Share2 size={14} />
                              Share live
                            </button>

                            <button
                              type="button"
                              onClick={() => handleHide(stream.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[10px] font-bold text-zinc-300 hover:bg-white/10"
                            >
                              <X size={14} />
                              Hide live
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReport(stream)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[10px] font-bold text-red-400 hover:bg-red-500/10"
                            >
                              <Bell size={14} />
                              Report live
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {loadingMore && (
            <div className="flex justify-center py-10">
              <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <RefreshCw size={15} className="animate-spin" />
                Loading more lives
              </div>
            </div>
          )}

          {!loading && !loadingMore && visibleStreams.length > 0 && !hasMore && (
            <div className="py-12 text-center text-[9px] text-zinc-700 font-black uppercase tracking-[.25em]">
              You've reached the end of live broadcasts
            </div>
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={handleRefresh}
        className="fixed bottom-6 right-5 sm:hidden z-30 w-12 h-12 rounded-full bg-red-600 shadow-[0_10px_35px_rgba(220,38,38,.35)] flex items-center justify-center"
        aria-label="Refresh live streams"
      >
        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default StreamDiscovery;
