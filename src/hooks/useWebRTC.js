import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const useWebRTC = (streamId, isHost) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const pc = useRef(new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  }));

  useEffect(() => {
    const startConnection = async () => {
      if (isHost) {
        // 1. Host: Get Camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        stream.getTracks().forEach(track => pc.current.addTrack(track, stream));

        // 2. Host: Create Offer
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        // 3. Save Offer to Supabase for Viewers to find
        await supabase.from('live_sessions').upsert({ id: streamId, sdp: offer });
      }
    };

    startConnection();

    // Cleanup tracks on unmount
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [streamId, isHost]);

  return { localStream, remoteStream };
};

export default useWebRTC;