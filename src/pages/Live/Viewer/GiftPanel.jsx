
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Zap, X, Plus, Search, Heart, Volume2, VolumeX, ChevronLeft, ChevronRight, ShieldCheck, Loader2, Gift, Sparkles } from 'lucide-react';

const GIFTS = [
  { id: 'rose', name: 'Rose', icon: '🌹', price: 1, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'float', big: false },
  { id: 'fire', name: 'Campfire', icon: '🔥', price: 5, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'flame', big: false },
  { id: 'weights', name: 'Flex', icon: '💪', price: 3, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'bounce', big: false },
  { id: 'clap', name: 'Clap', icon: '👏', price: 2, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'bounce', big: false },
  { id: 'star', name: 'Star', icon: '⭐', price: 3, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'sparkle', big: false },
  { id: 'heart', name: 'Heart', icon: '❤️', price: 10, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'pulse', big: false },
  { id: 'pizza', name: 'Pizza', icon: '🍕', price: 30, image: '', sound: '', category: 'Food', rarity: 'common', animation: 'float', big: false },
  { id: 'burger', name: 'Burger', icon: '🍔', price: 20, image: '', sound: '', category: 'Food', rarity: 'common', animation: 'float', big: false },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 50, image: '', sound: '', category: 'Luxury', rarity: 'rare', animation: 'sparkle', big: false },
  { id: 'balloon', name: 'Balloon', icon: '🎈', price: 15, image: '', sound: '', category: 'Special', rarity: 'common', animation: 'float', big: false },
  { id: 'crown', name: 'Crown', icon: '👑', price: 100, image: '', sound: '', category: 'Luxury', rarity: 'rare', animation: 'sparkle', big: false },
  { id: 'guitar', name: 'Guitar', icon: '🎸', price: 150, image: '', sound: '', category: 'Special', rarity: 'rare', animation: 'bounce', big: false },
  { id: 'car', name: 'Car', icon: '🚗', price: 300, image: '', sound: '', category: 'Vehicles', rarity: 'rare', animation: 'slide', big: false },
  { id: 'drone', name: 'Drone', icon: '🚁', price: 400, image: '', sound: '', category: 'Vehicles', rarity: 'rare', animation: 'float', big: false },
  { id: 'dj', name: 'DJ', icon: '🎧', price: 350, image: '', sound: '', category: 'Special', rarity: 'rare', animation: 'bounce', big: false },
  { id: 'castle', name: 'Castle', icon: '🏰', price: 2500, image: '', sound: '', category: 'Big Gifts', rarity: 'epic', animation: 'grand', big: true },
  { id: 'lion', name: 'Lion', icon: '🦁', price: 5000, image: '', sound: '', category: 'Animals', rarity: 'epic', animation: 'grand', big: true },
  { id: 'money', name: 'Money Rain', icon: '💰', price: 250, image: '', sound: '', category: 'Luxury', rarity: 'rare', animation: 'rain', big: false },
  { id: 'helicopter', name: 'Helicopter', icon: '🚁', price: 4000, image: '', sound: '', category: 'Big Gifts', rarity: 'epic', animation: 'grand', big: true },
  { id: 'ship', name: 'Cruise Ship', icon: '🚢', price: 3000, image: '', sound: '', category: 'Big Gifts', rarity: 'epic', animation: 'grand', big: true },
  { id: 'dragon', name: 'Dragon', icon: '🐉', price: 10000, image: '', sound: '', category: 'Big Gifts', rarity: 'legendary', animation: 'grand', big: true },
  { id: 'universe', name: 'Universe', icon: '🌌', price: 15000, image: '', sound: '', category: 'Big Gifts', rarity: 'legendary', animation: 'grand', big: true },
  { id: 'space', name: 'Space', icon: '🚀', price: 12000, image: '', sound: '', category: 'Big Gifts', rarity: 'legendary', animation: 'grand', big: true },
  { id: 'world', name: 'World', icon: '🌍', price: 8000, image: '', sound: '', category: 'Big Gifts', rarity: 'legendary', animation: 'grand', big: true },
  { id: 'xwing', name: 'X-Wing', icon: '✈️', price: 5500, image: '', sound: '', category: 'Big Gifts', rarity: 'epic', animation: 'grand', big: true },
  { id: 'cow', name: 'Cow', icon: '🐄', price: 120, image: '', sound: '', category: 'Animals', rarity: 'rare', animation: 'bounce', big: false },
  { id: 'whale', name: 'Whale', icon: '🐋', price: 900, image: '', sound: '', category: 'Animals', rarity: 'rare', animation: 'float', big: false },
  { id: 'horse', name: 'Horse', icon: '🐎', price: 350, image: '', sound: '', category: 'Animals', rarity: 'rare', animation: 'bounce', big: false },
  { id: 'spider', name: 'Spider', icon: '🕷️', price: 40, image: '', sound: '', category: 'Animals', rarity: 'common', animation: 'bounce', big: false },
  { id: 'wolf', name: 'Wolf', icon: '🐺', price: 600, image: '', sound: '', category: 'Animals', rarity: 'rare', animation: 'bounce', big: false },
  { id: 'shark', name: 'Shark', icon: '🦈', price: 1200, image: '', sound: '', category: 'Animals', rarity: 'epic', animation: 'grand', big: false },
  { id: 'bunny', name: 'Bunny', icon: '🐰', price: 50, image: '', sound: '', category: 'Animals', rarity: 'common', animation: 'bounce', big: false },
  { id: 'stag', name: 'Stag', icon: '🦌', price: 400, image: '', sound: '', category: 'Animals', rarity: 'rare', animation: 'bounce', big: false }
];

const CATEGORIES = ['All', 'Popular', 'Recent', 'Favorites', 'Animals', 'Food', 'Vehicles', 'Luxury', 'Special', 'Big Gifts'];

const getStoredFavorites = () => {
  try {
    const value = localStorage.getItem('made_universe_gift_favorites');
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const getStoredRecent = () => {
  try {
    const value = localStorage.getItem('made_universe_recent_gifts');
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const GiftVisual = ({ gift, lowData }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [gift.image]);

  if (!gift.image || failed || lowData) {
    return <span className={`text-4xl select-none ${gift.big ? 'scale-110' : ''}`}>{gift.icon}</span>;
  }

  return <img src={gift.image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="w-12 h-12 object-contain select-none" />;
};

const GiftPanel = ({ streamId, onClose, onGiftSent }) => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const audioRef = useRef(null);
  const lastSendRef = useRef(0);
  const sendLockRef = useRef(false);

  const [balance, setBalance] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [favorites, setFavorites] = useState(getStoredFavorites);
  const [recent, setRecent] = useState(getStoredRecent);
  const [popular, setPopular] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lowData, setLowData] = useState(() => {
    try {
      return localStorage.getItem('made_universe_low_data') === 'true';
    } catch {
      return false;
    }
  });
  const [confirmGift, setConfirmGift] = useState(null);
  const [error, setError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [sendProgress, setSendProgress] = useState('');
  const [categoryStart, setCategoryStart] = useState(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('made_universe_gift_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('made_universe_recent_gifts', JSON.stringify(recent.slice(0, 20)));
      localStorage.setItem('made_universe_low_data', String(lowData));
    } catch {}
  }, [recent, lowData]);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please log in again.');
      const { data, error: balanceError } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
      if (balanceError) throw balanceError;
      if (mountedRef.current) setBalance(Number(data?.coins) || 0);
    } catch (err) {
      console.error('Gift balance error:', err);
      if (mountedRef.current) setError(err.message || 'Unable to load your coin balance.');
    } finally {
      if (mountedRef.current) setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    const loadPopular = async () => {
      try {
        const { data, error: popularError } = await supabase.from('live_gifts').select('gift_id').limit(500);
        if (popularError || !data) return;
        const counts = {};
        data.forEach(row => {
          counts[row.gift_id] = (counts[row.gift_id] || 0) + 1;
        });
        setPopular(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id]) => id));
      } catch (err) {
        console.warn('Popular gifts unavailable:', err);
      }
    };
    loadPopular();
  }, []);

  const filteredGifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = [...GIFTS];

    if (category === 'Popular') {
      const rank = new Map(popular.map((id, index) => [id, index]));
      list.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
    } else if (category === 'Recent') {
      const rank = new Map(recent.map((id, index) => [id, index]));
      list.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
    } else if (category === 'Favorites') {
      list = list.filter(gift => favorites.includes(gift.id));
    } else if (category !== 'All') {
      list = list.filter(gift => gift.category === category);
    }

    if (term) list = list.filter(gift => `${gift.name} ${gift.category} ${gift.rarity}`.toLowerCase().includes(term));
    return list;
  }, [category, search, popular, recent, favorites]);

  const toggleFavorite = useCallback((giftId) => {
    setFavorites(prev => prev.includes(giftId) ? prev.filter(id => id !== giftId) : [giftId, ...prev]);
  }, []);

  const playGiftSound = useCallback(async (gift) => {
    if (!soundEnabled || !gift?.sound) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(gift.sound);
      audio.preload = 'none';
      audio.volume = gift.big ? 1 : 0.75;
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.warn('Gift audio unavailable or blocked:', err);
    }
  }, [soundEnabled]);

  const performGiftTransaction = useCallback(async (gift, total, quantityValue) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Authentication error. Please log in again.');

    if (typeof supabase.rpc === 'function') {
      const { data: rpcData, error: rpcError } = await supabase.rpc('send_live_gift', {
        p_stream_id: streamId,
        p_gift_id: String(gift.id),
        p_gift_name: String(gift.name),
        p_icon: String(gift.icon),
        p_quantity: quantityValue,
        p_price_total: total
      });

      if (!rpcError) {
        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (result?.success === false) throw new Error(result.message || 'Gift transaction failed.');
        return { user, atomic: true, result };
      }

      if (!/function .*send_live_gift.*does not exist|could not find the function|not found/i.test(rpcError.message || '')) {
        throw rpcError;
      }
    }

    const { data: stream, error: streamError } = await supabase.from('live_streams').select('id,status').eq('id', streamId).maybeSingle();
    if (streamError) throw streamError;
    if (!stream) throw new Error('This live stream is unavailable.');
    if (stream.status && !['live', 'active', 'started'].includes(String(stream.status).toLowerCase())) throw new Error('This live stream is no longer active.');

    const { data: profile, error: profileError } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
    if (profileError) throw profileError;

    const serverBalance = Number(profile?.coins) || 0;
    if (serverBalance < total) throw new Error('Not enough coins to send this gift.');

    const { error: insertError } = await supabase.from('live_gifts').insert({
      stream_id: streamId,
      sender_id: user.id,
      gift_id: String(gift.id),
      gift_name: String(gift.name),
      icon: String(gift.icon),
      price_total: total,
      quantity: quantityValue
    });
    if (insertError) throw insertError;

    const { error: updateError } = await supabase.from('profiles').update({ coins: serverBalance - total }).eq('id', user.id).gte('coins', total);
    if (updateError) throw updateError;

    return { user, atomic: false };
  }, [streamId]);

  const sendGift = useCallback(async (gift, quantityValue = quantity) => {
    if (sendLockRef.current || isSending) return;
    if (!gift || !streamId) {
      setError('This stream is unavailable.');
      return;
    }

    const safeQuantity = Math.max(1, Math.min(100, Number(quantityValue) || 1));
    const total = Number(gift.price) * safeQuantity;
    const now = Date.now();

    if (now - lastSendRef.current < 900) {
      setError('Please wait a moment before sending another gift.');
      return;
    }

    if (total > Number(balance)) {
      setError(`You need ${total.toLocaleString()} coins, but only have ${Number(balance).toLocaleString()}.`);
      return;
    }

    if (total >= 5000 && !confirmGift) {
      setConfirmGift({ gift, quantity: safeQuantity, total });
      return;
    }

    sendLockRef.current = true;
    lastSendRef.current = now;
    setIsSending(true);
    setError('');
    setSendProgress('Sending gift...');

    try {
      const result = await performGiftTransaction(gift, total, safeQuantity);

      if (mountedRef.current) {
        setBalance(prev => Math.max(0, Number(prev) - total));
        setRecent(prev => [gift.id, ...prev.filter(id => id !== gift.id)].slice(0, 20));
      }

      await playGiftSound(gift);

      if (typeof onClose === 'function') onClose();

      if (typeof onGiftSent === 'function') {
        const payload = { ...gift, quantity: safeQuantity, price_total: total, sender_id: result.user.id, transaction_atomic: result.atomic };
        setTimeout(() => {
          if (mountedRef.current || typeof onGiftSent === 'function') onGiftSent(payload);
        }, 100);
      }
    } catch (err) {
      console.error('Gift transaction error:', err);
      if (mountedRef.current) setError(err.message || 'Failed to send gift. Your coins were not intentionally charged.');
    } finally {
      if (mountedRef.current) {
        setIsSending(false);
        setSendProgress('');
        setConfirmGift(null);
      }
      sendLockRef.current = false;
    }
  }, [balance, confirmGift, isSending, onClose, onGiftSent, performGiftTransaction, playGiftSound, quantity, streamId]);

  const quantityOptions = [1, 5, 10, 50, 100];
  const visibleCategories = CATEGORIES.slice(categoryStart, categoryStart + 5);

  return (
    <div className="flex flex-col bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2rem] p-4 h-[68vh] max-h-[720px] text-white relative z-50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 bg-yellow-400/10 px-3 py-1.5 rounded-l-full border border-yellow-400/20">
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-black truncate">{balanceLoading ? '...' : Number(balance).toLocaleString()}</span>
          </div>
          <button type="button" onClick={() => navigate('/live/recharge')} className="flex items-center gap-1 bg-yellow-400 px-3 py-1.5 rounded-r-full border border-yellow-400 active:scale-95 transition-all">
            <Plus size={14} className="text-black" />
            <span className="text-[10px] font-black text-black uppercase">Recharge</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setLowData(prev => !prev)} className={`p-2 rounded-full border transition ${lowData ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300' : 'bg-white/5 border-white/10 text-white/60'}`} aria-label="Toggle low data mode">
            <span className="text-[9px] font-black">DATA</span>
          </button>
          <button type="button" onClick={() => setSoundEnabled(prev => !prev)} className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70" aria-label={soundEnabled ? 'Mute gift sounds' : 'Enable gift sounds'}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button type="button" onClick={onClose} className="p-2 opacity-60 hover:opacity-100" aria-label="Close gifts"><X size={20} /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <Search size={16} className="text-white/40 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gifts..." aria-label="Search gifts" className="w-full bg-transparent outline-none text-sm placeholder:text-white/30" />
          {search && <button type="button" onClick={() => setSearch('')} className="text-white/40"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-3 overflow-hidden">
        <button type="button" onClick={() => setCategoryStart(Math.max(0, categoryStart - 1))} disabled={categoryStart === 0} className="p-1.5 rounded-lg bg-white/5 disabled:opacity-20"><ChevronLeft size={16} /></button>
        <div className="flex gap-1 flex-1 overflow-hidden">
          {visibleCategories.map(item => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ${category === item ? 'bg-yellow-400 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{item}</button>
          ))}
        </div>
        <button type="button" onClick={() => setCategoryStart(Math.min(CATEGORIES.length - 5, categoryStart + 1))} disabled={categoryStart >= CATEGORIES.length - 5} className="p-1.5 rounded-lg bg-white/5 disabled:opacity-20"><ChevronRight size={16} /></button>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Gift size={15} className="text-yellow-400" />
          <span className="text-xs font-bold">{category}</span>
          <span className="text-[10px] text-white/30">{filteredGifts.length} gifts</span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
          {quantityOptions.map(value => (
            <button key={value} type="button" onClick={() => setQuantity(value)} className={`px-2 py-1 rounded-full text-[9px] font-black ${quantity === value ? 'bg-yellow-400 text-black' : 'text-white/50'}`}>{value}×</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <ShieldCheck size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {sendProgress && (
        <div className="flex items-center justify-center gap-2 py-2 text-yellow-300 text-xs font-bold">
          <Loader2 size={14} className="animate-spin" />
          {sendProgress}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
        {filteredGifts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30">
            <Gift size={34} className="mb-2" />
            <p className="text-sm">No gifts found</p>
            {category === 'Favorites' && <p className="text-xs mt-1">Tap the heart on a gift to save it.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {filteredGifts.map(gift => {
              const total = gift.price * quantity;
              const affordable = Number(balance) >= total;
              const favorite = favorites.includes(gift.id);

              return (
                <div key={gift.id} className={`relative rounded-2xl border transition-all ${affordable ? 'bg-white/5 border-white/5 hover:border-yellow-400/40' : 'bg-white/[0.02] border-transparent opacity-45'}`}>
                  <button type="button" onClick={() => sendGift(gift)} disabled={isSending || !affordable} className="w-full flex flex-col items-center p-2.5 active:scale-95 transition-transform disabled:cursor-not-allowed" aria-label={`Send ${gift.name} for ${total} coins`}>
                    <div className={`w-16 h-16 flex items-center justify-center rounded-xl bg-white/[0.03] ${gift.big ? 'ring-1 ring-yellow-400/20' : ''}`}>
                      <GiftVisual gift={gift} lowData={lowData} />
                    </div>
                    <span className="text-[10px] font-semibold mt-1.5 truncate w-full text-center">{gift.name}</span>
                    <span className="text-[11px] font-black text-yellow-400">{total.toLocaleString()} <span className="text-[8px] opacity-60">COINS</span></span>
                    {quantity > 1 && <span className="text-[8px] text-white/35">{quantity}× {gift.price}</span>}
                    {gift.big && <span className="mt-1 flex items-center gap-0.5 text-[7px] font-black uppercase text-yellow-300"><Sparkles size={8} /> Big gift</span>}
                  </button>
                  <button type="button" onClick={() => toggleFavorite(gift.id)} className={`absolute top-1.5 right-1.5 p-1 rounded-full ${favorite ? 'text-red-400 bg-red-400/10' : 'text-white/25 bg-black/20'}`} aria-label={favorite ? `Remove ${gift.name} from favorites` : `Add ${gift.name} to favorites`}>
                    <Heart size={11} fill={favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/35">
        <span>{lowData ? 'Low-data mode' : 'Standard media mode'} • {soundEnabled ? 'Sound on' : 'Sound muted'}</span>
        <span>{quantity}× selected</span>
      </div>

      {confirmGift && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-5">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-yellow-400/20 p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-3xl">{confirmGift.gift.icon}</div>
              <div>
                <h3 className="font-black">{confirmGift.gift.name}</h3>
                <p className="text-xs text-white/40">{confirmGift.quantity}× gift</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm"><span className="text-white/50">Total cost</span><strong className="text-yellow-400">{confirmGift.total.toLocaleString()} coins</strong></div>
              <div className="flex justify-between text-sm"><span className="text-white/50">Remaining</span><strong>{Math.max(0, Number(balance) - confirmGift.total).toLocaleString()} coins</strong></div>
            </div>
            <p className="text-xs text-white/40 mb-4">This is a high-value gift. Confirm before sending.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmGift(null)} className="py-3 rounded-xl bg-white/5 text-sm font-bold">Cancel</button>
              <button type="button" onClick={() => sendGift(confirmGift.gift, confirmGift.quantity)} disabled={isSending} className="py-3 rounded-xl bg-yellow-400 text-black text-sm font-black disabled:opacity-50">{isSending ? 'Sending...' : 'Confirm gift'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftPanel;
