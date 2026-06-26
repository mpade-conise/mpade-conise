import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Shield } from 'lucide-react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

// VERIFIED CONFIG MATCHING YOUR METERED METRICS
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

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // 1. Fetch user states
  useEffect(() => {
    const initProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerUserId)
        .single();
      if (!error && data) setPeerProfile(data);
    };
    if (peerUserId) initProfiles();
  }, [peerUserId, navigate]);

  // 2. Main WebRTC Signalling Implementation Block
  useEffect(() => {
    if (!currentUserId || !peerUserId) return;

    socketRef.current = io(SOCKET_SERVER_URL);
    const roomId = [currentUserId, peerUserId].sort().join("-");
    socketRef.current.emit('join_call_room', { roomId, userId: currentUserId });

    const setupHardwareAndRTC = async () => {
      try {
        setCallStatus("Accessing devices...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Using your Metered infrastructure configuration
        const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setCallStatus("Connected");
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit('webrtc_ice_candidate', {
              roomId,
              candidate: event.candidate,
              to: peerUserId
            });
          }
        };

        const isInitiator = currentUserId < peerUserId;
        if (isInitiator) {
          setCallStatus("Calling user...");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('webrtc_offer', { roomId, offer, to: peerUserId });
        } else {
          setCallStatus("Answering call...");
        }

      } catch (err) {
        console.error("Hardware initialization exception:", err);
        setCallStatus("Hardware Error");
      }
    };

    setupHardwareAndRTC();

    // Event hooks matching signaling structural matrices
    socketRef.current.on('webrtc_offer', async ({ offer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit('webrtc_answer', { roomId, answer, to: peerUserId });

        // Process stored queue elements safely once Remote Description aligns
        for (const candidate of iceQueueRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        iceQueueRef.current = [];
      } catch (err) {
        console.error("Failed executing Offer/Answer loop:", err);
      }
    });

    socketRef.current.on('webrtc_answer', async ({ answer }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const candidate of iceQueueRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        iceQueueRef.current = [];
      } catch (err) {
        console.error("Failed saving answer definition:", err);
      }
    });

    socketRef.current.on('webrtc_ice_candidate', async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Skipped candidate payload:", e);
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    });

    socketRef.current.on('peer_hung_up', () => {
      cleanUpCall();
    });

    return () => {
      cleanUpCall();
    };
  }, [currentUserId, peerUserId]);

  // Track State Synchronization Shifters
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });
    }
  }, [isVideoOff]);

  const cleanUpCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (socketRef.current) {
      const roomId = [currentUserId, peerUserId].sort().join("-");
      socketRef.current.emit('hang_up_call', { roomId });
      socketRef.current.disconnect();
    }
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-6 font-sans">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">End-to-End Encrypted</span>
        </div>
        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full font-bold">{callStatus}</span>
      </div>

      {/* Video Sandbox Box Container */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 my-8 relative w-full max-w-md rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {callStatus !== "Connected" && (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-4 z-10">
            {peerProfile?.avatar_url ? (
              <img 
                src={peerProfile.avatar_url} 
                alt="Peer Avatar" 
                className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/30 animate-pulse"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
                <Video size={32} className="text-cyan-400" />
              </div>
            )}
            <h2 className="text-lg font-bold">@{peerProfile?.username || 'User'}</h2>
            <p className="text-xs text-zinc-500">{callStatus}</p>
          </div>
        )}

        {/* Local Preview Pin */}
        <div className="absolute bottom-4 right-4 w-28 h-40 bg-black/60 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-lg">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cam Off</p>}
        </div>
      </div>

      {/* Control Dock */}
      <div className="flex items-center gap-4 bg-zinc-900/80 border border-white/5 px-6 py-4 rounded-full backdrop-blur-xl shadow-xl z-10">
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
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/20"
        >
          <PhoneOff size={20} />
        </button>

        <button 
          type="button"
          onClick={() => setIsVideoOff(!isVideoOff)} 
          className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
