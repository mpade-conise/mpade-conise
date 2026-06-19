// StreamDashboard.jsx
import React, { useEffect, useState } from 'react';
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

  // 1. EXECUTE ABSTRACTED WEBSOCKET NETWORK CONTROLLER
  const {
    socket, viewers, joinAlert, activeGift, setActiveGift, incomingInvite, setIncomingInvite, reactionTrigger
  } = useStreamSocket(streamId, true);

  // 2. EXECUTE ABSTRACTED WEBRTC HARDWARE CONTROLLER
  const { localVideoRef, hardwareReady } = useStreamWebRTC(streamId, socket, isCameraOff, isMuted);

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

  if (!streamData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-black italic text-cyan-400 underline animate-pulse tracking-widest">
        CONNECTING TO SOCKET MATRIX...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans">
      {/* (Keep your complete JSX layout exactly the same from here down) */}
      <div className="absolute top-0 left-0 right-0 z-[60] p-4 pt-10 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-3">
        <StreamHeader data={streamData} isHost={true} viewerCount={viewers.length} onLeave={() => navigate('/live')} />
      </div>

      <div className={`absolute inset-0 z-0 grid ${coHosts.length === 0 ? 'grid-cols-1' : 'grid-cols-2'} transition-all duration-500 bg-zinc-900`}>
        <div className="relative h-full w-full overflow-hidden bg-zinc-950">
          <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'opacity-0' : 'opacity-100'}`} />
          {isCameraOff && <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-black tracking-widest text-xs italic">Camera Off</div>}
          {isBattleMode && <BattleOverlay score={battleScores} hostProfile={streamData?.host} coHost={coHosts[0]} onInviteClick={() => setActivePanel('invite')} />}
        </div>
      </div>

      {/* Control Console Dock Bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 space-y-4 pointer-events-none">
        <div className="h-48 w-full max-w-[320px] pointer-events-auto overflow-y-auto floating-chat-container">
          <ChatBox streamId={streamId} isHost={true} transparent={true} filter={chatFilter} />
        </div>
        <nav className="w-full max-w-xl mx-auto bg-zinc-950/80 backdrop-blur-2xl rounded-full border border-white/10 p-1.5 pointer-events-auto">
          <ul className="flex items-center justify-between w-full px-1">
            <li><button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-2.5 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-white/5'}`}>{isCameraOff ? <VideoOff size={16}/> : <Video size={16}/>}</button></li>
            <li><button onClick={() => setIsMuted(!isMuted)} className={`p-2.5 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/5'}`}>{isMuted ? <MicOff size={16}/> : <Mic size={16}/>}</button></li>
            <li><button onClick={() => setIsBattleMode(!isBattleMode)} className={`p-2.5 rounded-full ${isBattleMode ? 'bg-cyan-500 text-black' : 'bg-white/5'}`}><Swords size={16}/></button></li>
          </ul>
        </nav>
      </div>

      <AnimatePresence>
        {incomingInvite && (
          <div className="absolute inset-0 pointer-events-none z-[70] flex items-center justify-center">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="bg-zinc-950/95 border-2 border-cyan-500/50 p-4 rounded-2xl pointer-events-auto">
              <p className="text-[11px]">@{incomingInvite.senderUsername} challenges you!</p>
              <button onClick={handleAcceptInvite} className="bg-cyan-500 text-black px-4 py-2 mt-2 rounded-xl text-xs font-bold">Accept Live</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
