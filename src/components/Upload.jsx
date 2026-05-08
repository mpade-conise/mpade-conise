import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient'; 
import { 
  X, Music, Disc, Video, Image as ImageIcon, Check, Search, 
  ChevronLeft, RefreshCw, Scissors, Wand2, Volume2, Loader2, Play 
} from 'lucide-react';

const Upload = ({ onComplete, user }) => {
  const [view, setView] = useState('selector'); 
  const [preview, setPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null); 
  const [caption, setCaption] = useState('');
  // Added 'url' to the music state to track the playable preview
  const [selectedMusic, setSelectedMusic] = useState({ name: 'Original Audio', artist: 'You', url: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState('record'); 
  const [isRecording, setIsRecording] = useState(false);
  
  const [filterIndex, setFilterIndex] = useState(0);
  const [facingMode, setFacingMode] = useState('user');
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef(null); 
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioPreviewRef = useRef(null);

 const filters = [
  { name: 'Normal', css: '' },
  { name: 'Neon', css: 'hue-rotate(90deg) saturate(200%) brightness(1.1) contrast(110%)' },
  { name: 'Cyber', css: 'contrast(150%) saturate(150%) hue-rotate(180deg) brightness(1.2)' },
  { name: 'Mono', css: 'grayscale(100%) contrast(150%) brightness(0.9)' },
  { name: 'Sunset', css: 'sepia(50%) saturate(200%) hue-rotate(-30deg) contrast(110%)' },
  { name: 'Vintage', css: 'sepia(30%) contrast(90%) brightness(1.1) saturate(80%)' },
  { name: 'Night', css: 'brightness(0.7) contrast(120%) saturate(120%) hue-rotate(20deg)' },
  { name: 'Glitch', css: 'hue-rotate(250deg) saturate(300%) contrast(150%)' }
];

  useEffect(() => {
    if (view === 'editor' && audioPreviewRef.current && selectedMusic.url) {
      audioPreviewRef.current.volume = 0.5;
      audioPreviewRef.current.play().catch(e => console.log("Autoplay blocked"));
    }
    return () => audioPreviewRef.current?.pause();
  }, [view, selectedMusic]);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, 
          audio: !isMuted 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { console.error("Camera Error:", err); }
    };
    if (mode === 'record' && view === 'selector') startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [mode, view, facingMode, isMuted]);

  const handleMusicSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=15`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  const startRecording = () => {
    setIsRecording(true);
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setVideoFile(blob);
      setPreview(URL.createObjectURL(blob));
      setView('editor');
    };
    mediaRecorderRef.current.start();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setPreview(URL.createObjectURL(file));
      setView('editor');
    }
  };

  // --- UPDATED UPLOAD LOGIC (INCLUDES MUSIC URL) ---
  const handleUpload = async () => {
    if (!videoFile) return alert("No video to upload!");
    setIsUploading(true);

    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) throw new Error("Session expired.");

      const fileExt = videoFile.name?.split('.').pop() || 'mp4';
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      // 1. Upload to Storage
      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // 2. Insert Record with music_url
      const { error: dbError } = await supabase
        .from('videos')
        .insert([{
          video_url: publicUrl,
          caption: caption,
          music_name: selectedMusic.name,
          music_url: selectedMusic.url, // CRITICAL: Saves the iTunes preview link
          user_id: currentUser.id 
        }]);

      if (dbError) throw dbError;

      alert("Shared to Mpade Universe!");
      onComplete();
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 bg-black z-[100] flex flex-col text-white font-sans">
      
      {/* Audio playback for the editor preview */}
      <audio ref={audioPreviewRef} src={selectedMusic.url} loop />

      {/* TOP NAV */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-20">
        <button onClick={onComplete} className="p-2 bg-black/20 backdrop-blur-md rounded-full active:scale-90 transition-transform"><X size={28} /></button>
        <button 
            onClick={() => setView('music')} 
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-full text-[10px] font-black shadow-lg hover:bg-white/20 transition-all uppercase tracking-widest"
        >
          <Music size={14} className="text-red-500 animate-pulse" /> {selectedMusic.name}
        </button>
        <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="p-2 bg-black/20 backdrop-blur-md rounded-full active:rotate-180 transition-all duration-500"><RefreshCw size={24} /></button>
      </div>

      {view === 'selector' && (
        <div className="relative flex-1 flex flex-col overflow-hidden bg-zinc-900">
          <video ref={videoRef} autoPlay playsInline muted style={{ filter: filters[filterIndex].css }} className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          <div className="absolute right-4 top-24 flex flex-col gap-6 z-10">
            <FeatureIcon onClick={() => setFilterIndex((i) => (i + 1) % filters.length)} icon={<Wand2 size={24}/>} label={filters[filterIndex].name} />
            <FeatureIcon onClick={() => setIsMuted(!isMuted)} icon={isMuted ? <Volume2 className="text-red-500" size={24}/> : <Volume2 size={24}/>} label={isMuted ? "Muted" : "Mic"} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex justify-around items-center mb-10">
              <label className="cursor-pointer group">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/10 group-active:scale-90 transition-all"><ImageIcon size={24}/></div>
                <input type="file" accept="video/*" hidden onChange={handleFileSelect} />
              </label>
              <button onClick={isRecording ? () => mediaRecorderRef.current.stop() : startRecording} className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center p-1">
                <div className={`transition-all duration-300 ${isRecording ? 'w-8 h-8 bg-red-600 rounded-sm' : 'w-full h-full bg-white rounded-full'}`} />
              </button>
              <div className="w-12 h-12" /> 
            </div>
            <div className="flex justify-center gap-12">
               <TabButton active={mode === 'record'} onClick={() => setMode('record')} label="Record" />
               <TabButton active={mode === 'upload'} onClick={() => setMode('upload')} label="Upload" />
            </div>
          </div>
        </div>
      )}

      {/* MUSIC LIBRARY */}
      <AnimatePresence>
        {view === 'music' && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="absolute inset-0 bg-zinc-950 z-50 p-6 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('selector')} className="active:scale-90 transition-transform"><ChevronLeft size={30}/></button>
              <h2 className="text-2xl font-black italic tracking-tighter">SELECT SOUND</h2>
            </div>
            <div className="flex gap-2 mb-8">
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleMusicSearch()}
                placeholder="Search Mpade Universe beats..." 
                className="flex-1 bg-zinc-900 rounded-2xl p-4 outline-none border border-white/5 focus:border-red-500/50 transition-all" 
              />
              <button onClick={handleMusicSearch} className="bg-red-500 px-6 rounded-2xl font-black active:scale-95 transition-all">
                {isSearching ? <Loader2 className="animate-spin" size={20}/> : 'FIND'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {searchResults.map((track, i) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    onClick={() => { 
                        setSelectedMusic({name: track.trackName, artist: track.artistName, url: track.previewUrl}); 
                        setView('selector'); 
                    }} 
                    className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <img src={track.artworkUrl100} className="w-14 h-14 rounded-xl shadow-lg" alt="" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black truncate text-sm">{track.trackName}</p>
                    <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest">{track.artistName}</p>
                  </div>
                  <div className="bg-red-500/10 p-3 rounded-full">
                    <Play size={16} className="text-red-500 fill-red-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDITOR & UPLOAD */}
      {view === 'editor' && (
        <div className="absolute inset-0 bg-black z-50 p-6 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView('selector')} className="active:scale-90 transition-transform"><ChevronLeft size={30}/></button>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Vibe Check</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
             <div className="w-full md:w-1/2 aspect-[9/16] bg-zinc-900 rounded-[2.5rem] overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                <video src={preview} className="h-full w-full object-cover" autoPlay loop muted={!!selectedMusic.url} />
                {selectedMusic.url && (
                    <div className="absolute top-4 left-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-3">
                        <Disc className="animate-spin text-red-500" size={16}/>
                        <p className="text-[10px] font-black truncate uppercase">{selectedMusic.name}</p>
                    </div>
                )}
             </div>
             <div className="flex-1 flex flex-col gap-4">
                <textarea 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell the Universe about this vibe..." 
                  className="flex-1 bg-zinc-900/40 backdrop-blur-md rounded-[2rem] p-8 outline-none text-lg italic border border-white/5 focus:border-red-500/50 transition-all resize-none shadow-inner" 
                />
             </div>
          </div>
          <button 
            disabled={isUploading}
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-6 rounded-[2.5rem] font-black text-xl mt-8 flex justify-center items-center gap-3 shadow-[0_15px_40px_rgba(239,68,68,0.4)] active:scale-95 transition-all disabled:opacity-50"
          >
            {isUploading ? <><Loader2 className="animate-spin" /> BROADCASTING...</> : 'SHARE TO UNIVERSE'}
          </button>
        </div>
      )}
    </motion.div>
  );
};

const FeatureIcon = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
    <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 group-hover:bg-red-500 group-hover:border-red-400 transition-all shadow-lg">{icon}</div>
    <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all ${active ? 'text-white border-b-2 border-red-500 pb-1' : 'text-zinc-600'}`}>{label}</button>
);

export default Upload;