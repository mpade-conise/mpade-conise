import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Monitor,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  startRingbackTone,
  stopRingbackTone
} from '../utils/callNotificationEngine';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

const ACTIVE_CALL_STORAGE_KEY = 'made_universe_active_call';

const createCallId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {}

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const peerUserId = searchParams.get('userId');
  const URLRole = searchParams.get('role');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [callStatus, setCallStatus] = useState('Initializing...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState([]);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const iceQueueRef = useRef([]);
  const iceCandidateKeysRef = useRef(new Set());

  const callIdRef = useRef(createCallId());
  const roomIdRef = useRef(null);
  const callRoleRef = useRef(null);

  const invitationSentRef = useRef(false);
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);

  const lastOfferSdpRef = useRef(null);
  const lastAnswerSdpRef = useRef(null);

  const peerReadyRef = useRef(false);
  const callEndedRef = useRef(false);
  const cleanupPromiseRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeCallLockRef = useRef(false);

  const realtimeChannelsRef = useRef([]);

  const getRoomId = useCallback(() => {
    if (!currentUserId || !peerUserId) return null;
    return [currentUserId, peerUserId].sort().join('-');
  }, [currentUserId, peerUserId]);

  const setSafeStatus = useCallback((status) => {
    if (!isMountedRef.current || callEndedRef.current) return;
    setCallStatus(status);
  }, []);

  const removeActiveCallLock = useCallback(() => {
    try {
      const existing = localStorage.getItem(ACTIVE_CALL_STORAGE_KEY);

      if (!existing) return;

      const parsed = JSON.parse(existing);

      if (
        parsed?.callId === callIdRef.current ||
        parsed?.roomId === roomIdRef.current
      ) {
        localStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
    }

    activeCallLockRef.current = false;
  }, []);

  const acquireActiveCallLock = useCallback(() => {
    try {
      const existing = localStorage.getItem(ACTIVE_CALL_STORAGE_KEY);

      if (existing) {
        const parsed = JSON.parse(existing);

        if (
          parsed?.callId &&
          parsed.callId !== callIdRef.current &&
          parsed?.roomId &&
          parsed.roomId !== roomIdRef.current
        ) {
          return false;
        }
      }

      localStorage.setItem(
        ACTIVE_CALL_STORAGE_KEY,
        JSON.stringify({
          callId: callIdRef.current,
          roomId: roomIdRef.current,
          peerUserId,
          createdAt: Date.now()
        })
      );

      activeCallLockRef.current = true;
      return true;
    } catch {
      activeCallLockRef.current = true;
      return true;
    }
  }, [peerUserId]);

  const removeRealtimeChannels = useCallback(async () => {
    const channels = [...realtimeChannelsRef.current];
    realtimeChannelsRef.current = [];

    for (const channel of channels) {
      try {
        await supabase.removeChannel(channel);
      } catch {}
    }
  }, []);

  const processIceQueue = useCallback(async () => {
    const pc = pcRef.current;

    if (
      !pc ||
      pc.signalingState === 'closed' ||
      !pc.remoteDescription ||
      !pc.remoteDescription.type
    ) {
      return;
    }

    const queuedCandidates = [...iceQueueRef.current];
    iceQueueRef.current = [];

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Unable to process queued ICE candidate:', error);
      }
    }
  }, []);

  const emitHangupOnce = useCallback(() => {
    const socket = socketRef.current;

    if (
      !socket ||
      !socket.connected ||
      !peerUserId ||
      !roomIdRef.current ||
      callEndedRef.current
    ) {
      return;
    }

    socket.emit('peer_hung_up', {
      roomId: roomIdRef.current,
      streamId: roomIdRef.current,
      callId: callIdRef.current,
      from: currentUserId,
      fromUserId: currentUserId,
      to: peerUserId,
      targetUserId: peerUserId,
      receiverId: peerUserId
    });
  }, [currentUserId, peerUserId]);

  const cleanUpCall = useCallback(
    async (notifyPeer = true, shouldNavigate = true, finalStatus = 'Call Ended') => {
      if (cleanupPromiseRef.current) {
        return cleanupPromiseRef.current;
      }

      cleanupPromiseRef.current = (async () => {
        if (callEndedRef.current) {
          removeActiveCallLock();

          if (
            shouldNavigate &&
            !hasNavigatedRef.current &&
            isMountedRef.current
          ) {
            hasNavigatedRef.current = true;
            navigate(-1);
          }

          return;
        }

        callEndedRef.current = true;

        stopRingbackTone();

        if (isMountedRef.current) {
          setCallStatus(finalStatus);
        }

        if (notifyPeer) {
          try {
            emitHangupOnce();
          } catch (error) {
            console.warn('Unable to notify peer about call ending:', error);
          }
        }

        if (screenTrackRef.current) {
          try {
            screenTrackRef.current.stop();
          } catch {}

          screenTrackRef.current = null;
        }

        const localStream = localStreamRef.current;

        if (localStream) {
          localStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });

          localStreamRef.current = null;
        }

        if (localVideoRef.current) {
          try {
            localVideoRef.current.pause();
            localVideoRef.current.srcObject = null;
          } catch {}
        }

        if (remoteVideoRef.current) {
          try {
            remoteVideoRef.current.pause();
            remoteVideoRef.current.srcObject = null;
          } catch {}
        }

        const pc = pcRef.current;

        if (pc) {
          try {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.oniceconnectionstatechange = null;
            pc.onsignalingstatechange = null;
            pc.onnegotiationneeded = null;
          } catch {}

          try {
            if (pc.signalingState !== 'closed') {
              pc.close();
            }
          } catch {}

          pcRef.current = null;
        }

        iceQueueRef.current = [];
        iceCandidateKeysRef.current.clear();

        offerSentRef.current = false;
        answerSentRef.current = false;
        peerReadyRef.current = false;
        invitationSentRef.current = false;
        lastOfferSdpRef.current = null;
        lastAnswerSdpRef.current = null;

        const socket = socketRef.current;

        if (socket) {
          try {
            socket.removeAllListeners();
          } catch {}

          try {
            socket.disconnect();
          } catch {}

          socketRef.current = null;
        }

        await removeRealtimeChannels();
        removeActiveCallLock();

        if (
          shouldNavigate &&
          !hasNavigatedRef.current &&
          isMountedRef.current
        ) {
          hasNavigatedRef.current = true;
          navigate(-1);
        }
      })();

      return cleanupPromiseRef.current;
    },
    [
      emitHangupOnce,
      navigate,
      removeActiveCallLock,
      removeRealtimeChannels
    ]
  );

  // Call duration timer
  useEffect(() => {
    let timer = null;

    if (callStatus === 'Connected' && !callEndedRef.current) {
      timer = setInterval(() => {
        setCallDuration((previous) => previous + 1);
      }, 1000);
    } else if (callStatus !== 'Connected') {
      setCallDuration(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Ringback sound
  useEffect(() => {
    if (callEndedRef.current) {
      stopRingbackTone();
      return undefined;
    }

    const status = callStatus.toLowerCase();

    const shouldRing =
      status.includes('calling') ||
      status.includes('connecting') ||
      status.includes('initializing') ||
      status.includes('awaiting');

    if (shouldRing) {
      startRingbackTone();
    } else {
      stopRingbackTone();
    }

    return () => stopRingbackTone();
  }, [callStatus]);

  // Authentication + peer profile
  useEffect(() => {
    let cancelled = false;

    const initProfiles = async () => {
      if (!peerUserId || peerUserId === 'undefined') {
        setCallStatus('Invalid Call');
        return;
      }

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerUserId)
        .single();

      if (!cancelled && !error && data) {
        setPeerProfile(data);
      }
    };

    initProfiles();

    return () => {
      cancelled = true;
    };
  }, [peerUserId, navigate]);

  // Main call engine
  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId === 'undefined'
    ) {
      return undefined;
    }

    let componentAlive = true;
    let localSocket = null;
    let localPc = null;

    const callRole =
      URLRole === 'caller' || URLRole === 'receiver'
        ? URLRole
        : currentUserId < peerUserId
          ? 'caller'
          : 'receiver';

    const roomId = [currentUserId, peerUserId].sort().join('-');

    roomIdRef.current = roomId;
    callRoleRef.current = callRole;

    console.log(
      `☎️ WebRTC call ${callIdRef.current} | role=${callRole} | room=${roomId}`
    );

    if (!acquireActiveCallLock()) {
      setCallStatus('Another call is already active');
      setTimeout(() => {
        if (componentAlive && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(-1);
        }
      }, 900);

      return () => {
        componentAlive = false;
      };
    }

    const isUsableSocket = () => {
      return (
        localSocket &&
        localSocket.connected &&
        componentAlive &&
        !callEndedRef.current
      );
    };

    const sendOffer = async (forceIceRestart = false) => {
      const pc = pcRef.current;
      const socket = socketRef.current;

      if (
        !pc ||
        !socket ||
        !socket.connected ||
        callEndedRef.current ||
        callRoleRef.current !== 'caller'
      ) {
        return;
      }

      if (pc.signalingState !== 'stable') {
        return;
      }

      if (offerSentRef.current && !forceIceRestart) {
        return;
      }

      try {
        setSafeStatus('Connecting...');

        const offer = await pc.createOffer(
          forceIceRestart
            ? { iceRestart: true }
            : {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              }
        );

        if (
          callEndedRef.current ||
          !componentAlive ||
          pc.signalingState === 'closed'
        ) {
          return;
        }

        await pc.setLocalDescription(offer);

        if (
          !pc.localDescription ||
          !socket.connected ||
          callEndedRef.current
        ) {
          return;
        }

        offerSentRef.current = true;
        lastOfferSdpRef.current = pc.localDescription.sdp || null;

        socket.emit('send_webrtc_offer', {
          roomId,
          streamId: roomId,
          callId: callIdRef.current,
          offer: pc.localDescription,
          targetViewerId: peerUserId,
          targetUserId: peerUserId,
          to: peerUserId,
          from: currentUserId
        });

        console.log('📤 WebRTC offer sent once:', callIdRef.current);
      } catch (error) {
        offerSentRef.current = false;
        console.error('WebRTC offer creation failed:', error);

        if (componentAlive && !callEndedRef.current) {
          setCallStatus('Connection Failed');
        }
      }
    };

    const initializeMediaAndSignaling = async () => {
      try {
        setSafeStatus(
          callRole === 'caller'
            ? 'Accessing devices...'
            : 'Preparing call...'
        );

        const mediaConstraints = {
          video: {
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16
          }
        };

        let stream;

        try {
          stream = await navigator.mediaDevices.getUserMedia(
            mediaConstraints
          );
        } catch (mediaError) {
          console.warn(
            'HD media failed, trying lightweight media:',
            mediaError
          );

          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640, max: 1280 },
              height: { ideal: 360, max: 720 },
              frameRate: { ideal: 24, max: 30 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });
        }

        if (!componentAlive || callEndedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];

        if (audioTrack) {
          try {
            await audioTrack.applyConstraints({
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            });
          } catch (audioConstraintError) {
            console.warn(
              'Advanced audio constraints not supported:',
              audioConstraintError
            );
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;

          try {
            await localVideoRef.current.play();
          } catch {}
        }

        localPc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
        pcRef.current = localPc;

        stream.getTracks().forEach((track) => {
          localPc.addTrack(track, stream);
        });

        localPc.ontrack = (event) => {
          if (
            !componentAlive ||
            callEndedRef.current ||
            !event.streams?.[0]
          ) {
            return;
          }

          const remoteStream = event.streams[0];

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;

            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1;

            remoteVideoRef.current
              .play()
              .catch(() => {});
          }

          setSafeStatus('Connected');
        };

        localPc.onicecandidate = (event) => {
          if (
            !event.candidate ||
            !isUsableSocket()
          ) {
            return;
          }

          const candidate = event.candidate.toJSON
            ? event.candidate.toJSON()
            : event.candidate;

          const candidateKey = [
            candidate.candidate,
            candidate.sdpMid,
            candidate.sdpMLineIndex
          ].join('|');

          if (iceCandidateKeysRef.current.has(candidateKey)) {
            return;
          }

          iceCandidateKeysRef.current.add(candidateKey);

          localSocket.emit('webrtc_ice_candidate', {
            roomId,
            streamId: roomId,
            callId: callIdRef.current,
            candidate,
            to: peerUserId,
            from: currentUserId
          });
        };

        localPc.onconnectionstatechange = () => {
          if (!componentAlive || callEndedRef.current) return;

          const state = localPc.connectionState;

          console.log('🔗 WebRTC connection state:', state);

          if (state === 'connected') {
            setSafeStatus('Connected');
            stopRingbackTone();
            return;
          }

          if (state === 'connecting') {
            setSafeStatus('Connecting...');
            return;
          }

          if (state === 'disconnected') {
            setSafeStatus('Reconnecting...');
            return;
          }

          if (state === 'failed') {
            setSafeStatus('Connection Failed');
          }

          if (state === 'closed') {
            setSafeStatus('Call Ended');
          }
        };

        localPc.oniceconnectionstatechange = () => {
          if (!componentAlive || callEndedRef.current) return;

          const state = localPc.iceConnectionState;

          console.log('🧊 ICE state:', state);

          if (state === 'checking') {
            if (callRole === 'caller') {
              setSafeStatus('Connecting...');
            }
          }

          if (state === 'connected' || state === 'completed') {
            setSafeStatus('Connected');
          }

          if (state === 'failed') {
            setSafeStatus('Connection Failed');
          }
        };

        localPc.onsignalingstatechange = () => {
          if (!componentAlive || callEndedRef.current) return;

          console.log(
            '📡 Signaling state:',
            localPc.signalingState
          );
        };

        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 500,
          reconnectionDelayMax: 3000,
          forceNew: true
        });

        localSocket = socket;
        socketRef.current = socket;

        socket.on('connect', async () => {
          if (!componentAlive || callEndedRef.current) return;

          console.log(
            `🟢 Signaling connected: ${socket.id}`
          );

          socket.emit('register_user_session', {
            userId: currentUserId,
            callId: callIdRef.current,
            roomId
          });

          socket.emit('join_call_room', {
            roomId,
            userId: currentUserId,
            targetPeerId: peerUserId,
            callId: callIdRef.current
          });

          if (callRole === 'caller') {
            if (!invitationSentRef.current) {
              invitationSentRef.current = true;

              const { data: myProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', currentUserId)
                .maybeSingle();

              if (!componentAlive || callEndedRef.current) return;

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
                roomId,
                callId: callIdRef.current
              };

              // ONE canonical incoming-call signal only.
              socket.emit(
                'initiate_call_signal',
                callSignalData
              );

              setSafeStatus('Calling user...');

              console.log(
                '📞 Incoming-call invitation sent once:',
                callIdRef.current
              );
            }

            if (peerReadyRef.current && !offerSentRef.current) {
              await sendOffer(false);
            }
          } else {
            setSafeStatus('Waiting for caller...');

            socket.emit('peer_ready', {
              roomId,
              userId: currentUserId,
              targetPeerId: peerUserId,
              callId: callIdRef.current
            });
          }
        });

        socket.on('connect_error', (error) => {
          if (!componentAlive || callEndedRef.current) return;

          console.warn(
            'Signaling connection error:',
            error?.message || error
          );

          setSafeStatus('Connecting...');
        });

        socket.on('peer_ready', async (data) => {
          if (
            !componentAlive ||
            callEndedRef.current ||
            callRole !== 'caller'
          ) {
            return;
          }

          if (
            data?.callId &&
            data.callId !== callIdRef.current
          ) {
            return;
          }

          peerReadyRef.current = true;

          console.log('⚡ Receiver is ready');

          if (
            localPc &&
            localPc.signalingState === 'stable' &&
            !offerSentRef.current
          ) {
            await sendOffer(false);
          }
        });

        socket.on(
          'webrtc_offer_received',
          async ({ offer, callId }) => {
            if (
              !componentAlive ||
              callEndedRef.current ||
              !localPc ||
              callRole === 'caller'
            ) {
              return;
            }

            if (
              callId &&
              callId !== callIdRef.current
            ) {
              return;
            }

            if (!offer?.sdp) return;

            // Prevent the same offer from being processed repeatedly.
            if (lastOfferSdpRef.current === offer.sdp) {
              console.log('⏭️ Duplicate offer ignored');
              return;
            }

            if (
              localPc.signalingState !== 'stable' &&
              localPc.signalingState !== 'have-remote-offer'
            ) {
              console.log(
                '⏭️ Offer ignored because signaling state is:',
                localPc.signalingState
              );
              return;
            }

            try {
              setSafeStatus('Answering call...');

              lastOfferSdpRef.current = offer.sdp;

              await localPc.setRemoteDescription(
                new RTCSessionDescription(offer)
              );

              await processIceQueue();

              const answer = await localPc.createAnswer();

              await localPc.setLocalDescription(answer);

              if (
                !localPc.localDescription ||
                callEndedRef.current ||
                !socket.connected
              ) {
                return;
              }

              answerSentRef.current = true;
              lastAnswerSdpRef.current =
                localPc.localDescription.sdp || null;

              socket.emit('send_webrtc_answer', {
                roomId,
                streamId: roomId,
                callId: callIdRef.current,
                answer: localPc.localDescription,
                to: peerUserId,
                from: currentUserId
              });

              console.log('📤 WebRTC answer sent');

              setSafeStatus('Connecting...');
            } catch (error) {
              console.error(
                'Failed processing WebRTC offer:',
                error
              );

              if (componentAlive && !callEndedRef.current) {
                setSafeStatus('Connection Failed');
              }
            }
          }
        );

        socket.on(
          'webrtc_answer_received',
          async ({ answer, callId }) => {
            if (
              !componentAlive ||
              callEndedRef.current ||
              !localPc ||
              callRole !== 'caller'
            ) {
              return;
            }

            if (
              callId &&
              callId !== callIdRef.current
            ) {
              return;
            }

            if (!answer?.sdp) return;

            if (lastAnswerSdpRef.current === answer.sdp) {
              console.log('⏭️ Duplicate answer ignored');
              return;
            }

            if (
              localPc.signalingState !== 'have-local-offer'
            ) {
              console.log(
                '⏭️ Answer ignored. Current signaling state:',
                localPc.signalingState
              );
              return;
            }

            try {
              lastAnswerSdpRef.current = answer.sdp;

              await localPc.setRemoteDescription(
                new RTCSessionDescription(answer)
              );

              await processIceQueue();

              setSafeStatus('Connecting...');

              console.log(
                '📥 WebRTC answer accepted'
              );
            } catch (error) {
              console.error(
                'Failed setting WebRTC answer:',
                error
              );

              if (componentAlive && !callEndedRef.current) {
                setSafeStatus('Connection Failed');
              }
            }
          }
        );

        socket.on(
          'incoming_ice_candidate',
          async ({ candidate, callId }) => {
            if (
              !componentAlive ||
              callEndedRef.current ||
              !candidate
            ) {
              return;
            }

            if (
              callId &&
              callId !== callIdRef.current
            ) {
              return;
            }

            const candidateKey = [
              candidate.candidate,
              candidate.sdpMid,
              candidate.sdpMLineIndex
            ].join('|');

            if (
              iceCandidateKeysRef.current.has(candidateKey)
            ) {
              return;
            }

            iceCandidateKeysRef.current.add(candidateKey);

            const pc = pcRef.current;

            if (
              pc &&
              pc.remoteDescription &&
              pc.remoteDescription.type
            ) {
              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(candidate)
                );
              } catch (error) {
                console.warn(
                  'ICE candidate rejected:',
                  error
                );
              }
            } else {
              iceQueueRef.current.push(candidate);
            }
          }
        );

        // Caller receives this when receiver declines/hangs up.
        const handleRemoteCallEnded = (data = {}) => {
          if (!componentAlive || callEndedRef.current) {
            return;
          }

          if (
            data?.callId &&
            data.callId !== callIdRef.current
          ) {
            return;
          }

          const statusText =
            callRole === 'caller'
              ? 'Call Declined'
              : 'Call Ended';

          stopRingbackTone();

          cleanUpCall(false, true, statusText);
        };

        // Listen to the possible backend decline/end events,
        // but cleanup is idempotent so duplicates cannot create problems.
        socket.on(
          'call_declined',
          handleRemoteCallEnded
        );

        socket.on(
          'call_rejected',
          handleRemoteCallEnded
        );

        socket.on(
          'incoming_call_declined',
          handleRemoteCallEnded
        );

        socket.on(
          'decline_call',
          handleRemoteCallEnded
        );

        socket.on(
          'reject_incoming_call',
          handleRemoteCallEnded
        );

        socket.on(
          'peer_hung_up',
          handleRemoteCallEnded
        );

        socket.on(
          'call_cancelled_by_caller',
          handleRemoteCallEnded
        );

        socket.on(
          'cancel_call_signal',
          handleRemoteCallEnded
        );

        socket.on('in_call_text_message', (data) => {
          if (!componentAlive || callEndedRef.current) return;

          if (
            data?.senderId &&
            data.senderId === currentUserId
          ) {
            return;
          }

          setInCallMessages((previous) => [
            ...previous,
            data
          ]);
        });

        socket.on('in_call_reaction_burst', (data) => {
          if (!componentAlive || callEndedRef.current) {
            return;
          }

          const reactionId =
            Date.now() + Math.random();

          setFloatingReactions((previous) => [
            ...previous,
            {
              id: reactionId,
              emoji: data?.emoji || '❤️'
            }
          ]);

          setTimeout(() => {
            if (!isMountedRef.current) return;

            setFloatingReactions((previous) =>
              previous.filter(
                (reaction) =>
                  reaction.id !== reactionId
              )
            );
          }, 2500);
        });

        socket.on('call_busy', () => {
          if (!componentAlive || callEndedRef.current) {
            return;
          }

          cleanUpCall(
            false,
            true,
            'User is already on another call'
          );
        });
      } catch (error) {
        console.error(
          'Call initialization failed:',
          error
        );

        if (
          componentAlive &&
          !callEndedRef.current
        ) {
          setSafeStatus('Hardware Error');
        }
      }
    };

    initializeMediaAndSignaling();

    return () => {
      componentAlive = false;

      cleanUpCall(
        false,
        false,
        'Call Ended'
      );
    };
  }, [
    currentUserId,
    peerUserId,
    URLRole,
    acquireActiveCallLock,
    cleanUpCall,
    navigate,
    processIceQueue,
    setSafeStatus
  ]);

  // Stop the call if another tab/window starts another call.
  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key !== ACTIVE_CALL_STORAGE_KEY ||
        !event.newValue ||
        callEndedRef.current
      ) {
        return;
      }

      try {
        const activeCall = JSON.parse(event.newValue);

        if (
          activeCall?.callId &&
          activeCall.callId !== callIdRef.current &&
          activeCall?.roomId !== roomIdRef.current
        ) {
          cleanUpCall(
            false,
            true,
            'Another call is active'
          );
        }
      } catch {}
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, [cleanUpCall]);

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (
      !pcRef.current ||
      callEndedRef.current ||
      callStatus !== 'Connected'
    ) {
      return;
    }

    try {
      if (isScreenSharing) {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }

        const cameraTrack =
          localStreamRef.current?.getVideoTracks()?.[0];

        if (cameraTrack) {
          const sender =
            pcRef.current
              .getSenders()
              .find(
                (item) =>
                  item.track?.kind === 'video'
              );

          if (sender) {
            await sender.replaceTrack(
              cameraTrack
            );
          }
        }

        setIsScreenSharing(false);
        return;
      }

      const screenStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30, max: 30 }
          },
          audio: false
        });

      if (
        callEndedRef.current ||
        !pcRef.current
      ) {
        screenStream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      const screenTrack =
        screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        screenStream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      screenTrackRef.current = screenTrack;

      const sender =
        pcRef.current
          .getSenders()
          .find(
            (item) =>
              item.track?.kind === 'video'
          );

      if (sender) {
        await sender.replaceTrack(
          screenTrack
        );
      }

      screenTrack.onended = async () => {
        if (
          !isMountedRef.current ||
          callEndedRef.current
        ) {
          return;
        }

        try {
          const cameraTrack =
            localStreamRef.current?.getVideoTracks()?.[0];

          const currentSender =
            pcRef.current
              ?.getSenders()
              .find(
                (item) =>
                  item.track?.kind === 'video'
              );

          if (
            currentSender &&
            cameraTrack
          ) {
            await currentSender.replaceTrack(
              cameraTrack
            );
          }
        } catch {}

        screenTrackRef.current = null;

        if (isMountedRef.current) {
          setIsScreenSharing(false);
        }
      };

      setIsScreenSharing(true);
    } catch (error) {
      console.warn(
        'Screen sharing cancelled or failed:',
        error
      );
    }
  };

  // Send in-call message
  const sendInCallMessage = (event) => {
    event?.preventDefault();

    if (
      !chatInput.trim() ||
      callEndedRef.current ||
      callStatus !== 'Connected'
    ) {
      return;
    }

    const message = chatInput.trim();

    const msgPayload = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      senderId: currentUserId,
      text: message,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    };

    setInCallMessages((previous) => [
      ...previous,
      msgPayload
    ]);

    socketRef.current?.emit(
      'in_call_text_message',
      {
        roomId: roomIdRef.current,
        callId: callIdRef.current,
        ...msgPayload
      }
    );

    setChatInput('');
  };

  // Send reaction
  const sendReactionBurst = (emoji) => {
    if (
      callEndedRef.current ||
      callStatus !== 'Connected'
    ) {
      return;
    }

    const reactionId =
      Date.now() + Math.random();

    setFloatingReactions((previous) => [
      ...previous,
      {
        id: reactionId,
        emoji
      }
    ]);

    setTimeout(() => {
      if (!isMountedRef.current) return;

      setFloatingReactions((previous) =>
        previous.filter(
          (reaction) =>
            reaction.id !== reactionId
        )
      );
    }, 2500);

    socketRef.current?.emit(
      'in_call_reaction_burst',
      {
        roomId: roomIdRef.current,
        callId: callIdRef.current,
        emoji
      }
    );
  };

  // Mute/unmute
  useEffect(() => {
    const tracks =
      localStreamRef.current?.getAudioTracks() || [];

    tracks.forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted]);

  // Camera on/off
  useEffect(() => {
    const tracks =
      localStreamRef.current?.getVideoTracks() || [];

    tracks.forEach((track) => {
      track.enabled = !isVideoOff;
    });
  }, [isVideoOff]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins
      .toString()
      .padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none overflow-hidden">
      <div className="w-full max-w-lg flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">
        <div className="flex items-center gap-2">
          <Shield
            size={16}
            className="text-cyan-400"
          />
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-zinc-300 uppercase">
            Peer-to-Peer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {callStatus === 'Connected' && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {formatTime(callDuration)}
            </span>
          )}

          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full font-extrabold border border-cyan-500/20">
            {callStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4 relative w-full max-w-lg rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingReactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                initial={{
                  y: 200,
                  opacity: 0,
                  scale: 0.5,
                  x: Math.random() * 100 - 50
                }}
                animate={{
                  y: -150,
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1.8, 2, 1]
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.2,
                  ease: 'easeOut'
                }}
                className="absolute bottom-10 left-1/2 text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {callStatus !== 'Connected' && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
            {peerProfile?.avatar_url ? (
              <img
                src={peerProfile.avatar_url}
                alt="Peer Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/40 animate-pulse shadow-2xl shadow-cyan-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/20">
                <Video
                  size={36}
                  className="text-cyan-400"
                />
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-black tracking-tight text-white">
                @{peerProfile?.username || 'User'}
              </h2>

              <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">
                {callStatus}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-28 h-40 bg-black/70 border border-white/20 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              isVideoOff ? 'hidden' : ''
            }`}
          />

          {isVideoOff && (
            <div className="flex flex-col items-center gap-1 text-zinc-500">
              <VideoOff size={18} />
              <p className="text-[9px] font-bold uppercase tracking-wider">
                Cam Off
              </p>
            </div>
          )}
        </div>

        {callStatus === 'Connected' && (
          <div className="absolute top-4 left-4 z-20 flex gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            {[
              '❤️',
              '🔥',
              '👏',
              '🎉',
              '😮'
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  sendReactionBurst(emoji)
                }
                className="p-1.5 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{
                y: 200,
                opacity: 0
              }}
              animate={{
                y: 0,
                opacity: 1
              }}
              exit={{
                y: 200,
                opacity: 0
              }}
              className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  In-Call Chat
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setShowChat(false)
                  }
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 no-scrollbar text-xs">
                {inCallMessages.length === 0 ? (
                  <p className="text-center text-zinc-600 italic py-6">
                    No chat messages yet. Type below!
                  </p>
                ) : (
                  inCallMessages.map((msg) => {
                    const isMe =
                      msg.senderId === currentUserId;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMe
                            ? 'items-end'
                            : 'items-start'
                        }`}
                      >
                        <div
                          className={`px-3 py-1.5 rounded-xl max-w-[80%] ${
                            isMe
                              ? 'bg-cyan-500 text-black font-semibold'
                              : 'bg-zinc-800 text-white border border-white/10'
                          }`}
                        >
                          <p>{msg.text}</p>
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
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) =>
                    setChatInput(event.target.value)
                  }
                  placeholder="Send a quick text..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg flex items-center justify-around bg-zinc-900/90 border border-white/10 px-4 py-3 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        <button
          type="button"
          onClick={() =>
            setIsMuted((previous) => !previous)
          }
          title={
            isMuted
              ? 'Unmute Mic'
              : 'Mute Mic'
          }
          className={`p-3.5 rounded-2xl transition-all ${
            isMuted
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isMuted ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setIsVideoOff((previous) => !previous)
          }
          title={
            isVideoOff
              ? 'Turn On Cam'
              : 'Turn Off Cam'
          }
          className={`p-3.5 rounded-2xl transition-all ${
            isVideoOff
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isVideoOff ? (
            <VideoOff size={18} />
          ) : (
            <Video size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={toggleScreenShare}
          title={
            isScreenSharing
              ? 'Stop Screen Share'
              : 'Share Screen'
          }
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
          onClick={() =>
            setShowChat((previous) => !previous)
          }
          title="Toggle In-Call Chat"
          className={`p-3.5 rounded-2xl transition-all relative ${
            showChat
              ? 'bg-cyan-500 text-black'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <MessageSquare size={18} />

          {inCallMessages.length > 0 &&
            !showChat && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
            )}
        </button>

        <button
          type="button"
          onClick={() =>
            cleanUpCall(
              true,
              true,
              'Call Ended'
            )
          }
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
