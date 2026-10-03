import React, { useEffect, useRef, useState } from 'react';
import { Camera, Download, Loader2, Mic, MicOff, Play, Square, X } from 'lucide-react';

const getRecorderMime = () => {
  const types = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return types.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
};

const VideoDuetEditor = ({ video, onClose }) => {
  const sourceRef = useRef(null);
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const recorderRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);
  const sourceStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => stopEverything(), []);

  const stopEverything = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    recorderRef.current?.stop();
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    sourceStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true });
      cameraStreamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      setError(err.message || 'Camera and microphone permission is required.');
    }
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    const camera = cameraRef.current;
    if (!canvas || !source || !camera) return;
    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const drawCover = (media, x, y, w, h) => {
      const mw = media.videoWidth || media.width || 1;
      const mh = media.videoHeight || media.height || 1;
      const scale = Math.max(w / mw, h / mh);
      const dw = mw * scale;
      const dh = mh * scale;
      ctx.drawImage(media, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };
    drawCover(source, 0, 0, width, height / 2);
    ctx.save();
    if (!muted) ctx.globalAlpha = 1;
    drawCover(camera, 0, height / 2, width, height / 2);
    ctx.restore();
    animationRef.current = requestAnimationFrame(drawFrame);
  };

  const startRecording = async () => {
    if (!cameraReady || recording) return;
    if (!sourceRef.current?.captureStream || !canvasRef.current?.captureStream) {
      setError('This browser does not support duet recording.');
      return;
    }

    setError('');
    setProcessing(true);
    try {
      sourceRef.current.currentTime = 0;
      await sourceRef.current.play();

      const sourceStream = sourceRef.current.captureStream();
      sourceStreamRef.current = sourceStream;
      const canvasStream = canvasRef.current.captureStream(30);
      const audioTracks = [
        ...(muted ? [] : cameraStreamRef.current?.getAudioTracks() || []),
        ...(sourceStream.getAudioTracks() || [])
      ];
      audioTracks.forEach(track => canvasStream.addTrack(track));

      const mimeType = getRecorderMime();
      const recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onerror = event => setError(event.error?.message || 'Duet recording failed.');
      recorder.onstop = () => setProcessing(false);

      recorder.start(250);
      setRecording(true);
      drawFrame();
    } catch (err) {
      console.error('Duet start failed:', err);
      setError(err.message || 'Could not start duet recording.');
      setProcessing(false);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !recording) return;
    setRecording(false);
    setProcessing(true);
    sourceRef.current?.pause();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    recorderRef.current.stop();
    await new Promise(resolve => setTimeout(resolve, 300));
    const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || 'video/webm' });
    if (!blob.size) {
      setError('No duet video was recorded.');
      setProcessing(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mpade_Duet_${video.id || 'video'}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setProcessing(false);
  };

  return (
    <div className="absolute inset-0 z-[160] bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-3xl border border-pink-500/30 bg-[#090912] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-pink-500/20 text-white">
          <div className="flex items-center gap-2"><Camera size={20} className="text-pink-400" /><span className="font-black uppercase tracking-wider">Duet Video</span></div>
          <button onClick={onClose} disabled={recording || processing} className="p-2 rounded-full bg-white/5 hover:bg-white/10"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative aspect-[9/16] max-h-[65vh] mx-auto rounded-2xl overflow-hidden bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
            <video ref={sourceRef} src={video.video_url} playsInline muted preload="auto" className="hidden" />
            <video ref={cameraRef} muted playsInline className="hidden" />
            {!cameraReady && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-zinc-400"><Camera size={42} /><p>Enable your camera to start the duet.</p></div>}
          </div>
          <div className="flex gap-2">
            {!cameraReady ? <button onClick={startCamera} className="flex-1 py-3 rounded-2xl bg-cyan-500 text-black font-black flex items-center justify-center gap-2"><Camera size={18} /> Enable Camera</button> : !recording ? <button onClick={startRecording} disabled={processing} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black flex items-center justify-center gap-2">{processing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} Start Duet</button> : <button onClick={stopRecording} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black flex items-center justify-center gap-2"><Square size={18} /> Stop & Save</button>}
            {cameraReady && <button onClick={() => setMuted(value => !value)} className="px-4 rounded-2xl border border-white/10 text-white">{muted ? <MicOff size={18} /> : <Mic size={18} />}</button>}
          </div>
          {error && <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}
          <p className="text-[10px] text-zinc-500 text-center">The duet is composed locally in your browser. Your camera recording is not uploaded automatically.</p>
        </div>
      </div>
    </div>
  );
};

export default VideoDuetEditor;
