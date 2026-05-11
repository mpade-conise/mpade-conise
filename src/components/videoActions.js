// src/components/videoActions.js
import { supabase } from '../supabaseClient';

/**
 * Enhanced video actions for Mpade Universe
 * Fixed: Table name mapping for 'videos' and 'likes_count' synchronization.
 */

export const handleLike = async (e, videoId, isLiked, currentLikes, user) => {
  if (e) e.stopPropagation();
  if (!user) return { updatedLiked: isLiked, newCount: currentLikes };

  // Ensure we are working with numbers to avoid "01" string concatenation issues
  const startCount = Number(currentLikes) || 0;

  try {
    if (isLiked) {
      // --- UNLIKE LOGIC ---
      const { error } = await supabase
        .from('video_likes')
        .delete()
        .match({ video_id: videoId, user_id: user.id });

      if (error) throw error;
      
      return { 
        updatedLiked: false, 
        newCount: Math.max(0, startCount - 1) 
      };
    } else {
      // --- LIKE LOGIC ---
      const { error } = await supabase
        .from('video_likes')
        .insert({ video_id: videoId, user_id: user.id });

      // Handle race conditions where user double-clicks
      if (error && (error.code === '23505' || error.code === '409')) {
        return { updatedLiked: true, newCount: startCount };
      }
      if (error) throw error;

      return { 
        updatedLiked: true, 
        newCount: startCount + 1 
      };
    }
  } catch (err) {
    console.error("Like operation failed:", err.message);
    return { updatedLiked: isLiked, newCount: startCount };
  }
};

/**
 * Optional: Use this to fetch the 'Truth' from the DB if the UI 
 * looks out of sync after a refresh.
 */
export const getLatestVideoStats = async (videoId) => {
  const { data, error } = await supabase
    .from('videos')
    .select('likes_count, views_count')
    .eq('id', videoId)
    .single();
  
  if (error) return null;
  return data;
};

export const handleFavorite = async (e, videoId, isFavorited, user) => {
  if (e) e.stopPropagation();
  if (!user) return isFavorited;

  try {
    if (isFavorited) {
      await supabase.from('favorites').delete().match({ video_id: videoId, user_id: user.id });
    } else {
      const { error } = await supabase.from('favorites').insert({ video_id: videoId, user_id: user.id });
      if (error && error.code === '23505') return true;
      if (error) throw error;
    }
    return !isFavorited;
  } catch (err) {
    console.error("Favorite error:", err.message);
    return isFavorited;
  }
};

export const handleFollow = async (e, followingId, isFollowing, user) => {
  if (e) e.stopPropagation();
  if (!user || user.id === followingId) return isFollowing;

  try {
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .match({ follower_id: user.id, following_id: followingId });

      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase
        .from('follows')
        .upsert(
          { follower_id: user.id, following_id: followingId }, 
          { onConflict: 'follower_id,following_id' }
        );

      if (error && (error.code === '23505' || error.code === '409')) return true;
      if (error) throw error;
      return true;
    }
  } catch (err) {
    console.error("Follow action failed:", err.message);
    return isFollowing;
  }
};

export const incrementView = async (videoId) => {
  // Ensure your RPC name matches the SQL function created earlier
  const { error } = await supabase.rpc('increment_video_views', { video_id: videoId });
  if (error) console.error("View increment failed:", error.message);
};

// --- SOCIAL & UTILITY ACTIONS ---

export const handleReport = async (videoId, user) => {
  if (!user) return alert("Please login to report content.");
  try {
    const { error } = await supabase
      .from('video_reports')
      .insert({ video_id: videoId, user_id: user.id, reason: 'general_report' });
    if (error) throw error;
    alert("Report submitted.");
  } catch (err) {
    console.error("Report failed:", err.message);
  }
};

export const handleDownload = async (videoUrl, filename = 'Mpade-Video.mp4') => {
  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    window.open(videoUrl, '_blank');
  }
};

export const handleShare = async (e, video) => {
  if (e) e.stopPropagation();
  const shareUrl = `${window.location.origin}/video/${video.id}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: video.caption || 'Mpade Universe',
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Share failed:", err);
  }
};
