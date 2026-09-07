import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Crown,
  Gift,
  Loader2,
  Medal,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
  Zap,
} from "lucide-react";

/*
 * BattleController
 *
 * IMPORTANT ARCHITECTURE
 * ---------------------
 *
 * This component controls the BATTLE STATE.
 *
 * StreamDashboard / co-hosting layer controls:
 *   - WebRTC
 *   - remote video
 *   - local video
 *   - socket/signaling
 *   - Supabase Realtime
 *
 * The controller communicates with that layer through callbacks:
 *
 *   onStartBattle()
 *   onEndBattle()
 *   onCancelBattle()
 *   onBattleEvent()
 *
 * The controller does NOT manipulate the StreamDashboard DOM.
 *
 * This makes the battle system independent from the video layout.
 */

const BATTLE_DURATION = 5 * 60;

const cx = (...parts) => parts.filter(Boolean).join(" ");

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const createBattleId = () => {
  return (
    "battle_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10)
  );
};

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainingSeconds).padStart(2, "0")
  );
};

const formatScore = (value) => {
  const number = Math.max(0, Number(value) || 0);

  return new Intl.NumberFormat("en-US", {
    notation: number >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(number);
};

const getWinner = (hostScore, opponentScore) => {
  if (hostScore === opponentScore) return "tie";
  return hostScore > opponentScore ? "host" : "opponent";
};

const BattleController = ({
  streamId,
  userId = null,
  host = null,
  opponent = null,
  cohost = null,

  /*
   * Optional externally controlled battle state.
   *
   * If your parent/co-hosting system already owns the battle,
   * pass battleState here.
   */
  battleState = null,

  /*
   * Called when the host launches a battle.
   */
  onStartBattle,

  /*
   * Called when the battle is ended normally.
   */
  onEndBattle,

  /*
   * Called when the battle is cancelled before starting.
   */
  onCancelBattle,

  /*
   * Called for every important battle event.
   *
   * Example:
   * onBattleEvent({
   *   type: "battle_started",
   *   battleId,
   *   ...
   * })
   */
  onBattleEvent,

  /*
   * Called whenever scores change.
   *
   * This is where StreamDashboard / Supabase / Socket.IO
   * can persist or broadcast score changes.
   */
  onScoreChange,

  /*
   * Called when a gift/coin contribution is received.
   */
  onGift,

  /*
   * Called when the controller wants an opponent.
   *
   * The actual matching/co-host system can open its
   * co-host selector from here.
   */
  onFindOpponent,

  /*
   * Whether the current user is allowed to control the battle.
   */
  canControl = true,

  /*
   * Compact version for smaller StreamDashboard sidebars.
   */
  compact = false,

  className = "",
}) => {
  const mountedRef = useRef(true);
  const battleEndedRef = useRef(false);
  const timerIntervalRef = useRef(null);

  const [phase, setPhase] = useState(() => {
    if (battleState && battleState.status) {
      return battleState.status;
    }

    return "idle";
  });

  const [battleId, setBattleId] = useState(() => {
    if (battleState && battleState.battleId) {
      return battleState.battleId;
    }

    return null;
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    if (
      battleState &&
      typeof battleState.timeLeft === "number"
    ) {
      return battleState.timeLeft;
    }

    return BATTLE_DURATION;
  });

  const [hostScore, setHostScore] = useState(() => {
    if (
      battleState &&
      battleState.scores &&
      typeof battleState.scores.host === "number"
    ) {
      return battleState.scores.host;
    }

    return 0;
  });

  const [opponentScore, setOpponentScore] = useState(() => {
    if (
      battleState &&
      battleState.scores &&
      typeof battleState.scores.opponent === "number"
    ) {
      return battleState.scores.opponent;
    }

    return 0;
  });

  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [hostConnected, setHostConnected] = useState(true);
  const [opponentConnected, setOpponentConnected] = useState(
    Boolean(opponent || cohost)
  );

  const [hostMuted, setHostMuted] = useState(false);
  const [opponentMuted, setOpponentMuted] = useState(false);

  const currentOpponent = opponent || cohost || null;

  const hostData = useMemo(() => {
    return {
      id: host && host.id ? host.id : userId,
      name: host && host.name ? host.name : "You",
      username:
        host && host.username ? host.username : "@host",
      avatar:
        host && host.avatar
          ? host.avatar
          : null,
    };
  }, [host, userId]);

  const opponentData = useMemo(() => {
    if (!currentOpponent) {
      return {
        id: null,
        name: "Waiting for opponent",
        username: "@waiting",
        avatar: null,
      };
    }

    return {
      id: currentOpponent.id || null,
      name: currentOpponent.name || "Opponent",
      username:
        currentOpponent.username || "@opponent",
      avatar: currentOpponent.avatar || null,
    };
  }, [currentOpponent]);

  const totalScore = Math.max(
    1,
    hostScore + opponentScore
  );

  const hostPercentage = clamp(
    (hostScore / totalScore) * 100,
    0,
    100
  );

  const opponentPercentage = 100 - hostPercentage;

  const winner = useMemo(() => {
    if (phase !== "finished") {
      return null;
    }

    return getWinner(hostScore, opponentScore);
  }, [phase, hostScore, opponentScore]);

  const emitBattleEvent = useCallback(
    (event) => {
      const payload = {
        streamId,
        userId,
        battleId,
        timestamp: Date.now(),
        ...event,
      };

      if (typeof onBattleEvent === "function") {
        onBattleEvent(payload);
      }
    },
    [streamId, userId, battleId, onBattleEvent]
  );

  /*
   * Synchronize externally supplied battle state.
   */
  useEffect(() => {
    if (!battleState) {
      return;
    }

    if (battleState.status) {
      setPhase(battleState.status);
    }

    if (battleState.battleId) {
      setBattleId(battleState.battleId);
    }

    if (
      battleState.scores &&
      typeof battleState.scores.host === "number"
    ) {
      setHostScore(battleState.scores.host);
    }

    if (
      battleState.scores &&
      typeof battleState.scores.opponent === "number"
    ) {
      setOpponentScore(battleState.scores.opponent);
    }

    if (typeof battleState.timeLeft === "number") {
      setTimeLeft(
        clamp(
          battleState.timeLeft,
          0,
          BATTLE_DURATION
        )
      );
    }

    if (
      typeof battleState.opponentConnected ===
      "boolean"
    ) {
      setOpponentConnected(
        battleState.opponentConnected
      );
    }
  }, [battleState]);

  /*
   * Keep opponent connection state aligned with the
   * co-hosting layer.
   */
  useEffect(() => {
    if (currentOpponent) {
      setOpponentConnected(true);
    }
  }, [currentOpponent]);

  /*
   * Battle timer.
   *
   * This timer is intentionally kept local for display.
   * For production multi-user synchronization, the authoritative
   * end time should come from your backend/realtime battle record.
   */
  useEffect(() => {
    if (
      phase !== "active" ||
      timeLeft <= 0
    ) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      return undefined;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        const next = Math.max(
          0,
          previous - 1
        );

        if (next === 0) {
          if (
            timerIntervalRef.current
          ) {
            clearInterval(
              timerIntervalRef.current
            );
            timerIntervalRef.current = null;
          }
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(
          timerIntervalRef.current
        );

        timerIntervalRef.current = null;
      }
    };
  }, [phase, timeLeft]);

  /*
   * Automatically finish the battle when the timer reaches zero.
   */
  useEffect(() => {
    if (
      phase !== "active" ||
      timeLeft > 0 ||
      battleEndedRef.current
    ) {
      return;
    }

    battleEndedRef.current = true;

    setPhase("finished");

    const finalWinner = getWinner(
      hostScore,
      opponentScore
    );

    emitBattleEvent({
      type: "battle_finished",
      winner: finalWinner,
      scores: {
        host: hostScore,
        opponent: opponentScore,
      },
    });

    if (typeof onEndBattle === "function") {
      onEndBattle({
        streamId,
        userId,
        battleId,
        winner: finalWinner,
        scores: {
          host: hostScore,
          opponent: opponentScore,
        },
        reason: "timer_expired",
      });
    }
  }, [
    phase,
    timeLeft,
    hostScore,
    opponentScore,
    streamId,
    userId,
    battleId,
    emitBattleEvent,
    onEndBattle,
  ]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (timerIntervalRef.current) {
        clearInterval(
          timerIntervalRef.current
        );

        timerIntervalRef.current = null;
      }
    };
  }, []);

  /*
   * Start battle.
   */
  const startBattle = useCallback(async () => {
    if (!canControl || isStarting) {
      return;
    }

    setError("");

    if (!currentOpponent) {
      if (typeof onFindOpponent === "function") {
        onFindOpponent({
          streamId,
          userId,
        });
      } else {
        setError(
          "Select a co-host before starting the battle."
        );
      }

      return;
    }

    setIsStarting(true);

    try {
      const newBattleId =
        createBattleId();

      const startedAt = Date.now();

      const payload = {
        battleId: newBattleId,
        streamId,
        hostId: hostData.id,
        opponentId: opponentData.id,
        host: hostData,
        opponent: opponentData,
        duration: BATTLE_DURATION,
        startedAt,
        endsAt:
          startedAt +
          BATTLE_DURATION * 1000,
        scores: {
          host: 0,
          opponent: 0,
        },
      };

      /*
       * Let the real co-host/backend layer accept
       * the battle before changing the UI to active.
       */
      if (typeof onStartBattle === "function") {
        const result =
          await onStartBattle(payload);

        /*
         * A parent can explicitly reject the battle
         * by returning false.
         */
        if (result === false) {
          throw new Error(
            "The co-hosting system rejected the battle."
          );
        }
      }

      if (!mountedRef.current) {
        return;
      }

      battleEndedRef.current = false;

      setBattleId(newBattleId);
      setHostScore(0);
      setOpponentScore(0);
      setTimeLeft(BATTLE_DURATION);
      setPhase("active");

      emitBattleEvent({
        type: "battle_started",
        battle: payload,
      });
    } catch (startError) {
      console.error(
        "[BattleController] Start failed:",
        startError
      );

      if (mountedRef.current) {
        setError(
          startError &&
            startError.message
            ? startError.message
            : "Unable to start the battle."
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsStarting(false);
      }
    }
  }, [
    canControl,
    isStarting,
    currentOpponent,
    streamId,
    userId,
    onFindOpponent,
    hostData,
    opponentData,
    onStartBattle,
    emitBattleEvent,
  ]);

  /*
   * End active battle manually.
   */
  const endBattle = useCallback(async () => {
    if (!canControl || isEnding) {
      return;
    }

    setError("");
    setIsEnding(true);

    try {
      const finalWinner = getWinner(
        hostScore,
        opponentScore
      );

      const payload = {
        battleId,
        streamId,
        userId,
        winner: finalWinner,
        scores: {
          host: hostScore,
          opponent: opponentScore,
        },
        reason: "manual_end",
      };

      if (typeof onEndBattle === "function") {
        await onEndBattle(payload);
      }

      if (!mountedRef.current) {
        return;
      }

      battleEndedRef.current = true;

      setPhase("finished");

      emitBattleEvent({
        type: "battle_finished",
        ...payload,
      });
    } catch (endError) {
      console.error(
        "[BattleController] End failed:",
        endError
      );

      if (mountedRef.current) {
        setError(
          endError &&
            endError.message
            ? endError.message
            : "Unable to end the battle."
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsEnding(false);
      }
    }
  }, [
    canControl,
    isEnding,
    battleId,
    streamId,
    userId,
    hostScore,
    opponentScore,
    onEndBattle,
    emitBattleEvent,
  ]);

  /*
   * Cancel a battle before it starts.
   */
  const cancelBattle = useCallback(async () => {
    if (!canControl || isEnding) {
      return;
    }

    setError("");
    setIsEnding(true);

    try {
      const payload = {
        battleId,
        streamId,
        userId,
        reason: "cancelled",
      };

      if (
        typeof onCancelBattle ===
        "function"
      ) {
        await onCancelBattle(payload);
      }

      if (!mountedRef.current) {
        return;
      }

      setPhase("idle");
      setBattleId(null);
      setTimeLeft(BATTLE_DURATION);
      setHostScore(0);
      setOpponentScore(0);

      emitBattleEvent({
        type: "battle_cancelled",
        ...payload,
      });
    } catch (cancelError) {
      console.error(
        "[BattleController] Cancel failed:",
        cancelError
      );

      if (mountedRef.current) {
        setError(
          cancelError &&
            cancelError.message
            ? cancelError.message
            : "Unable to cancel the battle."
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsEnding(false);
      }
    }
  }, [
    canControl,
    isEnding,
    battleId,
    streamId,
    userId,
    onCancelBattle,
    emitBattleEvent,
  ]);

  /*
   * Receive a score contribution.
   *
   * This function can be called by the parent when a real
   * gift/coin event arrives from Supabase/Socket.IO.
   */
  const addScore = useCallback(
    (side, amount, metadata = {}) => {
      const numericAmount = Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        return;
      }

      if (phase !== "active") {
        return;
      }

      if (side === "host") {
        setHostScore((previous) => {
          const next =
            previous + numericAmount;

          if (
            typeof onScoreChange ===
            "function"
          ) {
            onScoreChange({
              battleId,
              streamId,
              side: "host",
              amount: numericAmount,
              score: next,
              metadata,
            });
          }

          return next;
        });
      }

      if (side === "opponent") {
        setOpponentScore(
          (previous) => {
            const next =
              previous + numericAmount;

            if (
              typeof onScoreChange ===
              "function"
            ) {
              onScoreChange({
                battleId,
                streamId,
                side: "opponent",
                amount: numericAmount,
                score: next,
                metadata,
              });
            }

            return next;
          }
        );
      }
    },
    [
      phase,
      battleId,
      streamId,
      onScoreChange,
    ]
  );

  /*
   * Public helper for gift events.
   *
   * Parent can also call onGift independently and update
   * the battle using battleState.
   */
  const handleGift = useCallback(
    (side, gift) => {
      if (!gift) {
        return;
      }

      const amount = Number(
        gift.points ??
          gift.coins ??
          gift.value ??
          0
      );

      if (amount <= 0) {
        return;
      }

      addScore(side, amount, {
        giftId: gift.id || null,
        giftName:
          gift.name ||
          gift.title ||
          "Gift",
        senderId:
          gift.senderId || null,
      });

      emitBattleEvent({
        type: "battle_gift",
        side,
        gift,
        amount,
      });

      if (typeof onGift === "function") {
        onGift({
          battleId,
          streamId,
          side,
          gift,
          amount,
        });
      }
    },
    [
      addScore,
      emitBattleEvent,
      onGift,
      battleId,
      streamId,
    ]
  );

  /*
   * Reset finished battle back to idle.
   */
  const resetBattle = useCallback(() => {
    if (!canControl) {
      return;
    }

    battleEndedRef.current = false;

    setPhase("idle");
    setBattleId(null);
    setTimeLeft(BATTLE_DURATION);
    setHostScore(0);
    setOpponentScore(0);
    setError("");

    emitBattleEvent({
      type: "battle_reset",
    });
  }, [
    canControl,
    emitBattleEvent,
  ]);

  /*
   * This allows the parent/co-hosting layer to feed real-time
   * score events into this controller.
   */
  useEffect(() => {
    /*
     * Expose a non-global event bridge only if the application
     * already uses a CustomEvent-based event system.
     *
     * This is optional and harmless when unused.
     */
    const eventName =
      "mpade:battle-score:" +
      String(streamId);

    const handleScoreEvent = (
      event
    ) => {
      const detail =
        event.detail || {};

      if (
        detail.battleId &&
        battleId &&
        detail.battleId !== battleId
      ) {
        return;
      }

      if (
        detail.side !== "host" &&
        detail.side !== "opponent"
      ) {
        return;
      }

      addScore(
        detail.side,
        detail.amount,
        detail.metadata || {}
      );
    };

    window.addEventListener(
      eventName,
      handleScoreEvent
    );

    return () => {
      window.removeEventListener(
        eventName,
        handleScoreEvent
      );
    };
  }, [
    streamId,
    battleId,
    addScore,
  ]);

  const status = useMemo(() => {
    switch (phase) {
      case "searching":
        return {
          label: "Finding opponent",
          icon: Loader2,
          className:
            "text-amber-300",
        };

      case "active":
        return {
          label: "Battle live",
          icon: Radio,
          className:
            "text-red-300",
        };

      case "finished":
        return {
          label: "Battle finished",
          icon: Trophy,
          className:
            "text-amber-300",
        };

      default:
        return {
          label: "Ready",
          icon: Swords,
          className:
            "text-white/50",
        };
    }
  }, [phase]);

  const StatusIcon = status.icon;

  const isActive = phase === "active";
  const isFinished = phase === "finished";

  return (
    <div
      className={cx(
        "relative w-full text-white",
        compact
          ? "text-sm"
          : "text-sm",
        className
      )}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />

      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs font-medium text-white/45 transition hover:text-white"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Back
        </button>

        <div
          className={cx(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
            isActive
              ? "border-red-400/20 bg-red-500/10"
              : "border-white/10 bg-white/[0.03]"
          )}
        >
          <StatusIcon
            size={11}
            className={cx(
              status.className,
              phase === "searching" &&
                "animate-spin"
            )}
          />

          <span
            className={status.className}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Main panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-2xl">
        {/* Decorative top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-500/[0.08] to-transparent" />

        <div
          className={cx(
            "relative",
            compact
              ? "p-3"
              : "p-4"
          )}
        >
          {/* Battle heading */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 shadow-lg shadow-red-950/30">
              <Swords
                size={22}
                className={cx(
                  "text-red-400",
                  isActive &&
                    "animate-pulse"
                )}
              />
            </div>

            <h3 className="text-sm font-black uppercase tracking-[0.18em]">
              PK Battle
            </h3>

            <p className="mt-1 text-[10px] text-white/35">
              Co-host versus co-host
              live competition
            </p>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-2">
            {/* Host */}
            <div
              className={cx(
                "relative overflow-hidden rounded-2xl border p-3",
                isActive
                  ? "border-red-400/20 bg-red-500/[0.06]"
                  : "border-white/[0.07] bg-white/[0.025]"
              )}
            >
              <div className="absolute right-2 top-2">
                <Crown
                  size={13}
                  className="text-amber-300"
                />
              </div>

              <div className="mb-3 flex justify-center">
                {hostData.avatar ? (
                  <img
                    src={hostData.avatar}
                    alt={hostData.name}
                    className="h-12 w-12 rounded-full border-2 border-red-400/30 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-400/20 bg-red-500/10 text-lg font-black">
                    {String(
                      hostData.name
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="truncate text-[11px] font-black">
                  {hostData.name}
                </div>

                <div className="mt-0.5 truncate text-[8px] text-white/30">
                  {hostData.username}
                </div>

                <div className="mt-3 text-xl font-black tracking-tight">
                  {formatScore(
                    hostScore
                  )}
                </div>

                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-red-300/60">
                  points
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-1 text-[8px] text-white/30">
                {hostMuted ? (
                  <MicOff size={10} />
                ) : (
                  <Mic size={10} />
                )}

                <span>
                  {hostConnected
                    ? "Connected"
                    : "Offline"}
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="pointer-events-none absolute left-1/2 mt-12 -translate-x-1/2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black text-[8px] font-black text-white/50 shadow-xl">
                VS
              </div>
            </div>

            {/* Opponent */}
            <div
              className={cx(
                "relative overflow-hidden rounded-2xl border p-3",
                isActive
                  ? "border-orange-400/20 bg-orange-500/[0.05]"
                  : "border-white/[0.07] bg-white/[0.025]"
              )}
            >
              <div className="absolute right-2 top-2">
                <Zap
                  size={12}
                  className="text-orange-300"
                />
              </div>

              <div className="mb-3 flex justify-center">
                {opponentData.avatar ? (
                  <img
                    src={
                      opponentData.avatar
                    }
                    alt={
                      opponentData.name
                    }
                    className="h-12 w-12 rounded-full border-2 border-orange-400/30 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/10 bg-white/[0.04] text-lg font-black text-white/40">
                    ?
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="truncate text-[11px] font-black">
                  {opponentData.name}
                </div>

                <div className="mt-0.5 truncate text-[8px] text-white/30">
                  {opponentData.username}
                </div>

                <div className="mt-3 text-xl font-black tracking-tight">
                  {formatScore(
                    opponentScore
                  )}
                </div>

                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-orange-300/60">
                  points
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-1 text-[8px] text-white/30">
                {opponentMuted ? (
                  <MicOff size={10} />
                ) : (
                  <Mic size={10} />
                )}

                <span>
                  {opponentConnected
                    ? "Connected"
                    : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-wider">
              <span className="text-red-300">
                {formatScore(
                  hostScore
                )}
              </span>

              <span className="text-white/25">
                {formatScore(
                  totalScore
                )}{" "}
                total
              </span>

              <span className="text-orange-300">
                {formatScore(
                  opponentScore
                )}
              </span>
            </div>

            <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                style={{
                  width:
                    hostPercentage +
                    "%",
                }}
              />

              <div
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-orange-500 to-amber-400 transition-all duration-500"
                style={{
                  width:
                    opponentPercentage +
                    "%",
                }}
              />

              <div className="absolute inset-y-0 left-1/2 w-px bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
          </div>

          {/* Timer */}
          <div
            className={cx(
              "mt-4 rounded-2xl border p-3 text-center",
              isActive
                ? "border-red-400/20 bg-red-500/[0.06]"
                : "border-white/[0.07] bg-white/[0.025]"
            )}
          >
            <div className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
              <Clock3 size={11} />
              Time remaining
            </div>

            <div
              className={cx(
                "mt-1 font-mono text-2xl font-black tracking-wider",
                isActive
                  ? timeLeft <= 30
                    ? "text-red-300 animate-pulse"
                    : "text-white"
                  : "text-white/40"
              )}
            >
              {formatTime(
                timeLeft
              )}
            </div>
          </div>

          {/* Searching state */}
          {phase === "searching" && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4 text-center">
              <Loader2
                size={22}
                className="mx-auto mb-2 animate-spin text-amber-300"
              />

              <div className="text-xs font-black">
                Finding a co-host opponent
              </div>

              <p className="mt-1 text-[9px] text-white/35">
                Waiting for the battle connection...
              </p>
            </div>
          )}

          {/* No opponent */}
          {!currentOpponent &&
            phase === "idle" && (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                <Users
                  size={20}
                  className="mx-auto mb-2 text-white/25"
                />

                <div className="text-[10px] font-black text-white/60">
                  No co-host opponent
                </div>

                <p className="mt-1 text-[9px] text-white/30">
                  Invite a co-host before launching a PK battle.
                </p>
              </div>
            )}

          {/* Finished result */}
          {isFinished && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4 text-center">
              <Trophy
                size={27}
                className="mx-auto mb-2 text-amber-300"
              />

              <div className="text-xs font-black uppercase tracking-wider">
                {winner === "tie"
                  ? "Battle Draw"
                  : winner === "host"
                  ? "You Won"
                  : "Opponent Won"}
              </div>

              <div className="mt-2 flex items-center justify-center gap-3 text-sm font-black">
                <span className="text-red-300">
                  {formatScore(
                    hostScore
                  )}
                </span>

                <span className="text-white/20">
                  —
                </span>

                <span className="text-orange-300">
                  {formatScore(
                    opponentScore
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={resetBattle}
                disabled={!canControl}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={11} />
                New Battle
              </button>
            </div>
          )}

          {/* Controls */}
          {!isFinished && (
            <div className="mt-4">
              {phase === "idle" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={
                      onFindOpponent
                        ? () =>
                            onFindOpponent({
                              streamId,
                              userId,
                            })
                        : undefined
                    }
                    disabled={
                      !canControl ||
                      !onFindOpponent
                    }
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[9px] font-black uppercase tracking-wider text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <UserPlus size={12} />
                    Add Co-host
                  </button>

                  <button
                    type="button"
                    onClick={
                      startBattle
                    }
                    disabled={
                      !canControl ||
                      isStarting ||
                      !currentOpponent
                    }
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 py-3 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isStarting ? (
                      <Loader2
                        size={12}
                        className="animate-spin"
                      />
                    ) : (
                      <Swords size={12} />
                    )}

                    Start Battle
                  </button>
                </div>
              )}

              {phase === "active" && (
                <button
                  type="button"
                  onClick={
                    endBattle
                  }
                  disabled={
                    !canControl ||
                    isEnding
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/[0.07] py-3 text-[9px] font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isEnding ? (
                    <Loader2
                      size={12}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldAlert
                      size={12}
                    />
                  )}

                  End Battle
                </button>
              )}
            </div>
          )}

          {/* Details toggle */}
          <button
            type="button"
            onClick={() =>
              setShowDetails(
                (value) => !value
              )
            }
            className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[8px] font-bold uppercase tracking-wider text-white/25 transition hover:text-white/50"
          >
            {showDetails
              ? "Hide battle details"
              : "Show battle details"}
          </button>

          {/* Details */}
          {showDetails && (
            <div className="mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="grid grid-cols-2 gap-2">
                <Detail
                  label="Battle ID"
                  value={
                    battleId
                      ? battleId.slice(
                          0,
                          16
                        ) + "..."
                      : "Not started"
                  }
                />

                <Detail
                  label="Duration"
                  value="5 minutes"
                />

                <Detail
                  label="Host"
                  value={
                    hostData.id ||
                    "Local"
                  }
                />

                <Detail
                  label="Opponent"
                  value={
                    opponentData.id ||
                    "Waiting"
                  }
                />

                <Detail
                  label="Connection"
                  value={
                    opponentConnected
                      ? "Connected"
                      : "Disconnected"
                  }
                />

                <Detail
                  label="Stream"
                  value={
                    streamId
                      ? String(
                          streamId
                        ).slice(
                          0,
                          12
                        )
                      : "Unknown"
                  }
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3">
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-red-300"
              />

              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase tracking-wider text-red-300">
                  Battle error
                </div>

                <p className="mt-1 text-[9px] leading-relaxed text-red-200/60">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="text-red-300/50 hover:text-red-300"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[7px] font-black uppercase tracking-[0.15em] text-white/20">
            <ShieldAlert size={9} />
            Fair play • Real-time battle
          </div>
        </div>
      </div>
    </div>
  );
};

const Detail = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
      <div className="text-[7px] font-black uppercase tracking-wider text-white/20">
        {label}
      </div>

      <div className="mt-1 truncate font-mono text-[8px] text-white/45">
        {value}
      </div>
    </div>
  );
};

export default BattleController;
