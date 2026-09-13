import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Music, UserPlus, Disc,
  Loader2, MoreHorizontal, Bookmark, X, Send,
  Download, Scissors, Users, Captions, EyeOff, Flag, Check,
  MessageSquare, Copy, Play, ShoppingBag, Award,
  Repeat2, Trash2, ShieldAlert, HelpCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../supabaseClient';
import {
  handleLike,
  handleFavorite,
  handleFollow,
  handleShare,
  incrementView,
  handleReport,
  handleNotInterested,
  handleDownload
} from './videoActions';

const LUT_FILTERS = {
  original: '',
  neon_cyber: 'hue-rotate(90deg) saturate(200%) brightness(1.1) contrast(110%)',
  electric: 'contrast(140%) saturate(160%) hue-rotate(180deg) brightness(1.15)',
  cinema: 'grayscale(100%) contrast(150%) brightness(0.95)',
  golden_hour: 'sepia(50%) saturate(190%) hue-rotate(-25deg) contrast(110%)',
  vintage: 'sepia(30%) contrast(90%) brightness(1.1) saturate(85%)',
  midnight: 'brightness(0.8) contrast(130%) saturate(130%) hue-rotate(20deg)',
  vibrant_pop: 'saturate(220%) contrast(120%) brightness(1.05)'
};

export const getEffectiveFilterStyle = (video) => {
  if (!video) return '';

  if (video.filter_style && LUT_FILTERS[video.filter_style] !== undefined) {
    return LUT_FILTERS[video.filter_style];
  }

  if (Array.isArray(video.tags)) {
    const filterTag = video.tags.find(
      t => typeof t === 'string' && t.startsWith('filter_')
    );

    if (filterTag) {
      const fId = filterTag.replace('filter_', '');
      if (LUT_FILTERS[fId] !== undefined) return LUT_FILTERS[fId];
    }
  }

  if (typeof video.caption === 'string') {
    const match = video.caption.match(/\[filter:([a-z0-9_]+)\]/i);

    if (match && LUT_FILTERS[match[1]] !== undefined) {
      return LUT_FILTERS[match[1]];
    }
  }

  try {
    const localF =
      (video.id && localStorage.getItem(`mpade_filter_${video.id}`)) ||
      (video.video_url && localStorage.getItem(`mpade_filter_${video.video_url}`));

    if (localF && LUT_FILTERS[localF] !== undefined) {
      return LUT_FILTERS[localF];
    }
  } catch {}

  return '';
};

const ActionButton = ({ icon, label, onClick }) => {
  const numericLabel = Number(label);
  const safeLabel = Number.isNaN(numericLabel)
    ? 0
    : Math.max(0, numericLabel);

  return (
    <div className="flex flex-col items-center group">
      <motion.button
        type="button"
        whileTap={{ scale: 0.6 }}
        onClick={onClick}
        className="drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:drop-shadow-[0_0_18px_rgba(236,72,153,0.8)] active:brightness-125 transition-all"
      >
        {icon}
      </motion.button>

      <motion.span
        key={safeLabel}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[11px] font-black mt-1 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] select-none tracking-tight"
      >
        {safeLabel.toLocaleString()}
      </motion.span>
    </div>
  );
};

const ShareDrawer = ({ video, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/video/${video?.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const platforms = [
    {
      name: 'WhatsApp',
      icon: <MessageSquare size={22} />,
      bg: 'from-emerald-500 to-green-600',
      action: () => window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}`,
        '_blank',
        'noopener,noreferrer'
      )
    },
    {
      name: 'Twitter/X',
      icon: <Share2 size={22} />,
      bg: 'from-sky-400 to-blue-600',
      action: () => window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
        '_blank',
        'noopener,noreferrer'
      )
    },
    {
      name: 'Facebook',
      icon: <Users size={22} />,
      bg: 'from-blue-600 to-indigo-700',
      action: () => window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        '_blank',
        'noopener,noreferrer'
      )
    },
    {
      name: 'Telegram',
      icon: <Send size={22} />,
      bg: 'from-cyan-400 to-blue-500',
      action: () => window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
        '_blank',
        'noopener,noreferrer'
      )
    },
    {
      name: 'Direct Link',
      icon: copied ? <Check size={22} /> : <Copy size={22} />,
      bg: 'from-pink-500 to-rose-600',
      action: copyToClipboard
    }
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 z-[110] backdrop-blur-md"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="fixed bottom-0 left-0 right-0 bg-[#090910]/95 rounded-t-[2.5rem] pb-8 z-[111] border-t border-cyan-500/30 shadow-[0_-10px_35px_rgba(6,182,212,0.3)]"
      >
        <div className="w-12 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 rounded-full mx-auto mt-3 mb-4 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />

        <div className="px-6 flex justify-between items-center mb-6">
          <h3 className="text-sm font-black uppercase text-cyan-400 tracking-wider">
            Share Broadcast
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="p-1 bg-white/10 rounded-full text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 flex gap-4 overflow-x-auto pb-4 custom-viewport-scrollbar">
          {platforms.map((p) => (
            <div
              key={p.name}
              onClick={(e) => {
                e.stopPropagation();
                p.action();
              }}
              className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${p.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all`}
              >
                {p.icon}
              </div>

              <span className="text-[10px] font-bold text-zinc-300">
                {p.name}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pt-2">
          {video?.allow_download === false ? (
            <p className="text-[10px] font-mono text-zinc-500 text-center">
              🔒 The creator has turned off video downloads for this post.
            </p>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(video);
              }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} />
              Save Watermarked Video
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

const CommentDrawer = ({
  videoId,
  onClose,
  user,
  onCommentCountUpdate,
  allowComments = true
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('video_comments')
          .select('id, text, created_at, user_id, profiles:user_id(username, avatar_url)')
          .eq('video_id', videoId)
          .order('created_at', { ascending: false });

        if (!error && mounted) {
          setComments(data || []);
        }

        if (error) {
          console.error('Comment fetch failed:', error);
        }
      } catch (err) {
        console.error('Comment fetch error:', err);
      } finally {
        if (mounted) setIsFetching(false);
      }
    };

    fetchComments();

    return () => {
      mounted = false;
    };
  }, [videoId]);

  const postComment = async () => {
    if (!newComment.trim() || !user || isPosting || !allowComments) return;

    setIsPosting(true);

    try {
      const { data, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: user.id,
          text: newComment.trim()
        })
        .select('id, text, created_at, user_id, profiles:user_id(username, avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setComments(prev => [data, ...prev]);
        setNewComment('');

        if (onCommentCountUpdate) {
          onCommentCountUpdate();
        }
      }
    } catch (err) {
      console.error('Comment post failed:', err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 z-[100] backdrop-blur-md"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute bottom-0 left-0 right-0 bg-[#0a0a12]/95 h-[75vh] rounded-t-[2rem] z-[101] flex flex-col border-t border-cyan-500/40 shadow-[0_-10px_35px_rgba(6,182,212,0.35)]"
      >
        <div className="w-12 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 rounded-full mx-auto mt-3 mb-1 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />

        <div className="p-4 flex justify-between items-center border-b border-cyan-500/20 text-white">
          <span className="text-sm font-black uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            {comments.length} Comments
          </span>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-zinc-900 border border-pink-500/40 rounded-full text-pink-400 hover:shadow-[0_0_10px_rgba(236,72,153,0.6)] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-5"
        >
          {isFetching ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Loader2
                className="animate-spin text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.9)] mb-2"
                size={30}
              />
            </div>
          ) : !allowComments ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <p className="text-sm font-bold text-zinc-400">
                Comments are turned off for this video.
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <p className="text-sm font-bold text-zinc-400 text-center">
                No comments yet. Be the first to spark the conversation! ✨
              </p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3 text-white">
                <img
                  src={
                    c.profiles?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`
                  }
                  className="w-10 h-10 rounded-full bg-zinc-900 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)] object-cover"
                  alt=""
                />

                <div className="flex-1 bg-zinc-900/80 border border-cyan-500/20 p-3 rounded-2xl rounded-tl-none shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <p className="text-[11px] font-black text-cyan-300 truncate">
                      @{c.profiles?.username || 'user'}
                    </p>

                    <p className="text-[9px] text-zinc-400 shrink-0">
                      {c.created_at
                        ? formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true
                          })
                        : ''}
                    </p>
                  </div>

                  <p className="text-[13px] text-zinc-100 leading-snug break-words">
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {allowComments && (
          <div className="p-4 pb-10 bg-[#0d0d18] border-t border-cyan-500/20 flex gap-3 items-center">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') postComment();
              }}
              placeholder="Add comment..."
              className="flex-1 bg-black/60 border border-cyan-500/40 rounded-full px-5 py-3 text-sm text-cyan-100 placeholder-cyan-500/50 outline-none focus:border-pink-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all"
            />

            <button
              type="button"
              onClick={postComment}
              disabled={!newComment.trim() || isPosting}
              className="p-3 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full text-black font-bold disabled:opacity-40 shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all"
            >
              {isPosting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
};

const SettingsOverlay = ({
  onClose,
  video,
  user,
  onReport,
  onNotInterested,
  onUpdate
}) => {
  const [isProcessing, setIsProcessing] = useState(null);

  if (!video) return null;

  const isOwner = user?.id === video?.user_id;

  const ActionSquare = ({
    icon,
    label,
    onClick,
    loading,
    disabled = false
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-black/60 rounded-3xl active:scale-90 transition-all border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] hover:border-cyan-400 disabled:opacity-40"
    >
      <div className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
        {loading ? (
          <Loader2 size={22} className="animate-spin text-pink-500" />
        ) : (
          icon || '?'
        )}
      </div>

      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-tighter">
        {label}
      </span>
    </button>
  );

  const handleDownloadAction = async () => {
    if (video.allow_download === false) {
      alert('The creator has disabled downloads for this video.');
      return;
    }

    if (!video.video_url) {
      alert('Video source not found.');
      return;
    }

    setIsProcessing('downloading');

    try {
      let stableAudioUrl = null;

      if (video.music_url) {
        const cleanCheck = String(video.music_url).trim().toLowerCase();

        if (
          cleanCheck !== '' &&
          cleanCheck !== 'null' &&
          cleanCheck !== 'undefined'
        ) {
          stableAudioUrl = video.music_url;
        }
      }

      const response = await fetch(
        'https://mpade-backend.onrender.com/api/merge-video',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: video.video_url,
            audioUrl: stableAudioUrl
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Backend processing failed.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Mpade_${video.id || 'export'}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('❌ Download Error:', err);
      alert(`Could not download video. Details: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this video forever?')) return;

    setIsProcessing('deleting');

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 z-[100] backdrop-blur-md"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute bottom-0 left-0 right-0 bg-[#0a0a12]/95 rounded-t-[2rem] pb-10 z-[101] border-t border-cyan-500/40 shadow-[0_-10px_30px_rgba(6,182,212,0.3)]"
      >
        <div className="w-10 h-1 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6 flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <ActionSquare
              icon={<Download size={22} />}
              label="Save"
              onClick={handleDownloadAction}
              loading={isProcessing === 'downloading'}
              disabled={video.allow_download === false}
            />

            <ActionSquare
              icon={<Share2 size={22} />}
              label="Share"
              onClick={() => handleShare(video)}
            />

            <ActionSquare
              icon={<Repeat2 size={22} />}
              label="Duet"
              onClick={() =>
                alert(
                  video.allow_duet === false
                    ? 'The creator has disabled duets for this video.'
                    : 'Duet Studio opening soon!'
                )
              }
              disabled={video.allow_duet === false}
            />

            <ActionSquare
              icon={<Scissors size={22} />}
              label="Stitch"
              onClick={() =>
                alert(
                  video.allow_stitch === false
                    ? 'The creator has disabled stitching for this video.'
                    : 'Stitch Editor opening soon!'
                )
              }
              disabled={video.allow_stitch === false}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onNotInterested?.(video.id);
              onClose();
            }}
            className="flex items-center gap-4 p-4 bg-black/50 border border-cyan-500/30 rounded-2xl text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          >
            <EyeOff size={20} />
            <span className="font-semibold text-sm">Not Interested</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onReport?.(video.id);
              onClose();
            }}
            className="flex items-center gap-4 p-4 bg-pink-950/30 border border-pink-500/40 rounded-2xl text-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all"
          >
            <Flag size={20} />
            <span className="font-semibold text-sm">Report</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isProcessing === 'deleting'}
              className="flex items-center gap-4 p-4 bg-red-950/40 border border-red-500/60 rounded-2xl text-red-400 mt-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all"
            >
              {isProcessing === 'deleting' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Trash2 size={20} />
              )}

              <span className="font-semibold text-sm">
                {isProcessing === 'deleting'
                  ? 'Deleting...'
                  : 'Delete Video'}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

const VideoCard = ({
  video,
  currentUser,
  initialShowComments = false
}) => {
  const [playing, setPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [showShare, setShowShare] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const [revealedMature, setRevealedMature] = useState(
    !video.age_restricted
  );
  const [showCC, setShowCC] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [userPollVote, setUserPollVote] = useState(null);
  const [pollVotes, setPollVotes] = useState({
    option1: Number(video.poll_data?.votes1) || 12,
    option2: Number(video.poll_data?.votes2) || 8
  });
  const [activeChapter, setActiveChapter] = useState(null);

  const [mediaState, setMediaState] = useState('loading');
  const [mediaError, setMediaError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const [counts, setCounts] = useState({
    likes: Number(video?.likes_count) || 0,
    comments: Number(video?.comments_count) || 0,
    favorites: Number(video?.favorites_count) || 0
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const viewedRef = useRef(false);
  const playRequestRef = useRef(false);
  const retryTimerRef = useRef(null);
  const playIconTimerRef = useRef(null);

  const hasMusic = Boolean(
    video.music_url &&
    String(video.music_url).trim() &&
    String(video.music_url).trim().toLowerCase() !== 'null' &&
    String(video.music_url).trim().toLowerCase() !== 'undefined'
  );

  const safeVideoUrl =
    typeof video.video_url === 'string'
      ? video.video_url.trim()
      : '';

  const safeMusicUrl =
    hasMusic
      ? String(video.music_url).trim()
      : '';

  useEffect(() => {
    if (initialShowComments) {
      setShowComments(true);
    }
  }, [initialShowComments]);

  const getMediaErrorMessage = useCallback((element) => {
    if (!element?.error) {
      return 'The video could not be loaded.';
    }

    switch (element.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return 'Video loading was interrupted.';
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Network error while loading the video.';
      case MediaError.MEDIA_ERR_DECODE:
        return 'The video could not be decoded. The uploaded file may be damaged or use an unsupported format.';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'This video source is not supported. Check that the stored file is a valid MP4/WebM and has the correct MIME type.';
      default:
        return 'The video could not be played.';
    }
  }, []);

  const playAudioSafely = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || !hasMusic) return true;

    try {
      await audio.play();
      return true;
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('Music playback unavailable:', err);
      }
      return false;
    }
  }, [hasMusic]);

  const playVideoSafely = useCallback(async () => {
    const videoElement = videoRef.current;

    if (!videoElement || !safeVideoUrl) {
      setMediaState('error');
      setMediaError('Video source is missing.');
      return false;
    }

    if (playRequestRef.current) return true;

    playRequestRef.current = true;

    try {
      if (videoElement.readyState < 2) {
        try {
          await videoElement.play();
        } catch (err) {
          if (err?.name === 'NotAllowedError') {
            setPlaying(false);
            return false;
          }

          throw err;
        }
      } else {
        await videoElement.play();
      }

      if (hasMusic) {
        await playAudioSafely();
      }

      setPlaying(true);
      setMediaState('playing');
      setMediaError('');
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') {
        return false;
      }

      console.error('❌ Video playback failed:', {
        name: err?.name,
        message: err?.message,
        src: safeVideoUrl,
        mediaError: videoElement.error
      });

      setPlaying(false);
      setMediaState('error');
      setMediaError(getMediaErrorMessage(videoElement));
      return false;
    } finally {
      playRequestRef.current = false;
    }
  }, [
    safeVideoUrl,
    hasMusic,
    playAudioSafely,
    getMediaErrorMessage
  ]);

  const pauseMedia = useCallback(() => {
    playRequestRef.current = false;

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }

    setPlaying(false);
  }, []);

  const retryVideo = useCallback(() => {
    const element = videoRef.current;

    if (!element || !safeVideoUrl) return;

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    setMediaError('');
    setMediaState('loading');
    setRetryCount(prev => prev + 1);

    try {
      element.pause();
      element.load();

      retryTimerRef.current = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const visible =
            rect.top < window.innerHeight * 0.7 &&
            rect.bottom > window.innerHeight * 0.3;

          if (visible) {
            playVideoSafely();
          }
        }
      }, 350);
    } catch (err) {
      console.error('Video retry failed:', err);
    }
  }, [safeVideoUrl, playVideoSafely]);

  const handleLoadedMetadata = useCallback(() => {
    setMediaError('');
    setMediaState('ready');
  }, []);

  const handleCanPlay = useCallback(() => {
    setMediaError('');
    setMediaState(prev =>
      prev === 'playing' ? 'playing' : 'ready'
    );
  }, []);

  const handleWaiting = useCallback(() => {
    if (!videoRef.current?.paused) {
      setMediaState('buffering');
    }
  }, []);

  const handlePlaying = useCallback(() => {
    setPlaying(true);
    setMediaState('playing');
    setMediaError('');
  }, []);

  const handlePause = useCallback(() => {
    setPlaying(false);

    if (mediaState !== 'error') {
      setMediaState('ready');
    }
  }, [mediaState]);

  const handleVideoError = useCallback(() => {
    const element = videoRef.current;
    const message = getMediaErrorMessage(element);

    console.error('❌ VIDEO SOURCE ERROR:', {
      url: safeVideoUrl,
      code: element?.error?.code,
      message,
      networkState: element?.networkState,
      readyState: element?.readyState
    });

    setPlaying(false);
    setMediaState('error');
    setMediaError(message);
  }, [getMediaErrorMessage, safeVideoUrl]);

  const handleAudioError = useCallback(() => {
    if (!hasMusic) return;

    console.warn('⚠️ External music could not be loaded:', safeMusicUrl);

    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  }, [hasMusic, safeMusicUrl]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const t = videoRef.current.currentTime;

    if (video.subtitles && Array.isArray(video.subtitles)) {
      const match = video.subtitles.find(
        s => t >= Number(s.start) && t <= Number(s.end)
      );

      setCurrentSubtitle(match ? match.text : '');
    }

    if (video.chapters && Array.isArray(video.chapters)) {
      const sorted = [...video.chapters].sort(
        (a, b) => Number(a.time) - Number(b.time)
      );

      let cur = null;

      for (let i = 0; i < sorted.length; i++) {
        if (t >= Number(sorted[i].time)) {
          cur = sorted[i];
        }
      }

      setActiveChapter(cur);
    }
  };

  const jumpToChapter = async (chapterTime) => {
    if (!videoRef.current) return;

    const time = Number(chapterTime);

    if (!Number.isFinite(time)) return;

    try {
      videoRef.current.currentTime = Math.max(0, time);

      if (videoRef.current.paused) {
        await playVideoSafely();
      } else if (hasMusic) {
        await playAudioSafely();
      }
    } catch (err) {
      console.error('Chapter jump failed:', err);
    }
  };

  const handleVotePoll = (choice) => {
    if (userPollVote) return;

    setUserPollVote(choice);

    setPollVotes(prev => ({
      ...prev,
      [choice]: Number(prev[choice] || 0) + 1
    }));
  };

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      if (!currentUser || !video.id) return;

      try {
        const [like, fav, follow] = await Promise.all([
          supabase
            .from('video_likes')
            .select('id')
            .eq('video_id', video.id)
            .eq('user_id', currentUser.id)
            .maybeSingle(),

          supabase
            .from('favorites')
            .select('id')
            .eq('video_id', video.id)
            .eq('user_id', currentUser.id)
            .maybeSingle(),

          supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', video.user_id)
            .maybeSingle()
        ]);

        if (!mounted) return;

        setIsLiked(!!like.data);
        setIsFavorited(!!fav.data);
        setIsFollowing(!!follow.data);
      } catch (err) {
        console.error('Status fetch failed:', err);
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
    };
  }, [video.id, video.user_id, currentUser]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !safeVideoUrl) {
      setMediaState('error');
      setMediaError('Video source is missing.');
      return undefined;
    }

    setMediaState('loading');
    setMediaError('');
    viewedRef.current = false;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry) return;

        const shouldPlay =
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.6 &&
          (!video.age_restricted || revealedMature);

        if (shouldPlay) {
          const played = await playVideoSafely();

          if (
            played &&
            !viewedRef.current
          ) {
            viewedRef.current = true;

            try {
              await incrementView(video.id);
            } catch (err) {
              console.warn('View increment failed:', err);
            }
          }
        } else {
          pauseMedia();
        }
      },
      {
        threshold: [0, 0.6, 0.9],
        rootMargin: '0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (playIconTimerRef.current) {
        clearTimeout(playIconTimerRef.current);
        playIconTimerRef.current = null;
      }

      playRequestRef.current = false;

      if (videoElement) {
        try {
          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch {}
      }

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        } catch {}
      }
    };
  }, [
    video.id,
    safeVideoUrl,
    revealedMature,
    video.age_restricted,
    playVideoSafely,
    pauseMedia
  ]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    videoElement.muted = hasMusic;

    if (hasMusic && audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 1;
    }
  }, [hasMusic]);

  const togglePlay = async (e) => {
    if (e?.target?.closest?.('button, a, input, textarea, [data-no-video-toggle]')) {
      return;
    }

    if (!videoRef.current) return;

    if (video.age_restricted && !revealedMature) {
      setRevealedMature(true);
      return;
    }

    if (videoRef.current.paused) {
      await playVideoSafely();
    } else {
      pauseMedia();
    }

    setShowPlayIcon(true);

    if (playIconTimerRef.current) {
      clearTimeout(playIconTimerRef.current);
    }

    playIconTimerRef.current = setTimeout(() => {
      setShowPlayIcon(false);
    }, 500);
  };

  const onLike = async (e) => {
    e?.stopPropagation?.();

    try {
      const res = await handleLike(
        e,
        video.id,
        isLiked,
        counts.likes,
        currentUser
      );

      setIsLiked(res.updatedLiked);
      setCounts(prev => ({
        ...prev,
        likes: res.newCount
      }));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const onFavorite = async (e) => {
    e?.stopPropagation?.();

    try {
      const res = await handleFavorite(
        e,
        video.id,
        isFavorited,
        currentUser
      );

      setIsFavorited(res);

      setCounts(prev => ({
        ...prev,
        favorites: res
          ? prev.favorites + 1
          : Math.max(0, prev.favorites - 1)
      }));
    } catch (err) {
      console.error('Favorite error:', err);
    }
  };

  const handleFollowClick = async (e) => {
    e.stopPropagation();

    if (!currentUser || currentUser.id === video.user_id) return;

    const previous = isFollowing;

    setIsFollowing(true);

    try {
      await handleFollow(
        e,
        video.user_id,
        previous,
        currentUser
      );
    } catch (err) {
      console.error('Follow error:', err);
      setIsFollowing(previous);
    }
  };

  const totalVotes =
    Number(pollVotes.option1 || 0) +
    Number(pollVotes.option2 || 0);

  const pct1 =
    totalVotes > 0
      ? Math.round(
          (Number(pollVotes.option1 || 0) / totalVotes) * 100
        )
      : 50;

  const pct2 = 100 - pct1;

  const filterStyle = getEffectiveFilterStyle(video);

  return (
    <div
      ref={containerRef}
      id={`video-${video.id}`}
      onClick={togglePlay}
      className="relative h-screen w-full bg-black snap-start flex items-center justify-center overflow-hidden cursor-pointer border-b border-cyan-500/10"
    >
      {hasMusic && (
        <audio
          ref={audioRef}
          src={safeMusicUrl}
          loop
          preload="auto"
          onError={handleAudioError}
        />
      )}

      <video
        ref={videoRef}
        className={`h-full w-full object-cover transition-all ${
          video.age_restricted && !revealedMature
            ? 'blur-2xl scale-105 brightness-50'
            : ''
        }`}
        style={{ filter: filterStyle }}
        src={safeVideoUrl || undefined}
        loop
        playsInline
        muted={hasMusic}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onStalled={handleWaiting}
        onError={handleVideoError}
        onTimeUpdate={handleTimeUpdate}
      />

      {mediaState === 'loading' && !mediaError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <Loader2
              size={28}
              className="animate-spin text-cyan-400"
            />
          </div>
        </div>
      )}

      {mediaState === 'buffering' && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10">
            <Loader2
              size={13}
              className="animate-spin text-cyan-400"
            />
            <span className="text-[10px] font-bold text-zinc-300">
              Buffering...
            </span>
          </div>
        </div>
      )}

      {mediaState === 'error' && (
        <div
          className="absolute inset-0 z-35 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-sm w-full bg-[#090910]/95 border border-red-500/40 rounded-3xl p-6 text-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-950/70 border border-red-500/50 flex items-center justify-center mb-4">
              <ShieldAlert size={27} className="text-red-400" />
            </div>

            <h4 className="text-sm font-black uppercase tracking-wider text-red-300 mb-2">
              Video Playback Error
            </h4>

            <p className="text-xs leading-relaxed text-zinc-400 mb-4">
              {mediaError || 'Unable to play this video.'}
            </p>

            <button
              type="button"
              onClick={retryVideo}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black text-xs font-black uppercase tracking-wider shadow-[0_0_18px_rgba(6,182,212,0.35)]"
            >
              Retry {retryCount > 0 ? `(${retryCount})` : ''}
            </button>
          </div>
        </div>
      )}

      {video.age_restricted && !revealedMature && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500/80 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
            <ShieldAlert size={32} />
          </div>

          <h4 className="text-lg font-black uppercase text-red-300 mb-1">
            Sensitive Content Warning
          </h4>

          <p className="text-xs text-zinc-300 max-w-xs mb-6">
            This broadcast contains mature or age-restricted material flagged by the creator.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRevealedMature(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all"
          >
            Reveal Video & Watch
          </button>
        </div>
      )}

      {(video.is_commercial || video.sponsor_tag) && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/60 shadow-lg">
          <Award size={14} className="text-amber-400" />

          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
            {video.sponsor_tag
              ? `Paid Partnership • ${video.sponsor_tag}`
              : 'Paid Partnership'}
          </span>
        </div>
      )}

      {video.poll_data && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-28 left-4 right-16 max-w-xs z-30 bg-black/80 backdrop-blur-xl p-3.5 rounded-3xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.3)] text-white"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle size={14} className="text-pink-400" />

            <p className="text-xs font-black text-zinc-100">
              {video.poll_data.question}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleVotePoll('option1');
              }}
              className={`relative w-full py-2 px-3 rounded-2xl border text-left overflow-hidden transition-all ${
                userPollVote === 'option1'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                  : 'border-white/10 bg-white/5 hover:border-cyan-500/50'
              }`}
            >
              {userPollVote && (
                <div
                  className="absolute inset-0 bg-cyan-500/20"
                  style={{ width: `${pct1}%` }}
                />
              )}

              <div className="relative flex justify-between items-center text-[11px] font-bold">
                <span className="truncate">
                  {video.poll_data.option1}
                </span>

                {userPollVote && (
                  <span className="font-mono text-cyan-300 ml-2">
                    {pct1}%
                  </span>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleVotePoll('option2');
              }}
              className={`relative w-full py-2 px-3 rounded-2xl border text-left overflow-hidden transition-all ${
                userPollVote === 'option2'
                  ? 'border-pink-500 bg-pink-950/60 text-pink-300'
                  : 'border-white/10 bg-white/5 hover:border-pink-500/50'
              }`}
            >
              {userPollVote && (
                <div
                  className="absolute inset-0 bg-pink-500/20"
                  style={{ width: `${pct2}%` }}
                />
              )}

              <div className="relative flex justify-between items-center text-[11px] font-bold">
                <span className="truncate">
                  {video.poll_data.option2}
                </span>

                {userPollVote && (
                  <span className="font-mono text-pink-300 ml-2">
                    {pct2}%
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {video.product_link && (
        <div
          onClick={(e) => {
            e.stopPropagation();

            if (video.product_link.url) {
              window.open(
                video.product_link.url,
                '_blank',
                'noopener,noreferrer'
              );
            }
          }}
          className="absolute bottom-36 left-4 z-30 max-w-[280px] bg-black/85 backdrop-blur-xl p-2.5 rounded-2xl border border-pink-500/50 flex items-center justify-between shadow-[0_0_20px_rgba(236,72,153,0.3)] cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shrink-0">
              <ShoppingBag size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-black text-white truncate group-hover:text-pink-300 transition-colors">
                {video.product_link.title}
              </p>

              <p className="text-[10px] font-mono text-emerald-400 font-bold">
                {video.product_link.price}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase shrink-0 shadow-md">
            {video.product_link.ctaText || 'Shop'}
          </span>
        </div>
      )}

      {showCC && currentSubtitle && (
        <div className="absolute bottom-28 left-6 right-16 z-30 pointer-events-none text-center">
          <span className="inline-block bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-2xl text-xs md:text-sm font-black text-yellow-300 border border-yellow-500/50 shadow-xl drop-shadow-md">
            {currentSubtitle}
          </span>
        </div>
      )}

      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.8 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute z-50 pointer-events-none drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]"
          >
            {playing ? (
              <Play
                size={80}
                className="text-cyan-400 fill-cyan-400 opacity-60"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-black/60 border border-cyan-400/40" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-20 text-white">
        <div className="relative mb-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] overflow-hidden bg-zinc-900"
            data-no-video-toggle
          >
            <Link
              to={video?.user_id ? `/profile/${video.user_id}` : '#'}
              onClick={(e) => e.stopPropagation()}
              className="block w-full h-full"
            >
              <img
                src={
                  video.profiles?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.user_id}`
                }
                className="w-full h-full object-cover"
                alt=""
              />
            </Link>
          </div>

          {!isFollowing && currentUser?.id !== video.user_id && (
            <button
              type="button"
              onClick={handleFollowClick}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-600 shadow-[0_0_10px_rgba(236,72,153,0.9)] rounded-full p-1 border-2 border-black"
            >
              <UserPlus
                size={12}
                strokeWidth={4}
                className="text-white"
              />
            </button>
          )}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          data-no-video-toggle
          className="flex flex-col gap-5 items-center"
        >
          <ActionButton
            icon={
              <Heart
                size={38}
                className={
                  isLiked
                    ? 'fill-pink-500 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.9)]'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                }
              />
            }
            label={counts.likes}
            onClick={onLike}
          />

          <ActionButton
            icon={
              <MessageCircle
                size={38}
                className={
                  video.allow_comments === false
                    ? 'text-zinc-500'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                }
              />
            }
            label={counts.comments}
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
          />

          <ActionButton
            icon={
              <Bookmark
                size={38}
                className={
                  isFavorited
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]'
                    : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                }
              />
            }
            label={counts.favorites}
            onClick={onFavorite}
          />

          <ActionButton
            icon={
              <Share2
                size={35}
                className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            }
            label="Share"
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(true);
            }}
          />

          {video.subtitles && video.subtitles.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCC(prev => !prev);
              }}
              className={`p-2 rounded-full border transition-all ${
                showCC
                  ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                  : 'bg-black/60 border-white/20 text-zinc-400'
              }`}
            >
              <Captions size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(true);
            }}
            className="text-cyan-400 hover:text-pink-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all"
          >
            <MoreHorizontal size={30} />
          </button>
        </div>

        <motion.div
          animate={playing ? { rotate: 360 } : {}}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="mt-4 w-11 h-11 rounded-full bg-black border-[3px] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center text-pink-500"
        >
          <Disc
            size={20}
            className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
          />
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none text-white z-10">
        <div className="flex items-center gap-2 mb-1.5 pointer-events-auto">
          {video.category && (
            <span className="px-2.5 py-0.5 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-[10px] font-black uppercase tracking-wider text-cyan-300">
              {video.category}
            </span>
          )}

          {activeChapter && (
            <span className="px-2.5 py-0.5 bg-pink-500/20 border border-pink-400/40 rounded-full text-[10px] font-black uppercase tracking-wider text-pink-300">
              📍 {activeChapter.title}
            </span>
          )}
        </div>

        <h3 className="font-black text-lg mb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)] pointer-events-auto">
          @{video.profiles?.username || 'user'}
        </h3>

        <p className="text-sm mb-3 line-clamp-2 max-w-[80%] text-cyan-100 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)] pointer-events-auto">
          {video.caption}
        </p>

        {video.chapters &&
          Array.isArray(video.chapters) &&
          video.chapters.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 pointer-events-auto">
              {video.chapters.map(ch => (
                <button
                  type="button"
                  key={`${ch.time}-${ch.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToChapter(ch.time);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight border transition-all shrink-0 ${
                    activeChapter?.time === ch.time
                      ? 'bg-cyan-500 text-black border-cyan-300 font-black'
                      : 'bg-black/60 border-white/10 text-zinc-300 hover:border-cyan-400'
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}

        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)] pointer-events-auto">
          <Music
            size={14}
            className="text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]"
          />

          <p className="text-[11px] font-black uppercase truncate max-w-[150px] text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">
            {video.music_name || 'Original Audio'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentDrawer
            videoId={video.id}
            onClose={() => setShowComments(false)}
            user={currentUser}
            allowComments={video.allow_comments !== false}
            onCommentCountUpdate={() =>
              setCounts(prev => ({
                ...prev,
                comments: prev.comments + 1
              }))
            }
          />
        )}

        {showShare && (
          <ShareDrawer
            video={video}
            onClose={() => setShowShare(false)}
          />
        )}

        {showSettings && (
          <SettingsOverlay
            video={video}
            onClose={() => setShowSettings(false)}
            user={currentUser}
            onReport={() =>
              handleReport(video.id, currentUser)
            }
            onNotInterested={() =>
              handleNotInterested(video.id, currentUser)
            }
            onUpdate={() => window.location.reload()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Feed = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const targetVideoId =
    params?.id ||
    searchParams.get('videoId') ||
    location.state?.scrollToId ||
    null;

  const shouldOpenComments =
    location.state?.openComments ||
    searchParams.get('comments') === 'true';

  useEffect(() => {
    const stopAllMedia = () => {
      document.querySelectorAll('video').forEach(v => {
        try {
          v.pause();
        } catch {}

        if (v !== document.activeElement) {
          v.muted = true;
        }
      });

      document.querySelectorAll('audio').forEach(a => {
        try {
          a.pause();
        } catch {}
      });
    };

    stopAllMedia();

    return () => {
      stopAllMedia();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initFeed = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setCurrentUser(user);

        const { data, error } = await supabase
          .from('videos')
          .select('*, profiles:user_id (username, avatar_url)')
          .order('created_at', {
            ascending: false
          });

        if (error) throw error;

        let feedList = data || [];

        if (
          targetVideoId &&
          feedList.some(v => v.id === targetVideoId)
        ) {
          const targeted = feedList.find(
            v => v.id === targetVideoId
          );

          const others = feedList.filter(
            v => v.id !== targetVideoId
          );

          feedList = [targeted, ...others];
        }

        if (mounted) {
          setVideos(feedList);
        }
      } catch (err) {
        console.error('Feed error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initFeed();

    const feedChannel = supabase
      .channel('realtime-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos'
        },
        async (payload) => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            const integratedVideoObject = {
              ...payload.new,
              profiles: profileData || null
            };

            if (!mounted) return;

            setVideos(currentFeed => {
              const alreadyExists = currentFeed.some(
                v => v.id === integratedVideoObject.id
              );

              if (alreadyExists) {
                return currentFeed;
              }

              return [
                integratedVideoObject,
                ...currentFeed
              ];
            });
          } catch (err) {
            console.error(
              'Realtime video integration failed:',
              err
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🌐 Feed realtime connected');
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(feedChannel);
    };
  }, [targetVideoId]);

  useEffect(() => {
    if (
      !loading &&
      videos.length > 0 &&
      targetVideoId
    ) {
      const timer = setTimeout(() => {
        const element = document.getElementById(
          `video-${targetVideoId}`
        );

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [loading, videos, targetVideoId]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#05050a] flex flex-col items-center justify-center gap-4 text-white">
        <Loader2
          className="animate-spin text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,1)]"
          size={54}
        />

        <p className="italic font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
          Syncing Universe...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide">
      {videos.length === 0 ? (
        <div className="h-screen flex items-center justify-center text-zinc-500">
          <p className="text-sm font-bold">
            No videos available yet.
          </p>
        </div>
      ) : (
        videos.map(vid => (
          <VideoCard
            key={vid.id}
            video={vid}
            currentUser={currentUser}
            initialShowComments={
              vid.id === targetVideoId &&
              shouldOpenComments
            }
          />
        ))
      )}
    </div>
  );
};

export default Feed;
