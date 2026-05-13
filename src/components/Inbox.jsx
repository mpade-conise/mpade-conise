import React, { useState, useEffect, useRef } from 'react';
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

  const handleFollowBack = async (targetId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: user.id, following_id: targetId }]);
    
    if (!error) fetchData(user.id);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'comment': return <MessageCircle size={12} fill="currentColor" />;
      case 'like': return <Heart size={12} fill="currentColor" />;
      default: return <Bell size={12} fill="currentColor" />;
    }
  };

  const markAsRead = async (typeGroup) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const query = supabase
      .from('activities')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (typeGroup === 'follow') {
      await query.eq('type', 'follow');
    } else {
      await query.neq('type', 'follow');
    }
    
    fetchData(user.id);
  };

  const fetchData = async (uid) => {
    try {
      const [streamsRes, activitiesRes, messagesRes] = await Promise.all([
        supabase.from('live_streams').select('*, profiles:host_id(avatar_url, username)').eq('status', 'live'),
        supabase.from('activities')
          .select(`
            *, 
            actor:profiles!actor_id(id, avatar_url, username), 
            videos!video_id(id, thumbnail_url, video_url)
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
  };

  useEffect(() => {
    let mounted = true;
    const initInbox = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      
      setCurrentUserId(user.id);
      await fetchData(user.id);
      
      const channel = supabase.channel(`inbox-realtime-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${user.id}` }, () => fetchData(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchData(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, () => fetchData(user.id))
        .subscribe();
      channelRef.current = channel;
    };

    initInbox();
    return () => { mounted = false; if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const openMessagingPage = (msg) => {
    const targetId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
    navigate(`/messaging?userId=${targetId}`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0a0c]"><Loader2 className="animate-spin text-[#00f2ea] drop-shadow-[0_0_8px_#00f2ea]" /></div>;

  const unreadFollowers = activities.filter(a => a.type === 'follow' && !a.is_read);
  const unreadActivities = activities.filter(a => a.type !== 'follow' && !a.is_read);
  const followers = activities.filter(a => a.type === 'follow');
  const nonFollowActivities = activities.filter(a => a.type !== 'follow');

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
                      {/* Added crossOrigin="anonymous" */}
                      <img 
                        src={item.actor?.avatar_url} 
                        crossOrigin="anonymous" 
                        className="w-12 h-12 rounded-full object-cover border border-white/10" 
                        alt="" 
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/10 text-[#00f2ea]">
                        {getActivityIcon(item.type)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold">@{item.actor?.username}</p>
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
                      className="bg-[#fe2c55] text-white text-[12px] font-black px-4 py-2 rounded-lg shadow-[0_4px_10px_rgba(254,44,85,0.3)] hover:scale-105 active:scale-95 transition-all"
                    >
                      Follow Back
                    </button>
                  ) : item.video_id && (
                    <div onClick={() => navigate(`/video/${item.video_id}`)} className="w-12 h-16 rounded-lg bg-zinc-800 relative overflow-hidden group cursor-pointer border border-white/5">
                      {/* Added crossOrigin="anonymous" */}
                      <img 
                        src={item.videos?.thumbnail_url} 
                        crossOrigin="anonymous" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                        alt="" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play size={16} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
                  <Bell size={48} />
                  <p className="font-bold uppercase tracking-widest text-[11px]">Nothing to show</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-white overflow-hidden font-sans">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
        <Users size={24} className="text-[#00f2ea] drop-shadow-[0_0_5px_#00f2ea]" />
        <h1 className="text-xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ea] via-white to-[#fe2c55]">Inbox</h1>
        <Search size={24} className="text-[#fe2c55] drop-shadow-[0_0_5px_#fe2c55]" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex gap-4 px-4 py-6 overflow-x-auto no-scrollbar border-b border-white/5">
           <div className="flex flex-col items-center min-w-[72px]">
            <div className="w-[66px] h-[66px] rounded-full border border-dashed border-zinc-700 flex items-center justify-center bg-zinc-900/50 hover:border-[#00f2ea] transition-colors group">
              <Plus size={24} className="text-zinc-500 group-hover:text-[#00f2ea]" />
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-widest">Create</span>
          </div>

          {liveStreams.map((live) => (
            <div key={live.id} onClick={() => navigate(`/watch-live/${live.id}`)} className="flex flex-col items-center min-w-[72px] cursor-pointer">
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#00f2ea] via-[#fe2c55] to-[#FFD700] animate-pulse">
                <div className="bg-[#0a0a0c] p-[2px] rounded-full">
                  {/* Added crossOrigin="anonymous" */}
                  <img 
                    src={live.profiles?.avatar_url} 
                    crossOrigin="anonymous" 
                    className="w-[58px] h-[58px] rounded-full object-cover border border-white/10" 
                    alt="" 
                  />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#fe2c55] border border-black rounded-sm px-1.5 text-[8px] text-white font-black">LIVE</div>
              </div>
              <span className="text-[11px] font-bold mt-2 truncate w-16 text-center text-zinc-300">@{live.profiles?.username}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 space-y-2 mt-2">
          <div onClick={() => { setIsFollowerPanelOpen(true); markAsRead('follow'); }} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"><UserPlus size={22} /></div>
              <div>
                <p className="text-[14px] font-bold">New followers</p>
                <p className="text-[12px] text-zinc-500">{followers.length > 0 ? `${followers[0].actor?.username} & others` : 'No new followers'}</p>
              </div>
            </div>
            {unreadFollowers.length > 0 && <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-md">{unreadFollowers.length}</div>}
          </div>

          <div onClick={() => { setIsActivityPanelOpen(true); markAsRead('activity'); }} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 active:scale-[0.98] transition-transform cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#fe2c55]/20 border border-[#fe2c55]/50 rounded-full flex items-center justify-center text-[#fe2c55] shadow-[0_0_15px_rgba(254,44,85,0.3)]"><Heart size={22} fill="currentColor" /></div>
              <div>
                <p className="text-[14px] font-bold">Activity</p>
                <p className="text-[12px] text-zinc-500">Likes and comments</p>
              </div>
            </div>
            {unreadActivities.length > 0 && <div className="bg-[#fe2c55] text-white text-[10px] font-black px-2 py-1 rounded-md">{unreadActivities.length}</div>}
          </div>
        </div>

        <div className="mt-4 px-2 pb-24">
          <h3 className="px-4 mb-2 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Direct Messages</h3>
          {messages.map((msg) => (
             <div key={msg.id} onClick={() => openMessagingPage(msg)} className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors group">
                <div className="relative">
                  {/* Added crossOrigin="anonymous" */}
                  <img 
                    src={msg.profiles?.avatar_url} 
                    crossOrigin="anonymous" 
                    className="w-14 h-14 rounded-full object-cover border border-white/10" 
                    alt="" 
                  />
                  {msg.unread && <div className="absolute top-0 right-0 w-3 h-3 bg-[#00f2ea] rounded-full border-2 border-[#0a0a0c] shadow-[0_0_8px_#00f2ea]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-zinc-100 group-hover:text-[#00f2ea] transition-colors">{msg.profiles?.username}</p>
                  <p className={`text-[13px] truncate ${msg.unread ? 'text-white font-medium' : 'text-zinc-500'}`}>{msg.content}</p>
                </div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase">
                  {formatDistanceToNow(new Date(msg.updated_at), { addSuffix: false })}
                </p>
             </div>
          ))}
        </div>
      </div>

      <ActivityDrawer 
        isOpen={isFollowerPanelOpen} 
        onClose={() => setIsFollowerPanelOpen(false)} 
        title="Followers" 
        data={followers} 
      />
      <ActivityDrawer 
        isOpen={isActivityPanelOpen} 
        onClose={() => setIsActivityPanelOpen(false)} 
        title="Activity" 
        data={nonFollowActivities} 
      />
    </div>
  );
};

export default Inbox;
