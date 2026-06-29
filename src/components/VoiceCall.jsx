import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Shield, PhoneCall } from 'lucide-react';

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

  // 1. Fetch user authentication and peer profile info with URL verification guards
  useEffect(() => {
    const initProfiles = async () => {
      console.log("🔍 Incoming Voice Call Routing State Check -> peerUserId:", peerUserId, "| Role Parameter:", URLRole);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUserId(user.id);

      // CRITICAL GUARD: Stop execution if peerUserId is missing or evaluates to string literal "undefined"
      if (!peerUserId || peerUserId === 'undefined') {
        console.error("❌ Aborting profile fetching loop: peerUserId url parameter resolved to an undefined state.");
        setCallStatus("URL Configuration Error");
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

  // 2. Main WebRTC Signalling Implementation Block (Asynchronous Workflow)
  useEffect(() => {
    // Block signaling engine until both peer IDs are cleanly defined strings
    if (!currentUserId || !peerUserId || peerUserId === 'undefined') return;

    let isComponentMounted = true;
    const callRole = URLRole || (currentUserId < peerUserId ? 'caller' : 'receiver');
    const roomId = [currentUserId, peerUserId].sort().join("-");

    const initializeMediaAndSignaling = async () => {
      try {
        // A. Mount Local Media Tracks First (Audio Only)
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
          console.log("🔊 Remote audio stream attached successfully.");
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
        // FIX: Forcing websocket exclusively to stop polling overhead bugs
        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket'],
          upgrade: false
        });
        socketRef.current = socket;

        // D. Setup Synchronous Context Handlers inside Socket Connection Frame
        socket.on('connect', async () => {
          console.log(`🟢 Connected to signaling server. Room: ${roomId}`);
          socket.emit('join_call_room', { roomId, userId: currentUserId, targetPeerId: peerUserId });

          if (callRole === 'caller') {
            setCallStatus("Calling user...");
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('send_webrtc_offer', { streamId: roomId, offer, targetViewerId: peerUserId });
            } catch (err) {
              console.error("Failed creating signaling offer Matrix:", err);
            }
          } else {
            setCallStatus("Awaiting Connection...");
          }
        });

        // E. Bind Signalling Pipeline Events safely
        socket.on('webrtc_offer_received', async ({ offer, hostSocketId }) => {
          if (!isComponentMounted || !pcRef.current) return;
          try {
            setCallStatus("Answering call...");
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
            console.error("Failed executing structural handshake offer loop:", err);
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
        console.error("System device acquisition or socket binding fault:", err);
        if (isComponentMounted) setCallStatus("Hardware Error");
      }
    };

    initializeMediaAndSignaling();

    return () => {
      isComponentMounted = false;
      cleanUpCall();
    };
  }, [currentUserId, peerUserId, URLRole]); 

  // Track State Synchronization Shifters
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
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-6 font-sans">
      {/* Hidden Audio Output Element for WebRTC Stream Processing */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Top Bar */}
      <div className="w-full flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">End-to-End Encrypted</span>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold">{callStatus}</span>
      </div>

      {/* Profile Audio Sandbox Container */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 my-8 relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/5 shadow-2xl p-8">
        <div className="flex flex-col items-center gap-6">
          {peerProfile?.avatar_url ? (
            <img 
              src={peerProfile.avatar_url} 
              alt="Peer Avatar" 
              className={`w-32 h-32 rounded-full object-cover border-4 border-cyan-500/20 shadow-2xl ${callStatus !== "Connected" ? 'animate-pulse' : ''}`}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse shadow-2xl">
              <PhoneCall size={44} className="text-cyan-400" />
            </div>
          )}
          
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">@{peerProfile?.username || 'User'}</h2>
            <p className="text-sm text-zinc-400 mt-2 font-medium tracking-wide">{callStatus}</p>
          </div>
        </div>

        {/* Ambient Ring Wave Effect (Visual Indicator during connection) */}
        {callStatus === "Connected" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="absolute w-64 h-64 border-2 border-cyan-400 rounded-full animate-ping duration-1000" />
          </div>
        )}
      </div>

      {/* Control Dock */}
      <div className="flex items-center gap-6 bg-zinc-900/80 border border-white/5 px-8 py-4 rounded-full backdrop-blur-xl shadow-xl z-10">
        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button 
          type="button"
          onClick={cleanUpCall} 
          className="p-5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/30"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default VoiceCall;
