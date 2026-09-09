import { supabase } from '../supabaseClient';

/*
============================================================
CREATOR STUDIO SERVICE
============================================================

Database source of truth:

- profiles
- videos
- live_streams
- creator_earnings
- creator_daily_stats
- creator_achievements
- creator_ai_insights
- creator_studio_overview
- creator_video_performance
- creator_live_performance
- creator_studio_daily_analytics
- creator_top_content
- creator_achievement_summary
- creator_ai_insight_summary
- creator_growth_summary

IMPORTANT:
- Never hardcode creator IDs.
- Always use authenticated user.
- Browser uses normal Supabase client.
- RLS remains responsible for authorization.
============================================================
*/

const VIEW_OVERVIEW = 'creator_studio_overview';
const VIEW_VIDEO = 'creator_video_performance';
const VIEW_LIVE = 'creator_live_performance';
const VIEW_DAILY = 'creator_studio_daily_analytics';
const VIEW_TOP = 'creator_top_content';
const VIEW_ACHIEVEMENTS = 'creator_achievement_summary';
const VIEW_AI = 'creator_ai_insight_summary';
const VIEW_GROWTH = 'creator_growth_summary';

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const safeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const safeObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
};

const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No authenticated creator session found.');
  }

  return user;
};

/*
============================================================
CREATOR ID
============================================================
*/

export const getCreatorId = async () => {
  const user = await getAuthenticatedUser();

  return user.id;
};

/*
============================================================
PROFILE
============================================================
*/

export const getCreatorProfile = async (creatorId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      full_name,
      avatar_url,
      cover_url,
      bio,
      follower_count,
      following_count,
      total_likes,
      balance,
      total_tokens_earned,
      coins,
      subscription_tier,
      district,
      interests,
      gender,
      dob,
      location,
      payout_method,
      currency_preference,
      verified_status,
      is_verified,
      online,
      is_online,
      account_status,
      created_at
    `)
    .eq('id', creatorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || {};
};

/*
============================================================
OVERVIEW
============================================================
*/

export const getCreatorOverview = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_OVERVIEW)
    .select('*')
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

/*
============================================================
VIDEO PERFORMANCE
============================================================
*/

export const getCreatorVideoPerformance = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_VIDEO)
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
LIVESTREAM PERFORMANCE
============================================================
*/

export const getCreatorLivePerformance = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_LIVE)
    .select('*')
    .eq('creator_id', creatorId)
    .order('started_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
DAILY ANALYTICS
============================================================
*/

export const getCreatorDailyAnalytics = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_DAILY)
    .select('*')
    .eq('creator_id', creatorId)
    .order('stat_date', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
TOP CONTENT
============================================================
*/

export const getCreatorTopContent = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_TOP)
    .select('*')
    .eq('creator_id', creatorId)
    .limit(20);

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
ACHIEVEMENTS
============================================================
*/

export const getCreatorAchievements = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_ACHIEVEMENTS)
    .select('*')
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
AI INSIGHTS
============================================================
*/

export const getCreatorAIInsights = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_AI)
    .select('*')
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
GROWTH
============================================================
*/

export const getCreatorGrowth = async (creatorId) => {
  const { data, error } = await supabase
    .from(VIEW_GROWTH)
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

/*
============================================================
VIDEOS
============================================================
*/

export const getCreatorVideos = async (creatorId) => {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      id,
      user_id,
      created_at,
      video_url,
      caption,
      music_name,
      music_url,
      is_private,
      views_count,
      likes_count,
      comments_count,
      favorites_count,
      shares_count,
      saves_count,
      reposts_count,
      thumbnail_url,
      tags,
      mentions,
      location,
      privacy,
      allow_duet,
      allow_stitch,
      allow_download,
      allow_comments,
      is_commercial,
      sponsor_tag,
      age_restricted,
      filter_style,
      category,
      poll_data,
      product_link,
      chapters,
      subtitles,
      audio_enhancement,
      scheduled_at,
      thumbnail_text,
      is_pinned,
      title,
      status,
      archived_at,
      deleted_at,
      is_featured,
      copyright_status,
      content_warning,
      ai_generated,
      processing_status,
      processing_progress,
      language,
      creator_notes
    `)
    .eq('user_id', creatorId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
LIVE STREAMS
============================================================
*/

export const getCreatorLiveStreams = async (creatorId) => {
  const { data, error } = await supabase
    .from('live_streams')
    .select(`
      id,
      host_id,
      title,
      category,
      status,
      viewer_count,
      likes,
      started_at,
      ended_at,
      privacy,
      tags,
      settings,
      goal,
      description,
      gifts_enabled,
      gift_goal_current,
      gift_goal_total,
      total_gifts,
      max_guests,
      stream_type,
      thumbnail_url,
      scheduled_at,
      peak_viewers,
      total_watch_seconds,
      shares_count,
      followers_gained,
      gifts_count,
      coins_received,
      revenue,
      fps,
      bitrate,
      resolution,
      dropped_frames,
      audio_quality
    `)
    .eq('host_id', creatorId)
    .order('started_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
EARNINGS
============================================================
*/

export const getCreatorEarnings = async (creatorId) => {
  const { data, error } = await supabase
    .from('creator_earnings')
    .select(`
      id,
      creator_id,
      source_type,
      source_id,
      amount,
      coins,
      status,
      description,
      created_at
    `)
    .eq('creator_id', creatorId)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
DAILY STATS
============================================================
*/

export const getRawDailyStats = async (creatorId) => {
  const { data, error } = await supabase
    .from('creator_daily_stats')
    .select(`
      creator_id,
      stat_date,
      views,
      unique_viewers,
      returning_viewers,
      likes,
      comments,
      shares,
      saves,
      reposts,
      followers_gained,
      followers_lost,
      profile_visits,
      impressions,
      clicks,
      average_watch_seconds,
      average_completion_rate,
      engagement_rate,
      coins_received,
      coins_spent,
      revenue,
      live_viewers,
      peak_concurrent_viewers,
      created_at
    `)
    .eq('creator_id', creatorId)
    .order('stat_date', {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return safeArray(data);
};

/*
============================================================
ALL CREATOR STUDIO DATA
============================================================

Used for initial dashboard synchronization.

Everything is loaded once.

Changing tabs does NOT automatically generate new queries.
============================================================
*/

export const getCreatorStudioData = async () => {
  const creatorId = await getCreatorId();

  const results = await Promise.allSettled([
    getCreatorProfile(creatorId),
    getCreatorOverview(creatorId),
    getCreatorVideoPerformance(creatorId),
    getCreatorLivePerformance(creatorId),
    getCreatorDailyAnalytics(creatorId),
    getCreatorTopContent(creatorId),
    getCreatorAchievements(creatorId),
    getCreatorAIInsights(creatorId),
    getCreatorGrowth(creatorId),
    getCreatorVideos(creatorId),
    getCreatorLiveStreams(creatorId),
    getCreatorEarnings(creatorId),
    getRawDailyStats(creatorId),
  ]);

  const [
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
  ] = results;

  const failed = results
    .map((result, index) => ({
      result,
      index,
    }))
    .filter(
      ({ result }) => result.status === 'rejected'
    );

  return {
    creatorId,

    profile:
      profile.status === 'fulfilled'
        ? profile.value
        : {},

    overview:
      overview.status === 'fulfilled'
        ? overview.value
        : null,

    videoPerformance:
      videoPerformance.status === 'fulfilled'
        ? videoPerformance.value
        : [],

    livePerformance:
      livePerformance.status === 'fulfilled'
        ? livePerformance.value
        : [],

    dailyAnalytics:
      dailyAnalytics.status === 'fulfilled'
        ? dailyAnalytics.value
        : [],

    topContent:
      topContent.status === 'fulfilled'
        ? topContent.value
        : [],

    achievements:
      achievements.status === 'fulfilled'
        ? achievements.value
        : [],

    aiInsights:
      aiInsights.status === 'fulfilled'
        ? aiInsights.value
        : [],

    growth:
      growth.status === 'fulfilled'
        ? growth.value
        : null,

    videos:
      videos.status === 'fulfilled'
        ? videos.value
        : [],

    liveStreams:
      liveStreams.status === 'fulfilled'
        ? liveStreams.value
        : [],

    earnings:
      earnings.status === 'fulfilled'
        ? earnings.value
        : [],

    dailyStats:
      dailyStats.status === 'fulfilled'
        ? dailyStats.value
        : [],

    errors: failed.map(({ result }) => result.reason),
  };
};

/*
============================================================
VIDEO ACTIONS
============================================================
*/

export const updateVideo = async (videoId, updates) => {
  const creatorId = await getCreatorId();

  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId)
    .eq('user_id', creatorId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const archiveVideo = async (videoId) => {
  return updateVideo(videoId, {
    status: 'archived',
    archived_at: new Date().toISOString(),
  });
};

export const restoreVideo = async (videoId) => {
  return updateVideo(videoId, {
    status: 'published',
    archived_at: null,
  });
};

export const deleteVideo = async (videoId) => {
  const creatorId = await getCreatorId();

  const { error } = await supabase
    .from('videos')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'deleted',
    })
    .eq('id', videoId)
    .eq('user_id', creatorId);

  if (error) {
    throw error;
  }
};

/*
============================================================
SCHEDULING
============================================================
*/

export const scheduleVideo = async (
  videoId,
  scheduledAt
) => {
  return updateVideo(videoId, {
    scheduled_at: scheduledAt,
    status: 'scheduled',
  });
};

/*
============================================================
HELPERS
============================================================
*/

export const normalizeOverview = (overview = {}) => {
  return {
    followers: safeNumber(
      overview.followers ??
        overview.follower_count
    ),

    following: safeNumber(
      overview.following ??
        overview.following_count
    ),

    profileLikes: safeNumber(
      overview.profile_likes ??
        overview.total_likes
    ),

    coins: safeNumber(
      overview.coin_balance ??
        overview.coins
    ),

    balance: safeNumber(
      overview.balance
    ),

    videoCount: safeNumber(
      overview.video_count
    ),

    videoViews: safeNumber(
      overview.video_views
    ),

    videoLikes: safeNumber(
      overview.video_likes
    ),

    videoComments: safeNumber(
      overview.video_comments
    ),

    videoFavorites: safeNumber(
      overview.video_favorites
    ),

    videoShares: safeNumber(
      overview.video_shares
    ),

    videoSaves: safeNumber(
      overview.video_saves
    ),

    videoReposts: safeNumber(
      overview.video_reposts
    ),

    livestreamCount: safeNumber(
      overview.livestream_count
    ),

    livestreamPeakViewers: safeNumber(
      overview.livestream_peak_viewers
    ),

    livestreamWatchTime: safeNumber(
      overview.livestream_watch_time ??
        overview.livestream_total_watch_seconds
    ),

    livestreamShares: safeNumber(
      overview.livestream_shares
    ),

    livestreamFollowersGained: safeNumber(
      overview.livestream_followers_gained
    ),

    livestreamGifts: safeNumber(
      overview.livestream_gifts
    ),

    livestreamCoins: safeNumber(
      overview.livestream_coins
    ),

    livestreamRevenue: safeNumber(
      overview.livestream_revenue
    ),

    profileViews: safeNumber(
      overview.profile_views
    ),

    creatorEarnings: safeNumber(
      overview.creator_earnings
    ),

    earnedCoins: safeNumber(
      overview.earned_coins
    ),

    totalEngagements: safeNumber(
      overview.total_engagements
    ),

    engagementRate:
      overview.engagement_rate !== null &&
      overview.engagement_rate !== undefined
        ? safeNumber(
            overview.engagement_rate
          )
        : null,
  };
};

export const getLatestDailyStat = (
  dailyStats = []
) => {
  if (!dailyStats.length) return null;

  return dailyStats[dailyStats.length - 1];
};

export const getPreviousDailyStat = (
  dailyStats = []
) => {
  if (dailyStats.length < 2) return null;

  return dailyStats[dailyStats.length - 2];
};

export const calculateGrowth = (
  current,
  previous
) => {
  const currentValue = safeNumber(current);
  const previousValue = safeNumber(previous);

  if (!previousValue) {
    return null;
  }

  return (
    ((currentValue - previousValue) /
      Math.abs(previousValue)) *
    100
  );
};

export const getCreatorTip = (
  aiInsights = [],
  fallback = 'Creator analytics are synchronized from your database.'
) => {
  if (!aiInsights.length) {
    return fallback;
  }

  const first = aiInsights[0];

  return (
    first.insight ||
    first.message ||
    first.recommendation ||
    first.description ||
    fallback
  );
};

export { safeNumber, safeArray, safeObject };
