// src/pages/Live/CoHost/CoHostStage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { LogOut, Users, Mic, MicOff, Video, VideoOff, ShieldAlert, UserPlus, Radio, Check, X, Bug } from 'lucide-react';

// Notice we are accepting 'socket' as a prop now to completely avoid duplicate handshakes!
const CoHostStage = ({ socket: parentSocket }) => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  // --- HARDWARE & NETWORKING STATES ---
  const [peers, setPeers] = useState([]); // Array of active co-host objects [{id, username, stream}]
  const [liveCreators, setLiveCreators] = useState([]); // Tracks other active live creators from DB
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inviteLoading, setInviteLoading] = useState({});
  
  // --- INCOMING INVITATION MODAL STATE ---
  const [incomingInvite, setIncomingInvite] = useState(null); 
  
  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); 

  // 1. Listen on the shared parent socket channel safely
  useEffect(() => {
    if (!parentSocket) return;

    console.log("🔌 CoHostStage securely attached to the active parent socket engine:", parentSocket.id);

    // SYSTEM ROUTER LISTENERS (Listens globally on our persistent session)
    parentSocket.on('cohost_invite_received', (data) => {
      console.log("🚀 Invitation caught successfully via Signaling System:", data);
      setIncomingInvite(data);
    });

    parentSocket.on('cohost_invite_accepted', (data) => {
      console.log("✅ Target accepted invitation! Connecting WebRTC channels...", data);
    });

    // Backup global fallback event receiver
    parentSocket.on('msg', (data) => {
      if (data && data.type === 'cohost_invite') {
        setIncomingInvite(data);
      }
    });

    return () => {
      parentSocket.off('cohost_invite_received');
      parentSocket.off('cohost_invite_accepted');
      parentSocket.off('msg');
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [parentSocket]);

  // 2. Database Fetch: Query active live creators using exact live_streams schema rules
  useEffect(() => {
    const fetchLiveCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('id, host_id, title, status')
          .eq('status', 'live')
          .not('id', 'eq', streamId);

        if (error) throw error;
        if (data) setLiveCreators(data);
      } catch (err) {
        console.error("Error pulling live creators from DB:", err.message);
      }
    };

    fetchLiveCreators();
    const interval = setInterval(fetchLiveCreators, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  // --- DISCONNECT / KICK MANAGEMENT HANDLERS ---
  const dropPeer = (targetPeerId) => {
    if (parentSocket) {
      parentSocket.emit('master_evict_peer', { room: streamId, targetId: targetPeerId });
    }
    setPeers(prev => prev.filter(p => p.id !== targetPeerId));
  };

  // --- CO-HOST INVITATION ROUTER DISPATCHER ---
  const sendCoHostInvite = (targetHostId) => {
    if (!parentSocket || !targetHostId) return;
    
    setInviteLoading(prev => ({ ...prev, [targetHostId]: true }));
    
    const payload = {
      room: streamId,                // Origin room
      targetRoomId: targetHostId,    // Target's room space identifier
      targetUserId: targetHostId,    // Specific host entity string matched on the activeUsers backend key
      fromHostId: streamId,
      inviteFrom: 'Host Studio Stage'
    };

    parentSocket.emit('send_cohost_invite', payload);

    setTimeout(() => {
      setInviteLoading(prev => ({ ...prev, [targetHostId]: false }));
    }, 1500);
  };

  // --- ACCEPT / DECLINE ACTIONS FOR TARGETED HOST ---
  const handleAcceptInvite = () => {
    if (!parentSocket || !incomingInvite) return;
    
    parentSocket.emit('respond_cohost_invite', {
      room: incomingInvite.room,
      targetUserId: incomingInvite.fromHostId,
      status: 'accepted'
    });
    
    setIncomingInvite(null);
  };

  const handleDeclineInvite = () => {
    if (!parentSocket || !incomingInvite) return;

    parentSocket.emit('respond_cohost_invite', {
      room: incomingInvite.room,
      targetUserId: incomingInvite.fromHostId,
      status: 'declined'
    });

    setIncomingInvite(null);
  };

  // --- LOCAL DEV TESTING SHORTCUTS ---
  const simulateIncomingInvite = () => {
    setIncomingInvite({
      room: 'test-stream-id-12345',
      fromHostId: 'mock-host-id',
      inviteFrom: 'Simulated Creator Studio'
    });
  };

  const getGridSizingClass = () => {
    const totalPanels = peers.length + 1;
    if (totalPanels === 1) return 'grid-cols-1';
    if (totalPanels === 2) return 'grid-cols-2';
    if (totalPanels <= 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-3';
  };

  return (
    <div className="h-screen w-full bg-black text-white relative font-sans overflow-hidden flex">
      
      {/* INCOMING INVITATION DIALOG ACTION TOAST MODAL */}
      {incomingInvite && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border-2 border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-[9999] backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider text-emerald-400">INCOMING FEED MERGE REQUEST</span>
            <span className="text-[11px] text-zinc-300 mt-0.5">Host Session: {String(incomingInvite.room).slice(0, 8)}... wants to split screens.</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button 
              onClick={handleAcceptInvite} 
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Check size={12} /> Accept
            </button>
            <button 
              onClick={handleDeclineInvite} 
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <X size={12} /> Deny
            </button>
          </div>
        </div>
      )}

      {/* STAGE WRAPPER */}
      <div className="flex-1 h-full relative">
        <div className={`w-full h-full grid ${getGridSizingClass()} gap-0.5 bg-zinc-950`}>
          {/* HOST PRIMARY PANEL */}
          <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-zinc-600 bg-zinc-900 font-mono">
                CAMERA BLANKED
              </div>
            )}
            <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-cyan-400 border border-cyan-500/10">
              HOST (YOU)
            </span>
          </div>

          {/* DYNAMIC CO-HOST PEER PANELS */}
          {peers.map((peer) => (
            <div key={peer.id} className="relative w-full h-full bg-zinc-900 overflow-hidden">
              <video 
                ref={(el) => { if (el && peer.stream) el.srcObject = peer.stream; }}
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-2">
                <span>@{peer.username || 'Co-Host'}</span>
                <button onClick={() => dropPeer(peer.id)} className="bg-red-600 px-1 rounded text-[8px]">
                  DROP
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* HUD LAYERS */}
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">
          <header className="w-full flex justify-between items-center pointer-events-auto">
            <div className="bg-zinc-950/80 border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black tracking-wider text-zinc-300">CO-HOST ENGINE LIVE</span>
            </div>
            <button onClick={simulateIncomingInvite} className="bg-zinc-900 text-zinc-400 p-1.5 rounded-xl text-[10px] flex items-center gap-1.5">
              <Bug size={12} /> Test Overlay
            </button>
          </header>

          <nav className="w-full max-w-sm mx-auto bg-zinc-950/90 border border-white/10 p-2 rounded-full pointer-events-auto flex justify-between items-center px-4">
            <button onClick={() => setIsCameraOff(!isCameraOff)} className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-white/5'}`}>
              {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/5'}`}>
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button onClick={() => navigate(`/live/host/${streamId}`)} className="p-3 bg-zinc-800 rounded-full text-xs font-bold px-5">
              Exit Room
            </button>
          </nav>
        </div>
      </div>

      {/* OPERATIONAL STUDIO HOST MANAGEMENT SIDEBAR */}
      <div className="w-80 h-full bg-zinc-950 border-l border-white/10 flex flex-col p-4 z-[60]">
        <div className="border-b border-white/10 pb-3 mb-4">
          <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase flex items-center gap-2">
            <Radio size={14} className="text-red-500 animate-pulse" /> Live Creators
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {liveCreators.length === 0 ? (
            <div className="text-center text-zinc-600 text-xs py-12 font-mono">No other creators live</div>
          ) : (
            liveCreators.map((creator) => {
              const targetId = creator.host_id || creator.id;
              return (
                <div key={creator.id} className="flex items-center justify-between bg-zinc-900 p-2 rounded-xl">
                  <div className="flex flex-col max-w-[60%]">
                    <span className="text-xs font-bold text-zinc-300 truncate">{creator.title || 'Untitled Stream'}</span>
                  </div>
                  <button
                    onClick={() => sendCoHostInvite(targetId)}
                    disabled={inviteLoading[targetId]}
                    className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                  >
                    {inviteLoading[targetId] ? "Invited" : "Merge Feed"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default CoHostStage;
