import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Download, Scissors, Loader2 } from 'lucide-react';

const getRecorderMime = () => {
  const types = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return types.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
};

const VideoTrimEditor = ({ video, onClose }) => {
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    recorderRef.current?.stop();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, []);

  const handleLoaded = () => {
    const d = Number(videoRef.current?.duration) || 0;
    setDuration(d);
    setEnd(d);
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < start || el.currentTime >= end) el.currentTime = start;
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleTime = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    if (el.currentTime >= end) {
      el.pause();
      el.currentTime = start;
      setPlaying(false);
    }
  };

  const updateStart = value => {
    const next = Math.min(Number(value), Math.max(0, end - 0.1));
    setStart(next);
    if (videoRef.current && videoRef.current.currentTime < next) videoRef.current.currentTime = next;
  };

  const updateEnd = value => {
    const next = Math.max(Number(value), start + 0.1);
    setEnd(Math.min(duration, next));
    if (videoRef.current && videoRef.current.currentTime > next) videoRef.current.currentTime = start;
  };

  const formatTime = value => {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  const exportTrim = async () => {
    const source = videoRef.current;
    if (!source || !duration || end <= start) return;
    if (!source.captureStream || !window.MediaRecorder) {
      setError('This browser does not support in-browser video export.');
      return;
    }

    setProcessing(true);
    setError('');
    chunksRef.current = [];

    try {
      source.pause();
      source.currentTime = start;
      await new Promise(resolve => {
        const done = () => { source.removeEventListener('seeked', done); resolve(); };
        source.addEventListener('seeked', done);
      });

      const stream = source.captureStream();
      const mimeType = getRecorderMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      const result = new Promise((resolve, reject) => {
        recorder.ondataavailable = event => {
          if (event.data?.size) chunksRef.current.push(event.data);
        };
        recorder.onerror = event => reject(event.error || new Error('Recording failed.'));
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }));
      });

      recorder.start(250);
      await source.play();
      setPlaying(true);

      await new Promise(resolve => {
        const tick = () => {
          if (!source || source.currentTime >= end || source.ended) return resolve();
          requestAnimationFrame(tick);
        };
        tick();
      });

      source.pause();
      setPlaying(false);
      recorder.stop();
      const blob = await result;
      if (!blob.size) throw new Error('The trimmed video is empty.');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mpade_Trim_${video.id || 'video'}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Trim export failed:', err);
      setError(err.message || 'Could not export the trimmed video.');
    } finally {
      setProcessing(false);
      recorderRef.current = null;
    }
  };

  return (
    <div className="absolute inset-0 z-[160] bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#090912] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 text-white">
          <div className="flex items-center gap-2"><Scissors size={20} className="text-cyan-400" /><span className="font-black uppercase tracking-wider">Trim Video</span></div>
          <button onClick={onClose} disabled={processing} className="p-2 rounded-full bg-white/5 hover:bg-white/10"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} src={video.video_url} playsInline preload="metadata" onLoadedMetadata={handleLoaded} onTimeUpdate={handleTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="w-full h-full object-contain" />
            <button onClick={togglePlay} disabled={processing} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white">{playing ? <Pause size={28} /> : <Play size={28} />}</button>
          </div>
          <div className="text-xs text-zinc-400 flex justify-between"><span>{formatTime(start)}</span><span>{formatTime(current)} / {formatTime(duration)}</span><span>{formatTime(end)}</span></div>
          <div className="space-y-4">
            <label className="block text-xs font-bold text-cyan-300">START <input type="range" min="0" max={Math.max(0, duration - 0.1)} step="0.01" value={start} onChange={e => updateStart(e.target.value)} className="w-full accent-cyan-400" /></label>
            <label className="block text-xs font-bold text-pink-300">END <input type="range" min={Math.min(duration, start + 0.1)} max={duration || 0.1} step="0.01" value={end} onChange={e => updateEnd(e.target.value)} className="w-full accent-pink-400" /></label>
          </div>
          {error && <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}
          <button onClick={exportTrim} disabled={processing || !duration || end <= start} className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black disabled:opacity-50 flex items-center justify-center gap-2">
            {processing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Download size={18} /> Export Trimmed Video</>}
          </button>
          <p className="text-[10px] text-zinc-500 text-center">Export uses your browser locally; the original video is not modified.</p>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimEditor;
