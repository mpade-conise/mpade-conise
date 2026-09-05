import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    {
      urls: 'stun:stun.relay.metered.ca:80',
    },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoPlayer = ({
  streamId: propStreamId,
  isHost: initialIsHost = false,
  streamType = 'device_camera',
  customStream = null,
}) => {
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  const localStreamRef = useRef(null);

  // Host: one PeerConnection per viewer
  const peerConnectionsRef = useRef({});

  // Viewer: one PeerConnection to host
  const singleViewerPcRef = useRef(null);

  // ICE candidates waiting for remoteDescription
  const iceCandidatesQueueRef = useRef({});

  // Viewer needs the host socket ID for ICE
  const hostSocketIdRef = useRef(null);

  // Prevent duplicate negotiations
  const negotiatingViewersRef = useRef(new Set());
  const viewerOfferHandledRef = useRef(false);

  // Prevent repeated initialization/cleanup races
  const isCleaningUpRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState('Initializing Socket...');

  /*
   * ------------------------------------------------------------
   * STREAM ID
   * ------------------------------------------------------------
   */

  const getStreamId = () => {
    if (
      propStreamId &&
      typeof propStreamId === 'string' &&
      propStreamId.length > 10
    ) {
      return propStreamId;
    }

    if (typeof window === 'undefined') {
      return propStreamId;
    }

    const pathSegments = window.location.pathname
      .split('/')
      .filter(Boolean);

    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment && lastSegment.length > 20) {
      return lastSegment;
    }

    return propStreamId;
  };

  const streamId = getStreamId();

  /*
   * ------------------------------------------------------------
   * HOST DETECTION
   * ------------------------------------------------------------
   */

  const currentPath =
    typeof window !== 'undefined'
      ? window.location.pathname.toLowerCase()
      : '';

  const isHost =
    initialIsHost ||
    currentPath.includes('dashboard') ||
    currentPath.includes('/live/gaming') ||
    currentPath.includes('/live/guest') ||
    currentPath.includes('/create/live');

  /*
   * ------------------------------------------------------------
   * SAFE VIDEO PLAY
   * ------------------------------------------------------------
   */

  const playVideo = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      await video.play();
    } catch (error) {
      /*
       * Browser autoplay policies can reject play().
       * This is not necessarily a WebRTC failure.
       */
      console.debug('Video autoplay pending:', error?.message || error);
    }
  };

  /*
   * ------------------------------------------------------------
   * CLOSE HOST PEER
   * ------------------------------------------------------------
   */

  const closeHostPeer = (viewerId) => {
    const pc = peerConnectionsRef.current[viewerId];

    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
      } catch (error) {
        console.debug('Error closing host peer:', error);
      }
    }

    delete peerConnectionsRef.current[viewerId];
    delete iceCandidatesQueueRef.current[viewerId];

    negotiatingViewersRef.current.delete(viewerId);
  };

  /*
   * ------------------------------------------------------------
   * ADD QUEUED ICE CANDIDATES
   * ------------------------------------------------------------
   */

  const flushIceCandidates = async (pc, queueKey) => {
    const queue = iceCandidatesQueueRef.current[queueKey];

    if (!pc || !queue || !queue.length) {
      return;
    }

    if (!pc.remoteDescription) {
      return;
    }

    const candidates = [...queue];

    iceCandidatesQueueRef.current[queueKey] = [];

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.debug('Failed to add queued ICE candidate:', error);
      }
    }
  };

  /*
   * ------------------------------------------------------------
   * MAIN WEBRTC / SOCKET PIPELINE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      !streamId ||
      streamId === 'undefined' ||
      typeof streamId !== 'string' ||
      streamId.length < 10
    ) {
      setConnectionStatus('Awaiting Stream Setup...');
      return undefined;
    }

    let isComponentMounted = true;

    isCleaningUpRef.current = false;

    const globalIo =
      io ||
      (typeof window !== 'undefined' ? window.io : null);

    if (!globalIo) {
      console.error('❌ Socket.io client initialization failed.');
      setConnectionStatus('Engine Missing');
      return undefined;
    }

    /*
     * ----------------------------------------------------------
     * SOCKET CREATION
     * ----------------------------------------------------------
     */

    const socket = globalIo(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],

      query: {
        room: streamId,
        role: isHost ? 'host' : 'viewer',
        streamType,
      },

      forceNew: true,

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      timeout: 20000,
    });

    socketRef.current = socket;

    /*
     * ----------------------------------------------------------
     * SOCKET CONNECT
     * ----------------------------------------------------------
     */

    const handleSocketConnect = () => {
      if (!isComponentMounted) return;

      console.log(
        '🟢 Socket pipeline online! Socket ID:',
        socket.id
      );

      setConnectionStatus(
        isHost
          ? 'Streaming Live'
          : 'Negotiating Media Stream...'
      );

      if (isHost) {
        setIsConnected(true);
      } else {
        /*
         * Ask the host for the stream after the socket
         * is definitely connected.
         */
        socket.emit('request_host_stream', {
          streamId,
          streamType,
        });
      }
    };

    socket.on('connect', handleSocketConnect);

    /*
     * ----------------------------------------------------------
     * SOCKET DISCONNECT
     * ----------------------------------------------------------
     */

    const handleSocketDisconnect = (reason) => {
      if (!isComponentMounted) return;

      console.warn('🟠 Socket disconnected:', reason);

      /*
       * Do not immediately destroy the WebRTC UI.
       * Socket.IO may reconnect automatically.
       */
      if (!isHost) {
        setConnectionStatus('Reconnecting...');
      }
    };

    socket.on('disconnect', handleSocketDisconnect);

    /*
     * ----------------------------------------------------------
     * SOCKET CONNECT ERROR
     * ----------------------------------------------------------
     */

    socket.on('connect_error', (error) => {
      if (!isComponentMounted) return;

      console.error(
        '❌ Socket connection error:',
        error?.message || error
      );

      if (!isHost) {
        setConnectionStatus('Connecting to Live Stream...');
      }
    });

    /*
     * ==========================================================
     * HOST PIPELINE
     * ==========================================================
     */

    const initializeHost = async () => {
      let stream = customStream;

      try {
        /*
         * IMPORTANT:
         *
         * Register the viewer listener BEFORE requesting media.
         *
         * This prevents a viewer request from being missed while
         * the browser permission dialog is open.
         */

        socket.on(
          'viewer_requesting_stream',
          async (payload = {}) => {
            if (!isComponentMounted) return;

            const viewerId = payload.viewerSocketId;

            if (!viewerId) {
              console.warn(
                '⚠️ Viewer request received without viewerSocketId.'
              );
              return;
            }

            /*
             * We need an active media stream before creating
             * the WebRTC peer.
             */
            if (!localStreamRef.current && !stream) {
              console.warn(
                '⚠️ Viewer requested stream before host media was ready.'
              );

              /*
               * Put a small retry in place rather than losing
               * the viewer request.
               */
              setTimeout(() => {
                if (
                  isComponentMounted &&
                  socket.connected
                ) {
                  socket.emit('request_host_stream_ready', {
                    streamId,
                    targetViewerId: viewerId,
                  });
                }
              }, 500);

              return;
            }

            const activeStream =
              localStreamRef.current || stream;

            if (!activeStream) {
              return;
            }

            console.log(
              `📥 Viewer [${viewerId}] requested stream.`
            );

            /*
             * If this viewer already has a working peer,
             * don't create another one unnecessarily.
             */
            const existingPc =
              peerConnectionsRef.current[viewerId];

            if (
              existingPc &&
              existingPc.connectionState !== 'closed' &&
              existingPc.connectionState !== 'failed'
            ) {
              console.log(
                `ℹ️ Viewer [${viewerId}] already has an active peer.`
              );
              return;
            }

            /*
             * Close stale connection first.
             */
            if (existingPc) {
              closeHostPeer(viewerId);
            }

            if (
              negotiatingViewersRef.current.has(viewerId)
            ) {
              console.log(
                `ℹ️ Viewer [${viewerId}] negotiation already running.`
              );
              return;
            }

            negotiatingViewersRef.current.add(viewerId);

            const pc = new RTCPeerConnection(
              GLOBAL_ICE_CONFIG
            );

            peerConnectionsRef.current[viewerId] = pc;

            iceCandidatesQueueRef.current[viewerId] = [];

            /*
             * --------------------------------------------------
             * HOST -> VIEWER TRACKS
             * --------------------------------------------------
             */

            activeStream.getTracks().forEach((track) => {
              try {
                pc.addTrack(track, activeStream);
              } catch (error) {
                console.error(
                  '❌ Failed to add host track:',
                  error
                );
              }
            });

            /*
             * --------------------------------------------------
             * HOST ICE
             * --------------------------------------------------
             */

            pc.onicecandidate = (event) => {
              if (
                !event.candidate ||
                !socketRef.current?.connected
              ) {
                return;
              }

              socketRef.current.emit(
                'webrtc_ice_candidate',
                {
                  streamId,
                  candidate: event.candidate,
                  targetSocketId: viewerId,
                  senderType: 'host',
                }
              );
            };

            /*
             * --------------------------------------------------
             * HOST CONNECTION STATE
             * --------------------------------------------------
             */

            pc.onconnectionstatechange = () => {
              if (!isComponentMounted) return;

              console.log(
                `🔗 Host -> Viewer [${viewerId}] connection:`,
                pc.connectionState
              );

              if (pc.connectionState === 'connected') {
                console.log(
                  `🟢 Viewer [${viewerId}] connected.`
                );
              }

              if (
                pc.connectionState === 'failed' ||
                pc.connectionState === 'closed'
              ) {
                closeHostPeer(viewerId);
              }
            };

            pc.oniceconnectionstatechange = () => {
              if (!isComponentMounted) return;

              console.log(
                `🧊 Host -> Viewer [${viewerId}] ICE:`,
                pc.iceConnectionState
              );
            };

            /*
             * --------------------------------------------------
             * CREATE OFFER
             * --------------------------------------------------
             */

            try {
              const offer = await pc.createOffer();

              if (!isComponentMounted) {
                closeHostPeer(viewerId);
                return;
              }

              await pc.setLocalDescription(offer);

              if (!isComponentMounted) {
                closeHostPeer(viewerId);
                return;
              }

              socket.emit('send_webrtc_offer', {
                streamId,
                offer: pc.localDescription,
                targetViewerId: viewerId,
              });

              console.log(
                `📤 WebRTC offer sent to viewer [${viewerId}].`
              );
            } catch (error) {
              console.error(
                `❌ Failed to create offer for viewer [${viewerId}]:`,
                error
              );

              closeHostPeer(viewerId);
            } finally {
              negotiatingViewersRef.current.delete(
                viewerId
              );
            }
          }
        );

        /*
         * ------------------------------------------------------
         * HOST ANSWER
         * ------------------------------------------------------
         */

        socket.on(
          'webrtc_answer_received',
          async (payload = {}) => {
            if (!isComponentMounted) return;

            const viewerId =
              payload.viewerSocketId;

            if (!viewerId || !payload.answer) {
              return;
            }

            const pc =
              peerConnectionsRef.current[viewerId];

            if (!pc) {
              console.warn(
                `⚠️ No peer connection found for viewer [${viewerId}].`
              );
              return;
            }

            try {
              /*
               * Ignore duplicate answers.
               */
              if (pc.remoteDescription) {
                return;
              }

              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  payload.answer
                )
              );

              await flushIceCandidates(
                pc,
                viewerId
              );

              console.log(
                `✅ Remote answer applied for viewer [${viewerId}].`
              );
            } catch (error) {
              console.error(
                `❌ Error setting remote answer for viewer [${viewerId}]:`,
                error
              );
            }
          }
        );

        /*
         * ------------------------------------------------------
         * GET HOST MEDIA
         * ------------------------------------------------------
         */

        if (!stream) {
          if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices
          ) {
            throw new Error(
              'Browser media devices are unavailable.'
            );
          }

          if (streamType === 'gaming') {
            console.log(
              '🖥️ Requesting screen/game capture...'
            );

            stream =
              await navigator.mediaDevices.getDisplayMedia(
                {
                  video: true,
                  audio: true,
                }
              );
          } else {
            console.log(
              '📹 Requesting camera and microphone...'
            );

            stream =
              await navigator.mediaDevices.getUserMedia(
                {
                  video: true,
                  audio: true,
                }
              );
          }
        }

        if (!isComponentMounted) {
          /*
           * Stop only streams created by this component.
           */
          if (!customStream && stream) {
            stream
              .getTracks()
              .forEach((track) => track.stop());
          }

          return;
        }

        /*
         * Save the active host stream.
         */
        localStreamRef.current = stream;

        /*
         * Display local host preview.
         */
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;

          await playVideo();
        }

        if (isComponentMounted) {
          setIsConnected(true);
          setConnectionStatus('Streaming Live');
        }

        console.log(
          `🎥 Host media ready. Stream type: ${streamType}`
        );

        /*
         * ------------------------------------------------------
         * SCREEN SHARE ENDED
         * ------------------------------------------------------
         */

        stream.getVideoTracks().forEach((track) => {
          track.addEventListener(
            'ended',
            () => {
              if (!isComponentMounted) return;

              console.log(
                '🛑 Host video track ended.'
              );

              /*
               * Do not automatically destroy the entire
               * component. The parent can decide what to do.
               */
              if (streamType === 'gaming') {
                setConnectionStatus(
                  'Screen Sharing Ended'
                );
              }
            },
            { once: true }
          );
        });
      } catch (error) {
        console.error(
          '💥 Host media initialization failed:',
          error
        );

        if (!isComponentMounted) return;

        if (
          error?.name === 'NotAllowedError' ||
          error?.name === 'PermissionDeniedError'
        ) {
          setConnectionStatus('Media Permission Denied');
        } else if (
          error?.name === 'NotFoundError'
        ) {
          setConnectionStatus('Camera or Microphone Not Found');
        } else if (
          error?.name === 'NotReadableError'
        ) {
          setConnectionStatus('Camera or Microphone Busy');
        } else {
          setConnectionStatus('Media Initialization Failed');
        }

        setIsConnected(false);
      }
    };

    /*
     * ==========================================================
     * VIEWER PIPELINE
     * ==========================================================
     */

    const initializeViewer = () => {
      const pc = new RTCPeerConnection(
        GLOBAL_ICE_CONFIG
      );

      singleViewerPcRef.current = pc;

      iceCandidatesQueueRef.current.host_queue = [];

      /*
       * --------------------------------------------------------
       * REMOTE MEDIA TRACK
       * --------------------------------------------------------
       */

      pc.ontrack = async (event) => {
        if (!isComponentMounted) return;

        console.log(
          '🎬 Media track received from host.'
        );

        let remoteStream = event.streams?.[0];

        /*
         * Some browsers may deliver a track without
         * a populated event.streams array.
         */
        if (!remoteStream) {
          remoteStream =
            videoRef.current?.srcObject ||
            new MediaStream();

          remoteStream.addTrack(event.track);
        }

        if (videoRef.current) {
          if (
            videoRef.current.srcObject !==
            remoteStream
          ) {
            videoRef.current.srcObject =
              remoteStream;
          }

          videoRef.current.muted = false;

          await playVideo();
        }

        setIsConnected(true);
        setConnectionStatus('Live');
      };

      /*
       * --------------------------------------------------------
       * VIEWER ICE
       * --------------------------------------------------------
       */

      pc.onicecandidate = (event) => {
        if (
          !event.candidate ||
          !socketRef.current?.connected ||
          !hostSocketIdRef.current
        ) {
          return;
        }

        socketRef.current.emit(
          'webrtc_ice_candidate',
          {
            streamId,
            candidate: event.candidate,
            targetSocketId:
              hostSocketIdRef.current,
            senderType: 'viewer',
          }
        );
      };

      /*
       * --------------------------------------------------------
       * VIEWER ICE STATE
       * --------------------------------------------------------
       */

      pc.oniceconnectionstatechange = () => {
        if (!isComponentMounted) return;

        const state = pc.iceConnectionState;

        console.log(
          '🧊 Viewer ICE state:',
          state
        );

        if (
          state === 'connected' ||
          state === 'completed'
        ) {
          setIsConnected(true);
          setConnectionStatus('Live');
        }

        if (state === 'checking') {
          setConnectionStatus(
            'Connecting to Live Stream...'
          );
        }

        /*
         * Do NOT immediately destroy the peer when it
         * becomes disconnected. Mobile networks and
         * Wi-Fi changes can temporarily produce this state.
         */
        if (state === 'disconnected') {
          setConnectionStatus(
            'Reconnecting to Live Stream...'
          );
        }

        if (state === 'failed') {
          setConnectionStatus(
            'Connection Failed'
          );
        }
      };

      /*
       * --------------------------------------------------------
       * VIEWER CONNECTION STATE
       * --------------------------------------------------------
       */

      pc.onconnectionstatechange = () => {
        if (!isComponentMounted) return;

        console.log(
          '🔗 Viewer connection state:',
          pc.connectionState
        );

        if (
          pc.connectionState === 'connected'
        ) {
          setIsConnected(true);
          setConnectionStatus('Live');
        }

        if (
          pc.connectionState === 'connecting'
        ) {
          setConnectionStatus(
            'Connecting to Live Stream...'
          );
        }

        if (
          pc.connectionState === 'disconnected'
        ) {
          /*
           * Keep the peer alive.
           */
          setConnectionStatus(
            'Reconnecting to Live Stream...'
          );
        }

        if (
          pc.connectionState === 'failed'
        ) {
          setIsConnected(false);
          setConnectionStatus(
            'Connection Failed'
          );
        }
      };

      /*
       * --------------------------------------------------------
       * WEBRTC OFFER
       * --------------------------------------------------------
       */

      socket.on(
        'webrtc_offer_received',
        async (payload = {}) => {
          if (!isComponentMounted) return;

          if (!payload.offer) {
            console.warn(
              '⚠️ Received WebRTC offer without offer data.'
            );
            return;
          }

          /*
           * Prevent duplicate offer processing.
           */
          if (viewerOfferHandledRef.current) {
            console.log(
              'ℹ️ Duplicate WebRTC offer ignored.'
            );
            return;
          }

          /*
           * If a remote description is already installed,
           * this offer has already been processed.
           */
          if (pc.remoteDescription) {
            return;
          }

          console.log(
            '📥 Received WebRTC Offer from host.'
          );

          try {
            /*
             * Store host socket ID for ICE.
             */
            if (payload.hostSocketId) {
              hostSocketIdRef.current =
                payload.hostSocketId;
            }

            await pc.setRemoteDescription(
              new RTCSessionDescription(
                payload.offer
              )
            );

            if (!isComponentMounted) return;

            const answer =
              await pc.createAnswer();

            if (!isComponentMounted) return;

            await pc.setLocalDescription(answer);

            if (!isComponentMounted) return;

            socket.emit(
              'send_webrtc_answer',
              {
                streamId,
                answer: pc.localDescription,
              }
            );

            viewerOfferHandledRef.current = true;

            /*
             * Apply any ICE candidates that arrived
             * before the offer.
             */
            await flushIceCandidates(
              pc,
              'host_queue'
            );

            console.log(
              '📤 WebRTC answer sent to host.'
            );
          } catch (error) {
            console.error(
              '❌ Viewer WebRTC handshake failure:',
              error
            );

            viewerOfferHandledRef.current =
              false;

            setConnectionStatus(
              'Connection Negotiation Failed'
            );
          }
        }
      );
    };

    /*
     * ----------------------------------------------------------
     * ICE CANDIDATE HANDLER
     * ----------------------------------------------------------
     */

    const handleIncomingIceCandidate =
      async (payload = {}) => {
        if (!isComponentMounted) return;

        if (!payload.candidate) {
          return;
        }

        /*
         * HOST
         */
        if (isHost) {
          const viewerId =
            payload.senderSocketId;

          if (
            payload.senderType !== 'viewer' ||
            !viewerId
          ) {
            return;
          }

          const pc =
            peerConnectionsRef.current[
              viewerId
            ];

          if (!pc) {
            /*
             * Peer may not have been created yet.
             * Queue the candidate.
             */
            if (
              !iceCandidatesQueueRef.current[
                viewerId
              ]
            ) {
              iceCandidatesQueueRef.current[
                viewerId
              ] = [];
            }

            iceCandidatesQueueRef.current[
              viewerId
            ].push(payload.candidate);

            return;
          }

          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(
                new RTCIceCandidate(
                  payload.candidate
                )
              );
            } catch (error) {
              console.debug(
                'Host failed to add ICE candidate:',
                error
              );
            }
          } else {
            if (
              !iceCandidatesQueueRef.current[
                viewerId
              ]
            ) {
              iceCandidatesQueueRef.current[
                viewerId
              ] = [];
            }

            iceCandidatesQueueRef.current[
              viewerId
            ].push(payload.candidate);
          }

          return;
        }

        /*
         * VIEWER
         */

        if (
          payload.senderType !== 'host'
        ) {
          return;
        }

        const pc =
          singleViewerPcRef.current;

        if (!pc) {
          return;
        }

        if (payload.hostSocketId) {
          hostSocketIdRef.current =
            payload.hostSocketId;
        }

        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(
                payload.candidate
              )
            );
          } catch (error) {
            console.debug(
              'Viewer failed to add ICE candidate:',
              error
            );
          }
        } else {
          if (
            !iceCandidatesQueueRef.current
              .host_queue
          ) {
            iceCandidatesQueueRef.current
              .host_queue = [];
          }

          iceCandidatesQueueRef.current
            .host_queue.push(
              payload.candidate
            );
        }
      };

    socket.on(
      'incoming_ice_candidate',
      handleIncomingIceCandidate
    );

    /*
     * ----------------------------------------------------------
     * START CORRECT PIPELINE
     * ----------------------------------------------------------
     */

    if (isHost) {
      initializeHost();
    } else {
      initializeViewer();
    }

    /*
     * ----------------------------------------------------------
     * CLEANUP
     * ----------------------------------------------------------
     */

    return () => {
      isComponentMounted = false;
      isCleaningUpRef.current = true;

      console.log(
        '🧹 Cleaning up VideoPlayer...'
      );

      /*
       * Remove socket listeners.
       */
      socket.off(
        'connect',
        handleSocketConnect
      );

      socket.off(
        'disconnect',
        handleSocketDisconnect
      );

      socket.off(
        'connect_error'
      );

      socket.off(
        'viewer_requesting_stream'
      );

      socket.off(
        'webrtc_answer_received'
      );

      socket.off(
        'webrtc_offer_received'
      );

      socket.off(
        'incoming_ice_candidate',
        handleIncomingIceCandidate
      );

      /*
       * Stop host media only if this component created it.
       */
      if (
        localStreamRef.current &&
        !customStream
      ) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch (error) {
              console.debug(
                'Error stopping media track:',
                error
              );
            }
          });
      }

      localStreamRef.current = null;

      /*
       * Close all host peers.
       */
      Object.keys(
        peerConnectionsRef.current
      ).forEach((viewerId) => {
        closeHostPeer(viewerId);
      });

      peerConnectionsRef.current = {};

      /*
       * Close viewer peer.
       */
      if (
        singleViewerPcRef.current
      ) {
        try {
          singleViewerPcRef.current.close();
        } catch (error) {
          console.debug(
            'Error closing viewer peer:',
            error
          );
        }

        singleViewerPcRef.current = null;
      }

      /*
       * Clear ICE queues.
       */
      iceCandidatesQueueRef.current = {};

      negotiatingViewersRef.current.clear();

      viewerOfferHandledRef.current =
        false;

      hostSocketIdRef.current = null;

      /*
       * Clear video element.
       */
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      /*
       * Disconnect socket.
       */
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (error) {
        console.debug(
          'Error disconnecting socket:',
          error
        );
      }

      if (
        socketRef.current === socket
      ) {
        socketRef.current = null;
      }
    };
  }, [
    streamId,
    streamType,
    customStream,
    isHost,
  ]);

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isHost}
        controls={false}
        className={`
          w-full
          h-full
          object-cover
          transition-opacity
          duration-500
          ${
            isConnected || isHost
              ? 'opacity-100'
              : 'opacity-40'
          }
          ${
            isHost &&
            streamType === 'device_camera'
              ? 'scale-x-[-1]'
              : ''
          }
        `}
      />

      {!isConnected && !isHost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950">
          <div className="w-10 h-10 border-4 border-t-[#fe2c55] border-zinc-800 rounded-full animate-spin" />

          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 text-center px-6">
            {connectionStatus}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
