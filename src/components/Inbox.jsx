import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, UserPlus, Heart, Search, ArrowLeft, Bell, Loader2,
  Radio, Sparkles, X, CheckCheck, MessageSquare, Flame, Check, Play,
  RefreshCw, Plus, Send
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Inbox = () => {
  const navigate = useNavigate();
  
  // Data States
  const [liveStreams, setLiveStreams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [liveInvites, setLiveInvites] = useState([]);
  const [myFollows, setMyFollows] = useState(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  
  // Control States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Filter & Search
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'likes' | 'comments' | 'followers' | 'messages'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [acceptingInviteId, setAcceptingInviteId] = useState(null);

  // Dedicated Drawers
  const [isFollowerPanelOpen, setIsFollowerPanelOpen] = useState(false);
  const [isLikesPanelOpen, setIsLikesPanelOpen] = useState(false);
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);

  const channelRef = useRef(null);

  // Helper to safely fetch profiles in batch if joins fail
  const fetchProfilesBatch = async (userIds) => {
    if (!userIds || userIds.length === 0) return new Map();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name, is_verified')
        .in('id', userIds);

      if (error || !data) return new Map();
      return new Map(data.map(p => [p.id, p]));
    } catch (err) {
      console.warn("Fallback profiles fetch error:", err);
      return new Map();
    }
  };

  // Helper to safely fetch videos in batch if joins fail
  const fetchVideosBatch = async (videoIds) => {
    if (!videoIds || videoIds.length === 0) return new Map();
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, thumbnail_url, video_url, caption')
        .in('id', videoIds);

      if (error || !data) return new Map();
      return new Map(data.map(v => [v.id, v]));
    } catch (err) {
      console.warn("Fallback videos fetch error:", err);
      return new Map();
    }
  };

  // MAIN FETCH FUNCTION - Messages, Activities, Streams, Invites & Follows
  const fetchData = useCallback(async (uid, isManual = false) => {
    if (!uid) return;
    if (isManual) setIsRefreshing(true);

    try {
      // 1. Fetch live streams
      const streamsPromise = supabase
        .from('live_streams')
        .select('*, profiles:host_id(avatar_url, username)')
        .eq('status', 'live');

      // 2. Fetch activities (with resilient fallback handling)
      const activitiesPromise = supabase
        .from('activities')
        .select(`
          *, 
          actor:profiles!actor_id(id, avatar_url, username), 
          videos:video_id(id, thumbnail_url, video_url, caption)
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);

      // 3. Fetch direct messages (with resilient fallback handling)
      const messagesPromise = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, avatar_url, username),
          receiver:profiles!receiver_id(id, avatar_url, username)
        `)
        .or(`receiver_id.eq.${uid},sender_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(200);

      // 4. Fetch follows
      const followsPromise = supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', uid);

      // 5. Fetch co-host invites
      const invitesPromise = supabase
        .from('live_guest_requests')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'invited')
        .order('created_at', { ascending: false });

      // 6. Fetch suggested users for new messages
      const suggestedUsersPromise = supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name, is_verified')
        .neq('id', uid)
        .limit(25);

      const [
        streamsRes,
        activitiesRes,
        messagesRes,
        followsRes,
        invitesRes,
        suggestedRes
      ] = await Promise.all([
        streamsPromise,
        activitiesPromise,
        messagesPromise,
        followsPromise,
        invitesPromise,
        suggestedUsersPromise
      ]);

      // A. Process Live Streams
      if (streamsRes.data) {
        setLiveStreams(streamsRes.data);
      }

      // B. Process Follows
      if (followsRes.data) {
        setMyFollows(new Set(followsRes.data.map(f => f.following_id)));
      }

      // C. Process Suggested Users for New Chat modal
      if (suggestedRes.data) {
        setSuggestedUsers(suggestedRes.data);
      }

      // D. Process Activities (with fallback if relations failed)
      let processedActivities = activitiesRes.data || [];
      if (activitiesRes.error || !activitiesRes.data) {
        // Fallback: fetch plain activities and attach profiles & videos manually
        const { data: rawActivities } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(100);

        if (rawActivities && rawActivities.length > 0) {
          const actorIds = [...new Set(rawActivities.map(a => a.actor_id).filter(Boolean))];
          const videoIds = [...new Set(rawActivities.map(a => a.video_id).filter(Boolean))];
          const [profilesMap, videosMap] = await Promise.all([
            fetchProfilesBatch(actorIds),
            fetchVideosBatch(videoIds)
          ]);

          processedActivities = rawActivities.map(a => ({
            ...a,
            actor: profilesMap.get(a.actor_id) || null,
            videos: videosMap.get(a.video_id) || null
          }));
        }
      } else {
        // Check if any actors or videos need fallback filling
        const missingActorIds = processedActivities
          .filter(a => a.actor_id && !a.actor)
          .map(a => a.actor_id);
        if (missingActorIds.length > 0) {
          const profilesMap = await fetchProfilesBatch(missingActorIds);
          processedActivities = processedActivities.map(a => ({
            ...a,
            actor: a.actor || profilesMap.get(a.actor_id) || null
          }));
        }
      }
      setActivities(processedActivities);

      // E. Process Live Co-Host Invites
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

      // F. Process Direct Messages & Group by Conversation Partner
      let rawMsgs = messagesRes.data || [];
      if (messagesRes.error || !messagesRes.data) {
        // Fallback: fetch plain messages without join
        const { data: plainMsgs } = await supabase
          .from('messages')
          .select('*')
          .or(`receiver_id.eq.${uid},sender_id.eq.${uid}`)
          .order('created_at', { ascending: false })
          .limit(200);

        if (plainMsgs && plainMsgs.length > 0) {
          const involvedUserIds = [...new Set([
            ...plainMsgs.map(m => m.sender_id),
            ...plainMsgs.map(m => m.receiver_id)
          ].filter(Boolean))];

          const profilesMap = await fetchProfilesBatch(involvedUserIds);

          rawMsgs = plainMsgs.map(m => ({
            ...m,
            sender: profilesMap.get(m.sender_id) || { id: m.sender_id, username: 'user' },
            receiver: profilesMap.get(m.receiver_id) || { id: m.receiver_id, username: 'user' }
          }));
        }
      } else {
        // In case join profiles were partially missing
        const missingUserIds = [];
        rawMsgs.forEach(m => {
          if (m.sender_id && !m.sender) missingUserIds.push(m.sender_id);
          if (m.receiver_id && !m.receiver) missingUserIds.push(m.receiver_id);
        });
        if (missingUserIds.length > 0) {
          const profilesMap = await fetchProfilesBatch(missingUserIds);
          rawMsgs = rawMsgs.map(m => ({
            ...m,
            sender: m.sender || profilesMap.get(m.sender_id) || null,
            receiver: m.receiver || profilesMap.get(m.receiver_id) || null
          }));
        }
      }

      if (rawMsgs && rawMsgs.length > 0) {
        // Calculate unread count per sender
        const unreadCountPerSender = {};
        rawMsgs.forEach(m => {
          const isUnread = m.receiver_id === uid && (
            m.unread === true || 
            m.is_read === false || 
            m.status === 'unread' || 
            m.status === 'sent' || 
            m.status === 'delivered'
          );
          if (isUnread) {
            unreadCountPerSender[m.sender_id] = (unreadCountPerSender[m.sender_id] || 0) + 1;
          }
        });

        // Group into latest thread preview per unique user
        const uniqueThreads = [];
        const seenUserIds = new Set();

        rawMsgs.forEach(m => {
          const otherUser = m.sender_id === uid ? m.receiver : m.sender;
          const otherUserId = m.sender_id === uid ? m.receiver_id : m.sender_id;
          
          if (otherUserId && !seenUserIds.has(otherUserId)) {
            seenUserIds.add(otherUserId);
            
            const displayProf = otherUser || {
              id: otherUserId,
              username: `user_${otherUserId.substring(0, 5)}`,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`
            };

            uniqueThreads.push({
              ...m,
              displayProfile: displayProf,
              unreadCount: unreadCountPerSender[otherUserId] || 0,
              isFromMe: m.sender_id === uid
            });
          }
        });

        setMessages(uniqueThreads);
      } else {
        setMessages([]);
      }

      setLastFetchedAt(new Date());
    } catch (err) {
      console.error("Inbox Fetch Error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Format rich message preview snippet
  const getMessagePreviewText = (msg) => {
    if (msg.media_type === 'voice' || msg.type === 'voice' || msg.audio_url) {
      return '🎙️ Voice message';
    }
    if (msg.media_type === 'image' || msg.type === 'image' || (msg.media_url && !msg.content)) {
      return '📷 Photo';
    }
    if (msg.media_type === 'video' || msg.type === 'video') {
      return '🎬 Video attachment';
    }
    if (msg.media_type === 'file' || msg.type === 'file') {
      return '📁 Document attached';
    }
    if (msg.call_type || msg.type === 'call') {
      return msg.call_type === 'video' ? '📹 Video Call' : '📞 Voice Call';
    }
    if (msg.content) return msg.content;
    if (msg.last_msg) return msg.last_msg;
    return 'Sent a message';
  };

  // Follow back action
  const handleFollowBack = async (targetId, e) => {
    if (e) e.stopPropagation();
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

  // MARK ALL AS READ (Activities + Messages)
  const handleMarkAllRead = async () => {
    if (!currentUserId) return;

    // Immediately update local states for instant visual feedback
    setActivities(prev => prev.map(a => ({ ...a, is_read: true })));
    setMessages(prev => prev.map(m => ({ ...m, unreadCount: 0, unread: false, is_read: true, status: 'read' })));

    try {
      await Promise.all([
        supabase
          .from('activities')
          .update({ is_read: true })
          .eq('user_id', currentUserId)
          .eq('is_read', false),
        supabase
          .from('messages')
          .update({ unread: false, is_read: true, status: 'read' })
          .eq('receiver_id', currentUserId)
      ]);
    } catch (err) {
      console.error("Mark all read query failed:", err);
    }
  };

  // MARK A SPECIFIC CATEGORY AS READ
  const markCategoryAsRead = async (typeGroup) => {
    if (!currentUserId) return;

    setActivities(prev => prev.map(act => {
      if (typeGroup === 'all') return { ...act, is_read: true };
      if (typeGroup === 'followers' && (act.type === 'follow' || act.type === 'user_follow')) return { ...act, is_read: true };
      if (typeGroup === 'likes' && (act.type === 'like' || act.type === 'video_likes' || act.type === 'video_like')) return { ...act, is_read: true };
      if (typeGroup === 'comments' && (act.type === 'comment' || act.type === 'video_comments' || act.type === 'video_comment')) return { ...act, is_read: true };
      if (typeGroup === 'activity' && act.type !== 'follow') return { ...act, is_read: true };
      return act;
    }));

    try {
      let query = supabase
        .from('activities')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (typeGroup === 'followers') {
        query = query.in('type', ['follow', 'user_follow']);
      } else if (typeGroup === 'likes') {
        query = query.in('type', ['like', 'video_likes', 'video_like']);
      } else if (typeGroup === 'comments') {
        query = query.in('type', ['comment', 'video_comments', 'video_comment']);
      } else if (typeGroup === 'activity') {
        query = query.not('type', 'in', '("follow","user_follow")');
      }

      await query;
    } catch (err) {
      console.error("Mark category read failed:", err);
    }
  };

  // HANDLE CLICK ON AN ACTIVITY ITEM -> CLEARS 'is_read' STATUS & REDIRECTS
  const handleActivityItemClick = async (item, e) => {
    if (e) e.stopPropagation();

    // 1. Immediately clear is_read in local state
    if (!item.is_read) {
      setActivities(prev => prev.map(a => a.id === item.id ? { ...a, is_read: true } : a));
      supabase.from('activities').update({ is_read: true }).eq('id', item.id).then();
    }

    // 2. Check for unique Video ID linkage
    const targetVideoId = item.video_id || item.videos?.id || item.video?.id || item.data?.video_id;
    if (targetVideoId) {
      const isComment = item.type === 'comment' || item.type === 'video_comments' || item.type === 'video_comment';
      navigate(`/?videoId=${targetVideoId}`, { 
        state: { 
          scrollToId: targetVideoId, 
          openComments: isComment 
        } 
      });
      return;
    }

    // 3. If follower / user activity without video, redirect directly to Actor Profile ID
    const targetActorId = item.actor_id || item.actor?.id || item.data?.actor_id;
    if (targetActorId) {
      navigate(`/profile/${targetActorId}`);
      return;
    }
  };

  // HANDLE CLICK ON ACTOR AVATAR / PROFILE DIRECTLY
  const handleActorProfileClick = async (actorId, itemId, e) => {
    if (e) e.stopPropagation();
    if (!actorId) return;

    if (itemId) {
      setActivities(prev => prev.map(a => a.id === itemId ? { ...a, is_read: true } : a));
      supabase.from('activities').update({ is_read: true }).eq('id', itemId).then();
    }

    navigate(`/profile/${actorId}`);
  };

  // HANDLE CLICK ON VIDEO THUMBNAIL DIRECTLY
  const handleVideoThumbnailClick = async (videoId, itemId, isComment, e) => {
    if (e) e.stopPropagation();
    if (!videoId) return;

    if (itemId) {
      setActivities(prev => prev.map(a => a.id === itemId ? { ...a, is_read: true } : a));
      supabase.from('activities').update({ is_read: true }).eq('id', itemId).then();
    }

    navigate(`/?videoId=${videoId}`, { 
      state: { 
        scrollToId: videoId, 
        openComments: isComment 
      } 
    });
  };

  // HANDLE OPENING DIRECT MESSAGE THREAD & MARKING AS READ
  const handleOpenThread = async (peerId) => {
    if (!peerId) return;

    // Immediately clear unread badge for this sender in local state
    setMessages(prev => prev.map(m => {
      if (m.displayProfile?.id === peerId) {
        return { ...m, unreadCount: 0, unread: false, is_read: true, status: 'read' };
      }
      return m;
    }));

    // Update in database
    try {
      await supabase
        .from('messages')
        .update({ unread: false, is_read: true, status: 'read' })
        .eq('sender_id', peerId)
        .eq('receiver_id', currentUserId);
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }

    navigate(`/messaging?userId=${peerId}`);
  };

  // ACCEPT CO-HOST INVITATION FROM INBOX
  const handleAcceptLiveInvite = async (invite) => {
    setAcceptingInviteId(invite.id);
    try {
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

      const { count, error: countErr } = await supabase
        .from('live_guest_requests')
        .select('id', { count: 'exact', head: true })
        .eq('stream_id', invite.stream_id)
        .eq('status', 'approved');

      const MAX_GUEST_SLOTS = 7;
      if (!countErr && count >= MAX_GUEST_SLOTS) {
        alert("Sorry, all co-host slots in this live room are currently taken!");
        await supabase
          .from('live_guest_requests')
          .update({ status: 'full' })
          .eq('id', invite.id);

        setLiveInvites(prev => prev.filter(i => i.id !== invite.id));
        return;
      }

      const { error: updateErr } = await supabase
        .from('live_guest_requests')
        .update({ status: 'approved' })
        .eq('id', invite.id);

      if (updateErr) {
        alert("Unable to join panel at this moment. Please try again.");
        return;
      }

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

  // INITIALIZE INBOX & REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    let mounted = true;
    
    const initInbox = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        setLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);
      await fetchData(user.id);
      
      // Setup unified Realtime channel
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
            event: 'UPDATE', 
            schema: 'public', 
            table: 'activities', 
            filter: `user_id=eq.${user.id}` 
        }, (payload) => {
          if (payload.new && mounted) {
            setActivities(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
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
            event: '*', 
            schema: 'public', 
            table: 'messages'
        }, () => {
          if (mounted) fetchData(user.id);
        })
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'live_streams'
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

  // Compute Precise Unread Counts for Specific Categories
  const unreadFollowers = activities.filter(a => (a.type === 'follow' || a.type === 'user_follow') && !a.is_read);
  const unreadLikes = activities.filter(a => (a.type === 'like' || a.type === 'video_likes' || a.type === 'video_like') && !a.is_read);
  const unreadComments = activities.filter(a => (a.type === 'comment' || a.type === 'video_comments' || a.type === 'video_comment') && !a.is_read);
  const unreadMessagesTotal = messages.reduce((acc, m) => acc + (m.unreadCount || 0), 0);
  const totalUnreadCount = unreadFollowers.length + unreadLikes.length + unreadComments.length + unreadMessagesTotal;

  // Filtered Activities based on Selected Filter & Search Query
  const filteredActivities = activities.filter(item => {
    if (activeFilter === 'followers') return item.type === 'follow' || item.type === 'user_follow';
    if (activeFilter === 'likes') return item.type === 'like' || item.type === 'video_likes' || item.type === 'video_like';
    if (activeFilter === 'comments') return item.type === 'comment' || item.type === 'video_comments' || item.type === 'video_comment';
    if (activeFilter === 'messages') return false; // Messages rendered in dedicated tab/section
    return true;
  }).filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.actor?.username?.toLowerCase().includes(q) ||
      item.videos?.caption?.toLowerCase().includes(q) ||
      item.actor?.full_name?.toLowerCase().includes(q)
    );
  });

  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.displayProfile?.username?.toLowerCase().includes(q) ||
      m.displayProfile?.full_name?.toLowerCase().includes(q) ||
      m.content?.toLowerCase().includes(q) ||
      m.last_msg?.toLowerCase().includes(q)
    );
  });

  // Filtered suggested users for compose modal
  const filteredSuggestedUsers = suggestedUsers.filter(u => {
    if (!newChatSearch.trim()) return true;
    const q = newChatSearch.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    );
  });

  const getActivityIcon = (type) => {
    switch (type) {
      case 'comment':
      case 'video_comments':
      case 'video_comment':
        return <MessageCircle size={12} className="text-cyan-400 fill-cyan-400" />;
      case 'like':
      case 'video_likes':
      case 'video_like':
        return <Heart size={12} className="text-pink-500 fill-pink-500" />;
      case 'follow':
      case 'user_follow':
        return <UserPlus size={12} className="text-blue-400" />;
      default:
        return <Bell size={12} className="text-yellow-400" />;
    }
  };

  const getActivityText = (item) => {
    if (item.type === 'follow' || item.type === 'user_follow') return 'started following you';
    if (item.type === 'like' || item.type === 'video_likes' || item.type === 'video_like') return 'liked your video';
    if (item.type === 'comment' || item.type === 'video_comments' || item.type === 'video_comment') return 'commented on your video';
    return 'interacted with your profile';
  };

  // Activity Drawer for expanded lists (Likes, Comments, Followers, Activity)
  const ActivityDrawer = ({ isOpen, onClose, title, data, categoryKey }) => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110]"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#09090e] border-l border-cyan-500/20 z-[111] flex flex-col shadow-2xl"
          >
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ArrowLeft size={22} className="text-cyan-400" />
                </button>
                <h2 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                  {title}
                </h2>
              </div>
              <button 
                onClick={() => markCategoryAsRead(categoryKey || title.toLowerCase())}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
              >
                <CheckCheck size={13} /> Mark Read
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {data.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <Bell size={32} className="text-zinc-600 mb-2 opacity-50" />
                  No items in this category yet
                </div>
              ) : (
                data.map((item) => {
                  const isFollowingBack = myFollows.has(item.actor_id);
                  const isUnread = !item.is_read;
                  const isComment = item.type === 'comment' || item.type === 'video_comments' || item.type === 'video_comment';

                  return (
                    <div 
                      key={item.id} 
                      onClick={(e) => {
                        handleActivityItemClick(item, e);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                        isUnread 
                          ? 'bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="relative shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActorProfileClick(item.actor_id || item.actor?.id, item.id, e);
                            onClose();
                          }}
                        >
                          {item.actor?.avatar_url ? (
                            <img 
                              src={item.actor.avatar_url} 
                              crossOrigin="anonymous" 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border border-cyan-400/40 p-0.5" 
                              alt="" 
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-cyan-400 uppercase font-black text-xs">
                              {item.actor?.username?.substring(0,2) || '??'}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20 shadow">
                            {getActivityIcon(item.type)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <p 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActorProfileClick(item.actor_id || item.actor?.id, item.id, e);
                                onClose();
                              }}
                              className="text-[13px] font-black text-white truncate hover:underline"
                            >
                              @{item.actor?.username || 'user'}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,1)] shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                            {getActivityText(item)}
                          </p>
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                            {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                          </p>
                        </div>
                      </div>
                      
                      {(item.type === 'follow' || item.type === 'user_follow') ? (
                        <button 
                          onClick={(e) => handleFollowBack(item.actor_id, e)}
                          disabled={isFollowingBack}
                          className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md shrink-0 ${
                            isFollowingBack 
                              ? 'bg-zinc-800 text-zinc-400 border border-white/10 cursor-default' 
                              : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20 active:scale-95'
                          }`}
                        >
                          {isFollowingBack ? 'Friends' : 'Follow Back'}
                        </button>
                      ) : (item.video_id || item.videos?.id) ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoThumbnailClick(item.video_id || item.videos?.id, item.id, isComment, e);
                            onClose();
                          }}
                          className="w-12 h-14 rounded-xl bg-zinc-800 relative overflow-hidden border border-cyan-500/30 cursor-pointer flex items-center justify-center shrink-0 shadow-md group hover:border-cyan-400"
                          title="Click to view target video"
                        >
                          {item.videos?.thumbnail_url ? (
                            <img src={item.videos.thumbnail_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-950 to-pink-950 flex items-center justify-center">
                              <Play size={14} className="text-cyan-400 fill-cyan-400 opacity-80" />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#07070a] text-white">
        <Loader2 className="animate-spin text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.9)] mb-3" size={40} />
        <p className="text-xs uppercase font-black tracking-widest text-zinc-400">Loading Inbox & Messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#07070a] text-white overflow-hidden font-sans select-none">
      
      {/* Top Header */}
      <header className="px-5 pt-8 pb-3.5 flex items-center justify-between border-b border-cyan-500/15 bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bell size={20} className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-rose-400">
                Inbox
              </h1>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[10px] shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse">
                  {totalUnreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              <span>Activity & Messages</span>
              {lastFetchedAt && (
                <span className="text-zinc-600 font-normal lowercase">
                  • {formatDistanceToNow(lastFetchedAt, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Refresh Button */}
          <button 
            onClick={() => fetchData(currentUserId, true)}
            disabled={isRefreshing}
            title="Refresh messages and activities"
            className="p-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-cyan-300' : ''} />
          </button>

          {/* New Chat / Compose Button */}
          <button 
            onClick={() => setShowNewChatModal(true)}
            title="Start new direct message"
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
          >
            <Plus size={16} className="text-purple-400" />
            <span className="hidden sm:inline text-[11px] font-black uppercase">New Chat</span>
          </button>

          {/* Mark All Read Button */}
          {totalUnreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              title="Mark all notifications and messages as read"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <CheckCheck size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Mark All</span>
            </button>
          )}

          {/* Search Toggle */}
          <button 
            onClick={() => setShowSearch(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              showSearch ? 'bg-pink-500 text-white border-pink-400' : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* Search Input Dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2.5 bg-black/60 border-b border-cyan-500/20"
          >
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-zinc-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities, users, messages..."
                className="w-full bg-[#121218] border border-cyan-500/30 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-zinc-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* Horizontal Category Badges / Filter Switcher */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            
            {/* All Filter */}
            <button
              onClick={() => { setActiveFilter('all'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter === 'all'
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>All</span>
              {totalUnreadCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeFilter === 'all' ? 'bg-black text-cyan-300' : 'bg-pink-600 text-white'
                }`}>
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {/* Likes Filter */}
            <button
              onClick={() => { 
                setActiveFilter('likes'); 
                if (unreadLikes.length > 0) markCategoryAsRead('likes'); 
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter === 'likes'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Heart size={14} className={activeFilter === 'likes' ? 'fill-white text-white' : 'text-pink-500 fill-pink-500'} />
              <span>Likes</span>
              {unreadLikes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-pink-500 text-white shadow animate-pulse">
                  {unreadLikes.length}
                </span>
              )}
            </button>

            {/* Comments Filter */}
            <button
              onClick={() => { 
                setActiveFilter('comments'); 
                if (unreadComments.length > 0) markCategoryAsRead('comments'); 
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter === 'comments'
                  ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageCircle size={14} className={activeFilter === 'comments' ? 'fill-black text-black' : 'text-cyan-400 fill-cyan-400'} />
              <span>Comments</span>
              {unreadComments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-500 text-black shadow animate-pulse">
                  {unreadComments.length}
                </span>
              )}
            </button>

            {/* Messages Filter */}
            <button
              onClick={() => { setActiveFilter('messages'); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter === 'messages'
                  ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageSquare size={14} className={activeFilter === 'messages' ? 'text-white fill-white' : 'text-purple-400'} />
              <span>Messages</span>
              {unreadMessagesTotal > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-500 text-white shadow animate-pulse">
                  {unreadMessagesTotal}
                </span>
              )}
            </button>

            {/* Followers Filter */}
            <button
              onClick={() => { 
                setActiveFilter('followers'); 
                if (unreadFollowers.length > 0) markCategoryAsRead('followers'); 
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter === 'followers'
                  ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserPlus size={14} className={activeFilter === 'followers' ? 'text-white' : 'text-blue-400'} />
              <span>Followers</span>
              {unreadFollowers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-500 text-white shadow animate-pulse">
                  {unreadFollowers.length}
                </span>
              )}
            </button>

          </div>
        </div>

        {/* SPECIFIC NOTIFICATION COUNTS BENTO DASHBOARD (Interactive Category Overview Hub) */}
        {activeFilter === 'all' && (
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* 1. LIKES NOTIFICATION HUB CARD */}
            <div 
              onClick={() => { 
                setIsLikesPanelOpen(true); 
                if (unreadLikes.length > 0) markCategoryAsRead('likes'); 
              }} 
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-zinc-900 to-black border border-pink-500/30 cursor-pointer hover:border-pink-400/70 hover:shadow-[0_0_20px_rgba(236,72,153,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Heart size={18} className="fill-pink-500 text-pink-500" />
                </div>
                {unreadLikes.length > 0 ? (
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-pulse">
                    {unreadLikes.length} New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">0 New</span>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white group-hover:text-pink-300 transition-colors">Likes</p>
                <p className="text-[10px] text-zinc-400 font-medium">Video reactions</p>
              </div>
            </div>

            {/* 2. COMMENTS NOTIFICATION HUB CARD */}
            <div 
              onClick={() => { 
                setIsCommentsPanelOpen(true); 
                if (unreadComments.length > 0) markCategoryAsRead('comments'); 
              }} 
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-black border border-cyan-500/30 cursor-pointer hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle size={18} className="fill-cyan-400 text-cyan-400" />
                </div>
                {unreadComments.length > 0 ? (
                  <span className="bg-cyan-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse">
                    {unreadComments.length} New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">0 New</span>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">Comments</p>
                <p className="text-[10px] text-zinc-400 font-medium">Video remarks</p>
              </div>
            </div>

            {/* 3. MESSAGES NOTIFICATION HUB CARD */}
            <div 
              onClick={() => { 
                setActiveFilter('messages'); 
              }} 
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-black border border-purple-500/30 cursor-pointer hover:border-purple-400/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare size={18} className="text-purple-400" />
                </div>
                {unreadMessagesTotal > 0 ? (
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse">
                    {unreadMessagesTotal} New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">0 New</span>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">Messages</p>
                <p className="text-[10px] text-zinc-400 font-medium">Direct chats</p>
              </div>
            </div>

            {/* 4. FOLLOWERS NOTIFICATION HUB CARD */}
            <div 
              onClick={() => { 
                setIsFollowerPanelOpen(true); 
                if (unreadFollowers.length > 0) markCategoryAsRead('followers'); 
              }} 
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-black border border-blue-500/30 cursor-pointer hover:border-blue-400/70 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus size={18} className="text-blue-400" />
                </div>
                {unreadFollowers.length > 0 ? (
                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse">
                    {unreadFollowers.length} New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">0 New</span>
                )}
              </div>
              <div>
                <p className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">Followers</p>
                <p className="text-[10px] text-zinc-400 font-medium">Connections</p>
              </div>
            </div>

          </div>
        )}

        {/* LIVE STREAMS HORIZONTAL FEED */}
        {liveStreams.length > 0 && (
          <div className="flex gap-4 px-4 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
            {liveStreams.map((live) => (
              <div 
                key={live.id} 
                onClick={() => navigate(`/live/watch/${live.id}`)} 
                className="flex flex-col items-center min-w-[72px] cursor-pointer group"
              >
                <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-rose-500 shadow-[0_0_12px_rgba(236,72,153,0.5)] group-hover:scale-105 transition-transform">
                  <img 
                    src={live.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                    crossOrigin="anonymous" 
                    referrerPolicy="no-referrer" 
                    className="w-[54px] h-[54px] rounded-full object-cover" 
                    alt="" 
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shadow">
                    Live
                  </div>
                </div>
                <span className="text-[11px] font-bold mt-2 truncate w-16 text-center text-cyan-200">
                  @{live.profiles?.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* LIVE CO-HOST INVITES CARDS */}
        {liveInvites.length > 0 && (
          <div className="px-4 pt-3 pb-2 space-y-2">
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

        {/* NOTIFICATIONS / ACTIVITY FEED LIST (When not purely 'messages' filter) */}
        {activeFilter !== 'messages' && (
          <div className="px-4 pt-3 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={13} className="text-pink-500" />
                {activeFilter === 'all' ? 'Recent Activity' : `${activeFilter.toUpperCase()} Activity`}
              </h3>
              {filteredActivities.some(a => !a.is_read) && (
                <button 
                  onClick={() => markCategoryAsRead(activeFilter)}
                  className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Check size={12} /> Mark section read
                </button>
              )}
            </div>

            {filteredActivities.length === 0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                <Bell size={24} className="text-zinc-600 mx-auto mb-1.5 opacity-60" />
                <p className="text-xs font-bold text-zinc-500">No activities found in this filter</p>
              </div>
            ) : (
              filteredActivities.map((item) => {
                const isFollowingBack = myFollows.has(item.actor_id);
                const isUnread = !item.is_read;
                const isComment = item.type === 'comment' || item.type === 'video_comments' || item.type === 'video_comment';

                return (
                  <div 
                    key={item.id} 
                    onClick={(e) => handleActivityItemClick(item, e)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                      isUnread 
                        ? 'bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-black border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar with click directly to Profile ID */}
                      <div 
                        className="relative shrink-0 cursor-pointer group"
                        onClick={(e) => handleActorProfileClick(item.actor_id || item.actor?.id, item.id, e)}
                        title="View profile"
                      >
                        {item.actor?.avatar_url ? (
                          <img 
                            src={item.actor.avatar_url} 
                            crossOrigin="anonymous" 
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover border border-cyan-400/40 p-0.5 group-hover:border-cyan-300 transition-colors" 
                            alt="" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-cyan-400 uppercase font-black text-xs group-hover:border-cyan-400 transition-colors">
                            {item.actor?.username?.substring(0,2) || '??'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20 shadow">
                          {getActivityIcon(item.type)}
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p 
                            onClick={(e) => handleActorProfileClick(item.actor_id || item.actor?.id, item.id, e)}
                            className="text-[13px] font-black text-white truncate hover:underline hover:text-cyan-300 transition-colors"
                          >
                            @{item.actor?.username || 'user'}
                          </p>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,1)] shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                          {getActivityText(item)}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    </div>
                    
                    {(item.type === 'follow' || item.type === 'user_follow') ? (
                      <button 
                        onClick={(e) => handleFollowBack(item.actor_id, e)}
                        disabled={isFollowingBack}
                        className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md shrink-0 ${
                          isFollowingBack 
                            ? 'bg-zinc-800 text-zinc-400 border border-white/10 cursor-default' 
                            : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20 active:scale-95'
                        }`}
                      >
                        {isFollowingBack ? 'Friends' : 'Follow Back'}
                      </button>
                    ) : (item.video_id || item.videos?.id) ? (
                      <div 
                        onClick={(e) => handleVideoThumbnailClick(item.video_id || item.videos?.id, item.id, isComment, e)}
                        className="w-12 h-14 rounded-xl bg-zinc-800 relative overflow-hidden border border-cyan-500/40 cursor-pointer flex items-center justify-center shrink-0 shadow-md group hover:border-cyan-400 hover:scale-105 transition-all"
                        title="Click to view target video"
                      >
                        {item.videos?.thumbnail_url ? (
                          <img src={item.videos.thumbnail_url} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-950 to-pink-950 flex items-center justify-center">
                            <Play size={14} className="text-cyan-400 fill-cyan-400 opacity-80" />
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DIRECT MESSAGES SECTION (Shown in 'all' and 'messages' filter) */}
        {(activeFilter === 'all' || activeFilter === 'messages') && (
          <div className="mt-5 px-4">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-cyan-400" />
                  Direct Messages ({filteredMessages.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {unreadMessagesTotal > 0 && (
                  <span className="text-[10px] font-black text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    {unreadMessagesTotal} unread
                  </span>
                )}
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                >
                  <Plus size={12} /> New Chat
                </button>
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="py-10 text-center bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center px-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2">
                  <MessageSquare size={22} className="text-purple-400" />
                </div>
                <p className="text-sm font-black text-white">No Conversations Yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Connect with friends, send voice notes, photos, and start chatting directly.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} /> Start A Conversation
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMessages.map((msg) => {
                  const hasUnread = (msg.unreadCount || 0) > 0;
                  const previewText = getMessagePreviewText(msg);

                  return (
                    <div 
                      key={msg.id || msg.displayProfile?.id} 
                      onClick={() => handleOpenThread(msg.displayProfile?.id)} 
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        hasUnread 
                          ? 'bg-gradient-to-r from-purple-950/30 via-zinc-900 to-black border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]'
                      }`}
                    >
                      {/* Avatar with Sender's Unread Message Count Badge */}
                      <div className="relative shrink-0">
                        <img 
                          src={msg.displayProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.displayProfile?.id}`} 
                          crossOrigin="anonymous" 
                          referrerPolicy="no-referrer" 
                          className="w-13 h-13 rounded-full object-cover border-2 border-cyan-400/40 p-0.5 shadow-md" 
                          alt="" 
                        />
                        
                        {/* Specific User Unread Badge on Avatar */}
                        {hasUnread && (
                          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.9)] border-2 border-black animate-pulse">
                            {msg.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <p className="text-[14px] font-black text-white truncate">
                              @{msg.displayProfile?.username || 'user'}
                            </p>
                            {msg.displayProfile?.is_verified && (
                              <span className="text-cyan-400 text-xs">✓</span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold shrink-0">
                            {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: false }) : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[12px] truncate ${hasUnread ? 'text-cyan-200 font-bold' : 'text-zinc-400'}`}>
                            {msg.isFromMe && <span className="text-zinc-500 font-semibold mr-1">You:</span>}
                            {previewText}
                          </p>
                          {hasUnread && (
                            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0">
                              {msg.unreadCount} New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* NEW CHAT / COMPOSE MODAL */}
      <AnimatePresence>
        {showNewChatModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChatModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md max-h-[85vh] bg-[#0c0c12] border border-cyan-500/30 rounded-3xl z-[121] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <MessageSquare size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Start Direct Message
                  </h3>
                </div>
                <button 
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search User Input */}
              <div className="p-3 border-b border-white/10 bg-black/20">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute left-3 text-zinc-400" />
                  <input 
                    type="text"
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    placeholder="Search by username or name..."
                    className="w-full bg-[#161622] border border-cyan-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    autoFocus
                  />
                  {newChatSearch && (
                    <button onClick={() => setNewChatSearch('')} className="absolute right-3 text-zinc-400 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar max-h-[60vh]">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-2 py-1">
                  {newChatSearch ? 'Search Results' : 'Suggested Users'}
                </p>

                {filteredSuggestedUsers.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs font-medium">
                    No matching users found
                  </div>
                ) : (
                  filteredSuggestedUsers.map(user => {
                    const isFollowed = myFollows.has(user.id);

                    return (
                      <div 
                        key={user.id}
                        onClick={() => {
                          setShowNewChatModal(false);
                          navigate(`/messaging?userId=${user.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-cyan-500/20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-cyan-500/30 group-hover:border-cyan-400 p-0.5"
                            alt=""
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                                @{user.username || 'user'}
                              </p>
                              {user.is_verified && <span className="text-cyan-400 text-[10px]">✓</span>}
                            </div>
                            {user.full_name && (
                              <p className="text-[11px] text-zinc-400 truncate">
                                {user.full_name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isFollowed && (
                            <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 uppercase tracking-wider">
                              Friend
                            </span>
                          )}
                          <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-all">
                            <Send size={13} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Extended Drawers for Followers, Likes, Comments, and Activity */}
      <ActivityDrawer 
        isOpen={isFollowerPanelOpen} 
        onClose={() => setIsFollowerPanelOpen(false)} 
        title="Followers" 
        categoryKey="followers"
        data={activities.filter(a => a.type === 'follow' || a.type === 'user_follow')} 
      />
      <ActivityDrawer 
        isOpen={isLikesPanelOpen} 
        onClose={() => setIsLikesPanelOpen(false)} 
        title="Likes" 
        categoryKey="likes"
        data={activities.filter(a => a.type === 'like' || a.type === 'video_likes' || a.type === 'video_like')} 
      />
      <ActivityDrawer 
        isOpen={isCommentsPanelOpen} 
        onClose={() => setIsCommentsPanelOpen(false)} 
        title="Comments" 
        categoryKey="comments"
        data={activities.filter(a => a.type === 'comment' || a.type === 'video_comments' || a.type === 'video_comment')} 
      />
      <ActivityDrawer 
        isOpen={isActivityPanelOpen} 
        onClose={() => setIsActivityPanelOpen(false)} 
        title="Activity" 
        categoryKey="activity"
        data={activities.filter(a => a.type !== 'follow' && a.type !== 'user_follow')} 
      />
    </div>
  );
};

export default Inbox;
