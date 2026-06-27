import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Phone, Shield } from 'lucide-react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    }
  ],
  iceCandidatePoolSize: 10
};

const VoiceCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');
  const URLRole = searchParams.get('role'); 
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  
  const remoteAudioRef = useRef(null);

  // 1. Fetch user authorization and peer profile info with URL verification guards
  useEffect(() => {
    const initProfiles = async () => {
      console.log("🔍 Audio Call Routing State Check -> peerUserId:", peerUserId, "| Role Parameter:", URLRole);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUserId(user.id);

      // CRITICAL GUARD: Stop execution if peerUserId is missing or evaluates to string literal "undefined"
      if (!peerUserId || peerUserId === 'undefined') {
        console.error("❌ Aborting profile fetching loop: peerUserId url parameter resolved to an undefined state.");
        setCallStatus("Routing Error");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerUserId)
        .single();
      if (!error && data) setPeerProfile(data);
    };
    initProfiles();
  }, [peerUserId, URLRole, navigate]);

  // 2. Main WebRTC Signalling Implementation Block (Audio Mode Specific)
  useEffect(() => {
    if (!currentUserId || !peerUserId || peerUserId === 'undefined') return;

    let isComponentMounted = true;
    const callRole = URLRole || (currentUserId < peerUserId ? 'caller' : 'receiver');
    const roomId = [currentUserId, peerUserId].sort().join("-");

    const initializeMediaAndSignaling = async () => {
      try {
        // A. Mount Audio Media Tracks Only
        setCallStatus("Accessing microphone...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: true 
        });

        if (!isComponentMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef.current = stream;

        // B. Set Up Peer Connection Structure
        const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          console.log("🎵 Remote audio stream attached successfully.");
          setCallStatus("Connected");
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current?.connected) {
            socketRef.current.emit('webrtc_ice_candidate', {
              streamId: roomId,
              candidate: event.candidate,
              targetSocketId: null
            });
          }
        };

        // C. Spin up Socket Context AFTER WebRTC Instance is safely created
        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          forceNew: true
        });
        socketRef.current = socket;

        // D. Setup Synchronous Context Handlers inside Socket Connection Frame
        socket.on('connect', async () => {
          console.log(`🟢 Connected to signaling server. Room: ${roomId}`);
          socket.emit('join_call_room', { roomId, userId: currentUserId, targetPeerId: peerUserId });

          if (callRole === 'caller') {
            setCallStatus("Calling...");
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('send_webrtc_offer', { streamId: roomId, offer, targetViewerId: peerUserId });
            } catch (err) {
              console.error("Failed creating signaling audio offer Matrix:", err);
            }
          } else {
            setCallStatus("Incoming Voice Call...");
          }
        });

        // E. Bind Signalling Pipeline Events safely
        socket.on('webrtc_offer_received', async ({ offer }) => {
          if (!isComponentMounted || !pcRef.current) return;
          try {
            setCallStatus("Connecting...");
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('send_webrtc_answer', { streamId: roomId, answer });

            // Flush out stacked early ice arrivals
            if (iceQueueRef.current.length > 0) {
              for (const candidate of iceQueueRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
              iceQueueRef.current = [];
            }
          } catch (err) {
            console.error("Failed executing structural handshake audio loop:", err);
          }
        });

        socket.on('webrtc_answer_received', async ({ answer }) => {
          if (!isComponentMounted || !pcRef.current) return;
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            
            if (iceQueueRef.current.length > 0) {
              for (const candidate of iceQueueRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
              iceQueueRef.current = [];
            }
          } catch (err) {
            console.error("Failed setting up active remote answer specification:", err);
          }
        });

        socket.on('incoming_ice_candidate', async ({ candidate }) => {
          if (!isComponentMounted) return;
          const currentPc = pcRef.current;
          if (currentPc && currentPc.remoteDescription) {
            try {
              await currentPc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("Skipped structural candidate node:", e);
            }
          } else {
            iceQueueRef.current.push(candidate);
          }
        });

        socket.on('peer_hung_up', () => {
          if (isComponentMounted) cleanUpCall();
        });

      } catch (err) {
        console.error("Audio system acquisition or socket binding fault:", err);
        if (isComponentMounted) setCallStatus("Mic Error");
      }
    };

    initializeMediaAndSignaling();

    return () => {
      isComponentMounted = false;
      cleanUpCall();
    };
  }, [currentUserId, peerUserId, URLRole]); 

  // Mute Sync Shifter
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  const cleanUpCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (socketRef.current && peerUserId && peerUserId !== 'undefined') {
      const roomId = [currentUserId, peerUserId].sort().join("-");
      socketRef.current.emit('reject_incoming_call', { roomId, to: peerUserId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-[#08080a] text-white flex flex-col items-center justify-between p-6 font-sans">
      {/* Hidden Audio element for streaming the remote user's voice */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Top Security Banner */}
      <div className="w-full flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">Secure Audio Channel</span>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold">{callStatus}</span>
      </div>

      {/* Voice Avatar Profile Core Display */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {callStatus !== "Connected" && (
            <div className="absolute inset-0 w-32 h-32 bg-cyan-500/10 rounded-full animate-ping duration-1000 opacity-40" />
          )}
          {peerProfile?.avatar_url ? (
            <img 
              src={peerProfile.avatar_url} 
              alt="Avatar" 
              className={`w-28 h-28 rounded-full object-cover border relative z-10 ${callStatus === 'Connected' ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/10'}`}
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10 text-zinc-500">
              <Phone size={32} />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight mt-2">@{peerProfile?.username || 'User'}</h2>
        <p className="text-xs text-zinc-500 tracking-wide font-medium">Mpade Audio Connection</p>
      </div>

      {/* Control Panel Block */}
      <div className="flex items-center gap-6 bg-zinc-950 border border-white/5 px-8 py-4 rounded-full shadow-2xl mb-4">
        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          type="button"
          onClick={cleanUpCall} 
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/30"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

export default VoiceCall;
