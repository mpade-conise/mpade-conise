import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Float } from '@react-three/drei';

function Model({ url }) {
  // useGLTF will throw an error if the path is wrong
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// A simple box to show while loading or if an error occurs
const Loader = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#fe2c55" wireframe />
  </mesh>
);

const Gift3DViewer = ({ modelUrl }) => {
  return (
    <div className="w-full h-48 bg-black/20 rounded-xl overflow-hidden border border-white/5">
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.5} />
        {/* Suspense is the key to stopping the "CanvasImpl" crash */}
        <Suspense fallback={<Loader />}>
          <Stage environment="city" intensity={0.5} contactShadow={false}>
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
              <Model url={modelUrl} />
            </Float>
          </Stage>
        </Suspense>
        <OrbitControls enableZoom={false} makeDefault />
      </Canvas>
    </div>
  );
};

export default Gift3DViewer;