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

  /*
   * Raw camera/microphone stream.
   *
   * This remains separate from the processed stream so that
   * cleanup can always stop the real hardware tracks correctly.
   */
  const rawLocalStreamRef = useRef(null);

  /*
   * Stream returned by LiveVoiceEngine.
   *
   * It contains:
   * - original camera video tracks
   * - processed microphone audio track
   */
  const processedVoiceStreamRef = useRef(null);

  /*
   * This is the stream WebRTC actually uses.
   */
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

  const negotiatingPeersRef = useRef(new Set());

  const incomingOfferProcessingRef = useRef(new Set());

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
        peerCleanupTimersRef.current[peerId];

      if (timer) {
        clearTimeout(timer);

        delete peerCleanupTimersRef.current[peerId];
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

        const streamChanged =
          video.srcObject !== stream;

        if (streamChanged) {
          video.srcObject = stream;
        }

        video.autoplay = true;
        video.playsInline = true;

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
   * AI VOICE EFFECT SYNCHRONIZATION
   * ============================================================
   *
   * AIVoiceEffects dispatches:
   *
   * mpade_voice_change
   *
   * The engine changes its DSP chain while keeping the same
   * MediaStreamDestination audio track alive.
   *
   * This means existing WebRTC peer connections do NOT need
   * renegotiation when the user changes voice effects.
   */

  useEffect(() => {
    if (!streamId) {
      return undefined;
    }

    const handleVoiceChange = event => {
      const detail =
        event?.detail;

      if (!detail) {
        return;
      }

      if (
        detail.streamId &&
        detail.streamId !== streamId
      ) {
        return;
      }

      if (!detail.id) {
        return;
      }

      try {
        liveVoiceEngine.setPreset(
          detail.id
        );

        console.log(
          '🎛️ [WebRTC] Live voice effect changed:',
          detail.id
        );
      } catch (error) {
        console.warn(
          '⚠️ [WebRTC] Failed applying live voice effect:',
          error?.message || error
        );
      }
    };

    window.addEventListener(
      'mpade_voice_change',
      handleVoiceChange
    );

    return () => {
      window.removeEventListener(
        'mpade_voice_change',
        handleVoiceChange
      );
    };
  }, [streamId]);

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
    let finalLocalStream = null;

    const isCurrentInitialization =
      () => {
        return (
          !cancelled &&
          mountedRef.current &&
          mediaGenerationRef.current ===
            generation
        );
      };

    /*
     * Attach the FINAL stream.
     *
     * This will normally be the processed voice stream.
     * If AI voice initialization fails, it will be the raw
     * camera/microphone stream.
     */
    const attachLocalStream =
      stream => {
        if (
          !stream ||
          !isCurrentInitialization()
        ) {
          return;
        }

        finalLocalStream = stream;

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

          /*
           * ----------------------------------------------------
           * CAMERA + MICROPHONE
           * ----------------------------------------------------
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

          rawLocalStreamRef.current =
            acquiredStream;

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

          /*
           * ----------------------------------------------------
           * LIVE AI VOICE ENGINE
           * ----------------------------------------------------
           *
           * Raw stream:
           *
           *     Camera video
           *     Microphone audio
           *
           * becomes:
           *
           *     Original camera video
           *     Processed microphone audio
           *
           * WebRTC will use the processed stream below.
           */

          finalLocalStream =
            acquiredStream;

          try {
            if (
              liveVoiceEngine &&
              typeof liveVoiceEngine.initialize ===
                'function'
            ) {
              console.log(
                '🎙️ [WebRTC] Initializing LiveVoiceEngine...'
              );

              const processedStream =
                await liveVoiceEngine.initialize(
                  acquiredStream
                );

              if (
                processedStream &&
                typeof processedStream.getAudioTracks ===
                  'function' &&
                processedStream.getAudioTracks().length > 0
              ) {
                processedVoiceStreamRef.current =
                  processedStream;

                finalLocalStream =
                  processedStream;

                console.log(
                  '✅ [WebRTC] AI voice processing is active.'
                );

                console.log(
                  '🎙️ [WebRTC] Processed audio tracks:',
                  processedStream.getAudioTracks().length
                );

                /*
                 * Restore the voice preset selected previously
                 * for this stream.
                 */
                try {
                  const savedPreset =
                    localStorage.getItem(
                      `mpade_voice_fx_${streamId}`
                    ) || 'studio';

                  liveVoiceEngine.setPreset(
                    savedPreset
                  );

                  console.log(
                    '🎛️ [WebRTC] Restored voice preset:',
                    savedPreset
                  );
                } catch (presetError) {
                  console.warn(
                    '⚠️ [WebRTC] Could not restore voice preset:',
                    presetError?.message ||
                      presetError
                  );
                }
              } else {
                console.warn(
                  '⚠️ [WebRTC] Voice engine returned no processed audio. Using raw microphone.'
                );

                liveVoiceEngine.destroy();

                processedVoiceStreamRef.current =
                  null;

                finalLocalStream =
                  acquiredStream;
              }
            } else {
              console.warn(
                '⚠️ [WebRTC] LiveVoiceEngine.initialize() is unavailable. Using raw microphone.'
              );
            }
          } catch (voiceError) {
            /*
             * Voice processing must NEVER prevent the camera
             * and microphone from working.
             */
            console.warn(
              '⚠️ [WebRTC] Voice engine initialization failed. Falling back to raw microphone:',
              voiceError?.message ||
                voiceError
            );

            try {
              liveVoiceEngine.destroy();
            } catch {
              // Ignore engine cleanup errors.
            }

            processedVoiceStreamRef.current =
              null;

            finalLocalStream =
              acquiredStream;
          }

          /*
           * ----------------------------------------------------
           * FINAL LOCAL STREAM
           * ----------------------------------------------------
           */

          if (
            !isCurrentInitialization()
          ) {
            console.warn(
              '🧹 [WebRTC] Ignoring stale initialized media stream.'
            );

            try {
              liveVoiceEngine.destroy();
            } catch {
              // Ignore cleanup errors.
            }

            stopStream(
              acquiredStream
            );

            acquiredStream = null;

            return;
          }

          attachLocalStream(
            finalLocalStream
          );

          /*
           * Apply initial mute/camera state.
           */
          finalLocalStream
            .getAudioTracks()
            .forEach(track => {
              track.enabled =
                !isMuted;
            });

          finalLocalStream
            .getVideoTracks()
            .forEach(track => {
              track.enabled =
                !isCameraOff;
            });

          /*
           * Keep the voice engine's output track synchronized
           * with the initial microphone mute state.
           */
          try {
            if (
              typeof liveVoiceEngine.setMuted ===
              'function'
            ) {
              liveVoiceEngine.setMuted(
                isMuted
              );
            }
          } catch (error) {
            console.warn(
              '⚠️ [WebRTC] Initial voice mute synchronization failed:',
              error?.message ||
                error
            );
          }

          setHardwareReady(true);

          console.log(
            '✅ [WebRTC] Camera and microphone successfully opened.'
          );

          console.log(
            '🎙️ [WebRTC] WebRTC local stream:',
            {
              videoTracks:
                finalLocalStream.getVideoTracks().length,
              audioTracks:
                finalLocalStream.getAudioTracks().length,
              voiceProcessing:
                finalLocalStream !==
                acquiredStream
            }
          );

          startLocalVideoRetry();
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

          rawLocalStreamRef.current =
            null;

          processedVoiceStreamRef.current =
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
       * --------------------------------------------------------
       * PEER CLEANUP
       * --------------------------------------------------------
       */

      Object.keys(
        peerCleanupTimersRef.current
      ).forEach(peerId => {
        clearPeerCleanupTimer(
          peerId
        );
      });

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

      /*
       * --------------------------------------------------------
       * AI VOICE ENGINE CLEANUP
       * --------------------------------------------------------
       */

      try {
        if (
          liveVoiceEngine &&
          typeof liveVoiceEngine.destroy ===
            'function'
        ) {
          liveVoiceEngine.destroy();

          console.log(
            '🧹 [WebRTC] LiveVoiceEngine destroyed.'
          );
        }
      } catch (error) {
        console.warn(
          '⚠️ [WebRTC] Voice engine cleanup failed:',
          error?.message ||
            error
        );
      }

      /*
       * --------------------------------------------------------
       * RAW CAMERA/MIC CLEANUP
       * --------------------------------------------------------
       *
       * Always stop the raw hardware stream.
       */

      const rawStream =
        rawLocalStreamRef.current ||
        acquiredStream;

      if (rawStream) {
        stopStream(
          rawStream
        );
      }

      rawLocalStreamRef.current =
        null;

      processedVoiceStreamRef.current =
        null;

      localStreamRef.current =
        null;

      setLocalStream(null);

      /*
       * --------------------------------------------------------
       * LOCAL VIDEO CLEANUP
       * --------------------------------------------------------
       */

      const localVideo =
        localVideoRef.current;

      if (localVideo) {
        localVideo.onloadedmetadata =
          null;

        if (
          localVideo.srcObject ===
            finalLocalStream ||
          localVideo.srcObject ===
            acquiredStream ||
          localVideo.srcObject ===
            localStreamRef.current
        ) {
          localVideo.srcObject =
            null;
        }
      }

      /*
       * --------------------------------------------------------
       * REMOTE VIDEO CLEANUP
       * --------------------------------------------------------
       */

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
    clearPeerCleanupTimer,
    isMuted,
    isCameraOff
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

    /*
     * Audio:
     *
     * If LiveVoiceEngine is active, its output audio track
     * is the track being sent through WebRTC.
     */
    stream
      .getAudioTracks()
      .forEach(track => {
        track.enabled =
          !isMuted;
      });

    /*
     * Keep the engine's mute state synchronized too.
     */
    try {
      if (
        liveVoiceEngine &&
        typeof liveVoiceEngine.setMuted ===
          'function'
      ) {
        liveVoiceEngine.setMuted(
          isMuted
        );
      }
    } catch (error) {
      console.warn(
        '⚠️ [WebRTC] Voice engine mute update failed:',
        error?.message ||
          error
      );
    }

    /*
     * Camera remains the original camera track.
     */
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
         * --------------------------------------------------------
         * LOCAL TRACKS
         * --------------------------------------------------------
         *
         * IMPORTANT:
         *
         * localStreamRef.current is now normally:
         *
         *   processed camera + processed microphone
         *
         * Therefore WebRTC automatically sends the AI voice
         * effect to viewers.
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

                console.log(
                  '📡 [WebRTC] Added local ' +
                    track.kind +
                    ' track to peer ' +
                    targetSocketId
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
         * --------------------------------------------------------
         * REMOTE TRACKS
         * --------------------------------------------------------
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
         * --------------------------------------------------------
         * ICE CANDIDATES
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
                senderType:
                  'host'
              }
            );
          };

        /*
         * --------------------------------------------------------
         * CONNECTION STATE
         * --------------------------------------------------------
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
         * --------------------------------------------------------
         * ICE CONNECTION STATE
         * --------------------------------------------------------
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
     * VIEWER REQUESTING STREAM
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
     * INCOMING OFFER
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
          incomingOfferProcessingRef.current.delete(
            senderId
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * ANSWER
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
     * INCOMING ICE
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
     * SOCKET LISTENERS
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
