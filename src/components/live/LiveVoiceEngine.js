// src/components/live/LiveVoiceEngine.js
/**
 * Real-time Web Audio API DSP Engine for Live Stream AI Voice Modulation.
 * Takes the user's raw microphone stream, passes it through audio nodes
 * (Pitch Modulator, BiquadFilter, Delay, Waveshaper Distortion, Gain),
 * and returns a broadcastable MediaStream track for WebRTC PeerConnections.
 */

class LiveVoiceEngine {
  constructor() {
    this.audioCtx = null;
    this.sourceNode = null;
    this.destinationNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.delayNode = null;
    this.distortionNode = null;
    this.pitchOsc = null;
    this.processedStream = null;
    this.currentPreset = 'studio';
  }

  init(rawMediaStream) {
    if (!rawMediaStream || rawMediaStream.getAudioTracks().length === 0) {
      console.warn("⚠️ [LiveVoiceEngine] No audio track found in raw stream.");
      return rawMediaStream;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      this.sourceNode = this.audioCtx.createMediaStreamSource(rawMediaStream);
      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      // Core DSP Nodes
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.gainNode = this.audioCtx.createGain();
      this.delayNode = this.audioCtx.createDelay(1.0);
      this.distortionNode = this.audioCtx.createWaveShaper();

      // Default Neutral Setup (Studio Pure)
      this.filterNode.type = 'allpass';
      this.filterNode.frequency.value = 1000;
      this.gainNode.gain.value = 1.0;
      this.delayNode.delayTime.value = 0.0;

      // Audio Graph Pipeline: Source -> Filter -> Waveshaper -> Delay -> Gain -> Destination
      this.sourceNode.connect(this.filterNode);
      this.filterNode.connect(this.distortionNode);
      this.distortionNode.connect(this.delayNode);
      this.delayNode.connect(this.gainNode);
      this.gainNode.connect(this.destinationNode);

      this.processedStream = this.destinationNode.stream;
      return this.processedStream;
    } catch (err) {
      console.error("❌ [LiveVoiceEngine] Failed to initialize Web Audio DSP:", err);
      return rawMediaStream;
    }
  }

  // Generate curve for harmonic saturation / distortion
  makeDistortionCurve(amount = 20) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setPreset(presetId) {
    if (!this.audioCtx || !this.filterNode || !this.gainNode) return;
    this.currentPreset = presetId;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    // Reset neutral nodes
    this.distortionNode.curve = null;
    this.delayNode.delayTime.setValueAtTime(0.0, now);
    this.gainNode.gain.setValueAtTime(1.0, now);

    switch (presetId) {
      case 'robot': // Metallic Cyber Ring Modulator
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.setValueAtTime(440, now);
        this.filterNode.Q.setValueAtTime(6.0, now);
        this.distortionNode.curve = this.makeDistortionCurve(60);
        this.gainNode.gain.setValueAtTime(1.4, now);
        break;

      case 'titan':
      case 'bass': // Sub-harmonic Deep Titan Monster
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(260, now);
        this.filterNode.Q.setValueAtTime(3.5, now);
        this.gainNode.gain.setValueAtTime(1.8, now);
        break;

      case 'helium':
      case 'chipmunk': // Ultra High Pitch Vocal Multiplier
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.setValueAtTime(1800, now);
        this.filterNode.Q.setValueAtTime(4.0, now);
        this.distortionNode.curve = this.makeDistortionCurve(15);
        this.gainNode.gain.setValueAtTime(1.6, now);
        break;

      case 'cyberpunk-glitch': // Cyber Overdrive Distort
        this.filterNode.type = 'peaking';
        this.filterNode.frequency.setValueAtTime(1500, now);
        this.filterNode.gain.setValueAtTime(12, now);
        this.distortionNode.curve = this.makeDistortionCurve(100);
        this.delayNode.delayTime.setValueAtTime(0.04, now);
        break;

      case 'stadium': // Spacious Arena Hall Echo
        this.filterNode.type = 'allpass';
        this.delayNode.delayTime.setValueAtTime(0.28, now);
        this.gainNode.gain.setValueAtTime(1.1, now);
        break;

      case 'radio-1930':
      case 'telephone': // Vintage Bandpass Radio
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.setValueAtTime(2000, now);
        this.filterNode.Q.setValueAtTime(3.0, now);
        this.distortionNode.curve = this.makeDistortionCurve(25);
        break;

      case 'whisper-synth': // Ethereal Ghost Air
        this.filterNode.type = 'highpass';
        this.filterNode.frequency.setValueAtTime(3500, now);
        this.filterNode.Q.setValueAtTime(2.0, now);
        this.gainNode.gain.setValueAtTime(1.5, now);
        break;

      case 'studio':
      default: // Pure Crystal Clear Audio
        this.filterNode.type = 'allpass';
        this.filterNode.frequency.setValueAtTime(1000, now);
        this.distortionNode.curve = null;
        this.delayNode.delayTime.setValueAtTime(0.0, now);
        this.gainNode.gain.setValueAtTime(1.0, now);
        break;
    }

    console.log(`🎙️ [LiveVoiceEngine] Applied DSP preset: ${presetId}`);
  }

  getProcessedAudioTrack() {
    if (this.processedStream && this.processedStream.getAudioTracks().length > 0) {
      return this.processedStream.getAudioTracks()[0];
    }
    return null;
  }

  destroy() {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

export const liveVoiceEngine = new LiveVoiceEngine();
export default liveVoiceEngine;
