import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
// 🔥 Added Bounds to the import
import { useGLTF, Float, ContactShadows, Center, Bounds } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

const Model = ({ url }) => {
  const { scene } = useGLTF(url);
  // Clone to prevent cache issues when multiple gifts are sent
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    /* 🔥 Bounds fit ensures the model stays inside the camera view */
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </Bounds>
  );
};

const GiftAlertOverlay = ({ gift }) => {
  if (!gift) return null;

  const isBigGift = gift.price >= 100;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`relative w-full h-full flex flex-col items-center justify-center pointer-events-none z-[100] ${
          isBigGift ? 'bg-gradient-to-b from-cyan-500/10 via-transparent to-black/80' : ''
        }`}
      >
        
        {/* Container size adjusts based on split-screen context */}
        <motion.div 
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          className={`${isBigGift ? 'w-full h-[60%]' : 'w-[300px] h-[300px]'} mb-[-20px]`}
        >
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 45 }} 
            gl={{ alpha: true, antialias: true }}
            // 🔥 This makes the canvas responsive to the div size
            className="w-full h-full"
          >
            <ambientLight intensity={2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
            <pointLight position={[-10, -10, -10]} intensity={1} />
            
            <Suspense fallback={null}>
              <Float speed={isBigGift ? 3 : 2} rotationIntensity={1.5} floatIntensity={1.5}>
                {gift.giftModel && <Model url={gift.giftModel} />}
              </Float>
              
              {/* Standardized Shadow */}
              <ContactShadows 
                position={[0, -1.5, 0]} 
                opacity={0.6} 
                scale={10} 
                blur={2} 
                far={4} 
              />
            </Suspense>
          </Canvas>
        </motion.div>

        {/* Sender Card */}
        <motion.div 
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`backdrop-blur-3xl border px-6 py-4 rounded-[30px] flex items-center gap-4 shadow-2xl ${
            isBigGift ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/10'
          }`}
        >
          <div className="w-14 h-14 rounded-full border-2 border-yellow-400 p-0.5">
             <img src={gift.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-xl leading-none">{gift.username}</span>
            <span className="text-yellow-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              Sent {gift.giftName}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GiftAlertOverlay;