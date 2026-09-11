import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { io } from 'socket.io-client';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Shield, Monitor, MessageSquare, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startRingbackTone, stopRingbackTone } from '../utils/callNotificationEngine';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "28087eceaa61e6de7d551200",
      credential: "KW6Vsm7ZTUwjjDWn"
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require"
};

const VideoCall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const peerUserId = searchParams.get('userId');
  const URLRole = searchParams.get('role');

  const [currentUserId, setCurrentUserId] = useState(null);
  const [peerProfile, setPeerProfile] = useState(null);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingReactions, setFloatingReactions] = useState([]);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);

  const iceQueueRef = useRef([]);
  const realtimeChannelsRef = useRef([]);

  const cleanupRef = useRef(null);

  const isCleaningUpRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasNavigatedRef = useRef(false);

  const callInitializedRef = useRef(false);
  const callEndedRef = useRef(false);

  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);

  const remoteOfferHandledRef = useRef(false);
  const remoteAnswerHandledRef = useRef(false);

  const incomingCallSentRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let timer = null;

    if (callStatus === "Connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    const statusLower = callStatus.toLowerCase();

    if (
      statusLower.includes("calling") ||
      statusLower.includes("connecting") ||
      statusLower.includes("initializing") ||
      statusLower.includes("accessing")
    ) {
      startRingbackTone();
    } else {
      stopRingbackTone();
    }

    return () => stopRingbackTone();
  }, [callStatus]);

  const processIceQueue = async () => {
    const pc = pcRef.current;

    if (
      !pc ||
      pc.signalingState === "closed" ||
      !pc.remoteDescription ||
      iceQueueRef.current.length === 0
    ) {
      return;
    }

    const candidates = [...iceQueueRef.current];
    iceQueueRef.current = [];

    for (const candidate of candidates) {
      try {
        if (
          pc.signalingState !== "closed" &&
          pc.remoteDescription
        ) {
          await pc.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (error) {
        console.warn(
          "Error processing queued ICE candidate:",
          error
        );
      }
    }
  };

  const removeRealtimeChannels = async () => {
    const channels = [...realtimeChannelsRef.current];
    realtimeChannelsRef.current = [];

    for (const channel of channels) {
      try {
        await supabase.removeChannel(channel);
      } catch (error) {
        console.warn(
          "Failed removing realtime call channel:",
          error
        );
      }
    }
  };

  const performCleanup = async (
    shouldNotifyPeer = true,
    shouldNavigate = true
  ) => {
    if (isCleaningUpRef.current) {
      return;
    }

    isCleaningUpRef.current = true;
    callEndedRef.current = true;

    stopRingbackTone();

    const socket = socketRef.current;
    const pc = pcRef.current;
    const localStream = localStreamRef.current;
    const screenTrack = screenTrackRef.current;

    const hasValidPeer = Boolean(
      currentUserId &&
      peerUserId &&
      peerUserId !== "undefined"
    );

    const roomId = hasValidPeer
      ? [currentUserId, peerUserId].sort().join("-")
      : null;

    if (
      shouldNotifyPeer &&
      socket?.connected &&
      hasValidPeer &&
      roomId
    ) {
      try {
        socket.emit("peer_hung_up", {
          roomId,
          to: peerUserId,
          callerId: currentUserId,
          receiverId: peerUserId
        });
      } catch (error) {
        console.warn(
          "Failed sending hangup signal:",
          error
        );
      }
    }

    if (screenTrack) {
      try {
        screenTrack.onended = null;
        screenTrack.stop();
      } catch (error) {
        console.warn(
          "Failed stopping screen track:",
          error
        );
      }

      screenTrackRef.current = null;
    }

    if (localStream) {
      try {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (error) {
        console.warn(
          "Failed stopping local media tracks:",
          error
        );
      }

      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.onsignalingstatechange = null;
        pc.close();
      } catch (error) {
        console.warn(
          "Failed closing peer connection:",
          error
        );
      }

      pcRef.current = null;
    }

    iceQueueRef.current = [];

    if (socket) {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch (error) {
        console.warn(
          "Failed closing signaling socket:",
          error
        );
      }

      socketRef.current = null;
    }

    await removeRealtimeChannels();

    offerSentRef.current = false;
    answerSentRef.current = false;
    remoteOfferHandledRef.current = false;
    remoteAnswerHandledRef.current = false;
    incomingCallSentRef.current = false;

    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setFloatingReactions([]);
    setCallDuration(0);

    if (
      shouldNavigate &&
      !hasNavigatedRef.current &&
      isMountedRef.current
    ) {
      hasNavigatedRef.current = true;
      navigate(-1);
    }
  };

  cleanupRef.current = performCleanup;

  useEffect(() => {
    let cancelled = false;

    const initProfiles = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        if (cancelled || !isMountedRef.current) {
          return;
        }

        setCurrentUserId(user.id);

        if (
          !peerUserId ||
          peerUserId === "undefined" ||
          peerUserId === user.id
        ) {
          console.error(
            "Invalid peer user ID:",
            peerUserId
          );

          setCallStatus("Invalid Call");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", peerUserId)
          .single();

        if (
          !cancelled &&
          !error &&
          data &&
          isMountedRef.current
        ) {
          setPeerProfile(data);
        }
      } catch (error) {
        console.error(
          "Failed initializing call profile:",
          error
        );

        if (!cancelled && isMountedRef.current) {
          setCallStatus("Profile Error");
        }
      }
    };

    initProfiles();

    return () => {
      cancelled = true;
    };
  }, [peerUserId, navigate]);

  useEffect(() => {
    if (
      !currentUserId ||
      !peerUserId ||
      peerUserId === "undefined" ||
      peerUserId === currentUserId
    ) {
      return;
    }

    let isComponentMounted = true;

    const callRole =
      URLRole === "caller" || URLRole === "receiver"
        ? URLRole
        : currentUserId < peerUserId
          ? "caller"
          : "receiver";

    const roomId = [currentUserId, peerUserId]
      .sort()
      .join("-");

    console.log(
      `Setting up signaling as [${callRole}] for Room: ${roomId}`
    );

    const createAndSendOffer = async () => {
      const pc = pcRef.current;
      const socket = socketRef.current;

      if (
        offerSentRef.current ||
        callEndedRef.current ||
        !isComponentMounted ||
        !pc ||
        !socket ||
        !socket.connected ||
        pc.signalingState === "closed"
      ) {
        return;
      }

      if (pc.signalingState !== "stable") {
        console.log(
          "Offer skipped because signaling state is:",
          pc.signalingState
        );
        return;
      }

      try {
        offerSentRef.current = true;

        setCallStatus("Calling user...");

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        if (
          !isComponentMounted ||
          callEndedRef.current ||
          pc.signalingState === "closed"
        ) {
          offerSentRef.current = false;
          return;
        }

        await pc.setLocalDescription(offer);

        if (
          !isComponentMounted ||
          callEndedRef.current ||
          !socket.connected
        ) {
          return;
        }

        socket.emit("send_webrtc_offer", {
          roomId,
          streamId: roomId,
          offer,
          targetViewerId: peerUserId,
          to: peerUserId
        });

        console.log(
          "WebRTC offer sent once:",
          roomId
        );
      } catch (error) {
        offerSentRef.current = false;

        console.error(
          "Failed creating signaling offer:",
          error
        );
      }
    };

    const initializeMediaAndSignaling = async () => {
      if (
        callInitializedRef.current ||
        callEndedRef.current ||
        !isComponentMounted
      ) {
        return;
      }

      callInitializedRef.current = true;

      try {
        setCallStatus("Accessing devices...");

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: {
                ideal: 1280,
                max: 1280
              },
              height: {
                ideal: 720,
                max: 720
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
          !isComponentMounted ||
          callEndedRef.current
        ) {
          stream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(
          GLOBAL_ICE_CONFIG
        );

        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (
            !isComponentMounted ||
            callEndedRef.current
          ) {
            return;
          }

          const remoteStream =
            event.streams?.[0];

          if (
            remoteStream &&
            remoteVideoRef.current
          ) {
            remoteVideoRef.current.srcObject =
              remoteStream;

            const playPromise =
              remoteVideoRef.current.play();

            if (playPromise?.catch) {
              playPromise.catch((error) => {
                console.warn(
                  "Remote video autoplay was blocked:",
                  error
                );
              });
            }
          }

          setCallStatus("Connected");
        };

        pc.onicecandidate = (event) => {
          if (
            event.candidate &&
            socketRef.current?.connected &&
            isComponentMounted &&
            !callEndedRef.current
          ) {
            socketRef.current.emit(
              "webrtc_ice_candidate",
              {
                roomId,
                streamId: roomId,
                candidate: event.candidate,
                to: peerUserId
              }
            );
          }
        };

        pc.onconnectionstatechange = () => {
          if (
            !isComponentMounted ||
            callEndedRef.current
          ) {
            return;
          }

          const state = pc.connectionState;

          console.log(
            "WebRTC connection state:",
            state
          );

          if (state === "connected") {
            setCallStatus("Connected");
          } else if (state === "connecting") {
            setCallStatus("Connecting...");
          } else if (state === "disconnected") {
            setCallStatus("Reconnecting...");
          } else if (state === "failed") {
            setCallStatus("Connection Failed");
          } else if (state === "closed") {
            setCallStatus("Call Ended");
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (
            !isComponentMounted ||
            callEndedRef.current
          ) {
            return;
          }

          console.log(
            "ICE connection state:",
            pc.iceConnectionState
          );

          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            setCallStatus("Connected");
          }

          if (
            pc.iceConnectionState === "failed"
          ) {
            setCallStatus(
              "Connection Failed"
            );
          }
        };

        const socket = io(
          SOCKET_SERVER_URL,
          {
            transports: ["websocket", "polling"],
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            timeout: 8000
          }
        );

        socketRef.current = socket;

        socket.on("connect", async () => {
          if (
            !isComponentMounted ||
            callEndedRef.current
          ) {
            return;
          }

          console.log(
            `Connected to signaling server. Socket ID: ${socket.id} | Room: ${roomId}`
          );

          socket.emit(
            "register_user_session",
            {
              userId: currentUserId
            }
          );

          socket.emit(
            "join_call_room",
            {
              roomId,
              userId: currentUserId,
              targetPeerId: peerUserId
            }
          );

          if (callRole === "caller") {
            setCallStatus("Calling user...");

            if (!incomingCallSentRef.current) {
              incomingCallSentRef.current = true;

              const { data: myProfile } =
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

              if (
                !isComponentMounted ||
                callEndedRef.current
              ) {
                return;
              }

              const callSignalData = {
                receiverId: peerUserId,
                to: peerUserId,
                targetUserId: peerUserId,
                callerId: currentUserId,
                fromUserId: currentUserId,
                callerName:
                  myProfile?.username ||
                  "User",
                callerUsername:
                  myProfile?.username ||
                  "User",
                callerAvatar:
                  myProfile?.avatar_url ||
                  null,
                callType: "video",
                roomId
              };

              socket.emit(
                "incoming_call",
                callSignalData
              );

              console.log(
                "Incoming call notification sent once."
              );
            }
          } else {
            setCallStatus(
              "Awaiting Connection..."
            );

            socket.emit(
              "peer_ready",
              {
                roomId,
                userId: currentUserId
              }
            );
          }
        });

        socket.on(
          "connect_error",
          (error) => {
            if (
              !isComponentMounted ||
              callEndedRef.current
            ) {
              return;
            }

            console.warn(
              "Signaling connection error:",
              error?.message || error
            );

            setCallStatus(
              "Connecting..."
            );
          }
        );

        socket.on(
          "peer_ready",
          async () => {
            if (
              !isComponentMounted ||
              callEndedRef.current ||
              callRole !== "caller"
            ) {
              return;
            }

            console.log(
              "Peer is ready. Sending single WebRTC offer."
            );

            await createAndSendOffer();
          }
        );

        socket.on(
          "webrtc_offer_received",
          async ({ offer }) => {
            if (
              !isComponentMounted ||
              callEndedRef.current ||
              callRole !== "receiver" ||
              !offer ||
              remoteOfferHandledRef.current
            ) {
              return;
            }

            const currentPc = pcRef.current;

            if (
              !currentPc ||
              currentPc.signalingState === "closed"
            ) {
              return;
            }

            if (
              currentPc.signalingState !==
              "stable"
            ) {
              console.log(
                "Duplicate/invalid offer ignored. Signaling state:",
                currentPc.signalingState
              );
              return;
            }

            remoteOfferHandledRef.current = true;

            try {
              setCallStatus(
                "Answering call..."
              );

              await currentPc.setRemoteDescription(
                new RTCSessionDescription(
                  offer
                )
              );

              if (
                callEndedRef.current ||
                currentPc.signalingState ===
                  "closed"
              ) {
                return;
              }

              const answer =
                await currentPc.createAnswer();

              await currentPc.setLocalDescription(
                answer
              );

              if (
                !isComponentMounted ||
                callEndedRef.current ||
                !socket.connected
              ) {
                return;
              }

              answerSentRef.current = true;

              socket.emit(
                "send_webrtc_answer",
                {
                  roomId,
                  streamId: roomId,
                  answer,
                  to: peerUserId
                }
              );

              await processIceQueue();

              console.log(
                "WebRTC answer sent once."
              );
            } catch (error) {
              remoteOfferHandledRef.current =
                false;

              console.error(
                "Failed executing WebRTC offer handshake:",
                error
              );
            }
          }
        );

        socket.on(
          "webrtc_answer_received",
          async ({ answer }) => {
            if (
              !isComponentMounted ||
              callEndedRef.current ||
              !answer ||
              remoteAnswerHandledRef.current
            ) {
              return;
            }

            const currentPc = pcRef.current;

            if (
              !currentPc ||
              currentPc.signalingState ===
                "closed"
            ) {
              return;
            }

            if (
              currentPc.signalingState !==
              "have-local-offer"
            ) {
              console.log(
                "Duplicate/late answer ignored. Signaling state:",
                currentPc.signalingState
              );
              return;
            }

            remoteAnswerHandledRef.current = true;

            try {
              await currentPc.setRemoteDescription(
                new RTCSessionDescription(
                  answer
                )
              );

              await processIceQueue();

              console.log(
                "WebRTC answer accepted once."
              );
            } catch (error) {
              remoteAnswerHandledRef.current =
                false;

              console.error(
                "Failed setting remote WebRTC answer:",
                error
              );
            }
          }
        );

        socket.on(
          "incoming_ice_candidate",
          async ({ candidate }) => {
            if (
              !isComponentMounted ||
              callEndedRef.current ||
              !candidate
            ) {
              return;
            }

            const currentPc = pcRef.current;

            if (
              currentPc &&
              currentPc.signalingState !==
                "closed" &&
              currentPc.remoteDescription
            ) {
              try {
                await currentPc.addIceCandidate(
                  new RTCIceCandidate(
                    candidate
                  )
                );
              } catch (error) {
                console.warn(
                  "Skipped invalid ICE candidate:",
                  error
                );
              }
            } else {
              iceQueueRef.current.push(
                candidate
              );
            }
          }
        );

        socket.on(
          "peer_hung_up",
          async () => {
            if (
              !isComponentMounted ||
              callEndedRef.current
            ) {
              return;
            }

            setCallStatus("Call Ended");

            await performCleanup(
              false,
              true
            );
          }
        );

        socket.on(
          "in_call_text_message",
          (data) => {
            if (
              !isComponentMounted ||
              callEndedRef.current
            ) {
              return;
            }

            setInCallMessages(
              (prev) => [...prev, data]
            );
          }
        );

        socket.on(
          "in_call_reaction_burst",
          (data) => {
            if (
              !isComponentMounted ||
              callEndedRef.current ||
              !data?.emoji
            ) {
              return;
            }

            const reactionId =
              Date.now() + Math.random();

            setFloatingReactions(
              (prev) => [
                ...prev,
                {
                  id: reactionId,
                  emoji: data.emoji
                }
              ]
            );

            setTimeout(() => {
              if (
                isMountedRef.current
              ) {
                setFloatingReactions(
                  (prev) =>
                    prev.filter(
                      (reaction) =>
                        reaction.id !==
                        reactionId
                    )
                );
              }
            }, 2500);
          }
        );
      } catch (error) {
        console.error(
          "System device acquisition or socket binding fault:",
          error
        );

        if (
          isComponentMounted &&
          !callEndedRef.current
        ) {
          setCallStatus(
            "Hardware Error"
          );
        }
      }
    };

    initializeMediaAndSignaling();

    return () => {
      isComponentMounted = false;

      if (cleanupRef.current) {
        cleanupRef.current(
          false,
          false
        );
      }
    };
  }, [
    currentUserId,
    peerUserId,
    URLRole
  ]);

  const toggleScreenShare = async () => {
    const pc = pcRef.current;

    if (
      !pc ||
      pc.signalingState === "closed" ||
      callEndedRef.current
    ) {
      return;
    }

    try {
      if (isScreenSharing) {
        if (screenTrackRef.current) {
          screenTrackRef.current.onended =
            null;

          screenTrackRef.current.stop();

          screenTrackRef.current =
            null;
        }

        const videoTrack =
          localStreamRef.current
            ?.getVideoTracks()[0];

        if (videoTrack) {
          const sender =
            pc.getSenders().find(
              (item) =>
                item.track?.kind ===
                "video"
            );

          if (sender) {
            await sender.replaceTrack(
              videoTrack
            );
          }
        }

        setIsScreenSharing(false);
        return;
      }

      const screenStream =
        await navigator.mediaDevices.getDisplayMedia(
          {
            video: true
          }
        );

      const screenTrack =
        screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        screenStream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        return;
      }

      screenTrackRef.current =
        screenTrack;

      const sender =
        pc.getSenders().find(
          (item) =>
            item.track?.kind === "video"
        );

      if (sender) {
        await sender.replaceTrack(
          screenTrack
        );
      }

      screenTrack.onended = () => {
        if (
          isMountedRef.current &&
          screenTrackRef.current ===
            screenTrack &&
          !callEndedRef.current
        ) {
          screenTrackRef.current =
            null;

          setIsScreenSharing(false);

          const cameraTrack =
            localStreamRef.current
              ?.getVideoTracks()[0];

          if (
            cameraTrack &&
            pcRef.current &&
            pcRef.current.signalingState !==
              "closed"
          ) {
            const cameraSender =
              pcRef.current
                .getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (cameraSender) {
              cameraSender
                .replaceTrack(
                  cameraTrack
                )
                .catch((error) => {
                  console.warn(
                    "Failed restoring camera track:",
                    error
                  );
                });
            }
          }
        }
      };

      setIsScreenSharing(true);
    } catch (error) {
      console.warn(
        "Screen share cancelled or failed:",
        error
      );
    }
  };

  const sendInCallMessage = (event) => {
    event?.preventDefault();

    const text = chatInput.trim();

    if (
      !text ||
      !currentUserId ||
      !peerUserId ||
      callEndedRef.current
    ) {
      return;
    }

    const msgPayload = {
      id: `${currentUserId}-${Date.now()}-${Math.random()}`,
      senderId: currentUserId,
      text,
      time: new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )
    };

    setInCallMessages(
      (prev) => [...prev, msgPayload]
    );

    const roomId = [
      currentUserId,
      peerUserId
    ]
      .sort()
      .join("-");

    socketRef.current?.emit(
      "in_call_text_message",
      {
        roomId,
        ...msgPayload
      }
    );

    setChatInput("");
  };

  const sendReactionBurst = (emoji) => {
    if (
      !emoji ||
      callEndedRef.current ||
      !currentUserId ||
      !peerUserId
    ) {
      return;
    }

    const reactionId =
      Date.now() + Math.random();

    setFloatingReactions(
      (prev) => [
        ...prev,
        {
          id: reactionId,
          emoji
        }
      ]
    );

    setTimeout(() => {
      if (isMountedRef.current) {
        setFloatingReactions(
          (prev) =>
            prev.filter(
              (reaction) =>
                reaction.id !==
                reactionId
            )
        );
      }
    }, 2500);

    const roomId = [
      currentUserId,
      peerUserId
    ]
      .sort()
      .join("-");

    socketRef.current?.emit(
      "in_call_reaction_burst",
      {
        roomId,
        emoji
      }
    );
  };

  useEffect(() => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    stream
      .getAudioTracks()
      .forEach((track) => {
        track.enabled = !isMuted;
      });
  }, [isMuted]);

  useEffect(() => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    stream
      .getVideoTracks()
      .forEach((track) => {
        track.enabled = !isVideoOff;
      });
  }, [isVideoOff]);

  const cleanUpCall = async () => {
    await performCleanup(
      true,
      true
    );
  };

  const formatTime = (secs) => {
    const mins = Math.floor(
      secs / 60
    );

    const remSecs = secs % 60;

    return `${mins
      .toString()
      .padStart(2, "0")}:${remSecs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none overflow-hidden">
      <div className="w-full max-w-lg flex justify-between items-center bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-md z-30 shadow-xl">
        <div className="flex items-center gap-2">
          <Shield
            size={16}
            className="text-cyan-400"
          />

          <span className="text-[10px] sm:text-xs font-semibold tracking-wide text-zinc-300 uppercase">
            Encrypted
          </span>
        </div>

        <div className="flex items-center gap-2">
          {callStatus === "Connected" && (
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {formatTime(
                callDuration
              )}
            </span>
          )}

          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full font-extrabold border border-cyan-500/20">
            {callStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4 relative w-full max-w-lg rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {floatingReactions.map(
              (reaction) => (
                <motion.div
                  key={reaction.id}
                  initial={{
                    y: 200,
                    opacity: 0,
                    scale: 0.5,
                    x:
                      Math.random() *
                        100 -
                      50
                  }}
                  animate={{
                    y: -150,
                    opacity: [
                      0,
                      1,
                      1,
                      0
                    ],
                    scale: [
                      0.5,
                      1.8,
                      2,
                      1
                    ]
                  }}
                  exit={{
                    opacity: 0
                  }}
                  transition={{
                    duration: 2.2,
                    ease: "easeOut"
                  }}
                  className="absolute bottom-10 left-1/2 text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                >
                  {reaction.emoji}
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {callStatus !== "Connected" && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
            {peerProfile?.avatar_url ? (
              <img
                src={
                  peerProfile.avatar_url
                }
                alt="Peer Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/40 animate-pulse shadow-2xl shadow-cyan-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/20">
                <Video
                  size={36}
                  className="text-cyan-400"
                />
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-black tracking-tight text-white">
                @
                {peerProfile?.username ||
                  "User"}
              </h2>

              <p className="text-xs text-cyan-400 font-mono mt-1 capitalize animate-pulse">
                {callStatus}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-28 h-40 bg-black/70 border border-white/20 rounded-2xl backdrop-blur-md overflow-hidden flex items-center justify-center z-20 shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${
              isVideoOff
                ? "hidden"
                : ""
            }`}
          />

          {isVideoOff && (
            <div className="flex flex-col items-center gap-1 text-zinc-500">
              <VideoOff size={18} />

              <p className="text-[9px] font-bold uppercase tracking-wider">
                Cam Off
              </p>
            </div>
          )}
        </div>

        {callStatus === "Connected" && (
          <div className="absolute top-4 left-4 z-20 flex gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
            {[
              "❤️",
              "🔥",
              "👏",
              "🎉",
              "😮"
            ].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  sendReactionBurst(
                    emoji
                  )
                }
                className="p-1.5 hover:bg-white/10 rounded-xl transition-transform active:scale-125 text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{
                y: 200,
                opacity: 0
              }}
              animate={{
                y: 0,
                opacity: 1
              }}
              exit={{
                y: 200,
                opacity: 0
              }}
              className="absolute inset-x-0 bottom-0 top-1/3 bg-zinc-950/95 border-t border-white/10 backdrop-blur-2xl z-40 p-4 flex flex-col justify-between rounded-t-3xl shadow-2xl"
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
                    setShowChat(false)
                  }
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 no-scrollbar text-xs">
                {inCallMessages.length ===
                0 ? (
                  <p className="text-center text-zinc-600 italic py-6">
                    No chat messages
                    yet. Type below!
                  </p>
                ) : (
                  inCallMessages.map(
                    (msg) => {
                      const isMe =
                        msg.senderId ===
                        currentUserId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isMe
                              ? "items-end"
                              : "items-start"
                          }`}
                        >
                          <div
                            className={`px-3 py-1.5 rounded-xl max-w-[80%] ${
                              isMe
                                ? "bg-cyan-500 text-black font-semibold"
                                : "bg-zinc-800 text-white border border-white/10"
                            }`}
                          >
                            <p>
                              {
                                msg.text
                              }
                            </p>
                          </div>

                          <span className="text-[8px] text-zinc-500 mt-0.5">
                            {
                              msg.time
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
                  value={chatInput}
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
                  className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-lg flex items-center justify-around bg-zinc-900/90 border border-white/10 px-4 py-3 rounded-3xl backdrop-blur-xl shadow-2xl z-30">
        <button
          type="button"
          onClick={() =>
            setIsMuted((prev) => !prev)
          }
          title={
            isMuted
              ? "Unmute Mic"
              : "Mute Mic"
          }
          className={`p-3.5 rounded-2xl transition-all ${
            isMuted
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-white/5 text-zinc-200 hover:bg-white/10"
          }`}
        >
          {isMuted ? (
            <MicOff size={18} />
          ) : (
            <Mic size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setIsVideoOff(
              (prev) => !prev
            )
          }
          title={
            isVideoOff
              ? "Turn On Cam"
              : "Turn Off Cam"
          }
          className={`p-3.5 rounded-2xl transition-all ${
            isVideoOff
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-white/5 text-zinc-200 hover:bg-white/10"
          }`}
        >
          {isVideoOff ? (
            <VideoOff size={18} />
          ) : (
            <Video size={18} />
          )}
        </button>

        <button
          type="button"
          onClick={
            toggleScreenShare
          }
          title={
            isScreenSharing
              ? "Stop Screen Share"
              : "Share Screen"
          }
          className={`p-3.5 rounded-2xl transition-all ${
            isScreenSharing
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
              : "bg-white/5 text-zinc-200 hover:bg-white/10"
          }`}
        >
          <Monitor size={18} />
        </button>

        <button
          type="button"
          onClick={() =>
            setShowChat(
              (prev) => !prev
            )
          }
          title="Toggle In-Call Chat"
          className={`p-3.5 rounded-2xl transition-all relative ${
            showChat
              ? "bg-cyan-500 text-black"
              : "bg-white/5 text-zinc-200 hover:bg-white/10"
          }`}
        >
          <MessageSquare
            size={18}
          />

          {inCallMessages.length >
            0 &&
            !showChat && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
            )}
        </button>

        <button
          type="button"
          onClick={
            cleanUpCall
          }
          title="End Call"
          className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-transform active:scale-95 shadow-xl shadow-red-600/40"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
