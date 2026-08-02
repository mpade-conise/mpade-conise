import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { supabase } from '../supabaseClient';

const SOCKET_SERVER_URL = "https://mpade-backend.onrender.com";

const SocketContext = createContext(null);

export const SocketProvider = ({ children, session }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize singleton socket connection
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
    }

    const socket = socketRef.current;

    const handleConnect = () => {
      console.log(`🌐 Global Socket Connected: ${socket.id}`);
      // Register user ID immediately on connect/reconnect
      socket.emit('register_user_session', { userId: session.user.id });
    };

    const handleIncomingCall = async (data) => {
      console.log("📞 Incoming Call Signal Received globally:", data);
      
      const callerId = data?.callerId || data?.fromUserId || data?.senderId || data?.userId;
      if (!callerId) return;

      // Fetch caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', callerId)
        .single();

      setIncomingCall({
        callerId,
        callerUsername: callerProfile?.username || 'User',
        callerAvatar: callerProfile?.avatar_url || null,
        callType: data?.callType || 'video',
        roomId: data?.roomId || [session.user.id, callerId].sort().join("-")
      });
    };

    const handleCancel = () => setIncomingCall(null);

    // Event Registration
    socket.on('connect', handleConnect);
    socket.on('incoming_call_signal', handleIncomingCall);
    socket.on('call_cancelled_by_caller', handleCancel);
    socket.on('peer_hung_up', handleCancel);

    // Force registration if already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('incoming_call_signal', handleIncomingCall);
      socket.off('call_cancelled_by_caller', handleCancel);
      socket.off('peer_hung_up', handleCancel);
    };
  }, [session?.user?.id]);

  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit('reject_incoming_call', {
        roomId: incomingCall.roomId,
        to: incomingCall.callerId
      });
    }
    setIncomingCall(null);
  };

  const clearIncomingCall = () => setIncomingCall(null);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, incomingCall, rejectCall, clearIncomingCall }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
