import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { 
  Heart, MessageCircle, Share2, Music, UserPlus, Disc, 
  Loader2, MoreHorizontal, Bookmark, X, Send,
  Download, HeartOff, Scissors, Users, Captions, EyeOff, Flag, Check,
  MessageSquare, Copy, ExternalLink, Play, ShoppingBag, Award,
  Repeat2, Trash2, ShieldAlert, Shield, HelpCircle, MapPin, Tag,
  BarChart2, Radio, CheckCircle2, Sparkles
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

// LUT Filters Map
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

// Robust Filter Resolver: reads from column, tags, caption metadata, or device cache
export const getEffectiveFilterStyle = (video) => {
  if (!video) return '';
  // 1. Direct database column
  if (video.filter_style && LUT_FILTERS[video.filter_style] !== undefined) {
    return LUT_FILTERS[video.filter_style];
  }
  // 2. Tag format: filter_neon_cyber
  if (Array.isArray(video.tags)) {
    const filterTag = video.tags.find(t => typeof t === 'string' && t.startsWith('filter_'));
    if (filterTag) {
      const fId = filterTag.replace('filter_', '');
      if (LUT_FILTERS[fId] !== undefined) return LUT_FILTERS[fId];
    }
  }
  // 3. Caption metadata format: [filter:neon_cyber]
  if (typeof video.caption === 'string') {
    const match = video.caption.match(/\[filter:([a-z0-9_]+)\]/i);
    if (match && LUT_FILTERS[match[1]] !== undefined) {
      return LUT_FILTERS[match[1]];
    }
  }
  // 4. Local device persistence
  try {
    const localF = (video.id && localStorage.getItem(`mpade_filter_${video.id}`)) ||
                   (video.video_url && localStorage.getItem(`mpade_filter_${video.video_url}`));
    if (localF && LUT_FILTERS[localF] !== undefined) {
      return LUT_FILTERS[localF];
    }
  } catch (e) {}

  return '';
};

// --- SUB-COMPONENTS ---

const ActionButton = ({ icon, label, onClick }) => {
  const numericLabel = Number(label);
  const safeLabel = isNaN(numericLabel) ? 0 : Math.max(0, numericLabel);

  return (
    <div className="flex flex-col items-center group">
      <motion.button 
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { name: 'WhatsApp', icon: <MessageSquare size={22} />, bg: 'from-emerald-500 to-green-600', action: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}`) },
    { name: 'Twitter/X', icon: <Share2 size={22} />, bg: 'from-sky-400 to-blue-600', action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`) },
    { name: 'Facebook', icon: <Users size={22} />, bg: 'from-blue-600 to-indigo-700', action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`) },
    { name: 'Telegram', icon: <Send size={22} />, bg: 'from-cyan-400 to-blue-500', action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`) },
    { name: 'Direct Link', icon: copied ? <Check size={22} /> : <Copy size={22} />, bg: 'from-pink-500 to-rose-600', action: copyToClipboard },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 z-[110] backdrop-blur-md" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-[#090910]/95 rounded-t-[2.5rem] pb-8 z-[111] border-t border-cyan-500/30 shadow-[0_-10px_35px_rgba(6,182,212,0.3)]">
        <div className="w-12 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 rounded-full mx-auto mt-3 mb-4 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <div className="px-6 flex justify-between items-center mb-6">
          <h3 className="text-sm font-black uppercase text-cyan-400 tracking-wider">Share Broadcast</h3>
          <button onClick={onClose} className="p-1 bg-white/10 rounded-full text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-6 flex gap-4 overflow-x-auto pb-4 custom-viewport-scrollbar">
          {platforms.map((p, idx) => (
            <div key={idx} onClick={() => { p.action(); }} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${p.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-all`}>
                {p.icon}
              </div>
              <span className="text-[10px] font-bold text-zinc-300">{p.name}</span>
            </div>
          ))}
        </div>

        {/* Allow Download status */}
        <div className="px-6 pt-2">
          {video?.allow_download === false ? (
            <p className="text-[10px] font-mono text-zinc-500 text-center">🔒 The creator has turned off video downloads for this post.</p>
          ) : (
            <button 
              onClick={() => handleDownload(video)}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} /> Save Watermarked Video
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

const CommentDrawer = ({ videoId, onClose, user, onCommentCountUpdate, allowComments = true }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('video_comments')
        .select('id, text, created_at, user_id, profiles:user_id(username, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (!error) setComments(data || []);
      setIsFetching(false);
    };
    fetchComments();
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
          text: newComment 
        })
        .select('id, text, created_at, user_id, profiles:user_id(username, avatar_url)')
        .single();
        
      if (error) throw error;
      
      if (data) { 
        setComments(prev => [data, ...prev]); 
        setNewComment(""); 
        if (onCommentCountUpdate) onCommentCountUpdate();
      }
    } catch (err) {
      console.error("Comment post failed:", err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 z-[100] backdrop-blur-md" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-[#0a0a12]/95 h-[75vh] rounded-t-[2rem] z-[101] flex flex-col border-t border-cyan-500/40 shadow-[0_-10px_35px_rgba(6,182,212,0.35)]">
        <div className="w-12 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 rounded-full mx-auto mt-3 mb-1 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <div className="p-4 flex justify-between items-center border-b border-cyan-500/20 text-white">
          <span className="text-sm font-black uppercase tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">{comments.length} Comments</span>
          <button onClick={onClose} className="p-1.5 bg-zinc-900 border border-pink-500/40 rounded-full text-pink-400 hover:shadow-[0_0_10px_rgba(236,72,153,0.6)] transition-all"><X size={18} /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5">
          {isFetching ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.9)] mb-2" size={30} />
            </div>
          ) : !allowComments ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <p className="text-sm font-bold text-zinc-400">Comments are turned off for this video.</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <p className="text-sm font-bold text-zinc-400">No comments yet. Be the first to spark the conversation! ✨</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3 text-white">
                <img src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`} className="w-10 h-10 rounded-full bg-zinc-900 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)] object-cover" alt="" />
                <div className="flex-1 bg-zinc-900/80 border border-cyan-500/20 p-3 rounded-2xl rounded-tl-none shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] font-black text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">@{c.profiles?.username || 'user'}</p>
                    <p className="text-[9px] text-zinc-400">{c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}</p>
                  </div>
                  <p className="text-[13px] text-zinc-100 leading-snug">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {allowComments && (
          <div className="p-4 pb-10 bg-[#0d0d18] border-t border-cyan-500/20 flex gap-3 items-center">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} placeholder="Add comment..." className="flex-1 bg-black/60 border border-cyan-500/40 rounded-full px-5 py-3 text-sm text-cyan-100 placeholder-cyan-500/50 outline-none focus:border-pink-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all" />
            <button onClick={postComment} disabled={!newComment.trim() || isPosting} className="p-3 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full text-black font-bold disabled:opacity-40 shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all"><Send size={18} /></button>
          </div>
        )}
      </motion.div>
    </>
  );
};

const SettingsOverlay = ({ onClose, video, user, onReport, onNotInterested, onUpdate }) => {
  const [isProcessing, setIsProcessing] = React.useState(null);

  if (!video) return null; 
  const isOwner = user?.id === video?.user_id;

  const ActionSquare = ({ icon, label, onClick, loading, disabled = false }) => (
    <button 
      onClick={onClick} 
      disabled={loading || disabled}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-black/60 rounded-3xl active:scale-90 transition-all border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] hover:border-cyan-400 disabled:opacity-40"
    >
      <div className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
        {loading ? <Loader2 size={22} className="animate-spin text-pink-500" /> : (icon || '?')}
      </div>
      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-tighter drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{label}</span>
    </button>
  );

  const handleDownloadAction = async () => {
    if (video.allow_download === false) {
      return alert("The creator has disabled downloads for this video.");
    }
    if (!video.video_url) return alert("Video source not found.");
    setIsProcessing('downloading'); 

    try {
      let stableAudioUrl = null;
      if (video.music_url) {
        const cleanCheck = String(video.music_url).trim().toLowerCase();
        if (cleanCheck !== '' && cleanCheck !== 'null' && cleanCheck !== 'undefined') {
          stableAudioUrl = video.music_url;
        }
      }

      const response = await fetch('https://mpade-backend.onrender.com/api/merge-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: video.video_url,
          audioUrl: stableAudioUrl
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Backend processing failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mpade_${video.id || 'export'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("❌ Download Error:", err);
      alert(`Could not download video. Details: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this video forever?")) return;
    setIsProcessing('deleting');
    try {
      const { error } = await supabase.from('videos').delete().eq('id', video.id);
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 z-[100] backdrop-blur-md" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-[#0a0a12]/95 rounded-t-[2rem] pb-10 z-[101] border-t border-cyan-500/40 shadow-[0_-10px_30px_rgba(6,182,212,0.3)]">
        <div className="w-10 h-1 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full mx-auto mt-3 mb-6 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <div className="px-6 flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <ActionSquare 
              icon={<Download size={22}/>} 
              label="Save" 
              onClick={handleDownloadAction} 
              loading={isProcessing === 'downloading'} 
              disabled={video.allow_download === false}
            />
            <ActionSquare icon={<Share2 size={22}/>} label="Share" onClick={() => handleShare(video)} />
            <ActionSquare 
              icon={<Repeat2 size={22}/>} 
              label="Duet" 
              onClick={() => alert(video.allow_duet === false ? "The creator has disabled duets for this video." : "Duet Studio opening soon!")} 
              disabled={video.allow_duet === false}
            />
            <ActionSquare 
              icon={<Scissors size={22}/>} 
              label="Stitch" 
              onClick={() => alert(video.allow_stitch === false ? "The creator has disabled stitching for this video." : "Stitch Editor opening soon!")} 
              disabled={video.allow_stitch === false}
            />
          </div>
          <button onClick={() => { onNotInterested?.(video.id); onClose(); }} className="flex items-center gap-4 p-4 bg-black/50 border border-cyan-500/30 rounded-2xl text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
            <EyeOff size={20} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" /> <span className="font-semibold text-sm">Not Interested</span>
          </button>
          <button onClick={() => { onReport?.(video.id); onClose(); }} className="flex items-center gap-4 p-4 bg-pink-950/30 border border-pink-500/40 rounded-2xl text-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all">
            <Flag size={20} className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" /> <span className="font-semibold text-sm">Report</span>
          </button>
          {isOwner && (
            <button onClick={handleDelete} disabled={isProcessing === 'deleting'} className="flex items-center gap-4 p-4 bg-red-950/40 border border-red-500/60 rounded-2xl text-red-400 mt-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all">
              {isProcessing === 'deleting' ? 'Deleting...' : <Trash2 size={20} className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
              <span className="font-semibold text-sm ml-2">Delete Video</span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

// --- VIDEO CARD COMPONENT WITH 15 FULL FEATURES SUPPORT ---

const VideoCard = ({ video, currentUser, initialShowComments = false }) => {
  const [playing, setPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(initialShowComments);
  const [showShare, setShowShare] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // 15 Pro Feature States in Player:
  const [revealedMature, setRevealedMature] = useState(!video.age_restricted);
  const [showCC, setShowCC] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [userPollVote, setUserPollVote] = useState(null);
  const [pollVotes, setPollVotes] = useState({
    option1: Number(video.poll_data?.votes1) || 12,
    option2: Number(video.poll_data?.votes2) || 8
  });
  const [activeChapter, setActiveChapter] = useState(null);

  useEffect(() => {
    if (initialShowComments) {
      setShowComments(true);
    }
  }, [initialShowComments]);

  const [counts, setCounts] = useState({ 
    likes: Number(video?.likes_count) || 0, 
    comments: Number(video?.comments_count) || 0,
    favorites: Number(video?.favorites_count) || 0
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  // Subtitles & Chapters sync
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;

    // CC Subtitle sync
    if (video.subtitles && Array.isArray(video.subtitles)) {
      const match = video.subtitles.find(s => t >= s.start && t <= s.end);
      setCurrentSubtitle(match ? match.text : '');
    }

    // Chapters sync
    if (video.chapters && Array.isArray(video.chapters)) {
      const sorted = [...video.chapters].sort((a, b) => a.time - b.time);
      let cur = null;
      for (let i = 0; i < sorted.length; i++) {
        if (t >= sorted[i].time) cur = sorted[i];
      }
      setActiveChapter(cur);
    }
  };

  // Jump to chapter timestamp
  const jumpToChapter = (chapterTime) => {
    if (videoRef.current) {
      videoRef.current.currentTime = chapterTime;
      if (videoRef.current.paused) {
        videoRef.current.play();
        audioRef.current?.play();
        setPlaying(true);
      }
    }
  };

  // Handle Poll Voting in Player
  const handleVotePoll = (choice) => {
    if (userPollVote) return;
    setUserPollVote(choice);
    setPollVotes(prev => ({
      ...prev,
      [choice]: prev[choice] + 1
    }));
  };

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentUser) return;
      const [like, fav, follow] = await Promise.all([
        supabase.from('video_likes').select('id').eq('video_id', video.id).eq('user_id', currentUser.id).maybeSingle(),
        supabase.from('favorites').select('id').eq('video_id', video.id).eq('user_id', currentUser.id).maybeSingle(),
        supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', video.user_id).maybeSingle()
      ]);
      setIsLiked(!!like.data);
      setIsFavorited(!!fav.data);
      setIsFollowing(!!follow.data);
    };
    fetchStatus();
  }, [video.id, video.user_id, currentUser]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && (!video.age_restricted || revealedMature)) {
        videoRef.current?.play().catch(() => {});
        audioRef.current?.play().catch(() => {});
        setPlaying(true);
        incrementView(video.id);
      } else {
        videoRef.current?.pause();
        audioRef.current?.pause();
        setPlaying(false);
      }
    }, { threshold: 0.6 });

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src'); 
        videoRef.current.load();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      observer.disconnect();
    };
  }, [video.id, revealedMature, video.age_restricted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (video.age_restricted && !revealedMature) {
      setRevealedMature(true);
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play();
      audioRef.current?.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      audioRef.current?.pause();
      setPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  const onLike = async (e) => {
    try {
      const res = await handleLike(e, video.id, isLiked, counts.likes, currentUser);
      setIsLiked(res.updatedLiked);
      setCounts(prev => ({ ...prev, likes: res.newCount }));
    } catch (err) { console.error("Like error:", err); }
  };

  const onFavorite = async (e) => {
    const res = await handleFavorite(e, video.id, isFavorited, currentUser);
    setIsFavorited(res);
    setCounts(prev => ({ ...prev, favorites: res ? prev.favorites + 1 : Math.max(0, prev.favorites - 1) }));
  };

  // Calculate poll percentages
  const totalVotes = pollVotes.option1 + pollVotes.option2;
  const pct1 = totalVotes > 0 ? Math.round((pollVotes.option1 / totalVotes) * 100) : 50;
  const pct2 = 100 - pct1;

  // Selected filter style (persisted & resilient)
  const filterStyle = getEffectiveFilterStyle(video);

  return (
    <div 
      ref={containerRef} 
      id={`video-${video.id}`} 
      onClick={togglePlay} 
      className="relative h-screen w-full bg-black snap-start flex items-center justify-center overflow-hidden cursor-pointer border-b border-cyan-500/10"
    >
      {video.music_url && <audio ref={audioRef} src={video.music_url} loop preload="auto" />}
      
      {/* 9:16 Video Player with Feature 11: Color LUT Filter */}
      <video 
        ref={videoRef} 
        className={`h-full w-full object-cover transition-all ${video.age_restricted && !revealedMature ? 'blur-2xl scale-105 brightness-50' : ''}`} 
        style={{ filter: filterStyle }}
        src={video.video_url} 
        loop 
        playsInline 
        muted={!!video.music_url} 
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Feature 10: 18+ Age Restricted Sensitive Blur Gate */}
      {video.age_restricted && !revealedMature && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500/80 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
            <ShieldAlert size={32} />
          </div>
          <h4 className="text-lg font-black uppercase text-red-300 mb-1">Sensitive Content Warning</h4>
          <p className="text-xs text-zinc-300 max-w-xs mb-6">
            This broadcast contains mature or age-restricted material flagged by the creator.
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setRevealedMature(true); }}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all"
          >
            Reveal Video & Watch
          </button>
        </div>
      )}

      {/* Feature 6: Paid Partnership Banner */}
      {(video.is_commercial || video.sponsor_tag) && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/60 shadow-lg">
          <Award size={14} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
            {video.sponsor_tag ? `Paid Partnership • ${video.sponsor_tag}` : 'Paid Partnership'}
          </span>
        </div>
      )}

      {/* Feature 4: Interactive Video Poll Sticker in Feed */}
      {video.poll_data && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="absolute top-28 left-4 right-16 max-w-xs z-30 bg-black/80 backdrop-blur-xl p-3.5 rounded-3xl border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.3)] text-white"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle size={14} className="text-pink-400" />
            <p className="text-xs font-black text-zinc-100">{video.poll_data.question}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleVotePoll('option1')}
              className={`relative w-full py-2 px-3 rounded-2xl border text-left overflow-hidden transition-all ${
                userPollVote === 'option1' 
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300' 
                  : 'border-white/10 bg-white/5 hover:border-cyan-500/50'
              }`}
            >
              {userPollVote && (
                <div className="absolute inset-0 bg-cyan-500/20" style={{ width: `${pct1}%` }} />
              )}
              <div className="relative flex justify-between items-center text-[11px] font-bold">
                <span className="truncate">{video.poll_data.option1}</span>
                {userPollVote && <span className="font-mono text-cyan-300 ml-2">{pct1}%</span>}
              </div>
            </button>

            <button
              onClick={() => handleVotePoll('option2')}
              className={`relative w-full py-2 px-3 rounded-2xl border text-left overflow-hidden transition-all ${
                userPollVote === 'option2' 
                  ? 'border-pink-500 bg-pink-950/60 text-pink-300' 
                  : 'border-white/10 bg-white/5 hover:border-pink-500/50'
              }`}
            >
              {userPollVote && (
                <div className="absolute inset-0 bg-pink-500/20" style={{ width: `${pct2}%` }} />
              )}
              <div className="relative flex justify-between items-center text-[11px] font-bold">
                <span className="truncate">{video.poll_data.option2}</span>
                {userPollVote && <span className="font-mono text-pink-300 ml-2">{pct2}%</span>}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Feature 5: Product Pin Showcase Card */}
      {video.product_link && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (video.product_link.url) window.open(video.product_link.url, '_blank');
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
              <p className="text-[10px] font-mono text-emerald-400 font-bold">{video.product_link.price}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase shrink-0 shadow-md">
            {video.product_link.ctaText || 'Shop'}
          </span>
        </div>
      )}

      {/* Feature 2: Closed Captions (CC) Overlay */}
      {showCC && currentSubtitle && (
        <div className="absolute bottom-28 left-6 right-16 z-30 pointer-events-none text-center">
          <span className="inline-block bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-2xl text-xs md:text-sm font-black text-yellow-300 border border-yellow-500/50 shadow-xl drop-shadow-md">
            {currentSubtitle}
          </span>
        </div>
      )}

      {/* Play Icon Feedback */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.2, opacity: 0.8 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute z-50 pointer-events-none drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]">
            <Play size={80} className="text-cyan-400 fill-cyan-400 opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDE ACTION BUTTONS */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-20 text-white">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] overflow-hidden bg-zinc-900">
            <Link to={video?.user_id ? `/profile/${video.user_id}` : '#'} className="block w-full h-full">
              <img src={video.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.user_id}`} className="w-full h-full object-cover" alt="" />
            </Link>
          </div>
          {!isFollowing && currentUser?.id !== video.user_id && (
            <button onClick={(e) => { e.stopPropagation(); setIsFollowing(true); handleFollow(e, video.user_id, false, currentUser); }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-600 shadow-[0_0_10px_rgba(236,72,153,0.9)] rounded-full p-1 border-2 border-black">
              <UserPlus size={12} strokeWidth={4} className="text-white" />
            </button>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5 items-center">
          <ActionButton icon={<Heart size={38} className={isLiked ? 'fill-pink-500 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.9)]' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'} />} label={counts.likes} onClick={onLike} />
          
          <ActionButton 
            icon={<MessageCircle size={38} className={video.allow_comments === false ? 'text-zinc-500' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'} />} 
            label={counts.comments} 
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }} 
          />
          
          <ActionButton icon={<Bookmark size={38} className={isFavorited ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'} />} label={counts.favorites} onClick={onFavorite} />
          
          <ActionButton icon={<Share2 size={35} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />} label="Share" onClick={(e) => { e.stopPropagation(); setShowShare(true); }} />

          {/* Toggle CC button if subtitles exist */}
          {video.subtitles && video.subtitles.length > 0 && (
            <button
              onClick={() => setShowCC(!showCC)}
              className={`p-2 rounded-full border transition-all ${
                showCC ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-black/60 border-white/20 text-zinc-400'
              }`}
            >
              <Captions size={20} />
            </button>
          )}

          <MoreHorizontal size={30} onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="cursor-pointer text-cyan-400 hover:text-pink-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all" />
        </div>

        <motion.div animate={playing ? { rotate: 360 } : {}} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="mt-4 w-11 h-11 rounded-full bg-black border-[3px] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center text-pink-500"><Disc size={20} className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" /></motion.div>
      </div>

      {/* BOTTOM INFO OVERLAY */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none text-white z-10">
        
        {/* Category & Chapter Pill */}
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

        {/* Feature 1: Interactive Chapters Chips */}
        {video.chapters && Array.isArray(video.chapters) && video.chapters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 pointer-events-auto">
            {video.chapters.map(ch => (
              <button
                key={ch.time}
                onClick={(e) => { e.stopPropagation(); jumpToChapter(ch.time); }}
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

        {/* Music Track Badge */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)] pointer-events-auto">
          <Music size={14} className="text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
          <p className="text-[11px] font-black uppercase truncate max-w-[150px] text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">
            {video.music_name || 'Original Audio'}
          </p>
        </div>
      </div>

      {/* DRAWERS & OVERLAYS */}
      <AnimatePresence>
        {showComments && (
          <CommentDrawer 
            videoId={video.id} 
            onClose={() => setShowComments(false)} 
            user={currentUser} 
            allowComments={video.allow_comments !== false}
            onCommentCountUpdate={() => setCounts(prev => ({...prev, comments: prev.comments + 1}))} 
          />
        )}
        {showShare && <ShareDrawer video={video} onClose={() => setShowShare(false)} />}
        {showSettings && (
          <SettingsOverlay 
            video={video} 
            onClose={() => setShowSettings(false)} 
            user={currentUser} 
            onReport={() => handleReport(video.id, currentUser)} 
            onNotInterested={() => handleNotInterested(video.id, currentUser)} 
            onUpdate={() => window.location.reload()} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- UPDATED FEED COMPONENT ---

const Feed = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation(); 
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Determine targeted video ID from route param, query param, or state
  const targetVideoId = params?.id || searchParams.get('videoId') || location.state?.scrollToId || null;
  const shouldOpenComments = location.state?.openComments || searchParams.get('comments') === 'true';

  useEffect(() => {
    const stopAllMedia = () => {
      document.querySelectorAll('video').forEach(v => { v.pause(); v.muted = true; });
      document.querySelectorAll('audio').forEach(a => a.pause());
    };
    stopAllMedia();
    return () => stopAllMedia();
  }, []);

  useEffect(() => {
    const initFeed = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        const { data, error } = await supabase
          .from('videos')
          .select('*, profiles:user_id (username, avatar_url)')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // If targetVideoId is specified, sort that video to top if not immediately visible or prioritize it
        let feedList = data || [];
        if (targetVideoId && feedList.some(v => v.id === targetVideoId)) {
          const targeted = feedList.find(v => v.id === targetVideoId);
          const others = feedList.filter(v => v.id !== targetVideoId);
          feedList = [targeted, ...others];
        }

        setVideos(feedList);
      } catch (err) { console.error("Feed error:", err); } 
      finally { setLoading(false); }
    };
    
    initFeed();

    const feedChannel = supabase
      .channel('realtime-feed-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'videos' },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const integratedVideoObject = {
            ...payload.new,
            profiles: profileData || null
          };

          setVideos((currentFeed) => [integratedVideoObject, ...currentFeed]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
    };
  }, [targetVideoId]);

  useEffect(() => {
    if (!loading && videos.length > 0 && targetVideoId) {
      setTimeout(() => {
        const element = document.getElementById(`video-${targetVideoId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [loading, videos, targetVideoId]);

  if (loading) return (
    <div className="h-screen w-full bg-[#05050a] flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 className="animate-spin text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,1)]" size={54} />
      <p className="italic font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Syncing Universe...</p>
    </div>
  );

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide">
      {videos.map((vid) => (
        <VideoCard 
          key={vid.id} 
          video={vid} 
          currentUser={currentUser} 
          initialShowComments={vid.id === targetVideoId && shouldOpenComments}
        />
      ))}
    </div>
  );
};

export default Feed;
