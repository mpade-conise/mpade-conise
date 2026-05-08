import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const useLiveStream = (streamId) => {
  const [status, setStatus] = useState('loading'); // loading, live, ended, error
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const fetchStreamStatus = async () => {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', streamId)
        .single();

      if (error || !data) {
        setStatus('error');
      } else {
        setMetadata(data);
        setStatus(data.status);
      }
    };

    fetchStreamStatus();

    // Subscribe to real-time status changes (e.g., Host clicks "End Stream")
    const channel = supabase
      .channel(`status-${streamId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'live_streams', 
        filter: `id=eq.${streamId}` 
      }, (payload) => {
        setStatus(payload.new.status);
        setMetadata(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [streamId]);

  return { status, metadata };
};

export default useLiveStream;