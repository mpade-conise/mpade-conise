// src/hooks/useCreatorStudio.js

import { useCallback, useEffect, useState } from "react";
import creatorStudioService from "../services/creatorStudioService";

/*
 * ============================================================
 * useCreatorStudio
 * ============================================================
 *
 * Responsibilities
 * ------------------------------------------------------------
 * - Load Creator Studio data
 * - Manage loading state
 * - Manage refresh state
 * - Manage errors
 * - Expose analytics/content/live data to UI
 * - Keep UI/JSX completely outside this hook
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

const useCreatorStudio = () => {
  /*
   * ----------------------------------------------------------
   * STATE
   * ----------------------------------------------------------
   */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Main overview analytics
  const [overview, setOverview] = useState(null);

  // Video analytics
  const [videos, setVideos] = useState([]);

  // Livestream analytics
  const [liveStreams, setLiveStreams] = useState([]);

  // Historical daily analytics
  const [dailyAnalytics, setDailyAnalytics] = useState([]);

  // Top-performing content
  const [topContent, setTopContent] = useState([]);

  // Creator achievements
  const [achievements, setAchievements] = useState([]);

  // AI creator insights
  const [aiInsights, setAiInsights] = useState([]);

  // Growth analytics
  const [growth, setGrowth] = useState(null);

  /*
   * ----------------------------------------------------------
   * LOAD CREATOR STUDIO
   * ----------------------------------------------------------
   */

  const loadCreatorStudio = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const data =
        await creatorStudioService.getCreatorStudioData();

      /*
       * Always normalize values so the UI receives predictable
       * arrays/objects even when Supabase returns empty results.
       */

      setOverview(data?.overview || null);

      setVideos(
        Array.isArray(data?.videos)
          ? data.videos
          : []
      );

      setLiveStreams(
        Array.isArray(data?.liveStreams)
          ? data.liveStreams
          : []
      );

      setDailyAnalytics(
        Array.isArray(data?.dailyAnalytics)
          ? data.dailyAnalytics
          : []
      );

      setTopContent(
        Array.isArray(data?.topContent)
          ? data.topContent
          : []
      );

      setAchievements(
        Array.isArray(data?.achievements)
          ? data.achievements
          : []
      );

      setAiInsights(
        Array.isArray(data?.aiInsights)
          ? data.aiInsights
          : []
      );

      setGrowth(data?.growth || null);

      return data;
    } catch (err) {
      console.error(
        "[useCreatorStudio] Failed to load Creator Studio:",
        err
      );

      const message =
        err?.message ||
        "Unable to load Creator Studio data.";

      setError(message);

      /*
       * Do not destroy previously loaded data during a refresh.
       * This allows the existing dashboard to remain visible if
       * a manual refresh temporarily fails.
       */

      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * ----------------------------------------------------------
   * INITIAL LOAD
   * ----------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) {
        return;
      }

      await loadCreatorStudio(false);
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadCreatorStudio]);

  /*
   * ----------------------------------------------------------
   * MANUAL REFRESH
   * ----------------------------------------------------------
   */

  const refresh = useCallback(() => {
    return loadCreatorStudio(true);
  }, [loadCreatorStudio]);

  /*
   * ----------------------------------------------------------
   * RETURN API
   * ----------------------------------------------------------
   *
   * The component can now do:
   *
   * const {
   *   loading,
   *   overview,
   *   videos,
   *   dailyAnalytics,
   *   refresh
   * } = useCreatorStudio();
   *
   * ==========================================================
   */

  return {
    // Status
    loading,
    refreshing,
    error,

    // Overview
    overview,

    // Content
    videos,

    // Live
    liveStreams,

    // Analytics
    dailyAnalytics,
    topContent,

    // Creator intelligence
    achievements,
    aiInsights,
    growth,

    // Actions
    refresh,
    reload: loadCreatorStudio,
    loadCreatorStudio,
  };
};

export default useCreatorStudio;
