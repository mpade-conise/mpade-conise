import { useCallback, useEffect, useState } from "react";
import creatorStudioService from "../services/creatorStudioService";

const EMPTY = [];
const useCreatorStudio = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadCreatorStudio = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await creatorStudioService.getCreatorStudioData();
      setData(next);
      setLastSyncedAt(new Date().toISOString());
      if (next.errors?.length) setError(next.errors.map(item => `${item.feature}: ${item.message}`).join(" | "));
      return next;
    } catch (err) {
      console.error("[useCreatorStudio] Load failed:", err);
      setError(err?.message || "Unable to load Universe Tools data.");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCreatorStudio(); }, [loadCreatorStudio]);
  const refresh = useCallback(() => loadCreatorStudio(true), [loadCreatorStudio]);

  return {
    profile: data?.profile || null,
    creatorId: data?.creatorId || null,
    overview: data?.overview || null,
    videoPerformance: data?.videoPerformance || EMPTY,
    livePerformance: data?.livePerformance || EMPTY,
    dailyAnalytics: data?.dailyAnalytics || EMPTY,
    dailyStats: data?.dailyStats || EMPTY,
    topContent: data?.topContent || EMPTY,
    achievements: data?.achievements || EMPTY,
    aiInsights: data?.aiInsights || EMPTY,
    growth: data?.growth || null,
    videos: data?.videos || EMPTY,
    liveStreams: data?.livePerformance || EMPTY,
    earnings: data?.earnings || EMPTY,
    loading, refreshing, error, lastSyncedAt,
    refresh, reload: loadCreatorStudio, loadCreatorStudio,
    aiTip: data?.aiTip || "Review your creator analytics to identify your strongest content.",
  };
};

export default useCreatorStudio;
