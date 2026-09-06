
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

  const [localStream, setLocalStream] = useState(null);

  /*
   * ============================================================
   * WEBRTC STATE
   * ============================================================
   */

  const peerConnectionsRef = useRef({});
  const iceCandidatesQueueRef = useRef({});
  const remoteStreamsRef = useRef({});

  /*
   * Prevent duplicate negotiations for the same viewer.
   */
  const negotiatingPeersRef = useRef(new Set());

  /*
   * ============================================================
   * LIFECYCLE STATE
   * ============================================================
   */

  const mountedRef = useRef(false);
  const mediaInitRef = useRef(false);

  const mediaGenerationRef = useRef(0);
  const activeMediaGenerationRef = useRef(0);

  const localVideoRetryTimerRef = useRef(null);
  const localVideoRetryCountRef = useRef(0);

  const [hardwareReady, setHardwareReady] = useState(false);

  const [
    primaryRemoteStream,
    setPrimaryRemoteStream
  ] = useState(null);

  /*
   * ============================================================
   * STREAM CLEANUP
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
        // Ignore cleanup errors.
      }
    });
  }, []);

  /*
   * ============================================================
   * LOCAL VIDEO PLAY
   * ============================================================
   */

  const playLocalVideo = useCallback(video => {
    if (
      !video ||
      !(video instanceof HTMLVideoElement)
    ) {
      return;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    const attemptPlay = async () => {
      try {
        await video.play();

        console.log(
          '▶️ [WebRTC] Local camera video is playing.'
        );
      } catch (error) {
        console.warn(
          '⚠️ [WebRTC] Local video play() failed:',
          error?.name,
          error?.message || error
        );
      }
    };

    if (video.readyState >= 1) {
      attemptPlay();
      return;
    }

    const handleMetadata = () => {
      video.removeEventListener(
        'loadedmetadata',
        handleMetadata
      );

      attemptPlay();
    };

    video.addEventListener(
      'loadedmetadata',
      handleMetadata,
      {
        once: true
      }
    );
  }, []);

  /*
   * ============================================================
   * LOCAL VIDEO BINDING
   * ============================================================
   */

  const bindLocalStreamToDOM = useCallback(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;

    if (
      !video ||
      !(video instanceof HTMLVideoElement) ||
      !stream
    ) {
      return false;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;

      console.log(
        '📡 [WebRTC] Local MediaStream attached to video element.'
      );
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    playLocalVideo(video);

    return true;
  }, [playLocalVideo]);

  /*
   * ============================================================
   * LOCAL VIDEO RETRY
   * ============================================================
   */

  const stopLocalVideoRetry = useCallback(() => {
    if (localVideoRetryTimerRef.current) {
      clearTimeout(
        localVideoRetryTimerRef.current
      );

      localVideoRetryTimerRef.current = null;
    }

    localVideoRetryCountRef.current = 0;
  }, []);

  const startLocalVideoRetry = useCallback(() => {
    stopLocalVideoRetry();

    const maximumAttempts = 50;
    const retryDelay = 100;

    const attempt = () => {
      if (!mountedRef.current) {
        return;
      }

      if (!localStreamRef.current) {
        return;
      }

      const bound =
        bindLocalStreamToDOM();

      if (bound) {
        console.log(
          '✅ [WebRTC] Local camera preview successfully bound.'
        );

        stopLocalVideoRetry();
        return;
      }

      localVideoRetryCountRef.current += 1;

      if (
        localVideoRetryCountRef.current >=
        maximumAttempts
      ) {
        console.warn(
          '⚠️ [WebRTC] Local video element was not found after repeated binding attempts.'
        );

        stopLocalVideoRetry();
        return;
      }

      localVideoRetryTimerRef.current =
        setTimeout(
          attempt,
          retryDelay
        );
    };

    attempt();
  }, [
    bindLocalStreamToDOM,
    stopLocalVideoRetry
  ]);

  /*
   * ============================================================
   * REMOTE VIDEO
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
              previous?.id ===
              stream.id
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

        if (
          video.srcObject !== stream
        ) {
          video.srcObject = stream;
        }

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
   * CLOSE ONE PEER
   * ============================================================
   */

  const closePeerConnection =
    useCallback(targetSocketId => {
      if (!targetSocketId) {
        return;
      }

      const pc =
        peerConnectionsRef.current[
          targetSocketId
        ];

      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.onconnectionstatechange = null;
          pc.oniceconnectionstatechange = null;

          pc.close();
        } catch {
          // Ignore cleanup errors.
        }
      }

      delete peerConnectionsRef.current[
        targetSocketId
      ];

      delete iceCandidatesQueueRef.current[
        targetSocketId
      ];

      delete remoteStreamsRef.current[
        targetSocketId
      ];

      negotiatingPeersRef.current.delete(
        targetSocketId
      );

      console.log(
        '🧹 [WebRTC] Peer cleaned:',
        targetSocketId
      );
    }, []);

  /*
   * ============================================================
   * CLOSE ALL PEERS
   * ============================================================
   */

  const closeAllPeerConnections =
    useCallback(() => {
      Object.keys(
        peerConnectionsRef.current
      ).forEach(targetSocketId => {
        closePeerConnection(
          targetSocketId
        );
      });

      peerConnectionsRef.current = {};
      iceCandidatesQueueRef.current = {};
      remoteStreamsRef.current = {};
      negotiatingPeersRef.current.clear();

      setPrimaryRemoteStream(null);
    }, [closePeerConnection]);

  /*
   * ============================================================
   * HARDWARE INITIALIZATION
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

    const generation =
      mediaGenerationRef.current + 1;

    mediaGenerationRef.current =
      generation;

    activeMediaGenerationRef.current =
      generation;

    let cancelled = false;
    let acquiredStream = null;

    const isCurrentInitialization =
      () => {
        return (
          !cancelled &&
          mountedRef.current &&
          mediaGenerationRef.current ===
            generation
        );
      };

    const attachLocalStream =
      stream => {
        if (
          !stream ||
          !isCurrentInitialization()
        ) {
          return;
        }

        localStreamRef.current =
          stream;

        setLocalStream(stream);

        const attached =
          bindLocalStreamToDOM();

        if (!attached) {
          console.log(
            '⏳ [WebRTC] Camera opened before local video mounted. Waiting for video element...'
          );

          startLocalVideoRetry();
        }
      };

    const requestMedia =
      async () => {
        if (mediaInitRef.current) {
          return;
        }

        mediaInitRef.current = true;

        try {
          if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices
              .getUserMedia !==
              'function'
          ) {
            throw new Error(
              'Browser getUserMedia API is unavailable.'
            );
          }

          console.log(
            '🎥 [WebRTC] Requesting camera and microphone...'
          );

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
            console.warn(
              '⚠️ [WebRTC] Preferred camera constraints failed:',
              firstError?.name,
              firstError?.message ||
                firstError
            );

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

          if (
            !isCurrentInitialization()
          ) {
            console.warn(
              '🧹 [WebRTC] Ignoring stale camera stream.'
            );

            stopStream(
              acquiredStream
            );

            acquiredStream = null;

            return;
          }

          localStreamRef.current =
            acquiredStream;

          setLocalStream(
            acquiredStream
          );

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

          videoTracks.forEach(
            track => {
              console.log(
                '📷 [WebRTC] Camera track:',
                {
                  label:
                    track.label,
                  enabled:
                    track.enabled,
                  readyState:
                    track.readyState
                }
              );
            }
          );

          attachLocalStream(
            acquiredStream
          );

          setHardwareReady(true);

          console.log(
            '✅ [WebRTC] Camera and microphone successfully opened.'
          );

          startLocalVideoRetry();

          /*
           * Voice engine is intentionally isolated
           * from camera startup.
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
              error?.message ||
                error
            );
          }
        } catch (error) {
          if (
            !isCurrentInitialization()
          ) {
            return;
          }

          console.error(
            '❌ [WebRTC] CAMERA/MICROPHONE ACCESS FAILED:',
            {
              name: error?.name,
              message:
                error?.message,
              constraint:
                error?.constraint
            }
          );

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

    return () => {
      cancelled = true;

      mountedRef.current = false;

      stopLocalVideoRetry();

      if (
        mediaGenerationRef.current ===
        generation
      ) {
        mediaGenerationRef.current +=
          1;
      }

      mediaInitRef.current =
        false;

      closeAllPeerConnections();

      if (acquiredStream) {
        stopStream(
          acquiredStream
        );
      }

      if (
        localStreamRef.current ===
        acquiredStream
      ) {
        localStreamRef.current =
          null;

        setLocalStream(null);
      }

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

      const remoteVideo =
        challengerVideoRef?.current;

      if (remoteVideo) {
        remoteVideo.onloadedmetadata =
          null;

        remoteVideo.srcObject =
          null;
      }

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
    stopStream,
    bindLocalStreamToDOM,
    startLocalVideoRetry,
    stopLocalVideoRetry,
    closeAllPeerConnections
  ]);

  /*
   * ============================================================
   * RE-BIND LOCAL VIDEO AFTER RENDER
   * ============================================================
   */

  useEffect(() => {
    if (
      !hardwareReady ||
      !localStream
    ) {
      return undefined;
    }

    bindLocalStreamToDOM();
    startLocalVideoRetry();

    return () => {
      stopLocalVideoRetry();
    };
  }, [
    hardwareReady,
    localStream,
    bindLocalStreamToDOM,
    startLocalVideoRetry,
    stopLocalVideoRetry
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
        track.enabled = !isMuted;
      });

    stream
      .getVideoTracks()
      .forEach(track => {
        track.enabled = !isCameraOff;
      });

    console.log(
      '🎛️ [WebRTC] Camera=' +
        (!isCameraOff
          ? 'ON'
          : 'OFF') +
        ' | Mic=' +
        (!isMuted
          ? 'ON'
          : 'OFF')
    );

    if (!isCameraOff) {
      bindLocalStreamToDOM();
    }
  }, [
    isMuted,
    isCameraOff,
    localStream,
    bindLocalStreamToDOM
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
          '🧊 [WebRTC] Flushing ' +
            queue.length +
            ' ICE candidates for ' +
            peerId
        );

        const candidates = [
          ...queue
        ];

        iceCandidatesQueueRef.current[
          peerId
        ] = [];

        for (
          const candidate of candidates
        ) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } catch (error) {
            console.warn(
              '⚠️ [WebRTC] ICE candidate failed for ' +
                peerId +
                ':',
              error?.message ||
                error
            );

            iceCandidatesQueueRef.current[
              peerId
            ].push(candidate);
          }
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
          if (
            existing.connectionState !==
              'closed' &&
            existing.connectionState !==
              'failed'
          ) {
            return existing;
          }

          closePeerConnection(
            targetSocketId
          );
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
         * Add local camera + microphone.
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
                  '⚠️ [WebRTC] Failed adding ' +
                    track.kind +
                    ' track:',
                  error?.message ||
                    error
                );
              }
            });
        }

        /*
         * Remote media.
         */
        pc.ontrack = event => {
          if (!mountedRef.current) {
            return;
          }

          console.log(
            '🎥 [WebRTC] Remote ' +
              event.track?.kind +
              ' track received from ' +
              targetSocketId
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
         * Local ICE candidates.
         */
        pc.onicecandidate =
          event => {
            if (
              !event.candidate ||
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
         * Connection state.
         */
        pc.onconnectionstatechange =
          () => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            console.log(
              '🌐 [WebRTC] Peer ' +
                targetSocketId +
                ': ' +
                pc.connectionState
            );

            if (
              pc.connectionState ===
              'connected'
            ) {
              console.log(
                '🟢 [WebRTC] Peer ' +
                  targetSocketId +
                  ' is connected.'
              );
            }

            if (
              pc.connectionState ===
              'disconnected'
            ) {
              console.warn(
                '🟠 [WebRTC] Peer ' +
                  targetSocketId +
                  ' temporarily disconnected.'
              );

              /*
               * Do not immediately destroy the peer.
               *
               * Browsers can temporarily report
               * disconnected during network changes.
               */
              setTimeout(() => {
                if (
                  !mountedRef.current
                ) {
                  return;
                }

                const currentPc =
                  peerConnectionsRef
                    .current[
                    targetSocketId
                  ];

                if (
                  currentPc !== pc
                ) {
                  return;
                }

                if (
                  pc.connectionState ===
                    'disconnected' ||
                  pc.connectionState ===
                    'failed'
                ) {
                  console.warn(
                    '🧹 [WebRTC] Removing stale peer ' +
                      targetSocketId
                  );

                  closePeerConnection(
                    targetSocketId
                  );
                }
              }, 5000);
            }

            if (
              pc.connectionState ===
              'failed'
            ) {
              console.error(
                '❌ [WebRTC] Peer ' +
                  targetSocketId +
                  ' connection FAILED.'
              );

              closePeerConnection(
                targetSocketId
              );
            }

            if (
              pc.connectionState ===
              'closed'
            ) {
              closePeerConnection(
                targetSocketId
              );
            }
          };

        /*
         * ICE state.
         */
        pc.oniceconnectionstatechange =
          () => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            console.log(
              '🧊 [WebRTC] ICE ' +
                targetSocketId +
                ': ' +
                pc.iceConnectionState
            );

            if (
              pc.iceConnectionState ===
              'failed'
            ) {
              console.warn(
                '❌ [WebRTC] ICE failed for ' +
                  targetSocketId +
                  '. Cleaning peer so a fresh negotiation can occur.'
              );

              closePeerConnection(
                targetSocketId
              );
            }
          };

        return pc;
      },
      [
        socket,
        streamId,
        bindRemoteStreamToDOM,
        closePeerConnection
      ]
    );

  /*
   * ============================================================
   * SOCKET RECONNECT HANDLING
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !streamId) {
      return undefined;
    }

    const handleSocketConnect =
      () => {
        console.log(
          '🟢 [WebRTC] Signaling socket connected:',
          socket.id
        );

        /*
         * Any old peer connections belong to the
         * previous signaling session.
         *
         * The camera itself stays alive.
         */
        Object.keys(
          peerConnectionsRef.current
        ).forEach(targetSocketId => {
          closePeerConnection(
            targetSocketId
          );
        });

        if (
          socket.connected &&
          localStreamRef.current
        ) {
          console.log(
            '🔄 [WebRTC] Signaling restored. Waiting for viewers to renegotiate.'
          );
        }
      };

    const handleSocketDisconnect =
      reason => {
        console.warn(
          '🟠 [WebRTC] Signaling socket disconnected:',
          reason
        );

        /*
         * WebRTC peers using this socket can no
         * longer exchange ICE/signaling messages.
         *
         * Keep the camera alive; remove only peers.
         */
        Object.keys(
          peerConnectionsRef.current
        ).forEach(targetSocketId => {
          closePeerConnection(
            targetSocketId
          );
        });
      };

    socket.on(
      'connect',
      handleSocketConnect
    );

    socket.on(
      'disconnect',
      handleSocketDisconnect
    );

    return () => {
      socket.off(
        'connect',
        handleSocketConnect
      );

      socket.off(
        'disconnect',
        handleSocketDisconnect
      );
    };
  }, [
    socket,
    streamId,
    closePeerConnection
  ]);

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
     * ------------------------------------------------------------
     * VIEWER REQUEST
     * ------------------------------------------------------------
     */

    const handleViewerRequest =
      async payload => {
        if (
          cancelled ||
          !mountedRef.current
        ) {
          return;
        }

        const viewerId =
          payload?.viewerSocketId ||
          payload?.socketId ||
          payload?.viewerId;

        if (!viewerId) {
          console.warn(
            '⚠️ [WebRTC] Viewer request without viewer ID.'
          );

          return;
        }

        if (
          negotiatingPeersRef.current.has(
            viewerId
          )
        ) {
          console.log(
            'ℹ️ [WebRTC] Negotiation already running for ' +
              viewerId
          );

          return;
        }

        try {
          negotiatingPeersRef.current.add(
            viewerId
          );

          /*
           * If an old failed peer exists,
           * remove it first.
           */
          const existing =
            peerConnectionsRef.current[
              viewerId
            ];

          if (
            existing &&
            (
              existing.connectionState ===
                'failed' ||
              existing.connectionState ===
                'closed'
            )
          ) {
            closePeerConnection(
              viewerId
            );
          }

          const pc =
            createPeerConnection(
              viewerId
            );

          if (!pc) {
            return;
          }

          /*
           * Only create an offer from a stable
           * signaling state.
           */
          if (
            pc.signalingState !==
            'stable'
          ) {
            console.log(
              'ℹ️ [WebRTC] Peer ' +
                viewerId +
                ' is not stable; skipping duplicate offer.'
            );

            return;
          }

          const offer =
            await pc.createOffer();

          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          await pc.setLocalDescription(
            offer
          );

          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

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
            '📤 [WebRTC] Offer sent to ' +
              viewerId
          );
        } catch (error) {
          console.error(
            '❌ [WebRTC] Offer failed for ' +
              viewerId +
              ':',
            error?.message ||
              error
          );

          closePeerConnection(
            viewerId
          );
        } finally {
          negotiatingPeersRef.current.delete(
            viewerId
          );
        }
      };

    /*
     * ------------------------------------------------------------
     * INCOMING OFFER
     * ------------------------------------------------------------
     *
     * This supports guest/co-host negotiation.
     * ------------------------------------------------------------
     */

    const handleIncomingOffer =
      async payload => {
        if (
          cancelled ||
          !mountedRef.current
        ) {
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
          let pc =
            peerConnectionsRef.current[
              senderId
            ];

          /*
           * If the old peer is unusable,
           * recreate it.
           */
          if (
            pc &&
            (
              pc.connectionState ===
                'failed' ||
              pc.connectionState ===
                'closed'
            )
          ) {
            closePeerConnection(
              senderId
            );

            pc = null;
          }

          if (!pc) {
            pc =
              createPeerConnection(
                senderId
              );
          }

          if (!pc) {
            return;
          }

          /*
           * Ignore duplicate offer when we already
           * have a remote description.
           */
          if (
            pc.remoteDescription
          ) {
            console.log(
              'ℹ️ [WebRTC] Duplicate offer ignored for ' +
                senderId
            );

            return;
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

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

          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

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
            '📤 [WebRTC] Answer sent to ' +
              senderId
          );
        } catch (error) {
          console.error(
            '❌ [WebRTC] Offer handling failed:',
            error?.message ||
              error
          );

          closePeerConnection(
            senderId
          );
        }
      };

    /*
     * ------------------------------------------------------------
     * ANSWER
     * ------------------------------------------------------------
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
          console.warn(
            '⚠️ [WebRTC] Answer received but peer no longer exists:',
            viewerId
          );

          return;
        }

        try {
          if (
            pc.signalingState !==
            'have-local-offer'
          ) {
            console.log(
              'ℹ️ [WebRTC] Ignoring answer because peer state is ' +
                pc.signalingState
            );

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
            '⚡ [WebRTC] Answer applied for ' +
              viewerId
          );
        } catch (error) {
          console.error(
            '❌ [WebRTC] Answer failed for ' +
              viewerId +
              ':',
            error?.message ||
              error
          );

          closePeerConnection(
            viewerId
          );
        }
      };

    /*
     * ------------------------------------------------------------
     * INCOMING ICE
     * ------------------------------------------------------------
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
         * Candidate arrived before the peer or
         * before remoteDescription.
         *
         * Queue it.
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
            '⚠️ [WebRTC] ICE candidate failed for ' +
              senderId +
              ':',
            error?.message ||
              error
          );
        }
      };

    /*
     * ------------------------------------------------------------
     * SOCKET LISTENERS
     * ------------------------------------------------------------
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
    flushIceCandidates,
    closePeerConnection
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

    video.play().catch(() => {});
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
    localVideoRef,

    hardwareReady,

    primaryRemoteStream,

    localStream
  };
};
