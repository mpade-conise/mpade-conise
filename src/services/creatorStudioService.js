import { supabase } from "../supabaseClient";

export const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeOverview = (row = {}) => {
  const value = row || {};
  return {
    ...value,
    views: safeNumber(value.views ?? value.video_views ?? value.views_count ?? value.total_views),
    videoViews: safeNumber(value.video_views ?? value.views),
    likes: safeNumber(value.likes ?? value.video_likes ?? value.likes_count ?? value.total_likes),
    videoLikes: safeNumber(value.video_likes ?? value.likes),
    comments: safeNumber(value.comments ?? value.video_comments ?? value.comments_count ?? value.total_comments),
    videoComments: safeNumber(value.video_comments ?? value.comments),
    shares: safeNumber(value.shares ?? value.video_shares ?? value.shares_count ?? value.total_shares),
    videoShares: safeNumber(value.video_shares ?? value.shares),
    saves: safeNumber(value.saves ?? value.video_saves ?? value.saves_count ?? value.total_saves),
    videoSaves: safeNumber(value.video_saves ?? value.saves),
    favorites: safeNumber(value.video_favorites ?? value.favorites_count ?? value.favorites),
    reposts: safeNumber(value.reposts ?? value.video_reposts ?? value.reposts_count ?? value.total_reposts),
    followers: safeNumber(value.followers ?? value.follower_count ?? value.followers_count),
    following: safeNumber(value.following ?? value.following_count),
    revenue: safeNumber(value.revenue ?? value.live_revenue ?? value.creator_earnings ?? value.total_revenue),
    coins: safeNumber(value.coins ?? value.live_coins ?? value.earned_coins ?? value.coins_received ?? value.total_coins),
    engagement_rate: safeNumber(value.engagement_rate),
    average_watch_seconds: safeNumber(value.average_watch_seconds),
    completion_rate: safeNumber(value.completion_rate ?? value.average_completion_rate),
    profile_visits: safeNumber(value.profile_visits ?? value.profile_views),
    unique_viewers: safeNumber(value.unique_viewers),
    returning_viewers: safeNumber(value.returning_viewers),
    live_viewers: safeNumber(value.live_viewers),
    peak_concurrent_viewers: safeNumber(value.peak_concurrent_viewers ?? value.highest_peak_viewers),
    videoCount: safeNumber(value.video_count),
    liveCount: safeNumber(value.live_count),
    profileLikes: safeNumber(value.profile_likes),
    gifts: safeNumber(value.live_gifts ?? value.gifts_count),
    balance: safeNumber(value.balance),
    creatorEarnings: safeNumber(value.creator_earnings ?? value.revenue),
    livestreamRevenue: safeNumber(value.live_revenue),
    profileViews: safeNumber(value.profile_views ?? value.profile_visits),
    totalEngagements: safeNumber(value.total_engagements ?? (safeNumber(value.video_likes) + safeNumber(value.video_comments) + safeNumber(value.video_shares) + safeNumber(value.video_saves) + safeNumber(value.video_reposts))),
  };
};

export const calculateGrowth = (current, previous) => {
  const a = safeNumber(current), b = safeNumber(previous);
  return b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100;
};

export const getLatestDailyStat = (rows = []) => Array.isArray(rows) && rows.length ? [...rows].sort((a,b) => new Date(b.stat_date || b.created_at || 0) - new Date(a.stat_date || a.created_at || 0))[0] : null;
export const getPreviousDailyStat = (rows = []) => Array.isArray(rows) && rows.length > 1 ? [...rows].sort((a,b) => new Date(b.stat_date || b.created_at || 0) - new Date(a.stat_date || a.created_at || 0))[1] : null;

const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("You must be logged in to access Universe Tools.");
  return user;
};

const readMany = async (table, userColumn, userId, { orderBy, ascending = false, limit } = {}) => {
  let query = supabase.from(table).select("*").eq(userColumn, userId);
  if (orderBy) query = query.order(orderBy, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const readOne = async (table, userColumn, userId) => {
  const { data, error } = await supabase.from(table).select("*").eq(userColumn, userId).maybeSingle();
  if (error) throw error;
  return data || null;
};

export const getProfile = userId => readOne("profiles", "id", userId);
export const getOverview = async userId => normalizeOverview(await readOne("creator_studio_overview", "creator_id", userId) || {});
export const getVideoPerformance = async userId => (await readMany("creator_video_performance", "creator_id", userId, { orderBy: "created_at" })).map(row => ({ ...row, views_count: safeNumber(row.views), likes_count: safeNumber(row.likes), comments_count: safeNumber(row.comments), favorites_count: safeNumber(row.favorites), shares_count: safeNumber(row.shares), saves_count: safeNumber(row.saves), reposts_count: safeNumber(row.reposts) }));
export const getLivePerformance = userId => readMany("creator_live_performance", "creator_id", userId, { orderBy: "started_at" });
export const getDailyAnalytics = userId => readMany("creator_studio_daily_analytics", "creator_id", userId, { orderBy: "stat_date", ascending: true });
export const getTopContent = async userId => (await readMany("creator_top_content", "creator_id", userId, { orderBy: "views", limit: 20 })).map(row => ({ ...row, views_count: safeNumber(row.views), likes_count: safeNumber(row.likes), comments_count: safeNumber(row.comments), favorites_count: safeNumber(row.favorites), shares_count: safeNumber(row.shares), saves_count: safeNumber(row.saves), reposts_count: safeNumber(row.reposts) }));
export const getAchievements = userId => readMany("creator_achievements", "creator_id", userId, { orderBy: "created_at" });
export const getGoals = userId => readMany("creator_goals", "creator_id", userId, { orderBy: "created_at" });
export const getSchedules = userId => readMany("creator_schedules", "creator_id", userId, { orderBy: "scheduled_at" });
export const getProgress = userId => readOne("creator_progress", "creator_id", userId);
export const getAIInsights = userId => readMany("creator_ai_insights", "creator_id", userId, { orderBy: "created_at", limit: 20 });
export const getGrowth = userId => readMany("creator_growth_snapshots", "creator_id", userId, { orderBy: "snapshot_date", limit: 30 });
export const getCreatorVideos = userId => readMany("videos", "user_id", userId, { orderBy: "created_at" });
export const getEarnings = userId => readMany("creator_earnings", "creator_id", userId, { orderBy: "created_at", limit: 100 });

export const updateVideo = async (videoId, updates = {}) => {
  if (!videoId) throw new Error("Video ID is required.");
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("videos").update(updates).eq("id", videoId).eq("user_id", user.id).select("*").single();
  if (error) throw error;
  return data;
};

export const archiveVideo = videoId => updateVideo(videoId, { status: "archived", archived_at: new Date().toISOString() });
export const restoreVideo = videoId => updateVideo(videoId, { status: "published", archived_at: null, deleted_at: null });
export const deleteVideo = videoId => updateVideo(videoId, { status: "deleted", deleted_at: new Date().toISOString() });
export const scheduleVideo = (videoId, scheduledAt) => {
  if (!scheduledAt) throw new Error("A scheduled date and time are required.");
  return updateVideo(videoId, { status: "scheduled", scheduled_at: scheduledAt });
};

export const getCreatorStudioData = async () => {
  const user = await getCurrentUser();
  const userId = user.id;
  const tasks = {
    profile: () => getProfile(userId),
    overview: () => getOverview(userId),
    videos: () => getCreatorVideos(userId),
    videoPerformance: () => getVideoPerformance(userId),
    livePerformance: () => getLivePerformance(userId),
    dailyAnalytics: () => getDailyAnalytics(userId),
    topContent: () => getTopContent(userId),
    achievements: () => getAchievements(userId),
    goals: () => getGoals(userId),
    schedules: () => getSchedules(userId),
    progress: () => getProgress(userId),
    aiInsights: () => getAIInsights(userId),
    growth: () => getGrowth(userId),
    earnings: () => getEarnings(userId),
  };
  const entries = Object.entries(tasks);
  const results = await Promise.all(entries.map(async ([key, task]) => {
    try { return [key, await task(), null]; }
    catch (error) { console.error(`[UniverseTools] ${key} query failed:`, error); return [key, key === "profile" || key === "overview" ? null : [], error]; }
  }));
  const data = Object.fromEntries(results.map(([key, value]) => [key, value]));
  const errors = results.filter(([, , error]) => error).map(([key, , error]) => ({ feature: key, message: error.message, code: error.code }));
  const dailyAnalytics = data.dailyAnalytics || [];
  const aiInsights = data.aiInsights || [];
  return {
    ...data,
    creatorId: userId,
    dailyStats: dailyAnalytics,
    growth: data.growth?.[0] || null,
    aiTip: aiInsights[0]?.content || aiInsights[0]?.title || "Keep publishing consistently and use your audience analytics to improve your content.",
    errors,
  };
};

const creatorStudioService = {
  getCurrentUser, getProfile, getOverview, getVideoPerformance, getLivePerformance, getDailyAnalytics, getTopContent, getAchievements, getGoals, getSchedules, getProgress, getAIInsights, getGrowth, getCreatorVideos, getEarnings, updateVideo, archiveVideo, restoreVideo, deleteVideo, scheduleVideo, getCreatorStudioData, normalizeOverview, safeNumber, calculateGrowth, getLatestDailyStat, getPreviousDailyStat,
};

export default creatorStudioService;
