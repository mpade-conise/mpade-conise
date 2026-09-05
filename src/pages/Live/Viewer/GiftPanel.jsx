```jsx
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Zap, X, Plus } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  Center,
  ContactShadows,
  Bounds
} from '@react-three/drei';

// 🔥 SILENCE DEPRECATION WARNINGS
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;

  console.warn = (...args) => {
    if (
      args[0]?.includes('THREE.Clock') ||
      args[0]?.includes('WebGLRenderer') ||
      args[0]?.includes('THREE.PropertyBinding')
    ) {
      return;
    }

    originalWarn(...args);
  };
}

const GiftModel = ({ url }) => {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(
    () => scene.clone(true),
    [scene]
  );

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
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-16 h-16 flex items-center justify-center"
    >
      {isVisible ? (
        <Canvas
          camera={{ position: [0, 0, 5], fov: 40 }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.5} />
          <pointLight position={[10, 10, 10]} />

          <Suspense fallback={null}>
            <GiftModel url={model} />

            <ContactShadows
              position={[0, -0.8, 0]}
              opacity={0.4}
              scale={2}
              blur={2}
            />
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={5}
          />
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

  // ============================================================
  // 🎁 COMPLETE GIFT CATALOG
  // ============================================================
  const GIFTS = useMemo(
    () => [
      {
        id: 'rose',
        name: 'Rose',
        icon: '🌹',
        price: 1,
        model: '/models/Rose.glb',
        sound: '/sound/rose.mp3'
      },
      {
        id: 'fire',
        name: 'Campfire',
        icon: '🔥',
        price: 5,
        model: '/models/Campfire.glb',
        sound: '/sound/fire.mp3'
      },
      {
        id: 'weights',
        name: 'Flex',
        icon: '💪',
        price: 3,
        model: '/models/Dumbell.glb',
        sound: '/sound/weights.mp3'
      },
      {
        id: 'clap',
        name: 'Clap',
        icon: '👏',
        price: 2,
        model: '/models/Claptrap.glb',
        sound: '/sound/clap.mp3'
      },
      {
        id: 'star',
        name: 'Star',
        icon: '⭐',
        price: 3,
        model: '/models/Star.glb',
        sound: '/sound/star.mp3'
      },
      {
        id: 'heart',
        name: 'Heart',
        icon: '❤️',
        price: 10,
        model: '/models/Heart.glb',
        sound: '/sound/heart.mp3'
      },
      {
        id: 'pizza',
        name: 'Pizza',
        icon: '🍕',
        price: 30,
        model: '/models/Pizza.glb',
        sound: '/sound/pizza.mp3'
      },
      {
        id: 'burger',
        name: 'Burger',
        icon: '🍔',
        price: 20,
        model: '/models/Double Cheeseburger.glb',
        sound: '/sound/burger.mp3'
      },
      {
        id: 'diamond',
        name: 'Diamond',
        icon: '💎',
        price: 50,
        model: '/models/diamond.glb',
        sound: '/sound/diamond.mp3'
      },
      {
        id: 'balloon',
        name: 'Balloon',
        icon: '🎈',
        price: 15,
        model: '/models/Balloons.glb',
        sound: '/sound/balloon.mp3'
      },
      {
        id: 'crown',
        name: 'Crown',
        icon: '👑',
        price: 100,
        model: '/models/Crown.glb',
        sound: '/sound/crown.mp3'
      },
      {
        id: 'guitar',
        name: 'Guitar',
        icon: '🎸',
        price: 150,
        model: '/models/Guitar.glb',
        sound: '/sound/guitar.mp3'
      },
      {
        id: 'car',
        name: 'Car',
        icon: '🚗',
        price: 300,
        model: '/models/CAR Model.glb',
        sound: '/sound/car.mp3'
      },
      {
        id: 'drone',
        name: 'Drone',
        icon: '🚁',
        price: 400,
        model: '/models/Drone.glb',
        sound: '/sound/drone.mp3'
      },
      {
        id: 'dj',
        name: 'DJ',
        icon: '🎧',
        price: 350,
        model: '/models/DJ gear.glb',
        sound: '/sound/dj.mp3'
      },
      {
        id: 'castle',
        name: 'Castle',
        icon: '🏰',
        price: 2500,
        model: '/models/Castle Fortress.glb',
        sound: '/sound/castle.mp3',
        big: true
      },
      {
        id: 'lion',
        name: 'Lion',
        icon: '🦁',
        price: 5000,
        model: '/models/Lion.glb',
        sound: '/sound/lion.mp3',
        big: true
      },
      {
        id: 'money',
        name: 'Money Rain',
        icon: '💰',
        price: 250,
        model: '/models/Money.glb',
        sound: '/sound/money.mp3'
      },
      {
        id: 'helicopter',
        name: 'Helicopter',
        icon: '🚁',
        price: 4000,
        model: '/models/Helicopter.glb',
        sound: '/sound/helicopter.mp3',
        big: true
      },
      {
        id: 'ship',
        name: 'Cruise Ship',
        icon: '🚢',
        price: 3000,
        model: '/models/Cruise liner.glb',
        sound: '/sound/ship.mp3',
        big: true
      },
      {
        id: 'dragon',
        name: 'Dragon',
        icon: '🐉',
        price: 10000,
        model: '/models/Red Dragon.glb',
        sound: '/sound/dragon.mp3',
        big: true
      },
      {
        id: 'universe',
        name: 'Universe',
        icon: '🌌',
        price: 15000,
        model: '/models/Solar System.glb',
        sound: '/sound/universe.mp3',
        big: true
      },
      {
        id: 'space',
        name: 'Space',
        icon: '🚀',
        price: 12000,
        model: '/models/Space Shuttle.glb',
        sound: '/sound/space.mp3',
        big: true
      },
      {
        id: 'world',
        name: 'World',
        icon: '🌍',
        price: 8000,
        model: '/models/Simple Worlds.glb',
        sound: '/sound/world.mp3',
        big: true
      },
      {
        id: 'xwing',
        name: 'X-Wing',
        icon: '✈️',
        price: 5500,
        model: '/models/T-65 X-Wing Starfighter.glb',
        sound: '/sound/xwing.mp3',
        big: true
      },
      {
        id: 'cow',
        name: 'Cow',
        icon: '🐄',
        price: 120,
        model: '/models/Cow.glb',
        sound: '/sound/cow.mp3'
      },
      {
        id: 'whale',
        name: 'Whale',
        icon: '🐋',
        price: 900,
        model: '/models/Whale.glb',
        sound: '/sound/whale.mp3'
      },
      {
        id: 'horse',
        name: 'Horse',
        icon: '🐎',
        price: 350,
        model: '/models/Horse.glb',
        sound: '/sound/horse.mp3'
      },
      {
        id: 'spider',
        name: 'Spider',
        icon: '🕷️',
        price: 40,
        model: '/models/Spider.glb',
        sound: '/sound/spider.mp3'
      },
      {
        id: 'wolf',
        name: 'Wolf',
        icon: '🐺',
        price: 600,
        model: '/models/Wolf.glb',
        sound: '/sound/wolf.mp3'
      },
      {
        id: 'shark',
        name: 'Shark',
        icon: '🦈',
        price: 1200,
        model: '/models/Shark.glb',
        sound: '/sound/shark.mp3'
      },
      {
        id: 'bunny',
        name: 'Bunny',
        icon: '🐰',
        price: 50,
        model: '/models/Bunny ears.glb',
        sound: '/sound/bunny.mp3'
      },
      {
        id: 'stag',
        name: 'Stag',
        icon: '🦌',
        price: 400,
        model: '/models/Stag.glb',
        sound: '/sound/stag.mp3'
      }
    ],
    []
  );

  // ============================================================
  // 💰 FETCH USER COIN BALANCE
  // ============================================================
  useEffect(() => {
    let mounted = true;

    const fetchBalance = async () => {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          'Authentication error while fetching balance:',
          authError.message
        );
        return;
      }

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(
          'Error fetching balance:',
          error.message
        );
        return;
      }

      if (mounted && data) {
        setBalance(Number(data.coins) || 0);
      }
    };

    fetchBalance();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // 🎁 SEND GIFT
  // ============================================================
  const handleInstantSend = async (gift) => {
    if (isSending) return;

    if (!gift) {
      console.error('Gift is missing.');
      return;
    }

    if (balance < gift.price) {
      alert('Not enough coins to send this gift.');
      return;
    }

    if (!streamId) {
      alert('This stream is unavailable.');
      return;
    }

    // AUDIO PLAYBACK
    try {
      const audio = new Audio(gift.sound);
      audio.currentTime = 0;
      await audio.play();
    } catch (e) {
      console.warn(
        'Audio play blocked by browser:',
        e
      );
    }

    setIsSending(true);

    // BIG GIFT VISUAL
    if (gift.big) {
      setActiveBigGift(gift.model);

      setTimeout(() => {
        setActiveBigGift(null);
      }, 5000);
    }

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Authentication error. Please log in again.');
        return;
      }

      // ========================================================
      // 1️⃣ INSERT GIFT
      // ========================================================
      const { error: insertError } = await supabase
        .from('live_gifts')
        .insert({
          stream_id: streamId,
          sender_id: user.id,
          gift_id: String(gift.id),
          gift_name: String(gift.name),
          icon: String(gift.icon),
          price_total: Number(gift.price),
          quantity: 1
        });

      if (insertError) {
        console.error(
          'Gift insert error:',
          insertError
        );

        alert(
          `Failed to send gift: ${insertError.message}`
        );

        return;
      }

      // ========================================================
      // 2️⃣ DEDUCT COINS
      // ========================================================
      const newBalance = Math.max(
        0,
        Number(balance) - Number(gift.price)
      );

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          coins: newBalance
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(
          'Balance update error:',
          updateError
        );

        alert(
          `Gift sent, but failed to update coins: ${updateError.message}`
        );

        return;
      }

      // ========================================================
      // 3️⃣ UPDATE LOCAL BALANCE
      // ========================================================
      setBalance(newBalance);

      // ========================================================
      // 4️⃣ CLOSE PANEL
      // ========================================================
      onClose?.();

    } catch (err) {
      console.error(
        'Unexpected error sending gift:',
        err
      );

      alert(
        'Unexpected error sending gift. Check browser console.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* ======================================================
          BIG GIFT DISPLAY
      ====================================================== */}
      {activeBigGift && (
        <div className="fixed bottom-0 left-0 w-full h-1/2 z-[60] bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none animate-in slide-in-from-bottom duration-700">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48">
            <Canvas
              camera={{
                position: [0, 0, 5],
                fov: 45
              }}
              gl={{ alpha: true }}
            >
              <ambientLight intensity={2} />
              <pointLight position={[10, 10, 10]} />

              <Suspense fallback={null}>
                <GiftModel url={activeBigGift} />

                <ContactShadows
                  position={[0, -1, 0]}
                  opacity={0.6}
                  scale={4}
                  blur={2}
                />
              </Suspense>

              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={10}
              />
            </Canvas>
          </div>
        </div>
      )}

      {/* ======================================================
          GIFT PANEL
      ====================================================== */}
      <div className="flex flex-col bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2rem] p-4 h-[60vh] text-white relative z-50">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">

          {/* BALANCE */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-l-full border border-yellow-400/20">
              <Zap
                size={14}
                className="text-yellow-400 fill-yellow-400"
              />

              <span className="text-sm font-bold">
                {balance}
              </span>
            </div>

            {/* RECHARGE */}
            <button
              onClick={() => navigate('/live/recharge')}
              className="flex items-center gap-1 bg-yellow-400 px-3 py-1.5 rounded-r-full border border-yellow-400 active:scale-95 transition-all"
            >
              <Plus
                size={14}
                className="text-black font-black"
              />

              <span className="text-[10px] font-black text-black uppercase">
                Recharge
              </span>
            </button>
          </div>

          {/* CLOSE */}
          <button
            onClick={onClose}
            className="p-1 opacity-50 hover:opacity-100"
          >
            <X />
          </button>
        </div>

        {/* GIFT GRID */}
        <div className="grid grid-cols-4 gap-3 overflow-y-auto pb-10 scrollbar-hide">

          {GIFTS.map((g) => (
            <button
              key={g.id}
              onClick={() => handleInstantSend(g)}
              disabled={
                isSending ||
                balance < g.price
              }
              className={`flex flex-col items-center p-2 rounded-2xl bg-white/5 border border-transparent hover:border-yellow-400/50 active:scale-95 transition-all ${
                balance < g.price
                  ? 'opacity-40 grayscale-[0.5]'
                  : 'opacity-100'
              }`}
            >
              <ModelViewer model={g.model} />

              <span className="text-[10px] opacity-60 mt-1 truncate w-full">
                {g.name}
              </span>

              <span className="text-xs font-black text-yellow-400">
                {g.price}
              </span>
            </button>
          ))}

        </div>
      </div>
    </>
  );
};

export default GiftPanel;
```
