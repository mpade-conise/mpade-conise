import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Upload from './components/Upload';
import Discovery from './components/Discovery';
import Inbox from './components/Inbox';
import Messages from './components/Messages';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile'; 
import ShareProfile from './components/ShareProfile'; 
import UniverseTools from './components/UniverseTools'; 
import LiveUniverse from './components/LiveUniverse'; 
import Payouts from './components/Payouts'; 
import Settings from "./components/settings";
import Security from './settings/Security'; 
import Notifications from './settings/Notifications'; 
import Language from './settings/Language'; 
import { ThemeProvider } from './context/ThemeContext';
import Theme from './settings/Theme'; 
import FindFriends from "./components/find-friends";
import { supabase } from './supabaseClient';

import LiveRouter from './pages/Live/LiveRouter'; 

import ActiveCallOverlay from './components/ActiveCallOverlay';

import { LayoutGrid, Compass, Plus, MessageSquareCode, UserCheck, Phone, PhoneOff, Video, Volume2, VolumeX, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  startWhatsAppRingtone, 
  stopWhatsAppRingtone, 
  showSystemCallNotification, 
  dismissSystemCallNotification, 
  triggerCallVibration, 
  requestNotificationPermission 
} from './utils/callNotificationEngine';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

// --- CALL SYSTEM ROUTE EXTENSIONS ---
const VideoCall = lazy(() => import('./components/VideoCall'));
const VoiceCall = lazy(() => import('./components/VoiceCall'));

function App() {
  const [session, setSession] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [preferences, setPreferences] = useState({
    visual_theme: 'neon-glow',
    data_saver: false
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Passive Global Signaling Notification Hooks
  const [incomingCall, setIncomingCall] = useState(null);
  const [globalSocket, setGlobalSocket] = useState(null);
  const persistentSocketRef = useRef(null);
  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);
  const [selectedRingtone, setSelectedRingtone] = useState('whatsapp');

  // Real-time Notification & Activity Badge Counters for Bottom Navigation
  const [newVideosCount, setNewVideosCount] = useState(0);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  // Clear Home new videos badge when user views the Feed ('/')
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/video/')) {
      localStorage.setItem('mpade_last_feed_view', new Date().toISOString());
      setNewVideosCount(0);
    }
  }, [location.pathname]);

  // Fetch badges and maintain realtime subscriptions
  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;

    const fetchBadgeCounts = async () => {
      try {
        // 1. Fetch new videos count since last viewed timestamp
        const lastView = localStorage.getItem('mpade_last_feed_view');
        let videosQuery = supabase.from('videos').select('id', { count: 'exact', head: true });
        if (lastView) {
          videosQuery = videosQuery.gt('created_at', lastView);
        } else {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          videosQuery = videosQuery.gt('created_at', yesterday);
        }
        const { count: vCount } = await videosQuery;
        if (location.pathname !== '/' && !location.pathname.startsWith('/video/')) {
          setNewVideosCount(vCount || 0);
        }

        // 2. Fetch unread inbox items (unread activities + unread messages)
        const [actRes, msgRes] = await Promise.all([
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).or('unread.eq.true,status.eq.unread,status.eq.sent')
        ]);

        const unreadActs = actRes.count || 0;
        const unreadMsgs = msgRes.count || 0;
        setUnreadInboxCount(unreadActs + unreadMsgs);
      } catch (err) {
        console.warn("Badge counters sync warning:", err);
      }
    };

    fetchBadgeCounts();

    const badgeChannel = supabase
      .channel(`global-bottom-nav-badges-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, () => {
        if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/video/')) {
          setNewVideosCount(prev => prev + 1);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${uid}` }, () => {
        fetchBadgeCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchBadgeCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(badgeChannel);
    };
  }, [session?.user?.id, location.pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) setPreferences(data);
    };
    fetchPrefs();

    const prefChannel = supabase
      .channel('pref-updates')
      .on(
        'postgres_changes',
        'public',
        'user_preferences',
        `id=eq.${session.user.id}`,
        (payload) => setPreferences(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(prefChannel);
  }, [session]);

  // Handle WhatsApp Ringtone Audio, Vibration, System Notification & Title Updates on Incoming Call
  useEffect(() => {
    if (incomingCall) {
      // 1. Request Notification Permission if default
      requestNotificationPermission();

      // 2. Play Ringtone Chime
      if (!isRingtoneMuted) {
        startWhatsAppRingtone(selectedRingtone);
      }

      // 3. Trigger vibration pattern
      triggerCallVibration();

      // 4. Trigger System Native Web Notification
      const targetRoute = incomingCall.callType === 'voice' ? '/voice-call' : '/video-call';
      const targetUserId = incomingCall.callerId || incomingCall.fromUserId;
      showSystemCallNotification({
        callerUsername: incomingCall.callerUsername,
        callerAvatar: incomingCall.callerAvatar,
        callType: incomingCall.callType,
        onAccept: () => {
          navigate(`${targetRoute}?userId=${targetUserId}&role=receiver`);
          setIncomingCall(null);
        }
      });

      // 5. Update browser title
      const prevTitle = document.title;
      document.title = `📲 WhatsApp Incoming ${incomingCall.callType.toUpperCase()} Call (@${incomingCall.callerUsername})`;

      return () => {
        stopWhatsAppRingtone();
        dismissSystemCallNotification();
        document.title = prevTitle;
      };
    } else {
      stopWhatsAppRingtone();
      dismissSystemCallNotification();
    }
  }, [incomingCall, isRingtoneMuted, selectedRingtone, navigate]);

  // Persistent Global Receiver Signaling Listener Pipeline
  useEffect(() => {
    if (!session?.user?.id) {
      if (persistentSocketRef.current) {
        persistentSocketRef.current.disconnect();
        persistentSocketRef.current = null;
        setGlobalSocket(null);
      }
      return;
    }

    if (!persistentSocketRef.current) {
      persistentSocketRef.current = io(SOCKET_SERVER_URL, {
        transports: ['polling', 'websocket'],
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true
      });
    }

    const socket = persistentSocketRef.current;
    setGlobalSocket(socket);

    const handleConnect = () => {
      console.log(`🌐 Global Socket Operational: ${socket.id}`);
      socket.emit('register_user_session', { userId: session.user.id });
    };

    if (socket.connected) {
      socket.emit('register_user_session', { userId: session.user.id });
    } else {
      socket.on('connect', handleConnect);
    }

    const handleReconnect = (attemptNumber) => {
      console.log(`🔄 Global Socket Reconnected on attempt: ${attemptNumber}`);
      socket.emit('register_user_session', { userId: session.user.id });
    };
    socket.on('reconnect', handleReconnect);

    const processIncomingCallSignal = async (data) => {
      console.log("📞 Incoming Call Signal Received globally:", data);
      
      const callerId = data?.callerId || data?.fromUserId || data?.senderId || data?.userId;
      if (!callerId || callerId === session.user.id) return;

      const targetId = data?.receiverId || data?.to || data?.targetUserId || data?.targetId;
      if (targetId && targetId !== session.user.id) return;

      // Fetch caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', callerId)
        .single();

      setIncomingCall({
        callerId: callerId,
        callerUsername: callerProfile?.username || data?.callerName || data?.callerUsername || 'User',
        callerAvatar: callerProfile?.avatar_url || data?.callerAvatar || null,
        callType: data?.callType || 'video',
        roomId: data?.roomId || [session.user.id, callerId].sort().join("-")
      });
    };

    const handleInitiateSignal = (data) => {
      processIncomingCallSignal(data);
    };

    // Attach multiple incoming call signal aliases
    socket.on('incoming_call_signal', handleInitiateSignal);
    socket.on('initiate_call_signal', handleInitiateSignal);
    socket.on('incoming_call', handleInitiateSignal);
    socket.on('call_offer', handleInitiateSignal);

    const handleCallCancel = (data) => {
      console.log("📵 Call ended or cancelled signal received globally:", data);
      setIncomingCall(null);
    };

    socket.on('call_cancelled_by_caller', handleCallCancel);
    socket.on('cancel_call_signal', handleCallCancel);
    socket.on('decline_call', handleCallCancel);
    socket.on('reject_incoming_call', handleCallCancel);
    socket.on('peer_hung_up', handleCallCancel);

    // Supabase Realtime Fallback Signal Channel for "Ring Anywhere" Guarantee
    const channelName = `user-call-signals-${session.user.id}`;

    const realtimeCallChannel = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'incoming_call_broadcast' },
        (payload) => {
          const payloadData = payload?.payload || payload;
          processIncomingCallSignal(payloadData);
        }
      )
      .on(
        'broadcast',
        { event: 'cancel_call_broadcast' },
        () => {
          setIncomingCall(null);
        }
      )
      .subscribe();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect', handleReconnect);
      socket.off('incoming_call_signal', processIncomingCallSignal);
      socket.off('initiate_call_signal', handleInitiateSignal);
      socket.off('incoming_call', processIncomingCallSignal);
      socket.off('call_offer', processIncomingCallSignal);
      socket.off('call_cancelled_by_caller', handleCallCancel);
      socket.off('cancel_call_signal', handleCallCancel);
      socket.off('decline_call', handleCallCancel);
      socket.off('reject_incoming_call', handleCallCancel);
      socket.off('peer_hung_up', handleCallCancel);
      supabase.removeChannel(realtimeCallChannel);
    };
  }, [session?.user?.id]);

  if (!session) return <Auth onGuestLogin={(guestSession) => setSession(guestSession)} />;

  // --- UPDATED DYNAMIC CALL ACCEPT/REJECT HANDLERS ---
  const handleAcceptCall = () => {
    if (!incomingCall) return;

    // Guaranteed fallback target user ID check
    const targetUserId = incomingCall.callerId || incomingCall.fromUserId;
    if (!targetUserId) {
      console.error("❌ Cannot accept call: Target caller ID resolved to undefined.");
      return;
    }

    // Choose route depending on call type
    const route = incomingCall.callType === 'voice' ? '/voice-call' : '/video-call';
    navigate(`${route}?userId=${targetUserId}&role=receiver`);
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!incomingCall || !globalSocket) return;
    
    const targetUserId = incomingCall.callerId || incomingCall.fromUserId;
    globalSocket.emit('reject_incoming_call', { 
      roomId: incomingCall.roomId, 
      to: targetUserId 
    });
    setIncomingCall(null);
  };

  // Navigation Visibility Logic
  const shouldHideNav = 
    location.pathname.startsWith('/live') || 
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/messaging') || 
    location.pathname.startsWith('/video-call') || 
    location.pathname.startsWith('/voice-call') ||
    [
      '/universe-tools', 
      '/edit-profile', 
      '/share-profile',
      '/payouts', 
      '/settings',
      '/settings/security',
      '/settings/notifications',
      '/settings/language',
      '/settings/theme',
      '/find-friends'
    ].includes(location.pathname);

  const getThemeClass = () => {
    if (preferences.visual_theme === 'deep-dark') return 'bg-black';
    if (preferences.visual_theme === 'cyber-punk') return 'bg-[#0a0a00]';
    return 'bg-black'; 
  };

  return (
    <div className={`${getThemeClass()} min-h-screen text-white relative overflow-hidden font-sans select-none transition-colors duration-500`}>
      
      {preferences.visual_theme === 'neon-glow' && (
        <div className="fixed inset-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
        </div>
      )}

      <main className="h-screen pb-20 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Suspense fallback={<div className="fixed inset-0 bg-[#08080a] flex items-center justify-center text-zinc-500 text-xs tracking-wider uppercase font-bold animate-pulse">Initializing Channel...</div>}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Feed session={session} dataSaver={preferences.data_saver} />} />
              <Route path="/video/:id" element={<Feed session={session} dataSaver={preferences.data_saver} />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/messaging" element={<Messages currentUser={session.user} />} />
              
              {/* --- CALL MODULE TARGET ENGINES --- */}
              <Route path="/video-call" element={<VideoCall />} />
              <Route path="/voice-call" element={<VoiceCall />} />
              
              <Route path="/profile" element={<Profile session={session} />} />
              <Route path="/profile/:id" element={<Profile session={session} />} />
              
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/share-profile" element={<ShareProfile />} />
              <Route path="/universe-tools" element={<UniverseTools />} />
              <Route path="/live-universe" element={<LiveUniverse />} />
              <Route path="/payouts" element={<Payouts />} />
              <Route path="/find-friends" element={<FindFriends />} />

              <Route path="/live/*" element={<LiveRouter />} />
              
              <Route path="/settings" element={<Settings preferences={preferences} />} />
              <Route path="/settings/security" element={<Security />} />
              <Route path="/settings/notifications" element={<Notifications />} />
              <Route path="/settings/language" element={<Language />} />
              <Route path="/settings/theme" element={<Theme currentTheme={preferences.visual_theme} />} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>

      {/* Floating Global Incoming Call Overlay UI */}
      <ActiveCallOverlay
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onQuickReply={() => {
          handleRejectCall();
          const targetUserId = incomingCall?.callerId || incomingCall?.fromUserId;
          if (targetUserId) {
            navigate(`/messaging?userId=${targetUserId}`);
          }
        }}
        isRingtoneMuted={isRingtoneMuted}
        onToggleMute={() => setIsRingtoneMuted(prev => !prev)}
        selectedRingtone={selectedRingtone}
        onToggleRingtoneSound={() => setSelectedRingtone(prev => prev === 'whatsapp' ? 'classic' : 'whatsapp')}
      />

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Upload onComplete={() => {
              setShowUpload(false);
              navigate('/'); 
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {!shouldHideNav && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#09090e]/95 border-t border-cyan-500/20 px-6 flex items-center justify-between z-[100] backdrop-blur-xl shadow-[0_-5px_25px_rgba(0,243,255,0.08)]">
          <NavIcon 
            icon={<LayoutGrid size={22} />} 
            label="Home" 
            active={location.pathname === '/' || location.pathname.startsWith('/video/')} 
            badge={newVideosCount}
            badgeType="cyan"
            onClick={() => navigate('/')} 
          />
          <NavIcon 
            icon={<Compass size={22} />} 
            label="Discover" 
            active={location.pathname === '/discovery'} 
            onClick={() => navigate('/discovery')} 
          />

          <div className="flex-1 flex justify-center">
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowUpload(true)} 
              className="relative p-[1.5px] rounded-2xl bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-indigo-500 shadow-[0_0_20px_rgba(0,243,255,0.6)]"
            >
              <div className="w-11 h-11 bg-[#09090e] hover:bg-transparent transition-colors rounded-[14px] flex items-center justify-center">
                <Plus size={22} className="text-cyan-400 drop-shadow-[0_0_8px_#00f3ff]" />
              </div>
            </motion.button>
          </div>

          <NavIcon 
            icon={<MessageSquareCode size={22} />} 
            label="Inbox" 
            active={location.pathname === '/inbox' || location.pathname === '/messaging'} 
            badge={unreadInboxCount}
            badgeType="pink"
            onClick={() => navigate('/inbox')} 
          />
          <NavIcon 
            icon={<UserCheck size={22} />} 
            label="Profile" 
            active={location.pathname === '/profile'} 
            onClick={() => navigate('/profile')} 
          />
        </nav>
      )}
    </div>
  );
}

const NavIcon = ({ icon, label, active, badge = 0, badgeType = 'pink', onClick }) => {
  const badgeFormatted = badge > 99 ? '99+' : badge;

  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all flex-1 relative ${active ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
      <div className={`relative ${active ? 'scale-110' : 'scale-100'} transition-transform duration-200 flex items-center justify-center`}>
        {icon}
        {badge > 0 && (
          <span className={`absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#09090e] shadow-lg leading-none ${
            badgeType === 'cyan' 
              ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-black shadow-[0_0_8px_rgba(6,182,212,0.9)] font-extrabold' 
              : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
          }`}>
            {badgeFormatted}
          </span>
        )}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'opacity-100 text-cyan-300' : 'opacity-60'}`}>
        {label}
      </span>
    </button>
  );
};

export default App;
