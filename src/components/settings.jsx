import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  User,
  ShieldCheck,
  Shield,
  Lock,
  KeyRound,
  Smartphone,
  Bell,
  Eye,
  EyeOff,
  Globe,
  Languages,
  Palette,
  Database,
  HardDrive,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  BarChart3,
  Video,
  Radio,
  CalendarClock,
  FolderOpen,
  Trophy,
  Sparkles,
  Bot,
  Copyright,
  MessageCircle,
  MessagesSquare,
  Users,
  UserPlus,
  Heart,
  Download,
  FileDown,
  Link2,
  Plug,
  Accessibility,
  LifeBuoy,
  AlertTriangle,
  FileText,
  Settings2,
  Activity,
  Server,
  RefreshCw,
  Wifi,
  Trash2,
  LogOut,
  UserX,
  UserRoundCog,
  CheckCircle2,
  CircleAlert,
  Info,
  Share2,
  SlidersHorizontal,
  Volume2,
  Zap,
  MousePointer2,
  Moon,
  Sun,
  Monitor,
  Fingerprint,
  History,
  BadgeCheck,
  ShieldAlert,
  Ban,
  MessageSquareWarning,
  Upload,
  Image,
  Music,
  Archive,
  Clock3,
  Flag,
  BriefcaseBusiness,
  Megaphone,
  Target,
  Gift,
  CreditCard as PaymentCard,
  FileSpreadsheet,
  FileJson,
  FileType2,
  CloudDownload,
  HardDriveDownload,
  MoreHorizontal
} from "lucide-react";

import { supabase } from "../supabaseClient";

/*
|--------------------------------------------------------------------------
| APPLICATION CONFIG
|--------------------------------------------------------------------------
*/

const APP_VERSION = "2.4.0-Beta";
const APP_NAME = "Mpade Universe";

/*
|--------------------------------------------------------------------------
| SETTINGS CATEGORIES
|--------------------------------------------------------------------------
*/

const SETTINGS_CATEGORIES = [
  {
    id: "account",
    title: "Account",
    description: "Manage your profile, account type and account lifecycle.",
    icon: User,
    color: "text-cyan-400",
    items: [
      {
        id: "account-information",
        title: "Account Information",
        description: "Username, name, profile, email, phone and account status.",
        icon: User,
        route: "/edit-profile"
      },
      {
        id: "account-type",
        title: "Account Type",
        description: "Personal, creator, professional and business account modes.",
        icon: UserRoundCog
      },
      {
        id: "account-management",
        title: "Account Management",
        description: "Deactivate, delete, recover or download your account data.",
        icon: Settings2,
        danger: true
      }
    ]
  },

  {
    id: "security",
    title: "Security & Privacy",
    description: "Protect your account and control who can access you.",
    icon: ShieldCheck,
    color: "text-emerald-400",
    items: [
      {
        id: "security",
        title: "Security",
        description: "Password, 2FA, passkeys, login alerts and active sessions.",
        icon: Shield,
        route: "/settings/security"
      },
      {
        id: "privacy",
        title: "Privacy",
        description: "Control profile visibility, activity and discoverability.",
        icon: Eye
      },
      {
        id: "blocked",
        title: "Blocked & Restricted",
        description: "Manage blocked, muted and restricted accounts.",
        icon: Ban
      },
      {
        id: "connected-apps",
        title: "Connected Apps",
        description: "OAuth applications, API access and permissions.",
        icon: Plug,
        route: "/settings/apps"
      }
    ]
  },

  {
    id: "social",
    title: "Content & Social",
    description: "Control notifications, messages, comments and your audience.",
    icon: MessageCircle,
    color: "text-pink-400",
    items: [
      {
        id: "notifications",
        title: "Notifications",
        description: "Push, email, SMS, sounds, quiet hours and notification history.",
        icon: Bell,
        route: "/settings/notifications"
      },
      {
        id: "content",
        title: "Content Preferences",
        description: "Default privacy, downloads, comments, uploads and content warnings.",
        icon: Video,
        route: "/settings/content"
      },
      {
        id: "comments",
        title: "Comments",
        description: "Comment permissions, filters and moderation.",
        icon: MessageSquareWarning,
        route: "/settings/comments"
      },
      {
        id: "messages",
        title: "Messages",
        description: "Message requests, groups, read receipts and privacy.",
        icon: MessagesSquare,
        route: "/settings/messages"
      },
      {
        id: "followers",
        title: "Followers & Audience",
        description: "Follower requests, suggestions and discoverability.",
        icon: Users
      }
    ]
  },

  {
    id: "experience",
    title: "Experience",
    description: "Customize performance, language, appearance and accessibility.",
    icon: SlidersHorizontal,
    color: "text-violet-400",
    items: [
      {
        id: "data",
        title: "Data & Storage",
        description: "Data saver, autoplay, cache, downloads and storage usage.",
        icon: Database,
        route: "/settings/data"
      },
      {
        id: "language",
        title: "Language & Region",
        description: "Language, translation, timezone, currency and regional formats.",
        icon: Languages,
        route: "/settings/language"
      },
      {
        id: "appearance",
        title: "Appearance",
        description: "Theme, neon mode, density, animation and visual effects.",
        icon: Palette,
        route: "/settings/appearance"
      },
      {
        id: "accessibility",
        title: "Accessibility",
        description: "Font size, contrast, captions, motion and touch controls.",
        icon: Accessibility,
        route: "/settings/accessibility"
      }
    ]
  },

  {
    id: "creator",
    title: "Creator",
    description: "Creator tools, analytics, monetization and publishing.",
    icon: Sparkles,
    color: "text-cyan-300",
    items: [
      {
        id: "creator-studio",
        title: "Creator Studio",
        description: "Manage your creator dashboard and professional profile.",
        icon: BarChart3,
        route: "/universe-tools"
      },
      {
        id: "creator-analytics",
        title: "Analytics",
        description: "Audience, growth, content performance and earnings analytics.",
        icon: Activity,
        route: "/universe-tools"
      },
      {
        id: "creator-monetization",
        title: "Monetization",
        description: "Creator fund, earnings, subscriptions, gifts and paid content.",
        icon: Coins,
        route: "/settings/creator/monetization"
      },
      {
        id: "creator-gifts",
        title: "Gifts",
        description: "Gift earnings, received gifts and virtual items.",
        icon: Gift,
        route: "/settings/creator/gifts"
      },
      {
        id: "creator-subscriptions",
        title: "Subscriptions",
        description: "Subscriber settings, payments and subscriber benefits.",
        icon: BadgeCheck,
        route: "/settings/creator/subscriptions"
      },
      {
        id: "creator-live",
        title: "Livestream",
        description: "Live settings, moderation, gifts and live preferences.",
        icon: Radio,
        route: "/settings/creator/livestream"
      },
      {
        id: "creator-scheduling",
        title: "Scheduling",
        description: "Schedule videos, lives and automatic publishing.",
        icon: CalendarClock,
        route: "/settings/creator/scheduling"
      },
      {
        id: "creator-library",
        title: "Content Library",
        description: "Videos, drafts, thumbnails, audio and live recordings.",
        icon: FolderOpen,
        route: "/settings/creator/library"
      },
      {
        id: "creator-progress",
        title: "Goals & Achievements",
        description: "Level, XP, badges, streaks, milestones and rewards.",
        icon: Trophy,
        route: "/settings/creator/progress"
      },
      {
        id: "creator-ai",
        title: "Creator AI",
        description: "AI assistant, captions, scripts, hashtags and analysis.",
        icon: Bot,
        route: "/settings/ai"
      },
      {
        id: "creator-brand",
        title: "Brand & Collaborations",
        description: "Campaigns, partnerships, media kit and sponsored content.",
        icon: BriefcaseBusiness,
        route: "/settings/creator/brand"
      }
    ]
  },

  {
    id: "payments",
    title: "Payments & Monetization",
    description: "Wallet, payment methods, payouts and transactions.",
    icon: Wallet,
    color: "text-green-400",
    items: [
      {
        id: "wallet",
        title: "Wallet",
        description: "Balance, coins, tokens, earnings and pending funds.",
        icon: Wallet,
        route: "/payouts"
      },
      {
        id: "payment-methods",
        title: "Payment Methods",
        description: "TNM Mpamba, Airtel Money, bank and payout verification.",
        icon: PaymentCard
      },
      {
        id: "payouts",
        title: "Payouts",
        description: "Request payouts, limits, status and payout history.",
        icon: Banknote,
        route: "/payouts"
      },
      {
        id: "transactions",
        title: "Transactions",
        description: "Purchases, gifts, coins, subscriptions and refunds.",
        icon: CreditCard
      }
    ]
  },

  {
    id: "safety",
    title: "Safety & Legal",
    description: "Copyright, content safety, rules and legal information.",
    icon: ShieldAlert,
    color: "text-red-400",
    items: [
      {
        id: "copyright",
        title: "Copyright",
        description: "Claims, strikes, disputes, appeals and music rights.",
        icon: Copyright,
        route: "/settings/copyright"
      },
      {
        id: "safety",
        title: "Content Safety",
        description: "Warnings, violations, removed and restricted content.",
        icon: ShieldAlert
      },
      {
        id: "guidelines",
        title: "Community Guidelines",
        description: "Rules for keeping Mpade Universe safe.",
        icon: FileText
      },
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        description: "How Mpade Universe handles information.",
        icon: Eye,
        route: "/privacy"
      },
      {
        id: "terms",
        title: "Terms of Service",
        description: "Terms and conditions for using the platform.",
        icon: FileText
      }
    ]
  },

  {
    id: "ai",
    title: "AI & Personalization",
    description: "Manage AI features, recommendations and AI data usage.",
    icon: Bot,
    color: "text-fuchsia-400",
    items: [
      {
        id: "ai-settings",
        title: "AI Assistant",
        description: "Assistant, recommendations and personalization.",
        icon: Bot,
        route: "/settings/ai"
      },
      {
        id: "ai-content",
        title: "AI Content Tools",
        description: "Captions, scripts, hashtags, thumbnails and video analysis.",
        icon: Sparkles
      },
      {
        id: "ai-moderation",
        title: "AI Moderation",
        description: "Automated moderation and safety assistance.",
        icon: ShieldCheck
      },
      {
        id: "ai-data",
        title: "AI Data Usage",
        description: "Control how your activity is used for AI personalization.",
        icon: Database
      },
      {
        id: "ai-history",
        title: "AI History",
        description: "View or clear previous AI interactions.",
        icon: History
      }
    ]
  },

  {
    id: "data-reports",
    title: "Data & Reports",
    description: "Export personal data, analytics and financial reports.",
    icon: FileDown,
    color: "text-blue-400",
    items: [
      {
        id: "personal-data",
        title: "Download My Data",
        description: "Request an archive of your personal account data.",
        icon: CloudDownload,
        route: "/settings/reports"
      },
      {
        id: "analytics-export",
        title: "Export Analytics",
        description: "Export creator analytics in supported formats.",
        icon: BarChart3
      },
      {
        id: "earnings-reports",
        title: "Earnings Reports",
        description: "Creator earnings and financial reports.",
        icon: FileSpreadsheet
      },
      {
        id: "creator-reports",
        title: "Creator Reports",
        description: "Monthly creator performance reports.",
        icon: FileText
      }
    ]
  },

  {
    id: "support",
    title: "Support",
    description: "Get help, report issues and contact Mpade Universe.",
    icon: LifeBuoy,
    color: "text-zinc-300",
    items: [
      {
        id: "help",
        title: "Help Center",
        description: "Find answers and guides.",
        icon: LifeBuoy,
        route: "/support"
      },
      {
        id: "report",
        title: "Report a Problem",
        description: "Report account, content or technical problems.",
        icon: Flag
      },
      {
        id: "tickets",
        title: "Support Tickets",
        description: "View your previous support requests.",
        icon: MessageCircle
      },
      {
        id: "account-recovery",
        title: "Account Recovery",
        description: "Recover access to your account.",
        icon: KeyRound
      },
      {
        id: "safety-center",
        title: "Safety Center",
        description: "Safety resources and account protection.",
        icon: ShieldCheck
      },
      {
        id: "about",
        title: `About ${APP_NAME}`,
        description: "Application information and version details.",
        icon: Smartphone,
        route: "/about"
      }
    ]
  },

  {
    id: "system",
    title: "System",
    description: "Diagnostics, connectivity, synchronization and application status.",
    icon: Server,
    color: "text-orange-400",
    items: [
      {
        id: "diagnostics",
        title: "Diagnostics",
        description: "Connection, storage, synchronization and system diagnostics.",
        icon: Activity
      },
      {
        id: "server",
        title: "Server Status",
        description: "Database, storage, notifications and media-processing status.",
        icon: Server
      },
      {
        id: "sync",
        title: "Sync & Network",
        description: "Last sync, offline mode and background synchronization.",
        icon: Wifi
      },
      {
        id: "cache",
        title: "Cache & Temporary Data",
        description: "View and clear locally cached application data.",
        icon: HardDrive
      },
      {
        id: "about-system",
        title: "App Information",
        description: "Version, build and application environment.",
        icon: Info
      }
    ]
  }
];

/*
|--------------------------------------------------------------------------
| SMALL HELPERS
|--------------------------------------------------------------------------
*/

const safeStorageSize = () => {
  try {
    let bytes = 0;

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);

      if (!key) continue;

      const value = localStorage.getItem(key) || "";

      bytes += new Blob([key, value]).size;
    }

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);

      if (!key) continue;

      const value = sessionStorage.getItem(key) || "";

      bytes += new Blob([key, value]).size;
    }

    return bytes;
  } catch {
    return 0;
  }
};

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getInitial = (value) => {
  if (!value) return "U";

  return String(value)
    .trim()
    .charAt(0)
    .toUpperCase();
};

/*
|--------------------------------------------------------------------------
| MAIN PAGE
|--------------------------------------------------------------------------
*/

const SettingsPage = () => {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [cacheSize, setCacheSize] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);

  const [dataSaver, setDataSaver] = useState(() => {
    try {
      return localStorage.getItem("mpade_data_saver") === "true";
    } catch {
      return false;
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      return localStorage.getItem("mpade_notifications") !== "false";
    } catch {
      return true;
    }
  });

  const [onlineStatus, setOnlineStatus] = useState(() => {
    try {
      return localStorage.getItem("mpade_online_status") !== "false";
    } catch {
      return true;
    }
  });

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("mpade_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  /*
  |--------------------------------------------------------------------------
  | LOAD USER
  |--------------------------------------------------------------------------
  */

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setUserEmail("");
        return;
      }

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          full_name,
          avatar_url,
          bio,
          dob,
          gender,
          location,
          district,
          website,
          follower_count,
          following_count,
          total_likes,
          balance,
          coins,
          total_tokens_earned,
          subscription_tier,
          verified_status,
          is_verified,
          account_status,
          currency_preference,
          online,
          is_online
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (!error) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Settings profile load error:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    setCacheSize(safeStorageSize());
  }, [loadProfile]);

  /*
  |--------------------------------------------------------------------------
  | PERSIST LOCAL PREFERENCES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem("mpade_data_saver", String(dataSaver));
    } catch {
      // Storage may be unavailable.
    }
  }, [dataSaver]);

  useEffect(() => {
    try {
      localStorage.setItem("mpade_notifications", String(notifications));
    } catch {
      // Storage may be unavailable.
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem("mpade_online_status", String(onlineStatus));
    } catch {
      // Storage may be unavailable.
    }
  }, [onlineStatus]);

  useEffect(() => {
    try {
      localStorage.setItem("mpade_theme", darkMode);
    } catch {
      // Storage may be unavailable.
    }
  }, [darkMode]);

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    const results = [];

    SETTINGS_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => {
        const haystack = [
          category.title,
          category.description,
          item.title,
          item.description
        ]
          .join(" ")
          .toLowerCase();

        if (haystack.includes(query)) {
          results.push({
            ...item,
            categoryId: category.id,
            categoryTitle: category.title
          });
        }
      });
    });

    return results;
  }, [search]);

  /*
  |--------------------------------------------------------------------------
  | OPEN SETTING
  |--------------------------------------------------------------------------
  */

  const openSetting = (item, category) => {
    if (item.route) {
      navigate(item.route);
      return;
    }

    setActiveCategory(category);
    setActiveItem(item);
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR CACHE
  |--------------------------------------------------------------------------
  */

  const clearCache = () => {
    if (clearingCache) return;

    setClearingCache(true);

    try {
      const protectedKeys = [
        "sb-",
        "supabase",
        "auth",
        "mpade_data_saver",
        "mpade_notifications",
        "mpade_online_status",
        "mpade_theme"
      ];

      Object.keys(localStorage).forEach((key) => {
        const shouldKeep = protectedKeys.some((protectedKey) =>
          key.toLowerCase().startsWith(protectedKey.toLowerCase())
        );

        if (!shouldKeep) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();

      setCacheSize(safeStorageSize());
    } catch (error) {
      console.error("Cache clear error:", error);
    } finally {
      setTimeout(() => {
        setClearingCache(false);
      }, 500);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      navigate("/");
    } else {
      console.error("Logout error:", error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PROFILE DATA
  |--------------------------------------------------------------------------
  */

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    "Mpade User";

  const username = profile?.username
    ? `@${profile.username}`
    : "No username";

  const avatarLetter = getInitial(displayName);

  const verified =
    profile?.is_verified === true ||
    profile?.verified_status === true ||
    profile?.verified_status === "verified";

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="settings-page min-h-screen bg-[#030303] text-white font-sans">
      {/* ================================================================
          CUSTOM SCROLLBAR
      ================================================================= */}

      <style>{`
        .settings-page {
          scrollbar-width: thin;
          scrollbar-color: rgba(34,211,238,.45) rgba(255,255,255,.03);
        }

        .settings-page::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .settings-page::-webkit-scrollbar-track {
          background: rgba(255,255,255,.025);
        }

        .settings-page::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(34,211,238,.75),
            rgba(168,85,247,.65)
          );
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.08);
        }

        .settings-page::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(34,211,238,1),
            rgba(168,85,247,.9)
          );
        }

        .settings-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(34,211,238,.45) rgba(255,255,255,.03);
        }

        .settings-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .settings-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .settings-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.12);
          border-radius: 999px;
        }

        .settings-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(34,211,238,.45);
        }
      `}</style>

      {/* ================================================================
          HEADER
      ================================================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-black uppercase tracking-[2px] sm:text-base">
                Settings & Privacy
              </h1>

              <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-cyan-300 sm:inline-flex">
                Control Center
              </span>
            </div>

            <p className="mt-0.5 hidden text-[10px] text-zinc-600 sm:block">
              Manage your Mpade Universe experience
            </p>
          </div>

          <button
            onClick={() => setMobileSearchOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400 transition hover:text-white lg:hidden"
          >
            <Search size={18} />
          </button>
        </div>

        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.04] lg:hidden"
            >
              <div className="p-4">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  onClear={() => setSearch("")}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ================================================================
          MAIN
      ================================================================= */}

      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        {/* PROFILE HERO */}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-cyan-500/[0.025] p-5 shadow-2xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-purple-500/10 blur-[80px]" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-16 w-16 rounded-[20px] border border-white/10 object-cover shadow-xl sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-cyan-400/20 bg-cyan-400/10 text-xl font-black text-cyan-300 shadow-xl sm:h-20 sm:w-20 sm:text-2xl">
                    {avatarLetter}
                  </div>
                )}

                {verified && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-[#080808] bg-cyan-400 text-black">
                    <CheckCircle2 size={13} strokeWidth={3} />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
                    {loadingProfile ? "Loading..." : displayName}
                  </h2>

                  {verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-300">
                      <BadgeCheck size={11} />
                      Verified
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {loadingProfile ? "Loading profile..." : username}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniStat
                    label="Followers"
                    value={profile?.follower_count ?? 0}
                  />
                  <MiniStat
                    label="Following"
                    value={profile?.following_count ?? 0}
                  />
                  <MiniStat
                    label="Likes"
                    value={profile?.total_likes ?? 0}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/edit-profile")}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-[1.5px] text-cyan-300 transition hover:bg-cyan-400/15"
            >
              <User size={15} />
              Edit Profile
            </button>
          </div>
        </motion.section>

        {/* ================================================================
            SEARCH DESKTOP
        ================================================================= */}

        <div className="mt-5 hidden lg:block">
          <SearchBox
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
          />
        </div>

        {/* ================================================================
            SEARCH RESULTS
        ================================================================= */}

        <AnimatePresence mode="wait">
          {search.trim() ? (
            <motion.section
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-cyan-400">
                    Search Results
                  </p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {searchResults.length} setting
                    {searchResults.length === 1 ? "" : "s"} found
                  </h3>
                </div>

                <button
                  onClick={() => setSearch("")}
                  className="rounded-lg px-3 py-2 text-[10px] font-bold text-zinc-500 hover:bg-white/5 hover:text-white"
                >
                  Clear
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((item) => (
                    <SearchResult
                      key={`${item.categoryId}-${item.id}`}
                      item={item}
                      onClick={() =>
                        openSetting(
                          item,
                          SETTINGS_CATEGORIES.find(
                            (category) => category.id === item.categoryId
                          )
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Search size={24} />}
                  title="No settings found"
                  description="Try another keyword such as security, payout, creator, privacy or notifications."
                />
              )}
            </motion.section>
          ) : (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
            >
              {/* ==========================================================
                  LEFT CATEGORY NAV
              =========================================================== */}

              <aside className="hidden lg:block">
                <div className="sticky top-[90px] rounded-[24px] border border-white/[0.06] bg-white/[0.018] p-2">
                  <p className="px-3 pb-2 pt-2 text-[9px] font-black uppercase tracking-[2px] text-zinc-600">
                    Settings
                  </p>

                  <div className="settings-scroll max-h-[calc(100vh-150px)] overflow-y-auto pr-1">
                    {SETTINGS_CATEGORIES.map((category) => (
                      <CategoryNavItem
                        key={category.id}
                        category={category}
                        active={activeCategory?.id === category.id}
                        onClick={() => {
                          const element = document.getElementById(
                            `settings-${category.id}`
                          );

                          if (element) {
                            element.scrollIntoView({
                              behavior: "smooth",
                              block: "center"
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </aside>

              {/* ==========================================================
                  CATEGORY CONTENT
              =========================================================== */}

              <div className="min-w-0 space-y-7">
                {SETTINGS_CATEGORIES.map((category, categoryIndex) => (
                  <SettingsCategory
                    key={category.id}
                    category={category}
                    index={categoryIndex}
                    onOpen={(item) => openSetting(item, category)}
                  />
                ))}

                {/* ========================================================
                    DANGER ZONE
                ========================================================= */}

                <DangerZone
                  onLogout={handleLogout}
                  onDeactivate={() => {
                    setActiveCategory({
                      id: "account-management",
                      title: "Account Management",
                      description: ""
                    });

                    setActiveItem({
                      id: "account-management",
                      title: "Account Management",
                      description:
                        "Deactivate or permanently delete your account.",
                      icon: UserX,
                      danger: true
                    });
                  }}
                />

                {/* ========================================================
                    SYSTEM FOOTER
                ========================================================= */}

                <SystemFooter
                  version={APP_VERSION}
                  cacheSize={cacheSize}
                  clearingCache={clearingCache}
                  onClearCache={clearCache}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ================================================================
          DETAIL DRAWER
      ================================================================= */}

      <AnimatePresence>
        {activeItem && (
          <SettingDrawer
            item={activeItem}
            category={activeCategory}
            profile={profile}
            userEmail={userEmail}
            dataSaver={dataSaver}
            setDataSaver={setDataSaver}
            notifications={notifications}
            setNotifications={setNotifications}
            onlineStatus={onlineStatus}
            setOnlineStatus={setOnlineStatus}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onClose={() => {
              setActiveItem(null);
              setActiveCategory(null);
            }}
            onNavigate={navigate}
            onClearCache={clearCache}
            cacheSize={cacheSize}
            clearingCache={clearingCache}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| SEARCH BOX
|--------------------------------------------------------------------------
*/

const SearchBox = ({ value, onChange, onClear }) => {
  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search settings..."
        className="h-12 w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] pl-11 pr-11 text-sm font-medium text-white outline-none placeholder:text-zinc-700 transition focus:border-cyan-400/30 focus:bg-white/[0.04]"
      />

      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-600 hover:bg-white/5 hover:text-white"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| MINI STAT
|--------------------------------------------------------------------------
*/

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-white/[0.05] bg-black/30 px-2.5 py-1.5">
    <span className="text-[9px] font-black text-zinc-500">
      {Number(value || 0).toLocaleString()}
    </span>
    <span className="ml-1 text-[8px] font-bold uppercase tracking-wide text-zinc-700">
      {label}
    </span>
  </div>
);

/*
|--------------------------------------------------------------------------
| CATEGORY NAV ITEM
|--------------------------------------------------------------------------
*/

const CategoryNavItem = ({ category, active, onClick }) => {
  const Icon = category.icon;

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active
          ? "bg-cyan-400/10 text-cyan-300"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          active
            ? "border-cyan-400/20 bg-cyan-400/10"
            : "border-white/[0.05] bg-white/[0.02]"
        }`}
      >
        <Icon size={15} className={active ? "text-cyan-300" : category.color} />
      </span>

      <span className="min-w-0 flex-1 truncate text-[10px] font-black uppercase tracking-wide">
        {category.title}
      </span>

      <span className="text-[8px] font-bold text-zinc-700">
        {category.items.length}
      </span>
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| SETTINGS CATEGORY
|--------------------------------------------------------------------------
*/

const SettingsCategory = ({ category, index, onOpen }) => {
  const Icon = category.icon;

  return (
    <motion.section
      id={`settings-${category.id}`}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ delay: Math.min(index * 0.025, 0.2) }}
    >
      <div className="mb-3 flex items-end justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
            <Icon size={17} className={category.color} />
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[1.5px] text-white">
              {category.title}
            </h2>

            <p className="mt-0.5 max-w-xl text-[10px] leading-relaxed text-zinc-600">
              {category.description}
            </p>
          </div>
        </div>

        <span className="hidden rounded-full border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-700 sm:block">
          {category.items.length} controls
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {category.items.map((item, itemIndex) => (
          <SettingCard
            key={item.id}
            item={item}
            index={itemIndex}
            onClick={() => onOpen(item)}
          />
        ))}
      </div>
    </motion.section>
  );
};

/*
|--------------------------------------------------------------------------
| SETTING CARD
|--------------------------------------------------------------------------
*/

const SettingCard = ({ item, index, onClick }) => {
  const Icon = item.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.025, 0.15) }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative flex min-h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all ${
        item.danger
          ? "border-red-500/10 bg-red-500/[0.025] hover:border-red-500/25 hover:bg-red-500/[0.05]"
          : "border-white/[0.055] bg-white/[0.018] hover:border-white/[0.12] hover:bg-white/[0.035]"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
          item.danger
            ? "border-red-500/10 bg-red-500/[0.07]"
            : "border-white/[0.06] bg-black/40 group-hover:border-cyan-400/15"
        }`}
      >
        <Icon
          size={18}
          className={
            item.danger
              ? "text-red-400"
              : "text-zinc-400 transition group-hover:text-cyan-300"
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[12px] font-black text-zinc-200">
            {item.title}
          </h3>

          {item.route && (
            <span className="rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-cyan-400">
              Module
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-600">
          {item.description}
        </p>
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
      />
    </motion.button>
  );
};

/*
|--------------------------------------------------------------------------
| SEARCH RESULT
|--------------------------------------------------------------------------
*/

const SearchResult = ({ item, onClick }) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.025]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-black">
        <Icon size={17} className="text-cyan-300" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-black text-zinc-200">
          {item.title}
        </span>

        <span className="mt-1 block truncate text-[9px] text-zinc-600">
          {item.categoryTitle}
        </span>
      </span>

      <ChevronRight
        size={15}
        className="text-zinc-700 group-hover:text-cyan-300"
      />
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| SETTING DRAWER
|--------------------------------------------------------------------------
*/

const SettingDrawer = ({
  item,
  category,
  profile,
  userEmail,
  dataSaver,
  setDataSaver,
  notifications,
  setNotifications,
  onlineStatus,
  setOnlineStatus,
  darkMode,
  setDarkMode,
  onClose,
  onNavigate,
  onClearCache,
  cacheSize,
  clearingCache
}) => {
  const Icon = item.icon;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* BACKDROP */}

      <motion.button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* DRAWER */}

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 32
        }}
        className="settings-scroll relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-white/[0.07] bg-[#070707] shadow-2xl"
      >
        {/* DRAWER HEADER */}

        <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070707]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400 hover:text-white"
            >
              <X size={17} />
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10">
              <Icon size={18} className="text-cyan-300" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[2px] text-zinc-600">
                {category?.title || "Settings"}
              </p>

              <h2 className="truncate text-sm font-black text-white">
                {item.title}
              </h2>
            </div>
          </div>
        </div>

        {/* DRAWER BODY */}

        <div className="flex-1 p-5">
          <SettingPanel
            item={item}
            profile={profile}
            userEmail={userEmail}
            dataSaver={dataSaver}
            setDataSaver={setDataSaver}
            notifications={notifications}
            setNotifications={setNotifications}
            onlineStatus={onlineStatus}
            setOnlineStatus={setOnlineStatus}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onNavigate={onNavigate}
            onClearCache={onClearCache}
            cacheSize={cacheSize}
            clearingCache={clearingCache}
          />
        </div>
      </motion.aside>
    </motion.div>
  );
};

/*
|--------------------------------------------------------------------------
| SETTING PANEL
|--------------------------------------------------------------------------
*/

const SettingPanel = ({
  item,
  profile,
  userEmail,
  dataSaver,
  setDataSaver,
  notifications,
  setNotifications,
  onlineStatus,
  setOnlineStatus,
  darkMode,
  setDarkMode,
  onNavigate,
  onClearCache,
  cacheSize,
  clearingCache
}) => {
  /*
  |--------------------------------------------------------------------------
  | ACCOUNT INFORMATION
  |--------------------------------------------------------------------------
  */

  if (item.id === "account-information") {
    return (
      <PanelShell
        title="Account Information"
        description="Review the information associated with your Mpade Universe account."
      >
        <InfoGrid>
          <InfoField label="Username" value={profile?.username || "Not set"} />
          <InfoField
            label="Display Name"
            value={profile?.display_name || "Not set"}
          />
          <InfoField
            label="Full Name"
            value={profile?.full_name || "Not set"}
          />
          <InfoField label="Email" value={userEmail || "Not available"} />
          <InfoField
            label="Phone"
            value="Configured through account security"
          />
          <InfoField
            label="Date of Birth"
            value={profile?.dob || "Not set"}
          />
          <InfoField label="Gender" value={profile?.gender || "Not set"} />
          <InfoField
            label="Location"
            value={profile?.location || "Not set"}
          />
          <InfoField
            label="District"
            value={profile?.district || "Not set"}
          />
          <InfoField
            label="Website"
            value={profile?.website || "Not set"}
          />
          <InfoField
            label="Account Status"
            value={profile?.account_status || "Active"}
          />
          <InfoField
            label="Verification"
            value={
              profile?.is_verified || profile?.verified_status
                ? "Verified"
                : "Not verified"
            }
          />
        </InfoGrid>

        <ActionButton
          icon={<User size={16} />}
          label="Edit Profile"
          onClick={() => onNavigate("/edit-profile")}
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT TYPE
  |--------------------------------------------------------------------------
  */

  if (item.id === "account-type") {
    return (
      <PanelShell
        title="Account Type"
        description="Choose how you want to use Mpade Universe."
      >
        <div className="space-y-2">
          <ChoiceCard
            title="Personal"
            description="Standard account for everyday social activity."
            icon={<User size={18} />}
            active={!profile?.subscription_tier}
          />

          <ChoiceCard
            title="Creator"
            description="Unlock creator-focused tools, analytics and monetization."
            icon={<Sparkles size={18} />}
          />

          <ChoiceCard
            title="Professional"
            description="Advanced professional dashboard and audience tools."
            icon={<BarChart3 size={18} />}
          />

          <ChoiceCard
            title="Business"
            description="Designed for brands, organizations and campaigns."
            icon={<BriefcaseBusiness size={18} />}
          />
        </div>

        <Notice
          icon={<Info size={16} />}
          title="Account switching"
          description="The account-type backend can be connected to your profiles/account-type field when that module is available."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SECURITY
  |--------------------------------------------------------------------------
  */

  if (item.id === "security") {
    return (
      <PanelShell
        title="Security"
        description="Protect your account with stronger authentication and session controls."
      >
        <PanelLink
          icon={<Lock />}
          title="Password & Security"
          description="Change your password and security preferences."
          onClick={() => onNavigate("/settings/security")}
        />

        <PanelLink
          icon={<Smartphone />}
          title="Two-Factor Authentication"
          description="Authenticator and SMS verification can be configured here."
        />

        <PanelLink
          icon={<Fingerprint />}
          title="Passkeys"
          description="Use device-based authentication where supported."
        />

        <PanelLink
          icon={<ShieldAlert />}
          title="Login Alerts"
          description="Get notified about suspicious or new login activity."
        />

        <PanelLink
          icon={<History />}
          title="Login History"
          description="Review recent authentication activity."
        />

        <PanelLink
          icon={<Smartphone />}
          title="Active Sessions"
          description="Review devices currently signed in to your account."
        />

        <PanelLink
          icon={<LogOut />}
          title="Log Out All Devices"
          description="Sign out all active sessions."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PRIVACY
  |--------------------------------------------------------------------------
  */

  if (item.id === "privacy") {
    return (
      <PanelShell
        title="Privacy"
        description="Control who can see, contact and interact with you."
      >
        <PanelToggle
          icon={<Eye />}
          title="Public Profile"
          description="Allow anyone to view your profile."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<UserPlus />}
          title="Who Can Follow You"
          description="Control who is allowed to follow your account."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<MessagesSquare />}
          title="Who Can Message You"
          description="Control direct-message access."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<AtSignFallback />}
          title="Mentions & Tags"
          description="Control who can mention or tag your account."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Globe />}
          title="Search Visibility"
          description="Allow your account to appear in search and recommendations."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<EyeOff />}
          title="Activity Visibility"
          description="Control online, last-active and profile-view visibility."
          active={onlineStatus}
          onToggle={() => setOnlineStatus(!onlineStatus)}
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | BLOCKED
  |--------------------------------------------------------------------------
  */

  if (item.id === "blocked") {
    return (
      <PanelShell
        title="Blocked & Restricted"
        description="Manage accounts and words you don't want interacting with you."
      >
        <PanelLink
          icon={<Ban />}
          title="Blocked Accounts"
          description="Accounts you have blocked."
        />

        <PanelLink
          icon={<EyeOff />}
          title="Muted Accounts"
          description="Accounts whose content you have muted."
        />

        <PanelLink
          icon={<Shield />}
          title="Restricted Accounts"
          description="Accounts with limited interaction permissions."
        />

        <PanelLink
          icon={<MessageSquareWarning />}
          title="Hidden Words"
          description="Filter comments and messages containing selected words."
        />

        <PanelLink
          icon={<SlidersHorizontal />}
          title="Comment Filters"
          description="Automatically filter offensive or spam comments."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  if (item.id === "notifications") {
    return (
      <PanelShell
        title="Notifications"
        description="Control what Mpade Universe sends you and how it alerts you."
      >
        <PanelToggle
          icon={<Bell />}
          title="Notifications"
          description="Enable or disable general notifications."
          active={notifications}
          onToggle={() => setNotifications(!notifications)}
        />

        <PanelLink
          icon={<Heart />}
          title="Social Notifications"
          description="Followers, likes, comments, replies, shares, reposts and saves."
        />

        <PanelLink
          icon={<Gift />}
          title="Gifts & Earnings"
          description="Gifts, creator fund, earnings and payout notifications."
        />

        <PanelLink
          icon={<Radio />}
          title="Live Notifications"
          description="Live sessions, subscribers and live activity."
        />

        <PanelLink
          icon={<Video />}
          title="Content Notifications"
          description="Video processing, publishing and scheduled content."
        />

        <PanelLink
          icon={<ShieldAlert />}
          title="Security Notifications"
          description="Account security and suspicious activity alerts."
        />

        <PanelLink
          icon={<Volume2 />}
          title="Sounds & Vibration"
          description="Notification sound and vibration preferences."
        />

        <PanelLink
          icon={<Clock3 />}
          title="Quiet Hours"
          description="Silence notifications during selected periods."
        />

        <PanelLink
          icon={<History />}
          title="Notification History"
          description="Review previous notifications."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  if (item.id === "data") {
    return (
      <PanelShell
        title="Data & Storage"
        description="Reduce data usage and manage locally cached content."
      >
        <PanelToggle
          icon={<Database />}
          title="Data Saver"
          description="Reduce video quality and bandwidth usage."
          active={dataSaver}
          onToggle={() => setDataSaver(!dataSaver)}
        />

        <PanelLink
          icon={<Video />}
          title="Video Quality"
          description="Choose upload, playback and download quality."
        />

        <PanelLink
          icon={<Zap />}
          title="Autoplay"
          description="Control autoplay on Wi-Fi and mobile data."
        />

        <PanelLink
          icon={<Download />}
          title="Background Downloads"
          description="Manage offline and background downloads."
        />

        <PanelLink
          icon={<HardDrive />}
          title="Storage Usage"
          description="Videos, drafts, thumbnails, audio, downloads and recordings."
        />

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[1.5px] text-zinc-600">
                Local cache
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {formatBytes(cacheSize)}
              </p>
            </div>

            <HardDrive size={20} className="text-cyan-300" />
          </div>

          <button
            onClick={onClearCache}
            disabled={clearingCache}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
          >
            {clearingCache ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Clear Cache
              </>
            )}
          </button>
        </div>
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LANGUAGE
  |--------------------------------------------------------------------------
  */

  if (item.id === "language") {
    return (
      <PanelShell
        title="Language & Region"
        description="Configure language, translation and regional preferences."
      >
        <SelectRow
          icon={<Languages />}
          title="App Language"
          value="English"
        />

        <SelectRow
          icon={<Globe />}
          title="Country / Region"
          value="Malawi"
        />

        <SelectRow
          icon={<Clock3 />}
          title="Timezone"
          value="CAT — UTC+02:00"
        />

        <SelectRow
          icon={<Banknote />}
          title="Currency"
          value={profile?.currency_preference || "MWK"}
        />

        <PanelToggle
          icon={<Languages />}
          title="Auto Translate"
          description="Automatically translate supported content."
          active={true}
          onToggle={() => {}}
        />

        <SelectRow
          icon={<MessageCircle />}
          title="Caption Language"
          value="English"
        />

        <SelectRow
          icon={<SlidersHorizontal />}
          title="Date & Number Format"
          value="Regional"
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | APPEARANCE
  |--------------------------------------------------------------------------
  */

  if (item.id === "appearance") {
    return (
      <PanelShell
        title="Appearance"
        description="Make Mpade Universe look and feel the way you want."
      >
        <div className="grid grid-cols-3 gap-2">
          <ThemeButton
            icon={<Moon />}
            label="Dark"
            active={darkMode === "dark"}
            onClick={() => setDarkMode("dark")}
          />

          <ThemeButton
            icon={<Sun />}
            label="Light"
            active={darkMode === "light"}
            onClick={() => setDarkMode("light")}
          />

          <ThemeButton
            icon={<Monitor />}
            label="System"
            active={darkMode === "system"}
            onClick={() => setDarkMode("system")}
          />
        </div>

        <PanelToggle
          icon={<Sparkles />}
          title="Neon Mode"
          description="Enable Mpade Universe's futuristic neon visual treatment."
          active={true}
          onToggle={() => {}}
        />

        <SelectRow
          icon={<Palette />}
          title="Accent Color"
          value="Cyan"
        />

        <SelectRow
          icon={<SlidersHorizontal />}
          title="Interface Density"
          value="Comfortable"
        />

        <PanelToggle
          icon={<Zap />}
          title="Animations"
          description="Enable interface animations."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<MousePointer2 />}
          title="Reduce Motion"
          description="Reduce animation and movement effects."
          active={false}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Eye />}
          title="Glass & Blur"
          description="Enable glassmorphism and backdrop blur effects."
          active={true}
          onToggle={() => {}}
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ACCESSIBILITY
  |--------------------------------------------------------------------------
  */

  if (item.id === "accessibility") {
    return (
      <PanelShell
        title="Accessibility"
        description="Customize Mpade Universe for easier viewing and interaction."
      >
        <SelectRow
          icon={<Accessibility />}
          title="Font Size"
          value="Default"
        />

        <PanelToggle
          icon={<Eye />}
          title="High Contrast"
          description="Increase contrast between interface elements."
          active={false}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<MousePointer2 />}
          title="Large Touch Targets"
          description="Make buttons and interactive controls easier to tap."
          active={false}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Video />}
          title="Captions"
          description="Prefer captions when available."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Volume2 />}
          title="Audio Descriptions"
          description="Use audio descriptions when available."
          active={false}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Palette />}
          title="Color-Blind Friendly"
          description="Use visual indicators that don't depend only on color."
          active={false}
          onToggle={() => {}}
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAYMENTS / WALLET
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "wallet" ||
    item.id === "payment-methods" ||
    item.id === "payouts" ||
    item.id === "transactions"
  ) {
    return (
      <PanelShell
        title={
          item.id === "wallet"
            ? "Wallet"
            : item.id === "payment-methods"
              ? "Payment Methods"
              : item.id === "payouts"
                ? "Payouts"
                : "Transactions"
        }
        description={item.description}
      >
        {item.id === "wallet" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <MoneyCard
                label="Available"
                value={profile?.balance ?? 0}
                currency={profile?.currency_preference || "MWK"}
              />

              <MoneyCard
                label="Coins"
                value={profile?.coins ?? 0}
                currency=""
              />

              <MoneyCard
                label="Lifetime Earned"
                value={profile?.total_tokens_earned ?? 0}
                currency=""
              />

              <MoneyCard
                label="Subscription"
                value={profile?.subscription_tier || "Free"}
                currency=""
              />
            </div>

            <ActionButton
              icon={<Wallet size={16} />}
              label="Open Payouts"
              onClick={() => onNavigate("/payouts")}
            />
          </>
        )}

        {item.id === "payment-methods" && (
          <>
            <PanelLink
              icon={<Smartphone />}
              title="TNM Mpamba"
              description="Mobile-money payout method."
            />

            <PanelLink
              icon={<Smartphone />}
              title="Airtel Money"
              description="Mobile-money payout method."
            />

            <PanelLink
              icon={<Banknote />}
              title="Bank Account"
              description="Bank payout method."
            />

            <Notice
              icon={<ShieldCheck />}
              title="Payment verification"
              description="Payment methods should be verified before they can receive payouts."
            />
          </>
        )}

        {item.id === "payouts" && (
          <>
            <PanelLink
              icon={<Banknote />}
              title="Request Payout"
              description="Request an eligible payout from your available balance."
              onClick={() => onNavigate("/payouts")}
            />

            <PanelLink
              icon={<Clock3 />}
              title="Pending Payouts"
              description="View payouts currently being processed."
            />

            <PanelLink
              icon={<CheckCircle2 />}
              title="Completed Payouts"
              description="View successfully completed payouts."
            />

            <PanelLink
              icon={<AlertTriangle />}
              title="Failed / Cancelled"
              description="Review failed or cancelled payout requests."
            />

            <PanelLink
              icon={<History />}
              title="Payout History"
              description="Review your complete payout history."
            />
          </>
        )}

        {item.id === "transactions" && (
          <>
            <PanelLink
              icon={<CreditCard />}
              title="Purchases"
              description="Coins, subscriptions and platform purchases."
            />

            <PanelLink
              icon={<Gift />}
              title="Gifts"
              description="Gift purchases and received gifts."
            />

            <PanelLink
              icon={<Coins />}
              title="Earnings"
              description="Creator earnings and rewards."
            />

            <PanelLink
              icon={<RefreshCw />}
              title="Refunds"
              description="Refund and reversal history."
            />

            <PanelLink
              icon={<History />}
              title="Transaction History"
              description="Complete transaction history."
            />
          </>
        )}
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CREATOR
  |--------------------------------------------------------------------------
  */

  if (
    item.id.startsWith("creator-") ||
    item.id === "creator-studio" ||
    item.id === "creator-analytics"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <PanelLink
          icon={<BarChart3 />}
          title="Professional Dashboard"
          description="Creator overview, audience and content performance."
          onClick={() => onNavigate("/universe-tools")}
        />

        <PanelLink
          icon={<Activity />}
          title="Audience Analytics"
          description="Follower growth, demographics and audience activity."
        />

        <PanelLink
          icon={<Video />}
          title="Content Performance"
          description="Views, likes, comments, shares and retention."
        />

        <PanelLink
          icon={<Coins />}
          title="Creator Earnings"
          description="Earnings, gifts, subscriptions and creator fund."
        />

        <PanelLink
          icon={<CalendarClock />}
          title="Content Scheduling"
          description="Schedule videos and live broadcasts."
          onClick={() => onNavigate("/settings/creator/scheduling")}
        />

        <PanelLink
          icon={<Bot />}
          title="Creator AI"
          description="AI-powered creator assistance."
          onClick={() => onNavigate("/settings/ai")}
        />

        <PanelLink
          icon={<Trophy />}
          title="Creator Progress"
          description="XP, level, achievements and milestones."
        />

        <Notice
          icon={<Sparkles />}
          title="Creator ecosystem"
          description="These controls are ready for integration with your Creator Studio, monetization, livestream and scheduling modules."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | AI
  |--------------------------------------------------------------------------
  */

  if (
    item.id.startsWith("ai-") ||
    item.id === "ai-settings"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <PanelToggle
          icon={<Bot />}
          title="AI Assistant"
          description="Enable the Mpade Universe AI assistant."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Sparkles />}
          title="AI Recommendations"
          description="Use AI to personalize recommendations."
          active={true}
          onToggle={() => {}}
        />

        <PanelLink
          icon={<FileText />}
          title="Caption Generator"
          description="Generate captions for your content."
        />

        <PanelLink
          icon={<HashIcon />}
          title="Hashtag Suggestions"
          description="Generate relevant hashtags."
        />

        <PanelLink
          icon={<Image />}
          title="Thumbnail Assistant"
          description="Analyze and improve thumbnail choices."
        />

        <PanelLink
          icon={<MessageCircle />}
          title="Comment Replies"
          description="Generate suggested replies to comments."
        />

        <PanelLink
          icon={<History />}
          title="AI History"
          description="Review or clear AI interaction history."
        />

        <Notice
          icon={<ShieldCheck />}
          title="AI disclosure"
          description="AI-generated or AI-assisted content should be clearly disclosed where required by your platform policies."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | COPYRIGHT / SAFETY
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "copyright" ||
    item.id === "safety" ||
    item.id === "guidelines"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <PanelLink
          icon={<Copyright />}
          title="Copyright Status"
          description="Review claims and copyright status."
          onClick={() => onNavigate("/settings/copyright")}
        />

        <PanelLink
          icon={<AlertTriangle />}
          title="Content Warnings"
          description="Review warnings applied to your content."
        />

        <PanelLink
          icon={<Ban />}
          title="Content Violations"
          description="Review removed or restricted content."
        />

        <PanelLink
          icon={<FileText />}
          title="Disputes & Appeals"
          description="Manage disputes and appeals."
        />

        <PanelLink
          icon={<Music />}
          title="Music Rights"
          description="Review music and audio rights."
        />

        <PanelLink
          icon={<ShieldCheck />}
          title="Community Guidelines"
          description="Review platform safety rules."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CONTENT
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "content" ||
    item.id === "comments" ||
    item.id === "messages" ||
    item.id === "followers"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <PanelToggle
          icon={<Eye />}
          title="Default Public Content"
          description="Use public visibility as your default content setting."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<MessageCircle />}
          title="Allow Comments"
          description="Allow viewers to comment on new content."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Download />}
          title="Allow Downloads"
          description="Allow viewers to download supported content."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<Share2 />}
          title="Allow Sharing"
          description="Allow people to share your content."
          active={true}
          onToggle={() => {}}
        />

        <PanelToggle
          icon={<RepeatIcon />}
          title="Allow Reposts"
          description="Allow your content to be reposted."
          active={true}
          onToggle={() => {}}
        />

        <PanelLink
          icon={<MessageSquareWarning />}
          title="Comment Moderation"
          description="Offensive words, spam and manual moderation."
        />

        <PanelLink
          icon={<Users />}
          title="Audience Controls"
          description="Follower and audience permissions."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | REPORTS
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "personal-data" ||
    item.id === "analytics-export" ||
    item.id === "earnings-reports" ||
    item.id === "creator-reports"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <ExportCard
            icon={<FileSpreadsheet />}
            title="CSV"
          />

          <ExportCard
            icon={<FileJson />}
            title="JSON"
          />

          <ExportCard
            icon={<FileType2 />}
            title="PDF"
          />
        </div>

        <PanelLink
          icon={<CloudDownload />}
          title="Personal Data Archive"
          description="Request a downloadable copy of your account information."
        />

        <PanelLink
          icon={<BarChart3 />}
          title="Analytics Export"
          description="Export creator analytics."
        />

        <PanelLink
          icon={<Coins />}
          title="Financial Report"
          description="Export earnings and transaction information."
        />

        <Notice
          icon={<Info />}
          title="Data export"
          description="Large exports should be generated server-side and delivered through a secure download link rather than generated entirely in the browser."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CONNECTED APPS
  |--------------------------------------------------------------------------
  */

  if (item.id === "connected-apps") {
    return (
      <PanelShell
        title="Connected Apps"
        description="Review third-party applications and authorized access."
      >
        <PanelLink
          icon={<Link2 />}
          title="OAuth Applications"
          description="Applications connected through OAuth."
        />

        <PanelLink
          icon={<Smartphone />}
          title="Authorized Devices"
          description="Devices authorized to access your account."
        />

        <PanelLink
          icon={<KeyRound />}
          title="API Access"
          description="Manage API keys and integrations."
        />

        <PanelLink
          icon={<Shield />}
          title="Permissions"
          description="Review what connected applications can access."
        />

        <Notice
          icon={<ShieldCheck />}
          title="Security"
          description="Only grant third-party applications the minimum permissions they require."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CACHE
  |--------------------------------------------------------------------------
  */

  if (item.id === "cache") {
    return (
      <PanelShell
        title="Cache & Temporary Data"
        description="Manage locally stored application data."
      >
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[9px] font-black uppercase tracking-[2px] text-zinc-600">
            Local storage
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {formatBytes(cacheSize)}
          </p>

          <p className="mt-1 text-[10px] text-zinc-600">
            This represents browser-side storage available to this settings
            module. Supabase storage usage is separate.
          </p>

          <button
            onClick={onClearCache}
            disabled={clearingCache}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {clearingCache ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Clear Temporary Data
              </>
            )}
          </button>
        </div>
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SYSTEM
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "diagnostics" ||
    item.id === "server" ||
    item.id === "sync" ||
    item.id === "about-system"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <StatusRow
          icon={<Activity />}
          title="Application"
          value="Operational"
          positive
        />

        <StatusRow
          icon={<Wifi />}
          title="Network"
          value={navigator.onLine ? "Online" : "Offline"}
          positive={navigator.onLine}
        />

        <StatusRow
          icon={<Server />}
          title="Supabase"
          value="Connected through application"
          positive
        />

        <StatusRow
          icon={<HardDrive />}
          title="Local Storage"
          value={formatBytes(cacheSize)}
          positive
        />

        <StatusRow
          icon={<RefreshCw />}
          title="Application Version"
          value={APP_VERSION}
          positive
        />

        <Notice
          icon={<Info />}
          title="Diagnostics"
          description="Server-side health information should be populated from your actual monitoring/health endpoint instead of being hardcoded."
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUPPORT
  |--------------------------------------------------------------------------
  */

  if (
    item.id === "help" ||
    item.id === "report" ||
    item.id === "tickets" ||
    item.id === "account-recovery" ||
    item.id === "safety-center" ||
    item.id === "about"
  ) {
    return (
      <PanelShell
        title={item.title}
        description={item.description}
      >
        <PanelLink
          icon={<LifeBuoy />}
          title="Help Center"
          description="Find guides and answers."
          onClick={() => onNavigate("/support")}
        />

        <PanelLink
          icon={<Flag />}
          title="Report a Problem"
          description="Report a technical or account issue."
        />

        <PanelLink
          icon={<MessageCircle />}
          title="Support Tickets"
          description="Review previous requests."
        />

        <PanelLink
          icon={<KeyRound />}
          title="Account Recovery"
          description="Recover access to your account."
        />

        <PanelLink
          icon={<ShieldCheck />}
          title="Safety Center"
          description="Account and community safety information."
        />

        <PanelLink
          icon={<FileText />}
          title="Privacy Policy"
          description="Read the privacy policy."
          onClick={() => onNavigate("/privacy")}
        />

        <PanelLink
          icon={<Smartphone />}
          title={`About ${APP_NAME}`}
          description={`Version ${APP_VERSION}`}
          onClick={() => onNavigate("/about")}
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT MANAGEMENT
  |--------------------------------------------------------------------------
  */

  if (item.id === "account-management") {
    return (
      <PanelShell
        title="Account Management"
        description="Manage your account lifecycle. These actions require careful confirmation."
      >
        <PanelLink
          icon={<Download />}
          title="Download Account Information"
          description="Create an archive before making major account changes."
        />

        <PanelLink
          icon={<Archive />}
          title="Transfer Data"
          description="Prepare supported data for transfer."
        />

        <PanelLink
          icon={<UserX />}
          title="Deactivate Account"
          description="Temporarily disable your account."
          danger
        />

        <PanelLink
          icon={<Trash2 />}
          title="Delete Account"
          description="Permanently delete your account and associated data."
          danger
        />

        <Notice
          icon={<AlertTriangle />}
          title="Permanent action"
          description="Account deletion should be connected to a secure server-side deletion workflow with confirmation and recovery safeguards."
          danger
        />
      </PanelShell>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DEFAULT
  |--------------------------------------------------------------------------
  */

  return (
    <PanelShell
      title={item.title}
      description={item.description}
    >
      <Notice
        icon={<Settings2 />}
        title="Module ready"
        description="This settings module has been added to the new Settings Hub. Connect its controls to the corresponding backend feature when that module is implemented."
      />

      <PanelLink
        icon={<Settings2 />}
        title="Open Full Settings Module"
        description="Continue to the dedicated settings page when available."
      />
    </PanelShell>
  );
};

/*
|--------------------------------------------------------------------------
| PANEL SHELL
|--------------------------------------------------------------------------
*/

const PanelShell = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xl font-black tracking-tight text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        {description}
      </p>
    </div>

    <div className="space-y-2">{children}</div>
  </div>
);

/*
|--------------------------------------------------------------------------
| PANEL LINK
|--------------------------------------------------------------------------
*/

const PanelLink = ({
  icon,
  title,
  description,
  onClick,
  danger = false
}) => {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
        danger
          ? "border-red-500/10 bg-red-500/[0.025] hover:border-red-500/25 hover:bg-red-500/[0.05]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.11] hover:bg-white/[0.035]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          danger
            ? "border-red-500/10 bg-red-500/[0.06] text-red-400"
            : "border-white/[0.05] bg-black text-zinc-400 group-hover:text-cyan-300"
        }`}
      >
        {React.cloneElement(icon, { size: 17 })}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[12px] font-black ${
            danger ? "text-red-300" : "text-zinc-200"
          }`}
        >
          {title}
        </span>

        <span className="mt-1 block text-[10px] leading-relaxed text-zinc-600">
          {description}
        </span>
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-zinc-700 group-hover:text-zinc-400"
      />
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| PANEL TOGGLE
|--------------------------------------------------------------------------
*/

const PanelToggle = ({
  icon,
  title,
  description,
  active,
  onToggle
}) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-black text-zinc-400">
        {React.cloneElement(icon, { size: 17 })}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-zinc-200">{title}</p>

        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          {description}
        </p>
      </div>

      <button
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          active ? "bg-cyan-400" : "bg-zinc-800"
        }`}
        aria-label={title}
      >
        <motion.span
          animate={{
            x: active ? 22 : 4
          }}
          className="absolute left-0 top-1 h-4 w-4 rounded-full bg-white shadow-lg"
        />
      </button>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| CHOICE CARD
|--------------------------------------------------------------------------
*/

const ChoiceCard = ({ title, description, icon, active = false }) => (
  <button
    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
      active
        ? "border-cyan-400/25 bg-cyan-400/[0.06]"
        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
    }`}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-cyan-300">
      {icon}
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-[12px] font-black text-zinc-200">
        {title}
      </span>

      <span className="mt-1 block text-[10px] text-zinc-600">
        {description}
      </span>
    </span>

    {active && (
      <CheckCircle2 size={18} className="text-cyan-300" />
    )}
  </button>
);

/*
|--------------------------------------------------------------------------
| SELECT ROW
|--------------------------------------------------------------------------
*/

const SelectRow = ({ icon, title, value }) => (
  <button className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-zinc-400">
      {React.cloneElement(icon, { size: 17 })}
    </span>

    <span className="min-w-0 flex-1">
      <span className="block text-[12px] font-black text-zinc-200">
        {title}
      </span>

      <span className="mt-1 block text-[10px] text-zinc-600">
        {value}
      </span>
    </span>

    <ChevronDown size={15} className="text-zinc-700" />
  </button>
);

/*
|--------------------------------------------------------------------------
| THEME BUTTON
|--------------------------------------------------------------------------
*/

const ThemeButton = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition ${
      active
        ? "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"
        : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-200"
    }`}
  >
    {React.cloneElement(icon, { size: 18 })}
    <span className="text-[9px] font-black uppercase tracking-wider">
      {label}
    </span>
  </button>
);

/*
|--------------------------------------------------------------------------
| MONEY CARD
|--------------------------------------------------------------------------
*/

const MoneyCard = ({ label, value, currency }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
    <p className="text-[8px] font-black uppercase tracking-[1.5px] text-zinc-600">
      {label}
    </p>

    <p className="mt-2 break-words text-lg font-black text-white">
      {typeof value === "number"
        ? value.toLocaleString()
        : String(value || "0")}
    </p>

    {currency && (
      <p className="mt-0.5 text-[9px] font-bold text-cyan-400">
        {currency}
      </p>
    )}
  </div>
);

/*
|--------------------------------------------------------------------------
| EXPORT CARD
|--------------------------------------------------------------------------
*/

const ExportCard = ({ icon, title }) => (
  <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-zinc-500 transition hover:border-cyan-400/20 hover:text-cyan-300">
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[9px] font-black uppercase tracking-wider">
      {title}
    </span>
  </button>
);

/*
|--------------------------------------------------------------------------
| STATUS ROW
|--------------------------------------------------------------------------
*/

const StatusRow = ({ icon, title, value, positive }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-zinc-400">
      {React.cloneElement(icon, { size: 17 })}
    </span>

    <div className="min-w-0 flex-1">
      <p className="text-[12px] font-black text-zinc-200">{title}</p>
      <p className="mt-1 truncate text-[10px] text-zinc-600">{value}</p>
    </div>

    <span
      className={`h-2 w-2 rounded-full ${
        positive ? "bg-emerald-400" : "bg-red-400"
      }`}
    />
  </div>
);

/*
|--------------------------------------------------------------------------
| INFO GRID
|--------------------------------------------------------------------------
*/

const InfoGrid = ({ children }) => (
  <div className="grid grid-cols-2 gap-2">{children}</div>
);

const InfoField = ({ label, value }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
    <p className="text-[8px] font-black uppercase tracking-[1.2px] text-zinc-700">
      {label}
    </p>

    <p className="mt-1 break-words text-[11px] font-bold text-zinc-300">
      {value}
    </p>
  </div>
);

/*
|--------------------------------------------------------------------------
| ACTION BUTTON
|--------------------------------------------------------------------------
*/

const ActionButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-cyan-300"
  >
    {icon}
    {label}
  </button>
);

/*
|--------------------------------------------------------------------------
| NOTICE
|--------------------------------------------------------------------------
*/

const Notice = ({ icon, title, description, danger = false }) => (
  <div
    className={`rounded-2xl border p-4 ${
      danger
        ? "border-red-500/15 bg-red-500/[0.04]"
        : "border-cyan-400/10 bg-cyan-400/[0.025]"
    }`}
  >
    <div className="flex gap-3">
      <span
        className={`mt-0.5 ${
          danger ? "text-red-400" : "text-cyan-300"
        }`}
      >
        {icon}
      </span>

      <div>
        <p
          className={`text-[11px] font-black ${
            danger ? "text-red-300" : "text-cyan-300"
          }`}
        >
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          {description}
        </p>
      </div>
    </div>
  </div>
);

/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

const EmptyState = ({ icon, title, description }) => (
  <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-10 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-zinc-600">
      {icon}
    </div>

    <h3 className="mt-4 text-sm font-black text-zinc-300">{title}</h3>

    <p className="mx-auto mt-2 max-w-md text-[10px] leading-relaxed text-zinc-600">
      {description}
    </p>
  </div>
);

/*
|--------------------------------------------------------------------------
| DANGER ZONE
|--------------------------------------------------------------------------
*/

const DangerZone = ({ onLogout, onDeactivate }) => (
  <section className="rounded-[24px] border border-red-500/10 bg-red-500/[0.025] p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/[0.06]">
        <AlertTriangle size={17} className="text-red-400" />
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-[1.5px] text-red-300">
          Account Exit
        </h2>

        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          Sign out, deactivate or permanently delete your Mpade Universe
          account.
        </p>
      </div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button
        onClick={onLogout}
        className="flex items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.06] py-3 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/[0.1]"
      >
        <LogOut size={15} />
        Log Out
      </button>

      <button
        onClick={onDeactivate}
        className="flex items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.03] py-3 text-[10px] font-black uppercase tracking-widest text-red-400 transition hover:bg-red-500/[0.08]"
      >
        <UserX size={15} />
        Account Management
      </button>
    </div>
  </section>
);

/*
|--------------------------------------------------------------------------
| SYSTEM FOOTER
|--------------------------------------------------------------------------
*/

const SystemFooter = ({
  version,
  cacheSize,
  clearingCache,
  onClearCache
}) => (
  <section className="pb-6">
    <div className="rounded-[24px] border border-white/[0.05] bg-white/[0.015] p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SystemFooterItem
          icon={<Smartphone />}
          label="Application"
          value={APP_NAME}
        />

        <SystemFooterItem
          icon={<RefreshCw />}
          label="Version"
          value={version}
        />

        <SystemFooterItem
          icon={<HardDrive />}
          label="Local Cache"
          value={formatBytes(cacheSize)}
        />
      </div>

      <button
        onClick={onClearCache}
        disabled={clearingCache}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-black/30 py-3 text-[9px] font-black uppercase tracking-[1.5px] text-zinc-500 transition hover:text-white disabled:opacity-50"
      >
        {clearingCache ? (
          <>
            <RefreshCw size={13} className="animate-spin" />
            Clearing temporary data
          </>
        ) : (
          <>
            <Trash2 size={13} />
            Free up space
          </>
        )}
      </button>

      <p className="mt-5 text-center text-[8px] font-black uppercase tracking-[2px] text-zinc-800">
        {APP_NAME} • {version} • Settings & Privacy
      </p>
    </div>
  </section>
);

/*
|--------------------------------------------------------------------------
| SYSTEM FOOTER ITEM
|--------------------------------------------------------------------------
*/

const SystemFooterItem = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-black/20 p-3">
    <span className="text-zinc-700">
      {React.cloneElement(icon, { size: 15 })}
    </span>

    <div className="min-w-0">
      <p className="text-[7px] font-black uppercase tracking-[1.5px] text-zinc-700">
        {label}
      </p>

      <p className="mt-1 truncate text-[9px] font-bold text-zinc-500">
        {value}
      </p>
    </div>
  </div>
);

/*
|--------------------------------------------------------------------------
| ICON FALLBACKS
|--------------------------------------------------------------------------
|
| These are deliberately tiny local components so the settings page does
| not depend on icon names that may not exist in the installed lucide
| version.
|--------------------------------------------------------------------------
*/

const AtSignFallback = ({ size = 17 }) => (
  <span
    style={{
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: size * 0.8
    }}
  >
    @
  </span>
);

const HashIcon = ({ size = 17 }) => (
  <span
    style={{
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: size * 0.8
    }}
  >
    #
  </span>
);

const RepeatIcon = ({ size = 17 }) => (
  <span
    style={{
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: size * 0.75
    }}
  >
    ↻
  </span>
);

export default SettingsPage;
