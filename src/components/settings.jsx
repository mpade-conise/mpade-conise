// src/pages/SettingsPage.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cloud,
  Coins,
  Copy,
  CreditCard,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileArchive,
  FileText,
  Fingerprint,
  Flag,
  Folder,
  Globe,
  HardDrive,
  Headphones,
  Heart,
  HelpCircle,
  History,
  Image,
  Info,
  KeyRound,
  Languages,
  LayoutGrid,
  Link2,
  ListFilter,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Moon,
  MoreHorizontal,
  Music,
  Network,
  Palette,
  PauseCircle,
  Phone,
  Play,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Wallet,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "../supabaseClient";

/* ============================================================
   CONSTANTS
   ============================================================ */

const APP_VERSION = "2.4.0-Beta";

const MALAWI_TIMEZONE = "Africa/Blantyre";

const DEFAULT_SOCIAL_LINKS = {
  website: "",
  youtube: "",
  whatsapp: "",
  instagram: "",
};

const DEFAULT_JSON_SETTINGS = {
  privacy: {},
  verification: {},
  financial: {},
  creator: {},
  appearance: {},
  content: {},
  discovery: {},
  advanced: {},
  sharing: {},
  edit: {},
};

const SETTINGS_SECTIONS = [
  {
    id: "account",
    title: "Account",
    description: "Profile, account type and account management",
    icon: User,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    id: "security",
    title: "Security",
    description: "Password, verification, sessions and devices",
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Control how Mpade Universe alerts you",
    icon: Bell,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Control visibility, interactions and discovery",
    icon: Lock,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    id: "content",
    title: "Content",
    description: "Video, comments, downloads and sharing",
    icon: Video,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    id: "comments",
    title: "Comments & Messages",
    description: "Moderation, comments and direct messages",
    icon: MessageCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    id: "followers",
    title: "Followers & Audience",
    description: "Followers, requests and discoverability",
    icon: Users,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    id: "data",
    title: "Data & Storage",
    description: "Data usage, cache and storage",
    icon: Database,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    id: "language",
    title: "Language & Region",
    description: "Language, timezone and regional preferences",
    icon: Languages,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Theme, neon mode, animation and display",
    icon: Palette,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-400/10",
  },
  {
    id: "payments",
    title: "Payments & Monetization",
    description: "Wallet, coins, earnings and payouts",
    icon: Wallet,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    id: "creator",
    title: "Creator Settings",
    description: "Creator tools, analytics and growth",
    icon: Sparkles,
    color: "text-cyan-300",
    bg: "bg-cyan-300/10",
  },
  {
    id: "scheduling",
    title: "Scheduling",
    description: "Scheduled videos, lives and publishing",
    icon: CalendarDays,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    id: "library",
    title: "Content Library",
    description: "Videos, drafts, audio and recordings",
    icon: Folder,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    id: "progress",
    title: "Creator Progress",
    description: "Level, XP, achievements and goals",
    icon: Award,
    color: "text-yellow-300",
    bg: "bg-yellow-300/10",
  },
  {
    id: "brand",
    title: "Brand & Collaborations",
    description: "Media kit, partnerships and campaigns",
    icon: BriefcaseBusiness,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    id: "ai",
    title: "AI Settings",
    description: "Assistant, recommendations and AI data",
    icon: Bot,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    id: "copyright",
    title: "Copyright & Safety",
    description: "Claims, strikes, appeals and safety",
    icon: ShieldAlert,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    id: "reports",
    title: "Data & Reports",
    description: "Export your data and reports",
    icon: FileArchive,
    color: "text-lime-400",
    bg: "bg-lime-400/10",
  },
  {
    id: "apps",
    title: "Connected Apps",
    description: "OAuth, devices and permissions",
    icon: Link2,
    color: "text-blue-300",
    bg: "bg-blue-300/10",
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Display, captions and accessibility",
    icon: Headphones,
    color: "text-orange-300",
    bg: "bg-orange-300/10",
  },
  {
    id: "support",
    title: "Support",
    description: "Help, reports and account recovery",
    icon: CircleHelp,
    color: "text-zinc-300",
    bg: "bg-white/5",
  },
  {
    id: "system",
    title: "System",
    description: "App, server, sync and diagnostics",
    icon: Server,
    color: "text-zinc-300",
    bg: "bg-white/5",
  },
  {
    id: "exit",
    title: "Account Exit",
    description: "Logout, deactivate or delete account",
    icon: LogOut,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

function formatMoney(value, currency = "MWK") {
  const numeric = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-MW", {
      style: "currency",
      currency: currency || "MWK",
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency || "MWK"} ${numeric.toFixed(2)}`;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeJson(value, fallback = {}) {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mergeJson(defaults, value) {
  return {
    ...defaults,
    ...safeJson(value, {}),
  };
}

function getInitials(profile) {
  const name =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    "M";

  return name
    .replace("@", "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getSocialLinks(profile) {
  return {
    ...DEFAULT_SOCIAL_LINKS,
    ...safeJson(profile?.social_links, {}),
  };
}

function calculateBrowserStorage() {
  let localStorageBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const value = key ? localStorage.getItem(key) || "" : "";

      localStorageBytes += new Blob([
        key || "",
        value,
      ]).size;
    }
  } catch {
    localStorageBytes = 0;
  }

  return {
    localStorageBytes,
  };
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const SettingsPage = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeSection, setActiveSection] = useState(null);
  const [search, setSearch] = useState("");

  const [dataSaver, setDataSaver] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    followers: true,
    likes: true,
    comments: true,
    replies: true,
    mentions: true,
    shares: true,
    reposts: true,
    saves: true,
    gifts: true,
    live: true,
    subscribers: true,
    payments: true,
    creatorFund: true,
    earnings: true,
    payouts: true,
    videoProcessing: true,
    publishing: true,
    scheduling: true,
    copyright: true,
    warnings: true,
    security: true,
    system: true,
    push: true,
    email: true,
    sms: false,
    inApp: true,
    sounds: true,
    vibration: true,
    quietHours: false,
  });

  const [privacySettings, setPrivacySettings] = useState({});

  const [contentSettings, setContentSettings] = useState({});

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "neon",
    neon: true,
    density: "comfortable",
    animations: true,
    reduceMotion: false,
    blur: true,
    glass: true,
    fontSize: "medium",
    highContrast: false,
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: "medium",
    highContrast: false,
    reduceMotion: false,
    captions: true,
    audioDescriptions: false,
    colorBlindFriendly: false,
    largeTouchTargets: false,
    screenReader: false,
  });

  const [storage, setStorage] = useState({
    localStorageBytes: 0,
  });

  const [statusMessage, setStatusMessage] = useState("");

  /* ==========================================================
     LOAD PROFILE
     ========================================================== */

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: {
          user: currentUser,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        navigate("/");
        return;
      }

      setUser(currentUser);

      /*
       * IMPORTANT:
       * We use select("*") because the actual profiles schema
       * supplied by the developer contains many settings fields.
       * This avoids the previous 400 caused by requesting columns
       * that did not exist in the old query.
       */
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setProfile({
          id: currentUser.id,
          username:
            currentUser.user_metadata?.username ||
            currentUser.email?.split("@")[0] ||
            "user",
          display_name:
            currentUser.user_metadata?.display_name ||
            "Mpade User",
          account_status: "active",
          currency_preference: "MWK",
          theme_preference: "neon",
          accent_color: "#06b6d4",
        });

        return;
      }

      setProfile(data);

      setPrivacySettings(
        mergeJson(DEFAULT_JSON_SETTINGS.privacy, data.privacy_settings)
      );

      setContentSettings(
        mergeJson(DEFAULT_JSON_SETTINGS.content, data.content_settings)
      );

      const loadedAppearance = mergeJson(
        DEFAULT_JSON_SETTINGS.appearance,
        data.appearance_settings
      );

      setAppearanceSettings((previous) => ({
        ...previous,
        ...loadedAppearance,
        theme:
          loadedAppearance.theme ||
          data.theme_preference ||
          previous.theme,
      }));

      setDataSaver(
        Boolean(
          safeJson(data.advanced_settings, {}).dataSaver ??
            safeJson(data.content_settings, {}).dataSaver ??
            false
        )
      );
    } catch (error) {
      console.error("Settings profile loading error:", error);

      setStatusMessage(
        error?.message ||
          "Unable to load your profile settings."
      );
    } finally {
      setStorage(calculateBrowserStorage());
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ==========================================================
     PROFILE SAVE
     ========================================================== */

  const updateProfile = useCallback(
    async (updates, message = "Settings saved") => {
      if (!user?.id) return false;

      setSaving(true);
      setStatusMessage("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select("*")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile(data);
        } else {
          setProfile((previous) => ({
            ...previous,
            ...updates,
          }));
        }

        setStatusMessage(message);

        window.setTimeout(() => {
          setStatusMessage("");
        }, 2500);

        return true;
      } catch (error) {
        console.error("Settings update error:", error);

        setStatusMessage(
          error?.message ||
            "Unable to save this setting."
        );

        return false;
      } finally {
        setSaving(false);
      }
    },
    [user?.id]
  );

  /* ==========================================================
     JSON SETTING SAVE
     ========================================================== */

  const saveJsonSetting = useCallback(
    async (column, value, message = "Settings saved") => {
      return updateProfile(
        {
          [column]: value,
        },
        message
      );
    },
    [updateProfile]
  );

  /* ==========================================================
     APPEARANCE
     ========================================================== */

  const updateAppearance = async (key, value) => {
    const next = {
      ...appearanceSettings,
      [key]: value,
    };

    setAppearanceSettings(next);

    await updateProfile({
      theme_preference:
        key === "theme"
          ? value
          : next.theme,

      accent_color:
        key === "accentColor"
          ? value
          : profile?.accent_color || "#06b6d4",

      appearance_settings: next,
    });
  };

  /* ==========================================================
     PRIVACY
     ========================================================== */

  const updatePrivacy = async (key, value) => {
    const next = {
      ...privacySettings,
      [key]: value,
    };

    setPrivacySettings(next);

    await updateProfile({
      is_private:
        key === "privateAccount"
          ? Boolean(value)
          : profile?.is_private,

      privacy_settings: next,
    });
  };

  /* ==========================================================
     CONTENT
     ========================================================== */

  const updateContent = async (key, value) => {
    const next = {
      ...contentSettings,
      [key]: value,
    };

    setContentSettings(next);

    await updateProfile({
      content_settings: next,
    });
  };

  /* ==========================================================
     DATA SAVER
     ========================================================== */

  const toggleDataSaver = async () => {
    const next = !dataSaver;

    setDataSaver(next);

    const advanced = mergeJson(
      DEFAULT_JSON_SETTINGS.advanced,
      profile?.advanced_settings
    );

    await updateProfile({
      advanced_settings: {
        ...advanced,
        dataSaver: next,
      },
    });
  };

  /* ==========================================================
     ACCESSIBILITY
     ========================================================== */

  const updateAccessibility = (key, value) => {
    const next = {
      ...accessibilitySettings,
      [key]: value,
    };

    setAccessibilitySettings(next);

    saveJsonSetting(
      "advanced_settings",
      {
        ...safeJson(profile?.advanced_settings, {}),
        accessibility: next,
      }
    );
  };

  /* ==========================================================
     LOGOUT
     ========================================================== */

  const handleLogout = async () => {
    try {
      setSaving(true);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);

      setStatusMessage(
        error?.message || "Unable to log out."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     CLEAR LOCAL DATA
     ========================================================== */

  const clearLocalData = () => {
    try {
      const protectedKeys = [
        "supabase.auth.token",
      ];

      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);

        if (
          key &&
          !protectedKeys.some((protectedKey) =>
            key.includes(protectedKey)
          )
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });

      setStorage(calculateBrowserStorage());

      setStatusMessage(
        "Temporary local data cleared."
      );

      window.setTimeout(() => {
        setStatusMessage("");
      }, 2500);
    } catch (error) {
      console.error("Clear local data error:", error);

      setStatusMessage(
        "Unable to clear local data."
      );
    }
  };

  /* ==========================================================
     SEARCH
     ========================================================== */

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return SETTINGS_SECTIONS;
    }

    return SETTINGS_SECTIONS.filter((section) => {
      return (
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query)
      );
    });
  }, [search]);

  /* ==========================================================
     OPEN SECTION
     ========================================================== */

  const openSection = (id) => {
    setActiveSection(id);

    window.setTimeout(() => {
      document
        .getElementById(`settings-section-${id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />

            <Sparkles
              size={18}
              className="absolute inset-0 m-auto text-cyan-400"
            />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500">
            Loading settings
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     PROFILE VALUES
     ========================================================== */

  const socialLinks = getSocialLinks(profile);

  const currency =
    profile?.currency_preference ||
    "MWK";

  const creatorLevel =
    Number(profile?.creator_level || 1);

  const creatorXP =
    Number(profile?.creator_xp || 0);

  const profileCompletion =
    Number(profile?.profile_completion || 0);

  const verified =
    Boolean(
      profile?.is_verified ||
        profile?.verified_status === "verified"
    );

  const accountType =
    profile?.account_type ||
    "personal";

  const accountStatus =
    profile?.account_status ||
    "active";

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="h-screen overflow-hidden bg-black text-white font-sans">
      {/* ======================================================
          PAGE SHELL
      ====================================================== */}

      <div className="h-full flex flex-col">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="shrink-0 sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="min-h-[72px] flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-10 h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black uppercase tracking-[2px] truncate">
                    Settings & Privacy
                  </h1>

                  <span className="hidden sm:inline-flex text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    Hub
                  </span>
                </div>

                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                  Manage your Mpade Universe experience
                </p>
              </div>

              {saving && (
                <RefreshCw
                  size={17}
                  className="text-cyan-400 animate-spin"
                />
              )}
            </div>

            {/* SEARCH */}

            <div className="pb-4">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search settings..."
                  className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.035] pl-11 pr-12 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-400/40 focus:bg-white/[0.05] transition"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ====================================================
            STATUS MESSAGE
        ==================================================== */}

        <AnimatePresence>
          {statusMessage && (
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
              className="fixed top-24 right-4 z-[100] max-w-sm"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-zinc-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
                <Check
                  size={17}
                  className="mt-0.5 shrink-0 text-cyan-400"
                />

                <p className="text-xs text-zinc-300">
                  {statusMessage}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            SCROLLABLE CONTENT
        ==================================================== */}

        <main
          className="
            flex-1
            overflow-y-auto
            overflow-x-hidden
            overscroll-contain
            scrollbar-thin
            scrollbar-thumb-cyan-500/40
            scrollbar-track-white/5
            pb-16
          "
          style={{
            scrollbarWidth: "thin",
            scrollbarColor:
              "rgba(6,182,212,.45) rgba(255,255,255,.04)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {/* ==================================================
                PROFILE CARD
            ================================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.015] mb-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,.13),transparent_40%)] pointer-events-none" />

              <div className="relative p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                  {/* AVATAR */}

                  <div className="relative shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-20 h-20 rounded-3xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-2xl font-black text-cyan-400">
                        {getInitials(profile)}
                      </div>
                    )}

                    {verified && (
                      <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-full bg-cyan-500 border-4 border-black flex items-center justify-center">
                        <Check
                          size={13}
                          strokeWidth={4}
                        />
                      </div>
                    )}
                  </div>

                  {/* USER */}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black truncate">
                        {profile?.display_name ||
                          profile?.full_name ||
                          profile?.username ||
                          "Mpade User"}
                      </h2>

                      {verified && (
                        <span className="text-[8px] uppercase font-black tracking-widest text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-md">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 mt-1">
                      @{String(
                        profile?.username || "user"
                      ).replace(/^@/, "")}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <StatusPill
                        icon={<User size={11} />}
                        text={accountType}
                      />

                      <StatusPill
                        icon={
                          <Activity size={11} />
                        }
                        text={accountStatus}
                      />

                      <StatusPill
                        icon={<Globe size={11} />}
                        text={
                          profile?.country ||
                          "Malawi"
                        }
                      />
                    </div>
                  </div>

                  {/* EDIT */}

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/edit-profile")
                    }
                    className="self-start sm:self-center flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-black uppercase tracking-widest transition"
                  >
                    <Edit3 size={14} />
                    Edit profile
                  </button>
                </div>

                {/* PROFILE STATS */}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
                  <MiniStat
                    label="Followers"
                    value={formatNumber(
                      profile?.follower_count
                    )}
                  />

                  <MiniStat
                    label="Following"
                    value={formatNumber(
                      profile?.following_count
                    )}
                  />

                  <MiniStat
                    label="Likes"
                    value={formatNumber(
                      profile?.total_likes
                    )}
                  />

                  <MiniStat
                    label="Completion"
                    value={`${profileCompletion}%`}
                  />
                </div>
              </div>
            </motion.div>

            {/* ==================================================
                SEARCH RESULT COUNT
            ================================================== */}

            {search && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[2px] font-black text-zinc-600">
                  {filteredSections.length} settings sections
                </p>

                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[10px] uppercase tracking-widest font-black text-cyan-400"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* ==================================================
                SETTINGS GRID
            ================================================== */}

            {!search && (
              <div className="mb-8">
                <SectionTitle
                  title="All settings"
                  description="Everything you need to manage your Universe account"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SETTINGS_SECTIONS.map(
                    (section) => (
                      <SettingsCategoryCard
                        key={section.id}
                        section={section}
                        active={
                          activeSection ===
                          section.id
                        }
                        onClick={() =>
                          openSection(
                            section.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                INDIVIDUAL SECTIONS
            ================================================== */}

            <div className="space-y-8">
              {filteredSections.map((section) => (
                <section
                  key={section.id}
                  id={`settings-section-${section.id}`}
                  className="scroll-mt-32"
                >
                  <SectionTitle
                    title={section.title}
                    description={
                      section.description
                    }
                  />

                  <div className="rounded-3xl border border-white/10 bg-[#080808] overflow-hidden">
                    {section.id === "account" && (
                      <AccountSection
                        profile={profile}
                        socialLinks={socialLinks}
                        creatorLevel={
                          creatorLevel
                        }
                        creatorXP={creatorXP}
                        profileCompletion={
                          profileCompletion
                        }
                        verified={verified}
                        onUpdate={updateProfile}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "security" && (
                      <SecuritySection
                        profile={profile}
                        user={user}
                        navigate={navigate}
                      />
                    )}

                    {section.id ===
                      "notifications" && (
                      <NotificationsSection
                        settings={
                          notificationSettings
                        }
                        setSettings={
                          setNotificationSettings
                        }
                        onSave={() =>
                          saveJsonSetting(
                            "advanced_settings",
                            {
                              ...safeJson(
                                profile?.advanced_settings,
                                {}
                              ),
                              notifications:
                                notificationSettings,
                            }
                          )
                        }
                      />
                    )}

                    {section.id === "privacy" && (
                      <PrivacySection
                        profile={profile}
                        settings={
                          privacySettings
                        }
                        onUpdate={
                          updatePrivacy
                        }
                        navigate={navigate}
                      />
                    )}

                    {section.id === "content" && (
                      <ContentSection
                        settings={
                          contentSettings
                        }
                        onUpdate={
                          updateContent
                        }
                      />
                    )}

                    {section.id === "comments" && (
                      <CommentsMessagesSection
                        profile={profile}
                        navigate={navigate}
                        onUpdate={
                          updateContent
                        }
                      />
                    )}

                    {section.id ===
                      "followers" && (
                      <FollowersSection
                        profile={profile}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "data" && (
                      <DataStorageSection
                        profile={profile}
                        dataSaver={dataSaver}
                        toggleDataSaver={
                          toggleDataSaver
                        }
                        storage={storage}
                        refreshStorage={() =>
                          setStorage(
                            calculateBrowserStorage()
                          )
                        }
                        clearLocalData={
                          clearLocalData
                        }
                      />
                    )}

                    {section.id ===
                      "language" && (
                      <LanguageRegionSection
                        profile={profile}
                        onUpdate={
                          updateProfile
                        }
                      />
                    )}

                    {section.id ===
                      "appearance" && (
                      <AppearanceSection
                        settings={
                          appearanceSettings
                        }
                        onUpdate={
                          updateAppearance
                        }
                      />
                    )}

                    {section.id ===
                      "payments" && (
                      <PaymentsSection
                        profile={profile}
                        currency={currency}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "creator" && (
                      <CreatorSection
                        profile={profile}
                        creatorLevel={
                          creatorLevel
                        }
                        creatorXP={creatorXP}
                        navigate={navigate}
                      />
                    )}

                    {section.id ===
                      "scheduling" && (
                      <SchedulingSection
                        navigate={navigate}
                      />
                    )}

                    {section.id === "library" && (
                      <LibrarySection
                        navigate={navigate}
                      />
                    )}

                    {section.id ===
                      "progress" && (
                      <CreatorProgressSection
                        profile={profile}
                        level={creatorLevel}
                        xp={creatorXP}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "brand" && (
                      <BrandSection
                        profile={profile}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "ai" && (
                      <AISection
                        profile={profile}
                        navigate={navigate}
                        onUpdate={
                          updateProfile
                        }
                      />
                    )}

                    {section.id ===
                      "copyright" && (
                      <CopyrightSafetySection
                        navigate={navigate}
                      />
                    )}

                    {section.id === "reports" && (
                      <ReportsSection
                        profile={profile}
                        navigate={navigate}
                      />
                    )}

                    {section.id === "apps" && (
                      <ConnectedAppsSection
                        navigate={navigate}
                      />
                    )}

                    {section.id ===
                      "accessibility" && (
                      <AccessibilitySection
                        settings={
                          accessibilitySettings
                        }
                        onUpdate={
                          updateAccessibility
                        }
                      />
                    )}

                    {section.id === "support" && (
                      <SupportSection
                        navigate={navigate}
                      />
                    )}

                    {section.id === "system" && (
                      <SystemSection
                        profile={profile}
                        storage={storage}
                        refresh={
                          loadProfile
                        }
                      />
                    )}

                    {section.id === "exit" && (
                      <AccountExitSection
                        navigate={navigate}
                        onLogout={
                          handleLogout
                        }
                      />
                    )}
                  </div>
                </section>
              ))}
            </div>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 text-zinc-700">
                <Sparkles size={13} />
                <span className="text-[9px] font-black uppercase tracking-[3px]">
                  Mpade Universe
                </span>
              </div>

              <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest mt-2">
                v{APP_VERSION} • {MALAWI_TIMEZONE}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/* ============================================================
   SHARED UI
   ============================================================ */

const SectionTitle = ({
  title,
  description,
}) => (
  <div className="mb-3 px-1">
    <h2 className="text-xs font-black uppercase tracking-[2.5px] text-zinc-300">
      {title}
    </h2>

    <p className="text-[10px] text-zinc-600 mt-1">
      {description}
    </p>
  </div>
);

const StatusPill = ({
  icon,
  text,
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-zinc-500">
    {icon}
    {text}
  </span>
);

const MiniStat = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/5 bg-black/30 p-3">
    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700">
      {label}
    </p>

    <p className="text-sm font-black text-zinc-300 mt-1">
      {value}
    </p>
  </div>
);

const SettingsCategoryCard = ({
  section,
  active,
  onClick,
}) => {
  const Icon = section.icon;

  return (
    <motion.button
      type="button"
      whileTap={{
        scale: 0.98,
      }}
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all ${
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.06]"
          : "border-white/8 bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/15"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${section.bg} ${section.color}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
              {section.title}
            </h3>

            <ChevronRight
              size={15}
              className="text-zinc-700"
            />
          </div>

          <p className="text-[9px] text-zinc-600 leading-relaxed mt-1">
            {section.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

const SettingRow = ({
  icon,
  title,
  description,
  right,
  onClick,
  danger = false,
  border = true,
  disabled = false,
}) => (
  <div
    onClick={
      disabled || !onClick
        ? undefined
        : onClick
    }
    className={`flex items-center gap-3 p-4 sm:p-5 ${
      border
        ? "border-b border-white/5"
        : ""
    } ${
      onClick && !disabled
        ? "cursor-pointer hover:bg-white/[0.025]"
        : ""
    } ${
      disabled
        ? "opacity-50"
        : ""
    } transition-colors`}
  >
    <div
      className={`w-10 h-10 shrink-0 rounded-xl border border-white/5 bg-black flex items-center justify-center ${
        danger
          ? "text-red-400"
          : "text-zinc-400"
      }`}
    >
      {icon}
    </div>

    <div className="min-w-0 flex-1">
      <h3
        className={`text-[11px] sm:text-xs font-bold ${
          danger
            ? "text-red-400"
            : "text-zinc-300"
        }`}
      >
        {title}
      </h3>

      {description && (
        <p className="text-[9px] sm:text-[10px] text-zinc-600 leading-relaxed mt-1">
          {description}
        </p>
      )}
    </div>

    {right && (
      <div className="shrink-0">
        {right}
      </div>
    )}
  </div>
);

const Toggle = ({
  active,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onChange?.(!active);
    }}
    className={`relative w-11 h-6 rounded-full transition-all ${
      active
        ? "bg-cyan-500"
        : "bg-zinc-800"
    } ${
      disabled
        ? "opacity-40 cursor-not-allowed"
        : ""
    }`}
    aria-pressed={active}
  >
    <motion.span
      animate={{
        x: active ? 22 : 3,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-lg"
    />
  </button>
);

const Badge = ({
  children,
  tone = "default",
}) => {
  const tones = {
    default:
      "bg-white/5 text-zinc-500 border-white/10",
    cyan:
      "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
    green:
      "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    yellow:
      "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    red:
      "bg-red-400/10 text-red-400 border-red-400/20",
  };

  return (
    <span
      className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const SelectBox = ({
  value,
  onChange,
  options,
}) => (
  <select
    value={value || ""}
    onChange={(event) =>
      onChange(event.target.value)
    }
    className="max-w-[150px] bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-300 outline-none"
  >
    {options.map((option) => (
      <option
        key={option.value}
        value={option.value}
      >
        {option.label}
      </option>
    ))}
  </select>
);

const ActionButton = ({
  children,
  onClick,
  icon,
  danger = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition ${
      danger
        ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
        : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
    }`}
  >
    {icon}
    {children}
  </button>
);

const ComingSoon = ({
  text = "Backend configuration required",
}) => (
  <Badge>{text}</Badge>
);

/* ============================================================
   ACCOUNT
   ============================================================ */

const AccountSection = ({
  profile,
  socialLinks,
  creatorLevel,
  creatorXP,
  profileCompletion,
  verified,
  onUpdate,
  navigate,
}) => {
  return (
    <div>
      <SettingRow
        icon={<User size={18} />}
        title="Account Information"
        description="Username, display name, full name, bio, profile media, birthday and contact information."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/edit-profile")
        }
      />

      <SettingRow
        icon={<Camera size={18} />}
        title="Profile Photo & Cover"
        description="Manage your avatar and cover image."
        right={
          <div className="flex gap-2">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-lg object-cover"
              />
            )}

            {profile?.cover_url && (
              <img
                src={profile.cover_url}
                alt=""
                className="w-8 h-8 rounded-lg object-cover"
              />
            )}
          </div>
        }
        onClick={() =>
          navigate("/edit-profile")
        }
      />

      <SettingRow
        icon={<AtSignIcon />}
        title="Username"
        description={`@${String(
          profile?.username || "not set"
        ).replace(/^@/, "")}`}
      />

      <SettingRow
        icon={<UserCheck size={18} />}
        title="Account Type"
        description="Personal, creator, professional or business account."
        right={
          <SelectBox
            value={
              profile?.account_type ||
              "personal"
            }
            onChange={(value) =>
              onUpdate({
                account_type: value,
              })
            }
            options={[
              {
                value: "personal",
                label: "Personal",
              },
              {
                value: "creator",
                label: "Creator",
              },
              {
                value: "professional",
                label: "Professional",
              },
              {
                value: "business",
                label: "Business",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Sparkles size={18} />}
        title="Creator Mode"
        description="Enable creator tools and creator-focused experiences."
        right={
          <Toggle
            active={Boolean(
              profile?.creator_mode
            )}
            onChange={(value) =>
              onUpdate({
                creator_mode: value,
              })
            }
          />
        }
      />

      <SettingRow
        icon={<BarChart3 size={18} />}
        title="Professional Dashboard"
        description="Analytics, audience, performance and growth tools."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/universe-tools")
        }
      />

      <SettingRow
        icon={<ShieldCheck size={18} />}
        title="Verification"
        description={
          verified
            ? "Your account is verified."
            : "Your account is not currently verified."
        }
        right={
          <Badge
            tone={
              verified
                ? "cyan"
                : "default"
            }
          >
            {verified
              ? "Verified"
              : "Not verified"}
          </Badge>
        }
      />

      <SettingRow
        icon={<Award size={18} />}
        title="Creator Level & XP"
        description="Your current creator progression."
        right={
          <div className="text-right">
            <p className="text-xs font-black text-yellow-400">
              Level {creatorLevel}
            </p>

            <p className="text-[8px] text-zinc-600">
              {formatNumber(
                creatorXP
              )}{" "}
              XP
            </p>
          </div>
        }
      />

      <SettingRow
        icon={<Zap size={18} />}
        title="Profile Completion"
        description="Complete more profile information to improve your profile."
        right={
          <div className="w-24">
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    profileCompletion
                  )}%`,
                }}
              />
            </div>

            <p className="text-[8px] text-zinc-600 text-right mt-1">
              {profileCompletion}%
            </p>
          </div>
        }
      />

      <SettingRow
        icon={<Mail size={18} />}
        title="Email"
        description={
          profile?.email ||
          "Managed through authentication"
        }
        right={
          <Badge
            tone={
              profile?.email
                ? "green"
                : "default"
            }
          >
            {profile?.email
              ? "Available"
              : "Auth"}
          </Badge>
        }
      />

      <SettingRow
        icon={<Phone size={18} />}
        title="Phone Number"
        description={
          profile?.phone_number ||
          "No phone number added"
        }
      />

      <SettingRow
        icon={<MapPinIcon />}
        title="Location"
        description={[
          profile?.city,
          profile?.district,
          profile?.region,
          profile?.country,
        ]
          .filter(Boolean)
          .join(", ") ||
          "No location set"}
      />

      <SettingRow
        icon={<Globe size={18} />}
        title="Website & Social Links"
        description={
          socialLinks.website ||
          socialLinks.instagram ||
          socialLinks.youtube ||
          "No social links added"
        }
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />

      <SettingRow
        icon={<CalendarDays size={18} />}
        title="Account Created"
        description={formatDate(
          profile?.created_at
        )}
      />

      <SettingRow
        icon={<Fingerprint size={18} />}
        title="Account ID"
        description={
          profile?.id || "Unavailable"
        }
      />

      <SettingRow
        icon={<Settings2 size={18} />}
        title="Account Status"
        description="Current state of your account."
        right={
          <Badge
            tone={
              profile?.account_status ===
              "active"
                ? "green"
                : "default"
            }
          >
            {profile?.account_status ||
              "unknown"}
          </Badge>
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   SECURITY
   ============================================================ */

const SecuritySection = ({
  profile,
  user,
  navigate,
}) => {
  return (
    <div>
      <SettingRow
        icon={<KeyRound size={18} />}
        title="Change Password"
        description="Update the password used to access your account."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/settings/security")
        }
      />

      <SettingRow
        icon={<Mail size={18} />}
        title="Email Verification"
        description={
          user?.email_confirmed_at
            ? "Your email address is verified."
            : "Your email address still needs verification."
        }
        right={
          <Badge
            tone={
              user?.email_confirmed_at
                ? "green"
                : "yellow"
            }
          >
            {user?.email_confirmed_at
              ? "Verified"
              : "Pending"}
          </Badge>
        }
      />

      <SettingRow
        icon={<Phone size={18} />}
        title="Phone Verification"
        description={
          profile?.phone_number
            ? "A phone number is associated with your profile."
            : "Add a phone number for recovery and verification."
        }
        right={
          <ComingSoon text="Verification" />
        }
      />

      <SettingRow
        icon={<ShieldCheck size={18} />}
        title="Two-Factor Authentication"
        description="Add another security layer when signing in."
        right={
          <ComingSoon text="Not configured" />
        }
      />

      <SettingRow
        icon={<Smartphone size={18} />}
        title="Authenticator App"
        description="Use an authenticator application for verification codes."
        right={
          <ComingSoon text="Not configured" />
        }
      />

      <SettingRow
        icon={<MessageSquare size={18} />}
        title="SMS Verification"
        description="Use SMS as a verification method."
        right={
          <ComingSoon text="Not configured" />
        }
      />

      <SettingRow
        icon={<Fingerprint size={18} />}
        title="Passkeys"
        description="Passwordless authentication using supported devices."
        right={
          <ComingSoon text="Not configured" />
        }
      />

      <SettingRow
        icon={<AlertTriangle size={18} />}
        title="Login Alerts"
        description="Receive alerts when a new login is detected."
        right={
          <Toggle
            active={true}
            onChange={() => {}}
          />
        }
      />

      <SettingRow
        icon={<ShieldAlert size={18} />}
        title="Suspicious Login Detection"
        description="Security monitoring for unusual account activity."
        right={
          <Badge tone="green">
            Protected
          </Badge>
        }
      />

      <SettingRow
        icon={<History size={18} />}
        title="Login History"
        description="Review recent account login events."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/settings/security")
        }
      />

      <SettingRow
        icon={<Smartphone size={18} />}
        title="Active Sessions"
        description="Review devices currently signed into your account."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/settings/security")
        }
      />

      <SettingRow
        icon={<LogOut size={18} />}
        title="Logout All Devices"
        description="End sessions across your devices."
        right={
          <ComingSoon text="Security action" />
        }
      />

      <SettingRow
        icon={<Shield size={18} />}
        title="Trusted Devices"
        description="Manage devices you trust for future sign-ins."
        right={
          <ComingSoon text="Not configured" />
        }
      />

      <SettingRow
        icon={<Mail size={18} />}
        title="Recovery Email / Phone"
        description="Recovery contact information for your account."
        right={
          <ComingSoon text="Configure" />
        }
      />

      <SettingRow
        icon={<Link2 size={18} />}
        title="Connected Apps & Permissions"
        description="Third-party applications authorized to access your account."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/settings/apps")
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

const NotificationsSection = ({
  settings,
  setSettings,
  onSave,
}) => {
  const update = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const groups = [
    {
      title: "Activity",
      items: [
        ["followers", "Followers"],
        ["likes", "Likes"],
        ["comments", "Comments"],
        ["replies", "Replies"],
        ["mentions", "Mentions"],
        ["shares", "Shares"],
        ["reposts", "Reposts"],
        ["saves", "Saves"],
      ],
    },
    {
      title: "Creator & Monetization",
      items: [
        ["gifts", "Gifts"],
        ["live", "Live"],
        ["subscribers", "Subscribers"],
        ["payments", "Subscription payments"],
        ["creatorFund", "Creator fund"],
        ["earnings", "Earnings"],
        ["payouts", "Payouts"],
      ],
    },
    {
      title: "Content",
      items: [
        ["videoProcessing", "Video processing"],
        ["publishing", "Publishing"],
        ["scheduling", "Scheduled content"],
        ["copyright", "Copyright"],
        ["warnings", "Content warnings"],
      ],
    },
    {
      title: "System",
      items: [
        ["security", "Account security"],
        ["system", "System notifications"],
      ],
    },
  ];

  return (
    <div>
      {groups.map((group) => (
        <div
          key={group.title}
          className="border-b border-white/5 last:border-b-0"
        >
          <div className="px-5 py-4 bg-white/[0.015]">
            <h3 className="text-[9px] uppercase tracking-[2px] font-black text-zinc-600">
              {group.title}
            </h3>
          </div>

          {group.items.map(
            ([key, label]) => (
              <SettingRow
                key={key}
                icon={<Bell size={17} />}
                title={label}
                right={
                  <Toggle
                    active={Boolean(
                      settings[key]
                    )}
                    onChange={(value) =>
                      update(
                        key,
                        value
                      )
                    }
                  />
                }
              />
            )
          )}
        </div>
      ))}

      <div className="px-5 py-4">
        <h3 className="text-[9px] uppercase tracking-[2px] font-black text-zinc-600 mb-2">
          Delivery
        </h3>

        {[
          ["push", "Push notifications"],
          ["email", "Email notifications"],
          ["sms", "SMS notifications"],
          ["inApp", "In-app notifications"],
          ["sounds", "Notification sounds"],
          ["vibration", "Vibration"],
          ["quietHours", "Quiet hours"],
        ].map(([key, label]) => (
          <SettingRow
            key={key}
            icon={<Zap size={16} />}
            title={label}
            right={
              <Toggle
                active={Boolean(
                  settings[key]
                )}
                onChange={(value) =>
                  update(
                    key,
                    value
                  )
                }
              />
            }
          />
        ))}

        <div className="mt-4">
          <ActionButton
            icon={<Save size={14} />}
            onClick={onSave}
          >
            Save notifications
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   PRIVACY
   ============================================================ */

const PrivacySection = ({
  profile,
  settings,
  onUpdate,
  navigate,
}) => {
  const value = (key, fallback = false) =>
    settings[key] ??
    fallback;

  return (
    <div>
      <SettingRow
        icon={<Lock size={18} />}
        title="Private Account"
        description="Only approved people can follow you and view protected content."
        right={
          <Toggle
            active={Boolean(
              profile?.is_private
            )}
            onChange={(next) =>
              onUpdate(
                "privateAccount",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<UserPlus size={18} />}
        title="Who Can Follow You"
        description="Control who can follow your account."
        right={
          <SelectBox
            value={
              settings.whoCanFollow ||
              (profile?.is_private
                ? "requests"
                : "everyone")
            }
            onChange={(next) =>
              onUpdate(
                "whoCanFollow",
                next
              )
            }
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "requests",
                label: "Requests",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<MessageCircle size={18} />}
        title="Who Can Message You"
        description="Control direct messages and message requests."
        right={
          <SelectBox
            value={
              settings.whoCanMessage ||
              "everyone"
            }
            onChange={(next) =>
              onUpdate(
                "whoCanMessage",
                next
              )
            }
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<AtSignIcon />}
        title="Mentions"
        description="Choose who can mention you."
        right={
          <SelectBox
            value={
              settings.mentions ||
              "everyone"
            }
            onChange={(next) =>
              onUpdate(
                "mentions",
                next
              )
            }
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Tag size={18} />}
        title="Tags"
        description="Control who can tag you in content."
        right={
          <SelectBox
            value={
              settings.tags ||
              "everyone"
            }
            onChange={(next) =>
              onUpdate(
                "tags",
                next
              )
            }
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Search size={18} />}
        title="Search Visibility"
        description="Allow your profile to appear in search results."
        right={
          <Toggle
            active={value(
              "searchVisibility",
              true
            )}
            onChange={(next) =>
              onUpdate(
                "searchVisibility",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<Activity size={18} />}
        title="Online Status"
        description="Show when you are currently online."
        right={
          <Toggle
            active={
              profile?.is_online ??
              profile?.online ??
              true
            }
            onChange={(next) =>
              onUpdate(
                "onlineVisibility",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<History size={18} />}
        title="Last Active"
        description="Show when you were last active."
        right={
          <Toggle
            active={value(
              "lastActive",
              true
            )}
            onChange={(next) =>
              onUpdate(
                "lastActive",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<Eye size={18} />}
        title="Profile Views"
        description="Control profile-view visibility."
        right={
          <Toggle
            active={value(
              "profileViews",
              false
            )}
            onChange={(next) =>
              onUpdate(
                "profileViews",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<Heart size={18} />}
        title="Like History"
        description="Control visibility of your liked content."
        right={
          <Toggle
            active={value(
              "likeHistory",
              false
            )}
            onChange={(next) =>
              onUpdate(
                "likeHistory",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<MapPinIcon />}
        title="Location Visibility"
        description="Current database setting for location visibility."
        right={
          <Badge>
            {profile?.location_visibility ||
              "district"}
          </Badge>
        }
      />

      <SettingRow
        icon={<MapPinIcon />}
        title="GPS Sharing"
        description="Control whether GPS location sharing is enabled."
        right={
          <Toggle
            active={Boolean(
              profile?.gps_sharing
            )}
            onChange={(next) =>
              onUpdate(
                "gpsSharing",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<CalendarDays size={18} />}
        title="Birthday Visibility"
        description="Control who can see your birthday."
        right={
          <Badge>
            {profile?.birthday_visibility ||
              "private"}
          </Badge>
        }
      />

      <SettingRow
        icon={<User size={18} />}
        title="Gender Visibility"
        description="Control who can see your gender."
        right={
          <Badge>
            {profile?.gender_visibility ||
              "private"}
          </Badge>
        }
      />

      <SettingRow
        icon={<Phone size={18} />}
        title="Phone Visibility"
        description="Control who can see your phone number."
        right={
          <Badge>
            {profile?.phone_visibility ||
              "private"}
          </Badge>
        }
      />

      <SettingRow
        icon={<Shield size={18} />}
        title="Blocked Accounts"
        description="Manage people you have blocked."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        onClick={() =>
          navigate("/settings/privacy")
        }
      />

      <SettingRow
        icon={<EyeOff size={18} />}
        title="Muted Accounts"
        description="Manage accounts whose content you have muted."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />

      <SettingRow
        icon={<UserMinus size={18} />}
        title="Restricted Accounts"
        description="Manage restricted interactions."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   CONTENT
   ============================================================ */

const ContentSection = ({
  settings,
  onUpdate,
}) => {
  const value = (key, fallback) =>
    settings[key] ??
    fallback;

  const controls = [
    [
      "comments",
      "Comments",
      true,
    ],
    [
      "downloads",
      "Downloads",
      false,
    ],
    [
      "duet",
      "Duet",
      false,
    ],
    [
      "stitch",
      "Stitch",
      false,
    ],
    [
      "repost",
      "Repost",
      true,
    ],
    [
      "share",
      "Sharing",
      true,
    ],
  ];

  return (
    <div>
      <SettingRow
        icon={<Eye size={18} />}
        title="Default Video Privacy"
        description="Privacy applied when you publish new videos."
        right={
          <SelectBox
            value={
              settings.defaultPrivacy ||
              "public"
            }
            onChange={(next) =>
              onUpdate(
                "defaultPrivacy",
                next
              )
            }
            options={[
              {
                value: "public",
                label: "Public",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "private",
                label: "Private",
              },
            ]}
          />
        }
      />

      {controls.map(
        ([key, title, fallback]) => (
          <SettingRow
            key={key}
            icon={<Video size={17} />}
            title={title}
            right={
              <Toggle
                active={Boolean(
                  value(
                    key,
                    fallback
                  )
                )}
                onChange={(next) =>
                  onUpdate(
                    key,
                    next
                  )
                }
              />
            }
          />
        )
      )}

      <SettingRow
        icon={<AlertTriangle size={18} />}
        title="Age Restriction"
        description="Restrict content to appropriate age groups."
        right={
          <SelectBox
            value={
              settings.ageRestriction ||
              "none"
            }
            onChange={(next) =>
              onUpdate(
                "ageRestriction",
                next
              )
            }
            options={[
              {
                value: "none",
                label: "None",
              },
              {
                value: "13+",
                label: "13+",
              },
              {
                value: "16+",
                label: "16+",
              },
              {
                value: "18+",
                label: "18+",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<ShieldAlert size={18} />}
        title="Sensitive Content"
        description="Control how sensitive content is displayed."
        right={
          <SelectBox
            value={
              settings.sensitiveContent ||
              "standard"
            }
            onChange={(next) =>
              onUpdate(
                "sensitiveContent",
                next
              )
            }
            options={[
              {
                value: "standard",
                label: "Standard",
              },
              {
                value: "less",
                label: "Less",
              },
              {
                value: "more",
                label: "More",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Bot size={18} />}
        title="AI Disclosure"
        description="Disclose when content contains AI-generated or AI-modified material."
        right={
          <Toggle
            active={Boolean(
              value(
                "aiDisclosure",
                true
              )
            )}
            onChange={(next) =>
              onUpdate(
                "aiDisclosure",
                next
              )
            }
          />
        }
      />

      <SettingRow
        icon={<Music size={18} />}
        title="Music & Sound"
        description="Manage music and sound usage on published content."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />

      <SettingRow
        icon={<Upload size={18} />}
        title="Upload Quality"
        description="Choose your preferred upload quality."
        right={
          <SelectBox
            value={
              settings.uploadQuality ||
              "high"
            }
            onChange={(next) =>
              onUpdate(
                "uploadQuality",
                next
              )
            }
            options={[
              {
                value: "dataSaver",
                label: "Data saver",
              },
              {
                value: "standard",
                label: "Standard",
              },
              {
                value: "high",
                label: "High",
              },
              {
                value: "original",
                label: "Original",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Image size={18} />}
        title="Thumbnail & Caption Defaults"
        description="Manage default publishing metadata preferences."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   COMMENTS + MESSAGES
   ============================================================ */

const CommentsMessagesSection = ({
  profile,
  navigate,
  onUpdate,
}) => {
  const settings = safeJson(
    profile?.content_settings,
    {}
  );

  return (
    <div>
      <SettingRow
        icon={<MessageCircle size={18} />}
        title="Who Can Comment"
        description="Control who is allowed to comment on your content."
        right={
          <SelectBox
            value={
              settings.whoCanComment ||
              "everyone"
            }
            onChange={(value) =>
              onUpdate(
                "whoCanComment",
                value
              )
            }
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<ShieldAlert size={18} />}
        title="Offensive Comment Filter"
        description="Automatically filter potentially offensive comments."
        right={
          <Toggle
            active={
              settings.offensiveFilter ??
              true
            }
            onChange={(value) =>
              onUpdate(
                "offensiveFilter",
                value
              )
            }
          />
        }
      />

      <SettingRow
        icon={<ListFilter size={18} />}
        title="Spam Filter"
        description="Filter likely spam comments."
        right={
          <Toggle
            active={
              settings.spamFilter ??
              true
            }
            onChange={(value) =>
              onUpdate(
                "spamFilter",
                value
              )
            }
          />
        }
      />

      <SettingRow
        icon={<Tag size={18} />}
        title="Hidden Words"
        description="Create a list of words and phrases to hide."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />

      <SettingRow
        icon={<Settings2 size={18} />}
        title="Manual Moderation"
        description="Review and manage comments manually."
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />

      <SettingRow
        icon={<MessageSquare size={18} />}
        title="Message Requests"
        description="Control whether people outside your connections can send requests."
        right={
          <SelectBox
            value="everyone"
            onChange={() => {}}
            options={[
              {
                value: "everyone",
                label: "Everyone",
              },
              {
                value: "followers",
                label: "Followers",
              },
              {
                value: "nobody",
                label: "Nobody",
              },
            ]}
          />
        }
      />

      <SettingRow
        icon={<Users size={18} />}
        title="Group Messages"
        description="Control group conversation invitations."
        right={
          <ComingSoon text="Configure" />
        }
      />

      <SettingRow
        icon={<Check size={18} />}
        title="Read Receipts"
        description="Show when messages have been read."
        right={
          <Toggle
            active={true}
            onChange={() => {}}
          />
        }
      />

      <SettingRow
        icon={<MoreHorizontal size={18} />}
        title="Typing Indicators"
        description="Show when you are typing."
        right={
          <Toggle
            active={true}
            onChange={() => {}}
          />
        }
      />

      <SettingRow
        icon={<Bell size={18} />}
        title="Message Notifications"
        description="Manage message notification behavior."
        right={
          <Toggle
            active={true}
            onChange={() => {}}
          />
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   FOLLOWERS
   ============================================================ */

const FollowersSection = ({
  profile,
  navigate,
}) => (
  <div>
    <SettingRow
      icon={<UserPlus size={18} />}
      title="Follow Requests"
      description="Manage incoming follow requests."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Users size={18} />}
      title="Follower Management"
      description={`You currently have ${formatNumber(
        profile?.follower_count
      )} followers.`}
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<UserMinus size={18} />}
      title="Remove Followers"
      description="Remove followers without blocking them."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Shield size={18} />}
      title="Blocked / Restricted"
      description="Manage blocked and restricted accounts."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Sparkles size={18} />}
      title="Account Suggestions"
      description="Control whether your account is recommended to others."
      right={
        <Toggle
          active={true}
          onChange={() => {}}
        />
      }
    />

    <SettingRow
      icon={<Smartphone size={18} />}
      title="Contact Syncing"
      description="Find friends by syncing your contacts."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<Search size={18} />}
      title="Find Friends"
      description="Discover people you may know."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/friends")
      }
      border={false}
    />
  </div>
);

/* ============================================================
   DATA + STORAGE
   ============================================================ */

const DataStorageSection = ({
  profile,
  dataSaver,
  toggleDataSaver,
  storage,
  refreshStorage,
  clearLocalData,
}) => (
  <div>
    <SettingRow
      icon={<Database size={18} />}
      title="Data Saver"
      description="Reduce media quality and data usage on mobile networks."
      right={
        <Toggle
          active={dataSaver}
          onChange={toggleDataSaver}
        />
      }
    />

    <SettingRow
      icon={<Wifi size={18} />}
      title="Autoplay"
      description="Control automatic playback of videos."
      right={
        <SelectBox
          value="wifi"
          onChange={() => {}}
          options={[
            {
              value: "always",
              label: "Always",
            },
            {
              value: "wifi",
              label: "Wi-Fi only",
            },
            {
              value: "never",
              label: "Never",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Video size={18} />}
      title="Video Quality"
      description="Default playback quality."
      right={
        <SelectBox
          value={
            dataSaver
              ? "dataSaver"
              : "auto"
          }
          onChange={() => {}}
          options={[
            {
              value: "dataSaver",
              label: "Data saver",
            },
            {
              value: "auto",
              label: "Auto",
            },
            {
              value: "high",
              label: "High",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<HardDrive size={18} />}
      title="Browser Storage"
      description="Storage currently measurable from local browser data."
      right={
        <Badge tone="cyan">
          {formatBytes(
            storage.localStorageBytes
          )}
        </Badge>
      }
    />

    <SettingRow
      icon={<Folder size={18} />}
      title="Videos & Drafts"
      description="Manage drafts and locally stored content."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Image size={18} />}
      title="Images & Thumbnails"
      description="Manage image and thumbnail storage."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Music size={18} />}
      title="Audio"
      description="Manage saved audio and sounds."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Video size={18} />}
      title="Live Recordings"
      description="Manage recordings generated from live streams."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Download size={18} />}
      title="Downloaded / Offline Content"
      description="Manage locally available offline content."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <div className="p-5 flex flex-wrap gap-2">
      <ActionButton
        icon={<RefreshCw size={14} />}
        onClick={refreshStorage}
      >
        Refresh storage
      </ActionButton>

      <ActionButton
        icon={<Trash2 size={14} />}
        onClick={clearLocalData}
        danger
      >
        Clear temporary data
      </ActionButton>
    </div>

    <div className="px-5 pb-5">
      <p className="text-[9px] text-zinc-700 leading-relaxed">
        Storage reporting depends on browser APIs.
        Supabase Storage usage for videos, images,
        audio and recordings should be calculated
        from the actual storage backend rather than
        displaying invented values.
      </p>
    </div>
  </div>
);

/* ============================================================
   LANGUAGE
   ============================================================ */

const LanguageRegionSection = ({
  profile,
  onUpdate,
}) => (
  <div>
    <SettingRow
      icon={<Languages size={18} />}
      title="App Language"
      description="Language used throughout the application."
      right={
        <SelectBox
          value="English"
          onChange={() => {}}
          options={[
            {
              value: "English",
              label: "English",
            },
            {
              value: "Chichewa",
              label: "Chichewa",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Globe size={18} />}
      title="Country"
      description="Your account country."
      right={
        <Badge>
          {profile?.country ||
            "Malawi"}
        </Badge>
      }
    />

    <SettingRow
      icon={<MapPinIcon />}
      title="Region"
      description="Regional account preference."
      right={
        <Badge>
          {profile?.region ||
            "Not set"}
        </Badge>
      }
    />

    <SettingRow
      icon={<MapPinIcon />}
      title="City"
      description="City associated with your profile."
      right={
        <Badge>
          {profile?.city ||
            "Not set"}
        </Badge>
      }
    />

    <SettingRow
      icon={<ClockIcon />}
      title="Timezone"
      description="Default platform timezone."
      right={
        <Badge tone="cyan">
          {MALAWI_TIMEZONE}
        </Badge>
      }
    />

    <SettingRow
      icon={<Languages size={18} />}
      title="Preferred Content Language"
      description="Used for content recommendations."
      right={
        <SelectBox
          value="English"
          onChange={() => {}}
          options={[
            {
              value: "English",
              label: "English",
            },
            {
              value: "Chichewa",
              label: "Chichewa",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Globe size={18} />}
      title="Translation"
      description="Enable translation tools for supported content."
      right={
        <Toggle
          active={true}
          onChange={() => {}}
        />
      }
    />

    <SettingRow
      icon={<Languages size={18} />}
      title="Auto Translate"
      description="Automatically translate supported content."
      right={
        <Toggle
          active={false}
          onChange={() => {}}
        />
      }
    />

    <SettingRow
      icon={<CreditCard size={18} />}
      title="Currency"
      description="Currency used for creator and payment information."
      right={
        <SelectBox
          value={
            profile?.currency_preference ||
            "MWK"
          }
          onChange={(value) =>
            onUpdate({
              currency_preference:
                value,
            })
          }
          options={[
            {
              value: "MWK",
              label: "MWK",
            },
            {
              value: "USD",
              label: "USD",
            },
            {
              value: "ZAR",
              label: "ZAR",
            },
          ]}
        />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   APPEARANCE
   ============================================================ */

const AppearanceSection = ({
  settings,
  onUpdate,
}) => (
  <div>
    <SettingRow
      icon={<Palette size={18} />}
      title="Theme"
      description="Choose the application appearance."
      right={
        <SelectBox
          value={settings.theme}
          onChange={(value) =>
            onUpdate("theme", value)
          }
          options={[
            {
              value: "dark",
              label: "Dark",
            },
            {
              value: "light",
              label: "Light",
            },
            {
              value: "system",
              label: "System",
            },
            {
              value: "neon",
              label: "Neon",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Sparkles size={18} />}
      title="Neon Mode"
      description="Use the futuristic neon visual system."
      right={
        <Toggle
          active={Boolean(
            settings.neon
          )}
          onChange={(value) =>
            onUpdate("neon", value)
          }
        />
      }
    />

    <SettingRow
      icon={<Zap size={18} />}
      title="Accent Color"
      description="Primary highlight color."
      right={
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={
              settings.accentColor ||
              "#06b6d4"
            }
            onChange={(event) =>
              onUpdate(
                "accentColor",
                event.target.value
              )
            }
            className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
          />
        </div>
      }
    />

    <SettingRow
      icon={<LayoutGrid size={18} />}
      title="Density"
      description="Control spacing between interface elements."
      right={
        <SelectBox
          value={
            settings.density ||
            "comfortable"
          }
          onChange={(value) =>
            onUpdate(
              "density",
              value
            )
          }
          options={[
            {
              value: "compact",
              label: "Compact",
            },
            {
              value: "comfortable",
              label: "Comfortable",
            },
            {
              value: "spacious",
              label: "Spacious",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Zap size={18} />}
      title="Animations"
      description="Enable interface animations."
      right={
        <Toggle
          active={Boolean(
            settings.animations
          )}
          onChange={(value) =>
            onUpdate(
              "animations",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<PauseCircle size={18} />}
      title="Reduce Motion"
      description="Reduce animation and movement."
      right={
        <Toggle
          active={Boolean(
            settings.reduceMotion
          )}
          onChange={(value) =>
            onUpdate(
              "reduceMotion",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Cloud size={18} />}
      title="Blur Effects"
      description="Enable backdrop blur effects."
      right={
        <Toggle
          active={Boolean(
            settings.blur
          )}
          onChange={(value) =>
            onUpdate(
              "blur",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Sparkles size={18} />}
      title="Glass Effects"
      description="Enable glassmorphism interface elements."
      right={
        <Toggle
          active={Boolean(
            settings.glass
          )}
          onChange={(value) =>
            onUpdate(
              "glass",
              value
            )
          }
        />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   PAYMENTS
   ============================================================ */

const PaymentsSection = ({
  profile,
  currency,
  navigate,
}) => (
  <div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 border-b border-white/5">
      <WalletStat
        icon={<Wallet size={17} />}
        label="Balance"
        value={formatMoney(
          profile?.balance,
          currency
        )}
      />

      <WalletStat
        icon={<Coins size={17} />}
        label="Coins"
        value={formatNumber(
          profile?.coins
        )}
      />

      <WalletStat
        icon={<Sparkles size={17} />}
        label="Tokens earned"
        value={formatNumber(
          profile?.total_tokens_earned
        )}
      />

      <WalletStat
        icon={<Award size={17} />}
        label="Tier"
        value={
          profile?.subscription_tier ||
          "Free"
        }
      />
    </div>

    <SettingRow
      icon={<Wallet size={18} />}
      title="Wallet"
      description="Balance, coins, tokens and earnings."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/payouts")
      }
    />

    <SettingRow
      icon={<CreditCard size={18} />}
      title="Payment Method"
      description={
        profile?.payout_method ||
        "No payout method configured"
      }
      right={
        <Badge>
          {profile?.payout_method ||
            "Not set"}
        </Badge>
      }
    />

    <SettingRow
      icon={<Smartphone size={18} />}
      title="TNM Mpamba"
      description="Use supported mobile money payout infrastructure."
      right={
        profile?.payout_method ===
        "TNM Mpamba" ? (
          <Badge tone="green">
            Selected
          </Badge>
        ) : (
          <Badge>
            Available
          </Badge>
        )
      }
    />

    <SettingRow
      icon={<Smartphone size={18} />}
      title="Airtel Money"
      description="Use Airtel Money where supported."
      right={
        <Badge>
          Available
        </Badge>
      }
    />

    <SettingRow
      icon={<CreditCard size={18} />}
      title="Bank Account"
      description="Manage bank payout information."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<ArrowDownIcon />}
      title="Request Payout"
      description="Request available creator earnings."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/payouts")
      }
    />

    <SettingRow
      icon={<History size={18} />}
      title="Payout History"
      description="Pending, completed, failed and cancelled payouts."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/payouts")
      }
    />

    <SettingRow
      icon={<ClipboardList size={18} />}
      title="Transactions"
      description="Payments, purchases, gifts, coins, earnings and refunds."
      right={
        <ComingSoon text="Transaction center" />
      }
      border={false}
    />
  </div>
);

const WalletStat = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-white/5 bg-black p-4">
    <div className="text-emerald-400 mb-2">
      {icon}
    </div>

    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700">
      {label}
    </p>

    <p className="text-xs font-black text-zinc-300 mt-1 truncate">
      {value}
    </p>
  </div>
);

/* ============================================================
   CREATOR
   ============================================================ */

const CreatorSection = ({
  profile,
  creatorLevel,
  creatorXP,
  navigate,
}) => (
  <div>
    <div className="p-5 border-b border-white/5">
      <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.035] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-[2px] font-black text-cyan-400">
              Creator Level
            </p>

            <p className="text-3xl font-black mt-1">
              {creatorLevel}
            </p>
          </div>

          <Award
            size={34}
            className="text-yellow-400"
          />
        </div>

        <p className="text-[10px] text-zinc-600 mt-2">
          {formatNumber(
            creatorXP
          )}{" "}
          XP earned
        </p>
      </div>
    </div>

    {[
      [
        <BarChart3 size={18} />,
        "Creator Dashboard",
        "Analytics, audience and performance.",
        "/universe-tools",
      ],
      [
        <Users size={18} />,
        "Audience",
        "Understand followers and audience behavior.",
        null,
      ],
      [
        <Video size={18} />,
        "Content Performance",
        "Views, watch time, engagement and growth.",
        null,
      ],
      [
        <Wallet size={18} />,
        "Creator Earnings",
        "Earnings, gifts, subscriptions and creator fund.",
        "/payouts",
      ],
      [
        <GiftIcon />,
        "Gifts",
        "Manage gifts received during creator activity.",
        null,
      ],
      [
        <Star size={18} />,
        "Subscriptions",
        "Manage subscriber and paid-content settings.",
        null,
      ],
      [
        <Video size={18} />,
        "Livestream",
        "Live center, live settings and stream tools.",
        "/live-universe",
      ],
      [
        <CalendarDays size={18} />,
        "Scheduling",
        "Schedule videos and live sessions.",
        null,
      ],
      [
        <Folder size={18} />,
        "Content Library",
        "Manage your creator media.",
        null,
      ],
      [
        <BriefcaseBusiness size={18} />,
        "Media Kit",
        "Creator portfolio and collaboration information.",
        null,
      ],
      [
        <TargetIcon />,
        "Creator Goals",
        "Set and track creator growth goals.",
        null,
      ],
      [
        <Bot size={18} />,
        "AI Creator Tools",
        "Use AI for captions, scripts, analysis and moderation.",
        null,
      ],
    ].map(
      ([icon, title, description, route]) => (
        <SettingRow
          key={title}
          icon={icon}
          title={title}
          description={description}
          right={
            route ? (
              <ChevronRight
                size={17}
                className="text-zinc-700"
              />
            ) : (
              <ComingSoon text="Creator tools" />
            )
          }
          onClick={
            route
              ? () => navigate(route)
              : undefined
          }
        />
      )
    )}

    <SettingRow
      icon={<Tag size={18} />}
      title="Creator Category"
      description="Category used for your creator profile."
      right={
        <Badge>
          {profile?.creator_category ||
            profile?.profile_category ||
            "Not set"}
        </Badge>
      }
      border={false}
    />
  </div>
);

/* ============================================================
   SCHEDULING
   ============================================================ */

const SchedulingSection = ({
  navigate,
}) => (
  <div>
    <SettingRow
      icon={<CalendarDays size={18} />}
      title="Scheduled Videos"
      description="View and manage scheduled video publishing."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
    />

    <SettingRow
      icon={<Video size={18} />}
      title="Scheduled Lives"
      description="Manage upcoming livestream schedules."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/live-universe")
      }
    />

    <SettingRow
      icon={<Zap size={18} />}
      title="Auto Publishing"
      description="Automatically publish scheduled content."
      right={
        <Toggle
          active={false}
          onChange={() => {}}
        />
      }
    />

    <SettingRow
      icon={<ClockIcon />}
      title="Publishing Timezone"
      description="Timezone used when publishing scheduled content."
      right={
        <Badge tone="cyan">
          {MALAWI_TIMEZONE}
        </Badge>
      }
    />

    <SettingRow
      icon={<Bell size={18} />}
      title="Publishing Notifications"
      description="Notify you when scheduled content publishes."
      right={
        <Toggle
          active={true}
          onChange={() => {}}
        />
      }
    />

    <SettingRow
      icon={<AlertTriangle size={18} />}
      title="Failed Publishing Notifications"
      description="Notify you when scheduled publishing fails."
      right={
        <Toggle
          active={true}
          onChange={() => {}}
        />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   LIBRARY
   ============================================================ */

const LibrarySection = ({
  navigate,
}) => (
  <div>
    {[
      [
        <Video size={18} />,
        "Videos",
      ],
      [
        <Archive size={18} />,
        "Drafts",
      ],
      [
        <Image size={18} />,
        "Images",
      ],
      [
        <Music size={18} />,
        "Audio",
      ],
      [
        <Image size={18} />,
        "Thumbnails",
      ],
      [
        <Video size={18} />,
        "Live Recordings",
      ],
      [
        <Archive size={18} />,
        "Archived",
      ],
      [
        <Trash2 size={18} />,
        "Deleted",
      ],
      [
        <History size={18} />,
        "Recently Deleted",
      ],
    ].map(([icon, title]) => (
      <SettingRow
        key={title}
        icon={icon}
        title={title}
        description={`Manage your ${title.toLowerCase()} content.`}
        right={
          <ChevronRight
            size={17}
            className="text-zinc-700"
          />
        }
      />
    ))}

    <SettingRow
      icon={<HardDrive size={18} />}
      title="Storage Limits"
      description="Storage limits and usage should be calculated from the actual media backend."
      right={
        <ComingSoon text="Live storage data" />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   CREATOR PROGRESS
   ============================================================ */

const CreatorProgressSection = ({
  profile,
  level,
  xp,
  navigate,
}) => {
  const progress =
    ((xp % 1000) / 1000) * 100;

  return (
    <div>
      <div className="p-5 border-b border-white/5">
        <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.035] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[2px] text-yellow-400">
                Current Level
              </p>

              <p className="text-4xl font-black mt-1">
                {level}
              </p>
            </div>

            <Award
              size={40}
              className="text-yellow-400"
            />
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-700 mb-2">
              <span>XP</span>
              <span>
                {formatNumber(xp)}
              </span>
            </div>

            <div className="h-2 bg-black rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {[
        [
          <Award size={18} />,
          "Achievements",
        ],
        [
          <Star size={18} />,
          "Badges",
        ],
        [
          <Zap size={18} />,
          "Creator Streaks",
        ],
        [
          <TargetIcon />,
          "Milestones",
        ],
        [
          <TargetIcon />,
          "Goals",
        ],
        [
          <GiftIcon />,
          "Rewards",
        ],
        [
          <BarChart3 size={18} />,
          "Progress",
        ],
        [
          <Users size={18} />,
          "Leaderboards",
        ],
      ].map(([icon, title]) => (
        <SettingRow
          key={title}
          icon={icon}
          title={title}
          description={`View your creator ${title.toLowerCase()}.`}
          right={
            <ComingSoon text="Creator system" />
          }
        />
      ))}

      <SettingRow
        icon={<Award size={18} />}
        title="Profile Badges"
        description="Badges stored on your profile."
        right={
          <Badge>
            {Array.isArray(
              profile?.profile_badges
            )
              ? profile.profile_badges
                  .length
              : 0}{" "}
            badges
          </Badge>
        }
        border={false}
      />
    </div>
  );
};

/* ============================================================
   BRAND
   ============================================================ */

const BrandSection = ({
  profile,
}) => (
  <div>
    <SettingRow
      icon={<BriefcaseBusiness size={18} />}
      title="Brand Collaborations"
      description="Manage brand partnership opportunities."
      right={
        <ComingSoon text="Creator feature" />
      }
    />

    <SettingRow
      icon={<Mail size={18} />}
      title="Business Email"
      description={
        profile?.business_email ||
        "No business email configured"
      }
    />

    <SettingRow
      icon={<Phone size={18} />}
      title="Business Phone"
      description={
        profile?.business_phone ||
        "No business phone configured"
      }
    />

    <SettingRow
      icon={<Globe size={18} />}
      title="Creator Website"
      description={
        profile?.creator_website ||
        "No creator website configured"
      }
    />

    <SettingRow
      icon={<BriefcaseBusiness size={18} />}
      title="Portfolio"
      description="Showcase your creator portfolio."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<CreditCard size={18} />}
      title="Rate Card"
      description="Set your collaboration and sponsorship rates."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<MegaphoneIcon />}
      title="Sponsored Content"
      description="Manage sponsored content disclosures."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<BarChart3 size={18} />}
      title="Campaign Analytics"
      description="Track performance of creator campaigns."
      right={
        <ComingSoon text="Configure" />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   AI
   ============================================================ */

const AISection = ({
  navigate,
}) => (
  <div>
    {[
      [
        <Bot size={18} />,
        "AI Assistant",
        "Access AI assistance across Mpade Universe.",
      ],
      [
        <Sparkles size={18} />,
        "Recommendations",
        "Personalized content recommendations.",
      ],
      [
        <FileText size={18} />,
        "Caption Generation",
        "Generate captions for your content.",
      ],
      [
        <Tag size={18} />,
        "Hashtag Generation",
        "Generate relevant hashtags.",
      ],
      [
        <FileText size={18} />,
        "Script Generation",
        "Create scripts and content ideas.",
      ],
      [
        <Image size={18} />,
        "Thumbnail Assistance",
        "AI assistance for thumbnail creation.",
      ],
      [
        <Video size={18} />,
        "Video Analysis",
        "Analyze videos and performance.",
      ],
      [
        <MessageCircle size={18} />,
        "AI Comment Replies",
        "Generate suggested comment responses.",
      ],
      [
        <ShieldAlert size={18} />,
        "AI Moderation",
        "AI-assisted content moderation.",
      ],
      [
        <Settings2 size={18} />,
        "Personalization",
        "Control AI personalization.",
      ],
      [
        <Database size={18} />,
        "AI Data Usage",
        "Control how your data is used by AI features.",
      ],
      [
        <Info size={18} />,
        "AI Disclosure",
        "Manage AI-generated content disclosures.",
      ],
      [
        <History size={18} />,
        "AI History",
        "Review previous AI activity.",
      ],
      [
        <Trash2 size={18} />,
        "Clear AI History",
        "Remove available AI interaction history.",
      ],
    ].map(
      ([icon, title, description]) => (
        <SettingRow
          key={title}
          icon={icon}
          title={title}
          description={description}
          right={
            title ===
            "Personalization" ? (
              <Toggle
                active={true}
                onChange={() => {}}
              />
            ) : (
              <ComingSoon text="AI system" />
            )
          }
        />
      )
    )}
  </div>
);

/* ============================================================
   COPYRIGHT
   ============================================================ */

const CopyrightSafetySection = ({
  navigate,
}) => (
  <div>
    {[
      [
        <ShieldCheck size={18} />,
        "Copyright Status",
      ],
      [
        <AlertTriangle size={18} />,
        "Copyright Claims",
      ],
      [
        <AlertTriangle size={18} />,
        "Copyright Strikes",
      ],
      [
        <FileText size={18} />,
        "Disputes",
      ],
      [
        <FileText size={18} />,
        "Appeals",
      ],
      [
        <Music size={18} />,
        "Music Rights",
      ],
      [
        <UserCheck size={18} />,
        "Content Ownership",
      ],
      [
        <Bot size={18} />,
        "AI Disclosure",
      ],
      [
        <Shield size={18} />,
        "Community Guidelines",
      ],
      [
        <Flag size={18} />,
        "Content Violations",
      ],
      [
        <EyeOff size={18} />,
        "Removed / Restricted Content",
      ],
      [
        <AlertTriangle size={18} />,
        "Warnings",
      ],
    ].map(([icon, title]) => (
      <SettingRow
        key={title}
        icon={icon}
        title={title}
        description={`Manage ${title.toLowerCase()} information.`}
        right={
          title ===
          "Copyright Status" ? (
            <ChevronRight
              size={17}
              className="text-zinc-700"
            />
          ) : (
            <ComingSoon text="Safety center" />
          )
        }
        onClick={
          title ===
          "Copyright Status"
            ? () =>
                navigate(
                  "/settings/copyright"
                )
            : undefined
        }
      />
    ))}
  </div>
);

/* ============================================================
   REPORTS
   ============================================================ */

const ReportsSection = () => (
  <div>
    {[
      [
        <Download size={18} />,
        "Download Personal Data",
      ],
      [
        <BarChart3 size={18} />,
        "Export Analytics",
      ],
      [
        <Video size={18} />,
        "Export Videos",
      ],
      [
        <Wallet size={18} />,
        "Export Earnings",
      ],
      [
        <ClipboardList size={18} />,
        "Export Transactions",
      ],
      [
        <Users size={18} />,
        "Export Followers",
      ],
      [
        <FileText size={18} />,
        "Monthly Reports",
      ],
      [
        <Sparkles size={18} />,
        "Creator Reports",
      ],
      [
        <CreditCard size={18} />,
        "Financial Reports",
      ],
      [
        <FileArchive size={18} />,
        "Data Archive",
      ],
    ].map(([icon, title]) => (
      <SettingRow
        key={title}
        icon={icon}
        title={title}
        description={`Generate or download ${title.toLowerCase()}.`}
        right={
          <Badge>
            CSV / JSON / PDF
          </Badge>
        }
      />
    ))}
  </div>
);

/* ============================================================
   CONNECTED APPS
   ============================================================ */

const ConnectedAppsSection = () => (
  <div>
    <SettingRow
      icon={<Link2 size={18} />}
      title="Connected Apps"
      description="Applications connected to your Mpade Universe account."
      right={
        <ComingSoon text="OAuth manager" />
      }
    />

    <SettingRow
      icon={<LogIn size={18} />}
      title="OAuth Connections"
      description="Review external sign-in and authorization connections."
      right={
        <ComingSoon text="OAuth manager" />
      }
    />

    <SettingRow
      icon={<Smartphone size={18} />}
      title="Authorized Devices"
      description="Devices authorized to access your account."
      right={
        <ComingSoon text="Device manager" />
      }
    />

    <SettingRow
      icon={<KeyRound size={18} />}
      title="API Access"
      description="Manage API access tokens and integrations."
      right={
        <ComingSoon text="API manager" />
      }
    />

    <SettingRow
      icon={<Shield size={18} />}
      title="Third-Party Permissions"
      description="Review permissions granted to external services."
      right={
        <ComingSoon text="Permission manager" />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   ACCESSIBILITY
   ============================================================ */

const AccessibilitySection = ({
  settings,
  onUpdate,
}) => (
  <div>
    <SettingRow
      icon={<TypeIcon />}
      title="Font Size"
      description="Adjust text size throughout the application."
      right={
        <SelectBox
          value={settings.fontSize}
          onChange={(value) =>
            onUpdate(
              "fontSize",
              value
            )
          }
          options={[
            {
              value: "small",
              label: "Small",
            },
            {
              value: "medium",
              label: "Medium",
            },
            {
              value: "large",
              label: "Large",
            },
            {
              value: "xlarge",
              label: "Extra large",
            },
          ]}
        />
      }
    />

    <SettingRow
      icon={<Eye size={18} />}
      title="High Contrast"
      description="Increase contrast for improved readability."
      right={
        <Toggle
          active={
            settings.highContrast
          }
          onChange={(value) =>
            onUpdate(
              "highContrast",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<PauseCircle size={18} />}
      title="Reduce Motion"
      description="Reduce animations and motion effects."
      right={
        <Toggle
          active={
            settings.reduceMotion
          }
          onChange={(value) =>
            onUpdate(
              "reduceMotion",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<MessageSquare size={18} />}
      title="Captions"
      description="Enable captions when available."
      right={
        <Toggle
          active={
            settings.captions
          }
          onChange={(value) =>
            onUpdate(
              "captions",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Headphones size={18} />}
      title="Audio Descriptions"
      description="Enable audio descriptions when available."
      right={
        <Toggle
          active={
            settings.audioDescriptions
          }
          onChange={(value) =>
            onUpdate(
              "audioDescriptions",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Palette size={18} />}
      title="Color-Blind Friendly"
      description="Use an accessibility-friendly color palette."
      right={
        <Toggle
          active={
            settings.colorBlindFriendly
          }
          onChange={(value) =>
            onUpdate(
              "colorBlindFriendly",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Smartphone size={18} />}
      title="Large Touch Targets"
      description="Increase interactive target sizes."
      right={
        <Toggle
          active={
            settings.largeTouchTargets
          }
          onChange={(value) =>
            onUpdate(
              "largeTouchTargets",
              value
            )
          }
        />
      }
    />

    <SettingRow
      icon={<Headphones size={18} />}
      title="Screen Reader Support"
      description="Accessibility support for assistive technologies."
      right={
        <Toggle
          active={
            settings.screenReader
          }
          onChange={(value) =>
            onUpdate(
              "screenReader",
              value
            )
          }
        />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   SUPPORT
   ============================================================ */

const SupportSection = ({
  navigate,
}) => (
  <div>
    {[
      [
        <HelpCircle size={18} />,
        "Help Center",
        "/support",
      ],
      [
        <Flag size={18} />,
        "Report a Problem",
        "/support",
      ],
      [
        <Flag size={18} />,
        "Report Content",
        "/support",
      ],
      [
        <Shield size={18} />,
        "Copyright Support",
        "/settings/copyright",
      ],
      [
        <CreditCard size={18} />,
        "Payments Support",
        "/support",
      ],
      [
        <Sparkles size={18} />,
        "Creator Support",
        "/support",
      ],
      [
        <KeyRound size={18} />,
        "Account Recovery",
        "/support",
      ],
      [
        <ShieldCheck size={18} />,
        "Safety Center",
        "/support",
      ],
      [
        <FileText size={18} />,
        "Community Guidelines",
        "/support",
      ],
      [
        <FileText size={18} />,
        "Terms",
        "/terms",
      ],
      [
        <Eye size={18} />,
        "Privacy",
        "/privacy",
      ],
      [
        <Info size={18} />,
        "About Mpade Universe",
        "/about",
      ],
    ].map(
      ([icon, title, route]) => (
        <SettingRow
          key={title}
          icon={icon}
          title={title}
          description={`Open ${title.toLowerCase()}.`}
          right={
            <ChevronRight
              size={17}
              className="text-zinc-700"
            />
          }
          onClick={() =>
            navigate(route)
          }
        />
      )
    )}

    <SettingRow
      icon={<ClipboardList size={18} />}
      title="Support Tickets"
      description="Review your previous support requests."
      right={
        <ComingSoon text="Ticket system" />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   SYSTEM
   ============================================================ */

const SystemSection = ({
  profile,
  storage,
  refresh,
}) => (
  <div>
    <SettingRow
      icon={<Info size={18} />}
      title="App Version"
      description="Current application version."
      right={
        <Badge>
          {APP_VERSION}
        </Badge>
      }
    />

    <SettingRow
      icon={<Server size={18} />}
      title="Backend"
      description="Connection to application backend."
      right={
        <Badge tone="green">
          Available
        </Badge>
      }
    />

    <SettingRow
      icon={<Database size={18} />}
      title="Database"
      description="Supabase profile data connection."
      right={
        <Badge tone="green">
          Connected
        </Badge>
      }
    />

    <SettingRow
      icon={<HardDrive size={18} />}
      title="Storage"
      description="Media storage infrastructure."
      right={
        <ComingSoon text="Live diagnostics" />
      }
    />

    <SettingRow
      icon={<Bell size={18} />}
      title="Notification Service"
      description="Push and application notification infrastructure."
      right={
        <ComingSoon text="Live diagnostics" />
      }
    />

    <SettingRow
      icon={<Video size={18} />}
      title="Media Processing"
      description="Video and media processing infrastructure."
      right={
        <ComingSoon text="Live diagnostics" />
      }
    />

    <SettingRow
      icon={<RefreshCw size={18} />}
      title="Last Profile Sync"
      description={
        profile?.updated_at
          ? formatDate(
              profile.updated_at
            )
          : "Unknown"
      }
      right={
        <ActionButton
          icon={<RefreshCw size={13} />}
          onClick={refresh}
        >
          Refresh
        </ActionButton>
      }
    />

    <SettingRow
      icon={<Wifi size={18} />}
      title="Network"
      description="Current browser network state."
      right={
        <Badge
          tone={
            navigator.onLine
              ? "green"
              : "red"
          }
        >
          {navigator.onLine
            ? "Online"
            : "Offline"}
        </Badge>
      }
    />

    <SettingRow
      icon={<Cloud size={18} />}
      title="Background Sync"
      description="Synchronization of supported background tasks."
      right={
        <ComingSoon text="Configure" />
      }
    />

    <SettingRow
      icon={<Settings2 size={18} />}
      title="Diagnostics"
      description="Run application diagnostics."
      right={
        <ComingSoon text="Diagnostics" />
      }
    />

    <SettingRow
      icon={<FileText size={18} />}
      title="Error Logs"
      description="Application error and diagnostic logs."
      right={
        <ComingSoon text="Diagnostics" />
      }
    />

    <SettingRow
      icon={<Trash2 size={18} />}
      title="Temporary Data"
      description={`Browser storage currently measured at ${formatBytes(
        storage.localStorageBytes
      )}.`}
      right={
        <ComingSoon text="Use storage controls" />
      }
      border={false}
    />
  </div>
);

/* ============================================================
   ACCOUNT EXIT
   ============================================================ */

const AccountExitSection = ({
  navigate,
  onLogout,
}) => (
  <div>
    <div className="p-5 border-b border-white/5">
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className="text-red-400 shrink-0"
          />

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
              Account exit controls
            </h3>

            <p className="text-[10px] text-zinc-600 leading-relaxed mt-2">
              These actions can affect your access
              to your account and content. Download
              important information before permanently
              deleting your account.
            </p>
          </div>
        </div>
      </div>
    </div>

    <SettingRow
      icon={<Download size={18} />}
      title="Download Before Deletion"
      description="Export your personal information, content, reports and account data."
      right={
        <ChevronRight
          size={17}
          className="text-zinc-700"
        />
      }
      onClick={() =>
        navigate("/settings/reports")
      }
    />

    <SettingRow
      icon={<LogOut size={18} />}
      title="Log Out"
      description="Log out from this current session."
      right={
        <ActionButton
          icon={<LogOut size={13} />}
          onClick={onLogout}
        >
          Log out
        </ActionButton>
      }
    />

    <SettingRow
      icon={<LogOut size={18} />}
      title="Log Out All Devices"
      description="End all active sessions across your devices."
      right={
        <ComingSoon text="Security manager" />
      }
    />

    <SettingRow
      icon={<PauseCircle size={18} />}
      title="Deactivate Account"
      description="Temporarily disable your account."
      right={
        <ComingSoon text="Account action" />
      }
    />

    <SettingRow
      icon={<Trash2 size={18} />}
      title="Delete Account"
      description="Permanently delete your account and associated data."
      right={
        <ComingSoon text="Dangerous action" />
      }
      danger
      border={false}
    />
  </div>
);

/* ============================================================
   ICON HELPERS
   ============================================================ */

const AtSignIcon = () => (
  <span className="text-lg font-black">
    @
  </span>
);

const MapPinIcon = () => (
  <span className="text-lg">
    📍
  </span>
);

const ClockIcon = () => (
  <span className="text-lg">
    ◷
  </span>
);

const ArrowDownIcon = () => (
  <span className="text-lg">
    ↓
  </span>
);

const GiftIcon = () => (
  <span className="text-lg">
    🎁
  </span>
);

const TargetIcon = () => (
  <span className="text-lg">
    🎯
  </span>
);

const MegaphoneIcon = () => (
  <span className="text-lg">
    📢
  </span>
);

const TypeIcon = () => (
  <span className="text-lg font-black">
    A
  </span>
);

/* ============================================================
   DEFAULT EXPORT
   ============================================================ */

export default SettingsPage;
