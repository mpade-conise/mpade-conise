// src/services/creatorStudioService.js

import { supabase } from "../supabaseClient";

/*
 * ============================================================
 * Creator Studio Service
 * ============================================================
 *
 * Responsibilities
 * ------------------------------------------------------------
 * - Get authenticated creator
 * - Fetch Creator Studio analytics
 * - Fetch creator content
 * - Keep Supabase queries outside React components/hooks
 *
 * Architecture
 * ------------------------------------------------------------
 *
 * UniverseTools.jsx
 *        ↓
 * useCreatorStudio.js
 *        ↓
 * creatorStudioService.js
 *        ↓
 * Supabase
 *
 * ============================================================
 */

const creatorStudioService = {
  /*
   * ----------------------------------------------------------
   * AUTHENTICATED CREATOR
   * ----------------------------------------------------------
   */

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error("You must be logged in to access Creator Studio.");
    }

    return user;
  },

  /*
   * ----------------------------------------------------------
   * GENERIC VIEW QUERY
   * ----------------------------------------------------------
   */

  async fetchView(viewName, userId, options = {}) {
    const {
      orderBy = null,
      ascending = false,
      limit = null,
      single = false,
    } = options;

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
      const { data, error } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      return data || null;
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  },

  /*
   * ----------------------------------------------------------
   * CREATOR STUDIO OVERVIEW
   * ----------------------------------------------------------
   */

  async getOverview(userId) {
    return this.fetchView(
      "creator_studio_overview",
      userId,
      {
        single: true,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * VIDEO PERFORMANCE
   * ----------------------------------------------------------
   */

  async getVideoPerformance(userId) {
    return this.fetchView(
      "creator_video_performance",
      userId,
      {
        orderBy: "created_at",
        ascending: false,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * LIVESTREAM PERFORMANCE
   * ----------------------------------------------------------
   */

  async getLivePerformance(userId) {
    return this.fetchView(
      "creator_live_performance",
      userId,
      {
        orderBy: "started_at",
        ascending: false,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * DAILY ANALYTICS
   * ----------------------------------------------------------
   */

  async getDailyAnalytics(userId) {
    return this.fetchView(
      "creator_studio_daily_analytics",
      userId,
      {
        orderBy: "stat_date",
        ascending: true,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * TOP CONTENT
   * ----------------------------------------------------------
   */

  async getTopContent(userId) {
    return this.fetchView(
      "creator_top_content",
      userId,
      {
        orderBy: "views_count",
        ascending: false,
        limit: 20,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * ACHIEVEMENTS
   * ----------------------------------------------------------
   */

  async getAchievements(userId) {
    return this.fetchView(
      "creator_achievement_summary",
      userId
    );
  },

  /*
   * ----------------------------------------------------------
   * AI INSIGHTS
   * ----------------------------------------------------------
   */

  async getAIInsights(userId) {
    return this.fetchView(
      "creator_ai_insight_summary",
      userId,
      {
        orderBy: "created_at",
        ascending: false,
        limit: 20,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * GROWTH
   * ----------------------------------------------------------
   */

  async getGrowth(userId) {
    return this.fetchView(
      "creator_growth_summary",
      userId,
      {
        single: true,
      }
    );
  },

  /*
   * ----------------------------------------------------------
   * CREATOR VIDEOS
   * ----------------------------------------------------------
   *
   * Used for the Content / Videos section.
   * This reads the real videos table.
   *
   * Canonical video view metric:
   * videos.views_count
   * ----------------------------------------------------------
   */

  async getCreatorVideos(userId) {
    const { data, error } = await supabase
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
  },

  /*
   * ----------------------------------------------------------
   * ALL CREATOR STUDIO DATA
   * ----------------------------------------------------------
   */

  async getCreatorStudioData() {
    const user = await this.getCurrentUser();
    const userId = user.id;

    /*
     * Run independent Supabase requests in parallel.
     * This prevents unnecessary sequential network requests.
     */

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
      this.getOverview(userId),
      this.getVideoPerformance(userId),
      this.getLivePerformance(userId),
      this.getDailyAnalytics(userId),
      this.getTopContent(userId),
      this.getAchievements(userId),
      this.getAIInsights(userId),
      this.getGrowth(userId),
    ]);

    return {
      overview,
      videos,
      liveStreams,
      dailyAnalytics,
      topContent,
      achievements,
      aiInsights,
      growth,
    };
  },

  /*
   * ----------------------------------------------------------
   * GET CONTENT + ANALYTICS
   * ----------------------------------------------------------
   *
   * Useful when the UI needs both the actual videos and
   * analytics for those videos.
   * ----------------------------------------------------------
   */

  async getCreatorContentData() {
    const user = await this.getCurrentUser();
    const userId = user.id;

    const [videos, performance] = await Promise.all([
      this.getCreatorVideos(userId),
      this.getVideoPerformance(userId),
    ]);

    return {
      videos,
      performance,
    };
  },
};

export default creatorStudioService;
