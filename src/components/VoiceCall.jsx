import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Shield, PhoneCall, MessageSquare, Send, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startRingbackTone, stopRingbackTone } from '../utils/callNotificationEngine';

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
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingReactions, setFloatingReactions] = useState([]);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  
  const remoteAudioRef = useRef(null);

  // Call Duration Timer
  useEffect(() => {
    let timer = null;
    if (callStatus === "Connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Outgoing Call Ringback Sound Management
  useEffect(() => {
    const statusLower = callStatus.toLowerCase();
    if (statusLower.includes("calling") || statusLower.includes("connecting") || statusLower.includes("initializing")) {
      startRingbackTone();
    } else {
      stopRingbackTone();
    }
    return () => stopRingbackTone();
  }, [callStatus]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Helper to drain queued ICE candidates once remoteDescription is ready
  const processIceQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription && iceQueueRef.current.length > 0) {
      const candidatesToProcess = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const candidate of candidatesToProcess) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error processing queued ICE candidate:", e);
        }
      }
    }
  };

  // 1. Fetch user authentication and peer profile info
  useEffect(() => {
    const initProfiles = async () => {
      console.log("🔍 Incoming Voice Call Routing State Check -> peerUserId:", peerUserId, "| Role Parameter:", URLRole);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUserId(user.id);

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

  // 2. Main WebRTC Signalling Implementation Block
  useEffect(() => {
    if (!currentUserId || !peerUserId || peerUserId === 'undefined') return;

    let isComponentMounted = true;

    // Strict deterministic role checking logic
    const callRole = URLRole === 'caller' || URLRole === 'receiver'
      ? URLRole
      : (currentUserId < peerUserId ? 'caller' : 'receiver');

    const roomId = [currentUserId, peerUserId].sort().join("-");

    console.log(`Setting up voice signaling as [${callRole}] for Room: ${roomId}`);

    const createAndSendOffer = async () => {
      if (!pcRef.current || !socketRef.current) return;
      try {
        setCallStatus("Calling user...");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        socketRef.current.emit('send_webrtc_offer', {
          roomId: roomId,
          streamId: roomId,
          offer,
          targetViewerId: peerUserId,
          to: peerUserId
        });
      } catch (err) {
        console.error("Failed creating signaling offer Matrix:", err);
      }
    };

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
              roomId: roomId,
              streamId: roomId,
              candidate: event.candidate,
              to: peerUserId
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
        socket.on('connect', () => {
          console.log(`🟢 Connected to signaling server. Socket ID: ${socket.id} | Room: ${roomId}`);

          // Step 1: Register active session dynamically on backend
          socket.emit('register_user_session', { userId: currentUserId });

          // Step 2: Join target call room
          socket.emit('join_call_room', { roomId, userId: currentUserId, targetPeerId: peerUserId });

          if (callRole === 'caller') {
            setCallStatus("Calling user...");
            createAndSendOffer();
          } else {
            setCallStatus("Awaiting Connection...");
            // Notify room that receiver is mounted and ready for offer handshake
            socket.emit('peer_ready', { roomId, userId: currentUserId });
          }
        });

        // E. Handle peer ready broadcast to trigger targeted offer
        socket.on('peer_ready', async () => {
          if (!isComponentMounted) return;
          if (callRole === 'caller' && pcRef.current) {
            console.log("⚡ Peer is ready in room. Dispatching WebRTC offer.");
            await createAndSendOffer();
          }
        });

        // F. Bind Signalling Pipeline Events safely
        socket.on('webrtc_offer_received', async ({ offer }) => {
          if (!isComponentMounted || !pcRef.current) return;
          if (callRole === 'caller') return; // Drop accidental loops

          try {
            setCallStatus("Answering call...");
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            socket.emit('send_webrtc_answer', {
              roomId: roomId,
              streamId: roomId,
              answer,
              to: peerUserId
            });

            await processIceQueue();
          } catch (err) {
            console.error("Failed executing structural handshake offer loop:", err);
          }
        });

        socket.on('webrtc_answer_received', async ({ answer }) => {
          if (!isComponentMounted || !pcRef.current) return;
          try {
            if (pcRef.current.signalingState === "have-local-offer") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
              await processIceQueue();
            }
          } catch (err) {
            console.error("Failed setting up active remote answer specification:", err);
          }
        });

        socket.on('incoming_ice_candidate', async ({ candidate }) => {
          if (!isComponentMounted) return;
          const currentPc = pcRef.current;
          if (currentPc && currentPc.remoteDescription && currentPc.remoteDescription.type) {
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

        // In-Call Chat & Reaction Event Listeners
        socket.on('in_call_text_message', (data) => {
          setInCallMessages((prev) => [...prev, data]);
        });

        socket.on('in_call_reaction_burst', (data) => {
          const reactionId = Date.now() + Math.random();
          setFloatingReactions((prev) => [...prev, { id: reactionId, emoji: data.emoji }]);
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId));
          }, 2500);
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

  // Send In-Call Text Message
  const sendInCallMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const msgPayload = {
      id: Date.now(),
      senderId: currentUserId,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInCallMessages((prev) => [...prev, msgPayload]);
    const roomId = [currentUserId, peerUserId].sort().join("-");
    socketRef.current?.emit('in_call_text_message', { roomId, ...msgPayload });
    setChatInput("");
  };

  // Send In-Call Reaction Burst
  const sendReactionBurst = (emoji) => {
    const reactionId = Date.now() + Math.random();
    setFloatingReactions((prev) => [...prev, { id: reactionId, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 2500);

    const roomId = [currentUserId, peerUserId].sort().join("-");
    socketRef.current?.emit('in_call_reaction_burst', { roomId, emoji });
  }; 

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
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none overflow-hidden">
      {/* Hidden Audio Output Element for WebRTC Stream Processing */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Top Header Bar */}
      <div className="w-full max-w-md flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-cyan-400" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-zinc-300 uppercase">Encrypted</span>
        </div>

        {/* Call Timer Display */}
        <div className="flex items-center gap-2">
          {callStatus === "Connected" && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {formatTime(callDuration)}
            </span>
          )}
          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full font-extrabold border border-cyan-500/20">
            {callStatus}
          </span>
        </div>
      </div>

      {/* Profile Audio Sandbox Container */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 my-6 relative w-full max-w-md rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl p-8 backdrop-blur-xl overflow-hidden">
        
        {/* Floating In-Call Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingReactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ y: 150, opacity: 0, scale: 0.5, x: Math.random() * 80 - 40 }}
                animate={{ y: -150, opacity: [0, 1, 1, 0], scale: [0.5, 1.8, 2, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, ease: "easeOut" }}
                className="absolute bottom-10 left-1/2 text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              >
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-6 z-10">
          {peerProfile?.avatar_url ? (
            <img 
              src={peerProfile.avatar_url} 
              alt="Peer Avatar" 
              className={`w-32 h-32 rounded-full object-cover border-4 border-cyan-500/30 shadow-2xl ${callStatus !== "Connected" ? 'animate-pulse' : 'ring-4 ring-cyan-500/20'}`}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse shadow-2xl">
              <PhoneCall size={44} className="text-cyan-400" />
            </div>
          )}
          
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-white">@{peerProfile?.username || 'User'}</h2>
            <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">{callStatus}</p>
          </div>
        </div>

        {/* Ambient Equalizer Waves */}
        {callStatus === "Connected" && (
          <div className="flex items-center gap-1.5 h-8 mt-2 z-10">
            {[0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.2].map((height, i) => (
              <motion.div
                key={i}
                animate={{ height: ['20%', '100%', '30%'] }}
                transition={{ repeat: Infinity, duration: 0.8 + i * 0.1, ease: "easeInOut" }}
                className="w-1.5 bg-cyan-400 rounded-full"
              />
            ))}
          </div>
        )}

        {/* Quick In-Call Reaction Bar Overlay */}
        {callStatus === "Connected" && (
          <div className="flex gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 z-20 mt-2">
            {['❤️', '🔥', '👏', '🎉', '😮'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReactionBurst(emoji)}
                className="p-1 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* In-Call Text Messages Drawer Overlay */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute inset-x-0 bottom-0 top-1/4 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MessageSquare size={14} /> In-Call Chat
                </span>
                <button type="button" onClick={() => setShowChat(false)} className="text-zinc-400 hover:text-white p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 no-scrollbar text-xs">
                {inCallMessages.length === 0 ? (
                  <p className="text-center text-zinc-600 italic py-6">No chat messages yet. Type below!</p>
                ) : (
                  inCallMessages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-1.5 rounded-xl max-w-[80%] ${isMe ? 'bg-cyan-500 text-black font-semibold' : 'bg-zinc-800 text-white border border-white/10'}`}>
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[8px] text-zinc-500 mt-0.5">{msg.time}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendInCallMessage} className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  placeholder="Send a quick text..." 
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button type="submit" className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors">
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Dock */}
      <div className="w-full max-w-md flex items-center justify-around bg-zinc-900/90 border border-white/10 px-6 py-4 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)} 
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          className={`p-4 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          type="button"
          onClick={() => setShowChat(!showChat)} 
          title="Toggle In-Call Chat"
          className={`p-4 rounded-2xl transition-all relative ${showChat ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          <MessageSquare size={20} />
          {inCallMessages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>

        <button 
          type="button"
          onClick={cleanUpCall} 
          title="End Call"
          className="p-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-transform active:scale-95 shadow-xl shadow-red-600/40"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

export default VoiceCall;
