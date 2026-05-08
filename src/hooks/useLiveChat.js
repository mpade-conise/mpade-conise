import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const useLiveChat = (streamId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial history
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('live_comments')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      setMessages(data || []);
      setLoading(false);
    };

    fetchHistory();

    // 2. Listen for Real-time Messages
    const channel = supabase
      .channel(`chat-realtime-${streamId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_comments', 
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      // Listen for message deletions (Moderation)
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'live_comments' 
      }, (payload) => {
        setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [streamId]);

  const sendMessage = async (user, text) => {
    if (!text.trim()) return;
    await supabase.from('live_comments').insert([{
      stream_id: streamId,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || 'Fan',
      text: text
    }]);
  };

  return { messages, sendMessage, loading };
};

export default useLiveChat;