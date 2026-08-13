// hooks/useStreamSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

export const useStreamSocket = (streamId, isHost = true) => {
  // 1. Turned socket into reactive state so subcomponents receive updates instantly when connection mounts
  const [socket, setSocket] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [joinAlert, setJoinAlert] = useState(null);
  const [activeGift, setActiveGift] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [reactionTrigger, setReactionTrigger] = useState(null);

  useEffect(() => {
    if (!streamId) return;

    const globalIo = io || (typeof window !== 'undefined' ? window.io : null);
    if (!globalIo) {
      console.error("Socket.io client script not found on window context.");
      return;
    }

    const socketInstance = globalIo(SOCKET_SERVER_URL, {
      transports: ['polling', 'websocket'],
      query: { room: streamId, role: isHost ? 'host' : 'viewer' },
      forceNew: true
    });
    
    setSocket(socketInstance);

    socketInstance.on('viewer_joined', (data) => {
      setJoinAlert(`${data.username || 'A viewer'} joined the stream!`);
      setTimeout(() => setJoinAlert(null), 3000);
    });

    socketInstance.on('room_presence_update', (users) => {
      setViewers(users);
    });

    socketInstance.on('received_reaction', (data) => {
      setReactionTrigger({ id: Date.now(), type: data.type });
    });

    socketInstance.on('incoming_gift_alert', (giftData) => {
      setActiveGift(giftData);
      setTimeout(() => setActiveGift(null), 4000);
    });

    // 2. Clear handling for incoming alliance signaling notifications
    socketInstance.on('battle_invite_received', (payload) => {
      console.log("⚔️ Incoming battle invite received on socket:", payload);
      setIncomingInvite(payload);
    });

    // 3. Independent handler listener for multi-stage room evictions
    socketInstance.on('cohost_eviction_notice', (payload) => {
      console.warn("⚠️ CoHost Eviction Notice:", payload?.reason);
      // Dispatches a native window event so independent layers can catch it and kick out cleanly
      const evictionEvent = new CustomEvent('mpade_cohost_eviction', { detail: payload });
      window.dispatchEvent(evictionEvent);
    });

    return () => {
      if (socketInstance) socketInstance.disconnect();
    };
  }, [streamId, isHost]);

  return {
    socket, // 👈 Now returns a reactive state variable instead of a stale ref value!
    viewers,
    joinAlert,
    activeGift,
    setActiveGift,
    incomingInvite,
    setIncomingInvite,
    reactionTrigger
  };
};
