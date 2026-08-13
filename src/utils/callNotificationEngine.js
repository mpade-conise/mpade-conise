// Global WhatsApp-Style Call Notification & Ringtone Engine

let ringtoneAudioCtx = null;
let ringtoneInterval = null;
let ringbackAudioCtx = null;
let ringbackInterval = null;
let activeNotification = null;

// Request System Level Web Push / Desktop Notification Permissions
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    if (Notification.permission === 'granted') return 'granted';
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Error requesting Notification permission:", err);
    return 'denied';
  }
};

// WhatsApp Digital Call Chime Synthesizer Engine (Web Audio API)
export const startWhatsAppRingtone = (ringtoneType = 'whatsapp') => {
  try {
    stopWhatsAppRingtone();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ringtoneAudioCtx = new AudioCtx();

    // Loopable Melody Synthesizer Pattern
    const playChimePattern = () => {
      if (!ringtoneAudioCtx || ringtoneAudioCtx.state === 'closed') return;
      if (ringtoneAudioCtx.state === 'suspended') {
        ringtoneAudioCtx.resume();
      }

      const now = ringtoneAudioCtx.currentTime;

      if (ringtoneType === 'classic') {
        // Dual tone traditional phone ring (440Hz + 480Hz)
        const osc1 = ringtoneAudioCtx.createOscillator();
        const osc2 = ringtoneAudioCtx.createOscillator();
        const gain = ringtoneAudioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.setValueAtTime(0.2, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ringtoneAudioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } else {
        // WhatsApp Signature Digital Tri-Tone Melody (E5, B5, G#5 chime sequence)
        const notes = [
          { freq: 659.25, time: 0, duration: 0.18 },    // E5
          { freq: 987.77, time: 0.2, duration: 0.18 },  // B5
          { freq: 830.61, time: 0.4, duration: 0.28 },  // G#5
          { freq: 659.25, time: 0.8, duration: 0.18 },  // E5
          { freq: 987.77, time: 1.0, duration: 0.18 },  // B5
          { freq: 1046.50, time: 1.2, duration: 0.45 }  // C6
        ];

        notes.forEach(note => {
          const osc = ringtoneAudioCtx.createOscillator();
          const gain = ringtoneAudioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.freq, now + note.time);

          gain.gain.setValueAtTime(0, now + note.time);
          gain.gain.linearRampToValueAtTime(0.22, now + note.time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

          osc.connect(gain);
          gain.connect(ringtoneAudioCtx.destination);

          osc.start(now + note.time);
          osc.stop(now + note.time + note.duration);
        });
      }
    };

    playChimePattern();
    ringtoneInterval = setInterval(playChimePattern, ringtoneType === 'classic' ? 2800 : 2200);
  } catch (err) {
    console.warn("WhatsApp ringtone audio setup issue:", err);
  }
};

export const stopWhatsAppRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneAudioCtx) {
    try {
      ringtoneAudioCtx.close();
    } catch {
      // ignore
    }
    ringtoneAudioCtx = null;
  }
};

// Outgoing Call Ringback Sound (Tuuut... Tuuut...)
export const startRingbackTone = () => {
  try {
    stopRingbackTone();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ringbackAudioCtx = new AudioCtx();

    const playRingbackPattern = () => {
      if (!ringbackAudioCtx || ringbackAudioCtx.state === 'closed') return;
      if (ringbackAudioCtx.state === 'suspended') {
        ringbackAudioCtx.resume();
      }

      const now = ringbackAudioCtx.currentTime;
      const osc1 = ringbackAudioCtx.createOscillator();
      const osc2 = ringbackAudioCtx.createOscillator();
      const gain = ringbackAudioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.8);
      gain.gain.linearRampToValueAtTime(0, now + 1.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ringbackAudioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.95);
      osc2.stop(now + 1.95);
    };

    playRingbackPattern();
    ringbackInterval = setInterval(playRingbackPattern, 3800);
  } catch (err) {
    console.warn("Ringback audio setup issue:", err);
  }
};

export const stopRingbackTone = () => {
  if (ringbackInterval) {
    clearInterval(ringbackInterval);
    ringbackInterval = null;
  }
  if (ringbackAudioCtx) {
    try {
      ringbackAudioCtx.close();
    } catch {
      // ignore
    }
    ringbackAudioCtx = null;
  }
};

// Native OS System Web Push Notification Banner for Incoming Calls
export const showSystemCallNotification = ({ callerUsername, callerAvatar, callType, onAccept }) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  if (Notification.permission === 'granted') {
    try {
      if (activeNotification) {
        activeNotification.close();
      }

      const notification = new Notification(`📲 WhatsApp Incoming Call`, {
        body: `@${callerUsername} is calling you (${callType} call)... Click to answer!`,
        icon: callerAvatar || '/favicon.svg',
        tag: 'whatsapp-call-incoming',
        requireInteraction: true,
        renotify: true,
        vibrate: [400, 200, 400, 200, 600]
      });

      notification.onclick = () => {
        window.focus();
        if (onAccept) onAccept();
        notification.close();
      };

      activeNotification = notification;
      return notification;
    } catch (err) {
      console.warn("Failed to dispatch System Notification:", err);
    }
  }
  return null;
};

export const dismissSystemCallNotification = () => {
  if (activeNotification) {
    try {
      activeNotification.close();
    } catch {
      // ignore
    }
    activeNotification = null;
  }
};

// Vibrate Mobile Device
export const triggerCallVibration = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // Guard against Chrome intervention warning if user has not interacted with frame yet
      if (!navigator.userActivation || navigator.userActivation.hasBeenActive) {
        navigator.vibrate([400, 200, 400, 200, 600, 200, 400]);
      }
    } catch {
      // ignore
    }
  }
};
