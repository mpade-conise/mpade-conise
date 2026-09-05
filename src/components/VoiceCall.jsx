import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import {
  PhoneOff,
  Mic,
  MicOff,
  Shield,
  PhoneCall,
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
    {
      urls: 'stun:stun.relay.metered.ca:80'
    },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
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
  const [callStatus, setCallStatus] = useState('Initializing...');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState([]);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const iceQueueRef = useRef([]);
  const realtimeChannelsRef = useRef([]);

  const mountedRef = useRef(false);
  const endingCallRef = useRef(false);
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);

  const roomIdRef = useRef(null);
  const callRoleRef = useRef(null);

  // ------------------------------------------------------------
  // FORMAT TIME
  // ------------------------------------------------------------

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // ------------------------------------------------------------
  // CALL DURATION
  // ------------------------------------------------------------

  useEffect(() => {
    if (callStatus !== 'Connected') {
      setCallDuration(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setCallDuration((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  // ------------------------------------------------------------
  // RINGBACK TONE
  // ------------------------------------------------------------

  useEffect(() => {
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

    return () => {
      stopRingbackTone();
    };
  }, [callStatus]);

  // ------------------------------------------------------------
  // PROCESS QUEUED ICE CANDIDATES
  // ------------------------------------------------------------

  const processIceQueue = useCallback(async () => {
    const pc = pcRef.current;

    if (!pc) return;

    if (!pc.remoteDescription) return;

    if (iceQueueRef.current.length === 0) return;

    const queuedCandidates = [...iceQueueRef.current];

    iceQueueRef.current = [];

    console.log(
      `🧊 Processing ${queuedCandidates.length} queued ICE candidate(s)`
    );

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn(
          '⚠️ Failed to process queued ICE candidate:',
          error
        );
      }
    }
  }, []);

  // ------------------------------------------------------------
  // CREATE WEBRTC OFFER
  // ------------------------------------------------------------

  const createAndSendOffer = useCallback(async () => {
    const pc = pcRef.current;
    const socket = socketRef.current;

    if (!pc || !socket) {
      console.warn('⚠️ Cannot create offer: peer connection/socket missing.');
      return;
    }

    if (!socket.connected) {
      console.warn('⚠️ Cannot create offer: socket is not connected.');
      return;
    }

    if (offerSentRef.current) {
      console.log('ℹ️ Offer already sent. Skipping duplicate offer.');
      return;
    }

    if (pc.signalingState !== 'stable') {
      console.log(
        'ℹ️ Peer connection is not stable. Current state:',
        pc.signalingState
      );
      return;
    }

    try {
      offerSentRef.current = true;

      setCallStatus('Calling user...');

      console.log('📤 Creating WebRTC offer...');

      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });

      await pc.setLocalDescription(offer);

      const roomId = roomIdRef.current;

      socket.emit('send_webrtc_offer', {
        roomId,
        streamId: roomId,
        offer: pc.localDescription,
        targetViewerId: peerUserId,
        to: peerUserId
      });

      console.log('📤 WebRTC offer sent.');
    } catch (error) {
      offerSentRef.current = false;

      console.error(
        '❌ Failed to create/send WebRTC offer:',
        error
      );

      if (mountedRef.current) {
        setCallStatus('Connection Error');
      }
    }
  }, [peerUserId]);

  // ------------------------------------------------------------
  // CLEAN WEBRTC RESOURCES
  // ------------------------------------------------------------

  const cleanupResources = useCallback(() => {
    console.log('🧹 Cleaning voice call resources...');

    stopRingbackTone();

    // Stop microphone
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onicegatheringstatechange = null;
      pcRef.current.onsignalingstatechange = null;

      try {
        pcRef.current.close();
      } catch (error) {
        console.warn('Peer connection close warning:', error);
      }

      pcRef.current = null;
    }

    // Clear remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    // Remove Supabase realtime channels
    if (realtimeChannelsRef.current.length > 0) {
      realtimeChannelsRef.current.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn(
            'Realtime channel cleanup warning:',
            error
          );
        }
      });

      realtimeChannelsRef.current = [];
    }

    // Disconnect socket
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn('Socket cleanup warning:', error);
      }

      socketRef.current = null;
    }

    iceQueueRef.current = [];
    offerSentRef.current = false;
    answerSentRef.current = false;
  }, []);

  // ------------------------------------------------------------
  // END CALL
  // ------------------------------------------------------------

  const endCall = useCallback(() => {
    if (endingCallRef.current) return;

    endingCallRef.current = true;

    console.log('📞 Ending voice call...');

    const socket = socketRef.current;
    const roomId = roomIdRef.current;

    if (socket && socket.connected && roomId && peerUserId) {
      const payload = {
        roomId,
        to: peerUserId,
        receiverId: peerUserId,
        callerId: currentUserId,
        userId: currentUserId
      };

      // Use one primary event.
      socket.emit('peer_hung_up', payload);

      // Keep compatibility with existing backend events.
      socket.emit('call_cancelled_by_caller', payload);
      socket.emit('cancel_call_signal', payload);
    }

    cleanupResources();

    navigate(-1);
  }, [
    cleanupResources,
    navigate,
    peerUserId,
    currentUserId
  ]);

  // ------------------------------------------------------------
  // FETCH USER + PEER PROFILE
  // ------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const initializeProfiles = async () => {
      console.log(
        '🔍 Voice call initialization:',
        {
          peerUserId,
          URLRole
        }
      );

      try {
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();

        if (authError) {
          console.error('❌ Auth error:', authError);
        }

        if (!user) {
          navigate('/');
          return;
        }

        if (cancelled) return;

        setCurrentUserId(user.id);

        if (!peerUserId || peerUserId === 'undefined') {
          console.error(
            '❌ Invalid peerUserId:',
            peerUserId
          );

          setCallStatus('URL Configuration Error');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', peerUserId)
          .maybeSingle();

        if (error) {
          console.error(
            '❌ Peer profile fetch failed:',
            error
          );
          return;
        }

        if (!cancelled && data) {
          setPeerProfile(data);
        }
      } catch (error) {
        console.error(
          '❌ Profile initialization error:',
          error
        );
      }
    };

    initializeProfiles();

    return () => {
      cancelled = true;
    };
  }, [peerUserId, URLRole, navigate]);

  // ------------------------------------------------------------
  // MAIN WEBRTC + SOCKET INITIALIZATION
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId === 'undefined'
    ) {
      return undefined;
    }

    mountedRef.current = true;
    endingCallRef.current = false;

    const callRole =
      URLRole === 'caller' || URLRole === 'receiver'
        ? URLRole
        : currentUserId < peerUserId
        ? 'caller'
        : 'receiver';

    const roomId = [currentUserId, peerUserId]
      .sort()
      .join('-');

    roomIdRef.current = roomId;
    callRoleRef.current = callRole;

    console.log(
      '📞 Starting voice call:',
      {
        role: callRole,
        roomId,
        currentUserId,
        peerUserId
      }
    );

    let localRealtimeChannel = null;

    const initializeCall = async () => {
      try {
        // ------------------------------------------------------
        // 1. MICROPHONE
        // ------------------------------------------------------

        setCallStatus('Accessing microphone...');

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            'This browser does not support microphone access.'
          );
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) =>
            track.stop()
          );
          return;
        }

        localStreamRef.current = stream;

        console.log('🎙️ Microphone access granted.');

        // ------------------------------------------------------
        // 2. PEER CONNECTION
        // ------------------------------------------------------

        const pc = new RTCPeerConnection(
          GLOBAL_ICE_CONFIG
        );

        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // ------------------------------------------------------
        // REMOTE TRACK
        // ------------------------------------------------------

        pc.ontrack = async (event) => {
          console.log(
            '🔊 Remote audio track received.'
          );

          if (!mountedRef.current) return;

          const remoteStream =
            event.streams?.[0];

          if (!remoteStream) {
            console.warn(
              '⚠️ Remote track received without stream.'
            );
            return;
          }

          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject =
              remoteStream;

            try {
              await remoteAudioRef.current.play();

              console.log(
                '🔊 Remote audio playback started.'
              );
            } catch (error) {
              console.warn(
                '⚠️ Browser blocked remote audio autoplay:',
                error
              );
            }
          }
        };

        // ------------------------------------------------------
        // ICE CANDIDATES
        // ------------------------------------------------------

        pc.onicecandidate = (event) => {
          const socket = socketRef.current;

          if (!event.candidate) {
            console.log(
              '🧊 ICE candidate gathering completed.'
            );
            return;
          }

          if (!socket?.connected) {
            console.warn(
              '⚠️ ICE candidate generated before socket connection.'
            );
            return;
          }

          socket.emit('webrtc_ice_candidate', {
            roomId,
            streamId: roomId,
            candidate: event.candidate,
            to: peerUserId
          });
        };

        pc.onicegatheringstatechange = () => {
          console.log(
            '🧊 ICE gathering state:',
            pc.iceGatheringState
          );
        };

        pc.onsignalingstatechange = () => {
          console.log(
            '📡 Signaling state:',
            pc.signalingState
          );
        };

        // ------------------------------------------------------
        // CONNECTION STATE
        // ------------------------------------------------------

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;

          console.log(
            '🌐 WebRTC connection state:',
            state
          );

          if (!mountedRef.current) return;

          switch (state) {
            case 'connected':
              setCallStatus('Connected');
              break;

            case 'connecting':
              setCallStatus('Connecting...');
              break;

            case 'disconnected':
              setCallStatus('Connection Interrupted');
              break;

            case 'failed':
              setCallStatus('Connection Failed');
              break;

            case 'closed':
              setCallStatus('Call Ended');
              break;

            default:
              break;
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log(
            '🧊 ICE connection state:',
            pc.iceConnectionState
          );

          if (
            pc.iceConnectionState === 'failed'
          ) {
            console.error(
              '❌ ICE connection failed. TURN server may be unreachable.'
            );
          }
        };

        // ------------------------------------------------------
        // 3. SOCKET.IO
        // ------------------------------------------------------

        const socket = io(
          SOCKET_SERVER_URL,
          {
            transports: ['websocket', 'polling'],
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 10,
            timeout: 20000
          }
        );

        socketRef.current = socket;

        // ------------------------------------------------------
        // SOCKET CONNECT
        // ------------------------------------------------------

        socket.on('connect', async () => {
          console.log(
            `🟢 Signaling server connected. Socket: ${socket.id}`
          );

          socket.emit(
            'register_user_session',
            {
              userId: currentUserId
            }
          );

          socket.emit(
            'join_call_room',
            {
              roomId,
              userId: currentUserId,
              targetPeerId: peerUserId
            }
          );

          console.log(
            `🏠 Joined call room: ${roomId}`
          );

          if (callRole === 'caller') {
            setCallStatus('Calling user...');

            // -----------------------------------------------
            // Fetch caller profile
            // -----------------------------------------------

            const { data: myProfile } =
              await supabase
                .from('profiles')
                .select(
                  'username, avatar_url'
                )
                .eq(
                  'id',
                  currentUserId
                )
                .maybeSingle();

            const callSignalData = {
              receiverId: peerUserId,
              to: peerUserId,
              targetUserId: peerUserId,
              callerId: currentUserId,
              fromUserId: currentUserId,
              callerName:
                myProfile?.username || 'User',
              callerUsername:
                myProfile?.username || 'User',
              callerAvatar:
                myProfile?.avatar_url || null,
              callType: 'voice',
              roomId
            };

            // -----------------------------------------------
            // Socket incoming call signal
            // -----------------------------------------------

            socket.emit(
              'initiate_call_signal',
              callSignalData
            );

            socket.emit(
              'incoming_call_signal',
              callSignalData
            );

            socket.emit(
              'incoming_call',
              callSignalData
            );

            // -----------------------------------------------
            // Supabase realtime fallback
            // -----------------------------------------------

            try {
              localRealtimeChannel =
                supabase.channel(
                  `user-call-signals-${peerUserId}`
                );

              realtimeChannelsRef.current.push(
                localRealtimeChannel
              );

              localRealtimeChannel.subscribe(
                async (status) => {
                  if (status === 'SUBSCRIBED') {
                    try {
                      await localRealtimeChannel.send({
                        type: 'broadcast',
                        event:
                          'incoming_call_broadcast',
                        payload:
                          callSignalData
                      });

                      console.log(
                        '📡 Incoming call broadcast sent.'
                      );
                    } catch (error) {
                      console.warn(
                        'Realtime broadcast failed:',
                        error
                      );
                    }
                  }
                }
              );
            } catch (error) {
              console.warn(
                'Realtime fallback setup failed:',
                error
              );
            }

            // -----------------------------------------------
            // DO NOT immediately force multiple offers.
            // Wait for peer_ready.
            // -----------------------------------------------

            console.log(
              '⏳ Caller waiting for peer_ready...'
            );
          } else {
            setCallStatus(
              'Awaiting Connection...'
            );

            socket.emit(
              'peer_ready',
              {
                roomId,
                userId: currentUserId,
                peerUserId
              }
            );

            console.log(
              '📢 Receiver announced peer_ready.'
            );
          }
        });

        // ------------------------------------------------------
        // SOCKET RECONNECT
        // ------------------------------------------------------

        socket.on('reconnect', () => {
          console.log(
            '🔄 Signaling socket reconnected.'
          );

          socket.emit(
            'register_user_session',
            {
              userId: currentUserId
            }
          );

          socket.emit(
            'join_call_room',
            {
              roomId,
              userId: currentUserId,
              targetPeerId: peerUserId
            }
          );

          if (callRole === 'receiver') {
            socket.emit(
              'peer_ready',
              {
                roomId,
                userId: currentUserId,
                peerUserId
              }
            );
          }
        });

        // ------------------------------------------------------
        // PEER READY
        // ------------------------------------------------------

        socket.on(
          'peer_ready',
          async (data) => {
            if (!mountedRef.current) return;

            console.log(
              '⚡ peer_ready received:',
              data
            );

            if (
              callRole === 'caller'
            ) {
              await createAndSendOffer();
            }
          }
        );

        // ------------------------------------------------------
        // WEBRTC OFFER
        // ------------------------------------------------------

        socket.on(
          'webrtc_offer_received',
          async ({ offer }) => {
            if (!mountedRef.current) return;

            if (callRole === 'caller') {
              console.log(
                'ℹ️ Caller ignored incoming offer.'
              );
              return;
            }

            const currentPc =
              pcRef.current;

            if (!currentPc) return;

            try {
              setCallStatus(
                'Answering call...'
              );

              console.log(
                '📥 WebRTC offer received.'
              );

              await currentPc.setRemoteDescription(
                new RTCSessionDescription(
                  offer
                )
              );

              await processIceQueue();

              if (
                currentPc.signalingState !==
                'have-remote-offer'
              ) {
                console.warn(
                  '⚠️ Unexpected signaling state:',
                  currentPc.signalingState
                );
                return;
              }

              const answer =
                await currentPc.createAnswer({
                  offerToReceiveAudio: true
                });

              await currentPc.setLocalDescription(
                answer
              );

              if (
                answerSentRef.current
              ) {
                console.log(
                  'ℹ️ Answer already sent.'
                );
                return;
              }

              answerSentRef.current = true;

              socket.emit(
                'send_webrtc_answer',
                {
                  roomId,
                  streamId: roomId,
                  answer:
                    currentPc.localDescription,
                  to: peerUserId
                }
              );

              console.log(
                '📤 WebRTC answer sent.'
              );

              await processIceQueue();
            } catch (error) {
              answerSentRef.current = false;

              console.error(
                '❌ Failed handling WebRTC offer:',
                error
              );

              if (mountedRef.current) {
                setCallStatus(
                  'Connection Error'
                );
              }
            }
          }
        );

        // ------------------------------------------------------
        // WEBRTC ANSWER
        // ------------------------------------------------------

        socket.on(
          'webrtc_answer_received',
          async ({ answer }) => {
            if (!mountedRef.current) return;

            const currentPc =
              pcRef.current;

            if (!currentPc) return;

            try {
              console.log(
                '📥 WebRTC answer received.'
              );

              if (
                currentPc.signalingState !==
                'have-local-offer'
              ) {
                console.warn(
                  '⚠️ Ignoring answer because signaling state is:',
                  currentPc.signalingState
                );
                return;
              }

              await currentPc.setRemoteDescription(
                new RTCSessionDescription(
                  answer
                )
              );

              console.log(
                '✅ Remote description set from answer.'
              );

              await processIceQueue();
            } catch (error) {
              console.error(
                '❌ Failed setting WebRTC answer:',
                error
              );
            }
          }
        );

        // ------------------------------------------------------
        // ICE CANDIDATE
        // ------------------------------------------------------

        socket.on(
          'incoming_ice_candidate',
          async ({ candidate }) => {
            if (!mountedRef.current) return;

            const currentPc =
              pcRef.current;

            if (!currentPc || !candidate) {
              return;
            }

            if (
              currentPc.remoteDescription
            ) {
              try {
                await currentPc.addIceCandidate(
                  new RTCIceCandidate(
                    candidate
                  )
                );

                console.log(
                  '🧊 Remote ICE candidate added.'
                );
              } catch (error) {
                console.warn(
                  '⚠️ Failed adding remote ICE candidate:',
                  error
                );
              }
            } else {
              console.log(
                '🧊 Queuing ICE candidate until remote description exists.'
              );

              iceQueueRef.current.push(
                candidate
              );
            }
          }
        );

        // ------------------------------------------------------
        // PEER HUNG UP
        // ------------------------------------------------------

        socket.on(
          'peer_hung_up',
          () => {
            if (!mountedRef.current) return;

            console.log(
              '📞 Remote peer ended the call.'
            );

            setCallStatus(
              'Call Ended'
            );

            cleanupResources();

            navigate(-1);
          }
        );

        // ------------------------------------------------------
        // IN-CALL CHAT
        // ------------------------------------------------------

        socket.on(
          'in_call_text_message',
          (data) => {
            if (!mountedRef.current) return;

            setInCallMessages(
              (previous) => [
                ...previous,
                data
              ]
            );
          }
        );

        // ------------------------------------------------------
        // REACTIONS
        // ------------------------------------------------------

        socket.on(
          'in_call_reaction_burst',
          (data) => {
            if (!mountedRef.current) return;

            const reactionId =
              Date.now() +
              Math.random();

            setFloatingReactions(
              (previous) => [
                ...previous,
                {
                  id: reactionId,
                  emoji: data.emoji
                }
              ]
            );

            setTimeout(() => {
              if (!mountedRef.current)
                return;

              setFloatingReactions(
                (previous) =>
                  previous.filter(
                    (reaction) =>
                      reaction.id !==
                      reactionId
                  )
              );
            }, 2500);
          }
        );

        // ------------------------------------------------------
        // SOCKET ERRORS
        // ------------------------------------------------------

        socket.on(
          'connect_error',
          (error) => {
            console.error(
              '❌ Socket connection error:',
              error
            );

            if (mountedRef.current) {
              setCallStatus(
                'Signaling Error'
              );
            }
          }
        );

        socket.on(
          'disconnect',
          (reason) => {
            console.warn(
              '🔴 Signaling socket disconnected:',
              reason
            );
          }
        );
      } catch (error) {
        console.error(
          '❌ Voice call initialization failed:',
          error
        );

        if (mountedRef.current) {
          setCallStatus(
            error?.message ||
              'Hardware Error'
          );
        }

        cleanupResources();
      }
    };

    initializeCall();

    // ----------------------------------------------------------
    // REACT CLEANUP
    // ----------------------------------------------------------

    return () => {
      console.log(
        '🧹 VoiceCall component unmounting.'
      );

      mountedRef.current = false;

      // IMPORTANT:
      // Do NOT send hangup/cancel events here.
      // React cleanup can happen because of navigation,
      // rerendering, StrictMode, etc.
      cleanupResources();
    };
  }, [
    currentUserId,
    peerUserId,
    URLRole,
    createAndSendOffer,
    processIceQueue,
    cleanupResources,
    navigate
  ]);

  // ------------------------------------------------------------
  // SEND CHAT MESSAGE
  // ------------------------------------------------------------

  const sendInCallMessage = (event) => {
    event?.preventDefault();

    const text = chatInput.trim();

    if (!text) return;

    const roomId = roomIdRef.current;

    const message = {
      id:
        Date.now() +
        Math.random(),
      senderId: currentUserId,
      text,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    };

    setInCallMessages(
      (previous) => [
        ...previous,
        message
      ]
    );

    socketRef.current?.emit(
      'in_call_text_message',
      {
        roomId,
        ...message
      }
    );

    setChatInput('');
  };

  // ------------------------------------------------------------
  // SEND REACTION
  // ------------------------------------------------------------

  const sendReactionBurst = (emoji) => {
    const reactionId =
      Date.now() +
      Math.random();

    setFloatingReactions(
      (previous) => [
        ...previous,
        {
          id: reactionId,
          emoji
        }
      ]
    );

    setTimeout(() => {
      if (!mountedRef.current)
        return;

      setFloatingReactions(
        (previous) =>
          previous.filter(
            (reaction) =>
              reaction.id !==
              reactionId
          )
      );
    }, 2500);

    socketRef.current?.emit(
      'in_call_reaction_burst',
      {
        roomId: roomIdRef.current,
        emoji
      }
    );
  };

  // ------------------------------------------------------------
  // MUTE / UNMUTE
  // ------------------------------------------------------------

  useEffect(() => {
    const stream =
      localStreamRef.current;

    if (!stream) return;

    stream
      .getAudioTracks()
      .forEach((track) => {
        track.enabled = !isMuted;
      });
  }, [isMuted]);

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none overflow-hidden">

      {/* Remote audio */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">

        <div className="flex items-center gap-2">
          <Shield
            size={16}
            className="text-cyan-400"
          />

          <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-zinc-300 uppercase">
            Encrypted
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

      {/* Main call area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 my-6 relative w-full max-w-md rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl p-8 backdrop-blur-xl overflow-hidden">

        {/* Floating reactions */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">

          <AnimatePresence>
            {floatingReactions.map(
              (reaction) => (
                <motion.div
                  key={reaction.id}
                  initial={{
                    y: 150,
                    opacity: 0,
                    scale: 0.5,
                    x:
                      Math.random() *
                        80 -
                      40
                  }}
                  animate={{
                    y: -150,
                    opacity: [
                      0,
                      1,
                      1,
                      0
                    ],
                    scale: [
                      0.5,
                      1.8,
                      2,
                      1
                    ]
                  }}
                  exit={{
                    opacity: 0
                  }}
                  transition={{
                    duration: 2.2,
                    ease: 'easeOut'
                  }}
                  className="absolute bottom-10 left-1/2 text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                >
                  {reaction.emoji}
                </motion.div>
              )
            )}
          </AnimatePresence>

        </div>

        {/* Profile */}
        <div className="flex flex-col items-center gap-6 z-10">

          {peerProfile?.avatar_url ? (
            <img
              src={peerProfile.avatar_url}
              alt="Peer Avatar"
              className={`w-32 h-32 rounded-full object-cover border-4 border-cyan-500/30 shadow-2xl ${
                callStatus !== 'Connected'
                  ? 'animate-pulse'
                  : 'ring-4 ring-cyan-500/20'
              }`}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse shadow-2xl">

              <PhoneCall
                size={44}
                className="text-cyan-400"
              />

            </div>
          )}

          <div className="text-center">

            <h2 className="text-2xl font-black tracking-tight text-white">
              @{peerProfile?.username || 'User'}
            </h2>

            <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">
              {callStatus}
            </p>

          </div>

        </div>

        {/* Equalizer */}
        {callStatus === 'Connected' && (
          <div className="flex items-center gap-1.5 h-8 mt-2 z-10">

            {[0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.2].map(
              (_, index) => (
                <motion.div
                  key={index}
                  animate={{
                    height: [
                      '20%',
                      '100%',
                      '30%'
                    ]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration:
                      0.8 +
                      index * 0.1,
                    ease: 'easeInOut'
                  }}
                  className="w-1.5 bg-cyan-400 rounded-full"
                />
              )
            )}

          </div>
        )}

        {/* Reactions */}
        {callStatus === 'Connected' && (
          <div className="flex gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 z-20 mt-2">

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
                  sendReactionBurst(
                    emoji
                  )
                }
                className="p-1 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-lg"
              >
                {emoji}
              </button>
            ))}

          </div>
        )}

        {/* Chat */}
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
              className="absolute inset-x-0 bottom-0 top-1/4 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl shadow-2xl"
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

                {inCallMessages.length ===
                0 ? (
                  <p className="text-center text-zinc-600 italic py-6">
                    No chat messages yet.
                    Type below!
                  </p>
                ) : (
                  inCallMessages.map(
                    (message) => {
                      const isMe =
                        message.senderId ===
                        currentUserId;

                      return (
                        <div
                          key={message.id}
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
                            <p>
                              {message.text}
                            </p>
                          </div>

                          <span className="text-[8px] text-zinc-500 mt-0.5">
                            {message.time}
                          </span>

                        </div>
                      );
                    }
                  )
                )}

              </div>

              <form
                onSubmit={
                  sendInCallMessage
                }
                className="flex gap-2"
              >

                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) =>
                    setChatInput(
                      event.target.value
                    )
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

      {/* Controls */}
      <div className="w-full max-w-md flex items-center justify-around bg-zinc-900/90 border border-white/10 px-6 py-4 rounded-3xl backdrop-blur-xl shadow-2xl z-30">

        {/* Mute */}
        <button
          type="button"
          onClick={() =>
            setIsMuted(
              (previous) => !previous
            )
          }
          title={
            isMuted
              ? 'Unmute Mic'
              : 'Mute Mic'
          }
          className={`p-4 rounded-2xl transition-all ${
            isMuted
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          {isMuted ? (
            <MicOff size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>

        {/* Chat */}
        <button
          type="button"
          onClick={() =>
            setShowChat(
              (previous) => !previous
            )
          }
          title="Toggle In-Call Chat"
          className={`p-4 rounded-2xl transition-all relative ${
            showChat
              ? 'bg-cyan-500 text-black'
              : 'bg-white/5 text-zinc-200 hover:bg-white/10'
          }`}
        >
          <MessageSquare size={20} />

          {inCallMessages.length >
            0 &&
            !showChat && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
            )}
        </button>

        {/* End */}
        <button
          type="button"
          onClick={endCall}
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
