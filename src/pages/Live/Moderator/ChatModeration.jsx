import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Trash2, UserX, ShieldAlert } from 'lucide-react';

const ChatModeration = ({ streamId }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initial load
    const fetchChat = async () => {
      const { data } = await supabase
        .from('live_comments')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(100);
      setMessages(data || []);
    };
    fetchChat();

    // Listen for new messages
    const sub = supabase
      .channel('mod-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_comments' }, fetchChat)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [streamId]);

  const deleteMessage = async (msgId) => {
    await supabase.from('live_comments').delete().eq('id', msgId);
  };

  const banUser = async (userId, userName) => {
    if (window.confirm(`Ban ${userName} from this stream?`)) {
      await supabase.from('banned_users').insert([{ 
        user_id: userId, 
        stream_id: streamId,
        reason: "Moderator Action"
      }]);
      // Logic to delete all user's messages would go here
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
      {messages.map((m) => (
        <div key={m.id} className="group flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#fe2c55] uppercase tracking-tighter">{m.user_name}</span>
            <p className="text-sm text-zinc-300">{m.text}</p>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => deleteMessage(m.id)}
              className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg"
              title="Delete Message"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => banUser(m.user_id, m.user_name)}
              className="p-2 hover:bg-orange-500/20 text-orange-500 rounded-lg"
              title="Ban User"
            >
              <UserX size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatModeration;