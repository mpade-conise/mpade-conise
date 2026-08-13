// src/pages/Live/Host/StreamDashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Video, UserX
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
import GuestManager from '../Shared/GuestManager';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';

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

  // Monitor challengerVideoRef attachment state
  useEffect(() => {
    console.log("🔍 [challengerVideoRef] DOM Node Current Ref:", challengerVideoRef.current);
  });

  // 1. EXECUTE ABSTRACTED WEBSOCKET NETWORK CONTROLLER
  const {
    socket, viewers, joinAlert, activeGift, setActiveGift, incomingInvite, setIncomingInvite, reactionTrigger
  } = useStreamSocket(streamId, true);

  // 2. EXECUTE ABSTRACTED WEBRTC HARDWARE CONTROLLER
  const { localVideoRef, hardwareReady, primaryRemoteStream } = useStreamWebRTC(streamId, socket, isCameraOff, isMuted, challengerVideoRef);

  // Fetch Metadata & Sync Database Lifecycle Status
  useEffect(() => {
    async function fetchMeta() {
      console.log("📡 [StreamDashboard] Fetching stream metadata for ID:", streamId);
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();
      
      if (error) {
        console.error("❌ [StreamDashboard] Error fetching stream metadata:", error);
      }
      if (data) {
        console.log("✅ [StreamDashboard] Stream metadata loaded:", data);
        setStreamData(data);
        setBattleScores({ host: data.host_battle_points || 0, challenger: data.challenger_battle_points || 0 });
      }
    }
    fetchMeta();
  }, [streamId]);

  useEffect(() => {
    if (hardwareReady) {
      console.log("🚀 [StreamDashboard] Hardware ready. Updating stream DB status to 'live'...");
      supabase.from('live_streams').update({ status: 'live' }).eq('id', streamId).then(({ error }) => {
        if (error) console.error("❌ [StreamDashboard] DB Status update failed:", error);
        else console.log("🚀 [StreamDashboard] Media stream status set to active in DB.");
      });
    }
  }, [hardwareReady, streamId]);

  // Fetch Existing Approved Co-Hosts & Listen for Guest Requests
  useEffect(() => {
    if (!streamId) return;

    console.log("👥 [StreamDashboard] Initializing guest request database listeners for stream:", streamId);

    // Fetch initial approved co-hosts
    supabase
      .from('live_guest_requests')
      .select('*')
      .eq('stream_id', streamId)
      .eq('status', 'approved')
      .then(({ data, error }) => {
        if (error) console.error("❌ [StreamDashboard] Error fetching initial approved co-hosts:", error);
        if (data) {
          console.log("✅ [StreamDashboard] Initial approved co-hosts fetched:", data);
          setActiveCoHosts(data);
        }
      });

    // Fetch initial pending requests
    supabase
      .from('live_guest_requests')
      .select('*')
      .eq('stream_id', streamId)
      .eq('status', 'pending')
      .then(({ data, error }) => {
        if (error) console.error("❌ [StreamDashboard] Error fetching initial pending guest requests:", error);
        if (data) {
          console.log("✅ [StreamDashboard] Initial pending guest requests fetched:", data);
          setPendingRequests(data);
        }
      });

    // Real-time subscription for incoming guest join requests
    const channel = supabase
      .channel(`host_requests_${streamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_guest_requests', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          console.log("📥 [Supabase Realtime] New guest request INSERT received:", payload.new);
          if (payload.new.status === 'pending') {
            setPendingRequests(prev => [...prev, payload.new]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `stream_id=eq.${streamId}` },
        (payload) => {
          console.log("🔄 [Supabase Realtime] Guest request UPDATE received:", payload.new);
          if (payload.new.status === 'disconnected' || payload.new.status === 'rejected') {
            setActiveCoHosts(prev => prev.filter(c => c.id !== payload.new.id));
            setPendingRequests(prev => prev.filter(r => r.id !== payload.new.id));
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 [Supabase Realtime] Guest subscription channel status: ${status}`);
      });

    return () => {
      console.log("🧹 [StreamDashboard] Cleaning up guest realtime subscription channel.");
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Log active co-hosts state variations
  useEffect(() => {
    console.log("📊 [StreamDashboard] Active Co-Hosts state updated:", activeCoHosts);
  }, [activeCoHosts]);

  // Handle local reactions cleanly when hook emits a socket event capture
  useEffect(() => {
    if (reactionTrigger) {
      setReactions(prev => [...prev, reactionTrigger]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== reactionTrigger.id)), 2000);
    }
  }, [reactionTrigger]);

  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socket) {
      console.warn("⚠️ [StreamDashboard] Cannot accept invite - missing socket or incomingInvite object.");
      return;
    }
    try {
      const peerId = incomingInvite.senderHostId || incomingInvite.host_id || '';
      const peerStreamId = incomingInvite.senderStreamId || incomingInvite.hostRoomId || '';

      if (!peerId) {
        console.error("❌ Cannot accept battle invite: Missing identifier key string inside payload.");
        return;
      }

      console.log(`⚔️ [StreamDashboard] Accepting battle invite from peerId: ${peerId}, peerStreamId: ${peerStreamId}`);
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

  // Quick Accept/Reject Actions from Floating Alert Banner
  const handleAcceptGuest = async (request, mode = 'video') => {
    console.log(`✅ [StreamDashboard] Accepting guest request for user: ${request.username} (${request.user_id}) in mode: ${mode}`);
    const { error } = await supabase
      .from('live_guest_requests')
      .update({ status: 'approved', mode })
      .eq('id', request.id);

    if (error) {
      console.error("❌ [StreamDashboard] Failed to update guest status in Supabase:", error);
    }

    setActiveCoHosts(prev => [...prev, { ...request, mode }]);
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));

    if (socket) {
      console.log("📡 [StreamDashboard] Emitting 'approve_cohost' event via Socket.io:", { streamId, guestId: request.user_id, mode });
      socket.emit('approve_cohost', { streamId, guestId: request.user_id, mode });
    } else {
      console.error("❌ [StreamDashboard] Socket unavailable! Guest approval socket signal was not dispatched.");
    }
  };

  const handleRejectGuest = async (requestId) => {
    console.log(`❌ [StreamDashboard] Rejecting guest request ID: ${requestId}`);
    const { error } = await supabase
      .from('live_guest_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error("❌ [StreamDashboard] Failed to update rejected guest status in Supabase:", error);
    }

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
          {pendingRequests.length > 0 && activePanel !== 'guests' && (
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
                    <img src={req.avatar_url || 'https://via.placeholder.com/150'} className="w-9 h-9 rounded-full border border-[#fe2c55]" alt="" />
                    <div>
                      <p className="text-xs font-bold">{req.username}</p>
                      <p className="text-[9px] text-white/50 uppercase font-semibold">Wants to join live panel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleAcceptGuest(req, 'audio')} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[9px] font-bold rounded-lg flex items-center gap-1 transition-all">
                      <Mic size={12} /> Audio
                    </button>
                    <button onClick={() => handleAcceptGuest(req, 'video')} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[9px] font-bold rounded-lg flex items-center gap-1 transition-all">
                      <Video size={12} /> Video
                    </button>
                    <button onClick={() => handleRejectGuest(req.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all ml-1">
                      <UserX size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* 2. DYNAMIC STAGE VIEWPORT WITH 50/50 SPLITTING LINE */}
        <div className="absolute inset-0 z-0 bg-zinc-950 overflow-hidden">
          <DynamicStreamGrid 
            streamId={streamId}
            hostVideo={
              <div className="relative w-full h-full">
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
                {isBattleMode && (
                  <BattleOverlay 
                    score={battleScores} 
                    hostProfile={streamData?.host} 
                    coHost={{ username: 'Challenger' }} 
                    onInviteClick={() => {}} 
                  />
                )}
              </div>
            }
            hostInfo={{
              username: streamData?.host?.username || 'Host 1',
              avatar_url: streamData?.host?.avatar_url
            }}
            coHosts={activeCoHosts}
            coHostStream={primaryRemoteStream}
            coHostVideo={
              primaryRemoteStream ? null : (
                <div className="relative w-full h-full">
                  <video 
                    ref={challengerVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )
            }
            coHostInfo={activeCoHosts[0] ? activeCoHosts[0] : (primaryRemoteStream ? { username: 'Co-Host' } : null)}
            isHostView={true}
          />
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
                  onClick={() => setActivePanel(activePanel === 'guests' ? null : 'guests')} 
                  className={`p-2.5 rounded-full transition-colors relative ${activePanel === 'guests' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  <Users size={16}/>
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#fe2c55] text-white text-[9px] font-black rounded-full flex items-center justify-center border border-zinc-950">
                      {pendingRequests.length}
                    </span>
                  )}
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

      {/* 3. INTERACTIVE DRAWER OVERLAY PANEL SIDEBAR */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-80 h-full bg-zinc-950 border-l border-white/10 z-[100] relative pointer-events-auto p-4 overflow-y-auto"
          >
            {activePanel === 'guests' && (
              <GuestManager 
                streamId={streamId}
                activeGuests={activeCoHosts}
                setActiveGuests={setActiveCoHosts}
                pendingRequests={pendingRequests}
                setPendingRequests={setPendingRequests}
                onBack={() => setActivePanel(null)}
                socket={socket}
              />
            )}

            {activePanel === 'settings' && (
              <SettingsPanel 
                streamId={streamId} 
                streamData={streamData} 
                socket={socket}
                currentCoHosts={activeCoHosts}
                onDropUser={(user) => setActiveCoHosts(prev => prev.filter(c => c.id !== user.id))}
                onDropAll={() => setActiveCoHosts([])}
                onClose={() => setActivePanel(null)} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
