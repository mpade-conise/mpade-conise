import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EmojiReactions = () => {
  const [reactions, setReactions] = useState([]);

  const addReaction = (emoji) => {
    const id = Date.now();
    setReactions((prev) => [...prev, { id, emoji }]);
    
    // Auto-remove from DOM after animation finishes
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: Math.random() * 100 - 50, scale: 1 }}
            animate={{ opacity: 0, y: -400, x: Math.random() * 200 - 100, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute bottom-20 right-10 text-2xl shadow-[0_0_20px_rgba(254,44,85,0.5)]"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Tap Area for Viewers (Transparent layer over the video) */}
      <div 
        className="absolute inset-0 pointer-events-auto cursor-pointer"
        onClick={() => addReaction('❤️')}
      />
    </div>
  );
};

export default EmojiReactions;