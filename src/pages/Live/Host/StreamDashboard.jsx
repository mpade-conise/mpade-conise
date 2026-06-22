import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Gift, BarChart3, Share2, HelpCircle, BarChart, 
  Smile, X, UserPlus, Swords, Mic, MicOff, Video, VideoOff, Settings, Radio
} from 'lucide-react';

// Isolated Logic Hook Injectors
import { useStreamSocket } from './useStreamSocket';
import { useStreamWebRTC } from './useStreamWebRTC';

// Subcomponents
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader'; 
import BattleOverlay from './BattleOverlay';
import SettingsPanel from '../Shared/setting'; // 👈 Imported settings feature panel

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  // --- UI SWITCHES & TOGGLES ---
  const [activePanel, setActivePanel] = useState(null); 
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');

  // --- COMPONENT DATA STORAGE ---
  const [streamData, setStreamData] = useState(null);
  const [coHosts, setCoHosts] = useState([]); 
  const [reactions, setReactions] = useState([]); 
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });

  // DOM node link to explicitly bind remote challenger streams from the WebRTC hook
  const challengerVideoRef = useRef(null);

  // 1. EXECUTE ABSTRACTED WEBSOCKET NETWORK CONTROLLER
  const {
    socket, viewers, joinAlert, activeGift, setActiveGift, incomingInvite, setIncomingInvite, reactionTrigger
  } = useStreamSocket(streamId, true);

  // 2. EXECUTE ABSTRACTED WEBRTC HARDWARE CONTROLLER (Passing challengerVideoRef)
  const { localVideoRef, hardwareReady } = useStreamWebRTC(streamId, socket, isCameraOff, isMuted, challengerVideoRef);

  // Fetch Metadata & Sync Database Lifecycle Status
  useEffect(() => {
    async function fetchMeta() {
      const { data } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();
      
      if (data) {
        setStreamData(data);
        setBattleScores({ host: data.host_battle_points || 0, challenger: data.challenger_battle_points || 0 });
      }
    }
    fetchMeta();
  }, [streamId]);

  useEffect(() => {
    if (hardwareReady) {
      supabase.from('live_streams').update({ status: 'live' }).eq('id', streamId).then(() => {
        console.log("🚀 Media stream status set to active in DB.");
      });
    }
  }, [hardwareReady, streamId]);

  // Handle local reactions cleanly when hook emits a socket event capture
  useEffect(() => {
    if (reactionTrigger) {
      setReactions(prev => [...prev, reactionTrigger]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== reactionTrigger.id)), 2000);
    }
  }, [reactionTrigger]);

  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socket) return;
    try {
      await supabase.from('live_streams').update({ co_host_id: incomingInvite.senderHostId }).eq('id', streamId);
      socket.emit('accept_battle_invite', { hostRoomId: streamId, challengerRoomId: incomingInvite.senderStreamId });
      setCoHosts([{ id: incomingInvite.senderHostId, username: incomingInvite.senderUsername }]);
      setIsBattleMode(true);
      setIncomingInvite(null);
    } catch (err) {
      console.error("⚠️ Battle connection setup failed:", err);
    }
  };

  // --- ADDED SYSTEM CONTROLLERS LINKED VIA GLOBAL WINDOW BROADCASTING ---
  useEffect(() => {
    const fxState = {
      smoothing: 3, jawline: 0, eyes: 0, slim: 0,
      lut: 'none', fx: 'none'
    };

    const handleFilterChange = (e) => {
      const videoElement = localVideoRef.current;
      if (!videoElement) return;

      const { type, key, value } = e.detail;

      if (type === 'beautify') fxState.smoothing = parseFloat(value);
      if (type === 'morph') fxState[key] = parseFloat(value);
      if (type === 'lut') fxState.lut = key;
      if (type === 'fx') fxState.fx = key;

      let filterString = '';
      let transformString = 'scale-x(-1)';

      if (fxState.lut === 'retro') filterString += 'sepia(35%) contrast(110%) saturate(90%) hue-rotate(-5deg) ';
      if (fxState.lut === 'cyberpunk') filterString += 'hue-rotate(135deg) saturate(165%) contrast(115%) ';
      if (fxState.lut === 'noir') filterString += 'grayscale(100%) contrast(140%) brightness(95%) ';
      if (fxState.lut === 'golden') filterString += 'sepia(20%) saturate(140%) brightness(105%) hue-rotate(10deg) ';
      if (fxState.lut === 'tropic') filterString += 'saturate(180%) contrast(105%) hue-rotate(-5deg) ';

      if (fxState.fx === 'vhs') filterString += 'contrast(120%) saturate(130%) hue-rotate(15deg) brightness(105%) ';
      if (fxState.fx === 'manga') filterString += 'grayscale(100%) contrast(300%) ';
      if (fxState.fx === 'thermal') filterString += 'hue-rotate(240deg) saturate(200%) invert(100%) ';

      if (fxState.smoothing > 0) {
        filterString += `blur(${fxState.smoothing * 0.15}px) contrast(${100 + (fxState.smoothing * 1.5)}%) brightness(${100 + (fxState.smoothing * 1.2)}%) `;
      }

      if (fxState.slim > 0 || fxState.jawline > 0) {
        const horizontalCompression = 1 - (fxState.slim * 0.015) - (fxState.jawline * 0.008);
        transformString += ` scaleX(${horizontalCompression})`;
      }
      if (fxState.eyes > 0) {
        const eyeExpansion = 1 + (fxState.eyes * 0.012);
        transformString += ` scaleY(${eyeExpansion})`;
      }

      videoElement.style.filter = filterString.trim() || 'none';
      videoElement.style.transform = transformString;
    };

    window.addEventListener('mpade-video-filter', handleFilterChange);
    return () => window.removeEventListener('mpade-video-filter', handleFilterChange);
  }, [localVideoRef]);

  if (!streamData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-black italic text-cyan-400 underline animate-pulse tracking-widest">
        CONNECTING TO SOCKET MATRIX...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans flex flex-row">
      
      {/* MAIN VIEWPORT MATRIX DOCK CONTAINER */}
      <div className="relative flex-1 h-full overflow-hidden">
        
        {/* 1. DYNAMIC GIFT ALERTS INTERFACE OVERLAY */}
        <GiftAlertOverlay activeGift={activeGift} setActiveGift={setActiveGift} />

        {/* Header Overlay Panel */}
        <div className="absolute top-0 left-0 right-0 z-[60] p-4 pt-10 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-3">
          <StreamHeader data={streamData} isHost={true} viewerCount={viewers.length} onLeave={() => navigate('/live')} />
        </div>

        {/* 2. LIVE STAGE VIEWPORT MATRIX (DYNAMICS CO-HOST SPLIT SCREEN CONFIG) */}
        <div className={`absolute inset-0 z-0 grid ${(!isBattleMode && coHosts.length === 0) ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5 transition-all duration-500 bg-zinc-900`}>
          
          {/* PANEL A: THE PRIMARY HOST (YOU) */}
          <div className="relative h-full w-full overflow-hidden bg-zinc-950">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} 
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-zinc-900 font-black tracking-widest text-xs italic">
                Camera Off
              </div>
            )}
            
            {/* Universal Overlay Widget Layout */}
            {isBattleMode && (
              <BattleOverlay 
                score={battleScores} 
                hostProfile={streamData?.host} 
                coHost={coHosts[0] || { username: 'Challenger' }} 
                onInviteClick={() => setActivePanel('invite')} 
              />
            )}
          </div>

          {/* PANEL B: THE PK CHALLENGER / GUEST SPLIT */}
          {(isBattleMode || coHosts.length > 0) && (
            <div className="relative h-full w-full overflow-hidden bg-zinc-950 border-l border-white/5">
              
              {/* Live active peer playback rendering stream layout */}
              <video 
                ref={challengerVideoRef}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover bg-zinc-950 position-relative z-10"
              />

              {/* Absolute backdrop layout placeholder during handshake initialization */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-0">
                <div className="w-6 h-6 border-2 border-t-cyan-400 border-white/10 rounded-full animate-spin mb-2" />
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest animate-pulse">
                  Syncing Challenger...
                </p>
              </div>
              
              {/* Tag Badge Display for the Opponent */}
              <div className="absolute bottom-20 left-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-cyan-400 z-20 border border-cyan-500/20">
                @{coHosts[0]?.username || 'Challenger'}
              </div>
            </div>
          )}
        </div>

        {/* Control Console Dock Bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
          {/* UPGRADED CHAT BOX STREAM PANEL FEATURE */}
          <div className="h-48 w-full max-w-[320px] pointer-events-auto overflow-y-auto floating-chat-container">
            <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
          </div>
          
          <nav className="w-full max-w-xl mx-auto bg-zinc-950/80 backdrop-blur-2xl rounded-full border border-white/10 p-1.5 pointer-events-auto">
            <ul className="flex items-center justify-between w-full px-1">
              <li>
                <button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-2.5 rounded-full text-white transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-white/5 hover:bg-white/10'}`}>
                  {isCameraOff ? <VideoOff size={16}/> : <Video size={16}/>}
                </button>
              </li>
              <li>
                <button onClick={() => setIsMuted(!isMuted)} className={`p-2.5 rounded-full text-white transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/5 hover:bg-white/10'}`}>
                  {isMuted ? <MicOff size={16}/> : <Mic size={16}/>}
                </button>
              </li>
              <li>
                <button onClick={() => setIsBattleMode(!isBattleMode)} className={`p-2.5 rounded-full transition-colors ${isBattleMode ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                  <Swords size={16}/>
                </button>
              </li>
              {/* SETTINGS ICON ACTION DOCK BUTTON ELEMENT */}
              <li>
                <button 
                  onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')} 
                  className={`p-2.5 rounded-full transition-colors ${activePanel === 'settings' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  <Settings size={16}/>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Pop-up Invite Manager Alerts */}
        <AnimatePresence>
          {incomingInvite && (
            <div className="absolute inset-0 pointer-events-none z-[70] flex items-center justify-center">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="bg-zinc-950/95 border-2 border-cyan-500/50 p-4 rounded-2xl pointer-events-auto text-center shadow-2xl">
                <p className="text-[11px] font-bold">@{incomingInvite.senderUsername} challenges you!</p>
                <button onClick={handleAcceptInvite} className="bg-cyan-500 text-black px-4 py-2 mt-2 rounded-xl text-xs font-black tracking-wide hover:bg-cyan-400 transition-colors">
                  Accept Live
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. SETTINGS INTERACTIVE DRAWER OVERLAY PANEL SIDEBAR */}
      <AnimatePresence>
        {activePanel === 'settings' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-80 h-full bg-zinc-950 border-l border-white/10 z-[100] relative pointer-events-auto"
          >
            <SettingsPanel 
              streamId={streamId} 
              streamData={streamData} 
              onClose={() => setActivePanel(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
