import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  useSearchParams,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../supabaseClient";
import { io } from "socket.io-client";

import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Monitor,
  MessageSquare,
  Send,
  X,
  Activity,
  Camera,
  LayoutGrid,
  Disc,
  Settings,
  Subtitles,
  FileText,
  Radio,
  Check,
  Gift,
  Wand2,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import confetti from "canvas-confetti";

import {
  startRingbackTone,
  stopRingbackTone,
} from "../utils/callNotificationEngine";

import VideoCallWhiteboard from "./videocall/VideoCallWhiteboard";

import VideoCallFilters, {
  VIDEO_FILTERS,
  VIRTUAL_BACKDROPS,
} from "./videocall/VideoCallFilters";

import VideoCallGifts from "./videocall/VideoCallGifts";

import VideoCallDeviceSettings from "./videocall/VideoCallDeviceSettings";

import VideoCallCaptions from "./videocall/VideoCallCaptions";

import VideoCallNotes from "./videocall/VideoCallNotes";

import VideoCallTelemetry from "./videocall/VideoCallTelemetry";

import FloatingReactionsOverlay from "./videocall/FloatingReactionsOverlay";


/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const SOCKET_SERVER_URL =
  "https://mpade-backend.onrender.com";


/*
 * WebRTC configuration.
 *
 * STUN is used first.
 *
 * TURN should be supplied through environment variables.
 *
 * Example .env:
 *
 * VITE_TURN_URL=turn:global.relay.metered.ca:80
 * VITE_TURN_USERNAME=your_username
 * VITE_TURN_CREDENTIAL=your_credential
 *
 * You can also use:
 *
 * VITE_TURN_URLS=turn:server:80,turn:server:443,turns:server:443?transport=tcp
 *
 * IMPORTANT:
 * VITE_* values are visible to the browser.
 * For production, use temporary TURN credentials issued by
 * your Render backend instead of permanent credentials.
 */

const getIceConfiguration = () => {
  const iceServers = [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
  ];

  const turnUrls = import.meta.env.VITE_TURN_URLS
    ? String(import.meta.env.VITE_TURN_URLS)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : import.meta.env.VITE_TURN_URL
      ? [String(import.meta.env.VITE_TURN_URL)]
      : [];

  const turnUsername =
    import.meta.env.VITE_TURN_USERNAME;

  const turnCredential =
    import.meta.env.VITE_TURN_CREDENTIAL;

  if (
    turnUrls.length &&
    turnUsername &&
    turnCredential
  ) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
};


/* ==========================================================================
   COMPONENT
   ========================================================================== */

const VideoCall = () => {
  const [searchParams] =
    useSearchParams();

  const navigate = useNavigate();


  /* ==========================================================================
     URL
     ========================================================================== */

  const peerUserId =
    searchParams.get("userId");

  const URLRole =
    searchParams.get("role");

  const urlCallId =
    searchParams.get("callId");


  /* ==========================================================================
     CORE STATE
     ========================================================================== */

  const [currentUserId, setCurrentUserId] =
    useState(null);

  const [peerProfile, setPeerProfile] =
    useState(null);

  const [callStatus, setCallStatus] =
    useState("Initializing...");

  const [isMuted, setIsMuted] =
    useState(false);

  const [isVideoOff, setIsVideoOff] =
    useState(false);

  const [isScreenSharing, setIsScreenSharing] =
    useState(false);

  const [callDuration, setCallDuration] =
    useState(0);

  const [showChat, setShowChat] =
    useState(false);

  const [inCallMessages, setInCallMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState("");

  const [floatingReactions, setFloatingReactions] =
    useState([]);


  /* ==========================================================================
     PREMIUM FEATURES
     ========================================================================== */

  const [showWhiteboard, setShowWhiteboard] =
    useState(false);

  const [showFilters, setShowFilters] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState("normal");

  const [beautyGlow, setBeautyGlow] =
    useState(false);

  const [activeBackdrop, setActiveBackdrop] =
    useState("none");

  const [showGifts, setShowGifts] =
    useState(false);

  const [userCoins, setUserCoins] =
    useState(1500);

  const [activeGiftAnimation, setActiveGiftAnimation] =
    useState(null);

  const [showDeviceSettings, setShowDeviceSettings] =
    useState(false);

  const [activeVideoDeviceId, setActiveVideoDeviceId] =
    useState(null);

  const [activeAudioDeviceId, setActiveAudioDeviceId] =
    useState(null);

  const [facingMode, setFacingMode] =
    useState("user");

  const [noiseSuppression, setNoiseSuppression] =
    useState(true);

  const [showCaptions, setShowCaptions] =
    useState(false);

  const [showNotes, setShowNotes] =
    useState(false);

  const [showTelemetry, setShowTelemetry] =
    useState(false);

  const [layoutMode, setLayoutMode] =
    useState("focus");

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingDuration, setRecordingDuration] =
    useState(0);

  const [isFlashActive, setIsFlashActive] =
    useState(false);

  const [snapshotToast, setSnapshotToast] =
    useState(false);

  const [micAudioLevel, setMicAudioLevel] =
    useState(0);

  const [isPiPActive, setIsPiPActive] =
    useState(false);


  /* ==========================================================================
     REFS
     ========================================================================== */

  const socketRef =
    useRef(null);

  const pcRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const remoteStreamRef =
    useRef(null);

  const screenTrackRef =
    useRef(null);

  const cameraTrackRef =
    useRef(null);

  const microphoneTrackRef =
    useRef(null);

  const localVideoRef =
    useRef(null);

  const remoteVideoRef =
    useRef(null);

  const iceQueueRef =
    useRef([]);

  const mountedRef =
    useRef(false);

  const endingCallRef =
    useRef(false);

  const offerSentRef =
    useRef(false);

  const answerSentRef =
    useRef(false);

  const remoteDescriptionSetRef =
    useRef(false);

  const callConnectedRef =
    useRef(false);

  const callIdRef =
    useRef(null);

  const roomIdRef =
    useRef(null);

  const callRoleRef =
    useRef(null);

  const currentUserIdRef =
    useRef(null);

  const peerUserIdRef =
    useRef(peerUserId);

  const realtimeChannelsRef =
    useRef([]);

  const audioContextRef =
    useRef(null);

  const analyserRef =
    useRef(null);

  const animFrameRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const recordedChunksRef =
    useRef([]);

  const iceRestartTimerRef =
    useRef(null);

  const incomingOfferProcessingRef =
    useRef(false);


  /*
   * IMPORTANT:
   *
   * These refs prevent camera/device settings from restarting
   * the entire WebRTC connection.
   */

  const facingModeRef =
    useRef(facingMode);

  const noiseSuppressionRef =
    useRef(noiseSuppression);


  /* ==========================================================================
     SYNC REFS
     ========================================================================== */

  useEffect(() => {
    peerUserIdRef.current =
      peerUserId;
  }, [peerUserId]);


  useEffect(() => {
    facingModeRef.current =
      facingMode;
  }, [facingMode]);


  useEffect(() => {
    noiseSuppressionRef.current =
      noiseSuppression;
  }, [noiseSuppression]);


  /* ==========================================================================
     CALL ID
     ========================================================================== */

  useEffect(() => {
    if (urlCallId) {
      callIdRef.current =
        urlCallId;
    } else if (!callIdRef.current) {
      callIdRef.current =
        crypto.randomUUID();
    }
  }, [urlCallId]);


  /* ==========================================================================
     AUDIO VISUALIZER
     ========================================================================== */

  const stopAudioVisualizer =
    useCallback(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(
          animFrameRef.current
        );

        animFrameRef.current =
          null;
      }

      if (audioContextRef.current) {
        audioContextRef.current
          .close()
          .catch(() => {});

        audioContextRef.current =
          null;
      }

      analyserRef.current =
        null;

      setMicAudioLevel(0);
    }, []);


  const setupAudioVisualizer =
    useCallback(
      async (stream) => {
        try {
          stopAudioVisualizer();

          const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

          if (!AudioContext) {
            return;
          }

          const audioTrack =
            stream?.getAudioTracks?.()[0];

          if (!audioTrack) {
            return;
          }

          const audioContext =
            new AudioContext();

          audioContextRef.current =
            audioContext;

          if (
            audioContext.state ===
            "suspended"
          ) {
            await audioContext
              .resume()
              .catch(() => {});
          }

          const analyser =
            audioContext.createAnalyser();

          analyser.fftSize = 64;

          analyser.smoothingTimeConstant =
            0.75;

          analyserRef.current =
            analyser;

          const source =
            audioContext.createMediaStreamSource(
              stream
            );

          source.connect(analyser);

          const dataArray =
            new Uint8Array(
              analyser.frequencyBinCount
            );

          const updateMeter = () => {
            if (
              !analyserRef.current ||
              !mountedRef.current
            ) {
              return;
            }

            analyser.getByteFrequencyData(
              dataArray
            );

            let sum = 0;

            for (
              let i = 0;
              i < dataArray.length;
              i += 1
            ) {
              sum += dataArray[i];
            }

            const average =
              dataArray.length
                ? sum / dataArray.length
                : 0;

            setMicAudioLevel(
              Math.min(
                100,
                Math.round(
                  (average / 128) *
                    100
                )
              )
            );

            animFrameRef.current =
              requestAnimationFrame(
                updateMeter
              );
          };

          updateMeter();
        } catch (error) {
          console.warn(
            "Audio visualizer unavailable:",
            error
          );
        }
      },
      [stopAudioVisualizer]
    );


  /* ==========================================================================
     TIMERS
     ========================================================================== */

  useEffect(() => {
    if (callStatus !== "Connected") {
      setCallDuration(0);
      return undefined;
    }

    const timer =
      setInterval(() => {
        setCallDuration(
          (previous) =>
            previous + 1
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [callStatus]);


  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return undefined;
    }

    const timer =
      setInterval(() => {
        setRecordingDuration(
          (previous) =>
            previous + 1
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRecording]);


  /* ==========================================================================
     RINGBACK
     ========================================================================== */

  useEffect(() => {
    const ringingStates = [
      "initializing",
      "calling",
      "connecting",
      "awaiting connection",
      "accessing devices",
    ];

    const status =
      String(callStatus).toLowerCase();

    const shouldRing =
      callRoleRef.current ===
        "caller" &&
      ringingStates.some(
        (state) =>
          status.includes(state)
      );

    if (shouldRing) {
      startRingbackTone();
    } else {
      stopRingbackTone();
    }

    return () => {
      stopRingbackTone();
    };
  }, [callStatus]);


  /* ==========================================================================
     ICE QUEUE
     ========================================================================== */

  const processIceQueue =
    useCallback(async () => {
      const pc =
        pcRef.current;

      if (
        !pc ||
        !pc.remoteDescription
      ) {
        return;
      }

      const queue =
        [...iceQueueRef.current];

      iceQueueRef.current =
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
            "Failed queued ICE candidate:",
            error
          );
        }
      }
    }, []);


  /* ==========================================================================
     REMOTE MEDIA
     ========================================================================== */

  const attachRemoteStream =
    useCallback(async (stream) => {
      if (!stream) {
        return;
      }

      remoteStreamRef.current =
        stream;

      const video =
        remoteVideoRef.current;

      if (!video) {
        return;
      }

      /*
       * Do not repeatedly replace srcObject.
       *
       * This fixes:
       *
       * AbortError:
       * play() request was interrupted by a new load request.
       */

      if (
        video.srcObject !== stream
      ) {
        video.srcObject =
          stream;
      }

      const playRemoteVideo =
        async () => {
          try {
            await video.play();
          } catch (error) {
            /*
             * AbortError is harmless when the media source
             * is being updated. Do not spam the console.
             */

            if (
              error?.name !==
              "AbortError"
            ) {
              console.warn(
                "Remote media playback failed:",
                error
              );
            }
          }
        };

      if (
        video.readyState >= 2
      ) {
        await playRemoteVideo();
      } else {
        const handler =
          () => {
            video.removeEventListener(
              "loadedmetadata",
              handler
            );

            playRemoteVideo();
          };

        video.addEventListener(
          "loadedmetadata",
          handler,
          {
            once: true,
          }
        );
      }
    }, []);


  /* ==========================================================================
     LOCAL MEDIA
     ========================================================================== */

  const attachLocalStream =
    useCallback((stream) => {
      localStreamRef.current =
        stream;

      cameraTrackRef.current =
        stream.getVideoTracks()[0] ||
        null;

      microphoneTrackRef.current =
        stream.getAudioTracks()[0] ||
        null;

      const video =
        localVideoRef.current;

      if (!video) {
        return;
      }

      if (
        video.srcObject !== stream
      ) {
        video.srcObject =
          stream;
      }

      video.play().catch(() => {});
    }, []);


  /*
   * IMPORTANT:
   *
   * This function has NO facingMode/noiseSuppression dependencies.
   * Therefore changing device settings does not recreate the call.
   */

  const getLocalMedia =
    useCallback(async () => {
      const constraints = {
        video: {
          width: {
            ideal: 1280,
          },

          height: {
            ideal: 720,
          },

          facingMode:
            facingModeRef.current,
        },

        audio: {
          echoCancellation: true,
          noiseSuppression:
            noiseSuppressionRef.current,
          autoGainControl: true,
        },
      };

      return navigator.mediaDevices.getUserMedia(
        constraints
      );
    }, []);


  /* ==========================================================================
     PEER CONNECTION
     ========================================================================== */

  const createPeerConnection =
    useCallback(() => {
      if (
        pcRef.current &&
        pcRef.current.connectionState !==
          "closed"
      ) {
        return pcRef.current;
      }

      const pc =
        new RTCPeerConnection(
          getIceConfiguration()
        );

      pcRef.current =
        pc;

      const localStream =
        localStreamRef.current;

      if (localStream) {
        localStream
          .getTracks()
          .forEach((track) => {
            try {
              pc.addTrack(
                track,
                localStream
              );
            } catch (error) {
              console.warn(
                "Failed adding local track:",
                error
              );
            }
          });
      }


      /* ----------------------------------------------------------------------
         REMOTE TRACK
         ---------------------------------------------------------------------- */

      pc.ontrack =
        async (event) => {
          console.log(
            "🎬 Remote track received:",
            event.track?.kind
          );

          let stream =
            event.streams?.[0];

          if (!stream) {
            if (
              !remoteStreamRef.current
            ) {
              remoteStreamRef.current =
                new MediaStream();
            }

            stream =
              remoteStreamRef.current;

            if (
              !stream
                .getTracks()
                .some(
                  (track) =>
                    track.id ===
                    event.track.id
                )
            ) {
              stream.addTrack(
                event.track
              );
            }
          } else {
            remoteStreamRef.current =
              stream;
          }

          await attachRemoteStream(
            stream
          );

          callConnectedRef.current =
            true;

          setCallStatus(
            "Connected"
          );

          stopRingbackTone();
        };


      /* ----------------------------------------------------------------------
         ICE CANDIDATE
         ---------------------------------------------------------------------- */

      pc.onicecandidate =
        (event) => {
          if (
            !event.candidate
          ) {
            return;
          }

          const socket =
            socketRef.current;

          const target =
            peerUserIdRef.current;

          const roomId =
            roomIdRef.current;

          if (
            !socket ||
            !socket.connected ||
            !target ||
            !roomId
          ) {
            return;
          }

          socket.emit(
            "webrtc_ice_candidate",
            {
              roomId,
              streamId: roomId,

              candidate:
                event.candidate,

              to: target,

              targetUserId:
                target,

              callId:
                callIdRef.current,

              fromUserId:
                currentUserIdRef.current,
            }
          );
        };


      /* ----------------------------------------------------------------------
         CONNECTION STATE
         ---------------------------------------------------------------------- */

      pc.onconnectionstatechange =
        () => {
          if (
            pc !== pcRef.current
          ) {
            return;
          }

          console.log(
            "WebRTC connection state:",
            pc.connectionState
          );

          switch (
            pc.connectionState
          ) {
            case "new":
              break;

            case "connecting":
              if (
                !callConnectedRef.current
              ) {
                setCallStatus(
                  "Connecting..."
                );
              }
              break;

            case "connected":
              callConnectedRef.current =
                true;

              setCallStatus(
                "Connected"
              );

              stopRingbackTone();

              if (
                iceRestartTimerRef.current
              ) {
                clearTimeout(
                  iceRestartTimerRef.current
                );

                iceRestartTimerRef.current =
                  null;
              }

              break;

            case "disconnected":
              console.warn(
                "⚠️ WebRTC temporarily disconnected"
              );

              /*
               * DO NOT clean up immediately.
               *
               * Mobile networks can recover.
               */

              if (
                !iceRestartTimerRef.current
              ) {
                iceRestartTimerRef.current =
                  setTimeout(() => {
                    iceRestartTimerRef.current =
                      null;

                    if (
                      pcRef.current !==
                      pc
                    ) {
                      return;
                    }

                    if (
                      pc.connectionState ===
                        "disconnected" ||
                      pc.iceConnectionState ===
                        "disconnected"
                    ) {
                      console.log(
                        "🔄 Attempting ICE recovery..."
                      );

                      restartIceConnection();
                    }
                  }, 3000);
              }

              break;

            case "failed":
              console.error(
                "❌ WebRTC connection failed"
              );

              if (
                callRoleRef.current ===
                "caller"
              ) {
                restartIceConnection();
              } else {
                setCallStatus(
                  "Connection Failed"
                );
              }

              break;

            case "closed":
              callConnectedRef.current =
                false;
              break;

            default:
              break;
          }
        };


      /* ----------------------------------------------------------------------
         ICE CONNECTION STATE
         ---------------------------------------------------------------------- */

      pc.oniceconnectionstatechange =
        () => {
          if (
            pc !== pcRef.current
          ) {
            return;
          }

          console.log(
            "ICE state:",
            pc.iceConnectionState
          );

          if (
            pc.iceConnectionState ===
            "connected"
          ) {
            stopRingbackTone();
          }

          if (
            pc.iceConnectionState ===
            "completed"
          ) {
            stopRingbackTone();
          }

          if (
            pc.iceConnectionState ===
            "failed"
          ) {
            console.error(
              "❌ ICE connection failed"
            );

            if (
              callRoleRef.current ===
              "caller"
            ) {
              restartIceConnection();
            }
          }
        };


      /* ----------------------------------------------------------------------
         ICE GATHERING
         ---------------------------------------------------------------------- */

      pc.onicegatheringstatechange =
        () => {
          console.log(
            "ICE gathering:",
            pc.iceGatheringState
          );
        };


      /* ----------------------------------------------------------------------
         SIGNALING STATE
         ---------------------------------------------------------------------- */

      pc.onsignalingstatechange =
        () => {
          console.log(
            "Signaling state:",
            pc.signalingState
          );
        };

      return pc;
    }, [attachRemoteStream]);


  /* ==========================================================================
     ICE RESTART
     ========================================================================== */

  const restartIceConnection =
    useCallback(async () => {
      const pc =
        pcRef.current;

      const socket =
        socketRef.current;

      const target =
        peerUserIdRef.current;

      const roomId =
        roomIdRef.current;

      if (
        !pc ||
        !socket ||
        !socket.connected ||
        !target ||
        !roomId
      ) {
        return;
      }

      /*
       * Only the caller initiates ICE restart.
       */

      if (
        callRoleRef.current !==
        "caller"
      ) {
        return;
      }

      if (
        endingCallRef.current
      ) {
        return;
      }

      if (
        pc.signalingState !==
        "stable"
      ) {
        console.log(
          "Cannot restart ICE in signaling state:",
          pc.signalingState
        );

        return;
      }

      try {
        console.log(
          "🔄 Creating ICE restart offer..."
        );

        const offer =
          await pc.createOffer({
            iceRestart: true,
          });

        await pc.setLocalDescription(
          offer
        );

        socket.emit(
          "send_webrtc_offer",
          {
            roomId,
            streamId: roomId,

            callId:
              callIdRef.current,

            offer:
              pc.localDescription,

            targetViewerId:
              target,

            targetUserId:
              target,

            to: target,

            fromUserId:
              currentUserIdRef.current,

            iceRestart: true,
          }
        );

        console.log(
          "📤 ICE restart offer sent"
        );
      } catch (error) {
        console.error(
          "ICE restart failed:",
          error
        );
      }
    }, []);


  /* ==========================================================================
     OFFER
     ========================================================================== */

  const createAndSendOffer =
    useCallback(async () => {
      const pc =
        pcRef.current;

      const socket =
        socketRef.current;

      const target =
        peerUserIdRef.current;

      const roomId =
        roomIdRef.current;

      if (
        !pc ||
        !socket ||
        !socket.connected ||
        !target ||
        !roomId
      ) {
        return;
      }

      if (
        endingCallRef.current
      ) {
        return;
      }

      if (
        offerSentRef.current
      ) {
        console.log(
          "Offer already sent. Skipping duplicate."
        );

        return;
      }

      if (
        pc.signalingState !==
        "stable"
      ) {
        console.log(
          "Peer connection is not stable:",
          pc.signalingState
        );

        return;
      }

      try {
        setCallStatus(
          "Calling user..."
        );

        const offer =
          await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });

        await pc.setLocalDescription(
          offer
        );

        offerSentRef.current =
          true;

        socket.emit(
          "send_webrtc_offer",
          {
            roomId,
            streamId: roomId,

            callId:
              callIdRef.current,

            offer:
              pc.localDescription,

            targetViewerId:
              target,

            targetUserId:
              target,

            to: target,

            fromUserId:
              currentUserIdRef.current,
          }
        );

        console.log(
          "📤 WebRTC offer sent"
        );
      } catch (error) {
        console.error(
          "Failed creating offer:",
          error
        );

        offerSentRef.current =
          false;

        setCallStatus(
          "Connection Error"
        );
      }
    }, []);


  /* ==========================================================================
     ANSWER
     ========================================================================== */

  const createAndSendAnswer =
    useCallback(
      async (offer) => {
        const pc =
          pcRef.current;

        const socket =
          socketRef.current;

        const target =
          peerUserIdRef.current;

        const roomId =
          roomIdRef.current;

        if (
          !pc ||
          !socket ||
          !socket.connected ||
          !target ||
          !roomId ||
          !offer
        ) {
          return;
        }

        if (
          endingCallRef.current
        ) {
          return;
        }

        if (
          incomingOfferProcessingRef.current
        ) {
          console.log(
            "Already processing an offer."
          );

          return;
        }

        incomingOfferProcessingRef.current =
          true;

        try {
          setCallStatus(
            "Answering call..."
          );

          /*
           * Initial offer.
           */

          if (
            pc.signalingState ===
            "stable"
          ) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(
                offer
              )
            );

            remoteDescriptionSetRef.current =
              true;

            await processIceQueue();

            const answer =
              await pc.createAnswer();

            await pc.setLocalDescription(
              answer
            );

            answerSentRef.current =
              true;

            socket.emit(
              "send_webrtc_answer",
              {
                roomId,
                streamId: roomId,

                callId:
                  callIdRef.current,

                answer:
                  pc.localDescription,

                to: target,

                targetUserId:
                  target,

                fromUserId:
                  currentUserIdRef.current,
              }
            );

            console.log(
              "📤 WebRTC answer sent"
            );

            return;
          }


          /*
           * ICE restart offer.
           *
           * When the caller sends an ICE restart,
           * the receiver may already be connected.
           */

          if (
            pc.signalingState ===
            "stable"
          ) {
            return;
          }

        } catch (error) {
          console.error(
            "Failed creating answer:",
            error
          );

          setCallStatus(
            "Connection Error"
          );
        } finally {
          incomingOfferProcessingRef.current =
            false;
        }
      },
      [processIceQueue]
    );


  /* ==========================================================================
     CLEANUP RESOURCES
     ========================================================================== */

  const cleanupResources =
    useCallback(() => {
      console.log(
        "🧹 Cleaning WebRTC resources"
      );

      stopRingbackTone();

      if (
        iceRestartTimerRef.current
      ) {
        clearTimeout(
          iceRestartTimerRef.current
        );

        iceRestartTimerRef.current =
          null;
      }

      stopAudioVisualizer();


      /* ----------------------------------------------------------------------
         Recording
         ---------------------------------------------------------------------- */

      if (
        mediaRecorderRef.current
      ) {
        try {
          if (
            mediaRecorderRef.current
              .state !==
            "inactive"
          ) {
            mediaRecorderRef.current.stop();
          }
        } catch {}

        mediaRecorderRef.current =
          null;
      }


      /* ----------------------------------------------------------------------
         Screen sharing
         ---------------------------------------------------------------------- */

      if (
        screenTrackRef.current
      ) {
        try {
          screenTrackRef.current.stop();
        } catch {}

        screenTrackRef.current =
          null;
      }


      /* ----------------------------------------------------------------------
         Peer connection
         ---------------------------------------------------------------------- */

      if (pcRef.current) {
        try {
          pcRef.current.ontrack =
            null;

          pcRef.current.onicecandidate =
            null;

          pcRef.current.onconnectionstatechange =
            null;

          pcRef.current.oniceconnectionstatechange =
            null;

          pcRef.current.onicegatheringstatechange =
            null;

          pcRef.current.onsignalingstatechange =
            null;

          pcRef.current.close();
        } catch {}

        pcRef.current =
          null;
      }


      /* ----------------------------------------------------------------------
         Local media
         ---------------------------------------------------------------------- */

      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {}
          });

        localStreamRef.current =
          null;
      }

      cameraTrackRef.current =
        null;

      microphoneTrackRef.current =
        null;


      /* ----------------------------------------------------------------------
         Remote media
         ---------------------------------------------------------------------- */

      remoteStreamRef.current =
        null;

      if (
        remoteVideoRef.current
      ) {
        remoteVideoRef.current.pause?.();
        remoteVideoRef.current.srcObject =
          null;
      }

      if (
        localVideoRef.current
      ) {
        localVideoRef.current.pause?.();
        localVideoRef.current.srcObject =
          null;
      }


      /* ----------------------------------------------------------------------
         ICE
         ---------------------------------------------------------------------- */

      iceQueueRef.current =
        [];

      offerSentRef.current =
        false;

      answerSentRef.current =
        false;

      remoteDescriptionSetRef.current =
        false;

      callConnectedRef.current =
        false;

      incomingOfferProcessingRef.current =
        false;


      /* ----------------------------------------------------------------------
         Supabase realtime
         ---------------------------------------------------------------------- */

      realtimeChannelsRef.current.forEach(
        (channel) => {
          try {
            supabase
              .removeChannel(channel)
              .catch(() => {});
          } catch {}
        }
      );

      realtimeChannelsRef.current =
        [];


      /* ----------------------------------------------------------------------
         Socket
         ---------------------------------------------------------------------- */

      if (
        socketRef.current
      ) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch {}

        socketRef.current =
          null;
      }
    }, [stopAudioVisualizer]);


  /* ==========================================================================
     END CALL
     ========================================================================== */

  const endCall =
    useCallback(
      (reason = "ended") => {
        if (
          endingCallRef.current
        ) {
          return;
        }

        endingCallRef.current =
          true;

        const socket =
          socketRef.current;

        const roomId =
          roomIdRef.current;

        const target =
          peerUserIdRef.current;

        const currentUser =
          currentUserIdRef.current;

        const payload = {
          roomId,

          streamId: roomId,

          callId:
            callIdRef.current,

          callerId:
            callRoleRef.current ===
            "caller"
              ? currentUser
              : target,

          receiverId:
            callRoleRef.current ===
            "caller"
              ? target
              : currentUser,

          fromUserId:
            currentUser,

          to: target,

          reason,
        };


        if (socket) {
          /*
           * Caller cancellation.
           */

          if (
            callRoleRef.current ===
            "caller" &&
            !callConnectedRef.current
          ) {
            socket.emit(
              "call_cancelled_by_caller",
              payload
            );

            socket.emit(
              "cancel_call_signal",
              payload
            );
          }


          /*
           * Receiver decline.
           */

          if (
            callRoleRef.current ===
              "receiver" &&
            reason ===
              "declined"
          ) {
            socket.emit(
              "decline_call",
              payload
            );
          }


          /*
           * Normal hangup.
           */

          socket.emit(
            "peer_hung_up",
            payload
          );
        }

        cleanupResources();

        setCallStatus(
          reason ===
            "declined"
            ? "Call Declined"
            : "Call Ended"
        );

        navigate(-1);
      },
      [
        cleanupResources,
        navigate,
      ]
    );


  /* ==========================================================================
     AUTH + PROFILES
     ========================================================================== */

  useEffect(() => {
    let cancelled =
      false;

    const initializeProfiles =
      async () => {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            navigate("/");
            return;
          }

          if (cancelled) {
            return;
          }

          currentUserIdRef.current =
            user.id;

          setCurrentUserId(
            user.id
          );


          /*
           * Own profile.
           *
           * Keep this explicit rather than select("*")
           * so an unrelated missing column doesn't break
           * the call page.
           */

          const {
            data: myProfile,
          } =
            await supabase
              .from("profiles")
              .select(
                "coins, balance"
              )
              .eq(
                "id",
                user.id
              )
              .maybeSingle();

          if (
            !cancelled &&
            myProfile
          ) {
            setUserCoins(
              myProfile.coins ??
                Math.round(
                  Number(
                    myProfile.balance ??
                      0
                  ) * 10
                ) ??
                1200
            );
          }


          /*
           * Validate peer.
           */

          if (
            !peerUserId ||
            peerUserId ===
              "undefined" ||
            peerUserId ===
              user.id
          ) {
            console.error(
              "Invalid peer user ID"
            );

            setCallStatus(
              "URL Configuration Error"
            );

            return;
          }


          /*
           * Peer profile.
           */

          const {
            data: profile,
            error,
          } =
            await supabase
              .from("profiles")
              .select(
                "id, username, avatar_url"
              )
              .eq(
                "id",
                peerUserId
              )
              .maybeSingle();

          if (
            !cancelled &&
            !error &&
            profile
          ) {
            setPeerProfile(
              profile
            );
          }

          if (
            error
          ) {
            console.warn(
              "Peer profile lookup failed:",
              error
            );
          }
        } catch (error) {
          console.error(
            "Profile initialization error:",
            error
          );

          if (!cancelled) {
            setCallStatus(
              "Initialization Error"
            );
          }
        }
      };

    initializeProfiles();

    return () => {
      cancelled = true;
    };
  }, [
    peerUserId,
    navigate,
  ]);


  /* ==========================================================================
     MAIN CALL ENGINE
     ========================================================================== */

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId ===
        "undefined"
    ) {
      return undefined;
    }

    mountedRef.current =
      true;

    endingCallRef.current =
      false;

    const role =
      URLRole === "caller" ||
      URLRole === "receiver"
        ? URLRole
        : currentUserId <
          peerUserId
          ? "caller"
          : "receiver";

    const roomId =
      [currentUserId, peerUserId]
        .sort()
        .join("-");

    /*
     * Ensure a call ID exists synchronously.
     */

    if (!callIdRef.current) {
      callIdRef.current =
        urlCallId ||
        crypto.randomUUID();
    }

    callRoleRef.current =
      role;

    roomIdRef.current =
      roomId;

    currentUserIdRef.current =
      currentUserId;

    peerUserIdRef.current =
      peerUserId;


    console.log(
      `📞 Call role: ${role}`
    );

    console.log(
      `🏠 Room: ${roomId}`
    );


    let localCancelled =
      false;


    const initializeCall =
      async () => {
        try {
          /* ------------------------------------------------------------------
             1. CAMERA + MICROPHONE
             ------------------------------------------------------------------ */

          setCallStatus(
            "Accessing devices..."
          );

          const stream =
            await getLocalMedia();

          if (
            localCancelled ||
            !mountedRef.current
          ) {
            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            return;
          }

          attachLocalStream(
            stream
          );

          await setupAudioVisualizer(
            stream
          );


          /* ------------------------------------------------------------------
             2. PEER CONNECTION
             ------------------------------------------------------------------ */

          createPeerConnection();


          /* ------------------------------------------------------------------
             3. SOCKET
             ------------------------------------------------------------------ */

          const socket =
            io(
              SOCKET_SERVER_URL,
              {
                autoConnect: false,

                transports: [
                  "websocket",
                  "polling",
                ],

                reconnection: true,

                reconnectionAttempts:
                  Infinity,

                reconnectionDelay: 1000,

                reconnectionDelayMax:
                  5000,

                timeout: 20000,
              }
            );

          socketRef.current =
            socket;


          /* ------------------------------------------------------------------
             SOCKET CONNECT
             ------------------------------------------------------------------ */

          socket.on(
            "connect",
            async () => {
              if (
                !mountedRef.current ||
                localCancelled
              ) {
                return;
              }

              console.log(
                "🟢 Socket connected:",
                socket.id
              );


              socket.emit(
                "register_user_session",
                {
                  userId:
                    currentUserId,
                }
              );


              socket.emit(
                "join_call_room",
                {
                  roomId,

                  userId:
                    currentUserId,

                  targetPeerId:
                    peerUserId,

                  callId:
                    callIdRef.current,

                  role,
                }
              );


              /* --------------------------------------------------------------
                 CALLER
                 -------------------------------------------------------------- */

              if (
                role === "caller"
              ) {
                setCallStatus(
                  "Calling user..."
                );

                const {
                  data: myProfile,
                } =
                  await supabase
                    .from("profiles")
                    .select(
                      "username, avatar_url"
                    )
                    .eq(
                      "id",
                      currentUserId
                    )
                    .maybeSingle();

                const callSignalData = {
                  callId:
                    callIdRef.current,

                  receiverId:
                    peerUserId,

                  targetUserId:
                    peerUserId,

                  to:
                    peerUserId,

                  callerId:
                    currentUserId,

                  fromUserId:
                    currentUserId,

                  callerName:
                    myProfile?.username ||
                    "User",

                  callerUsername:
                    myProfile?.username ||
                    "User",

                  callerAvatar:
                    myProfile?.avatar_url ||
                    null,

                  callType:
                    "video",

                  roomId,

                  role:
                    "receiver",
                };


                /*
                 * ONE primary incoming-call event.
                 *
                 * Your Render backend should:
                 *
                 * ONLINE:
                 *     Socket.IO
                 *
                 * OFFLINE/BACKGROUND:
                 *     FCM/Web Push
                 */

                socket.emit(
                  "initiate_call_signal",
                  callSignalData
                );


                /*
                 * Supabase realtime fallback.
                 *
                 * This is NOT a replacement for FCM.
                 * It only works while the receiving client
                 * is already subscribed.
                 */

                try {
                  const channel =
                    supabase.channel(
                      `user-call-signals-${peerUserId}`
                    );

                  realtimeChannelsRef.current.push(
                    channel
                  );

                  channel.subscribe(
                    async (status) => {
                      if (
                        status ===
                        "SUBSCRIBED"
                      ) {
                        await channel.send(
                          {
                            type:
                              "broadcast",

                            event:
                              "incoming_call_broadcast",

                            payload:
                              callSignalData,
                          }
                        );
                      }
                    }
                  );
                } catch (error) {
                  console.warn(
                    "Realtime call fallback failed:",
                    error
                  );
                }


                /*
                 * DO NOT create an offer here.
                 *
                 * Wait for peer_ready.
                 */
              }


              /* --------------------------------------------------------------
                 RECEIVER
                 -------------------------------------------------------------- */

              if (
                role === "receiver"
              ) {
                setCallStatus(
                  "Awaiting Connection..."
                );

                socket.emit(
                  "peer_ready",
                  {
                    roomId,

                    userId:
                      currentUserId,

                    targetPeerId:
                      peerUserId,

                    callId:
                      callIdRef.current,
                  }
                );
              }
            }
          );


          /* ------------------------------------------------------------------
             SOCKET RECONNECT
             ------------------------------------------------------------------ */

          socket.on(
            "reconnect",
            () => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              console.log(
                "🔄 Socket reconnected"
              );

              socket.emit(
                "register_user_session",
                {
                  userId:
                    currentUserId,
                }
              );

              socket.emit(
                "join_call_room",
                {
                  roomId,

                  userId:
                    currentUserId,

                  targetPeerId:
                    peerUserId,

                  callId:
                    callIdRef.current,

                  role,
                }
              );

              if (
                role ===
                "receiver"
              ) {
                socket.emit(
                  "peer_ready",
                  {
                    roomId,

                    userId:
                      currentUserId,

                    targetPeerId:
                      peerUserId,

                    callId:
                      callIdRef.current,
                  }
                );
              }
            }
          );


          /* ------------------------------------------------------------------
             PEER READY
             ------------------------------------------------------------------ */

          socket.on(
            "peer_ready",
            async (data) => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              console.log(
                "⚡ Peer ready:",
                data
              );

              if (
                role === "caller"
              ) {
                await createAndSendOffer();
              }
            }
          );


          /* ------------------------------------------------------------------
             OFFER
             ------------------------------------------------------------------ */

          socket.on(
            "webrtc_offer_received",
            async (data) => {
              if (
                !mountedRef.current ||
                role !==
                  "receiver"
              ) {
                return;
              }

              if (
                !data?.offer
              ) {
                return;
              }

              console.log(
                "📥 WebRTC offer received"
              );

              await createAndSendAnswer(
                data.offer
              );
            }
          );


          /* ------------------------------------------------------------------
             ANSWER
             ------------------------------------------------------------------ */

          socket.on(
            "webrtc_answer_received",
            async (data) => {
              if (
                !mountedRef.current ||
                !data?.answer
              ) {
                return;
              }

              const pc =
                pcRef.current;

              if (!pc) {
                return;
              }

              /*
               * Normal answer.
               */

              if (
                pc.signalingState !==
                "have-local-offer"
              ) {
                console.warn(
                  "Ignoring answer in state:",
                  pc.signalingState
                );

                return;
              }

              try {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(
                    data.answer
                  )
                );

                remoteDescriptionSetRef.current =
                  true;

                await processIceQueue();

                console.log(
                  "✅ Remote answer applied"
                );
              } catch (error) {
                console.error(
                  "Failed applying answer:",
                  error
                );
              }
            }
          );


          /* ------------------------------------------------------------------
             ICE CANDIDATE
             ------------------------------------------------------------------ */

          socket.on(
            "incoming_ice_candidate",
            async (data) => {
              if (
                !mountedRef.current ||
                !data?.candidate
              ) {
                return;
              }

              const pc =
                pcRef.current;

              if (!pc) {
                return;
              }

              if (
                !pc.remoteDescription
              ) {
                iceQueueRef.current.push(
                  data.candidate
                );

                return;
              }

              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(
                    data.candidate
                  )
                );
              } catch (error) {
                console.warn(
                  "Failed ICE candidate:",
                  error
                );
              }
            }
          );


          /* ------------------------------------------------------------------
             PEER HUNG UP
             ------------------------------------------------------------------ */

          socket.on(
            "peer_hung_up",
            (data) => {
              if (
                data?.callId &&
                data.callId !==
                  callIdRef.current
              ) {
                return;
              }

              console.log(
                "📴 Peer hung up:",
                data
              );

              if (
                endingCallRef.current
              ) {
                return;
              }

              endingCallRef.current =
                true;

              cleanupResources();

              setCallStatus(
                "Call Ended"
              );

              navigate(-1);
            }
          );


          /* ------------------------------------------------------------------
             CALL CANCELLED
             ------------------------------------------------------------------ */

          socket.on(
            "call_cancelled",
            (data) => {
              if (
                data?.callId &&
                data.callId !==
                  callIdRef.current
              ) {
                return;
              }

              if (
                endingCallRef.current
              ) {
                return;
              }

              console.log(
                "📵 Caller cancelled call"
              );

              endingCallRef.current =
                true;

              cleanupResources();

              setCallStatus(
                "Call Cancelled"
              );

              navigate(-1);
            }
          );


          socket.on(
            "call_cancelled_by_caller",
            (data) => {
              if (
                data?.callId &&
                data.callId !==
                  callIdRef.current
              ) {
                return;
              }

              if (
                endingCallRef.current
              ) {
                return;
              }

              console.log(
                "📵 Caller cancelled call"
              );

              endingCallRef.current =
                true;

              cleanupResources();

              setCallStatus(
                "Call Cancelled"
              );

              navigate(-1);
            }
          );


          /* ------------------------------------------------------------------
             CALL DECLINED
             ------------------------------------------------------------------ */

          socket.on(
            "call_declined",
            (data) => {
              if (
                data?.callId &&
                data.callId !==
                  callIdRef.current
              ) {
                return;
              }

              if (
                endingCallRef.current
              ) {
                return;
              }

              console.log(
                "📵 Call declined"
              );

              endingCallRef.current =
                true;

              cleanupResources();

              setCallStatus(
                "Call Declined"
              );

              navigate(-1);
            }
          );


          /* ------------------------------------------------------------------
             CALL EXPIRED
             ------------------------------------------------------------------ */

          socket.on(
            "call_expired",
            (data) => {
              if (
                data?.callId &&
                data.callId !==
                  callIdRef.current
              ) {
                return;
              }

              if (
                endingCallRef.current
              ) {
                return;
              }

              console.log(
                "⌛ Call expired"
              );

              endingCallRef.current =
                true;

              cleanupResources();

              setCallStatus(
                "Missed Call"
              );

              navigate(-1);
            }
          );


          /* ------------------------------------------------------------------
             CHAT
             ------------------------------------------------------------------ */

          socket.on(
            "in_call_text_message",
            (data) => {
              if (!data) {
                return;
              }

              setInCallMessages(
                (previous) => [
                  ...previous,
                  data,
                ]
              );
            }
          );


          /* ------------------------------------------------------------------
             REACTIONS
             ------------------------------------------------------------------ */

          socket.on(
            "in_call_reaction_burst",
            (data) => {
              if (!data) {
                return;
              }

              const reactionId =
                Date.now() +
                Math.random();

              setFloatingReactions(
                (previous) => [
                  ...previous,

                  {
                    id:
                      reactionId,

                    emoji:
                      data.emoji,

                    senderName:
                      data.senderName ||
                      "Peer",
                  },
                ]
              );
            }
          );


          /* ------------------------------------------------------------------
             GIFTS
             ------------------------------------------------------------------ */

          socket.on(
            "in_call_luxury_gift",
            (gift) => {
              if (!gift) {
                return;
              }

              setActiveGiftAnimation(
                gift
              );

              try {
                confetti({
                  particleCount: 60,
                  spread: 70,
                  origin: {
                    y: 0.6,
                  },
                });
              } catch {}

              setTimeout(() => {
                setActiveGiftAnimation(
                  null
                );
              }, 3500);
            }
          );


          /* ------------------------------------------------------------------
             SOCKET ERROR
             ------------------------------------------------------------------ */

          socket.on(
            "connect_error",
            (error) => {
              console.error(
                "Socket connection error:",
                error
              );

              if (
                mountedRef.current
              ) {
                setCallStatus(
                  "Signaling Connection Error"
                );
              }
            }
          );


          /*
           * Connect only after ALL listeners have been registered.
           */

          socket.connect();

        } catch (error) {
          console.error(
            "Call initialization failed:",
            error
          );

          if (
            mountedRef.current
          ) {
            setCallStatus(
              "Hardware Error"
            );
          }
        }
      };


    initializeCall();


    /*
     * IMPORTANT:
     *
     * React cleanup ONLY releases resources.
     *
     * It does NOT:
     * - emit peer_hung_up
     * - emit call_cancelled
     * - navigate
     *
     * This prevents React rerenders from killing active calls.
     */

    return () => {
      localCancelled = true;

      mountedRef.current =
        false;

      cleanupResources();
    };
  }, [
    currentUserId,
    peerUserId,
    URLRole,
    getLocalMedia,
    attachLocalStream,
    setupAudioVisualizer,
    createPeerConnection,
    createAndSendOffer,
    createAndSendAnswer,
    processIceQueue,
    cleanupResources,
    navigate,
  ]);


  /* ==========================================================================
     REPLACE VIDEO TRACK
     ========================================================================== */

  const replaceVideoTrack =
    useCallback(
      async (newTrack) => {
        const pc =
          pcRef.current;

        if (
          !pc ||
          !newTrack
        ) {
          return false;
        }

        const sender =
          pc
            .getSenders()
            .find(
              (item) =>
                item.track?.kind ===
                "video"
            );

        if (!sender) {
          console.warn(
            "No video sender found"
          );

          return false;
        }

        await sender.replaceTrack(
          newTrack
        );

        return true;
      },
      []
    );


  /* ==========================================================================
     FLIP CAMERA
     ========================================================================== */

  const handleFlipCamera =
    async () => {
      const nextMode =
        facingModeRef.current ===
        "user"
          ? "environment"
          : "user";

      try {
        const newStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  nextMode,

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },

              audio: false,
            }
          );

        const newTrack =
          newStream.getVideoTracks()[0];

        if (!newTrack) {
          return;
        }

        await replaceVideoTrack(
          newTrack
        );

        const localStream =
          localStreamRef.current;

        if (!localStream) {
          newTrack.stop();
          return;
        }

        const oldTrack =
          cameraTrackRef.current;

        if (oldTrack) {
          try {
            localStream.removeTrack(
              oldTrack
            );

            oldTrack.stop();
          } catch {}
        }

        localStream.addTrack(
          newTrack
        );

        cameraTrackRef.current =
          newTrack;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            localStream;

          localVideoRef.current
            .play()
            .catch(() => {});
        }

        setFacingMode(
          nextMode
        );

        facingModeRef.current =
          nextMode;
      } catch (error) {
        console.warn(
          "Camera flip failed:",
          error
        );
      }
    };


  /* ==========================================================================
     SWITCH CAMERA DEVICE
     ========================================================================== */

  const handleSwitchCamera =
    async (deviceId) => {
      if (!deviceId) {
        return;
      }

      try {
        const newStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                deviceId: {
                  exact: deviceId,
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },

              audio: false,
            }
          );

        const newTrack =
          newStream.getVideoTracks()[0];

        if (!newTrack) {
          return;
        }

        await replaceVideoTrack(
          newTrack
        );

        const localStream =
          localStreamRef.current;

        if (!localStream) {
          newTrack.stop();
          return;
        }

        const oldTrack =
          cameraTrackRef.current;

        if (oldTrack) {
          try {
            localStream.removeTrack(
              oldTrack
            );

            oldTrack.stop();
          } catch {}
        }

        localStream.addTrack(
          newTrack
        );

        cameraTrackRef.current =
          newTrack;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            localStream;

          localVideoRef.current
            .play()
            .catch(() => {});
        }

        setActiveVideoDeviceId(
          deviceId
        );
      } catch (error) {
        console.warn(
          "Camera device switch failed:",
          error
        );
      }
    };


  /* ==========================================================================
     SWITCH MICROPHONE
     ========================================================================== */

  const handleSwitchMicrophone =
    async (deviceId) => {
      if (!deviceId) {
        return;
      }

      try {
        const newStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: false,

              audio: {
                deviceId: {
                  exact: deviceId,
                },

                echoCancellation:
                  true,

                noiseSuppression:
                  noiseSuppressionRef.current,

                autoGainControl:
                  true,
              },
            }
          );

        const newTrack =
          newStream.getAudioTracks()[0];

        if (!newTrack) {
          return;
        }

        const pc =
          pcRef.current;

        if (pc) {
          const sender =
            pc
              .getSenders()
              .find(
                (item) =>
                  item.track?.kind ===
                  "audio"
              );

          if (sender) {
            await sender.replaceTrack(
              newTrack
            );
          }
        }

        const localStream =
          localStreamRef.current;

        if (!localStream) {
          newTrack.stop();
          return;
        }

        const oldTrack =
          microphoneTrackRef.current;

        if (oldTrack) {
          try {
            localStream.removeTrack(
              oldTrack
            );

            oldTrack.stop();
          } catch {}
        }

        localStream.addTrack(
          newTrack
        );

        microphoneTrackRef.current =
          newTrack;

        setActiveAudioDeviceId(
          deviceId
        );

        await setupAudioVisualizer(
          localStream
        );
      } catch (error) {
        console.warn(
          "Microphone switch failed:",
          error
        );
      }
    };


  /* ==========================================================================
     NOISE SUPPRESSION
     ========================================================================== */

  useEffect(() => {
    const track =
      microphoneTrackRef.current;

    if (!track) {
      return;
    }

    track
      .applyConstraints({
        noiseSuppression:
          noiseSuppression,
      })
      .catch((error) => {
        console.warn(
          "Noise suppression constraint failed:",
          error
        );
      });
  }, [noiseSuppression]);


  /* ==========================================================================
     SCREEN SHARING
     ========================================================================== */

  const stopScreenSharing =
    useCallback(async () => {
      const cameraTrack =
        cameraTrackRef.current;

      if (cameraTrack) {
        try {
          await replaceVideoTrack(
            cameraTrack
          );
        } catch (error) {
          console.warn(
            "Failed restoring camera:",
            error
          );
        }
      }

      if (
        screenTrackRef.current
      ) {
        try {
          screenTrackRef.current.onended =
            null;

          screenTrackRef.current.stop();
        } catch {}

        screenTrackRef.current =
          null;
      }

      setIsScreenSharing(
        false
      );

      if (
        localVideoRef.current &&
        localStreamRef.current
      ) {
        localVideoRef.current.srcObject =
          localStreamRef.current;

        localVideoRef.current
          .play()
          .catch(() => {});
      }
    }, [replaceVideoTrack]);


  const toggleScreenShare =
    async () => {
      const pc =
        pcRef.current;

      if (!pc) {
        return;
      }

      try {
        if (
          isScreenSharing
        ) {
          await stopScreenSharing();
          return;
        }

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: {
                cursor: "always",
              },

              audio: false,
            }
          );

        const screenTrack =
          screenStream.getVideoTracks()[0];

        if (!screenTrack) {
          return;
        }

        await replaceVideoTrack(
          screenTrack
        );

        screenTrackRef.current =
          screenTrack;

        screenTrack.onended =
          () => {
            stopScreenSharing();
          };

        setIsScreenSharing(
          true
        );

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            screenStream;

          localVideoRef.current
            .play()
            .catch(() => {});
        }
      } catch (error) {
        console.warn(
          "Screen sharing cancelled or failed:",
          error
        );
      }
    };


  /* ==========================================================================
     SNAPSHOT
     ========================================================================== */

  const handleTakeSnapshot =
    () => {
      setIsFlashActive(true);

      setTimeout(() => {
        setIsFlashActive(false);
      }, 250);

      const video =
        remoteVideoRef.current;

      if (
        !video ||
        !video.videoWidth
      ) {
        return;
      }

      try {
        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (!ctx) {
          return;
        }

        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.font =
          "bold 16px monospace";

        ctx.fillStyle =
          "#06b6d4";

        ctx.fillText(
          `MPADE UNIVERSE HD • ${new Date().toLocaleTimeString()}`,
          24,
          canvas.height - 24
        );

        const link =
          document.createElement(
            "a"
          );

        link.download =
          `universe-call-snapshot-${Date.now()}.png`;

        link.href =
          canvas.toDataURL(
            "image/png"
          );

        link.click();

        setSnapshotToast(
          true
        );

        setTimeout(() => {
          setSnapshotToast(
            false
          );
        }, 3000);
      } catch (error) {
        console.warn(
          "Snapshot failed:",
          error
        );
      }
    };


  /* ==========================================================================
     RECORDING
     ========================================================================== */

  const toggleCallRecording =
    () => {
      if (isRecording) {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current
            .state !==
            "inactive"
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }

        setIsRecording(
          false
        );

        return;
      }

      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        alert(
          "Recording is not supported by this browser."
        );

        return;
      }

      try {
        recordedChunksRef.current =
          [];

        let mimeType =
          "video/webm;codecs=vp8,opus";

        if (
          !MediaRecorder.isTypeSupported(
            mimeType
          )
        ) {
          mimeType =
            "video/webm";
        }

        const recorder =
          new MediaRecorder(
            stream,
            {
              mimeType,
            }
          );

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable =
          (event) => {
            if (
              event.data &&
              event.data.size >
                0
            ) {
              recordedChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onerror =
          (event) => {
            console.warn(
              "MediaRecorder error:",
              event
            );
          };

        recorder.onstop =
          () => {
            if (
              !recordedChunksRef
                .current
                .length
            ) {
              return;
            }

            const blob =
              new Blob(
                recordedChunksRef.current,
                {
                  type: mimeType,
                }
              );

            const url =
              URL.createObjectURL(
                blob
              );

            const link =
              document.createElement(
                "a"
              );

            link.href =
              url;

            link.download =
              `universe-call-recording-${Date.now()}.webm`;

            document.body.appendChild(
              link
            );

            link.click();

            link.remove();

            setTimeout(() => {
              URL.revokeObjectURL(
                url
              );
            }, 1000);
          };

        recorder.start(1000);

        setIsRecording(
          true
        );
      } catch (error) {
        console.warn(
          "Recording failed:",
          error
        );
      }
    };


  /* ==========================================================================
     PICTURE IN PICTURE
     ========================================================================== */

  const togglePictureInPicture =
    async () => {
      const video =
        remoteVideoRef.current;

      if (!video) {
        return;
      }

      try {
        if (
          document.pictureInPictureElement
        ) {
          await document.exitPictureInPicture();

          setIsPiPActive(
            false
          );

          return;
        }

        if (
          document.pictureInPictureEnabled &&
          typeof video.requestPictureInPicture ===
            "function"
        ) {
          await video.requestPictureInPicture();

          setIsPiPActive(
            true
          );
        }
      } catch (error) {
        console.warn(
          "PiP failed:",
          error
        );
      }
    };


  useEffect(() => {
    const video =
      remoteVideoRef.current;

    if (!video) {
      return undefined;
    }

    const handleLeave =
      () => {
        setIsPiPActive(false);
      };

    video.addEventListener(
      "leavepictureinpicture",
      handleLeave
    );

    return () => {
      video.removeEventListener(
        "leavepictureinpicture",
        handleLeave
      );
    };
  }, [callStatus]);


  /* ==========================================================================
     GIFTS
     ========================================================================== */

  const handleSendGift =
    (gift) => {
      if (!gift) {
        return;
      }

      if (
        userCoins <
        Number(gift.price || 0)
      ) {
        alert(
          "Insufficient coins! Top up your balance to send this gift."
        );

        return;
      }

      setUserCoins(
        (previous) =>
          Math.max(
            0,
            previous -
              Number(
                gift.price || 0
              )
          )
      );

      setActiveGiftAnimation(
        gift
      );

      setTimeout(() => {
        setActiveGiftAnimation(
          null
        );
      }, 3500);

      socketRef.current?.emit(
        "in_call_luxury_gift",
        {
          roomId:
            roomIdRef.current,

          callId:
            callIdRef.current,

          gift,
        }
      );
    };


  /* ==========================================================================
     CHAT
     ========================================================================== */

  const sendInCallMessage =
    (event) => {
      event?.preventDefault();

      const text =
        chatInput.trim();

      if (!text) {
        return;
      }

      const message = {
        id:
          crypto.randomUUID(),

        senderId:
          currentUserId,

        text,

        time:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      };

      setInCallMessages(
        (previous) => [
          ...previous,
          message,
        ]
      );

      socketRef.current?.emit(
        "in_call_text_message",
        {
          roomId:
            roomIdRef.current,

          ...message,
        }
      );

      setChatInput("");
    };


  /* ==========================================================================
     REACTIONS
     ========================================================================== */

  const sendReactionBurst =
    (emoji) => {
      if (!emoji) {
        return;
      }

      const reactionId =
        crypto.randomUUID();

      setFloatingReactions(
        (previous) => [
          ...previous,

          {
            id:
              reactionId,

            emoji,

            senderName:
              "You",
          },
        ]
      );

      socketRef.current?.emit(
        "in_call_reaction_burst",
        {
          roomId:
            roomIdRef.current,

          callId:
            callIdRef.current,

          emoji,

          senderId:
            currentUserId,

          senderName:
            "User",
        }
      );
    };


  /* ==========================================================================
     REACTION REALTIME FALLBACK
     ========================================================================== */

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId ===
        "undefined"
    ) {
      return undefined;
    }

    const roomId =
      [currentUserId, peerUserId]
        .sort()
        .join("-");

    const channel =
      supabase.channel(
        `call-reactions-${roomId}`
      );

    channel.on(
      "broadcast",
      {
        event:
          "reaction_burst_event",
      },
      ({ payload }) => {
        if (
          !payload ||
          payload.senderId ===
            currentUserId
        ) {
          return;
        }

        setFloatingReactions(
          (previous) => [
            ...previous,

            {
              id:
                payload.id ||
                crypto.randomUUID(),

              emoji:
                payload.emoji,

              senderName:
                payload.senderName ||
                "Peer",
            },
          ]
        );
      }
    );

    channel.subscribe();

    return () => {
      supabase
        .removeChannel(channel)
        .catch(() => {});
    };
  }, [
    currentUserId,
    peerUserId,
  ]);


  /* ==========================================================================
     MUTE
     ========================================================================== */

  useEffect(() => {
    const track =
      microphoneTrackRef.current;

    if (track) {
      track.enabled =
        !isMuted;
    }
  }, [isMuted]);


  /* ==========================================================================
     VIDEO
     ========================================================================== */

  useEffect(() => {
    const track =
      cameraTrackRef.current;

    if (track) {
      track.enabled =
        !isVideoOff;
    }
  }, [isVideoOff]);


  /* ==========================================================================
     FORMAT TIME
     ========================================================================== */

  const formatTime =
    (seconds) => {
      const mins =
        Math.floor(
          seconds / 60
        );

      const secs =
        seconds % 60;

      return `${mins
        .toString()
        .padStart(
          2,
          "0"
        )}:${secs
        .toString()
        .padStart(
          2,
          "0"
        )}`;
    };


  /* ==========================================================================
     STYLES
     ========================================================================== */

  const currentFilterStyle =
    VIDEO_FILTERS.find(
      (filter) =>
        filter.id ===
        activeFilter
    )?.filter ||
    "none";

  const filterBeautyCombined =
    beautyGlow
      ? `${currentFilterStyle} brightness(1.06) saturate(1.1)`
      : currentFilterStyle;

  const currentBackdropClass =
    VIRTUAL_BACKDROPS.find(
      (backdrop) =>
        backdrop.id ===
        activeBackdrop
    )?.bg || "";


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div
      className={`fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-5 font-sans select-none overflow-hidden ${currentBackdropClass}`}
    >

      {/* =====================================================================
          FLASH
          ===================================================================== */}

      <AnimatePresence>
        {isFlashActive && (
          <motion.div
            initial={{
              opacity: 1,
            }}
            animate={{
              opacity: 0,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.3,
            }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>


      {/* =====================================================================
          SNAPSHOT TOAST
          ===================================================================== */}

      <AnimatePresence>
        {snapshotToast && (
          <motion.div
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            className="fixed top-20 z-50 bg-cyan-500 text-black font-black text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Check size={14} />

            HD Call Snapshot Saved
            to Device!
          </motion.div>
        )}
      </AnimatePresence>


      {/* =====================================================================
          GIFT ANIMATION
          ===================================================================== */}

      <AnimatePresence>
        {activeGiftAnimation && (
          <motion.div
            initial={{
              scale: 0.2,
              opacity: 0,
              y: 50,
            }}
            animate={{
              scale: [
                0.2,
                1.4,
                1.2,
                1,
              ],
              opacity: 1,
              y: 0,
            }}
            exit={{
              scale: 1.6,
              opacity: 0,
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
            className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center"
          >
            <div className="text-7xl sm:text-9xl drop-shadow-[0_0_40px_rgba(236,72,153,0.9)] animate-bounce">
              {
                activeGiftAnimation.icon
              }
            </div>

            <div className="mt-4 bg-black/80 backdrop-blur-xl border border-pink-500/40 px-6 py-2 rounded-full text-center shadow-2xl">
              <p className="text-sm font-black text-pink-400 uppercase tracking-widest">
                {
                  activeGiftAnimation.name
                }
              </p>

              <p className="text-[10px] text-amber-300 font-mono">
                +
                {
                  activeGiftAnimation.price
                }{" "}
                Coins
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* =====================================================================
          HEADER
          ===================================================================== */}

      <div className="w-full max-w-xl flex justify-between items-center bg-zinc-900/80 px-3.5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl z-30 shadow-2xl">

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() =>
              setShowTelemetry(
                (previous) =>
                  !previous
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5"
          >
            <Shield
              size={13}
              className="text-cyan-400"
            />

            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              HD • SECURE
            </span>

            <Activity
              size={12}
              className="text-emerald-400 ml-0.5 animate-pulse"
            />
          </button>


          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-400 px-2.5 py-1 rounded-xl text-[10px] font-mono font-black animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />

              REC{" "}
              {formatTime(
                recordingDuration
              )}
            </div>
          )}
        </div>


        <div className="flex items-center gap-1.5">

          {callStatus ===
            "Connected" && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              {formatTime(
                callDuration
              )}
            </span>
          )}


          <button
            type="button"
            onClick={() => {
              const modes = [
                "focus",
                "split",
                "theater",
              ];

              const index =
                modes.indexOf(
                  layoutMode
                );

              setLayoutMode(
                modes[
                  (index + 1) %
                    modes.length
                ]
              );
            }}
            className={`p-1.5 rounded-xl ${
              layoutMode !==
              "focus"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-white/5 text-zinc-300"
            }`}
          >
            <LayoutGrid
              size={15}
            />
          </button>


          <button
            type="button"
            onClick={() =>
              setShowNotes(
                (previous) =>
                  !previous
              )
            }
            className={`p-1.5 rounded-xl ${
              showNotes
                ? "bg-cyan-500/20 text-cyan-300"
                : "bg-white/5 text-zinc-300"
            }`}
          >
            <FileText
              size={15}
            />
          </button>


          <button
            type="button"
            onClick={() =>
              setShowDeviceSettings(
                (previous) =>
                  !previous
              )
            }
            className="p-1.5 rounded-xl bg-white/5 text-zinc-300"
          >
            <Settings
              size={15}
            />
          </button>
        </div>
      </div>


      {/* =====================================================================
          MAIN STAGE
          ===================================================================== */}

      <div className="flex-1 flex flex-col items-center justify-center my-3 relative w-full max-w-xl rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">

        {layoutMode ===
        "split" ? (
          <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-1 p-1 bg-black">

            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/10">

              <video
                ref={
                  remoteVideoRef
                }
                autoPlay
                playsInline
                style={{
                  filter:
                    filterBeautyCombined,
                }}
                className="w-full h-full object-cover"
              />

              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-zinc-300">
                @
                {
                  peerProfile?.username ||
                  "Peer"
                }
              </div>
            </div>


            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/10">

              <video
                ref={
                  localVideoRef
                }
                autoPlay
                muted
                playsInline
                style={{
                  filter:
                    filterBeautyCombined,
                }}
                className={`w-full h-full object-cover ${
                  isVideoOff
                    ? "hidden"
                    : ""
                }`}
              />

              {isVideoOff && (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <VideoOff
                    size={20}
                  />

                  <p className="text-[10px] font-bold uppercase">
                    You (Cam Off)
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">

            <video
              ref={
                remoteVideoRef
              }
              autoPlay
              playsInline
              style={{
                filter:
                  filterBeautyCombined,
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />


            <motion.div
              drag
              dragConstraints={{
                left: -150,
                right: 10,
                top: -250,
                bottom: 10,
              }}
              className={`absolute bottom-4 right-4 w-28 h-40 bg-black/75 border-2 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl cursor-pointer ${
                micAudioLevel >
                20
                  ? "border-cyan-400"
                  : "border-white/20"
              }`}
            >

              <video
                ref={
                  localVideoRef
                }
                autoPlay
                muted
                playsInline
                style={{
                  filter:
                    filterBeautyCombined,
                }}
                className={`w-full h-full object-cover ${
                  isVideoOff
                    ? "hidden"
                    : ""
                }`}
              />

              {isVideoOff && (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <VideoOff
                    size={18}
                  />

                  <p className="text-[9px] font-bold uppercase">
                    Cam Off
                  </p>
                </div>
              )}

              <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-zinc-300">
                You
              </div>
            </motion.div>
          </div>
        )}


        {/* ===================================================================
            CONNECTING OVERLAY
            =================================================================== */}

        {callStatus !==
          "Connected" && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">

            <div className="relative">

              <div className="absolute -inset-4 rounded-full bg-cyan-500/20 animate-ping" />

              <div className="absolute -inset-8 rounded-full bg-cyan-500/10 animate-pulse" />

              {peerProfile?.avatar_url ? (
                <img
                  src={
                    peerProfile.avatar_url
                  }
                  alt="Peer"
                  className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/50 relative z-10"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center relative z-10">
                  <Video
                    size={36}
                    className="text-cyan-400"
                  />
                </div>
              )}
            </div>


            <div className="text-center z-10">

              <h2 className="text-xl font-black">
                @
                {
                  peerProfile?.username ||
                  "User"
                }
              </h2>

              <p className="text-xs text-cyan-400 font-mono mt-1 animate-pulse">
                {callStatus}
              </p>
            </div>
          </div>
        )}


        {/* ===================================================================
            QUICK CONTROLS
            =================================================================== */}

        {callStatus ===
          "Connected" && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/15">

            <button
              type="button"
              onClick={
                handleTakeSnapshot
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-cyan-300"
              title="Snapshot"
            >
              <Camera
                size={15}
              />
            </button>


            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (previous) =>
                    !previous
                )
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-pink-300"
              title="Filters"
            >
              <Wand2
                size={15}
              />
            </button>


            <button
              type="button"
              onClick={() =>
                setShowWhiteboard(
                  (previous) =>
                    !previous
                )
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-amber-300"
              title="Whiteboard"
            >
              <Radio
                size={15}
              />
            </button>


            <button
              type="button"
              onClick={() =>
                setShowGifts(
                  (previous) =>
                    !previous
                )
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-rose-300"
              title="Gifts"
            >
              <Gift
                size={15}
              />
            </button>


            <button
              type="button"
              onClick={() =>
                setShowCaptions(
                  (previous) =>
                    !previous
                )
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-zinc-300"
              title="Captions"
            >
              <Subtitles
                size={15}
              />
            </button>


            <button
              type="button"
              onClick={
                togglePictureInPicture
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-zinc-300"
              title="Picture in Picture"
            >
              <Activity
                size={15}
              />
            </button>
          </div>
        )}


        {/* ===================================================================
            PREMIUM COMPONENTS
            =================================================================== */}

        <VideoCallCaptions
          isEnabled={
            showCaptions
          }
          onClose={() =>
            setShowCaptions(
              false
            )
          }
        />


        <VideoCallWhiteboard
          isOpen={
            showWhiteboard
          }
          onClose={() =>
            setShowWhiteboard(
              false
            )
          }
        />


        <VideoCallFilters
          isOpen={
            showFilters
          }
          onClose={() =>
            setShowFilters(
              false
            )
          }
          activeFilter={
            activeFilter
          }
          onSelectFilter={
            setActiveFilter
          }
          activeBackdrop={
            activeBackdrop
          }
          onSelectBackdrop={
            setActiveBackdrop
          }
          beautyGlow={
            beautyGlow
          }
          onToggleBeautyGlow={() =>
            setBeautyGlow(
              (previous) =>
                !previous
            )
          }
        />


        <VideoCallGifts
          isOpen={
            showGifts
          }
          onClose={() =>
            setShowGifts(
              false
            )
          }
          onSendGift={
            handleSendGift
          }
          userCoins={
            userCoins
          }
        />


        <VideoCallDeviceSettings
          isOpen={
            showDeviceSettings
          }
          onClose={() =>
            setShowDeviceSettings(
              false
            )
          }
          activeVideoDeviceId={
            activeVideoDeviceId
          }
          activeAudioDeviceId={
            activeAudioDeviceId
          }
          onSwitchCamera={
            handleSwitchCamera
          }
          onSwitchMicrophone={
            handleSwitchMicrophone
          }
          noiseSuppression={
            noiseSuppression
          }
          onToggleNoiseSuppression={() =>
            setNoiseSuppression(
              (previous) =>
                !previous
            )
          }
          facingMode={
            facingMode
          }
          onFlipCamera={
            handleFlipCamera
          }
        />


        <VideoCallNotes
          isOpen={
            showNotes
          }
          onClose={() =>
            setShowNotes(
              false
            )
          }
          peerName={
            peerProfile?.username ||
            "User"
          }
        />


        <VideoCallTelemetry
          isOpen={
            showTelemetry
          }
          onClose={() =>
            setShowTelemetry(
              false
            )
          }
          pc={
            pcRef.current
          }
          callStatus={
            callStatus
          }
        />


        {/* ===================================================================
            REACTIONS
            =================================================================== */}

        {callStatus ===
          "Connected" && (
          <FloatingReactionsOverlay
            onTriggerReaction={
              sendReactionBurst
            }
            externalReactions={
              floatingReactions
            }
            peerName={
              peerProfile?.username ||
              "Peer"
            }
            soundEnabled={
              true
            }
          />
        )}


        {/* ===================================================================
            CHAT
            =================================================================== */}

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{
                y: 200,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 200,
                opacity: 0,
              }}
              className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl"
            >

              <div className="flex justify-between items-center border-b border-white/10 pb-2">

                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MessageSquare
                    size={14}
                  />

                  In-Call Chat
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setShowChat(
                      false
                    )
                  }
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>


              <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 text-xs">

                {inCallMessages.length ===
                0 ? (
                  <p className="text-center text-zinc-600 italic py-6">
                    No chat messages
                    yet.
                  </p>
                ) : (
                  inCallMessages.map(
                    (message) => {
                      const isMe =
                        message.senderId ===
                        currentUserId;

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`flex flex-col ${
                            isMe
                              ? "items-end"
                              : "items-start"
                          }`}
                        >

                          <div
                            className={`px-3 py-1.5 rounded-xl max-w-[80%] ${
                              isMe
                                ? "bg-cyan-500 text-black"
                                : "bg-zinc-800 text-white"
                            }`}
                          >
                            {
                              message.text
                            }
                          </div>

                          <span className="text-[8px] text-zinc-500 mt-0.5">
                            {
                              message.time
                            }
                          </span>
                        </div>
                      );
                    }
                  )
                )}
              </div>


              <form
                onSubmit={
                  sendInCallMessage
                }
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={
                    chatInput
                  }
                  onChange={(event) =>
                    setChatInput(
                      event.target.value
                    )
                  }
                  placeholder="Send a quick text..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="submit"
                  className="p-2 bg-cyan-500 text-black rounded-xl"
                >
                  <Send
                    size={14}
                  />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* =====================================================================
          BOTTOM CONTROLS
          ===================================================================== */}

      <div className="w-full max-w-xl flex items-center justify-around bg-zinc-900/90 border border-white/10 px-3.5 py-2.5 rounded-3xl backdrop-blur-xl shadow-2xl z-30">

        {/* Microphone */}

        <button
          type="button"
          onClick={() =>
            setIsMuted(
              (previous) =>
                !previous
            )
          }
          title={
            isMuted
              ? "Unmute"
              : "Mute"
          }
          className={`p-3 rounded-2xl ${
            isMuted
              ? "bg-red-500 text-white"
              : "bg-white/5 text-zinc-200"
          }`}
        >
          {isMuted ? (
            <MicOff
              size={18}
            />
          ) : (
            <Mic
              size={18}
            />
          )}
        </button>


        {/* Camera */}

        <button
          type="button"
          onClick={() =>
            setIsVideoOff(
              (previous) =>
                !previous
            )
          }
          title={
            isVideoOff
              ? "Turn Camera On"
              : "Turn Camera Off"
          }
          className={`p-3 rounded-2xl ${
            isVideoOff
              ? "bg-red-500 text-white"
              : "bg-white/5 text-zinc-200"
          }`}
        >
          {isVideoOff ? (
            <VideoOff
              size={18}
            />
          ) : (
            <Video
              size={18}
            />
          )}
        </button>


        {/* Screen share */}

        <button
          type="button"
          onClick={
            toggleScreenShare
          }
          title={
            isScreenSharing
              ? "Stop Screen Sharing"
              : "Share Screen"
          }
          className={`p-3 rounded-2xl ${
            isScreenSharing
              ? "bg-cyan-500 text-black"
              : "bg-white/5 text-zinc-200"
          }`}
        >
          <Monitor
            size={18}
          />
        </button>


        {/* Recording */}

        <button
          type="button"
          onClick={
            toggleCallRecording
          }
          title={
            isRecording
              ? "Stop Recording"
              : "Record Call"
          }
          className={`p-3 rounded-2xl ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white/5 text-zinc-200"
          }`}
        >
          <Disc
            size={18}
          />
        </button>


        {/* Chat */}

        <button
          type="button"
          onClick={() =>
            setShowChat(
              (previous) =>
                !previous
            )
          }
          title="Chat"
          className={`p-3 rounded-2xl ${
            showChat
              ? "bg-cyan-500 text-black"
              : "bg-white/5 text-zinc-200"
          }`}
        >
          <MessageSquare
            size={18}
          />
        </button>


        {/* Hangup */}

        <button
          type="button"
          onClick={() =>
            endCall(
              "ended"
            )
          }
          title="End Call"
          className="p-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-xl shadow-red-600/40"
        >
          <PhoneOff
            size={20}
          />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
