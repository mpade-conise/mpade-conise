import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, Globe, X, Mic } from 'lucide-react';

const VideoCallCaptions = ({ isEnabled, onClose }) => {
  const [captions, setCaptions] = useState([]);
  const [activeSpeech, setActiveSpeech] = useState('');
  const [captionLang, setCaptionLang] = useState('en-US');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = captionLang;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const newCaption = {
            id: Date.now(),
            text: finalTranscript,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          setCaptions((prev) => [...prev.slice(-3), newCaption]);
          setActiveSpeech('');
        } else {
          setActiveSpeech(interimTranscript);
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
      };

      recognition.onend = () => {
        // Auto-restart if still enabled
        if (isEnabled && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Already active or error
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Failed initializing Speech Recognition:", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, captionLang]);

  if (!isEnabled) return null;

  return (
    <div className="absolute inset-x-4 bottom-24 z-30 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="max-w-md w-full bg-black/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-3 shadow-2xl pointer-events-auto text-center"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1 text-cyan-400 font-bold uppercase tracking-wider">
              <Subtitles size={12} /> Live Closed Captions
            </span>
            <div className="flex items-center gap-2">
              <select
                value={captionLang}
                onChange={(e) => setCaptionLang(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-zinc-300 focus:outline-none"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr-FR">Français</option>
                <option value="sw-KE">Kiswahili</option>
                <option value="pt-MZ">Português</option>
              </select>
              <button onClick={onClose} className="p-0.5 hover:text-white">
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Past lines */}
          {captions.map((c) => (
            <p key={c.id} className="text-xs text-zinc-300 font-medium leading-relaxed my-0.5">
              "{c.text}"
            </p>
          ))}

          {/* Real-time active speech bubble */}
          {activeSpeech ? (
            <p className="text-xs text-cyan-300 font-bold italic leading-relaxed animate-pulse">
              "{activeSpeech}..."
            </p>
          ) : captions.length === 0 ? (
            <p className="text-[10px] text-zinc-500 italic flex items-center justify-center gap-1 py-1">
              <Mic size={11} className="animate-pulse text-cyan-400" /> Listening to conversation...
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default VideoCallCaptions;
