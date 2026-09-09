// src/services/creatorStudioService.js

import { supabase } from "../supabaseClient";

/*
 * ============================================================
 * CREATOR STUDIO SERVICE
 * ============================================================
 *
 * Central data/service layer for Creator Studio.
 *
 * Supports:
 * - Dashboard analytics
 * - Video analytics
 * - Live analytics
 * - Daily analytics
 * - Top content
 * - Achievements
 * - AI insights
 * - Growth
 * - Video management
 *
 * IMPORTANT:
 * No JSX belongs in this file.
 * ============================================================
 */


/* ============================================================
 * HELPERS
 * ============================================================
 */

export const safeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


export const normalizeOverview = (overview = {}) => {
  if (!overview) {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reposts: 0,
      followers: 0,
      revenue: 0,
      coins: 0,
      engagement_rate: 0,
      average_watch_seconds: 0,
      completion_rate: 0,
      profile_visits: 0,
      unique_viewers: 0,
      returning_viewers: 0,
      live_viewers: 0,
      peak_concurrent_viewers: 0,
    };
  }

  return {
    ...overview,

    views: safeNumber(
      overview.views ??
      overview.views_count ??
      overview.total_views
    ),

    likes: safeNumber(
      overview.likes ??
      overview.likes_count ??
      overview.total_likes
    ),

    comments: safeNumber(
      overview.comments ??
      overview.comments_count ??
      overview.total_comments
    ),

    shares: safeNumber(
      overview.shares ??
      overview.shares_count ??
      overview.total_shares
    ),

    saves: safeNumber(
      overview.saves ??
      overview.saves_count ??
      overview.total_saves
    ),

    reposts: safeNumber(
      overview.reposts ??
      overview.reposts_count ??
      overview.total_reposts
    ),

    followers: safeNumber(
      overview.followers ??
      overview.follower_count ??
      overview.followers_count
    ),

    revenue: safeNumber(
      overview.revenue ??
      overview.total_revenue
    ),

    coins: safeNumber(
      overview.coins ??
      overview.coins_received ??
      overview.total_coins
    ),

    engagement_rate: safeNumber(
      overview.engagement_rate
    ),

    average_watch_seconds: safeNumber(
      overview.average_watch_seconds
    ),

    completion_rate: safeNumber(
      overview.completion_rate ??
      overview.average_completion_rate
    ),

    profile_visits: safeNumber(
      overview.profile_visits
    ),

    unique_viewers: safeNumber(
      overview.unique_viewers
    ),

    returning_viewers: safeNumber(
      overview.returning_viewers
    ),

    live_viewers: safeNumber(
      overview.live_viewers
    ),

    peak_concurrent_viewers: safeNumber(
      overview.peak_concurrent_viewers
    ),
  };
};


/* ============================================================
 * GROWTH CALCULATION
 * ============================================================
 */

export const calculateGrowth = (
  current,
  previous
) => {
  const currentValue = safeNumber(current);
  const previousValue = safeNumber(previous);

  if (previousValue === 0) {
    if (currentValue === 0) {
      return 0;
    }

    return 100;
  }

  return (
    ((currentValue - previousValue) /
      Math.abs(previousValue)) *
    100
  );
};


/* ============================================================
 * DAILY STAT HELPERS
 * ============================================================
 */

export const getLatestDailyStat = (
  dailyAnalytics = []
) => {
  if (!Array.isArray(dailyAnalytics) || !dailyAnalytics.length) {
    return null;
  }

  return [...dailyAnalytics].sort(
    (a, b) =>
      new Date(b.stat_date || b.created_at || 0) -
      new Date(a.stat_date || a.created_at || 0)
  )[0];
};


export const getPreviousDailyStat = (
  dailyAnalytics = []
) => {
  if (
    !Array.isArray(dailyAnalytics) ||
    dailyAnalytics.length < 2
  ) {
    return null;
  }

  const sorted = [...dailyAnalytics].sort(
    (a, b) =>
      new Date(b.stat_date || b.created_at || 0) -
      new Date(a.stat_date || a.created_at || 0)
  );

  return sorted[1];
};


/* ============================================================
 * AUTHENTICATION
 * ============================================================
 */

const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to access Creator Studio."
    );
  }

  return user;
};


/* ============================================================
 * GENERIC ANALYTICS VIEW
 * ============================================================
 */

const fetchCreatorView = async (
  viewName,
  userId,
  {
    orderBy = null,
    ascending = false,
    limit = null,
    single = false,
  } = {}
) => {
  let query = supabase
    .from(viewName)
    .select("*")
    .eq("creator_id", userId);

  if (orderBy) {
    query = query.order(orderBy, {
      ascending,
    });
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (single) {
    const {
      data,
      error,
    } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};


/* ============================================================
 * OVERVIEW
 * ============================================================
 */

export const getOverview = async (userId) => {
  return fetchCreatorView(
    "creator_studio_overview",
    userId,
    {
      single: true,
    }
  );
};


/* ============================================================
 * VIDEO PERFORMANCE
 * ============================================================
 */

export const getVideoPerformance = async (userId) => {
  return fetchCreatorView(
    "creator_video_performance",
    userId,
    {
      orderBy: "created_at",
      ascending: false,
    }
  );
};


/* ============================================================
 * LIVE PERFORMANCE
 * ============================================================
 */

export const getLivePerformance = async (userId) => {
  return fetchCreatorView(
    "creator_live_performance",
    userId,
    {
      orderBy: "started_at",
      ascending: false,
    }
  );
};


/* ============================================================
 * DAILY ANALYTICS
 * ============================================================
 */

export const getDailyAnalytics = async (userId) => {
  return fetchCreatorView(
    "creator_studio_daily_analytics",
    userId,
    {
      orderBy: "stat_date",
      ascending: true,
    }
  );
};


/* ============================================================
 * TOP CONTENT
 * ============================================================
 */

export const getTopContent = async (userId) => {
  return fetchCreatorView(
    "creator_top_content",
    userId,
    {
      orderBy: "views_count",
      ascending: false,
      limit: 20,
    }
  );
};


/* ============================================================
 * ACHIEVEMENTS
 * ============================================================
 */

export const getAchievements = async (userId) => {
  return fetchCreatorView(
    "creator_achievement_summary",
    userId
  );
};


/* ============================================================
 * AI INSIGHTS
 * ============================================================
 */

export const getAIInsights = async (userId) => {
  return fetchCreatorView(
    "creator_ai_insight_summary",
    userId,
    {
      orderBy: "created_at",
      ascending: false,
      limit: 20,
    }
  );
};


/* ============================================================
 * GROWTH
 * ============================================================
 */

export const getGrowth = async (userId) => {
  return fetchCreatorView(
    "creator_growth_summary",
    userId,
    {
      single: true,
    }
  );
};


/* ============================================================
 * CREATOR VIDEOS
 * ============================================================
 */

export const getCreatorVideos = async (userId) => {
  const {
    data,
    error,
  } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
};


/* ============================================================
 * VIDEO UPDATE
 * ============================================================
 */

export const updateVideo = async (
  videoId,
  updates = {}
) => {
  if (!videoId) {
    throw new Error("Video ID is required.");
  }

  const user = await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from("videos")
    .update(updates)
    .eq("id", videoId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


/* ============================================================
 * ARCHIVE VIDEO
 * ============================================================
 */

export const archiveVideo = async (
  videoId
) => {
  return updateVideo(videoId, {
    status: "archived",
    archived_at: new Date().toISOString(),
  });
};


/* ============================================================
 * RESTORE VIDEO
 * ============================================================
 */

export const restoreVideo = async (
  videoId
) => {
  return updateVideo(videoId, {
    status: "published",
    archived_at: null,
  });
};


/* ============================================================
 * DELETE VIDEO
 * ============================================================
 */

export const deleteVideo = async (
  videoId
) => {
  if (!videoId) {
    throw new Error("Video ID is required.");
  }

  const user = await getCurrentUser();

  /*
   * Soft delete is safer for Creator Studio.
   * It preserves the video record and allows future recovery.
   */

  const {
    data,
    error,
  } = await supabase
    .from("videos")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", videoId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};


/* ============================================================
 * SCHEDULE VIDEO
 * ============================================================
 */

export const scheduleVideo = async (
  videoId,
  scheduledAt
) => {
  if (!videoId) {
    throw new Error("Video ID is required.");
  }

  if (!scheduledAt) {
    throw new Error(
      "A scheduled date and time are required."
    );
  }

  return updateVideo(videoId, {
    status: "scheduled",
    scheduled_at: scheduledAt,
  });
};


/* ============================================================
 * COMPLETE CREATOR STUDIO DATA
 * ============================================================
 */

export const getCreatorStudioData = async () => {
  const user = await getCurrentUser();

  const userId = user.id;

  const [
    overview,
    videos,
    liveStreams,
    dailyAnalytics,
    topContent,
    achievements,
    aiInsights,
    growth,
  ] = await Promise.all([
    getOverview(userId),
    getVideoPerformance(userId),
    getLivePerformance(userId),
    getDailyAnalytics(userId),
    getTopContent(userId),
    getAchievements(userId),
    getAIInsights(userId),
    getGrowth(userId),
  ]);

  return {
    overview: normalizeOverview(
      overview || {}
    ),

    videos: Array.isArray(videos)
      ? videos
      : [],

    liveStreams: Array.isArray(liveStreams)
      ? liveStreams
      : [],

    dailyAnalytics: Array.isArray(
      dailyAnalytics
    )
      ? dailyAnalytics
      : [],

    topContent: Array.isArray(topContent)
      ? topContent
      : [],

    achievements: Array.isArray(
      achievements
    )
      ? achievements
      : [],

    aiInsights: Array.isArray(
      aiInsights
    )
      ? aiInsights
      : [],

    growth: growth || null,
  };
};


/* ============================================================
 * DEFAULT SERVICE OBJECT
 * ============================================================
 *
 * Required by:
 *
 * import creatorStudioService
 *   from "../services/creatorStudioService";
 *
 * ============================================================
 */

const creatorStudioService = {
  getCurrentUser,

  getOverview,
  getVideoPerformance,
  getLivePerformance,
  getDailyAnalytics,
  getTopContent,
  getAchievements,
  getAIInsights,
  getGrowth,

  getCreatorVideos,

  updateVideo,
  archiveVideo,
  restoreVideo,
  deleteVideo,
  scheduleVideo,

  getCreatorStudioData,

  normalizeOverview,
  safeNumber,
  calculateGrowth,
  getLatestDailyStat,
  getPreviousDailyStat,
};

export default creatorStudioService;
