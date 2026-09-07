import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Float, ContactShadows, Center, Bounds } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

const Model = ({ url }) => {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
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
        className="absolute left-0 bottom-0 w-full h-1/2 pointer-events-none z-[100] overflow-hidden"
      >
        {/* Horizontal lower-half gift area */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={`relative w-full h-full flex flex-row items-center justify-center gap-4 px-4 ${
            isBigGift
              ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent'
              : ''
          }`}
        >
          {/* 3D Gift */}
          <motion.div
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className={`relative flex-shrink-0 ${
              isBigGift
                ? 'w-[45%] h-full'
                : 'w-[180px] h-[180px]'
            }`}
          >
            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              gl={{
                alpha: true,
                antialias: true,
              }}
              className="w-full h-full"
            >
              <ambientLight intensity={2} />

              <spotLight
                position={[10, 10, 10]}
                angle={0.15}
                penumbra={1}
                intensity={2}
              />

              <pointLight
                position={[-10, -10, -10]}
                intensity={1}
              />

              <Suspense fallback={null}>
                <Float
                  speed={isBigGift ? 3 : 2}
                  rotationIntensity={1.5}
                  floatIntensity={1.5}
                >
                  {gift.giftModel && (
                    <Model url={gift.giftModel} />
                  )}
                </Float>

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
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex-shrink-0 backdrop-blur-3xl border px-5 py-4 rounded-[28px] flex items-center gap-3 shadow-2xl max-w-[50%] ${
              isBigGift
                ? 'bg-white/10 border-white/20'
                : 'bg-black/50 border-white/10'
            }`}
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full border-2 border-yellow-400 p-0.5 flex-shrink-0">
              <img
                src={gift.avatar}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            </div>

            {/* Sender information */}
            <div className="flex flex-col min-w-0">
              <span className="text-white font-black text-lg leading-none truncate">
                {gift.username}
              </span>

              <span className="text-yellow-400 font-bold text-[10px] uppercase tracking-widest mt-1 truncate">
                Sent {gift.giftName}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GiftAlertOverlay;
