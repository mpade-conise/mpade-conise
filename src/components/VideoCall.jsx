import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff, Shield, Monitor,
  MessageSquare, Send, X, Wifi, WifiOff, RotateCcw
} from 'lucide-react';
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

const REACTIONS = ['❤️', '🔥', '👏', '😂', '😮', '🎉', '💯', '😍'];

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const peerUserId = searchParams.get('userId');
  const URLRole = searchParams.get('role');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('You');
  const [peerProfile, setPeerProfile] = useState(null);

  const [callStatus, setCallStatus] = useState("Initializing...");
  const [connectionQuality, setConnectionQuality] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
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
  const chatMessagesRef = useRef(null);

  const mountedRef = useRef(false);
  const endingRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const iceRestartTimerRef = useRef(null);
  const reactionTimersRef = useRef(new Map());
  const remoteStreamRef = useRef(null);

  const roomId = currentUserId && peerUserId
    ? [currentUserId, peerUserId].sort().join("-")
    : null;

  const callRole =
    URLRole === 'caller' || URLRole === 'receiver'
      ? URLRole
      : currentUserId && peerUserId
        ? (currentUserId < peerUserId ? 'caller' : 'receiver')
        : null;

  const formatTime = useCallback((secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  }, []);

  const createReactionId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const addReaction = useCallback((reaction) => {
    if (!reaction?.emoji) return;

    const reactionId = reaction.id || createReactionId();

    setFloatingReactions((prev) => [
      ...prev,
      {
        id: reactionId,
        emoji: reaction.emoji,
        senderId: reaction.senderId || null,
        senderName: reaction.senderName || 'User',
        timestamp: reaction.timestamp || Date.now()
      }
    ]);

    const existingTimer = reactionTimersRef.current.get(reactionId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== reactionId));
      reactionTimersRef.current.delete(reactionId);
    }, 2500);

    reactionTimersRef.current.set(reactionId, timer);
  }, []);

  const processIceQueue = useCallback(async () => {
    const pc = pcRef.current;

    if (!pc?.remoteDescription || iceQueueRef.current.length === 0) return;

    const queued = [...iceQueueRef.current];
    iceQueueRef.current = [];

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn("Failed processing queued ICE candidate:", error);
      }
    }
  }, []);

  const cleanupResources = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (iceRestartTimerRef.current) {
      clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }

    reactionTimersRef.current.forEach((timer) => clearTimeout(timer));
    reactionTimersRef.current.clear();

    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.onended = null;
        screenTrackRef.current.stop();
      } catch {}
      screenTrackRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onicegatheringstatechange = null;
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    remoteStreamRef.current = null;
    iceQueueRef.current = [];
  }, []);

  const sendCallCancellation = useCallback(() => {
    const socket = socketRef.current;

    if (!socket || !peerUserId || peerUserId === 'undefined' || !currentUserId) return;

    const activeRoomId = [currentUserId, peerUserId].sort().join("-");

    const cancelPayload = {
      roomId: activeRoomId,
      to: peerUserId,
      receiverId: peerUserId,
      callerId: currentUserId,
      userId: currentUserId
    };

    socket.emit('reject_incoming_call', cancelPayload);
    socket.emit('call_cancelled_by_caller', cancelPayload);
    socket.emit('decline_call', cancelPayload);
    socket.emit('cancel_call_signal', cancelPayload);
    socket.emit('peer_hung_up', cancelPayload);
  }, [currentUserId, peerUserId]);

  const endCall = useCallback((shouldNavigate = true) => {
    if (endingRef.current) return;

    endingRef.current = true;
    stopRingbackTone();

    sendCallCancellation();

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    cleanupResources();

    setCallStatus("Call ended");
    setConnectionQuality("disconnected");

    if (shouldNavigate) navigate(-1);
  }, [cleanupResources, navigate, sendCallCancellation]);

  const restartIce = useCallback(async () => {
    const pc = pcRef.current;
    const socket = socketRef.current;

    if (!pc || !socket || !socket.connected || callRole !== 'caller') return;
    if (endingRef.current || pc.signalingState !== 'stable') return;

    try {
      setCallStatus("Reconnecting...");
      setConnectionQuality("reconnecting");

      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      socket.emit('send_webrtc_offer', {
        roomId,
        streamId: roomId,
        offer,
        targetViewerId: peerUserId,
        to: peerUserId,
        iceRestart: true
      });
    } catch (error) {
      console.warn("ICE restart failed:", error);
    }
  }, [callRole, peerUserId, roomId]);

  const scheduleIceRestart = useCallback(() => {
    if (iceRestartTimerRef.current) return;

    iceRestartTimerRef.current = setTimeout(async () => {
      iceRestartTimerRef.current = null;
      await restartIce();
    }, 1500);
  }, [restartIce]);

  const initializeConnection = useCallback(async () => {
    if (!currentUserId || !peerUserId || peerUserId === 'undefined') return;
    if (!mountedRef.current || endingRef.current) return;

    try {
      setCallStatus("Accessing devices...");
      setConnectionQuality("connecting");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!mountedRef.current || endingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (!mountedRef.current || endingRef.current) return;

        const remoteStream = event.streams?.[0];

        if (!remoteStream) return;

        remoteStreamRef.current = remoteStream;

        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        const remoteVideoTrack = remoteStream.getVideoTracks()[0];

        if (remoteVideoTrack) {
          setIsRemoteVideoOff(!remoteVideoTrack.enabled);

          remoteVideoTrack.onmute = () => setIsRemoteVideoOff(true);
          remoteVideoTrack.onunmute = () => setIsRemoteVideoOff(false);
        }

        setCallStatus("Connected");
        setConnectionQuality("good");
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socketRef.current?.connected) return;

        socketRef.current.emit('webrtc_ice_candidate', {
          roomId,
          streamId: roomId,
          candidate: event.candidate,
          to: peerUserId
        });
      };

      pc.onicegatheringstatechange = () => {
        console.log("ICE gathering state:", pc.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE connection state:", state);

        if (!mountedRef.current || endingRef.current) return;

        if (state === "checking") {
          setConnectionQuality("connecting");
          if (callStatus !== "Connected") setCallStatus("Connecting...");
        }

        if (state === "connected" || state === "completed") {
          setConnectionQuality("good");
          setCallStatus("Connected");
        }

        if (state === "disconnected") {
          setConnectionQuality("reconnecting");
          setCallStatus("Reconnecting...");
          scheduleIceRestart();
        }

        if (state === "failed") {
          setConnectionQuality("poor");
          setCallStatus("Reconnecting...");
          scheduleIceRestart();
        }

        if (state === "closed") {
          setConnectionQuality("disconnected");
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("Peer connection state:", state);

        if (!mountedRef.current || endingRef.current) return;

        if (state === "connected") {
          setCallStatus("Connected");
          setConnectionQuality("good");

          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        }

        if (state === "connecting") {
          setCallStatus("Connecting...");
          setConnectionQuality("connecting");
        }

        if (state === "disconnected") {
          setCallStatus("Reconnecting...");
          setConnectionQuality("reconnecting");
          scheduleIceRestart();

          if (!reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;

              if (
                mountedRef.current &&
                pcRef.current &&
                pcRef.current.connectionState === "disconnected"
              ) {
                scheduleIceRestart();
              }
            }, 6000);
          }
        }

        if (state === "failed") {
          setCallStatus("Reconnecting...");
          setConnectionQuality("poor");
          scheduleIceRestart();

          if (!reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;

              if (
                mountedRef.current &&
                pcRef.current &&
                pcRef.current.connectionState === "failed"
              ) {
                restartIce();
              }
            }, 2500);
          }
        }
      });

      const socket = io(SOCKET_SERVER_URL, {
        transports: ['polling', 'websocket'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      socketRef.current = socket;

      socket.on('connect', async () => {
        if (!mountedRef.current || endingRef.current) return;

        console.log("Connected to signaling server:", socket.id);

        socket.emit('register_user_session', {
          userId: currentUserId
        });

        socket.emit('join_call_room', {
          roomId,
          userId: currentUserId,
          targetPeerId: peerUserId
        });

        if (callRole === 'caller') {
          setCallStatus("Calling user...");
          setConnectionQuality("connecting");

          const { data: myProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', currentUserId)
            .maybeSingle();

          if (myProfile?.username) {
            setCurrentUserName(myProfile.username);
          }

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
            roomId
          };

          socket.emit('initiate_call_signal', callSignalData);
          socket.emit('incoming_call_signal', callSignalData);
          socket.emit('incoming_call', callSignalData);

          try {
            const realtimeChan = supabase.channel(`user-call-signals-${peerUserId}`);

            realtimeChan.subscribe((status) => {
              if (status === 'SUBSCRIBED' && mountedRef.current && !endingRef.current) {
                realtimeChan.send({
                  type: 'broadcast',
                  event: 'incoming_call_broadcast',
                  payload: callSignalData
                });
              }
            });
          } catch (error) {
            console.warn("Supabase incoming call fallback unavailable:", error);
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('send_webrtc_offer', {
            roomId,
            streamId: roomId,
            offer,
            targetViewerId: peerUserId,
            to: peerUserId
          });
        } else {
          setCallStatus("Awaiting Connection...");
          setConnectionQuality("connecting");

          socket.emit('peer_ready', {
            roomId,
            userId: currentUserId
          });
        }
      });

      socket.on('connect_error', (error) => {
        console.warn("Signaling connection error:", error);

        if (!mountedRef.current || endingRef.current) return;

        setCallStatus("Reconnecting...");
        setConnectionQuality("reconnecting");
      });

      socket.on('disconnect', (reason) => {
        console.warn("Signaling disconnected:", reason);

        if (!mountedRef.current || endingRef.current) return;

        setCallStatus("Reconnecting...");
        setConnectionQuality("reconnecting");
      });

      socket.on('peer_ready', async () => {
        if (!mountedRef.current || endingRef.current) return;
        if (callRole !== 'caller' || !pcRef.current) return;

        try {
          if (pcRef.current.signalingState !== "stable") return;

          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);

          socket.emit('send_webrtc_offer', {
            roomId,
            streamId: roomId,
            offer,
            targetViewerId: peerUserId,
            to: peerUserId
          });
        } catch (error) {
          console.warn("Peer-ready offer failed:", error);
        }
      });

      socket.on('webrtc_offer_received', async ({ offer }) => {
        if (!mountedRef.current || endingRef.current || !pcRef.current) return;
        if (callRole === 'caller' && pcRef.current.signalingState !== "stable") return;

        try {
          setCallStatus("Answering call...");
          setConnectionQuality("connecting");

          const currentPc = pcRef.current;

          await currentPc.setRemoteDescription(
            new RTCSessionDescription(offer)
          );

          await processIceQueue();

          const answer = await currentPc.createAnswer();

          await currentPc.setLocalDescription(answer);

          socket.emit('send_webrtc_answer', {
            roomId,
            streamId: roomId,
            answer,
            to: peerUserId
          });
        } catch (error) {
          console.error("Failed handling WebRTC offer:", error);
        }
      });

      socket.on('webrtc_answer_received', async ({ answer }) => {
        if (!mountedRef.current || endingRef.current || !pcRef.current) return;

        try {
          const currentPc = pcRef.current;

          if (
            currentPc.signalingState === "have-local-offer" ||
            currentPc.signalingState === "have-local-pranswer"
          ) {
            await currentPc.setRemoteDescription(
              new RTCSessionDescription(answer)
            );

            await processIceQueue();
          }
        } catch (error) {
          console.error("Failed handling WebRTC answer:", error);
        }
      });

      socket.on('incoming_ice_candidate', async ({ candidate }) => {
        if (!mountedRef.current || endingRef.current || !candidate) return;

        const currentPc = pcRef.current;

        if (
          currentPc?.remoteDescription &&
          currentPc.remoteDescription.type
        ) {
          try {
            await currentPc.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (error) {
            console.warn("Failed adding ICE candidate:", error);
          }
        } else {
          iceQueueRef.current.push(candidate);
        }
      });

      socket.on('in_call_text_message', (data) => {
        if (!mountedRef.current || endingRef.current || !data?.text) return;

        if (data.senderId === currentUserId) return;

        setInCallMessages((prev) => [...prev, data]);
      });

      socket.on('in_call_reaction_burst', (data) => {
        if (!mountedRef.current || endingRef.current || !data?.emoji) return;

        if (data.senderId === currentUserId) return;

        addReaction({
          id: data.id || createReactionId(),
          emoji: data.emoji,
          senderId: data.senderId || null,
          senderName: data.senderName || peerProfile?.username || 'User',
          timestamp: data.timestamp || Date.now()
        });
      });

      socket.on('peer_hung_up', () => {
        if (!mountedRef.current || endingRef.current) return;

        endingRef.current = true;
        stopRingbackTone();

        if (socketRef.current) {
          try {
            socketRef.current.disconnect();
          } catch {}
          socketRef.current = null;
        }

        cleanupResources();

        setCallStatus("Call ended");
        setConnectionQuality("disconnected");

        navigate(-1);
      });
    } catch (error) {
      console.error("Video call initialization failed:", error);

      if (!mountedRef.current || endingRef.current) return;

      setConnectionQuality("poor");

      if (error?.name === 'NotAllowedError') {
        setCallStatus("Camera/Mic permission denied");
      } else if (error?.name === 'NotFoundError') {
        setCallStatus("Camera or microphone not found");
      } else {
        setCallStatus("Hardware Error");
      }
    }
  }, [
    currentUserId,
    peerUserId,
    callRole,
    roomId,
    processIceQueue,
    scheduleIceRestart,
    restartIce,
    cleanupResources,
    navigate,
    addReaction,
    peerProfile?.username
  ]);

  useEffect(() => {
    mountedRef.current = true;

    const initProfiles = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      if (!peerUserId || peerUserId === 'undefined') {
        setCallStatus("Invalid call");
        return;
      }

      if (peerUserId === user.id) {
        setCallStatus("Invalid call");
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerUserId)
        .single();

      if (!error && data) {
        setPeerProfile(data);
      }
    };

    initProfiles();

    return () => {
      mountedRef.current = false;
      endingRef.current = true;
      stopRingbackTone();

      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }

      cleanupResources();
    };
  }, [peerUserId, navigate, cleanupResources]);

  useEffect(() => {
    if (!currentUserId || !peerUserId || peerUserId === 'undefined') return;

    endingRef.current = false;
    initializeConnection();

    return () => {
      endingRef.current = true;
      stopRingbackTone();

      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }

      cleanupResources();
    };
  }, [
    currentUserId,
    peerUserId,
    URLRole,
    initializeConnection,
    cleanupResources
  ]);

  useEffect(() => {
    let timer = null;

    if (callStatus === "Connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (
      callStatus === "Initializing..." ||
      callStatus === "Accessing devices..." ||
      callStatus === "Calling user..." ||
      callStatus === "Awaiting Connection..." ||
      callStatus === "Answering call..."
    ) {
      setCallDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  useEffect(() => {
    const statusLower = callStatus.toLowerCase();

    if (
      statusLower.includes("calling") ||
      statusLower.includes("connecting") ||
      statusLower.includes("initializing") ||
      statusLower.includes("awaiting") ||
      statusLower.includes("answering")
    ) {
      startRingbackTone();
    } else {
      stopRingbackTone();
    }

    return () => stopRingbackTone();
  }, [callStatus]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current
        .getAudioTracks()
        .forEach((track) => {
          track.enabled = !isMuted;
        });
    }
  }, [isMuted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current
        .getVideoTracks()
        .forEach((track) => {
          track.enabled = !isVideoOff;
        });
    }
  }, [isVideoOff]);

  useEffect(() => {
    if (!chatMessagesRef.current) return;

    chatMessagesRef.current.scrollTop =
      chatMessagesRef.current.scrollHeight;
  }, [inCallMessages, showChat]);

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    try {
      if (isScreenSharing) {
        if (screenTrackRef.current) {
          screenTrackRef.current.onended = null;
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }

        const cameraTrack =
          localStreamRef.current.getVideoTracks()[0];

        const sender = pcRef.current
          .getSenders()
          .find((item) => item.track?.kind === 'video');

        if (sender && cameraTrack) {
          await sender.replaceTrack(cameraTrack);
        }

        cameraTrack.enabled = !isVideoOff;
        setIsScreenSharing(false);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        screenStream.getTracks().forEach((track) => track.stop());
        return;
      }

      screenTrackRef.current = screenTrack;

      const sender = pcRef.current
        .getSenders()
        .find((item) => item.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = async () => {
        if (!mountedRef.current || endingRef.current) return;

        try {
          const cameraTrack =
            localStreamRef.current?.getVideoTracks()[0];

          const videoSender = pcRef.current
            ?.getSenders()
            .find((item) => item.track?.kind === 'video');

          if (videoSender && cameraTrack) {
            await videoSender.replaceTrack(cameraTrack);
            cameraTrack.enabled = !isVideoOff;
          }
        } catch (error) {
          console.warn("Failed restoring camera after screen share:", error);
        }

        screenTrackRef.current = null;
        setIsScreenSharing(false);
      };

      setIsScreenSharing(true);
    } catch (error) {
      console.warn("Screen sharing cancelled or failed:", error);
    }
  };

  const sendInCallMessage = (event) => {
    event?.preventDefault();

    const text = chatInput.trim();

    if (!text || !socketRef.current?.connected || !currentUserId) return;

    const msgPayload = {
      id: createReactionId(),
      senderId: currentUserId,
      senderName: currentUserName,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      timestamp: Date.now()
    };

    setInCallMessages((prev) => [...prev, msgPayload]);

    socketRef.current.emit('in_call_text_message', {
      roomId,
      ...msgPayload
    });

    setChatInput("");
  };

  const sendReactionBurst = (emoji) => {
    if (!emoji || !socketRef.current?.connected || !currentUserId) return;

    const reaction = {
      id: createReactionId(),
      emoji,
      senderId: currentUserId,
      senderName: currentUserName,
      timestamp: Date.now()
    };

    addReaction(reaction);

    socketRef.current.emit('in_call_reaction_burst', {
      roomId,
      ...reaction
    });
  };

  const getConnectionIcon = () => {
    if (connectionQuality === "good") {
      return <Wifi size={13} className="text-emerald-400" />;
    }

    if (
      connectionQuality === "reconnecting" ||
      connectionQuality === "connecting"
    ) {
      return (
        <RotateCcw
          size={13}
          className="text-amber-400 animate-spin"
        />
      );
    }

    if (
      connectionQuality === "poor" ||
      connectionQuality === "disconnected"
    ) {
      return <WifiOff size={13} className="text-red-400" />;
    }

    return <Wifi size={13} className="text-zinc-400" />;
  };

  const isConnected = callStatus === "Connected";

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-5 font-sans select-none overflow-hidden">
      <div className="w-full max-w-lg flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Shield size={15} className="text-cyan-400 shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-zinc-300 uppercase">
                Encrypted
              </span>

              <span className="w-1 h-1 rounded-full bg-zinc-600" />

              <div className="flex items-center gap-1.5">
                {getConnectionIcon()}
                <span className="text-[9px] sm:text-[10px] text-zinc-400 capitalize">
                  {connectionQuality}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {formatTime(callDuration)}
            </span>
          )}

          <span
            className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-extrabold border ${
              callStatus === "Connected"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : connectionQuality === "poor"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
            }`}
          >
            {callStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-3 relative w-full max-w-lg rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl min-h-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${
            isRemoteVideoOff ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {isRemoteVideoOff && isConnected && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-4 z-10">
            {peerProfile?.avatar_url ? (
              <img
                src={peerProfile.avatar_url}
                alt="Peer"
                className="w-28 h-28 rounded-full object-cover border-4 border-white/10 shadow-2xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <VideoOff size={34} className="text-cyan-400" />
              </div>
            )}

            <div className="text-center">
              <h2 className="text-lg font-black">
                @{peerProfile?.username || 'User'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Camera is off
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingReactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                initial={{
                  y: 100,
                  x: `${Math.random() * 60 - 30}%`,
                  opacity: 0,
                  scale: 0.5
                }}
                animate={{
                  y: -260,
                  opacity: [0, 1, 1, 0],
                  scale: [0.6, 1.5, 1.9, 1]
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.2,
                  ease: "easeOut"
                }}
                className="absolute bottom-12 left-1/2 text-4xl sm:text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!isConnected && (
          <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
            {peerProfile?.avatar_url ? (
              <img
                src={peerProfile.avatar_url}
                alt="Peer"
                className={`w-24 h-24 rounded-full object-cover border-4 ${
                  connectionQuality === "poor"
                    ? "border-red-500/40"
                    : "border-cyan-500/40"
                } animate-pulse shadow-2xl`}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse">
                <Video size={36} className="text-cyan-400" />
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-black tracking-tight">
                @{peerProfile?.username || 'User'}
              </h2>

              <p
                className={`text-xs font-mono mt-1 ${
                  connectionQuality === "poor"
                    ? "text-red-400"
                    : connectionQuality === "reconnecting"
                      ? "text-amber-400"
                      : "text-cyan-400"
                }`}
              >
                {callStatus}
              </p>

              {connectionQuality === "reconnecting" && (
                <p className="text-[10px] text-zinc-500 mt-2">
                  Trying to restore the connection...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-32 sm:h-44 bg-black/80 border border-white/20 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              isVideoOff || isScreenSharing ? 'hidden' : ''
            }`}
          />

          {isScreenSharing ? (
            <div className="flex flex-col items-center gap-1.5 text-cyan-400">
              <Monitor size={20} />
              <p className="text-[9px] font-bold uppercase tracking-wider">
                Sharing
              </p>
            </div>
          ) : isVideoOff ? (
            <div className="flex flex-col items-center gap-1 text-zinc-500">
              <VideoOff size={18} />
              <p className="text-[9px] font-bold uppercase tracking-wider">
                Cam Off
              </p>
            </div>
          ) : null}
        </div>

        {isScreenSharing && isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-black uppercase tracking-wide shadow-lg">
            You're sharing your screen
          </div>
        )}

        {isConnected && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
            <div className="flex gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReactionBurst(emoji)}
                  title={`Send ${emoji}`}
                  className="p-1.5 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {connectionQuality !== "good" && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1.5">
                {getConnectionIcon()}
                <span className="text-[9px] text-zinc-300">
                  {connectionQuality === "reconnecting"
                    ? "Reconnecting"
                    : "Poor connection"}
                </span>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-950/96 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col rounded-t-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  In-Call Chat
                </span>

                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                ref={chatMessagesRef}
                className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 no-scrollbar text-xs"
              >
                {inCallMessages.length === 0 ? (
                  <p className="text-center text-zinc-600 italic py-6">
                    No chat messages yet.
                  </p>
                ) : (
                  inCallMessages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMe ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`px-3 py-1.5 rounded-xl max-w-[80%] ${
                            isMe
                              ? 'bg-cyan-500 text-black font-semibold'
                              : 'bg-zinc-800 text-white border border-white/10'
                          }`}
                        >
                          <p className="break-words">{msg.text}</p>
                        </div>

                        <span className="text-[8px] text-zinc-500 mt-0.5">
                          {msg.time}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={sendInCallMessage}
                className="flex gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Send a quick text..."
                  maxLength={500}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg flex items-center justify-around bg-zinc-900/90 border border-white/10 px-3 py-3 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        <button
          type="button"
          onClick={() => setIsMuted((value) => !value)}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          className={`p-3.5 rounded-2xl transition-all ${
            isMuted
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          type="button"
          onClick={() => setIsVideoOff((value) => !value)}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          className={`p-3.5 rounded-2xl transition-all ${
            isVideoOff
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        <button
          type="button"
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          className={`p-3.5 rounded-2xl transition-all ${
            isScreenSharing
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <Monitor size={18} />
        </button>

        <button
          type="button"
          onClick={() => setShowChat((value) => !value)}
          title="Toggle In-Call Chat"
          className={`p-3.5 rounded-2xl transition-all relative ${
            showChat
              ? 'bg-cyan-500 text-black'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <MessageSquare size={18} />

          {inCallMessages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => endCall(true)}
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
