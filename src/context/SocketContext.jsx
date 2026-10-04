import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { supabase } from '../supabaseClient';

const SOCKET_SERVER_URL = "https://mpade-backend-production.up.railway.app";

const SocketContext = createContext(null);

export const SocketProvider = ({ children, session }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const incomingCallRef = useRef(null);
  const recentlyHandledCallerRef = useRef(new Map());

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
      if (!callerId || String(callerId) === String(session.user.id)) return;

      const callId = data?.callId || null;
      const now = Date.now();
      const active = incomingCallRef.current;
      const recentlyHandledAt = recentlyHandledCallerRef.current.get(String(callerId)) || 0;

      if (
        (active && String(active.callerId) === String(callerId)) ||
        now - recentlyHandledAt < 15000
      ) {
        console.log("⏭️ Ignoring duplicate/recent incoming call signal:", {
          callerId,
          callId
        });
        return;
      }

      // Fetch caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', callerId)
        .single();

      const nextIncomingCall = {
        callId,
        callerId,
        callerUsername: callerProfile?.username || data?.callerUsername || data?.callerName || 'User',
        callerAvatar: callerProfile?.avatar_url || data?.callerAvatar || null,
        callType: data?.callType || 'video',
        roomId: data?.roomId || [session.user.id, callerId].sort().join("-")
      };

      incomingCallRef.current = nextIncomingCall;
      setIncomingCall(nextIncomingCall);
    };

    const handleCancel = () => {
      const active = incomingCallRef.current;
      if (active?.callerId) {
        recentlyHandledCallerRef.current.set(String(active.callerId), Date.now());
      }
      incomingCallRef.current = null;
      setIncomingCall(null);
    };

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
    if (incomingCall?.callerId) {
      recentlyHandledCallerRef.current.set(String(incomingCall.callerId), Date.now());
    }
    incomingCallRef.current = null;
    if (incomingCall && socketRef.current) {
      socketRef.current.emit('reject_incoming_call', {
        roomId: incomingCall.roomId,
        to: incomingCall.callerId
      });
    }
    setIncomingCall(null);
  };

  const clearIncomingCall = () => {
    if (incomingCallRef.current?.callerId) {
      recentlyHandledCallerRef.current.set(
        String(incomingCallRef.current.callerId),
        Date.now()
      );
    }
    incomingCallRef.current = null;
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, incomingCall, rejectCall, clearIncomingCall }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
