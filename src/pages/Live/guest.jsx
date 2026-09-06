import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { io } from 'socket.io-client';
import VideoPlayer from './Shared/VideoPlayer';
import StreamHeader from './Shared/StreamHeader';

import {
  Camera,
  Users,
  Gamepad2,
  X,
  UserPlus,
  Mic,
  MicOff,
  VideoOff,
  Video,
  RefreshCw,
  Radio,
  Lock,
  Unlock,
  Swords,
  UserX,
  Search,
  Copy,
  Check,
  UserCheck,
  Share2,
  Settings2,
  Volume2,
  Shield,
  Crown,
  Circle,
  Plus,
  MoreHorizontal
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = 'https://mpade-backend.onrender.com';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

const playAudioChime = (type = 'request') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'request') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        880,
        ctx.currentTime + 0.15
      );
    } else if (type === 'accept' || type === 'join') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        1174.66,
        ctx.currentTime + 0.2
      );
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        220,
        ctx.currentTime + 0.25
      );
    }

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + 0.3
    );

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Browser may block AudioContext.
  }
};

const GuestLiveSetup = () => {
  const navigate = useNavigate();
  const { streamId } = useParams();

  const videoRef = useRef(null);
  const socketRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category] = useState('Guest Hangout');
  const [privacy] = useState('public');

  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [streamData, setStreamData] = useState(null);

  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [stream, setStream] = useState(null);

  const [roomTopic] = useState('🔥 8-Guest Live Hangout & Q&A');
  const [isBattleMode, setIsBattleMode] = useState(false);

  const [battleScores] = useState({
    red: 120,
    blue: 95
  });

  const [guestSlots, setGuestSlots] = useState(
    Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      label: `Slot ${String(index + 1).padStart(2, '0')}`,
      occupant: null,
      isLocked: false,
      isMuted: false,
      isVideoOff: false,
      isSpeaking: false,
      giftCount: 0
    }))
  );

  const [showRequestDrawer, setShowRequestDrawer] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const [floatingReactions, setFloatingReactions] = useState([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState([]);

  const selectedSlotForManage = guestSlots.find(
    slot => slot.id === selectedSlotId
  );

  const activeCoHosts = guestSlots.filter(
    slot => slot.occupant !== null
  );

  const isCoHostingActive =
    activeCoHosts.length > 0 || isBattleMode;

  /* ---------------------------------------------------------
     STREAM DETAILS
  --------------------------------------------------------- */

  useEffect(() => {
    if (!streamId) return;

    const loadStream = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();

      if (!error && data) {
        setStreamData(data);
        setIsRoomLocked(Boolean(data.is_locked));
      }
    };

    loadStream();
  }, [streamId]);

  /* ---------------------------------------------------------
     USER SEARCH
  --------------------------------------------------------- */

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);

      const query = searchQuery.trim();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .or(
          `username.ilike.%${query}%,full_name.ilike.%${query}%`
        )
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---------------------------------------------------------
     SOCKET
  --------------------------------------------------------- */

  const triggerReactionBurst = useCallback((emoji, slotId) => {
    const id = Date.now() + Math.random();

    setFloatingReactions(prev => [
      ...prev,
      {
        id,
        emoji,
        slotId
      }
    ]);

    setTimeout(() => {
      setFloatingReactions(prev =>
        prev.filter(reaction => reaction.id !== id)
      );
    }, 2200);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(
        '🟢 [GuestLiveSetup] Socket connected:',
        socket.id
      );

      if (streamId) {
        socket.emit('join_room', {
          roomId: streamId
        });
      }
    });

    socket.on('guest_cohost_request', data => {
      if (!data) return;

      console.log(
        '📥 Incoming Guest Co-Host Request:',
        data
      );

      playAudioChime('request');

      setPendingRequests(prev => {
        if (
          prev.some(
            request => request.userId === data.userId
          )
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            id:
              data.requestId ||
              Date.now().toString(),

            userId: data.userId,

            username:
              data.username || 'User',

            avatar:
              data.avatar || FALLBACK_AVATAR,

            mode:
              data.mode || 'video'
          }
        ];
      });
    });

    socket.on('cohost_reaction_burst', data => {
      if (!data) return;

      triggerReactionBurst(
        data.emoji,
        data.slotId
      );
    });

    socket.on('disconnect', reason => {
      console.warn(
        '🟠 [GuestLiveSetup] Socket disconnected:',
        reason
      );
    });

    socket.on('connect_error', error => {
      console.error(
        '❌ [GuestLiveSetup] Socket error:',
        error?.message || error
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [streamId, triggerReactionBurst]);

  /* ---------------------------------------------------------
     APPROVED GUEST
  --------------------------------------------------------- */

  const handleGuestApproved = useCallback(
    approvedGuest => {
      if (!approvedGuest?.user_id) return;

      setGuestSlots(prev => {
        const alreadyOccupied = prev.some(
          slot =>
            slot.occupant?.userId ===
            approvedGuest.user_id
        );

        if (alreadyOccupied) {
          return prev;
        }

        const freeSlotIndex = prev.findIndex(
          slot =>
            !slot.occupant &&
            !slot.isLocked
        );

        if (freeSlotIndex === -1) {
          return prev;
        }

        const updated = [...prev];

        updated[freeSlotIndex] = {
          ...updated[freeSlotIndex],

          occupant: {
            userId: approvedGuest.user_id,

            username:
              approvedGuest.username ||
              'Guest',

            avatar:
              approvedGuest.avatar_url ||
              FALLBACK_AVATAR,

            joinedAt: new Date(),

            mode:
              approvedGuest.mode ||
              'video'
          },

          isMuted: false,

          isVideoOff:
            approvedGuest.mode === 'audio'
        };

        playAudioChime('join');

        return updated;
      });
    },
    []
  );

  /* ---------------------------------------------------------
     SUPABASE GUEST REQUESTS
  --------------------------------------------------------- */

  useEffect(() => {
    if (!streamId) return;

    let mounted = true;

    const loadRequests = async () => {
      const { data, error } = await supabase
        .from('live_guest_requests')
        .select('*')
        .eq('stream_id', streamId);

      if (error || !mounted || !data) {
        return;
      }

      const pending = data.filter(
        request => request.status === 'pending'
      );

      setPendingRequests(
        pending.map(request => ({
          id: request.id,
          userId: request.user_id,
          username:
            request.username || 'User',
          avatar:
            request.avatar_url ||
            FALLBACK_AVATAR,
          mode:
            request.mode || 'video'
        }))
      );

      const approved = data.filter(
        request => request.status === 'approved'
      );

      approved.forEach(handleGuestApproved);
    };

    loadRequests();

    const channel = supabase
      .channel(`cohost_requests_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!payload.new) return;

          const row = payload.new;

          if (row.status === 'pending') {
            playAudioChime('request');

            setPendingRequests(prev => [
              ...prev.filter(
                request =>
                  request.userId !== row.user_id
              ),
              {
                id: row.id,
                userId: row.user_id,
                username:
                  row.username || 'User',
                avatar:
                  row.avatar_url ||
                  FALLBACK_AVATAR,
                mode:
                  row.mode || 'video'
              }
            ]);
          }

          if (row.status === 'approved') {
            handleGuestApproved(row);

            setPendingRequests(prev =>
              prev.filter(
                request =>
                  request.userId !== row.user_id
              )
            );
          }

          if (
            row.status === 'rejected' ||
            row.status === 'kicked'
          ) {
            setPendingRequests(prev =>
              prev.filter(
                request =>
                  request.userId !== row.user_id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [streamId, handleGuestApproved]);

  /* ---------------------------------------------------------
     SPEAKER SIMULATION
  --------------------------------------------------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      setGuestSlots(prev =>
        prev.map(slot => {
          if (!slot.occupant) {
            return slot;
          }

          return {
            ...slot,
            isSpeaking:
              Math.random() > 0.6
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  /* ---------------------------------------------------------
     CAMERA PREVIEW
  --------------------------------------------------------- */

  useEffect(() => {
    if (isCamOn) {
      startPreview();
    } else {
      stopPreview();
    }

    return () => stopPreview();
  }, [isCamOn]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      videoRef.current
        .play()
        .catch(() => {});
    }
  }, [stream]);

  const startPreview = async () => {
    try {
      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: isMicOn
        });

      setStream(mediaStream);
    } catch (error) {
      console.warn(
        'Camera preview unavailable:',
        error
      );

      setIsCamOn(false);
    }
  };

  const stopPreview = () => {
    setStream(currentStream => {
      if (currentStream) {
        currentStream
          .getTracks()
          .forEach(track => track.stop());
      }

      return null;
    });
  };

  /* ---------------------------------------------------------
     SLOT CONTROLS
  --------------------------------------------------------- */

  const toggleSlotLock = id => {
    setGuestSlots(prev =>
      prev.map(slot =>
        slot.id === id
          ? {
              ...slot,
              isLocked: !slot.isLocked
            }
          : slot
      )
    );
  };

  const toggleMuteGuestSlot = slotId => {
    setGuestSlots(prev =>
      prev.map(slot => {
        if (slot.id !== slotId) {
          return slot;
        }

        const nextMuted = !slot.isMuted;

        if (
          socketRef.current &&
          slot.occupant
        ) {
          socketRef.current.emit(
            'mute_cohost_audio',
            {
              streamId,
              guestId:
                slot.occupant.userId,
              isMuted: nextMuted
            }
          );
        }

        return {
          ...slot,
          isMuted: nextMuted
        };
      })
    );
  };

  const toggleVideoGuestSlot = slotId => {
    setGuestSlots(prev =>
      prev.map(slot =>
        slot.id === slotId
          ? {
              ...slot,
              isVideoOff:
                !slot.isVideoOff
            }
          : slot
      )
    );
  };

  const kickGuestSlot = slotId => {
    setGuestSlots(prev =>
      prev.map(slot => {
        if (slot.id !== slotId) {
          return slot;
        }

        if (
          slot.occupant &&
          socketRef.current
        ) {
          socketRef.current.emit(
            'kick_cohost',
            {
              streamId,
              guestId:
                slot.occupant.userId
            }
          );
        }

        return {
          ...slot,
          occupant: null,
          isMuted: false,
          isVideoOff: false,
          isSpeaking: false,
          giftCount: 0
        };
      })
    );

    setSelectedSlotId(null);
  };

  /* ---------------------------------------------------------
     ACCEPT / REJECT
  --------------------------------------------------------- */

  const handleAcceptRequest = async (
    request,
    mode = 'video'
  ) => {
    const emptySlot = guestSlots.find(
      slot =>
        !slot.occupant &&
        !slot.isLocked
    );

    if (!emptySlot) {
      alert(
        'All guest slots are filled or locked.'
      );
      return;
    }

    playAudioChime('accept');

    setGuestSlots(prev =>
      prev.map(slot =>
        slot.id === emptySlot.id
          ? {
              ...slot,

              occupant: {
                userId: request.userId,
                username: request.username,
                avatar:
                  request.avatar ||
                  FALLBACK_AVATAR,
                joinedAt: new Date(),
                mode
              },

              isVideoOff:
                mode === 'audio',

              isMuted: false
            }
          : slot
      )
    );

    setPendingRequests(prev =>
      prev.filter(
        item =>
          item.userId !== request.userId
      )
    );

    if (streamId) {
      await supabase
        .from('live_guest_requests')
        .update({
          status: 'approved',
          mode
        })
        .eq('stream_id', streamId)
        .eq('user_id', request.userId);
    }

    socketRef.current?.emit(
      'approve_cohost',
      {
        streamId,
        guestId: request.userId,
        mode
      }
    );
  };

  const handleRejectRequest = async request => {
    playAudioChime('reject');

    setPendingRequests(prev =>
      prev.filter(
        item =>
          item.userId !== request.userId
      )
    );

    if (streamId) {
      await supabase
        .from('live_guest_requests')
        .update({
          status: 'rejected'
        })
        .eq('stream_id', streamId)
        .eq('user_id', request.userId);
    }
  };

  /* ---------------------------------------------------------
     DIRECT INVITATION
  --------------------------------------------------------- */

  const handleSendDirectInvite = async (
    invitedUser,
    mode = 'video'
  ) => {
    if (!streamId) {
      alert(
        'Please start the guest room first.'
      );
      return;
    }

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const hostUser = authData?.user;

      const { error } = await supabase
        .from('live_guest_requests')
        .upsert(
          {
            stream_id: streamId,
            user_id: invitedUser.id,
            username:
              invitedUser.username ||
              invitedUser.full_name ||
              'Guest',
            avatar_url:
              invitedUser.avatar_url ||
              FALLBACK_AVATAR,
            status: 'invited',
            mode
          },
          {
            onConflict:
              'stream_id,user_id'
          }
        );

      if (error) {
        console.error(
          'Invite insert error:',
          error
        );
        return;
      }

      if (hostUser?.id) {
        await supabase
          .from('activities')
          .insert({
            user_id: invitedUser.id,
            actor_id: hostUser.id,
            type: 'live_invite',
            description:
              JSON.stringify({
                stream_id: streamId,
                mode,
                host_name:
                  hostUser.user_metadata
                    ?.username ||
                  'Host'
              })
          });
      }

      socketRef.current?.emit(
        'send_direct_invite',
        {
          streamId,
          invitedUserId:
            invitedUser.id,
          hostName:
            hostUser?.user_metadata
              ?.username || 'Host',
          mode
        }
      );

      setInvitedUserIds(prev =>
        prev.includes(invitedUser.id)
          ? prev
          : [...prev, invitedUser.id]
      );
    } catch (error) {
      console.error(
        'Direct invite error:',
        error
      );
    }
  };

  const handleCopyInviteLink = async () => {
    const link = `${window.location.origin}/live/watch/${
      streamId || 'room'
    }/join-guest`;

    try {
      await navigator.clipboard.writeText(link);

      setCopiedLink(true);

      setTimeout(() => {
        setCopiedLink(false);
      }, 2200);
    } catch (error) {
      console.error(
        'Clipboard error:',
        error
      );
    }
  };

  /* ---------------------------------------------------------
     CREATE ROOM
  --------------------------------------------------------- */

  const handleStartGuestStream = async () => {
    if (streamId) {
      return;
    }

    setLoading(true);

    try {
      const { data: authData } =
        await supabase.auth.getUser();

      const user = authData?.user;

      if (!user) {
        alert(
          'Authentication session missing. Please log in.'
        );
        return;
      }

      const newStream = {
        title:
          title ||
          `${
            user.user_metadata?.username ||
            'User'
          }'s Multi-Guest Room`,

        host_id: user.id,

        category,

        privacy,

        status: 'live',

        stream_type: 'multi_guest',

        max_guests: 7,

        is_locked: isRoomLocked
      };

      const { data, error } =
        await supabase
          .from('live_streams')
          .insert([newStream])
          .select()
          .single();

      if (error) {
        console.error(
          'Database Insert Error:',
          error
        );

        alert(
          `Error starting stream: ${error.message}`
        );

        return;
      }

      if (data) {
        socketRef.current?.emit(
          'create_room',
          {
            roomId: data.id,
            hostId: user.id
          }
        );

        navigate(
          `/live/guest/${data.id}`,
          {
            replace: true
          }
        );
      }
    } catch (error) {
      console.error(
        'Unexpected room error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */

  const tabs = [
    {
      name: 'POST',
      path: '/create/post'
    },
    {
      name: 'CREATE',
      path: '/create/story'
    },
    {
      name: 'DEVICE CAMERA',
      path: '/live/device-camera',
      icon: <Camera size={15} />
    },
    {
      name: 'GO WITH GUEST',
      action: 'direct_guest_stream',
      icon: <Users size={15} />
    },
    {
      name: 'MOBILE GAMING',
      path: '/live/gaming',
      icon: <Gamepad2 size={15} />
    }
  ];

  const handleTabClick = tab => {
    if (
      tab.action ===
      'direct_guest_stream'
    ) {
      handleStartGuestStream();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <div className="min-h-[100dvh] bg-[#050507] text-white font-sans overflow-hidden relative">

      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[420px] h-[420px] rounded-full bg-fuchsia-600/10 blur-[140px]" />
        <div className="absolute -bottom-40 right-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.035),transparent_45%)]" />
      </div>

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="relative z-50 border-b border-white/[0.07] bg-[#08080c]/90 backdrop-blur-2xl">

        <div className="max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-7 py-3">

          <div className="flex items-center justify-between gap-4">

            <div className="min-w-0 flex-1">
              <StreamHeader
                data={
                  streamData || {
                    title:
                      title ||
                      roomTopic ||
                      'Guest Multi-Live Room',

                    category:
                      category ||
                      'Guest Hangout',

                    created_at:
                      new Date().toISOString()
                  }
                }
                isHost
                viewerCount={
                  activeCoHosts.length + 1
                }
                onLeave={() =>
                  navigate(-1)
                }
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">

              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06]">
                <Circle
                  size={8}
                  className="fill-emerald-400 text-emerald-400"
                />

                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Live
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRequestDrawer(true)
                }
                className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all"
              >
                <UserPlus
                  size={17}
                  className="text-cyan-400"
                />

                <span className="hidden sm:block text-[10px] font-black uppercase tracking-wide">
                  Requests
                </span>

                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#08080c]">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsRoomLocked(
                    current => !current
                  )
                }
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                  isRoomLocked
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
                }`}
              >
                {isRoomLocked ? (
                  <Lock size={17} />
                ) : (
                  <Unlock size={17} />
                )}

                <span className="hidden sm:block text-[10px] font-black uppercase">
                  {isRoomLocked
                    ? 'Locked'
                    : 'Open'}
                </span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Hidden WebRTC host bridge */}
      {streamId && (
        <div className="hidden">
          <VideoPlayer
            streamId={streamId}
            isHost
            customStream={stream}
          />
        </div>
      )}

      {/* =====================================================
          MAIN WORKSPACE
      ===================================================== */}

      <main className="relative z-20 h-[calc(100dvh-150px)] overflow-y-auto">

        <div className="max-w-[1500px] mx-auto p-3 sm:p-5 lg:p-7">

          {/* ROOM STATUS */}
          <section className="mb-4">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/[0.07] bg-[#0a0a0e]/90">

              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Radio
                    size={17}
                    className="text-cyan-400"
                  />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Production Room
                  </p>

                  <p className="text-xs sm:text-sm font-bold text-white">
                    {roomTopic}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                <StatusPill
                  icon={<Users size={12} />}
                  label={`${activeCoHosts.length}/7 Guests`}
                />

                <StatusPill
                  icon={<Shield size={12} />}
                  label={
                    isRoomLocked
                      ? 'Private Room'
                      : 'Public Room'
                  }
                />

                {isBattleMode && (
                  <StatusPill
                    icon={
                      <Swords size={12} />
                    }
                    label="Battle Active"
                    danger
                  />
                )}
              </div>

            </div>
          </section>

          {/* MAIN TWO COLUMN LAYOUT */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">

            {/* =================================================
                LEFT: STAGE
            ================================================= */}

            <section className="space-y-4">

              {/* HOST STAGE */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden">

                <PanelHeader
                  title="Live Stage"
                  subtitle="Primary broadcast"
                  icon={
                    <Crown
                      size={16}
                      className="text-fuchsia-400"
                    />
                  }
                />

                <div className="p-2 sm:p-3">

                  <div className="relative aspect-video min-h-[260px] sm:min-h-[380px] lg:min-h-[480px] rounded-xl overflow-hidden bg-black border border-white/[0.08]">

                    {isCamOn ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d12]">

                        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3">
                          <VideoOff
                            size={28}
                            className="text-zinc-600"
                          />
                        </div>

                        <p className="text-xs font-bold text-zinc-400">
                          Camera is off
                        </p>

                        <p className="text-[10px] text-zinc-600 mt-1">
                          Your audience cannot see you
                        </p>
                      </div>
                    )}

                    {/* LIVE BADGE */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">

                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />

                      <span className="text-[9px] font-black uppercase tracking-wider">
                        Live
                      </span>
                    </div>

                    {/* COHOST COUNT */}
                    {activeCoHosts.length > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-cyan-400/20 flex items-center gap-1.5">

                        <Users
                          size={12}
                          className="text-cyan-400"
                        />

                        <span className="text-[9px] font-black text-cyan-300 uppercase">
                          {activeCoHosts.length}{' '}
                          Co-Host
                          {activeCoHosts.length !==
                          1
                            ? 's'
                            : ''}
                        </span>
                      </div>
                    )}

                    {/* COHOST PIP */}
                    {activeCoHosts.length >
                      0 && (
                      <CoHostPip
                        slot={
                          activeCoHosts[0]
                        }
                        onClick={() =>
                          setSelectedSlotId(
                            activeCoHosts[0].id
                          )
                        }
                      />
                    )}

                    {/* HOST CONTROL BAR */}
                    <div className="absolute bottom-3 left-3 right-3">

                      <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-black/75 backdrop-blur-2xl border border-white/10">

                        <div className="flex items-center gap-2 min-w-0">

                          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                            <Crown
                              size={15}
                              className="text-fuchsia-400"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[8px] text-zinc-500 uppercase font-black tracking-wider">
                              Host
                            </p>

                            <p className="text-[11px] sm:text-xs font-bold text-white truncate">
                              @You
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">

                          <StageControl
                            active={isMicOn}
                            onClick={() =>
                              setIsMicOn(
                                current =>
                                  !current
                              )
                            }
                            activeIcon={
                              <Mic size={15} />
                            }
                            inactiveIcon={
                              <MicOff
                                size={15}
                              />
                            }
                            danger={!isMicOn}
                          />

                          <StageControl
                            active={isCamOn}
                            onClick={() =>
                              setIsCamOn(
                                current =>
                                  !current
                              )
                            }
                            activeIcon={
                              <Video size={15} />
                            }
                            inactiveIcon={
                              <VideoOff
                                size={15}
                              />
                            }
                            danger={!isCamOn}
                          />

                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GUEST SEATS */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden">

                <PanelHeader
                  title="Co-Host Stage"
                  subtitle="7 available guest positions"
                  icon={
                    <Users
                      size={16}
                      className="text-cyan-400"
                    />
                  }
                  right={
                    <button
                      type="button"
                      onClick={() =>
                        setShowInviteModal(
                          true
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/15 text-[9px] font-black uppercase transition-all"
                    >
                      <Plus size={13} />
                      Add Guest
                    </button>
                  }
                />

                <div className="p-3 sm:p-4">

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">

                    {guestSlots.map(
                      slot => (
                        <GuestSeat
                          key={slot.id}
                          slot={slot}
                          floatingReactions={
                            floatingReactions
                          }
                          onSelect={() =>
                            slot.occupant
                              ? setSelectedSlotId(
                                  slot.id
                                )
                              : setShowInviteModal(
                                  true
                                )
                          }
                          onToggleLock={() =>
                            toggleSlotLock(
                              slot.id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* BATTLE PANEL */}
              <AnimatePresence>
                {isBattleMode && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto'
                    }}
                    exit={{
                      opacity: 0,
                      height: 0
                    }}
                  >
                    <div className="rounded-2xl border border-amber-500/20 bg-[#0a0a0d] overflow-hidden">

                      <PanelHeader
                        title="Battle Mode"
                        subtitle="1v1 co-host competition"
                        icon={
                          <Swords
                            size={16}
                            className="text-amber-400"
                          />
                        }
                      />

                      <div className="p-4 flex items-center justify-between gap-4">

                        <TeamScore
                          label="Red Team"
                          score={
                            battleScores.red
                          }
                          side="left"
                        />

                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          VS
                        </div>

                        <TeamScore
                          label="Blue Team"
                          score={
                            battleScores.blue
                          }
                          side="right"
                        />

                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* =================================================
                RIGHT: CONTROL CENTER
            ================================================= */}

            <aside className="space-y-4">

              {/* ROOM CONTROLS */}
              <ControlPanel title="Room Controls">

                <div className="grid grid-cols-2 gap-2">

                  <ControlTile
                    icon={
                      <UserPlus
                        size={18}
                      />
                    }
                    label="Requests"
                    value={
                      pendingRequests.length
                    }
                    accent="cyan"
                    onClick={() =>
                      setShowRequestDrawer(
                        true
                      )
                    }
                  />

                  <ControlTile
                    icon={
                      <UserPlus
                        size={18}
                      />
                    }
                    label="Invite"
                    accent="pink"
                    onClick={() =>
                      setShowInviteModal(
                        true
                      )
                    }
                  />

                  <ControlTile
                    icon={
                      isRoomLocked ? (
                        <Lock
                          size={18}
                        />
                      ) : (
                        <Unlock
                          size={18}
                        />
                      )
                    }
                    label={
                      isRoomLocked
                        ? 'Locked'
                        : 'Room Open'
                    }
                    accent={
                      isRoomLocked
                        ? 'rose'
                        : 'emerald'
                    }
                    onClick={() =>
                      setIsRoomLocked(
                        current =>
                          !current
                      )
                    }
                  />

                  <ControlTile
                    icon={
                      <Swords
                        size={18}
                      />
                    }
                    label="Battle"
                    accent="amber"
                    active={
                      isBattleMode
                    }
                    onClick={() =>
                      setIsBattleMode(
                        current =>
                          !current
                      )
                    }
                  />

                </div>
              </ControlPanel>

              {/* ACTIVE GUESTS */}
              <ControlPanel
                title="Active Co-Hosts"
                badge={`${activeCoHosts.length}/7`}
              >

                {activeCoHosts.length ===
                0 ? (
                  <div className="py-8 text-center">

                    <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
                      <Users
                        size={20}
                        className="text-zinc-600"
                      />
                    </div>

                    <p className="text-[11px] font-bold text-zinc-400">
                      No active guests
                    </p>

                    <p className="text-[9px] text-zinc-600 mt-1">
                      Approve a request or
                      invite someone
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">

                    {activeCoHosts.map(
                      slot => (
                        <ActiveGuestRow
                          key={slot.id}
                          slot={slot}
                          onClick={() =>
                            setSelectedSlotId(
                              slot.id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </ControlPanel>

              {/* QUICK INFO */}
              <ControlPanel title="Session">

                <div className="space-y-2">

                  <InfoRow
                    label="Stream type"
                    value="Multi-Guest"
                  />

                  <InfoRow
                    label="Maximum guests"
                    value="7"
                  />

                  <InfoRow
                    label="Privacy"
                    value={
                      isRoomLocked
                        ? 'Restricted'
                        : 'Public'
                    }
                  />

                  <InfoRow
                    label="Guest requests"
                    value={
                      pendingRequests.length
                    }
                  />

                </div>
              </ControlPanel>

            </aside>
          </div>
        </div>
      </main>

      {/* =====================================================
          TITLE / START BAR
      ===================================================== */}

      {!streamId && (
        <div className="fixed bottom-[72px] sm:bottom-[78px] left-0 right-0 z-40 px-3 sm:px-5">

          <div className="max-w-xl mx-auto p-2 rounded-2xl border border-white/10 bg-[#09090d]/95 backdrop-blur-2xl shadow-2xl">

            <div className="flex gap-2">

              <input
                type="text"
                value={title}
                onChange={event =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Room title..."
                className="min-w-0 flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/40"
              />

              <button
                type="button"
                onClick={
                  handleStartGuestStream
                }
                disabled={loading}
                className="px-4 sm:px-6 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                {loading ? (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Radio size={15} />
                )}

                <span className="hidden sm:block">
                  Start Room
                </span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          INVITE MODAL
      ===================================================== */}

      <AnimatePresence>
        {showInviteModal && (
          <ModalShell
            onClose={() =>
              setShowInviteModal(
                false
              )
            }
          >
            <ModalHeader
              icon={
                <UserPlus
                  size={18}
                />
              }
              title="Invite Co-Hosts"
              subtitle="Invite registered users to your live room"
              onClose={() =>
                setShowInviteModal(
                  false
                )
              }
            />

            <div className="space-y-4">

              {/* LINK */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Share2
                      size={16}
                      className="text-cyan-400"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] uppercase tracking-wider font-black text-zinc-500">
                      Guest Join Link
                    </p>

                    <p className="text-[10px] font-mono text-zinc-300 truncate mt-1">
                      {window.location.origin}
                      /live/watch/
                      {streamId ||
                        'room'}
                      /join-guest
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCopyInviteLink
                    }
                    className={`shrink-0 p-2.5 rounded-lg transition-all ${
                      copiedLink
                        ? 'bg-emerald-500 text-black'
                        : 'bg-cyan-500 text-black hover:bg-cyan-400'
                    }`}
                  >
                    {copiedLink ? (
                      <Check
                        size={15}
                      />
                    ) : (
                      <Copy
                        size={15}
                      />
                    )}
                  </button>

                </div>
              </div>

              {/* SEARCH */}
              <div>

                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2 block">
                  Find a member
                </label>

                <div className="relative">

                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    value={searchQuery}
                    onChange={event =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Search username or name..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/40"
                  />
                </div>
              </div>

              {/* RESULTS */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">

                {isSearching ? (
                  <EmptyState
                    icon={
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />
                    }
                    text="Searching members..."
                  />
                ) : searchResults.length >
                  0 ? (
                  searchResults.map(
                    user => {
                      const sent =
                        invitedUserIds.includes(
                          user.id
                        );

                      return (
                        <div
                          key={
                            user.id
                          }
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.025] border border-white/[0.07]"
                        >
                          <img
                            src={
                              user.avatar_url ||
                              FALLBACK_AVATAR
                            }
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">
                              @
                              {user.username ||
                                user.full_name ||
                                'User'}
                            </p>

                            <p className="text-[9px] text-zinc-600 truncate mt-0.5">
                              {user.full_name ||
                                'App Member'}
                            </p>
                          </div>

                          {sent ? (
                            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">
                              <Check
                                size={11}
                              />
                              Sent
                            </span>
                          ) : (
                            <div className="flex gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  handleSendDirectInvite(
                                    user,
                                    'audio'
                                  )
                                }
                                className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                                title="Audio invite"
                              >
                                <Mic
                                  size={13}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleSendDirectInvite(
                                    user,
                                    'video'
                                  )
                                }
                                className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/20"
                                title="Video invite"
                              >
                                <Video
                                  size={13}
                                />
                              </button>

                            </div>
                          )}
                        </div>
                      );
                    }
                  )
                ) : searchQuery.trim() ? (
                  <EmptyState
                    icon={
                      <Search
                        size={18}
                      />
                    }
                    text="No members found"
                  />
                ) : (
                  <EmptyState
                    icon={
                      <UserPlus
                        size={18}
                      />
                    }
                    text="Search for someone to invite"
                  />
                )}
              </div>

            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* =====================================================
          REQUEST MODAL
      ===================================================== */}

      <AnimatePresence>
        {showRequestDrawer && (
          <ModalShell
            onClose={() =>
              setShowRequestDrawer(
                false
              )
            }
          >
            <ModalHeader
              icon={
                <Users size={18} />
              }
              title="Guest Requests"
              subtitle={`${pendingRequests.length} pending request${
                pendingRequests.length ===
                1
                  ? ''
                  : 's'
              }`}
              onClose={() =>
                setShowRequestDrawer(
                  false
                )
              }
            />

            {pendingRequests.length ===
            0 ? (
              <EmptyState
                icon={
                  <UserPlus
                    size={22}
                  />
                }
                text="No pending guest requests"
              />
            ) : (
              <div className="space-y-2">

                {pendingRequests.map(
                  request => (
                    <div
                      key={
                        request.id
                      }
                      className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.07]"
                    >

                      <div className="flex items-center gap-3">

                        <img
                          src={
                            request.avatar
                          }
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-cyan-500/20"
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            @
                            {
                              request.username
                            }
                          </p>

                          <p className="text-[9px] text-cyan-400 uppercase font-black tracking-wider mt-1">
                            Wants{' '}
                            {
                              request.mode
                            }{' '}
                            access
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRejectRequest(
                              request
                            )
                          }
                          className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400"
                        >
                          <UserX
                            size={14}
                          />
                        </button>

                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">

                        <button
                          type="button"
                          onClick={() =>
                            handleAcceptRequest(
                              request,
                              'audio'
                            )
                          }
                          className="py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase flex items-center justify-center gap-1.5"
                        >
                          <Mic
                            size={13}
                          />
                          Audio
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAcceptRequest(
                              request,
                              'video'
                            )
                          }
                          className="py-2.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-[9px] font-black uppercase flex items-center justify-center gap-1.5"
                        >
                          <Video
                            size={13}
                          />
                          Video
                        </button>

                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </ModalShell>
        )}
      </AnimatePresence>

      {/* =====================================================
          GUEST MANAGEMENT MODAL
      ===================================================== */}

      <AnimatePresence>
        {selectedSlotForManage && (
          <ModalShell
            onClose={() =>
              setSelectedSlotId(
                null
              )
            }
          >
            <ModalHeader
              icon={
                <Settings2
                  size={18}
                />
              }
              title="Guest Controls"
              subtitle={`Managing ${selectedSlotForManage.label}`}
              onClose={() =>
                setSelectedSlotId(
                  null
                )
              }
            />

            <div className="text-center">

              <img
                src={
                  selectedSlotForManage
                    .occupant.avatar
                }
                alt=""
                className="w-16 h-16 rounded-2xl object-cover mx-auto border border-cyan-400/30"
              />

              <p className="text-sm font-black text-white mt-3">
                @
                {
                  selectedSlotForManage
                    .occupant
                    .username
                }
              </p>

              <p className="text-[9px] text-cyan-400 uppercase tracking-widest font-black mt-1">
                Co-Host
              </p>

            </div>

            {/* REACTIONS */}
            <div className="grid grid-cols-5 gap-2 mt-5">

              {[
                '❤️',
                '🔥',
                '👏',
                '🎉',
                '🌌'
              ].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    triggerReactionBurst(
                      emoji,
                      selectedSlotForManage.id
                    )
                  }
                  className="py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-lg hover:bg-white/[0.08] active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}

            </div>

            {/* ACTIONS */}
            <div className="space-y-2 mt-5 pt-4 border-t border-white/[0.07]">

              <ManagementButton
                icon={
                  selectedSlotForManage.isMuted ? (
                    <Mic size={15} />
                  ) : (
                    <MicOff size={15} />
                  )
                }
                label={
                  selectedSlotForManage.isMuted
                    ? 'Unmute Guest'
                    : 'Mute Guest'
                }
                onClick={() =>
                  toggleMuteGuestSlot(
                    selectedSlotForManage.id
                  )
                }
              />

              <ManagementButton
                icon={
                  selectedSlotForManage.isVideoOff ? (
                    <Video size={15} />
                  ) : (
                    <VideoOff size={15} />
                  )
                }
                label={
                  selectedSlotForManage.isVideoOff
                    ? 'Enable Camera'
                    : 'Disable Camera'
                }
                onClick={() =>
                  toggleVideoGuestSlot(
                    selectedSlotForManage.id
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  kickGuestSlot(
                    selectedSlotForManage.id
                  )
                }
                className="w-full py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-500/15 transition-all"
              >
                <UserX size={15} />
                Remove Co-Host
              </button>

            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* =====================================================
          BOTTOM NAV
      ===================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.07] bg-[#07070a]/95 backdrop-blur-2xl">

        <div className="max-w-[1100px] mx-auto px-2 sm:px-4">

          <div className="flex items-center justify-center gap-1 sm:gap-3 overflow-x-auto no-scrollbar py-2">

            {tabs.map(tab => {
              const active =
                tab.name ===
                'GO WITH GUEST';

              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() =>
                    handleTabClick(
                      tab
                    )
                  }
                  disabled={loading}
                  className={`relative flex flex-col items-center justify-center gap-1 min-w-[78px] sm:min-w-[110px] py-2 rounded-xl transition-all ${
                    active
                      ? 'bg-fuchsia-500/10'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >

                  {tab.icon && (
                    <span
                      className={
                        active
                          ? 'text-fuchsia-400'
                          : 'text-zinc-500'
                      }
                    >
                      {tab.icon}
                    </span>
                  )}

                  <span
                    className={`text-[8px] sm:text-[9px] font-black tracking-wider whitespace-nowrap ${
                      active
                        ? 'text-fuchsia-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    {tab.name}
                  </span>

                  {active && (
                    <motion.div
                      layoutId="guest-nav"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-fuchsia-400"
                    />
                  )}

                </button>
              );
            })}

          </div>
        </div>
      </nav>

    </div>
  );
};

/* ============================================================
   COMPONENTS
============================================================ */

const PanelHeader = ({
  title,
  subtitle,
  icon,
  right
}) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.07]">

    <div className="flex items-center gap-2.5 min-w-0">

      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wider text-white">
          {title}
        </p>

        {subtitle && (
          <p className="text-[8px] text-zinc-600 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

    </div>

    {right}
  </div>
);

const ControlPanel = ({
  title,
  badge,
  children
}) => (
  <section className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden">

    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">

      <p className="text-[10px] font-black uppercase tracking-wider text-white">
        {title}
      </p>

      {badge && (
        <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-[8px] font-black text-zinc-500">
          {badge}
        </span>
      )}

    </div>

    <div className="p-3">
      {children}
    </div>

  </section>
);

const ControlTile = ({
  icon,
  label,
  value,
  accent = 'cyan',
  active = false,
  onClick
}) => {
  const accents = {
    cyan:
      'text-cyan-400 border-cyan-500/20 bg-cyan-500/[0.05]',
    pink:
      'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/[0.05]',
    rose:
      'text-rose-400 border-rose-500/20 bg-rose-500/[0.05]',
    emerald:
      'text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.05]',
    amber:
      'text-amber-400 border-amber-500/20 bg-amber-500/[0.05]'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-3 rounded-xl border transition-all hover:bg-white/[0.04] ${
        active
          ? accents[accent]
          : 'border-white/[0.07] bg-white/[0.015]'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          accents[accent]
        }`}
      >
        {icon}
      </div>

      <p className="text-[9px] uppercase tracking-wider font-black text-zinc-500">
        {label}
      </p>

      {value !== undefined && (
        <p className="text-sm font-black text-white mt-0.5">
          {value}
        </p>
      )}
    </button>
  );
};

const StatusPill = ({
  icon,
  label,
  danger = false
}) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
      danger
        ? 'bg-amber-500/[0.06] border-amber-500/20 text-amber-400'
        : 'bg-white/[0.025] border-white/[0.07] text-zinc-400'
    }`}
  >
    {icon}
    <span className="text-[8px] font-black uppercase tracking-wider">
      {label}
    </span>
  </div>
);

const StageControl = ({
  active,
  onClick,
  activeIcon,
  inactiveIcon,
  danger
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
      danger
        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
        : 'bg-white/[0.07] text-white border border-white/10 hover:bg-white/[0.12]'
    }`}
  >
    {active
      ? activeIcon
      : inactiveIcon}
  </button>
);

const GuestSeat = ({
  slot,
  floatingReactions,
  onSelect,
  onToggleLock
}) => {
  const occupied = Boolean(
    slot.occupant
  );

  const audioOnly =
    slot.occupant?.mode ===
      'audio' ||
    slot.isVideoOff;

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all ${
        slot.isSpeaking
          ? 'border-cyan-400/60 ring-1 ring-cyan-400/30'
          : occupied
          ? 'border-white/[0.1]'
          : slot.isLocked
          ? 'border-white/[0.05]'
          : 'border-white/[0.07]'
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-white/[0.05]">

        <span className="text-[7px] font-black uppercase tracking-wider text-zinc-600">
          {slot.label}
        </span>

        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onToggleLock();
          }}
          className="text-zinc-600 hover:text-zinc-300"
        >
          {slot.isLocked ? (
            <Lock size={10} />
          ) : (
            <Unlock size={10} />
          )}
        </button>
      </div>

      {/* BODY */}
      <button
        type="button"
        onClick={onSelect}
        className={`w-full min-h-[120px] p-3 flex flex-col items-center justify-center transition-all ${
          occupied
            ? 'bg-white/[0.025] hover:bg-white/[0.045]'
            : slot.isLocked
            ? 'bg-black/20'
            : 'bg-white/[0.01] hover:bg-white/[0.035]'
        }`}
      >
        {occupied ? (
          <>
            <div className="relative">

              <img
                src={
                  slot.occupant
                    .avatar
                }
                alt=""
                className={`w-11 h-11 rounded-xl object-cover border ${
                  slot.isSpeaking
                    ? 'border-cyan-400'
                    : 'border-white/10'
                }`}
              />

              {slot.isSpeaking && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#09090d]" />
              )}
            </div>

            <p className="text-[9px] font-bold text-white truncate max-w-[80px] mt-2">
              @{slot.occupant.username}
            </p>

            <div className="flex items-center gap-1 mt-1">

              {slot.isMuted ? (
                <MicOff
                  size={9}
                  className="text-rose-400"
                />
              ) : (
                <Volume2
                  size={9}
                  className="text-emerald-400"
                />
              )}

              <span className="text-[7px] font-black uppercase text-zinc-600">
                {audioOnly
                  ? 'Audio'
                  : 'Video'}
              </span>

            </div>
          </>
        ) : (
          <>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                slot.isLocked
                  ? 'bg-white/[0.015] border-white/[0.05]'
                  : 'bg-cyan-500/[0.04] border-cyan-500/15'
              }`}
            >
              {slot.isLocked ? (
                <Lock
                  size={17}
                  className="text-zinc-700"
                />
              ) : (
                <Plus
                  size={19}
                  className="text-cyan-500"
                />
              )}
            </div>

            <p className="text-[8px] font-black uppercase tracking-wider mt-2 text-zinc-600">
              {slot.isLocked
                ? 'Locked'
                : 'Add Guest'}
            </p>
          </>
        )}
      </button>

      {/* REACTIONS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingReactions
          .filter(
            reaction =>
              reaction.slotId ===
              slot.id
          )
          .map(reaction => (
            <motion.div
              key={reaction.id}
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.5
              }}
              animate={{
                opacity: [0, 1, 0],
                y: -50,
                scale: 1.4
              }}
              transition={{
                duration: 1.5
              }}
              className="absolute left-1/2 bottom-5 -translate-x-1/2 text-xl"
            >
              {reaction.emoji}
            </motion.div>
          ))}
      </div>
    </div>
  );
};

const ActiveGuestRow = ({
  slot,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.05] text-left transition-all"
  >
    <img
      src={
        slot.occupant.avatar
      }
      alt=""
      className="w-9 h-9 rounded-lg object-cover border border-white/10"
    />

    <div className="flex-1 min-w-0">

      <p className="text-[10px] font-bold text-white truncate">
        @
        {slot.occupant.username}
      </p>

      <div className="flex items-center gap-1.5 mt-1">

        <span
          className={`w-1.5 h-1.5 rounded-full ${
            slot.isSpeaking
              ? 'bg-cyan-400 animate-pulse'
              : 'bg-emerald-400'
          }`}
        />

        <span className="text-[7px] text-zinc-600 uppercase font-black">
          {slot.label}
        </span>

      </div>
    </div>

    <MoreHorizontal
      size={15}
      className="text-zinc-600"
    />
  </button>
);

const CoHostPip = ({
  slot,
  onClick
}) => {
  const audioOnly =
    slot.occupant?.mode ===
      'audio' ||
    slot.isVideoOff;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-20 right-3 sm:bottom-24 sm:right-4 z-20 w-24 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden border border-cyan-400/40 bg-[#09090d] shadow-xl"
    >
      {audioOnly ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c1013] p-2">

          <img
            src={
              slot.occupant.avatar
            }
            alt=""
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-cyan-400/40"
          />

          <p className="text-[8px] text-white font-bold truncate max-w-full mt-2">
            @
            {
              slot.occupant
                .username
            }
          </p>

          <span className="text-[7px] text-cyan-400 uppercase font-black mt-1">
            Audio
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0c0c10] p-2">

          <img
            src={
              slot.occupant.avatar
            }
            alt=""
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-cyan-400/40"
          />

          <p className="text-[8px] text-white font-bold truncate max-w-full mt-2">
            @
            {
              slot.occupant
                .username
            }
          </p>

        </div>
      )}

      <div className="absolute top-1.5 left-1.5 px-1.5 py-1 rounded-md bg-cyan-400 text-black text-[6px] font-black uppercase">
        Co-Host
      </div>
    </button>
  );
};

const TeamScore = ({
  label,
  score,
  side
}) => (
  <div
    className={`flex items-center gap-2 ${
      side === 'right'
        ? 'flex-row-reverse'
        : ''
    }`}
  >
    <div
      className={`w-2 h-2 rounded-full ${
        side === 'left'
          ? 'bg-rose-500'
          : 'bg-cyan-400'
      }`}
    />

    <div>
      <p className="text-[8px] uppercase font-black text-zinc-600">
        {label}
      </p>

      <p className="text-xl font-black text-white">
        {score}
      </p>
    </div>
  </div>
);

const InfoRow = ({
  label,
  value
}) => (
  <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">

    <span className="text-[9px] text-zinc-600 uppercase font-black tracking-wider">
      {label}
    </span>

    <span className="text-[10px] font-bold text-zinc-300">
      {value}
    </span>

  </div>
);

const ManagementButton = ({
  icon,
  label,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-zinc-200 text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"
  >
    {icon}
    {label}
  </button>
);

const ModalShell = ({
  children,
  onClose
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
  >
    <div
      className="absolute inset-0 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    />

    <motion.div
      initial={{
        y: 30,
        opacity: 0,
        scale: 0.98
      }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1
      }}
      exit={{
        y: 20,
        opacity: 0
      }}
      className="relative z-10 w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#09090d] shadow-2xl"
    >
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </motion.div>
  </motion.div>
);

const ModalHeader = ({
  icon,
  title,
  subtitle,
  onClose
}) => (
  <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.07]">

    <div className="flex items-center gap-3 min-w-0">

      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-sm font-black uppercase tracking-wider text-white">
          {title}
        </p>

        <p className="text-[9px] text-zinc-600 mt-1">
          {subtitle}
        </p>

      </div>
    </div>

    <button
      type="button"
      onClick={onClose}
      className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-zinc-500 hover:text-white"
    >
      <X size={15} />
    </button>

  </div>
);

const EmptyState = ({
  icon,
  text
}) => (
  <div className="py-8 text-center">

    <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-zinc-600">
      {icon}
    </div>

    <p className="text-[10px] font-bold text-zinc-500">
      {text}
    </p>

  </div>
);

export default GuestLiveSetup;
