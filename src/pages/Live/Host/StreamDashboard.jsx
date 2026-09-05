// src/pages/Live/Host/StreamDashboard.jsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  UserX,
  Settings
} from 'lucide-react';

// Isolated Logic Hook Injectors
import { useStreamSocket } from './useStreamSocket';
import { useStreamWebRTC } from './useStreamWebRTC';

// Subcomponents
import HostControls from './HostControls';
import ChatBox from '../Shared/ChatBox';
import LiveAnalyticsPanel from './HostAnalytics';
import GiftAlertOverlay from '../Shared/GiftAlertOverlay';
import StreamHeader from '../Shared/StreamHeader';
import BattleOverlay from './BattleOverlay';
import SettingsPanel from '../Shared/setting';
import GuestManager from '../Shared/GuestManager';
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';
import LiveStreamGoalBar from '../../../components/live/LiveStreamGoalBar.jsx';
import MultiHostPKBattleBar from '../../../components/live/MultiHostPKBattleBar.jsx';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

const DEFAULT_BATTLE_SCORES = {
  host: 0,
  challenger: 0
};

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  /* =========================================================
     CORE UI STATE
     ========================================================= */

  const [activePanel, setActivePanel] = useState(null);
  const [isBattleMode, setIsBattleMode] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [chatFilter, setChatFilter] = useState('all');

  /* =========================================================
     STREAM DATA
     ========================================================= */

  const [streamData, setStreamData] = useState(null);

  const [battleScores, setBattleScores] = useState(
    DEFAULT_BATTLE_SCORES
  );

  /* =========================================================
     GUEST / CO-HOST STATE
     ========================================================= */

  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeCoHosts, setActiveCoHosts] = useState([]);

  /* =========================================================
     LIVE EFFECTS
     ========================================================= */

  const [reactions, setReactions] = useState([]);
  const [activeSmallGift, setActiveSmallGift] = useState(null);

  /* =========================================================
     REFS
     ========================================================= */

  const challengerVideoRef = useRef(null);

  const mountedRef = useRef(true);

  const smallGiftTimerRef = useRef(null);

  const pendingRequestIdsRef = useRef(new Set());

  const activeCoHostIdsRef = useRef(new Set());

  /* =========================================================
     COMPONENT LIFECYCLE
     ========================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (smallGiftTimerRef.current) {
        clearTimeout(smallGiftTimerRef.current);
        smallGiftTimerRef.current = null;
      }
    };
  }, []);

  /* =========================================================
     STREAM SOCKET CONTROLLER
     ========================================================= */

  const {
    socket,
    viewers,
    joinAlert,
    activeGift,
    setActiveGift,
    incomingInvite,
    setIncomingInvite,
    reactionTrigger
  } = useStreamSocket(streamId, true);

  /* =========================================================
     WEBRTC CONTROLLER
     ========================================================= */

  const {
    localVideoRef,
    hardwareReady,
    primaryRemoteStream
  } = useStreamWebRTC(
    streamId,
    socket,
    isCameraOff,
    isMuted,
    challengerVideoRef
  );

  /* =========================================================
     KEEP REF-BASED COLLECTIONS SYNCHRONIZED
     ========================================================= */

  useEffect(() => {
    pendingRequestIdsRef.current = new Set(
      pendingRequests.map(request => request.id)
    );
  }, [pendingRequests]);

  useEffect(() => {
    activeCoHostIdsRef.current = new Set(
      activeCoHosts.map(guest => guest.id)
    );
  }, [activeCoHosts]);

  /* =========================================================
     STREAM METADATA
     ========================================================= */

  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;

    const fetchStreamMetadata = async () => {
      console.log(
        '📡 [StreamDashboard] Loading stream:',
        streamId
      );

      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          host:host_id(
            username,
            avatar_url
          )
        `)
        .eq('id', streamId)
        .single();

      if (cancelled || !mountedRef.current) return;

      if (error) {
        console.error(
          '❌ [StreamDashboard] Metadata error:',
          error
        );
        return;
      }

      if (!data) return;

      console.log(
        '✅ [StreamDashboard] Stream metadata loaded.'
      );

      setStreamData(data);

      setBattleScores({
        host: Number(data.host_battle_points) || 0,
        challenger: Number(data.challenger_battle_points) || 0
      });
    };

    fetchStreamMetadata();

    return () => {
      cancelled = true;
    };
  }, [streamId]);

  /* =========================================================
     STREAM LIFECYCLE
     ========================================================= */

  useEffect(() => {
    if (!streamId || !hardwareReady) return;

    let cancelled = false;

    const markStreamLive = async () => {
      console.log(
        '🚀 [StreamDashboard] Hardware ready → marking stream live.'
      );

      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'live'
        })
        .eq('id', streamId);

      if (cancelled || !mountedRef.current) return;

      if (error) {
        console.error(
          '❌ [StreamDashboard] Failed to update live status:',
          error
        );
        return;
      }

      console.log(
        '🟢 [StreamDashboard] Stream status is LIVE.'
      );
    };

    markStreamLive();

    return () => {
      cancelled = true;
    };
  }, [hardwareReady, streamId]);

  /* =========================================================
     LOAD GUEST STATE
     ========================================================= */

  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;

    const loadGuestState = async () => {
      console.log(
        '👥 [StreamDashboard] Loading guest state:',
        streamId
      );

      const [
        approvedResult,
        pendingResult
      ] = await Promise.all([
        supabase
          .from('live_guest_requests')
          .select('*')
          .eq('stream_id', streamId)
          .eq('status', 'approved'),

        supabase
          .from('live_guest_requests')
          .select('*')
          .eq('stream_id', streamId)
          .eq('status', 'pending')
      ]);

      if (cancelled || !mountedRef.current) return;

      if (approvedResult.error) {
        console.error(
          '❌ [StreamDashboard] Approved guest load failed:',
          approvedResult.error
        );
      }

      if (pendingResult.error) {
        console.error(
          '❌ [StreamDashboard] Pending guest load failed:',
          pendingResult.error
        );
      }

      const approved = approvedResult.data || [];
      const pending = pendingResult.data || [];

      /*
       * Defensive deduplication.
       * The database is the source of truth.
       */

      const uniqueApproved = Array.from(
        new Map(
          approved.map(guest => [guest.id, guest])
        ).values()
      );

      const uniquePending = Array.from(
        new Map(
          pending.map(request => [request.id, request])
        ).values()
      );

      setActiveCoHosts(uniqueApproved);
      setPendingRequests(uniquePending);

      console.log(
        `👥 [StreamDashboard] ${uniqueApproved.length} active co-host(s), ${uniquePending.length} pending request(s).`
      );
    };

    loadGuestState();

    return () => {
      cancelled = true;
    };
  }, [streamId]);

  /* =========================================================
     GUEST REALTIME SYNCHRONIZATION
     ========================================================= */

  useEffect(() => {
    if (!streamId) return;

    const channelName = `host_requests_${streamId}`;

    console.log(
      '📡 [StreamDashboard] Starting guest realtime:',
      channelName
    );

    const channel = supabase
      .channel(channelName)

      /* -----------------------------------------------------
         NEW REQUEST
         ----------------------------------------------------- */

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!mountedRef.current) return;

          const request = payload.new;

          if (!request || request.status !== 'pending') {
            return;
          }

          if (
            pendingRequestIdsRef.current.has(request.id)
          ) {
            return;
          }

          console.log(
            '📥 [Guest] New join request:',
            request.id
          );

          setPendingRequests(previous => {
            if (
              previous.some(
                item => item.id === request.id
              )
            ) {
              return previous;
            }

            return [...previous, request];
          });
        }
      )

      /* -----------------------------------------------------
         REQUEST UPDATE
         ----------------------------------------------------- */

      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!mountedRef.current) return;

          const updated = payload.new;

          if (!updated) return;

          console.log(
            '🔄 [Guest] Request updated:',
            updated.id,
            updated.status
          );

          /*
           * APPROVED
           */

          if (updated.status === 'approved') {
            setPendingRequests(previous =>
              previous.filter(
                request => request.id !== updated.id
              )
            );

            setActiveCoHosts(previous => {
              const exists = previous.some(
                guest => guest.id === updated.id
              );

              if (exists) {
                return previous.map(guest =>
                  guest.id === updated.id
                    ? { ...guest, ...updated }
                    : guest
                );
              }

              return [...previous, updated];
            });

            return;
          }

          /*
           * REMOVED / REJECTED / DISCONNECTED
           */

          if (
            updated.status === 'rejected' ||
            updated.status === 'disconnected' ||
            updated.status === 'cancelled'
          ) {
            setPendingRequests(previous =>
              previous.filter(
                request => request.id !== updated.id
              )
            );

            setActiveCoHosts(previous =>
              previous.filter(
                guest => guest.id !== updated.id
              )
            );

            return;
          }

          /*
           * OTHER STATUS CHANGES
           */

          setPendingRequests(previous =>
            previous.map(request =>
              request.id === updated.id
                ? { ...request, ...updated }
                : request
            )
          );

          setActiveCoHosts(previous =>
            previous.map(guest =>
              guest.id === updated.id
                ? { ...guest, ...updated }
                : guest
            )
          );
        }
      )

      /* -----------------------------------------------------
         REQUEST DELETE
         ----------------------------------------------------- */

      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'live_guest_requests',
          filter: `stream_id=eq.${streamId}`
        },
        payload => {
          if (!mountedRef.current) return;

          const deletedId = payload.old?.id;

          if (!deletedId) return;

          setPendingRequests(previous =>
            previous.filter(
              request => request.id !== deletedId
            )
          );

          setActiveCoHosts(previous =>
            previous.filter(
              guest => guest.id !== deletedId
            )
          );
        }
      )

      .subscribe(status => {
        console.log(
          `📡 [Guest Realtime] ${status}`
        );
      });

    return () => {
      console.log(
        '🧹 [StreamDashboard] Removing guest realtime channel.'
      );

      supabase.removeChannel(channel);
    };
  }, [streamId]);

  /* =========================================================
     GIFT ROUTING
     ========================================================= */

  useEffect(() => {
    if (!activeGift) return;

    const giftPrice = Number(activeGift.price) || 0;

    /*
     * Small gifts become lightweight particles.
     * Larger gifts remain with GiftAlertOverlay.
     */

    if (giftPrice < 50) {
      setActiveSmallGift(activeGift);

      if (smallGiftTimerRef.current) {
        clearTimeout(smallGiftTimerRef.current);
      }

      smallGiftTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        setActiveSmallGift(null);
        smallGiftTimerRef.current = null;
      }, 2200);

      setActiveGift(null);
    }
  }, [activeGift, setActiveGift]);

  /* =========================================================
     REACTION LIFECYCLE
     ========================================================= */

  useEffect(() => {
    if (!reactionTrigger) return;

    const reactionId =
      reactionTrigger.id ||
      `${Date.now()}-${Math.random()}`;

    const reaction = {
      ...reactionTrigger,
      id: reactionId
    };

    setReactions(previous => [
      ...previous.slice(-19),
      reaction
    ]);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;

      setReactions(previous =>
        previous.filter(
          item => item.id !== reactionId
        )
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [reactionTrigger]);

  /* =========================================================
     BATTLE INVITE
     ========================================================= */

  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socket || !streamId) {
      console.warn(
        '⚠️ [Battle] Cannot accept invite.'
      );
      return;
    }

    const peerStreamId =
      incomingInvite.senderStreamId ||
      incomingInvite.hostRoomId ||
      '';

    const peerId =
      incomingInvite.senderHostId ||
      incomingInvite.host_id ||
      '';

    if (!peerId) {
      console.error(
        '❌ [Battle] Missing challenger host identifier.'
      );
      return;
    }

    try {
      console.log(
        '⚔️ [Battle] Accepting invitation:',
        {
          peerId,
          peerStreamId
        }
      );

      socket.emit('accept_battle_invite', {
        hostRoomId: streamId,
        challengerRoomId: peerStreamId
      });

      setIsBattleMode(true);
      setIncomingInvite(null);
    } catch (error) {
      console.error(
        '❌ [Battle] Accept failed:',
        error
      );
    }
  };

  /* =========================================================
     GUEST APPROVAL
     ========================================================= */

  const handleAcceptGuest = async (
    request,
    mode = 'video'
  ) => {
    if (!request?.id) return;

    console.log(
      `✅ [Guest] Approving ${request.username || request.user_id} as ${mode}.`
    );

    /*
     * Prevent double-click duplication.
     */

    if (
      activeCoHostIdsRef.current.has(request.id)
    ) {
      setPendingRequests(previous =>
        previous.filter(
          item => item.id !== request.id
        )
      );

      return;
    }

    const { data, error } = await supabase
      .from('live_guest_requests')
      .update({
        status: 'approved',
        mode
      })
      .eq('id', request.id)
      .select()
      .single();

    if (error) {
      console.error(
        '❌ [Guest] Approval failed:',
        error
      );
      return;
    }

    const approvedGuest = data || {
      ...request,
      status: 'approved',
      mode
    };

    setPendingRequests(previous =>
      previous.filter(
        item => item.id !== request.id
      )
    );

    /*
     * Add only once.
     */

    setActiveCoHosts(previous => {
      const exists = previous.some(
        guest => guest.id === approvedGuest.id
      );

      if (exists) {
        return previous.map(guest =>
          guest.id === approvedGuest.id
            ? { ...guest, ...approvedGuest }
            : guest
        );
      }

      return [...previous, approvedGuest];
    });

    /*
     * Notify backend only after database approval succeeds.
     */

    if (socket?.connected) {
      socket.emit('approve_cohost', {
        streamId,
        guestId: request.user_id,
        mode
      });
    } else {
      console.warn(
        '⚠️ [Guest] Socket unavailable during approval.'
      );
    }
  };

  /* =========================================================
     GUEST REJECTION
     ========================================================= */

  const handleRejectGuest = async requestId => {
    if (!requestId) return;

    console.log(
      '❌ [Guest] Rejecting request:',
      requestId
    );

    const { error } = await supabase
      .from('live_guest_requests')
      .update({
        status: 'rejected'
      })
      .eq('id', requestId);

    if (error) {
      console.error(
        '❌ [Guest] Rejection failed:',
        error
      );
      return;
    }

    setPendingRequests(previous =>
      previous.filter(
        request => request.id !== requestId
      )
    );
  };

  /* =========================================================
     VIDEO FILTER ENGINE
     ========================================================= */

  useEffect(() => {
    const fxState = {
      smoothing: 3,
      jawline: 0,
      eyes: 0,
      slim: 0,
      lut: 'none',
      fx: 'none'
    };

    const handleFilterChange = event => {
      const videoElement = localVideoRef.current;

      if (!videoElement) return;

      const detail = event?.detail;

      if (!detail) return;

      const {
        type,
        key,
        value
      } = detail;

      if (type === 'beautify') {
        fxState.smoothing =
          Number.parseFloat(value) || 0;
      }

      if (
        type === 'morph' &&
        Object.prototype.hasOwnProperty.call(
          fxState,
          key
        )
      ) {
        fxState[key] =
          Number.parseFloat(value) || 0;
      }

      if (type === 'lut') {
        fxState.lut = key || 'none';
      }

      if (type === 'fx') {
        fxState.fx = key || 'none';
      }

      let filterString = '';

      let transformString =
        'scaleX(-1)';

      /* ---------------- LUT ---------------- */

      switch (fxState.lut) {
        case 'retro':
          filterString +=
            'sepia(35%) contrast(110%) saturate(90%) hue-rotate(-5deg) ';
          break;

        case 'cyberpunk':
          filterString +=
            'hue-rotate(135deg) saturate(165%) contrast(115%) ';
          break;

        case 'noir':
          filterString +=
            'grayscale(100%) contrast(140%) brightness(95%) ';
          break;

        case 'golden':
          filterString +=
            'sepia(20%) saturate(140%) brightness(105%) hue-rotate(10deg) ';
          break;

        case 'tropic':
          filterString +=
            'saturate(180%) contrast(105%) hue-rotate(-5deg) ';
          break;

        default:
          break;
      }

      /* ---------------- FX ---------------- */

      switch (fxState.fx) {
        case 'vhs':
          filterString +=
            'contrast(120%) saturate(130%) hue-rotate(15deg) brightness(105%) ';
          break;

        case 'manga':
          filterString +=
            'grayscale(100%) contrast(300%) ';
          break;

        case 'thermal':
          filterString +=
            'hue-rotate(240deg) saturate(200%) invert(100%) ';
          break;

        default:
          break;
      }

      /* ---------------- BEAUTIFY ---------------- */

      if (fxState.smoothing > 0) {
        filterString +=
          `blur(${fxState.smoothing * 0.15}px) ` +
          `contrast(${100 + fxState.smoothing * 1.5}%) ` +
          `brightness(${100 + fxState.smoothing * 1.2}%) `;
      }

      /* ---------------- FACE MORPH ---------------- */

      if (
        fxState.slim > 0 ||
        fxState.jawline > 0
      ) {
        const horizontalCompression =
          1 -
          fxState.slim * 0.015 -
          fxState.jawline * 0.008;

        transformString +=
          ` scaleX(${horizontalCompression})`;
      }

      if (fxState.eyes > 0) {
        const eyeExpansion =
          1 + fxState.eyes * 0.012;

        transformString +=
          ` scaleY(${eyeExpansion})`;
      }

      videoElement.style.filter =
        filterString.trim() || 'none';

      videoElement.style.transform =
        transformString;
    };

    window.addEventListener(
      'mpade-video-filter',
      handleFilterChange
    );

    return () => {
      window.removeEventListener(
        'mpade-video-filter',
        handleFilterChange
      );
    };
  }, [localVideoRef]);

  /* =========================================================
     PANEL MANAGEMENT
     ========================================================= */

  const togglePanel = panel => {
    setActivePanel(previous =>
      previous === panel ? null : panel
    );
  };

  /* =========================================================
     LEAVE STREAM
     ========================================================= */

  const handleLeaveStream = () => {
    setActivePanel(null);
    navigate('/live');
  };

  /* =========================================================
     LOADING STATE
     ========================================================= */

  if (!streamData) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center font-black italic text-cyan-400 tracking-widest">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />

          <span className="text-xs">
            CONNECTING TO LIVE STUDIO...
          </span>
        </div>
      </div>
    );
  }

  /* =========================================================
     BATTLE HOST DATA
     ========================================================= */

  const battleHosts = [
    {
      id: 'host',

      username:
        streamData?.host?.username ||
        'Host',

      avatar:
        streamData?.host?.avatar_url,

      score:
        battleScores.host || 0,

      topGifters: []
    },

    ...(activeCoHosts.length > 0
      ? activeCoHosts.map((guest, index) => ({
          id:
            guest.id ||
            `cohost-${index}`,

          username:
            guest.username ||
            `Host ${index + 2}`,

          avatar:
            guest.avatar_url,

          score: Math.max(
            0,
            battleScores.challenger -
              index * 120
          ),

          topGifters: []
        }))
      : [
          {
            id: 'challenger',

            username: 'Challenger',

            avatar:
              'https://api.dicebear.com/7.x/avataaars/svg?seed=rival',

            score:
              battleScores.challenger || 0,

            topGifters: []
          }
        ])
  ];

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans">

      {/* =====================================================
          MAIN LIVE STAGE
          ===================================================== */}

      <main className="absolute inset-0 overflow-hidden">

        {/* ---------------------------------------------------
            LIVE GIFTS
            --------------------------------------------------- */}

        <GiftAlertOverlay
          activeGift={activeGift}
          setActiveGift={setActiveGift}
        />

        {/* ---------------------------------------------------
            TOP LIVE HEADER
            --------------------------------------------------- */}

        <header className="absolute top-0 left-0 right-0 z-[60] px-4 pt-7 pb-8 bg-gradient-to-b from-black/90 via-black/50 to-transparent">

          <div className="flex flex-col gap-2.5">

            <StreamHeader
              data={streamData}
              isHost={true}
              viewerCount={viewers.length}
              onLeave={handleLeaveStream}
            />

            {/* Goal */}

            <div className="flex justify-start pl-1 pointer-events-auto">
              <LiveStreamGoalBar
                streamId={streamId}
                isHost={true}
              />
            </div>

            {/* PK */}

            {isBattleMode && (
              <div className="w-full max-w-lg mx-auto pt-1 pointer-events-auto">

                <MultiHostPKBattleBar
                  hosts={battleHosts}
                  duration={180}
                />

              </div>
            )}

          </div>
        </header>

        {/* ===================================================
            PENDING GUEST REQUEST
            =================================================== */}

        <AnimatePresence>
          {pendingRequests.length > 0 &&
            activePanel !== 'guests' && (

              <div className="absolute top-[118px] left-0 right-0 z-[65] pointer-events-none px-4">

                <AnimatePresence mode="popLayout">

                  {pendingRequests
                    .slice(0, 2)
                    .map(request => (

                      <motion.div
                        key={request.id}
                        layout
                        initial={{
                          opacity: 0,
                          y: -20,
                          scale: 0.96
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1
                        }}
                        exit={{
                          opacity: 0,
                          y: -20,
                          scale: 0.96
                        }}
                        className="pointer-events-auto w-full max-w-md mx-auto mb-2"
                      >

                        <div className="rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl p-3">

                          <div className="flex items-center gap-3">

                            <img
                              src={
                                request.avatar_url ||
                                'https://via.placeholder.com/150'
                              }
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-[#fe2c55]/50"
                            />

                            <div className="min-w-0 flex-1">

                              <p className="text-xs font-bold truncate">
                                {request.username ||
                                  'Guest'}
                              </p>

                              <p className="text-[9px] text-white/45 uppercase font-semibold">
                                Wants to join your live
                              </p>

                            </div>

                            <button
                              onClick={() =>
                                handleRejectGuest(
                                  request.id
                                )
                              }
                              className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition"
                              title="Reject"
                            >
                              <UserX size={15} />
                            </button>

                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">

                            <button
                              onClick={() =>
                                handleAcceptGuest(
                                  request,
                                  'audio'
                                )
                              }
                              className="h-9 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition"
                            >
                              <Mic size={13} />
                              Audio
                            </button>

                            <button
                              onClick={() =>
                                handleAcceptGuest(
                                  request,
                                  'video'
                                )
                              }
                              className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition"
                            >
                              <Video size={13} />
                              Video
                            </button>

                          </div>

                        </div>

                      </motion.div>

                    ))}

                </AnimatePresence>

                {pendingRequests.length > 2 && (
                  <button
                    onClick={() =>
                      setActivePanel('guests')
                    }
                    className="pointer-events-auto block mx-auto mt-1 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition"
                  >
                    +{pendingRequests.length - 2} more requests
                  </button>
                )}

              </div>

            )}
        </AnimatePresence>

        {/* ===================================================
            LIVE VIDEO STAGE
            =================================================== */}

        <section className="absolute inset-0 z-0 bg-zinc-950">

          <DynamicStreamGrid
            streamId={streamId}

            hostVideo={
              <div className="relative w-full h-full bg-black">

                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`
                    w-full
                    h-full
                    object-cover
                    transition-opacity
                    duration-300
                    ${
                      isCameraOff
                        ? 'opacity-0'
                        : 'opacity-100'
                    }
                  `}
                />

                {isCameraOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">

                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <VideoOff
                        size={22}
                        className="text-white/30"
                      />
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                      Camera Off
                    </span>

                  </div>
                )}

              </div>
            }

            hostInfo={{
              username:
                streamData?.host?.username ||
                'Host',

              avatar_url:
                streamData?.host?.avatar_url
            }}

            coHosts={activeCoHosts}

            /*
             * The WebRTC hook remains the owner of the
             * remote media stream.
             */

            coHostStream={
              primaryRemoteStream
            }

            /*
             * Fallback video element remains available
             * for the existing WebRTC architecture.
             */

            coHostVideo={
              primaryRemoteStream
                ? null
                : (
                  <div className="relative w-full h-full bg-black">

                    <video
                      ref={challengerVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />

                  </div>
                )
            }

            coHostInfo={
              activeCoHosts[0] ||
              (
                primaryRemoteStream
                  ? {
                      username: 'Co-Host'
                    }
                  : null
              )
            }

            isHostView={true}

            isBattleMode={
              isBattleMode
            }

            activeSmallGift={
              activeSmallGift
            }
          />

        </section>

        {/* ===================================================
            BOTTOM LIVE CONTROLS
            =================================================== */}

        <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-5 pointer-events-none">

          <div className="flex flex-col gap-3">

            {/* -----------------------------------------------
                CHAT
                ----------------------------------------------- */}

            <div className="w-full max-w-[350px] pointer-events-auto">

              <div className="h-44 overflow-y-auto floating-chat-container">

                <ChatBox
                  streamId={streamId}
                  isHost={true}
                  transparent={true}
                  filter={chatFilter}
                />

              </div>

            </div>

            {/* -----------------------------------------------
                CONTROL DOCK
                ----------------------------------------------- */}

            <nav className="w-full max-w-xl mx-auto pointer-events-auto">

              <div className="flex items-center justify-between gap-1 p-1.5 rounded-full border border-white/10 bg-zinc-950/85 backdrop-blur-2xl shadow-2xl">

                {/* Camera */}

                <button
                  onClick={() =>
                    setIsCameraOff(
                      previous => !previous
                    )
                  }
                  className={`
                    w-11 h-11
                    rounded-full
                    flex items-center justify-center
                    transition-all
                    ${
                      isCameraOff
                        ? 'bg-red-500 text-white'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }
                  `}
                  title={
                    isCameraOff
                      ? 'Turn camera on'
                      : 'Turn camera off'
                  }
                >
                  {isCameraOff ? (
                    <VideoOff size={17} />
                  ) : (
                    <Video size={17} />
                  )}
                </button>

                {/* Microphone */}

                <button
                  onClick={() =>
                    setIsMuted(
                      previous => !previous
                    )
                  }
                  className={`
                    w-11 h-11
                    rounded-full
                    flex items-center justify-center
                    transition-all
                    ${
                      isMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }
                  `}
                  title={
                    isMuted
                      ? 'Unmute microphone'
                      : 'Mute microphone'
                  }
                >
                  {isMuted ? (
                    <MicOff size={17} />
                  ) : (
                    <Mic size={17} />
                  )}
                </button>

                {/* Guests */}

                <button
                  onClick={() =>
                    togglePanel('guests')
                  }
                  className={`
                    relative
                    w-11 h-11
                    rounded-full
                    flex items-center justify-center
                    transition-all
                    ${
                      activePanel === 'guests'
                        ? 'bg-cyan-400 text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }
                  `}
                  title="Guests"
                >
                  <Users size={17} />

                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#fe2c55] border-2 border-zinc-950 text-[8px] font-black flex items-center justify-center">
                      {pendingRequests.length > 9
                        ? '9+'
                        : pendingRequests.length}
                    </span>
                  )}
                </button>

                {/* Settings */}

                <button
                  onClick={() =>
                    togglePanel('settings')
                  }
                  className={`
                    w-11 h-11
                    rounded-full
                    flex items-center justify-center
                    transition-all
                    ${
                      activePanel === 'settings'
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }
                  `}
                  title="Studio settings"
                >
                  <Settings size={17} />
                </button>

              </div>

            </nav>

          </div>

        </div>

        {/* ===================================================
            BATTLE INVITATION
            =================================================== */}

        <AnimatePresence>

          {incomingInvite && (

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
              className="absolute inset-0 z-[80] flex items-center justify-center pointer-events-none p-6"
            >

              <motion.div
                initial={{
                  y: 20,
                  scale: 0.94
                }}
                animate={{
                  y: 0,
                  scale: 1
                }}
                exit={{
                  y: 20,
                  scale: 0.94
                }}
                className="w-full max-w-sm pointer-events-auto rounded-3xl border border-cyan-400/20 bg-zinc-950/95 backdrop-blur-2xl p-6 text-center shadow-2xl"
              >

                <div className="w-14 h-14 mx-auto rounded-full bg-cyan-400/10 flex items-center justify-center mb-4">

                  <span className="text-2xl">
                    ⚔️
                  </span>

                </div>

                <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-black mb-2">
                  Live Battle Invitation
                </p>

                <p className="text-sm font-bold">
                  @{incomingInvite.senderUsername ||
                    'Another host'}{' '}
                  wants to battle
                </p>

                <div className="flex gap-2 mt-5">

                  <button
                    onClick={() =>
                      setIncomingInvite(null)
                    }
                    className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-wider"
                  >
                    Decline
                  </button>

                  <button
                    onClick={handleAcceptInvite}
                    className="flex-1 h-10 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-[10px] font-black uppercase tracking-wider"
                  >
                    Accept
                  </button>

                </div>

              </motion.div>

            </motion.div>

          )}

        </AnimatePresence>

      </main>

      {/* =====================================================
          STUDIO DRAWER
          ===================================================== */}

      <AnimatePresence>

        {activePanel && (

          <motion.aside
            initial={{
              x: '100%'
            }}
            animate={{
              x: 0
            }}
            exit={{
              x: '100%'
            }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 240
            }}
            className="absolute top-0 right-0 z-[100] w-full sm:w-80 h-full bg-zinc-950/98 backdrop-blur-2xl border-l border-white/10 shadow-2xl overflow-y-auto"
          >

            {/* -----------------------------------------------
                GUEST MANAGER
                ----------------------------------------------- */}

            {activePanel === 'guests' && (

              <GuestManager
                streamId={streamId}
                activeGuests={activeCoHosts}
                setActiveGuests={
                  setActiveCoHosts
                }
                pendingRequests={
                  pendingRequests
                }
                setPendingRequests={
                  setPendingRequests
                }
                onBack={() =>
                  setActivePanel(null)
                }
                socket={socket}
              />

            )}

            {/* -----------------------------------------------
                SETTINGS
                ----------------------------------------------- */}

            {activePanel === 'settings' && (

              <SettingsPanel
                streamId={streamId}
                streamData={streamData}
                socket={socket}
                currentCoHosts={
                  activeCoHosts
                }
                onDropUser={user => {
                  if (!user?.id) return;

                  setActiveCoHosts(
                    previous =>
                      previous.filter(
                        guest =>
                          guest.id !== user.id
                      )
                  );
                }}
                onDropAll={() =>
                  setActiveCoHosts([])
                }
                onClose={() =>
                  setActivePanel(null)
                }
              />

            )}

          </motion.aside>

        )}

      </AnimatePresence>

    </div>
  );
};

export default StreamDashboard;
