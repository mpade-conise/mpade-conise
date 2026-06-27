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

      {!shouldHideNav && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black border-t border-white/10 px-6 flex items-center justify-between z-[100] backdrop-blur-md bg-black/90">
          <NavIcon icon={<Home size={24} />} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
          <NavIcon icon={<Search size={24} />} label="Discover" active={location.pathname === '/discovery'} onClick={() => navigate('/discovery')} />

          <div className="flex-1 flex justify-center">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowUpload(true)} className="relative w-12 h-8">
              <div className="absolute inset-0 bg-[#00f2ea] rounded-lg -translate-x-1.5 shadow-[0_0_15px_rgba(0,242,234,0.4)]" />
              <div className="absolute inset-0 bg-[#ff0050] rounded-lg translate-x-1.5 shadow-[0_0_15px_rgba(255,0,80,0.4)]" />
              <div className="relative h-full bg-white text-black rounded-lg flex items-center justify-center">
                <Plus size={20} strokeWidth={4} />
              </div>
            </motion.button>
          </div>

          <NavIcon icon={<MessageSquare size={24} />} label="Inbox" active={location.pathname === '/inbox' || location.pathname === '/messaging'} onClick={() => navigate('/inbox')} />
          <NavIcon icon={<User size={24} />} label="Profile" active={location.pathname === '/profile'} onClick={() => navigate('/profile')} />
        </nav>
      )}
    </div>
  );
}

const NavIcon = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all flex-1 ${active ? 'text-white' : 'text-zinc-500'}`}>
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>{icon}</div>
    <span className={`text-[9px] font-bold uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

export default App;
