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
   * ============================================================
   * LIFECYCLE STATE
   * ============================================================
   */

  const mountedRef = useRef(false);

  const mediaInitRef = useRef(false);

  const mediaGenerationRef = useRef(0);

  const activeMediaGenerationRef = useRef(0);

  /*
   * Used to repeatedly check for the local video element
   * after getUserMedia() succeeds.
   */
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
   * LOCAL VIDEO PLAY HELPER
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
   * BIND LOCAL STREAM TO VIDEO
   * ============================================================
   *
   * IMPORTANT:
   *
   * getUserMedia() can finish BEFORE React mounts the <video>.
   *
   * Therefore this function is deliberately safe to call
   * repeatedly.
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

    /*
     * Attach the exact MediaStream.
     */
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
   * LOCAL VIDEO RETRY SYSTEM
   * ============================================================
   *
   * This solves the exact problem shown in the console:
   *
   * Camera opens
   *      ↓
   * local <video> not mounted yet
   *      ↓
   * React mounts it shortly afterward
   *
   * Instead of giving up, we retry the binding.
   * ============================================================
   */

  const stopLocalVideoRetry = useCallback(() => {
    if (localVideoRetryTimerRef.current) {
      clearTimeout(localVideoRetryTimerRef.current);
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

      const stream = localStreamRef.current;

      if (!stream) {
        return;
      }

      const bound = bindLocalStreamToDOM();

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

        remoteStreamsRef.current[
          streamKey
        ] = stream;

        setPrimaryRemoteStream(previous => {
          if (
            previous?.id === stream.id
          ) {
            return previous;
          }

          return stream;
        });

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

    const isCurrentInitialization = () => {
      return (
        !cancelled &&
        mountedRef.current &&
        mediaGenerationRef.current ===
          generation
      );
    };

    const attachLocalStream = stream => {
      if (
        !stream ||
        !isCurrentInitialization()
      ) {
        return;
      }

      localStreamRef.current = stream;

      setLocalStream(stream);

      /*
       * Try immediately.
       */
      const attached =
        bindLocalStreamToDOM();

      /*
       * If React has not mounted the video yet,
       * begin retrying.
       */
      if (!attached) {
        console.log(
          '⏳ [WebRTC] Camera opened before local video mounted. Waiting for video element...'
        );

        startLocalVideoRetry();
      }
    };

    const requestMedia = async () => {
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

          stopStream(acquiredStream);

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
         * Attach immediately if possible.
         */
        attachLocalStream(
          acquiredStream
        );

        /*
         * Hardware is ready even if the React
         * video element is still mounting.
         */
        setHardwareReady(true);

        console.log(
          '✅ [WebRTC] Camera and microphone successfully opened.'
        );

        /*
         * Start another binding attempt after the
         * state update has caused React to render.
         */
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
            error?.message || error
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
        mediaGenerationRef.current += 1;
      }

      mediaInitRef.current =
        false;

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
        }
      );

      peerConnectionsRef.current =
        {};

      iceCandidatesQueueRef.current =
        {};

      remoteStreamsRef.current =
        {};

      /*
       * Stop only this lifecycle's stream.
       */
      if (acquiredStream) {
        stopStream(
          acquiredStream
        );
      }

      /*
       * Clear shared reference only if it still
       * points to this lifecycle's stream.
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
       * Clear local video.
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
       * Clear remote video.
       */
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
    stopLocalVideoRetry
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

    /*
     * Try immediately after React commits.
     */
    bindLocalStreamToDOM();

    /*
     * Also retry because DynamicStreamGrid may mount
     * the actual video element one render later.
     */
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
        (!isCameraOff ? 'ON' : 'OFF') +
        ' | Mic=' +
        (!isMuted ? 'ON' : 'OFF')
    );

    /*
     * Rebind if the camera is turned back on.
     */
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
         * ICE.
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
         * Connection state.
         */
        pc.onconnectionstatechange =
          () => {
            console.log(
              '🌐 [WebRTC] Peer ' +
                targetSocketId +
                ': ' +
                pc.connectionState
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
         * ICE state.
         */
        pc.oniceconnectionstatechange =
          () => {
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
     * Viewer requesting stream.
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
        }
      };

    /*
     * Incoming offer.
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
            '📤 [WebRTC] Answer sent to ' +
              senderId
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
     * Answer.
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
     * Incoming ICE candidate.
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
     * Socket listeners.
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
    localVideoRef,

    hardwareReady,

    primaryRemoteStream,

    localStream
  };
};
