// hooks/useStreamSocket.js
import { useEffect, useRef, useState } from 'react';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

export const useStreamSocket = (streamId, isHost = true) => {
  const socketRef = useRef(null);
  const [viewers, setViewers] = useState([]);
  const [joinAlert, setJoinAlert] = useState(null);
  const [activeGift, setActiveGift] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [reactionTrigger, setReactionTrigger] = useState(null);

  useEffect(() => {
    if (!streamId) return;

    const globalIo = typeof window !== 'undefined' ? window.io : null;
    if (!globalIo) {
      console.error("Socket.io client script not found on window context.");
      return;
    }

    const socket = globalIo(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      query: { room: streamId, role: isHost ? 'host' : 'viewer' },
      forceNew: true
    });
    
    socketRef.current = socket;

    socket.on('viewer_joined', (data) => {
      setJoinAlert(`${data.username || 'A viewer'} joined the stream!`);
      setTimeout(() => setJoinAlert(null), 3000);
    });

    socket.on('room_presence_update', (users) => {
      setViewers(users);
    });

    socket.on('received_reaction', (data) => {
      setReactionTrigger({ id: Date.now(), type: data.type });
    });

    socket.on('incoming_gift_alert', (giftData) => {
      setActiveGift(giftData);
      setTimeout(() => setActiveGift(null), 4000);
    });

    socket.on('battle_invite_received', (payload) => {
      console.log("⚔️ Incoming battle invite via Socket.io:", payload);
      setIncomingInvite(payload);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [streamId, isHost]);

  return {
    socket: socketRef.current,
    viewers,
    joinAlert,
    activeGift,
    setActiveGift,
    incomingInvite,
    setIncomingInvite,
    reactionTrigger
  };
};
