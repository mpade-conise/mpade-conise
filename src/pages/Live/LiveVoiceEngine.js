// src/components/live/LiveVoiceEngine.js
//
// Real-time voice processing engine for MPade Live.
//
// Audio flow:
// Microphone MediaStream
//        ↓
// MediaStreamAudioSourceNode
//        ↓
// Voice DSP chain
//        ↓
// MediaStreamAudioDestinationNode
//        ↓
// Processed audio track
//        ↓
// WebRTC RTCPeerConnection
//        ↓
// All viewers
//
// IMPORTANT:
// This engine does NOT connect the microphone to the speakers.
// The processed audio is routed to a MediaStreamDestination so it
// can safely be sent through WebRTC without creating microphone feedback.

class LiveVoiceEngine {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.destination = null;

    this.inputStream = null;
    this.processedStream = null;

    this.currentPreset = 'studio';

    this.nodes = [];
    this.activeNodes = {};

    this.initialized = false;
    this.destroyed = false;

    this._boundVoiceChange = null;
  }

  // ------------------------------------------------------------
  // AUDIO CONTEXT
  // ------------------------------------------------------------

  _createAudioContext() {
    if (typeof window === 'undefined') {
      throw new Error('LiveVoiceEngine requires a browser environment.');
    }

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error(
        'Web Audio API is not supported by this browser.'
      );
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextClass();
    }

    return this.audioContext;
  }

  async _resumeContext() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn(
          '[LiveVoiceEngine] Unable to resume AudioContext:',
          error
        );
      }
    }
  }

  // ------------------------------------------------------------
  // INITIALIZATION
  // ------------------------------------------------------------

  async initialize(mediaStream) {
    if (!mediaStream) {
      throw new Error(
        '[LiveVoiceEngine] A microphone MediaStream is required.'
      );
    }

    if (!mediaStream.getAudioTracks().length) {
      throw new Error(
        '[LiveVoiceEngine] The supplied MediaStream has no audio track.'
      );
    }

    this.destroyed = false;

    const context = this._createAudioContext();

    await this._resumeContext();

    // If another stream is already attached, replace it cleanly.
    if (this.initialized) {
      this._disconnectProcessingNodes();
    }

    this.inputStream = mediaStream;

    this.source = context.createMediaStreamSource(mediaStream);

    this.destination = context.createMediaStreamDestination();

    // Build initial processing chain.
    this._buildPreset(this.currentPreset);

    this.initialized = true;

    // Processed stream contains processed microphone audio.
    //
    // We deliberately preserve the original video tracks so the
    // returned stream can be used directly by WebRTC.
    this.processedStream = new MediaStream();

    const processedAudioTracks =
      this.destination.stream.getAudioTracks();

    processedAudioTracks.forEach(track => {
      this.processedStream.addTrack(track);
    });

    mediaStream.getVideoTracks().forEach(track => {
      this.processedStream.addTrack(track);
    });

    console.log(
      '[LiveVoiceEngine] Initialized successfully.',
      {
        audioTracks: processedAudioTracks.length,
        videoTracks: mediaStream.getVideoTracks().length,
        preset: this.currentPreset
      }
    );

    return this.processedStream;
  }

  // ------------------------------------------------------------
  // PRESET CONTROL
  // ------------------------------------------------------------

  setPreset(presetId = 'studio') {
    const validPresets = [
      'studio',
      'bass',
      'robot',
      'helium',
      'autotune-major',
      'stadium',
      'radio-1930',
      'cyberpunk-glitch',
      'whisper-synth',
      'chipmunk',
      'space-captain',
      'demon-lord',
      'telephone',
      'choir-ensemble',
      'reverse-texture'
    ];

    if (!validPresets.includes(presetId)) {
      console.warn(
        `[LiveVoiceEngine] Unknown preset "${presetId}". Falling back to studio.`
      );

      presetId = 'studio';
    }

    this.currentPreset = presetId;

    if (!this.initialized || !this.audioContext) {
      console.log(
        `[LiveVoiceEngine] Preset selected before initialization: ${presetId}`
      );

      return;
    }

    this._disconnectProcessingNodes();
    this._buildPreset(presetId);

    console.log(
      `[LiveVoiceEngine] Active voice preset: ${presetId}`
    );
  }

  getPreset() {
    return this.currentPreset;
  }

  // ------------------------------------------------------------
  // PROCESSING GRAPH
  // ------------------------------------------------------------

  _disconnectProcessingNodes() {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
    }

    this.nodes.forEach(node => {
      try {
        node.disconnect();
      } catch (_) {}
    });

    this.nodes = [];
    this.activeNodes = {};
  }

  _trackNode(node, name = null) {
    if (!node) return node;

    this.nodes.push(node);

    if (name) {
      this.activeNodes[name] = node;
    }

    return node;
  }

  _connectChain(nodes) {
    if (!this.source || !this.destination) return;

    const validNodes = nodes.filter(Boolean);

    if (!validNodes.length) {
      this.source.connect(this.destination);
      return;
    }

    let previous = this.source;

    validNodes.forEach(node => {
      previous.connect(node);
      previous = node;
    });

    previous.connect(this.destination);
  }

  // ------------------------------------------------------------
  // BASIC DSP HELPERS
  // ------------------------------------------------------------

  _createFilter(
    type,
    frequency,
    Q = 1,
    gain = 0
  ) {
    const filter = this._trackNode(
      this.audioContext.createBiquadFilter()
    );

    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    filter.gain.value = gain;

    return filter;
  }

  _createGain(value = 1) {
    const gain = this._trackNode(
      this.audioContext.createGain()
    );

    gain.gain.value = value;

    return gain;
  }

  _createCompressor() {
    const compressor = this._trackNode(
      this.audioContext.createDynamicsCompressor()
    );

    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    return compressor;
  }

  _createDelay(delayTime = 0.25, feedback = 0.25) {
    const delay = this._trackNode(
      this.audioContext.createDelay(2.0)
    );

    delay.delayTime.value = delayTime;

    const feedbackGain = this._createGain(feedback);

    delay.connect(feedbackGain);
    feedbackGain.connect(delay);

    return delay;
  }

  _createWaveShaper(amount = 20) {
    const shaper = this._trackNode(
      this.audioContext.createWaveShaper()
    );

    const samples = 44100;
    const curve = new Float32Array(samples);

    const k = amount;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;

      curve[i] =
        ((1 + k) * x) /
        (1 + k * Math.abs(x));
    }

    shaper.curve = curve;
    shaper.oversample = '4x';

    return shaper;
  }

  _createTremolo(rate = 5, depth = 0.5) {
    const gain = this._createGain(1);

    const oscillator =
      this._trackNode(
        this.audioContext.createOscillator()
      );

    const lfoGain =
      this._trackNode(
        this.audioContext.createGain()
      );

    oscillator.frequency.value = rate;
    lfoGain.gain.value = depth;

    oscillator.connect(lfoGain);
    lfoGain.connect(gain.gain);

    oscillator.start();

    return {
      gain,
      oscillator,
      lfoGain
    };
  }

  _createRingMod(frequency = 440, depth = 0.8) {
    const gain = this._createGain(1 - depth / 2);

    const oscillator =
      this._trackNode(
        this.audioContext.createOscillator()
      );

    const modulationGain =
      this._trackNode(
        this.audioContext.createGain()
      );

    oscillator.frequency.value = frequency;
    modulationGain.gain.value = depth;

    oscillator.connect(modulationGain);
    modulationGain.connect(gain.gain);

    oscillator.start();

    return {
      gain,
      oscillator,
      modulationGain
    };
  }

  // ------------------------------------------------------------
  // PRESET BUILDER
  // ------------------------------------------------------------

  _buildPreset(preset) {
    if (!this.source || !this.destination) return;

    const compressor = this._createCompressor();

    switch (preset) {

      // --------------------------------------------------------
      // STUDIO PURE
      // --------------------------------------------------------

      case 'studio': {
        const highPass =
          this._createFilter(
            'highpass',
            70,
            0.7
          );

        const presence =
          this._createFilter(
            'peaking',
            3000,
            0.9,
            3
          );

        const air =
          this._createFilter(
            'highshelf',
            7000,
            0.7,
            2
          );

        this._connectChain([
          highPass,
          presence,
          air,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // DEEP BASS MONSTER
      // --------------------------------------------------------

      case 'bass': {
        const highPass =
          this._createFilter(
            'highpass',
            45,
            0.7
          );

        const bassBoost =
          this._createFilter(
            'lowshelf',
            140,
            0.8,
            14
          );

        const warmth =
          this._createFilter(
            'peaking',
            250,
            1.1,
            6
          );

        this._connectChain([
          highPass,
          bassBoost,
          warmth,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // ROBOT NETWORK
      // --------------------------------------------------------

      case 'robot': {
        const band =
          this._createFilter(
            'bandpass',
            1200,
            0.8
          );

        const ring =
          this._createRingMod(
            440,
            0.9
          );

        const distortion =
          this._createWaveShaper(35);

        this._connectChain([
          band,
          ring.gain,
          distortion,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // HELIUM ECHO
      // --------------------------------------------------------

      case 'helium': {
        const highPass =
          this._createFilter(
            'highpass',
            500,
            0.7
          );

        const presence =
          this._createFilter(
            'highshelf',
            2500,
            0.7,
            10
          );

        const delay =
          this._createDelay(
            0.12,
            0.22
          );

        this._connectChain([
          highPass,
          presence,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // AI PITCH CORRECT
      // --------------------------------------------------------
      //
      // Browser-native Web Audio cannot perform true autotune
      // simply by setting a frequency. This preset instead gives
      // the voice a brighter, tighter processed sound.
      //

      case 'autotune-major': {
        const highPass =
          this._createFilter(
            'highpass',
            100,
            0.7
          );

        const clarity =
          this._createFilter(
            'peaking',
            1800,
            1.0,
            5
          );

        const presence =
          this._createFilter(
            'peaking',
            3500,
            1.0,
            4
          );

        this._connectChain([
          highPass,
          clarity,
          presence,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // STADIUM
      // --------------------------------------------------------

      case 'stadium': {
        const highPass =
          this._createFilter(
            'highpass',
            90,
            0.7
          );

        const delay =
          this._createDelay(
            0.34,
            0.42
          );

        const presence =
          this._createFilter(
            'peaking',
            350,
            1.0,
            3
          );

        this._connectChain([
          highPass,
          presence,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // VINTAGE AM RADIO
      // --------------------------------------------------------

      case 'radio-1930': {
        const highPass =
          this._createFilter(
            'highpass',
            350,
            0.8
          );

        const lowPass =
          this._createFilter(
            'lowpass',
            3200,
            0.8
          );

        const distortion =
          this._createWaveShaper(18);

        this._connectChain([
          highPass,
          lowPass,
          distortion,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // CYBER OVERDRIVE
      // --------------------------------------------------------

      case 'cyberpunk-glitch': {
        const highPass =
          this._createFilter(
            'highpass',
            120,
            0.7
          );

        const distortion =
          this._createWaveShaper(65);

        const ring =
          this._createRingMod(
            75,
            0.65
          );

        this._connectChain([
          highPass,
          distortion,
          ring.gain,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // GHOSTLY WHISPER
      // --------------------------------------------------------

      case 'whisper-synth': {
        const highPass =
          this._createFilter(
            'highpass',
            1000,
            0.8
          );

        const air =
          this._createFilter(
            'highshelf',
            7000,
            0.8,
            8
          );

        const delay =
          this._createDelay(
            0.22,
            0.35
          );

        this._connectChain([
          highPass,
          air,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // CHIPMUNK / SQUEAK VELOCITY
      // --------------------------------------------------------
      //
      // This is a bright/high-frequency transformation rather
      // than a true time-domain pitch shifter.
      //

      case 'chipmunk': {
        const highPass =
          this._createFilter(
            'highpass',
            900,
            0.8
          );

        const highShelf =
          this._createFilter(
            'highshelf',
            4000,
            0.8,
            12
          );

        const ring =
          this._createRingMod(
            1200,
            0.25
          );

        this._connectChain([
          highPass,
          highShelf,
          ring.gain,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // COSMIC WALKIE TALKIE
      // --------------------------------------------------------

      case 'space-captain': {
        const band =
          this._createFilter(
            'bandpass',
            2200,
            1.2
          );

        const distortion =
          this._createWaveShaper(12);

        const delay =
          this._createDelay(
            0.09,
            0.18
          );

        this._connectChain([
          band,
          distortion,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // DEMON LORD
      // --------------------------------------------------------

      case 'demon-lord': {
        const lowPass =
          this._createFilter(
            'lowpass',
            900,
            0.7
          );

        const bass =
          this._createFilter(
            'lowshelf',
            120,
            0.8,
            15
          );

        const distortion =
          this._createWaveShaper(28);

        this._connectChain([
          lowPass,
          bass,
          distortion,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // TELEPHONE
      // --------------------------------------------------------

      case 'telephone': {
        const highPass =
          this._createFilter(
            'highpass',
            400,
            0.8
          );

        const lowPass =
          this._createFilter(
            'lowpass',
            2600,
            0.8
          );

        const distortion =
          this._createWaveShaper(8);

        this._connectChain([
          highPass,
          lowPass,
          distortion,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // SYNTH HARMONY
      // --------------------------------------------------------
      //
      // Creates a subtle modulation effect around the voice.
      //

      case 'choir-ensemble': {
        const highPass =
          this._createFilter(
            'highpass',
            100,
            0.7
          );

        const tremolo =
          this._createTremolo(
            2.5,
            0.25
          );

        const delay =
          this._createDelay(
            0.18,
            0.28
          );

        this._connectChain([
          highPass,
          tremolo.gain,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // DREAM MATRIX SHIFT
      // --------------------------------------------------------

      case 'reverse-texture': {
        const band =
          this._createFilter(
            'bandpass',
            1200,
            0.9
          );

        const ring =
          this._createRingMod(
            300,
            0.45
          );

        const delay =
          this._createDelay(
            0.27,
            0.4
          );

        this._connectChain([
          band,
          ring.gain,
          delay,
          compressor
        ]);

        break;
      }

      // --------------------------------------------------------
      // FALLBACK
      // --------------------------------------------------------

      default: {
        this._connectChain([
          compressor
        ]);
      }
    }
  }

  // ------------------------------------------------------------
  // PROCESSED STREAM ACCESS
  // ------------------------------------------------------------

  getProcessedStream() {
    if (!this.initialized || !this.processedStream) {
      return null;
    }

    return this.processedStream;
  }

  getProcessedAudioTrack() {
    if (!this.destination) {
      return null;
    }

    return (
      this.destination.stream.getAudioTracks()[0] ||
      null
    );
  }

  getInputStream() {
    return this.inputStream;
  }

  isInitialized() {
    return this.initialized && !this.destroyed;
  }

  // ------------------------------------------------------------
  // TRACK CONTROL
  // ------------------------------------------------------------

  setMuted(muted) {
    const track = this.getProcessedAudioTrack();

    if (!track) return;

    track.enabled = !muted;
  }

  // ------------------------------------------------------------
  // AUDIO CONTEXT CONTROL
  // ------------------------------------------------------------

  async resume() {
    await this._resumeContext();
  }

  async suspend() {
    if (
      this.audioContext &&
      this.audioContext.state === 'running'
    ) {
      try {
        await this.audioContext.suspend();
      } catch (error) {
        console.warn(
          '[LiveVoiceEngine] Unable to suspend AudioContext:',
          error
        );
      }
    }
  }

  // ------------------------------------------------------------
  // CLEANUP
  // ------------------------------------------------------------

  destroy() {
    console.log(
      '[LiveVoiceEngine] Destroying voice engine.'
    );

    this.destroyed = true;

    this._disconnectProcessingNodes();

    if (this.destination) {
      this.destination.stream
        .getTracks()
        .forEach(track => {
          try {
            track.stop();
          } catch (_) {}
        });
    }

    this.processedStream = null;
    this.inputStream = null;

    this.source = null;
    this.destination = null;

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
    }

    this.audioContext = null;

    this.initialized = false;
    this.nodes = [];
    this.activeNodes = {};
  }
}

// ------------------------------------------------------------
// SINGLE SHARED ENGINE
// ------------------------------------------------------------
//
// Exporting one shared instance is intentional.
//
// AIVoiceEffects, StreamDashboard and the WebRTC layer should all
// talk to the SAME voice engine during a host's live session.
//
// This prevents:
//
// AIVoiceEffects → Engine A
// WebRTC          → Engine B
//
// and instead gives:
//
// Microphone → ONE Engine → WebRTC → Viewers
//

const liveVoiceEngine = new LiveVoiceEngine();

export default liveVoiceEngine;
