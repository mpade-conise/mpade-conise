// src/pages/Live/Shared/JoinAsGuest.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { motion } from 'framer-motion';
import { Camera, VideoOff, Mic, MicOff, X, Zap, Loader2 } from 'lucide-react';
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
  const [assignedMode, setAssignedMode] = useState('video'); // 'video' | 'audio'
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
      console.error("Camera error:", err);
      setIsCamOn(false);
    }
  };

  // Connects WebRTC PeerConnection for simultaneous two-way audio/video exchange
  const connectToHostStream = (guestMediaStream, mode) => {
    const socket = io(SOCKET_SERVER_URL, { query: { streamId, role: 'cohost' } });
    socketRef.current = socket;

    socket.emit('join-room', { room: streamId, isCoHost: true, mode });

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Direct mode enforcement: If audio-only, disable camera track
    if (guestMediaStream) {
      const videoTrack = guestMediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = mode === 'video' && isCamOn;
      }
      
      guestMediaStream.getTracks().forEach(track => {
        pc.addTrack(track, guestMediaStream);
      });
    }

    // Receive host stream tracks (Audio & Video)
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setHostStream(event.streams[0]);
        if (hostVideoRef.current) {
          hostVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, streamId });
      }
    };

    // Create SDP Offer for the Host
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit('sdp-offer', { sdp: offer, streamId });
    });

    socket.on('sdp-answer', async ({ sdp }) => {
      if (pc.signalingState !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate && pc.signalingState !== 'closed') {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Listen for Host Kick signal
    socket.on('kicked_cohost', () => {
      alert('Host ended the panel session.');
      navigate(`/live/watch/${streamId}`);
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
      // Listen for Host Approval & Mode Assignment
      const subscription = supabase
        .channel(`guest_request_${request.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_guest_requests', filter: `id=eq.${request.id}` },
          (payload) => {
            const mode = payload.new.mode || 'video';

            if (payload.new.status === 'approved') {
              setIsRequesting(false);
              setIsApproved(true);
              setAssignedMode(mode);

              // Update local stream state according to host preference
              if (mode === 'audio' && stream) {
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) videoTrack.enabled = false;
                setIsCamOn(false);
              }

              connectToHostStream(stream, mode);
              supabase.removeChannel(subscription);
            } else if (payload.new.status === 'rejected') {
              setIsRequesting(false);
              alert('Host rejected your request to join.');
              navigate(`/live/watch/${streamId}`);
            } else if (payload.new.status === 'disconnected') {
              navigate(`/live/watch/${streamId}`);
            }
          }
        )
        .subscribe();
    } else {
      setIsRequesting(false);
    }
  };

  const toggleCamera = () => {
    if (assignedMode === 'audio' && isApproved) {
      alert("Host has approved this link in Audio-only mode.");
      return;
    }

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
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative p-6 font-sans">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-white hover:bg-white/20 transition-all">
          <X size={20} />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-widest">
            {isApproved ? `Live Panel (${assignedMode.toUpperCase()})` : 'Guest Preview'}
          </span>
        </div>
      </div>

      {/* Dynamic Stage Grid Layout */}
      <div className={`w-full max-w-[700px] grid gap-4 ${isApproved ? 'grid-cols-2' : 'grid-cols-1 flex justify-center'}`}>
        {/* Guest Local Video / Audio Avatar View */}
        <motion.div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
          {isCamOn && assignedMode === 'video' ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4">
              <img src={userProfile?.avatar_url} className="w-20 h-20 rounded-full border-2 border-emerald-500 mb-3 object-cover" alt="" />
              <p className="text-xs font-bold text-zinc-300">@{userProfile?.username}</p>
              <span className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase mt-1">
                {assignedMode === 'audio' ? '● Audio Live' : 'Camera Off'}
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="text-white font-bold text-xs">@{userProfile?.username} (You)</span>
          </div>
        </motion.div>

        {/* Remote Host Stream (Rendered live upon host approval) */}
        {isApproved && (
          <div className="relative w-full aspect-[3/4] rounded-[30px] overflow-hidden border border-white/10 bg-zinc-900 mx-auto max-w-[320px]">
            <video ref={hostVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">● Host Feed</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Console */}
      <div className="mt-8 flex items-center gap-6 z-50">
        <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMicOn ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {!isApproved && (
          <button onClick={handleSendRequest} disabled={isRequesting} className="bg-[#fe2c55] px-8 py-4 rounded-full text-white font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-[#e0264b] transition-all disabled:opacity-50">
            {isRequesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="white" />}
            {isRequesting ? 'Waiting for Host...' : 'Request to Join Panel'}
          </button>
        )}

        <button 
          onClick={toggleCamera} 
          disabled={assignedMode === 'audio' && isApproved}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOn && assignedMode === 'video' ? 'bg-white/10 text-white border-white/20' : 'bg-red-500/20 text-red-500 border-red-500/30'} ${assignedMode === 'audio' && isApproved ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isCamOn && assignedMode === 'video' ? <Camera size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JoinAsGuest;
