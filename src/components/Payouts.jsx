import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  Wallet,
  Loader2,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Phone,
  ShieldCheck
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const Payout = () => {
  const navigate = useNavigate();

  const [coins, setCoins] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [provider, setProvider] = useState("TNM");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single();

    setCoins(data?.coins || 0);
  };

  const handleWithdraw = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const amount = parseInt(withdrawAmount, 10);

    if (!amount || amount < 500) {
      setErrorMsg("Minimum withdrawal is 500 coins.");
      return;
    }

    if (amount > coins) {
      setErrorMsg("You do not have enough coins.");
      return;
    }

    if (!mobileNumber.trim()) {
      setErrorMsg("Enter your mobile money number.");
      return;
    }

    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-withdrawal",
        {
          body: {
            amountInCoins: amount,
            mobileNumber: mobileNumber.trim(),
            mobileProvider: provider,
            userId: user.id
          }
        }
      );

      if (error) {
        let message = "Withdrawal failed.";

        try {
          const errJson = await error.context?.json();
          message = errJson?.error || message;
        } catch {
          message = error.message || message;
        }

        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error || "Withdrawal could not be initiated."
        );
      }

      setSuccessMsg("Cashout initiated successfully.");
      setWithdrawAmount("");
      await fetchBalance();
    } catch (err) {
      setErrorMsg(
        err?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const amount = parseInt(withdrawAmount, 10) || 0;
  const receiveAmount = amount > 0 ? Math.floor(amount * 0.7) : 0;
  const remainingCoins = Math.max(coins - amount, 0);
  const canWithdraw =
    !loading &&
    amount >= 500 &&
    amount <= coins &&
    mobileNumber.trim().length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b12] text-white"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(8,145,178,0.12),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.10),transparent_38%)]" />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080d16]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={21} />
          </button>

          <div>
            <h1 className="text-sm font-black uppercase tracking-wide">
              Universe Cashout
            </h1>
            <p className="text-[10px] text-white/35">
              Withdraw your Universe coins
            </p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl px-4 pb-14 pt-7 sm:px-6 sm:pt-9">
        {/* Balance */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-[30px] border border-cyan-200/20 bg-gradient-to-br from-[#087e9b] via-[#174b9b] to-[#172c68] p-6 shadow-[0_24px_70px_-30px_rgba(8,145,178,0.55)] sm:p-8"
        >
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-50/70">
              <Wallet size={13} />
              Available balance
            </div>

            <div className="flex items-end gap-2">
              <h2 className="text-5xl font-black tracking-[-0.055em] drop-shadow-sm sm:text-6xl">
                {coins.toLocaleString()}
              </h2>

              <span className="pb-1 text-xs font-bold text-white/50">
                coins
              </span>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-semibold text-white/75 backdrop-blur-sm">
              <ShieldCheck size={13} />
              Secure mobile-money withdrawal
            </div>
          </div>

          <Wallet
            className="absolute -bottom-7 -right-5 opacity-[0.08]"
            size={150}
          />
        </motion.section>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 text-xs font-medium text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-xs font-medium text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Withdrawal form */}
        <section className="rounded-[30px] border border-white/[0.09] bg-[#101827]/85 p-5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" /><h2 className="text-base font-extrabold tracking-tight">Withdraw coins</h2></div>
            <p className="mt-1 text-[11px] text-white/35">
              Enter the amount and mobile-money account to receive
              your cash.
            </p>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label
              htmlFor="withdraw-amount"
              className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Amount in coins
            </label>

            <div className="relative">
              <input
                id="withdraw-amount"
                type="number"
                min="500"
                inputMode="numeric"
                placeholder="500"
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="w-full rounded-2xl border border-white/[0.10] bg-[#080e19] px-5 py-5 pr-20 text-2xl font-black tracking-tight outline-none transition placeholder:text-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/[0.08]"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">
                COINS
              </span>
            </div>
          </div>

          {/* Quick amounts */}
          <div className="mb-5 grid grid-cols-4 gap-2">
            {[500, 1000, 2500, 5000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setWithdrawAmount(String(value));
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                disabled={value > coins}
                className={`rounded-xl border px-2 py-3 text-[10px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-25 ${withdrawAmount === String(value) ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]" : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:text-white"}`}
              >
                {value.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Receive summary */}
          <div className="mb-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  You receive
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-emerald-300">
                  K{receiveAmount.toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-white/30">
                  Withdrawal fee
                </p>

                <p className="mt-1 text-xs font-bold text-white/55">
                  30%
                </p>
              </div>
            </div>

            {amount > 0 && amount <= coins && (
              <div className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] text-white/30">
                Balance after withdrawal:{" "}
                <span className="font-bold text-white/55">
                  {remainingCoins.toLocaleString()} coins
                </span>
              </div>
            )}
          </div>

          {/* Provider */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Mobile money
            </p>

            <div className="grid grid-cols-2 gap-2">
              {["TNM", "Airtel"].map((op) => {
                const active = provider === op;

                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setProvider(op)}
                    className={`rounded-2xl border px-4 py-3.5 text-sm font-black transition ${
                      active
                        ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                        : "border-white/[0.07] bg-black/30 text-white/40 hover:border-white/15 hover:text-white/70"
                    }`}
                  >
                    {op}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone */}
          <div className="mb-6">
            <label
              htmlFor="mobile-number"
              className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              {provider} mobile number
            </label>

            <div className="relative">
              <Phone
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                id="mobile-number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="088... or 099..."
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="w-full rounded-2xl border border-white/[0.10] bg-[#080e19] py-4 pl-11 pr-4 text-sm font-bold outline-none transition placeholder:text-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/[0.08]"
              />
            </div>
          </div>

          {/* Confirm */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            disabled={!canWithdraw}
            onClick={handleWithdraw}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-200 via-cyan-100 to-white py-4 text-sm font-black uppercase tracking-[0.12em] text-[#06111d] shadow-[0_12px_30px_-12px_rgba(34,211,238,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(34,211,238,0.6)] disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Landmark className="h-5 w-5" />
                Confirm Withdrawal
              </>
            )}
          </motion.button>

          <p className="mt-4 text-center text-[10px] leading-5 text-white/25">
            Minimum withdrawal: 500 coins. Make sure the mobile
            number belongs to the selected provider.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Payout;
