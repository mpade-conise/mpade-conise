
// src/hooks/useStreamWebRTC.jsx

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import liveVoiceEngine from '../../../components/live/LiveVoiceEngine';

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

export const useStreamWebRTC = (
  streamId,
  socket,
  isCameraOff,
  isMuted,
  challengerVideoRef = null
) => {
  /*
   * ============================================================
   * LOCAL MEDIA
   * ============================================================
   */

  const localVideoRef = useRef(null);

  const localStreamRef = useRef(null);

  /*
   * React state is used as well as the ref.
   *
   * IMPORTANT:
   * Updating a ref alone does NOT cause StreamDashboard
   * to rerender.
   *
   * This state allows:
   *
   * useStreamWebRTC
   *      ↓
   * localStream
   *      ↓
   * StreamDashboard
   *      ↓
   * DynamicStreamGrid
   */
  const [localStream, setLocalStream] =
    useState(null);

  /*
   * ============================================================
   * WEBRTC STATE
   * ============================================================
   */

  const peerConnectionsRef =
    useRef({});

  const iceCandidatesQueueRef =
    useRef({});

  const remoteStreamsRef =
    useRef({});

  /*
   * ============================================================
   * LIFECYCLE STATE
   * ============================================================
   */

  const mountedRef =
    useRef(false);

  /*
   * Prevent duplicate getUserMedia calls.
   */
  const mediaInitRef =
    useRef(false);

  /*
   * Generation number prevents an old async
   * getUserMedia request from interfering with a
   * newer initialization.
   */
  const mediaGenerationRef =
    useRef(0);

  /*
   * Keep the exact stream owned by the current
   * initialization lifecycle.
   */
  const activeMediaGenerationRef =
    useRef(0);

  const [hardwareReady, setHardwareReady] =
    useState(false);

  const [
    primaryRemoteStream,
    setPrimaryRemoteStream
  ] = useState(null);

  /*
   * ============================================================
   * STREAM CLEANUP HELPER
   * ============================================================
   */

  const stopStream = useCallback(stream => {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {
        // Ignore track cleanup errors.
      }
    });
  }, []);

  /*
   * ============================================================
   * LOCAL VIDEO BINDING
   * ============================================================
   */

  const bindLocalStreamToDOM = useCallback(() => {
    const video =
      localVideoRef.current;

    const stream =
      localStreamRef.current;

    if (
      !video ||
      !(video instanceof HTMLVideoElement) ||
      !stream
    ) {
      return;
    }

    /*
     * Make sure the exact MediaStream is attached.
     */
    if (
      video.srcObject !== stream
    ) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    let cancelled = false;

    const playVideo = async () => {
      if (cancelled) {
        return;
      }

      try {
        await video.play();

        if (!cancelled) {
          console.log(
            '▶️ [WebRTC] Local camera video is playing.'
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn(
          '⚠️ [WebRTC] Local video play() failed:',
          error?.name,
          error?.message || error
        );
      }
    };

    /*
     * If metadata already exists, play immediately.
     */
    if (video.readyState >= 1) {
      playVideo();
    } else {
      /*
       * Otherwise wait for metadata.
       */
      video.addEventListener(
        'loadedmetadata',
        playVideo,
        {
          once: true
        }
      );
    }

    return () => {
      cancelled = true;

      video.removeEventListener(
        'loadedmetadata',
        playVideo
      );
    };
  }, []);

  /*
   * ============================================================
   * REMOTE VIDEO BINDING
   * ============================================================
   */

  const bindRemoteStreamToDOM =
    useCallback(
      stream => {
        if (!stream) {
          return;
        }

        const streamKey =
          stream.id || 'primary';

        remoteStreamsRef.current[
          streamKey
        ] = stream;

        setPrimaryRemoteStream(
          previous => {
            if (
              previous?.id === stream.id
            ) {
              return previous;
            }

            return stream;
          }
        );

        const video =
          challengerVideoRef?.current;

        if (
          !video ||
          !(video instanceof HTMLVideoElement)
        ) {
          return;
        }

        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        const playVideo = async () => {
          try {
            await video.play();
          } catch (error) {
            console.warn(
              '⚠️ [WebRTC] Remote video play failed:',
              error?.name,
              error?.message || error
            );
          }
        };

        if (video.readyState >= 1) {
          playVideo();
        } else {
          video.addEventListener(
            'loadedmetadata',
            playVideo,
            {
              once: true
            }
          );
        }

        console.log(
          '🎥 [WebRTC] Remote media stream attached.'
        );
      },
      [challengerVideoRef]
    );

  /*
   * ============================================================
   * HARDWARE INITIALIZATION
   *
   * This effect is intentionally independent of:
   * - Socket.IO
   * - Supabase
   * - ChatBox
   * - WebRTC signaling
   * ============================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    if (!streamId) {
      setLocalStream(null);
      setHardwareReady(false);

      return () => {
        mountedRef.current = false;
      };
    }

    /*
     * Every effect lifecycle receives a unique generation.
     */
    const generation =
      mediaGenerationRef.current + 1;

    mediaGenerationRef.current =
      generation;

    activeMediaGenerationRef.current =
      generation;

    let cancelled = false;

    let acquiredStream = null;

    /*
     * ------------------------------------------------------------
     * Check whether this initialization is still current.
     * ------------------------------------------------------------
     */
    const isCurrentInitialization = () => {
      return (
        !cancelled &&
        mountedRef.current &&
        mediaGenerationRef.current ===
          generation
      );
    };

    /*
     * ------------------------------------------------------------
     * Attach local stream.
     * ------------------------------------------------------------
     */
    const attachLocalStream = stream => {
      if (
        !stream ||
        !isCurrentInitialization()
      ) {
        return;
      }

      localStreamRef.current =
        stream;

      /*
       * This triggers StreamDashboard to rerender.
       */
      setLocalStream(stream);

      const video =
        localVideoRef.current;

      if (
        !video ||
        !(video instanceof HTMLVideoElement)
      ) {
        console.warn(
          '⚠️ [WebRTC] Camera opened, but local video element is not mounted yet.'
        );

        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      const playVideo = async () => {
        if (
          !isCurrentInitialization()
        ) {
          return;
        }

        try {
          await video.play();

          console.log(
            '▶️ [WebRTC] Local camera preview started.'
          );
        } catch (error) {
          console.warn(
            '⚠️ [WebRTC] Camera stream exists but video.play() failed:',
            error?.name,
            error?.message || error
          );
        }
      };

      if (video.readyState >= 1) {
        playVideo();
      } else {
        video.addEventListener(
          'loadedmetadata',
          playVideo,
          {
            once: true
          }
        );
      }
    };

    /*
     * ------------------------------------------------------------
     * Request media.
     * ------------------------------------------------------------
     */
    const requestMedia = async () => {
      /*
       * Do not create duplicate camera requests.
       */
      if (mediaInitRef.current) {
        return;
      }

      mediaInitRef.current = true;

      try {
        if (
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices
            .getUserMedia !== 'function'
        ) {
          throw new Error(
            'Browser getUserMedia API is unavailable.'
          );
        }

        console.log(
          '🎥 [WebRTC] Requesting camera and microphone...'
        );

        /*
         * --------------------------------------------------------
         * Preferred camera configuration.
         * --------------------------------------------------------
         */
        try {
          acquiredStream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  width: {
                    ideal: 1280
                  },
                  height: {
                    ideal: 720
                  },
                  frameRate: {
                    ideal: 30,
                    max: 30
                  }
                },

                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }
              }
            );
        } catch (firstError) {
          /*
           * If the browser/device doesn't support the
           * preferred constraints, use the simplest
           * compatible configuration.
           */
          console.warn(
            '⚠️ [WebRTC] Preferred camera constraints failed:',
            firstError?.name,
            firstError?.message ||
              firstError
          );

          /*
           * If initialization was cancelled while
           * waiting for the first request, stop here.
           */
          if (
            !isCurrentInitialization()
          ) {
            return;
          }

          acquiredStream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: true,
                audio: true
              }
            );

          console.log(
            '✅ [WebRTC] Fallback camera constraints succeeded.'
          );
        }

        /*
         * --------------------------------------------------------
         * Async race protection.
         *
         * An old getUserMedia() request may finish after
         * React has already created a newer initialization.
         *
         * Never allow that old stream to become active.
         * --------------------------------------------------------
         */
        if (
          !isCurrentInitialization()
        ) {
          console.warn(
            '🧹 [WebRTC] Ignoring stale camera stream.'
          );

          stopStream(acquiredStream);

          acquiredStream = null;

          return;
        }

        localStreamRef.current =
          acquiredStream;

        /*
         * Make stream available to React.
         */
        setLocalStream(
          acquiredStream
        );

        /*
         * --------------------------------------------------------
         * Diagnostics.
         * --------------------------------------------------------
         */
        const videoTracks =
          acquiredStream.getVideoTracks();

        const audioTracks =
          acquiredStream.getAudioTracks();

        console.log(
          '📷 [WebRTC] Video tracks:',
          videoTracks.length
        );

        console.log(
          '🎙️ [WebRTC] Audio tracks:',
          audioTracks.length
        );

        videoTracks.forEach(track => {
          console.log(
            '📷 [WebRTC] Camera track:',
            {
              label: track.label,
              enabled: track.enabled,
              readyState:
                track.readyState
            }
          );
        });

        /*
         * --------------------------------------------------------
         * Attach camera BEFORE voice engine.
         * --------------------------------------------------------
         */
        attachLocalStream(
          acquiredStream
        );

        /*
         * --------------------------------------------------------
         * Hardware is now genuinely available.
         * --------------------------------------------------------
         */
        setHardwareReady(true);

        console.log(
          '✅ [WebRTC] Camera and microphone successfully opened.'
        );

        /*
         * --------------------------------------------------------
         * OPTIONAL VOICE ENGINE
         *
         * It can NEVER block camera startup.
         * --------------------------------------------------------
         */
        try {
          if (
            liveVoiceEngine &&
            typeof liveVoiceEngine.init ===
              'function'
          ) {
            const engineResult =
              liveVoiceEngine.init(
                acquiredStream
              );

            if (
              engineResult &&
              typeof engineResult.catch ===
                'function'
            ) {
              engineResult.catch(
                error => {
                  console.warn(
                    '⚠️ [WebRTC] Voice engine initialization failed:',
                    error?.message ||
                      error
                  );
                }
              );
            }

            console.log(
              '🎙️ [WebRTC] Voice engine initialized independently.'
            );
          }
        } catch (error) {
          console.warn(
            '⚠️ [WebRTC] Voice engine skipped:',
            error?.message || error
          );
        }
      } catch (error) {
        /*
         * Do NOT report a stale initialization as a
         * current camera failure.
         */
        if (
          !isCurrentInitialization()
        ) {
          return;
        }

        console.error(
          '❌ [WebRTC] CAMERA/MICROPHONE ACCESS FAILED:',
          {
            name: error?.name,
            message: error?.message,
            constraint:
              error?.constraint
          }
        );

        /*
         * Helpful diagnostic messages.
         */
        switch (error?.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            console.error(
              '🔐 [WebRTC] Camera/microphone permission was denied.'
            );
            break;

          case 'NotFoundError':
          case 'DevicesNotFoundError':
            console.error(
              '📷 [WebRTC] No camera or microphone was found.'
            );
            break;

          case 'NotReadableError':
          case 'TrackStartError':
            console.error(
              '📷 [WebRTC] Camera may already be in use by another application.'
            );
            break;

          case 'OverconstrainedError':
            console.error(
              '⚙️ [WebRTC] Camera constraints are not supported by this device.'
            );
            break;

          case 'SecurityError':
            console.error(
              '🔒 [WebRTC] Browser security policy blocked camera access.'
            );
            break;

          default:
            break;
        }

        setHardwareReady(false);

        setLocalStream(null);

        localStreamRef.current =
          null;

        mediaInitRef.current =
          false;
      }
    };

    requestMedia();

    /*
     * ------------------------------------------------------------
     * CLEANUP
     * ------------------------------------------------------------
     */
    return () => {
      cancelled = true;

      mountedRef.current = false;

      /*
       * Invalidate this generation.
       */
      if (
        mediaGenerationRef.current ===
        generation
      ) {
        mediaGenerationRef.current += 1;
      }

      mediaInitRef.current =
        false;

      /*
       * ----------------------------------------------------------
       * Close peer connections.
       * ----------------------------------------------------------
       */
      Object.entries(
        peerConnectionsRef.current
      ).forEach(
        ([peerId, pc]) => {
          try {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.onconnectionstatechange =
              null;
            pc.oniceconnectionstatechange =
              null;

            pc.close();
          } catch {
            // Ignore cleanup errors.
          }
        }
      );

      peerConnectionsRef.current =
        {};

      iceCandidatesQueueRef.current =
        {};

      remoteStreamsRef.current =
        {};

      /*
       * ----------------------------------------------------------
       * IMPORTANT STREAM CLEANUP
       *
       * Only stop the stream that belongs to THIS effect
       * generation.
       *
       * This prevents an old cleanup from stopping a newer
       * camera stream.
       * ----------------------------------------------------------
       */
      if (acquiredStream) {
        stopStream(
          acquiredStream
        );
      }

      /*
       * Only clear the shared stream reference if it
       * still belongs to this initialization.
       */
      if (
        localStreamRef.current ===
        acquiredStream
      ) {
        localStreamRef.current =
          null;

        setLocalStream(null);
      }

      /*
       * ----------------------------------------------------------
       * Clear local video element.
       * ----------------------------------------------------------
       */
      const localVideo =
        localVideoRef.current;

      if (localVideo) {
        localVideo.onloadedmetadata =
          null;

        if (
          localVideo.srcObject ===
          acquiredStream
        ) {
          localVideo.srcObject =
            null;
        }
      }

      /*
       * ----------------------------------------------------------
       * Clear remote video.
       * ----------------------------------------------------------
       */
      const remoteVideo =
        challengerVideoRef?.current;

      if (remoteVideo) {
        remoteVideo.onloadedmetadata =
          null;

        remoteVideo.srcObject =
          null;
      }

      /*
       * Only update React state if this effect
       * is still the active generation.
       */
      if (
        activeMediaGenerationRef.current ===
        generation
      ) {
        setHardwareReady(false);
        setPrimaryRemoteStream(
          null
        );
      }
    };
  }, [
    streamId,
    challengerVideoRef,
    stopStream
  ]);

  /*
   * ============================================================
   * RE-BIND LOCAL VIDEO
   * ============================================================
   *
   * This catches the case where:
   *
   * 1. Camera opens first.
   * 2. React video element mounts afterward.
   *
   * The camera stream is then attached to the newly mounted
   * video element.
   * ============================================================
   */

  useEffect(() => {
    if (
      !hardwareReady ||
      !localStream
    ) {
      return undefined;
    }

    const cleanup =
      bindLocalStreamToDOM();

    return cleanup;
  }, [
    hardwareReady,
    localStream,
    bindLocalStreamToDOM
  ]);

  /*
   * ============================================================
   * CAMERA / MICROPHONE TOGGLES
   * ============================================================
   */

  useEffect(() => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    stream
      .getAudioTracks()
      .forEach(track => {
        track.enabled =
          !isMuted;
      });

    stream
      .getVideoTracks()
      .forEach(track => {
        track.enabled =
          !isCameraOff;
      });

    console.log(
      `🎛️ [WebRTC] Camera=${
        !isCameraOff
          ? 'ON'
          : 'OFF'
      } | Mic=${
        !isMuted
          ? 'ON'
          : 'OFF'
      }`
    );
  }, [
    isMuted,
    isCameraOff,
    localStream
  ]);

  /*
   * ============================================================
   * ICE QUEUE
   * ============================================================
   */

  const flushIceCandidates =
    useCallback(
      async peerId => {
        const pc =
          peerConnectionsRef.current[
            peerId
          ];

        if (
          !pc ||
          !pc.remoteDescription
        ) {
          return;
        }

        const queue =
          iceCandidatesQueueRef.current[
            peerId
          ];

        if (
          !Array.isArray(queue) ||
          !queue.length
        ) {
          return;
        }

        console.log(
          `🧊 [WebRTC] Flushing ${queue.length} ICE candidates for ${peerId}`
        );

        const remaining =
          [];

        for (
          const candidate of queue
        ) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } catch (error) {
            console.warn(
              `⚠️ [WebRTC] ICE candidate failed for ${peerId}:`,
              error?.message ||
                error
            );

            remaining.push(
              candidate
            );
          }
        }

        if (
          remaining.length
        ) {
          iceCandidatesQueueRef.current[
            peerId
          ] = remaining;
        } else {
          delete iceCandidatesQueueRef.current[
            peerId
          ];
        }
      },
      []
    );

  /*
   * ============================================================
   * PEER CONNECTION
   * ============================================================
   */

  const createPeerConnection =
    useCallback(
      targetSocketId => {
        if (
          !targetSocketId ||
          !socket
        ) {
          return null;
        }

        const existing =
          peerConnectionsRef.current[
            targetSocketId
          ];

        if (existing) {
          return existing;
        }

        const pc =
          new RTCPeerConnection(
            GLOBAL_ICE_CONFIG
          );

        peerConnectionsRef.current[
          targetSocketId
        ] = pc;

        iceCandidatesQueueRef.current[
          targetSocketId
        ] =
          iceCandidatesQueueRef.current[
            targetSocketId
          ] || [];

        /*
         * --------------------------------------------------------
         * Add local tracks.
         * --------------------------------------------------------
         */
        const stream =
          localStreamRef.current;

        if (stream) {
          stream
            .getTracks()
            .forEach(track => {
              try {
                pc.addTrack(
                  track,
                  stream
                );
              } catch (error) {
                console.warn(
                  `⚠️ [WebRTC] Failed adding ${track.kind} track:`,
                  error?.message ||
                    error
                );
              }
            });
        }

        /*
         * --------------------------------------------------------
         * Remote tracks.
         * --------------------------------------------------------
         */
        pc.ontrack = event => {
          console.log(
            `🎥 [WebRTC] Remote ${event.track?.kind} track received from ${targetSocketId}`
          );

          const remoteStream =
            event.streams?.[0];

          if (remoteStream) {
            bindRemoteStreamToDOM(
              remoteStream
            );
          }
        };

        /*
         * --------------------------------------------------------
         * ICE.
         * --------------------------------------------------------
         */
        pc.onicecandidate =
          event => {
            if (
              !event.candidate
            ) {
              return;
            }

            if (
              !socket.connected
            ) {
              return;
            }

            socket.emit(
              'webrtc_ice_candidate',
              {
                streamId,
                candidate:
                  event.candidate,
                targetSocketId,
                senderType: 'host'
              }
            );
          };

        /*
         * --------------------------------------------------------
         * Connection state.
         * --------------------------------------------------------
         */
        pc.onconnectionstatechange =
          () => {
            console.log(
              `🌐 [WebRTC] Peer ${targetSocketId}: ${pc.connectionState}`
            );

            if (
              pc.connectionState ===
              'failed'
            ) {
              try {
                pc.close();
              } catch {
                // Ignore.
              }

              if (
                peerConnectionsRef.current[
                  targetSocketId
                ] === pc
              ) {
                delete peerConnectionsRef.current[
                  targetSocketId
                ];
              }

              delete iceCandidatesQueueRef.current[
                targetSocketId
              ];

              delete remoteStreamsRef.current[
                targetSocketId
              ];
            }
          };

        /*
         * --------------------------------------------------------
         * ICE state.
         * --------------------------------------------------------
         */
        pc.oniceconnectionstatechange =
          () => {
            console.log(
              `🧊 [WebRTC] ICE ${targetSocketId}: ${pc.iceConnectionState}`
            );

            if (
              pc.iceConnectionState ===
              'failed'
            ) {
              try {
                pc.restartIce?.();
              } catch {
                // Ignore.
              }
            }
          };

        return pc;
      },
      [
        socket,
        streamId,
        bindRemoteStreamToDOM
      ]
    );

  /*
   * ============================================================
   * SIGNALING
   * ============================================================
   */

  useEffect(() => {
    if (
      !socket ||
      !streamId ||
      !hardwareReady ||
      !localStreamRef.current
    ) {
      return undefined;
    }

    let cancelled = false;

    /*
     * ----------------------------------------------------------
     * Viewer requesting stream.
     * ----------------------------------------------------------
     */
    const handleViewerRequest =
      async payload => {
        if (cancelled) {
          return;
        }

        const viewerId =
          payload?.viewerSocketId ||
          payload?.socketId ||
          payload?.viewerId;

        if (!viewerId) {
          return;
        }

        try {
          const pc =
            createPeerConnection(
              viewerId
            );

          if (!pc) {
            return;
          }

          if (
            pc.signalingState !==
            'stable'
          ) {
            return;
          }

          const offer =
            await pc.createOffer();

          if (cancelled) {
            return;
          }

          await pc.setLocalDescription(
            offer
          );

          socket.emit(
            'send_webrtc_offer',
            {
              streamId,
              offer:
                pc.localDescription,
              targetViewerId:
                viewerId
            }
          );

          console.log(
            `📤 [WebRTC] Offer sent to ${viewerId}`
          );
        } catch (error) {
          console.error(
            `❌ [WebRTC] Offer failed for ${viewerId}:`,
            error?.message ||
              error
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Incoming offer.
     * ----------------------------------------------------------
     */
    const handleIncomingOffer =
      async payload => {
        if (cancelled) {
          return;
        }

        const senderId =
          payload?.senderSocketId ||
          payload?.guestSocketId ||
          payload?.socketId ||
          payload?.senderId;

        const offer =
          payload?.offer;

        if (
          !senderId ||
          !offer
        ) {
          return;
        }

        try {
          const pc =
            createPeerConnection(
              senderId
            );

          if (!pc) {
            return;
          }

          if (
            !pc.currentRemoteDescription
          ) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(
                offer
              )
            );
          }

          await flushIceCandidates(
            senderId
          );

          if (
            pc.signalingState !==
            'have-remote-offer'
          ) {
            return;
          }

          const answer =
            await pc.createAnswer();

          await pc.setLocalDescription(
            answer
          );

          socket.emit(
            'send_webrtc_answer',
            {
              streamId,
              answer:
                pc.localDescription,
              targetSocketId:
                senderId
            }
          );

          console.log(
            `📤 [WebRTC] Answer sent to ${senderId}`
          );
        } catch (error) {
          console.error(
            '❌ [WebRTC] Offer handling failed:',
            error?.message ||
              error
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Answer.
     * ----------------------------------------------------------
     */
    const handleAnswerReceived =
      async payload => {
        if (cancelled) {
          return;
        }

        const viewerId =
          payload?.viewerSocketId ||
          payload?.senderSocketId ||
          payload?.targetSocketId ||
          payload?.viewerId;

        const answer =
          payload?.answer;

        if (
          !viewerId ||
          !answer
        ) {
          return;
        }

        const pc =
          peerConnectionsRef.current[
            viewerId
          ];

        if (!pc) {
          return;
        }

        try {
          if (
            pc.signalingState !==
            'have-local-offer'
          ) {
            return;
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          );

          await flushIceCandidates(
            viewerId
          );

          console.log(
            `⚡ [WebRTC] Answer applied for ${viewerId}`
          );
        } catch (error) {
          console.error(
            `❌ [WebRTC] Answer failed for ${viewerId}:`,
            error?.message ||
              error
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Incoming ICE candidate.
     * ----------------------------------------------------------
     */
    const handleIncomingIceCandidate =
      async payload => {
        if (cancelled) {
          return;
        }

        const senderId =
          payload?.senderSocketId ||
          payload?.senderId ||
          payload?.socketId;

        const candidate =
          payload?.candidate;

        if (
          !senderId ||
          !candidate
        ) {
          return;
        }

        const pc =
          peerConnectionsRef.current[
            senderId
          ];

        /*
         * Queue candidates that arrive before the
         * remote description.
         */
        if (
          !pc ||
          !pc.remoteDescription
        ) {
          iceCandidatesQueueRef.current[
            senderId
          ] =
            iceCandidatesQueueRef.current[
              senderId
            ] || [];

          iceCandidatesQueueRef.current[
            senderId
          ].push(candidate);

          return;
        }

        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
        } catch (error) {
          console.warn(
            '⚠️ [WebRTC] ICE candidate failed:',
            error?.message ||
              error
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Socket listeners.
     * ----------------------------------------------------------
     */
    socket.on(
      'viewer_requesting_stream',
      handleViewerRequest
    );

    socket.on(
      'receive_webrtc_offer',
      handleIncomingOffer
    );

    socket.on(
      'webrtc_offer_received',
      handleIncomingOffer
    );

    socket.on(
      'webrtc_answer_received',
      handleAnswerReceived
    );

    socket.on(
      'incoming_ice_candidate',
      handleIncomingIceCandidate
    );

    /*
     * ----------------------------------------------------------
     * Cleanup listeners ONLY.
     *
     * Peer connections are owned by the main lifecycle effect.
     * ----------------------------------------------------------
     */
    return () => {
      cancelled = true;

      socket.off(
        'viewer_requesting_stream',
        handleViewerRequest
      );

      socket.off(
        'receive_webrtc_offer',
        handleIncomingOffer
      );

      socket.off(
        'webrtc_offer_received',
        handleIncomingOffer
      );

      socket.off(
        'webrtc_answer_received',
        handleAnswerReceived
      );

      socket.off(
        'incoming_ice_candidate',
        handleIncomingIceCandidate
      );
    };
  }, [
    socket,
    streamId,
    hardwareReady,
    localStream,
    createPeerConnection,
    flushIceCandidates
  ]);

  /*
   * ============================================================
   * REMOTE VIDEO SYNCHRONIZATION
   * ============================================================
   */

  useEffect(() => {
    const video =
      challengerVideoRef?.current;

    if (
      !video ||
      !(video instanceof HTMLVideoElement) ||
      !primaryRemoteStream
    ) {
      return;
    }

    if (
      video.srcObject !==
      primaryRemoteStream
    ) {
      video.srcObject =
        primaryRemoteStream;
    }

    video.autoplay = true;
    video.playsInline = true;

    video
      .play()
      .catch(() => {});
  }, [
    primaryRemoteStream,
    challengerVideoRef
  ]);

  /*
   * ============================================================
   * PUBLIC API
   * ============================================================
   */

  return {
    /*
     * Existing API.
     */
    localVideoRef,

    hardwareReady,

    primaryRemoteStream,

    /*
     * NEW:
     * Actual local MediaStream exposed to StreamDashboard.
     *
     * DynamicStreamGrid can now receive:
     *
     * hostStream={localStream}
     */
    localStream
  };
};

