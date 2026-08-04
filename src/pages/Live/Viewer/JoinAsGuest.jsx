import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'https://your-signaling-server.com';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19020' },
    { urls: 'stun:stun1.l.google.com:19020' }
  ]
};

const JoinAsGuest = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const hostVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [hostStream, setHostStream] = useState(null);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    startPreview();
    fetchUser();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [streamId]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(data);
    }
  };

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera error", err);
      setIsCamOn(false);
    }
  };

  const connectToHostStream = (guestMediaStream) => {
    const socket = io(SOCKET_SERVER_URL, { query: { streamId, role: 'cohost' } });
    socketRef.current = socket;

    socket.emit('join-room', { room: streamId, isCoHost: true });

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Attach guest tracks to send to the host
    if (guestMediaStream) {
      guestMediaStream.getTracks().forEach(track => pc.addTrack(track, guestMediaStream));
    }

    // Receive host stream
    pc.ontrack = (event) => {
      setHostStream(event.streams[0]);
      if (hostVideoRef.current) hostVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate });
      }
    };

    // Create SDP Offer for the Host
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit('sdp-offer', { sdp: offer });
    });

    socket.on('sdp-answer', async ({ sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  const handleSendRequest = async () => {
    setIsRequesting(true);

    const { data: request, error } = await supabase
      .from('live_guest_requests')
      .insert([{
        stream_id: streamId,
        user_id: userProfile?.id,
        status: 'pending',
        username: userProfile?.username,
        avatar_url: userProfile?.avatar_url
      }])
      .select()
      .single();

    if (!error && request) {
      // Listen for Host Approval Signal
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            if (payload.new.status === 'approved') {
              setIsRequesting(false);
              setIsApproved(true);
              connectToHostStream(stream);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Host rejected your request to join.');
              navigate(`/live/watch/${streamId}`);
            }
          }
        )
        .subscribe();
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <X size={20} className="text-white" />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">
            {isApproved ? 'Live Panel Co-Host' : 'Guest Preview'}
          </span>
        </div>
      </div>

      {/* Dynamic Grid Layout */}
      <div className={`w-full max-w-[700px] grid gap-4 ${isApproved ? 'grid-cols-2' : 'grid-cols-1 flex justify-center'}`}>
        {/* Guest Video */}
        <motion.div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
          {isCamOn ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-950">
              <VideoOff size={32} className="text-white/20" />
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <img src={userProfile?.avatar_url} className="w-8 h-8 rounded-full border-2 border-[#fe2c55]" alt="" />
            <span className="text-white font-bold text-xs">{userProfile?.username} (You)</span>
          </div>
        </motion.div>

        {/* Host Stream (Rendered once approved) */}
        {isApproved && (
          <div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
            <video ref={hostVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-white text-[10px] font-bold uppercase tracking-wider">Host</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6 z-50">
        <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center border ${isMicOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-500'}`}>
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isApproved && (
          <button onClick={handleSendRequest} disabled={isRequesting} className="bg-[#fe2c55] px-8 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request to Join Panel'}
          </button>
        )}

        <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center border ${isCamOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-500'}`}>
          {isCamOn ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JoinAsGuest;
