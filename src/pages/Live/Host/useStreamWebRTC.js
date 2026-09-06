
// hooks/useStreamWebRTC.js

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const peerConnectionsRef = useRef({});
  const iceCandidatesQueueRef = useRef({});
  const remoteStreamsRef = useRef({});

  /*
   * Each media initialization gets its own generation.
   *
   * This prevents an old getUserMedia() call from stopping
   * a newer camera stream after React remounts the component.
   */
  const mediaGenerationRef = useRef(0);

  /*
   * Prevent multiple simultaneous initializations for the
   * same mounted hook instance.
   */
  const mediaPromiseRef = useRef(null);

  const mountedRef = useRef(false);

  const [hardwareReady, setHardwareReady] = useState(false);
  const [primaryRemoteStream, setPrimaryRemoteStream] =
    useState(null);

  /*
   * ------------------------------------------------------------
   * Local video binding
   * ------------------------------------------------------------
   */
  const bindLocalStreamToDOM = useCallback(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;

    if (!video || !stream) {
      return;
    }

    /*
     * Important video properties for getUserMedia().
     */
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const playPromise = video.play();

    if (playPromise?.catch) {
      playPromise.catch(error => {
        console.warn(
          '⚠️ [WebRTC] Local video play prevented:',
          error?.message || error
        );
      });
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * Remote video binding
   * ------------------------------------------------------------
   */
  const bindRemoteStreamToDOM = useCallback(
    stream => {
      if (!stream) {
        return;
      }

      const remoteId = stream.id || 'primary';

      remoteStreamsRef.current[remoteId] = stream;

      setPrimaryRemoteStream(previous => {
        if (previous?.id === stream.id) {
          return previous;
        }

        return stream;
      });

      const video = challengerVideoRef?.current;

      if (!video) {
        return;
      }

      video.autoplay = true;
      video.playsInline = true;

      if (video.srcObject !== stream) {
        video.srcObject = stream;

        const playPromise = video.play();

        if (playPromise?.catch) {
          playPromise.catch(error => {
            console.warn(
              '⚠️ [WebRTC] Remote video play prevented:',
              error?.message || error
            );
          });
        }

        console.log(
          '🎥 [WebRTC] Remote media stream attached.'
        );
      }
    },
    [challengerVideoRef]
  );

  /*
   * ------------------------------------------------------------
   * HOST CAMERA + MICROPHONE INITIALIZATION
   * ------------------------------------------------------------
   */
  useEffect(() => {
    mountedRef.current = true;

    if (!streamId) {
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;

    const generation = mediaGenerationRef.current + 1;
    mediaGenerationRef.current = generation;

    const initMedia = async () => {
      /*
       * If another initialization is already active,
       * don't start another camera request.
       */
      if (mediaPromiseRef.current) {
        try {
          await mediaPromiseRef.current;
        } catch {
          // The active initialization handles its own error.
        }

        return;
      }

      const request = (async () => {
        let mediaStream = null;

        try {
          if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
          ) {
            throw new Error(
              'Browser mediaDevices.getUserMedia() is unavailable.'
            );
          }

          console.log(
            '🎥 [WebRTC] Accessing camera and microphone...'
          );

          /*
           * Keep the constraints reasonable.
           *
           * 1280x720 is requested as an ideal resolution,
           * not a mandatory resolution.
           */
          mediaStream =
            await navigator.mediaDevices.getUserMedia({
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
            });

          /*
           * The stream belongs to this initialization only.
           *
           * Never allow an old effect instance to take ownership
           * of a newer camera stream.
           */
          const stillCurrent =
            !cancelled &&
            mountedRef.current &&
            mediaGenerationRef.current === generation;

          if (!stillCurrent) {
            console.warn(
              '⚠️ [WebRTC] Ignoring stale camera initialization.'
            );

            mediaStream
              .getTracks()
              .forEach(track => track.stop());

            return;
          }

          /*
           * If a previous stream exists, stop only that old stream.
           */
          if (
            localStreamRef.current &&
            localStreamRef.current !== mediaStream
          ) {
            localStreamRef.current
              .getTracks()
              .forEach(track => {
                if (track.readyState !== 'ended') {
                  track.stop();
                }
              });
          }

          localStreamRef.current = mediaStream;

          /*
           * Make sure the camera tracks are enabled initially.
           */
          mediaStream
            .getVideoTracks()
            .forEach(track => {
              track.enabled = !isCameraOff;
            });

          mediaStream
            .getAudioTracks()
            .forEach(track => {
              track.enabled = !isMuted;
            });

          /*
           * Optional voice processing.
           *
           * We deliberately do NOT replace the microphone track
           * with an unknown processed track.
           */
          try {
            if (liveVoiceEngine?.init) {
              liveVoiceEngine.init(mediaStream);
            }

            const processedAudioTrack =
              liveVoiceEngine?.getProcessedAudioTrack?.();

            if (processedAudioTrack) {
              console.log(
                '🎙️ [WebRTC] LiveVoiceEngine processed audio track available.'
              );
            }
          } catch (error) {
            console.warn(
              '⚠️ [WebRTC] LiveVoiceEngine unavailable; using original microphone:',
              error?.message || error
            );
          }

          /*
           * Attach camera to the host video element.
           */
          bindLocalStreamToDOM();

          if (
            mountedRef.current &&
            mediaGenerationRef.current === generation
          ) {
            setHardwareReady(true);

            console.log(
              '✅ [WebRTC] Camera and microphone ready.'
            );

            /*
             * Useful diagnostic information.
             */
            const videoTracks =
              mediaStream.getVideoTracks();

            const audioTracks =
              mediaStream.getAudioTracks();

            console.log(
              '📷 [WebRTC] Video tracks:',
              videoTracks.map(track => ({
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState
              }))
            );

            console.log(
              '🎤 [WebRTC] Audio tracks:',
              audioTracks.map(track => ({
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState
              }))
            );
          }
        } catch (error) {
          console.error(
            '❌ [WebRTC] Broadcasting hardware failure:',
            error
          );

          if (mediaStream) {
            mediaStream
              .getTracks()
              .forEach(track => {
                if (track.readyState !== 'ended') {
                  track.stop();
                }
              });
          }

          if (
            mountedRef.current &&
            mediaGenerationRef.current === generation
          ) {
            setHardwareReady(false);
          }
        }
      })();

      mediaPromiseRef.current = request;

      try {
        await request;
      } finally {
        /*
         * Only clear the promise if this is still the active
         * initialization.
         */
        if (mediaPromiseRef.current === request) {
          mediaPromiseRef.current = null;
        }
      }
    };

    initMedia();

    return () => {
      cancelled = true;

      /*
       * Invalidate this initialization generation.
       */
      if (mediaGenerationRef.current === generation) {
        mediaGenerationRef.current += 1;
      }

      mountedRef.current = false;

      /*
       * Close peer connections.
       */
      Object.entries(peerConnectionsRef.current).forEach(
        ([peerId, pc]) => {
          try {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.onconnectionstatechange = null;
            pc.oniceconnectionstatechange = null;
            pc.close();
          } catch (error) {
            console.warn(
              `⚠️ [WebRTC] Error closing peer ${peerId}:`,
              error?.message || error
            );
          }
        }
      );

      peerConnectionsRef.current = {};
      iceCandidatesQueueRef.current = {};
      remoteStreamsRef.current = {};

      /*
       * IMPORTANT:
       *
       * Only stop the stream currently owned by this hook.
       *
       * We don't stop some arbitrary stream returned by an older
       * getUserMedia() request.
       */
      const ownedStream = localStreamRef.current;

      if (ownedStream) {
        ownedStream
          .getTracks()
          .forEach(track => {
            if (track.readyState !== 'ended') {
              track.stop();
            }
          });

        localStreamRef.current = null;
      }

      /*
       * Clear video elements.
       */
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      if (challengerVideoRef?.current) {
        challengerVideoRef.current.srcObject = null;
      }

      setHardwareReady(false);
      setPrimaryRemoteStream(null);
    };
  }, [
    streamId,
    bindLocalStreamToDOM,
    isCameraOff,
    isMuted,
    challengerVideoRef
  ]);

  /*
   * ------------------------------------------------------------
   * Re-bind local stream when the video element is available.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!hardwareReady) {
      return;
    }

    bindLocalStreamToDOM();
  }, [
    hardwareReady,
    bindLocalStreamToDOM
  ]);

  /*
   * ------------------------------------------------------------
   * Camera + microphone controls
   *
   * We only enable/disable tracks.
   * We do NOT recreate the camera.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    stream
      .getVideoTracks()
      .forEach(track => {
        track.enabled = !isCameraOff;
      });

    stream
      .getAudioTracks()
      .forEach(track => {
        track.enabled = !isMuted;
      });

    console.log(
      `🎛️ [WebRTC] Camera=${
        !isCameraOff ? 'ON' : 'OFF'
      } | Mic=${
        !isMuted ? 'ON' : 'OFF'
      }`
    );
  }, [
    isCameraOff,
    isMuted
  ]);

  /*
   * ------------------------------------------------------------
   * ICE candidate queue
   * ------------------------------------------------------------
   */
  const flushIceCandidates = useCallback(
    async peerId => {
      const pc =
        peerConnectionsRef.current[peerId];

      if (!pc || !pc.remoteDescription) {
        return;
      }

      const queue =
        iceCandidatesQueueRef.current[peerId];

      if (!Array.isArray(queue) || queue.length === 0) {
        return;
      }

      console.log(
        `🧊 [WebRTC] Flushing ${queue.length} queued ICE candidates for ${peerId}`
      );

      const remaining = [];

      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.warn(
            `⚠️ [WebRTC] Failed queued ICE candidate for ${peerId}:`,
            error?.message || error
          );

          remaining.push(candidate);
        }
      }

      if (remaining.length > 0) {
        iceCandidatesQueueRef.current[peerId] =
          remaining;
      } else {
        delete iceCandidatesQueueRef.current[peerId];
      }
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * Create peer connection
   * ------------------------------------------------------------
   */
  const createPeerConnection = useCallback(
    targetSocketId => {
      if (!targetSocketId || !socket) {
        return null;
      }

      const existing =
        peerConnectionsRef.current[
          targetSocketId
        ];

      if (existing) {
        return existing;
      }

      console.log(
        `🔗 [WebRTC] Creating peer connection for ${targetSocketId}`
      );

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
       * Add host camera + microphone.
       */
      const localStream =
        localStreamRef.current;

      if (localStream) {
        localStream
          .getTracks()
          .forEach(track => {
            try {
              pc.addTrack(
                track,
                localStream
              );
            } catch (error) {
              console.warn(
                `⚠️ [WebRTC] Could not add ${track.kind} track:`,
                error?.message || error
              );
            }
          });
      }

      /*
       * Remote media.
       */
      pc.ontrack = event => {
        console.log(
          `🎥 [WebRTC] Remote track received from ${targetSocketId}: ${event.track?.kind}`
        );

        const remoteStream =
          event.streams?.[0];

        if (!remoteStream) {
          return;
        }

        remoteStreamsRef.current[
          targetSocketId
        ] = remoteStream;

        bindRemoteStreamToDOM(
          remoteStream
        );
      };

      /*
       * ICE candidates.
       */
      pc.onicecandidate = event => {
        if (!event.candidate) {
          return;
        }

        if (!socket.connected) {
          console.warn(
            `⚠️ [WebRTC] Socket unavailable while sending ICE to ${targetSocketId}`
          );

          return;
        }

        socket.emit(
          'webrtc_ice_candidate',
          {
            streamId,
            candidate: event.candidate,
            targetSocketId,
            senderType: 'host'
          }
        );
      };

      /*
       * Peer connection state.
       */
      pc.onconnectionstatechange = () => {
        const state =
          pc.connectionState;

        console.log(
          `🌐 [WebRTC] Peer ${targetSocketId} state: ${state}`
        );

        if (state === 'failed') {
          console.warn(
            `❌ [WebRTC] Peer ${targetSocketId} failed.`
          );

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

          setPrimaryRemoteStream(
            previous => {
              if (
                previous &&
                remoteStreamsRef.current[
                  targetSocketId
                ] === previous
              ) {
                return null;
              }

              return previous;
            }
          );
        }

        if (state === 'closed') {
          if (
            peerConnectionsRef.current[
              targetSocketId
            ] === pc
          ) {
            delete peerConnectionsRef.current[
              targetSocketId
            ];
          }
        }
      };

      /*
       * ICE state.
       */
      pc.oniceconnectionstatechange = () => {
        console.log(
          `🧊 [WebRTC] ICE state ${targetSocketId}: ${pc.iceConnectionState}`
        );

        if (
          pc.iceConnectionState ===
          'failed'
        ) {
          try {
            pc.restartIce?.();
          } catch (error) {
            console.warn(
              '⚠️ [WebRTC] ICE restart unavailable:',
              error?.message || error
            );
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
   * ------------------------------------------------------------
   * WebRTC signaling
   * ------------------------------------------------------------
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
     * Viewer requests host stream.
     */
    const handleViewerRequest = async payload => {
      if (cancelled) {
        return;
      }

      const viewerId =
        payload?.viewerSocketId ||
        payload?.socketId ||
        payload?.viewerId;

      if (!viewerId) {
        console.warn(
          '⚠️ [WebRTC] Viewer request has no socket ID:',
          payload
        );

        return;
      }

      const localStream =
        localStreamRef.current;

      if (!localStream) {
        console.warn(
          `⚠️ [WebRTC] No local media for viewer ${viewerId}`
        );

        return;
      }

      console.log(
        `📥 [WebRTC] Stream request from ${viewerId}`
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
            `⏳ [WebRTC] Peer ${viewerId} already negotiating: ${pc.signalingState}`
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
            offer: pc.localDescription,
            targetViewerId: viewerId
          }
        );

        console.log(
          `📤 [WebRTC] Offer sent to ${viewerId}`
        );
      } catch (error) {
        console.error(
          `❌ [WebRTC] Offer creation failed for ${viewerId}:`,
          error?.message || error
        );
      }
    };

    /*
     * Incoming offer.
     */
    const handleIncomingOffer = async payload => {
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

      if (!senderId || !offer) {
        console.warn(
          '⚠️ [WebRTC] Invalid incoming offer:',
          payload
        );

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

        if (cancelled) {
          return;
        }

        socket.emit(
          'send_webrtc_answer',
          {
            streamId,
            answer: pc.localDescription,
            targetSocketId: senderId
          }
        );

        console.log(
          `📤 [WebRTC] Answer sent to ${senderId}`
        );
      } catch (error) {
        console.error(
          `❌ [WebRTC] Error responding to offer from ${senderId}:`,
          error?.message || error
        );
      }
    };

    /*
     * Viewer answer.
     */
    const handleAnswerReceived = async payload => {
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

      if (!viewerId || !answer) {
        console.warn(
          '⚠️ [WebRTC] Invalid answer payload:',
          payload
        );

        return;
      }

      const pc =
        peerConnectionsRef.current[
          viewerId
        ];

      if (!pc) {
        console.warn(
          `⚠️ [WebRTC] No peer connection for answer from ${viewerId}`
        );

        return;
      }

      try {
        if (
          pc.currentRemoteDescription
        ) {
          return;
        }

        if (
          pc.signalingState !==
          'have-local-offer'
        ) {
          console.warn(
            `⚠️ [WebRTC] Unexpected signaling state for ${viewerId}: ${pc.signalingState}`
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
          `⚡ [WebRTC] Remote answer applied for ${viewerId}`
        );
      } catch (error) {
        console.error(
          `❌ [WebRTC] Failed to apply answer from ${viewerId}:`,
          error?.message || error
        );
      }
    };

    /*
     * Incoming ICE.
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

        if (!senderId || !candidate) {
          console.warn(
            '⚠️ [WebRTC] Invalid ICE candidate:',
            payload
          );

          return;
        }

        const pc =
          peerConnectionsRef.current[
            senderId
          ];

        if (!pc || !pc.remoteDescription) {
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
            `⚠️ [WebRTC] Failed to add ICE candidate from ${senderId}:`,
            error?.message || error
          );
        }
      };

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
    createPeerConnection,
    flushIceCandidates
  ]);

  /*
   * ------------------------------------------------------------
   * Remote video synchronization
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const video =
      challengerVideoRef?.current;

    const stream =
      primaryRemoteStream;

    if (!video || !stream) {
      return;
    }

    video.autoplay = true;
    video.playsInline = true;

    if (video.srcObject !== stream) {
      video.srcObject = stream;

      const playPromise =
        video.play();

      if (playPromise?.catch) {
        playPromise.catch(error => {
          console.warn(
            '⚠️ [WebRTC] Remote video play prevented:',
            error?.message || error
          );
        });
      }
    }
  }, [
    primaryRemoteStream,
    challengerVideoRef
  ]);

  /*
   * ------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------
   */
  return {
    localVideoRef,
    hardwareReady,
    primaryRemoteStream
  };
};

