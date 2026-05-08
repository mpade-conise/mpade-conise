import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Send, Mic, Video, Image, Smile, Phone, Video as VideoIcon, 
  MoreVertical, CheckCheck, Play, Pause, Paperclip, X, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const Messages = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState(null); // Fetch this from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStream, setCallStream] = useState(null);
  
  const scrollRef = useRef();
  const channelRef = useRef(null);
  const fileInputRef = useRef();
  
  const pc = useRef(new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  }));

  // --- NEW: FETCH USER FROM URL PARAM ---
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      const fetchUser = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (data) setSelectedUser(data);
      };
      fetchUser();
    }
  }, [searchParams]);

  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order('updated_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  const markAsRead = async () => {
    if (!selectedUser || !currentUser) return;
    await supabase
      .from('messages')
      .update({ unread: false })
      .eq('sender_id', selectedUser.id)
      .eq('receiver_id', currentUser.id)
      .eq('unread', true);
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const channelId = [currentUser.id, selectedUser.id].sort().join("-");
    const channel = supabase.channel(`chat:${channelId}`, {
      config: { presence: { key: currentUser.id } }
    });

    channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === selectedUser.id && msg.receiver_id === currentUser.id) ||
          (msg.sender_id === currentUser.id && msg.receiver_id === selectedUser.id)
        ) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id === selectedUser.id) markAsRead();
          scrollToBottom();
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineStatus(!!state[selectedUser.id]);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedUser.id) {
          setOtherUserTyping(payload.typing);
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'call_signal' }, async ({ payload }) => {
        if (payload.targetId === currentUser.id) {
          if (payload.type === 'offer') setIncomingCall(payload);
          else if (payload.type === 'answer') await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          else if (payload.type === 'ice-candidate') await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    fetchMessages();
    markAsRead();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, currentUser]);

  const handleSendMessage = async (type = 'text', mediaUrl = null, metadata = {}) => {
    if (type === 'text' && !newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      last_msg: type === 'text' ? newMessage : `Sent a ${type}`,
      type: type,
      media_url: mediaUrl,
      metadata: metadata,
      unread: true,
      user_name: currentUser.username || 'User',
      updated_at: new Date().toISOString()
    });

    if (!error) {
      setNewMessage("");
      scrollToBottom();
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));
    setSelectedFiles(prev => [...prev, ...previews]);
  };

  const handleSendWithMedia = async () => {
    if (selectedFiles.length > 0) {
      setUploading(true);
      for (const item of selectedFiles) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `chat/${fileName}`;
        const { error } = await supabase.storage.from('media').upload(filePath, item.file);
        if (!error) {
          const { data } = supabase.storage.from('media').getPublicUrl(filePath);
          await handleSendMessage(item.type, data.publicUrl);
        }
      }
      setSelectedFiles([]);
      setUploading(false);
    } else {
      handleSendMessage();
    }
  };

  const startVideoCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setCallStream(stream);
    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    channelRef.current.send({
      type: 'broadcast', event: 'call_signal',
      payload: { type: 'offer', sdp: offer, targetId: selectedUser.id, callerName: currentUser.username, callerId: currentUser.id }
    });
  };

  const acceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setCallStream(stream);
    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
    await pc.current.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    channelRef.current.send({
      type: 'broadcast', event: 'call_signal',
      payload: { type: 'answer', sdp: answer, targetId: incomingCall.callerId }
    });
    setIncomingCall(null);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, typing: true }
      });
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'image':
        return <img src={msg.media_url} alt="sent" className="rounded-lg max-w-xs cursor-pointer hover:opacity-90" onClick={() => window.open(msg.media_url, '_blank')} />;
      case 'video':
        return <video controls src={msg.media_url} className="rounded-lg max-w-xs" />;
      case 'audio_note':
        return (
          <div className="flex items-center gap-2 bg-black/20 p-2 rounded-full min-w-[200px]">
            <button className="w-8 h-8 rounded-full bg-[#00f2ea] flex items-center justify-center text-black">
              <Play size={14} fill="currentColor" />
            </button>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-[#00f2ea]" />
            </div>
            <span className="text-[10px]">{msg.metadata?.duration || '0:00'}</span>
          </div>
        );
      case 'video_call':
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="p-2 bg-white/10 rounded-full"><VideoIcon size={16} className="text-[#fe2c55]" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-tighter">Video Call</p>
              <p className="text-[10px] opacity-60">{msg.metadata?.status === 'missed' ? 'Missed' : (msg.call_duration || 0) + 's'}</p>
            </div>
          </div>
        );
      case 'gif':
        return <img src={msg.media_url} alt="gif" className="rounded-lg w-48 border border-white/10" />;
      default:
        return <p className="text-[14px] leading-relaxed">{msg.last_msg}</p>;
    }
  };

  // --- NEW: PREVENT RENDERING CRASH ---
  if (!selectedUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0c]">
        <Loader2 className="animate-spin text-[#00f2ea]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-white">
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="bg-zinc-900 p-8 rounded-[2rem] border border-[#fe2c55]/30 text-center shadow-[0_0_50px_rgba(254,44,85,0.2)]">
            <h2 className="text-xl font-bold mb-4">Incoming Call from {incomingCall.callerName}</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setIncomingCall(null)} className="p-4 bg-red-600 rounded-full"><X /></button>
              <button onClick={acceptCall} className="p-4 bg-[#00f2ea] rounded-full text-black"><VideoIcon /></button>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" multiple />

      {/* Header with safe data access */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-black/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={selectedUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser?.id}`} className="w-10 h-10 rounded-full border border-[#00f2ea]/30 object-cover" alt="" />
            {onlineStatus && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00f2ea] rounded-full border-2 border-[#0a0a0c] shadow-[0_0_10px_#00f2ea]" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm italic">@{selectedUser?.username}</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
              {onlineStatus ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-zinc-400">
          <Phone size={20} className="hover:text-[#00f2ea] cursor-pointer transition-colors" />
          <VideoIcon onClick={startVideoCall} size={20} className="hover:text-[#fe2c55] cursor-pointer transition-colors" />
          <MoreVertical size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] group ${msg.sender_id === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-2 rounded-2xl relative shadow-xl ${
                msg.sender_id === currentUser.id 
                ? 'bg-gradient-to-br from-[#00f2ea] to-blue-600 text-black rounded-tr-none shadow-[0_5px_15px_rgba(0,242,234,0.1)]' 
                : 'bg-zinc-900 border border-white/5 text-white rounded-tl-none'
              }`}>
                {renderMessageContent(msg)}
                <div className={`flex items-center gap-1 mt-1 opacity-40 text-[9px] ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                   {msg.updated_at ? formatDistanceToNow(new Date(msg.updated_at), { addSuffix: true }) : 'just now'}
                   {msg.sender_id === currentUser.id && <CheckCheck size={12} className={msg.unread ? 'text-black/50' : 'text-blue-900'} />}
                </div>
              </div>
            </div>
          </div>
        ))}
        {otherUserTyping && (
          <div className="flex gap-2 items-center text-[#00f2ea] italic text-[10px] animate-pulse">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-[#00f2ea] rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-[#00f2ea] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-[#00f2ea] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            {selectedUser?.username} is typing...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {selectedFiles.length > 0 && (
        <div className="p-2 bg-black/40 backdrop-blur-md flex gap-2 border-t border-white/5 overflow-x-auto">
          {selectedFiles.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#00f2ea]/50">
              <img src={f.url} className="w-full h-full object-cover" />
              <X onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} size={14} className="absolute top-0 right-0 bg-black text-white cursor-pointer" />
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center gap-2 bg-zinc-900/80 rounded-2xl p-2 border border-white/5 focus-within:border-[#00f2ea]/50 transition-all">
          <button 
            onClick={() => fileInputRef.current.click()}
            className={`p-2 text-zinc-500 hover:text-[#00f2ea] ${uploading ? 'animate-spin' : ''}`}
          >
            <Paperclip size={20} />
          </button>
          
          <input 
            className="flex-1 bg-transparent border-none outline-none text-sm py-2 text-white placeholder-zinc-600"
            placeholder="Write to the Universe..."
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && handleSendWithMedia()}
          />
          
          <button className="p-2 text-zinc-500 hover:text-yellow-400"><Smile size={20} /></button>
          
          <button 
            onClick={handleSendWithMedia}
            className={`${(newMessage.trim() || selectedFiles.length > 0) ? 'bg-[#fe2c55]' : 'bg-zinc-800'} p-3 rounded-xl shadow-[0_0_15px_#fe2c5566] active:scale-95 transition-transform text-white`}
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;