import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from './Shared/VideoPlayer';

import {
  Users,
  Gift,
  Share2,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Radio,
  Camera,
  Gamepad2,
  Sparkles,
  RefreshCw,
  Monitor,
  Search,
  Play,
  Volume2,
  VolumeX,
  Flame,
  Trophy,
  Zap,
  MessageCircle,
  Send,
  Heart,
  Smile,
  Maximize2,
  Copy,
  Check,
  Award,
  Music,
  Sliders,
  Activity,
  Clock,
  Crown,
  ChevronRight,
  ChevronDown,
  Shield,
  Eye,
  Globe,
  Lock,
  UserCheck,
  MonitorPlay,
  PanelRight,
  LayoutDashboard,
  MoreHorizontal
} from 'lucide-react';

/* =========================================================
   SOUND EFFECT ENGINE
========================================================= */

const playSoundEffect = (type) => {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const ctx = new AudioContext();

    const createNote = (
      freq,
      startTime,
      duration,
      waveType = 'sine',
      gainVal = 0.3
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(
        freq,
        ctx.currentTime + startTime
      );

      gain.gain.setValueAtTime(
        gainVal,
        ctx.currentTime + startTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startTime + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(
        ctx.currentTime + startTime + duration
      );
    };

    if (type === 'victory') {
      createNote(523.25, 0, 0.25, 'triangle', 0.4);
      createNote(659.25, 0.15, 0.25, 'triangle', 0.4);
      createNote(783.99, 0.3, 0.25, 'triangle', 0.4);
      createNote(1046.5, 0.45, 0.5, 'triangle', 0.5);
    }

    if (type === 'defeat') {
      createNote(392, 0, 0.3, 'sawtooth', 0.3);
      createNote(349.23, 0.2, 0.3, 'sawtooth', 0.3);
      createNote(311.13, 0.4, 0.3, 'sawtooth', 0.3);
      createNote(261.63, 0.6, 0.6, 'sawtooth', 0.4);
    }

    if (type === 'gg') {
      createNote(1318.51, 0, 0.15, 'sine', 0.3);
      createNote(1760, 0.12, 0.3, 'sine', 0.4);
    }

    if (type === 'airhorn') {
      createNote(370, 0, 0.1, 'sawtooth', 0.5);
      createNote(370, 0.12, 0.1, 'sawtooth', 0.5);
      createNote(370, 0.24, 0.25, 'sawtooth', 0.6);
    }

    if (type === 'hype') {
      [523.25, 659.25, 783.99, 1046.5].forEach(
        (freq, idx) => {
          createNote(
            freq,
            idx * 0.08,
            0.35,
            'square',
            0.2
          );
        }
      );
    }

    if (type === 'clap') {
      for (let i = 0; i < 6; i++) {
        createNote(
          200 + Math.random() * 800,
          i * 0.06,
          0.08,
          'square',
          0.15
        );
      }
    }

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1800);
  } catch (error) {
    console.error('Audio synth error:', error);
  }
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

const Panel = ({
  children,
  className = '',
  title,
  subtitle,
  icon,
  action
}) => (
  <section
    className={`
      rounded-2xl
      border border-white/[0.08]
      bg-[#0b0d12]/95
      shadow-[0_20px_60px_rgba(0,0,0,0.25)]
      overflow-hidden
      ${className}
    `}
  >
    {(title || icon || action) && (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-cyan-300 shrink-0">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {title && (
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-[0.14em] text-white truncate">
                {title}
              </h3>
            )}

            {subtitle && (
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>
    )}

    <div>{children}</div>
  </section>
);

const StatCard = ({
  icon,
  label,
  value,
  accent = 'cyan'
}) => {
  const accentClasses = {
    cyan: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/15',
    pink: 'text-pink-300 bg-pink-400/10 border-pink-400/15',
    amber: 'text-amber-300 bg-amber-400/10 border-amber-400/15',
    emerald:
      'text-emerald-300 bg-emerald-400/10 border-emerald-400/15'
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
            accentClasses[accent]
          }`}
        >
          {icon}
        </div>

        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
          {label}
        </span>
      </div>

      <p className="mt-2 text-base sm:text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
};

const ToolButton = ({
  icon,
  label,
  active,
  danger,
  onClick
}) => (
  <button
    onClick={onClick}
    className={`
      group flex items-center gap-2.5
      px-3.5 py-2.5
      rounded-xl
      border
      transition-all duration-200
      text-[10px] sm:text-[11px]
      font-bold
      whitespace-nowrap
      ${
        danger
          ? 'border-red-500/20 bg-red-500/[0.07] text-red-300 hover:bg-red-500/15'
          : active
          ? 'border-cyan-400/30 bg-cyan-400/[0.09] text-cyan-200'
          : 'border-white/[0.07] bg-white/[0.025] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ModalShell = ({
  children,
  onClose,
  size = 'max-w-md'
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose?.();
    }}
  >
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`
        w-full ${size}
        max-h-[90dvh]
        overflow-y-auto
        rounded-2xl
        border border-white/[0.1]
        bg-[#0b0d12]
        shadow-[0_30px_100px_rgba(0,0,0,0.6)]
      `}
    >
      {children}
    </motion.div>
  </motion.div>
);

const ModalHeader = ({
  icon,
  title,
  subtitle,
  onClose
}) => (
  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07]">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center text-cyan-300">
        {icon}
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          {title}
        </h3>

        {subtitle && (
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>

    <button
      onClick={onClose}
      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition"
    >
      <X size={16} />
    </button>
  </div>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */

const MobileGamingSetup = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('MOBILE GAMING');

  /* STREAM */
  const [title, setTitle] = useState('');
  const [selectedGame, setSelectedGame] =
    useState('PUBG Mobile');
  const [customGameSearch, setCustomGameSearch] =
    useState('');
  const [privacy, setPrivacy] = useState('public');
  const [streamQuality, setStreamQuality] =
    useState('1080p 60FPS');
  const [activeStreamData, setActiveStreamData] =
    useState(null);

  /* MEDIA */
  const [screenStream, setScreenStream] =
    useState(null);
  const [camStream, setCamStream] =
    useState(null);
  const [isScreenSharing, setIsScreenSharing] =
    useState(false);
  const [isCamOverlayOn, setIsCamOverlayOn] =
    useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [camPosition, setCamPosition] =
    useState('bottom-right');

  /* AUDIO */
  const [audioLevel, setAudioLevel] = useState(0);

  /* MODALS */
  const [showSoundboard, setShowSoundboard] =
    useState(false);
  const [showSquadModal, setShowSquadModal] =
    useState(false);
  const [showSettingsModal, setShowSettingsModal] =
    useState(false);
  const [showChatOverlay, setShowChatOverlay] =
    useState(true);
  const [showEndConfirm, setShowEndConfirm] =
    useState(false);
  const [streamEndSummary, setStreamEndSummary] =
    useState(null);

  /* SQUAD */
  const [squadSearchQuery, setSquadSearchQuery] =
    useState('');
  const [squadUsersList, setSquadUsersList] =
    useState([]);
  const [squadInvitesSent, setSquadInvitesSent] =
    useState(new Set());
  const [copiedLink, setCopiedLink] =
    useState(false);

  /* HUD */
  const [streamUptime, setStreamUptime] =
    useState(0);
  const [viewerCount, setViewerCount] =
    useState(124);
  const [likesCount, setLikesCount] =
    useState(850);
  const [coinsEarned, setCoinsEarned] =
    useState(320);

  const [chatMessages, setChatMessages] =
    useState([]);
  const [chatInput, setChatInput] =
    useState([]);

  /* =====================================================
     GAME DATA
  ===================================================== */

  const popularGames = [
    'PUBG Mobile',
    'Free Fire',
    'Call of Duty: Mobile',
    'Mobile Legends',
    'Genshin Impact',
    'Roblox',
    'Fortnite',
    'Apex Legends',
    'Minecraft',
    'GTA V',
    'Valorant',
    'EA SPORTS FC',
    'Wild Rift',
    'Clash Royale',
    'Brawl Stars'
  ];

  const filteredGames = popularGames.filter((game) =>
    game
      .toLowerCase()
      .includes(customGameSearch.toLowerCase())
  );

  const titleTemplates = [
    `Streaming ${selectedGame} Ranked Push! 🎮🔥`,
    `Live ${selectedGame} Squad Tournament 🏆`,
    `Playing ${selectedGame} with Viewers! 💬`,
    `${selectedGame} Pro Gameplay & Chill Chat ✨`
  ];

  /* =====================================================
     FETCH STREAM
  ===================================================== */

  useEffect(() => {
    if (!streamId) return;

    const fetchStream = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select(
          '*, profiles:host_id(username, avatar_url)'
        )
        .eq('id', streamId)
        .single();

      if (error) {
        console.error('Failed to fetch gaming stream:', error);
        return;
      }

      if (data) {
        setActiveStreamData(data);

        if (data.category) {
          setSelectedGame(data.category);
        }

        if (data.title) {
          setTitle(data.title);
        }
      }
    };

    fetchStream();
  }, [streamId]);

  /* =====================================================
     UPTIME / ENGAGEMENT
  ===================================================== */

  useEffect(() => {
    if (!streamId) return;

    const timer = setInterval(() => {
      setStreamUptime((prev) => prev + 1);
    }, 1000);

    const engagement = setInterval(() => {
      setViewerCount((prev) =>
        Math.max(
          10,
          prev + Math.floor(Math.random() * 5) - 2
        )
      );

      setLikesCount((prev) =>
        prev + Math.floor(Math.random() * 3)
      );
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(engagement);
    };
  }, [streamId]);

  /* =====================================================
     SCREEN VIDEO
  ===================================================== */

  useEffect(() => {
    if (
      screenVideoRef.current &&
      screenStream
    ) {
      screenVideoRef.current.srcObject =
        screenStream;

      screenVideoRef.current
        .play()
        .catch(() => {});
    }
  }, [screenStream]);

  /* =====================================================
     CAMERA VIDEO
  ===================================================== */

  useEffect(() => {
    if (
      camVideoRef.current &&
      camStream
    ) {
      camVideoRef.current.srcObject =
        camStream;

      camVideoRef.current
        .play()
        .catch(() => {});
    }
  }, [camStream]);

  /* =====================================================
     SCREEN CAPTURE
  ===================================================== */

  const startScreenCapture = async () => {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      alert(
        'Screen sharing is not supported by this browser. Please use a supported desktop browser.'
      );
      return;
    }

    try {
      const displayStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            frameRate: 60
          },
          audio: true
        });

      setScreenStream(displayStream);
      setIsScreenSharing(true);

      const videoTrack =
        displayStream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };
      }
    } catch (error) {
      console.error(
        'Screen capture cancelled or failed:',
        error
      );

      setIsScreenSharing(false);
    }
  };

  const stopScreenCapture = () => {
    if (!screenStream) return;

    screenStream
      .getTracks()
      .forEach((track) => track.stop());

    setScreenStream(null);
    setIsScreenSharing(false);
  };

  /* =====================================================
     CAMERA PREVIEW
  ===================================================== */

  const stopCamPreview = useCallback(() => {
    setCamStream((currentStream) => {
      if (currentStream) {
        currentStream
          .getTracks()
          .forEach((track) => track.stop());
      }

      return null;
    });

    if (audioContextRef.current) {
      audioContextRef.current
        .close()
        .catch(() => {});

      audioContextRef.current = null;
      analyserRef.current = null;
    }

    setAudioLevel(0);
  }, []);

  const startCamPreview = useCallback(async () => {
    try {
      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

      setCamStream(mediaStream);

      try {
        const AudioCtx =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const analyser =
          audioCtx.createAnalyser();

        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source =
          audioCtx.createMediaStreamSource(
            mediaStream
          );

        source.connect(analyser);

        const dataArray =
          new Uint8Array(
            analyser.frequencyBinCount
          );

        const checkAudio = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(
            dataArray
          );

          const average =
            dataArray.reduce(
              (a, b) => a + b,
              0
            ) / dataArray.length;

          setAudioLevel(
            Math.min(
              100,
              Math.round(average * 2)
            )
          );

          requestAnimationFrame(checkAudio);
        };

        checkAudio();
      } catch (audioError) {
        console.warn(
          'Audio meter warning:',
          audioError
        );
      }
    } catch (error) {
      console.warn(
        'Camera preview access error:',
        error
      );

      setIsCamOverlayOn(false);
    }
  }, []);

  useEffect(() => {
    if (isCamOverlayOn) {
      if (!camStream) {
        startCamPreview();
      }
    } else {
      stopCamPreview();
    }
  }, [
    isCamOverlayOn,
    camStream,
    startCamPreview,
    stopCamPreview
  ]);

  useEffect(() => {
    return () => {
      stopScreenCapture();
      stopCamPreview();

      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
      }

      if (signalingChannelRef.current) {
        try {
          supabase.removeChannel(
            signalingChannelRef.current
          );
        } catch {}
      }
    };
  }, []);

  /* =====================================================
     MIC
  ===================================================== */

  const toggleMic = () => {
    setIsMicOn((previous) => {
      const next = !previous;

      if (camStream) {
        camStream
          .getAudioTracks()
          .forEach((track) => {
            track.enabled = next;
          });
      }

      return next;
    });
  };

  /* =====================================================
     WEBRTC
  ===================================================== */

  const initWebRTCSignaling = async (
    targetStreamId
  ) => {
    const iceServers = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        {
          urls: 'stun:stun1.l.google.com:19302'
        }
      ]
    };

    const pc = new RTCPeerConnection(
      iceServers
    );

    pcRef.current = pc;

    if (screenStream) {
      screenStream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(track, screenStream);
        });
    }

    if (isCamOverlayOn && camStream) {
      camStream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(track, camStream);
        });
    }

    const channel = supabase.channel(
      `stream_signaling:${targetStreamId}`,
      {
        config: {
          broadcast: {
            self: false
          }
        }
      }
    );

    signalingChannelRef.current = channel;

    channel
      .on(
        'broadcast',
        { event: 'viewer-answer' },
        async ({ payload }) => {
          if (
            payload?.answer &&
            pc.signalingState !== 'closed'
          ) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  payload.answer
                )
              );
            } catch (error) {
              console.error(
                'Failed to apply viewer answer:',
                error
              );
            }
          }
        }
      )
      .on(
        'broadcast',
        {
          event: 'viewer-ice-candidate'
        },
        async ({ payload }) => {
          if (payload?.candidate) {
            try {
              await pc.addIceCandidate(
                new RTCIceCandidate(
                  payload.candidate
                )
              );
            } catch (error) {
              console.warn(
                'Failed to add viewer ICE:',
                error
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(
          `Gaming signaling status: ${status}`
        );

        if (status === 'SUBSCRIBED') {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'host-ice-candidate',
                payload: {
                  candidate:
                    event.candidate
                }
              });
            }
          };
        }
      });

    const offer =
      await pc.createOffer();

    await pc.setLocalDescription(offer);

    const { error } = await supabase
      .from('live_streams')
      .update({
        offer,
        status: 'live'
      })
      .eq('id', targetStreamId);

    if (error) {
      console.error(
        'Failed to update stream offer:',
        error
      );
    }
  };

  /* =====================================================
     START GAMING STREAM
  ===================================================== */

  const handleStartGamingStream = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        alert(
          'Please sign in before starting a gaming stream.'
        );
        return;
      }

      const finalTitle =
        title.trim() ||
        `${
          user.user_metadata?.username ||
          'Gamer'
        }'s ${selectedGame} Stream 🎮`;

      const { data, error } =
        await supabase
          .from('live_streams')
          .insert([
            {
              title: finalTitle,
              host_id: user.id,
              category: selectedGame,
              privacy,
              status: 'pending'
            }
          ])
          .select()
          .single();

      if (error || !data) {
        console.error(
          'Failed to create gaming stream:',
          error
        );

        alert(
          'Failed to create the gaming stream. Please check your connection.'
        );

        return;
      }

      await initWebRTCSignaling(data.id);

      navigate(
        `/live/gaming/${data.id}`
      );
    } catch (error) {
      console.error(
        'Error starting gaming stream:',
        error
      );

      alert(
        'Something went wrong while starting your gaming stream.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     END STREAM
  ===================================================== */

  const handleConfirmEndStream = async () => {
    if (streamId) {
      await supabase
        .from('live_streams')
        .update({
          status: 'ended'
        })
        .eq('id', streamId);
    }

    setStreamEndSummary({
      duration: formatTime(streamUptime),
      peakViewers: viewerCount,
      totalLikes: likesCount,
      coinsEarned,
      game: selectedGame
    });

    stopScreenCapture();
    stopCamPreview();

    setShowEndConfirm(false);
  };

  /* =====================================================
     SQUAD SEARCH
  ===================================================== */

  const handleSearchSquadUsers = async (
    query
  ) => {
    setSquadSearchQuery(query);

    if (!query.trim()) {
      setSquadUsersList([]);
      return;
    }

    try {
      const { data, error } =
        await supabase
          .from('profiles')
          .select(
            'id, username, avatar_url'
          )
          .ilike(
            'username',
            `%${query}%`
          )
          .limit(8);

      if (error) {
        console.error(
          'Squad search error:',
          error
        );
        return;
      }

      setSquadUsersList(data || []);
    } catch (error) {
      console.error(
        'Squad search error:',
        error
      );
    }
  };

  /* =====================================================
     INVITE SQUAD MEMBER
  ===================================================== */

  const handleInviteSquadMember = async (
    user
  ) => {
    try {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      await supabase
        .from('live_guest_requests')
        .upsert({
          stream_id:
            streamId || 'pending_gaming',
          user_id: user.id,
          username:
            user.username || 'Gamer',
          avatar_url:
            user.avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          status: 'invited',
          mode: 'audio'
        });

      if (currentUser?.id) {
        await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            actor_id: currentUser.id,
            type: 'live_invite',
            description: JSON.stringify({
              stream_id:
                streamId || '',
              mode: 'audio',
              host_name:
                currentUser.user_metadata
                  ?.username ||
                'Host Gamer'
            })
          });
      }

      setSquadInvitesSent(
        (previous) =>
          new Set([
            ...previous,
            user.id
          ])
      );
    } catch (error) {
      console.error(
        'Squad invite error:',
        error
      );
    }
  };

  /* =====================================================
     SHARE LINK
  ===================================================== */

  const handleCopyStreamLink = async () => {
    const link =
      `${window.location.origin}/live/watch/` +
      `${streamId || ''}`;

    try {
      await navigator.clipboard.writeText(
        link
      );

      setCopiedLink(true);

      setTimeout(() => {
        setCopiedLink(false);
      }, 2000);
    } catch (error) {
      console.error(
        'Copy link failed:',
        error
      );
    }
  };

  /* =====================================================
     CHAT
  ===================================================== */

  const handleSendChat = (event) => {
    event?.preventDefault();

    if (!chatInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'You',
      text: chatInput.trim(),
      isHost: true,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    };

    setChatMessages((previous) => [
      ...previous,
      newMessage
    ]);

    setChatInput('');

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({
        behavior: 'smooth'
      });
    }, 100);
  };

  /* =====================================================
     SOUNDBOARD
  ===================================================== */

  const handleTriggerSound = (type) => {
    playSoundEffect(type);
    setShowSoundboard(false);
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

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
      icon: <Camera size={14} />
    },
    {
      name: 'GO WITH GUEST',
      path: '/live/guest',
      icon: <Users size={14} />
    },
    {
      name: 'MOBILE GAMING',
      mode: 'gaming',
      icon: <Gamepad2 size={14} />
    }
  ];

  const handleTabClick = (tab) => {
    if (tab.mode === 'gaming') return;

    if (tab.path) {
      navigate(tab.path);
    }
  };

  /* =====================================================
     TIME
  ===================================================== */

  const formatTime = (seconds) => {
    const hrs = Math.floor(
      seconds / 3600
    );

    const mins = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = seconds % 60;

    if (hrs > 0) {
      return [
        hrs,
        mins,
        secs
      ]
        .map((value) =>
          value.toString().padStart(2, '0')
        )
        .join(':');
    }

    return [
      mins,
      secs
    ]
      .map((value) =>
        value.toString().padStart(2, '0')
      )
      .join(':');
  };

  /* =====================================================
     CAMERA POSITION
  ===================================================== */

  const getCamPositionClass = () => {
    switch (camPosition) {
      case 'top-left':
        return 'top-4 left-4';

      case 'top-right':
        return 'top-4 right-4';

      case 'bottom-left':
        return 'bottom-4 left-4';

      default:
        return 'bottom-4 right-4';
    }
  };

  /* =====================================================
     END SUMMARY
  ===================================================== */

  if (streamEndSummary) {
    return (
      <div className="min-h-[100dvh] bg-[#06070a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/[0.08] blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
            scale: 0.97
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          className="relative w-full max-w-xl"
        >
          <div className="rounded-3xl border border-white/[0.1] bg-[#0c0e13] shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500" />

            <div className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                  <Trophy size={30} />
                </div>

                <p className="mt-5 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500">
                  Session Complete
                </p>

                <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                  Gaming Stream Ended
                </h1>

                <p className="mt-2 text-xs text-zinc-500">
                  {streamEndSummary.game}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
                <StatCard
                  icon={<Clock size={14} />}
                  label="Duration"
                  value={
                    streamEndSummary.duration
                  }
                  accent="cyan"
                />

                <StatCard
                  icon={<Users size={14} />}
                  label="Peak Viewers"
                  value={
                    streamEndSummary.peakViewers
                  }
                  accent="pink"
                />

                <StatCard
                  icon={<Heart size={14} />}
                  label="Likes"
                  value={
                    streamEndSummary.totalLikes
                  }
                  accent="pink"
                />

                <StatCard
                  icon={<Gift size={14} />}
                  label="Coins"
                  value={
                    `${streamEndSummary.coinsEarned} 🪙`
                  }
                  accent="amber"
                />
              </div>

              <button
                onClick={() =>
                  navigate('/live')
                }
                className="w-full mt-6 h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-black text-[11px] uppercase tracking-[0.15em] transition"
              >
                Back to Live
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* =====================================================
     ACTIVE GAMING DASHBOARD
  ===================================================== */

  if (streamId) {
    return (
      <div className="h-[100dvh] bg-[#06070a] text-white flex flex-col overflow-hidden font-sans">
        {/* Hidden broadcasting pipeline */}
        <div className="hidden">
          <VideoPlayer
            streamId={streamId}
            isHost={true}
            streamType="gaming"
            customStream={
              screenStream || camStream
            }
          />
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="h-16 shrink-0 border-b border-white/[0.07] bg-[#090b0f]/95 backdrop-blur-xl px-3 sm:px-5 flex items-center justify-between z-40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Gamepad2
                size={18}
                className="text-white"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">
                  Live
                </span>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[260px]">
                  {title ||
                    `${selectedGame} Gaming Session`}
                </h1>

                <span className="hidden sm:block text-[9px] text-zinc-600">
                  •
                </span>

                <span className="hidden sm:block text-[9px] text-zinc-500 truncate">
                  {selectedGame}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <Clock
                size={13}
                className="text-cyan-300"
              />

              <span className="font-mono text-[10px] text-zinc-300">
                {formatTime(streamUptime)}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <Users
                size={13}
                className="text-cyan-300"
              />

              <span className="text-[10px] font-bold text-white">
                {viewerCount}
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <Activity
                size={13}
                className="text-emerald-300"
              />

              <span className="text-[10px] font-bold text-emerald-300">
                {streamQuality}
              </span>
            </div>

            <button
              onClick={() =>
                setShowEndConfirm(true)
              }
              className="ml-1 px-3 sm:px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition"
            >
              End
            </button>
          </div>
        </header>

        {/* =================================================
            MAIN DASHBOARD
        ================================================= */}

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full max-w-[1800px] mx-auto p-2 sm:p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
            {/* ================================
                CENTER STAGE
            ================================= */}

            <div className="min-w-0 min-h-0 flex flex-col gap-3">
              <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.08] bg-[#0b0d12] overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/50 to-transparent z-20 pointer-events-none" />

                {/* Stage header */}
                <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/[0.1] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        Broadcasting
                      </span>
                    </div>

                    <div className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/[0.1]">
                      <span className="text-[9px] font-bold text-zinc-300">
                        {selectedGame}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button className="pointer-events-auto w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.1] flex items-center justify-center text-zinc-300 hover:text-white">
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Game display */}
                <div className="absolute inset-0 bg-[#050609] flex items-center justify-center">
                  {screenStream ? (
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center px-6">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-400/[0.06] border border-cyan-400/15 flex items-center justify-center text-cyan-300">
                        <MonitorPlay size={30} />
                      </div>

                      <h2 className="mt-5 text-sm sm:text-base font-black text-white">
                        No game display connected
                      </h2>

                      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 max-w-sm mx-auto">
                        Share your game window or
                        display to begin broadcasting
                        gameplay.
                      </p>

                      <button
                        onClick={
                          startScreenCapture
                        }
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[10px] font-black uppercase tracking-wider transition"
                      >
                        <Monitor size={14} />
                        Share Game
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera PIP */}
                {isCamOverlayOn && (
                  <div
                    className={`absolute ${getCamPositionClass()} z-30 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-black border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)]`}
                  >
                    <video
                      ref={camVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-2 left-2 px-1.5 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                      <span className="text-[7px] font-black uppercase tracking-wider text-white">
                        Camera
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{
                          width: `${
                            isMicOn
                              ? audioLevel
                              : 0
                          }%`
                        }}
                      />
                    </div>

                    {!isMicOn && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-red-500/80 flex items-center justify-center">
                        <MicOff size={10} />
                      </div>
                    )}
                  </div>
                )}

                {/* Chat overlay */}
                {showChatOverlay && (
                  <div className="absolute bottom-3 left-3 w-[min(360px,calc(100%-24px))] z-30">
                    <div className="rounded-xl bg-black/65 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
                      <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle
                            size={12}
                            className="text-cyan-300"
                          />

                          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">
                            Live Chat
                          </span>
                        </div>

                        <span className="text-[8px] text-zinc-600">
                          {chatMessages.length}{' '}
                          messages
                        </span>
                      </div>

                      <div className="max-h-32 overflow-y-auto p-2 space-y-1 no-scrollbar">
                        {chatMessages.length ===
                        0 ? (
                          <p className="px-2 py-3 text-[9px] text-zinc-600">
                            Your audience chat will
                            appear here.
                          </p>
                        ) : (
                          chatMessages.map(
                            (message) => (
                              <div
                                key={
                                  message.id
                                }
                                className="px-2 py-1.5 rounded-lg hover:bg-white/[0.03]"
                              >
                                <span
                                  className={`text-[9px] font-black mr-1 ${
                                    message.isHost
                                      ? 'text-pink-300'
                                      : 'text-cyan-300'
                                  }`}
                                >
                                  {message.sender}
                                </span>

                                <span className="text-[10px] text-zinc-300">
                                  {message.text}
                                </span>
                              </div>
                            )
                          )
                        )}

                        <div
                          ref={
                            chatBottomRef
                          }
                        />
                      </div>

                      <form
                        onSubmit={
                          handleSendChat
                        }
                        className="p-2 border-t border-white/[0.07] flex gap-2"
                      >
                        <input
                          value={chatInput}
                          onChange={(e) =>
                            setChatInput(
                              e.target.value
                            )
                          }
                          placeholder="Message your audience..."
                          className="min-w-0 flex-1 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] outline-none text-[10px] text-white placeholder:text-zinc-600 focus:border-cyan-400/30"
                        />

                        <button
                          type="submit"
                          className="w-8 h-8 rounded-lg bg-cyan-400 text-black flex items-center justify-center hover:bg-cyan-300 transition"
                        >
                          <Send size={12} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage toolbar */}
              <div className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
                <ToolButton
                  icon={
                    <Monitor size={15} />
                  }
                  label={
                    isScreenSharing
                      ? 'Screen Live'
                      : 'Share Screen'
                  }
                  active={
                    isScreenSharing
                  }
                  onClick={
                    startScreenCapture
                  }
                />

                <ToolButton
                  icon={
                    isCamOverlayOn ? (
                      <Video size={15} />
                    ) : (
                      <VideoOff size={15} />
                    )
                  }
                  label={
                    isCamOverlayOn
                      ? 'Camera'
                      : 'Camera Off'
                  }
                  active={
                    isCamOverlayOn
                  }
                  onClick={() =>
                    setIsCamOverlayOn(
                      (value) => !value
                    )
                  }
                />

                <ToolButton
                  icon={
                    isMicOn ? (
                      <Mic size={15} />
                    ) : (
                      <MicOff size={15} />
                    )
                  }
                  label={
                    isMicOn
                      ? 'Microphone'
                      : 'Muted'
                  }
                  active={isMicOn}
                  danger={!isMicOn}
                  onClick={toggleMic}
                />

                <ToolButton
                  icon={
                    <Music size={15} />
                  }
                  label="Soundboard"
                  onClick={() =>
                    setShowSoundboard(
                      true
                    )
                  }
                />

                <ToolButton
                  icon={
                    <Users size={15} />
                  }
                  label="Squad"
                  onClick={() =>
                    setShowSquadModal(
                      true
                    )
                  }
                />

                <ToolButton
                  icon={
                    <MessageCircle
                      size={15}
                    />
                  }
                  label="Chat"
                  active={
                    showChatOverlay
                  }
                  onClick={() =>
                    setShowChatOverlay(
                      (value) => !value
                    )
                  }
                />
              </div>
            </div>

            {/* ================================
                RIGHT CONTROL PANEL
            ================================= */}

            <aside className="min-h-0 overflow-y-auto no-scrollbar space-y-3">
              {/* Stream overview */}
              <Panel
                title="Stream Overview"
                subtitle="Your current broadcast"
                icon={
                  <Radio size={15} />
                }
              >
                <div className="p-3 grid grid-cols-2 gap-2">
                  <StatCard
                    icon={
                      <Users size={13} />
                    }
                    label="Viewers"
                    value={viewerCount}
                    accent="cyan"
                  />

                  <StatCard
                    icon={
                      <Heart size={13} />
                    }
                    label="Likes"
                    value={likesCount}
                    accent="pink"
                  />

                  <StatCard
                    icon={
                      <Gift size={13} />
                    }
                    label="Coins"
                    value={`${coinsEarned} 🪙`}
                    accent="amber"
                  />

                  <StatCard
                    icon={
                      <Clock size={13} />
                    }
                    label="Uptime"
                    value={formatTime(
                      streamUptime
                    )}
                    accent="emerald"
                  />
                </div>
              </Panel>

              {/* Game */}
              <Panel
                title="Game"
                subtitle="Current category"
                icon={
                  <Gamepad2 size={15} />
                }
              >
                <div className="p-3">
                  <div className="rounded-xl border border-pink-400/15 bg-pink-400/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-400/15 flex items-center justify-center text-pink-300">
                          <Gamepad2
                            size={17}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-white truncate">
                            {selectedGame}
                          </p>

                          <p className="text-[9px] text-zinc-500 mt-0.5">
                            Gaming category
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className="text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Stream controls */}
              <Panel
                title="Broadcast Controls"
                subtitle="Quick stream actions"
                icon={
                  <Sliders size={15} />
                }
              >
                <div className="p-3 space-y-2">
                  <button
                    onClick={
                      startScreenCapture
                    }
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] transition"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor
                        size={16}
                        className="text-cyan-300"
                      />

                      <div className="text-left">
                        <p className="text-[10px] font-bold text-white">
                          Game Display
                        </p>

                        <p className="text-[8px] text-zinc-600">
                          {isScreenSharing
                            ? 'Currently sharing'
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-2 h-2 rounded-full ${
                        isScreenSharing
                          ? 'bg-emerald-400'
                          : 'bg-zinc-700'
                      }`}
                    />
                  </button>

                  <button
                    onClick={
                      handleCopyStreamLink
                    }
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] transition"
                  >
                    <div className="flex items-center gap-3">
                      <Share2
                        size={16}
                        className="text-cyan-300"
                      />

                      <div className="text-left">
                        <p className="text-[10px] font-bold text-white">
                          Share Stream
                        </p>

                        <p className="text-[8px] text-zinc-600">
                          Send your live link
                        </p>
                      </div>
                    </div>

                    {copiedLink ? (
                      <Check
                        size={14}
                        className="text-emerald-400"
                      />
                    ) : (
                      <Copy
                        size={14}
                        className="text-zinc-600"
                      />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setShowSettingsModal(
                        true
                      )
                    }
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.05] transition"
                  >
                    <div className="flex items-center gap-3">
                      <Settings
                        size={16}
                        className="text-zinc-400"
                      />

                      <div className="text-left">
                        <p className="text-[10px] font-bold text-white">
                          Stream Settings
                        </p>

                        <p className="text-[8px] text-zinc-600">
                          Quality, privacy & camera
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      className="text-zinc-600"
                    />
                  </button>
                </div>
              </Panel>

              {/* Camera status */}
              <Panel
                title="Camera & Audio"
                subtitle="Broadcast hardware"
                icon={
                  <Camera size={15} />
                }
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      {isCamOverlayOn ? (
                        <Video
                          size={14}
                          className="text-pink-300"
                        />
                      ) : (
                        <VideoOff
                          size={14}
                          className="text-zinc-600"
                        />
                      )}

                      <span className="text-[10px] font-bold">
                        Face Camera
                      </span>
                    </div>

                    <span
                      className={`text-[8px] font-black uppercase ${
                        isCamOverlayOn
                          ? 'text-emerald-300'
                          : 'text-zinc-600'
                      }`}
                    >
                      {isCamOverlayOn
                        ? 'ON'
                        : 'OFF'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      {isMicOn ? (
                        <Mic
                          size={14}
                          className="text-emerald-300"
                        />
                      ) : (
                        <MicOff
                          size={14}
                          className="text-red-300"
                        />
                      )}

                      <span className="text-[10px] font-bold">
                        Microphone
                      </span>
                    </div>

                    <span
                      className={`text-[8px] font-black uppercase ${
                        isMicOn
                          ? 'text-emerald-300'
                          : 'text-red-300'
                      }`}
                    >
                      {isMicOn
                        ? 'LIVE'
                        : 'MUTED'}
                    </span>
                  </div>
                </div>
              </Panel>

              {/* End */}
              <button
                onClick={() =>
                  setShowEndConfirm(
                    true
                  )
                }
                className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 text-red-300 font-black text-[10px] uppercase tracking-[0.15em] transition"
              >
                End Gaming Stream
              </button>
            </aside>
          </div>
        </main>

        {/* =================================================
            MODALS
        ================================================= */}

        <AnimatePresence>
          {showSoundboard && (
            <ModalShell
              onClose={() =>
                setShowSoundboard(false)
              }
              size="max-w-lg"
            >
              <ModalHeader
                icon={
                  <Music size={17} />
                }
                title="Stream Soundboard"
                subtitle="Trigger live reactions"
                onClose={() =>
                  setShowSoundboard(false)
                }
              />

              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'victory',
                    label: 'Victory',
                    icon: <Trophy size={20} />,
                    style:
                      'text-amber-300 border-amber-400/15 bg-amber-400/[0.05]'
                  },
                  {
                    id: 'defeat',
                    label: 'Defeat',
                    icon: <Flame size={20} />,
                    style:
                      'text-red-300 border-red-400/15 bg-red-400/[0.05]'
                  },
                  {
                    id: 'gg',
                    label: 'Good Game',
                    icon: <Sparkles size={20} />,
                    style:
                      'text-emerald-300 border-emerald-400/15 bg-emerald-400/[0.05]'
                  },
                  {
                    id: 'airhorn',
                    label: 'Airhorn',
                    icon: <Zap size={20} />,
                    style:
                      'text-cyan-300 border-cyan-400/15 bg-cyan-400/[0.05]'
                  },
                  {
                    id: 'hype',
                    label: 'Hype',
                    icon: <Crown size={20} />,
                    style:
                      'text-pink-300 border-pink-400/15 bg-pink-400/[0.05]'
                  },
                  {
                    id: 'clap',
                    label: 'Applause',
                    icon: <Award size={20} />,
                    style:
                      'text-purple-300 border-purple-400/15 bg-purple-400/[0.05]'
                  }
                ].map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() =>
                      handleTriggerSound(
                        sound.id
                      )
                    }
                    className={`min-h-28 rounded-xl border flex flex-col items-center justify-center gap-3 hover:bg-white/[0.05] active:scale-[0.98] transition ${sound.style}`}
                  >
                    {sound.icon}

                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {sound.label}
                    </span>
                  </button>
                ))}
              </div>
            </ModalShell>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSquadModal && (
            <ModalShell
              onClose={() =>
                setShowSquadModal(false)
              }
              size="max-w-lg"
            >
              <ModalHeader
                icon={
                  <Users size={17} />
                }
                title="Gaming Squad"
                subtitle="Invite co-hosts to your session"
                onClose={() =>
                  setShowSquadModal(false)
                }
              />

              <div className="p-4 space-y-4">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  />

                  <input
                    value={
                      squadSearchQuery
                    }
                    onChange={(e) =>
                      handleSearchSquadUsers(
                        e.target.value
                      )
                    }
                    placeholder="Search by username..."
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-white/[0.035] border border-white/[0.08] outline-none text-[10px] text-white placeholder:text-zinc-600 focus:border-cyan-400/30"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                  {squadUsersList.length ===
                  0 ? (
                    <div className="py-10 text-center">
                      <Users
                        size={24}
                        className="mx-auto text-zinc-700"
                      />

                      <p className="mt-3 text-[10px] text-zinc-600">
                        Search for gamers to
                        invite.
                      </p>
                    </div>
                  ) : (
                    squadUsersList.map(
                      (user) => {
                        const invited =
                          squadInvitesSent.has(
                            user.id
                          );

                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={
                                  user.avatar_url ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                                }
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-white/10"
                              />

                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-white truncate">
                                  @
                                  {
                                    user.username
                                  }
                                </p>

                                <p className="text-[8px] text-zinc-600 mt-0.5">
                                  Gamer
                                </p>
                              </div>
                            </div>

                            <button
                              disabled={
                                invited
                              }
                              onClick={() =>
                                handleInviteSquadMember(
                                  user
                                )
                              }
                              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase ${
                                invited
                                  ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/15'
                                  : 'bg-cyan-400 text-black hover:bg-cyan-300'
                              }`}
                            >
                              {invited
                                ? 'Invited'
                                : 'Invite'}
                            </button>
                          </div>
                        );
                      }
                    )
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.07]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-white">
                        Share stream link
                      </p>

                      <p className="text-[8px] text-zinc-600 mt-0.5">
                        Invite someone directly
                      </p>
                    </div>

                    <button
                      onClick={
                        handleCopyStreamLink
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.07] text-[9px] font-bold text-zinc-300 hover:text-white"
                    >
                      {copiedLink ? (
                        <Check
                          size={13}
                          className="text-emerald-300"
                        />
                      ) : (
                        <Copy size={13} />
                      )}

                      {copiedLink
                        ? 'Copied'
                        : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            </ModalShell>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettingsModal && (
            <ModalShell
              onClose={() =>
                setShowSettingsModal(false)
              }
              size="max-w-lg"
            >
              <ModalHeader
                icon={
                  <Settings size={17} />
                }
                title="Gaming Settings"
                subtitle="Configure your broadcast"
                onClose={() =>
                  setShowSettingsModal(false)
                }
              />

              <div className="p-4 space-y-5">
                {/* QUALITY */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Stream Quality
                    </label>

                    <span className="text-[9px] text-cyan-300">
                      {streamQuality}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      '1080p 60FPS',
                      '720p 60FPS',
                      '480p 30FPS'
                    ].map((quality) => (
                      <button
                        key={quality}
                        onClick={() =>
                          setStreamQuality(
                            quality
                          )
                        }
                        className={`py-3 rounded-xl border text-[9px] font-bold transition ${
                          streamQuality ===
                          quality
                            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                            : 'border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-white'
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PRIVACY */}
                <div>
                  <label className="block mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Audience Privacy
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'public',
                        label: 'Public',
                        icon: (
                          <Globe
                            size={14}
                          />
                        )
                      },
                      {
                        id: 'followers',
                        label: 'Followers',
                        icon: (
                          <UserCheck
                            size={14}
                          />
                        )
                      },
                      {
                        id: 'private',
                        label: 'Private',
                        icon: (
                          <Lock
                            size={14}
                          />
                        )
                      }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setPrivacy(
                            item.id
                          )
                        }
                        className={`py-3 rounded-xl border flex flex-col items-center gap-1.5 text-[9px] font-bold transition ${
                          privacy ===
                          item.id
                            ? 'border-pink-400/30 bg-pink-400/10 text-pink-200'
                            : 'border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CAMERA POSITION */}
                <div>
                  <label className="block mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Camera Position
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'top-left',
                        name: 'Top Left'
                      },
                      {
                        id: 'top-right',
                        name: 'Top Right'
                      },
                      {
                        id: 'bottom-left',
                        name: 'Bottom Left'
                      },
                      {
                        id: 'bottom-right',
                        name: 'Bottom Right'
                      }
                    ].map((position) => (
                      <button
                        key={
                          position.id
                        }
                        onClick={() =>
                          setCamPosition(
                            position.id
                          )
                        }
                        className={`py-2.5 rounded-xl border text-[9px] font-bold transition ${
                          camPosition ===
                          position.id
                            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                            : 'border-white/[0.07] bg-white/[0.025] text-zinc-500'
                        }`}
                      >
                        {position.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setShowSettingsModal(
                      false
                    )
                  }
                  className="w-full h-11 rounded-xl bg-white text-black hover:bg-zinc-200 font-black text-[10px] uppercase tracking-[0.15em] transition"
                >
                  Save Settings
                </button>
              </div>
            </ModalShell>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEndConfirm && (
            <ModalShell
              onClose={() =>
                setShowEndConfirm(false)
              }
              size="max-w-sm"
            >
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-300">
                  <Radio size={22} />
                </div>

                <h3 className="mt-5 text-sm font-black uppercase tracking-wider">
                  End Gaming Stream?
                </h3>

                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  This will end the current
                  broadcast for all viewers.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={
                      handleConfirmEndStream
                    }
                    className="h-11 rounded-xl bg-red-500 hover:bg-red-400 text-white text-[9px] font-black uppercase tracking-wider transition"
                  >
                    End Stream
                  </button>

                  <button
                    onClick={() =>
                      setShowEndConfirm(
                        false
                      )
                    }
                    className="h-11 rounded-xl bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.08] text-zinc-300 text-[9px] font-black uppercase tracking-wider transition"
                  >
                    Keep Live
                  </button>
                </div>
              </div>
            </ModalShell>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* =====================================================
     PRE-STREAM STUDIO
  ===================================================== */

  return (
    <div className="min-h-[100dvh] bg-[#06070a] text-white font-sans overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.045] blur-[140px]" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-pink-500/[0.045] blur-[140px]" />
      </div>

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="h-16 border-b border-white/[0.07] bg-[#090b0f]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X size={17} />
          </button>

          <div className="hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Create
            </p>

            <h1 className="text-xs font-black uppercase tracking-wider">
              Gaming Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setShowSettingsModal(
                true
              )
            }
            className="h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] flex items-center gap-2 text-zinc-400 hover:text-white transition"
          >
            <Settings size={15} />

            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wider">
              Settings
            </span>
          </button>

          <button
            onClick={() =>
              setIsCamOverlayOn(
                (value) => !value
              )
            }
            className={`h-9 px-3 rounded-xl border flex items-center gap-2 transition ${
              isCamOverlayOn
                ? 'border-pink-400/20 bg-pink-400/[0.06] text-pink-300'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-500'
            }`}
          >
            {isCamOverlayOn ? (
              <Video size={15} />
            ) : (
              <VideoOff size={15} />
            )}

            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wider">
              Camera
            </span>
          </button>

          <button
            onClick={toggleMic}
            className={`h-9 px-3 rounded-xl border flex items-center gap-2 transition ${
              isMicOn
                ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300'
                : 'border-red-400/20 bg-red-400/[0.06] text-red-300'
            }`}
          >
            {isMicOn ? (
              <Mic size={15} />
            ) : (
              <MicOff size={15} />
            )}

            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wider">
              {isMicOn
                ? 'Mic'
                : 'Muted'}
            </span>
          </button>
        </div>
      </header>

      {/* =================================================
          STUDIO CONTENT
      ================================================= */}

      <main className="relative z-10 h-[calc(100dvh-64px)] overflow-y-auto no-scrollbar">
        <div className="max-w-[1450px] mx-auto p-3 sm:p-5 lg:p-6">
          {/* Page heading */}
          <div className="mb-5">
            <div className="flex items-center gap-2 text-cyan-300">
              <Gamepad2 size={15} />

              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                Gaming Broadcast
              </span>
            </div>

            <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
                  Set up your gaming stream
                </h2>

                <p className="mt-1 text-[10px] sm:text-xs text-zinc-500">
                  Configure your gameplay,
                  camera and broadcast details
                  before going live.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.025]">
                <Shield
                  size={13}
                  className="text-emerald-300"
                />

                <span className="text-[9px] font-bold text-zinc-400">
                  Broadcast ready
                </span>
              </div>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
            {/* LEFT */}
            <div className="space-y-4">
              {/* Preview */}
              <Panel
                title="Broadcast Preview"
                subtitle="What your audience will see"
                icon={
                  <MonitorPlay
                    size={15}
                  />
                }
                action={
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300">
                      Ready
                    </span>
                  </div>
                }
              >
                <div className="p-3 sm:p-4">
                  <div className="aspect-video rounded-xl overflow-hidden bg-[#050609] border border-white/[0.08] relative">
                    {isScreenSharing ? (
                      <video
                        ref={
                          screenVideoRef
                        }
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-400/[0.06] border border-cyan-400/15 flex items-center justify-center text-cyan-300">
                          <Monitor
                            size={26}
                          />
                        </div>

                        <h3 className="mt-4 text-xs sm:text-sm font-black">
                          Select your game display
                        </h3>

                        <p className="mt-1.5 max-w-sm text-[9px] sm:text-[10px] text-zinc-600 leading-relaxed">
                          Choose the game window or
                          monitor you want to broadcast.
                        </p>

                        <button
                          onClick={
                            startScreenCapture
                          }
                          className="mt-4 h-10 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition"
                        >
                          <Monitor size={14} />
                          Select Display
                        </button>
                      </div>
                    )}

                    {/* camera */}
                    {isCamOverlayOn && (
                      <div
                        className={`absolute ${getCamPositionClass()} w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-black border border-pink-400/30 shadow-xl`}
                      >
                        <video
                          ref={
                            camVideoRef
                          }
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute top-1.5 left-1.5 px-1.5 py-1 rounded-md bg-black/60">
                          <span className="text-[7px] font-black uppercase">
                            Cam
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                          <div
                            className="h-full bg-emerald-400"
                            style={{
                              width: `${
                                isMicOn
                                  ? audioLevel
                                  : 0
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Preview badge */}
                    <div className="absolute top-3 left-3">
                      <div className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/[0.08] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />

                        <span className="text-[7px] font-black uppercase tracking-wider text-zinc-300">
                          Preview
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preview actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <ToolButton
                      icon={
                        <Monitor size={14} />
                      }
                      label={
                        isScreenSharing
                          ? 'Display Active'
                          : 'Share Display'
                      }
                      active={
                        isScreenSharing
                      }
                      onClick={
                        startScreenCapture
                      }
                    />

                    <ToolButton
                      icon={
                        isCamOverlayOn ? (
                          <Video size={14} />
                        ) : (
                          <VideoOff size={14} />
                        )
                      }
                      label={
                        isCamOverlayOn
                          ? 'Camera On'
                          : 'Camera Off'
                      }
                      active={
                        isCamOverlayOn
                      }
                      onClick={() =>
                        setIsCamOverlayOn(
                          (value) =>
                            !value
                        )
                      }
                    />

                    <ToolButton
                      icon={
                        isMicOn ? (
                          <Mic size={14} />
                        ) : (
                          <MicOff size={14} />
                        )
                      }
                      label={
                        isMicOn
                          ? 'Mic On'
                          : 'Mic Off'
                      }
                      active={isMicOn}
                      danger={!isMicOn}
                      onClick={toggleMic}
                    />

                    <ToolButton
                      icon={
                        <Settings
                          size={14}
                        />
                      }
                      label="Camera Settings"
                      onClick={() =>
                        setShowSettingsModal(
                          true
                        )
                      }
                    />
                  </div>
                </div>
              </Panel>

              {/* Game selection */}
              <Panel
                title="Choose Game"
                subtitle="Select the category for your broadcast"
                icon={
                  <Gamepad2 size={15} />
                }
              >
                <div className="p-4">
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      value={
                        customGameSearch
                      }
                      onChange={(e) =>
                        setCustomGameSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search games..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.025] border border-white/[0.07] outline-none text-[10px] text-white placeholder:text-zinc-600 focus:border-cyan-400/30"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filteredGames.map(
                      (game) => {
                        const active =
                          selectedGame ===
                          game;

                        return (
                          <button
                            key={game}
                            onClick={() => {
                              setSelectedGame(
                                game
                              );

                              setTitle(
                                `Streaming ${game} Ranked Push! 🎮🔥`
                              );
                            }}
                            className={`px-3 py-2 rounded-lg border text-[9px] sm:text-[10px] font-bold transition ${
                              active
                                ? 'bg-pink-500/10 border-pink-400/25 text-pink-200'
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            {game}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </Panel>

              {/* Title */}
              <Panel
                title="Stream Information"
                subtitle="Give your audience a reason to join"
                icon={
                  <Radio size={15} />
                }
              >
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                      Stream Title
                    </label>

                    <input
                      value={title}
                      onChange={(e) =>
                        setTitle(
                          e.target.value
                        )
                      }
                      placeholder={`Title for your ${selectedGame} stream...`}
                      className="w-full h-11 px-3 rounded-xl bg-white/[0.025] border border-white/[0.07] outline-none text-[11px] text-white placeholder:text-zinc-600 focus:border-cyan-400/30"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Quick Titles
                      </label>

                      <span className="text-[8px] text-zinc-700">
                        Tap to use
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {titleTemplates.map(
                        (
                          template,
                          index
                        ) => (
                          <button
                            key={index}
                            onClick={() =>
                              setTitle(
                                template
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.025] border border-white/[0.06] text-[8px] sm:text-[9px] text-zinc-500 hover:text-white hover:border-white/[0.12] transition"
                          >
                            {template}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              {/* Configuration */}
              <Panel
                title="Broadcast Configuration"
                subtitle="Configure before going live"
                icon={
                  <Sliders size={15} />
                }
              >
                <div className="p-4 space-y-4">
                  {/* Quality */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        Quality
                      </span>

                      <span className="text-[9px] font-bold text-cyan-300">
                        {streamQuality}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        '1080p 60FPS',
                        '720p 60FPS',
                        '480p 30FPS'
                      ].map((quality) => (
                        <button
                          key={quality}
                          onClick={() =>
                            setStreamQuality(
                              quality
                            )
                          }
                          className={`py-2.5 rounded-lg border text-[8px] font-bold ${
                            streamQuality ===
                            quality
                              ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                              : 'border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:text-white'
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Privacy */}
                  <div>
                    <span className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                      Audience
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: 'public',
                          label: 'Public',
                          icon: (
                            <Globe
                              size={13}
                            />
                          )
                        },
                        {
                          id: 'followers',
                          label: 'Followers',
                          icon: (
                            <Users
                              size={13}
                            />
                          )
                        },
                        {
                          id: 'private',
                          label: 'Private',
                          icon: (
                            <Lock
                              size={13}
                            />
                          )
                        }
                      ].map(
                        (option) => (
                          <button
                            key={
                              option.id
                            }
                            onClick={() =>
                              setPrivacy(
                                option.id
                              )
                            }
                            className={`py-2.5 rounded-lg border flex flex-col items-center gap-1 text-[8px] font-bold ${
                              privacy ===
                              option.id
                                ? 'border-pink-400/25 bg-pink-400/10 text-pink-200'
                                : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
                            }`}
                          >
                            {
                              option.icon
                            }
                            {
                              option.label
                            }
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Camera position */}
                  <div>
                    <span className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                      Camera Position
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [
                          'top-left',
                          'Top Left'
                        ],
                        [
                          'top-right',
                          'Top Right'
                        ],
                        [
                          'bottom-left',
                          'Bottom Left'
                        ],
                        [
                          'bottom-right',
                          'Bottom Right'
                        ]
                      ].map(
                        ([id, label]) => (
                          <button
                            key={id}
                            onClick={() =>
                              setCamPosition(
                                id
                              )
                            }
                            className={`py-2.5 rounded-lg border text-[8px] font-bold ${
                              camPosition ===
                              id
                                ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                                : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Stream checklist */}
              <Panel
                title="Stream Checklist"
                subtitle="Make sure everything is ready"
                icon={
                  <Shield size={15} />
                }
              >
                <div className="p-4 space-y-2">
                  {[
                    {
                      label: 'Game selected',
                      ok: !!selectedGame
                    },
                    {
                      label: 'Stream title',
                      ok: !!title.trim()
                    },
                    {
                      label: 'Camera ready',
                      ok: !!camStream
                    },
                    {
                      label: 'Microphone ready',
                      ok: !!camStream
                    }
                  ].map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.025] border border-white/[0.05]"
                      >
                        <span className="text-[9px] font-bold text-zinc-400">
                          {item.label}
                        </span>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            item.ok
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : 'bg-zinc-800 text-zinc-700'
                          }`}
                        >
                          {item.ok ? (
                            <Check
                              size={11}
                            />
                          ) : (
                            <X
                              size={11}
                            />
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </Panel>

              {/* Start */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0b0d12] p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-400/15 flex items-center justify-center text-pink-300">
                    <Play
                      size={16}
                      fill="currentColor"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">
                      Ready to broadcast?
                    </p>

                    <p className="text-[8px] text-zinc-600 mt-0.5">
                      Your audience is waiting.
                    </p>
                  </div>
                </div>

                <button
                  onClick={
                    handleStartGamingStream
                  }
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-400 text-white shadow-[0_12px_35px_rgba(236,72,153,0.18)] hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                        Starting...
                      </span>
                    </>
                  ) : (
                    <>
                      <Radio size={16} />

                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                        Start Gaming Stream
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =================================================
          SETTINGS MODAL
      ================================================= */}

      <AnimatePresence>
        {showSettingsModal && (
          <ModalShell
            onClose={() =>
              setShowSettingsModal(false)
            }
            size="max-w-lg"
          >
            <ModalHeader
              icon={
                <Settings size={17} />
              }
              title="Gaming Settings"
              subtitle="Configure your broadcast"
              onClose={() =>
                setShowSettingsModal(
                  false
                )
              }
            />

            <div className="p-4 space-y-5">
              <div>
                <label className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  Stream Quality
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    '1080p 60FPS',
                    '720p 60FPS',
                    '480p 30FPS'
                  ].map((quality) => (
                    <button
                      key={quality}
                      onClick={() =>
                        setStreamQuality(
                          quality
                        )
                      }
                      className={`py-3 rounded-xl border text-[9px] font-bold ${
                        streamQuality ===
                        quality
                          ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  Audience Privacy
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    'public',
                    'followers',
                    'private'
                  ].map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setPrivacy(value)
                      }
                      className={`py-3 rounded-xl border text-[9px] font-bold uppercase ${
                        privacy === value
                          ? 'border-pink-400/25 bg-pink-400/10 text-pink-200'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  Camera Position
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    [
                      'top-left',
                      'Top Left'
                    ],
                    [
                      'top-right',
                      'Top Right'
                    ],
                    [
                      'bottom-left',
                      'Bottom Left'
                    ],
                    [
                      'bottom-right',
                      'Bottom Right'
                    ]
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() =>
                        setCamPosition(
                          id
                        )
                      }
                      className={`py-3 rounded-xl border text-[9px] font-bold ${
                        camPosition === id
                          ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() =>
                  setShowSettingsModal(
                    false
                  )
                }
                className="w-full h-11 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-wider"
              >
                Save Settings
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* =================================================
          BOTTOM NAV
      ================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#080a0e]/95 backdrop-blur-xl border-t border-white/[0.07]">
        <div className="h-full max-w-3xl mx-auto px-2 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive =
              activeTab ===
              tab.name;

            return (
              <button
                key={tab.name}
                onClick={() =>
                  handleTabClick(tab)
                }
                disabled={loading}
                className={`relative h-full min-w-[64px] sm:min-w-[90px] flex flex-col items-center justify-center gap-1 transition ${
                  isActive
                    ? 'text-pink-300'
                    : 'text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {tab.icon && (
                  <span
                    className={
                      isActive
                        ? 'text-pink-300'
                        : ''
                    }
                  >
                    {tab.icon}
                  </span>
                )}

                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.12em] whitespace-nowrap">
                  {tab.name}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="gaming-nav"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-pink-400"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom-nav spacing */}
      <div className="h-16" />
    </div>
  );
};

export default MobileGamingSetup;
