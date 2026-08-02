import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { LogOut, Users, Mic, MicOff, Video, VideoOff, ShieldAlert, UserPlus, Radio, Check, X, Bug } from 'lucide-react';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const CoHostStage = ({ socket: parentSocket }) => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  // --- HARDWARE & NETWORKING STATES ---
  const [peers, setPeers] = useState([]); // [{ id, username, stream }]
  const [liveCreators, setLiveCreators] = useState([]); // Tracks active live creators from DB
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inviteLoading, setInviteLoading] = useState({});

  // --- INCOMING INVITATION MODAL STATE ---
  const [incomingInvite, setIncomingInvite] = useState(null);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // { targetSocketId: RTCPeerConnection }

  // ==========================================
  // 1. LOCAL MEDIA INITIALIZATION
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    async function setupLocalMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Avoid feedback locally
        }
      } catch (err) {
        console.error("❌ Camera/Microphone access denied:", err);
      }
    }

    setupLocalMedia();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ==========================================
  // 2. WEBRTC HELPER FUNCTIONS
  // ==========================================
  const createPeerConnection = (targetSocketId) => {
    if (peerConnections.current[targetSocketId]) {
      return peerConnections.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections.current[targetSocketId] = pc;

    // Attach local media tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && parentSocket) {
        parentSocket.emit('cohost_ice_candidate', {
          targetSocketId,
          candidate: event.candidate,
          room: streamId
        });
      }
    };

    // Incoming remote stream handler
    pc.ontrack = (event) => {
      console.log(`🎬 Dynamic remote stream captured from target [${targetSocketId}]`);
      const remoteStream = event.streams[0];

      setPeers((prevPeers) => {
        const exists = prevPeers.find((p) => p.id === targetSocketId);
        if (exists) {
          return prevPeers.map((p) =>
            p.id === targetSocketId ? { ...p, stream: remoteStream } : p
          );
        }
        return [
          ...prevPeers,
          { id: targetSocketId, username: `CoHost-${targetSocketId.slice(0, 4)}`, stream: remoteStream }
        ];
      });
    };

    return pc;
  };

  // Initiate an outbound WebRTC offer call
  const initiateCall = async (targetSocketId) => {
    try {
      const pc = createPeerConnection(targetSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      parentSocket.emit('send_cohost_webrtc_offer', {
        targetSocketId,
        offer,
        fromRoom: streamId
      });
    } catch (err) {
      console.error("❌ Error initiating WebRTC call:", err);
    }
  };

  // ==========================================
  // 3. SIGNALING & SOCKET EVENT LISTENERS
  // ==========================================
  useEffect(() => {
    if (!parentSocket) return;

    console.log("🔌 CoHostStage attached to active socket engine:", parentSocket.id);

    // --- INVITATION LISTENERS ---
    const handleInviteReceived = (data) => {
      console.log("🚀 Invitation caught via Signaling System:", data);
      setIncomingInvite(data);
    };

    const handleInviteAccepted = async (data) => {
      console.log("✅ Target accepted invitation! Initializing WebRTC Offer...", data);
      const targetSocketId = data.acceptedBySocketId || data.targetUserId;
      if (targetSocketId) {
        await initiateCall(targetSocketId);
      }
    };

    // --- WEBRTC HANDSHAKE LISTENERS ---
    const handleWebRTCOffer = async (data) => {
      console.log("📥 WebRTC Offer received from:", data.fromSocketId);
      try {
        const pc = createPeerConnection(data.fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        parentSocket.emit('send_cohost_webrtc_answer', {
          targetSocketId: data.fromSocketId,
          answer
        });
      } catch (err) {
        console.error("❌ Error handling WebRTC offer:", err);
      }
    };

    const handleWebRTCAnswer = async (data) => {
      console.log("📥 WebRTC Answer received from:", data.fromSocketId);
      const pc = peerConnections.current[data.fromSocketId];
      if (pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error("❌ Error setting remote answer:", err);
        }
      }
    };

    const handleICECandidate = async (data) => {
      const pc = peerConnections.current[data.fromSocketId];
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn("⚠️ Skipped candidate:", err);
        }
      }
    };

    const handlePeerEvicted = (data) => {
      dropPeer(data.targetId || data.evictedSocketId);
    };

    // Event Registrations
    parentSocket.on('cohost_invite_received', handleInviteReceived);
    parentSocket.on('cohost_invite_accepted', handleInviteAccepted);
    parentSocket.on('cohost_webrtc_offer', handleWebRTCOffer);
    parentSocket.on('cohost_webrtc_answer', handleWebRTCAnswer);
    parentSocket.on('cohost_ice_candidate', handleICECandidate);
    parentSocket.on('peer_evicted', handlePeerEvicted);

    return () => {
      parentSocket.off('cohost_invite_received', handleInviteReceived);
      parentSocket.off('cohost_invite_accepted', handleInviteAccepted);
      parentSocket.off('cohost_webrtc_offer', handleWebRTCOffer);
      parentSocket.off('cohost_webrtc_answer', handleWebRTCAnswer);
      parentSocket.off('cohost_ice_candidate', handleICECandidate);
      parentSocket.off('peer_evicted', handlePeerEvicted);

      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
    };
  }, [parentSocket, streamId]);

  // ==========================================
  // 4. DATABASE FETCH (ACTIVE CREATORS)
  // ==========================================
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

  // ==========================================
  // 5. HARDWARE TOGGLE CONTROLS
  // ==========================================
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
        setIsCameraOff(!isCameraOff);
      }
    }
  };

  // ==========================================
  // 6. DISCONNECT / KICK HANDLER
  // ==========================================
  const dropPeer = (targetPeerId) => {
    if (peerConnections.current[targetPeerId]) {
      peerConnections.current[targetPeerId].close();
      delete peerConnections.current[targetPeerId];
    }
    if (parentSocket) {
      parentSocket.emit('master_evict_peer', { room: streamId, targetId: targetPeerId });
    }
    setPeers((prev) => prev.filter((p) => p.id !== targetPeerId));
  };

  // ==========================================
  // 7. INVITATION DISPATCH & RESPONSES
  // ==========================================
  const sendCoHostInvite = (targetHostId) => {
    if (!parentSocket || !targetHostId) return;

    setInviteLoading((prev) => ({ ...prev, [targetHostId]: true }));

    const payload = {
      room: streamId,
      targetRoomId: targetHostId,
      targetUserId: targetHostId,
      fromHostId: streamId,
      inviteFrom: 'Host Studio Stage'
    };

    parentSocket.emit('send_cohost_invite', payload);

    setTimeout(() => {
      setInviteLoading((prev) => ({ ...prev, [targetHostId]: false }));
    }, 1500);
  };

  const handleAcceptInvite = () => {
    if (!parentSocket || !incomingInvite) return;

    parentSocket.emit('respond_cohost_invite', {
      room: incomingInvite.room,
      targetUserId: incomingInvite.fromHostId,
      acceptedBySocketId: parentSocket.id,
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
      {/* INCOMING INVITATION TOAST MODAL */}
      {incomingInvite && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border-2 border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-[9999] backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider text-emerald-400">INCOMING FEED MERGE REQUEST</span>
            <span className="text-[11px] text-zinc-300 mt-0.5">
              Host Session: {String(incomingInvite.room).slice(0, 8)}... wants to split screens.
            </span>
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
          {/* PRIMARY HOST PANEL */}
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
                ref={(el) => {
                  if (el && peer.stream && el.srcObject !== peer.stream) {
                    el.srcObject = peer.stream;
                  }
                }}
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

        {/* HUD OVERLAY */}
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
            <button onClick={toggleCamera} className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-white/5'}`}>
              {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
            <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/5'}`}>
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button onClick={() => navigate(`/live/host/${streamId}`)} className="p-3 bg-zinc-800 rounded-full text-xs font-bold px-5">
              Exit Room
            </button>
          </nav>
        </div>
      </div>

      {/* CREATORS SIDEBAR */}
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
