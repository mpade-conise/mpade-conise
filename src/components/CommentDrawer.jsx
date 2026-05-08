import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatDistanceToNow } from 'date-fns'; // Optional: npm install date-fns

const CommentDrawer = ({ videoId, onClose, user }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const scrollRef = useRef(null);

  // 1. Fetch Comments & Setup Realtime Subscription
  useEffect(() => {
    const fetchComments = async () => {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('video_comments')
        .select('id, text, created_at, profiles(username, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (!error) setComments(data || []);
      setIsFetching(false);
    };

    fetchComments();

    // REALTIME: Listen for new comments on this specific video
    const channel = supabase
      .channel(`comments-${videoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'video_comments',
        filter: `video_id=eq.${videoId}`
      }, async (payload) => {
        // Fetch the profile for the new comment since payload only has user_id
        const { data: newWithProfile } = await supabase
          .from('video_comments')
          .select('*, profiles(username, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        
        if (newWithProfile) {
          setComments(prev => [newWithProfile, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  // 2. Post Comment Logic
  const postComment = async () => {
    if (!newComment.trim() || !user || isPosting) return;
    
    setIsPosting(true);
    const textToSend = newComment;
    setNewComment(""); 

    const { error } = await supabase
      .from('video_comments')
      .insert({ 
        video_id: videoId, 
        user_id: user.id, 
        text: textToSend 
      });

    if (error) {
      setNewComment(textToSend);
      alert("Error posting comment");
    } else {
      // Smooth scroll to top to see the new comment
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsPosting(false);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 z-[100] backdrop-blur-[2px]" 
      />

      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-[#121212] h-[75vh] rounded-t-[2rem] z-[101] flex flex-col shadow-2xl border-t border-white/10"
      >
        {/* Header Handle */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-4 flex justify-between items-center border-b border-white/5">
          <span className="text-sm font-black text-white uppercase tracking-tighter">
            {comments.length} Comments
          </span>
          <button onClick={onClose} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {isFetching ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
              <Loader2 className="animate-spin text-cyan-500" size={30} />
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase">Syncing</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <MessageSquare size={40} className="mb-2 opacity-20" />
              <p className="text-sm italic">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((c) => (
              <motion.div 
                layout 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                key={c.id} 
                className="flex gap-3"
              >
                <img 
                  src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`} 
                  className="w-10 h-10 rounded-full bg-zinc-800 border border-white/5 object-cover shadow-lg" 
                  alt="" 
                />
                <div className="flex-1 bg-white/5 p-3 rounded-2xl rounded-tl-none">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] font-black text-cyan-400">@{c.profiles?.username || 'user'}</p>
                    <p className="text-[9px] text-zinc-500">
                      {formatDistanceToNow(new Date(c.created_at))} ago
                    </p>
                  </div>
                  <p className="text-[13px] text-zinc-200 leading-snug">{c.text}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Improved Input Area */}
        <div className="p-4 pb-10 bg-zinc-900/90 border-t border-white/5 flex gap-2 items-end">
          <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-1 flex items-end">
            <textarea 
              rows={1}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..." 
              className="flex-1 bg-transparent border-none px-4 py-3 text-sm text-white focus:ring-0 resize-none max-h-32"
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  postComment();
                }
              }}
            />
            <button 
              onClick={postComment}
              disabled={!newComment.trim() || isPosting}
              className={`mb-1 mr-1 p-2.5 rounded-xl transition-all ${
                newComment.trim() ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-600'
              }`}
            >
              {isPosting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CommentDrawer;