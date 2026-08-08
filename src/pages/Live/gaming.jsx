import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Gift, BarChart3, Share2, HelpCircle, BarChart, 
  Smile, X, UserPlus, Swords, Mic, MicOff, Video, VideoOff, Settings, Radio, UserCheck, UserX,
  Camera, Gamepad2, Sparkles, Wand2, RefreshCw, Monitor, MonitorOff, Search, Shield, Play
} from 'lucide-react';

const MobileGamingSetup = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('MOBILE GAMING');

  // WEBRTC & SIGNALING REFS
  const pcRef = useRef(null);
  const signalingChannelRef = useRef(null);

  // STREAM & GAME STATE
  const [title, setTitle] = useState("");
  const [selectedGame, setSelectedGame] = useState("PUBG Mobile");
  const [privacy, setPrivacy] = useState("public");
  const [activeStreamData, setActiveStreamData] = useState(null);

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

  // FETCH STREAM DATA IF STREAM ID IS PRESENT
  useEffect(() => {
    if (streamId) {
      const fetchStream = async () => {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*')
          .eq('id', streamId)
          .single();
        if (data) setActiveStreamData(data);
      };
      fetchStream();
    }
  }, [streamId]);

  // BIND MEDIA STREAMS TO VIDEO ELEMENTS WHEN DOM IS READY
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, streamId, isScreenSharing]);

  useEffect(() => {
    if (camVideoRef.current && camStream) {
      camVideoRef.current.srcObject = camStream;
    }
  }, [camStream, streamId, isCamOverlayOn]);

  // START SCREEN SHARE CAPTURE WITH MOBILE FEATURE DETECTION
  const startScreenCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen sharing is not supported on mobile web browsers. Please stream from a desktop browser or use camera mode.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });
      setScreenStream(displayStream);
      setIsScreenSharing(true);

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
    if (isCamOverlayOn && !camStream) startCamPreview();
    else if (!isCamOverlayOn) stopCamPreview();
    return () => {
      if (!streamId) stopCamPreview();
    };
  }, [isCamOverlayOn]);

  const startCamPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCamStream(mediaStream);
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

  // INITIALIZE WEBRTC & REALTIME SIGNALING VIA SUPABASE / POSTGRES
  const initWebRTCSignaling = async (targetStreamId) => {
    const iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    if (screenStream) {
      screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }
    if (isCamOverlayOn && camStream) {
      camStream.getTracks().forEach(track => pc.addTrack(track, camStream));
    }

    const channel = supabase.channel(`stream_signaling:${targetStreamId}`, {
      config: { broadcast: { self: false } }
    });
    signalingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'viewer-answer' }, async ({ payload }) => {
        if (payload.answer && pc.signalingState !== 'closed') {
          console.log("📡 [WebRTC] Received Viewer SDP Answer");
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      })
      .on('broadcast', { event: 'viewer-ice-candidate' }, async ({ payload }) => {
        if (payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe((status) => {
        console.log(`📡 [Supabase Realtime] Signaling channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'host-ice-candidate',
                payload: { candidate: event.candidate }
              });
            }
          };
        }
      });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const { error: updateError } = await supabase
      .from('live_streams')
      .update({ 
        offer: offer,
        status: 'live' 
      })
      .eq('id', targetStreamId);

    if (updateError) {
      console.error("❌ Failed to update stream SDP offer in Postgres database:", updateError);
    }
  };

  const handleStartGamingStream = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('live_streams')
        .insert([{ 
          title: title || `${user?.user_metadata?.username || 'User'}'s ${selectedGame} Stream`,
          host_id: user?.id,
          category: selectedGame,
          privacy,
          status: 'pending'
        }])
        .select().single();

      if (!error && data) {
        await initWebRTCSignaling(data.id);
        navigate(`/live/gaming/${data.id}`);
      } else {
        console.error("❌ Failed to insert stream in Supabase:", error);
      }
    } catch (err) {
      console.error("⚠️ Error starting game stream:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndStream = async () => {
    if (streamId) {
      await supabase
        .from('live_streams')
        .update({ status: 'ended' })
        .eq('id', streamId);
    }
    stopScreenCapture();
    stopCamPreview();
    navigate('/live');
  };

  const tabs = [
    { name: 'POST', path: '/create/post', icon: null },
    { name: 'CREATE', path: '/create/story', icon: null },
    { name: 'DEVICE CAMERA', mode: 'camera', icon: <Camera size={14}/> },
    { name: 'GO WITH GUEST', mode: 'guest', icon: <Users size={14}/> },
    { name: 'MOBILE GAMING', mode: 'gaming', icon: <Gamepad2 size={14}/> },
  ];

  const handleTabClick = (tab) => {
    if (tab.mode) {
      setActiveTab(tab.name);
      if (tab.mode === 'camera') {
        setIsCamOverlayOn(true);
      }
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  // IF STREAM IS ACTIVE (RENDER ACTIVE BROADCAST DASHBOARD)
  if (streamId) {
    return (
      <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative">
        <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
        <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

        {/* TOP BAR WITH LIVE INDICATOR & END STREAM BUTTON */}
        <div className="w-full z-50 p-4 sm:p-6 flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-xl border border-pink-500/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pink-500 rounded-full animate-ping" />
            <span className="text-[10px] sm:text-xs font-black uppercase text-pink-300 tracking-wider">LIVE</span>
            <span className="text-[10px] sm:text-xs font-bold text-zinc-300 truncate max-w-[120px] sm:max-w-none">| {activeStreamData?.category || selectedGame}</span>
          </div>

          <button 
            onClick={handleEndStream}
            className="px-4 sm:px-5 py-1.5 sm:py-2 bg-red-600/80 hover:bg-red-500 border border-red-400 rounded-full text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all"
          >
            End Stream
          </button>
        </div>

        {/* ACTIVE STREAM CANVAS */}
        <div className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-pink-500/50 shadow-[0_0_40px_rgba(244,63,94,0.3)] relative bg-black flex items-center justify-center">
            
            {/* SCREEN SHARE STREAM DISPLAY */}
            <video 
              ref={screenVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-contain ${screenStream ? 'block' : 'hidden'}`} 
            />

            {/* FALLBACK IF NO SCREEN STREAM IS ACTIVE */}
            {!screenStream && (
              <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 text-center">
                <Radio className="w-8 h-8 sm:w-12 sm:h-12 text-pink-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-pink-300 tracking-widest uppercase">Broadcasting Live</span>
                <button 
                  onClick={startScreenCapture}
                  className="mt-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-pink-600/30 border border-pink-400/60 rounded-xl text-pink-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider hover:bg-pink-600 transition-all"
                >
                  Share Screen / Game
                </button>
              </div>
            )}

            {/* PIP FACE-CAM OVERLAY */}
            {isCamOverlayOn && (
              <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] bg-zinc-900 z-30">
                <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT SETUP VIEW
  return (
    <div className="h-[100dvh] bg-[#030308] text-white flex flex-col justify-between overflow-hidden font-sans relative">
      
      {/* BACKGROUND NEON GLOW HALOS */}
      <div className="fixed top-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-pink-600/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse z-10" />
      <div className="fixed bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-cyan-500/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse delay-700 z-10" />

      {/* TOP OVERLAY CONTROLS */}
      <div className="w-full z-50 p-4 sm:p-6 flex justify-between items-start pointer-events-none">
        <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-pink-500/30 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-pink-500/80 pointer-events-auto transition-all">
          <X size={20} className="sm:w-6 sm:h-6 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
        </button>
        
        <div className="flex flex-col gap-2 sm:gap-3 pointer-events-auto items-end">
           <ControlIconButton icon={<Settings size={18} className="sm:w-5 sm:h-5"/>} label="Settings" />
           <ControlIconButton 
             icon={isCamOverlayOn ? <Video size={18} className="sm:w-5 sm:h-5"/> : <VideoOff size={18} className="sm:w-5 sm:h-5"/>} 
             label={isCamOverlayOn ? "Cam On" : "Cam Off"} 
             onClick={() => setIsCamOverlayOn(!isCamOverlayOn)}
           />
        </div>
      </div>

      {/* SCREEN CAPTURE & OVERLAY CANVAS */}
      <div className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto">
        
        {/* MAIN DISPLAY CANVAS / PREVIEW */}
        <div className="w-full max-w-2xl aspect-video max-h-[35vh] sm:max-h-none rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] relative bg-black flex items-center justify-center">
          {isScreenSharing ? (
            <video ref={screenVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 sm:gap-3 p-2 text-center">
              <Monitor className="w-8 h-8 sm:w-12 sm:h-12 text-cyan-400/50 animate-pulse" />
              <button 
                onClick={startScreenCapture}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/60 rounded-xl text-cyan-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:text-black transition-all"
              >
                Select Game Screen / Display
              </button>
            </div>
          )}

          {/* PIP FACE-CAM OVERLAY PREVIEW */}
          {isCamOverlayOn && (
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-pink-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] bg-zinc-900 z-30">
              <video ref={camVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* GAME SELECTOR HORIZONTAL CHIPS */}
        <div className="w-full max-w-2xl mt-3 sm:mt-4 z-30">
          <span className="text-[9px] sm:text-[10px] font-black uppercase text-cyan-300 tracking-wider mb-1.5 block">Select Game Title</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {popularGames.map((game) => (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all border ${
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

      {/* CONTROLS AND INPUT SECTION */}
      <div className="w-full flex flex-col items-center px-4 sm:px-8 gap-3 z-40 my-2">
        {/* STREAM TITLE INPUT */}
        <div className="w-full max-w-md bg-black/50 backdrop-blur-2xl p-2.5 sm:p-3.5 rounded-2xl sm:rounded-[24px] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
          <input 
            type="text"
            placeholder={`Title for ${selectedGame} broadcast...`}
            className="bg-transparent w-full border-none outline-none font-bold text-xs sm:text-sm text-cyan-50 placeholder:text-cyan-200/40 px-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* START GAMING STREAM BUTTON */}
        <button 
          onClick={handleStartGamingStream}
          disabled={loading}
          className="w-full max-w-md bg-pink-600 hover:bg-pink-500 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm shadow-[0_0_30px_rgba(244,63,94,0.8)] border border-pink-400/60 active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <span>Start Gaming Stream</span>}
        </button>
      </div>

      {/* BOTTOM NAVIGATION TABS */}
      <div className="bg-black/80 backdrop-blur-3xl border-t border-cyan-500/30 pt-3 pb-6 sm:pb-8 px-4 overflow-x-auto no-scrollbar relative z-50 shadow-[0_-10px_30px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        
        <div className="flex items-center justify-start sm:justify-center gap-6 sm:gap-8 min-w-max relative z-10 px-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab)}
                disabled={loading}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                }`}
              >
                {tab.icon && (
                  <span className={isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-cyan-300'}>
                    {tab.icon}
                  </span>
                )}
                <span className={`text-[10px] sm:text-[11px] font-black tracking-widest whitespace-nowrap ${
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
    <div className="p-2 sm:p-3 bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-cyan-500/30 text-cyan-300 group-hover:bg-pink-600 group-hover:border-pink-400 group-hover:text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]">
      {icon}
    </div>
    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter text-cyan-200/80 group-hover:text-pink-300 transition-colors">{label}</span>
  </button>
);

export default MobileGamingSetup;
