import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Video, Mic, Volume2, RefreshCw, Check, ShieldCheck, Sparkles, Sliders } from 'lucide-react';

const VideoCallDeviceSettings = ({ 
  isOpen, 
  onClose,
  activeVideoDeviceId,
  activeAudioDeviceId,
  onSwitchCamera,
  onSwitchMicrophone,
  noiseSuppression,
  onToggleNoiseSuppression,
  facingMode,
  onFlipCamera
}) => {
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
      } catch (err) {
        console.warn("Failed enumerating media devices:", err);
      }
    };

    loadDevices();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-4 sm:inset-x-12 sm:inset-y-16 z-50 rounded-3xl bg-zinc-950/95 border border-white/20 backdrop-blur-2xl p-5 flex flex-col justify-between shadow-2xl overflow-y-auto no-scrollbar"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Device & Audio/Video Studio</h3>
            <p className="text-[10px] text-zinc-400">Configure hardware peripherals & studio clarity</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="space-y-4 my-4 flex-1">
        {/* Quick Camera Flip Switch */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <RefreshCw size={15} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Camera Orientation</p>
              <p className="text-[10px] text-zinc-400 capitalize">Currently: {facingMode === 'user' ? 'Front (Selfie)' : 'Rear (Environment)'}</p>
            </div>
          </div>
          <button
            onClick={onFlipCamera}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} /> Flip Camera
          </button>
        </div>

        {/* Studio Noise Suppression */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Studio Noise Suppression</p>
              <p className="text-[10px] text-zinc-400">Eliminate background noise, fan hums & echo</p>
            </div>
          </div>
          <button
            onClick={onToggleNoiseSuppression}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              noiseSuppression ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-zinc-300 hover:bg-white/15'
            }`}
          >
            {noiseSuppression ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Video Input Device Selection */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Video size={13} className="text-cyan-400" /> Video Camera Source
          </label>
          <select
            value={activeVideoDeviceId || ''}
            onChange={(e) => onSwitchCamera(e.target.value)}
            className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
          >
            {videoDevices.length === 0 ? (
              <option value="">Default Camera</option>
            ) : (
              videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Audio Input Device Selection */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Mic size={13} className="text-pink-400" /> Microphone Input
          </label>
          <select
            value={activeAudioDeviceId || ''}
            onChange={(e) => onSwitchMicrophone(e.target.value)}
            className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-400"
          >
            {audioDevices.length === 0 ? (
              <option value="">Default Microphone</option>
            ) : (
              audioDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Audio Output Device Selection */}
        {audioOutputDevices.length > 0 && (
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Volume2 size={13} className="text-amber-400" /> Audio Output Speaker
            </label>
            <select
              className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
            >
              {audioOutputDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Speaker ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Done Button */}
      <button
        onClick={onClose}
        className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-cyan-500/20 transition-transform active:scale-98"
      >
        Save & Apply Configuration
      </button>
    </motion.div>
  );
};

export default VideoCallDeviceSettings;
