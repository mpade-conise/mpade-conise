import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  Camera, Users, Gamepad2, Settings, Sparkles, Wand2, 
  X, RefreshCw, Monitor, MonitorOff, Video, VideoOff, 
  Search, Shield, Play
} from 'lucide-react';
import { motion } from 'framer-motion';

const MobileGamingSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  
  const [loading, setLoading] = useState(false);

  // WEBRTC & SIGNALING REFS
  const pcRef = useRef(null);
  const channelRef = useRef(null);

  // STREAM & GAME STATE
  const [title, setTitle] = useState("");
  const [selectedGame, setSelectedGame] = useState("PUBG Mobile");
  const [privacy, setPrivacy] = useState("public");

  // MEDIA CAPTURE STATE
  const [screenStream, setScreenStream] = useState(null);
  const [camStream, setCamStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCamOverlayOn, setIsCamOverlayOn] = useState(true);

  // POPULAR MOBILE GAMES LIST
  const popularGames = [
    "PUBG Mobile", "Free Fire", "Call of Duty: Mobile", 
    "Mobile Legends", "Genshin Impact", "Roblox", "Clash Royale"
  ];

  // START SCREEN SHARE CAPTURE
  const startScreenCapture = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });
      setScreenStream(displayStream);
      setIsScreenSharing(true);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = displayStream;

      displayStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        setScreenStream(null);
      };
    } catch (err) {
      console.error("Screen capture cancelled or failed", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  // WEBCAM OVERLAY PREVIEW
  useEffect(() => {
    if (isCamOverlayOn) startCamPreview();
    else stopCamPreview();
    return () => stopCamPreview();
  }, [isCamOverlayOn]);

  const startCamPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCamStream(mediaStream);
      if (camVideoRef.current) camVideoRef.current.srcObject = mediaStream;
    } catch (err) {
      setIsCamOverlayOn(false);
    }
  };

  const stopCamPreview = () => {
    if (camStream) {
      camStream.getTracks().forEach(track => track.stop());
      setCamStream(null);
    }
  };

  // WEBRTC INITIALIZATION & OFFER CREATION
  const initWebRTC = async (streamId) => {
    const iceServers = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    // Attach active stream tracks to the peer connection
    if (screenStream) {
      screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }
    if (isCamOverlayOn && camStream) {
      camStream.getTracks().forEach(track => pc.addTrack(track, camStream));
    }

    // Set up Supabase Realtime channel for WebRTC signaling
    const channel = supabase.channel(`stream_signaling:${streamId}`);
    channelRef.current = channel;

    // Send local ICE candidates to joiners
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    // Listen for Answer SDP from incoming viewers/receivers
    channel
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.answer) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      })
      .on('broadcast', { event: 'viewer-candidate' }, async ({ payload }) => {
        if (payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe();

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Save initial Offer SDP to stream record or broadcast
    await supabase
      .from('live_streams')
      .update({ sdp_offer: offer })
      .eq('id', streamId);
  };

  const handleStartGamingStream = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('live_streams')
        .insert([{ 
          title: title || `${user.user_metadata?.username || 'User'}'s ${selectedGame} Stream`,
          host_id: user.id,
          category: selectedGame,
          privacy,
          status: 'live',
          stream_type: 'gaming',
          has_cam_overlay: isCamOverlayOn
        }])
        .select().single();

      if (!error && data) {
        // Initialize WebRTC connection with the created stream ID
        await initWebRTC(data.id);
        navigate(`/live/dashboard/${data.id}`);
      }
    } catch (err) {
      console.error("Failed to start WebRTC live stream", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'DEVICE CAMERA', path: '/live/device-camera', icon: <Camera size={14}/> },
    { name: 'GO WITH GUEST', path: '/live/guest', icon: <Users size={14}/> },
    { name: 'MOBILE GAMING', action: 'direct_gaming_stream', icon: <Gamepad2 size={14}/> },
  ];

  const handleTabClick = (tab) => {
    if (tab.action === 'direct_gaming_stream') {
      handleStartGamingStream();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <div className="h-screen bg-[#030308] text-white flex flex-col overflow-hidden font-sans relative">
      
      {/* BACKGROUND NEON GLOW HALOS */}
      <div className="fixed top-0 left-1/4 w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP OVERLAY CONTROLS */}
      <div className="absolute top-0 inset-x-0 z-50 p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-pink-500/80 pointer-events-auto transition-all">
          <X size={24} className="drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
        </button>
        
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <ControlIconButton icon={<Settings size={20}/>} label="Settings" />
           <ControlIconButton 
             icon={isCamOverlayOn ? <Video size={20}/> : <VideoOff size={20}/>} 
             label={isCamOverlayOn ? "Cam On" : "Cam Off"} 
             onClick={() => setIsCamOverlayOn(!isCamOverlayOn)}
           />
        </div>
      </div>

      {/* SCREEN CAPTURE & OVERLAY CANVAS */}
      <div className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-6">
        
        {/* MAIN DISPLAY CANVAS / PREVIEW */}
        <div className="w-full max-w-2xl aspect-video rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] relative bg-black flex items-center justify-center">
          {isScreenSharing ? (
            <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Monitor size={48} className="text-cyan-400/50 animate-pulse" />
              <button 
                onClick={startScreenCapture}
                className="px-5 py-2.5 bg-cyan-500/20 border border-cyan-400/60 rounded-xl text-cyan-300 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:text-black transition-all"
              >
                Select Game Screen / Display
              </button>
            </div>
          )}

          {/* PIP FACE-CAM OVERLAY PREVIEW */}
          {isCamOverlayOn && (
            <div className="absolute bottom-4 right-4 w-28 h-28 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] bg-zinc-900 z-30">
              <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* GAME SELECTOR HORIZONTAL CHIPS */}
        <div className="w-full max-w-2xl mt-4 z-30">
          <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider mb-2 block">Select Game Title</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {popularGames.map((game) => (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedGame === game
                    ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                    : 'bg-black/40 border-cyan-500/30 text-cyan-200/70 hover:border-cyan-400'
                }`}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* STREAM TITLE INPUT */}
      <div className="absolute inset-x-0 bottom-[160px] px-8 flex justify-center z-40">
        <div className="w-full max-w-md bg-black/50 backdrop-blur-2xl p-3.5 rounded-[24px] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
          <input 
            type="text"
            placeholder={`Title for ${selectedGame} broadcast...`}
            className="bg-transparent w-full border-none outline-none font-bold text-sm text-cyan-50 placeholder:text-cyan-200/40 px-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      {/* START GAMING STREAM BUTTON */}
      <div className="absolute inset-x-0 bottom-[95px] flex justify-center px-8 z-40">
        <button 
          onClick={handleStartGamingStream}
          disabled={loading}
          className="w-full max-w-md bg-pink-600 hover:bg-pink-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
        >
          {loading ? <RefreshCw className="animate-spin" /> : <span>Start Gaming Stream</span>}
        </button>
      </div>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-4 pb-8 px-4 overflow-x-auto no-scrollbar relative z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="flex items-center justify-center gap-8 min-w-max relative z-10">
          {tabs.map((tab) => {
            const isActive = tab.name === 'MOBILE GAMING';
            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                }`}
              >
                {tab.icon && (
                  <span className={isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-300'}>
                    {tab.icon}
                  </span>
                )}
                <span className={`text-[11px] font-black tracking-widest whitespace-nowrap ${
                  isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-100 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]'
                }`}>
                  {tab.name}
                </span>
                {isActive && (
                  <motion.div layoutId="tab-underline" className="w-1.5 h-1.5 bg-pink-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ControlIconButton = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 group-hover:border-pink-400 group-hover:text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]">
      {icon}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-tighter text-cyan-200/80 group-hover:text-pink-300 transition-colors">{label}</span>
  </button>
);

export default MobileGamingSetup;
