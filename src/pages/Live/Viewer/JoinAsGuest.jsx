import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, VideoOff, Mic, MicOff, X, Zap, Loader2, RefreshCw,
  MessageCircle, Gift as GiftIcon, Heart, LogOut, Wifi, WifiOff,
  Settings2, Volume2, VolumeX, Signal, ShieldCheck, Radio,
  AlertTriangle, CheckCircle2, Clock3, Users, ChevronDown
} from 'lucide-react';
import { io } from 'socket.io-client';

import LiveChat from './LiveChat';
import GiftPanel from './GiftPanel';
import VideoPlayer from '../Shared/VideoPlayer';
import FloatingHearts from './FloatingHearts';
import StreamHeader from '../Shared/StreamHeader';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn'
    }
  ],
  iceCandidatePoolSize: 10
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceQueueRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const requestChannelRef = useRef(null);
  const giftTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef(null);
  const lastRequestRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const hostUserIdRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState('');
  const [permissionState, setPermissionState] = useState('checking');
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState('user');
  const [audioLevel, setAudioLevel] = useState(0);

  const [isRequesting, setIsRequesting] = useState(false);
  const [isLiveOnPanel, setIsLiveOnPanel] = useState(false);
  const [assignedMode, setAssignedMode] = useState('video');

  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hostUserId, setHostUserId] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [hostRemoteStream, setHostRemoteStream] = useState(null);

  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectMessage, setReconnectMessage] = useState('');
  const [streamEnded, setStreamEnded] = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);

  const [showChat, setShowChat] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [latestGift, setLatestGift] = useState(null);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [panelNotice, setPanelNotice] = useState(null);

  const updateConnectionQuality = useCallback((state, iceState) => {
    if (state === 'failed' || iceState === 'failed') {
      setConnectionQuality('poor');
      return;
    }

    if (state === 'disconnected' || iceState === 'disconnected') {
      setConnectionQuality('weak');
      return;
    }

    if (state === 'connected' || state === 'completed' || iceState === 'connected' || iceState === 'completed') {
      setConnectionQuality('good');
      return;
    }

    setConnectionQuality('connecting');
  }, []);

  const showNotice = useCallback((type, message, duration = 3500) => {
    if (!mountedRef.current) return;

    setPanelNotice({ type, message });

    window.setTimeout(() => {
      if (mountedRef.current) setPanelNotice(null);
    }, duration);
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}

      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });

      localStreamRef.current = null;
    }

    stopAudioMeter();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [stopAudioMeter]);

  const closePeerConnection = useCallback(() => {
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

    iceQueueRef.current = [];
    setHostRemoteStream(null);
    setConnectionState('new');
    setIceConnectionState('new');
  }, []);

  const disconnectSocket = useCallback(() => {
    if (!socketRef.current) return;

    try {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    } catch {}

    socketRef.current = null;
  }, []);

  const cleanupConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    closePeerConnection();
  }, [closePeerConnection]);

  const processIceQueue = useCallback(async () => {
    if (!pcRef.current?.remoteDescription || iceQueueRef.current.length === 0) return;

    const candidates = [...iceQueueRef.current];
    iceQueueRef.current = [];

    for (const candidate of candidates) {
      try {
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.warn('[ICE] Candidate processing warning:', error);
      }
    }
  }, []);

  const setupAudioMeter = useCallback(async mediaStream => {
    try {
      stopAudioMeter();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;

      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitor = () => {
        if (!analyserRef.current || !localStreamRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        let total = 0;

        for (let i = 0; i < dataArray.length; i += 1) {
          total += dataArray[i];
        }

        const average = dataArray.length ? total / dataArray.length : 0;

        setAudioLevel(Math.min(100, Math.round(average * 2.5)));

        animationFrameRef.current = requestAnimationFrame(monitor);
      };

      monitor();
    } catch (error) {
      console.warn('[AUDIO] Meter setup failed:', error);
    }
  }, [stopAudioMeter]);

  const getMediaConstraints = useCallback((selectedFacing = facingMode) => {
    if (lowDataMode) {
      return {
        video: {
          facingMode: selectedFacing,
          width: { ideal: 640, max: 854 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 20, max: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
    }

    return {
      video: {
        facingMode: selectedFacing,
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }, [facingMode, lowDataMode]);

  const startPreview = useCallback(async (selectedFacing = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Your browser does not support camera and microphone access.');
      setPermissionState('unsupported');
      return null;
    }

    try {
      setMediaError('');
      setPermissionState('requesting');

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch {}
        });
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(selectedFacing)
      );

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return null;
      }

      localStreamRef.current = mediaStream;

      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];

      setIsCamOn(Boolean(videoTrack?.enabled));
      setIsMicOn(Boolean(audioTrack?.enabled));
      setPermissionState('granted');

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      await setupAudioMeter(mediaStream);

      return mediaStream;
    } catch (error) {
      console.error('[MEDIA] Access error:', error);

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setMediaError('Camera or microphone permission was denied. Allow access and try again.');
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        setPermissionState('unavailable');
        setMediaError('No camera or microphone was found on this device.');
      } else if (error?.name === 'NotReadableError') {
        setPermissionState('busy');
        setMediaError('Your camera or microphone is being used by another application.');
      } else {
        setPermissionState('error');
        setMediaError('Unable to access your camera and microphone.');
      }

      setIsCamOn(false);
      return null;
    }
  }, [facingMode, getMediaConstraints, setupAudioMeter]);

  const replaceVideoTrack = useCallback(async stream => {
    const newTrack = stream?.getVideoTracks?.()[0];

    if (!newTrack) return;

    if (pcRef.current) {
      const sender = pcRef.current.getSenders().find(item => item.track?.kind === 'video');

      if (sender) {
        try {
          await sender.replaceTrack(newTrack);
        } catch (error) {
          console.warn('[WEBRTC] Video track replacement failed:', error);
        }
      }
    }
  }, []);

  const toggleFlipCamera = useCallback(async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';

    setFacingMode(nextFacing);

    const stream = await startPreview(nextFacing);

    if (stream && isLiveOnPanel) {
      await replaceVideoTrack(stream);
    }
  }, [facingMode, startPreview, isLiveOnPanel, replaceVideoTrack]);

  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', {
        streamId,
        userId: currentUserIdRef.current
      });

      setIsReconnecting(false);
      setReconnectMessage('');
    });

    socket.on('disconnect', reason => {
      if (!mountedRef.current || !isLiveOnPanel) return;

      setIsReconnecting(true);
      setReconnectMessage('Connection to the live server was interrupted.');
      setConnectionQuality('weak');

      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', error => {
      console.warn('[SOCKET] Connection error:', error?.message || error);

      if (isLiveOnPanel) {
        setIsReconnecting(true);
        setConnectionQuality('weak');
      }
    });

    return socket;
  }, [streamId, isLiveOnPanel]);

  const createPeerConnection = useCallback((guestMediaStream, mode, targetHost) => {
    const activeUser = currentUserIdRef.current;
    const socket = initSocket();

    closePeerConnection();

    const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);

    pcRef.current = pc;

    setConnectionState('connecting');
    setIceConnectionState('checking');
    setConnectionQuality('connecting');
    setIsReconnecting(false);

    pc.ontrack = event => {
      if (!mountedRef.current) return;

      const remoteStream = event.streams?.[0];

      if (remoteStream) {
        setHostRemoteStream(remoteStream);
        setHostDisconnected(false);
      }
    };

    pc.onicecandidate = event => {
      if (!event.candidate || !socketRef.current?.connected) return;

      socket.emit('webrtc_ice_candidate', {
        streamId,
        candidate: event.candidate,
        to: targetHost,
        senderType: 'guest'
      });
    };

    pc.onconnectionstatechange = () => {
      if (!mountedRef.current) return;

      const state = pc.connectionState;

      setConnectionState(state);

      updateConnectionQuality(state, pc.iceConnectionState);

      if (state === 'connected') {
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        setReconnectMessage('');
        setHostDisconnected(false);
      }

      if (state === 'disconnected') {
        setIsReconnecting(true);
        setReconnectMessage('Trying to restore the panel connection...');
        setConnectionQuality('weak');
      }

      if (state === 'failed') {
        setIsReconnecting(true);
        setReconnectMessage('Panel connection failed. Retrying...');
        setConnectionQuality('poor');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!mountedRef.current) return;

      const state = pc.iceConnectionState;

      setIceConnectionState(state);
      updateConnectionQuality(pc.connectionState, state);

      if (state === 'failed') {
        setIsReconnecting(true);
        setReconnectMessage('Network path failed. Trying another connection...');
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        setConnectionQuality(previous => previous === 'connecting' ? 'weak' : previous);
      }
    };

    if (guestMediaStream) {
      guestMediaStream.getTracks().forEach(track => {
        if (track.kind === 'video') {
          track.enabled = mode === 'video' && isCamOn;
        }

        if (track.kind === 'audio') {
          track.enabled = isMicOn;
        }

        pc.addTrack(track, guestMediaStream);
      });
    }

    socket.off('webrtc_answer_received');

    socket.on('webrtc_answer_received', async ({ answer, sdpAnswer }) => {
      const incomingAnswer = answer || sdpAnswer;

      if (!incomingAnswer || pc.signalingState === 'closed') return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingAnswer));
        await processIceQueue();
      } catch (error) {
        console.error('[WEBRTC] Remote SDP failed:', error);
        setConnectionQuality('poor');
      }
    });

    socket.off('incoming_ice_candidate');

    socket.on('incoming_ice_candidate', async ({ candidate }) => {
      if (!candidate || pc.signalingState === 'closed') return;

      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.warn('[ICE] Candidate failed:', error);
        }
      } else {
        iceQueueRef.current.push(candidate);
      }
    });

    socket.off('removed_from_panel');

    socket.on('removed_from_panel', () => {
      if (!mountedRef.current) return;

      setIsLiveOnPanel(false);
      setIsRequesting(false);
      setHostDisconnected(true);
      stopLocalMedia();
      closePeerConnection();

      showNotice('warning', 'The host removed you from the live panel.', 5000);

      window.setTimeout(() => {
        if (mountedRef.current) navigate(`/live/watch/${streamId}`);
      }, 1800);
    });

    socket.off('stream_ended');

    socket.on('stream_ended', () => {
      if (!mountedRef.current) return;

      setStreamEnded(true);
      setIsLiveOnPanel(false);
      stopLocalMedia();
      closePeerConnection();
    });

    socket.off('host_disconnected');

    socket.on('host_disconnected', () => {
      if (!mountedRef.current) return;

      setHostDisconnected(true);
      setIsReconnecting(true);
      setReconnectMessage('The host connection was interrupted.');
    });

    socket.off('host_reconnected');

    socket.on('host_reconnected', () => {
      if (!mountedRef.current) return;

      setHostDisconnected(false);
      setIsReconnecting(false);
      setReconnectMessage('');
    });

    return pc;
  }, [
    initSocket,
    closePeerConnection,
    streamId,
    isCamOn,
    isMicOn,
    navigate,
    processIceQueue,
    stopLocalMedia,
    updateConnectionQuality,
    showNotice
  ]);

  const startBroadcastIngest = useCallback(async (guestMediaStream, mode, targetHost) => {
    const activeUser = currentUserIdRef.current || currentUserId;

    if (!activeUser || !targetHost) {
      showNotice('error', 'Unable to connect to the host.');
      return;
    }

    const socket = initSocket();
    const pc = createPeerConnection(guestMediaStream, mode, targetHost);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      socket.emit('send_webrtc_offer', {
        streamId,
        guestId: activeUser,
        targetHostId: targetHost,
        offer,
        mode,
        lowDataMode
      });
    } catch (error) {
      console.error('[WEBRTC] Offer creation failed:', error);

      setConnectionState('failed');
      setConnectionQuality('poor');
      setIsReconnecting(true);
      setReconnectMessage('Unable to establish the panel connection.');
    }
  }, [
    currentUserId,
    initSocket,
    createPeerConnection,
    streamId,
    lowDataMode,
    showNotice
  ]);

  const handleApproval = useCallback(async (mode, hostId) => {
    if (!mountedRef.current) return;

    setIsRequesting(false);
    setIsLiveOnPanel(true);
    setAssignedMode(mode === 'audio' ? 'audio' : 'video');
    setHostDisconnected(false);
    setIsReconnecting(true);
    setReconnectMessage('Connecting you to the live panel...');

    const resolvedHost = hostId || hostUserIdRef.current;

    if (!resolvedHost) {
      setIsReconnecting(false);
      setConnectionQuality('poor');
      showNotice('error', 'Host connection information is unavailable.');
      return;
    }

    let mediaStream = localStreamRef.current;

    if (!mediaStream) {
      mediaStream = await startPreview(facingMode);
    }

    if (!mediaStream) {
      setIsReconnecting(false);
      showNotice('error', 'Camera and microphone access is required to join the panel.');
      return;
    }

    await startBroadcastIngest(mediaStream, mode, resolvedHost);
  }, [
    startPreview,
    facingMode,
    startBroadcastIngest,
    showNotice
  ]);

  const fetchDetails = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        navigate('/login');
        return;
      }

      currentUserIdRef.current = user.id;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      const { data: streamInfo, error: streamError } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();

      if (streamError || !streamInfo) {
        setStreamEnded(true);
        setIsLoading(false);
        return;
      }

      if (streamInfo.status && !['live', 'active', 'streaming'].includes(String(streamInfo.status).toLowerCase())) {
        setStreamEnded(true);
      }

      setStreamData(streamInfo);

      const detectedHost = streamInfo.host_id || streamInfo.user_id;

      hostUserIdRef.current = detectedHost;
      setHostUserId(detectedHost);
      setHeartCount(Number(streamInfo.likes || 0));

      if (user.id) {
        const { data: existingApproval } = await supabase
          .from('live_guest_requests')
          .select('*')
          .eq('stream_id', streamId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (existingApproval && mountedRef.current) {
          await handleApproval(
            existingApproval.mode || 'video',
            existingApproval.host_id || detectedHost
          );
        }

        const { data: pendingRequest } = await supabase
          .from('live_guest_requests')
          .select('id,status,mode')
          .eq('stream_id', streamId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingRequest && mountedRef.current) {
          lastRequestRef.current = pendingRequest.id;
          setIsRequesting(true);
        }
      }
    } catch (error) {
      console.error('[DETAILS] Failed:', error);
      showNotice('error', 'Unable to load the live session.');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [streamId, navigate, handleApproval, showNotice]);

  const handleSendRequest = useCallback(async () => {
    if (isRequesting || isLiveOnPanel || streamEnded) return;

    const activeUser = userProfile?.id || currentUserId;

    if (!activeUser) {
      showNotice('error', 'You must be signed in to join the panel.');
      return;
    }

    if (!localStreamRef.current) {
      const stream = await startPreview(facingMode);

      if (!stream) {
        showNotice('error', 'Please enable your camera and microphone first.');
        return;
      }
    }

    setIsRequesting(true);

    try {
      const { data: existing } = await supabase
        .from('live_guest_requests')
        .select('id,status')
        .eq('stream_id', streamId)
        .eq('user_id', activeUser)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (existing?.status === 'approved') {
        await handleApproval('video', hostUserIdRef.current);
        return;
      }

      if (existing?.status === 'pending') {
        lastRequestRef.current = existing.id;
        showNotice('info', 'Your request is already waiting for the host.');
        return;
      }

      const { data: request, error } = await supabase
        .from('live_guest_requests')
        .insert([{
          stream_id: streamId,
          user_id: activeUser,
          status: 'pending',
          username: userProfile?.username || 'Guest',
          avatar_url: userProfile?.avatar_url || DEFAULT_AVATAR,
          mode: 'video'
        }])
        .select()
        .single();

      if (error) throw error;

      if (!request) throw new Error('Request was not created.');

      lastRequestRef.current = request.id;

      if (socketRef.current?.connected) {
        socketRef.current.emit('guest_cohost_request', {
          streamId,
          requestId: request.id,
          userId: activeUser,
          username: userProfile?.username || 'Guest',
          avatar: userProfile?.avatar_url || DEFAULT_AVATAR,
          mode: 'video'
        });
      }

      if (requestChannelRef.current) {
        await supabase.removeChannel(requestChannelRef.current);
      }

      const channel = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'live_guest_requests',
            filter: `id=eq.${request.id}`
          },
          async payload => {
            if (!mountedRef.current) return;

            if (payload.new.status === 'approved') {
              if (requestChannelRef.current) {
                await supabase.removeChannel(requestChannelRef.current);
                requestChannelRef.current = null;
              }

              await handleApproval(
                payload.new.mode || 'video',
                payload.new.host_id || hostUserIdRef.current
              );
            }

            if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              lastRequestRef.current = null;
              showNotice('warning', 'The host declined your panel request.', 4500);
            }

            if (payload.new.status === 'cancelled') {
              setIsRequesting(false);
              lastRequestRef.current = null;
            }

            if (payload.new.status === 'left') {
              setIsRequesting(false);
              lastRequestRef.current = null;
            }
          }
        )
        .subscribe();

      requestChannelRef.current = channel;

      showNotice('success', 'Request sent. Waiting for host approval.', 4000);
    } catch (error) {
      console.error('[REQUEST] Failed:', error);
      setIsRequesting(false);
      showNotice('error', error?.message || 'Unable to send panel request.');
    }
  }, [
    isRequesting,
    isLiveOnPanel,
    streamEnded,
    userProfile,
    currentUserId,
    streamId,
    startPreview,
    facingMode,
    handleApproval,
    showNotice
  ]);

  const cancelRequest = useCallback(async () => {
    if (!lastRequestRef.current) return;

    try {
      await supabase
        .from('live_guest_requests')
        .update({ status: 'cancelled' })
        .eq('id', lastRequestRef.current);

      if (requestChannelRef.current) {
        await supabase.removeChannel(requestChannelRef.current);
        requestChannelRef.current = null;
      }

      lastRequestRef.current = null;
      setIsRequesting(false);

      if (socketRef.current?.connected) {
        socketRef.current.emit('guest_cancel_cohost_request', {
          streamId,
          requestId: lastRequestRef.current,
          userId: currentUserIdRef.current
        });
      }

      showNotice('info', 'Panel request cancelled.');
    } catch (error) {
      console.error('[REQUEST] Cancellation failed:', error);
    }
  }, [streamId, showNotice]);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks?.()[0];

    if (!track) {
      showNotice('warning', 'No camera is available.');
      return;
    }

    track.enabled = !track.enabled;
    setIsCamOn(track.enabled);

    if (pcRef.current) {
      const sender = pcRef.current.getSenders().find(item => item.track?.kind === 'video');

      if (sender?.track) {
        sender.track.enabled = track.enabled;
      }
    }
  }, [showNotice]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];

    if (!track) {
      showNotice('warning', 'No microphone is available.');
      return;
    }

    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  }, [showNotice]);

  const handleLowDataToggle = useCallback(async () => {
    const nextValue = !lowDataMode;

    setLowDataMode(nextValue);

    if (!localStreamRef.current) return;

    try {
      const stream = await startPreview(facingMode);

      if (!stream || !pcRef.current) return;

      const videoTrack = stream.getVideoTracks()[0];

      const sender = pcRef.current
        .getSenders()
        .find(item => item.track?.kind === 'video');

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      showNotice('success', nextValue ? 'Low-data mode enabled.' : 'High-quality mode enabled.');
    } catch (error) {
      console.warn('[LOW DATA] Track update failed:', error);
    }
  }, [lowDataMode, startPreview, facingMode, showNotice]);

  const handleReconnect = useCallback(async () => {
    if (!isLiveOnPanel || !hostUserIdRef.current) return;

    reconnectAttemptsRef.current += 1;

    setIsReconnecting(true);
    setReconnectMessage('Reconnecting to the live panel...');
    setConnectionQuality('connecting');

    const stream = localStreamRef.current || await startPreview(facingMode);

    if (!stream) {
      setConnectionQuality('poor');
      setReconnectMessage('Camera and microphone are unavailable.');
      return;
    }

    await startBroadcastIngest(
      stream,
      assignedMode,
      hostUserIdRef.current
    );
  }, [
    isLiveOnPanel,
    startPreview,
    facingMode,
    startBroadcastIngest,
    assignedMode
  ]);

  const handleLeavePanel = useCallback(async () => {
    try {
      if (currentUserId && streamId) {
        await supabase
          .from('live_guest_requests')
          .update({ status: 'left' })
          .eq('stream_id', streamId)
          .eq('user_id', currentUserId)
          .in('status', ['approved', 'pending']);
      }
    } catch (error) {
      console.warn('[LEAVE] Request update failed:', error);
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('guest_left_panel', {
        streamId,
        userId: currentUserIdRef.current
      });
    }

    setIsLiveOnPanel(false);
    setIsRequesting(false);
    cleanupConnection();
    stopLocalMedia();

    navigate(`/live/watch/${streamId}`);
  }, [
    currentUserId,
    streamId,
    cleanupConnection,
    stopLocalMedia,
    navigate
  ]);

  const handleLike = useCallback(async () => {
    if (!streamId) return;

    setHeartCount(previous => previous + 1);

    try {
      await supabase.rpc('increment_likes', {
        stream_id_input: streamId
      });
    } catch (error) {
      console.warn('[LIKE] Failed:', error);
    }
  }, [streamId]);

  const retryMedia = useCallback(async () => {
    setMediaError('');
    await startPreview(facingMode);
  }, [startPreview, facingMode]);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const preview = await startPreview();

      if (mountedRef.current) {
        await fetchDetails();
      }

      if (!preview && mountedRef.current) {
        setIsLoading(false);
      }
    };

    init();

    const socket = initSocket();

    const onApproveCohost = payload => {
      const guestMatch = payload?.guestId
        ? payload.guestId === currentUserIdRef.current
        : true;

      if (!guestMatch || !mountedRef.current) return;

      handleApproval(
        payload.mode || 'video',
        payload.hostId || hostUserIdRef.current
      );
    };

    const onRejectCohost = payload => {
      if (
        payload?.guestId &&
        payload.guestId !== currentUserIdRef.current
      ) return;

      if (!mountedRef.current) return;

      setIsRequesting(false);
      showNotice('warning', 'The host declined your request.');
    };

    socket.on('approve_cohost', onApproveCohost);
    socket.on('cohost_approved', onApproveCohost);
    socket.on('reject_cohost', onRejectCohost);
    socket.on('cohost_rejected', onRejectCohost);

    return () => {
      mountedRef.current = false;

      socket.off('approve_cohost', onApproveCohost);
      socket.off('cohost_approved', onApproveCohost);
      socket.off('reject_cohost', onRejectCohost);
      socket.off('cohost_rejected', onRejectCohost);

      if (requestChannelRef.current) {
        supabase.removeChannel(requestChannelRef.current);
        requestChannelRef.current = null;
      }

      stopLocalMedia();
      closePeerConnection();
      disconnectSocket();
    };
  }, [
    streamId,
    startPreview,
    fetchDetails,
    initSocket,
    handleApproval,
    stopLocalMedia,
    closePeerConnection,
    disconnectSocket,
    showNotice
  ]);

  useEffect(() => {
    if (!streamId) return;

    const giftChannel = supabase
      .channel(`live_gifts_guest_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gifts',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          const gift = payload.new;

          setLatestGift({
            id: gift.id,
            event_id: gift.id,
            stream_id: gift.stream_id,
            sender_id: gift.sender_id,
            gift_id: gift.gift_id,
            gift_name: gift.gift_name,
            gift_icon: gift.icon || gift.gift_icon,
            icon: gift.icon || gift.gift_icon,
            gift_image: gift.gift_image || gift.image || null,
            image: gift.gift_image || gift.image || null,
            gift_sound: gift.gift_sound || gift.sound || null,
            sound: gift.gift_sound || gift.sound || null,
            gift_animation: gift.gift_animation || gift.animation || 'pop',
            animation: gift.gift_animation || gift.animation || 'pop',
            gift_rarity: gift.gift_rarity || gift.rarity || 'common',
            rarity: gift.gift_rarity || gift.rarity || 'common',
            quantity: gift.quantity || 1,
            price: gift.price || gift.price_total || 0,
            price_total: gift.price_total || gift.price || 0,
            created_at: gift.created_at || new Date().toISOString()
          });

          if (giftTimeoutRef.current) {
            clearTimeout(giftTimeoutRef.current);
          }

          giftTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) setLatestGift(null);
          }, 8500);
        }
      )
      .subscribe();

    return () => {
      if (giftTimeoutRef.current) clearTimeout(giftTimeoutRef.current);
      supabase.removeChannel(giftChannel);
    };
  }, [streamId]);

  useEffect(() => {
    if (!streamId) return;

    const streamChannel = supabase
      .channel(`live_stream_status_guest_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        payload => {
          if (!mountedRef.current) return;

          const updated = payload.new;

          setStreamData(previous => ({
            ...(previous || {}),
            ...updated
          }));

          if (
            updated.status &&
            !['live', 'active', 'streaming'].includes(
              String(updated.status).toLowerCase()
            )
          ) {
            setStreamEnded(true);
            setIsLiveOnPanel(false);
            cleanupConnection();
            stopLocalMedia();
          }

          if (typeof updated.likes === 'number') {
            setHeartCount(updated.likes);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamChannel);
    };
  }, [streamId, cleanupConnection, stopLocalMedia]);

  useEffect(() => {
    if (!isLiveOnPanel) return;

    const timer = window.setInterval(async () => {
      if (!pcRef.current || pcRef.current.connectionState !== 'connected') return;

      try {
        const stats = await pcRef.current.getStats();

        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
        });

        const totalPackets = packetsLost + packetsReceived;

        if (totalPackets > 0) {
          const lossRate = packetsLost / totalPackets;

          if (lossRate > 0.08) {
            setConnectionQuality('poor');
          } else if (lossRate > 0.03) {
            setConnectionQuality('weak');
          } else {
            setConnectionQuality('good');
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(timer);
  }, [isLiveOnPanel]);

  const qualityConfig = {
    good: {
      label: 'Good connection',
      icon: Signal,
      className: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/20'
    },
    weak: {
      label: 'Weak connection',
      icon: Wifi,
      className: 'text-amber-300 bg-amber-500/15 border-amber-400/20'
    },
    poor: {
      label: 'Poor connection',
      icon: WifiOff,
      className: 'text-red-300 bg-red-500/15 border-red-400/20'
    },
    connecting: {
      label: 'Connecting',
      icon: Loader2,
      className: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/20'
    }
  };

  const currentQuality = qualityConfig[connectionQuality] || qualityConfig.connecting;
  const QualityIcon = currentQuality.icon;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border border-cyan-400/20 bg-cyan-400/5 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-cyan-300" />
            </div>
            <div className="absolute inset-0 rounded-full animate-ping border border-cyan-400/10" />
          </div>
          <div className="text-center">
            <p className="font-black">Preparing your stage</p>
            <p className="text-xs text-zinc-500 mt-1">Connecting to the live session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (streamEnded) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/90 p-7 text-center shadow-2xl">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
            <Radio size={28} className="text-zinc-500" />
          </div>
          <h2 className="text-xl font-black">Live has ended</h2>
          <p className="mt-2 text-sm text-zinc-500">
            This live session is no longer accepting panel guests.
          </p>
          <button
            onClick={() => navigate(`/live/watch/${streamId}`)}
            className="mt-6 w-full rounded-2xl bg-white text-black py-3.5 text-sm font-black active:scale-95 transition"
          >
            Return to live
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-black text-white relative overflow-hidden font-sans select-none">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_10%,rgba(254,44,85,.12),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(6,182,212,.10),transparent_30%)]" />

      <div className="fixed top-0 left-0 right-0 z-[80] px-3 sm:px-5 pt-3 pointer-events-none">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          <div className="min-w-0 flex-1">
            <StreamHeader
              data={streamData}
              isHost={false}
              viewerCount={streamData?.viewer_count || 0}
              onLeave={handleLeavePanel}
            />
          </div>

          <button
            onClick={() => navigate(`/live/watch/${streamId}`)}
            className="shrink-0 h-10 w-10 rounded-full bg-black/65 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition active:scale-90"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {panelNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: .96 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md"
          >
            <div className={`rounded-2xl border backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-2xl ${
              panelNotice.type === 'error'
                ? 'bg-red-950/80 border-red-500/30'
                : panelNotice.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-500/30'
                  : panelNotice.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/30'
                    : 'bg-zinc-900/90 border-white/10'
            }`}>
              {panelNotice.type === 'error' ? (
                <AlertTriangle size={18} className="text-red-300 shrink-0" />
              ) : panelNotice.type === 'warning' ? (
                <AlertTriangle size={18} className="text-amber-300 shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
              )}
              <span className="text-xs font-bold text-white/90">{panelNotice.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLiveOnPanel ? (
        <div className="absolute inset-0 pt-14 pb-20">
          <div className="absolute inset-0">
            <DynamicStreamGrid
              streamId={streamId}
              hostStream={hostRemoteStream}
              hostVideo={!hostRemoteStream ? <VideoPlayer streamId={streamId} isHost={false} /> : null}
              hostInfo={{
                username: streamData?.host?.username || 'Host',
                avatar_url: streamData?.host?.avatar_url
              }}
              coHostStream={assignedMode === 'video' ? localStreamRef.current : null}
              coHostInfo={{
                username: userProfile?.username || 'You',
                avatar_url: userProfile?.avatar_url,
                mode: assignedMode
              }}
              isHostView={false}
            />
          </div>

          <div className="absolute top-20 left-3 z-40 flex items-center gap-2">
            <div className="rounded-full bg-red-500/90 px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-black">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>

            <div className={`rounded-full border backdrop-blur-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold ${currentQuality.className}`}>
              <QualityIcon size={12} className={connectionQuality === 'connecting' ? 'animate-spin' : ''} />
              {currentQuality.label}
            </div>

            {lowDataMode && (
              <div className="rounded-full bg-cyan-500/15 border border-cyan-400/20 backdrop-blur-xl px-2.5 py-1 text-[10px] font-bold text-cyan-200">
                LOW DATA
              </div>
            )}
          </div>

          <div className="absolute top-20 right-3 z-40 w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden border border-cyan-300/50 bg-zinc-950 shadow-2xl">
            {assignedMode === 'video' && isCamOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center text-center p-2">
                <img
                  src={userProfile?.avatar_url || DEFAULT_AVATAR}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                />
                <span className="mt-2 text-[8px] font-black text-zinc-300">
                  {assignedMode === 'audio' ? 'AUDIO ONLY' : 'CAMERA OFF'}
                </span>
              </div>
            )}

            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="h-1 rounded-full bg-black/60 overflow-hidden">
                <motion.div
                  animate={{ width: `${isMicOn ? audioLevel : 0}%` }}
                  className="h-full bg-emerald-400"
                />
              </div>
            </div>

            <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black">
              YOU
            </div>
          </div>

          {isReconnecting && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: .95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-white/10 bg-black/75 backdrop-blur-xl px-6 py-5 text-center shadow-2xl max-w-xs"
              >
                <Loader2 size={28} className="mx-auto text-cyan-300 animate-spin" />
                <p className="mt-3 text-sm font-black">Reconnecting</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {reconnectMessage || 'Restoring your panel connection...'}
                </p>
              </motion.div>
            </div>
          )}

          {hostDisconnected && !isReconnecting && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50">
              <button
                onClick={handleReconnect}
                className="rounded-full bg-black/75 backdrop-blur-xl border border-amber-400/20 px-4 py-2 text-xs font-bold text-amber-200 flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Reconnect
              </button>
            </div>
          )}

          <div className="absolute left-3 bottom-24 z-40 w-[min(78vw,310px)]">
            {showChat && (
              <div className="rounded-2xl overflow-hidden bg-black/35 backdrop-blur-md border border-white/10">
                <LiveChat streamId={streamId} hideMessages={false} />
              </div>
            )}
          </div>

          <div className="absolute inset-0 z-30 pointer-events-none">
            <FloatingHearts count={heartCount} streamId={streamId} />

            {latestGift && (
              <GiftAlertOverlay
                gift={latestGift}
                lowData={lowDataMode}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pt-16 pb-24 overflow-y-auto">
          <div className="min-h-full w-full flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="relative aspect-[3/4] max-h-[58vh] mx-auto rounded-[2rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl">
                {isCamOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                    <div className="h-24 w-24 rounded-full overflow-hidden border border-white/10">
                      <img
                        src={userProfile?.avatar_url || DEFAULT_AVATAR}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="mt-4 font-black">
                      @{userProfile?.username || 'Guest'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">Camera is off</p>
                  </div>
                )}

                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="rounded-full bg-black/55 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black">STAGE PREVIEW</span>
                  </div>

                  <button
                    onClick={toggleFlipCamera}
                    className="h-9 w-9 rounded-full bg-black/55 backdrop-blur-xl border border-white/10 flex items-center justify-center"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 p-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">Microphone</span>
                      <span className={isMicOn ? 'text-emerald-300' : 'text-red-300'}>
                        {isMicOn ? 'Ready' : 'Muted'}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        animate={{ width: `${isMicOn ? audioLevel : 0}%` }}
                        className="h-full bg-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck size={17} className="text-cyan-300" />
                  <h1 className="text-lg font-black">Join the live stage</h1>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-zinc-500 max-w-sm mx-auto">
                  Your camera and microphone will be shared with the host when your request is approved.
                </p>
              </div>

              {mediaError && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-300 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-100">{mediaError}</p>
                      <button
                        onClick={retryMedia}
                        className="mt-2 text-[11px] font-black text-red-300 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  onClick={toggleMic}
                  className={`rounded-2xl border py-3 flex flex-col items-center gap-1.5 transition active:scale-95 ${
                    isMicOn
                      ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300'
                      : 'bg-red-500/10 border-red-400/20 text-red-300'
                  }`}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  <span className="text-[9px] font-black">{isMicOn ? 'MIC ON' : 'MUTED'}</span>
                </button>

                <button
                  onClick={toggleCamera}
                  className={`rounded-2xl border py-3 flex flex-col items-center gap-1.5 transition active:scale-95 ${
                    isCamOn
                      ? 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300'
                      : 'bg-red-500/10 border-red-400/20 text-red-300'
                  }`}
                >
                  {isCamOn ? <Camera size={18} /> : <VideoOff size={18} />}
                  <span className="text-[9px] font-black">{isCamOn ? 'CAM ON' : 'CAM OFF'}</span>
                </button>

                <button
                  onClick={() => setShowSettings(value => !value)}
                  className={`rounded-2xl border py-3 flex flex-col items-center gap-1.5 transition active:scale-95 ${
                    showSettings
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  <Settings2 size={18} />
                  <span className="text-[9px] font-black">SETTINGS</span>
                </button>
              </div>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -5 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -5 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-2xl border border-white/10 bg-zinc-950/90 p-3">
                      <button
                        onClick={handleLowDataToggle}
                        className="w-full flex items-center justify-between py-2"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold">Low-data mode</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            Lower camera quality to save mobile data
                          </p>
                        </div>
                        <div className={`h-6 w-11 rounded-full p-1 transition ${lowDataMode ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                          <div className={`h-4 w-4 rounded-full bg-white transition-transform ${lowDataMode ? 'translate-x-5' : ''}`} />
                        </div>
                      </button>

                      <div className="my-2 border-t border-white/5" />

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-xs font-bold">Audio</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Panel audio monitoring</p>
                        </div>
                        <button
                          onClick={() => setSpeakerEnabled(value => !value)}
                          className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
                        >
                          {speakerEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5">
                {isRequesting ? (
                  <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-400/10 flex items-center justify-center">
                        <Clock3 size={22} className="text-amber-300" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm">Waiting for approval</p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          The host is deciding whether to bring you on stage.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={cancelRequest}
                      className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10"
                    >
                      Cancel request
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSendRequest}
                    disabled={permissionState === 'denied' || permissionState === 'unsupported'}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#fe2c55] to-pink-600 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-[0_10px_40px_rgba(254,44,85,.25)] active:scale-[.98] transition disabled:opacity-40"
                  >
                    <Zap size={18} fill="currentColor" />
                    Request to join
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-5 text-[9px] font-bold text-zinc-600">
                <span className="flex items-center gap-1">
                  <Camera size={11} />
                  Camera
                </span>
                <span className="flex items-center gap-1">
                  <Mic size={11} />
                  Microphone
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  Co-host
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-[70] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-zinc-950/90 backdrop-blur-2xl p-2 flex items-center justify-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleMic}
            className={`h-11 w-11 sm:w-auto sm:px-4 rounded-2xl flex items-center justify-center gap-2 border transition active:scale-90 ${
              isMicOn
                ? 'bg-white/5 border-white/10 text-white'
                : 'bg-red-500/15 border-red-400/20 text-red-300'
            }`}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            <span className="hidden sm:inline text-[10px] font-black">
              {isMicOn ? 'MIC' : 'MUTED'}
            </span>
          </button>

          <button
            onClick={toggleCamera}
            className={`h-11 w-11 sm:w-auto sm:px-4 rounded-2xl flex items-center justify-center gap-2 border transition active:scale-90 ${
              isCamOn
                ? 'bg-white/5 border-white/10 text-white'
                : 'bg-red-500/15 border-red-400/20 text-red-300'
            }`}
          >
            {isCamOn ? <Camera size={18} /> : <VideoOff size={18} />}
            <span className="hidden sm:inline text-[10px] font-black">CAM</span>
          </button>

          <button
            onClick={toggleFlipCamera}
            className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-90 transition"
          >
            <RefreshCw size={18} />
          </button>

          {isLiveOnPanel && (
            <>
              <button
                onClick={() => setShowChat(value => !value)}
                className={`h-11 w-11 rounded-2xl border flex items-center justify-center transition active:scale-90 ${
                  showChat
                    ? 'bg-purple-500/15 border-purple-400/20 text-purple-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                <MessageCircle size={18} />
              </button>

              <button
                onClick={() => setShowGifts(true)}
                className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-300 active:scale-90 transition"
              >
                <GiftIcon size={18} />
              </button>

              <button
                onClick={handleLike}
                className="h-11 w-11 rounded-2xl bg-pink-500/10 border border-pink-400/20 flex items-center justify-center text-pink-300 active:scale-90 transition"
              >
                <Heart size={18} fill="currentColor" />
              </button>

              <button
                onClick={() => setShowSettings(value => !value)}
                className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:scale-90 transition"
              >
                <ChevronDown size={18} className={showSettings ? 'rotate-180 transition' : 'transition'} />
              </button>

              <button
                onClick={handleLeavePanel}
                className="h-11 px-3 sm:px-4 rounded-2xl bg-red-500/15 border border-red-400/20 text-red-300 flex items-center justify-center gap-1.5 active:scale-90 transition"
              >
                <LogOut size={17} />
                <span className="hidden sm:inline text-[10px] font-black">LEAVE</span>
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showGifts && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGifts(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[85dvh] overflow-hidden"
            >
              <GiftPanel
                streamId={streamId}
                onClose={() => setShowGifts(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JoinAsGuest;
