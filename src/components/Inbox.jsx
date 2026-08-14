import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, UserPlus, Heart, Users, Search, ArrowLeft, Bell, Loader2,
  Radio, Sparkles, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Inbox = () => {
  const navigate = useNavigate();
  const [liveStreams, setLiveStreams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [liveInvites, setLiveInvites] = useState([]);
  const [acceptingInviteId, setAcceptingInviteId] = useState(null);
  const [myFollows, setMyFollows] = useState(new Set()); // Tracks who you already follow back
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowerPanelOpen, setIsFollowerPanelOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);

  const channelRef = useRef(null);

  const fetchData = useCallback(async (uid) => {
    try {
      const [streamsRes, activitiesRes, messagesRes, followsRes, invitesRes] = await Promise.all([
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
          .select(`
            *,
            sender:profiles(id, avatar_url, username),
            receiver:profiles(id, avatar_url, username)
          `)
          .or(`receiver_id.eq.${uid},sender_id.eq.${uid}`)
          .order('updated_at', { ascending: false }),
        supabase.from('follows').select('following_id').eq('follower_id', uid),
        supabase.from('live_guest_requests')
          .select('*')
          .eq('user_id', uid)
          .eq('status', 'invited')
          .order('created_at', { ascending: false })
      ]);

      if (streamsRes.data) setLiveStreams(streamsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
      
      if (followsRes.data) {
        setMyFollows(new Set(followsRes.data.map(f => f.following_id)));
      }

      // Process Live Co-Host Invites
      if (invitesRes.data && invitesRes.data.length > 0) {
        const streamIds = [...new Set(invitesRes.data.map(i => i.stream_id))];
        const { data: activeStreamsData } = await supabase
          .from('live_streams')
          .select('*, host:profiles!host_id(id, username, avatar_url)')
          .in('id', streamIds)
          .eq('status', 'live');

        const streamsMap = new Map((activeStreamsData || []).map(s => [s.id, s]));

        const validInvites = invitesRes.data
          .filter(inv => streamsMap.has(inv.stream_id))
          .map(inv => ({
            ...inv,
            stream: streamsMap.get(inv.stream_id)
          }));

        setLiveInvites(validInvites);
      } else {
        setLiveInvites([]);
      }
      
      if (messagesRes.data) {
        const uniqueThreads = [];
        const seenIds = new Set();
        
        messagesRes.data.forEach(m => {
          const otherUser = m.sender_id === uid ? m.receiver : m.sender;
          if (otherUser && !seenIds.has(otherUser.id)) {
            seenIds.add(otherUser.id);
            uniqueThreads.push({
              ...m,
              displayProfile: otherUser
            });
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
    if (!currentUserId || !targetId) return;

    setMyFollows(prev => {
      const updated = new Set(prev);
      updated.add(targetId);
      return updated;
    });

    try {
      const { error } = await supabase
        .from('follows')
        .upsert(
          { follower_id: currentUserId, following_id: targetId }, 
          { onConflict: 'follower_id,following_id' }
        );

      if (error) {
        console.error("Error following user:", error.message);
        setMyFollows(prev => {
          const updated = new Set(prev);
          updated.delete(targetId);
          return updated;
        });
      }
    } catch (err) {
      console.error("Follow operation failed:", err);
    }
  };

  const markAsRead = async (typeGroup) => {
    if (!currentUserId) return;

    // Direct State mutation to ensure badge numbers drop immediately
    setActivities(prev => prev.map(act => {
      if (typeGroup === 'follow' && act.type === 'follow') return { ...act, is_read: true };
      if (typeGroup === 'activity' && act.type !== 'follow') return { ...act, is_read: true };
      return act;
    }));

    try {
      let query = supabase
        .from('activities')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (typeGroup === 'follow') {
        query = query.eq('type', 'follow');
      } else {
        query = query.neq('type', 'follow');
      }

      const { error } = await query;
      if (error) console.error("Database Update Error on MarkRead:", error.message);
    } catch (err) {
      console.error("Mark as read query failed:", err);
    }
  };

  // ACCEPT CO-HOST INVITATION FROM INBOX
  const handleAcceptLiveInvite = async (invite) => {
    setAcceptingInviteId(invite.id);
    try {
      // 1. Verify stream is still active/live
      const { data: streamData } = await supabase
        .from('live_streams')
        .select('status')
        .eq('id', invite.stream_id)
        .single();

      if (!streamData || streamData.status !== 'live') {
        alert("This live stream session has ended or is no longer live.");
        setLiveInvites(prev => prev.filter(i => i.id !== invite.id));
        return;
      }

      // 2. Check if space is still available in the room
      const { count, error: countErr } = await supabase
        .from('live_guest_requests')
        .select('id', { count: 'exact', head: true })
        .eq('stream_id', invite.stream_id)
        .eq('status', 'approved');

      const MAX_GUEST_SLOTS = 7; // Host + 7 guest slots = 8 seats
      if (!countErr && count >= MAX_GUEST_SLOTS) {
        alert("Sorry, all co-host slots in this live room are currently taken!");
        await supabase
          .from('live_guest_requests')
          .update({ status: 'full' })
          .eq('id', invite.id);

        setLiveInvites(prev => prev.filter(i => i.id !== invite.id));
        return;
      }

      // 3. Approve invitation request
      const { error: updateErr } = await supabase
        .from('live_guest_requests')
        .update({ status: 'approved' })
        .eq('id', invite.id);

      if (updateErr) {
        console.error("Error approving invite:", updateErr);
        alert("Unable to join panel at this moment. Please try again.");
        return;
      }

      // 4. Remove invite card and navigate directly to guest stage
      setLiveInvites(prev => prev.filter(i => i.id !== invite.id));
      navigate(`/live/watch/${invite.stream_id}/join-guest`);

    } catch (err) {
      console.error("Accept invite error:", err);
    } finally {
      setAcceptingInviteId(null);
    }
  };

  // DECLINE CO-HOST INVITATION
  const handleDeclineLiveInvite = async (invite) => {
    try {
      await supabase
        .from('live_guest_requests')
        .update({ status: 'rejected' })
        .eq('id', invite.id);

      setLiveInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (err) {
      console.error("Decline invite error:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initInbox = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      
      setCurrentUserId(user.id);
      await fetchData(user.id);
      
      const channelName = `inbox-realtime-${user.id}`;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(channelName)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'activities', 
            filter: `user_id=eq.${user.id}` 
        }, async (payload) => {
          if (payload.new && mounted) {
            // Fetch actor profile immediately for instant UI placement without full page refresh
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, avatar_url, username')
              .eq('id', payload.new.actor_id)
              .single();

            const fullActivity = {
              ...payload.new,
              actor: profileData || null
            };

            setActivities(prev => [fullActivity, ...prev]);
          }
        })
        .on('postgres_changes', {
            event: '*', 
            schema: 'public', 
            table: 'live_guest_requests',
            filter: `user_id=eq.${user.id}`
        }, () => {
          if (mounted) fetchData(user.id);
        })
        .on('postgres_changes', { 
            event: '*', // Listen to INSERTs & UPDATEs from messaging stream
            schema: 'public', 
            table: 'messages'
        }, () => {
          if (mounted) fetchData(user.id);
        })
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
      case 'video_comments': return <MessageCircle size={12} fill="currentColor" />;
      case 'like': return <Heart size={12} fill="currentColor" />;
      case 'video_likes': return <Heart size={12} fill="currentColor" />;
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
              {data.map((item) => {
                const isFollowingBack = myFollows.has(item.actor_id);
                return (
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
                           (item.type === 'like' || item.type === 'video_likes') ? 'liked your video' : 'commented on your video'}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">
                          {formatDistanceToNow(new Date(item.created_at))} ago
                        </p>
                      </div>
                    </div>
                    
                    {item.type === 'follow' ? (
                      <button 
                        onClick={() => handleFollowBack(item.actor_id)}
                        disabled={isFollowingBack}
                        className={`text-[12px] font-black px-4 py-2 rounded-lg transition-all ${
                          isFollowingBack 
                            ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' 
                            : 'bg-[#fe2c55] text-white active:scale-95'
                        }`}
                      >
                        {isFollowingBack ? 'Friends' : 'Follow Back'}
                      </button>
                    ) : item.video_id && (
                      <div onClick={() => navigate(`/video/${item.video_id}`)} className="w-12 h-16 rounded-lg bg-zinc-800 relative overflow-hidden border border-white/5 cursor-pointer flex items-center justify-center">
                        {item.videos?.thumbnail_url ? (
                          <img src={item.videos.thumbnail_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                        ) : item.video_url ? (
                          <video src={item.video_url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <div className="w-full h-full bg-zinc-700" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
        {liveStreams.length > 0 && (
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
        )}

        <div className="px-4 py-4 space-y-2">
          {/* LIVE CO-HOST INVITES CARDS */}
          {liveInvites.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                  Live Co-Host Invites ({liveInvites.length})
                </h3>
              </div>

              <div className="space-y-3">
                {liveInvites.map((invite) => {
                  const hostProfile = invite.stream?.host;
                  const isVideo = invite.mode === 'video' || !invite.mode;

                  return (
                    <div 
                      key={invite.id} 
                      className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-pink-950/30 border border-cyan-500/40 p-4 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.15)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img 
                              src={hostProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                              alt="" 
                              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 p-0.5 shadow-md"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-pink-600 text-white p-1 rounded-full text-[10px] shadow">
                              <Radio size={10} className="animate-pulse" />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-white">@{hostProfile?.username || 'Host'}</p>
                              <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded text-[9px] font-black uppercase">
                                Live Room
                              </span>
                            </div>
                            <p className="text-[11px] text-cyan-200 font-medium mt-0.5">
                              Invited you to co-host on {isVideo ? '📹 Video' : '🎙️ Mic'} panel
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          disabled={acceptingInviteId === invite.id}
                          onClick={() => handleAcceptLiveInvite(invite)}
                          className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          {acceptingInviteId === invite.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Checking space...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> Accept & Join Stage
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeclineLiveInvite(invite)}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
             <div 
               key={msg.id} 
               onClick={() => navigate(`/messaging?userId=${msg.displayProfile?.id}`)} 
               className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-white/5 cursor-pointer"
             >
                <img 
                  src={msg.displayProfile?.avatar_url} 
                  crossOrigin="anonymous" 
                  referrerPolicy="no-referrer" 
                  className="w-14 h-14 rounded-full object-cover border border-white/10" 
                  alt="" 
                />
                <div className="flex-1">
                  <p className="text-[15px] font-bold">@{msg.displayProfile?.username || 'user'}</p>
                  {/* Updated key extraction strategy from msg.content to msg.last_msg */}
                  <p className="text-[13px] text-zinc-500 truncate">{msg.last_msg}</p>
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
