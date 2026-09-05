import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Phone, Video, MoreVertical, Send, Image, Smile, Mic, Paperclip,
  CornerUpLeft, Trash2, Edit2, Pin, Star, Shield, AlertTriangle,
  Trash, Check, CheckCheck, FileText, X, Play, Pause,
  Copy, Sparkles, Zap, Search, Download, Maximize2,
  Cpu, Sticker
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import confetti from 'canvas-confetti';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

/* =========================================================
   AUDIO PLAYER
========================================================= */

const AudioPlayer = ({ url }) => {
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    setCurrentTime(audioRef.current.currentTime || 0);

    if (Number.isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (secs) => {
    if (!secs || Number.isNaN(secs)) return '0:00';

    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] min-w-[220px] max-w-[280px]">
      <div className="flex items-center gap-3">

        <button
          type="button"
          onClick={togglePlay}
          className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-black flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          {isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          )}

          {isPlaying && (
            <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-60 pointer-events-none" />
          )}
        </button>

        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => setIsPlaying(false)}
          className="hidden"
        />

        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex items-end gap-[3px] h-6 px-1">
            {[40, 75, 55, 90, 65, 80, 45, 95, 60, 70, 85, 50, 60, 75].map(
              (height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    (i / 14) * 100 <= progress
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                      : 'bg-white/20'
                  }`}
                  style={{
                    height: isPlaying
                      ? `${Math.max(20, height * (0.75 + ((i % 4) * 0.1)))}%`
                      : `${height * 0.6}%`
                  }}
                />
              )
            )}
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300/80 px-1 font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   STICKERS / SUGGESTIONS
========================================================= */

const CYBER_STICKERS = [
  {
    id: '1',
    emoji: '🤖',
    label: 'CYBER BOT',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'
  },
  {
    id: '2',
    emoji: '⚡',
    label: 'OVERCHARGE',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200'
  },
  {
    id: '3',
    emoji: '🚀',
    label: 'HYPERSPEED',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200'
  },
  {
    id: '4',
    emoji: '💎',
    label: 'QUANTUM GEM',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=200'
  },
  {
    id: '5',
    emoji: '🔥',
    label: 'CYBER FLAME',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200'
  },
  {
    id: '6',
    emoji: '🛸',
    label: 'NEO MATRIX',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200'
  }
];

const SMART_SUGGESTIONS = [
  '⚡ Quantum Ping',
  '🚀 Meet on Live Video',
  '🔥 Check this out!',
  '✨ Let’s collaborate!',
  '💎 Awesome work',
  '🤝 Catch you soon!'
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Messaging = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const peerUserId = searchParams.get('userId');

  /* =======================================================
     CORE STATE
  ======================================================= */

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerRecording, setIsPeerRecording] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const [activeFilter, setActiveFilter] = useState('all');

  const [previewImage, setPreviewImage] = useState(null);
  const [hudToast, setHudToast] = useState(null);

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  /* =======================================================
     REFS
  ======================================================= */

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const recordingTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const socketRef = useRef(null);

  const messagesEndRef = useRef(null);

  const currentUserIdRef = useRef(null);
  const peerUserIdRef = useRef(peerUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    peerUserIdRef.current = peerUserId;
  }, [peerUserId]);

  /* =======================================================
     TOAST
  ======================================================= */

  const showToast = useCallback((text) => {
    setHudToast(text);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setHudToast(null);
    }, 2500);
  }, []);

  /* =======================================================
     PROFILE INITIALIZATION
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const initProfiles = async () => {
      if (!peerUserId) return;

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth lookup failed:', authError);
        return;
      }

      if (!user || cancelled) return;

      setCurrentUserId(user.id);

      const [myProf, individualProf] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),

        supabase
          .from('profiles')
          .select('*')
          .eq('id', peerUserId)
          .single()
      ]);

      if (cancelled) return;

      if (myProf.error) {
        console.error('Current profile error:', myProf.error);
      }

      if (individualProf.error) {
        console.error('Peer profile error:', individualProf.error);
      }

      if (myProf.data) {
        setCurrentUserProfile(myProf.data);
      }

      if (individualProf.data) {
        setPeerProfile(individualProf.data);

        if (typeof individualProf.data.online === 'boolean') {
          setIsPeerOnline(individualProf.data.online);
        }
      }
    };

    initProfiles();

    return () => {
      cancelled = true;
    };
  }, [peerUserId]);

  /* =======================================================
     LOAD CONVERSATION
  ======================================================= */

  const loadConversation = useCallback(async () => {
    if (!currentUserId || !peerUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUserId})`
      )
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('Conversation loading failed:', error);
      showToast('Unable to load messages');
      return;
    }

    if (data) {
      setMessages(data);
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ unread: false })
      .eq('sender_id', peerUserId)
      .eq('receiver_id', currentUserId)
      .eq('unread', true);

    if (updateError) {
      console.error('Unread update failed:', updateError);
    }
  }, [currentUserId, peerUserId, showToast]);

  /* =======================================================
     SOCKET CONNECTION
  ======================================================= */

  useEffect(() => {
    if (!currentUserId || !peerUserId) return;

    let mounted = true;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000
    });

    socketRef.current = socket;

    /* -------------------------------------------------------
       CONNECTION
    ------------------------------------------------------- */

    const handleConnect = () => {
      if (!mounted) return;

      console.log('[Messaging] Socket connected:', socket.id);

      socket.emit('user_going_online', currentUserId);

      /*
       * This is intentionally optional.
       * If your backend supports register_user_session,
       * it gives the server another way to associate the
       * current socket with this user.
       */
      socket.emit('register_user_session', {
        userId: currentUserId,
        socketId: socket.id
      });
    };

    const handleDisconnect = (reason) => {
      console.warn('[Messaging] Socket disconnected:', reason);
    };

    const handleConnectError = (error) => {
      console.error('[Messaging] Socket connection error:', error);
    };

    /* -------------------------------------------------------
       CHAT MESSAGE
    ------------------------------------------------------- */

    const handleIncomingMessage = (incoming) => {
      if (!incoming || !mounted) return;

      const isConversationMessage =
        (incoming.sender_id === peerUserId &&
          incoming.receiver_id === currentUserId) ||
        (incoming.sender_id === currentUserId &&
          incoming.receiver_id === peerUserId);

      if (!isConversationMessage) return;

      setMessages((prev) => {
        if (prev.some((message) => message.id === incoming.id)) {
          return prev;
        }

        return [...prev, incoming];
      });
    };

    /* -------------------------------------------------------
       MESSAGE UPDATE
    ------------------------------------------------------- */

    const handleMessageUpdate = (updatedMsg) => {
      if (!updatedMsg || !mounted) return;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === updatedMsg.id ? updatedMsg : message
        )
      );
    };

    /* -------------------------------------------------------
       TYPING
    ------------------------------------------------------- */

    const handlePeerTyping = ({ userId, isTyping, mode }) => {
      if (!mounted || userId !== peerUserId) return;

      if (mode === 'audio') {
        setIsPeerRecording(Boolean(isTyping));
      } else {
        setIsPeerTyping(Boolean(isTyping));
      }
    };

    /* -------------------------------------------------------
       PRESENCE
    ------------------------------------------------------- */

    const handlePresence = ({ userId, status }) => {
      if (!mounted || userId !== peerUserId) return;

      setIsPeerOnline(status === 'online');
    };

    /* -------------------------------------------------------
       INCOMING CALL
    ------------------------------------------------------- */

    const handleIncomingCall = (callData) => {
      if (!mounted || !callData) return;

      if (callData.receiverId !== currentUserId) return;

      /*
       * Ignore our own call.
       */
      if (callData.callerId === currentUserId) return;

      /*
       * Ignore calls intended for a different conversation.
       */
      if (
        callData.receiverId !== currentUserId ||
        callData.callerId !== peerUserId
      ) {
        return;
      }

      console.log('[Messaging] Incoming call:', callData);

      setIncomingCall((previous) => {
        /*
         * Prevent duplicate incoming-call events.
         */
        if (
          previous &&
          previous.callId &&
          callData.callId &&
          previous.callId === callData.callId
        ) {
          return previous;
        }

        return {
          ...callData,
          callId:
            callData.callId ||
            crypto.randomUUID(),
          roomId:
            callData.roomId ||
            [callData.callerId, callData.receiverId]
              .sort()
              .join('-')
        };
      });
    };

    /* -------------------------------------------------------
       CALL CANCELLED
    ------------------------------------------------------- */

    const handleCallCancelled = (callData) => {
      if (!mounted) return;

      if (!callData) {
        setIncomingCall(null);
        return;
      }

      /*
       * Only close the modal if it matches this call.
       */
      setIncomingCall((currentCall) => {
        if (!currentCall) return null;

        if (
          callData.callId &&
          currentCall.callId &&
          callData.callId !== currentCall.callId
        ) {
          return currentCall;
        }

        if (
          callData.callerId &&
          currentCall.callerId &&
          callData.callerId !== currentCall.callerId
        ) {
          return currentCall;
        }

        return null;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    socket.on('received_chat_message', handleIncomingMessage);
    socket.on('message_updated_realtime', handleMessageUpdate);

    socket.on(
      'peer_typing_state_changed',
      handlePeerTyping
    );

    socket.on(
      'friend_presence_changed',
      handlePresence
    );

    /*
     * ONE active incoming-call event.
     *
     * No Supabase Broadcast channel is created here.
     */
    socket.on(
      'incoming_call_signal',
      handleIncomingCall
    );

    socket.on(
      'call_cancelled_by_caller',
      handleCallCancelled
    );

    loadConversation();

    return () => {
      mounted = false;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);

      socket.off(
        'received_chat_message',
        handleIncomingMessage
      );

      socket.off(
        'message_updated_realtime',
        handleMessageUpdate
      );

      socket.off(
        'peer_typing_state_changed',
        handlePeerTyping
      );

      socket.off(
        'friend_presence_changed',
        handlePresence
      );

      socket.off(
        'incoming_call_signal',
        handleIncomingCall
      );

      socket.off(
        'call_cancelled_by_caller',
        handleCallCancelled
      );

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [currentUserId, peerUserId, loadConversation]);

  /* =======================================================
     SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isPeerTyping, isPeerRecording]);

  /* =======================================================
     TYPING
  ======================================================= */

  const triggerTypingState = useCallback(
    (isTyping, mode = 'text') => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) return;
      if (!currentUserId || !peerUserId) return;

      socket.emit('user_typing_state', {
        room_id: [currentUserId, peerUserId].sort().join('-'),
        userId: currentUserId,
        isTyping,
        mode
      });
    },
    [currentUserId, peerUserId]
  );

  const handleInputChange = (value) => {
    setNewMessage(value);

    triggerTypingState(true, 'text');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      triggerTypingState(false, 'text');
    }, 2000);
  };

  /* =======================================================
     WAIT FOR SOCKET
  ======================================================= */

  const waitForSocketConnection = useCallback(
    (timeout = 8000) => {
      return new Promise((resolve, reject) => {
        const socket = socketRef.current;

        if (!socket) {
          reject(new Error('Socket is not initialized.'));
          return;
        }

        if (socket.connected) {
          resolve(socket);
          return;
        }

        let finished = false;

        const cleanup = () => {
          socket.off('connect', handleConnect);
          clearTimeout(timer);
        };

        const handleConnect = () => {
          if (finished) return;

          finished = true;
          cleanup();
          resolve(socket);
        };

        const timer = setTimeout(() => {
          if (finished) return;

          finished = true;
          cleanup();
          reject(new Error('Socket connection timeout.'));
        }, timeout);

        socket.once('connect', handleConnect);

        if (!socket.active) {
          socket.connect();
        }
      });
    },
    []
  );

  /* =======================================================
     START CALL
  ======================================================= */

  const startCall = useCallback(
    async (callType) => {
      if (!currentUserId || !peerUserId) {
        showToast('Unable to start call');
        return;
      }

      if (callType !== 'voice' && callType !== 'video') {
        return;
      }

      try {
        const socket = await waitForSocketConnection();

        const callId = crypto.randomUUID();

        const roomId = [currentUserId, peerUserId]
          .sort()
          .join('-');

        const callData = {
          callId,
          receiverId: peerUserId,
          callerId: currentUserId,
          callerName:
            currentUserProfile?.username || 'user',
          callerAvatar:
            currentUserProfile?.avatar_url || null,
          callType,
          roomId,
          createdAt: new Date().toISOString()
        };

        console.log(
          '[Messaging] Starting call:',
          callData
        );

        /*
         * IMPORTANT:
         *
         * This is the ONLY live call invitation.
         *
         * Do NOT create a Supabase Broadcast channel here.
         */
        socket.emit(
          'initiate_call_signal',
          callData
        );

        /*
         * Add call log to conversation.
         */
        await sendStructuredPayload(
          callType === 'video'
            ? '📹 Video Call Initiated'
            : '📞 Voice Call Initiated',
          'call_log',
          null,
          {
            callId,
            callType,
            status: 'initiated',
            roomId
          }
        );

        const targetRoute =
          callType === 'video'
            ? '/video-call'
            : '/voice-call';

        navigate(
          `${targetRoute}?userId=${encodeURIComponent(
            peerUserId
          )}&role=caller&callId=${encodeURIComponent(
            callId
          )}&roomId=${encodeURIComponent(roomId)}`
        );
      } catch (error) {
        console.error(
          '[Messaging] Failed to start call:',
          error
        );

        showToast(
          'Call connection unavailable. Please retry.'
        );
      }
    },
    [
      currentUserId,
      peerUserId,
      currentUserProfile,
      navigate,
      showToast,
      waitForSocketConnection
    ]
  );

  /* =======================================================
     ACCEPT CALL
  ======================================================= */

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    const call = incomingCall;

    if (!call.callerId) {
      showToast('Invalid incoming call');
      setIncomingCall(null);
      return;
    }

    const callId =
      call.callId || crypto.randomUUID();

    const roomId =
      call.roomId ||
      [call.callerId, currentUserId]
        .sort()
        .join('-');

    setIncomingCall(null);

    const route =
      call.callType === 'video'
        ? '/video-call'
        : '/voice-call';

    navigate(
      `${route}?userId=${encodeURIComponent(
        call.callerId
      )}&role=receiver&callId=${encodeURIComponent(
        callId
      )}&roomId=${encodeURIComponent(roomId)}`
    );
  };

  /* =======================================================
     DECLINE CALL
  ======================================================= */

  const declineIncomingCall = () => {
    if (!incomingCall) return;

    const socket = socketRef.current;

    const payload = {
      callerId: incomingCall.callerId,
      receiverId: currentUserId,
      callId: incomingCall.callId || null,
      roomId:
        incomingCall.roomId ||
        [incomingCall.callerId, currentUserId]
          .sort()
          .join('-')
    };

    console.log(
      '[Messaging] Declining call:',
      payload
    );

    socket?.emit('decline_call', payload);

    /*
     * Some existing backends use this event.
     * It is safe to emit alongside decline_call if
     * the backend already supports it.
     */
    socket?.emit(
      'call_cancelled_by_caller',
      payload
    );

    setIncomingCall(null);
  };

  /* =======================================================
     MEDIA UPLOAD
  ======================================================= */

  const uploadMediaAttachment = async (
    file,
    bucketName = 'message-attachments'
  ) => {
    try {
      if (!file || !currentUserId) {
        return null;
      }

      const originalExtension =
        file.name?.includes('.')
          ? file.name.split('.').pop()
          : 'bin';

      const safeExtension =
        String(originalExtension)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') || 'bin';

      const fileName =
        `${crypto.randomUUID()}.${safeExtension}`;

      const filePath =
        `${currentUserId}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (error) {
      console.error(
        'Storage upload failed:',
        error
      );

      return null;
    }
  };

  const handleFileInputChange = async (
    event,
    messageType
  ) => {
    const file = event.target.files?.[0];

    /*
     * Reset input so selecting the same file again
     * triggers onChange.
     */
    event.target.value = '';

    if (!file) return;

    showToast(`Uploading ${messageType}...`);

    const uploadedUrl =
      await uploadMediaAttachment(file);

    if (!uploadedUrl) {
      showToast(
        'Upload failed. Please retry.'
      );
      return;
    }

    await sendStructuredPayload(
      file.name,
      messageType,
      uploadedUrl
    );

    showToast('Attachment sent!');
  };

  /* =======================================================
     VOICE RECORDING
  ======================================================= */

  const stopRecordingStream = () => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      recordingStreamRef.current = null;
    }
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleToggleVoiceRecording =
    async () => {
      if (isRecordingVoice) {
        const recorder =
          mediaRecorderRef.current;

        if (
          recorder &&
          recorder.state !== 'inactive'
        ) {
          recorder.stop();
        }

        setIsRecordingVoice(false);

        triggerTypingState(false, 'audio');

        clearRecordingTimer();

        return;
      }

      audioChunksRef.current = [];
      setRecordingSeconds(0);

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            }
          );

        recordingStreamRef.current = stream;

        let mimeType = '';

        if (
          typeof MediaRecorder !== 'undefined' &&
          MediaRecorder.isTypeSupported(
            'audio/webm;codecs=opus'
          )
        ) {
          mimeType =
            'audio/webm;codecs=opus';
        } else if (
          MediaRecorder.isTypeSupported(
            'audio/webm'
          )
        ) {
          mimeType = 'audio/webm';
        }

        const recorder = mimeType
          ? new MediaRecorder(stream, {
              mimeType
            })
          : new MediaRecorder(stream);

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable = (event) => {
          if (event.data?.size > 0) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

        recorder.onerror = (event) => {
          console.error(
            'Voice recorder error:',
            event
          );

          stopRecordingStream();
          clearRecordingTimer();
          setIsRecordingVoice(false);
          triggerTypingState(
            false,
            'audio'
          );

          showToast(
            'Voice recording failed.'
          );
        };

        recorder.onstop = async () => {
          clearRecordingTimer();

          const finalMime =
            recorder.mimeType ||
            mimeType ||
            'audio/webm';

          const audioBlob = new Blob(
            audioChunksRef.current,
            {
              type: finalMime
            }
          );

          stopRecordingStream();

          mediaRecorderRef.current = null;

          if (!audioBlob.size) {
            showToast(
              'Empty recording discarded.'
            );
            return;
          }

          const extension =
            finalMime.includes('webm')
              ? 'webm'
              : 'audio';

          const audioFile = new File(
            [audioBlob],
            `voice-note-${Date.now()}.${extension}`,
            {
              type: finalMime
            }
          );

          showToast(
            'Sending voice audio...'
          );

          const uploadedUrl =
            await uploadMediaAttachment(
              audioFile
            );

          if (uploadedUrl) {
            await sendStructuredPayload(
              'Voice Note',
              'audio',
              uploadedUrl
            );

            showToast(
              'Voice note sent!'
            );
          } else {
            showToast(
              'Voice note upload failed.'
            );
          }

          audioChunksRef.current = [];
        };

        recorder.start(250);

        setIsRecordingVoice(true);

        triggerTypingState(
          true,
          'audio'
        );

        recordingTimerRef.current =
          setInterval(() => {
            setRecordingSeconds(
              (previous) =>
                previous + 1
            );
          }, 1000);
      } catch (error) {
        console.error(
          'Microphone access failed:',
          error
        );

        stopRecordingStream();
        clearRecordingTimer();

        showToast(
          'Microphone access is required.'
        );
      }
    };

  const handleCancelVoiceRecording = () => {
    const recorder =
      mediaRecorderRef.current;

    /*
     * Remove the onstop handler so the cancelled
     * recording is not uploaded.
     */
    if (recorder) {
      recorder.onstop = null;

      if (
        recorder.state !== 'inactive'
      ) {
        recorder.stop();
      }
    }

    mediaRecorderRef.current = null;

    stopRecordingStream();
    clearRecordingTimer();

    audioChunksRef.current = [];

    setIsRecordingVoice(false);
    setRecordingSeconds(0);

    triggerTypingState(
      false,
      'audio'
    );

    showToast(
      'Voice recording discarded'
    );
  };

  /* =======================================================
     MESSAGE DISPATCH
  ======================================================= */

  const sendStructuredPayload = async (
    textText,
    messageType = 'text',
    mediaUrl = null,
    extraMetadata = {}
  ) => {
    if (!currentUserId || !peerUserId) {
      showToast(
        'Message cannot be sent right now.'
      );
      return null;
    }

    const payload = {
      id: crypto.randomUUID(),
      updated_at:
        new Date().toISOString(),

      user_name:
        currentUserProfile?.username ||
        'User',

      last_msg: textText,

      unread: true,

      online: false,

      receiver_id: peerUserId,
      sender_id: currentUserId,

      type: messageType,

      metadata: {
        ...(replyingTo
          ? {
              reply_to_id:
                replyingTo.id,
              reply_body:
                replyingTo.last_msg
            }
          : {}),

        ...extraMetadata
      },

      media_url: mediaUrl,

      call_duration: 0,

      status: 'sent',

      reactions: {}
    };

    /*
     * Optimistic UI update.
     */
    setMessages((previous) => {
      if (
        previous.some(
          (message) =>
            message.id === payload.id
        )
      ) {
        return previous;
      }

      return [...previous, payload];
    });

    setNewMessage('');
    setReplyingTo(null);
    setShowStickerDrawer(false);
    setShowEmojiPicker(false);

    triggerTypingState(false, 'text');

    /*
     * Send through Socket.IO.
     */
    const socket =
      socketRef.current;

    if (socket?.connected) {
      socket.emit(
        'send_chat_message',
        payload
      );
    }

    /*
     * Persist in Supabase.
     */
    const { error } =
      await supabase
        .from('messages')
        .insert(payload);

    if (error) {
      console.error(
        'Message database insert failed:',
        error
      );

      /*
       * Keep the optimistic message visible for now,
       * because the socket may already have delivered it.
       */
      showToast(
        'Message sync failed.'
      );

      return payload;
    }

    return payload;
  };

  /* =======================================================
     SEND / EDIT
  ======================================================= */

  const handleSendMessage = async (
    event
  ) => {
    event.preventDefault();

    const trimmed =
      newMessage.trim();

    if (!trimmed) return;

    if (editingMessage) {
      const updatedPayload = {
        ...editingMessage,
        last_msg: trimmed,
        is_edited: true,
        updated_at:
          new Date().toISOString()
      };

      setMessages((previous) =>
        previous.map((message) =>
          message.id ===
          editingMessage.id
            ? updatedPayload
            : message
        )
      );

      setEditingMessage(null);
      setNewMessage('');

      const { error } =
        await supabase
          .from('messages')
          .update({
            last_msg:
              updatedPayload.last_msg,
            is_edited: true,
            updated_at:
              updatedPayload.updated_at
          })
          .eq(
            'id',
            updatedPayload.id
          );

      if (error) {
        console.error(
          'Message edit failed:',
          error
        );

        showToast(
          'Message update failed.'
        );

        return;
      }

      socketRef.current?.emit(
        'broadcast_message_update',
        updatedPayload
      );

      showToast(
        'Message updated'
      );

      return;
    }

    await sendStructuredPayload(
      trimmed,
      'text'
    );
  };

  /* =======================================================
     REACTION
  ======================================================= */

  const addReaction = async (
    msgId,
    emojiStr
  ) => {
    const message =
      messages.find(
        (item) =>
          item.id === msgId
      );

    if (!message) return;

    if (
      ['🚀', '💎', '🔥', '❤️', '⚡'].includes(
        emojiStr
      )
    ) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: {
            y: 0.8
          },
          colors: [
            '#06b6d4',
            '#ec4899',
            '#a855f7',
            '#10b981'
          ]
        });
      } catch {
        // Ignore animation errors.
      }
    }

    const currentReactions = {
      ...(message.reactions || {})
    };

    currentReactions[currentUserId] =
      emojiStr;

    const updated = {
      ...message,
      reactions:
        currentReactions
    };

    setMessages((previous) =>
      previous.map((item) =>
        item.id === msgId
          ? updated
          : item
      )
    );

    const { error } =
      await supabase
        .from('messages')
        .update({
          reactions:
            currentReactions
        })
        .eq('id', msgId);

    if (error) {
      console.error(
        'Reaction update failed:',
        error
      );
      return;
    }

    socketRef.current?.emit(
      'broadcast_message_update',
      updated
    );
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteMessage = async (
    msgId
  ) => {
    const previousMessages =
      messages;

    setMessages((previous) =>
      previous.filter(
        (message) =>
          message.id !== msgId
      )
    );

    const { error } =
      await supabase
        .from('messages')
        .delete()
        .eq('id', msgId);

    if (error) {
      console.error(
        'Message deletion failed:',
        error
      );

      setMessages(
        previousMessages
      );

      showToast(
        'Message deletion failed.'
      );

      return;
    }

    socketRef.current?.emit(
      'broadcast_message_update',
      {
        id: msgId,
        deleted: true
      }
    );

    showToast(
      'Message deleted'
    );
  };

  /* =======================================================
     PIN
  ======================================================= */

  const togglePinMessage = async (
    message
  ) => {
    const updated = {
      ...message,
      is_pinned:
        !message.is_pinned
    };

    setMessages((previous) =>
      previous.map((item) =>
        item.id === message.id
          ? updated
          : item
      )
    );

    const { error } =
      await supabase
        .from('messages')
        .update({
          is_pinned:
            updated.is_pinned
        })
        .eq(
          'id',
          message.id
        );

    if (error) {
      console.error(
        'Pin update failed:',
        error
      );

      setMessages((previous) =>
        previous.map((item) =>
          item.id === message.id
            ? message
            : item
        )
      );

      showToast(
        'Unable to update pin.'
      );

      return;
    }

    socketRef.current?.emit(
      'broadcast_message_update',
      updated
    );

    showToast(
      updated.is_pinned
        ? 'Message pinned to HUD'
        : 'Message unpinned'
    );
  };

  /* =======================================================
     STAR
  ======================================================= */

  const toggleStarMessage = async (
    message
  ) => {
    const updated = {
      ...message,
      is_starred:
        !message.is_starred
    };

    setMessages((previous) =>
      previous.map((item) =>
        item.id === message.id
          ? updated
          : item
      )
    );

    const { error } =
      await supabase
        .from('messages')
        .update({
          is_starred:
            updated.is_starred
        })
        .eq(
          'id',
          message.id
        );

    if (error) {
      console.error(
        'Star update failed:',
        error
      );

      setMessages((previous) =>
        previous.map((item) =>
          item.id === message.id
            ? message
            : item
        )
      );

      showToast(
        'Unable to update star.'
      );

      return;
    }

    socketRef.current?.emit(
      'broadcast_message_update',
      updated
    );

    showToast(
      updated.is_starred
        ? 'Starred in Cyber Vault'
        : 'Removed from Starred'
    );
  };

  /* =======================================================
     COPY
  ======================================================= */

  const handleCopyMessage = async (
    text
  ) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(
        text
      );

      showToast(
        'Copied to Cyberdeck!'
      );
    } catch (error) {
      console.error(
        'Clipboard error:',
        error
      );

      showToast(
        'Unable to copy message.'
      );
    }
  };

  /* =======================================================
     REDIAL
  ======================================================= */

  const redialCall = (
    message
  ) => {
    const isVideo =
      message.metadata?.callType ===
      'video';

    startCall(
      isVideo
        ? 'video'
        : 'voice'
    );
  };

  /* =======================================================
     CLEANUP ON UNMOUNT
  ======================================================= */

  useEffect(() => {
    return () => {
      clearRecordingTimer();

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      if (toastTimeoutRef.current) {
        clearTimeout(
          toastTimeoutRef.current
        );
      }

      stopRecordingStream();

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== 'inactive'
      ) {
        try {
          recorder.stop();
        } catch {
          // Ignore.
        }
      }
    };
  }, []);

  /* =======================================================
     FILTERS
  ======================================================= */

  const pinnedMessages =
    messages.filter(
      (message) =>
        message.is_pinned
    );

  const filteredConversationMessages =
    messages.filter((message) => {
      const matchesSearch =
        !messageSearchQuery.trim() ||
        message.last_msg
          ?.toLowerCase()
          .includes(
            messageSearchQuery
              .toLowerCase()
          );

      if (!matchesSearch) {
        return false;
      }

      if (
        activeFilter ===
        'starred'
      ) {
        return message.is_starred;
      }

      if (
        activeFilter ===
        'pinned'
      ) {
        return message.is_pinned;
      }

      if (
        activeFilter ===
        'media'
      ) {
        return (
          message.type ===
            'image' ||
          message.type ===
            'file'
        );
      }

      if (
        activeFilter ===
        'audio'
      ) {
        return (
          message.type ===
          'audio'
        );
      }

      return true;
    });

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="fixed inset-0 bg-[#060609] text-white flex flex-col font-sans overflow-hidden select-none">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#060609] to-[#040407] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* ===================================================
          TOAST
      =================================================== */}

      <AnimatePresence>
        {hudToast && (
          <motion.div
            initial={{
              opacity: 0,
              y: -20,
              scale: 0.9
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: -20,
              scale: 0.9
            }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[130] bg-[#0c0c16]/95 border border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.4)] px-4 py-2 rounded-full text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 backdrop-blur-xl"
          >
            <Sparkles
              size={13}
              className="text-cyan-400 animate-spin"
            />
            <span>{hudToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================
          INCOMING CALL
      =================================================== */}

      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[140] p-6 text-center"
          >
            <div className="relative mb-6">

              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 via-pink-500/20 to-purple-500/20 border-2 border-cyan-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]">

                {incomingCall.callType ===
                'video' ? (
                  <Video
                    size={40}
                    className="text-cyan-400"
                  />
                ) : (
                  <Phone
                    size={40}
                    className="text-cyan-400"
                  />
                )}

              </div>

              <span className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-50" />
            </div>

            <div className="space-y-1 mb-8">

              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-mono uppercase tracking-widest font-black">
                {incomingCall.callType ===
                'video'
                  ? 'Holographic Video Stream'
                  : 'Encrypted Audio Link'}
              </span>

              <h2 className="text-2xl font-black tracking-tight text-white mt-2">
                Incoming Transmission
              </h2>

              <p className="text-sm text-zinc-400 font-medium">
                @{incomingCall.callerName ||
                  'user'} is requesting a secure
                link
              </p>
            </div>

            <div className="flex items-center gap-8">

              <button
                type="button"
                onClick={
                  declineIncomingCall
                }
                className="w-16 h-16 bg-gradient-to-tr from-red-600 to-rose-600 text-white rounded-2xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.5)] border border-rose-400/40"
              >
                <X size={24} />

                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">
                  Decline
                </span>
              </button>

              <button
                type="button"
                onClick={
                  acceptIncomingCall
                }
                className="w-16 h-16 bg-gradient-to-tr from-cyan-400 via-teal-400 to-emerald-400 text-black rounded-2xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.8)] border border-cyan-300"
              >
                <Check
                  size={26}
                  className="stroke-[3px]"
                />

                <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">
                  Accept
                </span>
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================
          IMAGE LIGHTBOX
      =================================================== */}

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            onClick={() =>
              setPreviewImage(null)
            }
            className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[150] flex flex-col items-center justify-center p-4"
          >

            <div className="absolute top-4 right-4 flex items-center gap-3">

              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                download
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="p-2.5 bg-white/10 hover:bg-cyan-500 hover:text-black rounded-xl text-white transition-colors"
                title="Download"
              >
                <Download size={18} />
              </a>

              <button
                type="button"
                onClick={() =>
                  setPreviewImage(null)
                }
                className="p-2.5 bg-white/10 hover:bg-rose-500 rounded-xl text-white transition-colors"
              >
                <X size={18} />
              </button>

            </div>

            <div
              onClick={(event) =>
                event.stopPropagation()
              }
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.3)]"
            >
              <img
                src={previewImage}
                alt="Enlarged visual hologram"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[80vh]"
              />

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-[11px] font-mono text-cyan-300">
                <span>
                  HOLOGRAM_VIEWER //
                  HIGH_RES
                </span>

                <span>
                  STATUS: READY
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIDDEN INPUTS */}

      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) =>
          handleFileInputChange(
            event,
            'image'
          )
        }
      />

      <input
        type="file"
        ref={fileInputRef}
        accept="*/*"
        className="hidden"
        onChange={(event) =>
          handleFileInputChange(
            event,
            'file'
          )
        }
      />

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="px-4 py-3 bg-[#0a0a12]/90 backdrop-blur-2xl border-b border-cyan-500/20 flex flex-col gap-2 z-50 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="p-2 bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>

            {/* PROFILE */}

            <div
              className="relative cursor-pointer group"
              onClick={() =>
                navigate(
                  `/profile/${
                    peerProfile?.id ||
                    peerUserId
                  }`
                )
              }
            >
              <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-purple-600 shadow-[0_0_12px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">

                <img
                  src={
                    peerProfile?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerUserId}`
                  }
                  className="w-10 h-10 rounded-full object-cover border-2 border-black"
                  alt="Avatar"
                />

              </div>

              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a12] shadow-md ${
                  isPeerOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
            </div>

            <div>

              <div className="flex items-center gap-1.5">

                <h2 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-cyan-200">
                  @{peerProfile?.username ||
                    'user'}
                </h2>

                {peerProfile?.is_verified && (
                  <span className="w-3.5 h-3.5 bg-cyan-400 text-black text-[9px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                    ✓
                  </span>
                )}

              </div>

              <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider">

                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPeerOnline
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-zinc-600'
                  }`}
                />

                <span
                  className={
                    isPeerOnline
                      ? 'text-emerald-400 font-bold'
                      : 'text-zinc-500'
                  }
                >
                  {isPeerOnline
                    ? 'HUD: ONLINE'
                    : 'STATUS: OFFLINE'}
                </span>

                <span className="text-zinc-600 font-normal">
                  • 256-BIT P2P
                </span>

              </div>
            </div>
          </div>

          {/* HEADER ACTIONS */}

          <div className="flex items-center gap-1.5">

            <button
              type="button"
              onClick={() =>
                setShowSearchInput(
                  (value) => !value
                )
              }
              className={`p-2 rounded-xl border transition-all ${
                showSearchInput
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              <Search size={16} />
            </button>

            {/* VOICE CALL */}

            <button
              type="button"
              disabled={!currentUserId}
              onClick={() =>
                startCall('voice')
              }
              className="p-2 bg-white/5 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 rounded-xl transition-all active:scale-95 shadow-sm disabled:opacity-40"
              title="Start Encrypted Voice Call"
            >
              <Phone size={16} />
            </button>

            {/* VIDEO CALL */}

            <button
              type="button"
              disabled={!currentUserId}
              onClick={() =>
                startCall('video')
              }
              className="p-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500 hover:to-teal-400 text-cyan-300 hover:text-black border border-cyan-500/30 rounded-xl transition-all active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.2)] disabled:opacity-40"
              title="Start Holographic Video Call"
            >
              <Video size={16} />
            </button>

            {/* MENU */}

            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setShowMenu(
                    (value) => !value
                  )
                }
                className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-xl transition-colors"
              >
                <MoreVertical size={16} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.95
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1
                    }}
                    exit={{
                      opacity: 0,
                      y: 10,
                      scale: 0.95
                    }}
                    className="absolute right-0 mt-2 w-52 bg-[#0d0d16] border border-cyan-500/30 rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl"
                  >

                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          'Conversation notifications muted'
                        );
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-zinc-300 hover:text-white"
                    >
                      <Shield
                        size={14}
                        className="text-cyan-400"
                      />
                      Mute Notifications
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          'User flagged in restriction sandbox'
                        );
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-amber-400"
                    >
                      <AlertTriangle size={14} />
                      Restrict User
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          'Report submitted to moderation matrix'
                        );
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-xl flex items-center gap-2 text-rose-400"
                    >
                      <AlertTriangle size={14} />
                      Report User
                    </button>

                    <div className="h-px bg-white/10 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setShowMenu(false);
                        showToast(
                          'Chat stream cleared locally'
                        );
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-rose-500/10 rounded-xl flex items-center gap-2 text-red-400"
                    >
                      <Trash size={14} />
                      Clear Local Stream
                    </button>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <AnimatePresence>
          {showSearchInput && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0
              }}
              animate={{
                height: 'auto',
                opacity: 1
              }}
              exit={{
                height: 0,
                opacity: 0
              }}
              className="relative flex items-center pt-1"
            >
              <Search
                size={14}
                className="absolute left-3 text-cyan-400"
              />

              <input
                type="text"
                placeholder="Search encrypted message stream..."
                value={
                  messageSearchQuery
                }
                onChange={(event) =>
                  setMessageSearchQuery(
                    event.target.value
                  )
                }
                className="w-full bg-[#141420] border border-cyan-500/30 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-mono"
                autoFocus
              />

              {messageSearchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setMessageSearchQuery(
                      ''
                    )
                  }
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PINNED */}

        {pinnedMessages.length > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-950/60 to-purple-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs">

            <Pin
              size={13}
              className="text-cyan-400 shrink-0"
            />

            <div className="flex-1 truncate text-zinc-300">

              <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase mr-1.5">
                Pinned:
              </span>

              <span className="italic">
                {
                  pinnedMessages[
                    pinnedMessages.length -
                      1
                  ].last_msg
                }
              </span>

            </div>

            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
              {pinnedMessages.length}
            </span>

          </div>
        )}

        {/* FILTERS */}

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">

          {[
            {
              id: 'all',
              label: 'All',
              icon: <Zap size={11} />
            },
            {
              id: 'starred',
              label: 'Starred',
              icon: <Star size={11} />
            },
            {
              id: 'pinned',
              label: 'Pinned',
              icon: <Pin size={11} />
            },
            {
              id: 'media',
              label: 'Media',
              icon: <Image size={11} />
            },
            {
              id: 'audio',
              label: 'Voice Notes',
              icon: <Mic size={11} />
            }
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() =>
                setActiveFilter(
                  tab.id
                )
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all shrink-0 border ${
                activeFilter === tab.id
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>
                {tab.label}
              </span>
            </button>
          ))}

        </div>
      </header>

      {/* ===================================================
          MESSAGE STREAM
      =================================================== */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">

        {filteredConversationMessages.length ===
        0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <Cpu size={28} />
            </div>

            <p className="text-sm font-black text-zinc-300">
              Secure Direct Link
              Established
            </p>

            <p className="text-xs text-zinc-500 max-w-xs font-mono">
              Send encrypted text,
              holographic voice messages,
              attachments, or initiate live
              calls.
            </p>

          </div>
        ) : (
          filteredConversationMessages.map(
            (message) => {
              const isMe =
                message.sender_id ===
                currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex w-full flex-col ${
                    isMe
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >

                  {/* REPLY */}

                  {message.metadata
                    ?.reply_to_id && (
                    <div className="text-[10px] font-mono text-cyan-300/80 flex items-center gap-1 mb-1 px-2.5 bg-cyan-950/30 border border-cyan-500/20 rounded-md py-0.5 max-w-[75%] truncate">

                      <CornerUpLeft
                        size={10}
                        className="text-cyan-400 shrink-0"
                      />

                      <span className="truncate">
                        Replied to: "
                        {
                          message
                            .metadata
                            .reply_body
                        }
                        "
                      </span>

                    </div>
                  )}

                  <div className="group relative flex flex-col max-w-[80%] sm:max-w-[70%]">

                    {/* QUICK ACTIONS */}

                    <div
                      className={`absolute -top-8 hidden group-hover:flex items-center bg-[#0d0d16]/95 border border-cyan-500/30 rounded-xl px-2 py-1 gap-1.5 shadow-[0_0_15px_rgba(0,0,0,0.8)] z-20 backdrop-blur-xl ${
                        isMe
                          ? 'right-0'
                          : 'left-0'
                      }`}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          addReaction(
                            message.id,
                            '❤️'
                          )
                        }
                        className="text-xs hover:scale-125 transition-transform"
                      >
                        ❤️
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addReaction(
                            message.id,
                            '🔥'
                          )
                        }
                        className="text-xs hover:scale-125 transition-transform"
                      >
                        🔥
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addReaction(
                            message.id,
                            '⚡'
                          )
                        }
                        className="text-xs hover:scale-125 transition-transform"
                      >
                        ⚡
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addReaction(
                            message.id,
                            '🚀'
                          )
                        }
                        className="text-xs hover:scale-125 transition-transform"
                      >
                        🚀
                      </button>

                      <div className="w-px h-3 bg-white/10 mx-0.5" />

                      <button
                        type="button"
                        onClick={() =>
                          setReplyingTo(
                            message
                          )
                        }
                        className="p-1 text-zinc-400 hover:text-cyan-300"
                        title="Reply"
                      >
                        <CornerUpLeft size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyMessage(
                            message.last_msg
                          )
                        }
                        className="p-1 text-zinc-400 hover:text-cyan-300"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStarMessage(
                            message
                          )
                        }
                        className={`p-1 hover:text-amber-400 ${
                          message.is_starred
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        <Star size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          togglePinMessage(
                            message
                          )
                        }
                        className={`p-1 hover:text-cyan-400 ${
                          message.is_pinned
                            ? 'text-cyan-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        <Pin size={12} />
                      </button>

                      {isMe &&
                        message.type ===
                          'text' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessage(
                                message
                              );
                              setNewMessage(
                                message.last_msg ||
                                  ''
                              );
                            }}
                            className="p-1 text-zinc-400 hover:text-cyan-300"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}

                      {isMe && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteMessage(
                              message.id
                            )
                          }
                          className="p-1 text-zinc-400 hover:text-rose-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                    </div>

                    {/* BUBBLE */}

                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed transition-all relative overflow-hidden ${
                        isMe
                          ? 'bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-400 text-black font-medium rounded-br-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-cyan-300'
                          : 'bg-[#12121e]/90 text-zinc-100 rounded-bl-sm border border-cyan-500/20 shadow-lg shadow-black/40'
                      }`}
                    >

                      {/* PIN / STAR */}

                      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none opacity-80">

                        {message.is_pinned && (
                          <Pin
                            size={11}
                            className={
                              isMe
                                ? 'text-black/60'
                                : 'text-cyan-400'
                            }
                          />
                        )}

                        {message.is_starred && (
                          <Star
                            size={11}
                            className={
                              isMe
                                ? 'text-black/60'
                                : 'text-amber-400 fill-amber-400'
                            }
                          />
                        )}

                      </div>

                      {/* IMAGE */}

                      {message.type ===
                        'image' &&
                        message.media_url && (
                          <div
                            onClick={() =>
                              setPreviewImage(
                                message.media_url
                              )
                            }
                            className="relative rounded-xl overflow-hidden mb-1.5 border border-white/10 cursor-pointer group/img max-h-64 shadow-md"
                          >

                            <img
                              src={
                                message.media_url
                              }
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              alt="Attachment"
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            />

                            <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">

                              <span className="p-2 rounded-full bg-black/60 text-cyan-300 backdrop-blur-md">
                                <Maximize2 size={16} />
                              </span>

                            </div>

                          </div>
                        )}

                      {/* FILE */}

                      {message.type ===
                        'file' &&
                        message.media_url && (
                          <a
                            href={
                              message.media_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1.5 border text-xs font-mono font-bold ${
                              isMe
                                ? 'bg-black/10 border-black/15 text-black'
                                : 'bg-white/5 border-white/10 text-cyan-300'
                            }`}
                          >

                            <FileText
                              size={18}
                            />

                            <span className="truncate max-w-[180px]">
                              {
                                message.last_msg
                              }
                            </span>

                            <Download
                              size={13}
                              className="ml-auto opacity-70"
                            />

                          </a>
                        )}

                      {/* AUDIO */}

                      {message.type ===
                        'audio' &&
                        message.media_url && (
                          <AudioPlayer
                            url={
                              message.media_url
                            }
                          />
                        )}

                      {/* CALL LOG */}

                      {message.type ===
                        'call_log' && (
                        <div className="flex items-center gap-2.5 py-1 min-w-[200px]">

                          <div
                            className={`p-2.5 rounded-xl ${
                              message
                                .metadata
                                ?.callType ===
                              'video'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            }`}
                          >
                            {message
                              .metadata
                              ?.callType ===
                            'video' ? (
                              <Video
                                size={16}
                              />
                            ) : (
                              <Phone
                                size={16}
                              />
                            )}
                          </div>

                          <div className="flex-1">

                            <p
                              className={`text-xs font-black ${
                                isMe
                                  ? 'text-black'
                                  : 'text-zinc-100'
                              }`}
                            >
                              {
                                message.last_msg
                              }
                            </p>

                            <span
                              className={`text-[9px] font-mono ${
                                isMe
                                  ? 'text-black/70'
                                  : 'text-cyan-400/80'
                              }`}
                            >
                              {message.call_duration
                                ? `${Math.floor(
                                    message.call_duration /
                                      60
                                  )}m ${
                                    message.call_duration %
                                    60
                                  }s`
                                : 'Transmission Log'}
                            </span>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              redialCall(
                                message
                              )
                            }
                            className={`text-[9px] font-mono font-extrabold uppercase px-2.5 py-1.5 rounded-lg ${
                              isMe
                                ? 'bg-black/20 text-black'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            Redial
                          </button>

                        </div>
                      )}

                      {/* TEXT */}

                      {message.type ===
                        'text' && (
                        <p className="whitespace-pre-wrap break-words">
                          {
                            message.last_msg
                          }
                        </p>
                      )}

                      {/* METADATA */}

                      <div className="flex items-center justify-end gap-1.5 mt-1.5 font-mono text-[9px]">

                        {message.is_edited && (
                          <span
                            className={`italic font-bold ${
                              isMe
                                ? 'text-black/50'
                                : 'text-zinc-500'
                            }`}
                          >
                            Edited
                          </span>
                        )}

                        <span
                          className={`font-bold ${
                            isMe
                              ? 'text-black/70'
                              : 'text-zinc-400'
                          }`}
                        >
                          {message.updated_at
                            ? new Date(
                                message.updated_at
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute:
                                    '2-digit'
                                }
                              )
                            : ''}
                        </span>

                        {isMe && (
                          <span className="text-black/70">
                            {message.status ===
                            'read' ? (
                              <CheckCheck
                                size={11}
                                className="text-blue-900 stroke-[2.5px]"
                              />
                            ) : (
                              <Check
                                size={11}
                                className="stroke-[2.5px]"
                              />
                            )}
                          </span>
                        )}

                      </div>
                    </div>

                    {/* REACTIONS */}

                    {message.reactions &&
                      Object.keys(
                        message.reactions
                      ).length >
                        0 && (
                        <div className="flex items-center bg-[#0d0d16] border border-cyan-500/30 rounded-full px-2 py-0.5 text-[10px] gap-1 shadow-md mt-1 w-fit">

                          {Object.values(
                            message.reactions
                          ).map(
                            (
                              emoji,
                              index
                            ) => (
                              <span
                                key={
                                  index
                                }
                                className="hover:scale-125 transition-transform cursor-pointer"
                              >
                                {emoji}
                              </span>
                            )
                          )}

                        </div>
                      )}

                  </div>
                </div>
              );
            }
          )
        )}

        {/* TYPING */}

        {isPeerTyping && (
          <div className="flex items-center gap-2 text-cyan-300 text-xs pl-2 italic font-mono animate-pulse">

            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />

            <span>
              @{peerProfile?.username ||
                'user'} is encoding message...
            </span>

          </div>
        )}

        {/* RECORDING */}

        {isPeerRecording && (
          <div className="flex items-center gap-2 text-rose-400 text-xs pl-2 italic font-mono animate-pulse">

            <Mic
              size={14}
              className="text-rose-500 animate-spin"
            />

            <span>
              @{peerProfile?.username ||
                'user'} is recording quantum
              voice note...
            </span>

          </div>
        )}

        <div
          ref={messagesEndRef}
        />
      </div>

      {/* ===================================================
          STICKER DRAWER
      =================================================== */}

      <AnimatePresence>
        {showStickerDrawer && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0
            }}
            animate={{
              height: 'auto',
              opacity: 1
            }}
            exit={{
              height: 0,
              opacity: 0
            }}
            className="bg-[#0b0b14] border-t border-cyan-500/20 p-3 z-40"
          >

            <div className="flex items-center justify-between mb-2">

              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-cyan-400 flex items-center gap-1">
                <Sticker size={12} />
                Quantum Cyber Stickers
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowStickerDrawer(
                    false
                  )
                }
                className="text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>

            </div>

            <div className="grid grid-cols-6 gap-2">

              {CYBER_STICKERS.map(
                (sticker) => (
                  <button
                    type="button"
                    key={sticker.id}
                    onClick={() =>
                      sendStructuredPayload(
                        `${sticker.emoji} [${sticker.label}]`,
                        'text'
                      )
                    }
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/40 transition-all active:scale-95"
                  >
                    <span className="text-2xl">
                      {sticker.emoji}
                    </span>

                    <span className="text-[8px] font-mono text-zinc-400 mt-1 truncate max-w-full">
                      {sticker.label}
                    </span>
                  </button>
                )
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================
          SMART SUGGESTIONS
      =================================================== */}

      {!isRecordingVoice && (
        <div className="px-3 pt-2 bg-[#090910] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-30">

          <Sparkles
            size={13}
            className="text-cyan-400 shrink-0 ml-1 mr-0.5 animate-pulse"
          />

          {SMART_SUGGESTIONS.map(
            (suggestion, index) => (
              <button
                type="button"
                key={index}
                onClick={() =>
                  handleInputChange(
                    suggestion
                  )
                }
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 text-[11px] font-mono shrink-0 transition-all active:scale-95"
              >
                {suggestion}
              </button>
            )
          )}

        </div>
      )}

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="p-3.5 bg-[#090910] border-t border-cyan-500/20 flex flex-col gap-2 z-50 shadow-[0_-5px_25px_rgba(0,0,0,0.7)]">

        {/* REPLY */}

        {replyingTo && (
          <div className="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs">

            <div className="flex items-center gap-2 text-cyan-300">

              <CornerUpLeft
                size={14}
                className="text-cyan-400"
              />

              <p className="truncate font-mono">
                Replying to:{' '}
                <span className="italic text-white">
                  "
                  {
                    replyingTo.last_msg
                  }
                  "
                </span>
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setReplyingTo(null)
              }
              className="text-zinc-400 hover:text-white"
            >
              <X size={14} />
            </button>

          </div>
        )}

        {/* EDIT */}

        {editingMessage && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">

            <div className="flex items-center gap-2 text-cyan-300">

              <Edit2 size={14} />

              <p>
                Editing Cyber Protocol
                Stream...
              </p>

            </div>

            <button
              type="button"
              onClick={() => {
                setEditingMessage(
                  null
                );
                setNewMessage('');
              }}
              className="text-cyan-300 hover:text-white"
            >
              <X size={14} />
            </button>

          </div>
        )}

        {/* RECORDING */}

        {isRecordingVoice ? (
          <div className="flex items-center justify-between bg-[#121220] border border-rose-500/40 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(244,63,94,0.3)]">

            <div className="flex items-center gap-3">

              <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />

              <span className="text-xs font-mono font-bold text-rose-400">
                RECORDING //{' '}
                {Math.floor(
                  recordingSeconds /
                    60
                )}
                :
                {(
                  recordingSeconds %
                  60
                )
                  .toString()
                  .padStart(
                    2,
                    '0'
                  )}
              </span>

              <div className="flex items-center gap-1 h-4">

                {[1, 2, 3, 4, 5, 6].map(
                  (index) => (
                    <span
                      key={index}
                      className="w-1 bg-rose-500 rounded-full animate-bounce"
                      style={{
                        animationDelay: `${
                          index *
                          0.15
                        }s`,
                        height: `${
                          ((index %
                            3) +
                            1) *
                          5
                        }px`
                      }}
                    />
                  )
                )}

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={
                  handleCancelVoiceRecording
                }
                className="px-3 py-1.5 bg-white/10 hover:bg-rose-600/30 text-zinc-300 hover:text-rose-300 rounded-xl text-xs font-mono font-bold"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={
                  handleToggleVoiceRecording
                }
                className="px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-rose-500/30 flex items-center gap-1.5 active:scale-95"
              >
                <Send size={12} />
                Send Audio
              </button>

            </div>
          </div>
        ) : (
          <form
            onSubmit={
              handleSendMessage
            }
            className="flex items-center gap-2"
          >

            {/* ATTACHMENTS */}

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() =>
                  imageInputRef.current?.click()
                }
                className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-white/5 rounded-xl"
                title="Send Photo"
              >
                <Image size={18} />
              </button>

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-white/5 rounded-xl"
                title="Send File"
              >
                <Paperclip size={18} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowStickerDrawer(
                    (value) => !value
                  )
                }
                className={`p-2 rounded-xl ${
                  showStickerDrawer
                    ? 'text-cyan-400 bg-cyan-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Cyber Stickers"
              >
                <Sticker size={18} />
              </button>

            </div>

            {/* INPUT */}

            <div className="flex-1 relative">

              <input
                type="text"
                value={newMessage}
                onChange={(event) =>
                  handleInputChange(
                    event.target.value
                  )
                }
                placeholder="Type a quantum transmission..."
                className="w-full bg-[#141422] border border-cyan-500/30 rounded-2xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] text-white placeholder-zinc-500 transition-all font-mono"
              />

              <button
                type="button"
                onClick={() =>
                  setShowEmojiPicker(
                    (value) => !value
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-cyan-300"
                title="Insert Emoji"
              >
                <Smile size={18} />
              </button>

            </div>

            {/* SEND / RECORD */}

            {newMessage.trim() ? (
              <button
                type="submit"
                className="p-2.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                title="Transmit Message"
              >
                <Send
                  size={16}
                  className="fill-current"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  handleToggleVoiceRecording
                }
                className="p-2.5 bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 rounded-2xl active:scale-95"
                title="Record Voice Note"
              >
                <Mic size={18} />
              </button>
            )}

          </form>
        )}

        {/* EMOJI */}

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50 bg-[#0d0d18] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)]">

            <Picker
              data={data}
              onEmojiSelect={(emoji) => {
                setNewMessage(
                  (previous) =>
                    previous +
                    emoji.native
                );

                setShowEmojiPicker(
                  false
                );
              }}
              theme="dark"
            />

          </div>
        )}

      </footer>
    </div>
  );
};

export default Messaging;
