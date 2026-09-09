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
  ArrowLeft,
  Award,
  Bell,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Coins,
  Copy,
  Database,
  Download,
  Eye,
  FileArchive,
  FileText,
  Globe,
  HardDrive,
  Image as ImageIcon,
  KeyRound,
  Languages,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Mic,
  Moon,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserMinus,
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

const PROFILE_COLUMNS = [
  "id",
  "full_name",
  "username",
  "bio",
  "district",
  "interests",
  "avatar_url",
  "created_at",
  "following_count",
  "follower_count",
  "total_likes",
  "balance",
  "total_tokens_earned",
  "subscription_tier",
  "phone_number",
  "coins",
  "cover_url",
  "gender",
  "dob",
  "location",
  "theme_preference",
  "accent_color",
  "profile_badges",
  "layout_style",
  "profile_video_url",
  "social_links",
  "payout_method",
  "currency_preference",
  "is_private",
  "profile_music_url",
  "status_message",
  "verified_status",
  "is_verified",
  "online",
  "display_name",
  "is_online",
  "account_status",
  "nickname",
  "name_pronunciation",
  "profile_headline",
  "pronouns",
  "profile_category",
  "account_type",
  "creator_mode",
  "profile_completion",
  "profile_video_thumbnail_url",
  "profile_video_enabled",
  "profile_music_autoplay",
  "profile_music_loop",
  "avatar_position",
  "cover_position",
  "media_privacy",
  "country",
  "region",
  "city",
  "location_visibility",
  "gps_sharing",
  "relationship_status",
  "occupation",
  "education",
  "school_university",
  "skills",
  "languages",
  "birthday_visibility",
  "gender_visibility",
  "phone_visibility",
  "custom_interests",
  "interest_discovery",
  "privacy_settings",
  "verification_settings",
  "financial_settings",
  "creator_settings",
  "appearance_settings",
  "content_settings",
  "discovery_settings",
  "advanced_settings",
  "sharing_settings",
  "edit_settings",
  "updated_at",
  "pro_account",
  "creator_category",
  "creator_website",
  "business_email",
  "business_phone",
  "creator_level",
  "creator_xp",
];

const JSON_SETTING_COLUMNS = [
  "privacy_settings",
  "verification_settings",
  "financial_settings",
  "creator_settings",
  "appearance_settings",
  "content_settings",
  "discovery_settings",
  "advanced_settings",
  "sharing_settings",
  "edit_settings",
];

const DEFAULT_JSON_SETTINGS = {
  privacy_settings: {
    whoCanFollow: "everyone",
    whoCanMessage: "everyone",
    whoCanMention: "everyone",
    whoCanTag: "everyone",
    searchVisibility: true,
    profileViews: true,
    activityVisibility: true,
    likeHistoryVisibility: "private",
    followingVisibility: "public",
    followerVisibility: "public",
    onlineStatus: true,
    lastActive: true,
    commentFiltering: true,
    hiddenWords: [],
  },

  verification_settings: {
    emailVerified: false,
    phoneVerified: false,
    twoFactorEnabled: false,
    authenticatorEnabled: false,
    smsVerificationEnabled: false,
    passkeysEnabled: false,
    loginAlerts: true,
    suspiciousLoginDetection: true,
  },

  financial_settings: {
    defaultPayoutMethod: "Mobile Money",
    autoPayout: false,
    payoutSchedule: "manual",
    minimumPayout: 0,
    paymentVerified: false,
  },

  creator_settings: {
    creatorDashboard: true,
    analytics: true,
    audienceInsights: true,
    contentPerformance: true,
    growthRecommendations: true,
    earnings: true,
    gifts: true,
    subscriptions: true,
    paidContent: false,
    livestream: true,
    scheduling: true,
    mediaKit: false,
    brandCollaboration: false,
    aiRecommendations: true,
    goals: true,
  },

  appearance_settings: {
    theme: "neon",
    accent: "#06b6d4",
    density: "comfortable",
    compactMode: false,
    animations: true,
    reduceMotion: false,
    blur: true,
    glass: true,
    fontSize: "medium",
    highContrast: false,
  },

  content_settings: {
    defaultPrivacy: "public",
    comments: true,
    downloads: true,
    duet: true,
    stitch: true,
    repost: true,
    sharing: true,
    ageRestriction: false,
    sensitiveContent: false,
    contentWarnings: true,
    aiDisclosure: true,
    autoplay: true,
    autoplayWifi: true,
    autoplayMobile: false,
    uploadQuality: "high",
    downloadQuality: "high",
  },

  discovery_settings: {
    contactSync: false,
    suggestAccount: true,
    discoverability: true,
    personalizedRecommendations: true,
    interestDiscovery: true,
  },

  advanced_settings: {
    backgroundSync: true,
    diagnostics: false,
    errorLogging: true,
    autoRefresh: true,
    offlineMode: true,
  },

  sharing_settings: {
    allowExternalSharing: true,
    allowProfileSharing: true,
    allowVideoSharing: true,
    allowMessageSharing: true,
    showShareCount: true,
  },

  edit_settings: {
    confirmBeforeDelete: true,
    autosave: true,
    showEditHistory: false,
  },
};

/* ============================================================
   SETTINGS CATEGORIES
============================================================ */

const SETTINGS_CATEGORIES = [
  {
    id: "account",
    title: "Account & Profile",
    description: "Manage your identity, profile and account type",
    icon: User,
    color: "cyan",
    keywords:
      "username display name full name profile photo cover bio birthday gender location website phone email verification account type creator professional business",
  },

  {
    id: "security",
    title: "Security & Login",
    description: "Protect your account and manage active devices",
    icon: ShieldCheck,
    color: "blue",
    keywords:
      "password security 2fa two factor authenticator sms passkey login alerts sessions devices recovery trusted logout",
  },

  {
    id: "privacy",
    title: "Privacy",
    description: "Control who can see and interact with you",
    icon: Lock,
    color: "purple",
    keywords:
      "private public followers messages mentions tags search visibility online profile views activity blocked muted restricted hidden words",
  },

  {
    id: "notifications",
    title: "Notifications",
    description: "Control alerts, sounds and notification channels",
    icon: Bell,
    color: "red",
    keywords:
      "followers likes comments replies mentions shares reposts saves gifts live subscribers earnings payouts security push email sms vibration quiet hours",
  },

  {
    id: "content",
    title: "Content",
    description: "Control publishing, playback and interaction permissions",
    icon: Video,
    color: "pink",
    keywords:
      "videos comments downloads duet stitch repost share upload quality autoplay age restriction sensitive ai copyright music",
  },

  {
    id: "comments",
    title: "Comments & Moderation",
    description: "Manage comments, filters and moderation",
    icon: MessageCircle,
    color: "orange",
    keywords:
      "comments spam offensive hidden blocked words moderation manual filters notifications",
  },

  {
    id: "messages",
    title: "Messages",
    description: "Control chats, requests and messaging privacy",
    icon: Send,
    color: "green",
    keywords:
      "messages requests groups read receipts typing notifications blocked muted who can message",
  },

  {
    id: "followers",
    title: "Followers & Audience",
    description: "Manage followers and discoverability",
    icon: Users,
    color: "emerald",
    keywords:
      "followers requests remove followers blocked restricted suggestions contact syncing friends discoverability",
  },

  {
    id: "data",
    title: "Data & Storage",
    description: "Manage data usage, cache and stored content",
    icon: Database,
    color: "yellow",
    keywords:
      "data saver storage cache videos drafts images audio thumbnails recordings downloads offline autoplay quality",
  },

  {
    id: "language",
    title: "Language & Region",
    description: "Language, timezone, country and regional formats",
    icon: Languages,
    color: "indigo",
    keywords:
      "language translation captions timezone Malawi currency MWK date format country region",
  },

  {
    id: "appearance",
    title: "Appearance",
    description: "Customize the look and feel of Mpade Universe",
    icon: Palette,
    color: "fuchsia",
    keywords:
      "dark light system neon accent color compact density animation blur glass font contrast",
  },

  {
    id: "accessibility",
    title: "Accessibility",
    description: "Make the app easier to see, hear and use",
    icon: Eye,
    color: "sky",
    keywords:
      "font size high contrast motion screen reader captions audio descriptions color blind touch targets",
  },

  {
    id: "payments",
    title: "Payments & Monetization",
    description: "Wallet, coins, earnings and payment methods",
    icon: Wallet,
    color: "green",
    keywords:
      "wallet balance coins tokens earnings payments purchases gifts subscriptions payout TNM Mpamba Airtel Money bank",
  },

  {
    id: "creator",
    title: "Creator Settings",
    description: "Creator tools, analytics and monetization",
    icon: LayoutDashboard,
    color: "cyan",
    keywords:
      "creator dashboard analytics audience performance growth earnings gifts subscriptions paid content livestream schedule library media kit",
  },

  {
    id: "scheduling",
    title: "Scheduling & Publishing",
    description: "Manage scheduled videos and publishing",
    icon: Play,
    color: "violet",
    keywords:
      "scheduled videos lives publishing auto publish timezone calendar failed notifications",
  },

  {
    id: "library",
    title: "Content Library",
    description: "Manage videos, drafts, recordings and deleted content",
    icon: FileArchive,
    color: "amber",
    keywords:
      "videos drafts images audio thumbnails live recordings archived deleted recently deleted recovery storage",
  },

  {
    id: "progress",
    title: "Creator Progress",
    description: "Level, XP, achievements and goals",
    icon: Award,
    color: "yellow",
    keywords:
      "level xp achievements badges streaks milestones goals rewards leaderboard progress",
  },

  {
    id: "brand",
    title: "Brand & Collaborations",
    description: "Business, campaigns and creator partnerships",
    icon: BriefcaseBusiness,
    color: "rose",
    keywords:
      "brand collaboration partnership sponsored campaigns media kit portfolio rate card business contact disclosure",
  },

  {
    id: "copyright",
    title: "Copyright & Safety",
    description: "Copyright claims, safety and content violations",
    icon: Shield,
    color: "red",
    keywords:
      "copyright claims strikes disputes appeals music rights ownership ai disclosure community guidelines violations warnings",
  },

  {
    id: "ai",
    title: "AI Settings",
    description: "AI assistant, recommendations and personalization",
    icon: Bot,
    color: "violet",
    keywords:
      "ai assistant recommendations captions hashtags scripts thumbnails video analysis comment replies moderation personalization history",
  },

  {
    id: "reports",
    title: "Data & Reports",
    description: "Export your data, analytics and financial reports",
    icon: FileText,
    color: "blue",
    keywords:
      "download personal data analytics videos earnings transactions followers reports csv json pdf archive",
  },

  {
    id: "apps",
    title: "Connected Apps",
    description: "OAuth applications and third-party permissions",
    icon: Code2,
    color: "slate",
    keywords:
      "connected apps oauth authorized devices api permissions revoke third party",
  },

  {
    id: "support",
    title: "Support & Help",
    description: "Help, reports, recovery and support tickets",
    icon: CircleHelp,
    color: "zinc",
    keywords:
      "help report problem account content copyright payments creator recovery safety terms privacy cookies contact tickets",
  },

  {
    id: "system",
    title: "System & Diagnostics",
    description: "App status, synchronization and diagnostics",
    icon: Settings2,
    color: "slate",
    keywords:
      "version build server database storage notifications media processing sync network offline diagnostics errors temporary data",
  },

  {
    id: "exit",
    title: "Account Exit",
    description: "Logout, deactivate, delete and download before leaving",
    icon: LogOut,
    color: "red",
    keywords:
      "logout all devices deactivate delete account download data",
  },
];

/* ============================================================
   HELPERS
============================================================ */

function safeObject(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return value;
}

function mergeSettings(profile) {
  const result = {};

  JSON_SETTING_COLUMNS.forEach((key) => {
    result[key] = {
      ...(DEFAULT_JSON_SETTINGS[key] || {}),
      ...safeObject(profile?.[key]),
    };
  });

  return result;
}

function formatDate(value) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-MW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "Not available";
  }
}

function formatMoney(value, currency = "MWK") {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getSocialLink(profile, key) {
  const links = safeObject(profile?.social_links);
  return links[key] || "";
}

function setNestedValue(object, path, value) {
  const result = { ...object };
  let current = result;

  const parts = path.split(".");

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
    } else {
      current[part] = {
        ...(current[part] || {}),
      };

      current = current[part];
    }
  });

  return result;
}

/* ============================================================
   MAIN PAGE
============================================================ */

const SettingsPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_JSON_SETTINGS);

  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [storageInfo, setStorageInfo] = useState({
    localStorage: 0,
    sessionStorage: 0,
    indexedDB: "Available",
  });

  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        navigate("/login");
        return;
      }

      setUser(authUser);

      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS.join(","))
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Your profile record could not be found.");
      }

      setProfile(data);
      setSettings(mergeSettings(data));
    } catch (error) {
      console.error("Settings profile error:", error);

      setErrorMessage(
        error?.message ||
          "Unable to load your settings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ==========================================================
     STORAGE
  ========================================================== */

  const calculateStorage = useCallback(() => {
    try {
      let local = 0;
      let session = 0;

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        local += (key?.length || 0) + (value?.length || 0);
      }

      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);

        session += (key?.length || 0) + (value?.length || 0);
      }

      setStorageInfo({
        localStorage: local,
        sessionStorage: session,
        indexedDB: "Available",
      });
    } catch {
      setStorageInfo({
        localStorage: 0,
        sessionStorage: 0,
        indexedDB: "Unavailable",
      });
    }
  }, []);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  /* ==========================================================
     FILTERED CATEGORIES
  ========================================================== */

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return SETTINGS_CATEGORIES;

    return SETTINGS_CATEGORIES.filter((category) => {
      const searchable = [
        category.title,
        category.description,
        category.keywords,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [search]);

  /* ==========================================================
     SAVE PROFILE COLUMN
  ========================================================== */

  const saveProfileFields = async (fields) => {
    if (!profile?.id) return false;

    setSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", profile.id)
        .select(PROFILE_COLUMNS.join(","))
        .single();

      if (error) throw error;

      setProfile(data);
      setSettings(mergeSettings(data));

      setSaveMessage("Changes saved");

      window.setTimeout(() => {
        setSaveMessage("");
      }, 2500);

      return true;
    } catch (error) {
      console.error("Settings save error:", error);

      setErrorMessage(
        error?.message || "Unable to save your changes."
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     UPDATE JSON SETTING
  ========================================================== */

  const updateJsonSetting = async (column, key, value) => {
    const current = safeObject(settings[column]);

    const next = {
      ...current,
      [key]: value,
    };

    const success = await saveProfileFields({
      [column]: next,
    });

    if (success) {
      setSettings((previous) => ({
        ...previous,
        [column]: next,
      }));
    }
  };

  /* ==========================================================
     UPDATE PROFILE COLUMN
  ========================================================== */

  const updateProfile = async (column, value) => {
    const success = await saveProfileFields({
      [column]: value,
    });

    if (success) {
      setProfile((previous) => ({
        ...previous,
        [column]: value,
      }));
    }
  };

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to log out.");
    }
  };

  /* ==========================================================
     CLEAR TEMP DATA
  ========================================================== */

  const clearTemporaryData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();

      calculateStorage();

      setSaveMessage("Local temporary data cleared");

      window.setTimeout(() => {
        setSaveMessage("");
      }, 2500);
    } catch (error) {
      setErrorMessage(
        error?.message || "Unable to clear temporary data."
      );
    }
  };

  /* ==========================================================
     SELECT CATEGORY
  ========================================================== */

  const openCategory = (id) => {
    setActiveCategory(id);
    setShowMobileMenu(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const activeCategoryObject = SETTINGS_CATEGORIES.find(
    (category) => category.id === activeCategory
  );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />

          <div className="text-xs font-black uppercase tracking-[3px] text-zinc-500">
            Loading Settings
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-5" size={42} />

          <h1 className="text-xl font-black mb-3">
            Settings unavailable
          </h1>

          <p className="text-sm text-zinc-500 mb-6">
            {errorMessage ||
              "We could not load your profile settings."}
          </p>

          <button
            onClick={loadProfile}
            className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-black text-xs uppercase tracking-wider"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.035] blur-[120px]" />

        <div className="absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-purple-500/[0.03] blur-[120px]" />
      </div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/85 backdrop-blur-2xl">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[72px] flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.07] flex items-center justify-center transition"
              aria-label="Go back"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-cyan-400" />

                <h1 className="text-sm sm:text-base font-black uppercase tracking-[2px] truncate">
                  Settings & Privacy
                </h1>
              </div>

              <p className="hidden sm:block text-[10px] text-zinc-600 uppercase tracking-[2px] mt-1">
                Mpade Universe Control Center
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {saving && (
                <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  <RefreshCw size={13} className="animate-spin" />
                  Saving
                </div>
              )}

              {saveMessage && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                  <Check size={13} />
                  {saveMessage}
                </div>
              )}

              <button
                onClick={() => setShowMobileMenu((value) => !value)}
                className="lg:hidden w-10 h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] flex items-center justify-center"
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="relative max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        {/* ERROR BAR */}

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] flex items-start gap-3"
            >
              <AlertTriangle
                size={18}
                className="text-red-400 mt-0.5 shrink-0"
              />

              <div className="flex-1">
                <div className="text-xs font-bold text-red-300">
                  Settings error
                </div>

                <div className="text-[11px] text-red-400/70 mt-1">
                  {errorMessage}
                </div>
              </div>

              <button
                onClick={() => setErrorMessage("")}
                className="text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            PROFILE SUMMARY
        ==================================================== */}

        <ProfileSummary
          profile={profile}
          user={user}
          navigate={navigate}
          onEditProfile={() => navigate("/edit-profile")}
        />

        {/* ====================================================
            SEARCH
        ==================================================== */}

        <div className="mt-5 relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search settings..."
            className="w-full h-12 pl-11 pr-12 rounded-2xl border border-white/[0.07] bg-white/[0.025] focus:bg-white/[0.04] focus:border-cyan-500/30 outline-none text-sm text-white placeholder:text-zinc-700 transition"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ====================================================
            MOBILE CATEGORY MENU
        ==================================================== */}

        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="mt-4 p-2 rounded-2xl border border-white/[0.07] bg-[#080808]">
                {filteredCategories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    active={activeCategory === category.id}
                    onClick={() => openCategory(category.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====================================================
            CONTENT GRID
        ==================================================== */}

        <div className="mt-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
          {/* DESKTOP SIDEBAR */}

          <aside className="hidden lg:block">
            <div className="sticky top-[92px] max-h-[calc(100vh-110px)] overflow-y-auto pr-2 settings-scroll">
              <div className="rounded-2xl border border-white/[0.06] bg-[#060606] p-2">
                {filteredCategories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    active={activeCategory === category.id}
                    onClick={() => openCategory(category.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* DETAIL AREA */}

          <section className="min-w-0">
            {!activeCategory ? (
              <SettingsOverview
                categories={filteredCategories}
                profile={profile}
                settings={settings}
                storageInfo={storageInfo}
                onOpen={openCategory}
              />
            ) : (
              <SettingsDetail
                category={activeCategoryObject}
                profile={profile}
                user={user}
                settings={settings}
                storageInfo={storageInfo}
                saving={saving}
                updateProfile={updateProfile}
                updateJsonSetting={updateJsonSetting}
                setSettings={setSettings}
                clearTemporaryData={clearTemporaryData}
                calculateStorage={calculateStorage}
                onBack={() => setActiveCategory(null)}
                onOpenCategory={openCategory}
                onLogout={handleLogout}
                navigate={navigate}
              />
            )}
          </section>
        </div>
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-4">
        <div className="border-t border-white/[0.05] pt-7 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="text-[10px] text-zinc-700 uppercase tracking-[2px]">
            Mpade Universe
          </div>

          <div className="text-[10px] text-zinc-700">
            {profile.account_status || "active"} •{" "}
            {profile.subscription_tier || "Free"}
          </div>
        </div>
      </footer>

      <style>{`
        .settings-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .settings-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .settings-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
        }

        .settings-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(6,182,212,0.45);
        }

        .settings-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.14) transparent;
        }
      `}</style>
    </div>
  );
};

/* ============================================================
   PROFILE SUMMARY
============================================================ */

const ProfileSummary = ({
  profile,
  user,
  navigate,
  onEditProfile,
}) => {
  const avatar =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.display_name ||
        profile.full_name ||
        profile.username ||
        "User"
    )}&background=090909&color=06b6d4`;

  const username = profile.username
    ? profile.username.startsWith("@")
      ? profile.username
      : `@${profile.username}`
    : "@user";

  const completion = Math.max(
    0,
    Math.min(100, Number(profile.profile_completion || 0))
  );

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-[#070707] overflow-hidden">
      <div className="h-28 sm:h-36 relative overflow-hidden">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-cyan-500/[0.08] via-purple-500/[0.06] to-transparent" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-black/20" />
      </div>

      <div className="px-5 pb-5 -mt-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <img
            src={avatar}
            alt=""
            className="w-16 h-16 rounded-2xl border-2 border-black object-cover bg-zinc-900"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black truncate">
                {profile.display_name ||
                  profile.full_name ||
                  "User"}
              </h2>

              {(profile.is_verified ||
                profile.verified_status === "verified") && (
                <ShieldCheck
                  size={17}
                  className="text-cyan-400"
                />
              )}
            </div>

            <p className="text-xs text-zinc-500 mt-0.5">
              {username}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEditProfile}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-[10px] font-black uppercase tracking-wider transition"
            >
              Edit Profile
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider"
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniStat
            label="Followers"
            value={profile.follower_count || 0}
          />

          <MiniStat
            label="Following"
            value={profile.following_count || 0}
          />

          <MiniStat
            label="Likes"
            value={profile.total_likes || 0}
          />

          <MiniStat
            label="Profile"
            value={`${completion}%`}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   OVERVIEW
============================================================ */

const SettingsOverview = ({
  categories,
  profile,
  settings,
  storageInfo,
  onOpen,
}) => {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] font-black uppercase tracking-[3px] text-cyan-400">
          Control Center
        </div>

        <h2 className="text-2xl sm:text-3xl font-black mt-2">
          Settings for everything.
        </h2>

        <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
          Manage your account, privacy, security, creator tools,
          payments, content, AI, accessibility and more from one
          place.
        </p>
      </div>

      {/* QUICK CARDS */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <QuickCard
          icon={<ShieldCheck size={18} />}
          title="Security"
          value={
            settings.verification_settings.twoFactorEnabled
              ? "2FA enabled"
              : "Review security"
          }
          onClick={() => onOpen("security")}
        />

        <QuickCard
          icon={<Lock size={18} />}
          title="Privacy"
          value={profile.is_private ? "Private" : "Public"}
          onClick={() => onOpen("privacy")}
        />

        <QuickCard
          icon={<Wallet size={18} />}
          title="Wallet"
          value={formatMoney(
            profile.balance,
            profile.currency_preference || "MWK"
          )}
          onClick={() => onOpen("payments")}
        />

        <QuickCard
          icon={<Award size={18} />}
          title="Creator"
          value={`Level ${profile.creator_level || 1}`}
          onClick={() => onOpen("progress")}
        />
      </div>

      {/* ALL SETTINGS */}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {categories.map((category) => (
          <OverviewCard
            key={category.id}
            category={category}
            onClick={() => onOpen(category.id)}
          />
        ))}
      </div>

      {/* STORAGE */}

      <div className="mt-6">
        <StorageSummary
          storageInfo={storageInfo}
          onOpen={() => onOpen("data")}
        />
      </div>
    </div>
  );
};

/* ============================================================
   DETAIL ROUTER
============================================================ */

const SettingsDetail = ({
  category,
  profile,
  user,
  settings,
  storageInfo,
  saving,
  updateProfile,
  updateJsonSetting,
  setSettings,
  clearTemporaryData,
  calculateStorage,
  onBack,
  onOpenCategory,
  onLogout,
  navigate,
}) => {
  const props = {
    profile,
    user,
    settings,
    storageInfo,
    saving,
    updateProfile,
    updateJsonSetting,
    setSettings,
    clearTemporaryData,
    calculateStorage,
    onOpenCategory,
    navigate,
  };

  let content = null;

  switch (category?.id) {
    case "account":
      content = <AccountSettings {...props} />;
      break;

    case "security":
      content = <SecuritySettings {...props} />;
      break;

    case "privacy":
      content = <PrivacySettings {...props} />;
      break;

    case "notifications":
      content = <NotificationSettings {...props} />;
      break;

    case "content":
      content = <ContentSettings {...props} />;
      break;

    case "comments":
      content = <CommentsSettings {...props} />;
      break;

    case "messages":
      content = <MessagesSettings {...props} />;
      break;

    case "followers":
      content = <FollowersSettings {...props} />;
      break;

    case "data":
      content = <DataSettings {...props} />;
      break;

    case "language":
      content = <LanguageSettings {...props} />;
      break;

    case "appearance":
      content = <AppearanceSettings {...props} />;
      break;

    case "accessibility":
      content = <AccessibilitySettings {...props} />;
      break;

    case "payments":
      content = <PaymentSettings {...props} />;
      break;

    case "creator":
      content = <CreatorSettings {...props} />;
      break;

    case "scheduling":
      content = <SchedulingSettings {...props} />;
      break;

    case "library":
      content = <LibrarySettings {...props} />;
      break;

    case "progress":
      content = <ProgressSettings {...props} />;
      break;

    case "brand":
      content = <BrandSettings {...props} />;
      break;

    case "copyright":
      content = <CopyrightSettings {...props} />;
      break;

    case "ai":
      content = <AISettings {...props} />;
      break;

    case "reports":
      content = <ReportsSettings {...props} />;
      break;

    case "apps":
      content = <ConnectedAppsSettings {...props} />;
      break;

    case "support":
      content = <SupportSettings {...props} />;
      break;

    case "system":
      content = <SystemSettings {...props} />;
      break;

    case "exit":
      content = <ExitSettings {...props} onLogout={onLogout} />;
      break;

    default:
      content = null;
  }

  return (
    <motion.div
      key={category?.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onBack}
        className="lg:hidden flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-zinc-500 hover:text-white mb-5"
      >
        <ArrowLeft size={14} />
        All Settings
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-400/[0.08] border border-cyan-400/10 flex items-center justify-center text-cyan-400">
            <category.icon size={21} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black">
              {category.title}
            </h2>

            <p className="text-xs text-zinc-600 mt-1">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {content}
    </motion.div>
  );
};

/* ============================================================
   ACCOUNT SETTINGS
============================================================ */

const AccountSettings = ({
  profile,
  user,
  navigate,
}) => {
  const social = safeObject(profile.social_links);

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Account information"
        description="Your identity and account details"
        icon={<User size={17} />}
      >
        <SettingInfo
          label="Username"
          value={
            profile.username
              ? `@${String(profile.username).replace(/^@/, "")}`
              : "Not set"
          }
        />

        <SettingInfo
          label="Display name"
          value={profile.display_name || "Not set"}
        />

        <SettingInfo
          label="Full name"
          value={profile.full_name || "Not set"}
        />

        <SettingInfo
          label="Bio"
          value={profile.bio || "No bio"}
        />

        <SettingInfo
          label="Date of birth"
          value={profile.dob || "Not set"}
        />

        <SettingInfo
          label="Gender"
          value={profile.gender || "Not set"}
        />

        <SettingInfo
          label="Location"
          value={profile.location || "Not set"}
        />

        <SettingInfo
          label="District"
          value={profile.district || "Not set"}
        />

        <SettingInfo
          label="Country"
          value={profile.country || "Malawi"}
        />

        <SettingInfo
          label="Region"
          value={profile.region || "Not set"}
        />

        <SettingInfo
          label="City"
          value={profile.city || "Not set"}
        />

        <SettingInfo
          label="Phone"
          value={profile.phone_number || "Not set"}
        />

        <SettingInfo
          label="Email"
          value={user?.email || "Not available"}
        />

        <SettingInfo
          label="Account created"
          value={formatDate(profile.created_at)}
        />

        <SettingInfo
          label="Account ID"
          value={profile.id}
          copyable
        />

        <SettingInfo
          label="Account status"
          value={profile.account_status || "active"}
        />

        <SettingInfo
          label="Verification"
          value={
            profile.is_verified ||
            profile.verified_status === "verified"
              ? "Verified"
              : "Not verified"
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Profile details"
        description="Advanced profile information"
        icon={<ImageIcon size={17} />}
      >
        <SettingInfo
          label="Profile headline"
          value={profile.profile_headline || "Not set"}
        />

        <SettingInfo
          label="Nickname"
          value={profile.nickname || "Not set"}
        />

        <SettingInfo
          label="Pronouns"
          value={profile.pronouns || "Not set"}
        />

        <SettingInfo
          label="Occupation"
          value={profile.occupation || "Not set"}
        />

        <SettingInfo
          label="Education"
          value={profile.education || "Not set"}
        />

        <SettingInfo
          label="School / University"
          value={profile.school_university || "Not set"}
        />

        <SettingInfo
          label="Skills"
          value={profile.skills || "Not set"}
        />

        <SettingInfo
          label="Languages"
          value={profile.languages || "Not set"}
        />

        <SettingInfo
          label="Relationship status"
          value={profile.relationship_status || "Not set"}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Social links"
        description="Connected public profile links"
        icon={<Globe size={17} />}
      >
        <SettingInfo
          label="Website"
          value={social.website || "Not set"}
        />

        <SettingInfo
          label="YouTube"
          value={social.youtube || "Not set"}
        />

        <SettingInfo
          label="WhatsApp"
          value={social.whatsapp || "Not set"}
        />

        <SettingInfo
          label="Instagram"
          value={social.instagram || "Not set"}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Account type"
        description="Choose how your account operates"
        icon={<BriefcaseBusiness size={17} />}
      >
        <SettingInfo
          label="Current account type"
          value={profile.account_type || "personal"}
        />

        <SettingInfo
          label="Creator mode"
          value={profile.creator_mode ? "Enabled" : "Disabled"}
        />

        <SettingInfo
          label="Professional account"
          value={profile.pro_account ? "Enabled" : "Disabled"}
        />

        <SettingInfo
          label="Creator category"
          value={profile.creator_category || "Not set"}
        />

        <SettingInfo
          label="Creator website"
          value={profile.creator_website || "Not set"}
        />

        <SettingInfo
          label="Business email"
          value={profile.business_email || "Not set"}
        />

        <SettingInfo
          label="Business phone"
          value={profile.business_phone || "Not set"}
        />

        <div className="pt-3 flex flex-wrap gap-2">
          <ActionButton
            onClick={() => navigate("/edit-profile")}
            icon={<User size={14} />}
          >
            Edit Profile
          </ActionButton>

          <ActionButton
            onClick={() => navigate("/universe-tools")}
            icon={<LayoutDashboard size={14} />}
          >
            Professional Dashboard
          </ActionButton>
        </div>
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   SECURITY
============================================================ */

const SecuritySettings = ({
  profile,
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const verification = settings.verification_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Password & authentication"
        description="Manage the credentials used to protect your account"
        icon={<KeyRound size={17} />}
      >
        <NavigationRow
          icon={<Lock size={17} />}
          title="Change password"
          description="Update your account password"
          onClick={() => navigate("/settings/security/password")}
        />

        <NavigationRow
          icon={<Mail size={17} />}
          title="Forgot password"
          description="Recover access to your account"
          onClick={() => navigate("/forgot-password")}
        />

        <NavigationRow
          icon={<ShieldCheck size={17} />}
          title="Email verification"
          description="Verify your email address"
          badge={
            verification.emailVerified ? "Verified" : "Not verified"
          }
          onClick={() =>
            navigate("/settings/security/email-verification")
          }
        />

        <NavigationRow
          icon={<Smartphone size={17} />}
          title="Phone verification"
          description="Verify your phone number"
          badge={
            verification.phoneVerified
              ? "Verified"
              : profile.phone_number
              ? "Available"
              : "Phone not set"
          }
          onClick={() =>
            navigate("/settings/security/phone-verification")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Two-factor authentication"
        description="Additional protection when signing in"
        icon={<Shield size={17} />}
      >
        <ToggleRow
          icon={<ShieldCheck size={17} />}
          title="Two-factor authentication"
          description="Require an additional verification step"
          value={verification.twoFactorEnabled}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "twoFactorEnabled",
              value
            )
          }
        />

        <ToggleRow
          icon={<Smartphone size={17} />}
          title="SMS verification"
          description="Use your verified phone for security codes"
          value={verification.smsVerificationEnabled}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "smsVerificationEnabled",
              value
            )
          }
        />

        <ToggleRow
          icon={<KeyRound size={17} />}
          title="Authenticator app"
          description="Use an authenticator application"
          value={verification.authenticatorEnabled}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "authenticatorEnabled",
              value
            )
          }
        />

        <ToggleRow
          icon={<LogIn size={17} />}
          title="Passkeys"
          description="Passwordless sign-in using supported devices"
          value={verification.passkeysEnabled}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "passkeysEnabled",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Login protection"
        description="Monitor suspicious activity and account access"
        icon={<Activity size={17} />}
      >
        <ToggleRow
          icon={<Bell size={17} />}
          title="Login alerts"
          description="Receive notifications about new logins"
          value={verification.loginAlerts}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "loginAlerts",
              value
            )
          }
        />

        <ToggleRow
          icon={<AlertTriangle size={17} />}
          title="Suspicious login detection"
          description="Detect unusual login activity"
          value={verification.suspiciousLoginDetection}
          onChange={(value) =>
            updateJsonSetting(
              "verification_settings",
              "suspiciousLoginDetection",
              value
            )
          }
        />

        <NavigationRow
          icon={<LogIn size={17} />}
          title="Login history"
          description="Review recent account access"
          badge="Backend"
          onClick={() => navigate("/settings/security/login-history")}
        />

        <NavigationRow
          icon={<Smartphone size={17} />}
          title="Active sessions"
          description="View devices currently signed in"
          badge="Backend"
          onClick={() =>
            navigate("/settings/security/sessions")
          }
        />

        <NavigationRow
          icon={<ShieldCheck size={17} />}
          title="Trusted devices"
          description="Manage devices you trust"
          badge="Backend"
          onClick={() =>
            navigate("/settings/security/devices")
          }
        />

        <NavigationRow
          icon={<KeyRound size={17} />}
          title="Recovery options"
          description="Recovery email and phone"
          onClick={() =>
            navigate("/settings/security/recovery")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Connected applications"
        description="Applications with access to your account"
        icon={<Code2 size={17} />}
      >
        <NavigationRow
          icon={<Code2 size={17} />}
          title="Connected apps"
          description="OAuth and third-party access"
          onClick={() => navigate("/settings/apps")}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   PRIVACY
============================================================ */

const PrivacySettings = ({
  profile,
  settings,
  updateProfile,
  updateJsonSetting,
  navigate,
}) => {
  const privacy = settings.privacy_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Account visibility"
        description="Choose whether your account is public or private"
        icon={<Lock size={17} />}
      >
        <ToggleRow
          icon={<Lock size={17} />}
          title="Private account"
          description="Only approved people can follow you"
          value={Boolean(profile.is_private)}
          onChange={(value) =>
            updateProfile("is_private", value)
          }
        />

        <SelectRow
          title="Media privacy"
          description="Default visibility for profile media"
          value={profile.media_privacy || "public"}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateProfile("media_privacy", value)
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Who can interact with you"
        description="Control followers, messages, mentions and tags"
        icon={<Users size={17} />}
      >
        <SelectRow
          title="Who can follow you"
          value={privacy.whoCanFollow}
          options={[
            ["everyone", "Everyone"],
            ["followers", "People you follow"],
            ["approved", "Approved people"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "whoCanFollow",
              value
            )
          }
        />

        <SelectRow
          title="Who can message you"
          value={privacy.whoCanMessage}
          options={[
            ["everyone", "Everyone"],
            ["followers", "Followers"],
            ["nobody", "Nobody"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "whoCanMessage",
              value
            )
          }
        />

        <SelectRow
          title="Who can mention you"
          value={privacy.whoCanMention}
          options={[
            ["everyone", "Everyone"],
            ["followers", "Followers"],
            ["nobody", "Nobody"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "whoCanMention",
              value
            )
          }
        />

        <SelectRow
          title="Who can tag you"
          value={privacy.whoCanTag}
          options={[
            ["everyone", "Everyone"],
            ["followers", "Followers"],
            ["nobody", "Nobody"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "whoCanTag",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Visibility"
        description="Control what other people can discover"
        icon={<Eye size={17} />}
      >
        <ToggleRow
          title="Search visibility"
          description="Allow your account to appear in search"
          value={privacy.searchVisibility}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "searchVisibility",
              value
            )
          }
        />

        <ToggleRow
          title="Profile views"
          description="Allow profile-view activity"
          value={privacy.profileViews}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "profileViews",
              value
            )
          }
        />

        <ToggleRow
          title="Activity visibility"
          description="Show selected activity to others"
          value={privacy.activityVisibility}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "activityVisibility",
              value
            )
          }
        />

        <ToggleRow
          title="Online status"
          description="Show when you are online"
          value={privacy.onlineStatus}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "onlineStatus",
              value
            )
          }
        />

        <ToggleRow
          title="Last active"
          description="Show when you were last active"
          value={privacy.lastActive}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "lastActive",
              value
            )
          }
        />

        <SelectRow
          title="Following visibility"
          value={privacy.followingVisibility}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "followingVisibility",
              value
            )
          }
        />

        <SelectRow
          title="Follower visibility"
          value={privacy.followerVisibility}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "followerVisibility",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Personal information visibility"
        description="Choose who can see sensitive profile fields"
        icon={<User size={17} />}
      >
        <SelectRow
          title="Birthday"
          value={profile.birthday_visibility || "private"}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateProfile("birthday_visibility", value)
          }
        />

        <SelectRow
          title="Gender"
          value={profile.gender_visibility || "private"}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateProfile("gender_visibility", value)
          }
        />

        <SelectRow
          title="Phone"
          value={profile.phone_visibility || "private"}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateProfile("phone_visibility", value)
          }
        />

        <SelectRow
          title="Location"
          value={profile.location_visibility || "district"}
          options={[
            ["public", "Public"],
            ["district", "District"],
            ["city", "City"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateProfile("location_visibility", value)
          }
        />

        <ToggleRow
          title="GPS sharing"
          description="Allow precise location sharing when supported"
          value={Boolean(profile.gps_sharing)}
          onChange={(value) =>
            updateProfile("gps_sharing", value)
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Privacy lists"
        description="Manage accounts and words you don't want to see"
        icon={<UserMinus size={17} />}
      >
        <NavigationRow
          icon={<UserMinus size={17} />}
          title="Blocked accounts"
          description="Accounts you have blocked"
          onClick={() => navigate("/settings/privacy/blocked")}
        />

        <NavigationRow
          icon={<Pause size={17} />}
          title="Muted accounts"
          description="Accounts whose content you have muted"
          onClick={() => navigate("/settings/privacy/muted")}
        />

        <NavigationRow
          icon={<Shield size={17} />}
          title="Restricted accounts"
          description="Accounts with limited interaction"
          onClick={() =>
            navigate("/settings/privacy/restricted")
          }
        />

        <NavigationRow
          icon={<AlertTriangle size={17} />}
          title="Hidden words"
          description="Words and phrases filtered from your experience"
          onClick={() =>
            navigate("/settings/privacy/hidden-words")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   NOTIFICATIONS
============================================================ */

const NotificationSettings = ({
  settings,
  updateJsonSetting,
}) => {
  const notificationDefaults = {
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
    subscriptionPayments: true,
    creatorFund: true,
    earnings: true,
    payouts: true,
    videoProcessing: true,
    videoPublishing: true,
    scheduledPublishing: true,
    copyright: true,
    contentWarnings: true,
    accountSecurity: true,
    system: true,
    push: true,
    email: true,
    sms: false,
    inApp: true,
    sounds: true,
    vibration: true,
    quietHours: false,
  };

  const notification =
    settings.advanced_settings.notifications ||
    notificationDefaults;

  const update = (key, value) => {
    updateJsonSetting(
      "advanced_settings",
      "notifications",
      {
        ...notification,
        [key]: value,
      }
    );
  };

  const categories = [
    ["followers", "Followers"],
    ["likes", "Likes"],
    ["comments", "Comments"],
    ["replies", "Replies"],
    ["mentions", "Mentions"],
    ["shares", "Shares"],
    ["reposts", "Reposts"],
    ["saves", "Saves"],
    ["gifts", "Gifts"],
    ["live", "Live"],
    ["subscribers", "Subscribers"],
    ["subscriptionPayments", "Subscription payments"],
    ["creatorFund", "Creator fund"],
    ["earnings", "Earnings"],
    ["payouts", "Payouts"],
    ["videoProcessing", "Video processing"],
    ["videoPublishing", "Video publishing"],
    ["scheduledPublishing", "Scheduled publishing"],
    ["copyright", "Copyright"],
    ["contentWarnings", "Content warnings"],
    ["accountSecurity", "Account security"],
    ["system", "System"],
  ];

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Notification channels"
        description="Choose where notifications are delivered"
        icon={<Bell size={17} />}
      >
        {[
          ["push", "Push notifications"],
          ["email", "Email notifications"],
          ["sms", "SMS notifications"],
          ["inApp", "In-app notifications"],
          ["sounds", "Notification sounds"],
          ["vibration", "Vibration"],
        ].map(([key, title]) => (
          <ToggleRow
            key={key}
            title={title}
            value={Boolean(notification[key])}
            onChange={(value) => update(key, value)}
          />
        ))}

        <ToggleRow
          title="Quiet hours"
          description="Temporarily reduce notification interruptions"
          value={Boolean(notification.quietHours)}
          onChange={(value) => update("quietHours", value)}
        />

        <NavigationRow
          icon={<Bell size={17} />}
          title="Notification history"
          description="Review notifications you've received"
          onClick={() => {}}
        />

        <ActionButton
          onClick={() => {}}
          icon={<Check size={14} />}
        >
          Mark All as Read
        </ActionButton>
      </SettingsPanel>

      <SettingsPanel
        title="Activity notifications"
        description="Choose which activity generates alerts"
        icon={<Activity size={17} />}
      >
        {categories.map(([key, title]) => (
          <ToggleRow
            key={key}
            title={title}
            value={Boolean(notification[key])}
            onChange={(value) => update(key, value)}
          />
        ))}
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   CONTENT
============================================================ */

const ContentSettings = ({
  settings,
  updateJsonSetting,
}) => {
  const content = settings.content_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Default publishing"
        description="Defaults applied when you publish content"
        icon={<Video size={17} />}
      >
        <SelectRow
          title="Default video privacy"
          value={content.defaultPrivacy}
          options={[
            ["public", "Public"],
            ["followers", "Followers"],
            ["private", "Private"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "defaultPrivacy",
              value
            )
          }
        />

        <SelectRow
          title="Upload quality"
          value={content.uploadQuality}
          options={[
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
            ["original", "Original"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "uploadQuality",
              value
            )
          }
        />

        <SelectRow
          title="Download quality"
          value={content.downloadQuality}
          options={[
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
            ["original", "Original"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "downloadQuality",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Interaction permissions"
        description="Control what other people can do with your content"
        icon={<Users size={17} />}
      >
        {[
          ["comments", "Comments"],
          ["downloads", "Downloads"],
          ["duet", "Duet"],
          ["stitch", "Stitch"],
          ["repost", "Repost"],
          ["sharing", "Sharing"],
        ].map(([key, title]) => (
          <ToggleRow
            key={key}
            title={title}
            value={Boolean(content[key])}
            onChange={(value) =>
              updateJsonSetting(
                "content_settings",
                key,
                value
              )
            }
          />
        ))}
      </SettingsPanel>

      <SettingsPanel
        title="Safety & disclosure"
        description="Control content safety settings"
        icon={<Shield size={17} />}
      >
        <ToggleRow
          title="Age restriction"
          value={content.ageRestriction}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "ageRestriction",
              value
            )
          }
        />

        <ToggleRow
          title="Sensitive content"
          description="Control exposure to sensitive content"
          value={content.sensitiveContent}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "sensitiveContent",
              value
            )
          }
        />

        <ToggleRow
          title="Content warnings"
          value={content.contentWarnings}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "contentWarnings",
              value
            )
          }
        />

        <ToggleRow
          title="AI disclosure"
          description="Disclose AI-assisted content when appropriate"
          value={content.aiDisclosure}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "aiDisclosure",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Playback"
        description="Control video autoplay and mobile data usage"
        icon={<Play size={17} />}
      >
        <ToggleRow
          title="Autoplay"
          value={content.autoplay}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "autoplay",
              value
            )
          }
        />

        <ToggleRow
          title="Autoplay on Wi-Fi"
          value={content.autoplayWifi}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "autoplayWifi",
              value
            )
          }
        />

        <ToggleRow
          title="Autoplay on mobile data"
          value={content.autoplayMobile}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "autoplayMobile",
              value
            )
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   COMMENTS
============================================================ */

const CommentsSettings = ({
  settings,
  updateJsonSetting,
}) => {
  const content = settings.content_settings;
  const privacy = settings.privacy_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Comment controls"
        description="Control who can comment and how comments appear"
        icon={<MessageCircle size={17} />}
      >
        <ToggleRow
          title="Allow comments"
          value={Boolean(content.comments)}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "comments",
              value
            )
          }
        />

        <ToggleRow
          title="Automatic comment filtering"
          value={Boolean(privacy.commentFiltering)}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "commentFiltering",
              value
            )
          }
        />

        <NavigationRow
          icon={<AlertTriangle size={17} />}
          title="Blocked words"
          description="Hide comments containing selected words"
          onClick={() => {}}
        />

        <NavigationRow
          icon={<Shield size={17} />}
          title="Manual moderation"
          description="Review comments before they appear"
          onClick={() => {}}
        />

        <NavigationRow
          icon={<Bell size={17} />}
          title="Comment notifications"
          description="Manage comment activity notifications"
          onClick={() => {}}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Moderation tools"
        description="Tools for managing unwanted comments"
        icon={<Shield size={17} />}
      >
        <NavigationRow
          title="Hidden comments"
          description="View comments hidden by filters"
          onClick={() => {}}
        />

        <NavigationRow
          title="Spam comments"
          description="Review comments detected as spam"
          onClick={() => {}}
        />

        <NavigationRow
          title="Offensive content"
          description="Review comments flagged as offensive"
          onClick={() => {}}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   MESSAGES
============================================================ */

const MessagesSettings = ({
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const privacy = settings.privacy_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Messaging permissions"
        description="Control who can contact you"
        icon={<Send size={17} />}
      >
        <SelectRow
          title="Who can message you"
          value={privacy.whoCanMessage}
          options={[
            ["everyone", "Everyone"],
            ["followers", "Followers"],
            ["nobody", "Nobody"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "privacy_settings",
              "whoCanMessage",
              value
            )
          }
        />

        <NavigationRow
          icon={<Mail size={17} />}
          title="Message requests"
          description="Manage messages from people you don't follow"
          onClick={() => navigate("/messages/requests")}
        />

        <NavigationRow
          icon={<Users size={17} />}
          title="Group messages"
          description="Control group conversation invitations"
          onClick={() => {}}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Chat experience"
        description="Control read receipts and typing indicators"
        icon={<MessageCircle size={17} />}
      >
        <ToggleRow
          title="Read receipts"
          value={
            settings.advanced_settings.readReceipts !== false
          }
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "readReceipts",
              value
            )
          }
        />

        <ToggleRow
          title="Typing indicators"
          value={
            settings.advanced_settings.typingIndicators !== false
          }
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "typingIndicators",
              value
            )
          }
        />

        <ToggleRow
          title="Message notifications"
          value={
            settings.advanced_settings.messageNotifications !==
            false
          }
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "messageNotifications",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Message privacy"
        description="Accounts you've muted or blocked"
        icon={<Shield size={17} />}
      >
        <NavigationRow
          title="Blocked accounts"
          onClick={() =>
            navigate("/settings/privacy/blocked")
          }
        />

        <NavigationRow
          title="Muted accounts"
          onClick={() =>
            navigate("/settings/privacy/muted")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   FOLLOWERS
============================================================ */

const FollowersSettings = ({
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const discovery = settings.discovery_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Follower management"
        description="Manage how people follow and discover you"
        icon={<Users size={17} />}
      >
        <NavigationRow
          icon={<UserCheck size={17} />}
          title="Follow requests"
          description="Review pending requests"
          onClick={() => {}}
        />

        <NavigationRow
          icon={<UserMinus size={17} />}
          title="Remove followers"
          description="Remove accounts without blocking them"
          onClick={() => {}}
        />

        <NavigationRow
          icon={<Shield size={17} />}
          title="Blocked & restricted"
          description="Manage restricted accounts"
          onClick={() =>
            navigate("/settings/privacy/restricted")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Discoverability"
        description="Control how people find your account"
        icon={<Globe size={17} />}
      >
        <ToggleRow
          title="Account discoverability"
          value={discovery.discoverability}
          onChange={(value) =>
            updateJsonSetting(
              "discovery_settings",
              "discoverability",
              value
            )
          }
        />

        <ToggleRow
          title="Account suggestions"
          description="Allow your account to appear in suggestions"
          value={discovery.suggestAccount}
          onChange={(value) =>
            updateJsonSetting(
              "discovery_settings",
              "suggestAccount",
              value
            )
          }
        />

        <ToggleRow
          title="Contact syncing"
          description="Find friends from your contacts"
          value={discovery.contactSync}
          onChange={(value) =>
            updateJsonSetting(
              "discovery_settings",
              "contactSync",
              value
            )
          }
        />

        <ToggleRow
          title="Personalized recommendations"
          value={discovery.personalizedRecommendations}
          onChange={(value) =>
            updateJsonSetting(
              "discovery_settings",
              "personalizedRecommendations",
              value
            )
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   DATA
============================================================ */

const DataSettings = ({
  settings,
  updateJsonSetting,
  storageInfo,
  clearTemporaryData,
  calculateStorage,
  navigate,
}) => {
  const content = settings.content_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Data saver"
        description="Reduce mobile data usage"
        icon={<Wifi size={17} />}
      >
        <ToggleRow
          title="Data saver"
          description="Reduce video quality and background data usage"
          value={
            settings.advanced_settings.dataSaver || false
          }
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "dataSaver",
              value
            )
          }
        />

        <SelectRow
          title="Upload quality"
          value={content.uploadQuality}
          options={[
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
            ["original", "Original"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "uploadQuality",
              value
            )
          }
        />

        <SelectRow
          title="Download quality"
          value={content.downloadQuality}
          options={[
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
            ["original", "Original"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "content_settings",
              "downloadQuality",
              value
            )
          }
        />
      </SettingsPanel>

      <StorageSummary
        storageInfo={storageInfo}
        onOpen={() => {}}
        detailed
      />

      <SettingsPanel
        title="Stored content"
        description="Manage content stored locally or in your account"
        icon={<HardDrive size={17} />}
      >
        <NavigationRow
          icon={<Video size={17} />}
          title="Videos"
          description="Uploaded and locally stored videos"
          onClick={() => navigate("/settings/library/videos")}
        />

        <NavigationRow
          icon={<FileText size={17} />}
          title="Drafts"
          description="Unpublished content"
          onClick={() => navigate("/settings/library/drafts")}
        />

        <NavigationRow
          icon={<ImageIcon size={17} />}
          title="Images & thumbnails"
          description="Images and generated thumbnails"
          onClick={() =>
            navigate("/settings/library/images")
          }
        />

        <NavigationRow
          icon={<Mic size={17} />}
          title="Audio"
          description="Audio and music files"
          onClick={() => navigate("/settings/library/audio")}
        />

        <NavigationRow
          icon={<Radio size={17} />}
          title="Live recordings"
          description="Saved livestream recordings"
          onClick={() =>
            navigate("/settings/library/live-recordings")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Temporary data"
        description="Clear locally stored temporary information"
        icon={<Trash2 size={17} />}
      >
        <ActionButton
          danger
          onClick={clearTemporaryData}
          icon={<Trash2 size={14} />}
        >
          Clear Temporary Data
        </ActionButton>

        <ActionButton
          onClick={calculateStorage}
          icon={<RefreshCw size={14} />}
        >
          Recalculate Storage
        </ActionButton>
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   LANGUAGE
============================================================ */

const LanguageSettings = ({
  settings,
  updateJsonSetting,
  profile,
  updateProfile,
}) => {
  const advanced = settings.advanced_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Language"
        description="Choose the languages used by the application"
        icon={<Languages size={17} />}
      >
        <SelectRow
          title="App language"
          value={advanced.appLanguage || "English"}
          options={[
            ["English", "English"],
            ["Chichewa", "Chichewa"],
            ["Tumbuka", "Tumbuka"],
            ["French", "French"],
            ["Portuguese", "Portuguese"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "appLanguage",
              value
            )
          }
        />

        <SelectRow
          title="Content language"
          value={advanced.contentLanguage || "English"}
          options={[
            ["English", "English"],
            ["Chichewa", "Chichewa"],
            ["Tumbuka", "Tumbuka"],
            ["French", "French"],
            ["Portuguese", "Portuguese"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "contentLanguage",
              value
            )
          }
        />

        <ToggleRow
          title="Automatic translation"
          value={advanced.autoTranslate !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "autoTranslate",
              value
            )
          }
        />

        <SelectRow
          title="Caption language"
          value={advanced.captionLanguage || "English"}
          options={[
            ["English", "English"],
            ["Chichewa", "Chichewa"],
            ["Tumbuka", "Tumbuka"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "captionLanguage",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Region"
        description="Regional preferences for the platform"
        icon={<Globe size={17} />}
      >
        <SettingInfo
          label="Country"
          value={profile.country || "Malawi"}
        />

        <SettingInfo
          label="Currency"
          value={profile.currency_preference || "MWK"}
        />

        <SelectRow
          title="Currency preference"
          value={profile.currency_preference || "MWK"}
          options={[
            ["MWK", "MWK — Malawi Kwacha"],
            ["USD", "USD — US Dollar"],
            ["ZAR", "ZAR — South African Rand"],
            ["GBP", "GBP — British Pound"],
            ["EUR", "EUR — Euro"],
          ]}
          onChange={(value) =>
            updateProfile("currency_preference", value)
          }
        />

        <SelectRow
          title="Timezone"
          value={advanced.timezone || "Africa/Blantyre"}
          options={[
            ["Africa/Blantyre", "Africa/Blantyre (CAT)"],
            ["UTC", "UTC"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "timezone",
              value
            )
          }
        />

        <SelectRow
          title="Date format"
          value={advanced.dateFormat || "DD/MM/YYYY"}
          options={[
            ["DD/MM/YYYY", "DD/MM/YYYY"],
            ["MM/DD/YYYY", "MM/DD/YYYY"],
            ["YYYY-MM-DD", "YYYY-MM-DD"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "dateFormat",
              value
            )
          }
        />

        <SelectRow
          title="Number format"
          value={advanced.numberFormat || "local"}
          options={[
            ["local", "Local"],
            ["international", "International"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "numberFormat",
              value
            )
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   APPEARANCE
============================================================ */

const AppearanceSettings = ({
  profile,
  settings,
  updateProfile,
  updateJsonSetting,
}) => {
  const appearance = settings.appearance_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Theme"
        description="Choose the visual appearance of the application"
        icon={<Palette size={17} />}
      >
        <SelectRow
          title="Theme"
          value={profile.theme_preference || "neon"}
          options={[
            ["dark", "Dark"],
            ["light", "Light"],
            ["system", "System"],
            ["neon", "Neon"],
          ]}
          onChange={(value) =>
            updateProfile("theme_preference", value)
          }
        />

        <SelectRow
          title="Density"
          value={appearance.density}
          options={[
            ["compact", "Compact"],
            ["comfortable", "Comfortable"],
            ["spacious", "Spacious"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "density",
              value
            )
          }
        />

        <ToggleRow
          title="Compact mode"
          value={appearance.compactMode}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "compactMode",
              value
            )
          }
        />

        <ToggleRow
          title="Animations"
          value={appearance.animations}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "animations",
              value
            )
          }
        />

        <ToggleRow
          title="Reduce motion"
          value={appearance.reduceMotion}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "reduceMotion",
              value
            )
          }
        />

        <ToggleRow
          title="Glass effects"
          value={appearance.glass}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "glass",
              value
            )
          }
        />

        <ToggleRow
          title="Blur effects"
          value={appearance.blur}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "blur",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Accent color"
        description="Customize your interface accent"
        icon={<Sparkles size={17} />}
      >
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            "#06b6d4",
            "#8b5cf6",
            "#ec4899",
            "#22c55e",
            "#f59e0b",
            "#ef4444",
            "#3b82f6",
            "#ffffff",
          ].map((color) => (
            <button
              key={color}
              onClick={() =>
                updateProfile("accent_color", color)
              }
              className={`h-10 rounded-xl border transition ${
                profile.accent_color === color
                  ? "border-white"
                  : "border-white/10"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Accent ${color}`}
            />
          ))}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Typography"
        description="Control text readability"
        icon={<FileText size={17} />}
      >
        <SelectRow
          title="Font size"
          value={appearance.fontSize}
          options={[
            ["small", "Small"],
            ["medium", "Medium"],
            ["large", "Large"],
            ["xlarge", "Extra large"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "fontSize",
              value
            )
          }
        />

        <ToggleRow
          title="High contrast"
          value={appearance.highContrast}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "highContrast",
              value
            )
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   ACCESSIBILITY
============================================================ */

const AccessibilitySettings = ({
  settings,
  updateJsonSetting,
}) => {
  const appearance = settings.appearance_settings;
  const advanced = settings.advanced_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Visual accessibility"
        description="Make the interface easier to see"
        icon={<Eye size={17} />}
      >
        <SelectRow
          title="Font size"
          value={appearance.fontSize}
          options={[
            ["small", "Small"],
            ["medium", "Medium"],
            ["large", "Large"],
            ["xlarge", "Extra large"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "fontSize",
              value
            )
          }
        />

        <ToggleRow
          title="High contrast"
          value={appearance.highContrast}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "highContrast",
              value
            )
          }
        />

        <ToggleRow
          title="Reduce motion"
          value={appearance.reduceMotion}
          onChange={(value) =>
            updateJsonSetting(
              "appearance_settings",
              "reduceMotion",
              value
            )
          }
        />

        <ToggleRow
          title="Color-blind-friendly mode"
          value={advanced.colorBlindFriendly || false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "colorBlindFriendly",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Audio & media accessibility"
        description="Improve accessibility for video and audio"
        icon={<Mic size={17} />}
      >
        <ToggleRow
          title="Captions"
          value={advanced.captions !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "captions",
              value
            )
          }
        />

        <ToggleRow
          title="Audio descriptions"
          value={advanced.audioDescriptions || false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "audioDescriptions",
              value
            )
          }
        />

        <ToggleRow
          title="Screen reader optimization"
          value={advanced.screenReader || false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "screenReader",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Touch & interaction"
        description="Make controls easier to interact with"
        icon={<Smartphone size={17} />}
      >
        <SelectRow
          title="Touch target size"
          value={advanced.touchTargetSize || "normal"}
          options={[
            ["small", "Small"],
            ["normal", "Normal"],
            ["large", "Large"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "touchTargetSize",
              value
            )
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   PAYMENTS
============================================================ */

const PaymentSettings = ({
  profile,
  settings,
  updateProfile,
  updateJsonSetting,
  navigate,
}) => {
  const financial = settings.financial_settings;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FinanceCard
          title="Balance"
          value={formatMoney(
            profile.balance,
            profile.currency_preference || "MWK"
          )}
          icon={<Wallet size={18} />}
        />

        <FinanceCard
          title="Coins"
          value={Number(profile.coins || 0).toLocaleString()}
          icon={<Coins size={18} />}
        />

        <FinanceCard
          title="Tokens earned"
          value={Number(
            profile.total_tokens_earned || 0
          ).toLocaleString()}
          icon={<Sparkles size={18} />}
        />
      </div>

      <SettingsPanel
        title="Wallet"
        description="Your creator financial summary"
        icon={<Wallet size={17} />}
      >
        <SettingInfo
          label="Available balance"
          value={formatMoney(
            profile.balance,
            profile.currency_preference || "MWK"
          )}
        />

        <SettingInfo
          label="Coins"
          value={Number(profile.coins || 0).toLocaleString()}
        />

        <SettingInfo
          label="Lifetime tokens"
          value={Number(
            profile.total_tokens_earned || 0
          ).toLocaleString()}
        />

        <SettingInfo
          label="Subscription tier"
          value={profile.subscription_tier || "Free"}
        />

        <div className="flex flex-wrap gap-2 pt-3">
          <ActionButton
            onClick={() => navigate("/payouts")}
            icon={<Wallet size={14} />}
          >
            Open Payouts
          </ActionButton>

          <ActionButton
            onClick={() => navigate("/settings/payments/transactions")}
            icon={<FileText size={14} />}
          >
            Transactions
          </ActionButton>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Payment methods"
        description="Manage your supported payout methods"
        icon={<Smartphone size={17} />}
      >
        <SelectRow
          title="Default payout method"
          value={
            profile.payout_method || financial.defaultPayoutMethod
          }
          options={[
            ["Mobile Money", "Mobile Money"],
            ["TNM Mpamba", "TNM Mpamba"],
            ["Airtel Money", "Airtel Money"],
            ["Bank", "Bank"],
          ]}
          onChange={(value) =>
            updateProfile("payout_method", value)
          }
        />

        <SelectRow
          title="Currency"
          value={profile.currency_preference || "MWK"}
          options={[
            ["MWK", "MWK"],
            ["USD", "USD"],
            ["ZAR", "ZAR"],
            ["GBP", "GBP"],
            ["EUR", "EUR"],
          ]}
          onChange={(value) =>
            updateProfile("currency_preference", value)
          }
        />

        <ToggleRow
          title="Payment verification"
          description="Mark your payout configuration as verified"
          value={financial.paymentVerified}
          onChange={(value) =>
            updateJsonSetting(
              "financial_settings",
              "paymentVerified",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Payouts"
        description="Control how creator earnings are withdrawn"
        icon={<Wallet size={17} />}
      >
        <SettingInfo
          label="Minimum payout"
          value={
            financial.minimumPayout
              ? formatMoney(
                  financial.minimumPayout,
                  profile.currency_preference || "MWK"
                )
              : "Platform default"
          }
        />

        <ToggleRow
          title="Automatic payouts"
          value={financial.autoPayout}
          onChange={(value) =>
            updateJsonSetting(
              "financial_settings",
              "autoPayout",
              value
            )
          }
        />

        <SelectRow
          title="Payout schedule"
          value={financial.payoutSchedule}
          options={[
            ["manual", "Manual"],
            ["weekly", "Weekly"],
            ["monthly", "Monthly"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "financial_settings",
              "payoutSchedule",
              value
            )
          }
        />

        <NavigationRow
          title="Payout history"
          description="Pending, completed, failed and cancelled payouts"
          onClick={() => navigate("/payouts")}
        />

        <NavigationRow
          title="Transaction history"
          description="Payments, purchases, gifts and refunds"
          onClick={() =>
            navigate("/settings/payments/transactions")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   CREATOR
============================================================ */

const CreatorSettings = ({
  profile,
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const creator = settings.creator_settings;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FinanceCard
          title="Creator level"
          value={`Level ${profile.creator_level || 1}`}
          icon={<Award size={18} />}
        />

        <FinanceCard
          title="XP"
          value={Number(profile.creator_xp || 0).toLocaleString()}
          icon={<Zap size={18} />}
        />

        <FinanceCard
          title="Followers"
          value={Number(
            profile.follower_count || 0
          ).toLocaleString()}
          icon={<Users size={18} />}
        />

        <FinanceCard
          title="Likes"
          value={Number(
            profile.total_likes || 0
          ).toLocaleString()}
          icon={<Sparkles size={18} />}
        />
      </div>

      <SettingsPanel
        title="Creator dashboard"
        description="Creator tools and professional controls"
        icon={<LayoutDashboard size={17} />}
      >
        <ToggleRow
          title="Creator dashboard"
          value={creator.creatorDashboard}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "creatorDashboard",
              value
            )
          }
        />

        <ToggleRow
          title="Analytics"
          value={creator.analytics}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "analytics",
              value
            )
          }
        />

        <ToggleRow
          title="Audience insights"
          value={creator.audienceInsights}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "audienceInsights",
              value
            )
          }
        />

        <ToggleRow
          title="Content performance"
          value={creator.contentPerformance}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "contentPerformance",
              value
            )
          }
        />

        <ToggleRow
          title="Growth recommendations"
          value={creator.growthRecommendations}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "growthRecommendations",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Creator monetization"
        description="Features related to earning from your audience"
        icon={<Wallet size={17} />}
      >
        {[
          ["earnings", "Earnings"],
          ["gifts", "Gifts"],
          ["subscriptions", "Subscriptions"],
          ["paidContent", "Paid content"],
        ].map(([key, title]) => (
          <ToggleRow
            key={key}
            title={title}
            value={Boolean(creator[key])}
            onChange={(value) =>
              updateJsonSetting(
                "creator_settings",
                key,
                value
              )
            }
          />
        ))}
      </SettingsPanel>

      <SettingsPanel
        title="Creator tools"
        description="Publishing, livestream and content tools"
        icon={<Sparkles size={17} />}
      >
        <ToggleRow
          title="Livestream"
          value={creator.livestream}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "livestream",
              value
            )
          }
        />

        <ToggleRow
          title="Scheduling"
          value={creator.scheduling}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "scheduling",
              value
            )
          }
        />

        <ToggleRow
          title="Media kit"
          value={creator.mediaKit}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "mediaKit",
              value
            )
          }
        />

        <ToggleRow
          title="Brand collaboration"
          value={creator.brandCollaboration}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "brandCollaboration",
              value
            )
          }
        />

        <NavigationRow
          title="Creator analytics"
          description="Open detailed performance analytics"
          onClick={() => navigate("/universe-tools")}
        />

        <NavigationRow
          title="Live Center"
          description="Manage livestreams"
          onClick={() => navigate("/live-universe")}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   SCHEDULING
============================================================ */

const SchedulingSettings = ({
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const creator = settings.creator_settings;
  const advanced = settings.advanced_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Scheduling"
        description="Manage scheduled videos and livestreams"
        icon={<Play size={17} />}
      >
        <ToggleRow
          title="Scheduling enabled"
          value={creator.scheduling}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "scheduling",
              value
            )
          }
        />

        <ToggleRow
          title="Auto publishing"
          value={advanced.autoPublishing || false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "autoPublishing",
              value
            )
          }
        />

        <ToggleRow
          title="Publishing notifications"
          value={advanced.publishingNotifications !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "publishingNotifications",
              value
            )
          }
        />

        <ToggleRow
          title="Failed publishing notifications"
          value={advanced.failedPublishingNotifications !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "failedPublishingNotifications",
              value
            )
          }
        />

        <SelectRow
          title="Publishing timezone"
          value={advanced.timezone || "Africa/Blantyre"}
          options={[
            ["Africa/Blantyre", "Africa/Blantyre (CAT)"],
            ["UTC", "UTC"],
          ]}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "timezone",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Calendar"
        description="Scheduled publishing workspace"
        icon={<FileText size={17} />}
      >
        <NavigationRow
          title="Scheduled videos"
          description="View and manage scheduled videos"
          onClick={() =>
            navigate("/settings/creator/scheduling/videos")
          }
        />

        <NavigationRow
          title="Scheduled livestreams"
          description="View and manage scheduled lives"
          onClick={() =>
            navigate("/settings/creator/scheduling/lives")
          }
        />

        <NavigationRow
          title="Publishing calendar"
          description="View your creator publishing calendar"
          onClick={() =>
            navigate("/settings/creator/scheduling/calendar")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   LIBRARY
============================================================ */

const LibrarySettings = ({ navigate }) => {
  const rows = [
    ["Videos", "Uploaded videos", "/settings/library/videos"],
    ["Drafts", "Unpublished content", "/settings/library/drafts"],
    ["Images", "Images and graphics", "/settings/library/images"],
    ["Audio", "Audio and music", "/settings/library/audio"],
    [
      "Thumbnails",
      "Generated and uploaded thumbnails",
      "/settings/library/thumbnails",
    ],
    [
      "Live recordings",
      "Saved livestream recordings",
      "/settings/library/live-recordings",
    ],
    [
      "Archived",
      "Archived content",
      "/settings/library/archived",
    ],
    [
      "Recently deleted",
      "Recoverable deleted content",
      "/settings/library/recently-deleted",
    ],
  ];

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Content library"
        description="Everything you've uploaded or created"
        icon={<FileArchive size={17} />}
      >
        {rows.map(([title, description, path]) => (
          <NavigationRow
            key={title}
            title={title}
            description={description}
            onClick={() => navigate(path)}
          />
        ))}
      </SettingsPanel>

      <SettingsPanel
        title="Recovery"
        description="Recover recently deleted content when available"
        icon={<RefreshCw size={17} />}
      >
        <NavigationRow
          title="Recently deleted"
          description="Content still within the recovery period"
          onClick={() =>
            navigate("/settings/library/recently-deleted")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   PROGRESS
============================================================ */

const ProgressSettings = ({
  profile,
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const creator = settings.creator_settings;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/[0.07] bg-[#070707] p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/10 flex items-center justify-center text-yellow-400">
            <Award size={25} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[3px] text-zinc-600">
              Creator Progress
            </div>

            <div className="text-2xl font-black mt-1">
              Level {profile.creator_level || 1}
            </div>

            <div className="text-xs text-zinc-500">
              {Number(profile.creator_xp || 0).toLocaleString()} XP
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Number(profile.creator_xp || 0) % 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      <SettingsPanel
        title="Progress"
        description="Track milestones and achievements"
        icon={<Award size={17} />}
      >
        <NavigationRow
          title="Achievements"
          description="View earned achievements"
          onClick={() =>
            navigate("/settings/creator/achievements")
          }
        />

        <NavigationRow
          title="Badges"
          description="View your profile badges"
          onClick={() =>
            navigate("/settings/creator/badges")
          }
        />

        <NavigationRow
          title="Streaks"
          description="Track creator activity streaks"
          onClick={() =>
            navigate("/settings/creator/streaks")
          }
        />

        <NavigationRow
          title="Milestones"
          description="Creator milestones"
          onClick={() =>
            navigate("/settings/creator/milestones")
          }
        />

        <NavigationRow
          title="Leaderboard"
          description="Compare creator progress"
          onClick={() =>
            navigate("/settings/creator/leaderboard")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Goals"
        description="Creator goals and recommendations"
        icon={<Zap size={17} />}
      >
        <ToggleRow
          title="Creator goals"
          value={creator.goals}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "goals",
              value
            )
          }
        />

        <NavigationRow
          title="Manage goals"
          description="Set and track your creator goals"
          onClick={() =>
            navigate("/settings/creator/goals")
          }
        />

        <NavigationRow
          title="Rewards"
          description="Available creator rewards"
          onClick={() =>
            navigate("/settings/creator/rewards")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   BRAND
============================================================ */

const BrandSettings = ({
  profile,
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const creator = settings.creator_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Business profile"
        description="Professional information for collaborations"
        icon={<BriefcaseBusiness size={17} />}
      >
        <SettingInfo
          label="Creator category"
          value={profile.creator_category || "Not set"}
        />

        <SettingInfo
          label="Creator website"
          value={profile.creator_website || "Not set"}
        />

        <SettingInfo
          label="Business email"
          value={profile.business_email || "Not set"}
        />

        <SettingInfo
          label="Business phone"
          value={profile.business_phone || "Not set"}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Brand collaboration"
        description="Manage commercial creator opportunities"
        icon={<BriefcaseBusiness size={17} />}
      >
        <ToggleRow
          title="Brand collaborations"
          value={creator.brandCollaboration}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "brandCollaboration",
              value
            )
          }
        />

        <ToggleRow
          title="Media kit"
          value={creator.mediaKit}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "mediaKit",
              value
            )
          }
        />

        <NavigationRow
          title="Brand requests"
          description="Incoming collaboration requests"
          onClick={() =>
            navigate("/settings/brand/requests")
          }
        />

        <NavigationRow
          title="Partnership requests"
          description="Manage partnership opportunities"
          onClick={() =>
            navigate("/settings/brand/partnerships")
          }
        />

        <NavigationRow
          title="Campaigns"
          description="Active and completed campaigns"
          onClick={() =>
            navigate("/settings/brand/campaigns")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Creator business tools"
        description="Professional materials and pricing"
        icon={<FileText size={17} />}
      >
        <NavigationRow
          title="Media kit"
          description="Create and manage your media kit"
          onClick={() =>
            navigate("/settings/brand/media-kit")
          }
        />

        <NavigationRow
          title="Portfolio"
          description="Showcase your best work"
          onClick={() =>
            navigate("/settings/brand/portfolio")
          }
        />

        <NavigationRow
          title="Rate card"
          description="Set your collaboration rates"
          onClick={() =>
            navigate("/settings/brand/rate-card")
          }
        />

        <NavigationRow
          title="Campaign analytics"
          description="Track campaign performance"
          onClick={() =>
            navigate("/settings/brand/analytics")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   COPYRIGHT
============================================================ */

const CopyrightSettings = ({ navigate }) => {
  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Copyright status"
        description="Review ownership and copyright activity"
        icon={<ShieldCheck size={17} />}
      >
        <NavigationRow
          title="Copyright status"
          description="Current status of your account"
          onClick={() =>
            navigate("/settings/copyright/status")
          }
        />

        <NavigationRow
          title="Claims"
          description="Copyright claims involving your content"
          onClick={() =>
            navigate("/settings/copyright/claims")
          }
        />

        <NavigationRow
          title="Strikes"
          description="Copyright strikes and their status"
          onClick={() =>
            navigate("/settings/copyright/strikes")
          }
        />

        <NavigationRow
          title="Disputes & appeals"
          description="Manage copyright disputes"
          onClick={() =>
            navigate("/settings/copyright/disputes")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Rights"
        description="Manage ownership and music rights"
        icon={<FileText size={17} />}
      >
        <NavigationRow
          title="Content ownership"
          description="Review ownership of your content"
          onClick={() => {}}
        />

        <NavigationRow
          title="Music rights"
          description="Music usage and licensing information"
          onClick={() => {}}
        />

        <NavigationRow
          title="AI disclosure"
          description="Manage AI-assisted content disclosures"
          onClick={() => {}}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Safety"
        description="Community safety and content enforcement"
        icon={<Shield size={17} />}
      >
        <NavigationRow
          title="Community guidelines"
          description="Rules for content and interactions"
          onClick={() => navigate("/community-guidelines")}
        />

        <NavigationRow
          title="Content violations"
          description="Review warnings and restrictions"
          onClick={() => {}}
        />

        <NavigationRow
          title="Removed content"
          description="Content removed from your account"
          onClick={() => {}}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   AI
============================================================ */

const AISettings = ({
  settings,
  updateJsonSetting,
  navigate,
}) => {
  const creator = settings.creator_settings;
  const advanced = settings.advanced_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="AI assistant"
        description="Configure AI-powered tools across Mpade Universe"
        icon={<Bot size={17} />}
      >
        <NavigationRow
          icon={<Bot size={17} />}
          title="AI Assistant"
          description="Open your AI assistant"
          onClick={() => navigate("/ai")}
        />

        <ToggleRow
          title="AI recommendations"
          description="Use AI to personalize recommendations"
          value={creator.aiRecommendations}
          onChange={(value) =>
            updateJsonSetting(
              "creator_settings",
              "aiRecommendations",
              value
            )
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Creator AI tools"
        description="AI tools for creating and managing content"
        icon={<Sparkles size={17} />}
      >
        <NavigationRow
          title="Captions"
          description="Generate captions"
          onClick={() => navigate("/ai/captions")}
        />

        <NavigationRow
          title="Hashtags"
          description="Generate relevant hashtags"
          onClick={() => navigate("/ai/hashtags")}
        />

        <NavigationRow
          title="Scripts"
          description="Generate video scripts"
          onClick={() => navigate("/ai/scripts")}
        />

        <NavigationRow
          title="Thumbnails"
          description="AI thumbnail tools"
          onClick={() => navigate("/ai/thumbnails")}
        />

        <NavigationRow
          title="Video analysis"
          description="Analyze creator content"
          onClick={() => navigate("/ai/video-analysis")}
        />

        <NavigationRow
          title="Comment replies"
          description="Generate suggested replies"
          onClick={() => navigate("/ai/comment-replies")}
        />

        <NavigationRow
          title="AI moderation"
          description="AI-assisted moderation"
          onClick={() => navigate("/ai/moderation")}
        />
      </SettingsPanel>

      <SettingsPanel
        title="AI privacy"
        description="Control how AI interacts with your data"
        icon={<Lock size={17} />}
      >
        <ToggleRow
          title="Personalization"
          value={advanced.aiPersonalization !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "aiPersonalization",
              value
            )
          }
        />

        <ToggleRow
          title="AI data usage"
          description="Allow supported AI features to use activity data"
          value={advanced.aiDataUsage !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "aiDataUsage",
              value
            )
          }
        />

        <ToggleRow
          title="AI disclosure"
          value={advanced.aiDisclosure !== false}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "aiDisclosure",
              value
            )
          }
        />

        <NavigationRow
          title="AI history"
          description="Review previous AI interactions"
          onClick={() => navigate("/settings/ai/history")}
        />

        <NavigationRow
          title="Clear AI history"
          description="Remove stored AI interaction history"
          onClick={() => {}}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   REPORTS
============================================================ */

const ReportsSettings = ({ navigate }) => {
  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Download your information"
        description="Export a copy of your Mpade Universe data"
        icon={<Download size={17} />}
      >
        <NavigationRow
          icon={<FileArchive size={17} />}
          title="Personal data"
          description="Profile, settings and account information"
          onClick={() =>
            navigate("/settings/reports/personal-data")
          }
        />

        <NavigationRow
          icon={<Video size={17} />}
          title="Videos"
          description="Export your uploaded video information"
          onClick={() =>
            navigate("/settings/reports/videos")
          }
        />

        <NavigationRow
          icon={<Users size={17} />}
          title="Followers"
          description="Export follower information"
          onClick={() =>
            navigate("/settings/reports/followers")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Creator reports"
        description="Download analytics and creator reports"
        icon={<LayoutDashboard size={17} />}
      >
        <NavigationRow
          title="Analytics report"
          description="Creator performance data"
          onClick={() =>
            navigate("/settings/reports/analytics")
          }
        />

        <NavigationRow
          title="Earnings report"
          description="Creator earnings information"
          onClick={() =>
            navigate("/settings/reports/earnings")
          }
        />

        <NavigationRow
          title="Transaction report"
          description="Payments and transactions"
          onClick={() =>
            navigate("/settings/reports/transactions")
          }
        />

        <NavigationRow
          title="Monthly creator report"
          description="Monthly creator summary"
          onClick={() =>
            navigate("/settings/reports/monthly")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Export formats"
        description="Supported data formats"
        icon={<FileText size={17} />}
      >
        <div className="flex flex-wrap gap-2">
          <Badge>CSV</Badge>
          <Badge>JSON</Badge>
          <Badge>PDF</Badge>
          <Badge>Archive</Badge>
        </div>
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   CONNECTED APPS
============================================================ */

const ConnectedAppsSettings = ({ navigate }) => {
  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Connected applications"
        description="Third-party services authorized to access your account"
        icon={<Code2 size={17} />}
      >
        <NavigationRow
          title="Connected apps"
          description="View applications linked to your account"
          onClick={() => {}}
        />

        <NavigationRow
          title="OAuth access"
          description="Manage OAuth authorizations"
          onClick={() => {}}
        />

        <NavigationRow
          title="Authorized devices"
          description="Devices authorized for account access"
          onClick={() =>
            navigate("/settings/security/devices")
          }
        />

        <NavigationRow
          title="API access"
          description="Manage API credentials and permissions"
          onClick={() => {}}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Permissions"
        description="Control third-party access"
        icon={<Shield size={17} />}
      >
        <NavigationRow
          title="Third-party permissions"
          description="Review data permissions"
          onClick={() => {}}
        />

        <NavigationRow
          title="Revoke access"
          description="Remove access from connected services"
          onClick={() => {}}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   SUPPORT
============================================================ */

const SupportSettings = ({ navigate }) => {
  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Help"
        description="Find answers and assistance"
        icon={<CircleHelp size={17} />}
      >
        <NavigationRow
          icon={<CircleHelp size={17} />}
          title="Help Center"
          description="Find answers to common questions"
          onClick={() => navigate("/support")}
        />

        <NavigationRow
          title="Report a problem"
          description="Tell us about an issue"
          onClick={() => navigate("/support/report")}
        />

        <NavigationRow
          title="Report content"
          description="Report content that violates guidelines"
          onClick={() => navigate("/support/report-content")}
        />

        <NavigationRow
          title="Account recovery"
          description="Get help recovering your account"
          onClick={() => navigate("/support/recovery")}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Specialized support"
        description="Get help with specific areas"
        icon={<Shield size={17} />}
      >
        <NavigationRow
          title="Copyright support"
          onClick={() =>
            navigate("/support/copyright")
          }
        />

        <NavigationRow
          title="Payments support"
          onClick={() =>
            navigate("/support/payments")
          }
        />

        <NavigationRow
          title="Creator support"
          onClick={() =>
            navigate("/support/creator")
          }
        />

        <NavigationRow
          title="Safety Center"
          onClick={() =>
            navigate("/support/safety")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Legal"
        description="Policies and legal information"
        icon={<FileText size={17} />}
      >
        <NavigationRow
          title="Community Guidelines"
          onClick={() =>
            navigate("/community-guidelines")
          }
        />

        <NavigationRow
          title="Terms of Service"
          onClick={() => navigate("/terms")}
        />

        <NavigationRow
          title="Privacy Policy"
          onClick={() => navigate("/privacy")}
        />

        <NavigationRow
          title="Cookie Policy"
          onClick={() => navigate("/cookies")}
        />

        <NavigationRow
          title="About Mpade Universe"
          onClick={() => navigate("/about")}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Support tickets"
        description="Track your support requests"
        icon={<FileText size={17} />}
      >
        <NavigationRow
          title="My tickets"
          description="View open and previous support tickets"
          onClick={() => navigate("/support/tickets")}
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   SYSTEM
============================================================ */

const SystemSettings = ({
  settings,
  updateJsonSetting,
  storageInfo,
  calculateStorage,
  clearTemporaryData,
}) => {
  const advanced = settings.advanced_settings;

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Application"
        description="Information about this installation"
        icon={<Settings2 size={17} />}
      >
        <SettingInfo
          label="App version"
          value="2.4.0-Beta"
        />

        <SettingInfo
          label="Build"
          value="Production"
        />

        <SettingInfo
          label="Platform"
          value="Web / Vite"
        />

        <SettingInfo
          label="Database"
          value="Supabase"
        />

        <SettingInfo
          label="Storage"
          value="Supabase Storage"
        />
      </SettingsPanel>

      <SettingsPanel
        title="Synchronization"
        description="Background and network behavior"
        icon={<RefreshCw size={17} />}
      >
        <ToggleRow
          title="Auto refresh"
          value={advanced.autoRefresh}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "autoRefresh",
              value
            )
          }
        />

        <ToggleRow
          title="Background sync"
          value={advanced.backgroundSync}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "backgroundSync",
              value
            )
          }
        />

        <ToggleRow
          title="Offline mode"
          value={advanced.offlineMode}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "offlineMode",
              value
            )
          }
        />

        <SettingInfo
          label="Last local calculation"
          value={new Date().toLocaleString()}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Diagnostics"
        description="Troubleshooting tools"
        icon={<Activity size={17} />}
      >
        <ToggleRow
          title="Diagnostics"
          description="Enable diagnostic information"
          value={advanced.diagnostics}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "diagnostics",
              value
            )
          }
        />

        <ToggleRow
          title="Error logging"
          description="Allow client-side error logging"
          value={advanced.errorLogging}
          onChange={(value) =>
            updateJsonSetting(
              "advanced_settings",
              "errorLogging",
              value
            )
          }
        />

        <NavigationRow
          title="Error logs"
          description="View available diagnostic logs"
          onClick={() => {}}
        />

        <StorageSummary
          storageInfo={storageInfo}
          onOpen={() => {}}
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <ActionButton
            onClick={calculateStorage}
            icon={<RefreshCw size={14} />}
          >
            Refresh Diagnostics
          </ActionButton>

          <ActionButton
            danger
            onClick={clearTemporaryData}
            icon={<Trash2 size={14} />}
          >
            Clear Temp Data
          </ActionButton>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Service architecture"
        description="Live infrastructure is separate from Settings"
        icon={<Cloud size={17} />}
      >
        <StatusRow
          label="Supabase"
          status="Connected"
        />

        <StatusRow
          label="Profile service"
          status="Connected"
        />

        <StatusRow
          label="Socket.IO"
          status="Live module"
          muted
        />

        <StatusRow
          label="Media processing"
          status="Backend dependent"
          muted
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   EXIT
============================================================ */

const ExitSettings = ({
  navigate,
  onLogout,
}) => {
  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Before leaving"
        description="Protect your data before deactivating or deleting"
        icon={<Download size={17} />}
      >
        <NavigationRow
          icon={<Download size={17} />}
          title="Download your information"
          description="Get a copy of your data before leaving"
          onClick={() => navigate("/settings/reports")}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Sign out"
        description="End your current session"
        icon={<LogOut size={17} />}
      >
        <ActionButton
          onClick={onLogout}
          icon={<LogOut size={14} />}
        >
          Log Out
        </ActionButton>

        <NavigationRow
          title="Log out all devices"
          description="End sessions on every authorized device"
          badge="Backend"
          onClick={() => {}}
        />
      </SettingsPanel>

      <SettingsPanel
        title="Deactivate account"
        description="Temporarily disable your account"
        icon={<Pause size={17} />}
      >
        <NavigationRow
          title="Deactivate account"
          description="Temporarily hide your account and content"
          onClick={() =>
            navigate("/settings/account/deactivate")
          }
        />
      </SettingsPanel>

      <SettingsPanel
        title="Delete account"
        description="Permanently remove your account and associated data"
        icon={<Trash2 size={17} />}
        danger
      >
        <NavigationRow
          title="Delete account"
          description="This action requires confirmation"
          danger
          onClick={() =>
            navigate("/settings/account/delete")
          }
        />
      </SettingsPanel>
    </div>
  );
};

/* ============================================================
   UI COMPONENTS
============================================================ */

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3">
    <div className="text-[9px] uppercase tracking-[2px] text-zinc-700">
      {label}
    </div>

    <div className="text-sm font-black text-zinc-200 mt-1 truncate">
      {value}
    </div>
  </div>
);

const QuickCard = ({
  icon,
  title,
  value,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="text-left rounded-2xl border border-white/[0.06] bg-[#070707] hover:bg-white/[0.035] hover:border-white/[0.11] p-4 transition group"
  >
    <div className="w-9 h-9 rounded-xl bg-cyan-400/[0.07] border border-cyan-400/10 text-cyan-400 flex items-center justify-center">
      {icon}
    </div>

    <div className="text-[9px] uppercase tracking-[2px] text-zinc-700 mt-4">
      {title}
    </div>

    <div className="text-xs font-black text-zinc-300 mt-1 group-hover:text-white">
      {value}
    </div>
  </button>
);

const OverviewCard = ({
  category,
  onClick,
}) => {
  const Icon = category.icon;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border border-white/[0.06] bg-[#070707] hover:bg-[#0b0b0b] hover:border-cyan-400/20 p-5 transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-400/20 transition">
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-zinc-200 group-hover:text-white">
            {category.title}
          </h3>

          <p className="text-[11px] leading-relaxed text-zinc-600 mt-1">
            {category.description}
          </p>
        </div>

        <ChevronRight
          size={16}
          className="text-zinc-700 group-hover:text-cyan-400 transition"
        />
      </div>
    </button>
  );
};

const CategoryButton = ({
  category,
  active,
  onClick,
}) => {
  const Icon = category.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
        active
          ? "bg-cyan-400/[0.08] border border-cyan-400/10 text-cyan-300"
          : "border border-transparent text-zinc-500 hover:text-white hover:bg-white/[0.035]"
      }`}
    >
      <Icon
        size={16}
        className={
          active ? "text-cyan-400" : "text-zinc-600"
        }
      />

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold truncate">
          {category.title}
        </div>
      </div>

      {active && (
        <ChevronRight
          size={14}
          className="text-cyan-400"
        />
      )}
    </button>
  );
};

const SettingsPanel = ({
  title,
  description,
  icon,
  children,
  danger = false,
}) => (
  <div
    className={`rounded-2xl border ${
      danger
        ? "border-red-500/15"
        : "border-white/[0.06]"
    } bg-[#070707] overflow-hidden`}
  >
    <div className="px-5 py-4 border-b border-white/[0.05]">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            danger
              ? "bg-red-500/[0.08] text-red-400"
              : "bg-white/[0.025] text-zinc-400"
          }`}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-black text-zinc-200">
            {title}
          </h3>

          {description && (
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>

    <div>{children}</div>
  </div>
);

const SettingInfo = ({
  label,
  value,
  copyable = false,
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      // Clipboard permissions may be unavailable.
    }
  };

  return (
    <div className="flex items-start justify-between gap-5 px-5 py-4 border-b border-white/[0.04] last:border-b-0">
      <div className="text-[11px] text-zinc-600">
        {label}
      </div>

      <div className="flex items-center gap-2 text-right max-w-[65%]">
        <div className="text-xs text-zinc-300 break-words">
          {value || "Not set"}
        </div>

        {copyable && (
          <button
            onClick={handleCopy}
            className="text-zinc-600 hover:text-cyan-400"
            title="Copy"
          >
            <Copy size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

const ToggleRow = ({
  icon,
  title,
  description,
  value,
  onChange,
}) => (
  <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-b-0">
    {icon && (
      <div className="text-zinc-500 shrink-0">
        {icon}
      </div>
    )}

    <div className="flex-1 min-w-0">
      <div className="text-xs font-bold text-zinc-300">
        {title}
      </div>

      {description && (
        <div className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
          {description}
        </div>
      )}
    </div>

    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      className={`w-11 h-6 rounded-full p-1 transition shrink-0 ${
        value
          ? "bg-cyan-400"
          : "bg-zinc-800 border border-white/[0.07]"
      }`}
    >
      <motion.div
        animate={{
          x: value ? 20 : 0,
        }}
        className="w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  </div>
);

const SelectRow = ({
  title,
  description,
  value,
  options,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-5 px-5 py-4 border-b border-white/[0.04] last:border-b-0">
    <div className="min-w-0 flex-1">
      <div className="text-xs font-bold text-zinc-300">
        {title}
      </div>

      {description && (
        <div className="text-[10px] text-zinc-600 mt-1">
          {description}
        </div>
      )}
    </div>

    <div className="relative shrink-0">
      <select
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="appearance-none min-w-[130px] max-w-[190px] bg-black border border-white/[0.08] rounded-xl pl-3 pr-8 py-2 text-[11px] text-zinc-300 outline-none focus:border-cyan-400/30"
      >
        {options.map(([optionValue, label]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
      />
    </div>
  </div>
);

const NavigationRow = ({
  icon,
  title,
  description,
  badge,
  danger = false,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 text-left border-b border-white/[0.04] last:border-b-0 transition ${
      danger
        ? "hover:bg-red-500/[0.05]"
        : "hover:bg-white/[0.025]"
    }`}
  >
    {icon && (
      <div
        className={
          danger ? "text-red-400" : "text-zinc-500"
        }
      >
        {icon}
      </div>
    )}

    <div className="flex-1 min-w-0">
      <div
        className={`text-xs font-bold ${
          danger ? "text-red-400" : "text-zinc-300"
        }`}
      >
        {title}
      </div>

      {description && (
        <div className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
          {description}
        </div>
      )}
    </div>

    {badge && (
      <span className="px-2 py-1 rounded-md bg-white/[0.04] text-[9px] uppercase tracking-wider text-zinc-600">
        {badge}
      </span>
    )}

    <ChevronRight
      size={16}
      className="text-zinc-700 shrink-0"
    />
  </button>
);

const ActionButton = ({
  children,
  onClick,
  icon,
  danger = false,
}) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition ${
      danger
        ? "border-red-500/20 bg-red-500/[0.06] text-red-400 hover:bg-red-500/[0.12]"
        : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white"
    }`}
  >
    {icon}
    {children}
  </button>
);

const FinanceCard = ({
  title,
  value,
  icon,
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-[#070707] p-4">
    <div className="w-9 h-9 rounded-xl bg-cyan-400/[0.07] text-cyan-400 flex items-center justify-center">
      {icon}
    </div>

    <div className="text-[9px] text-zinc-700 uppercase tracking-[2px] mt-4">
      {title}
    </div>

    <div className="text-sm font-black text-zinc-200 mt-1">
      {value}
    </div>
  </div>
);

const Badge = ({ children }) => (
  <span className="px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.025] text-[10px] font-black uppercase tracking-wider text-zinc-500">
    {children}
  </span>
);

const StatusRow = ({
  label,
  status,
  muted = false,
}) => (
  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] last:border-b-0">
    <span className="text-xs text-zinc-500">
      {label}
    </span>

    <span
      className={`flex items-center gap-2 text-[10px] font-bold ${
        muted ? "text-zinc-600" : "text-emerald-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          muted ? "bg-zinc-700" : "bg-emerald-400"
        }`}
      />

      {status}
    </span>
  </div>
);

const StorageSummary = ({
  storageInfo,
  onOpen,
  detailed = false,
}) => {
  const localKB = (
    Number(storageInfo?.localStorage || 0) / 1024
  ).toFixed(1);

  const sessionKB = (
    Number(storageInfo?.sessionStorage || 0) / 1024
  ).toFixed(1);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#070707] p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/[0.07] text-yellow-400 flex items-center justify-center">
          <HardDrive size={18} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-black">
            Storage
          </div>

          <div className="text-[10px] text-zinc-600 mt-1">
            Browser storage currently measurable by this app
          </div>
        </div>

        <button
          onClick={onOpen}
          className="text-zinc-600 hover:text-white"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mt-5">
        <MiniStat
          label="Local storage"
          value={`${localKB} KB`}
        />

        <MiniStat
          label="Session storage"
          value={`${sessionKB} KB`}
        />

        <MiniStat
          label="IndexedDB"
          value={storageInfo?.indexedDB || "Unknown"}
        />
      </div>

      {detailed && (
        <div className="mt-4 text-[10px] leading-relaxed text-zinc-700">
          Browser storage is only part of your total Mpade Universe
          storage. Server-side videos, images, audio, drafts and
          recordings should be calculated from their respective
          storage/database records rather than displayed as fake
          hardcoded values.
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
