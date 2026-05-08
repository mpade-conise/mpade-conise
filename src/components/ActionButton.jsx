import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ActionButton = ({ icon, label, onClick }) => {
  // 1. Convert to Number (handles null/undefined/strings)
  // 2. Use Math.max(0, ...) to force negative DB values (like -1, -2) to show as 0
  // 3. Final fallback to 0 if the result is still NaN
  const numericLabel = Number(label);
  const safeLabel = isNaN(numericLabel) ? 0 : Math.max(0, numericLabel);

  return (
    <div className="flex flex-col items-center group">
      <motion.button 
        whileTap={{ scale: 0.6 }} 
        onClick={onClick}
        className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-200 active:brightness-125"
      >
        {icon}
      </motion.button>
      
      {/* Adding a 'key' to the motion.span ensures that when the number changes, 
          React treats it as a new element, which can trigger a subtle pop animation.
      */}
      <motion.span 
        key={safeLabel}
        initial={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-[11px] font-black mt-1 text-white shadow-sm select-none tracking-tight"
      >
        {safeLabel.toLocaleString()} 
      </motion.span>
    </div>
  );
};

export default ActionButton;