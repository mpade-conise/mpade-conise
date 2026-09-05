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


const SOCKET_SERVER_URL =
  "https://mpade-backend.onrender.com";


/*
|--------------------------------------------------------------------------
| WebRTC configuration
|--------------------------------------------------------------------------
|
| DO NOT put permanent TURN credentials in production.
|
| The values below are intentionally STUN-only.
|
| Recommended production flow:
|
| React
|   ↓
| Render /api/turn-credentials
|   ↓
| temporary TURN credentials
|   ↓
| RTCPeerConnection
|
*/

const DEFAULT_ICE_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
  ],

  iceCandidatePoolSize: 10,
};


/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const VideoCall = () => {
  const [searchParams] =
    useSearchParams();

  const navigate = useNavigate();


  /*
  |--------------------------------------------------------------------------
  | URL
  |--------------------------------------------------------------------------
  */

  const peerUserId =
    searchParams.get("userId");

  const URLRole =
    searchParams.get("role");

  const urlCallId =
    searchParams.get("callId");


  /*
  |--------------------------------------------------------------------------
  | Core state
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Premium features
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Refs
  |--------------------------------------------------------------------------
  */

  const socketRef =
    useRef(null);

  const pcRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const screenTrackRef =
    useRef(null);

  const remoteStreamRef =
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

  const peerUserIdRef =
    useRef(peerUserId);

  const currentUserIdRef =
    useRef(null);

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


  /*
  |--------------------------------------------------------------------------
  | Keep refs synchronized
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    peerUserIdRef.current =
      peerUserId;
  }, [peerUserId]);


  /*
  |--------------------------------------------------------------------------
  | Call ID
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (urlCallId) {
      callIdRef.current =
        urlCallId;
    } else if (!callIdRef.current) {
      callIdRef.current =
        crypto.randomUUID();
    }
  }, [urlCallId]);


  /*
  |--------------------------------------------------------------------------
  | Audio visualizer
  |--------------------------------------------------------------------------
  */

  const stopAudioVisualizer =
    useCallback(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(
          animFrameRef.current
        );

        animFrameRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current
          .close()
          .catch(() => {});

        audioContextRef.current = null;
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

            analyserRef.current
              .getByteFrequencyData(
                dataArray
              );

            let sum = 0;

            for (
              let i = 0;
              i < dataArray.length;
              i++
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


  /*
  |--------------------------------------------------------------------------
  | Call timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (callStatus !== "Connected") {
      setCallDuration(0);
      return;
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


  /*
  |--------------------------------------------------------------------------
  | Recording timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
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


  /*
  |--------------------------------------------------------------------------
  | Ringback
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const ringingStates = [
      "initializing",
      "calling",
      "connecting",
      "awaiting connection",
      "accessing devices",
    ];

    const status =
      callStatus.toLowerCase();

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


  /*
  |--------------------------------------------------------------------------
  | Process queued ICE
  |--------------------------------------------------------------------------
  */

  const processIceQueue =
    useCallback(async () => {
      const pc =
        pcRef.current;

      if (!pc) {
        return;
      }

      if (
        !pc.remoteDescription
      ) {
        return;
      }

      const queue =
        [...iceQueueRef.current];

      iceQueueRef.current =
        [];

      for (const candidate of queue) {
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


  /*
  |--------------------------------------------------------------------------
  | Attach local stream
  |--------------------------------------------------------------------------
  */

  const attachLocalStream =
    useCallback((stream) => {
      localStreamRef.current =
        stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          stream;

        localVideoRef.current
          .play()
          .catch(() => {});
      }
    }, []);


  /*
  |--------------------------------------------------------------------------
  | Get media
  |--------------------------------------------------------------------------
  */

  const getLocalMedia =
    useCallback(
      async () => {
        const constraints = {
          video: {
            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },

            facingMode,
          },

          audio: {
            echoCancellation: true,
            noiseSuppression,
            autoGainControl: true,
          },
        };

        const stream =
          await navigator.mediaDevices.getUserMedia(
            constraints
          );

        return stream;
      },
      [facingMode, noiseSuppression]
    );


  /*
  |--------------------------------------------------------------------------
  | Create peer connection
  |--------------------------------------------------------------------------
  */

  const createPeerConnection =
    useCallback(() => {
      if (pcRef.current) {
        return pcRef.current;
      }

      const pc =
        new RTCPeerConnection(
          DEFAULT_ICE_CONFIG
        );

      pcRef.current =
        pc;

      const localStream =
        localStreamRef.current;

      if (localStream) {
        localStream
          .getTracks()
          .forEach((track) => {
            pc.addTrack(
              track,
              localStream
            );
          });
      }

      pc.ontrack =
        (event) => {
          console.log(
            "🎬 Remote track received"
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

            stream.addTrack(
              event.track
            );
          } else {
            remoteStreamRef.current =
              stream;
          }

          if (
            remoteVideoRef.current
          ) {
            remoteVideoRef.current.srcObject =
              stream;

            remoteVideoRef.current
              .play()
              .catch((error) => {
                console.warn(
                  "Remote media autoplay blocked:",
                  error
                );
              });
          }

          callConnectedRef.current =
            true;

          setCallStatus(
            "Connected"
          );

          stopRingbackTone();
        };


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
            }
          );
        };


      pc.onconnectionstatechange =
        () => {
          console.log(
            "WebRTC connection state:",
            pc.connectionState
          );

          if (
            pc.connectionState ===
            "connected"
          ) {
            callConnectedRef.current =
              true;

            setCallStatus(
              "Connected"
            );

            stopRingbackTone();
          }

          if (
            pc.connectionState ===
              "failed" ||
            pc.connectionState ===
              "disconnected"
          ) {
            console.warn(
              "WebRTC connection unstable:",
              pc.connectionState
            );
          }

          if (
            pc.connectionState ===
            "closed"
          ) {
            callConnectedRef.current =
              false;
          }
        };


      pc.oniceconnectionstatechange =
        () => {
          console.log(
            "ICE state:",
            pc.iceConnectionState
          );

          if (
            pc.iceConnectionState ===
            "failed"
          ) {
            console.warn(
              "ICE connection failed"
            );
          }
        };


      pc.onicegatheringstatechange =
        () => {
          console.log(
            "ICE gathering:",
            pc.iceGatheringState
          );
        };


      pc.onsignalingstatechange =
        () => {
          console.log(
            "Signaling state:",
            pc.signalingState
          );
        };


      return pc;
    }, []);


  /*
  |--------------------------------------------------------------------------
  | Create offer
  |--------------------------------------------------------------------------
  */

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
          "Peer connection not stable:",
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

            offer,

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


  /*
  |--------------------------------------------------------------------------
  | Send answer
  |--------------------------------------------------------------------------
  */

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
          !target ||
          !roomId
        ) {
          return;
        }

        if (
          answerSentRef.current
        ) {
          return;
        }

        try {
          setCallStatus(
            "Answering call..."
          );

          if (
            pc.signalingState !==
            "stable"
          ) {
            console.warn(
              "Cannot accept offer in state:",
              pc.signalingState
            );

            return;
          }

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

              answer,

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
        } catch (error) {
          console.error(
            "Failed creating answer:",
            error
          );

          setCallStatus(
            "Connection Error"
          );
        }
      },
      [processIceQueue]
    );


  /*
  |--------------------------------------------------------------------------
  | Cleanup resources ONLY
  |--------------------------------------------------------------------------
  */

  const cleanupResources =
    useCallback(() => {
      console.log(
        "🧹 Cleaning call resources"
      );

      stopRingbackTone();

      stopAudioVisualizer();


      if (
        screenTrackRef.current
      ) {
        try {
          screenTrackRef.current.stop();
        } catch {}

        screenTrackRef.current =
          null;
      }


      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }

      mediaRecorderRef.current =
        null;


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


      if (
        remoteVideoRef.current
      ) {
        remoteVideoRef.current.srcObject =
          null;
      }

      if (
        localVideoRef.current
      ) {
        localVideoRef.current.srcObject =
          null;
      }


      if (pcRef.current) {
        try {
          pcRef.current.ontrack =
            null;

          pcRef.current.onicecandidate =
            null;

          pcRef.current.onconnectionstatechange =
            null;

          pcRef.current.close();
        } catch {}

        pcRef.current =
          null;
      }


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


      realtimeChannelsRef.current.forEach(
        (channel) => {
          supabase
            .removeChannel(channel)
            .catch(() => {});
        }
      );

      realtimeChannelsRef.current =
        [];


      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch {}

        socketRef.current =
          null;
      }
    }, [stopAudioVisualizer]);


  /*
  |--------------------------------------------------------------------------
  | Real hangup
  |--------------------------------------------------------------------------
  */

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
           * Only the caller cancels the call as caller.
           */
          if (
            callRoleRef.current ===
            "caller"
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
           * Receiver explicitly declines.
           */
          if (
            callRoleRef.current ===
              "receiver" &&
            reason === "declined"
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
          reason === "declined"
            ? "Call Declined"
            : "Call Ended"
        );

        navigate(-1);
      },
      [cleanupResources, navigate]
    );


  /*
  |--------------------------------------------------------------------------
  | Authentication + profiles
  |--------------------------------------------------------------------------
  */

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
           * Own profile
           */
          const {
            data: myProfile,
          } =
            await supabase
              .from("profiles")
              .select(
                "coins, balance"
              )
              .eq("id", user.id)
              .maybeSingle();

          if (
            !cancelled &&
            myProfile
          ) {
            setUserCoins(
              myProfile.coins ||
                Math.round(
                  Number(
                    myProfile.balance ||
                      0
                  ) * 10
                ) ||
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
              .select("*")
              .eq(
                "id",
                peerUserId
              )
              .single();

          if (
            !cancelled &&
            !error &&
            profile
          ) {
            setPeerProfile(
              profile
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
  }, [peerUserId, navigate]);


  /*
  |--------------------------------------------------------------------------
  | MAIN CALL ENGINE
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | This effect does NOT depend on facingMode or noiseSuppression.
  |
  | Changing camera settings must NOT recreate WebRTC.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId ===
        "undefined"
    ) {
      return;
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
          /*
           * ---------------------------------------------------------------
           * 1. Get microphone + camera
           * ---------------------------------------------------------------
           */

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
              .forEach((track) =>
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


          /*
           * ---------------------------------------------------------------
           * 2. Create PeerConnection
           * ---------------------------------------------------------------
           */

          createPeerConnection();


          /*
           * ---------------------------------------------------------------
           * 3. Create Socket.IO
           * ---------------------------------------------------------------
           */

          const socket =
            io(
              SOCKET_SERVER_URL,
              {
                transports: [
                  "websocket",
                  "polling",
                ],

                reconnection: true,

                reconnectionAttempts:
                  Infinity,

                reconnectionDelay: 1000,

                timeout: 20000,
              }
            );

          socketRef.current =
            socket;


          /*
           * ---------------------------------------------------------------
           * Socket connect
           * ---------------------------------------------------------------
           */

          socket.on(
            "connect",
            async () => {
              if (
                !mountedRef.current
              ) {
                return;
              }

              console.log(
                "🟢 Socket connected:",
                socket.id
              );


              /*
               * Register this user's session.
               */
              socket.emit(
                "register_user_session",
                {
                  userId:
                    currentUserId,
                }
              );


              /*
               * Join WebRTC room.
               */
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


              /*
               * ---------------------------------------------------------
               * CALLER
               * ---------------------------------------------------------
               */

              if (
                role === "caller"
              ) {
                setCallStatus(
                  "Calling user..."
                );


                /*
                 * Load caller profile.
                 */
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

                  role: "receiver",
                };


                /*
                 * IMPORTANT:
                 *
                 * Only ONE primary event.
                 *
                 * Do NOT emit incoming_call,
                 * incoming_call_signal and
                 * initiate_call_signal three times.
                 *
                 * Render should receive this and decide:
                 *
                 * ONLINE  → Socket.IO
                 * OFFLINE → FCM
                 */

                socket.emit(
                  "initiate_call_signal",
                  callSignalData
                );


                /*
                 * Supabase fallback.
                 *
                 * This is optional and only for your
                 * existing realtime fallback.
                 */

                try {
                  const realtimeChannel =
                    supabase.channel(
                      `user-call-signals-${peerUserId}`
                    );

                  realtimeChannelsRef.current.push(
                    realtimeChannel
                  );

                  realtimeChannel.subscribe(
                    async (status) => {
                      if (
                        status ===
                        "SUBSCRIBED"
                      ) {
                        await realtimeChannel.send(
                          {
                            type: "broadcast",

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
                 * IMPORTANT:
                 *
                 * Do NOT create offer yet.
                 *
                 * Wait for peer_ready.
                 */
              }


              /*
               * ---------------------------------------------------------
               * RECEIVER
               * ---------------------------------------------------------
               */

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
            });


          /*
           * ---------------------------------------------------------------
           * Reconnect
           * ---------------------------------------------------------------
           */

          socket.on(
            "reconnect",
            () => {
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
                role === "receiver"
              ) {
                socket.emit(
                  "peer_ready",
                  {
                    roomId,

                    userId:
                      currentUserId,

                    callId:
                      callIdRef.current,
                  }
                );
              }
            }
          );


          /*
           * ---------------------------------------------------------------
           * Peer ready
           * ---------------------------------------------------------------
           */

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


          /*
           * ---------------------------------------------------------------
           * Offer
           * ---------------------------------------------------------------
           */

          socket.on(
            "webrtc_offer_received",
            async (data) => {
              if (
                !mountedRef.current ||
                role !== "receiver"
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


          /*
           * ---------------------------------------------------------------
           * Answer
           * ---------------------------------------------------------------
           */

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


          /*
           * ---------------------------------------------------------------
           * ICE candidate
           * ---------------------------------------------------------------
           */

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

              if (
                !pc ||
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


          /*
           * ---------------------------------------------------------------
           * Peer hung up
           * ---------------------------------------------------------------
           */

          socket.on(
            "peer_hung_up",
            (data) => {
              console.log(
                "📴 Peer hung up:",
                data
              );

              if (
                !mountedRef.current
              ) {
                return;
              }

              cleanupResources();

              setCallStatus(
                "Call Ended"
              );

              navigate(-1);
            }
          );


          /*
           * ---------------------------------------------------------------
           * Caller cancelled
           * ---------------------------------------------------------------
           */

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

              console.log(
                "📵 Caller cancelled call"
              );

              cleanupResources();

              setCallStatus(
                "Call Cancelled"
              );

              navigate(-1);
            }
          );


          /*
           * ---------------------------------------------------------------
           * Call declined
           * ---------------------------------------------------------------
           */

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

              console.log(
                "📵 Call declined"
              );

              cleanupResources();

              setCallStatus(
                "Call Declined"
              );

              navigate(-1);
            }
          );


          /*
           * ---------------------------------------------------------------
           * Call expired
           * ---------------------------------------------------------------
           */

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

              console.log(
                "⌛ Call expired"
              );

              cleanupResources();

              setCallStatus(
                "Missed Call"
              );

              navigate(-1);
            }
          );


          /*
           * ---------------------------------------------------------------
           * In-call chat
           * ---------------------------------------------------------------
           */

          socket.on(
            "in_call_text_message",
            (data) => {
              setInCallMessages(
                (previous) => [
                  ...previous,
                  data,
                ]
              );
            }
          );


          /*
           * ---------------------------------------------------------------
           * Reactions
           * ---------------------------------------------------------------
           */

          socket.on(
            "in_call_reaction_burst",
            (data) => {
              const reactionId =
                Date.now() +
                Math.random();

              setFloatingReactions(
                (previous) => [
                  ...previous,

                  {
                    id: reactionId,

                    emoji:
                      data.emoji,

                    senderName:
                      data.senderName ||
                      peerProfile?.username ||
                      "Peer",
                  },
                ]
              );
            }
          );


          /*
           * ---------------------------------------------------------------
           * Gifts
           * ---------------------------------------------------------------
           */

          socket.on(
            "in_call_luxury_gift",
            (gift) => {
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


          /*
           * ---------------------------------------------------------------
           * Socket error
           * ---------------------------------------------------------------
           */

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
     * ---------------------------------------------------------------
     * Effect cleanup
     *
     * IMPORTANT:
     *
     * This does NOT send call cancellation.
     *
     * React cleanup ≠ user pressing Hang Up.
     * ---------------------------------------------------------------
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
    attachLocalStream,
    createPeerConnection,
    createAndSendAnswer,
    createAndSendOffer,
    cleanupResources,
    getLocalMedia,
    navigate,
    processIceQueue,
    setupAudioVisualizer,
  ]);


  /*
  |--------------------------------------------------------------------------
  | Camera switching
  |--------------------------------------------------------------------------
  */

  const replaceVideoTrack =
    useCallback(
      async (newTrack) => {
        const pc =
          pcRef.current;

        if (!pc || !newTrack) {
          return;
        }

        const sender =
          pc.getSenders().find(
            (item) =>
              item.track?.kind ===
              "video"
          );

        if (sender) {
          await sender.replaceTrack(
            newTrack
          );
        }
      },
      []
    );


  const handleFlipCamera =
    async () => {
      const nextMode =
        facingMode ===
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

        const newVideoTrack =
          newStream.getVideoTracks()[0];

        await replaceVideoTrack(
          newVideoTrack
        );

        const oldVideoTrack =
          localStreamRef.current?.getVideoTracks()[0];

        if (oldVideoTrack) {
          oldVideoTrack.stop();

          localStreamRef.current.removeTrack(
            oldVideoTrack
          );
        }

        localStreamRef.current?.addTrack(
          newVideoTrack
        );

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            localStreamRef.current;
        }

        setFacingMode(
          nextMode
        );
      } catch (error) {
        console.warn(
          "Camera flip failed:",
          error
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Camera device
  |--------------------------------------------------------------------------
  */

  const handleSwitchCamera =
    async (deviceId) => {
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

        await replaceVideoTrack(
          newTrack
        );

        const oldTrack =
          localStreamRef.current?.getVideoTracks()[0];

        if (oldTrack) {
          oldTrack.stop();

          localStreamRef.current.removeTrack(
            oldTrack
          );
        }

        localStreamRef.current?.addTrack(
          newTrack
        );

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            localStreamRef.current;
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


  /*
  |--------------------------------------------------------------------------
  | Microphone device
  |--------------------------------------------------------------------------
  */

  const handleSwitchMicrophone =
    async (deviceId) => {
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
                  noiseSuppression,

                autoGainControl:
                  true,
              },
            }
          );

        const newAudioTrack =
          newStream.getAudioTracks()[0];

        const pc =
          pcRef.current;

        if (pc) {
          const sender =
            pc.getSenders().find(
              (item) =>
                item.track?.kind ===
                "audio"
            );

          if (sender) {
            await sender.replaceTrack(
              newAudioTrack
            );
          }
        }

        const oldAudioTrack =
          localStreamRef.current?.getAudioTracks()[0];

        if (oldAudioTrack) {
          oldAudioTrack.stop();

          localStreamRef.current.removeTrack(
            oldAudioTrack
          );
        }

        localStreamRef.current?.addTrack(
          newAudioTrack
        );

        setActiveAudioDeviceId(
          deviceId
        );

        await setupAudioVisualizer(
          localStreamRef.current
        );
      } catch (error) {
        console.warn(
          "Microphone switch failed:",
          error
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Screen sharing
  |--------------------------------------------------------------------------
  */

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
          const cameraTrack =
            localStreamRef.current?.getVideoTracks()[0];

          if (cameraTrack) {
            await replaceVideoTrack(
              cameraTrack
            );
          }

          if (
            screenTrackRef.current
          ) {
            screenTrackRef.current.stop();

            screenTrackRef.current =
              null;
          }

          setIsScreenSharing(
            false
          );

          return;
        }


        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
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
          async () => {
            const cameraTrack =
              localStreamRef.current?.getVideoTracks()[0];

            if (cameraTrack) {
              await replaceVideoTrack(
                cameraTrack
              );
            }

            screenTrackRef.current =
              null;

            setIsScreenSharing(
              false
            );
          };

        setIsScreenSharing(
          true
        );
      } catch (error) {
        console.warn(
          "Screen sharing cancelled:",
          error
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Snapshot
  |--------------------------------------------------------------------------
  */

  const handleTakeSnapshot =
    () => {
      setIsFlashActive(true);

      setTimeout(() => {
        setIsFlashActive(false);
      }, 250);

      const video =
        remoteVideoRef.current ||
        localVideoRef.current;

      if (!video) {
        return;
      }

      try {
        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          video.videoWidth ||
          1280;

        canvas.height =
          video.videoHeight ||
          720;

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


  /*
  |--------------------------------------------------------------------------
  | Recording
  |--------------------------------------------------------------------------
  */

  const toggleCallRecording =
    () => {
      if (isRecording) {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current
            .state !==
            "inactive"
        ) {
          mediaRecorderRef.current.stop();
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
              event.data.size >
              0
            ) {
              recordedChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          () => {
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

            link.click();

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


  /*
  |--------------------------------------------------------------------------
  | Picture in picture
  |--------------------------------------------------------------------------
  */

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
          document.pictureInPictureEnabled
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


  /*
  |--------------------------------------------------------------------------
  | Gift
  |--------------------------------------------------------------------------
  */

  const handleSendGift =
    (gift) => {
      if (
        userCoins <
        gift.price
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
              gift.price
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

      const roomId =
        roomIdRef.current;

      socketRef.current?.emit(
        "in_call_luxury_gift",
        {
          roomId,
          callId:
            callIdRef.current,
          gift,
        }
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Chat
  |--------------------------------------------------------------------------
  */

  const sendInCallMessage =
    (event) => {
      event?.preventDefault();

      if (
        !chatInput.trim()
      ) {
        return;
      }

      const message = {
        id:
          crypto.randomUUID(),

        senderId:
          currentUserId,

        text:
          chatInput.trim(),

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


  /*
  |--------------------------------------------------------------------------
  | Reactions
  |--------------------------------------------------------------------------
  */

  const sendReactionBurst =
    (emoji) => {
      const reactionId =
        crypto.randomUUID();

      const senderName =
        peerProfile?.username ||
        "User";

      setFloatingReactions(
        (previous) => [
          ...previous,

          {
            id: reactionId,
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

          senderName,
        }
      );
    };


  /*
  |--------------------------------------------------------------------------
  | Reaction realtime fallback
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId ===
        "undefined"
    ) {
      return;
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
                peerProfile?.username ||
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
    peerProfile,
  ]);


  /*
  |--------------------------------------------------------------------------
  | Mute synchronization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled =
          !isMuted;
      });
  }, [isMuted]);


  /*
  |--------------------------------------------------------------------------
  | Video synchronization
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled =
          !isVideoOff;
      });
  }, [isVideoOff]);


  /*
  |--------------------------------------------------------------------------
  | Format time
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Styles
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className={`fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-3 sm:p-5 font-sans select-none overflow-hidden ${currentBackdropClass}`}
    >

      {/* Flash */}
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


      {/* Snapshot toast */}
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


      {/* Gift animation */}
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
              {activeGiftAnimation.icon}
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


      {/* Header */}
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
              HD • E2EE
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


      {/* Main stage */}
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


        {/* Connecting overlay */}
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


        {/* Quick controls */}
        {callStatus ===
          "Connected" && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/15">

            <button
              type="button"
              onClick={
                handleTakeSnapshot
              }
              className="p-1.5 hover:bg-white/20 rounded-xl text-cyan-300"
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
            >
              <Subtitles
                size={15}
              />
            </button>
          </div>
        )}


        {/* Premium components */}

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


        {/* Floating reactions */}
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


        {/* Chat */}
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


      {/* Bottom controls */}
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
