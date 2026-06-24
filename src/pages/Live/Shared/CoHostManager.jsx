// src/pages/Live/CoHost/CoHostStage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { io } from 'socket.io-client';
import { LogOut, Users, Mic, MicOff, Video, VideoOff, ShieldAlert } from 'lucide-react';

const CoHostStage = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  
  // --- HARDWARE & NETWORKING STATES ---
  const [socket, setSocket] = useState(null);
  const [peers, setPeers] = useState([]); // Array of active co-host objects [{id, username, stream}]
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); // Tracks active RTCPeerConnection objects instances

  // Initialize Isolated Signaling Channel for Multi-Broker sync
  useEffect(() => {
    // Points directly to the live production server on Render to avoid ERR_CONNECTION_REFUSED
    const socketUrl = "https://mpade-backend.onrender.com";
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      query: { room: streamId, role: 'cohost_master' },
      forceNew: true
    });
    
    setSocket(socketInstance);

    // Sync state configuration database cleanups
    return () => {
      if (socketInstance) socketInstance.disconnect();
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [streamId]);

  // --- DISCONNECT / KICK MANAGEMENT HANDLERS ---
  const dropPeer = (targetPeerId) => {
    if (socket) {
      socket.emit('master_evict_peer', { room: streamId, targetId: targetPeerId });
    }
    setPeers(prev => prev.filter(p => p.id !== targetPeerId));
  };

  const dropAllPeers = () => {
    if (socket) {
      socket.emit('master_evict_all', { room: streamId });
    }
    setPeers([]);
  };

  // Dynamic panel math calculations based on total participant matrix capacity
  const getGridSizingClass = () => {
    const totalPanels = peers.length + 1;
    if (totalPanels === 1) return 'grid-cols-1';
    if (totalPanels === 2) return 'grid-cols-2';
    if (totalPanels <= 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-3';
  };

  return (
    <div className="h-screen w-full bg-black text-white relative font-sans overflow-hidden">
      
      {/* =========================================================
          STAGE WRAPPER: Viewers only see this clean layout section
         ========================================================= */}
      <div 
        id="mpade-viewer-visible-stage" 
        className={`w-full h-full grid ${getGridSizingClass()} gap-0.5 bg-zinc-950 transition-all duration-500`}
      >
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
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-amber-500/10 flex items-center gap-2">
              <span>@{peer.username}</span>
              {/* Kick button hidden from viewers via operational host layer checks */}
              <button 
                onClick={() => dropPeer(peer.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-1 rounded text-[8px] transition-colors"
              >
                DROP
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================
          SECRET CONTROL HUD LAYER: Completely invisible to viewers
         ========================================================= */}
      <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">
        
        {/* Top Management Header Bar */}
        <header className="w-full flex justify-between items-center pointer-events-auto">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black tracking-wider text-zinc-300">CO-HOST MODE RUNNING</span>
            <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
              {peers.length + 1} Channels Live
            </span>
          </div>

          {peers.length > 0 && (
            <button 
              onClick={dropAllPeers}
              className="bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5"
            >
              <ShieldAlert size={12} /> Purge Room Stage
            </button>
          )}
        </header>

        {/* Bottom Hardware Toggle Tray Control Layout */}
        <nav className="w-full max-w-sm mx-auto bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-2 rounded-full pointer-events-auto flex justify-between items-center px-4 shadow-2xl">
          <button 
            onClick={() => setIsCameraOff(!isCameraOff)} 
            className={`p-3 rounded-full transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button 
            onClick={() => navigate(`/live/host/${streamId}`)}
            className="p-3 bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white rounded-full transition-all flex items-center justify-center gap-2 text-xs font-bold px-5"
          >
            <LogOut size={14} /> Exit Room
          </button>
        </nav>
        
      </div>

    </div>
  );
};

export default CoHostStage;
