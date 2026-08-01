import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Upload from './components/Upload';
import Discovery from './components/Discovery';
import Inbox from './components/Inbox';
import Messages from './components/Messages'; // --- NEW IMPORT ---
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

import { Home, Search, Plus, MessageSquare, User, Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

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

  // Integrated Global Receiver Signaling Listener Pipeline
  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_SERVER_URL);
    setGlobalSocket(socket);

    socket.emit('register_user_session', { userId: session.user.id });

    socket.on('incoming_call_signal', ({ fromUserId, roomId }) => {
      setIncomingCall({ fromUserId, roomId });
    });

    socket.on('peer_hung_up', () => {
      setIncomingCall(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  if (!session) return <Auth />;

  // --- UPDATED NAVIGATION METHOD FOR CALL HANDLERS ---
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    // Appending explicit role context so the receiver engine acts defensively and handles the oncoming offer stream
    navigate(`/video-call?userId=${incomingCall.fromUserId}&role=receiver`);
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!incomingCall || !globalSocket) return;
    globalSocket.emit('reject_incoming_call', { 
      roomId: incomingCall.roomId, 
      to: incomingCall.fromUserId 
    });
    setIncomingCall(null);
  };

  // Navigation Visibility Logic
  const shouldHideNav = 
    location.pathname.startsWith('/live') || 
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/messaging') || // --- NEW: HIDE NAV FOR MESSAGING ---
    location.pathname.startsWith('/video-call') || // --- CALL MASK ENGINE EXCLUSIONS ---
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
    <div className={`${getThemeClass()} min-h-screen text-white relative overflow-hidden font-sans select-none transition-colors duration-500 md:flex`}>
      
      {preferences.visual_theme === 'neon-glow' && (
        <div className="fixed inset-0 pointer-events-none z-0">
           <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[140px] rounded-full" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-500/10 blur-[140px] rounded-full" />
        </div>
      )}

      {/* RE-STYLED NAV: Desktop/Tablet Left Deck Navigation (Hides TikTok Bottom Bar Style) */}
      {!shouldHideNav && (
        <nav className="fixed md:relative bottom-0 left-0 right-0 md:right-auto md:w-64 h-20 md:h-screen bg-[#0a0a10]/90 backdrop-blur-xl border-t md:border-t-0 md:border-r border-cyan-500/20 px-6 md:py-8 flex md:flex-col items-center md:items-start justify-between md:justify-start gap-8 z-[100] shadow-[0_0_30px_rgba(0,243,255,0.05)]">
          
          {/* Brand Identity Header for Desktop */}
          <div className="hidden md:flex items-center gap-3 px-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f3ff]" />
            <h1 className="font-extrabold tracking-widest text-lg bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
              MPADE<span className="text-white">.UNIVERSE</span>
            </h1>
          </div>

          <NavIcon icon={<Home size={22} />} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
          <NavIcon icon={<Search size={22} />} label="Discover" active={location.pathname === '/discovery'} onClick={() => navigate('/discovery')} />

          {/* RE-STYLED CREATE BUTTON: Hexagonal Cyber Pulse (No cyan/red offset TikTok look) */}
          <div className="flex-1 md:flex-none flex justify-center w-full md:my-2">
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowUpload(true)} 
              className="relative group w-12 h-12 md:w-full md:h-12 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 p-[1px] shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all"
            >
              <div className="w-full h-full bg-[#0d0d14] rounded-xl flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors">
                <Plus size={20} className="text-cyan-400 group-hover:text-white" />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider text-white">Create Asset</span>
              </div>
            </motion.button>
          </div>

          <NavIcon icon={<MessageSquare size={22} />} label="Inbox" active={location.pathname === '/inbox' || location.pathname === '/messaging'} onClick={() => navigate('/inbox')} />
          <NavIcon icon={<User size={22} />} label="Profile" active={location.pathname === '/profile'} onClick={() => navigate('/profile')} />
        </nav>
      )}

      <main className="h-screen flex-1 pb-20 md:pb-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Suspense fallback={<div className="fixed inset-0 bg-[#08080a] flex items-center justify-center text-cyan-400 text-xs tracking-widest uppercase font-bold animate-pulse">Initializing Deck...</div>}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Feed session={session} dataSaver={preferences.data_saver} />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/messaging" element={<Messages currentUser={session.user} />} /> {/* --- NEW ROUTE --- */}
              
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

      {/* Floating Incoming Call Overlay UI */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center backdrop-blur-md"
          >
            <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full flex items-center justify-center animate-bounce">
                <Phone size={36} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Incoming Video Call</h3>
                <p className="text-sm text-zinc-400 mt-1">Someone is calling you...</p>
              </div>
              
              <div className="flex items-center gap-6 w-full justify-center mt-2">
                <button 
                  type="button"
                  onClick={handleRejectCall}
                  className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/20"
                >
                  <PhoneOff size={24} />
                </button>

                <button 
                  type="button"
                  onClick={handleAcceptCall}
                  className="p-4 bg-green-600 hover:bg-green-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-green-600/20 animate-pulse"
                >
                  <Phone size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}

const NavIcon = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex md:flex-row items-center gap-3 transition-all flex-1 md:flex-none md:w-full md:px-4 md:py-3 md:rounded-xl ${active ? 'text-cyan-400 md:bg-cyan-500/10 md:border md:border-cyan-500/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>{icon}</div>
    <span className={`text-[9px] md:text-sm font-bold uppercase md:capitalize tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

export default App;
