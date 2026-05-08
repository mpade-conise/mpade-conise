// src/components/videoActions.js
import { supabase } from '../supabaseClient';

/**
 * Enhanced video actions with conflict handling, numeric safety, 
 * and real-time interaction tracking.
 */

export const handleLike = async (e, videoId, isLiked, currentLikes, user) => {
  if (e) e.stopPropagation();
  if (!user) return { updatedLiked: isLiked, newCount: currentLikes };

  const startCount = Number(currentLikes) || 0;

  try {
    if (isLiked) {
      const { error } = await supabase
        .from('video_likes')
        .delete()
        .match({ video_id: videoId, user_id: user.id });

      if (error) throw error;
      return { updatedLiked: false, newCount: Math.max(0, startCount - 1) };
    } else {
      const { error } = await supabase
        .from('video_likes')
        .insert({ video_id: videoId, user_id: user.id });

      // Note: If you see "record new has no field follower_id", check your 
      // Supabase Dashboard > Database > Triggers for 'video_likes'.
      if (error && error.code === '23505') return { updatedLiked: true, newCount: startCount };
      if (error) throw error;
      return { updatedLiked: true, newCount: startCount + 1 };
    }
  } catch (err) {
    console.error("Like operation failed:", err.message);
    return { updatedLiked: isLiked, newCount: startCount };
  }
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
  
  // Basic validation: must be logged in and can't follow yourself
  if (!user || user.id === followingId) return isFollowing;

  try {
    if (isFollowing) {
      // --- UNFOLLOW LOGIC ---
      const { error } = await supabase
        .from('follows')
        .delete()
        .match({ 
          follower_id: user.id, 
          following_id: followingId 
        });

      if (error) throw error;
      return false; // Successfully unfollowed
    } else {
      // --- FOLLOW LOGIC ---
      // .upsert handles the "Already Following" case gracefully without 409 errors
      const { error } = await supabase
        .from('follows')
        .upsert(
          { 
            follower_id: user.id, 
            following_id: followingId 
          }, 
          { onConflict: 'follower_id,following_id' } // Target your unique constraint
        );

      if (error) {
        // If it's still a conflict for some reason, we assume they are following
        if (error.code === '23505' || error.code === '409') return true;
        throw error;
      }
      
      return true; // Successfully followed
    }
  } catch (err) {
    console.error("Follow action failed:", err.message);
    // Return the original state so the UI doesn't get stuck in the wrong toggle
    return isFollowing;
  }
};

// --- NEW REAL-TIME INTERACTIONS ---

export const handleReport = async (videoId, user) => {
  if (!user) return alert("Please login to report content.");
  
  try {
    const { error } = await supabase
      .from('video_reports')
      .insert({ video_id: videoId, user_id: user.id, reason: 'general_report' });

    if (error) throw error;
    alert("Report submitted. Thank you for keeping Mpade safe.");
  } catch (err) {
    console.error("Report failed:", err.message);
  }
};

export const handleNotInterested = async (videoId, user) => {
  if (!user) return;
  
  try {
    const { error } = await supabase
      .from('user_interactions') // Assuming a general table for algo training
      .insert({ video_id: videoId, user_id: user.id, interaction_type: 'not_interested' });

    if (error) throw error;
    // You can use this to filter the local state in Feed.js later
    alert("We'll show you fewer videos like this.");
  } catch (err) {
    console.error("Interaction log failed:", err.message);
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
    console.error("Download failed, opening in new tab instead:", err);
    window.open(videoUrl, '_blank');
  }
};

export const handleShare = async (e, video) => {
  if (e) e.stopPropagation();
  try {
    const shareData = {
      title: video.caption || 'Mpade Universe',
      text: `Check out @${video.profiles?.username || 'user'}'s video!`,
      url: window.location.href 
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Share failed:", err);
  }
};

// --- NEW PROFILE SHARING LOGIC ---

export const handleShareProfile = async (username, userId) => {
  const shareUrl = `${window.location.origin}/profile/${userId}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: `${username} on Mpade Universe`,
        text: `Check out ${username}'s profile and content!`,
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Profile link copied to clipboard!");
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error("Profile share failed:", err);
  }
};

export const incrementView = async (videoId) => {
  const { error } = await supabase.rpc('increment_video_views', { video_id: videoId });
  if (error) console.error("View increment failed:", error.message);
};