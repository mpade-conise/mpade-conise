import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, TrendingUp, Hash, Play, Loader2, RefreshCw, Flame, Clock3, Music2, Gamepad2, Newspaper, X, Share2, Bookmark, BookmarkCheck, Flag, Eye, Heart, MessageCircle, Radio, UserRound, BadgeCheck, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 18;
const SEARCH_DELAY = 350;

const TABS = [
  { id: 'For You', icon: TrendingUp },
  { id: 'Trending', icon: Flame },
  { id: 'New', icon: Clock3 },
  { id: 'Music', icon: Music2 },
  { id: 'News', icon: Newspaper },
  { id: 'Gaming', icon: Gamepad2 }
];

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatCount = (value) => {
  const number = safeNumber(value);

  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;

  return number.toString();
};

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

const extractHashtags = (text = '') => {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
};

const getCategory = (video) => {
  return String(video?.category || '').trim().toLowerCase();
};

const isVideoPrivate = (video) => {
  return video?.is_private === true;
};

const getEngagementScore = (video) => {
  const likes = safeNumber(video?.likes_count);
  const comments = safeNumber(video?.comments_count);
  const views = safeNumber(video?.views);

  return likes * 4 + comments * 7 + Math.log10(views + 1) * 10;
};

const getTrendingScore = (video) => {
  const likes = safeNumber(video?.likes_count);
  const comments = safeNumber(video?.comments_count);
  const views = safeNumber(video?.views);

  const createdAt = video?.created_at ? new Date(video.created_at).getTime() : 0;
  const ageHours = createdAt ? Math.max(1, (Date.now() - createdAt) / 3600000) : 168;

  const engagement = likes * 4 + comments * 8 + Math.log10(views + 1) * 12;
  const freshness = Math.max(0.1, 72 / ageHours);

  return engagement * freshness;
};

const DiscoverySkeleton = () => {
  return (
    <div className="px-4 pb-12">
      <div className="flex gap-3 overflow-hidden mt-5">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="min-w-[150px] h-52 rounded-2xl bg-zinc-900 animate-pulse border border-white/5" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="aspect-[10/14] rounded-2xl bg-zinc-900 animate-pulse border border-white/5" />
        ))}
      </div>
    </div>
  );
};

const VideoPreview = ({ video, onClick, isSaved, onSave, onShare, onReport, onHide }) => {
  const videoRef = useRef(null);
  const observerRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const username = video?.profiles?.username || 'User';
  const avatar = video?.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;

        setIsVisible(visible);

        if (visible) {
          element.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            setIsPlaying(false);
          });
        } else {
          element.pause();
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.35, 0.7] }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (!isVisible) {
      element.pause();
      setIsPlaying(false);
    }
  }, [isVisible]);

  const handleVideoError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative aspect-[10/14] bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 group cursor-pointer shadow-xl hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all duration-300"
      onClick={() => onClick(video.id)}
    >
      {!hasError ? (
        <video
          ref={videoRef}
          src={video.video_url}
          muted
          loop
          playsInline
          preload="metadata"
          onError={handleVideoError}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500">
          <WifiOff size={24} />
          <span className="text-[9px] uppercase tracking-widest mt-2">Unavailable</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

      {isPlaying && (
        <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
          <Play size={11} fill="currentColor" />
        </div>
      )}

      {video?.profiles?.verified_status === true || video?.profiles?.is_verified === true ? (
        <div className="absolute top-3 right-3 bg-cyan-500 text-black rounded-full p-1 shadow-lg shadow-cyan-500/30">
          <BadgeCheck size={13} />
        </div>
      ) : null}

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={avatar}
            alt=""
            loading="lazy"
            className="w-6 h-6 rounded-full object-cover border border-cyan-400/50 bg-zinc-800"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-white truncate">
                @{username}
              </span>

              {video?.profiles?.online === true && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] shrink-0" />
              )}
            </div>

            <span className="text-[8px] text-zinc-400">
              {formatDate(video?.created_at)}
            </span>
          </div>
        </div>

        {video?.caption && (
          <p className="text-[10px] font-semibold text-white line-clamp-2 leading-tight mb-2">
            {video.caption}
          </p>
        )}

        <div className="flex items-center gap-3 text-[9px] text-zinc-300">
          <span className="flex items-center gap-1">
            <Heart size={11} />
            {formatCount(video?.likes_count)}
          </span>

          <span className="flex items-center gap-1">
            <MessageCircle size={11} />
            {formatCount(video?.comments_count)}
          </span>

          <span className="flex items-center gap-1">
            <Eye size={11} />
            {formatCount(video?.views)}
          </span>
        </div>
      </div>

      <div
        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          <button
            type="button"
            title={isSaved ? 'Remove from saved' : 'Save video'}
            onClick={() => onSave(video.id)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-colors"
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>

          <button
            type="button"
            title="Share"
            onClick={() => onShare(video)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-colors"
          >
            <Share2 size={14} />
          </button>

          <button
            type="button"
            title="Report"
            onClick={() => onReport(video)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <Flag size={13} />
          </button>

          <button
            type="button"
            title="Not interested"
            onClick={() => onHide(video.id)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Discovery = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('For You');
  const [hasMore, setHasMore] = useState(true);
  const [savedVideos, setSavedVideos] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('made_universe_saved_videos') || '[]');
    } catch {
      return [];
    }
  });
  const [hiddenVideos, setHiddenVideos] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('made_universe_hidden_videos') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedHashtag, setSelectedHashtag] = useState('');

  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const observerRef = useRef(null);
  const loadMoreTriggerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      observerRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DELAY);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchVideos = useCallback(async ({ reset = false, refresh = false } = {}) => {
    if (loadingRef.current) return;

    loadingRef.current = true;

    if (reset) {
      setLoading(true);
      pageRef.current = 0;
    } else {
      setLoadingMore(true);
    }

    if (refresh) {
      setRefreshing(true);
    }

    setError('');

    try {
      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('videos')
        .select(`
          id,
          created_at,
          video_url,
          caption,
          music_name,
          music_url,
          category,
          user_id,
          is_private,
          views,
          likes_count,
          comments_count,
          profiles (
            id,
            username,
            avatar_url,
            verified_status,
            is_verified,
            online
          )
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (!mountedRef.current) return;

      const incoming = (data || []).filter((video) => {
        if (!video?.id || !video?.video_url) return false;
        if (hiddenVideos.includes(video.id)) return false;
        return !isVideoPrivate(video);
      });

      setVideos((previous) => {
        if (reset) return incoming;

        const existingIds = new Set(previous.map((video) => video.id));
        const uniqueIncoming = incoming.filter((video) => !existingIds.has(video.id));

        return [...previous, ...uniqueIncoming];
      });

      setHasMore((data || []).length === PAGE_SIZE);

      if ((data || []).length > 0) {
        pageRef.current += 1;
      }
    } catch (fetchError) {
      console.error('Discovery fetch error:', fetchError);

      if (mountedRef.current) {
        setError(fetchError?.message || 'Unable to load discovery content.');
      }
    } finally {
      loadingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [hiddenVideos]);

  useEffect(() => {
    fetchVideos({ reset: true });
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    const query = debouncedSearch.toLowerCase();

    if (query) {
      result = result.filter((video) => {
        const caption = String(video?.caption || '').toLowerCase();
        const username = String(video?.profiles?.username || '').toLowerCase();
        const category = String(video?.category || '').toLowerCase();
        const music = String(video?.music_name || '').toLowerCase();

        return (
          caption.includes(query) ||
          username.includes(query) ||
          category.includes(query) ||
          music.includes(query)
        );
      });
    }

    if (selectedHashtag) {
      result = result.filter((video) =>
        extractHashtags(video?.caption || '').includes(selectedHashtag)
      );
    }

    if (activeTab === 'Trending') {
      result.sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
    }

    if (activeTab === 'New') {
      result.sort((a, b) => {
        const aDate = new Date(a?.created_at || 0).getTime();
        const bDate = new Date(b?.created_at || 0).getTime();
        return bDate - aDate;
      });
    }

    if (activeTab === 'Music') {
      result = result.filter((video) => {
        const category = getCategory(video);
        return (
          Boolean(video?.music_name) ||
          Boolean(video?.music_url) ||
          category === 'music'
        );
      });
    }

    if (activeTab === 'News') {
      result = result.filter((video) => {
        const category = getCategory(video);
        const caption = String(video?.caption || '').toLowerCase();

        return (
          category === 'news' ||
          caption.includes('news') ||
          caption.includes('#news')
        );
      });
    }

    if (activeTab === 'Gaming') {
      result = result.filter((video) => {
        const category = getCategory(video);
        const caption = String(video?.caption || '').toLowerCase();

        return (
          category === 'gaming' ||
          category === 'game' ||
          caption.includes('gaming') ||
          caption.includes('#gaming')
        );
      });
    }

    if (activeTab === 'For You') {
      result.sort((a, b) => {
        const aScore = getEngagementScore(a);
        const bScore = getEngagementScore(b);

        if (aScore === bScore) {
          const aDate = new Date(a?.created_at || 0).getTime();
          const bDate = new Date(b?.created_at || 0).getTime();
          return bDate - aDate;
        }

        return bScore - aScore;
      });
    }

    return result;
  }, [videos, debouncedSearch, activeTab, selectedHashtag]);

  const trendingVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => getTrendingScore(b) - getTrendingScore(a))
      .slice(0, 8);
  }, [videos]);

  const hashtags = useMemo(() => {
    const counts = new Map();

    videos.forEach((video) => {
      extractHashtags(video?.caption || '').forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [videos]);

  const popularCreators = useMemo(() => {
    const creatorMap = new Map();

    videos.forEach((video) => {
      const profile = video?.profiles;
      if (!profile?.id) return;

      const current = creatorMap.get(profile.id) || {
        ...profile,
        likes: 0,
        views: 0,
        videos: 0
      };

      current.likes += safeNumber(video?.likes_count);
      current.views += safeNumber(video?.views);
      current.videos += 1;

      creatorMap.set(profile.id, current);
    });

    return [...creatorMap.values()]
      .sort((a, b) => {
        const aScore = a.likes * 4 + Math.log10(a.views + 1) * 10;
        const bScore = b.likes * 4 + Math.log10(b.views + 1) * 10;
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [videos]);

  const handleVideoClick = useCallback((videoId) => {
    navigate('/', { state: { scrollToId: videoId } });
  }, [navigate]);

  const handleRefresh = async () => {
    await fetchVideos({ reset: true, refresh: true });
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    fetchVideos();
  }, [fetchVideos, hasMore]);

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '500px',
        threshold: 0
      }
    );

    observerRef.current.observe(trigger);

    return () => observerRef.current?.disconnect();
  }, [handleLoadMore]);

  const handleSave = (videoId) => {
    setSavedVideos((previous) => {
      const exists = previous.includes(videoId);

      const next = exists
        ? previous.filter((id) => id !== videoId)
        : [...previous, videoId];

      try {
        sessionStorage.setItem('made_universe_saved_videos', JSON.stringify(next));
      } catch {}

      return next;
    });
  };

  const handleHide = (videoId) => {
    setHiddenVideos((previous) => {
      const next = [...new Set([...previous, videoId])];

      try {
        sessionStorage.setItem('made_universe_hidden_videos', JSON.stringify(next));
      } catch {}

      return next;
    });

    setVideos((previous) => previous.filter((video) => video.id !== videoId));
  };

  const handleShare = async (video) => {
    const shareUrl = `${window.location.origin}/?video=${encodeURIComponent(video.id)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video?.caption || 'Made Universe video',
          text: `Check out this video on Made Universe`,
          url: shareUrl
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        console.warn('Share failed:', shareError);
      }
    }
  };

  const handleReport = (video) => {
    const reason = window.prompt(
      'Why are you reporting this video?\n\nEnter a short reason:'
    );

    if (!reason?.trim()) return;

    console.log('Video report submitted:', {
      videoId: video.id,
      reason: reason.trim()
    });

    window.alert('Thank you. The report has been recorded for review.');
  };

  const handleHashtag = (tag) => {
    setSelectedHashtag((current) => current === tag ? '' : tag);
    setSearchQuery('');
  };

  const handleCreatorClick = (creator) => {
    if (!creator?.username) return;

    navigate(`/profile/${creator.username}`);
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      <div className="shrink-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative group flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 group-focus-within:text-fuchsia-400 transition-colors"
                size={18}
              />

              <input
                type="text"
                placeholder="Search videos, creators, music..."
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 pl-12 pr-10 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 transition-all text-sm text-white placeholder-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh discovery"
              className="w-11 h-11 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center hover:border-cyan-500/50 transition-all disabled:opacity-50"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin text-cyan-400' : 'text-zinc-300'} />
            </button>
          </div>

          {(debouncedSearch || selectedHashtag) && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
                Filtering
              </span>

              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-bold"
                >
                  "{debouncedSearch}"
                  <X size={11} />
                </button>
              )}

              {selectedHashtag && (
                <button
                  type="button"
                  onClick={() => setSelectedHashtag('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-[9px] font-bold"
                >
                  {selectedHashtag}
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto mt-4 pb-1 [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedHashtag('');
                  }}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                    active
                      ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon size={12} />
                  {tab.id}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {loading ? (
          <DiscoverySkeleton />
        ) : error && videos.length === 0 ? (
          <div className="h-[65vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <WifiOff size={25} className="text-red-400" />
            </div>

            <h2 className="font-black text-sm uppercase tracking-widest">
              Discovery unavailable
            </h2>

            <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
              We couldn't load the latest videos. Check your connection and try again.
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              className="mt-5 px-5 py-2.5 rounded-xl bg-cyan-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <section className="mt-5">
              <div className="px-4 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <Flame size={15} className="text-orange-400" />
                  </div>

                  <div>
                    <h2 className="font-black text-xs uppercase tracking-widest text-white">
                      Trending
                    </h2>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      Popular right now
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('Trending')}
                  className="text-[9px] text-cyan-400 font-black uppercase tracking-widest hover:text-white"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto px-4 pb-3 [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
                {trendingVideos.map((video) => (
                  <motion.div
                    key={video.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleVideoClick(video.id)}
                    className="relative min-w-[145px] h-52 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer group"
                  >
                    <video
                      src={`${video.video_url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                      <Flame size={10} className="text-orange-400" />
                      <span className="text-[8px] font-black uppercase tracking-wider">
                        Trending
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[9px] font-bold text-white line-clamp-2 mb-2">
                        {video.caption || 'Made Universe'}
                      </p>

                      <div className="flex items-center justify-between text-[8px] text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Heart size={10} />
                          {formatCount(video.likes_count)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Eye size={10} />
                          {formatCount(video.views)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {trendingVideos.length === 0 && (
                  <div className="w-full py-8 text-center text-zinc-600 text-[9px] uppercase tracking-widest">
                    No trending content yet
                  </div>
                )}
              </div>
            </section>

            {hashtags.length > 0 && (
              <section className="mt-7">
                <div className="px-4 flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                    <Hash size={15} className="text-fuchsia-400" />
                  </div>

                  <div>
                    <h2 className="font-black text-xs uppercase tracking-widest">
                      Trending hashtags
                    </h2>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      Explore conversations
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto px-4 pb-2">
                  {hashtags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleHashtag(tag)}
                      className={`shrink-0 px-3.5 py-2 rounded-xl border transition-all ${
                        selectedHashtag === tag
                          ? 'bg-fuchsia-500 text-white border-fuchsia-400'
                          : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-fuchsia-500/40'
                      }`}
                    >
                      <span className="text-[9px] font-black">{tag}</span>
                      <span className="ml-1.5 text-[8px] opacity-50">{count}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {popularCreators.length > 0 && !debouncedSearch && !selectedHashtag && (
              <section className="mt-7">
                <div className="px-4 flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <UserRound size={15} className="text-cyan-400" />
                  </div>

                  <div>
                    <h2 className="font-black text-xs uppercase tracking-widest">
                      Popular creators
                    </h2>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      Creators getting attention
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto px-4 pb-2">
                  {popularCreators.map((creator) => {
                    const avatar = creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creator.username || creator.id)}`;

                    return (
                      <button
                        key={creator.id}
                        type="button"
                        onClick={() => handleCreatorClick(creator)}
                        className="shrink-0 w-[95px] bg-zinc-900 border border-white/10 rounded-2xl p-3 hover:border-cyan-500/40 transition-all"
                      >
                        <div className="relative mx-auto w-12 h-12">
                          <img
                            src={avatar}
                            alt=""
                            loading="lazy"
                            className="w-12 h-12 rounded-full object-cover border border-cyan-500/30"
                          />

                          {creator.online === true && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900" />
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-1 mt-2">
                          <span className="text-[9px] font-black truncate">
                            @{creator.username || 'user'}
                          </span>

                          {(creator.verified_status === true || creator.is_verified === true) && (
                            <BadgeCheck size={10} className="text-cyan-400 shrink-0" />
                          )}
                        </div>

                        <span className="block text-[7px] text-zinc-600 mt-1">
                          {creator.videos} videos
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-8 px-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <TrendingUp size={15} className="text-cyan-400" />
                  </div>

                  <div>
                    <h2 className="font-black text-xs uppercase tracking-widest">
                      {debouncedSearch
                        ? `Results for "${debouncedSearch}"`
                        : selectedHashtag
                          ? selectedHashtag
                          : activeTab}
                    </h2>

                    <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      {filteredVideos.length} loaded
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/live')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Radio size={12} />
                  <span className="text-[8px] font-black uppercase tracking-wider">
                    Live
                  </span>
                </button>
              </div>

              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredVideos.map((video) => (
                      <VideoPreview
                        key={video.id}
                        video={video}
                        onClick={handleVideoClick}
                        isSaved={savedVideos.includes(video.id)}
                        onSave={handleSave}
                        onShare={handleShare}
                        onReport={handleReport}
                        onHide={handleHide}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-24 text-center">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
                    <Search size={22} className="text-zinc-600" />
                  </div>

                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300">
                    No content found
                  </h3>

                  <p className="text-[10px] text-zinc-600 mt-2 max-w-xs mx-auto">
                    Try another search, category, or hashtag.
                  </p>

                  {(searchQuery || selectedHashtag || activeTab !== 'For You') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedHashtag('');
                        setActiveTab('For You');
                      }}
                      className="mt-5 px-4 py-2 rounded-xl bg-zinc-800 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              <div ref={loadMoreTriggerRef} className="h-20 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Loader2 size={17} className="animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Loading more
                    </span>
                  </div>
                )}

                {!loadingMore && !hasMore && filteredVideos.length > 0 && (
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-700">
                    You've reached the end
                  </span>
                )}
              </div>

              {error && videos.length > 0 && (
                <div className="mb-8 flex items-center justify-center gap-2 text-red-400">
                  <WifiOff size={13} />
                  <span className="text-[9px]">
                    Couldn't load more content.
                  </span>

                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="text-[9px] font-black uppercase underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
