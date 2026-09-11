import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Shield, Monitor, MessageSquare, Send, X, Heart, Flame, Sparkles } from 'lucide-react';
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

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const peerUserId = searchParams.get('userId');
  const URLRole = searchParams.get('role'); 
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingReactions, setFloatingReactions] = useState([]);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const iceQueueRef = useRef([]);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      console.log("🔍 Incoming Call Routing State Check -> peerUserId:", peerUserId, "| Role Parameter:", URLRole);

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

    console.log(`Setting up signaling as [${callRole}] for Room: ${roomId}`);

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
        console.error("Failed creating signaling offer:", err);
      }
    };

    const initializeMediaAndSignaling = async () => {
      try {
        // A. Mount Local Media Tracks First
        setCallStatus("Accessing devices...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });

        if (!isComponentMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // B. Set Up Peer Connection Structure
        const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          console.log("🎬 Remote stream attached successfully.");
          setCallStatus("Connected");
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
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
          transports: ['polling', 'websocket'],
          forceNew: true
        });
        socketRef.current = socket;

        // D. Setup Synchronous Context Handlers inside Socket Connection Frame
        socket.on('connect', async () => {
          console.log(`🟢 Connected to signaling server. Socket ID: ${socket.id} | Room: ${roomId}`);
          
          // Step 1: Register active session dynamically on backend
          socket.emit('register_user_session', { userId: currentUserId });

          // Step 2: Join target call room
          socket.emit('join_call_room', { roomId, userId: currentUserId, targetPeerId: peerUserId });

          if (callRole === 'caller') {
            setCallStatus("Calling user...");

            // Dispatch global incoming call overlay signal to receiver device
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', currentUserId)
              .maybeSingle();

            const callSignalData = {
              receiverId: peerUserId,
              to: peerUserId,
              targetUserId: peerUserId,
              callerId: currentUserId,
              fromUserId: currentUserId,
              callerName: myProfile?.username || 'User',
              callerUsername: myProfile?.username || 'User',
              callerAvatar: myProfile?.avatar_url || null,
              callType: 'video',
              roomId: roomId
            };

            socket.emit('initiate_call_signal', callSignalData);
            socket.emit('incoming_call_signal', callSignalData);
            socket.emit('incoming_call', callSignalData);

            // Supabase Realtime broadcast fallback for instant popup
            const realtimeChan = supabase.channel(`user-call-signals-${peerUserId}`);
            realtimeChan.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                realtimeChan.send({
                  type: 'broadcast',
                  event: 'incoming_call_broadcast',
                  payload: callSignalData
                });
              }
            });

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

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;
    try {
      if (isScreenSharing) {
        // Revert to camera stream
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }
        setIsScreenSharing(false);
      } else {
        // Capture screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  };

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

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isVideoOff; });
    }
  }, [isVideoOff]);

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
      const cancelPayload = { roomId, to: peerUserId, receiverId: peerUserId, callerId: currentUserId };

      socketRef.current.emit('reject_incoming_call', cancelPayload);
      socketRef.current.emit('call_cancelled_by_caller', cancelPayload);
      socketRef.current.emit('decline_call', cancelPayload);
      socketRef.current.emit('cancel_call_signal', cancelPayload);

      const realtimeChan = supabase.channel(`user-call-signals-${peerUserId}`);
      realtimeChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeChan.send({
            type: 'broadcast',
            event: 'cancel_call_broadcast',
            payload: cancelPayload
          });
        }
      });

      socketRef.current.disconnect();
      socketRef.current = null;
    }
    navigate(-1);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="w-full max-w-lg flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">
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

      {/* Main Video Stage */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative w-full max-w-lg rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Floating In-Call Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingReactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ y: 200, opacity: 0, scale: 0.5, x: Math.random() * 100 - 50 }}
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

        {callStatus !== "Connected" && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
            {peerProfile?.avatar_url ? (
              <img 
                src={peerProfile.avatar_url} 
                alt="Peer Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/40 animate-pulse shadow-2xl shadow-cyan-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/20">
                <Video size={36} className="text-cyan-400" />
              </div>
            )}
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tight text-white">@{peerProfile?.username || 'User'}</h2>
              <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">{callStatus}</p>
            </div>
          </div>
        )}

        {/* Local Camera Picture-in-Picture Box */}
        <div className="absolute bottom-4 right-4 w-28 h-40 bg-black/70 border border-white/20 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl">
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="flex flex-col items-center gap-1 text-zinc-500">
              <VideoOff size={18} />
              <p className="text-[9px] font-bold uppercase tracking-wider">Cam Off</p>
            </div>
          )}
        </div>

        {/* Quick In-Call Reaction Bar Overlay */}
        {callStatus === "Connected" && (
          <div className="absolute top-4 left-4 z-20 flex gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            {['❤️', '🔥', '👏', '🎉', '😮'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReactionBurst(emoji)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-base"
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
              className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl shadow-2xl"
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

      {/* Floating Control Console */}
      <div className="w-full max-w-lg flex items-center justify-around bg-zinc-900/90 border border-white/10 px-4 py-3 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)} 
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          className={`p-3.5 rounded-2xl transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button 
          type="button"
          onClick={() => setIsVideoOff(!isVideoOff)} 
          title={isVideoOff ? "Turn On Cam" : "Turn Off Cam"}
          className={`p-3.5 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        <button 
          type="button"
          onClick={toggleScreenShare} 
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          className={`p-3.5 rounded-2xl transition-all ${isScreenSharing ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          <Monitor size={18} />
        </button>

        <button 
          type="button"
          onClick={() => setShowChat(!showChat)} 
          title="Toggle In-Call Chat"
          className={`p-3.5 rounded-2xl transition-all relative ${showChat ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
        >
          <MessageSquare size={18} />
          {inCallMessages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>

        <button 
          type="button"
          onClick={cleanUpCall} 
          title="End Call"
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-transform active:scale-95 shadow-xl shadow-red-600/40"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
