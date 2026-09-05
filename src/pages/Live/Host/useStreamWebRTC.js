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
      credential: 'KW6VsmVsm7ZTUwjjDWn'
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
   * ------------------------------------------------------------
   * Attach local stream to host video element
   * ------------------------------------------------------------
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

    const playPromise = video.play();

    if (playPromise?.catch) {
      playPromise.catch(error => {
        console.warn(
          '⚠️ [WebRTC] Local video autoplay prevented:',
          error?.message || error
        );
      });
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * Attach remote stream to co-host/challenger video
   * ------------------------------------------------------------
   */
  const bindRemoteStreamToDOM = useCallback(
    stream => {
      if (!stream) {
        return;
      }

      const streamIdValue = stream.id || 'primary';

      remoteStreamsRef.current[streamIdValue] = stream;

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

      if (video.srcObject !== stream) {
        video.srcObject = stream;

        const playPromise = video.play();

        if (playPromise?.catch) {
          playPromise.catch(error => {
            console.warn(
              '⚠️ [WebRTC] Remote video autoplay prevented:',
              error?.message || error
            );
          });
        }

        console.log(
          '🎥 [WebRTC] Remote media stream attached to challenger video element.'
        );
      }
    },
    [challengerVideoRef]
  );

  /*
   * ------------------------------------------------------------
   * Hardware initialization
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
    let mediaStream = null;

    const initMedia = async () => {
      if (mediaInitRef.current) {
        return;
      }

      mediaInitRef.current = true;

      try {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            'Browser mediaDevices API is unavailable.'
          );
        }

        console.log(
          '🎥 [WebRTC] Accessing camera and microphone...'
        );

        mediaStream = await navigator.mediaDevices.getUserMedia({
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

        if (
          cancelled ||
          !mountedRef.current
        ) {
          mediaStream
            .getTracks()
            .forEach(track => track.stop());

          return;
        }

        localStreamRef.current = mediaStream;

        /*
         * Voice engine is optional.
         *
         * We initialize it here but do not replace the original
         * microphone track automatically because the engine's
         * processing API may differ from the WebRTC track pipeline.
         */
        try {
          liveVoiceEngine.init(mediaStream);

          const processedAudioTrack =
            liveVoiceEngine.getProcessedAudioTrack?.();

          if (processedAudioTrack) {
            console.log(
              '🎙️ [WebRTC] LiveVoiceEngine processed audio track available.'
            );
          }
        } catch (error) {
          console.warn(
            '⚠️ [WebRTC] LiveVoiceEngine fallback:',
            error?.message || error
          );
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;

          const playPromise =
            localVideoRef.current.play();

          if (playPromise?.catch) {
            playPromise.catch(error => {
              console.warn(
                '⚠️ [WebRTC] Local video play prevented:',
                error?.message || error
              );
            });
          }
        }

        setHardwareReady(true);

        console.log(
          '✅ [WebRTC] Camera and microphone ready.'
        );
      } catch (error) {
        console.error(
          '❌ [WebRTC] Broadcasting hardware failure:',
          error
        );

        if (mountedRef.current) {
          setHardwareReady(false);
        }

        mediaInitRef.current = false;
      }
    };

    initMedia();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      mediaInitRef.current = false;

      /*
       * Close all peer connections.
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
        } catch (error) {
          console.warn(
            `⚠️ [WebRTC] Error closing peer ${peerId}:`,
            error
          );
        }
      });

      peerConnectionsRef.current = {};
      iceCandidatesQueueRef.current = {};
      remoteStreamsRef.current = {};

      /*
       * Stop camera and microphone.
       */
      if (mediaStream) {
        mediaStream
          .getTracks()
          .forEach(track => track.stop());
      }

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach(track => {
            if (track.readyState !== 'ended') {
              track.stop();
            }
          });
      }

      localStreamRef.current = null;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      if (challengerVideoRef?.current) {
        challengerVideoRef.current.srcObject = null;
      }

      setHardwareReady(false);
      setPrimaryRemoteStream(null);
    };
  }, [streamId, challengerVideoRef]);

  /*
   * ------------------------------------------------------------
   * Re-bind local stream after the video element mounts
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
   * Camera / microphone controls
   *
   * IMPORTANT:
   * We do not recreate the peer connection.
   * We simply enable/disable the existing tracks.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    const videoTracks =
      stream.getVideoTracks();

    audioTracks.forEach(track => {
      track.enabled = !isMuted;
    });

    videoTracks.forEach(track => {
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
   * ------------------------------------------------------------
   * Add queued ICE candidates after remote description exists
   * ------------------------------------------------------------
   */
  const flushIceCandidates = useCallback(
    async peerId => {
      const pc =
        peerConnectionsRef.current[peerId];

      if (!pc) {
        return;
      }

      if (!pc.remoteDescription) {
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
          if (!candidate) {
            continue;
          }

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
   * Create one RTCPeerConnection per remote peer
   * ------------------------------------------------------------
   */
  const createPeerConnection = useCallback(
    targetSocketId => {
      if (!targetSocketId) {
        return null;
      }

      const existing =
        peerConnectionsRef.current[
          targetSocketId
        ];

      if (existing) {
        return existing;
      }

      if (!socket) {
        console.warn(
          '⚠️ [WebRTC] Cannot create peer without socket.'
        );

        return null;
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
       * Add local camera + microphone tracks.
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
                error
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
       * ICE candidate generation.
       */
      pc.onicecandidate = event => {
        if (!event.candidate) {
          return;
        }

        if (!socket.connected) {
          console.warn(
            `⚠️ [WebRTC] Socket unavailable while sending ICE candidate to ${targetSocketId}`
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
       * Connection state.
       *
       * Do NOT immediately destroy a peer when it becomes
       * "disconnected". Mobile networks can temporarily do this.
       */
      pc.onconnectionstatechange = () => {
        const state =
          pc.connectionState;

        console.log(
          `🌐 [WebRTC] Peer ${targetSocketId} state: ${state}`
        );

        if (state === 'failed') {
          console.warn(
            `❌ [WebRTC] Peer ${targetSocketId} failed. Closing connection.`
          );

          try {
            pc.close();
          } catch {
            // Ignore close errors.
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

          return;
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
       * ICE connection state.
       */
      pc.oniceconnectionstatechange =
        () => {
          console.log(
            `🧊 [WebRTC] ICE state ${targetSocketId}: ${pc.iceConnectionState}`
          );

          if (
            pc.iceConnectionState ===
              'failed'
          ) {
            console.warn(
              `⚠️ [WebRTC] ICE failed for ${targetSocketId}.`
            );

            /*
             * restartIce is preferable to immediately
             * destroying the whole stream.
             */
            try {
              pc.restartIce?.();
            } catch (error) {
              console.warn(
                '⚠️ [WebRTC] ICE restart unavailable:',
                error
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
     * Host receives request from viewer and creates offer.
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
            `⚠️ [WebRTC] No local media available for viewer ${viewerId}`
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

          /*
           * If this peer already has a stable negotiation,
           * don't create another offer unnecessarily.
           */
          if (
            pc.signalingState !==
            'stable'
          ) {
            console.log(
              `⏳ [WebRTC] Peer ${viewerId} is already negotiating (${pc.signalingState}).`
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
            error
          );
        }
      };

    /*
     * Some versions of the backend may emit
     * receive_webrtc_offer while others use
     * webrtc_offer_received.
     *
     * We support the existing event names without creating
     * any new backend events.
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

        if (!senderId || !offer) {
          console.warn(
            '⚠️ [WebRTC] Invalid incoming offer:',
            payload
          );

          return;
        }

        console.log(
          `📥 [WebRTC] Incoming offer from ${senderId}`
        );

        try {
          const pc =
            createPeerConnection(
              senderId
            );

          if (!pc) {
            return;
          }

          /*
           * Prevent replacing an already established
           * remote description unnecessarily.
           */
          if (
            pc.signalingState ===
              'stable' &&
            pc.currentRemoteDescription
          ) {
            console.log(
              `ℹ️ [WebRTC] Peer ${senderId} already has a remote description.`
            );
          } else {
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
            console.warn(
              `⚠️ [WebRTC] Cannot create answer for ${senderId}; state=${pc.signalingState}`
            );

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
            `❌ [WebRTC] Error responding to offer from ${senderId}:`,
            error
          );
        }
      };

    /*
     * Host receives viewer's answer.
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
            console.log(
              `ℹ️ [WebRTC] Remote answer already applied for ${viewerId}.`
            );

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

        if (!senderId || !candidate) {
          console.warn(
            '⚠️ [WebRTC] Invalid ICE candidate payload:',
            payload
          );

          return;
        }

        const pc =
          peerConnectionsRef.current[
            senderId
          ];

        /*
         * If the peer does not exist yet, queue the
         * candidate instead of throwing it away.
         */
        if (!pc) {
          iceCandidatesQueueRef.current[
            senderId
          ] =
            iceCandidatesQueueRef.current[
              senderId
            ] || [];

          iceCandidatesQueueRef.current[
            senderId
          ].push(candidate);

          console.log(
            `🧊 [WebRTC] Queued ICE candidate for ${senderId}; peer not ready yet.`
          );

          return;
        }

        /*
         * Remote description has not arrived yet.
         */
        if (!pc.remoteDescription) {
          iceCandidatesQueueRef.current[
            senderId
          ] =
            iceCandidatesQueueRef.current[
              senderId
            ] || [];

          iceCandidatesQueueRef.current[
            senderId
          ].push(candidate);

          console.log(
            `🧊 [WebRTC] Queued ICE candidate for ${senderId}; waiting for remote description.`
          );

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

    /*
     * Existing signaling events.
     */
    socket.on(
      'viewer_requesting_stream',
      handleViewerRequest
    );

    socket.on(
      'receive_webrtc_offer',
      handleIncomingOffer
    );

    /*
     * Compatibility with the event name used by
     * the other stream implementation.
     */
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
   * Keep remote video element synchronized.
   *
   * This replaces the old 300ms interval.
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
   * Return public API
   * ------------------------------------------------------------
   */
  return {
    localVideoRef,
    hardwareReady,
    primaryRemoteStream
  };
};
