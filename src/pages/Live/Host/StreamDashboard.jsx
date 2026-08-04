// src/pages/Live/Host/StreamDashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Gift, BarChart3, Share2, HelpCircle, BarChart, 
  Smile, X, UserPlus, Swords, Mic, MicOff, Video, VideoOff, Settings, Radio, UserCheck, UserX
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
import SettingsPanel from '../Shared/setting';

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  // --- UI SWITCHES & TOGGLES ---
  const [activePanel, setActivePanel] = useState(null); 
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');

  // --- COMPONENT DATA STORAGE ---
  const [streamData, setStreamData] = useState(null);
  const [reactions, setReactions] = useState([]); 
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });

  // --- CO-HOSTING & GUEST REQUESTS STATE ---
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeCoHosts, setActiveCoHosts] = useState([]);

  // DOM node link to explicitly bind remote challenger/cohost streams from WebRTC hook
  const challengerVideoRef = useRef(null);

  // 1. EXECUTE ABSTRACTED WEBSOCKET NETWORK CONTROLLER
  const {
    socket, viewers, joinAlert, activeGift, setActiveGift, incomingInvite, setIncomingInvite, reactionTrigger
  } = useStreamSocket(streamId, true);

  // 2. EXECUTE ABSTRACTED WEBRTC HARDWARE CONTROLLER
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

  // Listen for Live Guest Requests for Co-Hosting
  useEffect(() => {
    if (!streamId) return;

    // Fetch initial pending requests
    supabase
      .from('live_guest_requests')
      .select('*')
      .eq('stream_id', streamId)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (data) setPendingRequests(data);
      });

    // Real-time subscription for incoming guest join requests
    const channel = supabase
      .channel(`host_requests_${streamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_guest_requests', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          setPendingRequests(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

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
      const peerId = incomingInvite.senderHostId || incomingInvite.host_id || '';
      const peerStreamId = incomingInvite.senderStreamId || incomingInvite.hostRoomId || '';

      if (!peerId) {
        console.error("❌ Cannot accept battle invite: Missing identifier key string inside payload.");
        return;
      }

      socket.emit('accept_battle_invite', { 
        hostRoomId: streamId, 
        challengerRoomId: peerStreamId 
      });
      
      setIsBattleMode(true);
      setIncomingInvite(null);
    } catch (err) {
      console.error("⚠️ Battle connection setup failed:", err);
    }
  };

  // Co-Host Accept / Reject Actions
  const handleAcceptGuest = async (request) => {
    await supabase
      .from('live_guest_requests')
      .update({ status: 'approved' })
      .eq('id', request.id);

    setActiveCoHosts(prev => [...prev, request]);
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));

    if (socket) {
      socket.emit('approve_cohost', { streamId, guestId: request.user_id });
    }
  };

  const handleRejectGuest = async (requestId) => {
    await supabase
      .from('live_guest_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Video Filter System Broadcasting
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

        {/* CO-HOST PENDING REQUESTS BANNER OVERLAY */}
        <AnimatePresence>
          {pendingRequests.length > 0 && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[65] w-full max-w-sm px-4">
              {pendingRequests.map(req => (
                <motion.div 
                  key={req.id}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="bg-zinc-900/90 backdrop-blur-xl border border-[#fe2c55]/50 p-3 rounded-2xl shadow-2xl flex items-center justify-between mb-2"
                >
                  <div className="flex items-center gap-3">
                    <img src={req.avatar_url} className="w-9 h-9 rounded-full border border-[#fe2c55]" alt="" />
                    <div>
                      <p className="text-xs font-bold">{req.username}</p>
                      <p className="text-[9px] text-white/50 uppercase font-semibold">Wants to join live panel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleAcceptGuest(req)} className="p-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-full transition-all">
                      <UserCheck size={16} />
                    </button>
                    <button onClick={() => handleRejectGuest(req.id)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-full transition-all">
                      <UserX size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* 2. LIVE STAGE MULTIPLEX VIEWPORT MATRIX (Grid adjusts for co-hosts/battles) */}
        <div className={`absolute inset-0 z-0 grid gap-0.5 transition-all duration-500 bg-zinc-900 ${isBattleMode || activeCoHosts.length > 0 ? 'grid-cols-2' : 'grid-cols-1 grid-rows-1'}`}>
          
          {/* PANEL A: PRIMARY HOST (YOU) */}
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

            <div className="absolute bottom-3 left-4 z-20 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/5 text-[10px] uppercase font-bold tracking-wider">
              @{streamData?.host?.username} <span className="text-cyan-400 font-black ml-1">● Host</span>
            </div>
            
            {isBattleMode && (
              <BattleOverlay 
                score={battleScores} 
                hostProfile={streamData?.host} 
                coHost={{ username: 'Challenger' }} 
                onInviteClick={() => {}} 
              />
            )}
          </div>

          {/* PANEL B: REMOTE CO-HOST / CHALLENGER VIDEO PANEL */}
          {(isBattleMode || activeCoHosts.length > 0) && (
            <div className="relative h-full w-full overflow-hidden bg-zinc-900 border-l border-white/10">
              <video 
                ref={challengerVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-3 left-4 z-20 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/5 text-[10px] uppercase font-bold tracking-wider">
                {activeCoHosts[0]?.username || 'Co-Host Guest'} <span className="text-[#fe2c55] font-black ml-1">● Live</span>
              </div>
            </div>
          )}

        </div>

        {/* Control Console Dock Bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
          <div className="h-48 w-full max-w-[320px] pointer-events-auto overflow-y-auto floating-chat-container">
            <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
          </div>
          
          <nav className="w-full max-w-xl mx-auto bg-zinc-950/80 backdrop-blur-2xl rounded-full border border-white/10 p-1.5 pointer-events-auto">
            <ul className="flex items-center justify-between w-full px-4">
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
              socket={socket}
              currentCoHosts={activeCoHosts}
              onDropUser={(user) => setActiveCoHosts(prev => prev.filter(c => c.id !== user.id))}
              onDropAll={() => setActiveCoHosts([])}
              onClose={() => setActivePanel(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
