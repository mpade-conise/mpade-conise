import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
ChevronLeft, Sparkles, Zap, Coins, Loader2, ShieldCheck, CreditCard,
Trophy, Orbit, CheckCircle2, XCircle, Clock3, Smartphone, RefreshCw,
AlertTriangle, WifiOff, ArrowRight, LockKeyhole, CircleDollarSign
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const Recharge = () => {
const navigate = useNavigate();

const [loadingProfile, setLoadingProfile] = useState(true);
const [loading, setLoading] = useState(false);
const [userProfile, setUserProfile] = useState(null);
const [selectedPackage, setSelectedPackage] = useState(null);
const [paymentStage, setPaymentStage] = useState('idle');
const [paymentMessage, setPaymentMessage] = useState('');
const [chargeId, setChargeId] = useState('');
const [paymentError, setPaymentError] = useState('');
const [paymentResult, setPaymentResult] = useState(null);
const [offline, setOffline] = useState(!navigator.onLine);
const [selectedProvider, setSelectedProvider] = useState('');
const [customPhone, setCustomPhone] = useState('');
const [showPhoneEditor, setShowPhoneEditor] = useState(false);

const coinPackages = useMemo(() => [
{
id: 1,
coins: 500,
bonus: 0,
price: 1000,
label: 'Starter',
icon: <Zap size={20} />,
color: 'from-blue-400 to-blue-600',
description: 'Perfect for beginners'
},
{
id: 2,
coins: 1500,
bonus: 0,
price: 2500,
label: 'Popular',
icon: <Sparkles size={20} />,
recommended: true,
color: 'from-cyan-400 to-cyan-600',
description: 'Most chosen by users'
},
{
id: 3,
coins: 5000,
bonus: 0,
price: 7500,
label: 'Pro',
icon: <Coins size={20} />,
color: 'from-purple-500 to-indigo-600',
description: 'Best value for active users'
},
{
id: 4,
coins: 12000,
bonus: 2000,
price: 15000,
label: 'Elite',
icon: <Trophy size={20} />,
color: 'from-amber-400 to-orange-600',
description: 'Includes 2,000 bonus coins'
},
{
id: 5,
coins: 30000,
bonus: 0,
price: 35000,
label: 'Universe',
icon: <Orbit size={20} />,
color: 'from-pink-500 to-rose-600',
description: 'Ultimate power for active users'
}
], []);

const selectedTotalCoins = selectedPackage
? selectedPackage.coins + selectedPackage.bonus
: 0;

const profileCoins = Number(userProfile?.coins || 0);
const savedPhone = userProfile?.phone || userProfile?.phone_number || '';
const activePhone = customPhone.trim() || savedPhone;

const normalizePhone = value => String(value || '').replace(/\s+/g, '').trim();

const isValidPhone = value => {
const phone = normalizePhone(value);
return /^(?:+265|265|0)?[89]\d{8}$/.test(phone);
};

const fetchProfile = useCallback(async () => {
setLoadingProfile(true);

```
try {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    setUserProfile(null);
    navigate('/login');
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  setUserProfile(data);

  const savedProvider = String(data?.mobile_provider || '').trim().toUpperCase();

  if (savedProvider === 'AIRTEL' || savedProvider === 'TNM') {
    setSelectedProvider(savedProvider);
  } else {
    setSelectedProvider('TNM');
  }
} catch (error) {
  console.error('Profile loading error:', error);
  setPaymentError(error?.message || 'Unable to load your Universe Bank profile.');
} finally {
  setLoadingProfile(false);
}
```

}, [navigate]);

useEffect(() => {
fetchProfile();
}, [fetchProfile]);

useEffect(() => {
const online = () => setOffline(false);
const offlineHandler = () => setOffline(true);

```
window.addEventListener('online', online);
window.addEventListener('offline', offlineHandler);

return () => {
  window.removeEventListener('online', online);
  window.removeEventListener('offline', offlineHandler);
};
```

}, []);

const resetPayment = () => {
setLoading(false);
setSelectedPackage(null);
setPaymentStage('idle');
setPaymentMessage('');
setChargeId('');
setPaymentError('');
setPaymentResult(null);
};

const refreshBalance = async () => {
if (!userProfile?.id) return;

```
try {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userProfile.id)
    .single();

  if (error) throw error;

  setUserProfile(data);
} catch (error) {
  console.error('Balance refresh error:', error);
}
```

};

const handlePackageSelect = pkg => {
if (loading || loadingProfile || offline) return;

```
setPaymentError('');
setPaymentResult(null);
setSelectedPackage(pkg);

const provider = String(
  userProfile?.mobile_provider || selectedProvider || 'TNM'
).toUpperCase();

setSelectedProvider(provider === 'AIRTEL' ? 'AIRTEL' : 'TNM');
```

};

const handlePurchase = async () => {
if (loading || !selectedPackage || !userProfile) return;

```
if (offline) {
  setPaymentError('You are offline. Please reconnect before starting payment.');
  return;
}

const mobileNumber = normalizePhone(activePhone);
const mobileProvider = String(selectedProvider || '').toUpperCase();

if (!mobileNumber) {
  setShowPhoneEditor(true);
  setPaymentError('Enter a mobile-money number before continuing.');
  return;
}

if (!isValidPhone(mobileNumber)) {
  setShowPhoneEditor(true);
  setPaymentError('Please enter a valid Malawi mobile-money number.');
  return;
}

if (!['AIRTEL', 'TNM'].includes(mobileProvider)) {
  setPaymentError('Please select Airtel Money or TNM Mpamba.');
  return;
}

setLoading(true);
setPaymentError('');
setPaymentResult(null);
setPaymentStage('initializing');
setPaymentMessage('Preparing your secure payment request...');

try {
  const { data: paymentData, error: paymentErrorResponse } =
    await supabase.functions.invoke('process-payment', {
      body: {
        packageId: selectedPackage.id,
        mobileNumber,
        mobileProvider
      }
    });

  if (paymentErrorResponse) throw paymentErrorResponse;

  if (!paymentData?.success || !paymentData?.chargeId) {
    throw new Error(
      paymentData?.error || 'Payment initialization failed.'
    );
  }

  const currentChargeId = paymentData.chargeId;

  setChargeId(currentChargeId);
  setPaymentStage('awaiting');
  setPaymentMessage(
    `Approve the K${selectedPackage.price.toLocaleString()} payment request on your ${mobileProvider === 'AIRTEL' ? 'Airtel Money' : 'TNM Mpamba'} phone.`
  );

  let verified = false;
  let lastVerificationMessage = '';

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!navigator.onLine) {
      setPaymentStage('pending');
      setPaymentMessage(
        'Your payment request was already sent. Reconnect to continue verification.'
      );
      continue;
    }

    setPaymentStage('verifying');
    setPaymentMessage(
      `Verifying payment... ${attempt + 1}/10`
    );

    try {
      const {
        data: verifyData,
        error: verifyError
      } = await supabase.functions.invoke('verify-payment', {
        body: {
          chargeId: currentChargeId
        }
      });

      if (verifyError) {
        lastVerificationMessage = verifyError.message;
        continue;
      }

      if (verifyData?.success) {
        verified = true;

        const creditedCoins = Number(
          verifyData?.coins ||
          verifyData?.coins_added ||
          verifyData?.credited_coins ||
          selectedTotalCoins
        );

        setPaymentResult({
          chargeId: currentChargeId,
          coins: creditedCoins,
          amount: selectedPackage.price
        });

        setPaymentStage('success');
        setPaymentMessage(
          `${creditedCoins.toLocaleString()} coins have been credited to your Universe account.`
        );

        await refreshBalance();
        break;
      }

      const status = String(verifyData?.status || '').toLowerCase();

      if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
        throw new Error(
          verifyData?.message || 'Payment was not completed.'
        );
      }

      lastVerificationMessage = verifyData?.message || 'Payment is still pending.';
    } catch (verificationError) {
      const message = verificationError?.message || '';

      if (
        message.toLowerCase().includes('cancel') ||
        message.toLowerCase().includes('failed')
      ) {
        throw verificationError;
      }

      lastVerificationMessage = message || lastVerificationMessage;
    }
  }

  if (!verified) {
    setPaymentStage('pending');
    setPaymentMessage(
      lastVerificationMessage ||
      'Your payment is still being processed. Please do not submit the payment again.'
    );
  }
} catch (error) {
  console.error('Payment Error:', error);

  setPaymentStage('error');
  setPaymentError(
    error?.message ||
    'Could not start the payment. Please try again.'
  );
} finally {
  setLoading(false);
}
```

};

const handleRetryPayment = () => {
if (!selectedPackage) return;

```
setPaymentStage('idle');
setPaymentError('');
setPaymentMessage('');
setPaymentResult(null);
setChargeId('');
```

};

const closePaymentModal = () => {
if (loading) return;

```
if (paymentStage === 'success') {
  resetPayment();
  return;
}

setSelectedPackage(null);
setPaymentStage('idle');
setPaymentMessage('');
setPaymentError('');
setPaymentResult(null);
setChargeId('');
```

};

const displayPhone = value => {
const phone = normalizePhone(value);

```
if (!phone) return 'No number saved';

if (phone.length > 6) {
  return `${phone.slice(0, 4)} •••• ${phone.slice(-3)}`;
}

return phone;
```

};

const paymentStatusTitle = {
initializing: 'Preparing Payment',
awaiting: 'Approve on Your Phone',
verifying: 'Verifying Payment',
pending: 'Payment Pending',
success: 'Payment Successful',
error: 'Payment Failed'
};

if (loadingProfile) {
return ( <div className="min-h-screen bg-black text-white flex items-center justify-center"> <div className="flex flex-col items-center"> <Loader2 size={42} className="animate-spin text-cyan-400" /> <p className="mt-5 text-[9px] font-black uppercase tracking-[.35em] text-cyan-400">
Opening Universe Bank </p> </div> </div>
);
}

return ( <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden"> <style>{`
@keyframes bank-glow {
0%,100% { box-shadow: 0 0 18px rgba(6,182,212,.12); }
50% { box-shadow: 0 0 32px rgba(6,182,212,.25); }
}

```
    @keyframes coin-pulse {
      0%,100% { transform: scale(1); opacity: .8; }
      50% { transform: scale(1.04); opacity: 1; }
    }

    .bank-card {
      animation: bank-glow 4s ease-in-out infinite;
    }

    .coin-value {
      animation: coin-pulse 3s ease-in-out infinite;
    }

    .bank-scroll::-webkit-scrollbar {
      width: 5px;
    }

    .bank-scroll::-webkit-scrollbar-track {
      background: rgba(255,255,255,.03);
    }

    .bank-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(#00f2ff,#7000ff,#ff0055);
      border-radius: 999px;
    }

    .bank-scroll {
      scrollbar-width: thin;
      scrollbar-color: #7000ff rgba(255,255,255,.03);
    }
  `}</style>

  <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[550px] bg-gradient-to-b from-cyan-900/20 via-purple-900/5 to-transparent pointer-events-none" />

  <nav className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-6 py-4 bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
    <motion.button
      whileTap={{ scale: .9 }}
      onClick={() => navigate(-1)}
      className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08]"
      aria-label="Go back"
    >
      <ChevronLeft size={22} />
    </motion.button>

    <div className="text-center">
      <span className="block text-[10px] font-black uppercase tracking-[.4em] text-cyan-400">
        Universe Bank
      </span>
      <span className="block text-[7px] font-bold uppercase tracking-[.25em] text-zinc-700 mt-1">
        Secure Coin Wallet
      </span>
    </div>

    <button
      type="button"
      onClick={refreshBalance}
      className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white"
      aria-label="Refresh balance"
    >
      <RefreshCw size={15} />
    </button>
  </nav>

  <main className="relative z-10 max-w-xl mx-auto px-5 sm:px-6 pt-7 pb-28 bank-scroll">
    {offline && (
      <div className="mb-5 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3 flex items-center gap-3">
        <WifiOff size={16} className="text-orange-400 shrink-0" />
        <p className="text-[8px] font-bold uppercase tracking-wider text-orange-300">
          You're offline. Payments are unavailable until connection returns.
        </p>
      </div>
    )}

    <section className="bank-card relative overflow-hidden rounded-[35px] border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-zinc-950 to-black p-6 sm:p-8">
      <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -left-16 -bottom-16 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-[.3em] text-zinc-500 font-black">
              Available Balance
            </p>
            <div className="coin-value mt-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-600 flex items-center justify-center text-black shadow-[0_0_25px_rgba(251,191,36,.3)]">
                <Coins size={21} />
              </div>
              <span className="text-4xl font-black tracking-tighter">
                {profileCoins.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end text-cyan-400">
              <LockKeyhole size={12} />
              <span className="text-[7px] font-black uppercase tracking-widest">
                Secure
              </span>
            </div>
            <p className="mt-2 text-[7px] text-zinc-700 uppercase tracking-wider">
              Universe Coins
            </p>
          </div>
        </div>
      </div>
    </section>

    <header className="mt-10 mb-7">
      <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">
        <ShieldCheck size={12} className="text-cyan-400" />
        <span className="text-[8px] font-black uppercase text-cyan-400 tracking-widest">
          Verified Checkout
        </span>
      </div>

      <h1 className="mt-4 text-4xl sm:text-5xl font-black italic tracking-tighter">
        Recharge <span className="text-cyan-400">Coins</span>
      </h1>

      <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
        Add Universe Coins using Airtel Money or TNM Mpamba.
        Your balance is credited after payment verification.
      </p>
    </header>

    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-300">
            Payment Method
          </h2>
          <p className="text-[8px] text-zinc-700 mt-1">
            Choose the mobile-money account to charge
          </p>
        </div>

        <Smartphone size={16} className="text-zinc-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {['AIRTEL', 'TNM'].map(provider => (
          <button
            key={provider}
            type="button"
            onClick={() => setSelectedProvider(provider)}
            className={`relative rounded-2xl border p-4 text-left transition-all ${
              selectedProvider === provider
                ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,.1)]'
                : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.05]'
            }`}
          >
            {selectedProvider === provider && (
              <CheckCircle2
                size={14}
                className="absolute right-3 top-3 text-cyan-400"
              />
            )}

            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[8px] font-black ${
              provider === 'AIRTEL'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-green-500/15 text-green-400'
            }`}>
              {provider === 'AIRTEL' ? 'A' : 'T'}
            </div>

            <p className="mt-3 text-[9px] font-black uppercase tracking-wider">
              {provider === 'AIRTEL' ? 'Airtel Money' : 'TNM Mpamba'}
            </p>

            <p className="mt-1 text-[8px] text-zinc-600 truncate">
              {displayPhone(customPhone || savedPhone)}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowPhoneEditor(value => !value)}
        className="mt-3 text-[8px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-300"
      >
        {showPhoneEditor ? 'Use saved number' : 'Use another number'}
      </button>

      {showPhoneEditor && (
        <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
            Mobile Money Number
          </label>

          <input
            type="tel"
            value={customPhone}
            onChange={event => {
              setCustomPhone(event.target.value);
              setPaymentError('');
            }}
            placeholder="e.g. 0991234567"
            className="mt-2 w-full h-11 rounded-xl bg-black border border-white/[0.08] px-4 text-sm outline-none focus:border-cyan-500/50"
          />

          <p className="mt-2 text-[7px] text-zinc-700">
            The number is used only for this payment request.
          </p>
        </div>
      )}
    </section>

    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-300">
            Choose a Package
          </h2>
          <p className="text-[8px] text-zinc-700 mt-1">
            Select the amount of coins you want
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {coinPackages.map(pkg => {
          const totalCoins = pkg.coins + pkg.bonus;
          const selected = selectedPackage?.id === pkg.id;

          return (
            <motion.button
              key={pkg.id}
              type="button"
              whileTap={{ scale: .985 }}
              onClick={() => handlePackageSelect(pkg)}
              disabled={loading || offline}
              className={`relative w-full overflow-hidden text-left p-5 sm:p-6 rounded-[28px] border transition-all disabled:opacity-50 ${
                selected
                  ? 'border-cyan-400/70 bg-cyan-500/[0.08] shadow-[0_0_30px_rgba(6,182,212,.13)]'
                  : pkg.recommended
                    ? 'border-cyan-500/30 bg-zinc-900/80'
                    : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.12]'
              }`}
            >
              {pkg.recommended && (
                <div className="absolute top-0 right-6 bg-cyan-400 text-black text-[7px] font-black px-3 py-1 rounded-b-lg uppercase tracking-widest">
                  Popular
                </div>
              )}

              {selected && (
                <div className="absolute right-5 bottom-5">
                  <CheckCircle2 size={18} className="text-cyan-400" />
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  {pkg.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black italic tracking-tight">
                      {pkg.coins.toLocaleString()} Coins
                    </h3>

                    {pkg.bonus > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[7px] font-black uppercase text-amber-400">
                        +{pkg.bonus.toLocaleString()} Bonus
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[8px] text-zinc-600 uppercase font-bold tracking-widest">
                    {pkg.label} Bundle
                  </p>

                  <p className="mt-1 text-[8px] text-zinc-700">
                    {pkg.description}
                  </p>

                  {pkg.bonus > 0 && (
                    <p className="mt-2 text-[8px] font-black text-amber-400">
                      Total: {totalCoins.toLocaleString()} coins
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 pr-1">
                  <p className="text-xl sm:text-2xl font-black tracking-tighter">
                    K{pkg.price.toLocaleString()}
                  </p>
                  <p className="text-[7px] text-zinc-700 font-black uppercase tracking-widest">
                    MWK
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>

    {paymentError && paymentStage === 'idle' && (
      <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
        <p className="text-[8px] leading-relaxed text-red-300">
          {paymentError}
        </p>
      </div>
    )}

    <section className="mt-10 rounded-[28px] border border-white/[0.05] bg-gradient-to-br from-zinc-900 to-black p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <CreditCard size={18} className="text-zinc-500" />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-widest">
            Secure Payment
          </p>
          <p className="text-[8px] text-zinc-600 mt-1">
            Powered by PayChangu
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="text-center">
          <ShieldCheck size={15} className="mx-auto text-cyan-500/60" />
          <p className="mt-2 text-[7px] text-zinc-600 uppercase font-bold">
            Verified
          </p>
        </div>

        <div className="text-center">
          <LockKeyhole size={15} className="mx-auto text-cyan-500/60" />
          <p className="mt-2 text-[7px] text-zinc-600 uppercase font-bold">
            Protected
          </p>
        </div>

        <div className="text-center">
          <CircleDollarSign size={15} className="mx-auto text-cyan-500/60" />
          <p className="mt-2 text-[7px] text-zinc-600 uppercase font-bold">
            MWK
          </p>
        </div>
      </div>
    </section>
  </main>

  <AnimatePresence>
    {selectedPackage && paymentStage === 'idle' && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
        onClick={closePaymentModal}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          onClick={event => event.stopPropagation()}
          className="w-full max-w-md rounded-[30px] border border-white/[0.08] bg-[#090909] p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-[.25em] text-cyan-400 font-black">
                Confirm Recharge
              </p>
              <h2 className="mt-2 text-2xl font-black italic tracking-tight">
                Universe Bank
              </h2>
            </div>

            <button
              type="button"
              onClick={closePaymentModal}
              className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-500 hover:text-white"
            >
              <XCircle size={17} />
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-white/[0.035] border border-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] text-zinc-600 uppercase font-bold">
                  Package
                </p>
                <p className="mt-1 text-lg font-black">
                  {selectedPackage.coins.toLocaleString()} Coins
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black">
                  K{selectedPackage.price.toLocaleString()}
                </p>
                <p className="text-[7px] text-zinc-600 uppercase font-black">
                  MWK
                </p>
              </div>
            </div>

            {selectedPackage.bonus > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">
                  Bonus
                </span>
                <span className="text-[9px] text-amber-400 font-black">
                  +{selectedPackage.bonus.toLocaleString()} Coins
                </span>
              </div>
            )}

            <div className="mt-3 flex justify-between">
              <span className="text-[8px] text-zinc-500 uppercase font-bold">
                Total credit
              </span>
              <span className="text-[10px] text-white font-black">
                {selectedTotalCoins.toLocaleString()} Coins
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <Smartphone size={15} className="text-cyan-400" />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-zinc-600 uppercase font-bold">
                  Payment account
                </p>
                <p className="mt-1 text-[9px] font-black uppercase">
                  {selectedProvider === 'AIRTEL' ? 'Airtel Money' : 'TNM Mpamba'}
                </p>
                <p className="text-[8px] text-zinc-600">
                  {displayPhone(activePhone)}
                </p>
              </div>
            </div>
          </div>

          {paymentError && (
            <div className="mt-4 rounded-xl bg-red-500/[0.06] border border-red-500/20 p-3">
              <p className="text-[8px] text-red-300 leading-relaxed">
                {paymentError}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={loading || offline}
            className="mt-5 w-full h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[9px] uppercase tracking-[.18em] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            Confirm Payment
            <ArrowRight size={13} />
          </button>

          <p className="mt-4 text-center text-[7px] text-zinc-700 leading-relaxed">
            You will receive a payment request on your selected mobile-money account.
            Coins are credited only after payment verification.
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  <AnimatePresence>
    {selectedPackage && paymentStage !== 'idle' && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-5"
      >
        <motion.div
          initial={{ opacity: 0, scale: .96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-[32px] border border-white/[0.08] bg-[#080808] p-7 text-center"
        >
          {paymentStage === 'initializing' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Loader2 size={30} className="text-cyan-400 animate-spin" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase">
                {paymentStatusTitle.initializing}
              </h2>
            </>
          )}

          {paymentStage === 'awaiting' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Smartphone size={28} className="text-cyan-400" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase">
                {paymentStatusTitle.awaiting}
              </h2>
            </>
          )}

          {paymentStage === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center">
                <RefreshCw size={28} className="text-purple-400 animate-spin" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase">
                {paymentStatusTitle.verifying}
              </h2>
            </>
          )}

          {paymentStage === 'pending' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock3 size={28} className="text-amber-400" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase">
                {paymentStatusTitle.pending}
              </h2>
            </>
          )}

          {paymentStage === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,.15)]">
                <CheckCircle2 size={34} className="text-green-400" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase text-green-400">
                {paymentStatusTitle.success}
              </h2>
            </>
          )}

          {paymentStage === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle size={34} className="text-red-400" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase text-red-400">
                {paymentStatusTitle.error}
              </h2>
            </>
          )}

          <p className="mt-4 text-[9px] leading-relaxed text-zinc-500">
            {paymentStage === 'success'
              ? paymentMessage
              : paymentStage === 'error'
                ? paymentError
                : paymentMessage}
          </p>

          {chargeId && (
            <div className="mt-5 rounded-xl bg-white/[0.025] border border-white/[0.05] p-3">
              <p className="text-[7px] text-zinc-700 uppercase tracking-widest font-black">
                Payment Reference
              </p>
              <p className="mt-1 text-[8px] text-zinc-500 font-mono break-all">
                {chargeId}
              </p>
            </div>
          )}

          {paymentResult && paymentStage === 'success' && (
            <div className="mt-4 rounded-2xl bg-green-500/[0.05] border border-green-500/15 p-4">
              <p className="text-[7px] text-zinc-600 uppercase font-black tracking-widest">
                Coins Credited
              </p>
              <p className="mt-1 text-2xl font-black text-green-400">
                +{Number(paymentResult.coins || 0).toLocaleString()}
              </p>
            </div>
          )}

          {paymentStage === 'pending' && (
            <div className="mt-5 rounded-2xl bg-amber-500/[0.05] border border-amber-500/15 p-4">
              <div className="flex items-start gap-3 text-left">
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                <p className="text-[8px] leading-relaxed text-amber-300">
                  Do not submit another payment for this purchase while
                  this transaction is still being processed.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {paymentStage === 'error' && (
              <button
                type="button"
                onClick={handleRetryPayment}
                className="flex-1 h-11 rounded-full bg-white text-black text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            )}

            {(paymentStage === 'success' || paymentStage === 'pending' || paymentStage === 'error') && (
              <button
                type="button"
                onClick={closePaymentModal}
                className="flex-1 h-11 rounded-full bg-white/[0.06] border border-white/[0.08] text-white text-[8px] font-black uppercase tracking-widest"
              >
                {paymentStage === 'success' ? 'Done' : 'Close'}
              </button>
            )}
          </div>

          {paymentStage === 'success' && (
            <button
              type="button"
              onClick={() => {
                resetPayment();
                refreshBalance();
              }}
              className="mt-3 text-[8px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
            >
              Recharge More
            </button>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
</div>


);
};

export default Recharge;
