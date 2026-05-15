import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { 
  Users, Gift, BarChart3, Share2, Clock, 
  MessageCircle, Settings, ShieldAlert, List, 
  HelpCircle, BarChart, Heart, Smile, X, Check,
  UserPlus, Swords, Mic, MicOff, Video, VideoOff, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader'; 
import BattleOverlay from './BattleOverlay'; // New: Battle Logic Component

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  // --- CORE STATE ---
  const [streamData, setStreamData] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [reactions, setReactions] = useState([]); 
  const [activeGift, setActiveGift] = useState(null);
  
  // --- UI & FEATURE MODES ---
  const [activePanel, setActivePanel] = useState(null); // 'analytics', 'settings', 'guests', 'battle'
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // --- DATA FETCH & REALTIME --- (Logic remains same as your original)
  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel(`live_room_${streamId}`);
    // ... (Your existing fetchAndSubscribe logic)
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [streamId]);

  // --- VIDEO SETUP ---
  useEffect(() => {
    let mediaStream = null;
    async function startBroadcasting() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, audio: true 
        });
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) { console.error("Broadcasting failed", err); }
    }
    startBroadcasting();
    return () => mediaStream?.getTracks().forEach(t => t.stop());
  }, []);

  if (!streamData) return <div className="h-screen bg-black flex items-center justify-center font-black italic text-red-500 animate-pulse">SYNCING WITH SERVER...</div>;

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans">
      
      {/* 1. TOP SECTION: THE STATUS BAR */}
      <div className="absolute top-0 left-0 right-0 z-[60] p-4 pt-10 bg-gradient-to-b from-black/80 to-transparent">
        <StreamHeader 
          data={streamData} 
          isHost={true} 
          viewerCount={viewers.length}
          onLeave={() => navigate('/live')}
        />
      </div>

      {/* 2. CENTER: THE DYNAMIC STAGE (SPLIT SCREEN LOGIC) */}
      <div className="absolute inset-0 z-0 flex transition-all duration-500 bg-zinc-900">
        <motion.div 
          animate={{ width: (isBattleMode || isGuestMode) ? '50%' : '100%' }}
          className="relative h-full overflow-hidden border-r border-white/5"
        >
           <video 
            ref={videoRef} autoPlay muted playsInline 
            className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : 'block'}`} 
          />
          {isCameraOff && <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700 font-black tracking-widest uppercase italic">Camera Off</div>}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
        </motion.div>

        {/* The Guest/Challenger Slot */}
        <AnimatePresence>
          {(isBattleMode || isGuestMode) && (
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="w-1/2 h-full bg-zinc-800 relative"
            >
              <div className="absolute inset-0 flex items-center justify-center border-l border-cyan-500/30">
                <p className="text-[10px] font-black uppercase text-zinc-500">Waiting for Guest...</p>
              </div>
              {isBattleMode && <BattleOverlay score={{ host: 450, challenger: 120 }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. CENTER OVERLAYS: GIFTS & REACTIONS */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {activeGift && <GiftAlertOverlay gift={activeGift} />}
        </AnimatePresence>
        
        {/* Reaction Fountain (Right Side) */}
        <div className="absolute bottom-40 right-6 h-80 w-16 flex flex-col-reverse items-center">
           {reactions.map(r => (
            <motion.div key={r.id} initial={{ y: 0, opacity: 1 }} animate={{ y: -500, opacity: 0, x: Math.random() * 60 - 30 }} className="text-3xl mb-2">❤️</motion.div>
          ))}
        </div>
      </div>

      {/* 4. BOTTOM INTERACTION AREA */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        
        {/* Transparent Floating Chat (Pushed left) */}
        <div className="h-56 w-full max-w-[320px] pointer-events-auto">
          <ChatBox streamId={streamId} isHost={true} transparent={true} />
        </div>

        {/* 5. THE PROFESSIONAL COMMAND DOCK */}
        <div className="w-full bg-black/40 backdrop-blur-3xl rounded-[28px] border border-white/10 p-2 flex items-center justify-between pointer-events-auto shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Left: Device Toggles */}
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5'}`}>
              {isMuted ? <MicOff size={18}/> : <Mic size={18}/>}
            </button>
            <button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-3 rounded-full transition-colors ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/5'}`}>
              {isCameraOff ? <VideoOff size={18}/> : <Video size={18}/>}
            </button>
          </div>

          {/* Center: High-End Feature Tabs */}
          <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
            <button 
              onClick={() => {setIsBattleMode(!isBattleMode); setIsGuestMode(false)}}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isBattleMode ? 'bg-[#fe2c55] text-white shadow-lg shadow-red-500/20' : 'text-zinc-400 hover:text-white'}`}
            >
              <Swords size={16}/>
              <span className="text-[10px] font-black uppercase tracking-widest">Battle</span>
            </button>
            <button 
              onClick={() => {setIsGuestMode(!isGuestMode); setIsBattleMode(false)}}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isGuestMode ? 'bg-cyan-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              <UserPlus size={16}/>
              <span className="text-[10px] font-black uppercase tracking-widest">Guest</span>
            </button>
          </div>

          {/* Right: Menu Opener */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setActivePanel('analytics')}
              className="p-3 bg-white/5 rounded-full text-zinc-300 hover:text-red-500 transition-colors"
            >
              <BarChart3 size={18}/>
            </button>
            <button 
              onClick={() => setActivePanel('settings')}
              className="p-3 bg-white/5 rounded-full text-zinc-300"
            >
              <Settings size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* 6. UNIVERSAL DRAWER (SLIDE UP PANELS) */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-[32px] z-[110] max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4" />
              
              <div className="p-6">
                {activePanel === 'analytics' && <LiveAnalyticsPanel streamId={streamId} />}
                {activePanel === 'settings' && (
                  <div className="space-y-6 pb-12">
                    <h2 className="text-xl font-black italic tracking-widest uppercase text-red-500">Stream Settings</h2>
                    <div className="grid grid-cols-2 gap-4">
                       <SettingsCard icon={<ShieldAlert/>} title="Moderation" desc="Blocked words & filters" />
                       <SettingsCard icon={<List/>} title="Polls" desc="Create viewer engagement" />
                       <SettingsCard icon={<Share2/>} title="Share" desc="Promote your stream" />
                       <SettingsCard icon={<Smile/>} title="Beauty" desc="AR Face Filters" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

// Sub-component for Settings UI
const SettingsCard = ({ icon, title, desc }) => (
  <button className="flex flex-col gap-3 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/50 transition-all text-left group">
    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors w-fit">
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div>
      <h3 className="text-xs font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-[10px] text-zinc-500 leading-tight">{desc}</p>
    </div>
  </button>
);

export default StreamDashboard;
