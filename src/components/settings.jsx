// src/pages/SettingsPage.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  motion,
  AnimatePresence
} from "framer-motion";

import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  User,
  ShieldCheck,
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
  Download,
  Upload,
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  Gift,
  BarChart3,
  Radio,
  Video,
  CalendarClock,
  FolderOpen,
  Trophy,
  Sparkles,
  BriefcaseBusiness,
  FileText,
  ShieldAlert,
  MessageCircle,
  Users,
  UserPlus,
  Heart,
  MessageSquare,
  SlidersHorizontal,
  Accessibility,
  LifeBuoy,
  CircleHelp,
  Flag,
  Settings2,
  Server,
  RefreshCw,
  Wifi,
  Trash2,
  LogOut,
  AlertTriangle,
  Info,
  ExternalLink,
  Copy,
  CheckCircle2,
  CircleAlert,
  Activity,
  Fingerprint,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BadgeCheck,
  UserCog,
  UserRoundX,
  FileDown,
  History,
  Link2,
  Ban,
  Volume2,
  VolumeX,
  Image,
  Music,
  FileArchive,
  Tag,
  Target,
  Medal,
  Megaphone,
  Newspaper,
  FileBarChart,
  Shield,
  DatabaseBackup,
  MonitorSmartphone
} from "lucide-react";

import { supabase } from "../supabaseClient";

/* ============================================================
   CONSTANTS
============================================================ */

const APP_VERSION = "2.4.0-Beta";

const STORAGE_KEYS = {
  dataSaver: "mpade_settings_data_saver",
  theme: "mpade_settings_theme",
  accent: "mpade_settings_accent",
  language: "mpade_settings_language",
  density: "mpade_settings_density",
  reduceMotion: "mpade_settings_reduce_motion",
  autoplay: "mpade_settings_autoplay",
  highContrast: "mpade_settings_high_contrast"
};

/* ============================================================
   HELPERS
============================================================ */

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable.
  }
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();
};

const formatCurrency = (value, currency = "MWK") => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${currency} 0`;
  }

  return `${currency} ${number.toLocaleString()}`;
};

const getInitials = (name = "Mpade Universe") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
};

/* ============================================================
   SETTING CONFIGURATION
============================================================ */

const SETTINGS_GROUPS = [
  {
    id: "account",
    title: "Account",
    description: "Manage your identity, account type and account lifecycle.",
    icon: User,
    color: "cyan",
    items: [
      {
        id: "account-information",
        title: "Account Information",
        description: "Username, profile, email, phone, location and account ID.",
        icon: User,
        route: "/edit-profile",
        badge: "Profile"
      },
      {
        id: "account-type",
        title: "Account Type",
        description: "Personal, creator, professional or business account.",
        icon: UserCog,
        badge: "Account"
      },
      {
        id: "account-management",
        title: "Account Management",
        description: "Recovery, deactivation, deletion and account data.",
        icon: Settings2,
        badge: "Manage"
      }
    ]
  },

  {
    id: "security",
    title: "Security & Privacy",
    description: "Protect your account and control your privacy.",
    icon: ShieldCheck,
    color: "purple",
    items: [
      {
        id: "security",
        title: "Security",
        description: "Password, 2FA, passkeys, sessions and login protection.",
        icon: Lock,
        route: "/settings/security",
        badge: "Secure"
      },
      {
        id: "privacy",
        title: "Privacy",
        description: "Control who can see, follow, message and interact with you.",
        icon: Eye,
        route: "/settings/privacy"
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
        description: "OAuth apps, authorized devices and third-party permissions.",
        icon: Link2,
        route: "/settings/apps"
      }
    ]
  },

  {
    id: "social",
    title: "Content & Social",
    description: "Control notifications, comments, messages and audience interactions.",
    icon: MessageCircle,
    color: "pink",
    items: [
      {
        id: "notifications",
        title: "Notifications",
        description: "Push, email, SMS, sounds, quiet hours and notification categories.",
        icon: Bell,
        route: "/settings/notifications"
      },
      {
        id: "content",
        title: "Content Preferences",
        description: "Video privacy, downloads, comments, reposts and content warnings.",
        icon: Video,
        route: "/settings/content"
      },
      {
        id: "comments",
        title: "Comments",
        description: "Moderation, offensive comments, spam and hidden words.",
        icon: MessageSquare,
        route: "/settings/comments"
      },
      {
        id: "messages",
        title: "Messages",
        description: "Message requests, groups, read receipts and typing indicators.",
        icon: MessageCircle,
        route: "/settings/messages"
      },
      {
        id: "followers",
        title: "Followers & Audience",
        description: "Follow requests, follower management and discoverability.",
        icon: Users,
        route: "/settings/followers"
      }
    ]
  },

  {
    id: "experience",
    title: "Experience",
    description: "Customize data usage, language, appearance and accessibility.",
    icon: SlidersHorizontal,
    color: "orange",
    items: [
      {
        id: "data",
        title: "Data & Storage",
        description: "Data saver, autoplay, uploads, downloads, cache and storage.",
        icon: Database,
        route: "/settings/data"
      },
      {
        id: "language",
        title: "Language & Region",
        description: "Language, translation, timezone, country and currency.",
        icon: Languages,
        route: "/settings/language"
      },
      {
        id: "appearance",
        title: "Appearance",
        description: "Theme, neon mode, accent, density, animation and contrast.",
        icon: Palette,
        route: "/settings/appearance"
      },
      {
        id: "accessibility",
        title: "Accessibility",
        description: "Font size, captions, motion, contrast and assistive features.",
        icon: Accessibility,
        route: "/settings/accessibility"
      }
    ]
  },

  {
    id: "creator",
    title: "Creator",
    description: "Creator tools, analytics, monetization, livestreaming and growth.",
    icon: Sparkles,
    color: "cyan",
    items: [
      {
        id: "creator-dashboard",
        title: "Creator Studio",
        description: "Professional dashboard, creator mode and creator profile.",
        icon: BarChart3,
        route: "/universe-tools"
      },
      {
        id: "creator-analytics",
        title: "Analytics",
        description: "Audience, content performance, growth and earnings.",
        icon: BarChart3,
        route: "/universe-tools"
      },
      {
        id: "creator-monetization",
        title: "Monetization",
        description: "Creator fund, earnings, gifts and monetization programs.",
        icon: Coins,
        route: "/settings/creator/monetization"
      },
      {
        id: "creator-gifts",
        title: "Gifts",
        description: "Virtual gifts, tokens and creator gift earnings.",
        icon: Gift,
        route: "/settings/creator/gifts"
      },
      {
        id: "creator-subscriptions",
        title: "Subscriptions",
        description: "Subscribers, subscription payments and benefits.",
        icon: Users,
        route: "/settings/creator/subscriptions"
      },
      {
        id: "creator-livestream",
        title: "Livestream",
        description: "Live settings, gifts, moderation and live permissions.",
        icon: Radio,
        route: "/settings/creator/livestream"
      },
      {
        id: "creator-scheduling",
        title: "Scheduling",
        description: "Schedule videos and livestreams for automatic publishing.",
        icon: CalendarClock,
        route: "/settings/creator/scheduling"
      },
      {
        id: "creator-library",
        title: "Content Library",
        description: "Videos, drafts, images, audio, recordings and archives.",
        icon: FolderOpen,
        route: "/settings/creator/library"
      },
      {
        id: "creator-progress",
        title: "Progress & Achievements",
        description: "Level, XP, streaks, milestones, badges and rewards.",
        icon: Trophy,
        route: "/settings/creator/progress"
      },
      {
        id: "creator-ai",
        title: "Creator AI",
        description: "Captions, hashtags, scripts, thumbnails and AI tools.",
        icon: Sparkles,
        route: "/settings/ai"
      },
      {
        id: "creator-brand",
        title: "Brand & Collaborations",
        description: "Campaigns, media kit, portfolio, rates and partnerships.",
        icon: BriefcaseBusiness,
        route: "/settings/creator/brand"
      }
    ]
  },

  {
    id: "payments",
    title: "Payments & Monetization",
    description: "Wallet, payment methods, payouts and financial history.",
    icon: Wallet,
    color: "emerald",
    items: [
      {
        id: "wallet",
        title: "Wallet",
        description: "Balance, coins, tokens, pending and lifetime earnings.",
        icon: Wallet,
        route: "/payouts"
      },
      {
        id: "payment-methods",
        title: "Payment Methods",
        description: "TNM Mpamba, Airtel Money, bank and verification.",
        icon: CreditCard
      },
      {
        id: "payouts",
        title: "Payouts",
        description: "Request payouts, limits, status and payout schedule.",
        icon: Banknote,
        route: "/payouts"
      },
      {
        id: "transactions",
        title: "Transactions",
        description: "Purchases, gifts, subscriptions, earnings and refunds.",
        icon: History,
        route: "/settings/transactions"
      }
    ]
  },

  {
    id: "safety",
    title: "Safety & Legal",
    description: "Copyright, content safety, policies and platform rules.",
    icon: ShieldAlert,
    color: "red",
    items: [
      {
        id: "copyright",
        title: "Copyright",
        description: "Claims, strikes, disputes, appeals and music rights.",
        icon: ShieldCheck,
        route: "/settings/copyright"
      },
      {
        id: "content-safety",
        title: "Content Safety",
        description: "Warnings, violations, restrictions and removed content.",
        icon: ShieldAlert
      },
      {
        id: "community-guidelines",
        title: "Community Guidelines",
        description: "Rules for safe and responsible participation.",
        icon: FileText
      },
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        description: "Learn how Mpade Universe handles your information.",
        icon: Eye,
        route: "/privacy"
      },
      {
        id: "terms",
        title: "Terms of Service",
        description: "Platform terms and conditions.",
        icon: FileText
      }
    ]
  },

  {
    id: "data-reports",
    title: "Data & Reports",
    description: "Download your personal data and creator reports.",
    icon: FileBarChart,
    color: "blue",
    items: [
      {
        id: "personal-data",
        title: "Download My Data",
        description: "Request a copy of your account information.",
        icon: Download,
        route: "/settings/reports"
      },
      {
        id: "analytics-export",
        title: "Export Analytics",
        description: "Export creator analytics and performance data.",
        icon: BarChart3,
        route: "/settings/reports"
      },
      {
        id: "earnings-reports",
        title: "Earnings Reports",
        description: "Creator earnings and financial reports.",
        icon: Banknote,
        route: "/settings/reports"
      },
      {
        id: "creator-reports",
        title: "Creator Reports",
        description: "Monthly creator, audience and content reports.",
        icon: Newspaper,
        route: "/settings/reports"
      }
    ]
  },

  {
    id: "support",
    title: "Support",
    description: "Get help, report problems and manage support requests.",
    icon: LifeBuoy,
    color: "zinc",
    items: [
      {
        id: "help",
        title: "Help Center",
        description: "Guides and answers to common questions.",
        icon: CircleHelp,
        route: "/support"
      },
      {
        id: "report-problem",
        title: "Report a Problem",
        description: "Report technical issues or inappropriate content.",
        icon: Flag
      },
      {
        id: "copyright-support",
        title: "Copyright Support",
        description: "Get help with copyright claims and disputes.",
        icon: ShieldCheck
      },
      {
        id: "payments-support",
        title: "Payments Support",
        description: "Get help with payments and payouts.",
        icon: Banknote
      },
      {
        id: "creator-support",
        title: "Creator Support",
        description: "Support for creators and monetization.",
        icon: Sparkles
      },
      {
        id: "account-recovery",
        title: "Account Recovery",
        description: "Recover access to your account.",
        icon: KeyRound
      },
      {
        id: "support-tickets",
        title: "Support Tickets",
        description: "View your submitted support requests.",
        icon: FileText
      },
      {
        id: "about",
        title: "About Mpade Universe",
        description: "Application information and platform details.",
        icon: Info,
        route: "/about"
      }
    ]
  },

  {
    id: "system",
    title: "System",
    description: "Application status, synchronization, diagnostics and storage.",
    icon: Server,
    color: "zinc",
    items: [
      {
        id: "system-status",
        title: "System Status",
        description: "Server, database, storage and media-processing status.",
        icon: Server
      },
      {
        id: "diagnostics",
        title: "Diagnostics",
        description: "Network, synchronization and application diagnostics.",
        icon: Activity
      },
      {
        id: "cache",
        title: "Storage & Cache",
        description: "View and clear locally cached application data.",
        icon: HardDrive
      },
      {
        id: "app-preferences",
        title: "App Preferences",
        description: "Background sync, auto refresh and offline behavior.",
        icon: Settings2
      }
    ]
  },

  {
    id: "exit",
    title: "Account Exit",
    description: "Sign out, deactivate or permanently delete your account.",
    icon: UserRoundX,
    color: "red",
    danger: true,
    items: [
      {
        id: "logout",
        title: "Log Out",
        description: "Sign out from this device.",
        icon: LogOut,
        danger: true
      },
      {
        id: "logout-all",
        title: "Log Out All Devices",
        description: "End all active sessions.",
        icon: MonitorSmartphone,
        danger: true
      },
      {
        id: "deactivate",
        title: "Deactivate Account",
        description: "Temporarily disable your account.",
        icon: UserRoundX,
        danger: true
      },
      {
        id: "delete",
        title: "Delete Account",
        description: "Permanently delete your account and data.",
        icon: Trash2,
        danger: true
      }
    ]
  }
];

/* ============================================================
   SETTINGS PAGE
============================================================ */

const SettingsPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [toast, setToast] = useState(null);

  const [dataSaver, setDataSaver] = useState(
    () => readStorage(STORAGE_KEYS.dataSaver, false)
  );

  const [theme, setTheme] = useState(
    () => readStorage(STORAGE_KEYS.theme, "dark")
  );

  const [accent, setAccent] = useState(
    () => readStorage(STORAGE_KEYS.accent, "cyan")
  );

  const [language, setLanguage] = useState(
    () => readStorage(STORAGE_KEYS.language, "English")
  );

  const [density, setDensity] = useState(
    () => readStorage(STORAGE_KEYS.density, "comfortable")
  );

  const [reduceMotion, setReduceMotion] = useState(
    () => readStorage(STORAGE_KEYS.reduceMotion, false)
  );

  const [autoplay, setAutoplay] = useState(
    () => readStorage(STORAGE_KEYS.autoplay, true)
  );

  const [highContrast, setHighContrast] = useState(
    () => readStorage(STORAGE_KEYS.highContrast, false)
  );

  /* ============================================================
     TOAST
  ============================================================ */

  const showToast = useCallback((message, type = "success") => {
    setToast({
      id: Date.now(),
      message,
      type
    });

    window.setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  /* ============================================================
     LOAD USER + PROFILE
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      setLoading(true);

      try {
        const {
          data: { user: currentUser }
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser || null);

        if (!currentUser) {
          setProfile(null);
          return;
        }

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
            email,
            phone,
            balance,
            coins,
            total_tokens_earned,
            currency_preference,
            verified_status,
            is_verified,
            account_status,
            subscription_tier,
            follower_count,
            following_count,
            total_likes,
            created_at
          `)
          .eq("id", currentUser.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.warn("Unable to load profile:", error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error("Settings account loading error:", error);

        if (mounted) {
          showToast(
            "Unable to load account information",
            "error"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  /* ============================================================
     PERSIST LOCAL SETTINGS
  ============================================================ */

  useEffect(() => {
    writeStorage(STORAGE_KEYS.dataSaver, dataSaver);
  }, [dataSaver]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.accent, accent);
  }, [accent]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.density, density);
  }, [density]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.reduceMotion, reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.autoplay, autoplay);
  }, [autoplay]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.highContrast, highContrast);
  }, [highContrast]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    const results = [];

    SETTINGS_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        const haystack = [
          group.title,
          group.description,
          item.title,
          item.description
        ]
          .join(" ")
          .toLowerCase();

        if (haystack.includes(query)) {
          results.push({
            group,
            item
          });
        }
      });
    });

    return results;
  }, [search]);

  /* ============================================================
     NAVIGATION
  ============================================================ */

  const openSetting = (group, item) => {
    if (item.route) {
      navigate(item.route);
      return;
    }

    setSelectedGroup(group);
    setSelectedItem(item);
  };

  /* ============================================================
     LOGOUT
  ============================================================ */

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/");
    } catch (error) {
      console.error(error);

      showToast(
        error?.message || "Unable to log out",
        "error"
      );
    }
  };

  /* ============================================================
     CLEAR CACHE
  ============================================================ */

  const handleClearCache = () => {
    try {
      const preservedKeys = Object.values(STORAGE_KEYS);

      const keysToDelete = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);

        if (
          key &&
          !preservedKeys.includes(key)
        ) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => {
        localStorage.removeItem(key);
      });

      if ("caches" in window) {
        window.caches
          .keys()
          .then((names) => {
            names.forEach((name) => {
              window.caches.delete(name);
            });
          })
          .catch(() => {});
      }

      showToast("Local cache cleared");
    } catch (error) {
      console.error(error);

      showToast(
        "Unable to clear local cache",
        "error"
      );
    }
  };

  /* ============================================================
     PROFILE DATA
  ============================================================ */

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Mpade User";

  const username = profile?.username
    ? `@${profile.username}`
    : user?.email || "Account";

  const avatar =
    profile?.avatar_url ||
    null;

  const currency =
    profile?.currency_preference ||
    "MWK";

  const balance =
    profile?.balance ?? 0;

  const verified =
    Boolean(
      profile?.is_verified ||
      profile?.verified_status === true ||
      profile?.verified_status === "verified"
    );

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className={[
        "min-h-screen bg-black text-white",
        "font-sans pb-20",
        highContrast ? "contrast-125" : "",
        density === "compact"
          ? "settings-density-compact"
          : ""
      ].join(" ")}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-[80] border-b border-white/[0.06] bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl border border-white/[0.06]
              bg-white/[0.03]
              text-zinc-300
              transition
              hover:border-cyan-400/30
              hover:bg-cyan-400/[0.06]
              hover:text-white
            "
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[3px] text-cyan-400/80">
              Mpade Universe
            </p>

            <h1 className="truncate text-base font-black tracking-tight sm:text-lg">
              Settings & Privacy
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedGroup(
                SETTINGS_GROUPS.find(
                  (group) => group.id === "system"
                )
              );
              setSelectedItem(
                SETTINGS_GROUPS
                  .find(
                    (group) => group.id === "system"
                  )
                  ?.items?.[0] || null
              );
            }}
            className="
              hidden h-10 w-10 items-center justify-center
              rounded-xl border border-white/[0.06]
              bg-white/[0.03]
              text-zinc-400
              transition
              hover:text-white
              sm:flex
            "
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">

        {/* ====================================================
            PROFILE HERO
        ==================================================== */}

        <section className="
          relative overflow-hidden
          rounded-[28px]
          border border-white/[0.07]
          bg-gradient-to-br
          from-cyan-500/[0.09]
          via-[#0A0A0A]
          to-purple-500/[0.07]
          p-5
          shadow-2xl shadow-cyan-950/10
          sm:p-7
        ">
          <div className="
            pointer-events-none absolute
            -right-24 -top-24
            h-64 w-64
            rounded-full
            bg-cyan-400/[0.07]
            blur-3xl
          " />

          <div className="
            pointer-events-none absolute
            -bottom-32 -left-20
            h-72 w-72
            rounded-full
            bg-purple-500/[0.06]
            blur-3xl
          " />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">

            {/* Avatar */}

            <div className="
              relative h-20 w-20 shrink-0
              overflow-hidden rounded-[24px]
              border border-cyan-400/20
              bg-zinc-900
              shadow-xl shadow-cyan-500/10
              sm:h-24 sm:w-24
            ">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="
                  flex h-full w-full
                  items-center justify-center
                  bg-gradient-to-br
                  from-cyan-500/20
                  to-purple-500/20
                  text-xl font-black text-cyan-300
                ">
                  {getInitials(displayName)}
                </div>
              )}

              {verified && (
                <div className="
                  absolute bottom-1 right-1
                  flex h-6 w-6 items-center justify-center
                  rounded-full
                  border-2 border-black
                  bg-cyan-400
                  text-black
                ">
                  <Check size={13} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Identity */}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black sm:text-2xl">
                  {loading ? "Loading account..." : displayName}
                </h2>

                {verified && (
                  <span className="
                    inline-flex items-center gap-1
                    rounded-full
                    border border-cyan-400/20
                    bg-cyan-400/[0.08]
                    px-2 py-1
                    text-[9px] font-black uppercase tracking-wider
                    text-cyan-300
                  ">
                    <BadgeCheck size={12} />
                    Verified
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                {username}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge
                  icon={<Shield size={12} />}
                  label={
                    profile?.account_status ||
                    "Active"
                  }
                />

                <StatusBadge
                  icon={<Globe size={12} />}
                  label={profile?.district || "Malawi"}
                />

                <StatusBadge
                  icon={<Wallet size={12} />}
                  label={formatCurrency(balance, currency)}
                />
              </div>
            </div>

            {/* Profile button */}

            <button
              type="button"
              onClick={() => navigate("/edit-profile")}
              className="
                flex shrink-0 items-center justify-center gap-2
                rounded-xl
                border border-cyan-400/20
                bg-cyan-400/[0.08]
                px-4 py-3
                text-[10px] font-black uppercase tracking-[1.5px]
                text-cyan-300
                transition
                hover:bg-cyan-400/[0.14]
              "
            >
              Edit Profile
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Account statistics */}

          <div className="
            relative mt-6
            grid grid-cols-3
            divide-x divide-white/[0.06]
            rounded-2xl
            border border-white/[0.05]
            bg-black/30
            py-4
          ">
            <Stat
              label="Followers"
              value={formatNumber(profile?.follower_count)}
            />

            <Stat
              label="Following"
              value={formatNumber(profile?.following_count)}
            />

            <Stat
              label="Likes"
              value={formatNumber(profile?.total_likes)}
            />
          </div>
        </section>

        {/* ====================================================
            SEARCH
        ==================================================== */}

        <section className="mt-5">
          <div className="
            relative
            overflow-hidden
            rounded-2xl
            border border-white/[0.07]
            bg-[#090909]
          ">
            <Search
              size={19}
              className="
                pointer-events-none
                absolute left-4 top-1/2
                -translate-y-1/2
                text-zinc-600
              "
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search settings, privacy, security, creator tools..."
              className="
                w-full
                bg-transparent
                py-4 pl-12 pr-12
                text-sm
                text-white
                outline-none
                placeholder:text-zinc-600
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  absolute right-3 top-1/2
                  flex h-8 w-8
                  -translate-y-1/2
                  items-center justify-center
                  rounded-lg
                  text-zinc-500
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                <X size={16} />
              </button>
            )}
          </div>
        </section>

        {/* ====================================================
            SEARCH RESULTS
        ==================================================== */}

        <AnimatePresence mode="wait">
          {search.trim() ? (
            <motion.section
              key="search"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-cyan-400">
                    Search
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    Settings results
                  </h3>
                </div>

                <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-bold text-zinc-500">
                  {searchResults.length} result
                  {searchResults.length === 1 ? "" : "s"}
                </span>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {searchResults.map(({ group, item }) => (
                    <SearchResult
                      key={`${group.id}-${item.id}`}
                      group={group}
                      item={item}
                      onClick={() => openSetting(group, item)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Search size={25} />}
                  title="No settings found"
                  description="Try another search term such as security, creator, wallet or privacy."
                />
              )}
            </motion.section>
          ) : (
            <motion.section
              key="groups"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-7"
            >
              {/* ==================================================
                  QUICK SETTINGS
              ================================================== */}

              <QuickSettings
                dataSaver={dataSaver}
                setDataSaver={setDataSaver}
                autoplay={autoplay}
                setAutoplay={setAutoplay}
                reduceMotion={reduceMotion}
                setReduceMotion={setReduceMotion}
              />

              {/* ==================================================
                  SETTINGS GROUPS
              ================================================== */}

              <div className="mt-8">
                <div className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-zinc-600">
                    Control center
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    All settings
                  </h3>

                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
                    Manage your Mpade Universe account, privacy,
                    content, creator tools, payments and platform
                    preferences from one place.
                  </p>
                </div>

                <div className="
                  grid gap-4
                  md:grid-cols-2
                  xl:grid-cols-3
                ">
                  {SETTINGS_GROUPS.map((group) => (
                    <SettingsGroupCard
                      key={group.id}
                      group={group}
                      onClick={(item) =>
                        openSetting(group, item)
                      }
                    />
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ====================================================
            LOCAL PREFERENCES
        ==================================================== */}

        {!search.trim() && (
          <section className="mt-8">
            <SectionTitle
              eyebrow="Personalization"
              title="Quick preferences"
            />

            <div className="
              overflow-hidden
              rounded-3xl
              border border-white/[0.06]
              bg-[#090909]
            ">
              <SettingToggle
                icon={<Palette className="text-pink-400" />}
                title="Neon interface"
                description="Use the futuristic neon visual style."
                active={theme === "neon"}
                onToggle={() =>
                  setTheme(
                    theme === "neon"
                      ? "dark"
                      : "neon"
                  )
                }
              />

              <SettingToggle
                icon={<Volume2 className="text-cyan-400" />}
                title="Video autoplay"
                description="Automatically play videos when available."
                active={autoplay}
                onToggle={() => setAutoplay(!autoplay)}
              />

              <SettingToggle
                icon={<Accessibility className="text-blue-400" />}
                title="Reduce motion"
                description="Reduce animations and transition effects."
                active={reduceMotion}
                onToggle={() =>
                  setReduceMotion(!reduceMotion)
                }
              />

              <SettingToggle
                icon={<Eye className="text-emerald-400" />}
                title="High contrast"
                description="Increase interface contrast for readability."
                active={highContrast}
                onToggle={() =>
                  setHighContrast(!highContrast)
                }
                border={false}
              />
            </div>
          </section>
        )}

        {/* ====================================================
            CACHE / ACCOUNT ACTIONS
        ==================================================== */}

        {!search.trim() && (
          <section className="mt-8">
            <SectionTitle
              eyebrow="Device"
              title="Storage & account"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <ActionCard
                icon={<HardDrive className="text-orange-400" />}
                title="Clear local cache"
                description="Remove cached application data from this browser."
                onClick={handleClearCache}
              />

              <ActionCard
                icon={<Download className="text-blue-400" />}
                title="Download your data"
                description="Request a copy of your account information."
                onClick={() =>
                  navigate("/settings/reports")
                }
              />
            </div>
          </section>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-12 border-t border-white/[0.05] pt-8">

          <button
            type="button"
            onClick={handleLogout}
            className="
              group flex w-full items-center justify-center gap-2
              rounded-2xl
              border border-red-500/20
              bg-red-500/[0.06]
              py-4
              text-[10px] font-black uppercase tracking-[2px]
              text-red-400
              transition
              hover:border-red-500/30
              hover:bg-red-500/[0.1]
            "
          >
            <LogOut
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Log out
          </button>

          <div className="
            mt-6
            flex flex-col items-center justify-center gap-2
            text-center
          ">
            <div className="
              flex items-center gap-2
              text-[9px] font-black uppercase tracking-[2px]
              text-zinc-700
            ">
              <span>Mpade Universe</span>
              <span>•</span>
              <span>{APP_VERSION}</span>
            </div>

            <p className="text-[9px] text-zinc-800">
              Your account. Your data. Your controls.
            </p>
          </div>
        </footer>
      </main>

      {/* ======================================================
          DETAIL DRAWER
      ====================================================== */}

      <AnimatePresence>
        {selectedItem && selectedGroup && (
          <SettingDrawer
            group={selectedGroup}
            item={selectedItem}
            profile={profile}
            user={user}
            dataSaver={dataSaver}
            setDataSaver={setDataSaver}
            theme={theme}
            setTheme={setTheme}
            accent={accent}
            setAccent={setAccent}
            language={language}
            setLanguage={setLanguage}
            density={density}
            setDensity={setDensity}
            autoplay={autoplay}
            setAutoplay={setAutoplay}
            reduceMotion={reduceMotion}
            setReduceMotion={setReduceMotion}
            highContrast={highContrast}
            setHighContrast={setHighContrast}
            onClose={() => {
              setSelectedItem(null);
              setSelectedGroup(null);
            }}
            onNavigate={navigate}
            onLogout={handleLogout}
            onClearCache={handleClearCache}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* ======================================================
          TOAST
      ====================================================== */}

      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================
   SETTINGS GROUP CARD
============================================================ */

const SettingsGroupCard = ({ group, onClick }) => {
  const Icon = group.icon;

  return (
    <motion.div
      whileHover={{
        y: -2
      }}
      transition={{
        duration: 0.2
      }}
      className={[
        "overflow-hidden rounded-3xl border",
        group.danger
          ? "border-red-500/10 bg-red-500/[0.025]"
          : "border-white/[0.06] bg-[#090909]"
      ].join(" ")}
    >
      <div className="flex items-start gap-4 p-5">

        <div className="
          flex h-11 w-11 shrink-0
          items-center justify-center
          rounded-2xl
          border border-white/[0.06]
          bg-black
        ">
          <Icon
            size={20}
            className={
              group.danger
                ? "text-red-400"
                : getColorClass(group.color)
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black">
            {group.title}
          </h4>

          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            {group.description}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.05]">
        {group.items.slice(0, 4).map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onClick(item)}
            className={[
              "flex w-full items-center gap-3 px-5 py-3.5 text-left",
              "transition",
              "hover:bg-white/[0.035]",
              index < Math.min(group.items.length, 4) - 1
                ? "border-b border-white/[0.04]"
                : ""
            ].join(" ")}
          >
            <item.icon
              size={15}
              className={
                item.danger
                  ? "text-red-400"
                  : "text-zinc-500"
              }
            />

            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-zinc-300">
              {item.title}
            </span>

            {item.badge && (
              <span className="
                hidden rounded-md
                bg-white/[0.04]
                px-2 py-1
                text-[8px] font-black uppercase
                tracking-wider
                text-zinc-600
                sm:block
              ">
                {item.badge}
              </span>
            )}

            <ChevronRight
              size={14}
              className="shrink-0 text-zinc-700"
            />
          </button>
        ))}

        {group.items.length > 4 && (
          <button
            type="button"
            onClick={() => onClick(group.items[0])}
            className="
              flex w-full items-center justify-center gap-2
              px-5 py-3
              text-[9px] font-black uppercase tracking-[1.5px]
              text-cyan-400/70
              transition
              hover:bg-cyan-400/[0.04]
              hover:text-cyan-300
            "
          >
            View all {group.items.length} settings
            <ChevronRight size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ============================================================
   SEARCH RESULT
============================================================ */

const SearchResult = ({
  group,
  item,
  onClick
}) => {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group flex w-full items-center gap-4
        rounded-2xl
        border border-white/[0.06]
        bg-[#090909]
        p-4
        text-left
        transition
        hover:border-cyan-400/20
        hover:bg-cyan-400/[0.025]
      "
    >
      <div className="
        flex h-10 w-10 shrink-0
        items-center justify-center
        rounded-xl
        bg-black
        text-cyan-400
      ">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-black uppercase tracking-[2px] text-zinc-700">
          {group.title}
        </p>

        <h4 className="mt-1 text-xs font-black text-zinc-200">
          {item.title}
        </h4>

        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-600">
          {item.description}
        </p>
      </div>

      <ChevronRight
        size={16}
        className="
          shrink-0
          text-zinc-700
          transition
          group-hover:text-cyan-400
        "
      />
    </button>
  );
};

/* ============================================================
   QUICK SETTINGS
============================================================ */

const QuickSettings = ({
  dataSaver,
  setDataSaver,
  autoplay,
  setAutoplay,
  reduceMotion,
  setReduceMotion
}) => {
  return (
    <section>
      <SectionTitle
        eyebrow="Quick controls"
        title="Frequently used"
      />

      <div className="
        grid gap-3
        sm:grid-cols-3
      ">
        <MiniToggle
          icon={<Database className="text-orange-400" />}
          title="Data Saver"
          description="Reduce media data usage"
          active={dataSaver}
          onToggle={() =>
            setDataSaver(!dataSaver)
          }
        />

        <MiniToggle
          icon={<Video className="text-cyan-400" />}
          title="Autoplay"
          description="Play videos automatically"
          active={autoplay}
          onToggle={() =>
            setAutoplay(!autoplay)
          }
        />

        <MiniToggle
          icon={<Activity className="text-purple-400" />}
          title="Reduce Motion"
          description="Reduce interface animation"
          active={reduceMotion}
          onToggle={() =>
            setReduceMotion(!reduceMotion)
          }
        />
      </div>
    </section>
  );
};

/* ============================================================
   SETTING DRAWER
============================================================ */

const SettingDrawer = ({
  group,
  item,
  profile,
  user,
  dataSaver,
  setDataSaver,
  theme,
  setTheme,
  accent,
  setAccent,
  language,
  setLanguage,
  density,
  setDensity,
  autoplay,
  setAutoplay,
  reduceMotion,
  setReduceMotion,
  highContrast,
  setHighContrast,
  onClose,
  onNavigate,
  onLogout,
  onClearCache,
  showToast
}) => {
  const Icon = item.icon;

  const isAccount =
    item.id === "account-information";

  const isAppearance =
    item.id === "appearance";

  const isData =
    item.id === "data";

  const isLanguage =
    item.id === "language";

  const isAccessibility =
    item.id === "accessibility";

  const isWallet =
    item.id === "wallet";

  const isPaymentMethods =
    item.id === "payment-methods";

  const isSecurity =
    item.id === "security";

  const isPrivacy =
    item.id === "privacy";

  const isNotifications =
    item.id === "notifications";

  const isContent =
    item.id === "content";

  const isComments =
    item.id === "comments";

  const isMessages =
    item.id === "messages";

  const isFollowers =
    item.id === "followers";

  const isAI =
    item.id === "creator-ai";

  const isSystem =
    item.id === "system-status" ||
    item.id === "diagnostics" ||
    item.id === "app-preferences";

  const isDanger =
    item.danger ||
    group.danger;

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}

      <motion.button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/75 backdrop-blur-sm"
      />

      {/* Drawer */}

      <motion.aside
        initial={{
          opacity: 0,
          x: "100%"
        }}
        animate={{
          opacity: 1,
          x: 0
        }}
        exit={{
          opacity: 0,
          x: "100%"
        }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 32
        }}
        className="
          absolute right-0 top-0
          flex h-full
          w-full max-w-xl
          flex-col
          overflow-hidden
          border-l border-white/[0.08]
          bg-[#070707]
          shadow-2xl shadow-black
        "
      >
        {/* Drawer header */}

        <div className="
          shrink-0
          border-b border-white/[0.06]
          bg-black/80
          p-5
          backdrop-blur-xl
        ">
          <div className="flex items-start gap-3">

            <button
              type="button"
              onClick={onClose}
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-white/[0.06]
                bg-white/[0.03]
                text-zinc-400
                transition
                hover:text-white
              "
            >
              <X size={18} />
            </button>

            <div className="
              flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-xl
              border border-cyan-400/15
              bg-cyan-400/[0.06]
              text-cyan-400
            ">
              <Icon size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[2px] text-cyan-400/70">
                {group.title}
              </p>

              <h2 className="mt-1 text-base font-black">
                {item.title}
              </h2>

              <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
                {item.description}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer content */}

        <div className="flex-1 overflow-y-auto p-5">

          {/* ================================================
              ACCOUNT INFORMATION
          ================================================ */}

          {isAccount && (
            <AccountInformation
              profile={profile}
              user={user}
              onNavigate={onNavigate}
            />
          )}

          {/* ================================================
              APPEARANCE
          ================================================ */}

          {isAppearance && (
            <AppearanceSettings
              theme={theme}
              setTheme={setTheme}
              accent={accent}
              setAccent={setAccent}
              density={density}
              setDensity={setDensity}
              reduceMotion={reduceMotion}
              setReduceMotion={setReduceMotion}
              highContrast={highContrast}
            />
          )}

          {/* ================================================
              DATA
          ================================================ */}

          {isData && (
            <DataStorageSettings
              dataSaver={dataSaver}
              setDataSaver={setDataSaver}
              autoplay={autoplay}
              setAutoplay={setAutoplay}
              onClearCache={onClearCache}
            />
          )}

          {/* ================================================
              LANGUAGE
          ================================================ */}

          {isLanguage && (
            <LanguageSettings
              language={language}
              setLanguage={setLanguage}
              showToast={showToast}
            />
          )}

          {/* ================================================
              ACCESSIBILITY
          ================================================ */}

          {isAccessibility && (
            <AccessibilitySettings
              reduceMotion={reduceMotion}
              setReduceMotion={setReduceMotion}
              highContrast={highContrast}
            />
          )}

          {/* ================================================
              WALLET
          ================================================ */}

          {isWallet && (
            <WalletSettings
              profile={profile}
              onNavigate={onNavigate}
            />
          )}

          {/* ================================================
              PAYMENT METHODS
          ================================================ */}

          {isPaymentMethods && (
            <PaymentMethodsSettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              SECURITY
          ================================================ */}

          {isSecurity && (
            <SecuritySettings
              onNavigate={onNavigate}
              showToast={showToast}
            />
          )}

          {/* ================================================
              PRIVACY
          ================================================ */}

          {isPrivacy && (
            <PrivacySettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              NOTIFICATIONS
          ================================================ */}

          {isNotifications && (
            <NotificationSettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              CONTENT
          ================================================ */}

          {isContent && (
            <ContentSettings
              dataSaver={dataSaver}
              setDataSaver={setDataSaver}
              showToast={showToast}
            />
          )}

          {/* ================================================
              COMMENTS
          ================================================ */}

          {isComments && (
            <CommentsSettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              MESSAGES
          ================================================ */}

          {isMessages && (
            <MessagesSettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              FOLLOWERS
          ================================================ */}

          {isFollowers && (
            <FollowersSettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              CREATOR AI
          ================================================ */}

          {isAI && (
            <CreatorAISettings
              showToast={showToast}
            />
          )}

          {/* ================================================
              SYSTEM
          ================================================ */}

          {isSystem && (
            <SystemSettings
              showToast={showToast}
              onClearCache={onClearCache}
            />
          )}

          {/* ================================================
              GENERIC MODULE
          ================================================ */}

          {!isAccount &&
            !isAppearance &&
            !isData &&
            !isLanguage &&
            !isAccessibility &&
            !isWallet &&
            !isPaymentMethods &&
            !isSecurity &&
            !isPrivacy &&
            !isNotifications &&
            !isContent &&
            !isComments &&
            !isMessages &&
            !isFollowers &&
            !isAI &&
            !isSystem && (
              <GenericSettingModule
                group={group}
                item={item}
                onNavigate={onNavigate}
                onLogout={onLogout}
                showToast={showToast}
              />
            )}

          {/* Danger warning */}

          {isDanger && (
            <div className="
              mt-6
              rounded-2xl
              border border-red-500/20
              bg-red-500/[0.05]
              p-4
            ">
              <div className="flex gap-3">
                <AlertTriangle
                  size={18}
                  className="shrink-0 text-red-400"
                />

                <div>
                  <p className="text-xs font-black text-red-300">
                    Account action
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-red-300/60">
                    Account changes can affect your access,
                    content and personal data. Make sure you
                    understand the consequences before continuing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
};

/* ============================================================
   ACCOUNT INFORMATION
============================================================ */

const AccountInformation = ({
  profile,
  user,
  onNavigate
}) => {
  const fields = [
    ["Username", profile?.username || "Not set"],
    ["Display name", profile?.display_name || "Not set"],
    ["Full name", profile?.full_name || "Not set"],
    ["Email", profile?.email || user?.email || "Not set"],
    ["Phone", profile?.phone || "Not set"],
    ["Date of birth", profile?.dob || "Not set"],
    ["Gender", profile?.gender || "Not set"],
    ["Location", profile?.location || "Not set"],
    ["District", profile?.district || "Not set"],
    ["Website", profile?.website || "Not set"],
    ["Account ID", profile?.id || user?.id || "Unavailable"],
    [
      "Account status",
      profile?.account_status || "Active"
    ],
    [
      "Verification",
      profile?.is_verified ||
      profile?.verified_status === "verified"
        ? "Verified"
        : "Not verified"
    ],
    [
      "Created",
      profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "Unavailable"
    ]
  ];

  return (
    <div>
      <SettingSectionHeader
        title="Your account"
        description="Review the information associated with your Mpade Universe account."
      />

      <div className="
        overflow-hidden
        rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
      ">
        {fields.map(([label, value], index) => (
          <InfoRow
            key={label}
            label={label}
            value={value}
            border={index !== fields.length - 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNavigate("/edit-profile")}
        className="
          mt-4 flex w-full items-center justify-center gap-2
          rounded-xl
          bg-cyan-400
          py-3.5
          text-[10px] font-black uppercase tracking-[1.5px]
          text-black
          transition
          hover:bg-cyan-300
        "
      >
        Edit account information
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

/* ============================================================
   SECURITY
============================================================ */

const SecuritySettings = ({
  onNavigate,
  showToast
}) => {
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [suspiciousLogin, setSuspiciousLogin] = useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Account protection"
        description="Strengthen your account and monitor authentication activity."
      />

      <div className="space-y-3">

        <SecurityAction
          icon={<KeyRound />}
          title="Change password"
          description="Update your account password."
          onClick={() =>
            onNavigate("/settings/security")
          }
        />

        <SecurityAction
          icon={<Fingerprint />}
          title="Two-factor authentication"
          description="Authenticator app, SMS verification and recovery options."
          onClick={() =>
            onNavigate("/settings/security")
          }
          badge="Configure"
        />

        <SecurityAction
          icon={<Smartphone />}
          title="Passkeys"
          description="Use supported device authentication instead of passwords."
          badge="Available"
        />

        <SecurityAction
          icon={<MonitorSmartphone />}
          title="Active sessions"
          description="Review devices currently signed into your account."
          onClick={() =>
            onNavigate("/settings/security")
          }
        />

        <SecurityAction
          icon={<History />}
          title="Login history"
          description="Review recent account access and security events."
          onClick={() =>
            onNavigate("/settings/security")
          }
        />

        <SettingToggle
          icon={<Bell className="text-cyan-400" />}
          title="Login alerts"
          description="Notify me when a new device signs in."
          active={loginAlerts}
          onToggle={() =>
            setLoginAlerts(!loginAlerts)
          }
        />

        <SettingToggle
          icon={<ShieldAlert className="text-red-400" />}
          title="Suspicious login detection"
          description="Monitor unusual authentication activity."
          active={suspiciousLogin}
          onToggle={() =>
            setSuspiciousLogin(!suspiciousLogin)
          }
          border={false}
        />
      </div>

      <InfoNotice>
        Authentication features such as 2FA, passkeys and
        session management should be connected to your actual
        Supabase authentication configuration before being
        treated as active security controls.
      </InfoNotice>

      <button
        type="button"
        onClick={() =>
          showToast("Security settings are ready for configuration")
        }
        className="
          mt-4 w-full rounded-xl
          border border-white/[0.06]
          bg-white/[0.03]
          py-3
          text-[9px] font-black uppercase tracking-[1.5px]
          text-zinc-400
        "
      >
        Security events
      </button>
    </div>
  );
};

/* ============================================================
   PRIVACY
============================================================ */

const PrivacySettings = ({ showToast }) => {
  const [privateAccount, setPrivateAccount] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [profileViews, setProfileViews] = useState(true);
  const [activityVisibility, setActivityVisibility] = useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Privacy controls"
        description="Choose how your profile and activity are visible to other people."
      />

      <div className="
        overflow-hidden rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
      ">
        <SettingToggle
          icon={<Eye className="text-cyan-400" />}
          title="Private account"
          description="Approve people before they can follow you."
          active={privateAccount}
          onToggle={() =>
            setPrivateAccount(!privateAccount)
          }
        />

        <SettingToggle
          icon={<Activity className="text-emerald-400" />}
          title="Online status"
          description="Allow people to see when you are active."
          active={onlineStatus}
          onToggle={() =>
            setOnlineStatus(!onlineStatus)
          }
        />

        <SettingToggle
          icon={<Eye className="text-purple-400" />}
          title="Profile views"
          description="Allow profile-view history to be visible."
          active={profileViews}
          onToggle={() =>
            setProfileViews(!profileViews)
          }
        />

        <SettingToggle
          icon={<Users className="text-orange-400" />}
          title="Activity visibility"
          description="Control visibility of likes, follows and activity."
          active={activityVisibility}
          onToggle={() =>
            setActivityVisibility(!activityVisibility)
          }
          border={false}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <PrivacyAction
          icon={<MessageCircle />}
          title="Who can message you"
          value="Everyone"
        />

        <PrivacyAction
          icon={<UserPlus />}
          title="Who can follow you"
          value="Everyone"
        />

        <PrivacyAction
          icon={<Tag />}
          title="Who can mention or tag you"
          value="Followers"
        />

        <PrivacyAction
          icon={<Search />}
          title="Search visibility"
          value="Enabled"
        />

        <PrivacyAction
          icon={<Ban />}
          title="Blocked & restricted"
          value="Manage"
          onClick={() =>
            showToast("Blocked and restricted management")
          }
        />

        <PrivacyAction
          icon={<ShieldAlert />}
          title="Hidden words & filters"
          value="Manage"
        />
      </div>
    </div>
  );
};

/* ============================================================
   NOTIFICATIONS
============================================================ */

const NotificationSettings = ({ showToast }) => {
  const categories = [
    "Followers",
    "Likes",
    "Comments",
    "Replies",
    "Mentions",
    "Shares",
    "Reposts",
    "Saves",
    "Gifts",
    "Live",
    "Subscribers",
    "Subscription payments",
    "Creator fund",
    "Earnings",
    "Payouts",
    "Video processing",
    "Publishing",
    "Scheduled content",
    "Copyright",
    "Content warnings",
    "Account security",
    "System"
  ];

  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [sounds, setSounds] = useState(true);
  const [vibration, setVibration] = useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Notification center"
        description="Choose what Mpade Universe can notify you about."
      />

      <div className="
        overflow-hidden rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
      ">
        <SettingToggle
          icon={<Bell className="text-cyan-400" />}
          title="Push notifications"
          active={push}
          onToggle={() => setPush(!push)}
        />

        <SettingToggle
          icon={<Mail className="text-blue-400" />}
          title="Email notifications"
          active={email}
          onToggle={() => setEmail(!email)}
        />

        <SettingToggle
          icon={<Phone className="text-emerald-400" />}
          title="SMS notifications"
          active={sms}
          onToggle={() => setSms(!sms)}
        />

        <SettingToggle
          icon={<Volume2 className="text-purple-400" />}
          title="Notification sounds"
          active={sounds}
          onToggle={() => setSounds(!sounds)}
        />

        <SettingToggle
          icon={<Smartphone className="text-orange-400" />}
          title="Vibration"
          active={vibration}
          onToggle={() => setVibration(!vibration)}
          border={false}
        />
      </div>

      <div className="mt-5">
        <SettingSectionHeader
          title="Notification categories"
          description="Individual notification types."
        />

        <div className="
          overflow-hidden rounded-2xl
          border border-white/[0.06]
          bg-[#0A0A0A]
        ">
          {categories.map((category, index) => (
            <NotificationCategory
              key={category}
              title={category}
              border={index !== categories.length - 1}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Notification history marked as read")
        }
        className="
          mt-4 w-full rounded-xl
          border border-white/[0.06]
          bg-white/[0.03]
          py-3
          text-[9px] font-black uppercase tracking-[1.5px]
          text-zinc-400
        "
      >
        Mark all notifications as read
      </button>
    </div>
  );
};

/* ============================================================
   CONTENT
============================================================ */

const ContentSettings = ({
  dataSaver,
  setDataSaver,
  showToast
}) => {
  const [downloads, setDownloads] = useState(false);
  const [duet, setDuet] = useState(true);
  const [stitch, setStitch] = useState(true);
  const [repost, setRepost] = useState(true);
  const [comments, setComments] = useState(true);
  const [ageRestriction, setAgeRestriction] = useState(false);
  const [sensitiveContent, setSensitiveContent] = useState(false);
  const [aiDisclosure, setAiDisclosure] = useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Content controls"
        description="Set default behavior for your videos and content."
      />

      <div className="space-y-3">

        <SelectRow
          icon={<Eye />}
          title="Default video privacy"
          value="Public"
        />

        <SelectRow
          icon={<Video />}
          title="Upload quality"
          value="High"
        />

        <SelectRow
          icon={<Image />}
          title="Thumbnail preference"
          value="Auto"
        />

        <SelectRow
          icon={<FileText />}
          title="Caption preference"
          value="Auto captions"
        />

        <SelectRow
          icon={<Tag />}
          title="Hashtag suggestions"
          value="Enabled"
        />

        <SettingToggle
          icon={<Database className="text-orange-400" />}
          title="Data Saver"
          description="Reduce media quality when using mobile data."
          active={dataSaver}
          onToggle={() =>
            setDataSaver(!dataSaver)
          }
        />

        <SettingToggle
          icon={<Download className="text-blue-400" />}
          title="Allow downloads"
          active={downloads}
          onToggle={() =>
            setDownloads(!downloads)
          }
        />

        <SettingToggle
          icon={<Sparkles className="text-cyan-400" />}
          title="Allow AI disclosure"
          description="Identify content generated or enhanced with AI."
          active={aiDisclosure}
          onToggle={() =>
            setAiDisclosure(!aiDisclosure)
          }
        />

        <SettingToggle
          icon={<Video className="text-purple-400" />}
          title="Allow Duet"
          active={duet}
          onToggle={() => setDuet(!duet)}
        />

        <SettingToggle
          icon={<Video className="text-pink-400" />}
          title="Allow Stitch"
          active={stitch}
          onToggle={() => setStitch(!stitch)}
        />

        <SettingToggle
          icon={<RefreshCw className="text-emerald-400" />}
          title="Allow Repost"
          active={repost}
          onToggle={() => setRepost(!repost)}
        />

        <SettingToggle
          icon={<MessageSquare className="text-yellow-400" />}
          title="Allow comments"
          active={comments}
          onToggle={() => setComments(!comments)}
        />

        <SettingToggle
          icon={<ShieldAlert className="text-red-400" />}
          title="Age restriction"
          active={ageRestriction}
          onToggle={() =>
            setAgeRestriction(!ageRestriction)
          }
        />

        <SettingToggle
          icon={<EyeOff className="text-orange-400" />}
          title="Sensitive content filter"
          active={sensitiveContent}
          onToggle={() =>
            setSensitiveContent(!sensitiveContent)
          }
          border={false}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Content preferences saved locally")
        }
        className="
          mt-5 w-full rounded-xl
          bg-cyan-400 py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save content preferences
      </button>
    </div>
  );
};

/* ============================================================
   DATA STORAGE
============================================================ */

const DataStorageSettings = ({
  dataSaver,
  setDataSaver,
  autoplay,
  setAutoplay,
  onClearCache
}) => {
  return (
    <div>
      <SettingSectionHeader
        title="Data & storage"
        description="Control media quality, autoplay and local browser storage."
      />

      <div className="
        overflow-hidden rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
      ">
        <SettingToggle
          icon={<Database className="text-orange-400" />}
          title="Data Saver"
          description="Reduce video quality to save mobile data."
          active={dataSaver}
          onToggle={() =>
            setDataSaver(!dataSaver)
          }
        />

        <SettingToggle
          icon={<Video className="text-cyan-400" />}
          title="Autoplay"
          description="Automatically play videos."
          active={autoplay}
          onToggle={() =>
            setAutoplay(!autoplay)
          }
          border={false}
        />
      </div>

      <div className="mt-4 space-y-3">
        <SelectRow
          icon={<Upload />}
          title="Upload quality"
          value={dataSaver ? "Standard" : "High"}
        />

        <SelectRow
          icon={<Download />}
          title="Download quality"
          value={dataSaver ? "Standard" : "High"}
        />

        <SelectRow
          icon={<Wifi />}
          title="Wi-Fi autoplay"
          value="Enabled"
        />

        <SelectRow
          icon={<Smartphone />}
          title="Mobile autoplay"
          value={dataSaver ? "Disabled" : "Enabled"}
        />

        <SelectRow
          icon={<HardDrive />}
          title="Background downloads"
          value="Ask first"
        />
      </div>

      <div className="
        mt-5 rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
        p-5
      ">
        <div className="flex items-center gap-3">
          <HardDrive
            size={18}
            className="text-orange-400"
          />

          <div className="flex-1">
            <p className="text-xs font-black">
              Local browser cache
            </p>

            <p className="mt-1 text-[10px] text-zinc-600">
              Clear locally cached application data.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearCache}
          className="
            mt-4 flex w-full items-center
            justify-center gap-2
            rounded-xl
            border border-orange-400/15
            bg-orange-400/[0.05]
            py-3
            text-[9px] font-black uppercase tracking-[1.5px]
            text-orange-300
          "
        >
          <Trash2 size={14} />
          Clear cache
        </button>
      </div>

      <InfoNotice>
        Storage values should be calculated from actual browser
        cache, IndexedDB, drafts and downloaded media rather than
        being hardcoded into the settings interface.
      </InfoNotice>
    </div>
  );
};

/* ============================================================
   LANGUAGE
============================================================ */

const LanguageSettings = ({
  language,
  setLanguage,
  showToast
}) => {
  const [translation, setTranslation] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [captions, setCaptions] = useState("English");

  return (
    <div>
      <SettingSectionHeader
        title="Language & region"
        description="Configure language, translation and regional preferences."
      />

      <div className="space-y-3">

        <SelectRow
          icon={<Languages />}
          title="App language"
          value={language}
          onClick={() =>
            setLanguage(
              language === "English"
                ? "Chichewa"
                : "English"
            )
          }
        />

        <SelectRow
          icon={<Languages />}
          title="Content language"
          value="English + Chichewa"
        />

        <SettingToggle
          icon={<Globe className="text-cyan-400" />}
          title="Translation"
          active={translation}
          onToggle={() =>
            setTranslation(!translation)
          }
        />

        <SettingToggle
          icon={<Languages className="text-purple-400" />}
          title="Auto-translate"
          active={autoTranslate}
          onToggle={() =>
            setAutoTranslate(!autoTranslate)
          }
        />

        <SelectRow
          icon={<MessageSquare />}
          title="Caption language"
          value={captions}
          onClick={() =>
            setCaptions(
              captions === "English"
                ? "Chichewa"
                : "English"
            )
          }
        />

        <SelectRow
          icon={<Globe />}
          title="Country / region"
          value="Malawi"
        />

        <SelectRow
          icon={<Calendar />}
          title="Timezone"
          value="Africa/Blantyre"
        />

        <SelectRow
          icon={<Banknote />}
          title="Currency"
          value="MWK"
        />

        <SelectRow
          icon={<Calendar />}
          title="Date format"
          value="DD/MM/YYYY"
        />

        <SelectRow
          icon={<HashIcon />}
          title="Number format"
          value="1,234.56"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Language preferences saved")
        }
        className="
          mt-5 w-full rounded-xl
          bg-cyan-400 py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save region preferences
      </button>
    </div>
  );
};

/* ============================================================
   APPEARANCE
============================================================ */

const AppearanceSettings = ({
  theme,
  setTheme,
  accent,
  setAccent,
  density,
  setDensity,
  reduceMotion,
  setReduceMotion,
  highContrast
}) => {
  const accents = [
    ["cyan", "Cyan"],
    ["purple", "Purple"],
    ["pink", "Pink"],
    ["emerald", "Emerald"],
    ["orange", "Orange"]
  ];

  return (
    <div>
      <SettingSectionHeader
        title="Appearance"
        description="Customize the visual experience of Mpade Universe."
      />

      <div className="space-y-5">

        <div>
          <SettingLabel>
            Theme
          </SettingLabel>

          <div className="grid grid-cols-3 gap-2">
            {["dark", "light", "system"].map(
              (value) => (
                <ChoiceButton
                  key={value}
                  active={theme === value}
                  onClick={() =>
                    setTheme(value)
                  }
                  label={
                    value.charAt(0).toUpperCase() +
                    value.slice(1)
                  }
                />
              )
            )}
          </div>
        </div>

        <div>
          <SettingLabel>
            Interface style
          </SettingLabel>

          <ChoiceButton
            active={theme === "neon"}
            onClick={() =>
              setTheme(
                theme === "neon"
                  ? "dark"
                  : "neon"
              )
            }
            label="Neon Glow"
          />
        </div>

        <div>
          <SettingLabel>
            Accent color
          </SettingLabel>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {accents.map(([value, label]) => (
              <ChoiceButton
                key={value}
                active={accent === value}
                onClick={() =>
                  setAccent(value)
                }
                label={label}
              />
            ))}
          </div>
        </div>

        <div>
          <SettingLabel>
            Interface density
          </SettingLabel>

          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton
              active={density === "comfortable"}
              onClick={() =>
                setDensity("comfortable")
              }
              label="Comfortable"
            />

            <ChoiceButton
              active={density === "compact"}
              onClick={() =>
                setDensity("compact")
              }
              label="Compact"
            />
          </div>
        </div>

        <SettingToggle
          icon={<Activity className="text-purple-400" />}
          title="Reduce motion"
          description="Reduce animations and transitions."
          active={reduceMotion}
          onToggle={() =>
            setReduceMotion(!reduceMotion)
          }
        />

        <SettingToggle
          icon={<Eye className="text-blue-400" />}
          title="High contrast"
          description="Increase contrast throughout the application."
          active={highContrast}
          onToggle={() => {}}
          border={false}
        />
      </div>
    </div>
  );
};

/* ============================================================
   ACCESSIBILITY
============================================================ */

const AccessibilitySettings = ({
  reduceMotion,
  setReduceMotion,
  highContrast
}) => {
  const [captions, setCaptions] = useState(true);
  const [audioDescriptions, setAudioDescriptions] = useState(false);
  const [largeTargets, setLargeTargets] = useState(false);

  return (
    <div>
      <SettingSectionHeader
        title="Accessibility"
        description="Make Mpade Universe easier to see, hear and navigate."
      />

      <div className="space-y-3">

        <SelectRow
          icon={<SlidersHorizontal />}
          title="Font size"
          value="Default"
        />

        <SettingToggle
          icon={<Eye className="text-cyan-400" />}
          title="High contrast"
          active={highContrast}
          onToggle={() => {}}
        />

        <SettingToggle
          icon={<Activity className="text-purple-400" />}
          title="Reduce motion"
          active={reduceMotion}
          onToggle={() =>
            setReduceMotion(!reduceMotion)
          }
        />

        <SettingToggle
          icon={<MessageSquare className="text-emerald-400" />}
          title="Captions"
          active={captions}
          onToggle={() =>
            setCaptions(!captions)
          }
        />

        <SettingToggle
          icon={<Volume2 className="text-orange-400" />}
          title="Audio descriptions"
          active={audioDescriptions}
          onToggle={() =>
            setAudioDescriptions(!audioDescriptions)
          }
        />

        <SettingToggle
          icon={<Smartphone className="text-blue-400" />}
          title="Larger touch targets"
          active={largeTargets}
          onToggle={() =>
            setLargeTargets(!largeTargets)
          }
          border={false}
        />
      </div>
    </div>
  );
};

/* ============================================================
   WALLET
============================================================ */

const WalletSettings = ({
  profile,
  onNavigate
}) => {
  const currency =
    profile?.currency_preference || "MWK";

  const balance = profile?.balance || 0;
  const coins = profile?.coins || 0;
  const lifetime =
    profile?.total_tokens_earned || 0;

  return (
    <div>
      <SettingSectionHeader
        title="Wallet"
        description="View your creator financial overview."
      />

      <div className="
        rounded-3xl
        border border-emerald-400/10
        bg-gradient-to-br
        from-emerald-400/[0.08]
        via-[#0A0A0A]
        to-cyan-400/[0.04]
        p-5
      ">
        <p className="text-[9px] font-black uppercase tracking-[2px] text-emerald-400/70">
          Available balance
        </p>

        <p className="mt-2 text-3xl font-black">
          {formatCurrency(balance, currency)}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <WalletStat
            label="Coins"
            value={formatNumber(coins)}
          />

          <WalletStat
            label="Lifetime"
            value={formatNumber(lifetime)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <SecurityAction
          icon={<Banknote />}
          title="Payouts"
          description="Request and track creator payouts."
          onClick={() =>
            onNavigate("/payouts")
          }
        />

        <SecurityAction
          icon={<CreditCard />}
          title="Payment methods"
          description="Manage your payout methods."
        />

        <SecurityAction
          icon={<History />}
          title="Transaction history"
          description="Review financial transactions."
        />
      </div>
    </div>
  );
};

/* ============================================================
   PAYMENT METHODS
============================================================ */

const PaymentMethodsSettings = ({
  showToast
}) => {
  const [defaultMethod, setDefaultMethod] =
    useState("TNM Mpamba");

  const methods = [
    {
      id: "TNM Mpamba",
      icon: <Smartphone />,
      description: "Mobile money"
    },
    {
      id: "Airtel Money",
      icon: <Smartphone />,
      description: "Mobile money"
    },
    {
      id: "Bank account",
      icon: <Banknote />,
      description: "Bank transfer"
    }
  ];

  return (
    <div>
      <SettingSectionHeader
        title="Payment methods"
        description="Choose how you receive eligible creator payouts."
      />

      <div className="space-y-3">
        {methods.map((method) => (
          <button
            type="button"
            key={method.id}
            onClick={() =>
              setDefaultMethod(method.id)
            }
            className="
              flex w-full items-center gap-4
              rounded-2xl
              border border-white/[0.06]
              bg-[#0A0A0A]
              p-4
              text-left
              transition
              hover:border-emerald-400/20
            "
          >
            <div className="
              flex h-11 w-11 items-center justify-center
              rounded-xl bg-black text-emerald-400
            ">
              {method.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">
                {method.id}
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                {method.description}
              </p>
            </div>

            <div className="
              flex h-6 w-6 items-center justify-center
              rounded-full
              border border-white/[0.1]
            ">
              {defaultMethod === method.id && (
                <Check
                  size={13}
                  className="text-emerald-400"
                />
              )}
            </div>
          </button>
        ))}
      </div>

      <InfoNotice>
        Payment verification and payout processing must be
        connected to your actual payment provider before funds
        can be sent.
      </InfoNotice>

      <button
        type="button"
        onClick={() =>
          showToast(
            `${defaultMethod} selected as default payout method`
          )
        }
        className="
          mt-4 w-full rounded-xl
          bg-emerald-400
          py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save default method
      </button>
    </div>
  );
};

/* ============================================================
   COMMENTS
============================================================ */

const CommentsSettings = ({ showToast }) => {
  const [comments, setComments] = useState(true);
  const [offensive, setOffensive] = useState(true);
  const [spam, setSpam] = useState(true);
  const [manualModeration, setManualModeration] =
    useState(false);

  return (
    <div>
      <SettingSectionHeader
        title="Comment controls"
        description="Moderate comments and protect your community."
      />

      <div className="space-y-3">
        <SettingToggle
          icon={<MessageSquare className="text-cyan-400" />}
          title="Allow comments"
          active={comments}
          onToggle={() =>
            setComments(!comments)
          }
        />

        <SettingToggle
          icon={<ShieldAlert className="text-red-400" />}
          title="Filter offensive comments"
          active={offensive}
          onToggle={() =>
            setOffensive(!offensive)
          }
        />

        <SettingToggle
          icon={<ShieldAlert className="text-orange-400" />}
          title="Filter spam"
          active={spam}
          onToggle={() =>
            setSpam(!spam)
          }
        />

        <SettingToggle
          icon={<SlidersHorizontal className="text-purple-400" />}
          title="Manual moderation"
          description="Review selected comments before publishing."
          active={manualModeration}
          onToggle={() =>
            setManualModeration(!manualModeration)
          }
          border={false}
        />
      </div>

      <div className="mt-4 space-y-3">
        <PrivacyAction
          icon={<Ban />}
          title="Hidden words"
          value="Manage"
        />

        <PrivacyAction
          icon={<ShieldAlert />}
          title="Blocked commenters"
          value="Manage"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Comment preferences saved")
        }
        className="
          mt-4 w-full rounded-xl
          bg-cyan-400 py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save comment settings
      </button>
    </div>
  );
};

/* ============================================================
   MESSAGES
============================================================ */

const MessagesSettings = ({ showToast }) => {
  const [readReceipts, setReadReceipts] =
    useState(true);

  const [typing, setTyping] =
    useState(true);

  const [messageNotifications, setMessageNotifications] =
    useState(true);

  const [groupMessages, setGroupMessages] =
    useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Messages"
        description="Control direct messages and messaging privacy."
      />

      <div className="space-y-3">
        <SelectRow
          icon={<MessageCircle />}
          title="Who can message you"
          value="Everyone"
        />

        <SelectRow
          icon={<Mail />}
          title="Message requests"
          value="Enabled"
        />

        <SettingToggle
          icon={<Users className="text-purple-400" />}
          title="Group messages"
          active={groupMessages}
          onToggle={() =>
            setGroupMessages(!groupMessages)
          }
        />

        <SettingToggle
          icon={<CheckCircle2 className="text-cyan-400" />}
          title="Read receipts"
          active={readReceipts}
          onToggle={() =>
            setReadReceipts(!readReceipts)
          }
        />

        <SettingToggle
          icon={<Activity className="text-emerald-400" />}
          title="Typing indicator"
          active={typing}
          onToggle={() =>
            setTyping(!typing)
          }
        />

        <SettingToggle
          icon={<Bell className="text-orange-400" />}
          title="Message notifications"
          active={messageNotifications}
          onToggle={() =>
            setMessageNotifications(
              !messageNotifications
            )
          }
          border={false}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Message settings saved")
        }
        className="
          mt-4 w-full rounded-xl
          bg-cyan-400 py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save message settings
      </button>
    </div>
  );
};

/* ============================================================
   FOLLOWERS
============================================================ */

const FollowersSettings = ({ showToast }) => {
  const [contactSync, setContactSync] =
    useState(false);

  const [suggestions, setSuggestions] =
    useState(true);

  const [discoverability, setDiscoverability] =
    useState(true);

  return (
    <div>
      <SettingSectionHeader
        title="Followers & audience"
        description="Manage follower requests and how people discover you."
      />

      <div className="space-y-3">

        <SelectRow
          icon={<UserPlus />}
          title="Follow requests"
          value="Everyone"
        />

        <PrivacyAction
          icon={<Users />}
          title="Follower management"
          value="Manage"
        />

        <PrivacyAction
          icon={<UserRoundX />}
          title="Remove followers"
          value="Manage"
        />

        <PrivacyAction
          icon={<Ban />}
          title="Blocked & restricted"
          value="Manage"
        />

        <SettingToggle
          icon={<Users className="text-cyan-400" />}
          title="People you may know"
          active={suggestions}
          onToggle={() =>
            setSuggestions(!suggestions)
          }
        />

        <SettingToggle
          icon={<Smartphone className="text-orange-400" />}
          title="Contact syncing"
          active={contactSync}
          onToggle={() =>
            setContactSync(!contactSync)
          }
        />

        <SettingToggle
          icon={<Globe className="text-emerald-400" />}
          title="Discoverability"
          active={discoverability}
          onToggle={() =>
            setDiscoverability(!discoverability)
          }
          border={false}
        />
      </div>

      <button
        type="button"
        onClick={() =>
          showToast("Audience settings saved")
        }
        className="
          mt-4 w-full rounded-xl
          bg-cyan-400 py-3.5
          text-[9px] font-black uppercase tracking-[1.5px]
          text-black
        "
      >
        Save audience settings
      </button>
    </div>
  );
};

/* ============================================================
   CREATOR AI
============================================================ */

const CreatorAISettings = ({ showToast }) => {
  const [assistant, setAssistant] =
    useState(true);

  const [recommendations, setRecommendations] =
    useState(true);

  const [contentGeneration, setContentGeneration] =
    useState(true);

  const [personalization, setPersonalization] =
    useState(true);

  const [dataUsage, setDataUsage] =
    useState(false);

  return (
    <div>
      <div className="
        rounded-3xl
        border border-cyan-400/10
        bg-gradient-to-br
        from-cyan-400/[0.08]
        via-[#0A0A0A]
        to-purple-500/[0.06]
        p-5
      ">
        <div className="flex items-center gap-3">
          <div className="
            flex h-11 w-11 items-center justify-center
            rounded-2xl
            border border-cyan-400/20
            bg-cyan-400/[0.08]
          ">
            <Sparkles
              size={21}
              className="text-cyan-300"
            />
          </div>

          <div>
            <p className="text-xs font-black">
              Mpade AI
            </p>

            <p className="mt-1 text-[10px] text-zinc-600">
              Intelligent tools for creators and communities.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <SettingToggle
          icon={<Sparkles className="text-cyan-400" />}
          title="AI assistant"
          active={assistant}
          onToggle={() =>
            setAssistant(!assistant)
          }
        />

        <SettingToggle
          icon={<BarChart3 className="text-purple-400" />}
          title="Recommendations"
          active={recommendations}
          onToggle={() =>
            setRecommendations(!recommendations)
          }
        />

        <SettingToggle
          icon={<FileText className="text-emerald-400" />}
          title="Content generation"
          description="Captions, hashtags, scripts and creative assistance."
          active={contentGeneration}
          onToggle={() =>
            setContentGeneration(!contentGeneration)
          }
        />

        <SettingToggle
          icon={<SlidersHorizontal className="text-orange-400" />}
          title="Personalization"
          active={personalization}
          onToggle={() =>
            setPersonalization(!personalization)
          }
        />

        <SettingToggle
          icon={<Database className="text-red-400" />}
          title="AI data usage"
          description="Allow eligible activity to improve AI experiences."
          active={dataUsage}
          onToggle={() =>
            setDataUsage(!dataUsage)
          }
          border={false}
        />
      </div>

      <div className="mt-4 space-y-3">
        <PrivacyAction
          icon={<History />}
          title="AI history"
          value="Manage"
        />

        <PrivacyAction
          icon={<Trash2 />}
          title="Clear AI history"
          value="Clear"
          onClick={() =>
            showToast("AI history cleared")
          }
        />

        <PrivacyAction
          icon={<Sparkles />}
          title="AI disclosure"
          value="Enabled"
        />
      </div>
    </div>
  );
};

/* ============================================================
   SYSTEM
============================================================ */

const SystemSettings = ({
  showToast,
  onClearCache
}) => {
  const [autoRefresh, setAutoRefresh] =
    useState(true);

  const [backgroundSync, setBackgroundSync] =
    useState(true);

  const [offlineMode, setOfflineMode] =
    useState(false);

  return (
    <div>
      <SettingSectionHeader
        title="System"
        description="Application health, synchronization and diagnostics."
      />

      <div className="space-y-3">

        <SystemStatus
          icon={<Server />}
          title="Application server"
          status="Operational"
        />

        <SystemStatus
          icon={<Database />}
          title="Database"
          status="Connected"
        />

        <SystemStatus
          icon={<HardDrive />}
          title="Storage"
          status="Available"
        />

        <SystemStatus
          icon={<Bell />}
          title="Notifications"
          status="Operational"
        />

        <SystemStatus
          icon={<Video />}
          title="Media processing"
          status="Operational"
        />

        <SystemStatus
          icon={<Wifi />}
          title="Network"
          status={
            navigator.onLine
              ? "Online"
              : "Offline"
          }
        />

        <SettingToggle
          icon={<RefreshCw className="text-cyan-400" />}
          title="Auto refresh"
          active={autoRefresh}
          onToggle={() =>
            setAutoRefresh(!autoRefresh)
          }
        />

        <SettingToggle
          icon={<DatabaseBackup className="text-purple-400" />}
          title="Background sync"
          active={backgroundSync}
          onToggle={() =>
            setBackgroundSync(!backgroundSync)
          }
        />

        <SettingToggle
          icon={<Wifi className="text-orange-400" />}
          title="Offline mode"
          active={offlineMode}
          onToggle={() =>
            setOfflineMode(!offlineMode)
          }
          border={false}
        />
      </div>

      <div className="
        mt-5 rounded-2xl
        border border-white/[0.06]
        bg-[#0A0A0A]
        p-4
      ">
        <InfoRow
          label="App version"
          value={APP_VERSION}
        />

        <InfoRow
          label="Last sync"
          value="Current session"
        />

        <InfoRow
          label="Build"
          value="Production"
        />

        <InfoRow
          label="Platform"
          value="Web"
          border={false}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            showToast("Diagnostics started")
          }
          className="
            flex items-center justify-center gap-2
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.03]
            py-3
            text-[9px] font-black uppercase tracking-[1.5px]
            text-zinc-400
          "
        >
          <Activity size={14} />
          Run diagnostics
        </button>

        <button
          type="button"
          onClick={onClearCache}
          className="
            flex items-center justify-center gap-2
            rounded-xl
            border border-orange-400/15
            bg-orange-400/[0.04]
            py-3
            text-[9px] font-black uppercase tracking-[1.5px]
            text-orange-300
          "
        >
          <Trash2 size={14} />
          Clear temp data
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   GENERIC SETTING MODULE
============================================================ */

const GenericSettingModule = ({
  group,
  item,
  onNavigate,
  onLogout,
  showToast
}) => {
  const [enabled, setEnabled] =
    useState(true);

  const genericOptions =
    getGenericOptions(item.id);

  return (
    <div>
      <SettingSectionHeader
        title={item.title}
        description={item.description}
      />

      {genericOptions.length > 0 ? (
        <div className="space-y-3">
          {genericOptions.map((option, index) => {
            if (option.type === "toggle") {
              return (
                <SettingToggle
                  key={option.title}
                  icon={option.icon}
                  title={option.title}
                  description={option.description}
                  active={
                    option.shared
                      ? enabled
                      : index % 2 === 0
                  }
                  onToggle={() =>
                    setEnabled(!enabled)
                  }
                  border={
                    index !==
                    genericOptions.length - 1
                  }
                />
              );
            }

            return (
              <SelectRow
                key={option.title}
                icon={option.icon}
                title={option.title}
                value={option.value || "Manage"}
              />
            );
          })}
        </div>
      ) : (
        <div className="
          rounded-3xl
          border border-white/[0.06]
          bg-[#0A0A0A]
          p-5
        ">
          <div className="
            flex h-12 w-12 items-center justify-center
            rounded-2xl
            bg-cyan-400/[0.06]
            text-cyan-400
          ">
            <Settings2 size={21} />
          </div>

          <h3 className="mt-5 text-sm font-black">
            {item.title}
          </h3>

          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
            This module is ready to be connected to its
            dedicated Supabase data and service layer.
          </p>

          <button
            type="button"
            onClick={() => {
              if (item.route) {
                onNavigate(item.route);
              } else {
                showToast(
                  `${item.title} is ready for integration`
                );
              }
            }}
            className="
              mt-5 flex w-full
              items-center justify-center gap-2
              rounded-xl
              bg-cyan-400
              py-3.5
              text-[9px] font-black uppercase tracking-[1.5px]
              text-black
            "
          >
            Open module
            <ExternalLink size={14} />
          </button>
        </div>
      )}

      {item.id === "logout" && (
        <button
          type="button"
          onClick={onLogout}
          className="
            mt-5 flex w-full
            items-center justify-center gap-2
            rounded-xl
            bg-red-500
            py-3.5
            text-[9px] font-black uppercase tracking-[1.5px]
            text-white
          "
        >
          <LogOut size={14} />
          Log out
        </button>
      )}

      <InfoNotice>
        This settings module is intentionally separated from
        the main Settings Hub so its backend implementation can
        be added without making the central page difficult to
        maintain.
      </InfoNotice>
    </div>
  );
};

/* ============================================================
   GENERIC OPTIONS
============================================================ */

const getGenericOptions = (id) => {
  const options = {
    "account-type": [
      {
        type: "select",
        title: "Account type",
        value: "Personal",
        icon: <User />
      },
      {
        type: "toggle",
        title: "Creator mode",
        description: "Enable creator-focused tools.",
        icon: <Sparkles />
      },
      {
        type: "select",
        title: "Professional dashboard",
        value: "Available",
        icon: <BarChart3 />
      }
    ],

    "account-management": [
      {
        type: "select",
        title: "Account recovery",
        value: "Manage",
        icon: <KeyRound />
      },
      {
        type: "select",
        title: "Download account information",
        value: "Request",
        icon: <Download />
      },
      {
        type: "select",
        title: "Transfer data",
        value: "Manage",
        icon: <Upload />
      },
      {
        type: "select",
        title: "Deactivate account",
        value: "Manage",
        icon: <UserRoundX />
      },
      {
        type: "select",
        title: "Delete account",
        value: "Permanent",
        icon: <Trash2 />
      }
    ],

    "blocked": [
      {
        type: "select",
        title: "Blocked accounts",
        value: "Manage",
        icon: <Ban />
      },
      {
        type: "select",
        title: "Muted accounts",
        value: "Manage",
        icon: <VolumeX />
      },
      {
        type: "select",
        title: "Restricted accounts",
        value: "Manage",
        icon: <ShieldAlert />
      },
      {
        type: "select",
        title: "Hidden words",
        value: "Manage",
        icon: <EyeOff />
      }
    ],

    "connected-apps": [
      {
        type: "select",
        title: "Connected apps",
        value: "Manage",
        icon: <Link2 />
      },
      {
        type: "select",
        title: "OAuth permissions",
        value: "Manage",
        icon: <Shield />
      },
      {
        type: "select",
        title: "Authorized devices",
        value: "Manage",
        icon: <MonitorSmartphone />
      },
      {
        type: "select",
        title: "API access",
        value: "Manage",
        icon: <KeyRound />
      }
    ],

    "creator-dashboard": [
      {
        type: "select",
        title: "Creator mode",
        value: "Enabled",
        icon: <Sparkles />
      },
      {
        type: "select",
        title: "Creator category",
        value: "Not set",
        icon: <Tag />
      },
      {
        type: "select",
        title: "Creator profile",
        value: "Manage",
        icon: <User />
      }
    ],

    "creator-analytics": [
      {
        type: "select",
        title: "Audience analytics",
        value: "Available",
        icon: <Users />
      },
      {
        type: "select",
        title: "Content performance",
        value: "Available",
        icon: <BarChart3 />
      },
      {
        type: "select",
        title: "Growth analytics",
        value: "Available",
        icon: <Activity />
      }
    ],

    "creator-monetization": [
      {
        type: "select",
        title: "Creator fund",
        value: "Manage",
        icon: <Coins />
      },
      {
        type: "select",
        title: "Earnings",
        value: "Manage",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Gifts",
        value: "Manage",
        icon: <Gift />
      },
      {
        type: "select",
        title: "Paid content",
        value: "Manage",
        icon: <CreditCard />
      }
    ],

    "creator-gifts": [
      {
        type: "select",
        title: "Gift earnings",
        value: "Manage",
        icon: <Gift />
      },
      {
        type: "select",
        title: "Virtual tokens",
        value: "Manage",
        icon: <Coins />
      },
      {
        type: "toggle",
        title: "Receive gifts",
        description: "Allow eligible viewers to send gifts.",
        icon: <Gift />
      }
    ],

    "creator-subscriptions": [
      {
        type: "toggle",
        title: "Subscriptions",
        description: "Allow viewers to subscribe to your creator profile.",
        icon: <Users />
      },
      {
        type: "select",
        title: "Subscription price",
        value: "Manage",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Subscriber benefits",
        value: "Manage",
        icon: <Trophy />
      }
    ],

    "creator-livestream": [
      {
        type: "toggle",
        title: "Allow livestreams",
        description: "Enable livestreaming on your account.",
        icon: <Radio />
      },
      {
        type: "select",
        title: "Live privacy",
        value: "Public",
        icon: <Eye />
      },
      {
        type: "select",
        title: "Live moderation",
        value: "Manage",
        icon: <ShieldAlert />
      }
    ],

    "creator-scheduling": [
      {
        type: "select",
        title: "Scheduled videos",
        value: "Manage",
        icon: <CalendarClock />
      },
      {
        type: "select",
        title: "Scheduled lives",
        value: "Manage",
        icon: <Radio />
      },
      {
        type: "select",
        title: "Default timezone",
        value: "Africa/Blantyre",
        icon: <Globe />
      },
      {
        type: "toggle",
        title: "Publishing notifications",
        description: "Notify me after scheduled publishing.",
        icon: <Bell />
      }
    ],

    "creator-library": [
      {
        type: "select",
        title: "Videos",
        value: "Manage",
        icon: <Video />
      },
      {
        type: "select",
        title: "Drafts",
        value: "Manage",
        icon: <FileText />
      },
      {
        type: "select",
        title: "Images",
        value: "Manage",
        icon: <Image />
      },
      {
        type: "select",
        title: "Audio",
        value: "Manage",
        icon: <Music />
      },
      {
        type: "select",
        title: "Live recordings",
        value: "Manage",
        icon: <Radio />
      },
      {
        type: "select",
        title: "Archived / deleted",
        value: "Manage",
        icon: <FileArchive />
      }
    ],

    "creator-progress": [
      {
        type: "select",
        title: "Creator level",
        value: "View",
        icon: <Trophy />
      },
      {
        type: "select",
        title: "XP progress",
        value: "View",
        icon: <Activity />
      },
      {
        type: "select",
        title: "Achievements",
        value: "View",
        icon: <Medal />
      },
      {
        type: "select",
        title: "Goals",
        value: "Manage",
        icon: <Target />
      },
      {
        type: "select",
        title: "Rewards",
        value: "View",
        icon: <Gift />
      },
      {
        type: "select",
        title: "Leaderboards",
        value: "View",
        icon: <Trophy />
      }
    ],

    "creator-brand": [
      {
        type: "select",
        title: "Media kit",
        value: "Manage",
        icon: <FileText />
      },
      {
        type: "select",
        title: "Portfolio",
        value: "Manage",
        icon: <FolderOpen />
      },
      {
        type: "select",
        title: "Rate card",
        value: "Manage",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Brand messages",
        value: "Manage",
        icon: <MessageCircle />
      },
      {
        type: "select",
        title: "Campaigns",
        value: "Manage",
        icon: <Megaphone />
      },
      {
        type: "select",
        title: "Business contact",
        value: "Manage",
        icon: <BriefcaseBusiness />
      }
    ],

    "payouts": [
      {
        type: "select",
        title: "Request payout",
        value: "Available",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Payout limits",
        value: "View",
        icon: <SlidersHorizontal />
      },
      {
        type: "select",
        title: "Payout status",
        value: "View",
        icon: <Activity />
      },
      {
        type: "select",
        title: "Payout history",
        value: "View",
        icon: <History />
      },
      {
        type: "toggle",
        title: "Automatic payouts",
        description: "Automatically request eligible payouts.",
        icon: <RefreshCw />
      }
    ],

    "transactions": [
      {
        type: "select",
        title: "Payments",
        value: "View",
        icon: <CreditCard />
      },
      {
        type: "select",
        title: "Purchases",
        value: "View",
        icon: <ShoppingBagIcon />
      },
      {
        type: "select",
        title: "Gifts",
        value: "View",
        icon: <Gift />
      },
      {
        type: "select",
        title: "Earnings",
        value: "View",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Refunds",
        value: "View",
        icon: <RefreshCw />
      }
    ],

    "copyright": [
      {
        type: "select",
        title: "Copyright status",
        value: "View",
        icon: <ShieldCheck />
      },
      {
        type: "select",
        title: "Claims",
        value: "View",
        icon: <FileText />
      },
      {
        type: "select",
        title: "Strikes",
        value: "View",
        icon: <ShieldAlert />
      },
      {
        type: "select",
        title: "Disputes",
        value: "Manage",
        icon: <MessageCircle />
      },
      {
        type: "select",
        title: "Music rights",
        value: "Manage",
        icon: <Music />
      }
    ],

    "content-safety": [
      {
        type: "select",
        title: "Content violations",
        value: "View",
        icon: <ShieldAlert />
      },
      {
        type: "select",
        title: "Warnings",
        value: "View",
        icon: <AlertTriangle />
      },
      {
        type: "select",
        title: "Removed content",
        value: "View",
        icon: <Trash2 />
      },
      {
        type: "select",
        title: "Restricted content",
        value: "View",
        icon: <EyeOff />
      }
    ],

    "data-reports": [
      {
        type: "select",
        title: "Export format",
        value: "CSV / JSON / PDF",
        icon: <FileDown />
      }
    ],

    "personal-data": [
      {
        type: "select",
        title: "Personal data",
        value: "Request",
        icon: <Download />
      },
      {
        type: "select",
        title: "Videos",
        value: "Request",
        icon: <Video />
      },
      {
        type: "select",
        title: "Followers",
        value: "Request",
        icon: <Users />
      },
      {
        type: "select",
        title: "Transactions",
        value: "Request",
        icon: <History />
      }
    ],

    "analytics-export": [
      {
        type: "select",
        title: "Analytics export",
        value: "CSV / JSON / PDF",
        icon: <BarChart3 />
      },
      {
        type: "select",
        title: "Audience export",
        value: "Request",
        icon: <Users />
      }
    ],

    "earnings-reports": [
      {
        type: "select",
        title: "Earnings report",
        value: "PDF",
        icon: <Banknote />
      },
      {
        type: "select",
        title: "Transaction report",
        value: "CSV",
        icon: <History />
      }
    ],

    "creator-reports": [
      {
        type: "select",
        title: "Monthly report",
        value: "Available",
        icon: <Newspaper />
      },
      {
        type: "select",
        title: "Creator report",
        value: "Available",
        icon: <BarChart3 />
      }
    ],

    "report-problem": [
      {
        type: "select",
        title: "Technical problem",
        value: "Report",
        icon: <CircleAlert />
      },
      {
        type: "select",
        title: "Content report",
        value: "Report",
        icon: <Flag />
      }
    ],

    "support-tickets": [
      {
        type: "select",
        title: "Open tickets",
        value: "View",
        icon: <FileText />
      },
      {
        type: "select",
        title: "Ticket history",
        value: "View",
        icon: <History />
      }
    ],

    "system-status": [
      {
        type: "select",
        title: "Server status",
        value: "Operational",
        icon: <Server />
      },
      {
        type: "select",
        title: "Database status",
        value: "Connected",
        icon: <Database />
      },
      {
        type: "select",
        title: "Media processing",
        value: "Operational",
        icon: <Video />
      }
    ],

    "app-preferences": [
      {
        type: "toggle",
        title: "Auto refresh",
        description: "Refresh dynamic application data automatically.",
        icon: <RefreshCw />
      },
      {
        type: "toggle",
        title: "Background sync",
        description: "Synchronize eligible data in the background.",
        icon: <DatabaseBackup />
      }
    ],

    "logout-all": [
      {
        type: "select",
        title: "Active devices",
        value: "Manage",
        icon: <MonitorSmartphone />
      },
      {
        type: "select",
        title: "Trusted devices",
        value: "Manage",
        icon: <Shield />
      }
    ],

    "deactivate": [
      {
        type: "select",
        title: "Deactivate account",
        value: "Continue",
        icon: <UserRoundX />
      },
      {
        type: "select",
        title: "Download data first",
        value: "Recommended",
        icon: <Download />
      }
    ],

    "delete": [
      {
        type: "select",
        title: "Download your data",
        value: "Before deletion",
        icon: <Download />
      },
      {
        type: "select",
        title: "Delete account",
        value: "Permanent",
        icon: <Trash2 />
      }
    ]
  };

  return options[id] || [];
};

/* ============================================================
   COMPONENTS
============================================================ */

const SectionTitle = ({
  eyebrow,
  title
}) => (
  <div className="mb-4">
    <p className="text-[9px] font-black uppercase tracking-[3px] text-zinc-700">
      {eyebrow}
    </p>

    <h3 className="mt-1 text-lg font-black">
      {title}
    </h3>
  </div>
);

const SettingSectionHeader = ({
  title,
  description
}) => (
  <div className="mb-5">
    <h3 className="text-lg font-black">
      {title}
    </h3>

    {description && (
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
        {description}
      </p>
    )}
  </div>
);

const SettingLabel = ({ children }) => (
  <p className="
    mb-2
    text-[9px]
    font-black
    uppercase
    tracking-[2px]
    text-zinc-600
  ">
    {children}
  </p>
);

const SettingToggle = ({
  icon,
  title,
  description,
  active,
  onToggle,
  border = true
}) => (
  <div
    className={[
      "flex items-center gap-3 p-4",
      border
        ? "border-b border-white/[0.05]"
        : ""
    ].join(" ")}
  >
    <div className="
      flex h-10 w-10 shrink-0
      items-center justify-center
      rounded-xl
      bg-black
      text-zinc-400
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <div className="min-w-0 flex-1">
      <h4 className="text-xs font-black text-zinc-200">
        {title}
      </h4>

      {description && (
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          {description}
        </p>
      )}
    </div>

    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={[
        "relative h-6 w-11 shrink-0 rounded-full",
        "transition-all duration-300",
        active
          ? "bg-cyan-400"
          : "bg-zinc-800"
      ].join(" ")}
    >
      <motion.span
        animate={{
          x: active ? 22 : 4
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        className="
          absolute left-0 top-1
          h-4 w-4
          rounded-full
          bg-white
          shadow-lg
        "
      />
    </button>
  </div>
);

const MiniToggle = ({
  icon,
  title,
  description,
  active,
  onToggle
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="
      flex items-center gap-3
      rounded-2xl
      border border-white/[0.06]
      bg-[#090909]
      p-4
      text-left
      transition
      hover:border-cyan-400/20
    "
  >
    <div className="
      flex h-10 w-10 shrink-0
      items-center justify-center
      rounded-xl bg-black
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-black">
        {title}
      </p>

      <p className="mt-1 truncate text-[9px] text-zinc-600">
        {description}
      </p>
    </div>

    <span
      className={[
        "h-2 w-2 rounded-full",
        active
          ? "bg-cyan-400 shadow-lg shadow-cyan-400/50"
          : "bg-zinc-700"
      ].join(" ")}
    />
  </button>
);

const SecurityAction = ({
  icon,
  title,
  description,
  onClick,
  badge
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      flex w-full items-center gap-3
      rounded-2xl
      border border-white/[0.06]
      bg-[#0A0A0A]
      p-4
      text-left
      transition
      hover:border-cyan-400/15
      hover:bg-white/[0.015]
    "
  >
    <div className="
      flex h-10 w-10 shrink-0
      items-center justify-center
      rounded-xl bg-black
      text-cyan-400
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-black">
        {title}
      </p>

      {description && (
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          {description}
        </p>
      )}
    </div>

    {badge && (
      <span className="
        rounded-md
        bg-cyan-400/[0.06]
        px-2 py-1
        text-[8px] font-black uppercase
        text-cyan-400
      ">
        {badge}
      </span>
    )}

    <ChevronRight
      size={15}
      className="text-zinc-700"
    />
  </button>
);

const PrivacyAction = ({
  icon,
  title,
  value,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      flex w-full items-center gap-3
      rounded-2xl
      border border-white/[0.06]
      bg-[#0A0A0A]
      p-4
      text-left
    "
  >
    <div className="
      flex h-10 w-10 shrink-0
      items-center justify-center
      rounded-xl bg-black
      text-zinc-400
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <span className="min-w-0 flex-1 text-xs font-black">
      {title}
    </span>

    <span className="
      max-w-[120px]
      truncate
      text-[9px]
      font-bold
      uppercase
      text-zinc-600
    ">
      {value}
    </span>

    <ChevronRight
      size={14}
      className="text-zinc-700"
    />
  </button>
);

const SelectRow = ({
  icon,
  title,
  value,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      flex w-full items-center gap-3
      rounded-2xl
      border border-white/[0.06]
      bg-[#0A0A0A]
      p-4
      text-left
      transition
      hover:border-white/[0.1]
    "
  >
    <div className="
      flex h-10 w-10 shrink-0
      items-center justify-center
      rounded-xl bg-black
      text-zinc-400
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <span className="min-w-0 flex-1 text-xs font-black">
      {title}
    </span>

    <span className="
      max-w-[140px]
      truncate
      rounded-md
      bg-white/[0.04]
      px-2 py-1
      text-[9px]
      font-bold
      text-zinc-500
    ">
      {value}
    </span>

    <ChevronRight
      size={14}
      className="text-zinc-700"
    />
  </button>
);

const ChoiceButton = ({
  active,
  onClick,
  label
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex items-center justify-center gap-2",
      "rounded-xl border px-3 py-3",
      "text-[9px] font-black uppercase tracking-wider",
      "transition",
      active
        ? "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300"
        : "border-white/[0.06] bg-[#0A0A0A] text-zinc-500"
    ].join(" ")}
  >
    {active && <Check size={13} />}
    {label}
  </button>
);

const InfoRow = ({
  label,
  value,
  border = true
}) => (
  <div
    className={[
      "flex items-center gap-4 px-4 py-3.5",
      border
        ? "border-b border-white/[0.04]"
        : ""
    ].join(" ")}
  >
    <span className="min-w-0 flex-1 text-[10px] text-zinc-600">
      {label}
    </span>

    <span className="
      max-w-[60%]
      truncate
      text-right
      text-[10px]
      font-bold
      text-zinc-300
    ">
      {value}
    </span>
  </div>
);

const NotificationCategory = ({
  title,
  border
}) => {
  const [active, setActive] =
    useState(true);

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3",
        border
          ? "border-b border-white/[0.04]"
          : ""
      ].join(" ")}
    >
      <span className="flex-1 text-[10px] font-bold text-zinc-400">
        {title}
      </span>

      <button
        type="button"
        onClick={() =>
          setActive(!active)
        }
        className={[
          "h-5 w-9 rounded-full",
          "relative transition",
          active
            ? "bg-cyan-400"
            : "bg-zinc-800"
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-3 w-3 rounded-full bg-white",
            active
              ? "left-5"
              : "left-1"
          ].join(" ")}
        />
      </button>
    </div>
  );
};

const StatusBadge = ({
  icon,
  label
}) => (
  <span className="
    inline-flex items-center gap-1.5
    rounded-full
    border border-white/[0.06]
    bg-black/30
    px-2.5 py-1
    text-[8px] font-black uppercase tracking-wider
    text-zinc-500
  ">
    {icon}
    {label}
  </span>
);

const Stat = ({
  label,
  value
}) => (
  <div className="text-center">
    <p className="text-sm font-black text-zinc-200">
      {value}
    </p>

    <p className="mt-1 text-[8px] font-black uppercase tracking-[1.5px] text-zinc-700">
      {label}
    </p>
  </div>
);

const WalletStat = ({
  label,
  value
}) => (
  <div className="
    rounded-xl
    border border-white/[0.05]
    bg-black/30
    p-3
  ">
    <p className="text-[8px] font-black uppercase tracking-wider text-zinc-700">
      {label}
    </p>

    <p className="mt-1 text-sm font-black text-zinc-200">
      {value}
    </p>
  </div>
);

const SystemStatus = ({
  icon,
  title,
  status
}) => (
  <div className="
    flex items-center gap-3
    rounded-2xl
    border border-white/[0.06]
    bg-[#0A0A0A]
    p-4
  ">
    <div className="
      flex h-10 w-10 items-center justify-center
      rounded-xl bg-black
      text-emerald-400
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <span className="flex-1 text-xs font-black">
      {title}
    </span>

    <span className="
      flex items-center gap-1.5
      text-[8px] font-black uppercase
      tracking-wider text-emerald-400
    ">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {status}
    </span>
  </div>
);

const ActionCard = ({
  icon,
  title,
  description,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="
      rounded-2xl
      border border-white/[0.06]
      bg-[#090909]
      p-4
      text-left
      transition
      hover:border-cyan-400/15
    "
  >
    <div className="
      flex h-10 w-10 items-center justify-center
      rounded-xl bg-black
    ">
      {React.cloneElement(icon, {
        size: 17
      })}
    </div>

    <h4 className="mt-4 text-xs font-black">
      {title}
    </h4>

    <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
      {description}
    </p>
  </button>
);

const EmptyState = ({
  icon,
  title,
  description
}) => (
  <div className="
    rounded-3xl
    border border-white/[0.06]
    bg-[#090909]
    p-10
    text-center
  ">
    <div className="
      mx-auto flex h-12 w-12
      items-center justify-center
      rounded-2xl
      bg-white/[0.03]
      text-zinc-600
    ">
      {icon}
    </div>

    <h3 className="mt-4 text-sm font-black">
      {title}
    </h3>

    <p className="mx-auto mt-2 max-w-sm text-[10px] leading-relaxed text-zinc-600">
      {description}
    </p>
  </div>
);

const InfoNotice = ({
  children
}) => (
  <div className="
    mt-5 flex gap-3
    rounded-2xl
    border border-blue-400/10
    bg-blue-400/[0.035]
    p-4
  ">
    <Info
      size={16}
      className="shrink-0 text-blue-400"
    />

    <p className="text-[10px] leading-relaxed text-blue-300/60">
      {children}
    </p>
  </div>
);

const Toast = ({
  message,
  type
}) => (
  <motion.div
    initial={{
      opacity: 0,
      y: 20,
      scale: 0.96
    }}
    animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }}
    exit={{
      opacity: 0,
      y: 20,
      scale: 0.96
    }}
    className="
      fixed bottom-6 left-1/2 z-[200]
      flex -translate-x-1/2
      items-center gap-2
      rounded-2xl
      border border-white/[0.08]
      bg-[#111]/95
      px-4 py-3
      shadow-2xl shadow-black
      backdrop-blur-xl
    "
  >
    {type === "error" ? (
      <CircleAlert
        size={16}
        className="text-red-400"
      />
    ) : (
      <CheckCircle2
        size={16}
        className="text-cyan-400"
      />
    )}

    <span className="whitespace-nowrap text-[10px] font-bold text-zinc-200">
      {message}
    </span>
  </motion.div>
);

/* ============================================================
   COLOR HELPER
============================================================ */

const getColorClass = (color) => {
  const map = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    pink: "text-pink-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
    zinc: "text-zinc-400"
  };

  return map[color] || map.zinc;
};

/* ============================================================
   PLACEHOLDER ICONS
============================================================ */

const HashIcon = ({ size = 18 }) => (
  <span
    style={{
      fontSize: size
    }}
    className="font-black"
  >
    #
  </span>
);

const ShoppingBagIcon = ({ size = 18 }) => (
  <span
    style={{
      fontSize: size
    }}
    className="font-black"
  >
    $
  </span>
);

/* ============================================================
   EXPORT
============================================================ */

export default SettingsPage;
