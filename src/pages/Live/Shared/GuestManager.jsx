import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Radio, Video, Mic, X, Users, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const GLOBAL_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    }
  ],
  iceCandidatePoolSize: 10,
};

const GuestManager = ({ 
  streamId,
  activeGuests = [], 
  setActiveGuests, 
  pendingRequests = [], 
  setPendingRequests, 
  onBack,
  socket,
  onGuestStreamReceived // Optional callback to pass stream up to parent UI grid
}) => {

  const peerConnections = useRef({}); // Store active RTCPeerConnections mapped by guestId

  // 1. WebRTC Signaling Listener for incoming Guest Streams
  useEffect(() => {
    if (!socket || !streamId) return;

    console.log("⚡ [GuestManager] Initializing WebRTC Host Listeners...");

    // Listener when Guest sends SDP Offer
    const handleReceiveOffer = async (payload) => {
      const { guestId, offer, mode } = payload;
      console.log(`📥 [HOST WebRTC] Offer received from Guest ID: ${guestId}`, payload);

      try {
        // Create PeerConnection for this specific guest
        const pc = new RTCPeerConnection(GLOBAL_ICE_CONFIG);
        peerConnections.current[guestId] = pc;

        // Handle incoming remote media tracks from the guest
        pc.ontrack = (event) => {
          console.log(`🎉 [HOST WebRTC] Received guest stream track! Kind: ${event.track.kind}`);
          if (event.streams && event.streams[0]) {
            const guestStream = event.streams[0];
            
            // Attach stream object to active guest state
            setActiveGuests(prev => 
              (prev || []).map(g => g.user_id === guestId ? { ...g, stream: guestStream } : g)
            );

            if (onGuestStreamReceived) {
              onGuestStreamReceived(guestId, guestStream);
            }
          }
        };

        // Emit Host ICE Candidates back to Guest
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`📡 [HOST WebRTC] Sending ICE Candidate to Guest ${guestId}`);
            socket.emit('webrtc_ice_candidate', {
              streamId,
              candidate: event.candidate,
              to: guestId,
              senderType: 'host'
            });
          }
        };

        // Set Remote SDP Offer and create SDP Answer
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`✅ [HOST WebRTC] Remote description set for guest ${guestId}`);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`📤 [HOST WebRTC] Answer created and local description set for guest ${guestId}`);

        // Emit Answer back to Guest
        socket.emit('send_webrtc_answer', {
          streamId,
          guestId,
          answer: answer
        });

      } catch (err) {
        console.error(`❌ [HOST WebRTC] Error processing offer from guest ${guestId}:`, err);
      }
    };

    // Listener for incoming Guest ICE Candidates
    const handleIncomingIce = async (payload) => {
      const { candidate, senderId, guestId } = payload;
      const targetGuestId = guestId || senderId;
      const pc = peerConnections.current[targetGuestId];

      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`✅ [HOST WebRTC] ICE candidate added for guest ${targetGuestId}`);
        } catch (err) {
          console.warn(`⚠️ [HOST WebRTC] Failed to add ICE candidate:`, err);
        }
      }
    };

    socket.on('send_webrtc_offer', handleReceiveOffer);
    socket.on('receive_webrtc_offer', handleReceiveOffer);
    socket.on('incoming_ice_candidate', handleIncomingIce);
    socket.on('webrtc_ice_candidate', handleIncomingIce);

    return () => {
      socket.off('send_webrtc_offer', handleReceiveOffer);
      socket.off('receive_webrtc_offer', handleReceiveOffer);
      socket.off('incoming_ice_candidate', handleIncomingIce);
      socket.off('webrtc_ice_candidate', handleIncomingIce);

      // Clean up PeerConnections on unmount
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
    };
  }, [socket, streamId, setActiveGuests, onGuestStreamReceived]);

  // Fetch initial requests & establish real-time database listener
  useEffect(() => {
    if (!streamId) return;

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('live_guest_requests')
        .select('*')
        .eq('stream_id', streamId)
        .eq('status', 'pending');

      if (!error && data) {
        setPendingRequests(data);
      }
    };

    fetchRequests();

    const channel = supabase
      .channel(`guest_manager_requests_${streamId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'live_guest_requests', 
          filter: `stream_id=eq.${streamId}` 
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.status === 'pending') {
              setPendingRequests(prev => {
                const exists = (prev || []).some(r => r.id === payload.new.id);
                return exists ? prev : [...(prev || []), payload.new];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'pending') {
              setPendingRequests(prev => (prev || []).filter(r => r.id !== payload.new.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, setPendingRequests]);

  // Handle Accept Request (Updates Supabase, updates local state, & triggers Socket event)
  const handleAcceptRequest = async (request, assignedMode) => {
    if (!request?.id) {
      console.error("❌ Missing request ID:", request);
      return;
    }

    if (activeGuests.length >= 3) {
      alert("Maximum capacity of 3 guest seats reached!");
      return;
    }

    if (setPendingRequests) {
      setPendingRequests(prev => (prev || []).filter(item => item.id !== request.id));
    }

    if (setActiveGuests) {
      setActiveGuests(prev => {
        const exists = (prev || []).some(g => g.user_id === request.user_id);
        if (exists) return prev;
        return [
          ...prev,
          { 
            id: request.id, 
            user_id: request.user_id, 
            username: request.username, 
            avatar_url: request.avatar_url,
            mode: assignedMode, 
            isMuted: false 
          }
        ];
      });
    }

    const { data, error } = await supabase
      .from('live_guest_requests')
      .update({ status: 'approved', mode: assignedMode })
      .eq('id', request.id)
      .select();

    if (error || !data || data.length === 0) {
      console.error("❌ DB Update failed:", error?.message || "Check Supabase RLS policies");
      alert("Failed to update guest status in database.");
      return;
    }

    console.log("✅ Guest status updated to approved in DB:", data[0]);

    if (socket) {
      socket.emit('approve_cohost', { 
        streamId, 
        guestId: request.user_id, 
        mode: assignedMode 
      });
    }
  };

  // Handle Rejecting or Removing a Guest
  const handleRejectRemove = async (target, isRequestQueue = true) => {
    const targetId = typeof target === 'object' ? target.id : target;
    const guestUserId = typeof target === 'object' ? target.user_id : null;

    if (isRequestQueue) {
      if (setPendingRequests) {
        setPendingRequests(prev => (prev || []).filter(item => item.id !== targetId));
      }

      await supabase
        .from('live_guest_requests')
        .update({ status: 'rejected' })
        .eq('id', targetId);
    } else {
      // Close WebRTC connection for this guest
      if (guestUserId && peerConnections.current[guestUserId]) {
        peerConnections.current[guestUserId].close();
        delete peerConnections.current[guestUserId];
      }

      if (setActiveGuests) {
        setActiveGuests(prev => (prev || []).filter(item => item.id !== targetId));
      }

      await supabase
        .from('live_guest_requests')
        .update({ status: 'disconnected' })
        .eq('id', targetId);

      if (socket && guestUserId) {
        socket.emit('kick_cohost', { streamId, guestId: guestUserId });
      }
    }
  };

  return (
    <div className="space-y-4 font-sans text-left p-1">
      <button 
        onClick={onBack} 
        className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors uppercase font-bold tracking-wider"
      >
        <ArrowLeft size={12} /> Exit Guest Configuration
      </button>

      {/* ACTIVE MANAGER CONTROL LIST */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Users size={10} className="text-cyan-400" /> Allocated Room Seats
          </span>
          <span className="text-cyan-400 font-mono">({activeGuests?.length || 0}/3)</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-1.5">
          {activeGuests?.length === 0 ? (
            <p className="text-[10px] text-zinc-600 px-1 italic">No active guests connected.</p>
          ) : (
            activeGuests?.map(guest => (
              <div key={guest.id} className="bg-zinc-900 p-2 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {guest.avatar_url && (
                    <img src={guest.avatar_url} alt="" className="w-6 h-6 rounded-full border border-cyan-500/30" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate">{guest.username}</p>
                    <p className="text-[8px] text-cyan-400 font-mono uppercase mt-0.5">{guest.mode} Active Link</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRejectRemove(guest, false)} 
                  className="p-1.5 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-lg transition-all"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REQUEST QUEUE INTAKE CARD */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px] px-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Radio size={10} className="text-purple-400 animate-pulse" /> Pending Requests
          </span>
          <span className="text-purple-400 font-mono">({pendingRequests?.length || 0})</span>
        </h3>

        <div className="space-y-1.5">
          {pendingRequests?.length === 0 ? (
            <p className="text-[10px] text-zinc-600 px-1 italic">No pending requests right now.</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {pendingRequests?.map(req => (
                <motion.div 
                  key={req.id} 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, x: -10 }} 
                  className="bg-zinc-900 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {req.avatar_url && (
                      <img src={req.avatar_url} alt="" className="w-6 h-6 rounded-full border border-purple-500/30" />
                    )}
                    <span className="text-xs font-bold text-zinc-200 truncate">{req.username}</span>
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-white/5">
                    <button 
                      onClick={() => handleAcceptRequest(req, 'audio')} 
                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-0.5"
                    >
                      <Mic size={8} /> Audio
                    </button>
                    <button 
                      onClick={() => handleAcceptRequest(req, 'video')} 
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[8px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-0.5"
                    >
                      <Video size={8} /> +Video
                    </button>
                    <button 
                      onClick={() => handleRejectRemove(req, true)} 
                      className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
                    >
                      <UserX size={10} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
