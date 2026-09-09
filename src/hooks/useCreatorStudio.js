import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  motion,
  AnimatePresence,
} from 'framer-motion';

import {
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Repeat2,
  Coins,
  DollarSign,
  Users,
  UserPlus,
  BarChart3,
  LayoutDashboard,
  ListVideo,
  Sparkles,
  Gift,
  Crown,
  Radio,
  Calendar,
  Target,
  Trophy,
  Brain,
  Wallet,
  Bell,
  Search,
  Filter,
  RefreshCcw,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Video,
  FileText,
  Download,
  Settings,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  X,
  Archive,
  Trash2,
  RotateCcw,
  Edit3,
  Globe,
  MapPin,
  Smartphone,
  Monitor,
  Activity,
  MessageSquare,
  UserCheck,
  Shield,
  Zap,
} from 'lucide-react';

import useCreatorStudio from '../hooks/useCreatorStudio';

import {
  normalizeOverview,
  safeNumber,
  calculateGrowth,
  getLatestDailyStat,
  getPreviousDailyStat,
  updateVideo,
  archiveVideo,
  restoreVideo,
  deleteVideo,
  scheduleVideo,
} from '../services/creatorStudioService';

/*
============================================================
FORMATTERS
============================================================
*/

const formatNumber = (value) => {
  const number = safeNumber(value);

  if (number >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}B`;
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return number.toLocaleString();
};

const formatMoney = (value) => {
  return safeNumber(value).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
};

const formatDuration = (seconds) => {
  const total = Math.max(
    0,
    Math.floor(safeNumber(seconds))
  );

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(
    (total % 3600) / 60
  );
  const secs = total % 60;

  if (hours) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
};

const percentage = (value) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }

  return Number(value);
};

/*
============================================================
NAVIGATION
============================================================
*/

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'content',
    label: 'Content',
    icon: ListVideo,
  },
  {
    id: 'live',
    label: 'Livestream',
    icon: Radio,
  },
  {
    id: 'audience',
    label: 'Audience',
    icon: Users,
  },
  {
    id: 'engagement',
    label: 'Engagement',
    icon: MessageSquare,
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: TrendingUp,
  },
  {
    id: 'earnings',
    label: 'Earnings',
    icon: Wallet,
  },
  {
    id: 'gifts',
    label: 'Gifts',
    icon: Gift,
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: Target,
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
  },
  {
    id: 'ai',
    label: 'AI Intelligence',
    icon: Brain,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
  },
];

/*
============================================================
MAIN COMPONENT
============================================================
*/

const UniverseTools = () => {
  const navigate = useNavigate();

  const studio = useCreatorStudio();

  const {
    profile,
    overview,
    videoPerformance,
    livePerformance,
    dailyAnalytics,
    topContent,
    achievements,
    aiInsights,
    growth,
    videos,
    liveStreams,
    earnings,
    dailyStats,

    loading,
    refreshing,
    error,
    lastSyncedAt,

    refresh,
    aiTip,
  } = studio;

  const [activeTab, setActiveTab] =
    useState('dashboard');

  const [selectedVideo, setSelectedVideo] =
    useState(null);

  const [drawerMode, setDrawerMode] =
    useState('metrics');

  const [videoSearch, setVideoSearch] =
    useState('');

  const [videoFilter, setVideoFilter] =
    useState('all');

  const [analyticsRange, setAnalyticsRange] =
    useState('28');

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionError, setActionError] =
    useState('');

  const [toast, setToast] =
    useState('');

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const mainRef = useRef(null);

  /*
  ==========================================================
  NORMALIZED OVERVIEW
  ==========================================================
  */

  const stats = useMemo(
    () => normalizeOverview(overview || {}),
    [overview]
  );

  /*
  ==========================================================
  LATEST DAILY DATA
  ==========================================================
  */

  const latestDaily = useMemo(
    () =>
      getLatestDailyStat(
        dailyStats?.length
          ? dailyStats
          : dailyAnalytics
      ),
    [dailyStats, dailyAnalytics]
  );

  const previousDaily = useMemo(
    () =>
      getPreviousDailyStat(
        dailyStats?.length
          ? dailyStats
          : dailyAnalytics
      ),
    [dailyStats, dailyAnalytics]
  );

  /*
  ==========================================================
  REAL GROWTH VALUES
  ==========================================================
  */

  const growthMetrics = useMemo(
    () => ({
      views: calculateGrowth(
        latestDaily?.views,
        previousDaily?.views
      ),

      likes: calculateGrowth(
        latestDaily?.likes,
        previousDaily?.likes
      ),

      followers: calculateGrowth(
        latestDaily?.followers_gained,
        previousDaily?.followers_gained
      ),

      comments: calculateGrowth(
        latestDaily?.comments,
        previousDaily?.comments
      ),

      shares: calculateGrowth(
        latestDaily?.shares,
        previousDaily?.shares
      ),

      revenue: calculateGrowth(
        latestDaily?.revenue,
        previousDaily?.revenue
      ),

      coins: calculateGrowth(
        latestDaily?.coins_received,
        previousDaily?.coins_received
      ),
    }),
    [latestDaily, previousDaily]
  );

  /*
  ==========================================================
  VIDEO FILTERING
  ==========================================================
  */

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    const search =
      videoSearch.trim().toLowerCase();

    if (search) {
      result = result.filter((video) => {
        return (
          String(video.title || '')
            .toLowerCase()
            .includes(search) ||
          String(video.caption || '')
            .toLowerCase()
            .includes(search) ||
          String(video.id || '')
            .toLowerCase()
            .includes(search)
        );
      });
    }

    if (videoFilter === 'published') {
      result = result.filter(
        (video) =>
          video.status === 'published'
      );
    }

    if (videoFilter === 'scheduled') {
      result = result.filter(
        (video) =>
          video.status === 'scheduled' ||
          video.scheduled_at
      );
    }

    if (videoFilter === 'private') {
      result = result.filter(
        (video) =>
          video.is_private === true ||
          video.privacy === 'private'
      );
    }

    if (videoFilter === 'archived') {
      result = result.filter(
        (video) =>
          video.status === 'archived' ||
          video.archived_at
      );
    }

    return result;
  }, [
    videos,
    videoSearch,
    videoFilter,
  ]);

  /*
  ==========================================================
  SCROLL TOP WHEN TAB CHANGES
  ==========================================================
  */

  useEffect(() => {
    mainRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [activeTab]);

  /*
  ==========================================================
  VIDEO DRAWER
  ==========================================================
  */

  const openVideo = useCallback(
    (video) => {
      setSelectedVideo(video);
      setDrawerMode('metrics');
      setActionError('');
    },
    []
  );

  const closeVideo = useCallback(() => {
    setSelectedVideo(null);
    setDrawerMode('metrics');
    setActionError('');
  }, []);

  /*
  ==========================================================
  VIDEO ACTIONS
  ==========================================================
  */

  const performVideoAction = async (
    action
  ) => {
    if (!selectedVideo || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      if (action === 'archive') {
        await archiveVideo(
          selectedVideo.id
        );

        setToast('Video archived.');
      }

      if (action === 'restore') {
        await restoreVideo(
          selectedVideo.id
        );

        setToast('Video restored.');
      }

      if (action === 'delete') {
        await deleteVideo(
          selectedVideo.id
        );

        setToast('Video moved to deleted state.');
      }

      await refresh();

      closeVideo();
    } catch (err) {
      console.error(err);

      setActionError(
        err?.message ||
          'Video action failed.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  ==========================================================
  EXPORT ANALYTICS
  ==========================================================
  */

  const exportAnalytics = useCallback(() => {
    const payload = {
      exported_at:
        new Date().toISOString(),

      creator_id:
        studio.creatorId,

      profile,

      overview,

      daily_analytics:
        dailyAnalytics,

      video_performance:
        videoPerformance,

      livestream_performance:
        livePerformance,

      top_content:
        topContent,

      earnings,
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {
        type: 'application/json',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `creator-studio-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    anchor.click();

    URL.revokeObjectURL(url);

    setToast(
      'Creator report exported.'
    );
  }, [
    studio.creatorId,
    profile,
    overview,
    dailyAnalytics,
    videoPerformance,
    livePerformance,
    topContent,
    earnings,
  ]);

  /*
  ==========================================================
  LOADING
  ==========================================================
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-5">
          <div className="h-8 w-52 rounded-xl bg-white/5 animate-pulse" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 rounded-3xl bg-white/5 animate-pulse"
              />
            ))}
          </div>

          <div className="h-72 rounded-[32px] bg-white/5 animate-pulse" />

          <p className="text-center text-[9px] uppercase tracking-[4px] text-zinc-600 font-black">
            Synchronizing Creator Studio
          </p>
        </div>
      </div>
    );
  }

  /*
  ==========================================================
  UI
  ==========================================================
  */

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative">

      {/* Atmospheric background */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.035] blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-purple-500/[0.035] blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-500/[0.025] blur-[140px]" />
      </div>

      {/* ==================================================
          TOP BAR
      ================================================== */}

      <header className="sticky top-0 z-[100] h-16 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-2xl">

        <div className="h-full max-w-[1500px] mx-auto px-4 md:px-6 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                navigate(-1)
              }
              className="w-9 h-9 rounded-xl bg-white/[0.035] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition"
            >
              <ChevronLeft
                size={17}
              />
            </button>

            <div>
              <div className="flex items-center gap-2">

                <Sparkles
                  size={14}
                  className="text-cyan-400"
                />

                <h1 className="text-xs md:text-sm font-black uppercase tracking-[3px] italic">
                  Universe Studio
                </h1>

              </div>

              <p className="hidden md:block text-[7px] text-zinc-600 font-bold uppercase tracking-[2px] mt-0.5">
                Creator command center
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.05] border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-[7px] uppercase tracking-widest font-black text-emerald-400">
                Database Live
              </span>
            </div>

            <button
              onClick={() =>
                setNotificationOpen(
                  (value) => !value
                )
              }
              className="w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white"
            >
              <Bell size={16} />
            </button>

            <button
              onClick={refresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl hover:bg-cyan-500/10 flex items-center justify-center text-cyan-400 disabled:opacity-50"
            >
              <RefreshCcw
                size={15}
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>

            <button
              onClick={() =>
                setMobileMenu(
                  (value) => !value
                )
              }
              className="md:hidden w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"
            >
              <MoreHorizontal
                size={16}
              />
            </button>

          </div>

        </div>
      </header>

      {/* ==================================================
          NOTIFICATION PANEL
      ================================================== */}

      <AnimatePresence>
        {notificationOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            className="fixed top-20 right-4 z-[150] w-80 bg-[#0b0b0b] border border-white/10 rounded-3xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">

              <h3 className="text-xs font-black uppercase tracking-widest">
                Studio Notifications
              </h3>

              <button
                onClick={() =>
                  setNotificationOpen(
                    false
                  )
                }
              >
                <X
                  size={14}
                  className="text-zinc-600"
                />
              </button>

            </div>

            <div className="py-8 text-center">

              <Bell
                size={22}
                className="mx-auto text-zinc-700 mb-3"
              />

              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">
                No creator notifications
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================
          BODY
      ================================================== */}

      <div className="relative z-10 flex max-w-[1500px] mx-auto">

        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="hidden md:block w-56 shrink-0 border-r border-white/[0.05] min-h-[calc(100vh-64px)]">

          <div className="sticky top-16 p-4">

            <div className="mb-5 px-3">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 overflow-hidden flex items-center justify-center">

                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles
                      size={17}
                      className="text-cyan-400"
                    />
                  )}

                </div>

                <div className="min-w-0">

                  <p className="text-xs font-black truncate">
                    {profile?.display_name ||
                      profile?.full_name ||
                      profile?.username ||
                      'Creator'}
                  </p>

                  <p className="text-[8px] text-zinc-600 truncate">
                    @{profile?.username ||
                      'creator'}
                  </p>

                </div>

              </div>

            </div>

            <div className="space-y-1">

              {NAV_ITEMS.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const active =
                    activeTab ===
                    item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setActiveTab(
                          item.id
                        )
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                        active
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'
                          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.025]'
                      }`}
                    >

                      <Icon size={15} />

                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {item.label}
                      </span>

                    </button>
                  );
                }
              )}

            </div>

            <div className="mt-5 pt-5 border-t border-white/[0.05]">

              <button
                onClick={() =>
                  navigate(
                    '/edit-profile'
                  )
                }
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 transition"
              >
                <Settings size={15} />

                <span className="text-[9px] font-black uppercase tracking-wider">
                  Creator Settings
                </span>
              </button>

            </div>

          </div>

        </aside>

        {/* =================================================
            MAIN
        ================================================= */}

        <main
          ref={mainRef}
          className="flex-1 min-w-0 h-[calc(100vh-64px)] overflow-y-auto"
        >

          <div className="max-w-[1150px] mx-auto px-4 md:px-8 py-6 md:py-8 pb-32">

            {/* Mobile navigation */}

            <div className="md:hidden mb-5 overflow-x-auto scrollbar-none flex gap-2">

              {NAV_ITEMS.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setActiveTab(
                          item.id
                        )
                      }
                      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-wider ${
                        activeTab ===
                        item.id
                          ? 'bg-cyan-500 text-black border-cyan-500'
                          : 'bg-white/[0.03] border-white/[0.06] text-zinc-500'
                      }`}
                    >
                      <Icon size={12} />
                      {item.label}
                    </button>
                  );
                }
              )}

            </div>

            {/* Error */}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10"
                >

                  <AlertCircle
                    size={16}
                    className="text-red-400"
                  />

                  <p className="flex-1 text-[9px] text-red-300 font-bold">
                    {error}
                  </p>

                  <button
                    onClick={refresh}
                    className="text-[8px] uppercase font-black text-red-400"
                  >
                    Retry
                  </button>

                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================
                PAGE CONTENT
            ================================================= */}

            <AnimatePresence mode="wait">

              {activeTab ===
                'dashboard' && (
                <DashboardSection
                  stats={stats}
                  profile={profile}
                  latestDaily={
                    latestDaily
                  }
                  growthMetrics={
                    growthMetrics
                  }
                  aiTip={aiTip}
                  dailyAnalytics={
                    dailyAnalytics
                  }
                  topContent={
                    topContent
                  }
                  videos={videos}
                  liveStreams={
                    liveStreams
                  }
                  achievements={
                    achievements
                  }
                  onVideo={
                    openVideo
                  }
                  onNavigate={
                    setActiveTab
                  }
                />
              )}

              {activeTab ===
                'analytics' && (
                <AnalyticsSection
                  stats={stats}
                  dailyAnalytics={
                    dailyAnalytics
                  }
                  dailyStats={
                    dailyStats
                  }
                  growthMetrics={
                    growthMetrics
                  }
                  range={
                    analyticsRange
                  }
                  setRange={
                    setAnalyticsRange
                  }
                  videoPerformance={
                    videoPerformance
                  }
                />
              )}

              {activeTab ===
                'content' && (
                <ContentSection
                  videos={
                    filteredVideos
                  }
                  total={
                    videos.length
                  }
                  search={
                    videoSearch
                  }
                  setSearch={
                    setVideoSearch
                  }
                  filter={
                    videoFilter
                  }
                  setFilter={
                    setVideoFilter
                  }
                  onVideo={
                    openVideo
                  }
                  onRefresh={
                    refresh
                  }
                />
              )}

              {activeTab ===
                'live' && (
                <LiveSection
                  livePerformance={
                    livePerformance
                  }
                  liveStreams={
                    liveStreams
                  }
                  onSchedule={() =>
                    setActiveTab(
                      'schedule'
                    )
                  }
                />
              )}

              {activeTab ===
                'audience' && (
                <AudienceSection
                  stats={stats}
                  latestDaily={
                    latestDaily
                  }
                  dailyAnalytics={
                    dailyAnalytics
                  }
                  profile={
                    profile
                  }
                />
              )}

              {activeTab ===
                'engagement' && (
                <EngagementSection
                  stats={stats}
                  latestDaily={
                    latestDaily
                  }
                  videoPerformance={
                    videoPerformance
                  }
                />
              )}

              {activeTab ===
                'growth' && (
                <GrowthSection
                  stats={stats}
                  growth={
                    growth
                  }
                  dailyAnalytics={
                    dailyAnalytics
                  }
                  growthMetrics={
                    growthMetrics
                  }
                />
              )}

              {activeTab ===
                'earnings' && (
                <EarningsSection
                  stats={stats}
                  earnings={
                    earnings
                  }
                  livePerformance={
                    livePerformance
                  }
                />
              )}

              {activeTab ===
                'gifts' && (
                <GiftsSection
                  stats={stats}
                  livePerformance={
                    livePerformance
                  }
                />
              )}

              {activeTab ===
                'goals' && (
                <GoalsSection
                  achievements={
                    achievements
                  }
                  stats={stats}
                />
              )}

              {activeTab ===
                'achievements' && (
                <AchievementsSection
                  achievements={
                    achievements
                  }
                />
              )}

              {activeTab ===
                'ai' && (
                <AISection
                  aiInsights={
                    aiInsights
                  }
                  aiTip={aiTip}
                />
              )}

              {activeTab ===
                'schedule' && (
                <ScheduleSection
                  videos={videos}
                  liveStreams={
                    liveStreams
                  }
                  onVideo={
                    openVideo
                  }
                />
              )}

              {activeTab ===
                'reports' && (
                <ReportsSection
                  stats={stats}
                  dailyAnalytics={
                    dailyAnalytics
                  }
                  videoPerformance={
                    videoPerformance
                  }
                  livePerformance={
                    livePerformance
                  }
                  earnings={
                    earnings
                  }
                  onExport={
                    exportAnalytics
                  }
                />
              )}

            </AnimatePresence>

            {/* Sync status */}

            <div className="mt-8 flex justify-center">

              <div className="flex items-center gap-2 text-[7px] uppercase tracking-[2px] text-zinc-700 font-black">

                <Activity
                  size={10}
                />

                {lastSyncedAt
                  ? `Last synchronized ${new Date(
                      lastSyncedAt
                    ).toLocaleTimeString()}`
                  : 'Waiting for synchronization'}

              </div>

            </div>

          </div>

        </main>
      </div>

      {/* ==================================================
          VIDEO DRAWER
      ================================================== */}

      <AnimatePresence>
        {selectedVideo && (
          <VideoDrawer
            video={
              selectedVideo
            }
            mode={
              drawerMode
            }
            setMode={
              setDrawerMode
            }
            onClose={
              closeVideo
            }
            onAction={
              performVideoAction
            }
            actionLoading={
              actionLoading
            }
            actionError={
              actionError
            }
            onRefresh={
              refresh
            }
          />
        )}
      </AnimatePresence>

      {/* Toast */}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 20,
            }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-2xl bg-white text-black shadow-2xl"
          >
            <div className="flex items-center gap-2">

              <CheckCircle2
                size={14}
              />

              <span className="text-[9px] uppercase tracking-widest font-black">
                {toast}
              </span>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

/*
============================================================
DASHBOARD
============================================================
*/

const DashboardSection = ({
  stats,
  profile,
  latestDaily,
  growthMetrics,
  aiTip,
  dailyAnalytics,
  topContent,
  videos,
  liveStreams,
  achievements,
  onVideo,
  onNavigate,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Creator command center"
        title="Overview"
        description={`Welcome back ${
          profile?.display_name ||
          profile?.username ||
          'Creator'
        }. Your studio is synchronized with Supabase.`}
      />

      {/* AI */}

      <div className="relative overflow-hidden rounded-[28px] border border-cyan-500/10 bg-gradient-to-r from-cyan-500/[0.08] via-purple-500/[0.04] to-transparent p-5">

        <div className="flex gap-4">

          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/10 flex items-center justify-center shrink-0">

            <Brain
              size={17}
              className="text-cyan-400"
            />

          </div>

          <div className="min-w-0">

            <p className="text-[8px] uppercase tracking-[3px] font-black text-cyan-400">
              Creator Intelligence
            </p>

            <p className="text-sm text-zinc-300 font-medium mt-1 leading-relaxed">
              {aiTip}
            </p>

          </div>

        </div>

      </div>

      {/* PRIMARY STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Video Views"
          value={formatNumber(
            stats.videoViews
          )}
          icon={Eye}
          tone="cyan"
          growth={
            growthMetrics.views
          }
        />

        <MetricCard
          label="Followers"
          value={formatNumber(
            stats.followers
          )}
          icon={Users}
          tone="purple"
          growth={
            growthMetrics.followers
          }
        />

        <MetricCard
          label="Total Likes"
          value={formatNumber(
            stats.videoLikes
          )}
          icon={Heart}
          tone="rose"
          growth={
            growthMetrics.likes
          }
        />

        <MetricCard
          label="Total Engagement"
          value={formatNumber(
            stats.totalEngagements
          )}
          icon={Activity}
          tone="emerald"
        />

      </div>

      {/* SECONDARY */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <SmallMetric
          label="Comments"
          value={stats.videoComments}
          icon={MessageCircle}
        />

        <SmallMetric
          label="Shares"
          value={stats.videoShares}
          icon={Share2}
        />

        <SmallMetric
          label="Saves"
          value={stats.videoSaves}
          icon={Bookmark}
        />

        <SmallMetric
          label="Reposts"
          value={stats.videoReposts}
          icon={Repeat2}
        />

      </div>

      {/* REAL DAILY ANALYTICS */}

      <SectionShell
        title="Performance"
        subtitle="Historical database analytics"
        action={
          <button
            onClick={() =>
              onNavigate(
                'analytics'
              )
            }
            className="text-[8px] uppercase tracking-widest font-black text-cyan-400"
          >
            Full analytics
          </button>
        }
      >

        {dailyAnalytics.length ? (
          <AnalyticsMiniChart
            data={
              dailyAnalytics
            }
            metric="views"
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No historical analytics"
            description="Daily creator analytics will appear here when database records exist."
          />
        )}

      </SectionShell>

      {/* TODAY */}

      <div className="grid lg:grid-cols-2 gap-4">

        <SectionShell
          title="Today's signal"
          subtitle={
            latestDaily?.stat_date
              ? formatDate(
                  latestDaily.stat_date
                )
              : 'No daily record'
          }
        >

          {latestDaily ? (
            <div className="grid grid-cols-2 gap-3">

              <Signal
                label="Views"
                value={
                  latestDaily.views
                }
                icon={Eye}
              />

              <Signal
                label="Unique viewers"
                value={
                  latestDaily.unique_viewers
                }
                icon={Users}
              />

              <Signal
                label="Followers gained"
                value={
                  latestDaily.followers_gained
                }
                icon={UserPlus}
              />

              <Signal
                label="Profile visits"
                value={
                  latestDaily.profile_visits
                }
                icon={UserCheck}
              />

              <Signal
                label="Average watch"
                value={
                  formatDuration(
                    latestDaily.average_watch_seconds
                  )
                }
                icon={Clock}
              />

              <Signal
                label="Completion"
                value={
                  latestDaily.average_completion_rate !==
                  null
                    ? `${safeNumber(
                        latestDaily.average_completion_rate
                      ).toFixed(1)}%`
                    : '—'
                }
                icon={TrendingUp}
              />

            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No daily data"
              description="There is currently no daily analytics record."
            />
          )}

        </SectionShell>

        {/* PROFILE */}

        <SectionShell
          title="Creator profile"
          subtitle="Current account state"
        >

          <div className="space-y-3">

            <ProfileRow
              label="Followers"
              value={formatNumber(
                stats.followers
              )}
            />

            <ProfileRow
              label="Following"
              value={formatNumber(
                stats.following
              )}
            />

            <ProfileRow
              label="Profile views"
              value={formatNumber(
                stats.profileViews
              )}
            />

            <ProfileRow
              label="Verification"
              value={
                profile?.is_verified
                  ? 'Verified'
                  : profile?.verified_status ||
                    'Not verified'
              }
            />

            <ProfileRow
              label="Account"
              value={
                profile?.account_status ||
                'Active'
              }
            />

          </div>

        </SectionShell>

      </div>

      {/* TOP CONTENT */}

      <SectionShell
        title="Top content"
        subtitle="Ranked from creator analytics"
        action={
          <button
            onClick={() =>
              onNavigate(
                'content'
              )
            }
            className="text-[8px] uppercase tracking-widest font-black text-cyan-400"
          >
            View all
          </button>
        }
      >

        {topContent.length ? (
          <div className="space-y-2">

            {topContent
              .slice(0, 5)
              .map((item, index) => (
                <TopContentRow
                  key={
                    item.id ||
                    item.video_id ||
                    index
                  }
                  item={item}
                  rank={index + 1}
                  onVideo={
                    onVideo
                  }
                />
              ))}

          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No ranked content"
            description="Top content will appear after analytics records are available."
          />
        )}

      </SectionShell>

      {/* QUICK ACCESS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <QuickTool
          icon={Video}
          title="Videos"
          description={`${videos.length} total`}
          onClick={() =>
            onNavigate(
              'content'
            )
          }
        />

        <QuickTool
          icon={Radio}
          title="Livestreams"
          description={`${liveStreams.length} records`}
          onClick={() =>
            onNavigate(
              'live'
            )
          }
        />

        <QuickTool
          icon={Trophy}
          title="Achievements"
          description={`${achievements.length} records`}
          onClick={() =>
            onNavigate(
              'achievements'
            )
          }
        />

        <QuickTool
          icon={DollarSign}
          title="Earnings"
          description={`K${formatMoney(
            stats.creatorEarnings
          )}`}
          onClick={() =>
            onNavigate(
              'earnings'
            )
          }
        />

      </div>

    </motion.div>
  );
};

/*
============================================================
ANALYTICS
============================================================
*/

const AnalyticsSection = ({
  stats,
  dailyAnalytics,
  dailyStats,
  growthMetrics,
  range,
  setRange,
  videoPerformance,
}) => {
  const source =
    dailyStats.length
      ? dailyStats
      : dailyAnalytics;

  const filtered = useMemo(() => {
    if (range === 'all') {
      return source;
    }

    const days =
      Number(range);

    if (!days) {
      return source;
    }

    return source.slice(
      Math.max(
        0,
        source.length - days
      )
    );
  }, [source, range]);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Performance analytics"
        title="Analytics"
        description="Historical analytics are read directly from the Creator Studio database."
        action={
          <select
            value={range}
            onChange={(event) =>
              setRange(
                event.target.value
              )
            }
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[9px] font-black uppercase text-zinc-300 outline-none"
          >
            <option value="1">
              Today
            </option>

            <option value="7">
              7 Days
            </option>

            <option value="28">
              28 Days
            </option>

            <option value="90">
              90 Days
            </option>

            <option value="365">
              1 Year
            </option>

            <option value="all">
              All Time
            </option>
          </select>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Views"
          value={formatNumber(
            stats.videoViews
          )}
          icon={Eye}
          growth={
            growthMetrics.views
          }
          tone="cyan"
        />

        <MetricCard
          label="Likes"
          value={formatNumber(
            stats.videoLikes
          )}
          icon={Heart}
          growth={
            growthMetrics.likes
          }
          tone="rose"
        />

        <MetricCard
          label="Comments"
          value={formatNumber(
            stats.videoComments
          )}
          icon={MessageCircle}
          growth={
            growthMetrics.comments
          }
          tone="purple"
        />

        <MetricCard
          label="Shares"
          value={formatNumber(
            stats.videoShares
          )}
          icon={Share2}
          growth={
            growthMetrics.shares
          }
          tone="emerald"
        />

      </div>

      <SectionShell
        title="Views"
        subtitle={`${filtered.length} historical records`}
      >

        {filtered.length ? (
          <AnalyticsChart
            data={filtered}
            metric="views"
            label="Views"
          />
        ) : (
          <EmptyState
            icon={Eye}
            title="No view history"
            description="No historical view records are available."
          />
        )}

      </SectionShell>

      <div className="grid lg:grid-cols-2 gap-4">

        <SectionShell
          title="Audience"
          subtitle="Historical audience metrics"
        >

          {filtered.length ? (
            <AnalyticsChart
              data={filtered}
              metric="unique_viewers"
              secondaryMetric="returning_viewers"
              label="Unique viewers"
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No audience data"
              description="Audience history is not available."
            />
          )}

        </SectionShell>

        <SectionShell
          title="Engagement"
          subtitle="Likes, comments and shares"
        >

          {filtered.length ? (
            <AnalyticsChart
              data={filtered}
              metric="likes"
              secondaryMetric="comments"
              label="Likes"
            />
          ) : (
            <EmptyState
              icon={Activity}
              title="No engagement data"
              description="Engagement history is not available."
            />
          )}

        </SectionShell>

      </div>

      <SectionShell
        title="Video performance"
        subtitle={`${videoPerformance.length} indexed videos`}
      >

        {videoPerformance.length ? (
          <div className="space-y-2">

            {videoPerformance
              .slice(0, 10)
              .map((video) => (
                <PerformanceRow
                  key={
                    video.id ||
                    video.video_id
                  }
                  item={video}
                />
              ))}

          </div>
        ) : (
          <EmptyState
            icon={Video}
            title="No video performance"
            description="Video analytics records are not available."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
CONTENT
============================================================
*/

const ContentSection = ({
  videos,
  total,
  search,
  setSearch,
  filter,
  setFilter,
  onVideo,
  onRefresh,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Content management"
        title="Videos"
        description={`${total} videos belong to your authenticated creator account.`}
      />

      <div className="flex flex-col md:flex-row gap-3">

        <div className="flex-1 relative">

          <Search
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search videos..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-2xl py-3 pl-11 pr-4 text-xs text-white outline-none focus:border-cyan-500/30"
          />

        </div>

        <div className="flex gap-2">

          <div className="relative">

            <Filter
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value
                )
              }
              className="appearance-none bg-white/[0.03] border border-white/[0.07] rounded-2xl py-3 pl-9 pr-8 text-[9px] font-black uppercase text-zinc-400 outline-none"
            >
              <option value="all">
                All
              </option>

              <option value="published">
                Published
              </option>

              <option value="scheduled">
                Scheduled
              </option>

              <option value="private">
                Private
              </option>

              <option value="archived">
                Archived
              </option>
            </select>

          </div>

          <button
            onClick={
              onRefresh
            }
            className="w-11 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-zinc-500 hover:text-white"
          >
            <RefreshCcw
              size={14}
            />
          </button>

        </div>

      </div>

      {videos.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {videos.map(
            (video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() =>
                  onVideo(video)
                }
              />
            )
          )}

        </div>
      ) : (
        <EmptyState
          icon={Video}
          title="No videos found"
          description="There are no videos matching the current filter."
        />
      )}

    </motion.div>
  );
};

/*
============================================================
LIVE
============================================================
*/

const LiveSection = ({
  livePerformance,
  liveStreams,
  onSchedule,
}) => {
  const records =
    livePerformance.length
      ? livePerformance
      : liveStreams;

  const totalPeak = records.reduce(
    (sum, item) =>
      sum +
      safeNumber(
        item.peak_viewers
      ),
    0
  );

  const totalWatch = records.reduce(
    (sum, item) =>
      sum +
      safeNumber(
        item.total_watch_seconds ??
          item.watch_time
      ),
    0
  );

  const totalGifts = records.reduce(
    (sum, item) =>
      sum +
      safeNumber(
        item.gifts_count ??
          item.total_gifts
      ),
    0
  );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Livestream command"
        title="Livestream Analytics"
        description="All livestream values below come from the existing livestream database."
        action={
          <button
            onClick={
              onSchedule
            }
            className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-[8px] font-black uppercase tracking-widest"
          >
            Schedule
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Streams"
          value={formatNumber(
            records.length
          )}
          icon={Radio}
          tone="cyan"
        />

        <MetricCard
          label="Peak Viewers"
          value={formatNumber(
            totalPeak
          )}
          icon={Users}
          tone="purple"
        />

        <MetricCard
          label="Watch Time"
          value={formatDuration(
            totalWatch
          )}
          icon={Clock}
          tone="emerald"
        />

        <MetricCard
          label="Gifts"
          value={formatNumber(
            totalGifts
          )}
          icon={Gift}
          tone="rose"
        />

      </div>

      <SectionShell
        title="Livestream history"
        subtitle={`${records.length} database records`}
      >

        {records.length ? (
          <div className="space-y-3">

            {records.map(
              (stream, index) => (
                <LiveRow
                  key={
                    stream.id ||
                    index
                  }
                  stream={
                    stream
                  }
                />
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon={Radio}
            title="No livestream records"
            description="Your livestream history will appear here when records exist."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
AUDIENCE
============================================================
*/

const AudienceSection = ({
  stats,
  latestDaily,
  dailyAnalytics,
  profile,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Audience intelligence"
        title="Audience"
        description="Audience metrics are shown only where the database contains them."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Followers"
          value={formatNumber(
            stats.followers
          )}
          icon={Users}
          tone="cyan"
        />

        <MetricCard
          label="Following"
          value={formatNumber(
            stats.following
          )}
          icon={UserPlus}
          tone="purple"
        />

        <MetricCard
          label="Profile Visits"
          value={formatNumber(
            stats.profileViews
          )}
          icon={Eye}
          tone="emerald"
        />

        <MetricCard
          label="Unique Viewers"
          value={formatNumber(
            latestDaily?.unique_viewers
          )}
          icon={UserCheck}
          tone="rose"
        />

      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        <SectionShell
          title="Audience history"
          subtitle="Unique vs returning viewers"
        >

          {dailyAnalytics.length ? (
            <AnalyticsChart
              data={
                dailyAnalytics
              }
              metric="unique_viewers"
              secondaryMetric="returning_viewers"
              label="Unique"
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No audience history"
              description="No audience history has been recorded."
            />
          )}

        </SectionShell>

        <SectionShell
          title="Current profile"
          subtitle="Profile source data"
        >

          <div className="space-y-3">

            <ProfileRow
              label="Username"
              value={
                profile?.username
                  ? `@${profile.username}`
                  : '—'
              }
            />

            <ProfileRow
              label="District"
              value={
                profile?.district ||
                '—'
              }
            />

            <ProfileRow
              label="Location"
              value={
                profile?.location ||
                '—'
              }
            />

            <ProfileRow
              label="Account status"
              value={
                profile?.account_status ||
                '—'
              }
            />

          </div>

        </SectionShell>

      </div>

    </motion.div>
  );
};

/*
============================================================
ENGAGEMENT
============================================================
*/

const EngagementSection = ({
  stats,
  latestDaily,
  videoPerformance,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Engagement intelligence"
        title="Engagement"
        description="No engagement values are generated when the database does not contain them."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        <SmallMetric
          label="Likes"
          value={
            stats.videoLikes
          }
          icon={Heart}
        />

        <SmallMetric
          label="Comments"
          value={
            stats.videoComments
          }
          icon={
            MessageCircle
          }
        />

        <SmallMetric
          label="Shares"
          value={
            stats.videoShares
          }
          icon={Share2}
        />

        <SmallMetric
          label="Saves"
          value={
            stats.videoSaves
          }
          icon={Bookmark}
        />

        <SmallMetric
          label="Reposts"
          value={
            stats.videoReposts
          }
          icon={Repeat2}
        />

      </div>

      <SectionShell
        title="Daily engagement"
        subtitle="Real historical records"
      >

        {latestDaily ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <Signal
              label="Likes"
              value={
                latestDaily.likes
              }
              icon={Heart}
            />

            <Signal
              label="Comments"
              value={
                latestDaily.comments
              }
              icon={
                MessageCircle
              }
            />

            <Signal
              label="Shares"
              value={
                latestDaily.shares
              }
              icon={Share2}
            />

            <Signal
              label="Saves"
              value={
                latestDaily.saves
              }
              icon={Bookmark}
            />

          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No daily engagement"
            description="No daily engagement record exists."
          />
        )}

      </SectionShell>

      <SectionShell
        title="Content engagement"
        subtitle={`${videoPerformance.length} videos`}
      >

        {videoPerformance.length ? (
          <div className="space-y-2">

            {videoPerformance
              .slice(0, 15)
              .map((video) => (
                <PerformanceRow
                  key={
                    video.id ||
                    video.video_id
                  }
                  item={
                    video
                  }
                />
              ))}

          </div>
        ) : (
          <EmptyState
            icon={Video}
            title="No content analytics"
            description="No video performance records are available."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
GROWTH
============================================================
*/

const GrowthSection = ({
  stats,
  growth,
  dailyAnalytics,
  growthMetrics,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Growth center"
        title="Growth"
        description="Growth indicators use real historical creator statistics."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <GrowthCard
          label="Views"
          value={
            growthMetrics.views
          }
          icon={Eye}
        />

        <GrowthCard
          label="Likes"
          value={
            growthMetrics.likes
          }
          icon={Heart}
        />

        <GrowthCard
          label="Followers"
          value={
            growthMetrics.followers
          }
          icon={Users}
        />

        <GrowthCard
          label="Revenue"
          value={
            growthMetrics.revenue
          }
          icon={DollarSign}
        />

      </div>

      <SectionShell
        title="Audience growth"
        subtitle="Followers gained and lost"
      >

        {dailyAnalytics.length ? (
          <AnalyticsChart
            data={
              dailyAnalytics
            }
            metric="followers_gained"
            secondaryMetric="followers_lost"
            label="Followers gained"
          />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No growth history"
            description="Growth history is not available yet."
          />
        )}

      </SectionShell>

      <SectionShell
        title="Growth snapshot"
        subtitle="Latest creator growth record"
      >

        {growth ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            <Signal
              label="Growth score"
              value={
                growth.growth_score ??
                growth.score ??
                '—'
              }
              icon={
                TrendingUp
              }
            />

            <Signal
              label="Followers"
              value={
                growth.followers ??
                growth.follower_count ??
                '—'
              }
              icon={Users}
            />

            <Signal
              label="Views"
              value={
                growth.views ??
                growth.video_views ??
                '—'
              }
              icon={Eye}
            />

            <Signal
              label="Engagement"
              value={
                growth.engagement_rate !==
                null &&
                growth.engagement_rate !==
                  undefined
                  ? `${safeNumber(
                      growth.engagement_rate
                    ).toFixed(1)}%`
                  : '—'
              }
              icon={
                Activity
              }
            />

          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No growth snapshot"
            description="The growth view does not currently contain a snapshot."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
EARNINGS
============================================================
*/

const EarningsSection = ({
  stats,
  earnings,
  livePerformance,
}) => {
  const pending = earnings
    .filter(
      (item) =>
        item.status ===
        'pending'
    )
    .reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.amount
        ),
      0
    );

  const completed = earnings
    .filter(
      (item) =>
        item.status ===
        'completed'
    )
    .reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.amount
        ),
      0
    );

  const liveRevenue =
    livePerformance.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.revenue
        ),
      0
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Monetization"
        title="Earnings"
        description="Financial analytics come from creator earnings and livestream records."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Creator Earnings"
          value={`K${formatMoney(
            stats.creatorEarnings
          )}`}
          icon={DollarSign}
          tone="emerald"
        />

        <MetricCard
          label="Balance"
          value={`K${formatMoney(
            stats.balance
          )}`}
          icon={Wallet}
          tone="cyan"
        />

        <MetricCard
          label="Pending"
          value={`K${formatMoney(
            pending
          )}`}
          icon={Clock}
          tone="yellow"
        />

        <MetricCard
          label="Completed"
          value={`K${formatMoney(
            completed
          )}`}
          icon={
            CheckCircle2
          }
          tone="purple"
        />

      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        <SectionShell
          title="Earnings history"
          subtitle={`${earnings.length} transactions`}
        >

          {earnings.length ? (
            <div className="space-y-2">

              {earnings
                .slice(0, 20)
                .map(
                  (
                    earning,
                    index
                  ) => (
                    <div
                      key={
                        earning.id ||
                        index
                      }
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
                    >

                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">

                        <DollarSign
                          size={14}
                          className="text-emerald-400"
                        />

                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-[10px] font-bold text-zinc-300 truncate">
                          {earning.description ||
                            earning.source_type ||
                            'Creator earning'}
                        </p>

                        <p className="text-[8px] text-zinc-600 mt-1">
                          {formatDate(
                            earning.created_at
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-[10px] font-black text-emerald-400">
                          K
                          {formatMoney(
                            earning.amount
                          )}
                        </p>

                        <p className="text-[7px] uppercase text-zinc-600">
                          {earning.status ||
                            'unknown'}
                        </p>

                      </div>

                    </div>
                  )
                )}

            </div>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No earnings"
              description="No creator earnings records are available."
            />
          )}

        </SectionShell>

        <SectionShell
          title="Livestream revenue"
          subtitle="Database livestream revenue"
        >

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">

            <p className="text-[8px] uppercase tracking-widest font-black text-zinc-600">
              Recorded revenue
            </p>

            <p className="text-3xl font-black italic font-mono mt-2">
              K
              {formatMoney(
                liveRevenue
              )}
            </p>

            <p className="text-[8px] text-zinc-600 mt-2">
              No revenue is estimated when the database contains zero.
            </p>

          </div>

        </SectionShell>

      </div>

    </motion.div>
  );
};

/*
============================================================
GIFTS
============================================================
*/

const GiftsSection = ({
  stats,
  livePerformance,
}) => {
  const gifts =
    livePerformance.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.gifts_count ??
            item.total_gifts
        ),
      0
    );

  const coins =
    livePerformance.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.coins_received
        ),
      0
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Virtual economy"
        title="Gifts"
        description="Gift statistics reflect recorded livestream data."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Recorded Gifts"
          value={formatNumber(
            gifts
          )}
          icon={Gift}
          tone="rose"
        />

        <MetricCard
          label="Coins Received"
          value={formatNumber(
            coins
          )}
          icon={Coins}
          tone="yellow"
        />

        <MetricCard
          label="Creator Coins"
          value={formatNumber(
            stats.coins
          )}
          icon={Coins}
          tone="purple"
        />

        <MetricCard
          label="Gift Revenue"
          value={`K${formatMoney(
            stats.livestreamRevenue
          )}`}
          icon={DollarSign}
          tone="emerald"
        />

      </div>

      <SectionShell
        title="Gift records"
        subtitle="Livestream gift analytics"
      >

        {livePerformance.length ? (
          <div className="space-y-2">

            {livePerformance
              .filter(
                (item) =>
                  safeNumber(
                    item.gifts_count ??
                      item.total_gifts
                  ) > 0 ||
                  safeNumber(
                    item.coins_received
                  ) > 0
              )
              .map(
                (
                  item,
                  index
                ) => (
                  <LiveRow
                    key={
                      item.id ||
                      index
                    }
                    stream={
                      item
                    }
                  />
                )
              )}

          </div>
        ) : (
          <EmptyState
            icon={Gift}
            title="No gift records"
            description="No livestream gift data is available."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
GOALS
============================================================
*/

const GoalsSection = ({
  achievements,
  stats,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Creator progression"
        title="Goals"
        description="Goal progress is displayed when achievement or creator progress data exists."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          label="Followers"
          value={formatNumber(
            stats.followers
          )}
          icon={Users}
          tone="cyan"
        />

        <MetricCard
          label="Video Views"
          value={formatNumber(
            stats.videoViews
          )}
          icon={Eye}
          tone="purple"
        />

        <MetricCard
          label="Engagement"
          value={formatNumber(
            stats.totalEngagements
          )}
          icon={Activity}
          tone="emerald"
        />

        <MetricCard
          label="Achievements"
          value={formatNumber(
            achievements.length
          )}
          icon={Trophy}
          tone="yellow"
        />

      </div>

      <SectionShell
        title="Creator goals"
        subtitle="Available database progression"
      >

        {achievements.length ? (
          <div className="grid md:grid-cols-2 gap-3">

            {achievements.map(
              (
                achievement,
                index
              ) => (
                <AchievementCard
                  key={
                    achievement.id ||
                    index
                  }
                  achievement={
                    achievement
                  }
                />
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No goals available"
            description="Goal records have not been populated yet."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
ACHIEVEMENTS
============================================================
*/

const AchievementsSection = ({
  achievements,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Creator progression"
        title="Achievements"
        description="Achievement progress comes from the existing achievement analytics view."
      />

      {achievements.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {achievements.map(
            (
              achievement,
              index
            ) => (
              <AchievementCard
                key={
                  achievement.id ||
                  index
                }
                achievement={
                  achievement
                }
              />
            )
          )}

        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No achievements"
          description="No achievement records are currently available."
        />
      )}

    </motion.div>
  );
};

/*
============================================================
AI
============================================================
*/

const AISection = ({
  aiInsights,
  aiTip,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Creator intelligence"
        title="AI Intelligence"
        description="AI insights shown here are database-backed. No random analytics are generated."
      />

      <div className="rounded-[28px] border border-purple-500/10 bg-purple-500/[0.04] p-6">

        <div className="flex gap-4">

          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center">

            <Brain
              size={18}
              className="text-purple-400"
            />

          </div>

          <div>

            <p className="text-[8px] uppercase tracking-[3px] font-black text-purple-400">
              Current intelligence
            </p>

            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              {aiTip}
            </p>

          </div>

        </div>

      </div>

      <SectionShell
        title="AI insight records"
        subtitle={`${aiInsights.length} records`}
      >

        {aiInsights.length ? (
          <div className="space-y-3">

            {aiInsights.map(
              (
                insight,
                index
              ) => (
                <div
                  key={
                    insight.id ||
                    index
                  }
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]"
                >

                  <div className="flex gap-3">

                    <Sparkles
                      size={15}
                      className="text-purple-400 shrink-0 mt-0.5"
                    />

                    <div>

                      <p className="text-xs font-bold text-zinc-300">
                        {insight.title ||
                          insight.type ||
                          'Creator insight'}
                      </p>

                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        {insight.insight ||
                          insight.message ||
                          insight.recommendation ||
                          insight.description ||
                          'No insight text available.'}
                      </p>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>
        ) : (
          <EmptyState
            icon={Brain}
            title="No AI insights"
            description="No creator intelligence records are currently available."
          />
        )}

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
SCHEDULE
============================================================
*/

const ScheduleSection = ({
  videos,
  liveStreams,
  onVideo,
}) => {
  const scheduledVideos =
    videos.filter(
      (video) =>
        video.scheduled_at ||
        video.status ===
          'scheduled'
    );

  const scheduledLives =
    liveStreams.filter(
      (stream) =>
        stream.scheduled_at
    );

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Publishing"
        title="Schedule"
        description="Scheduled content uses the existing scheduled_at fields."
      />

      <div className="grid lg:grid-cols-2 gap-4">

        <SectionShell
          title="Scheduled videos"
          subtitle={`${scheduledVideos.length} scheduled`}
        >

          {scheduledVideos.length ? (
            <div className="space-y-2">

              {scheduledVideos.map(
                (video) => (
                  <button
                    key={video.id}
                    onClick={() =>
                      onVideo(video)
                    }
                    className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/10"
                  >

                    <div className="w-10 h-12 rounded-xl bg-zinc-900 overflow-hidden">

                      {video.thumbnail_url ? (
                        <img
                          src={
                            video.thumbnail_url
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video
                            size={14}
                            className="text-zinc-700"
                          />
                        </div>
                      )}

                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="text-[10px] font-bold truncate">
                        {video.title ||
                          video.caption ||
                          'Untitled video'}
                      </p>

                      <p className="text-[8px] text-cyan-400 mt-1">
                        {formatDate(
                          video.scheduled_at
                        )}
                      </p>

                    </div>

                    <ChevronRight
                      size={13}
                      className="text-zinc-700"
                    />

                  </button>
                )
              )}

            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No scheduled videos"
              description="There are no scheduled video records."
            />
          )}

        </SectionShell>

        <SectionShell
          title="Scheduled livestreams"
          subtitle={`${scheduledLives.length} scheduled`}
        >

          {scheduledLives.length ? (
            <div className="space-y-2">

              {scheduledLives.map(
                (
                  stream
                ) => (
                  <LiveRow
                    key={
                      stream.id
                    }
                    stream={
                      stream
                    }
                  />
                )
              )}

            </div>
          ) : (
            <EmptyState
              icon={Radio}
              title="No scheduled livestreams"
              description="There are no scheduled livestream records."
            />
          )}

        </SectionShell>

      </div>

    </motion.div>
  );
};

/*
============================================================
REPORTS
============================================================
*/

const ReportsSection = ({
  stats,
  dailyAnalytics,
  videoPerformance,
  livePerformance,
  earnings,
  onExport,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="space-y-6"
    >

      <PageHeader
        eyebrow="Creator reporting"
        title="Reports"
        description="Export the analytics currently synchronized from Supabase."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <SmallMetric
          label="Daily records"
          value={
            dailyAnalytics.length
          }
          icon={BarChart3}
        />

        <SmallMetric
          label="Videos"
          value={
            videoPerformance.length
          }
          icon={Video}
        />

        <SmallMetric
          label="Livestreams"
          value={
            livePerformance.length
          }
          icon={Radio}
        />

        <SmallMetric
          label="Earnings records"
          value={
            earnings.length
          }
          icon={DollarSign}
        />

      </div>

      <SectionShell
        title="Creator report"
        subtitle="Download database-backed analytics"
      >

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

          <ReportButton
            title="Analytics JSON"
            description="Daily analytics and overview"
            icon={Download}
            onClick={
              onExport
            }
          />

          <ReportButton
            title="Video statistics"
            description="Video performance records"
            icon={Video}
            onClick={
              onExport
            }
          />

          <ReportButton
            title="Financial report"
            description="Creator earnings records"
            icon={Wallet}
            onClick={
              onExport
            }
          />

        </div>

      </SectionShell>

    </motion.div>
  );
};

/*
============================================================
VIDEO DRAWER
============================================================
*/

const VideoDrawer = ({
  video,
  mode,
  setMode,
  onClose,
  onAction,
  actionLoading,
  actionError,
}) => {
  const views =
    video.views_count ??
    video.views ??
    0;

  const likes =
    video.likes_count ??
    0;

  const comments =
    video.comments_count ??
    0;

  const shares =
    video.shares_count ??
    0;

  const saves =
    video.saves_count ??
    0;

  const reposts =
    video.reposts_count ??
    0;

  const engagements =
    safeNumber(likes) +
    safeNumber(comments) +
    safeNumber(shares) +
    safeNumber(saves) +
    safeNumber(reposts);

  return (
    <>
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        onClick={
          onClose
        }
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md"
      />

      <motion.div
        initial={{
          y: '100%',
        }}
        animate={{
          y: 0,
        }}
        exit={{
          y: '100%',
        }}
        transition={{
          type: 'spring',
          damping: 26,
          stiffness: 190,
        }}
        className="fixed bottom-0 left-0 right-0 z-[201] bg-[#090909] border-t border-white/10 rounded-t-[32px] max-h-[90vh] overflow-hidden"
      >

        <div className="max-w-4xl mx-auto p-5 md:p-7">

          <div className="w-10 h-1 rounded-full bg-zinc-800 mx-auto mb-6" />

          <div className="flex items-start gap-4">

            <div className="w-16 h-20 rounded-2xl bg-zinc-900 overflow-hidden shrink-0">

              {video.thumbnail_url ? (
                <img
                  src={
                    video.thumbnail_url
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : video.video_url ? (
                <video
                  src={
                    video.video_url
                  }
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video
                    size={17}
                    className="text-zinc-700"
                  />
                </div>
              )}

            </div>

            <div className="flex-1 min-w-0">

              <div className="flex items-start justify-between gap-3">

                <div>

                  <h2 className="text-sm font-black italic truncate">
                    {video.title ||
                      video.caption ||
                      'Untitled video'}
                  </h2>

                  <p className="text-[8px] text-zinc-600 mt-1 font-mono">
                    {video.id}
                  </p>

                </div>

                <button
                  onClick={
                    onClose
                  }
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"
                >
                  <X
                    size={14}
                  />
                </button>

              </div>

              <div className="flex gap-2 mt-4">

                <button
                  onClick={() =>
                    setMode(
                      'metrics'
                    )
                  }
                  className={`px-3 py-2 rounded-xl text-[8px] uppercase font-black ${
                    mode ===
                    'metrics'
                      ? 'bg-cyan-500 text-black'
                      : 'bg-white/5 text-zinc-500'
                  }`}
                >
                  Metrics
                </button>

                <button
                  onClick={() =>
                    setMode(
                      'preview'
                    )
                  }
                  className={`px-3 py-2 rounded-xl text-[8px] uppercase font-black ${
                    mode ===
                    'preview'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-zinc-500'
                  }`}
                >
                  Preview
                </button>

              </div>

            </div>

          </div>

          <div className="mt-6 max-h-[52vh] overflow-y-auto pr-1">

            {mode ===
            'metrics' ? (
              <div className="space-y-4">

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

                  <DrawerMetric
                    label="Views"
                    value={formatNumber(
                      views
                    )}
                    icon={Eye}
                  />

                  <DrawerMetric
                    label="Likes"
                    value={formatNumber(
                      likes
                    )}
                    icon={Heart}
                  />

                  <DrawerMetric
                    label="Comments"
                    value={formatNumber(
                      comments
                    )}
                    icon={
                      MessageCircle
                    }
                  />

                  <DrawerMetric
                    label="Shares"
                    value={formatNumber(
                      shares
                    )}
                    icon={Share2}
                  />

                  <DrawerMetric
                    label="Engagement"
                    value={formatNumber(
                      engagements
                    )}
                    icon={
                      Activity
                    }
                  />

                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <DrawerMetric
                    label="Saves"
                    value={formatNumber(
                      saves
                    )}
                    icon={
                      Bookmark
                    }
                  />

                  <DrawerMetric
                    label="Reposts"
                    value={formatNumber(
                      reposts
                    )}
                    icon={
                      Repeat2
                    }
                  />

                  <DrawerMetric
                    label="Completion"
                    value={
                      video.completion_rate !==
                      null &&
                      video.completion_rate !==
                        undefined
                        ? `${safeNumber(
                            video.completion_rate
                          ).toFixed(
                            1
                          )}%`
                        : '—'
                    }
                    icon={
                      TrendingUp
                    }
                  />

                  <DrawerMetric
                    label="Watch"
                    value={
                      video.average_watch_seconds !==
                      null &&
                      video.average_watch_seconds !==
                        undefined
                        ? formatDuration(
                            video.average_watch_seconds
                          )
                        : '—'
                    }
                    icon={
                      Clock
                    }
                  />

                </div>

                <div className="grid md:grid-cols-2 gap-3">

                  <InfoPanel
                    title="Content"
                    rows={[
                      [
                        'Status',
                        video.status ||
                          '—',
                      ],
                      [
                        'Category',
                        video.category ||
                          '—',
                      ],
                      [
                        'Privacy',
                        video.privacy ||
                          (video.is_private
                            ? 'private'
                            : 'public'),
                      ],
                      [
                        'Language',
                        video.language ||
                          '—',
                      ],
                      [
                        'Copyright',
                        video.copyright_status ||
                          '—',
                      ],
                    ]}
                  />

                  <InfoPanel
                    title="Publishing"
                    rows={[
                      [
                        'Created',
                        formatDate(
                          video.created_at
                        ),
                      ],
                      [
                        'Scheduled',
                        formatDate(
                          video.scheduled_at
                        ),
                      ],
                      [
                        'Pinned',
                        video.is_pinned
                          ? 'Yes'
                          : 'No',
                      ],
                      [
                        'Featured',
                        video.is_featured
                          ? 'Yes'
                          : 'No',
                      ],
                      [
                        'AI generated',
                        video.ai_generated
                          ? 'Yes'
                          : 'No',
                      ],
                    ]}
                  />

                </div>

                {actionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/10 text-[9px] text-red-400">
                    {actionError}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">

                  {video.status ===
                  'archived' ? (
                    <ActionButton
                      icon={
                        RotateCcw
                      }
                      label="Restore"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        onAction(
                          'restore'
                        )
                      }
                    />
                  ) : (
                    <ActionButton
                      icon={
                        Archive
                      }
                      label="Archive"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        onAction(
                          'archive'
                        )
                      }
                    />
                  )}

                  <ActionButton
                    icon={
                      Trash2
                    }
                    label="Delete"
                    danger
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      onAction(
                        'delete'
                      )
                    }
                  />

                </div>

              </div>
            ) : (
              <div className="flex justify-center">

                <div className="w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl border border-white/10 overflow-hidden">

                  {video.video_url ? (
                    <video
                      src={
                        video.video_url
                      }
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">

                      <Video
                        size={25}
                        className="text-zinc-700 mb-3"
                      />

                      <p className="text-[8px] uppercase tracking-widest text-zinc-600 font-black">
                        No video URL
                      </p>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>

        </div>

      </motion.div>
    </>
  );
};

/*
============================================================
COMPONENTS
============================================================
*/

const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

    <div>

      <p className="text-[8px] uppercase tracking-[3px] font-black text-cyan-400">
        {eyebrow}
      </p>

      <h2 className="text-2xl md:text-3xl font-black italic tracking-tight mt-1">
        {title}
      </h2>

      <p className="text-[10px] text-zinc-600 mt-2 max-w-2xl leading-relaxed">
        {description}
      </p>

    </div>

    {action}

  </div>
);

const SectionShell = ({
  title,
  subtitle,
  action,
  children,
}) => (
  <section className="rounded-[28px] border border-white/[0.055] bg-white/[0.015] overflow-hidden">

    <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between gap-3">

      <div>

        <h3 className="text-[10px] uppercase tracking-[2px] font-black text-zinc-300">
          {title}
        </h3>

        {subtitle && (
          <p className="text-[8px] text-zinc-700 mt-1">
            {subtitle}
          </p>
        )}

      </div>

      {action}

    </div>

    <div className="p-5">
      {children}
    </div>

  </section>
);

const MetricCard = ({
  label,
  value,
  icon: Icon,
  tone = 'cyan',
  growth,
}) => {
  const tones = {
    cyan:
      'text-cyan-400 bg-cyan-500/10',
    purple:
      'text-purple-400 bg-purple-500/10',
    rose:
      'text-rose-400 bg-rose-500/10',
    emerald:
      'text-emerald-400 bg-emerald-500/10',
    yellow:
      'text-yellow-400 bg-yellow-500/10',
  };

  return (
    <div className="rounded-3xl border border-white/[0.05] bg-white/[0.018] p-4">

      <div className="flex items-center justify-between">

        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${tones[tone]}`}
        >
          <Icon size={14} />
        </div>

        {growth !== null &&
          growth !==
            undefined && (
            <GrowthBadge
              value={
                growth
              }
            />
          )}

      </div>

      <p className="text-xl md:text-2xl font-black italic font-mono mt-4 tracking-tight">
        {value}
      </p>

      <p className="text-[7px] uppercase tracking-[1.5px] text-zinc-600 font-black mt-1">
        {label}
      </p>

    </div>
  );
};

const SmallMetric = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="p-4 rounded-2xl bg-white/[0.018] border border-white/[0.045]">

    <div className="flex items-center gap-2 text-zinc-600">

      <Icon size={12} />

      <span className="text-[7px] uppercase tracking-widest font-black">
        {label}
      </span>

    </div>

    <p className="text-lg font-black italic font-mono mt-2">
      {formatNumber(value)}
    </p>

  </div>
);

const GrowthCard = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="p-5 rounded-3xl bg-white/[0.018] border border-white/[0.05]">

    <Icon
      size={16}
      className="text-cyan-400"
    />

    <p className="text-[8px] uppercase tracking-widest text-zinc-600 font-black mt-4">
      {label}
    </p>

    <div className="mt-1">

      {value === null ? (
        <span className="text-sm font-black text-zinc-600">
          Not enough data
        </span>
      ) : (
        <span
          className={`text-2xl font-black italic ${
            value > 0
              ? 'text-emerald-400'
              : value < 0
              ? 'text-rose-400'
              : 'text-zinc-400'
          }`}
        >
          {value > 0
            ? '+'
            : ''}
          {value.toFixed(
            1
          )}
          %
        </span>
      )}

    </div>

  </div>
);

const GrowthBadge = ({
  value,
}) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-[7px] font-black text-emerald-400">
        <TrendingUp
          size={10}
        />
        {value.toFixed(
          1
        )}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="flex items-center gap-1 text-[7px] font-black text-rose-400">
        <TrendingDown
          size={10}
        />
        {Math.abs(
          value
        ).toFixed(1)}
        %
      </span>
    );
  }

  return (
    <span className="text-[7px] font-black text-zinc-600">
      0%
    </span>
  );
};

const Signal = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="p-3 rounded-2xl bg-white/[0.018] border border-white/[0.04]">

    <Icon
      size={12}
      className="text-zinc-600"
    />

    <p className="text-sm font-black italic font-mono mt-2">
      {typeof value ===
      'number'
        ? formatNumber(
            value
          )
        : value}
    </p>

    <p className="text-[7px] uppercase tracking-widest text-zinc-700 font-black mt-1">
      {label}
    </p>

  </div>
);

const ProfileRow = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.035] last:border-0">

    <span className="text-[8px] uppercase tracking-widest text-zinc-700 font-black">
      {label}
    </span>

    <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[60%]">
      {value}
    </span>

  </div>
);

const TopContentRow = ({
  item,
  rank,
  onVideo,
}) => {
  const title =
    item.title ||
    item.caption ||
    item.video_title ||
    'Untitled video';

  const views =
    item.views ??
    item.views_count ??
    0;

  const likes =
    item.likes ??
    item.likes_count ??
    0;

  return (
    <button
      onClick={() =>
        onVideo(
          item
        )
      }
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.018] border border-white/[0.04] hover:border-cyan-500/10 text-left"
    >

      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[9px] font-black text-cyan-400">
        {rank}
      </div>

      <div className="flex-1 min-w-0">

        <p className="text-[10px] font-bold truncate text-zinc-300">
          {title}
        </p>

        <div className="flex gap-3 mt-1">

          <span className="text-[7px] text-zinc-600">
            {formatNumber(
              views
            )}{' '}
            views
          </span>

          <span className="text-[7px] text-zinc-600">
            {formatNumber(
              likes
            )}{' '}
            likes
          </span>

        </div>

      </div>

      <ChevronRight
        size={13}
        className="text-zinc-700"
      />

    </button>
  );
};

const QuickTool = ({
  icon: Icon,
  title,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="text-left p-4 rounded-2xl bg-white/[0.018] border border-white/[0.045] hover:border-cyan-500/10 transition"
  >

    <Icon
      size={15}
      className="text-cyan-400"
    />

    <p className="text-[9px] uppercase tracking-widest font-black mt-3">
      {title}
    </p>

    <p className="text-[8px] text-zinc-700 mt-1">
      {description}
    </p>

  </button>
);

const VideoCard = ({
  video,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="text-left group rounded-[24px] overflow-hidden border border-white/[0.05] bg-white/[0.015] hover:border-cyan-500/15 transition"
  >

    <div className="aspect-[9/14] bg-zinc-950 relative overflow-hidden">

      {video.thumbnail_url ? (
        <img
          src={
            video.thumbnail_url
          }
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
        />
      ) : video.video_url ? (
        <video
          src={
            video.video_url
          }
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Video
            size={22}
            className="text-zinc-800"
          />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/40 to-transparent">

        <div className="flex items-center gap-2">

          <span className="flex items-center gap-1 text-[7px] font-black">
            <Eye size={9} />
            {formatNumber(
              video.views_count
            )}
          </span>

          <span className="flex items-center gap-1 text-[7px] font-black">
            <Heart size={9} />
            {formatNumber(
              video.likes_count
            )}
          </span>

        </div>

      </div>

    </div>

    <div className="p-4">

      <p className="text-[10px] font-bold truncate">
        {video.title ||
          video.caption ||
          'Untitled video'}
      </p>

      <div className="flex items-center justify-between mt-2">

        <span className="text-[7px] uppercase tracking-widest text-zinc-700">
          {video.status ||
            'published'}
        </span>

        <span className="text-[7px] text-zinc-700">
          {formatDate(
            video.created_at
          )}
        </span>

      </div>

    </div>

  </button>
);

const PerformanceRow = ({
  item,
}) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.018] border border-white/[0.04]">

    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">

      <BarChart3
        size={13}
        className="text-cyan-400"
      />

    </div>

    <div className="flex-1 min-w-0">

      <p className="text-[9px] font-bold truncate">
        {item.title ||
          item.caption ||
          item.video_title ||
          'Video'}
      </p>

      <p className="text-[7px] text-zinc-700 mt-1">
        {item.category ||
          'Uncategorized'}
      </p>

    </div>

    <div className="text-right">

      <p className="text-[9px] font-black font-mono">
        {formatNumber(
          item.views ??
            item.views_count
        )}
      </p>

      <p className="text-[7px] text-zinc-700">
        views
      </p>

    </div>

  </div>
);

const LiveRow = ({
  stream,
}) => (
  <div className="p-4 rounded-2xl bg-white/[0.018] border border-white/[0.04]">

    <div className="flex items-start gap-3">

      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">

        <Radio
          size={14}
          className="text-purple-400"
        />

      </div>

      <div className="flex-1 min-w-0">

        <p className="text-[10px] font-bold truncate">
          {stream.title ||
            'Untitled livestream'}
        </p>

        <p className="text-[7px] text-zinc-700 mt-1">
          {stream.category ||
            'Uncategorized'}
          {' · '}
          {stream.status ||
            'unknown'}
        </p>

      </div>

      <div className="text-right">

        <p className="text-[9px] font-black">
          {formatNumber(
            stream.peak_viewers
          )}
        </p>

        <p className="text-[7px] text-zinc-700">
          peak viewers
        </p>

      </div>

    </div>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">

      <TinyValue
        label="Watch"
        value={formatDuration(
          stream.total_watch_seconds
        )}
      />

      <TinyValue
        label="Shares"
        value={formatNumber(
          stream.shares_count
        )}
      />

      <TinyValue
        label="Followers"
        value={formatNumber(
          stream.followers_gained
        )}
      />

      <TinyValue
        label="Gifts"
        value={formatNumber(
          stream.gifts_count ??
            stream.total_gifts
        )}
      />

      <TinyValue
        label="Revenue"
        value={`K${formatMoney(
          stream.revenue
        )}`}
      />

    </div>

  </div>
);

const TinyValue = ({
  label,
  value,
}) => (
  <div className="p-2 rounded-xl bg-black/20">

    <p className="text-[6px] uppercase tracking-widest text-zinc-700 font-black">
      {label}
    </p>

    <p className="text-[8px] font-black font-mono mt-1">
      {value}
    </p>

  </div>
);

const AchievementCard = ({
  achievement,
}) => {
  const progress = safeNumber(
    achievement.progress ??
      achievement.progress_percent ??
      achievement.percentage
  );

  const hasProgress =
    achievement.progress !==
      undefined ||
    achievement.progress_percent !==
      undefined ||
    achievement.percentage !==
      undefined;

  return (
    <div className="p-5 rounded-3xl bg-white/[0.018] border border-white/[0.05]">

      <div className="flex items-start gap-3">

        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">

          <Trophy
            size={15}
            className="text-yellow-400"
          />

        </div>

        <div className="flex-1">

          <p className="text-[10px] font-black">
            {achievement.name ||
              achievement.title ||
              achievement.achievement_name ||
              'Achievement'}
          </p>

          <p className="text-[8px] text-zinc-600 mt-1 leading-relaxed">
            {achievement.description ||
              achievement.summary ||
              'Creator achievement'}
          </p>

        </div>

      </div>

      {hasProgress && (
        <div className="mt-5">

          <div className="flex justify-between mb-2">

            <span className="text-[7px] uppercase tracking-widest text-zinc-700 font-black">
              Progress
            </span>

            <span className="text-[7px] text-zinc-500">
              {Math.min(
                100,
                progress
              ).toFixed(0)}
              %
            </span>

          </div>

          <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">

            <div
              className="h-full bg-cyan-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    progress
                  )
                )}%`,
              }}
            />

          </div>

        </div>
      )}

    </div>
  );
};

const DrawerMetric = ({
  label,
  value,
  icon: Icon,
}) => (
  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">

    <Icon
      size={12}
      className="text-cyan-400"
    />

    <p className="text-lg font-black font-mono italic mt-2">
      {value}
    </p>

    <p className="text-[7px] uppercase tracking-widest text-zinc-700 font-black mt-1">
      {label}
    </p>

  </div>
);

const InfoPanel = ({
  title,
  rows,
}) => (
  <div className="p-4 rounded-2xl bg-white/[0.018] border border-white/[0.04]">

    <p className="text-[8px] uppercase tracking-[2px] font-black text-zinc-600 mb-3">
      {title}
    </p>

    <div className="space-y-2">

      {rows.map(
        ([label, value]) => (
          <ProfileRow
            key={label}
            label={label}
            value={value}
          />
        )
      )}

    </div>

  </div>
);

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[8px] uppercase tracking-widest font-black disabled:opacity-50 ${
      danger
        ? 'bg-red-500/10 text-red-400 border border-red-500/10'
        : 'bg-white/5 text-zinc-400 border border-white/5'
    }`}
  >

    <Icon size={12} />

    {label}

  </button>
);

const ReportButton = ({
  title,
  description,
  icon: Icon,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="text-left p-5 rounded-2xl bg-white/[0.018] border border-white/[0.05] hover:border-cyan-500/10 transition"
  >

    <Icon
      size={16}
      className="text-cyan-400"
    />

    <p className="text-[9px] uppercase tracking-widest font-black mt-4">
      {title}
    </p>

    <p className="text-[8px] text-zinc-700 mt-1">
      {description}
    </p>

  </button>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="py-14 text-center">

    <div className="w-12 h-12 rounded-2xl bg-white/[0.025] border border-white/[0.04] flex items-center justify-center mx-auto">

      <Icon
        size={18}
        className="text-zinc-700"
      />

    </div>

    <p className="text-[9px] uppercase tracking-[2px] font-black text-zinc-500 mt-4">
      {title}
    </p>

    <p className="text-[8px] text-zinc-700 mt-2 max-w-xs mx-auto leading-relaxed">
      {description}
    </p>

  </div>
);

/*
============================================================
REAL ANALYTICS CHART
============================================================

No fake bars.

The chart is generated from actual rows returned by
creator_studio_daily_analytics / creator_daily_stats.
============================================================
*/

const AnalyticsChart = ({
  data,
  metric,
  secondaryMetric,
  label,
}) => {
  if (!data?.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data"
        description="No analytics records exist for this metric."
      />
    );
  }

  const values = data.map(
    (item) =>
      safeNumber(
        item?.[metric]
      )
  );

  const secondaryValues =
    secondaryMetric
      ? data.map(
          (item) =>
            safeNumber(
              item?.[
                secondaryMetric
              ]
            )
        )
      : [];

  const max = Math.max(
    1,
    ...values,
    ...secondaryValues
  );

  return (
    <div>

      <div className="h-48 flex items-end gap-[3px]">

        {data.map(
          (item, index) => {
            const value =
              values[index];

            const height =
              (value / max) *
              100;

            const secondary =
              secondaryMetric
                ? (secondaryValues[
                    index
                  ] /
                    max) *
                  100
                : 0;

            return (
              <div
                key={
                  item.stat_date ||
                  item.created_at ||
                  index
                }
                className="flex-1 h-full flex items-end gap-[1px] group relative"
              >

                <div
                  className="w-full bg-cyan-500/60 rounded-t-sm min-h-[2px] transition-all group-hover:bg-cyan-400"
                  style={{
                    height: `${Math.max(
                      2,
                      height
                    )}%`,
                  }}
                  title={`${label}: ${formatNumber(
                    value
                  )}`}
                />

                {secondaryMetric && (
                  <div
                    className="w-full bg-purple-500/50 rounded-t-sm min-h-[2px]"
                    style={{
                      height: `${Math.max(
                        2,
                        secondary
                      )}%`,
                    }}
                  />
                )}

              </div>
            );
          }
        )}

      </div>

      <div className="flex justify-between mt-3 text-[7px] text-zinc-700 font-mono">

        <span>
          {formatDate(
            data[0]?.stat_date
          )}
        </span>

        <span>
          {formatDate(
            data[
              data.length - 1
            ]?.stat_date
          )}
        </span>

      </div>

      {secondaryMetric && (
        <div className="flex gap-4 mt-4">

          <span className="flex items-center gap-2 text-[7px] uppercase tracking-widest text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-cyan-500/60" />
            {label}
          </span>

          <span className="flex items-center gap-2 text-[7px] uppercase tracking-widest text-zinc-600">
            <span className="w-2 h-2 rounded-sm bg-purple-500/50" />
            {secondaryMetric.replace(
              /_/g,
              ' '
            )}
          </span>

        </div>
      )}

    </div>
  );
};

const AnalyticsMiniChart = ({
  data,
  metric,
}) => {
  if (!data?.length) {
    return null;
  }

  const values = data.map(
    (item) =>
      safeNumber(
        item?.[metric]
      )
  );

  const max = Math.max(
    1,
    ...values
  );

  const recent =
    values.slice(-30);

  return (
    <div className="h-32 flex items-end gap-1">

      {recent.map(
        (value, index) => (
          <div
            key={index}
            className="flex-1 h-full flex items-end"
          >

            <div
              className="w-full rounded-t-sm bg-cyan-500/60 hover:bg-cyan-400 transition"
              style={{
                height: `${Math.max(
                  2,
                  (value /
                    max) *
                    100
                )}%`,
              }}
              title={formatNumber(
                value
              )}
            />

          </div>
        )
      )}

    </div>
  );
};

export default UniverseTools;
