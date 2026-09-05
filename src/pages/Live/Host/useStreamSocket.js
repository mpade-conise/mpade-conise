// hooks/useStreamSocket.js

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'https://mpade-backend.onrender.com';

const ALERT_DURATION = 3000;
const GIFT_ALERT_DURATION = 4000;

export const useStreamSocket = (
  streamId,
  isHost = true
) => {
  /* =========================================================
     REACTIVE STATE
     ========================================================= */

  const [socket, setSocket] = useState(null);

  const [viewers, setViewers] = useState([]);

  const [joinAlert, setJoinAlert] = useState(null);

  const [activeGift, setActiveGift] = useState(null);

  const [incomingInvite, setIncomingInvite] =
    useState(null);

  const [reactionTrigger, setReactionTrigger] =
    useState(null);

  /* =========================================================
     CONNECTION STATE
     ========================================================= */

  const [connectionState, setConnectionState] =
    useState('connecting');

  /* =========================================================
     INTERNAL REFS
     ========================================================= */

  const socketRef = useRef(null);

  const mountedRef = useRef(false);

  const joinAlertTimerRef = useRef(null);

  const giftAlertTimerRef = useRef(null);

  const reactionSequenceRef = useRef(0);

  /* =========================================================
     CONNECTION LIFECYCLE
     ========================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =========================================================
     SOCKET INITIALIZATION
     ========================================================= */

  useEffect(() => {
    if (!streamId) {
      setSocket(null);
      setViewers([]);
      setConnectionState('idle');
      return undefined;
    }

    let cancelled = false;

    const globalIo =
      io ||
      (
        typeof window !== 'undefined'
          ? window.io
          : null
      );

    if (!globalIo) {
      console.error(
        '❌ [useStreamSocket] Socket.IO client is unavailable.'
      );

      setConnectionState('error');

      return undefined;
    }

    console.log(
      `🌐 [useStreamSocket] Creating stream socket | stream=${streamId} | role=${isHost ? 'host' : 'viewer'}`
    );

    /*
     * This hook owns ONE socket connection.
     */

    const socketInstance = globalIo(
      SOCKET_SERVER_URL,
      {
        transports: [
          'websocket',
          'polling'
        ],

        query: {
          room: streamId,
          role: isHost
            ? 'host'
            : 'viewer'
        },

        /*
         * Keep the current architecture.
         * Do not allow Socket.IO's manager
         * to silently reuse another stream socket.
         */

        forceNew: true,

        reconnection: true,

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,

        timeout: 10000,

        autoConnect: true
      }
    );

    socketRef.current = socketInstance;

    if (!cancelled && mountedRef.current) {
      setSocket(socketInstance);
      setConnectionState(
        socketInstance.connected
          ? 'connected'
          : 'connecting'
      );
    }

    /* =======================================================
       CONNECT
       ======================================================= */

    const handleConnect = () => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      console.log(
        '🟢 [useStreamSocket] Socket connected:',
        socketInstance.id
      );

      setConnectionState('connected');
    };

    /* =======================================================
       DISCONNECT
       ======================================================= */

    const handleDisconnect = reason => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      console.warn(
        '🟠 [useStreamSocket] Socket disconnected:',
        reason
      );

      setConnectionState(
        'disconnected'
      );
    };

    /* =======================================================
       CONNECTION ERROR
       ======================================================= */

    const handleConnectError = error => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      console.error(
        '❌ [useStreamSocket] Connection error:',
        error?.message || error
      );

      setConnectionState('error');
    };

    /* =======================================================
       RECONNECT ATTEMPT
       ======================================================= */

    const handleReconnectAttempt = attempt => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      console.log(
        `🔄 [useStreamSocket] Reconnection attempt ${attempt}`
      );

      setConnectionState(
        'reconnecting'
      );
    };

    /* =======================================================
       VIEWER JOINED
       ======================================================= */

    const handleViewerJoined = data => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      const username =
        data?.username ||
        'A viewer';

      const message =
        `${username} joined the stream!`;

      console.log(
        '👤 [useStreamSocket] Viewer joined:',
        data
      );

      setJoinAlert(message);

      if (joinAlertTimerRef.current) {
        clearTimeout(
          joinAlertTimerRef.current
        );
      }

      joinAlertTimerRef.current =
        setTimeout(() => {
          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          setJoinAlert(null);
          joinAlertTimerRef.current = null;
        }, ALERT_DURATION);
    };

    /* =======================================================
       ROOM PRESENCE
       ======================================================= */

    const handleRoomPresenceUpdate = users => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      /*
       * Always normalize to an array.
       */

      const normalizedUsers =
        Array.isArray(users)
          ? users
          : [];

      /*
       * Defensive deduplication.
       *
       * Socket payloads sometimes contain
       * repeated user objects.
       */

      const uniqueUsers =
        Array.from(
          new Map(
            normalizedUsers.map(
              (user, index) => [
                user?.socketId ||
                user?.id ||
                user?.user_id ||
                `presence-${index}`,
                user
              ]
            )
          ).values()
        );

      setViewers(uniqueUsers);
    };

    /* =======================================================
       REACTIONS
       ======================================================= */

    const handleReceivedReaction = data => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      if (!data) {
        return;
      }

      reactionSequenceRef.current += 1;

      const reactionId =
        `${Date.now()}-${reactionSequenceRef.current}`;

      console.log(
        '❤️ [useStreamSocket] Reaction received:',
        data
      );

      setReactionTrigger({
        ...data,
        id: reactionId
      });
    };

    /* =======================================================
       GIFTS
       ======================================================= */

    const handleIncomingGift = giftData => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      if (!giftData) {
        return;
      }

      console.log(
        '🎁 [useStreamSocket] Gift received:',
        giftData
      );

      /*
       * Clear the previous timer first.
       *
       * Otherwise:
       *
       * Gift A
       * ↓
       * timer A
       *
       * Gift B
       * ↓
       * timer B
       *
       * Timer A could incorrectly clear Gift B.
       */

      if (giftAlertTimerRef.current) {
        clearTimeout(
          giftAlertTimerRef.current
        );
      }

      setActiveGift(giftData);

      giftAlertTimerRef.current =
        setTimeout(() => {
          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          setActiveGift(null);
          giftAlertTimerRef.current = null;
        }, GIFT_ALERT_DURATION);
    };

    /* =======================================================
       BATTLE INVITATION
       ======================================================= */

    const handleBattleInvite = payload => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      if (!payload) {
        return;
      }

      console.log(
        '⚔️ [useStreamSocket] Battle invitation received:',
        payload
      );

      setIncomingInvite(payload);
    };

    /* =======================================================
       CO-HOST EVICTION
       ======================================================= */

    const handleCohostEviction = payload => {
      if (
        cancelled ||
        !mountedRef.current
      ) {
        return;
      }

      console.warn(
        '⚠️ [useStreamSocket] Co-host eviction:',
        payload?.reason
      );

      /*
       * Preserve the existing global event architecture.
       *
       * Other live-stream modules can listen for:
       *
       * mpade_cohost_eviction
       */

      if (
        typeof window !== 'undefined'
      ) {
        window.dispatchEvent(
          new CustomEvent(
            'mpade_cohost_eviction',
            {
              detail: payload
            }
          )
        );
      }
    };

    /* =======================================================
       REGISTER LISTENERS
       ======================================================= */

    socketInstance.on(
      'connect',
      handleConnect
    );

    socketInstance.on(
      'disconnect',
      handleDisconnect
    );

    socketInstance.on(
      'connect_error',
      handleConnectError
    );

    socketInstance.io.on(
      'reconnect_attempt',
      handleReconnectAttempt
    );

    socketInstance.on(
      'viewer_joined',
      handleViewerJoined
    );

    socketInstance.on(
      'room_presence_update',
      handleRoomPresenceUpdate
    );

    socketInstance.on(
      'received_reaction',
      handleReceivedReaction
    );

    socketInstance.on(
      'incoming_gift_alert',
      handleIncomingGift
    );

    socketInstance.on(
      'battle_invite_received',
      handleBattleInvite
    );

    socketInstance.on(
      'cohost_eviction_notice',
      handleCohostEviction
    );

    /* =======================================================
       CLEANUP
       ======================================================= */

    return () => {
      cancelled = true;

      console.log(
        '🧹 [useStreamSocket] Cleaning socket:',
        socketInstance.id
      );

      /*
       * Stop UI timers.
       */

      if (
        joinAlertTimerRef.current
      ) {
        clearTimeout(
          joinAlertTimerRef.current
        );

        joinAlertTimerRef.current =
          null;
      }

      if (
        giftAlertTimerRef.current
      ) {
        clearTimeout(
          giftAlertTimerRef.current
        );

        giftAlertTimerRef.current =
          null;
      }

      /*
       * Remove every listener owned
       * by this hook.
       */

      socketInstance.off(
        'connect',
        handleConnect
      );

      socketInstance.off(
        'disconnect',
        handleDisconnect
      );

      socketInstance.off(
        'connect_error',
        handleConnectError
      );

      socketInstance.io.off(
        'reconnect_attempt',
        handleReconnectAttempt
      );

      socketInstance.off(
        'viewer_joined',
        handleViewerJoined
      );

      socketInstance.off(
        'room_presence_update',
        handleRoomPresenceUpdate
      );

      socketInstance.off(
        'received_reaction',
        handleReceivedReaction
      );

      socketInstance.off(
        'incoming_gift_alert',
        handleIncomingGift
      );

      socketInstance.off(
        'battle_invite_received',
        handleBattleInvite
      );

      socketInstance.off(
        'cohost_eviction_notice',
        handleCohostEviction
      );

      /*
       * Disconnect this hook's socket.
       */

      if (
        socketInstance.connected ||
        socketInstance.active
      ) {
        socketInstance.disconnect();
      }

      /*
       * Only clear the ref if it still
       * points to this socket.
       */

      if (
        socketRef.current ===
        socketInstance
      ) {
        socketRef.current = null;
      }

      /*
       * Reset state only if this effect
       * still owns the current component.
       */

      if (
        mountedRef.current
      ) {
        setSocket(null);
        setViewers([]);
        setConnectionState('idle');
      }
    };
  }, [streamId, isHost]);

  /* =========================================================
     SAFE ACTIVE GIFT SETTER
     ========================================================= */

  const handleSetActiveGift = gift => {
    /*
     * Allow existing components to continue
     * calling setActiveGift(null).
     */

    if (gift === null) {
      setActiveGift(null);

      if (
        giftAlertTimerRef.current
      ) {
        clearTimeout(
          giftAlertTimerRef.current
        );

        giftAlertTimerRef.current =
          null;
      }

      return;
    }

    setActiveGift(gift);

    if (
      giftAlertTimerRef.current
    ) {
      clearTimeout(
        giftAlertTimerRef.current
      );
    }

    giftAlertTimerRef.current =
      setTimeout(() => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        setActiveGift(null);
        giftAlertTimerRef.current =
          null;
      }, GIFT_ALERT_DURATION);
  };

  /* =========================================================
     RETURN API
     ========================================================= */

  return {
    socket,

    viewers,

    joinAlert,

    activeGift,

    setActiveGift:
      handleSetActiveGift,

    incomingInvite,

    setIncomingInvite,

    reactionTrigger,

    connectionState
  };
};
