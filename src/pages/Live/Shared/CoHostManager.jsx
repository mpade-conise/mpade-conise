
// src/pages/Live/Host/CoHostStage.jsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import {
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Radio,
  Check,
  X,
  Bug
} from 'lucide-react';

import { useStreamSocket } from "../Host/useStreamSocket";
import { useStreamWebRTC } from "../Host/useStreamWebRTC";
import DynamicStreamGrid from '../../../components/DynamicStreamGrid.jsx';

const CoHostStage = ({ socket: parentSocket }) => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  /* =========================================================
     SHARED STREAM SOCKET
     ========================================================= */

  /*
   * If a parent socket is supplied, use it.
   * Otherwise use the same socket controller used by
   * StreamDashboard.
   *
   * This keeps CoHostStage from creating another Socket.IO
   * connection unnecessarily.
   */
  const streamSocketState = useStreamSocket(
    parentSocket ? null : streamId,
    true
  );

  const socket =
    parentSocket ||
    streamSocketState.socket;

  /* =========================================================
     SHARED WEBRTC ENGINE
     ========================================================= */

  /*
   * The shared WebRTC hook owns:
   *
   * - camera
   * - microphone
   * - RTCPeerConnection
   * - ICE
   * - remote streams
   * - offer/answer handling
   * - peer cleanup
   *
   * CoHostStage no longer creates its own peer connections.
   */

  const challengerVideoRef = useRef(null);

  const {
    localVideoRef,
    hardwareReady,
    primaryRemoteStream
  } = useStreamWebRTC(
    streamId,
    socket,
    false,
    false,
    challengerVideoRef
  );

  /* =========================================================
     HARDWARE STATE
     ========================================================= */

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  /* =========================================================
     CREATOR / INVITATION STATE
     ========================================================= */

  const [liveCreators, setLiveCreators] =
    useState([]);

  const [inviteLoading, setInviteLoading] =
    useState({});

  const [incomingInvite, setIncomingInvite] =
    useState(null);

  const [isMerged, setIsMerged] =
    useState(false);

  const mountedRef = useRef(true);

  /* =========================================================
     LIFECYCLE
     ========================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =========================================================
     LOCAL HARDWARE CONTROLS
     ========================================================= */

  /*
   * The shared WebRTC hook owns the actual MediaStream.
   *
   * Therefore we control tracks through the stream attached
   * to the local video element instead of calling getUserMedia
   * a second time.
   */

  const getLocalStream = () => {
    return localVideoRef?.current?.srcObject || null;
  };

  const toggleMute = () => {
    const stream = getLocalStream();

    if (!stream) {
      console.warn(
        '⚠️ [CoHostStage] Local media is not ready.'
      );
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (!audioTracks.length) return;

    const nextMuted = !isMuted;

    audioTracks.forEach(track => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);

    console.log(
      '🎙️ [CoHostStage] Microphone:',
      nextMuted ? 'OFF' : 'ON'
    );
  };

  const toggleCamera = () => {
    const stream = getLocalStream();

    if (!stream) {
      console.warn(
        '⚠️ [CoHostStage] Local media is not ready.'
      );
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    if (!videoTracks.length) return;

    const nextCameraOff =
      !isCameraOff;

    videoTracks.forEach(track => {
      track.enabled = !nextCameraOff;
    });

    setIsCameraOff(nextCameraOff);

    console.log(
      '📷 [CoHostStage] Camera:',
      nextCameraOff ? 'OFF' : 'ON'
    );
  };

  /* =========================================================
     CO-HOST INVITATION LISTENERS
     ========================================================= */

  useEffect(() => {
    if (!socket) return;

    console.log(
      '🔌 [CoHostStage] Using shared socket:',
      socket.id
    );

    const handleInviteReceived = data => {
      if (!mountedRef.current) return;

      console.log(
        '🚀 [CoHostStage] Co-host invitation received:',
        data
      );

      setIncomingInvite(data);
    };

    const handleInviteAccepted = data => {
      if (!mountedRef.current) return;

      console.log(
        '✅ [CoHostStage] Merge invitation accepted:',
        data
      );

      setIsMerged(true);
    };

    const handleInviteDeclined = data => {
      if (!mountedRef.current) return;

      console.log(
        '❌ [CoHostStage] Merge invitation declined:',
        data
      );

      setIsMerged(false);
    };

    const handleMergeStarted = data => {
      if (!mountedRef.current) return;

      console.log(
        '🟢 [CoHostStage] Merge feed started:',
        data
      );

      setIsMerged(true);
    };

    const handleMergeEnded = data => {
      if (!mountedRef.current) return;

      console.log(
        '🟠 [CoHostStage] Merge feed ended:',
        data
      );

      setIsMerged(false);
    };

    socket.on(
      'cohost_invite_received',
      handleInviteReceived
    );

    socket.on(
      'cohost_invite_accepted',
      handleInviteAccepted
    );

    socket.on(
      'cohost_invite_declined',
      handleInviteDeclined
    );

    socket.on(
      'cohost_merge_started',
      handleMergeStarted
    );

    socket.on(
      'cohost_merge_ended',
      handleMergeEnded
    );

    return () => {
      socket.off(
        'cohost_invite_received',
        handleInviteReceived
      );

      socket.off(
        'cohost_invite_accepted',
        handleInviteAccepted
      );

      socket.off(
        'cohost_invite_declined',
        handleInviteDeclined
      );

      socket.off(
        'cohost_merge_started',
        handleMergeStarted
      );

      socket.off(
        'cohost_merge_ended',
        handleMergeEnded
      );
    };
  }, [socket]);

  /* =========================================================
     LOAD LIVE CREATORS
     ========================================================= */

  useEffect(() => {
    if (!streamId) return;

    let cancelled = false;

    const fetchLiveCreators = async () => {
      try {
        const {
          data,
          error
        } = await supabase
          .from('live_streams')
          .select(
            'id, host_id, title, status'
          )
          .eq('status', 'live')
          .neq('id', streamId);

        if (cancelled) return;

        if (error) {
          throw error;
        }

        setLiveCreators(data || []);
      } catch (error) {
        if (!cancelled) {
          console.error(
            '❌ [CoHostStage] Error loading live creators:',
            error?.message || error
          );
        }
      }
    };

    fetchLiveCreators();

    const interval = setInterval(
      fetchLiveCreators,
      10000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId]);

  /* =========================================================
     SEND CO-HOST INVITATION
     ========================================================= */

  const sendCoHostInvite = targetHostId => {
    if (!socket || !targetHostId) {
      console.warn(
        '⚠️ [CoHostStage] Cannot send invitation.'
      );
      return;
    }

    if (!streamId) return;

    setInviteLoading(previous => ({
      ...previous,
      [targetHostId]: true
    }));

    const payload = {
      room: streamId,
      targetRoomId: targetHostId,
      targetUserId: targetHostId,
      fromHostId: streamId,
      inviteFrom: 'Host Studio Stage'
    };

    console.log(
      '📤 [CoHostStage] Sending Merge Feed invitation:',
      payload
    );

    /*
     * This remains the existing invitation event.
     * It is control/signaling only.
     *
     * WebRTC itself is now owned by useStreamWebRTC.
     */

    socket.emit(
      'send_cohost_invite',
      payload
    );

    setTimeout(() => {
      if (!mountedRef.current) return;

      setInviteLoading(previous => ({
        ...previous,
        [targetHostId]: false
      }));
    }, 1500);
  };

  /* =========================================================
     ACCEPT INVITATION
     ========================================================= */

  const handleAcceptInvite = () => {
    if (!socket || !incomingInvite) {
      return;
    }

    const room =
      incomingInvite.room ||
      streamId;

    const targetUserId =
      incomingInvite.fromHostId ||
      incomingInvite.senderHostId ||
      incomingInvite.host_id;

    console.log(
      '✅ [CoHostStage] Accepting Merge Feed invitation:',
      {
        room,
        targetUserId
      }
    );

    socket.emit(
      'respond_cohost_invite',
      {
        room,
        targetUserId,
        acceptedBySocketId:
          socket.id,
        status: 'accepted'
      }
    );

    setIsMerged(true);
    setIncomingInvite(null);
  };

  /* =========================================================
     DECLINE INVITATION
     ========================================================= */

  const handleDeclineInvite = () => {
    if (!socket || !incomingInvite) {
      return;
    }

    const room =
      incomingInvite.room ||
      streamId;

    const targetUserId =
      incomingInvite.fromHostId ||
      incomingInvite.senderHostId ||
      incomingInvite.host_id;

    console.log(
      '❌ [CoHostStage] Declining Merge Feed invitation.'
    );

    socket.emit(
      'respond_cohost_invite',
      {
        room,
        targetUserId,
        status: 'declined'
      }
    );

    setIncomingInvite(null);
  };

  /* =========================================================
     TEST INVITATION
     ========================================================= */

  const simulateIncomingInvite = () => {
    setIncomingInvite({
      room:
        streamId ||
        'test-stream-id-12345',

      fromHostId:
        'mock-host-id',

      inviteFrom:
        'Simulated Creator Studio'
    });
  };

  /* =========================================================
     VIDEO GRID
     ========================================================= */

  const coHostStreams =
    primaryRemoteStream
      ? [primaryRemoteStream]
      : [];

  /*
   * DynamicStreamGrid is now the single presentation
   * component for host + remote feed.
   */

  return (
    <div className="h-screen w-full bg-black text-white relative font-sans overflow-hidden flex">

      {/* =====================================================
          INCOMING INVITATION
          ===================================================== */}

      {incomingInvite && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border-2 border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-[9999] backdrop-blur-xl animate-fade-in">

          <div className="flex flex-col">

            <span className="text-xs font-black tracking-wider text-emerald-400">
              INCOMING FEED MERGE REQUEST
            </span>

            <span className="text-[11px] text-zinc-300 mt-0.5">
              Host Session:{' '}
              {String(
                incomingInvite.room
              ).slice(0, 8)}
              ... wants to split screens.
            </span>

          </div>

          <div className="flex items-center gap-1.5 ml-2">

            <button
              onClick={
                handleAcceptInvite
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Check size={12} />
              Accept
            </button>

            <button
              onClick={
                handleDeclineInvite
              }
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            >
              <X size={12} />
              Deny
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          MAIN STAGE
          ===================================================== */}

      <div className="flex-1 h-full relative">

        <DynamicStreamGrid
          streamId={streamId}

          /* =================================================
             HOST VIDEO
             ================================================= */

          hostVideo={
            <div className="relative w-full h-full bg-zinc-900 overflow-hidden">

              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={
                  'w-full h-full object-cover ' +
                  (isCameraOff
                    ? 'opacity-0'
                    : 'opacity-100')
                }
              />

              {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-zinc-600 bg-zinc-900 font-mono">
                  CAMERA BLANKED
                </div>
              )}

              <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-cyan-400 border border-cyan-500/10">
                HOST (YOU)
              </span>

            </div>
          }

          hostInfo={{
            username: 'Host'
          }}

          /* =================================================
             REMOTE CO-HOST STREAM
             ================================================= */

          coHosts={
            primaryRemoteStream
              ? [
                  {
                    id: 'remote-cohost',
                    username: 'Co-Host'
                  }
                ]
              : []
          }

          coHostStreams={
            coHostStreams
          }

          coHostStream={
            primaryRemoteStream ||
            null
          }

          /*
           * Always provide the video element.
           * DynamicStreamGrid binds primaryRemoteStream
           * to this element.
           */

          coHostVideo={
            <div className="relative w-full h-full bg-zinc-900 overflow-hidden">

              <video
                ref={challengerVideoRef}
                autoPlay
                playsInline
                controls={false}
                className="w-full h-full object-cover"
              />

              {!primaryRemoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">

                  <div className="flex flex-col items-center gap-2">

                    <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-emerald-400 animate-spin" />

                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Waiting For Co-Host...
                    </span>

                  </div>

                </div>
              )}

            </div>
          }

          coHostInfo={
            primaryRemoteStream
              ? {
                  id: 'remote-cohost',
                  username: 'Co-Host'
                }
              : null
          }

          isHostView={true}

          isBattleMode={false}

          activeSmallGift={null}
        />

        {/* ===================================================
            HUD
            =================================================== */}

        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-6">

          <header className="w-full flex justify-between items-center pointer-events-auto">

            <div className="bg-zinc-950/80 border border-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">

              <div
                className={
                  'w-2 h-2 rounded-full animate-ping ' +
                  (hardwareReady
                    ? 'bg-emerald-500'
                    : 'bg-yellow-500')
                }
              />

              <span className="text-xs font-black tracking-wider text-zinc-300">
                {isMerged
                  ? 'CO-HOST ENGINE LIVE'
                  : 'CO-HOST ENGINE READY'}
              </span>

            </div>

            <button
              onClick={
                simulateIncomingInvite
              }
              className="bg-zinc-900 text-zinc-400 p-1.5 rounded-xl text-[10px] flex items-center gap-1.5 pointer-events-auto"
            >
              <Bug size={12} />
              Test Overlay
            </button>

          </header>

          {/* =================================================
              CONTROL BAR
              ================================================= */}

          <nav className="w-full max-w-sm mx-auto bg-zinc-950/90 border border-white/10 p-2 rounded-full pointer-events-auto flex justify-between items-center px-4">

            <button
              onClick={toggleCamera}
              disabled={!hardwareReady}
              className={
                'p-3 rounded-full ' +
                (isCameraOff
                  ? 'bg-red-500'
                  : 'bg-white/5')
              }
              title={
                isCameraOff
                  ? 'Turn camera on'
                  : 'Turn camera off'
              }
            >
              {isCameraOff ? (
                <VideoOff size={16} />
              ) : (
                <Video size={16} />
              )}
            </button>

            <button
              onClick={toggleMute}
              disabled={!hardwareReady}
              className={
                'p-3 rounded-full ' +
                (isMuted
                  ? 'bg-red-500'
                  : 'bg-white/5')
              }
              title={
                isMuted
                  ? 'Unmute microphone'
                  : 'Mute microphone'
              }
            >
              {isMuted ? (
                <MicOff size={16} />
              ) : (
                <Mic size={16} />
              )}
            </button>

            <button
              onClick={() =>
                navigate(
                  `/live/host/${streamId}`
                )
              }
              className="p-3 bg-zinc-800 rounded-full text-xs font-bold px-5"
            >
              Exit Room
            </button>

          </nav>

        </div>
      </div>

      {/* =====================================================
          LIVE CREATORS SIDEBAR
          ===================================================== */}

      <div className="w-80 h-full bg-zinc-950 border-l border-white/10 flex flex-col p-4 z-[60]">

        <div className="border-b border-white/10 pb-3 mb-4">

          <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase flex items-center gap-2">

            <Radio
              size={14}
              className="text-red-500 animate-pulse"
            />

            Live Creators

          </h3>

        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">

          {liveCreators.length === 0 ? (

            <div className="text-center text-zinc-600 text-xs py-12 font-mono">
              No other creators live
            </div>

          ) : (

            liveCreators.map(
              creator => {

                const targetId =
                  creator.host_id ||
                  creator.id;

                return (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between bg-zinc-900 p-2 rounded-xl"
                  >

                    <div className="flex flex-col max-w-[60%]">

                      <span className="text-xs font-bold text-zinc-300 truncate">
                        {creator.title ||
                          'Untitled Stream'}
                      </span>

                      <span className="text-[9px] text-zinc-600 flex items-center gap-1 mt-1">
                        <Users size={10} />
                        LIVE
                      </span>

                    </div>

                    <button
                      onClick={() =>
                        sendCoHostInvite(
                          targetId
                        )
                      }
                      disabled={
                        inviteLoading[
                          targetId
                        ]
                      }
                      className="bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    >
                      {inviteLoading[
                        targetId
                      ]
                        ? 'Invited'
                        : 'Merge Feed'}
                    </button>

                  </div>
                );
              }
            )

          )}

        </div>

      </div>

    </div>
  );
};

export default CoHostStage;
