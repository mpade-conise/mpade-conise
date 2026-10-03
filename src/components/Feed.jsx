import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  Heart, MessageCircle, Share2, Music, UserPlus, Disc, 
  Loader2, MoreHorizontal, Bookmark, X, Send,
  Download, Scissors, EyeOff, Flag, Check,
  Copy, ExternalLink, Play,
  Repeat2, Trash2 
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

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(video.video_url);
      } else {
        const input = document.createElement('textarea');
        input.value = video.video_url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  const shareExternal = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Check out this video on Mpade Universe', text: video.caption, url: video.video_url });
      } else {
        await copyToClipboard();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('External share failed:', err);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 z-[110] backdrop-blur-md" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-[#0a0a12]/95 rounded-t-[2rem] z-[111] p-6 pb-12 border-t border-cyan-500/40 shadow-[0_-10px_30px_rgba(6,182,212,0.3)]">
        <div className="w-12 h-1.5 bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 rounded-full mx-auto mb-6 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 font-black uppercase tracking-widest text-center mb-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Share Video</h3>
        <div className="flex justify-around items-center">
          <button onClick={copyToClipboard} className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 bg-black/60 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.7)] group-hover:border-cyan-400 transition-all">
              {copied ? <Check className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> : <Copy className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
            </div>
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
          
          <button onClick={shareExternal} className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 bg-black/60 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] group-hover:border-purple-400 transition-all">
              <ExternalLink className="drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </div>
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">System Share</span>
          </button>

          <button onClick={() => handleDownload(video.video_url)} className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 bg-black/60 rounded-2xl flex items-center justify-center text-pink-500 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)] group-hover:shadow-[0_0_20px_rgba(236,72,153,0.7)] group-hover:border-pink-400 transition-all">
              <Download className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            </div>
            <span className="text-[10px] text-pink-300 font-bold uppercase tracking-wider">Save Video</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

const CommentDrawer = ({ videoId, onClose, user, onCommentCountUpdate }) => {
  const COMMENT_PAGE_SIZE = 30;
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef(null);

  const fetchComments = async (offset = 0, append = false) => {
    if (append && (!hasMore || isFetchingMore)) return;
    append ? setIsFetchingMore(true) : setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('id, text, created_at, profiles:user_id(username, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .range(offset, offset + COMMENT_PAGE_SIZE - 1);
      if (error) throw error;
      const next = data || [];
      setComments(prev => append ? [...prev, ...next.filter(item => !prev.some(existing => existing.id === item.id))] : next);
      setHasMore(next.length === COMMENT_PAGE_SIZE);
    } catch (err) {
      console.error('Comment fetch failed:', err);
    } finally {
      append ? setIsFetchingMore(false) : setIsFetching(false);
    }
  };

  useEffect(() => {
    setComments([]);
    setHasMore(true);
    fetchComments(0, false);
  }, [videoId]);

  const postComment = async () => {
    if (!newComment.trim() || !user || isPosting) return;
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
        <div className="p-4 pb-10 bg-[#0d0d18] border-t border-cyan-500/20 flex gap-3 items-center">
          <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add comment..." className="flex-1 bg-black/60 border border-cyan-500/40 rounded-full px-5 py-3 text-sm text-cyan-100 placeholder-cyan-500/50 outline-none focus:border-pink-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all" />
          <button onClick={postComment} disabled={!newComment.trim() || isPosting} className="p-3 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full text-black font-bold disabled:opacity-40 shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all"><Send size={18} /></button>
        </div>
      </motion.div>
    </>
  );
};

const SettingsOverlay = ({ onClose, video, user, onReport, onNotInterested, onUpdate }) => {
  const [isProcessing, setIsProcessing] = React.useState(null);
  if (!video) return null; 
  const isOwner = user?.id === video?.user_id;

  const ActionSquare = ({ icon, label, onClick, loading }) => (
    <button 
      onClick={onClick} 
      disabled={loading}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-black/60 rounded-3xl active:scale-90 transition-all border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] hover:border-cyan-400 disabled:opacity-50"
    >
      <div className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
        {loading ? <Loader2 size={22} className="animate-spin text-pink-500" /> : (icon || '?')}
      </div>
      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-tighter drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{label}</span>
    </button>
  );

const handleDownloadAction = async () => {
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
            <ActionSquare icon={<Download size={22}/>} label="Save" onClick={handleDownloadAction} loading={isProcessing === 'downloading'} />
            <ActionSquare icon={<Share2 size={22}/>} label="Share" onClick={() => handleShare(video)} />
            <ActionSquare icon={<Repeat2 size={22}/>} label="Duet" onClick={() => alert("Soon!")} />
            <ActionSquare icon={<Scissors size={22}/>} label="Trim" onClick={() => alert("Editor opening...")} />
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

// --- VIDEO CARD COMPONENT ---

const VideoCard = ({ video, currentUser, interactionStatus, onDelete }) => {
  const [playing, setPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [playback, setPlayback] = useState({ currentTime: 0, duration: 0, buffered: 0 });

  const [counts, setCounts] = useState({ 
    likes: Number(video?.likes_count) || 0, 
    comments: Number(video?.comments_count) || 0,
    favorites: Number(video?.favorites_count) || 0
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    setIsLiked(!!interactionStatus?.liked);
    setIsFavorited(!!interactionStatus?.favorited);
    setIsFollowing(!!interactionStatus?.following);
  }, [interactionStatus]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        videoRef.current?.play().catch(() => {});
        audioRef.current?.play().catch(() => {});
        setPlaying(true);
        if (!viewRecordedRef.current) {
          viewRecordedRef.current = true;
          const viewKey = `mpade-viewed-${video.id}`;
          try {
            if (!sessionStorage.getItem(viewKey)) {
              sessionStorage.setItem(viewKey, '1');
              incrementView(video.id);
            }
          } catch {
            incrementView(video.id);
          }
        }
      } else {
        videoRef.current?.pause();
        audioRef.current?.pause();
        setPlaying(false);
      }
    }, { threshold: 0.6 });

    if (containerRef.current) observer.observe(containerRef.current);
    const media = videoRef.current;
    media?.addEventListener('timeupdate', updatePlayback);
    media?.addEventListener('loadedmetadata', updatePlayback);
    media?.addEventListener('progress', updatePlayback);
    media?.addEventListener('durationchange', updatePlayback);

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
      media?.removeEventListener('timeupdate', updatePlayback);
      media?.removeEventListener('loadedmetadata', updatePlayback);
      media?.removeEventListener('progress', updatePlayback);
      media?.removeEventListener('durationchange', updatePlayback);
      observer.disconnect();
    };
  }, [video.id]);

  const updatePlayback = () => {
    const el = videoRef.current;
    if (!el) return;
    const duration = Number.isFinite(el.duration) ? el.duration : 0;
    const currentTime = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    let buffered = 0;
    try { if (el.buffered.length && duration > 0) buffered = Math.min(100, (el.buffered.end(el.buffered.length - 1) / duration) * 100); } catch {}
    setPlayback({ currentTime, duration, buffered });
  };

  const seekVideo = (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el || !playback.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * playback.duration;
    updatePlayback();
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
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

  return (
    <div 
      ref={containerRef} 
      id={`video-${video.id}`} 
      onClick={togglePlay} 
      className="relative h-screen w-full bg-black snap-start flex items-center justify-center overflow-hidden cursor-pointer border-b border-cyan-500/10"
    >
      {video.music_url && <audio ref={audioRef} src={video.music_url} loop preload="auto" />}
      <video ref={videoRef} className="h-full w-full object-cover" src={video.video_url} loop playsInline muted={!!video.music_url} />
      <div className="absolute left-0 right-0 bottom-0 z-30 px-3 pb-2 pointer-events-none">
        <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-white/80 mb-1.5">
          <span>{formatTime(playback.currentTime)}</span><span className="ml-auto">{formatTime(playback.duration)}</span>
        </div>
        <button type="button" aria-label="Seek video" onClick={seekVideo} className="pointer-events-auto relative block w-full h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer touch-none">
          <span className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${playback.buffered}%` }} />
          <span className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-[width] duration-100" style={{ width: `${playback.duration ? Math.min(100, (playback.currentTime / playback.duration) * 100) : 0}%` }} />
          <span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] -translate-x-1/2" style={{ left: `${playback.duration ? Math.min(100, (playback.currentTime / playback.duration) * 100) : 0}%` }} />
        </button>
      </div>

      <AnimatePresence>
        {showPlayIcon && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.2, opacity: 0.8 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute z-50 pointer-events-none drop-shadow-[0_0_20px_rgba(6,182,212,0.9)]">
            <Play size={80} className="text-cyan-400 fill-cyan-400 opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

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
          <ActionButton icon={<MessageCircle size={38} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />} label={counts.comments} onClick={(e) => { e.stopPropagation(); setShowComments(true); }} />
          <ActionButton icon={<Bookmark size={38} className={isFavorited ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'} />} label={counts.favorites} onClick={onFavorite} />
          <ActionButton icon={<Share2 size={35} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />} label="Share" onClick={(e) => { e.stopPropagation(); setShowShare(true); }} />
          <MoreHorizontal size={30} onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="cursor-pointer text-cyan-400 hover:text-pink-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all" />
        </div>
        <motion.div animate={playing ? { rotate: 360 } : {}} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="mt-4 w-11 h-11 rounded-full bg-black border-[3px] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center text-pink-500"><Disc size={20} className="drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" /></motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none text-white z-10">
        <h3 className="font-black text-lg mb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]">@{video.profiles?.username || 'user'}</h3>
        <p className="text-sm mb-4 line-clamp-2 max-w-[80%] text-cyan-100 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">{video.caption}</p>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
          <Music size={14} className="text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]" />
          <p className="text-[11px] font-black uppercase truncate max-w-[150px] text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">{video.music_name || 'Original Audio'}</p>
        </div>
      </div>

      <AnimatePresence>
        {showComments && <CommentDrawer videoId={video.id} onClose={() => setShowComments(false)} user={currentUser} onCommentCountUpdate={() => setCounts(prev => ({...prev, comments: prev.comments + 1}))} />}
        {showShare && <ShareDrawer video={video} onClose={() => setShowShare(false)} />}
        {showSettings && <SettingsOverlay video={video} onClose={() => setShowSettings(false)} user={currentUser} onReport={() => handleReport(video.id, currentUser)} onNotInterested={() => handleNotInterested(video.id, currentUser)} onUpdate={() => onDelete?.(video.id)} />}
      </AnimatePresence>
    </div>
  );
};

// --- UPDATED FEED COMPONENT ---

const Feed = () => {
  const PAGE_SIZE = 8;
  const VIDEO_COLUMNS = 'id, user_id, video_url, caption, music_url, music_name, created_at, likes_count, comments_count, favorites_count, profiles:user_id (username, avatar_url)';
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [interactionStatus, setInteractionStatus] = useState({});
  const location = useLocation();
  const loadMoreRef = useRef(null);
  const feedRequestRef = useRef(0); 

  useEffect(() => {
    const stopAllMedia = () => {
      document.querySelectorAll('video').forEach(v => { v.pause(); v.muted = true; });
      document.querySelectorAll('audio').forEach(a => a.pause());
    };
    stopAllMedia();
    return () => stopAllMedia();
  }, []);

  const fetchVideoPage = async (page, replace = false) => {
    const requestId = ++feedRequestRef.current;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data, error } = await supabase
        .from('videos')
        .select(VIDEO_COLUMNS)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (requestId !== feedRequestRef.current) return;
      if (error) throw error;

      const nextVideos = data || [];
      setVideos(current => {
        if (replace) return nextVideos;
        const existingIds = new Set(current.map(video => video.id));
        return [...current, ...nextVideos.filter(video => !existingIds.has(video.id))];
      });
      setHasMore(nextVideos.length === PAGE_SIZE);
    } catch (err) {
      if (requestId === feedRequestRef.current) console.error("Feed error:", err);
    } finally {
      if (requestId === feedRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const initFeed = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (active) setCurrentUser(user);
        await fetchVideoPage(0, true);
      } catch (err) {
        if (active) {
          console.error("Feed error:", err);
          setLoading(false);
        }
      }
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
            .maybeSingle();

          const integratedVideoObject = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            video_url: payload.new.video_url,
            caption: payload.new.caption,
            music_url: payload.new.music_url,
            music_name: payload.new.music_name,
            created_at: payload.new.created_at,
            likes_count: payload.new.likes_count,
            comments_count: payload.new.comments_count,
            favorites_count: payload.new.favorites_count,
            profiles: profileData || null
          };

          setVideos(currentFeed => {
            if (currentFeed.some(video => video.id === integratedVideoObject.id)) return currentFeed;
            return [integratedVideoObject, ...currentFeed];
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, payload => {
        setVideos(current => current.map(video => video.id === payload.new.id ? { ...video, ...payload.new } : video));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'videos' }, payload => {
        setVideos(current => current.filter(video => video.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(feedChannel);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !videos.length) return;
    const videoIds = videos.map(video => video.id);
    const authorIds = [...new Set(videos.map(video => video.user_id).filter(Boolean))];
    let active = true;
    const loadInteractionStatus = async () => {
      const [likes, favorites, follows] = await Promise.all([
        supabase.from('video_likes').select('video_id').eq('user_id', currentUser.id).in('video_id', videoIds),
        supabase.from('favorites').select('video_id').eq('user_id', currentUser.id).in('video_id', videoIds),
        authorIds.length ? supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).in('following_id', authorIds) : Promise.resolve({ data: [] })
      ]);
      if (!active) return;
      const next = {};
      videoIds.forEach(id => { next[id] = { liked: false, favorited: false, following: false }; });
      (likes.data || []).forEach(row => { if (next[row.video_id]) next[row.video_id].liked = true; });
      (favorites.data || []).forEach(row => { if (next[row.video_id]) next[row.video_id].favorited = true; });
      (follows.data || []).forEach(row => videos.filter(video => video.user_id === row.following_id).forEach(video => { if (next[video.id]) next[video.id].following = true; }));
      setInteractionStatus(next);
    };
    loadInteractionStatus();
    return () => { active = false; };
  }, [currentUser, videos]);

  useEffect(() => {
    const container = loadMoreRef.current;
    if (!container || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchVideoPage(Math.floor(videos.length / PAGE_SIZE), false);
      }
    }, { rootMargin: '1200px 0px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, [videos.length, loading, loadingMore, hasMore]);

  useEffect(() => {
    if (!loading && videos.length > 0 && location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`video-${targetId}`);
        if (element) element.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 100);
    }
  }, [loading, videos, location]);

  if (loading) return (
    <div className="h-screen w-full bg-[#05050a] flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 className="animate-spin text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,1)]" size={54} />
      <p className="italic font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">Syncing Universe...</p>
    </div>
  );

  const removeVideo = (videoId) => {
    setVideos(current => current.filter(video => video.id !== videoId));
    setInteractionStatus(current => {
      const next = { ...current };
      delete next[videoId];
      return next;
    });
  };

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide">
      {videos.map((vid) => (
        <VideoCard key={vid.id} video={vid} currentUser={currentUser} interactionStatus={interactionStatus[vid.id]} onDelete={removeVideo} />
      ))}
      <div ref={loadMoreRef} className="h-24 w-full flex items-center justify-center snap-end">
        {loadingMore && <Loader2 className="animate-spin text-cyan-400" size={28} />}
        {!hasMore && videos.length > 0 && <span className="text-[10px] uppercase tracking-widest text-zinc-500">You've reached the end</span>}
      </div>
    </div>
  );
};

export default Feed;
