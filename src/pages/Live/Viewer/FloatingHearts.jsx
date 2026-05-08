import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { supabase } from '../../../supabaseClient'; // Ensure this path is correct

const FloatingHearts = ({ count, streamId }) => {
  const [hearts, setHearts] = useState([]);

  // This handles the DATABASE update
  // Call this function from your Like Button's onClick!
  const triggerLikeInDB = async () => {
    if (!streamId) return;
    
    const { error } = await supabase
      .rpc('increment_likes', { stream_id_input: streamId });

    if (error) {
      console.error("Error updating likes:", error.message);
    }
  };

  // This handles the VISUAL animation
  useEffect(() => {
    if (count > 0) {
      const id = Date.now();
      const newHeart = {
        id,
        left: Math.random() * 80 + 10 + "%", 
        rotation: Math.random() * 40 - 20,
        color: ['#fe2c55', '#ff4d6d', '#ff758f', '#face15'][Math.floor(Math.random() * 4)]
      };

      setHearts((prev) => [...prev, newHeart]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, 2000);
    }
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ y: "100%", opacity: 1, scale: 0.5 }}
            animate={{ 
              y: "-20vh", 
              opacity: 0, 
              scale: 1.5,
              x: Math.random() * 100 - 50 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute bottom-0"
            style={{ left: heart.left, rotate: `${heart.rotation}deg` }}
          >
            <Heart 
              size={28} 
              fill={heart.color} 
              stroke="none" 
              className="drop-shadow-[0_0_10px_rgba(254,44,85,0.5)]"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FloatingHearts;