import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, Shield, Monitor, 
  MessageSquare, Send, X, Heart, Flame, Sparkles, Wand2, 
  Gift, Settings, Subtitles, FileText, Activity, Camera, 
  RefreshCw, LayoutGrid, Disc, Maximize2, Minimize2, 
  Volume2, VolumeX, Radio, Eye, CornerDownRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { startRingbackTone, stopRingbackTone } from '../utils/callNotificationEngine';

// Sub-components for premium video call features (explicit extensions added for Vite/Vercel)
import VideoCallWhiteboard from './videocall/VideoCallWhiteboard.jsx';
import VideoCallFilters, { VIDEO_FILTERS, VIRTUAL_BACKDROPS } from './videocall/VideoCallFilters.jsx';
import VideoCallGifts, { CALL_GIFTS } from './videocall/VideoCallGifts.jsx';
import VideoCallDeviceSettings from './videocall/VideoCallDeviceSettings.jsx';
import VideoCallCaptions from './videocall/VideoCallCaptions.jsx';
import VideoCallNotes from './videocall/VideoCallNotes.jsx';
import VideoCallTelemetry from './videocall/VideoCallTelemetry.jsx';

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
  
  // Core State
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

  // --- 15 Premium Features State ---
  // Feature 1: Whiteboard & Live Annotation
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // Feature 2: AI Video Filters & Color Grading
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('normal');
  const [beautyGlow, setBeautyGlow] = useState(false);

  // Feature 3: Virtual Backdrops & Ambient Lighting
  const [activeBackdrop, setActiveBackdrop] = useState('none');

  // Feature 4: In-Call Virtual Luxury Gifts & Coin Tipping
  const [showGifts, setShowGifts] = useState(false);
  const [userCoins, setUserCoins] = useState(1500);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState(null);

  // Feature 5: Peripheral & Device Management Modal
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [activeVideoDeviceId, setActiveVideoDeviceId] = useState(null);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState(null);

  // Feature 6: Camera Front/Back Switcher
  const [facingMode, setFacingMode] = useState('user');

  // Feature 7: Studio Audio Noise Suppression
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Feature 8: Live Speech-to-Text Closed Captions
  const [showCaptions, setShowCaptions] = useState(false);

  // Feature 9: In-Call Encrypted Notes & Agenda Scratchpad
  const [showNotes, setShowNotes] = useState(false);

  // Feature 10: WebRTC Telemetry & Signal Quality Health Monitor
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Feature 11: Multi-View Dynamic Layout Engine (Focus / Bento Duo Split / Swapped / Theater)
  const [layoutMode, setLayoutMode] = useState('focus'); // 'focus' | 'split' | 'swapped' | 'theater'

  // Feature 12: Call Session HD Recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Feature 13: Instant HD Video Call Snapshot with Flash FX
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState(false);

  // Feature 14: Audio Frequency Spectrum & Speaking Visualizer Level
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Feature 15: Native Picture-in-Picture & Video Feed Swapping
  const [isPiPActive, setIsPiPActive] = useState(false);

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

  // Recording Timer
  useEffect(() => {
    let recTimer = null;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

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

  // Audio Level Visualizer Setup
  const setupAudioVisualizer = useCallback((stream) => {
    try {
      if (!window.AudioContext && !window.webkitAudioContext) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn("Audio visualizer initialization skipped:", err);
    }
  }, []);

  // 1. Fetch user authentication, coins, and peer profile info
  useEffect(() => {
    const initProfiles = async () => {
      console.log("🔍 Incoming Call Routing State Check -> peerUserId:", peerUserId, "| Role Parameter:", URLRole);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setCurrentUserId(user.id);

      // Fetch user coins / balance for gift tipping
      const { data: myProf } = await supabase
        .from('profiles')
        .select('coins, balance')
        .eq('id', user.id)
        .maybeSingle();
      if (myProf) {
        setUserCoins(myProf.coins || Math.round(Number(myProf.balance || 0) * 10) || 1200);
      }

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
        // A. Mount Local Media Tracks First with high-definition constraints
        setCallStatus("Accessing devices...");
        const streamConstraints = { 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: facingMode
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: noiseSuppression,
            autoGainControl: true
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);

        if (!isComponentMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Setup audio visualizer for live mic speaking ripple
        setupAudioVisualizer(stream);

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

        // In-Call Luxury Gift Broadcast
        socket.on('in_call_luxury_gift', (gift) => {
          setActiveGiftAnimation(gift);
          try {
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch (e) {
            console.warn(e);
          }
          setTimeout(() => setActiveGiftAnimation(null), 3500);
        });

      } catch (err) {
        console.error("System device acquisition or socket binding fault:", err);
        if (isComponentMounted) setCallStatus("Hardware Error");
      }
    };

    initializeMediaAndSignaling();

    return () => {
      isComponentMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      cleanUpCall();
    };
  }, [currentUserId, peerUserId, URLRole, facingMode, noiseSuppression, setupAudioVisualizer]); 

  // Feature: Flip Camera Switcher (Front/Back)
  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (pcRef.current && newVideoTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      localStreamRef.current = newStream;
    } catch (e) {
      console.warn("Could not switch camera facing mode:", e);
    }
  };

  // Feature: Switch Camera Device by ID
  const handleSwitchCamera = async (deviceId) => {
    setActiveVideoDeviceId(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: true
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (pcRef.current && newVideoTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      localStreamRef.current = newStream;
    } catch (e) {
      console.warn("Could not switch camera device:", e);
    }
  };

  // Feature: Switch Microphone Device by ID
  const handleSwitchMicrophone = async (deviceId) => {
    setActiveAudioDeviceId(deviceId);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { deviceId: { exact: deviceId } }
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (pcRef.current && newAudioTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(newAudioTrack);
      }
    } catch (e) {
      console.warn("Could not switch microphone device:", e);
    }
  };

  // Feature: Toggle Screen Sharing
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

  // Feature: HD Snapshot Shutter Flash Capture
  const handleTakeSnapshot = () => {
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 250);

    const videoEl = remoteVideoRef.current || localVideoRef.current;
    if (!videoEl) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Add watermark timestamp
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`MPADE UNIVERSE HD • ${new Date().toLocaleTimeString()}`, 24, canvas.height - 24);

      const link = document.createElement('a');
      link.download = `universe-call-snapshot-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setSnapshotToast(true);
      setTimeout(() => setSnapshotToast(false), 3000);
    } catch (e) {
      console.warn("Snapshot capture failed:", e);
    }
  };

  // Feature: Call Session Recorder (MediaRecorder)
  const toggleCallRecording = () => {
    if (isRecording) {
      // Stop recording and save file
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      const streamToRecord = localStreamRef.current;
      if (!streamToRecord) return;

      try {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm;codecs=vp8,opus' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `universe-call-recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        recorder.start(1000);
        setIsRecording(true);
      } catch (err) {
        console.warn("Recording setup failed:", err);
      }
    }
  };

  // Feature: Native Picture-in-Picture Mode
  const togglePictureInPicture = async () => {
    if (!remoteVideoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await remoteVideoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn("Picture in picture toggling failed:", err);
    }
  };

  // Feature: Send Luxury Virtual Gift
  const handleSendGift = (gift) => {
    if (userCoins < gift.price) {
      alert("Insufficient coins! Top up your balance to send this gift.");
      return;
    }

    setUserCoins((prev) => Math.max(0, prev - gift.price));
    setActiveGiftAnimation(gift);
    setTimeout(() => setActiveGiftAnimation(null), 3500);

    const roomId = [currentUserId, peerUserId].sort().join("-");
    socketRef.current?.emit('in_call_luxury_gift', { roomId, gift });
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

  // Get active CSS filter string
  const currentFilterStyle = VIDEO_FILTERS.find((f) => f.id === activeFilter)?.filter || 'none';
  const filterBeautyCombined = beautyGlow ? `${currentFilterStyle} brightness(1.06) saturate(1.1)` : currentFilterStyle;
  const currentBackdropClass = VIRTUAL_BACKDROPS.find((b) => b.id === activeBackdrop)?.bg || '';

  return (
    <div className={`fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-5 font-sans select-none overflow-hidden ${currentBackdropClass}`}>
      
      {/* Shutter Flash Animation Overlay */}
      <AnimatePresence>
        {isFlashActive && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Snapshot Toast Confirmation */}
      <AnimatePresence>
        {snapshotToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 z-50 bg-cyan-500 text-black font-black text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Check size={14} /> HD Call Snapshot Saved to Device!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated 3D Luxury Gift Burst Overlay */}
      <AnimatePresence>
        {activeGiftAnimation && (
          <motion.div
            initial={{ scale: 0.2, opacity: 0, y: 50 }}
            animate={{ scale: [0.2, 1.4, 1.2, 1], opacity: 1, y: 0 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center"
          >
            <div className="text-7xl sm:text-9xl drop-shadow-[0_0_40px_rgba(236,72,153,0.9)] animate-bounce">
              {activeGiftAnimation.icon}
            </div>
            <div className="mt-4 bg-black/80 backdrop-blur-xl border border-pink-500/40 px-6 py-2 rounded-full text-center shadow-2xl">
              <p className="text-sm font-black text-pink-400 uppercase tracking-widest">{activeGiftAnimation.name}</p>
              <p className="text-[10px] text-amber-300 font-mono">+{activeGiftAnimation.price} Coins</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar with Multi-Tool Status Badges */}
      <div className="w-full max-w-xl flex justify-between items-center bg-zinc-900/80 px-3.5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl z-30 shadow-2xl">
        <div className="flex items-center gap-2">
          {/* Encryption Indicator & Telemetry Modal Toggle */}
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            title="View Connection Health & Telemetry"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 transition-colors"
          >
            <Shield size={13} className="text-cyan-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">HD • E2EE</span>
            <Activity size={12} className="text-emerald-400 ml-0.5 animate-pulse" />
          </button>

          {/* Recording Badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-400 px-2.5 py-1 rounded-xl text-[10px] font-mono font-black animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              REC {formatTime(recordingDuration)}
            </div>
          )}
        </div>
        
        {/* Call Timer & Secondary Header Tools */}
        <div className="flex items-center gap-1.5">
          {callStatus === "Connected" && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              {formatTime(callDuration)}
            </span>
          )}

          {/* Layout Mode Cycle Button */}
          <button
            onClick={() => {
              const modes = ['focus', 'split', 'theater'];
              const nextIndex = (modes.indexOf(layoutMode) + 1) % modes.length;
              setLayoutMode(modes[nextIndex]);
            }}
            title={`Current Layout: ${layoutMode.toUpperCase()} (Click to toggle)`}
            className={`p-1.5 rounded-xl transition-colors ${layoutMode !== 'focus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            <LayoutGrid size={15} />
          </button>

          {/* In-Call Notes Toggle Button */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="In-Call Notes & Agenda"
            className={`p-1.5 rounded-xl transition-colors ${showNotes ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            <FileText size={15} />
          </button>

          {/* Device & Audio Manager Settings Button */}
          <button
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            title="Hardware Device Settings"
            className="p-1.5 rounded-xl bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Main Video Stage with Dynamic Multi-View Grid Support */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 relative w-full max-w-xl rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
        
        {/* Layout Mode: Split 50/50 Duo View */}
        {layoutMode === 'split' ? (
          <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-1 p-1 bg-black">
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/10">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                style={{ filter: filterBeautyCombined }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-300">
                @{peerProfile?.username || 'Peer'}
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/10">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                style={{ filter: filterBeautyCombined }}
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <VideoOff size={20} />
                  <p className="text-[10px] font-bold uppercase">You (Cam Off)</p>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                <span>You</span>
                {micAudioLevel > 15 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </div>
            </div>
          </div>
        ) : (
          /* Layout Mode: Focus / Speaker Mode */
          <div className="w-full h-full relative">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ filter: filterBeautyCombined }}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Local Camera Picture-in-Picture Box with Interactive Swap & Audio Meter Ring */}
            <motion.div 
              drag
              dragConstraints={{ left: -150, right: 10, top: -250, bottom: 10 }}
              onClick={() => setLayoutMode(layoutMode === 'swapped' ? 'focus' : 'swapped')}
              title="Click to swap feeds or drag around"
              className={`absolute bottom-4 right-4 w-28 h-40 bg-black/75 border-2 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl cursor-pointer transition-all ${
                micAudioLevel > 20 ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'border-white/20'
              }`}
            >
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                style={{ filter: filterBeautyCombined }}
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <VideoOff size={18} />
                  <p className="text-[9px] font-bold uppercase tracking-wider">Cam Off</p>
                </div>
              )}
              
              {/* Speaking audio wave indicator on PiP tile */}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-zinc-300 flex items-center gap-1">
                <span>You</span>
                {micAudioLevel > 15 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
            </motion.div>
          </div>
        )}

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

        {/* Connecting / Ringing Placeholder with Speaking Ripple */}
        {callStatus !== "Connected" && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
            <div className="relative">
              {/* Pulsing radar waves */}
              <div className="absolute -inset-4 rounded-full bg-cyan-500/20 animate-ping" />
              <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse" />
              {peerProfile?.avatar_url ? (
                <img 
                  src={peerProfile.avatar_url} 
                  alt="Peer Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/50 relative z-10 shadow-2xl shadow-cyan-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center relative z-10 shadow-2xl shadow-cyan-500/30">
                  <Video size={36} className="text-cyan-400" />
                </div>
              )}
            </div>
            <div className="text-center z-10">
              <h2 className="text-xl font-black tracking-tight text-white">@{peerProfile?.username || 'User'}</h2>
              <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">{callStatus}</p>
            </div>
          </div>
        )}

        {/* Top Quick Actions Bar (Gifts, Snapshot, Filter, Whiteboard, Captions) */}
        {callStatus === "Connected" && layoutMode !== 'theater' && (
          <div className="absolute top-3 inset-x-3 z-20 flex justify-between items-center pointer-events-none">
            {/* Reactions Bar */}
            <div className="flex gap-1 bg-black/50 backdrop-blur-md p-1 rounded-2xl border border-white/10 pointer-events-auto">
              {['❤️', '🔥', '👏', '🎉', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReactionBurst(emoji)}
                  className="p-1 hover:bg-white/15 rounded-xl transition-transform active:scale-125 text-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick Utility Cluster */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-2xl border border-white/10 pointer-events-auto">
              {/* Snapshot Button */}
              <button
                type="button"
                onClick={handleTakeSnapshot}
                title="Take HD Call Snapshot"
                className="p-1.5 hover:bg-white/15 rounded-xl text-cyan-300 transition-transform active:scale-95"
              >
                <Camera size={15} />
              </button>

              {/* AI Video Filters & Studio Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                title="AI Video Filters & Lighting"
                className={`p-1.5 rounded-xl transition-colors ${showFilters || activeFilter !== 'normal' ? 'bg-cyan-500 text-black' : 'hover:bg-white/15 text-pink-300'}`}
              >
                <Wand2 size={15} />
              </button>

              {/* Whiteboard Toggle */}
              <button
                type="button"
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                title="Collaborative Whiteboard"
                className={`p-1.5 rounded-xl transition-colors ${showWhiteboard ? 'bg-amber-400 text-black' : 'hover:bg-white/15 text-amber-300'}`}
              >
                <Radio size={15} />
              </button>

              {/* Send Gift Button */}
              <button
                type="button"
                onClick={() => setShowGifts(!showGifts)}
                title="Send Luxury Gift"
                className="p-1.5 hover:bg-white/15 rounded-xl text-rose-300 transition-transform active:scale-95"
              >
                <Gift size={15} />
              </button>

              {/* Live Speech Captions Toggle */}
              <button
                type="button"
                onClick={() => setShowCaptions(!showCaptions)}
                title="Live Subtitles / Closed Captions"
                className={`p-1.5 rounded-xl transition-colors ${showCaptions ? 'bg-cyan-500 text-black' : 'hover:bg-white/15 text-zinc-300'}`}
              >
                <Subtitles size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Feature Component Overlays */}
        {/* 1. Live Closed Captions */}
        <VideoCallCaptions isEnabled={showCaptions} onClose={() => setShowCaptions(false)} />

        {/* 2. Interactive Whiteboard */}
        <VideoCallWhiteboard 
          isOpen={showWhiteboard} 
          onClose={() => setShowWhiteboard(false)}
        />

        {/* 3. AI Looks & Studio Filters Modal */}
        <VideoCallFilters 
          isOpen={showFilters} 
          onClose={() => setShowFilters(false)}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          activeBackdrop={activeBackdrop}
          onSelectBackdrop={setActiveBackdrop}
          beautyGlow={beautyGlow}
          onToggleBeautyGlow={() => setBeautyGlow(!beautyGlow)}
        />

        {/* 4. Luxury Gift Tray */}
        <VideoCallGifts 
          isOpen={showGifts} 
          onClose={() => setShowGifts(false)}
          onSendGift={handleSendGift}
          userCoins={userCoins}
        />

        {/* 5. Device Manager Settings */}
        <VideoCallDeviceSettings 
          isOpen={showDeviceSettings}
          onClose={() => setShowDeviceSettings(false)}
          activeVideoDeviceId={activeVideoDeviceId}
          activeAudioDeviceId={activeAudioDeviceId}
          onSwitchCamera={handleSwitchCamera}
          onSwitchMicrophone={handleSwitchMicrophone}
          noiseSuppression={noiseSuppression}
          onToggleNoiseSuppression={() => setNoiseSuppression(!noiseSuppression)}
          facingMode={facingMode}
          onFlipCamera={handleFlipCamera}
        />

        {/* 6. In-Call Notes & Agenda Scratchpad */}
        <VideoCallNotes 
          isOpen={showNotes} 
          onClose={() => setShowNotes(false)} 
          peerName={peerProfile?.username || 'User'}
        />

        {/* 7. Connection Telemetry & Health Monitor */}
        <VideoCallTelemetry 
          isOpen={showTelemetry} 
          onClose={() => setShowTelemetry(false)} 
          pc={pcRef.current} 
          callStatus={callStatus}
        />

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

      {/* Floating Bottom Control Console */}
      <div className="w-full max-w-xl flex items-center justify-around bg-zinc-900/90 border border-white/10 px-3.5 py-2.5 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        {/* Mic Mute / Unmute */}
        <button 
          type="button"
          onClick={() => setIsMuted(!isMuted)} 
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`p-3 rounded-2xl transition-all relative ${
            isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          {!isMuted && micAudioLevel > 15 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </button>

        {/* Video Camera Toggle */}
        <button 
          type="button"
          onClick={() => setIsVideoOff(!isVideoOff)} 
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          className={`p-3 rounded-2xl transition-all ${
            isVideoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        {/* Screen Sharing Toggle */}
        <button 
          type="button"
          onClick={toggleScreenShare} 
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          className={`p-3 rounded-2xl transition-all ${
            isScreenSharing ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <Monitor size={18} />
        </button>

        {/* Call Session HD Recording Toggle */}
        <button 
          type="button"
          onClick={toggleCallRecording} 
          title={isRecording ? "Stop Call Recording" : "Record Video Call Session"}
          className={`p-3 rounded-2xl transition-all ${
            isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <Disc size={18} />
        </button>

        {/* Chat Drawer Toggle */}
        <button 
          type="button"
          onClick={() => setShowChat(!showChat)} 
          title="Toggle In-Call Chat"
          className={`p-3 rounded-2xl transition-all relative ${
            showChat ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <MessageSquare size={18} />
          {inCallMessages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* End / Hangup Call Button */}
        <button 
          type="button"
          onClick={cleanUpCall} 
          title="End Call"
          className="p-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-transform active:scale-95 shadow-xl shadow-red-600/40"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
