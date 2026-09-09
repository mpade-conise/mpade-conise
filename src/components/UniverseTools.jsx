import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  ChevronLeft,
  ChevronRight,
  Play,
  DollarSign,
  Heart,
  RefreshCcw,
  Coins,
  Crown,
  Gift,
  BarChart3,
  LayoutDashboard,
  ListVideo,
  Sparkles,
  Eye,
  Bell,
  Video,
  FileText,
  Users,
  MessageCircle,
  Calendar,
  Wand2,
  TrendingUp,
  Clock3,
  Share2,
  Bookmark,
  Repeat2,
  UserPlus,
  Radio,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  Shield,
  Lock,
  Smartphone,
  Monitor,
  Globe,
  Music,
  Image as ImageIcon,
  Megaphone,
  Trophy,
  Target,
  Zap,
  CreditCard,
  Banknote,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Edit3,
  Archive,
  RotateCcw,
  Download,
  CalendarDays,
  Timer,
  Gauge,
  Activity,
  MousePointerClick,
  UserRound,
  UserCheck,
  UserX,
  Volume2,
  Flag,
  Tag,
  Hash,
  Lightbulb,
  Bot,
  FileDown,
  ExternalLink,
  Menu,
  SlidersHorizontal,
  Layers,
  Database,
  Wifi,
  WifiOff,
  MoreVertical,
} from 'lucide-react';

import { supabase } from '../supabaseClient';

/*
|--------------------------------------------------------------------------
| CREATOR TIPS
|--------------------------------------------------------------------------
*/

const CREATOR_TIPS = [
  "Trending: Use 'glassmorphism' tags to reach more developers.",
  "Peak Hour: Post at 7:00 PM CAT for maximum Malawian reach.",
  "Engagement Tip: Reply to 3 comments to boost video rank.",
  "Monetization: You're close to a payout. Keep streaming.",
  "Growth Tip: Strong hooks in the first 2 seconds improve retention.",
  "Discovery Tip: Mix trending topics with your own creator identity.",
  "Audience Tip: Study the videos that bring the most followers.",
  "Consistency Tip: Build a predictable publishing schedule.",
];

/*
|--------------------------------------------------------------------------
| NAVIGATION
|--------------------------------------------------------------------------
*/

const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
      },
      {
        id: 'growth',
        label: 'Growth Center',
        icon: TrendingUp,
      },
    ],
  },

  {
    id: 'content',
    label: 'Content',
    items: [
      {
        id: 'videos',
        label: 'Content',
        icon: ListVideo,
      },
      {
        id: 'library',
        label: 'Library',
        icon: Database,
      },
      {
        id: 'schedule',
        label: 'Scheduler',
        icon: CalendarDays,
      },
      {
        id: 'seo',
        label: 'SEO & Discovery',
        icon: Hash,
      },
    ],
  },

  {
    id: 'audience',
    label: 'Audience',
    items: [
      {
        id: 'audience',
        label: 'Audience',
        icon: Users,
      },
      {
        id: 'comments',
        label: 'Comments',
        icon: MessageCircle,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
      },
    ],
  },

  {
    id: 'creator',
    label: 'Creator',
    items: [
      {
        id: 'ai',
        label: 'AI Intelligence',
        icon: Sparkles,
      },
      {
        id: 'livestream',
        label: 'Live Studio',
        icon: Radio,
      },
      {
        id: 'goals',
        label: 'Goals & Achievements',
        icon: Trophy,
      },
      {
        id: 'tools',
        label: 'Creator Tools',
        icon: Wand2,
      },
    ],
  },

  {
    id: 'earn',
    label: 'Earn',
    items: [
      {
        id: 'monetization',
        label: 'Monetization',
        icon: DollarSign,
      },
      {
        id: 'gifts',
        label: 'Gifts',
        icon: Gift,
      },
      {
        id: 'subscriptions',
        label: 'Subscriptions',
        icon: Crown,
      },
      {
        id: 'paid',
        label: 'Paid Content',
        icon: CreditCard,
      },
      {
        id: 'finance',
        label: 'Financial Analytics',
        icon: Wallet,
      },
    ],
  },

  {
    id: 'business',
    label: 'Business',
    items: [
      {
        id: 'collaboration',
        label: 'Brand Studio',
        icon: Megaphone,
      },
      {
        id: 'profile',
        label: 'Creator Profile',
        icon: UserRound,
      },
    ],
  },

  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
      },
      {
        id: 'settings',
        label: 'Studio Settings',
        icon: Settings,
      },
      {
        id: 'reports',
        label: 'Reports & Export',
        icon: FileDown,
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const formatNumber = (value) => {
  const number = Number(value) || 0;

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

const toSafeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const percentage = (part, total) => {
  if (!total) return 0;

  return Math.min(
    100,
    Math.max(0, (Number(part) / Number(total)) * 100)
  );
};

const getVideoStatus = (video) => {
  if (!video) return 'Unknown';

  if (video.status) {
    return String(video.status);
  }

  return 'Published';
};

const getVideoTitle = (video) =>
  video?.title ||
  video?.caption ||
  'Untitled Content';

const downloadJSON = (data, filename) => {
  try {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: 'application/json',
      }
    );

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
  }
};

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

const UniverseTools = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [myVideos, setMyVideos] = useState([]);

  const [aiTip, setAiTip] = useState(
    'Analyzing creator trends...'
  );

  const [selectedVideo, setSelectedVideo] = useState(null);

  const [drawerMode, setDrawerMode] =
    useState('metrics');

  const [fetchError, setFetchError] = useState('');

  const [searchQuery, setSearchQuery] =
    useState('');

  const [contentFilter, setContentFilter] =
    useState('all');

  const [analyticsRange, setAnalyticsRange] =
    useState('28d');

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showCreatorMenu, setShowCreatorMenu] =
    useState(false);

  const [stats, setStats] = useState({
    views: '0',
    followers: '0',
    likes: '0',
    revenue: '0.00',
    coins: '0',

    comments: '0',
    shares: '0',
    saves: '0',

    profileVisits: '0',
    reach: '0',
    impressions: '0',

    engagement: '0%',
    retention: '0%',
    watchTime: '0m',

    dailyViews: '0',
    weeklyViews: '0',
    monthlyViews: '0',

    followerGrowth: '+0%',
    viewsGrowth: '+0%',
    likesGrowth: '+0%',
    revenueGrowth: '+0%',
  });

  const [notifications, setNotifications] =
    useState([
      {
        id: 1,
        type: 'follower',
        title: 'New followers',
        message: 'Your audience is growing.',
        time: 'Today',
        unread: true,
      },
      {
        id: 2,
        type: 'gift',
        title: 'Creator gift',
        message: 'You received new virtual gifts.',
        time: 'Today',
        unread: true,
      },
      {
        id: 3,
        type: 'analytics',
        title: 'Analytics ready',
        message: 'Your latest performance report is available.',
        time: 'Yesterday',
        unread: false,
      },
    ]);

  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: '60',
    compactMode: false,
    reducedMotion: false,
    desktopLayout: true,
    showWidgets: true,
    offlineMode: false,
  });

  const mountedRef = useRef(true);

  const refreshLockRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | LIFECYCLE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SUPABASE DATA
  |--------------------------------------------------------------------------
  */

  const fetchRealtimeStats = useCallback(
    async () => {
      if (refreshLockRef.current) return;

      refreshLockRef.current = true;

      if (mountedRef.current) {
        setSyncing(true);
        setFetchError('');
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (mountedRef.current) {
            setMyVideos([]);

            setStats({
              views: '0',
              followers: '0',
              likes: '0',
              revenue: '0.00',
              coins: '0',
              comments: '0',
              shares: '0',
              saves: '0',
              profileVisits: '0',
              reach: '0',
              impressions: '0',
              engagement: '0%',
              retention: '0%',
              watchTime: '0m',
              dailyViews: '0',
              weeklyViews: '0',
              monthlyViews: '0',
              followerGrowth: '+0%',
              viewsGrowth: '+0%',
              likesGrowth: '+0%',
              revenueGrowth: '+0%',
            });

            setFetchError(
              'No authenticated creator session found.'
            );
          }

          return;
        }

        const [
          profileResult,
          videosResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select(
              `
                id,
                coins,
                follower_count,
                follower_counts,
                following_count,
                total_likes,
                balance,
                total_tokens_earned
              `
            )
            .eq('id', user.id)
            .maybeSingle(),

          supabase
            .from('videos')
            .select(
              `
                id,
                user_id,
                caption,
                title,
                description,
                video_url,
                thumbnail_url,
                views_count,
                likes_count,
                comments_count,
                shares_count,
                saves_count,
                created_at,
                status,
                privacy,
                category,
                hashtags,
                duration,
                processing_status
              `
            )
            .eq('user_id', user.id)
            .order('created_at', {
              ascending: false,
            }),
        ]);

        if (profileResult.error) {
          console.error(
            'Universe Studio profile error:',
            profileResult.error
          );
        }

        if (videosResult.error) {
          console.error(
            'Universe Studio videos error:',
            videosResult.error
          );
        }

        if (!mountedRef.current) return;

        const profile =
          profileResult.data || {};

        const videos = Array.isArray(
          videosResult.data
        )
          ? videosResult.data
          : [];

        const totalViews = videos.reduce(
          (total, video) =>
            total +
            toSafeNumber(
              video?.views_count
            ),
          0
        );

        const totalLikes = videos.reduce(
          (total, video) =>
            total +
            toSafeNumber(
              video?.likes_count
            ),
          0
        );

        const totalComments = videos.reduce(
          (total, video) =>
            total +
            toSafeNumber(
              video?.comments_count
            ),
          0
        );

        const totalShares = videos.reduce(
          (total, video) =>
            total +
            toSafeNumber(
              video?.shares_count
            ),
          0
        );

        const totalSaves = videos.reduce(
          (total, video) =>
            total +
            toSafeNumber(
              video?.saves_count
            ),
          0
        );

        const followers = toSafeNumber(
          profile?.follower_count ??
            profile?.follower_counts
        );

        const rawCoins = toSafeNumber(
          profile?.coins
        );

        const balance = toSafeNumber(
          profile?.balance
        );

        const revenue =
          balance ||
          rawCoins * 0.1;

        const totalInteractions =
          totalLikes +
          totalComments +
          totalShares +
          totalSaves;

        const engagementRate =
          totalViews > 0
            ? (
                (totalInteractions /
                  totalViews) *
                100
              ).toFixed(1)
            : '0.0';

        setMyVideos(videos);

        setStats({
          views: formatNumber(
            totalViews
          ),

          followers: formatNumber(
            followers
          ),

          likes: formatNumber(
            totalLikes
          ),

          revenue:
            revenue.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            ),

          coins: formatNumber(
            rawCoins
          ),

          comments: formatNumber(
            totalComments
          ),

          shares: formatNumber(
            totalShares
          ),

          saves: formatNumber(
            totalSaves
          ),

          profileVisits: formatNumber(
            Math.round(
              totalViews * 0.08
            )
          ),

          reach: formatNumber(
            Math.round(
              totalViews * 0.82
            )
          ),

          impressions: formatNumber(
            Math.round(
              totalViews * 1.24
            )
          ),

          engagement: `${engagementRate}%`,

          retention:
            totalViews > 0
              ? `${Math.min(
                  100,
                  Math.max(
                    1,
                    Math.round(
                      45 +
                        engagementRate
                    )
                  )
                )}%`
              : '0%',

          watchTime:
            totalViews > 0
              ? `${Math.max(
                  1,
                  Math.round(
                    totalViews / 1500
                  )
                )}m`
              : '0m',

          dailyViews: formatNumber(
            Math.round(
              totalViews * 0.07
            )
          ),

          weeklyViews: formatNumber(
            Math.round(
              totalViews * 0.29
            )
          ),

          monthlyViews: formatNumber(
            totalViews
          ),

          followerGrowth: '+12.4%',
          viewsGrowth: '+18.7%',
          likesGrowth: '+9.8%',
          revenueGrowth: '+14.2%',
        });

        setAiTip(
          CREATOR_TIPS[
            Math.floor(
              Math.random() *
                CREATOR_TIPS.length
            )
          ]
        );

        if (
          profileResult.error ||
          videosResult.error
        ) {
          setFetchError(
            'Some creator data could not be synchronized.'
          );
        }
      } catch (error) {
        console.error(
          'Universe Studio sync error:',
          error
        );

        if (mountedRef.current) {
          setFetchError(
            error?.message ||
              'Unable to synchronize creator data.'
          );
        }
      } finally {
        refreshLockRef.current = false;

        if (mountedRef.current) {
          setSyncing(false);
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchRealtimeStats();
  }, [fetchRealtimeStats]);

  /*
  |--------------------------------------------------------------------------
  | AUTO REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!settings.autoRefresh) return;

    const interval =
      Number(settings.refreshInterval) ||
      60;

    const timer = setInterval(
      () => {
        fetchRealtimeStats();
      },
      interval * 1000
    );

    return () => clearInterval(timer);
  }, [
    settings.autoRefresh,
    settings.refreshInterval,
    fetchRealtimeStats,
  ]);

  /*
  |--------------------------------------------------------------------------
  | VIDEO HELPERS
  |--------------------------------------------------------------------------
  */

  const handleOpenVideo = useCallback(
    (video) => {
      if (!video) return;

      setSelectedVideo(video);
      setDrawerMode('metrics');
    },
    []
  );

  const handleCloseVideo = useCallback(
    () => {
      setSelectedVideo(null);
      setDrawerMode('metrics');
    },
    []
  );

  const filteredVideos = useMemo(() => {
    return myVideos.filter((video) => {
      const title =
        getVideoTitle(video)
          .toLowerCase();

      const query =
        searchQuery
          .trim()
          .toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query);

      const status =
        getVideoStatus(video)
          .toLowerCase();

      const matchesFilter =
        contentFilter === 'all' ||
        status ===
          contentFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    myVideos,
    searchQuery,
    contentFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const unreadNotifications =
    notifications.filter(
      (item) => item.unread
    ).length;

  const markAllNotificationsRead =
    () => {
      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          unread: false,
        }))
      );
    };

  /*
  |--------------------------------------------------------------------------
  | EXPORT
  |--------------------------------------------------------------------------
  */

  const exportStudioData = () => {
    downloadJSON(
      {
        exported_at:
          new Date().toISOString(),

        statistics: stats,

        videos: myVideos,

        creator_studio: {
          analytics_range:
            analyticsRange,

          settings,
        },
      },
      'universe-studio-report.json'
    );
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-cyan-500/20 rounded-full" />

            <div className="absolute inset-0 w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[4px] text-cyan-400">
              Universe Studio
            </p>

            <p className="text-[8px] font-black uppercase tracking-[3px] text-zinc-600 mt-2">
              Synchronizing Creator Network
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN
  |--------------------------------------------------------------------------
  */

  return (
    <div className="h-screen w-full bg-[#030303] text-white font-sans flex overflow-hidden relative selection:bg-cyan-500/20">

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .scrollbar-studio::-webkit-scrollbar {
              width: 5px;
              height: 5px;
            }

            .scrollbar-studio::-webkit-scrollbar-track {
              background: transparent;
            }

            .scrollbar-studio::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,.06);
              border-radius: 99px;
            }

            .scrollbar-studio::-webkit-scrollbar-thumb:hover {
              background: rgba(6,182,212,.25);
            }

            .studio-grid {
              background-image:
                linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
              background-size: 40px 40px;
            }
          `,
        }}
      />

      <div className="fixed inset-0 pointer-events-none z-0 studio-grid opacity-30" />

      <div className="fixed top-[-20%] left-[-10%] w-[45%] h-[50%] bg-cyan-500/[0.06] blur-[160px] rounded-full pointer-events-none z-0" />

      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/[0.06] blur-[160px] rounded-full pointer-events-none z-0" />

      {/* =========================================================
          SIDEBAR
      ========================================================== */}

      <aside
        className={`
          fixed lg:relative
          inset-y-0 left-0
          w-[270px]
          bg-[#050505]/95
          backdrop-blur-3xl
          border-r border-white/[0.06]
          z-[300]
          flex flex-col
          transition-transform duration-300
          ${
            mobileMenu
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >
        {/* Brand */}

        <div className="h-[76px] px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">

          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,.2)]">
              <Sparkles
                size={17}
                className="text-white"
              />
            </div>

            <div>
              <h1 className="text-[11px] font-black uppercase tracking-[3px] italic">
                Universe
              </h1>

              <p className="text-[7px] font-black uppercase tracking-[3px] text-zinc-600">
                Creator Studio
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setMobileMenu(false)
            }
            className="lg:hidden text-zinc-500"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto scrollbar-studio px-3 py-5 space-y-6">

          {NAV_GROUPS.map((group) => (
            <div key={group.id}>

              <p className="px-3 mb-2 text-[7px] font-black uppercase tracking-[3px] text-zinc-700">
                {group.label}
              </p>

              <div className="space-y-0.5">

                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(
                          item.id
                        );

                        setMobileMenu(
                          false
                        );
                      }}
                      className={`
                        w-full
                        flex
                        items-center
                        gap-3
                        px-3
                        py-2.5
                        rounded-xl
                        text-left
                        transition-all
                        group
                        ${
                          active
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/10'
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.025]'
                        }
                      `}
                    >
                      <Icon
                        size={15}
                        className={
                          active
                            ? 'text-cyan-400'
                            : 'text-zinc-600 group-hover:text-zinc-300'
                        }
                      />

                      <span className="flex-1 text-[9px] font-black uppercase tracking-wider">
                        {item.label}
                      </span>

                      {active && (
                        <span className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Creator footer */}

        <div className="p-3 border-t border-white/[0.06] shrink-0">

          <button
            onClick={() =>
              navigate('/profile')
            }
            className="w-full p-3 rounded-2xl bg-white/[0.025] border border-white/[0.05] flex items-center gap-3 hover:bg-white/[0.05] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
              <UserRound size={16} />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="text-[9px] font-black uppercase tracking-wider truncate">
                Creator Account
              </p>

              <p className="text-[7px] text-zinc-600 uppercase tracking-wider mt-0.5">
                Professional
              </p>
            </div>

            <ChevronRight
              size={13}
              className="text-zinc-700"
            />
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}

      <AnimatePresence>
        {mobileMenu && (
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
            onClick={() =>
              setMobileMenu(false)
            }
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[250] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* =========================================================
          MAIN AREA
      ========================================================== */}

      <div className="flex-1 min-w-0 flex flex-col relative z-10">

        {/* Header */}

        <header className="h-[76px] shrink-0 border-b border-white/[0.06] bg-black/70 backdrop-blur-2xl flex items-center justify-between px-4 lg:px-6 z-[200]">

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setMobileMenu(true)
              }
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] text-zinc-400"
            >
              <Menu size={17} />
            </button>

            <button
              onClick={() =>
                navigate(-1)
              }
              className="p-2 rounded-xl bg-white/[0.035] border border-white/[0.05] text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={17} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[10px] font-black uppercase tracking-[3px] italic">
                  {NAV_GROUPS.flatMap(
                    (group) =>
                      group.items
                  ).find(
                    (item) =>
                      item.id ===
                      activeTab
                  )?.label ||
                    'Dashboard'}
                </h2>

                <span className="hidden sm:flex items-center gap-1 text-[6px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 font-black uppercase">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              <p className="hidden sm:block text-[7px] text-zinc-700 uppercase tracking-[2px] mt-1">
                Creator command center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">

            {/* Connection */}

            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.025] border border-white/[0.04] mr-2">
              {settings.offlineMode ? (
                <WifiOff
                  size={12}
                  className="text-yellow-400"
                />
              ) : (
                <Wifi
                  size={12}
                  className="text-emerald-400"
                />
              )}

              <span className="text-[7px] font-black uppercase tracking-wider text-zinc-600">
                {settings.offlineMode
                  ? 'Offline'
                  : 'Connected'}
              </span>
            </div>

            {/* Notifications */}

            <div className="relative">

              <button
                onClick={() =>
                  setShowNotifications(
                    (value) =>
                      !value
                  )
                }
                className="relative p-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-500 hover:text-white transition-all"
              >
                <Bell size={16} />

                {unreadNotifications >
                  0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[12px] h-3 px-0.5 rounded-full bg-cyan-400 text-black text-[6px] font-black flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                      scale: 0.98,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                      scale: 0.98,
                    }}
                    className="absolute right-0 top-12 w-[320px] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[500]"
                  >
                    <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider">
                          Notifications
                        </p>

                        <p className="text-[7px] text-zinc-600 uppercase mt-1">
                          Creator activity
                        </p>
                      </div>

                      <button
                        onClick={
                          markAllNotificationsRead
                        }
                        className="text-[7px] font-black uppercase text-cyan-400"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto scrollbar-studio">

                      {notifications.map(
                        (notification) => (
                          <div
                            key={
                              notification.id
                            }
                            className={`p-4 border-b border-white/[0.04] ${
                              notification.unread
                                ? 'bg-cyan-500/[0.025]'
                                : ''
                            }`}
                          >
                            <div className="flex gap-3">

                              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                                {notification.type ===
                                'gift' ? (
                                  <Gift
                                    size={13}
                                    className="text-pink-400"
                                  />
                                ) : notification.type ===
                                  'follower' ? (
                                  <UserPlus
                                    size={13}
                                    className="text-cyan-400"
                                  />
                                ) : (
                                  <BarChart3
                                    size={13}
                                    className="text-purple-400"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="text-[9px] font-black">
                                  {
                                    notification.title
                                  }
                                </p>

                                <p className="text-[8px] text-zinc-500 mt-1">
                                  {
                                    notification.message
                                  }
                                </p>

                                <p className="text-[6px] text-zinc-700 uppercase mt-2">
                                  {
                                    notification.time
                                  }
                                </p>
                              </div>

                              {notification.unread && (
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-1 ml-auto shrink-0" />
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Refresh */}

            <button
              onClick={
                fetchRealtimeStats
              }
              disabled={syncing}
              className="p-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-500 hover:text-cyan-400 disabled:opacity-40"
            >
              <RefreshCcw
                size={15}
                className={
                  syncing
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>

            {/* Settings */}

            <button
              onClick={() =>
                setActiveTab(
                  'settings'
                )
              }
              className="p-2.5 rounded-xl hover:bg-white/[0.04] text-zinc-500 hover:text-white"
            >
              <Settings size={15} />
            </button>

            <button
              onClick={() =>
                setShowCreatorMenu(
                  (value) =>
                    !value
                )
              }
              className="hidden sm:flex w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 items-center justify-center"
            >
              <UserRound
                size={15}
                className="text-cyan-300"
              />
            </button>
          </div>
        </header>

        {/* Error */}

        <AnimatePresence>
          {fetchError && (
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
              className="absolute top-[86px] left-1/2 -translate-x-1/2 z-[190] w-[92%] max-w-lg"
            >
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl">
                <AlertCircle
                  size={14}
                  className="text-yellow-400 shrink-0"
                />

                <p className="flex-1 text-[8px] font-bold text-yellow-300 uppercase tracking-wider">
                  {fetchError}
                </p>

                <button
                  onClick={() =>
                    setFetchError('')
                  }
                  className="text-yellow-600"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =======================================================
            CONTENT
        ======================================================== */}

        <main className="flex-1 overflow-y-auto scrollbar-studio pb-10">

          <div className="max-w-[1500px] mx-auto p-4 sm:p-5 lg:p-7">

            <AnimatePresence mode="wait">

              {/* =================================================
                  DASHBOARD
              ================================================== */}

              {activeTab === 'dashboard' && (
                <DashboardView
                  key="dashboard"
                  stats={stats}
                  aiTip={aiTip}
                  myVideos={myVideos}
                  syncing={syncing}
                  navigate={navigate}
                  setActiveTab={
                    setActiveTab
                  }
                  onOpenVideo={
                    handleOpenVideo
                  }
                />
              )}

              {/* =================================================
                  ANALYTICS
              ================================================== */}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  key="analytics"
                  stats={stats}
                  range={
                    analyticsRange
                  }
                  setRange={
                    setAnalyticsRange
                  }
                  myVideos={myVideos}
                />
              )}

              {/* =================================================
                  GROWTH
              ================================================== */}

              {activeTab === 'growth' && (
                <GrowthView
                  key="growth"
                  stats={stats}
                  aiTip={aiTip}
                  myVideos={myVideos}
                  setActiveTab={
                    setActiveTab
                  }
                />
              )}

              {/* =================================================
                  CONTENT
              ================================================== */}

              {activeTab === 'videos' && (
                <ContentView
                  key="videos"
                  videos={
                    filteredVideos
                  }
                  total={
                    myVideos.length
                  }
                  searchQuery={
                    searchQuery
                  }
                  setSearchQuery={
                    setSearchQuery
                  }
                  filter={
                    contentFilter
                  }
                  setFilter={
                    setContentFilter
                  }
                  onOpenVideo={
                    handleOpenVideo
                  }
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  LIBRARY
              ================================================== */}

              {activeTab === 'library' && (
                <LibraryView
                  key="library"
                  videos={myVideos}
                  setActiveTab={
                    setActiveTab
                  }
                />
              )}

              {/* =================================================
                  SCHEDULER
              ================================================== */}

              {activeTab === 'schedule' && (
                <SchedulerView
                  key="schedule"
                />
              )}

              {/* =================================================
                  SEO
              ================================================== */}

              {activeTab === 'seo' && (
                <SEOView key="seo" />
              )}

              {/* =================================================
                  AUDIENCE
              ================================================== */}

              {activeTab === 'audience' && (
                <AudienceView
                  key="audience"
                  stats={stats}
                />
              )}

              {/* =================================================
                  COMMENTS
              ================================================== */}

              {activeTab === 'comments' && (
                <CommentsView
                  key="comments"
                />
              )}

              {/* =================================================
                  NOTIFICATIONS
              ================================================== */}

              {activeTab ===
                'notifications' && (
                <NotificationsView
                  key="notifications"
                  notifications={
                    notifications
                  }
                  markAll={
                    markAllNotificationsRead
                  }
                />
              )}

              {/* =================================================
                  AI
              ================================================== */}

              {activeTab === 'ai' && (
                <AIView
                  key="ai"
                  aiTip={aiTip}
                />
              )}

              {/* =================================================
                  LIVESTREAM
              ================================================== */}

              {activeTab ===
                'livestream' && (
                <LiveStudioView
                  key="livestream"
                  stats={stats}
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  GOALS
              ================================================== */}

              {activeTab === 'goals' && (
                <GoalsView
                  key="goals"
                />
              )}

              {/* =================================================
                  TOOLS
              ================================================== */}

              {activeTab === 'tools' && (
                <ToolsView
                  key="tools"
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  MONETIZATION
              ================================================== */}

              {activeTab ===
                'monetization' && (
                <MonetizationView
                  key="monetization"
                  stats={stats}
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  GIFTS
              ================================================== */}

              {activeTab === 'gifts' && (
                <GiftsView
                  key="gifts"
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  SUBSCRIPTIONS
              ================================================== */}

              {activeTab ===
                'subscriptions' && (
                <SubscriptionsView
                  key="subscriptions"
                />
              )}

              {/* =================================================
                  PAID CONTENT
              ================================================== */}

              {activeTab === 'paid' && (
                <PaidContentView
                  key="paid"
                />
              )}

              {/* =================================================
                  FINANCE
              ================================================== */}

              {activeTab === 'finance' && (
                <FinanceView
                  key="finance"
                  stats={stats}
                />
              )}

              {/* =================================================
                  BRAND
              ================================================== */}

              {activeTab ===
                'collaboration' && (
                <CollaborationView
                  key="collaboration"
                />
              )}

              {/* =================================================
                  PROFILE
              ================================================== */}

              {activeTab === 'profile' && (
                <ProfileView
                  key="profile"
                  navigate={navigate}
                />
              )}

              {/* =================================================
                  SECURITY
              ================================================== */}

              {activeTab === 'security' && (
                <SecurityView
                  key="security"
                />
              )}

              {/* =================================================
                  SETTINGS
              ================================================== */}

              {activeTab === 'settings' && (
                <SettingsView
                  key="settings"
                  settings={settings}
                  setSettings={
                    setSettings
                  }
                />
              )}

              {/* =================================================
                  REPORTS
              ================================================== */}

              {activeTab === 'reports' && (
                <ReportsView
                  key="reports"
                  stats={stats}
                  videos={myVideos}
                  exportStudioData={
                    exportStudioData
                  }
                />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* =========================================================
          VIDEO DRAWER
      ========================================================== */}

      <AnimatePresence>
        {selectedVideo && (
          <VideoDrawer
            video={selectedVideo}
            mode={drawerMode}
            setMode={setDrawerMode}
            onClose={handleCloseVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAGE WRAPPER
|--------------------------------------------------------------------------
*/

const Page = ({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
}) => (
  <motion.div
    initial={{
      opacity: 0,
      y: 10,
    }}
    animate={{
      opacity: 1,
      y: 0,
    }}
    exit={{
      opacity: 0,
      y: -10,
    }}
    transition={{
      duration: 0.2,
    }}
    className="space-y-6"
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

      <div className="flex items-center gap-3">

        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/10 flex items-center justify-center">
            <Icon
              size={18}
              className="text-cyan-400"
            />
          </div>
        )}

        <div>
          <h1 className="text-lg sm:text-xl font-black italic tracking-tight uppercase">
            {title}
          </h1>

          <p className="text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-[2px] mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      {action}
    </div>

    {children}
  </motion.div>
);

/*
|--------------------------------------------------------------------------
| CARD
|--------------------------------------------------------------------------
*/

const Card = ({
  children,
  className = '',
}) => (
  <div
    className={`bg-zinc-900/30 border border-white/[0.06] rounded-[24px] backdrop-blur-xl ${className}`}
  >
    {children}
  </div>
);

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

const StatCard = ({
  label,
  value,
  icon: Icon,
  iconClass = 'text-cyan-400',
  trend,
  trendPositive = true,
}) => (
  <Card className="p-5">

    <div className="flex items-start justify-between">

      <div className="w-9 h-9 rounded-xl bg-black border border-white/[0.06] flex items-center justify-center">
        <Icon
          size={16}
          className={iconClass}
        />
      </div>

      {trend && (
        <span
          className={`flex items-center gap-0.5 text-[7px] font-black ${
            trendPositive
              ? 'text-emerald-400'
              : 'text-rose-400'
          }`}
        >
          {trendPositive ? (
            <ArrowUpRight size={10} />
          ) : (
            <ArrowDownRight size={10} />
          )}
          {trend}
        </span>
      )}
    </div>

    <p className="text-2xl font-black font-mono italic mt-5 tracking-tight">
      {value}
    </p>

    <p className="text-[7px] font-black uppercase tracking-[2px] text-zinc-600 mt-1">
      {label}
    </p>
  </Card>
);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

const DashboardView = ({
  stats,
  aiTip,
  myVideos,
  navigate,
  setActiveTab,
  onOpenVideo,
}) => (
  <Page
    title="Creator Dashboard"
    subtitle="Your complete creator command center"
    icon={LayoutDashboard}
    action={
      <div className="flex gap-2">
        <button
          onClick={() =>
            setActiveTab('ai')
          }
          className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/10 text-purple-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-2"
        >
          <Sparkles size={12} />
          AI Center
        </button>

        <button
          onClick={() =>
            setActiveTab('livestream')
          }
          className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-[8px] font-black uppercase tracking-wider flex items-center gap-2"
        >
          <Radio size={12} />
          Go Live
        </button>
      </div>
    }
  >
    {/* AI */}

    <Card className="p-5 bg-gradient-to-r from-cyan-500/[0.08] via-purple-500/[0.06] to-transparent border-cyan-500/10">

      <div className="flex gap-4 items-center">

        <div className="w-11 h-11 rounded-2xl bg-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(6,182,212,.2)]">
          <Sparkles
            size={19}
            className="text-black"
          />
        </div>

        <div className="flex-1">
          <p className="text-[7px] font-black uppercase tracking-[3px] text-cyan-400">
            Creator Intelligence
          </p>

          <p className="text-xs text-zinc-300 mt-1">
            {aiTip}
          </p>
        </div>

        <button
          onClick={() =>
            setActiveTab('ai')
          }
          className="hidden sm:flex p-2.5 rounded-xl bg-white/[0.04] text-zinc-500 hover:text-white"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </Card>

    {/* Primary stats */}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

      <StatCard
        label="Total Views"
        value={stats.views}
        icon={Eye}
        trend={
          stats.viewsGrowth
        }
      />

      <StatCard
        label="Followers"
        value={
          stats.followers
        }
        icon={Users}
        iconClass="text-purple-400"
        trend={
          stats.followerGrowth
        }
      />

      <StatCard
        label="Total Likes"
        value={stats.likes}
        icon={Heart}
        iconClass="text-rose-400"
        trend={
          stats.likesGrowth
        }
      />

      <StatCard
        label="Estimated Revenue"
        value={`MK ${stats.revenue}`}
        icon={DollarSign}
        iconClass="text-emerald-400"
        trend={
          stats.revenueGrowth
        }
      />
    </div>

    {/* Secondary metrics */}

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

      <MiniMetric
        icon={MessageCircle}
        label="Comments"
        value={stats.comments}
      />

      <MiniMetric
        icon={Share2}
        label="Shares"
        value={stats.shares}
      />

      <MiniMetric
        icon={Bookmark}
        label="Saves"
        value={stats.saves}
      />

      <MiniMetric
        icon={MousePointerClick}
        label="Profile Visits"
        value={
          stats.profileVisits
        }
      />
    </div>

    {/* Performance */}

    <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4">

      <Card className="p-6">

        <SectionHeader
          title="Performance Overview"
          subtitle="Creator performance across your content"
          action={
            <button
              onClick={() =>
                setActiveTab(
                  'analytics'
                )
              }
              className="text-[7px] font-black uppercase text-cyan-400"
            >
              Full analytics
            </button>
          }
        />

        <div className="flex items-end gap-2 h-44 mt-8">

          {[
            32,
            48,
            41,
            65,
            53,
            79,
            68,
            91,
            70,
            84,
            62,
            95,
            78,
            88,
          ].map(
            (height, index) => (
              <div
                key={index}
                className="flex-1 h-full flex items-end group"
              >
                <motion.div
                  initial={{
                    height: 0,
                  }}
                  animate={{
                    height: `${height}%`,
                  }}
                  transition={{
                    duration: 0.6,
                    delay:
                      index * 0.03,
                  }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 to-cyan-400/80 group-hover:to-cyan-300 transition-all"
                />
              </div>
            )
          )}
        </div>

        <div className="flex justify-between mt-3 text-[7px] font-mono text-zinc-700 uppercase">
          <span>Past 14 days</span>
          <span>Today</span>
        </div>
      </Card>

      <Card className="p-6">

        <SectionHeader
          title="Creator Health"
          subtitle="Account performance signals"
        />

        <div className="space-y-5 mt-7">

          <HealthBar
            label="Engagement"
            value={
              stats.engagement
            }
            percent={72}
          />

          <HealthBar
            label="Retention"
            value={
              stats.retention
            }
            percent={68}
          />

          <HealthBar
            label="Discovery"
            value="81%"
            percent={81}
          />

          <HealthBar
            label="Monetization"
            value="64%"
            percent={64}
          />
        </div>
      </Card>
    </div>

    {/* Quick actions */}

    <div>
      <SectionHeader
        title="Creator Command Center"
        subtitle="Frequently used creator operations"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-3">

        <QuickAction
          icon={Upload}
          title="Upload"
          onClick={() =>
            navigate('/upload')
          }
        />

        <QuickAction
          icon={Radio}
          title="Start Live"
          onClick={() =>
            navigate('/live')
          }
        />

        <QuickAction
          icon={Calendar}
          title="Schedule"
          onClick={() =>
            setActiveTab(
              'schedule'
            )
          }
        />

        <QuickAction
          icon={Sparkles}
          title="AI Ideas"
          onClick={() =>
            setActiveTab('ai')
          }
        />

        <QuickAction
          icon={Users}
          title="Audience"
          onClick={() =>
            setActiveTab(
              'audience'
            )
          }
        />

        <QuickAction
          icon={DollarSign}
          title="Earnings"
          onClick={() =>
            setActiveTab(
              'monetization'
            )
          }
        />
      </div>
    </div>

    {/* Latest videos */}

    <Card className="p-5">

      <SectionHeader
        title="Latest Content"
        subtitle={`${myVideos.length} content items indexed`}
        action={
          <button
            onClick={() =>
              setActiveTab(
                'videos'
              )
            }
            className="text-[7px] font-black uppercase text-cyan-400"
          >
            View all
          </button>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">

        {myVideos
          .slice(0, 6)
          .map((video) => (
            <VideoCompact
              key={video.id}
              video={video}
              onClick={() =>
                onOpenVideo(video)
              }
            />
          ))}

        {myVideos.length === 0 && (
          <EmptyState
            icon={Video}
            title="No content yet"
            description="Upload your first video to start building your creator analytics."
          />
        )}
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| ANALYTICS
|--------------------------------------------------------------------------
*/

const AnalyticsView = ({
  stats,
  range,
  setRange,
  myVideos,
}) => (
  <Page
    title="Advanced Analytics"
    subtitle="Performance intelligence across your creator network"
    icon={BarChart3}
    action={
      <div className="flex items-center gap-2">

        <select
          value={range}
          onChange={(event) =>
            setRange(
              event.target.value
            )
          }
          className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-[8px] font-black uppercase text-zinc-300 outline-none"
        >
          <option value="today">
            Today
          </option>
          <option value="7d">
            7 Days
          </option>
          <option value="28d">
            28 Days
          </option>
          <option value="90d">
            90 Days
          </option>
          <option value="1y">
            1 Year
          </option>
        </select>
      </div>
    }
  >
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

      <StatCard
        label="Views"
        value={stats.views}
        icon={Eye}
        trend={stats.viewsGrowth}
      />

      <StatCard
        label="Reach"
        value={stats.reach}
        icon={Globe}
      />

      <StatCard
        label="Impressions"
        value={
          stats.impressions
        }
        icon={Activity}
      />

      <StatCard
        label="Engagement"
        value={
          stats.engagement
        }
        icon={Heart}
      />

      <StatCard
        label="Watch Time"
        value={
          stats.watchTime
        }
        icon={Clock3}
      />

      <StatCard
        label="Profile Visits"
        value={
          stats.profileVisits
        }
        icon={MousePointerClick}
      />
    </div>

    <div className="grid lg:grid-cols-2 gap-4">

      <AnalyticsChart
        title="Views"
        value={stats.views}
        color="cyan"
      />

      <AnalyticsChart
        title="Audience Growth"
        value={
          stats.followers
        }
        color="purple"
      />

      <AnalyticsChart
        title="Engagement"
        value={
          stats.engagement
        }
        color="emerald"
      />

      <AnalyticsChart
        title="Revenue"
        value={`MK ${stats.revenue}`}
        color="yellow"
      />
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">

      <MetricPanel
        title="Traffic Sources"
        rows={[
          ['For You', '46%'],
          ['Following', '22%'],
          ['Search', '17%'],
          ['Profile', '9%'],
          ['External', '6%'],
        ]}
      />

      <MetricPanel
        title="Audience Location"
        rows={[
          ['Malawi', '72%'],
          ['South Africa', '9%'],
          ['Zambia', '7%'],
          ['Tanzania', '5%'],
          ['Other', '7%'],
        ]}
      />

      <MetricPanel
        title="Devices"
        rows={[
          ['Android', '71%'],
          ['iOS', '22%'],
          ['Desktop', '5%'],
          ['Other', '2%'],
        ]}
      />

      <MetricPanel
        title="Audience Activity"
        rows={[
          ['Morning', '18%'],
          ['Afternoon', '27%'],
          ['Evening', '42%'],
          ['Night', '13%'],
        ]}
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Content Performance"
        subtitle={`${myVideos.length} videos analyzed`}
      />

      <div className="mt-5 space-y-2">

        {myVideos
          .slice(0, 8)
          .map((video, index) => (
            <div
              key={video.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <span className="w-6 text-[8px] font-black text-zinc-700">
                #{index + 1}
              </span>

              <div className="w-10 h-12 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                {video.video_url ? (
                  <video
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play
                      size={12}
                      className="text-zinc-700"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black truncate">
                  {getVideoTitle(
                    video
                  )}
                </p>

                <p className="text-[7px] text-zinc-600 uppercase mt-1">
                  {formatNumber(
                    video.views_count
                  )}{' '}
                  views ·{' '}
                  {formatNumber(
                    video.likes_count
                  )}{' '}
                  likes
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-black text-cyan-400">
                  {percentage(
                    video.likes_count,
                    video.views_count
                  ).toFixed(1)}
                  %
                </p>

                <p className="text-[6px] text-zinc-700 uppercase">
                  Like rate
                </p>
              </div>
            </div>
          ))}
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| GROWTH
|--------------------------------------------------------------------------
*/

const GrowthView = ({
  stats,
  aiTip,
  myVideos,
  setActiveTab,
}) => (
  <Page
    title="Growth Center"
    subtitle="Turn creator data into measurable growth"
    icon={TrendingUp}
  >
    <div className="grid lg:grid-cols-[1fr_1.5fr] gap-4">

      <Card className="p-7 text-center">

        <p className="text-[8px] font-black uppercase tracking-[3px] text-zinc-600">
          Creator Growth Score
        </p>

        <div className="w-40 h-40 mx-auto mt-7 rounded-full border-[10px] border-cyan-500/10 relative flex items-center justify-center">
          <div className="absolute inset-[-10px] rounded-full border-[10px] border-cyan-400 border-r-transparent border-b-transparent rotate-[-35deg]" />

          <div>
            <p className="text-4xl font-black italic">
              78
            </p>

            <p className="text-[7px] text-zinc-600 uppercase tracking-widest">
              / 100
            </p>
          </div>
        </div>

        <p className="text-[8px] text-emerald-400 uppercase font-black mt-6">
          Strong growth trajectory
        </p>
      </Card>

      <div className="space-y-3">

        <Recommendation
          icon={Clock3}
          title="Best Posting Window"
          description="Your audience is most active around 19:00 CAT."
          score="94%"
        />

        <Recommendation
          icon={Hash}
          title="Hashtag Opportunity"
          description="Technology and creator-development topics are showing strong discovery potential."
          score="87%"
        />

        <Recommendation
          icon={Video}
          title="Content Opportunity"
          description="Your short-form videos are outperforming longer uploads."
          score="81%"
        />

        <Recommendation
          icon={UserPlus}
          title="Follower Conversion"
          description={`Your content currently reaches approximately ${stats.reach} viewers.`}
          score="76%"
        />
      </div>
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Growth Actions"
        subtitle="Recommended actions based on your creator signals"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">

        <QuickAction
          icon={Sparkles}
          title="Generate Ideas"
          onClick={() =>
            setActiveTab('ai')
          }
        />

        <QuickAction
          icon={Hash}
          title="Optimize SEO"
          onClick={() =>
            setActiveTab('seo')
          }
        />

        <QuickAction
          icon={Calendar}
          title="Build Schedule"
          onClick={() =>
            setActiveTab(
              'schedule'
            )
          }
        />

        <QuickAction
          icon={BarChart3}
          title="Analyze Content"
          onClick={() =>
            setActiveTab(
              'analytics'
            )
          }
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Top Content Signals"
        subtitle="What your content is telling you"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <SignalCard
          icon={Eye}
          title="Reach"
          value={stats.reach}
          description="Estimated unique audience reach"
        />

        <SignalCard
          icon={Heart}
          title="Engagement"
          value={stats.engagement}
          description="Combined interaction rate"
        />

        <SignalCard
          icon={Video}
          title="Content"
          value={
            myVideos.length
          }
          description="Published content items"
        />
      </div>
    </Card>

    <Card className="p-5 bg-gradient-to-r from-purple-500/[0.08] to-cyan-500/[0.05]">
      <div className="flex gap-4 items-center">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Lightbulb
            size={17}
            className="text-purple-300"
          />
        </div>

        <div>
          <p className="text-[7px] font-black uppercase tracking-[3px] text-purple-300">
            AI Growth Signal
          </p>

          <p className="text-[10px] text-zinc-300 mt-1">
            {aiTip}
          </p>
        </div>
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| CONTENT
|--------------------------------------------------------------------------
*/

const ContentView = ({
  videos,
  total,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  onOpenVideo,
  navigate,
}) => (
  <Page
    title="Content Manager"
    subtitle={`${total} videos · manage, analyze and organize your content`}
    icon={ListVideo}
    action={
      <button
        onClick={() =>
          navigate('/upload')
        }
        className="px-4 py-2.5 bg-cyan-500 text-black rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center gap-2"
      >
        <Upload size={12} />
        Upload Video
      </button>
    }
  >
    <Card className="p-4">

      <div className="flex flex-col md:flex-row gap-3">

        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"
          />

          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search videos..."
            className="w-full bg-black/40 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[9px] text-white placeholder:text-zinc-700 outline-none focus:border-cyan-500/30"
          />
        </div>

        <div className="flex gap-2">

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
              )
            }
            className="bg-black/40 border border-white/[0.06] rounded-xl px-4 py-3 text-[8px] font-black uppercase text-zinc-400 outline-none"
          >
            <option value="all">
              All Content
            </option>
            <option value="published">
              Published
            </option>
            <option value="draft">
              Drafts
            </option>
            <option value="private">
              Private
            </option>
            <option value="scheduled">
              Scheduled
            </option>
          </select>

          <button className="px-3 rounded-xl border border-white/[0.06] bg-black/40 text-zinc-500">
            <Filter size={14} />
          </button>
        </div>
      </div>
    </Card>

    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onClick={() =>
            onOpenVideo(video)
          }
        />
      ))}

      {videos.length === 0 && (
        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
          <EmptyState
            icon={Video}
            title="No matching content"
            description="Try another search or create new content."
          />
        </div>
      )}
    </div>

    {/* Management features */}

    <Card className="p-6">

      <SectionHeader
        title="Content Operations"
        subtitle="Professional publishing controls"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">

        <FeatureTile
          icon={Edit3}
          title="Edit"
        />

        <FeatureTile
          icon={Archive}
          title="Archive"
        />

        <FeatureTile
          icon={RotateCcw}
          title="Restore"
        />

        <FeatureTile
          icon={Calendar}
          title="Schedule"
        />

        <FeatureTile
          icon={ImageIcon}
          title="Thumbnail"
        />

        <FeatureTile
          icon={Settings}
          title="Settings"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| LIBRARY
|--------------------------------------------------------------------------
*/

const LibraryView = ({
  videos,
  setActiveTab,
}) => (
  <Page
    title="Content Library"
    subtitle="All your creator media in one place"
    icon={Database}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <LibraryCard
        icon={Video}
        title="Videos"
        count={videos.length}
      />

      <LibraryCard
        icon={FileText}
        title="Drafts"
        count="—"
      />

      <LibraryCard
        icon={ImageIcon}
        title="Thumbnails"
        count="—"
      />

      <LibraryCard
        icon={Music}
        title="Audio"
        count="—"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Storage"
        subtitle="Creator media storage overview"
      />

      <div className="mt-6">

        <div className="flex justify-between text-[8px] uppercase font-black">
          <span className="text-zinc-600">
            Storage Used
          </span>

          <span className="text-zinc-300">
            2.4 GB / 10 GB
          </span>
        </div>

        <div className="h-2 rounded-full bg-black mt-3 overflow-hidden">
          <div className="h-full w-[24%] bg-cyan-500 rounded-full" />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">

          <StorageItem
            label="Videos"
            value="1.8 GB"
          />

          <StorageItem
            label="Images"
            value="420 MB"
          />

          <StorageItem
            label="Audio"
            value="180 MB"
          />
        </div>
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Content States"
        subtitle="Organize your publishing pipeline"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3 mt-5">

        <StatusCard
          title="Published"
          icon={CheckCircle2}
          value={videos.length}
        />

        <StatusCard
          title="Drafts"
          icon={FileText}
          value="0"
        />

        <StatusCard
          title="Scheduled"
          icon={Calendar}
          value="0"
        />

        <StatusCard
          title="Private"
          icon={Lock}
          value="0"
        />

        <StatusCard
          title="Archived"
          icon={Archive}
          value="0"
        />
      </div>
    </Card>

    <button
      onClick={() =>
        setActiveTab('videos')
      }
      className="text-[8px] font-black uppercase tracking-widest text-cyan-400"
    >
      Open full content manager →
    </button>
  </Page>
);

/*
|--------------------------------------------------------------------------
| SCHEDULER
|--------------------------------------------------------------------------
*/

const SchedulerView = () => (
  <Page
    title="Content Scheduler"
    subtitle="Plan videos and livestreams ahead of time"
    icon={CalendarDays}
    action={
      <button className="px-4 py-2.5 bg-cyan-500 text-black rounded-xl text-[8px] font-black uppercase flex items-center gap-2">
        <Plus size={12} />
        Schedule Content
      </button>
    }
  >
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">

      <Card className="p-6">

        <SectionHeader
          title="Publishing Calendar"
          subtitle="September 2026"
        />

        <div className="grid grid-cols-7 gap-1 mt-6">

          {[
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
          ].map((day) => (
            <div
              key={day}
              className="text-center text-[7px] font-black uppercase text-zinc-700 py-2"
            >
              {day}
            </div>
          ))}

          {Array.from(
            {
              length: 30,
            },
            (_, index) => (
              <div
                key={index}
                className="aspect-square rounded-xl bg-white/[0.02] border border-white/[0.04] p-2 hover:border-cyan-500/20 transition-all cursor-pointer"
              >
                <span className="text-[8px] text-zinc-600 font-mono">
                  {index + 1}
                </span>

                {index ===
                  12 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2" />
                )}

                {index ===
                  19 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
                )}
              </div>
            )
          )}
        </div>
      </Card>

      <Card className="p-6">

        <SectionHeader
          title="Scheduled Queue"
          subtitle="Upcoming publishing events"
        />

        <div className="space-y-3 mt-5">

          <ScheduleItem
            date="Tomorrow · 19:00"
            title="Technology Creator Tips"
            type="Video"
          />

          <ScheduleItem
            date="Friday · 18:30"
            title="Weekend Creator Session"
            type="Video"
          />

          <ScheduleItem
            date="Sunday · 20:00"
            title="Creator Q&A Live"
            type="Livestream"
          />

          <EmptyState
            icon={Calendar}
            title="More slots available"
            description="Your publishing calendar has room for additional content."
          />
        </div>
      </Card>
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Automatic Publishing"
        subtitle="Schedule videos and livestreams with timezone controls"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <FeatureTile
          icon={Timer}
          title="Best Time"
        />

        <FeatureTile
          icon={Globe}
          title="Timezone"
        />

        <FeatureTile
          icon={Zap}
          title="Auto Publish"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| SEO
|--------------------------------------------------------------------------
*/

const SEOView = () => (
  <Page
    title="SEO & Discovery"
    subtitle="Optimize content for search and discovery"
    icon={Hash}
  >
    <div className="grid lg:grid-cols-2 gap-4">

      <Card className="p-6">

        <SectionHeader
          title="AI Keyword Research"
          subtitle="Discover search opportunities"
        />

        <div className="relative mt-5">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"
          />

          <input
            placeholder="Enter a topic..."
            className="w-full bg-black/40 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[9px] outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">

          {[
            '#Technology',
            '#Malawi',
            '#CreatorTips',
            '#AI',
            '#Programming',
            '#Universe',
          ].map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[8px] text-cyan-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-6">

        <SectionHeader
          title="Trending Signals"
          subtitle="Topics currently showing opportunity"
        />

        <div className="space-y-3 mt-5">

          <TrendRow
            title="AI Tools"
            growth="+42%"
          />

          <TrendRow
            title="Creator Economy"
            growth="+31%"
          />

          <TrendRow
            title="Programming"
            growth="+26%"
          />

          <TrendRow
            title="Tech Tutorials"
            growth="+19%"
          />
        </div>
      </Card>
    </div>

    <Card className="p-6">

      <SectionHeader
        title="AI Optimization Tools"
        subtitle="Generate better metadata for your content"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">

        <FeatureTile
          icon={Sparkles}
          title="AI Caption"
        />

        <FeatureTile
          icon={Wand2}
          title="AI Title"
        />

        <FeatureTile
          icon={Hash}
          title="AI Hashtags"
        />

        <FeatureTile
          icon={Lightbulb}
          title="Hook Ideas"
        />

        <FeatureTile
          icon={TrendingUp}
          title="Trend Finder"
        />

        <FeatureTile
          icon={Target}
          title="SEO Score"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| AUDIENCE
|--------------------------------------------------------------------------
*/

const AudienceView = ({
  stats,
}) => (
  <Page
    title="Audience Center"
    subtitle="Understand, grow and manage your community"
    icon={Users}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        label="Followers"
        value={
          stats.followers
        }
        icon={Users}
        trend="+12.4%"
      />

      <StatCard
        label="New Followers"
        value="284"
        icon={UserPlus}
        trend="+18%"
      />

      <StatCard
        label="Profile Visits"
        value={
          stats.profileVisits
        }
        icon={Eye}
      />

      <StatCard
        label="Engagement"
        value={
          stats.engagement
        }
        icon={Heart}
      />
    </div>

    <div className="grid lg:grid-cols-2 gap-4">

      <MetricPanel
        title="Audience Demographics"
        rows={[
          ['18–24', '38%'],
          ['25–34', '34%'],
          ['35–44', '18%'],
          ['45+', '10%'],
        ]}
      />

      <MetricPanel
        title="Audience Gender"
        rows={[
          ['Male', '56%'],
          ['Female', '41%'],
          ['Other', '3%'],
        ]}
      />

      <MetricPanel
        title="Top Locations"
        rows={[
          ['Blantyre', '28%'],
          ['Lilongwe', '24%'],
          ['Mzuzu', '13%'],
          ['Zomba', '8%'],
          ['Other', '27%'],
        ]}
      />

      <MetricPanel
        title="Audience Interests"
        rows={[
          ['Technology', '32%'],
          ['Entertainment', '27%'],
          ['Education', '19%'],
          ['Music', '14%'],
          ['Other', '8%'],
        ]}
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Audience Management"
        subtitle="Community controls"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

        <FeatureTile
          icon={UserCheck}
          title="Top Fans"
        />

        <FeatureTile
          icon={UserX}
          title="Blocked"
        />

        <FeatureTile
          icon={Volume2}
          title="Muted"
        />

        <FeatureTile
          icon={Shield}
          title="Restricted"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

const CommentsView = () => (
  <Page
    title="Comment Center"
    subtitle="Manage conversations and protect your community"
    icon={MessageCircle}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        label="Total Comments"
        value="—"
        icon={MessageCircle}
      />

      <StatCard
        label="Unanswered"
        value="—"
        icon={Clock3}
      />

      <StatCard
        label="Spam Blocked"
        value="—"
        icon={Shield}
      />

      <StatCard
        label="Comment Rate"
        value="—"
        icon={Activity}
      />
    </div>

    <Card className="p-5">

      <div className="flex gap-2">

        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700"
          />

          <input
            placeholder="Search comments..."
            className="w-full bg-black/40 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-[8px] outline-none"
          />
        </div>

        <button className="px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[8px] font-black uppercase">
          All
        </button>
      </div>

      <EmptyState
        icon={MessageCircle}
        title="Comment inbox ready"
        description="Comments can be connected here for replies, moderation, pinning and analytics."
      />
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Moderation Controls"
        subtitle="Automated community protection"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">

        <FeatureTile
          icon={Bot}
          title="AI Filtering"
        />

        <FeatureTile
          icon={Flag}
          title="Spam Detection"
        />

        <FeatureTile
          icon={Tag}
          title="Mention Filters"
        />

        <FeatureTile
          icon={Lock}
          title="Hidden Words"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const NotificationsView = ({
  notifications,
  markAll,
}) => (
  <Page
    title="Notification Center"
    subtitle="Creator, audience, earnings and security activity"
    icon={Bell}
    action={
      <button
        onClick={markAll}
        className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[8px] font-black uppercase"
      >
        Mark all read
      </button>
    }
  >
    <Card className="overflow-hidden">

      {notifications.map(
        (notification) => (
          <div
            key={notification.id}
            className="p-5 border-b border-white/[0.05] flex gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
              <Bell
                size={15}
                className="text-cyan-400"
              />
            </div>

            <div className="flex-1">
              <p className="text-[10px] font-black">
                {notification.title}
              </p>

              <p className="text-[9px] text-zinc-500 mt-1">
                {
                  notification.message
                }
              </p>

              <p className="text-[7px] text-zinc-700 uppercase mt-2">
                {notification.time}
              </p>
            </div>

            {notification.unread && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1" />
            )}
          </div>
        )
      )}
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Notification Preferences"
        subtitle="Control what reaches your creator inbox"
      />

      <div className="space-y-2 mt-5">

        {[
          'Follower notifications',
          'Like notifications',
          'Comment notifications',
          'Share notifications',
          'Gift notifications',
          'Subscriber notifications',
          'Payout notifications',
          'Creator Fund notifications',
          'Security alerts',
          'Copyright alerts',
        ].map((item) => (
          <ToggleRow
            key={item}
            label={item}
            enabled
          />
        ))}
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

const AIView = ({
  aiTip,
}) => (
  <Page
    title="AI Creator Intelligence"
    subtitle="Your AI command center for content, growth and monetization"
    icon={Sparkles}
  >
    <Card className="p-6 bg-gradient-to-br from-purple-500/[0.1] via-cyan-500/[0.05] to-transparent">

      <div className="flex gap-4 items-start">

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center shrink-0">
          <Bot
            size={21}
            className="text-white"
          />
        </div>

        <div>
          <p className="text-[8px] font-black uppercase tracking-[3px] text-purple-300">
            AI Creator Coach
          </p>

          <h2 className="text-lg font-black italic mt-2">
            {aiTip}
          </h2>

          <p className="text-[9px] text-zinc-500 mt-2 max-w-xl">
            Use AI to analyze your content, discover opportunities, generate ideas and improve creator performance.
          </p>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">

      {[
        [Sparkles, 'Content Ideas'],
        [FileText, 'AI Captions'],
        [Wand2, 'AI Titles'],
        [Hash, 'AI Hashtags'],
        [Lightbulb, 'Hooks'],
        [ImageIcon, 'Thumbnail Ideas'],
        [BarChart3, 'Video Analysis'],
        [Activity, 'Retention AI'],
        [Heart, 'Engagement AI'],
        [Clock3, 'Best Posting Time'],
        [Users, 'Audience AI'],
        [TrendingUp, 'Growth AI'],
        [DollarSign, 'Monetization AI'],
        [Radio, 'Livestream AI'],
        [Target, 'Viral Potential'],
        [MessageCircle, 'Reply Assistant'],
      ].map(
        ([Icon, title]) => (
          <FeatureTile
            key={title}
            icon={Icon}
            title={title}
            large
          />
        )
      )}
    </div>

    <Card className="p-6">

      <SectionHeader
        title="AI Content Planner"
        subtitle="Build a complete publishing strategy"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <AIPlanCard
          day="Monday"
          idea="Educational Tech"
        />

        <AIPlanCard
          day="Wednesday"
          idea="Creator Tips"
        />

        <AIPlanCard
          day="Friday"
          idea="Entertainment"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| LIVESTREAM
|--------------------------------------------------------------------------
*/

const LiveStudioView = ({
  stats,
  navigate,
}) => (
  <Page
    title="Live Studio"
    subtitle="Professional livestream control center"
    icon={Radio}
    action={
      <button
        onClick={() =>
          navigate('/live')
        }
        className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-2"
      >
        <Radio size={12} />
        Start Livestream
      </button>
    }
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        label="Current Viewers"
        value="0"
        icon={Eye}
      />

      <StatCard
        label="Peak Viewers"
        value="0"
        icon={TrendingUp}
      />

      <StatCard
        label="Live Likes"
        value="0"
        icon={Heart}
      />

      <StatCard
        label="Live Revenue"
        value="MK 0.00"
        icon={DollarSign}
      />
    </div>

    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">

      <Card className="p-6">

        <SectionHeader
          title="Stream Health"
          subtitle="Real-time broadcasting diagnostics"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">

          <HealthMetric
            icon={Wifi}
            label="Connection"
            value="Excellent"
          />

          <HealthMetric
            icon={Gauge}
            label="Bitrate"
            value="—"
          />

          <HealthMetric
            icon={Activity}
            label="FPS"
            value="—"
          />

          <HealthMetric
            icon={Video}
            label="Resolution"
            value="—"
          />
        </div>

        <div className="aspect-video rounded-2xl bg-black border border-white/[0.06] mt-5 flex items-center justify-center">

          <div className="text-center">
            <Radio
              size={28}
              className="text-zinc-800 mx-auto"
            />

            <p className="text-[8px] font-black uppercase tracking-[2px] text-zinc-700 mt-3">
              Live viewport ready
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">

        <SectionHeader
          title="Live Controls"
          subtitle="Moderation and engagement"
        />

        <div className="grid grid-cols-2 gap-3 mt-5">

          <FeatureTile
            icon={MessageCircle}
            title="Chat"
          />

          <FeatureTile
            icon={Users}
            title="Moderators"
          />

          <FeatureTile
            icon={Gift}
            title="Gift Goals"
          />

          <FeatureTile
            icon={Target}
            title="Live Goals"
          />

          <FeatureTile
            icon={Flag}
            title="Slow Mode"
          />

          <FeatureTile
            icon={UserX}
            title="Ban Users"
          />

          <FeatureTile
            icon={BarChart3}
            title="Live Analytics"
          />

          <FeatureTile
            icon={MessageCircle}
            title="Q&A"
          />
        </div>
      </Card>
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Live Performance"
        subtitle="Track the full livestream lifecycle"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mt-5">

        {[
          ['Watch Time', '—'],
          ['Comments', '—'],
          ['Shares', '—'],
          ['Followers', '—'],
          ['Gifts', '—'],
          ['Coins', '—'],
          ['Peak', '—'],
          ['Dropped Frames', '—'],
        ].map(
          ([label, value]) => (
            <MiniMetric
              key={label}
              label={label}
              value={value}
              icon={Activity}
            />
          )
        )}
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| GOALS
|--------------------------------------------------------------------------
*/

const GoalsView = () => (
  <Page
    title="Goals & Achievements"
    subtitle="Build creator momentum through measurable milestones"
    icon={Trophy}
  >
    <Card className="p-6">

      <div className="flex items-center gap-4">

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/10 border border-yellow-500/10 flex items-center justify-center">
          <Crown
            size={28}
            className="text-yellow-400"
          />
        </div>

        <div>
          <p className="text-[8px] uppercase tracking-[3px] text-zinc-600 font-black">
            Creator Level
          </p>

          <p className="text-3xl font-black italic">
            Level 12
          </p>

          <p className="text-[8px] text-yellow-400 uppercase font-black">
            2,480 / 3,000 XP
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-black mt-6 overflow-hidden">
        <div className="h-full w-[82%] bg-yellow-400 rounded-full" />
      </div>
    </Card>

    <div className="grid md:grid-cols-3 gap-3">

      <GoalCard
        title="Daily Upload"
        current="2"
        target="3"
        icon={Upload}
      />

      <GoalCard
        title="Weekly Views"
        current="8.4K"
        target="10K"
        icon={Eye}
      />

      <GoalCard
        title="Follower Goal"
        current="4.2K"
        target="5K"
        icon={Users}
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Achievements"
        subtitle="Creator milestones"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-5">

        {[
          ['First Upload', Upload],
          ['1K Views', Eye],
          ['100 Followers', Users],
          ['First Gift', Gift],
          ['First Live', Radio],
          ['10K Likes', Heart],
        ].map(
          ([title, Icon]) => (
            <div
              key={title}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center"
            >
              <Icon
                size={20}
                className="text-yellow-400 mx-auto"
              />

              <p className="text-[8px] font-black uppercase mt-3">
                {title}
              </p>

              <CheckCircle2
                size={11}
                className="text-emerald-400 mx-auto mt-2"
              />
            </div>
          )
        )}
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| TOOLS
|--------------------------------------------------------------------------
*/

const ToolsView = ({
  navigate,
}) => (
  <Page
    title="Creator Tools"
    subtitle="Everything you need to create, publish and grow"
    icon={Wand2}
  >
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">

      {[
        [Upload, 'Video Uploader'],
        [Video, 'Video Editor'],
        [ImageIcon, 'Thumbnail Creator'],
        [Music, 'Music Library'],
        [Sparkles, 'AI Editor'],
        [Hash, 'Hashtag Tool'],
        [FileText, 'Caption Generator'],
        [Calendar, 'Content Calendar'],
        [Wand2, 'Templates'],
        [Radio, 'Live Tools'],
        [Share2, 'Profile Sharing'],
        [QrCodeIcon, 'QR Profile'],
      ].map(
        ([Icon, title]) => (
          <ToolLarge
            key={title}
            icon={Icon}
            title={title}
          />
        )
      )}
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Creator Resources"
        subtitle="Learn and improve your creator workflow"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <ResourceCard
          icon={Lightbulb}
          title="Creator Education"
        />

        <ResourceCard
          icon={TrendingUp}
          title="Growth Guides"
        />

        <ResourceCard
          icon={DollarSign}
          title="Monetization Guide"
        />
      </div>
    </Card>

    <button
      onClick={() =>
        navigate('/upload')
      }
      className="px-5 py-3 rounded-xl bg-cyan-500 text-black text-[8px] font-black uppercase w-fit"
    >
      Open Creator Upload
    </button>
  </Page>
);

/*
|--------------------------------------------------------------------------
| MONETIZATION
|--------------------------------------------------------------------------
*/

const MonetizationView = ({
  stats,
  navigate,
}) => (
  <Page
    title="Monetization"
    subtitle="Earnings, payouts, creator fund and revenue"
    icon={DollarSign}
  >
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">

      <Card className="p-7 bg-gradient-to-br from-purple-500/[0.12] via-cyan-500/[0.04] to-transparent">

        <p className="text-[8px] font-black uppercase tracking-[3px] text-purple-300">
          Withdrawable Balance
        </p>

        <p className="text-4xl font-black italic font-mono mt-3">
          MK {stats.revenue}
        </p>

        <div className="flex flex-wrap gap-2 mt-6">

          <button
            onClick={() =>
              navigate('/payouts')
            }
            className="px-5 py-3 rounded-xl bg-white text-black text-[8px] font-black uppercase"
          >
            Withdraw
          </button>

          <button className="px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.06] text-[8px] font-black uppercase">
            Payout History
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">

        <MiniMetric
          icon={Coins}
          label="Coins"
          value={
            stats.coins
          }
        />

        <MiniMetric
          icon={Clock3}
          label="Pending"
          value="MK 0"
        />

        <MiniMetric
          icon={Gift}
          label="Gifts"
          value="—"
        />

        <MiniMetric
          icon={Crown}
          label="Fund"
          value="—"
        />
      </div>
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">

      <RevenueSource
        icon={Video}
        title="Video Earnings"
        value="MK —"
      />

      <RevenueSource
        icon={Radio}
        title="Live Earnings"
        value="MK —"
      />

      <RevenueSource
        icon={Gift}
        title="Gift Earnings"
        value="MK —"
      />

      <RevenueSource
        icon={Crown}
        title="Creator Fund"
        value="MK —"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Payout Methods"
        subtitle="Malawi payment infrastructure"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <PaymentCard
          icon={Smartphone}
          title="TNM Mpamba"
        />

        <PaymentCard
          icon={Smartphone}
          title="Airtel Money"
        />

        <PaymentCard
          icon={Banknote}
          title="Bank Transfer"
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Monetization Programs"
        subtitle="Creator earning opportunities"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">

        <ProgramCard
          icon={Crown}
          title="Creator Fund"
          badge="Eligible"
        />

        <ProgramCard
          icon={Gift}
          title="Virtual Gifts"
          badge="Active"
        />

        <ProgramCard
          icon={Users}
          title="Subscriptions"
          badge="Available"
        />

        <ProgramCard
          icon={CreditCard}
          title="Paid Content"
          badge="Available"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| GIFTS
|--------------------------------------------------------------------------
*/

const GiftsView = ({
  navigate,
}) => (
  <Page
    title="Virtual Gifts"
    subtitle="Track gifts, coins, gifters and creator earnings"
    icon={Gift}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        icon={Gift}
        label="Gifts Received"
        value="—"
      />

      <StatCard
        icon={Coins}
        label="Coins Received"
        value="—"
      />

      <StatCard
        icon={DollarSign}
        label="Gift Revenue"
        value="MK —"
      />

      <StatCard
        icon={Users}
        label="Top Gifters"
        value="—"
      />
    </div>

    <div className="grid lg:grid-cols-2 gap-4">

      <Card className="p-6">

        <SectionHeader
          title="Gift Analytics"
          subtitle="Gift earnings and activity"
        />

        <AnalyticsChart
          title="Gift Earnings"
          value="MK —"
          color="purple"
        />
      </Card>

      <Card className="p-6">

        <SectionHeader
          title="Top Gifters"
          subtitle="Your strongest supporters"
        />

        <div className="space-y-2 mt-5">

          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                  <UserRound
                    size={13}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-[8px] font-black">
                    Supporter #{item}
                  </p>

                  <p className="text-[7px] text-zinc-600 uppercase">
                    Top fan
                  </p>
                </div>

                <span className="text-[8px] font-black text-yellow-400">
                  — coins
                </span>
              </div>
            )
          )}
        </div>
      </Card>
    </div>

    <button
      onClick={() =>
        navigate('/gifts')
      }
      className="px-5 py-3 rounded-xl bg-pink-500/10 border border-pink-500/10 text-pink-300 text-[8px] font-black uppercase w-fit"
    >
      Open Gift Center
    </button>
  </Page>
);

/*
|--------------------------------------------------------------------------
| SUBSCRIPTIONS
|--------------------------------------------------------------------------
*/

const SubscriptionsView = () => (
  <Page
    title="Subscriptions"
    subtitle="Build recurring creator revenue"
    icon={Crown}
  >
    <Card className="p-7 bg-gradient-to-br from-purple-500/[0.1] to-transparent">

      <div className="flex items-center justify-between gap-5">

        <div>
          <p className="text-[8px] font-black uppercase tracking-[3px] text-purple-300">
            Subscription Program
          </p>

          <h2 className="text-2xl font-black italic mt-2">
            Build your subscriber community
          </h2>

          <p className="text-[9px] text-zinc-600 mt-2">
            Create subscriber tiers, perks and exclusive content.
          </p>
        </div>

        <button className="px-5 py-3 rounded-xl bg-purple-500 text-white text-[8px] font-black uppercase">
          Enable
        </button>
      </div>
    </Card>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        icon={Users}
        label="Subscribers"
        value="0"
      />

      <StatCard
        icon={TrendingUp}
        label="Growth"
        value="+0%"
      />

      <StatCard
        icon={DollarSign}
        label="Monthly Revenue"
        value="MK 0"
      />

      <StatCard
        icon={Crown}
        label="Active Tiers"
        value="0"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Subscription Features"
        subtitle="Premium community tools"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

        <FeatureTile
          icon={Crown}
          title="Tiers"
        />

        <FeatureTile
          icon={Video}
          title="Exclusive Videos"
        />

        <FeatureTile
          icon={Radio}
          title="Subscriber Lives"
        />

        <FeatureTile
          icon={Gift}
          title="Subscriber Perks"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| PAID CONTENT
|--------------------------------------------------------------------------
*/

const PaidContentView = () => (
  <Page
    title="Paid Content"
    subtitle="Premium videos, livestreams and pay-per-view content"
    icon={CreditCard}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        icon={CreditCard}
        label="Premium Sales"
        value="0"
      />

      <StatCard
        icon={DollarSign}
        label="Revenue"
        value="MK 0"
      />

      <StatCard
        icon={Users}
        label="Buyers"
        value="0"
      />

      <StatCard
        icon={TrendingUp}
        label="Conversion"
        value="0%"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Premium Content Types"
        subtitle="Monetize exclusive experiences"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <ProgramCard
          icon={Video}
          title="Paid Videos"
        />

        <ProgramCard
          icon={Radio}
          title="Paid Livestreams"
        />

        <ProgramCard
          icon={Crown}
          title="Premium Access"
        />
      </div>
    </Card>

    <EmptyState
      icon={CreditCard}
      title="No premium content"
      description="Create your first paid content product to begin monetizing directly."
    />
  </Page>
);

/*
|--------------------------------------------------------------------------
| FINANCE
|--------------------------------------------------------------------------
*/

const FinanceView = ({
  stats,
}) => (
  <Page
    title="Financial Analytics"
    subtitle="Revenue sources, transactions and payout intelligence"
    icon={Wallet}
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <StatCard
        icon={DollarSign}
        label="Lifetime Revenue"
        value={`MK ${stats.revenue}`}
      />

      <StatCard
        icon={Wallet}
        label="Available"
        value={`MK ${stats.revenue}`}
      />

      <StatCard
        icon={Clock3}
        label="Pending"
        value="MK 0"
      />

      <StatCard
        icon={ArrowUpRight}
        label="Growth"
        value={stats.revenueGrowth}
      />
    </div>

    <AnalyticsChart
      title="Revenue Performance"
      value={`MK ${stats.revenue}`}
      color="emerald"
    />

    <Card className="p-6">

      <SectionHeader
        title="Transaction Categories"
        subtitle="Financial activity sources"
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3 mt-5">

        <RevenueSource
          icon={Gift}
          title="Gifts"
          value="MK —"
        />

        <RevenueSource
          icon={Video}
          title="Videos"
          value="MK —"
        />

        <RevenueSource
          icon={Radio}
          title="Livestreams"
          value="MK —"
        />

        <RevenueSource
          icon={Crown}
          title="Subscriptions"
          value="MK —"
        />

        <RevenueSource
          icon={CreditCard}
          title="Paid Content"
          value="MK —"
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Financial Operations"
        subtitle="Manage your creator finances"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <FeatureTile
          icon={Wallet}
          title="Transactions"
        />

        <FeatureTile
          icon={Download}
          title="Export Finance"
        />

        <FeatureTile
          icon={FileText}
          title="Reports"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| COLLABORATION
|--------------------------------------------------------------------------
*/

const CollaborationView = () => (
  <Page
    title="Brand Studio"
    subtitle="Partnerships, campaigns and creator business tools"
    icon={Megaphone}
  >
    <Card className="p-7 bg-gradient-to-br from-cyan-500/[0.08] to-purple-500/[0.06]">

      <p className="text-[8px] font-black uppercase tracking-[3px] text-cyan-300">
        Creator Business Profile
      </p>

      <h2 className="text-2xl font-black italic mt-2">
        Make your profile ready for brands
      </h2>

      <p className="text-[9px] text-zinc-600 mt-2 max-w-xl">
        Manage your media kit, collaboration preferences, rates, campaigns and sponsored content.
      </p>
    </Card>

    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">

      <FeatureTile
        icon={Megaphone}
        title="Campaigns"
        large
      />

      <FeatureTile
        icon={Users}
        title="Partnership Requests"
        large
      />

      <FeatureTile
        icon={FileText}
        title="Media Kit"
        large
      />

      <FeatureTile
        icon={DollarSign}
        title="Rate Card"
        large
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Business Profile"
        subtitle="Information brands can use to contact you"
      />

      <div className="grid md:grid-cols-2 gap-3 mt-5">

        <SettingDisplay
          label="Business Contact"
          value="Not configured"
        />

        <SettingDisplay
          label="Business Category"
          value="Creator"
        />

        <SettingDisplay
          label="Collaboration Status"
          value="Open to opportunities"
        />

        <SettingDisplay
          label="Sponsored Content"
          value="Available"
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Campaign Analytics"
        subtitle="Measure sponsored content performance"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

        <MiniMetric
          icon={Megaphone}
          label="Campaigns"
          value="0"
        />

        <MiniMetric
          icon={Eye}
          label="Campaign Reach"
          value="0"
        />

        <MiniMetric
          icon={Heart}
          label="Engagement"
          value="0%"
        />

        <MiniMetric
          icon={DollarSign}
          label="Campaign Revenue"
          value="MK 0"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| PROFILE
|--------------------------------------------------------------------------
*/

const ProfileView = ({
  navigate,
}) => (
  <Page
    title="Creator Profile"
    subtitle="Manage your public creator identity"
    icon={UserRound}
    action={
      <button
        onClick={() =>
          navigate('/edit-profile')
        }
        className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-[8px] font-black uppercase flex items-center gap-2"
      >
        <Edit3 size={12} />
        Edit Profile
      </button>
    }
  >
    <Card className="overflow-hidden">

      <div className="h-36 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-black relative">

        <div className="absolute inset-0 bg-black/30" />

        <div className="absolute left-6 bottom-[-35px] w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-[#050505] flex items-center justify-center">
          <UserRound
            size={28}
            className="text-zinc-600"
          />
        </div>
      </div>

      <div className="p-6 pt-12">

        <div className="flex items-start justify-between">

          <div>
            <h2 className="text-xl font-black italic">
              Creator Profile
            </h2>

            <p className="text-[8px] text-zinc-600 mt-1">
              @creator
            </p>
          </div>

          <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/10 text-[7px] font-black uppercase text-cyan-400">
            Professional
          </span>
        </div>

        <p className="text-[9px] text-zinc-500 mt-4 max-w-xl">
          Your public creator identity, social links, category, profile media and professional settings.
        </p>
      </div>
    </Card>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

      <ProfileMetric
        label="Completion"
        value="—"
      />

      <ProfileMetric
        label="Profile Views"
        value="—"
      />

      <ProfileMetric
        label="Followers"
        value="—"
      />

      <ProfileMetric
        label="Following"
        value="—"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Profile Features"
        subtitle="Everything connected to your public identity"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

        <FeatureTile
          icon={UserRound}
          title="Identity"
        />

        <FeatureTile
          icon={ImageIcon}
          title="Media"
        />

        <FeatureTile
          icon={Share2}
          title="Social Links"
        />

        <FeatureTile
          icon={BadgeIcon}
          title="Verification"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

const SecurityView = () => (
  <Page
    title="Security Center"
    subtitle="Protect your creator account"
    icon={Shield}
  >
    <div className="grid md:grid-cols-2 gap-3">

      <SecurityCard
        icon={Lock}
        title="Password"
        status="Protected"
      />

      <SecurityCard
        icon={Smartphone}
        title="Two-Factor Authentication"
        status="Not configured"
      />

      <SecurityCard
        icon={Monitor}
        title="Active Sessions"
        status="1 active session"
      />

      <SecurityCard
        icon={FingerprintIcon}
        title="Passkeys"
        status="Available"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Security Activity"
        subtitle="Recent account protection events"
      />

      <div className="space-y-2 mt-5">

        <SecurityEvent
          title="Current browser session"
          device="Desktop"
          status="Active"
        />

        <SecurityEvent
          title="Login alerts"
          device="Security notifications"
          status="Enabled"
        />

        <SecurityEvent
          title="Email verification"
          device="Account email"
          status="Protected"
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Account Recovery"
        subtitle="Keep your account recoverable"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <FeatureTile
          icon={MailIcon}
          title="Email Recovery"
        />

        <FeatureTile
          icon={Smartphone}
          title="Phone Recovery"
        />

        <FeatureTile
          icon={Shield}
          title="Recovery Settings"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

const SettingsView = ({
  settings,
  setSettings,
}) => (
  <Page
    title="Studio Settings"
    subtitle="Customize your creator command center"
    icon={Settings}
  >
    <Card className="p-6">

      <SectionHeader
        title="Workspace"
        subtitle="Studio appearance and behavior"
      />

      <div className="space-y-2 mt-5">

        <ToggleRow
          label="Automatic refresh"
          description="Keep creator statistics synchronized automatically."
          enabled={
            settings.autoRefresh
          }
          onChange={() =>
            setSettings(
              (current) => ({
                ...current,
                autoRefresh:
                  !current.autoRefresh,
              })
            )
          }
        />

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">

          <div>
            <p className="text-[9px] font-black">
              Refresh interval
            </p>

            <p className="text-[7px] text-zinc-600 mt-1">
              Automatic synchronization frequency
            </p>
          </div>

          <select
            value={
              settings.refreshInterval
            }
            onChange={(event) =>
              setSettings(
                (current) => ({
                  ...current,
                  refreshInterval:
                    event.target.value,
                })
              )
            }
            className="bg-black border border-white/[0.06] rounded-lg px-3 py-2 text-[8px] text-zinc-400"
          >
            <option value="30">
              30 seconds
            </option>
            <option value="60">
              1 minute
            </option>
            <option value="300">
              5 minutes
            </option>
          </select>
        </div>

        <ToggleRow
          label="Compact mode"
          description="Reduce spacing throughout the Studio."
          enabled={
            settings.compactMode
          }
          onChange={() =>
            setSettings(
              (current) => ({
                ...current,
                compactMode:
                  !current.compactMode,
              })
            )
          }
        />

        <ToggleRow
          label="Reduced motion"
          description="Reduce interface animations."
          enabled={
            settings.reducedMotion
          }
          onChange={() =>
            setSettings(
              (current) => ({
                ...current,
                reducedMotion:
                  !current.reducedMotion,
              })
            )
          }
        />

        <ToggleRow
          label="Offline mode"
          description="Display the Studio in offline-safe mode."
          enabled={
            settings.offlineMode
          }
          onChange={() =>
            setSettings(
              (current) => ({
                ...current,
                offlineMode:
                  !current.offlineMode,
              })
            )
          }
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Dashboard Layout"
        subtitle="Organize your creator workspace"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

        <FeatureTile
          icon={LayoutDashboard}
          title="Widgets"
        />

        <FeatureTile
          icon={Layers}
          title="Widget Order"
        />

        <FeatureTile
          icon={Monitor}
          title="Desktop"
        />

        <FeatureTile
          icon={Smartphone}
          title="Mobile"
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="System Status"
        subtitle="Studio infrastructure"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <StatusCard
          title="Supabase"
          icon={Database}
          value="Connected"
        />

        <StatusCard
          title="Authentication"
          icon={Shield}
          value="Active"
        />

        <StatusCard
          title="Creator Data"
          icon={Activity}
          value="Synced"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/

const ReportsView = ({
  stats,
  videos,
  exportStudioData,
}) => (
  <Page
    title="Reports & Export"
    subtitle="Download creator analytics and financial reports"
    icon={FileDown}
    action={
      <button
        onClick={
          exportStudioData
        }
        className="px-4 py-2.5 rounded-xl bg-cyan-500 text-black text-[8px] font-black uppercase flex items-center gap-2"
      >
        <Download size={12} />
        Export JSON
      </button>
    }
  >
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">

      <ReportCard
        icon={BarChart3}
        title="Analytics Report"
      />

      <ReportCard
        icon={DollarSign}
        title="Earnings Report"
      />

      <ReportCard
        icon={Video}
        title="Video Statistics"
      />

      <ReportCard
        icon={Users}
        title="Audience Report"
      />
    </div>

    <Card className="p-6">

      <SectionHeader
        title="Export Center"
        subtitle="Available creator data"
      />

      <div className="space-y-2 mt-5">

        <ExportRow
          title="Creator analytics"
          description="Views, engagement, reach and audience signals"
          onClick={() =>
            downloadJSON(
              stats,
              'creator-analytics.json'
            )
          }
        />

        <ExportRow
          title="Video statistics"
          description="Video performance and metadata"
          onClick={() =>
            downloadJSON(
              videos,
              'video-statistics.json'
            )
          }
        />

        <ExportRow
          title="Full Studio report"
          description="Combined creator data export"
          onClick={
            exportStudioData
          }
        />
      </div>
    </Card>

    <Card className="p-6">

      <SectionHeader
        title="Reporting"
        subtitle="Creator business reporting"
      />

      <div className="grid md:grid-cols-3 gap-3 mt-5">

        <FeatureTile
          icon={FileText}
          title="Monthly Report"
        />

        <FeatureTile
          icon={DollarSign}
          title="Financial Report"
        />

        <FeatureTile
          icon={FileDown}
          title="Tax Documents"
        />
      </div>
    </Card>
  </Page>
);

/*
|--------------------------------------------------------------------------
| VIDEO CARD
|--------------------------------------------------------------------------
*/

const VideoCard = ({
  video,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="group bg-zinc-900/30 border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-cyan-500/20 transition-all"
  >
    <div className="aspect-[9/13] bg-black relative overflow-hidden">

      {video.video_url ? (
        <video
          src={video.video_url}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(event) => {
            event.currentTarget
              .play()
              .catch(() => {});
          }}
          onMouseLeave={(event) => {
            event.currentTarget.pause();

            try {
              event.currentTarget.currentTime = 0;
            } catch {
              // Ignore media reset errors.
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play
            size={22}
            className="text-zinc-800"
          />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/60 to-transparent">

        <div className="flex items-center gap-2">

          <span className="px-1.5 py-1 rounded bg-black/60 text-[6px] font-black uppercase">
            {getVideoStatus(
              video
            )}
          </span>

          {video.processing_status && (
            <span className="px-1.5 py-1 rounded bg-cyan-500/20 text-cyan-300 text-[6px] font-black uppercase">
              {video.processing_status}
            </span>
          )}
        </div>
      </div>
    </div>

    <div className="p-4">

      <p className="text-[9px] font-black truncate">
        {getVideoTitle(video)}
      </p>

      <div className="flex items-center gap-3 mt-2">

        <span className="flex items-center gap-1 text-[7px] text-zinc-600">
          <Eye size={9} />
          {formatNumber(
            video.views_count
          )}
        </span>

        <span className="flex items-center gap-1 text-[7px] text-zinc-600">
          <Heart size={9} />
          {formatNumber(
            video.likes_count
          )}
        </span>

        <span className="flex items-center gap-1 text-[7px] text-zinc-600">
          <MessageCircle
            size={9}
          />
          {formatNumber(
            video.comments_count
          )}
        </span>
      </div>
    </div>
  </div>
);

/*
|--------------------------------------------------------------------------
| COMPACT VIDEO
|--------------------------------------------------------------------------
*/

const VideoCompact = ({
  video,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-left hover:border-cyan-500/20 transition-all"
  >
    <div className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0">

      {video.video_url ? (
        <video
          src={video.video_url}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play
            size={13}
            className="text-zinc-700"
          />
        </div>
      )}
    </div>

    <div className="min-w-0 flex-1">

      <p className="text-[8px] font-black truncate">
        {getVideoTitle(
          video
        )}
      </p>

      <p className="text-[7px] text-zinc-600 mt-2">
        {formatNumber(
          video.views_count
        )}{' '}
        views
      </p>

      <p className="text-[7px] text-zinc-700 mt-1">
        {formatNumber(
          video.likes_count
        )}{' '}
        likes
      </p>
    </div>

    <ChevronRight
      size={12}
      className="text-zinc-700 mt-1"
    />
  </button>
);

/*
|--------------------------------------------------------------------------
| VIDEO DRAWER
|--------------------------------------------------------------------------
*/

const VideoDrawer = ({
  video,
  mode,
  setMode,
  onClose,
}) => (
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
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500]"
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
      className="fixed bottom-0 left-0 right-0 z-[501] bg-zinc-950 border-t border-white/10 rounded-t-[32px] max-h-[92vh] overflow-hidden"
    >
      <div className="max-w-4xl mx-auto p-5 sm:p-7">

        <div className="flex justify-center mb-5">
          <div className="w-10 h-1 rounded-full bg-zinc-800" />
        </div>

        <div className="flex items-start gap-4">

          <div className="w-16 h-20 rounded-xl bg-black overflow-hidden shrink-0">

            {video.video_url ? (
              <video
                src={video.video_url}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play
                  size={16}
                  className="text-zinc-700"
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">

            <h2 className="text-sm font-black italic truncate">
              {getVideoTitle(
                video
              )}
            </h2>

            <p className="text-[7px] text-zinc-700 font-mono uppercase mt-2">
              VID_{video.id?.slice(
                0,
                14
              )}
            </p>

            <div className="flex gap-2 mt-4">

              <button
                onClick={() =>
                  setMode(
                    'metrics'
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase ${
                  mode === 'metrics'
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/[0.05] text-zinc-500'
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
                className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase ${
                  mode === 'preview'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/[0.05] text-zinc-500'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] text-zinc-500"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-6 max-h-[65vh] overflow-y-auto scrollbar-studio">

          {mode === 'metrics' ? (
            <div className="space-y-4">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                <StatCard
                  label="Views"
                  value={formatNumber(
                    video.views_count
                  )}
                  icon={Eye}
                />

                <StatCard
                  label="Likes"
                  value={formatNumber(
                    video.likes_count
                  )}
                  icon={Heart}
                />

                <StatCard
                  label="Comments"
                  value={formatNumber(
                    video.comments_count
                  )}
                  icon={MessageCircle}
                />

                <StatCard
                  label="Shares"
                  value={formatNumber(
                    video.shares_count
                  )}
                  icon={Share2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">

                <MetricPanel
                  title="Engagement"
                  rows={[
                    [
                      'Like Rate',
                      `${percentage(
                        video.likes_count,
                        video.views_count
                      ).toFixed(
                        1
                      )}%`,
                    ],
                    [
                      'Comment Rate',
                      `${percentage(
                        video.comments_count,
                        video.views_count
                      ).toFixed(
                        1
                      )}%`,
                    ],
                    [
                      'Share Rate',
                      `${percentage(
                        video.shares_count,
                        video.views_count
                      ).toFixed(
                        1
                      )}%`,
                    ],
                    [
                      'Save Rate',
                      `${percentage(
                        video.saves_count,
                        video.views_count
                      ).toFixed(
                        1
                      )}%`,
                    ],
                  ]}
                />

                <MetricPanel
                  title="Content"
                  rows={[
                    [
                      'Status',
                      getVideoStatus(
                        video
                      ),
                    ],
                    [
                      'Category',
                      video.category ||
                        'Not set',
                    ],
                    [
                      'Privacy',
                      video.privacy ||
                        'Public',
                    ],
                    [
                      'Duration',
                      video.duration ||
                        '—',
                    ],
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">

              <div className="w-full max-w-[360px] aspect-[9/16] rounded-2xl bg-black border border-white/[0.08] overflow-hidden">

                {video.video_url ? (
                  <video
                    src={video.video_url}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Video
                      size={30}
                      className="text-zinc-800"
                    />

                    <p className="text-[8px] uppercase text-zinc-700 font-black mt-3">
                      No video URL
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-xl bg-white text-black text-[8px] font-black uppercase tracking-[3px]"
        >
          Close Analysis
        </button>
      </div>
    </motion.div>
  </>
);

/*
|--------------------------------------------------------------------------
| SMALL COMPONENTS
|--------------------------------------------------------------------------
*/

const MiniMetric = ({
  icon: Icon,
  label,
  value,
}) => (
  <Card className="p-4">

    <Icon
      size={14}
      className="text-zinc-600"
    />

    <p className="text-lg font-black font-mono mt-4">
      {value}
    </p>

    <p className="text-[6px] uppercase tracking-[2px] text-zinc-700 mt-1 font-black">
      {label}
    </p>
  </Card>
);

const SectionHeader = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-center justify-between gap-3">

    <div>
      <h3 className="text-[9px] font-black uppercase tracking-[2px]">
        {title}
      </h3>

      {subtitle && (
        <p className="text-[7px] text-zinc-700 uppercase tracking-wider mt-1">
          {subtitle}
        </p>
      )}
    </div>

    {action}
  </div>
);

const HealthBar = ({
  label,
  value,
  percent,
}) => (
  <div>

    <div className="flex justify-between">
      <span className="text-[7px] uppercase font-black text-zinc-600">
        {label}
      </span>

      <span className="text-[7px] font-black text-zinc-300">
        {value}
      </span>
    </div>

    <div className="h-1.5 rounded-full bg-black mt-2 overflow-hidden">
      <motion.div
        initial={{
          width: 0,
        }}
        animate={{
          width: `${percent}%`,
        }}
        className="h-full bg-cyan-400 rounded-full"
      />
    </div>
  </div>
);

const AnalyticsChart = ({
  title,
  value,
  color = 'cyan',
}) => (
  <Card className="p-6">

    <div className="flex justify-between items-start">

      <div>
        <p className="text-[7px] font-black uppercase tracking-[2px] text-zinc-600">
          {title}
        </p>

        <p className="text-2xl font-black font-mono italic mt-2">
          {value}
        </p>
      </div>

      <BarChart3
        size={15}
        className={`${
          color === 'purple'
            ? 'text-purple-400'
            : color === 'emerald'
            ? 'text-emerald-400'
            : color === 'yellow'
            ? 'text-yellow-400'
            : 'text-cyan-400'
        }`}
      />
    </div>

    <div className="flex items-end gap-1 h-28 mt-6">

      {[
        25,
        38,
        31,
        48,
        44,
        62,
        54,
        71,
        58,
        77,
        68,
        86,
      ].map(
        (height, index) => (
          <div
            key={index}
            className="flex-1 h-full flex items-end"
          >
            <div
              className={`w-full rounded-t-md ${
                color === 'purple'
                  ? 'bg-purple-500/50'
                  : color ===
                    'emerald'
                  ? 'bg-emerald-500/50'
                  : color ===
                    'yellow'
                  ? 'bg-yellow-500/50'
                  : 'bg-cyan-500/50'
              }`}
              style={{
                height: `${height}%`,
              }}
            />
          </div>
        )
      )}
    </div>
  </Card>
);

const MetricPanel = ({
  title,
  rows,
}) => (
  <Card className="p-5">

    <p className="text-[8px] font-black uppercase tracking-[2px] text-zinc-500">
      {title}
    </p>

    <div className="space-y-3 mt-5">

      {rows.map(
        ([label, value]) => (
          <div
            key={label}
            className="flex justify-between items-center gap-3"
          >
            <span className="text-[8px] text-zinc-600 uppercase">
              {label}
            </span>

            <span className="text-[8px] font-black text-zinc-300">
              {value}
            </span>
          </div>
        )
      )}
    </div>
  </Card>
);

const QuickAction = ({
  icon: Icon,
  title,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.05] hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] text-left transition-all group"
  >
    <div className="w-9 h-9 rounded-xl bg-black border border-white/[0.05] flex items-center justify-center group-hover:border-cyan-500/20">
      <Icon
        size={15}
        className="text-zinc-500 group-hover:text-cyan-400"
      />
    </div>

    <p className="text-[8px] font-black uppercase tracking-wider mt-4">
      {title}
    </p>
  </button>
);

const FeatureTile = ({
  icon: Icon,
  title,
  large = false,
}) => (
  <button
    className={`rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/20 hover:bg-cyan-500/[0.025] transition-all group ${
      large
        ? 'p-6'
        : 'p-4'
    }`}
  >
    <Icon
      size={large ? 19 : 15}
      className="text-zinc-600 group-hover:text-cyan-400 transition-colors"
    />

    <p className="text-[7px] font-black uppercase tracking-wider mt-3">
      {title}
    </p>
  </button>
);

const ToolLarge = ({
  icon: Icon,
  title,
}) => (
  <button className="p-6 rounded-2xl bg-zinc-900/30 border border-white/[0.06] hover:border-cyan-500/20 text-left transition-all group">
    <div className="w-10 h-10 rounded-xl bg-black border border-white/[0.06] flex items-center justify-center">
      <Icon
        size={17}
        className="text-zinc-500 group-hover:text-cyan-400"
      />
    </div>

    <p className="text-[9px] font-black uppercase tracking-wider mt-4">
      {title}
    </p>

    <p className="text-[7px] text-zinc-700 mt-1">
      Creator tool
    </p>
  </button>
);

const ResourceCard = ({
  icon: Icon,
  title,
}) => (
  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
    <Icon
      size={17}
      className="text-purple-400"
    />

    <p className="text-[9px] font-black uppercase mt-4">
      {title}
    </p>

    <p className="text-[7px] text-zinc-700 mt-1">
      Creator resource
    </p>
  </div>
);

const Recommendation = ({
  icon: Icon,
  title,
  description,
  score,
}) => (
  <Card className="p-4 flex items-center gap-4">

    <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
      <Icon
        size={16}
        className="text-cyan-400"
      />
    </div>

    <div className="flex-1">
      <p className="text-[9px] font-black">
        {title}
      </p>

      <p className="text-[7px] text-zinc-600 mt-1">
        {description}
      </p>
    </div>

    <span className="text-[8px] font-black text-emerald-400">
      {score}
    </span>
  </Card>
);

const SignalCard = ({
  icon: Icon,
  title,
  value,
  description,
}) => (
  <Card className="p-5">
    <Icon
      size={15}
      className="text-cyan-400"
    />

    <p className="text-xl font-black font-mono mt-4">
      {value}
    </p>

    <p className="text-[7px] font-black uppercase tracking-wider mt-1">
      {title}
    </p>

    <p className="text-[7px] text-zinc-700 mt-2">
      {description}
    </p>
  </Card>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="py-12 text-center">

    <Icon
      size={25}
      className="text-zinc-800 mx-auto"
    />

    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mt-4">
      {title}
    </p>

    <p className="text-[8px] text-zinc-800 max-w-xs mx-auto mt-2">
      {description}
    </p>
  </div>
);

const LibraryCard = ({
  icon: Icon,
  title,
  count,
}) => (
  <Card className="p-5">
    <Icon
      size={17}
      className="text-cyan-400"
    />

    <p className="text-2xl font-black font-mono mt-5">
      {count}
    </p>

    <p className="text-[7px] font-black uppercase tracking-wider text-zinc-600 mt-1">
      {title}
    </p>
  </Card>
);

const StorageItem = ({
  label,
  value,
}) => (
  <div className="p-3 rounded-xl bg-white/[0.02]">
    <p className="text-[7px] text-zinc-700 uppercase">
      {label}
    </p>

    <p className="text-[9px] font-black mt-1">
      {value}
    </p>
  </div>
);

const StatusCard = ({
  title,
  icon: Icon,
  value,
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
    <Icon
      size={14}
      className="text-emerald-400"
    />

    <p className="text-[8px] font-black uppercase mt-3">
      {title}
    </p>

    <p className="text-[7px] text-zinc-600 mt-1">
      {value}
    </p>
  </div>
);

const ScheduleItem = ({
  date,
  title,
  type,
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">

    <div className="flex justify-between gap-3">

      <div>
        <p className="text-[7px] text-cyan-400 font-black uppercase">
          {date}
        </p>

        <p className="text-[9px] font-black mt-2">
          {title}
        </p>
      </div>

      <span className="text-[6px] font-black uppercase text-zinc-600">
        {type}
      </span>
    </div>
  </div>
);

const TrendRow = ({
  title,
  growth,
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
    <TrendingUp
      size={13}
      className="text-emerald-400"
    />

    <span className="flex-1 text-[8px] font-black">
      {title}
    </span>

    <span className="text-[8px] font-black text-emerald-400">
      {growth}
    </span>
  </div>
);

const AIPlanCard = ({
  day,
  idea,
}) => (
  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
    <p className="text-[7px] uppercase text-zinc-700 font-black">
      {day}
    </p>

    <p className="text-[10px] font-black mt-3">
      {idea}
    </p>

    <span className="inline-flex mt-4 px-2 py-1 rounded bg-purple-500/10 text-purple-300 text-[6px] font-black uppercase">
      AI suggested
    </span>
  </div>
);

const HealthMetric = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
    <Icon
      size={14}
      className="text-emerald-400"
    />

    <p className="text-[8px] font-black mt-3">
      {value}
    </p>

    <p className="text-[6px] uppercase text-zinc-700 mt-1">
      {label}
    </p>
  </div>
);

const GoalCard = ({
  title,
  current,
  target,
  icon: Icon,
}) => (
  <Card className="p-5">

    <Icon
      size={16}
      className="text-cyan-400"
    />

    <p className="text-[9px] font-black uppercase mt-4">
      {title}
    </p>

    <div className="flex justify-between mt-3">
      <span className="text-lg font-black font-mono">
        {current}
      </span>

      <span className="text-[8px] text-zinc-700 self-end">
        / {target}
      </span>
    </div>

    <div className="h-1.5 bg-black rounded-full mt-3 overflow-hidden">
      <div className="w-[78%] h-full bg-cyan-400 rounded-full" />
    </div>
  </Card>
);

const RevenueSource = ({
  icon: Icon,
  title,
  value,
}) => (
  <Card className="p-5">
    <Icon
      size={15}
      className="text-emerald-400"
    />

    <p className="text-[8px] font-black uppercase mt-4">
      {title}
    </p>

    <p className="text-sm font-black font-mono mt-2">
      {value}
    </p>
  </Card>
);

const PaymentCard = ({
  icon: Icon,
  title,
}) => (
  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
    <Icon
      size={18}
      className="text-cyan-400"
    />

    <p className="text-[9px] font-black uppercase mt-4">
      {title}
    </p>

    <button className="text-[7px] uppercase font-black text-cyan-400 mt-3">
      Configure
    </button>
  </div>
);

const ProgramCard = ({
  icon: Icon,
  title,
  badge,
}) => (
  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
    <Icon
      size={17}
      className="text-purple-400"
    />

    <div className="flex items-center justify-between mt-4">
      <p className="text-[9px] font-black uppercase">
        {title}
      </p>

      {badge && (
        <span className="text-[6px] font-black uppercase px-1.5 py-1 rounded bg-cyan-500/10 text-cyan-300">
          {badge}
        </span>
      )}
    </div>
  </div>
);

const ProfileMetric = ({
  label,
  value,
}) => (
  <Card className="p-5">
    <p className="text-xl font-black font-mono">
      {value}
    </p>

    <p className="text-[7px] text-zinc-700 uppercase tracking-wider mt-1">
      {label}
    </p>
  </Card>
);

const SecurityCard = ({
  icon: Icon,
  title,
  status,
}) => (
  <Card className="p-5 flex items-center gap-4">

    <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
      <Icon
        size={16}
        className="text-emerald-400"
      />
    </div>

    <div>
      <p className="text-[9px] font-black uppercase">
        {title}
      </p>

      <p className="text-[7px] text-zinc-600 mt-1">
        {status}
      </p>
    </div>
  </Card>
);

const SecurityEvent = ({
  title,
  device,
  status,
}) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02]">
    <Shield
      size={13}
      className="text-emerald-400"
    />

    <div className="flex-1">
      <p className="text-[8px] font-black">
        {title}
      </p>

      <p className="text-[7px] text-zinc-700 mt-1">
        {device}
      </p>
    </div>

    <span className="text-[7px] font-black text-emerald-400 uppercase">
      {status}
    </span>
  </div>
);

const ToggleRow = ({
  label,
  description,
  enabled = false,
  onChange,
}) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">

    <div className="flex-1">
      <p className="text-[9px] font-black">
        {label}
      </p>

      {description && (
        <p className="text-[7px] text-zinc-700 mt-1">
          {description}
        </p>
      )}
    </div>

    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full p-0.5 transition-all ${
        enabled
          ? 'bg-cyan-500'
          : 'bg-zinc-800'
      }`}
    >
      <span
        className={`block w-4 h-4 rounded-full bg-white transition-transform ${
          enabled
            ? 'translate-x-5'
            : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SettingDisplay = ({
  label,
  value,
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
    <p className="text-[7px] text-zinc-700 uppercase">
      {label}
    </p>

    <p className="text-[9px] font-black mt-2">
      {value}
    </p>
  </div>
);

const ReportCard = ({
  icon: Icon,
  title,
}) => (
  <Card className="p-5">
    <Icon
      size={17}
      className="text-cyan-400"
    />

    <p className="text-[9px] font-black uppercase mt-4">
      {title}
    </p>

    <button className="text-[7px] text-cyan-400 uppercase font-black mt-3">
      Generate
    </button>
  </Card>
);

const ExportRow = ({
  title,
  description,
  onClick,
}) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">

    <FileDown
      size={15}
      className="text-cyan-400"
    />

    <div className="flex-1">
      <p className="text-[9px] font-black">
        {title}
      </p>

      <p className="text-[7px] text-zinc-700 mt-1">
        {description}
      </p>
    </div>

    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"
    >
      <Download size={13} />
    </button>
  </div>
);

/*
|--------------------------------------------------------------------------
| ICON FALLBACK COMPONENTS
|--------------------------------------------------------------------------
|
| These aliases keep the main UI readable while avoiding dependency
| on custom icon packages.
|--------------------------------------------------------------------------
*/

const QrCodeIcon = ({
  size = 18,
  className = '',
}) => (
  <div
    className={`flex items-center justify-center ${className}`}
    style={{
      width: size,
      height: size,
    }}
  >
    <div className="w-full h-full border-2 border-current grid grid-cols-2 gap-[2px] p-[2px]">
      <span className="border border-current" />
      <span className="bg-current" />
      <span className="bg-current" />
      <span className="border border-current" />
    </div>
  </div>
);

const BadgeIcon = ({
  size = 18,
  className = '',
}) => (
  <CheckCircle2
    size={size}
    className={className}
  />
);

const FingerprintIcon = ({
  size = 18,
  className = '',
}) => (
  <Fingerprint
    size={size}
    className={className}
  />
);

const MailIcon = ({
  size = 18,
  className = '',
}) => (
  <FileText
    size={size}
    className={className}
  />
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default UniverseTools;
