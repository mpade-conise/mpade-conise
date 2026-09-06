```jsx
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

const PEER_DISCONNECT_GRACE_PERIOD = 10000;

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
   * Prevent duplicate negotiations/offers from racing.
   */
  const negotiatingPeersRef = useRef(new Set());

  /*
   * Prevent the same incoming offer from being processed twice.
   *
   * This is important because the application currently listens
   * to both:
   *
   * receive_webrtc_offer
   * webrtc_offer_received
   *
   * If the backend forwards the same offer through both events,
   * two async handlers can otherwise call setRemoteDescription()
   * at the same time.
   */
  const incomingOfferProcessingRef = useRef(new Set());

  /*
   * Delayed peer cleanup.
   *
   * A temporary "disconnected" state does NOT necessarily mean
   * the WebRTC connection is dead.
   */
  const peerCleanupTimersRef = useRef({});

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
   * PEER TIMER CLEANUP
   * ============================================================
   */

  const clearPeerCleanupTimer = useCallback(
    peerId => {
      const timer =
        peerCleanupTimersRef.current[
          peerId
        ];

      if (timer) {
        clearTimeout(timer);

        delete peerCleanupTimersRef.current[
          peerId
        ];
      }
    },
    []
  );

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
   * BIND LOCAL STREAM
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

    /*
     * Only call play when necessary.
     *
     * This avoids repeatedly interrupting a video that is
     * already playing.
     */
    if (video.paused) {
      playLocalVideo(video);
    }

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

      const stream =
        localStreamRef.current;

      if (!stream) {
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

        const previousStream =
          remoteStreamsRef.current[
            streamKey
          ];

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

        /*
         * IMPORTANT:
         *
         * ontrack fires separately for audio and video.
         *
         * Both tracks normally belong to the SAME MediaStream.
         * Reassigning srcObject twice can cause:
         *
         * "The play() request was interrupted by a new load request."
         *
         * Therefore only replace srcObject when the stream
         * actually changed.
         */
        const streamChanged =
          video.srcObject !== stream;

        if (streamChanged) {
          video.srcObject = stream;
        }

        video.autoplay = true;
        video.playsInline = true;

        /*
         * Do not repeatedly call play() for the exact same
         * stream while it is already playing.
         */
        if (
          streamChanged ||
          video.paused
        ) {
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

          if (
            video.readyState >= 1
          ) {
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
        }

        if (
          streamChanged ||
          !previousStream
        ) {
          console.log(
            '🎥 [WebRTC] Remote media stream attached.'
          );
        }
      },
      [challengerVideoRef]
    );

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
           * Voice engine must never block camera startup.
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
              message: error?.message,
              constraint:
                error?.constraint
            }
          );

          switch (
            error?.name
          ) {
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
        mediaGenerationRef.current += 1;
      }

      mediaInitRef.current =
        false;

      /*
       * Clear delayed peer cleanup timers.
       */
      Object.keys(
        peerCleanupTimersRef.current
      ).forEach(peerId => {
        clearPeerCleanupTimer(
          peerId
        );
      });

      /*
       * Close peer connections.
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

          clearPeerCleanupTimer(
            peerId
          );
        }
      );

      peerConnectionsRef.current =
        {};

      iceCandidatesQueueRef.current =
        {};

      remoteStreamsRef.current =
        {};

      negotiatingPeersRef.current.clear();

      incomingOfferProcessingRef.current.clear();

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
        remoteVideo.srcObject = null;
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
    clearPeerCleanupTimer
  ]);

  /*
   * ============================================================
   * RE-BIND LOCAL VIDEO AFTER REACT RENDER
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
   * PEER REMOVAL
   * ============================================================
   */

  const removePeerConnection =
    useCallback(
      (peerId, expectedPc = null) => {
        if (!peerId) {
          return;
        }

        clearPeerCleanupTimer(
          peerId
        );

        const pc =
          peerConnectionsRef.current[
            peerId
          ];

        if (
          expectedPc &&
          pc &&
          pc !== expectedPc
        ) {
          return;
        }

        if (pc) {
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

        if (
          !expectedPc ||
          peerConnectionsRef.current[
            peerId
          ] === expectedPc
        ) {
          delete peerConnectionsRef.current[
            peerId
          ];
        }

        delete iceCandidatesQueueRef.current[
          peerId
        ];

        delete remoteStreamsRef.current[
          peerId
        ];

        negotiatingPeersRef.current.delete(
          peerId
        );

        incomingOfferProcessingRef.current.delete(
          peerId
        );

        console.log(
          '🧹 [WebRTC] Peer cleaned: ' +
            peerId
        );
      },
      [clearPeerCleanupTimer]
    );

  /*
   * ============================================================
   * DELAYED PEER CLEANUP
   * ============================================================
   */

  const schedulePeerCleanup =
    useCallback(
      (peerId, pc) => {
        if (!peerId || !pc) {
          return;
        }

        clearPeerCleanupTimer(
          peerId
        );

        peerCleanupTimersRef.current[
          peerId
        ] = setTimeout(() => {
          const currentPc =
            peerConnectionsRef.current[
              peerId
            ];

          if (
            currentPc !== pc
          ) {
            return;
          }

          const state =
            pc.connectionState;

          const iceState =
            pc.iceConnectionState;

          /*
           * Give WebRTC a chance to recover.
           */
          if (
            state ===
              'connected' ||
            state ===
              'connecting' ||
            iceState ===
              'connected' ||
            iceState ===
              'completed'
          ) {
            console.log(
              '🟢 [WebRTC] Peer recovered before cleanup: ' +
                peerId
            );

            return;
          }

          console.warn(
            '🧹 [WebRTC] Removing stale peer after grace period: ' +
              peerId
          );

          removePeerConnection(
            peerId,
            pc
          );
        }, PEER_DISCONNECT_GRACE_PERIOD);
      },
      [
        clearPeerCleanupTimer,
        removePeerConnection
      ]
    );

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

        const remaining = [];

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
              '⚠️ [WebRTC] ICE candidate failed for ' +
                peerId +
                ':',
              error?.message ||
                error
            );

            remaining.push(
              candidate
            );
          }
        }

        if (remaining.length) {
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
          const state =
            existing.connectionState;

          /*
           * Reuse healthy or still-negotiating
           * connections.
           */
          if (
            state === 'new' ||
            state === 'connecting' ||
            state === 'connected'
          ) {
            clearPeerCleanupTimer(
              targetSocketId
            );

            return existing;
          }

          /*
           * A failed/closed peer should not be
           * reused.
           */
          removePeerConnection(
            targetSocketId,
            existing
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
         * Add local tracks.
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
         * Remote tracks.
         */
        pc.ontrack = event => {
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
         * ICE candidates.
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
                senderType:
                  'host'
              }
            );
          };

        /*
         * Connection state.
         */
        pc.onconnectionstatechange =
          () => {
            const state =
              pc.connectionState;

            console.log(
              '🌐 [WebRTC] Peer ' +
                targetSocketId +
                ': ' +
                state
            );

            if (
              state === 'connected'
            ) {
              clearPeerCleanupTimer(
                targetSocketId
              );

              console.log(
                '🟢 [WebRTC] Peer ' +
                  targetSocketId +
                  ' is connected.'
              );

              return;
            }

            if (
              state === 'connecting' ||
              state === 'new'
            ) {
              clearPeerCleanupTimer(
                targetSocketId
              );

              return;
            }

            if (
              state ===
                'disconnected' ||
              state ===
                'failed'
            ) {
              console.warn(
                '🟠 [WebRTC] Peer ' +
                  targetSocketId +
                  ' temporarily disconnected.'
              );

              /*
               * DO NOT immediately close it.
               *
               * Browser WebRTC connections can move through
               * disconnected briefly during network changes.
               */
              schedulePeerCleanup(
                targetSocketId,
                pc
              );

              return;
            }

            if (
              state === 'closed'
            ) {
              removePeerConnection(
                targetSocketId,
                pc
              );
            }
          };

        /*
         * ICE state.
         */
        pc.oniceconnectionstatechange =
          () => {
            const state =
              pc.iceConnectionState;

            console.log(
              '🧊 [WebRTC] ICE ' +
                targetSocketId +
                ': ' +
                state
            );

            if (
              state ===
                'connected' ||
              state ===
                'completed'
            ) {
              clearPeerCleanupTimer(
                targetSocketId
              );

              return;
            }

            if (
              state ===
                'disconnected'
            ) {
              schedulePeerCleanup(
                targetSocketId,
                pc
              );

              return;
            }

            if (
              state === 'failed'
            ) {
              console.warn(
                '⚠️ [WebRTC] ICE failed for ' +
                  targetSocketId
              );

              /*
               * Ask the browser to prepare a new ICE
               * generation. We do not immediately destroy
               * the peer because the connection-state handler
               * has a recovery grace period.
               */
              try {
                if (
                  typeof pc.restartIce ===
                  'function'
                ) {
                  pc.restartIce();

                  console.log(
                    '🔄 [WebRTC] ICE restart requested for ' +
                      targetSocketId
                  );
                }
              } catch (error) {
                console.warn(
                  '⚠️ [WebRTC] ICE restart failed:',
                  error?.message ||
                    error
                );
              }

              schedulePeerCleanup(
                targetSocketId,
                pc
              );
            }
          };

        return pc;
      },
      [
        socket,
        streamId,
        bindRemoteStreamToDOM,
        clearPeerCleanupTimer,
        removePeerConnection,
        schedulePeerCleanup
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
     * Viewer requesting stream
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

        /*
         * Prevent duplicate viewer requests from causing
         * multiple simultaneous createOffer() operations.
         */
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

        const existing =
          peerConnectionsRef.current[
            viewerId
          ];

        if (
          existing &&
          (
            existing.connectionState ===
              'connected' ||
            existing.connectionState ===
              'connecting'
          )
        ) {
          console.log(
            'ℹ️ [WebRTC] Viewer already has an active peer: ' +
              viewerId
          );

          clearPeerCleanupTimer(
            viewerId
          );

          return;
        }

        negotiatingPeersRef.current.add(
          viewerId
        );

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
            console.log(
              'ℹ️ [WebRTC] Peer is not stable for offer: ' +
                viewerId +
                ' | state=' +
                pc.signalingState
            );

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

          if (cancelled) {
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
        } finally {
          negotiatingPeersRef.current.delete(
            viewerId
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Incoming offer
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

        /*
         * Prevent the same offer from being handled twice
         * when both backend event names are received.
         */
        if (
          incomingOfferProcessingRef.current.has(
            senderId
          )
        ) {
          console.log(
            'ℹ️ [WebRTC] Duplicate offer ignored for ' +
              senderId
          );

          return;
        }

        incomingOfferProcessingRef.current.add(
          senderId
        );

        try {
          let pc =
            peerConnectionsRef.current[
              senderId
            ];

          /*
           * If an old connection is unusable, remove it first.
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
            removePeerConnection(
              senderId,
              pc
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
           * Ignore duplicate offers that arrive after the
           * current remote description has already been set.
           */
          if (
            pc.currentRemoteDescription
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

          if (cancelled) {
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
        } finally {
          /*
           * Release the lock after the asynchronous operation
           * finishes. A future legitimate offer can then be
           * processed.
           */
          incomingOfferProcessingRef.current.delete(
            senderId
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * Answer
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
            console.log(
              'ℹ️ [WebRTC] Ignoring answer because peer state is ' +
                pc.signalingState +
                ' for ' +
                viewerId
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
        }
      };

    /*
     * ----------------------------------------------------------
     * Incoming ICE candidate
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
         * ICE can arrive before the offer.
         * Queue it until remoteDescription exists.
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
     * Socket listeners
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
     * Helpful connection logging.
     *
     * We intentionally do NOT destroy WebRTC peers merely
     * because Socket.IO temporarily disconnects.
     */
    const handleSocketConnect =
      () => {
        console.log(
          '🟢 [WebRTC] Signaling socket connected:',
          socket.id
        );
      };

    const handleSocketDisconnect =
      reason => {
        console.warn(
          '🟠 [WebRTC] Signaling socket disconnected:',
          reason
        );
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
    hardwareReady,
    localStream,
    createPeerConnection,
    flushIceCandidates,
    removePeerConnection,
    clearPeerCleanupTimer
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

    const streamChanged =
      video.srcObject !==
      primaryRemoteStream;

    if (streamChanged) {
      video.srcObject =
        primaryRemoteStream;
    }

    video.autoplay = true;
    video.playsInline = true;

    /*
     * Only start playback when necessary.
     */
    if (
      streamChanged ||
      video.paused
    ) {
      video
        .play()
        .catch(error => {
          console.warn(
            '⚠️ [WebRTC] Primary remote video play failed:',
            error?.name,
            error?.message || error
          );
        });
    }
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
```
