import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Link } from 'react-router-dom';
import { 
  Heart, MessageCircle, Share2, Music, UserPlus, Disc, 
  Loader2, MoreHorizontal, Bookmark, X, Send,
  Download, HeartOff, Scissors, Users, Captions, EyeOff, Flag, Check,
  MessageSquare, Copy, ExternalLink, Play,
  Repeat2, Trash2, ShieldAlert // Added these three for the settings logic
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'react-router-dom'; // Added for redirection logic
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

// --- SUB-COMPONENTS (PRESERVED) ---

const ActionButton = ({ icon, label, onClick }) => {
  const numericLabel = Number(label);
  const safeLabel = isNaN(numericLabel) ? 0 : Math.max(0, numericLabel);

  return (
    <div className="flex flex-col items-center group">
      <motion.button 
        whileTap={{ scale: 0.6 }} 
        onClick={onClick} 
        className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] active:brightness-125 transition-all"
      >
        {icon}
      </motion.button>
      <motion.span 
        key={safeLabel}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[11px] font-black mt-1 text-white shadow-sm select-none tracking-tight"
      >
        {safeLabel.toLocaleString()}
      </motion.span>
    </div>
  );
};

const ShareDrawer = ({ video, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(video.video_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareExternal = async () => {
    try {
      await navigator.share({
        title: 'Check out this video on Mpade Universe',
        text: video.caption,
        url: video.video_url,
      });
    } catch (err) {
      console.log('External share failed or cancelled');
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 z-[110] backdrop-blur-[2px]" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-[2rem] z-[111] p-6 pb-12 border-t border-white/10">
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6" />
        <h3 className="text-white font-black uppercase tracking-widest text-center mb-8">Share Video</h3>
        <div className="flex justify-around items-center">
          <button onClick={copyToClipboard} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-cyan-400 border border-white/5">
              {copied ? <Check className="text-green-400" /> : <Copy />}
            </div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
          
          <button onClick={shareExternal} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 border border-white/5">
              <ExternalLink />
            </div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">System Share</span>
          </button>

          <button onClick={() => handleDownload(video.video_url)} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-pink-500 border border-white/5">
              <Download />
            </div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Save Video</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

const CommentDrawer = ({ videoId, onClose, user }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchComments = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('video_comments')
        .select('id, text, created_at, profiles:user_id(username, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (!error) setComments(data || []);
      setIsFetching(false);
    };
    fetchComments();
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
        // 1. Update the local comments list (Instant visibility)
        setComments(prev => [data, ...prev]); 
        
        // 2. Clear the input field
        setNewComment(""); 

        // 3. Update the visual count on the VideoCard immediately
        if (onCommentCountUpdate) {
          onCommentCountUpdate();
        }
      }
    } catch (err) {
      // Direct peer tip: If you still see this error, run the SQL 'DROP TRIGGER' 
      // command we discussed to remove the 'follower_id' conflict.
      console.error("Comment post failed. Check Supabase triggers for column errors:", err.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 z-[100] backdrop-blur-[2px]" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-[#121212] h-[75vh] rounded-t-[2rem] z-[101] flex flex-col border-t border-white/10 shadow-2xl">
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />
        <div className="p-4 flex justify-between items-center border-b border-white/5 text-white">
          <span className="text-sm font-black uppercase tracking-tighter">{comments.length} Comments</span>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400"><X size={18} /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5">
          {isFetching ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin text-cyan-500 mb-2" size={30} />
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3 text-white">
                <img src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`} className="w-10 h-10 rounded-full bg-zinc-800 border border-white/5 object-cover" alt="" />
                <div className="flex-1 bg-white/5 p-3 rounded-2xl rounded-tl-none">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] font-black text-cyan-400">@{c.profiles?.username || 'user'}</p>
                    <p className="text-[9px] text-zinc-500">{c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ''}</p>
                  </div>
                  <p className="text-[13px] text-zinc-200 leading-snug">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 pb-10 bg-zinc-900 border-t border-white/5 flex gap-3 items-center">
          <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add comment..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white outline-none" />
          <button onClick={postComment} disabled={!newComment.trim() || isPosting} className="p-3 bg-cyan-500 rounded-full text-black disabled:bg-zinc-800"><Send size={18} /></button>
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
      className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 rounded-3xl active:scale-90 transition-all border border-white/5 disabled:opacity-50"
    >
      <div className="text-white">
        {loading ? (
          typeof Loader2 !== 'undefined' ? <Loader2 size={22} className="animate-spin text-red-500" /> : '...'
        ) : (
          icon || '?'
        )}
      </div>
      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">{label}</span>
    </button>
  );

// Move these outside the function or use a ref to avoid reloading FFmpeg every time
const ffmpeg = new FFmpeg();

const handleDownloadAction = async () => {
  if (!video.video_url) return alert("Video source not found.");
  
  setIsProcessing('processing'); 
  
  try {
    // 1. Load FFmpeg with the essential workerURL to prevent file corruption
    if (!ffmpeg.loaded) {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        // workerURL is critical for stable multi-threaded processing in the browser
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
    }

    // 2. Fetch and write files to virtual memory
    // Note: ensure video.music_url is the correct field from your database
    const videoData = await fetchFile(video.video_url);
    const audioData = await fetchFile(video.music_url || '/sounds/default_audio.mp3');

    await ffmpeg.writeFile('input_video.mp4', videoData);
    await ffmpeg.writeFile('input_audio.mp3', audioData);

    // 3. Execute the merge command with standard MP3 encoding for maximum compatibility
    await ffmpeg.exec([
      '-i', 'input_video.mp4',
      '-i', 'input_audio.mp3',
      '-c:v', 'copy',      // Keep original video quality
      '-c:a', 'libmp3lame', // Use MP3 codec to fix Windows Media Player "unsupported" errors
      '-map', '0:v:0',     
      '-map', '1:a:0',     
      '-shortest',         
      'output.mp4'
    ]);

    // 4. Generate the Blob and trigger the download
    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Mpade_Universe_${video.id || 'video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("FFmpeg Processing Error:", err);
    alert("Video processing failed. Please ensure you are using a modern browser.");
  } finally {
    setIsProcessing(null);
  }
};
  const handleShareAction = async () => {
    const url = `${window.location.origin}/video/${video.id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Mpade Universe', url }); } catch {}
    } else {
      navigator.clipboard?.writeText(url);
      alert("Link copied!");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this video?")) return;
    setIsProcessing('deleting');
    try {
      const { error } = await supabase.from('videos').delete().eq('id', video.id);
      if (error) throw error;
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 z-[100] backdrop-blur-[2px]" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-[2rem] pb-10 z-[101] border-t border-white/10">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-6" />
        
        <div className="px-6 flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <ActionSquare icon={typeof Download !== 'undefined' ? <Download size={22}/> : null} label="Save" onClick={handleDownloadAction} loading={isProcessing === 'downloading'} />
            <ActionSquare icon={typeof Share2 !== 'undefined' ? <Share2 size={22}/> : null} label="Share" onClick={handleShareAction} />
            <ActionSquare icon={typeof Repeat2 !== 'undefined' ? <Repeat2 size={22}/> : null} label="Duet" onClick={() => alert("Soon!")} />
            <ActionSquare icon={typeof Scissors !== 'undefined' ? <Scissors size={22}/> : null} label="Trim" onClick={() => alert("Editor opening...")} />
          </div>

          <button onClick={() => { onNotInterested?.(video.id); onClose(); }} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl text-white">
            {typeof EyeOff !== 'undefined' && <EyeOff size={20} />} <span className="font-semibold text-sm">Not Interested</span>
          </button>
          
          <button onClick={() => { onReport?.(video.id); onClose(); }} className="flex items-center gap-4 p-4 bg-red-500/10 rounded-2xl text-red-500">
            {typeof Flag !== 'undefined' && <Flag size={20} />} <span className="font-semibold text-sm">Report</span>
          </button>

          {isOwner && (
            <button onClick={handleDelete} disabled={isProcessing === 'deleting'} className="flex items-center gap-4 p-4 bg-zinc-800 border border-red-500/20 rounded-2xl text-red-500 mt-2">
              {isProcessing === 'deleting' ? 'Deleting...' : (typeof Trash2 !== 'undefined' && <Trash2 size={20} />)}
              <span className="font-semibold text-sm ml-2">Delete Video</span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

const VideoCard = ({ video, currentUser }) => {
  const [playing, setPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const [counts, setCounts] = useState({ 
    likes: Number(video?.likes_count) || 0, 
    comments: Number(video?.comments_count) || 0,
    favorites: Number(video?.favorites_count) || 0
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);

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
      if (entry.isIntersecting) {
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
    return () => observer.disconnect();
  }, [video.id]);

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
    } catch (err) {
      console.error("Like operation failed. Check Supabase 'video_likes' trigger for incorrect 'follower_id' column usage.");
    }
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
      className="relative h-screen w-full bg-black snap-start flex items-center justify-center overflow-hidden cursor-pointer"
    >
      {video.music_url && <audio ref={audioRef} src={video.music_url} loop preload="auto" />}
      <video ref={videoRef} className="h-full w-full object-cover" src={video.video_url} loop playsInline muted={!!video.music_url} />

      <AnimatePresence>
        {showPlayIcon && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.8 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute z-50 pointer-events-none"
          >
            <Play size={80} className="text-white fill-white opacity-40" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-20 text-white">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800">
            <Link 
              to={video?.user_id ? `/profile/${video.user_id}` : '#'} 
              onClick={(e) => {
                if (!video?.user_id) {
                  e.preventDefault();
                }
              }}
              className="block w-full h-full overflow-hidden rounded-full cursor-pointer active:scale-90 transition-transform"
            >
              <img 
                src={video.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.user_id}`} 
                className="w-full h-full object-cover" 
                alt="User Profile" 
              />
            </Link>
          </div>
          {!isFollowing && currentUser?.id !== video.user_id && (
            <button onClick={(e) => { e.stopPropagation(); setIsFollowing(true); handleFollow(e, video.user_id, false, currentUser); }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#ff0050] rounded-full p-1 border-2 border-black">
              <UserPlus size={12} strokeWidth={4} />
            </button>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5 items-center">
          <ActionButton icon={<Heart size={38} className={isLiked ? 'fill-[#ff0050] text-[#ff0050]' : 'text-white'} />} label={counts.likes} onClick={onLike} />
          <ActionButton icon={<MessageCircle size={38} />} label={counts.comments} onClick={(e) => { e.stopPropagation(); setShowComments(true); }} />
          <ActionButton icon={<Bookmark size={38} className={isFavorited ? 'fill-[#face15] text-[#face15]' : 'text-white'} />} label={counts.favorites} onClick={onFavorite} />
          <ActionButton icon={<Share2 size={35} />} label="Share" onClick={(e) => { e.stopPropagation(); setShowShare(true); }} />
          <MoreHorizontal size={30} onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="cursor-pointer opacity-70" />
        </div>
        
        <motion.div animate={playing ? { rotate: 360 } : {}} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="mt-4 w-11 h-11 rounded-full bg-zinc-800 border-[6px] border-zinc-700 flex items-center justify-center shadow-lg"><Disc size={20} /></motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black/90 to-transparent pointer-events-none text-white z-10">
        <h3 className="font-black text-lg mb-1 drop-shadow-lg">@{video.profiles?.username || 'user'}</h3>
        <p className="text-sm mb-4 line-clamp-2 max-w-[80%] drop-shadow-md">{video.caption}</p>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-white/5">
          <Music size={14} className="text-cyan-400" />
          <p className="text-[11px] font-black uppercase truncate max-w-[150px]">{video.music_name || 'Original Audio'}</p>
        </div>
      </div>

      <AnimatePresence>
        {showComments && <CommentDrawer videoId={video.id} onClose={() => setShowComments(false)} user={currentUser} />}
        {showShare && <ShareDrawer video={video} onClose={() => setShowShare(false)} />}
        {showSettings && <SettingsOverlay video={video} onClose={() => setShowSettings(false)} user={currentUser} onReport={() => handleReport(video.id, currentUser)} onNotInterested={() => handleNotInterested(video.id, currentUser)} />}
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

  useEffect(() => {
    const initFeed = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        const { data, error } = await supabase
          .from('videos')
          .select('*, likes_count, comments_count, favorites_count, profiles:user_id (username, avatar_url)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setVideos(data || []);
      } catch (err) { console.error("Feed Initialization Error:", err); } 
      finally { setLoading(false); }
    };
    initFeed();
  }, []);

  useEffect(() => {
    if (!loading && videos.length > 0 && location.state?.scrollToId) {
      const targetId = location.state.scrollToId;
      setTimeout(() => {
        const element = document.getElementById(`video-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
    }
  }, [loading, videos, location]);

  if (loading) return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 className="animate-spin text-cyan-500" size={48} />
      <p className="italic font-black tracking-widest uppercase">Syncing Universe...</p>
    </div>
  );

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide">
      {videos.map((vid) => (
        <VideoCard key={vid.id} video={vid} currentUser={currentUser} />
      ))}
    </div>
  );
};

export default Feed;
