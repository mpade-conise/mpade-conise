
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

  const mountedRef = useRef(false);
  const mediaInitRef = useRef(false);

  const [hardwareReady, setHardwareReady] = useState(false);
  const [primaryRemoteStream, setPrimaryRemoteStream] = useState(null);

  /*
   * ============================================================
   * LOCAL VIDEO BINDING
   * ============================================================
   */

  const bindLocalStreamToDOM = useCallback(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;

    if (!video || !stream) {
      return;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    const playVideo = async () => {
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
      playVideo();
    } else {
      video.onloadedmetadata = playVideo;
    }
  }, []);

  /*
   * ============================================================
   * REMOTE VIDEO BINDING
   * ============================================================
   */

  const bindRemoteStreamToDOM = useCallback(
    stream => {
      if (!stream) {
        return;
      }

      const streamKey = stream.id || 'primary';

      remoteStreamsRef.current[streamKey] = stream;

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

      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      const playVideo = async () => {
        try {
          await video.play();
        } catch (error) {
          console.warn(
            '⚠️ [WebRTC] Remote video play failed:',
            error?.message || error
          );
        }
      };

      if (video.readyState >= 1) {
        playVideo();
      } else {
        video.onloadedmetadata = playVideo;
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
   * IMPORTANT:
   * Camera/microphone initialization is completely independent
   * of Socket.IO, Supabase, ChatBox and WebRTC signaling.
   * ============================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    if (!streamId) {
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;
    let acquiredStream = null;

    const stopStream = stream => {
      if (!stream) return;

      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // Ignore track cleanup errors.
        }
      });
    };

    const attachLocalStream = stream => {
      if (!stream) return;

      localStreamRef.current = stream;

      const video = localVideoRef.current;

      if (!video) {
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
        video.onloadedmetadata = playVideo;
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
          typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
          throw new Error(
            'Browser getUserMedia API is unavailable.'
          );
        }

        console.log(
          '🎥 [WebRTC] Requesting camera and microphone...'
        );

        /*
         * First attempt:
         * High-quality stream.
         */
        try {
          acquiredStream =
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
        } catch (firstError) {
          console.warn(
            '⚠️ [WebRTC] Preferred camera constraints failed:',
            firstError?.name,
            firstError?.message || firstError
          );

          /*
           * Fallback:
           * Let the browser choose any compatible camera.
           */
          acquiredStream =
            await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });

          console.log(
            '✅ [WebRTC] Fallback camera constraints succeeded.'
          );
        }

        if (
          cancelled ||
          !mountedRef.current
        ) {
          stopStream(acquiredStream);
          acquiredStream = null;
          return;
        }

        localStreamRef.current = acquiredStream;

        console.log(
          '📷 [WebRTC] Video tracks:',
          acquiredStream.getVideoTracks().length
        );

        console.log(
          '🎙️ [WebRTC] Audio tracks:',
          acquiredStream.getAudioTracks().length
        );

        acquiredStream.getVideoTracks().forEach(track => {
          console.log(
            '📷 [WebRTC] Camera track:',
            {
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            }
          );
        });

        /*
         * Attach camera immediately.
         *
         * This happens BEFORE the voice engine.
         */
        attachLocalStream(acquiredStream);

        /*
         * Mark hardware ready immediately after the real
         * MediaStream has been obtained.
         */
        setHardwareReady(true);

        console.log(
          '✅ [WebRTC] Camera and microphone successfully opened.'
        );

        /*
         * ======================================================
         * OPTIONAL VOICE ENGINE
         *
         * It is deliberately isolated from camera startup.
         * If it fails, the camera must continue working.
         * ======================================================
         */

        try {
          if (
            liveVoiceEngine &&
            typeof liveVoiceEngine.init === 'function'
          ) {
            const engineResult =
              liveVoiceEngine.init(acquiredStream);

            if (
              engineResult &&
              typeof engineResult.catch === 'function'
            ) {
              engineResult.catch(error => {
                console.warn(
                  '⚠️ [WebRTC] Voice engine initialization failed:',
                  error?.message || error
                );
              });
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
        console.error(
          '❌ [WebRTC] CAMERA/MICROPHONE ACCESS FAILED:',
          {
            name: error?.name,
            message: error?.message,
            constraint: error?.constraint
          }
        );

        if (mountedRef.current) {
          setHardwareReady(false);
        }

        mediaInitRef.current = false;
      }
    };

    requestMedia();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      mediaInitRef.current = false;

      /*
       * Close peer connections.
       */
      Object.entries(
        peerConnectionsRef.current
      ).forEach(([peerId, pc]) => {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          pc.onconnectionstatechange = null;
          pc.oniceconnectionstatechange = null;
          pc.close();
        } catch {
          // Ignore cleanup errors.
        }
      });

      peerConnectionsRef.current = {};
      iceCandidatesQueueRef.current = {};
      remoteStreamsRef.current = {};

      /*
       * Stop acquired media.
       */
      stopStream(acquiredStream);

      if (
        localStreamRef.current &&
        localStreamRef.current !== acquiredStream
      ) {
        stopStream(localStreamRef.current);
      }

      localStreamRef.current = null;

      /*
       * Clear local video.
       */
      const localVideo = localVideoRef.current;

      if (localVideo) {
        localVideo.onloadedmetadata = null;
        localVideo.srcObject = null;
      }

      /*
       * Clear remote video.
       */
      const remoteVideo =
        challengerVideoRef?.current;

      if (remoteVideo) {
        remoteVideo.onloadedmetadata = null;
        remoteVideo.srcObject = null;
      }

      setHardwareReady(false);
      setPrimaryRemoteStream(null);
    };
  }, [streamId, challengerVideoRef]);

  /*
   * ============================================================
   * RE-BIND LOCAL VIDEO
   * ============================================================
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
   * ============================================================
   * CAMERA / MICROPHONE TOGGLES
   * ============================================================
   */

  useEffect(() => {
    const stream = localStreamRef.current;

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
      `🎛️ [WebRTC] Camera=${!isCameraOff ? 'ON' : 'OFF'} | Mic=${!isMuted ? 'ON' : 'OFF'}`
    );
  }, [
    isMuted,
    isCameraOff
  ]);

  /*
   * ============================================================
   * ICE QUEUE
   * ============================================================
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

      if (!Array.isArray(queue) || !queue.length) {
        return;
      }

      console.log(
        `🧊 [WebRTC] Flushing ${queue.length} ICE candidates for ${peerId}`
      );

      const remaining = [];

      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.warn(
            `⚠️ [WebRTC] ICE candidate failed for ${peerId}:`,
            error?.message || error
          );

          remaining.push(candidate);
        }
      }

      if (remaining.length) {
        iceCandidatesQueueRef.current[peerId] =
          remaining;
      } else {
        delete iceCandidatesQueueRef.current[peerId];
      }
    },
    []
  );

  /*
   * ============================================================
   * PEER CONNECTION
   * ============================================================
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
                `⚠️ [WebRTC] Failed adding ${track.kind} track:`,
                error?.message || error
              );
            }
          });
      }

      /*
       * Remote tracks.
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
       * ICE.
       */
      pc.onicecandidate = event => {
        if (!event.candidate) {
          return;
        }

        if (!socket.connected) {
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
       * Connection state.
       */
      pc.onconnectionstatechange = () => {
        console.log(
          `🌐 [WebRTC] Peer ${targetSocketId}: ${pc.connectionState}`
        );

        if (
          pc.connectionState === 'failed'
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
      pc.oniceconnectionstatechange = () => {
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

    const handleViewerRequest = async payload => {
      if (cancelled) return;

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

        if (cancelled) return;

        await pc.setLocalDescription(
          offer
        );

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
          `❌ [WebRTC] Offer failed for ${viewerId}:`,
          error?.message || error
        );
      }
    };

    const handleIncomingOffer = async payload => {
      if (cancelled) return;

      const senderId =
        payload?.senderSocketId ||
        payload?.guestSocketId ||
        payload?.socketId ||
        payload?.senderId;

      const offer =
        payload?.offer;

      if (!senderId || !offer) {
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
            answer: pc.localDescription,
            targetSocketId: senderId
          }
        );

        console.log(
          `📤 [WebRTC] Answer sent to ${senderId}`
        );
      } catch (error) {
        console.error(
          `❌ [WebRTC] Offer handling failed:`,
          error?.message || error
        );
      }
    };

    const handleAnswerReceived = async payload => {
      if (cancelled) return;

      const viewerId =
        payload?.viewerSocketId ||
        payload?.senderSocketId ||
        payload?.targetSocketId ||
        payload?.viewerId;

      const answer =
        payload?.answer;

      if (!viewerId || !answer) {
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
          error?.message || error
        );
      }
    };

    const handleIncomingIceCandidate =
      async payload => {
        if (cancelled) return;

        const senderId =
          payload?.senderSocketId ||
          payload?.senderId ||
          payload?.socketId;

        const candidate =
          payload?.candidate;

        if (!senderId || !candidate) {
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
   * ============================================================
   * REMOTE VIDEO SYNCHRONIZATION
   * ============================================================
   */

  useEffect(() => {
    const video =
      challengerVideoRef?.current;

    if (
      !video ||
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

      video.autoplay = true;
      video.playsInline = true;

      video.play().catch(() => {});
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
    primaryRemoteStream
  };
};
```
