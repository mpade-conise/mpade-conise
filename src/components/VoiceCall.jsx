import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function MpadeVoiceCallComponent() {
  const socketRef = useRef(null);
  const meetingRef = useRef(null);
  const [callState, setCallState] = useState("Idle"); // Idle, Calling, InCall

  useEffect(() => {
    // 1. Initialize your custom Socket.io client for ring alerts & presence
    socketRef.current = io('https://mpade-backend.onrender.com', {
      transports: ['websocket'],
    });

    // 2. Initialize the Metered Video SDK Instance
    if (window.Metered) {
      meetingRef.current = new window.Metered.Meeting();
      
      // Bind remote stream listeners
      meetingRef.current.on("remoteTrackStarted", (remoteTrackItem) => {
        // Wrap the incoming audio track into a MediaStream
        const stream = new MediaStream([remoteTrackItem.track]);
        
        if (remoteTrackItem.type === "audio") {
          let audioElement = document.getElementById(remoteTrackItem.streamId);
          if (!audioElement) {
            audioElement = document.createElement("audio");
            audioElement.id = remoteTrackItem.streamId;
            document.body.appendChild(audioElement);
          }
          audioElement.autoplay = true;
          audioElement.srcObject = stream;
        }
      });

      // Remove the audio element if the other person hangs up
      meetingRef.current.on("remoteTrackStopped", (remoteTrackItem) => {
        const element = document.getElementById(remoteTrackItem.streamId);
        if (element) element.remove();
      });
    }

    return () => {
      // Cleanup connections when component unmounts to prevent network flooding
      if (meetingRef.current) meetingRef.current.leaveMeeting();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // 3. Call this function when the user clicks "Join" or answers the call
  const handleConnectAudioRoom = async () => {
    try {
      if (!meetingRef.current) return;

      setCallState("Connecting...");

      // Join using your exact dashboard configuration details
      await meetingRef.current.join({
        roomURL: "mpade-universe.metered.live/mpade_universe_voice_call",
        name: "User-Session"
      });

      // Start sharing microphone
      await meetingRef.current.startAudio();
      setCallState("InCall");
      console.log("🚀 Securely joined Metered audio room instance.");
    } catch (error) {
      console.error("❌ Failed to join Metered room:", error);
      setCallState("Failed");
    }
  };

  const handleDisconnectCall = async () => {
    if (meetingRef.current) {
      await meetingRef.current.leaveMeeting();
      setCallState("Idle");
    }
  };

  return (
    <div className="audio-channel-container">
      <p>Status: {callState}</p>
      {callState === "Idle" && (
        <button onClick={handleConnectAudioRoom}>Connect Call</button>
      )}
      {callState === "InCall" && (
        <button onClick={handleDisconnectCall} style={{ backgroundColor: 'red' }}>
          Hang Up
        </button>
      )}
    </div>
  );
}

export default MpadeVoiceCallComponent;
