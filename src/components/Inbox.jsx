import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, UserPlus, Heart, Send, Plus, Loader2, Search, Users, X, Play, Bell, ArrowLeft, Check 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Inbox = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [liveStreams, setLiveStreams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowerPanelOpen, setIsFollowerPanelOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);

  const channelRef = useRef(null);

  const fetchData = useCallback(async (uid) => {
    try {
      const [streamsRes, activitiesRes, messagesRes] = await Promise.all([
        supabase.from('live_streams').select('*, profiles:host_id(avatar_url, username)').eq('status', 'live'),
        supabase.from('activities')
          .select(`
            *, 
            actor:profiles!actor_id(id, avatar_url, username), 
            videos:video_id(id, thumbnail_url, video_url)
          `)
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        supabase.from('messages')
          .select('*, profiles:sender_id(avatar_url, username)')
          .or(`receiver_id.eq.${uid},sender_id.eq.${uid}`)
          .order('updated_at', { ascending: false })
      ]);

      if (streamsRes.data) setLiveStreams(streamsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
      
      if (messagesRes.data) {
        const uniqueThreads = [];
        const seenIds = new Set();
        messagesRes.data.forEach(m => {
          const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
          if (!seenIds.has(otherId)) {
            seenIds.add(otherId);
            uniqueThreads.push(m);
          }
        });
        setMessages(uniqueThreads);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFollowBack = async (targetId) => {
  if (!currentUserId) return;

  try {
    // .upsert handles the "Conflict" by ignoring duplicates automatically
    // provided you have a unique constraint on these two columns
    const { error } = await supabase
      .from('follows')
      .upsert(
        { 
          follower_id: currentUserId, 
          following_id: targetId 
        }, 
        { onConflict: 'follower_id,following_id' }
      );

    if (error) {
      console.error("Error following user:", error.message);
      return;
    }

    // Refresh UI to show the new state
    await fetchData(currentUserId);
    
  } catch (err) {
    console.error("Follow operation failed:", err);
  }
};

  /**
   * FIX: Optimistic UI Update
   * We update the local state 'is_read' immediately.
   * This prevents the infinite loop caused by calling fetchData() 
   * which would trigger a re-render and re-fetch.
   */
  const markAsRead = async (typeGroup) => {
    if (!currentUserId) return;

    // 1. Update local UI state immediately
    setActivities(prev => prev.map(act => {
        if (typeGroup === 'follow' && act.type === 'follow') return { ...act, is_read: true };
        if (typeGroup === 'activity' && act.type !== 'follow') return { ...act, is_read: true };
        return act;
    }));

    // 2. Perform database update silently
    const query = supabase
      .from('activities')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('is_read', false);

    if (typeGroup === 'follow') {
      await query.eq('type', 'follow');
    } else {
      await query.neq('type', 'follow');
    }
    // No fetchData() call here to avoid loop!
  };

  useEffect(() => {
    let mounted = true;
    const initInbox = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      
      setCurrentUserId(user.id);
      await fetchData(user.id);
      
      // Real-time listener
      const channel = supabase.channel(`inbox-realtime-${user.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', // Only fetch on NEW items to prevent update loops
            schema: 'public', 
            table: 'activities', 
            filter: `user_id=eq.${user.id}` 
        }, () => fetchData(user.id))
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'messages', 
            filter: `receiver_id=eq.${user.id}` 
        }, () => fetchData(user.id))
        .subscribe();
      channelRef.current = channel;
    };

    initInbox();
    return () => { 
      mounted = false; 
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
    };
  }, [fetchData]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'comment': return <MessageCircle size={12} fill="currentColor" />;
      case 'like': return <Heart size={12} fill="currentColor" />;
      default: return <Bell size={12} fill="currentColor" />;
    }
  };

  const ActivityDrawer = ({ isOpen, onClose, title, data }) => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0a0a0c] border-l border-white/5 z-[101] flex flex-col shadow-2xl"
          >
            <div className="p-4 flex items-center gap-4 border-b border-white/5 bg-black/40">
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-lg font-black uppercase tracking-tight italic">{title}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
              {data.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {item.actor?.avatar_url ? (
                        <img 
                          src={item.actor.avatar_url} 
                          crossOrigin="anonymous" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border border-white/10" 
                          alt="" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-zinc-500 uppercase font-black text-xs">
                          {item.actor?.username?.substring(0,2) || '??'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/10 text-[#00f2ea]">
                        {getActivityIcon(item.type)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold">@{item.actor?.username || 'user'}</p>
                      <p className="text-[12px] text-zinc-500">
                        {item.type === 'follow' ? 'started following you' : 
                         item.type === 'like' ? 'liked your video' : 'commented on your video'}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">
                        {formatDistanceToNow(new Date(item.created_at))} ago
                      </p>
                    </div>
                  </div>
                  
                  {item.type === 'follow' ? (
                    <button 
                      onClick={() => handleFollowBack(item.actor_id)}
                      className="bg-[#fe2c55] text-white text-[12px] font-black px-4 py-2 rounded-lg"
                    >
                      Follow Back
                    </button>
                  ) : item.video_id && (
                    <div onClick={() => navigate(`/video/${item.video_id}`)} className="w-12 h-16 rounded-lg bg-zinc-800 relative overflow-hidden border border-white/5 cursor-pointer">
                      {item.videos?.thumbnail_url && (
                        <img src={item.videos.thumbnail_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const unreadFollowers = activities.filter(a => a.type === 'follow' && !a.is_read);
  const unreadActivities = activities.filter(a => a.type !== 'follow' && !a.is_read);
  const followers = activities.filter(a => a.type === 'follow');
  const nonFollowActivities = activities.filter(a => a.type !== 'follow');

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0c]"><Loader2 className="animate-spin text-[#00f2ea]" /></div>;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-white overflow-hidden font-sans">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
        <Users size={24} className="text-[#00f2ea]" />
        <h1 className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ea] to-[#fe2c55]">Inbox</h1>
        <Search size={24} className="text-[#fe2c55]" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex gap-4 px-4 py-6 overflow-x-auto no-scrollbar border-b border-white/5">
          {liveStreams.map((live) => (
            <div key={live.id} onClick={() => navigate(`/watch-live/${live.id}`)} className="flex flex-col items-center min-w-[72px] cursor-pointer">
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#00f2ea] to-[#fe2c55]">
                <img src={live.profiles?.avatar_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-[58px] h-[58px] rounded-full object-cover" alt="" />
              </div>
              <span className="text-[11px] font-bold mt-2 truncate w-16 text-center">@{live.profiles?.username}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 space-y-2">
          <div onClick={() => { setIsFollowerPanelOpen(true); markAsRead('follow'); }} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center"><UserPlus size={22} /></div>
              <p className="text-[14px] font-bold">New followers</p>
            </div>
            {unreadFollowers.length > 0 && <div className="bg-blue-500 px-2 py-1 rounded-md text-[10px] font-black">{unreadFollowers.length}</div>}
          </div>

          <div onClick={() => { setIsActivityPanelOpen(true); markAsRead('activity'); }} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#fe2c55]/20 text-[#fe2c55] rounded-full flex items-center justify-center"><Heart size={22} fill="currentColor" /></div>
              <p className="text-[14px] font-bold">Activity</p>
            </div>
            {unreadActivities.length > 0 && <div className="bg-[#fe2c55] px-2 py-1 rounded-md text-[10px] font-black">{unreadActivities.length}</div>}
          </div>
        </div>

        <div className="mt-4 px-2 pb-24">
          <h3 className="px-4 mb-2 text-[11px] font-black text-zinc-500 uppercase">Direct Messages</h3>
          {messages.map((msg) => (
             <div key={msg.id} onClick={() => navigate(`/messaging?userId=${msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id}`)} className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-white/5 cursor-pointer">
                <img src={msg.profiles?.avatar_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover border border-white/10" alt="" />
                <div className="flex-1">
                  <p className="text-[15px] font-bold">{msg.profiles?.username}</p>
                  <p className="text-[13px] text-zinc-500 truncate">{msg.content}</p>
                </div>
             </div>
          ))}
        </div>
      </div>

      <ActivityDrawer isOpen={isFollowerPanelOpen} onClose={() => setIsFollowerPanelOpen(false)} title="Followers" data={followers} />
      <ActivityDrawer isOpen={isActivityPanelOpen} onClose={() => setIsActivityPanelOpen(false)} title="Activity" data={nonFollowActivities} />
    </div>
  );
};

export default Inbox;
