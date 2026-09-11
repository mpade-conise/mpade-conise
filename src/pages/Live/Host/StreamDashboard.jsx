// src/pages/Live/Host/StreamDashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Gift, BarChart3, Share2, HelpCircle, BarChart,
  Smile, X, UserPlus, Swords, Mic, MicOff, Video, VideoOff, Settings, Radio
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

const StreamDashboard = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  // --- UI SWITCHES & TOGGLES ---
  const [activePanel, setActivePanel] = useState(null);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [giftsEnabled, setGiftsEnabled] = useState(true);
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [fps, setFps] = useState(30);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [notice, setNotice] = useState(null);

  // --- COMPONENT DATA STORAGE ---
  const [streamData, setStreamData] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [battleScores, setBattleScores] = useState({ host: 0, challenger: 0 });
  const [peakViewers, setPeakViewers] = useState(0);
  const [startedAt, setStartedAt] = useState(null);

  // DOM node link to explicitly bind remote challenger streams from the WebRTC hook
  const challengerVideoRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const reactionTimersRef = useRef(new Map());
  const endingRef = useRef(false);

  // 1. EXECUTE ABSTRACTED WEBSOCKET NETWORK CONTROLLER
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

  // 2. EXECUTE ABSTRACTED WEBRTC HARDWARE CONTROLLER
  const {
    localVideoRef,
    hardwareReady
  } = useStreamWebRTC(streamId, socket, isCameraOff, isMuted, challengerVideoRef);

  const currentViewers = Array.isArray(viewers) ? viewers.length : Number(viewers || 0);

  // --- TOAST / NOTICE ---
  const showNotice = (message, type = 'info') => {
    setNotice({ message, type });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3000);
  };

  // --- STREAM DURATION ---
  const getStreamDuration = () => {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  };

  // --- FETCH METADATA & SYNC DATABASE LIFECYCLE ---
  useEffect(() => {
    let cancelled = false;

    const fetchMeta = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*, host:host_id(username, avatar_url)')
        .eq('id', streamId)
        .single();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load live stream:', error);
        showNotice('Unable to load the live stream.', 'error');
        return;
      }

      if (data) {
        setStreamData(data);
        setStartedAt(data.started_at || new Date().toISOString());
        setBattleScores({
          host: Number(data.host_battle_points || 0),
          challenger: Number(data.challenger_battle_points || 0)
        });
        setCommentsEnabled(data.comments_enabled !== false);
        setGiftsEnabled(data.gifts_enabled !== false);
        setReactionsEnabled(data.reactions_enabled !== false);
      }
    };

    if (streamId) fetchMeta();

    return () => {
      cancelled = true;
    };
  }, [streamId]);

  // --- PEAK VIEWERS ---
  useEffect(() => {
    if (currentViewers > peakViewers) setPeakViewers(currentViewers);
  }, [currentViewers, peakViewers]);

  // --- ONLINE/OFFLINE MONITOR ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotice('Connection restored.', 'success');
      socket?.emit?.('stream_connection_state', { streamId, state: 'online' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotice('Network connection lost. Reconnecting...', 'error');
      socket?.emit?.('stream_connection_state', { streamId, state: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket, streamId]);

  // --- SET LIVE WHEN HARDWARE IS READY ---
  useEffect(() => {
    if (!hardwareReady || !streamId || endingRef.current) return;

    const activateStream = async () => {
      const { error } = await supabase
        .from('live_streams')
        .update({ status: 'live' })
        .eq('id', streamId);

      if (error) {
        console.error('Unable to activate live stream:', error);
        return;
      }

      setStreamData(prev => prev ? { ...prev, status: 'live' } : prev);
    };

    activateStream();
  }, [hardwareReady, streamId]);

  // --- REACTION LIFECYCLE ---
  useEffect(() => {
    if (!reactionTrigger || !reactionsEnabled) return;

    const reactionId = reactionTrigger.id || `${Date.now()}-${Math.random()}`;
    const reaction = { ...reactionTrigger, id: reactionId };

    setReactions(prev => [...prev, reaction]);

    const timer = setTimeout(() => {
      setReactions(prev => prev.filter(item => item.id !== reactionId));
      reactionTimersRef.current.delete(reactionId);
    }, 2000);

    reactionTimersRef.current.set(reactionId, timer);

    return () => {
      clearTimeout(timer);
      reactionTimersRef.current.delete(reactionId);
    };
  }, [reactionTrigger, reactionsEnabled]);

  // --- VIDEO FILTER CONTROLLER ---
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

      const detail = event?.detail || {};
      const { type, key, value } = detail;

      if (type === 'beautify') fxState.smoothing = Number(value) || 0;
      if (type === 'morph' && key in fxState) fxState[key] = Number(value) || 0;
      if (type === 'lut') fxState.lut = key || 'none';
      if (type === 'fx') fxState.fx = key || 'none';

      let filterString = '';
      let transformString = 'scaleX(-1)';

      if (fxState.lut === 'retro') filterString += 'sepia(35%) contrast(110%) saturate(90%) hue-rotate(-5deg) ';
      if (fxState.lut === 'cyberpunk') filterString += 'hue-rotate(135deg) saturate(165%) contrast(115%) ';
      if (fxState.lut === 'noir') filterString += 'grayscale(100%) contrast(140%) brightness(95%) ';
      if (fxState.lut === 'golden') filterString += 'sepia(20%) saturate(140%) brightness(105%) hue-rotate(10deg) ';
      if (fxState.lut === 'tropic') filterString += 'saturate(180%) contrast(105%) hue-rotate(-5deg) ';

      if (fxState.fx === 'vhs') filterString += 'contrast(120%) saturate(130%) hue-rotate(15deg) brightness(105%) ';
      if (fxState.fx === 'manga') filterString += 'grayscale(100%) contrast(300%) ';
      if (fxState.fx === 'thermal') filterString += 'hue-rotate(240deg) saturate(200%) invert(100%) ';

      if (fxState.smoothing > 0) {
        filterString += `blur(${fxState.smoothing * 0.15}px) contrast(${100 + (fxState.smoothing * 1.5)}%) brightness(${100 + (fxState.smoothing * 1.2)}%) `;
      }

      if (fxState.slim > 0 || fxState.jawline > 0) {
        const horizontalCompression = 1 - (fxState.slim * 0.015) - (fxState.jawline * 0.008);
        transformString += ` scaleX(${horizontalCompression})`;
      }

      if (fxState.eyes > 0) {
        const eyeExpansion = 1 + (fxState.eyes * 0.012);
        transformString += ` scaleY(${eyeExpansion})`;
      }

      videoElement.style.filter = filterString.trim() || 'none';
      videoElement.style.transform = transformString;
    };

    window.addEventListener('mpade-video-filter', handleFilterChange);
    return () => window.removeEventListener('mpade-video-filter', handleFilterChange);
  }, [localVideoRef]);

  // --- BATTLE INVITE ---
  const handleAcceptInvite = async () => {
    if (!incomingInvite || !socket || !streamId) return;

    try {
      const peerId = incomingInvite.senderHostId || incomingInvite.host_id || incomingInvite.senderId || '';
      const peerStreamId = incomingInvite.senderStreamId || incomingInvite.hostRoomId || incomingInvite.stream_id || '';

      if (!peerId || !peerStreamId) {
        showNotice('Battle invitation is missing required information.', 'error');
        return;
      }

      socket.emit('accept_battle_invite', {
        hostRoomId: streamId,
        challengerRoomId: peerStreamId,
        senderHostId: peerId
      });

      setIsBattleMode(true);
      setIncomingInvite(null);
      showNotice('Battle connection accepted.', 'success');
    } catch (error) {
      console.error('Battle connection setup failed:', error);
      showNotice('Unable to accept battle invitation.', 'error');
    }
  };

  const handleDeclineInvite = () => {
    if (socket && incomingInvite) {
      socket.emit('decline_battle_invite', {
        streamId,
        senderHostId: incomingInvite.senderHostId || incomingInvite.host_id || incomingInvite.senderId || ''
      });
    }
    setIncomingInvite(null);
  };

  const handleEndBattle = () => {
    if (socket) socket.emit('end_battle', { streamId });
    setIsBattleMode(false);
    setBattleScores({ host: 0, challenger: 0 });
    showNotice('Battle ended.', 'info');
  };

  const handleBattleInvite = () => {
    setActivePanel('battle');
    showNotice('Open the battle controls to invite a challenger.', 'info');
  };

  // --- VIEWER / MODERATION EVENTS ---
  const handleDropUser = viewer => {
    const viewerId = viewer?.id || viewer?.user_id || viewer?.userId || viewer;
    if (!viewerId || !socket) return;

    socket.emit('remove_viewer', { streamId, viewerId });
    showNotice('Viewer removed from the live.', 'success');
  };

  const handleDropAll = () => {
    if (!socket) return;

    socket.emit('remove_all_viewers', { streamId });
    showNotice('Viewer removal request sent.', 'success');
  };

  const handleMuteUser = viewer => {
    const viewerId = viewer?.id || viewer?.user_id || viewer?.userId || viewer;
    if (!viewerId || !socket) return;

    socket.emit('mute_viewer', { streamId, viewerId });
    showNotice('Viewer muted.', 'success');
  };

  const handleBanUser = viewer => {
    const viewerId = viewer?.id || viewer?.user_id || viewer?.userId || viewer;
    if (!viewerId || !socket) return;

    socket.emit('ban_viewer', { streamId, viewerId });
    showNotice('Viewer banned.', 'success');
  };

  const handleReportUser = viewer => {
    const viewerId = viewer?.id || viewer?.user_id || viewer?.userId || viewer;
    if (!viewerId) return;

    socket?.emit?.('report_viewer', { streamId, viewerId });
    showNotice('Viewer report submitted.', 'success');
  };

  // --- CHAT / STREAM SETTINGS ---
  const handleChatFilterChange = filter => {
    setChatFilter(filter);
    socket?.emit?.('chat_filter_change', { streamId, filter });
  };

  const handleToggleComments = enabled => {
    setCommentsEnabled(enabled);
    socket?.emit?.('stream_chat_settings', { streamId, commentsEnabled: enabled });
  };

  const handleToggleGifts = enabled => {
    setGiftsEnabled(enabled);
    socket?.emit?.('stream_gift_settings', { streamId, giftsEnabled: enabled });
  };

  const handleToggleReactions = enabled => {
    setReactionsEnabled(enabled);
    socket?.emit?.('stream_reaction_settings', { streamId, reactionsEnabled: enabled });
  };

  const handleQualityChange = nextQuality => {
    setQuality(nextQuality);
    socket?.emit?.('stream_quality_change', { streamId, quality: nextQuality, dataSaver });
  };

  const handleFpsChange = nextFps => {
    setFps(nextFps);
    socket?.emit?.('stream_fps_change', { streamId, fps: nextFps });
  };

  const handleDataSaverChange = enabled => {
    setDataSaver(enabled);
    socket?.emit?.('stream_data_saver_change', { streamId, enabled, quality });
  };

  // --- SHARE ---
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/live/${streamId}`;
    const shareData = {
      title: streamData?.title || 'Live on Made Universe',
      text: streamData?.title ? `Join my live: ${streamData.title}` : 'Join my live on Made Universe',
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showNotice('Live link copied.', 'success');
      } else {
        window.prompt('Copy this live link:', shareUrl);
      }

      socket?.emit?.('live_share', { streamId });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        showNotice('Unable to share the live.', 'error');
      }
    }
  };

  // --- SETTINGS / PANEL HELPERS ---
  const openPanel = panel => {
    setActivePanel(current => current === panel ? null : panel);
  };

  const handleHostControlAction = action => {
    if (!action) return;

    if (action === 'camera') {
      setIsCameraOff(prev => !prev);
      return;
    }

    if (action === 'microphone') {
      setIsMuted(prev => !prev);
      return;
    }

    if (action === 'battle') {
      setActivePanel('battle');
      return;
    }

    if (action === 'analytics') {
      setActivePanel('analytics');
      return;
    }

    if (action === 'settings') {
      setActivePanel('settings');
      return;
    }

    if (action === 'share') {
      handleShare();
      return;
    }

    if (action === 'end') {
      setShowEndConfirm(true);
    }
  };

  // --- CLEANUP MEDIA ---
  const stopLocalMedia = () => {
    const videoElement = localVideoRef?.current;
    const mediaStream = videoElement?.srcObject;

    if (mediaStream && typeof mediaStream.getTracks === 'function') {
      mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Unable to stop media track:', error);
        }
      });
      videoElement.srcObject = null;
    }
  };

  // --- END LIVE ---
  const handleEndLive = async () => {
    if (endingRef.current || isEnding) return;

    endingRef.current = true;
    setIsEnding(true);

    const endedAt = new Date().toISOString();
    const duration = getStreamDuration();
    const finalPeak = Math.max(peakViewers, currentViewers);

    try {
      socket?.emit?.('end_stream', {
        streamId,
        endedAt,
        duration,
        peakViewers: finalPeak
      });

      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'ended',
          ended_at: endedAt
        })
        .eq('id', streamId);

      if (error) throw error;

      stopLocalMedia();

      try {
        socket?.disconnect?.();
        socket?.close?.();
      } catch (socketError) {
        console.warn('Socket cleanup warning:', socketError);
      }

      const summary = {
        streamId,
        duration,
        peakViewers: finalPeak,
        viewers: currentViewers,
        likes: Number(streamData?.likes_count || streamData?.total_likes || 0),
        comments: Number(streamData?.comments_count || 0),
        gifts: Number(streamData?.gift_count || streamData?.gifts_count || 0),
        coins: Number(streamData?.coins_earned || streamData?.gift_value || 0),
        followers: Number(streamData?.followers_gained || 0),
        battleScores
      };

      navigate('/live', { state: { endedStream: summary } });
    } catch (error) {
      console.error('Failed to end live stream:', error);
      endingRef.current = false;
      setIsEnding(false);
      showNotice('Unable to end the live stream. Please try again.', 'error');
    }
  };

  // --- UNMOUNT CLEANUP ---
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

      reactionTimersRef.current.forEach(timer => clearTimeout(timer));
      reactionTimersRef.current.clear();

      if (!endingRef.current) {
        stopLocalMedia();

        try {
          socket?.disconnect?.();
          socket?.close?.();
        } catch (error) {
          console.warn('Live cleanup warning:', error);
        }
      }
    };
  }, [socket]);

  if (!streamData) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-black italic text-cyan-400 underline animate-pulse tracking-widest">
        CONNECTING TO SOCKET MATRIX...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white overflow-hidden relative font-sans flex flex-row">
      {/* MAIN LIVE VIEWPORT */}
      <div className="relative flex-1 h-full min-w-0 overflow-hidden">
        <GiftAlertOverlay activeGift={giftsEnabled ? activeGift : null} setActiveGift={setActiveGift} />

        {/* HEADER */}
        <div className="absolute top-0 left-0 right-0 z-[60] p-4 pt-10 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <StreamHeader
              data={streamData}
              isHost={true}
              viewerCount={currentViewers}
              onLeave={() => setShowEndConfirm(true)}
            />
          </div>
        </div>

        {/* LIVE STAGE */}
        <div className="absolute inset-0 z-0 bg-zinc-900">
          <div className="relative h-full w-full overflow-hidden bg-zinc-950">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
            />

            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-zinc-900 font-black tracking-widest text-xs italic">
                CAMERA OFF
              </div>
            )}

            {/* CONNECTION / HEALTH */}
            <div className="absolute top-24 left-4 z-30 flex items-center gap-2 pointer-events-none">
              <div className={`px-2.5 py-1 rounded-full backdrop-blur-xl border text-[9px] font-black uppercase tracking-wider ${isOnline ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300' : 'bg-red-500/15 border-red-400/20 text-red-300'}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                {isOnline ? 'Connected' : 'Reconnecting'}
              </div>

              {hardwareReady && (
                <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[9px] font-black uppercase tracking-wider text-white/80">
                  <Radio size={10} className="inline mr-1.5" />
                  LIVE
                </div>
              )}
            </div>

            {/* HOST IDENTITY */}
            <div className="absolute bottom-28 left-4 z-20 bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/5 text-[10px] uppercase font-bold tracking-wider">
              @{streamData?.host?.username}
              <span className="text-cyan-400 font-black ml-1">● Host</span>
            </div>

            {/* REACTIONS */}
            <div className="absolute inset-y-0 right-4 bottom-24 z-30 w-20 pointer-events-none overflow-hidden">
              <AnimatePresence>
                {reactions.map((reaction, index) => (
                  <motion.div
                    key={reaction.id || index}
                    initial={{ y: 30, opacity: 0, scale: 0.6 }}
                    animate={{ y: -(index * 48 + 70), opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: -180 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    className="absolute bottom-0 right-0 text-2xl drop-shadow-lg"
                  >
                    {reaction.emoji || reaction.reaction || <Smile size={26} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* BATTLE */}
            {isBattleMode && (
              <BattleOverlay
                score={battleScores}
                hostProfile={streamData?.host}
                coHost={streamData?.challenger || { username: 'Challenger' }}
                onInviteClick={handleBattleInvite}
              />
            )}

            {/* JOIN ALERT */}
            <AnimatePresence>
              {joinAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="absolute top-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/70 border border-white/10 backdrop-blur-xl text-xs font-bold shadow-2xl pointer-events-none"
                >
                  <Users size={13} className="inline mr-1.5 text-cyan-400" />
                  {typeof joinAlert === 'string' ? joinAlert : 'New viewer joined'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* HOST ACTION AREA */}
        <div className="absolute inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            {/* CHAT */}
            <div className={`w-full lg:w-[340px] h-44 sm:h-48 lg:h-56 pointer-events-auto overflow-hidden rounded-2xl transition-opacity ${commentsEnabled ? 'opacity-100' : 'opacity-60'}`}>
              {commentsEnabled ? (
                <ChatBox
                  streamId={streamId}
                  isHost={true}
                  transparent={true}
                  filter={chatFilter}
                />
              ) : (
                <div className="h-full flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-xs text-white/60">
                  Comments are disabled
                </div>
              )}
            </div>

            {/* MAIN CONTROL BAR */}
            <div className="w-full lg:w-auto pointer-events-auto">
              <nav className="w-full lg:min-w-[520px] bg-zinc-950/85 backdrop-blur-2xl rounded-2xl lg:rounded-full border border-white/10 p-1.5 shadow-2xl">
                <ul className="flex items-center justify-between gap-1 px-1 sm:px-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleHostControlAction('camera')}
                      title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                      className={`p-2.5 sm:p-3 rounded-full text-white transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => handleHostControlAction('microphone')}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                      className={`p-2.5 sm:p-3 rounded-full text-white transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => openPanel('controls')}
                      title="Host controls"
                      className={`p-2.5 sm:p-3 rounded-full transition-colors ${activePanel === 'controls' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <Settings size={16} />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => openPanel('viewers')}
                      title="Viewers"
                      className={`p-2.5 sm:p-3 rounded-full transition-colors ${activePanel === 'viewers' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <Users size={16} />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => openPanel('battle')}
                      title="Battle"
                      className={`p-2.5 sm:p-3 rounded-full transition-colors ${activePanel === 'battle' || isBattleMode ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <Swords size={16} />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => openPanel('analytics')}
                      title="Analytics"
                      className={`p-2.5 sm:p-3 rounded-full transition-colors ${activePanel === 'analytics' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <BarChart3 size={16} />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => handleShare()}
                      title="Share live"
                      className="p-2.5 sm:p-3 rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setShowEndConfirm(true)}
                      title="End live"
                      className="p-2.5 sm:p-3 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Radio size={16} />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        {/* INVITE MANAGER */}
        <AnimatePresence>
          {incomingInvite && (
            <div className="absolute inset-0 pointer-events-none z-[80] flex items-center justify-center p-4">
              <motion.div
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-zinc-950/95 border border-cyan-500/40 p-5 rounded-3xl pointer-events-auto text-center shadow-2xl backdrop-blur-2xl"
              >
                <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <Swords size={22} className="text-cyan-400" />
                </div>

                <p className="text-sm font-black">
                  @{incomingInvite.senderUsername || incomingInvite.username || 'Host'} challenges you
                </p>

                <p className="text-[11px] text-white/50 mt-1">
                  Join the live battle?
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleDeclineInvite}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold"
                  >
                    Decline
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptInvite}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black"
                  >
                    Accept Battle
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* NOTICE */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className={`absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 z-[100] px-4 py-2.5 rounded-full backdrop-blur-xl border text-xs font-bold shadow-2xl ${notice.type === 'error' ? 'bg-red-500/15 border-red-400/20 text-red-200' : notice.type === 'success' ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-200' : 'bg-black/70 border-white/10 text-white'}`}
            >
              {notice.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* END LIVE CONFIRMATION */}
        <AnimatePresence>
          {showEndConfirm && (
            <div className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black">End live stream?</h3>
                    <p className="text-xs text-white/50 mt-1">
                      Your camera and microphone will be disconnected.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEndConfirm(false)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5">
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <div className="text-sm font-black">{currentViewers}</div>
                    <div className="text-[9px] uppercase text-white/40 mt-1">Viewers</div>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <div className="text-sm font-black">{peakViewers}</div>
                    <div className="text-[9px] uppercase text-white/40 mt-1">Peak</div>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <div className="text-sm font-black">{Math.floor(getStreamDuration() / 60)}m</div>
                    <div className="text-[9px] uppercase text-white/40 mt-1">Duration</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowEndConfirm(false)}
                    disabled={isEnding}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold disabled:opacity-50"
                  >
                    Continue Live
                  </button>

                  <button
                    type="button"
                    onClick={handleEndLive}
                    disabled={isEnding}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black disabled:opacity-50"
                  >
                    {isEnding ? 'Ending...' : 'End Live'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FEATURE DRAWER */}
      <AnimatePresence>
        {activePanel && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-[110] w-full sm:w-[390px] bg-zinc-950 border-l border-white/10 shadow-2xl pointer-events-auto"
          >
            <div className="h-full overflow-y-auto">
              {activePanel === 'controls' && (
                <HostControls
                  streamId={streamId}
                  streamData={streamData}
                  socket={socket}
                  localVideoRef={localVideoRef}
                  hardwareReady={hardwareReady}
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  setIsMuted={setIsMuted}
                  setIsCameraOff={setIsCameraOff}
                  quality={quality}
                  setQuality={handleQualityChange}
                  fps={fps}
                  setFps={handleFpsChange}
                  dataSaver={dataSaver}
                  setDataSaver={handleDataSaverChange}
                  isOnline={isOnline}
                  onAction={handleHostControlAction}
                  onEndLive={() => setShowEndConfirm(true)}
                  onClose={() => setActivePanel(null)}
                  commentsEnabled={commentsEnabled}
                  setCommentsEnabled={handleToggleComments}
                  giftsEnabled={giftsEnabled}
                  setGiftsEnabled={handleToggleGifts}
                  reactionsEnabled={reactionsEnabled}
                  setReactionsEnabled={handleToggleReactions}
                />
              )}

              {activePanel === 'analytics' && (
                <LiveAnalyticsPanel
                  streamId={streamId}
                  streamData={streamData}
                  viewerCount={currentViewers}
                  peakViewers={peakViewers}
                  duration={getStreamDuration()}
                  battleScores={battleScores}
                  socket={socket}
                  onClose={() => setActivePanel(null)}
                />
              )}

              {activePanel === 'settings' && (
                <SettingsPanel
                  streamId={streamId}
                  streamData={streamData}
                  socket={socket}
                  currentCoHosts={streamData?.co_hosts || streamData?.coHosts || []}
                  onDropUser={handleDropUser}
                  onDropAll={handleDropAll}
                  onMuteUser={handleMuteUser}
                  onBanUser={handleBanUser}
                  onReportUser={handleReportUser}
                  commentsEnabled={commentsEnabled}
                  onCommentsEnabledChange={handleToggleComments}
                  giftsEnabled={giftsEnabled}
                  onGiftsEnabledChange={handleToggleGifts}
                  reactionsEnabled={reactionsEnabled}
                  onReactionsEnabledChange={handleToggleReactions}
                  chatFilter={chatFilter}
                  onChatFilterChange={handleChatFilterChange}
                  onClose={() => setActivePanel(null)}
                />
              )}

              {activePanel === 'viewers' && (
                <SettingsPanel
                  streamId={streamId}
                  streamData={streamData}
                  socket={socket}
                  viewers={viewers}
                  currentViewers={currentViewers}
                  currentCoHosts={streamData?.co_hosts || streamData?.coHosts || []}
                  onDropUser={handleDropUser}
                  onDropAll={handleDropAll}
                  onMuteUser={handleMuteUser}
                  onBanUser={handleBanUser}
                  onReportUser={handleReportUser}
                  onClose={() => setActivePanel(null)}
                />
              )}

              {activePanel === 'battle' && (
                <div className="min-h-full p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Swords size={18} className="text-cyan-400" />
                        <h2 className="font-black text-lg">Live Battle</h2>
                      </div>
                      <p className="text-xs text-white/45 mt-1">
                        Manage your PK battle session.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="p-2 rounded-full bg-white/5 hover:bg-white/10"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-cyan-400/10 border border-cyan-400/10 p-4">
                        <div className="text-[9px] uppercase text-cyan-300/70 font-bold">You</div>
                        <div className="text-2xl font-black mt-1">{battleScores.host}</div>
                      </div>

                      <div className="rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/10 p-4">
                        <div className="text-[9px] uppercase text-fuchsia-300/70 font-bold">Challenger</div>
                        <div className="text-2xl font-black mt-1">{battleScores.challenger}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleBattleInvite}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-400 text-black text-xs font-black"
                      >
                        <UserPlus size={14} />
                        Find Challenger
                      </button>

                      <button
                        type="button"
                        onClick={isBattleMode ? handleEndBattle : () => setActivePanel('battle')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black ${isBattleMode ? 'bg-red-500 text-white' : 'bg-white/5 text-white'}`}
                      >
                        <Swords size={14} />
                        {isBattleMode ? 'End Battle' : 'Battle Ready'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Gift size={16} className="text-yellow-400" />
                      <div>
                        <div className="text-xs font-bold">Gift contribution</div>
                        <div className="text-[10px] text-white/40">Scores can be synchronized through the battle socket.</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold">Battle viewers</div>
                        <div className="text-[10px] text-white/40">{currentViewers} people are watching.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamDashboard;
