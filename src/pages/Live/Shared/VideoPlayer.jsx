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

  // Host: viewerSocketId -> RTCPeerConnection
  const peerConnectionsRef = useRef({});

  // Viewer: one RTCPeerConnection to host
  const singleViewerPcRef = useRef(null);

  // ICE candidates waiting for remoteDescription
  const iceCandidatesQueueRef = useRef({});

  // Viewer needs host socket ID for ICE
  const hostSocketIdRef = useRef(null);

  // Prevent duplicate host negotiations
  const negotiatingViewersRef = useRef(new Set());

  // Viewer offer state
  const viewerOfferHandledRef = useRef(false);

  // Component lifecycle
  const mountedRef = useRef(false);

  // Prevent multiple viewer peer recreations at once
  const creatingViewerPeerRef = useRef(false);

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

    const lastSegment =
      pathSegments[pathSegments.length - 1];

    if (lastSegment && lastSegment.length > 20) {
      return lastSegment;
    }

    return propStreamId;
  };

  const streamId = getStreamId();

  /*
   * ------------------------------------------------------------
   * HOST DETECTION
   *
   * IMPORTANT:
   *
   * The parent component explicitly tells us whether this
   * VideoPlayer is a host or viewer.
   *
   * Do NOT infer this from the URL.
   * ------------------------------------------------------------
   */

  const isHost = Boolean(initialIsHost);

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
      console.debug(
        'Video autoplay pending:',
        error?.message || error
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * CLOSE HOST PEER
   * ------------------------------------------------------------
   */

  const closeHostPeer = viewerId => {
    const pc =
      peerConnectionsRef.current[viewerId];

    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
      } catch (error) {
        console.debug(
          'Error closing host peer:',
          error
        );
      }
    }

    delete peerConnectionsRef.current[viewerId];
    delete iceCandidatesQueueRef.current[viewerId];

    negotiatingViewersRef.current.delete(
      viewerId
    );
  };

  /*
   * ------------------------------------------------------------
   * FLUSH QUEUED ICE
   * ------------------------------------------------------------
   */

  const flushIceCandidates = async (
    pc,
    queueKey
  ) => {
    const queue =
      iceCandidatesQueueRef.current[queueKey];

    if (
      !pc ||
      !queue ||
      queue.length === 0 ||
      !pc.remoteDescription
    ) {
      return;
    }

    const candidates = [...queue];

    iceCandidatesQueueRef.current[queueKey] = [];

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.debug(
          'Failed to add queued ICE candidate:',
          error
        );
      }
    }
  };

  /*
   * ------------------------------------------------------------
   * CLOSE VIEWER PEER
   * ------------------------------------------------------------
   */

  const closeViewerPeer = () => {
    const pc =
      singleViewerPcRef.current;

    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch (error) {
        console.debug(
          'Error closing viewer peer:',
          error
        );
      }
    }

    singleViewerPcRef.current = null;

    delete iceCandidatesQueueRef.current.host_queue;

    viewerOfferHandledRef.current = false;
    creatingViewerPeerRef.current = false;
    hostSocketIdRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /*
   * ------------------------------------------------------------
   * CREATE VIEWER PEER
   * ------------------------------------------------------------
   */

  const createViewerPeer = () => {
    if (
      singleViewerPcRef.current &&
      singleViewerPcRef.current.connectionState !==
        'closed' &&
      singleViewerPcRef.current.connectionState !==
        'failed'
    ) {
      return singleViewerPcRef.current;
    }

    const pc = new RTCPeerConnection(
      GLOBAL_ICE_CONFIG
    );

    singleViewerPcRef.current = pc;

    iceCandidatesQueueRef.current.host_queue = [];

    return pc;
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
      setConnectionStatus(
        'Awaiting Stream Setup...'
      );

      return undefined;
    }

    mountedRef.current = true;

    let isComponentMounted = true;

    const globalIo =
      io ||
      (typeof window !== 'undefined'
        ? window.io
        : null);

    if (!globalIo) {
      console.error(
        '❌ Socket.io client initialization failed.'
      );

      setConnectionStatus(
        'Engine Missing'
      );

      return undefined;
    }

    /*
     * ----------------------------------------------------------
     * SOCKET
     * ----------------------------------------------------------
     */

    const socket = globalIo(
      SOCKET_SERVER_URL,
      {
        transports: [
          'websocket',
          'polling',
        ],

        query: {
          room: streamId,
          role: isHost
            ? 'host'
            : 'viewer',
          streamType,
        },

        forceNew: true,

        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,

        timeout: 20000,

        autoConnect: true,
      }
    );

    socketRef.current = socket;

    /*
     * ----------------------------------------------------------
     * REQUEST HOST STREAM
     * ----------------------------------------------------------
     */

    const requestHostStream = () => {
      if (
        isHost ||
        !isComponentMounted ||
        !socket.connected
      ) {
        return;
      }

      console.log(
        '📡 Requesting host media stream...'
      );

      setConnectionStatus(
        'Negotiating Media Stream...'
      );

      socket.emit(
        'request_host_stream',
        {
          streamId,
          streamType,
        }
      );
    };

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

      if (isHost) {
        setIsConnected(true);
        setConnectionStatus(
          'Streaming Live'
        );
        return;
      }

      /*
       * A reconnect means the old signaling state
       * may no longer be valid.
       */
      viewerOfferHandledRef.current = false;

      hostSocketIdRef.current = null;

      /*
       * Recreate viewer peer if the previous one
       * belonged to a dead signaling session.
       */
      const existingPc =
        singleViewerPcRef.current;

      if (
        existingPc &&
        (
          existingPc.connectionState ===
            'failed' ||
          existingPc.connectionState ===
            'closed'
        )
      ) {
        closeViewerPeer();
      }

      requestHostStream();
    };

    socket.on(
      'connect',
      handleSocketConnect
    );

    /*
     * ----------------------------------------------------------
     * SOCKET DISCONNECT
     * ----------------------------------------------------------
     */

    const handleSocketDisconnect = reason => {
      if (!isComponentMounted) return;

      console.warn(
        '🟠 Socket disconnected:',
        reason
      );

      if (!isHost) {
        setIsConnected(false);

        setConnectionStatus(
          'Reconnecting...'
        );

        /*
         * The WebRTC connection can no longer be
         * reliably signaled through this socket.
         *
         * Keep the video element alive for now,
         * but reset negotiation state.
         */
        viewerOfferHandledRef.current = false;

        hostSocketIdRef.current = null;
      }
    };

    socket.on(
      'disconnect',
      handleSocketDisconnect
    );

    /*
     * ----------------------------------------------------------
     * SOCKET ERROR
     * ----------------------------------------------------------
     */

    const handleSocketError = error => {
      if (!isComponentMounted) return;

      console.error(
        '❌ Socket connection error:',
        error?.message || error
      );

      if (!isHost) {
        setConnectionStatus(
          'Connecting to Live Stream...'
        );
      }
    };

    socket.on(
      'connect_error',
      handleSocketError
    );

    /*
     * ==========================================================
     * HOST PIPELINE
     * ==========================================================
     */

    const initializeHost = async () => {
      let stream = customStream;

      /*
       * --------------------------------------------------------
       * VIEWER REQUEST
       * --------------------------------------------------------
       */

      socket.on(
        'viewer_requesting_stream',
        async payload => {
          if (!isComponentMounted) return;

          const viewerId =
            payload?.viewerSocketId;

          if (!viewerId) {
            console.warn(
              '⚠️ Viewer request received without viewerSocketId.'
            );

            return;
          }

          /*
           * Wait for host media if necessary.
           */

          if (
            !localStreamRef.current &&
            !stream
          ) {
            console.warn(
              '⚠️ Viewer requested stream before host media was ready.'
            );

            setTimeout(() => {
              if (
                isComponentMounted &&
                socket.connected
              ) {
                socket.emit(
                  'request_host_stream_ready',
                  {
                    streamId,
                    targetViewerId:
                      viewerId,
                  }
                );
              }
            }, 500);

            return;
          }

          const activeStream =
            localStreamRef.current ||
            stream;

          if (!activeStream) return;

          console.log(
            '📥 Viewer requested stream:',
            viewerId
          );

          const existingPc =
            peerConnectionsRef.current[
              viewerId
            ];

          if (
            existingPc &&
            existingPc.connectionState !==
              'closed' &&
            existingPc.connectionState !==
              'failed'
          ) {
            console.log(
              'ℹ️ Viewer already has an active peer:',
              viewerId
            );

            return;
          }

          if (existingPc) {
            closeHostPeer(viewerId);
          }

          if (
            negotiatingViewersRef.current.has(
              viewerId
            )
          ) {
            console.log(
              'ℹ️ Viewer negotiation already running:',
              viewerId
            );

            return;
          }

          negotiatingViewersRef.current.add(
            viewerId
          );

          const pc =
            new RTCPeerConnection(
              GLOBAL_ICE_CONFIG
            );

          peerConnectionsRef.current[
            viewerId
          ] = pc;

          iceCandidatesQueueRef.current[
            viewerId
          ] = [];

          /*
           * ----------------------------------------------------
           * ADD HOST TRACKS
           * ----------------------------------------------------
           */

          activeStream
            .getTracks()
            .forEach(track => {
              try {
                pc.addTrack(
                  track,
                  activeStream
                );
              } catch (error) {
                console.error(
                  '❌ Failed to add host track:',
                  error
                );
              }
            });

          /*
           * ----------------------------------------------------
           * HOST ICE
           * ----------------------------------------------------
           */

          pc.onicecandidate = event => {
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
                targetSocketId:
                  viewerId,
                senderType: 'host',
              }
            );
          };

          /*
           * ----------------------------------------------------
           * HOST CONNECTION
           * ----------------------------------------------------
           */

          pc.onconnectionstatechange =
            () => {
              if (!isComponentMounted)
                return;

              console.log(
                '🔗 Host -> Viewer [' +
                  viewerId +
                  '] connection:',
                pc.connectionState
              );

              if (
                pc.connectionState ===
                'connected'
              ) {
                console.log(
                  '🟢 Viewer connected:',
                  viewerId
                );
              }

              if (
                pc.connectionState ===
                  'failed' ||
                pc.connectionState ===
                  'closed'
              ) {
                closeHostPeer(
                  viewerId
                );
              }
            };

          pc.oniceconnectionstatechange =
            () => {
              if (!isComponentMounted)
                return;

              console.log(
                '🧊 Host -> Viewer [' +
                  viewerId +
                  '] ICE:',
                pc.iceConnectionState
              );
            };

          /*
           * ----------------------------------------------------
           * OFFER
           * ----------------------------------------------------
           */

          try {
            const offer =
              await pc.createOffer();

            if (!isComponentMounted) {
              closeHostPeer(
                viewerId
              );
              return;
            }

            await pc.setLocalDescription(
              offer
            );

            if (!isComponentMounted) {
              closeHostPeer(
                viewerId
              );
              return;
            }

            socket.emit(
              'send_webrtc_offer',
              {
                streamId,
                offer:
                  pc.localDescription,
                targetViewerId:
                  viewerId,
              }
            );

            console.log(
              '📤 WebRTC offer sent to viewer:',
              viewerId
            );
          } catch (error) {
            console.error(
              '❌ Failed to create offer for viewer:',
              viewerId,
              error
            );

            closeHostPeer(
              viewerId
            );
          } finally {
            negotiatingViewersRef.current.delete(
              viewerId
            );
          }
        }
      );

      /*
       * --------------------------------------------------------
       * ANSWER FROM VIEWER
       * --------------------------------------------------------
       */

      socket.on(
        'webrtc_answer_received',
        async payload => {
          if (!isComponentMounted)
            return;

          const viewerId =
            payload?.viewerSocketId;

          if (
            !viewerId ||
            !payload?.answer
          ) {
            return;
          }

          const pc =
            peerConnectionsRef.current[
              viewerId
            ];

          if (!pc) {
            console.warn(
              '⚠️ No peer connection for viewer:',
              viewerId
            );

            return;
          }

          try {
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
              '✅ Remote answer applied for viewer:',
              viewerId
            );
          } catch (error) {
            console.error(
              '❌ Error setting remote answer:',
              error
            );
          }
        }
      );

      /*
       * --------------------------------------------------------
       * GET HOST MEDIA
       * --------------------------------------------------------
       */

      if (!stream) {
        if (
          typeof navigator ===
            'undefined' ||
          !navigator.mediaDevices
        ) {
          throw new Error(
            'Browser media devices are unavailable.'
          );
        }

        if (
          streamType === 'gaming'
        ) {
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
        if (
          !customStream &&
          stream
        ) {
          stream
            .getTracks()
            .forEach(track =>
              track.stop()
            );
        }

        return;
      }

      localStreamRef.current =
        stream;

      /*
       * --------------------------------------------------------
       * HOST LOCAL PREVIEW
       * --------------------------------------------------------
       */

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        videoRef.current.muted =
          true;

        await playVideo();
      }

      setIsConnected(true);
      setConnectionStatus(
        'Streaming Live'
      );

      console.log(
        '🎥 Host media ready:',
        streamType
      );

      /*
       * --------------------------------------------------------
       * SCREEN SHARE ENDED
       * --------------------------------------------------------
       */

      stream
        .getVideoTracks()
        .forEach(track => {
          track.addEventListener(
            'ended',
            () => {
              if (
                !isComponentMounted
              ) {
                return;
              }

              console.log(
                '🛑 Host video track ended.'
              );

              if (
                streamType ===
                'gaming'
              ) {
                setConnectionStatus(
                  'Screen Sharing Ended'
                );
              }
            },
            { once: true }
          );
        });
    };

    /*
     * ==========================================================
     * VIEWER PIPELINE
     * ==========================================================
     */

    const initializeViewer =
      () => {
        const pc =
          createViewerPeer();

        /*
         * ------------------------------------------------------
         * REMOTE TRACK
         * ------------------------------------------------------
         */

        pc.ontrack = async event => {
          if (
            !isComponentMounted
          ) {
            return;
          }

          console.log(
            '🎬 Remote media track received:',
            event.track?.kind
          );

          let remoteStream =
            event.streams?.[0];

          /*
           * Fallback for browsers that don't
           * populate event.streams.
           */

          if (!remoteStream) {
            remoteStream =
              videoRef.current
                ?.srcObject;

            if (
              !remoteStream ||
              !(
                remoteStream instanceof
                MediaStream
              )
            ) {
              remoteStream =
                new MediaStream();
            }

            const alreadyAdded =
              remoteStream
                .getTracks()
                .some(
                  track =>
                    track.id ===
                    event.track.id
                );

            if (!alreadyAdded) {
              remoteStream.addTrack(
                event.track
              );
            }
          }

          if (videoRef.current) {
            videoRef.current.srcObject =
              remoteStream;

            videoRef.current.muted =
              false;

            videoRef.current.autoplay =
              true;

            videoRef.current.playsInline =
              true;

            await playVideo();
          }

          setIsConnected(true);
          setConnectionStatus(
            'Live'
          );
        };

        /*
         * ------------------------------------------------------
         * VIEWER ICE
         * ------------------------------------------------------
         */

        pc.onicecandidate = event => {
          if (
            !event.candidate ||
            !socket.connected ||
            !hostSocketIdRef.current
          ) {
            return;
          }

          socket.emit(
            'webrtc_ice_candidate',
            {
              streamId,
              candidate:
                event.candidate,
              targetSocketId:
                hostSocketIdRef.current,
              senderType: 'viewer',
            }
          );
        };

        /*
         * ------------------------------------------------------
         * VIEWER ICE STATE
         * ------------------------------------------------------
         */

        pc.oniceconnectionstatechange =
          () => {
            if (
              !isComponentMounted
            ) {
              return;
            }

            const state =
              pc.iceConnectionState;

            console.log(
              '🧊 Viewer ICE state:',
              state
            );

            if (
              state === 'connected' ||
              state === 'completed'
            ) {
              setIsConnected(true);
              setConnectionStatus(
                'Live'
              );
            }

            if (
              state === 'checking'
            ) {
              setConnectionStatus(
                'Connecting to Live Stream...'
              );
            }

            if (
              state ===
              'disconnected'
            ) {
              setConnectionStatus(
                'Reconnecting to Live Stream...'
              );
            }

            if (
              state === 'failed'
            ) {
              setIsConnected(false);

              setConnectionStatus(
                'Connection Failed'
              );

              /*
               * Do not immediately destroy the peer.
               * The signaling connection may still recover.
               */
            }
          };

        /*
         * ------------------------------------------------------
         * VIEWER CONNECTION STATE
         * ------------------------------------------------------
         */

        pc.onconnectionstatechange =
          () => {
            if (
              !isComponentMounted
            ) {
              return;
            }

            console.log(
              '🔗 Viewer connection state:',
              pc.connectionState
            );

            if (
              pc.connectionState ===
              'connected'
            ) {
              setIsConnected(true);
              setConnectionStatus(
                'Live'
              );
            }

            if (
              pc.connectionState ===
              'connecting'
            ) {
              setConnectionStatus(
                'Connecting to Live Stream...'
              );
            }

            if (
              pc.connectionState ===
              'disconnected'
            ) {
              setConnectionStatus(
                'Reconnecting to Live Stream...'
              );
            }

            if (
              pc.connectionState ===
              'failed'
            ) {
              setIsConnected(false);

              setConnectionStatus(
                'Connection Failed'
              );
            }
          };

        /*
         * ------------------------------------------------------
         * WEBRTC OFFER FROM HOST
         * ------------------------------------------------------
         */

        socket.on(
          'webrtc_offer_received',
          async payload => {
            if (
              !isComponentMounted
            ) {
              return;
            }

            if (!payload?.offer) {
              console.warn(
                '⚠️ WebRTC offer received without offer data.'
              );

              return;
            }

            /*
             * Save host socket ID immediately.
             */

            if (
              payload.hostSocketId
            ) {
              hostSocketIdRef.current =
                payload.hostSocketId;
            }

            /*
             * A new host socket means this is
             * a fresh signaling session.
             */

            if (
              payload.hostSocketId &&
              hostSocketIdRef.current !==
                payload.hostSocketId
            ) {
              viewerOfferHandledRef.current =
                false;
            }

            /*
             * Ignore duplicate offer only when
             * it is for the same active peer.
             */

            if (
              viewerOfferHandledRef.current &&
              pc.remoteDescription
            ) {
              console.log(
                'ℹ️ Duplicate WebRTC offer ignored.'
              );

              return;
            }

            if (
              creatingViewerPeerRef.current
            ) {
              console.log(
                'ℹ️ Viewer negotiation already in progress.'
              );

              return;
            }

            creatingViewerPeerRef.current =
              true;

            console.log(
              '📥 Received WebRTC offer from host.'
            );

            try {
              /*
               * If the existing peer is unusable,
               * recreate it.
               */

              if (
                pc.connectionState ===
                  'failed' ||
                pc.connectionState ===
                  'closed'
              ) {
                closeViewerPeer();

                const newPc =
                  createViewerPeer();

                await handleViewerOffer(
                  newPc,
                  payload,
                  socket
                );
              } else {
                await handleViewerOffer(
                  pc,
                  payload,
                  socket
                );
              }
            } catch (error) {
              console.error(
                '❌ Viewer WebRTC handshake failure:',
                error
              );

              viewerOfferHandledRef.current =
                false;

              setIsConnected(false);

              setConnectionStatus(
                'Connection Negotiation Failed'
              );
            } finally {
              creatingViewerPeerRef.current =
                false;
            }
          }
        );
      };

    /*
     * ----------------------------------------------------------
     * VIEWER OFFER HANDLER
     * ----------------------------------------------------------
     */

    const handleViewerOffer = async (
      pc,
      payload,
      activeSocket
    ) => {
      if (
        !pc ||
        !payload?.offer ||
        !isComponentMounted
      ) {
        return;
      }

      /*
       * A valid remote description means
       * the offer has already been installed.
       */

      if (pc.remoteDescription) {
        return;
      }

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          payload.offer
        )
      );

      if (!isComponentMounted) {
        return;
      }

      /*
       * Flush host ICE that arrived before
       * the remote description.
       */

      await flushIceCandidates(
        pc,
        'host_queue'
      );

      const answer =
        await pc.createAnswer();

      if (!isComponentMounted) {
        return;
      }

      await pc.setLocalDescription(
        answer
      );

      if (!isComponentMounted) {
        return;
      }

      activeSocket.emit(
        'send_webrtc_answer',
        {
          streamId,
          answer:
            pc.localDescription,
        }
      );

      viewerOfferHandledRef.current =
        true;

      console.log(
        '📤 WebRTC answer sent to host.'
      );
    };

    /*
     * ----------------------------------------------------------
     * ICE CANDIDATES
     * ----------------------------------------------------------
     */

    const handleIncomingIceCandidate =
      async payload => {
        if (
          !isComponentMounted ||
          !payload?.candidate
        ) {
          return;
        }

        /*
         * ======================================================
         * HOST
         * ======================================================
         */

        if (isHost) {
          const viewerId =
            payload.senderSocketId;

          if (
            payload.senderType !==
              'viewer' ||
            !viewerId
          ) {
            return;
          }

          const pc =
            peerConnectionsRef.current[
              viewerId
            ];

          /*
           * Peer hasn't been created yet.
           * Queue candidate.
           */

          if (!pc) {
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
            ].push(
              payload.candidate
            );

            return;
          }

          if (
            pc.remoteDescription
          ) {
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
            ].push(
              payload.candidate
            );
          }

          return;
        }

        /*
         * ======================================================
         * VIEWER
         * ======================================================
         */

        if (
          payload.senderType !== 'host'
        ) {
          return;
        }

        const pc =
          singleViewerPcRef.current;

        if (!pc) {
          /*
           * Peer may not have been created yet.
           */
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

          return;
        }

        if (
          payload.hostSocketId
        ) {
          hostSocketIdRef.current =
            payload.hostSocketId;
        }

        if (
          pc.remoteDescription
        ) {
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
     * START PIPELINE
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
      mountedRef.current = false;

      console.log(
        '🧹 Cleaning up VideoPlayer...'
      );

      /*
       * Socket listeners
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
        'connect_error',
        handleSocketError
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
       * Stop host media only when this
       * component created it.
       */

      if (
        localStreamRef.current &&
        !customStream
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(track => {
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

      localStreamRef.current =
        null;

      /*
       * Close host peers.
       */

      Object.keys(
        peerConnectionsRef.current
      ).forEach(viewerId => {
        closeHostPeer(
          viewerId
        );
      });

      peerConnectionsRef.current =
        {};

      /*
       * Close viewer peer.
       */

      closeViewerPeer();

      /*
       * Reset ICE state.
       */

      iceCandidatesQueueRef.current =
        {};

      negotiatingViewersRef.current.clear();

      viewerOfferHandledRef.current =
        false;

      hostSocketIdRef.current =
        null;

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
        className={
          'w-full h-full object-cover transition-opacity duration-500 ' +
          (
            isConnected || isHost
              ? 'opacity-100'
              : 'opacity-40'
          ) +
          (
            isHost &&
            streamType ===
              'device_camera'
              ? ' scale-x-[-1]'
              : ''
          )
        }
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
