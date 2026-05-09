import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Zap, X, Plus } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, ContactShadows, Bounds } from '@react-three/drei';

// 🔥 SILENCE THE DEPRECATION WARNINGS
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes('THREE.Clock') || args[0]?.includes('WebGLRenderer')) return;
    originalWarn(...args);
  };
}

const GiftModel = ({ url }) => {
  const { scene } = useGLTF(url, true);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </Bounds>
  );
};

const ModelViewer = ({ model }) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-16 h-16 flex items-center justify-center">
      {isVisible ? (
        <Canvas camera={{ position: [0, 0, 5], fov: 40 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[10, 10, 10]} />
          <Suspense fallback={null}>
            <GiftModel url={model} />
            <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={2} blur={2} />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={5} />
        </Canvas>
      ) : (
        <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
      )}
    </div>
  );
};

const GiftPanel = ({ streamId, onClose }) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [activeBigGift, setActiveBigGift] = useState(null);

const SOUND_BASE_URL = "https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/sounds/";

const GIFTS = useMemo(() => [
    { id: 'rose', name: 'Rose', price: 1, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Rose.glb', sound: `${SOUND_BASE_URL}rose.mp3` },
    { id: 'fire', name: 'Campfire', price: 5, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Campfire.glb', sound: `${SOUND_BASE_URL}fire.mp3` },
    { id: 'weights', name: 'Flex', price: 3, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Dumbell.glb', sound: `${SOUND_BASE_URL}weights.mp3` },
    { id: 'clap', name: 'Clap', price: 2, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Claptrap.glb', sound: `${SOUND_BASE_URL}clap.mp3` },
    { id: 'star', name: 'Star', price: 3, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Star.glb', sound: `${SOUND_BASE_URL}star.mp3` },
    { id: 'heart', name: 'Heart', price: 10, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Heart.glb', sound: `${SOUND_BASE_URL}heart.mp3` },
    { id: 'pizza', name: 'Pizza', price: 30, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Pizza%3A0.glb', sound: `${SOUND_BASE_URL}pizza.mp3` },
    { id: 'burger', name: 'Burger', price: 20, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Double%20Cheeseburger.glb', sound: `${SOUND_BASE_URL}burger.mp3` },
    { id: 'diamond', name: 'Diamond', price: 50, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/diamond.glb', sound: `${SOUND_BASE_URL}diamond.mp3` },
    { id: 'balloon', name: 'Balloon', price: 15, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Balloons.glb', sound: `${SOUND_BASE_URL}balloon.mp3` },
    { id: 'crown', name: 'Crown', price: 100, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Crown.glb', sound: `${SOUND_BASE_URL}crown.mp3` },
    { id: 'guitar', name: 'Guitar', price: 150, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Guitar.glb', sound: `${SOUND_BASE_URL}guitar.mp3` },
    { id: 'car', name: 'Car', price: 300, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/CAR%20Model.glb', sound: `${SOUND_BASE_URL}54789481-car-start-engine-start-diesel-engine-car-start-490819.mp3` },
    { id: 'drone', name: 'Drone', price: 400, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Drone.glb', sound: `${SOUND_BASE_URL}drone.mp3` },
    { id: 'dj', name: 'DJ', price: 350, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/DJ%20gear.glb', sound: `${SOUND_BASE_URL}dj.mp3` },
    { id: 'castle', name: 'Castle', price: 2500, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Castle%20Fortress.glb', sound: `${SOUND_BASE_URL}castle.mp3`, big: true },
    { id: 'lion', name: 'Lion', price: 5000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Lion.glb', sound: `${SOUND_BASE_URL}lion.mp3`, big: true },
    { id: 'money', name: 'Money Rain', price: 250, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Money.glb', sound: `${SOUND_BASE_URL}money.mp3` },
    { id: 'helicopter', name: 'Helicopter', price: 4000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Helicopter.glb', sound: `${SOUND_BASE_URL}helicopter.mp3`, big: true },
    { id: 'ship', name: 'Cruise Ship', price: 3000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Cruise%20liner.glb', sound: `${SOUND_BASE_URL}ship.mp3`, big: true },
    { id: 'dragon', name: 'Dragon', price: 10000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Red%20Dragon.glb', sound: `${SOUND_BASE_URL}dragon.mp3`, big: true },
    { id: 'universe', name: 'Universe', price: 15000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Solar%20System.glb', sound: `${SOUND_BASE_URL}universe.mp3`, big: true },
    { id: 'space', name: 'Space', price: 12000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Space%20Shuttle.glb', sound: `${SOUND_BASE_URL}space.mp3`, big: true },
    { id: 'world', name: 'World', price: 8000, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Simple%20Worlds.glb', sound: `${SOUND_BASE_URL}world.mp3`, big: true },
    { id: 'xwing', name: 'X-Wing', price: 5500, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/T-65%20X-Wing%20Starfighter.glb', sound: `${SOUND_BASE_URL}xwing.mp3`, big: true },
    { id: 'cow', name: 'Cow', price: 120, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Cow.glb', sound: `${SOUND_BASE_URL}cow.mp3` },
    { id: 'whale', name: 'Whale', price: 900, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Whale.glb', sound: `${SOUND_BASE_URL}whale.mp3` },
    { id: 'horse', name: 'Horse', price: 350, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Horse.glb', sound: `${SOUND_BASE_URL}horse.mp3` },
    { id: 'spider', name: 'Spider', price: 40, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Spider.glb', sound: `${SOUND_BASE_URL}spider.mp3` },
    { id: 'wolf', name: 'Wolf', price: 600, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Wolf.glb', sound: `${SOUND_BASE_URL}wolf.mp3` },
    { id: 'shark', name: 'Shark', price: 1200, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Shark.glb', sound: `${SOUND_BASE_URL}shark.mp3` },
    { id: 'bunny', name: 'Bunny', price: 50, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Bunny%20ears.glb', sound: `${SOUND_BASE_URL}bunny.mp3` },
    { id: 'stag', name: 'Stag', price: 400, model: 'https://wgzrebgvcqnvcstdpwsa.supabase.co/storage/v1/object/public/models/Stag.glb', sound: `${SOUND_BASE_URL}stag.mp3` }
], []);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
      if (data) setBalance(data.coins || 0);
    };
    fetchBalance();
  }, []);

  const handleInstantSend = async (gift) => {
    if (isSending || balance < gift.price) return;
    
    // 🔥 OPTIMIZED AUDIO PLAYBACK
    const audio = new Audio(gift.sound);
    audio.load(); // Forces immediate load from public folder
    audio.play().catch(e => console.log("Audio play blocked by browser. Interaction required."));

    // Close panel
    onClose?.(); 
    setIsSending(true);

    if (gift.big) {
      setActiveBigGift(gift.model);
      setTimeout(() => setActiveBigGift(null), 5000);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('send_live_gift', {
        p_stream_id: streamId,
        p_sender_id: user.id,
        p_gift_id: gift.id,
        p_price: gift.price,
        p_quantity: 1
      });
      if (!error) {
        setBalance(prev => prev - gift.price);
      }
    } catch (err) { console.error(err); } 
    finally { setIsSending(false); }
  };

  return (
    <>
      {activeBigGift && (
        <div className="fixed bottom-0 left-0 w-full h-1/2 z-[60] bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none animate-in slide-in-from-bottom duration-700">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48">
              <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true }}>
                <ambientLight intensity={2} />
                <pointLight position={[10, 10, 10]} />
                <Suspense fallback={null}>
                   <GiftModel url={activeBigGift} />
                   <ContactShadows position={[0, -1, 0]} opacity={0.6} scale={4} blur={2} />
                </Suspense>
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={10} />
              </Canvas>
           </div>
        </div>
      )}

      <div className="flex flex-col bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2rem] p-4 h-[60vh] text-white relative z-50">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-l-full border border-yellow-400/20">
              <Zap size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold">{balance}</span>
            </div>
            <button 
              onClick={() => navigate('/live/recharge')}
              className="flex items-center gap-1 bg-yellow-400 px-3 py-1.5 rounded-r-full border border-yellow-400 active:scale-95 transition-all"
            >
              <Plus size={14} className="text-black font-black" />
              <span className="text-[10px] font-black text-black uppercase">Recharge</span>
            </button>
          </div>
          <button onClick={onClose} className="p-1 opacity-50 hover:opacity-100"><X /></button>
        </div>

        <div className="grid grid-cols-4 gap-3 overflow-y-auto pb-10 scrollbar-hide">
          {GIFTS.map((g) => (
            <button
              key={g.id}
              onClick={() => handleInstantSend(g)}
              disabled={isSending}
              className={`flex flex-col items-center p-2 rounded-2xl bg-white/5 border border-transparent hover:border-yellow-400/50 active:scale-95 transition-all ${balance < g.price ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
            >
              <ModelViewer model={g.model} />
              <span className="text-[10px] opacity-60 mt-1 truncate w-full">{g.name}</span>
              <span className="text-xs font-black text-yellow-400">{g.price}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default GiftPanel;
