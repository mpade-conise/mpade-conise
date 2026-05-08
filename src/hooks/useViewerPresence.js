import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const useViewerPresence = (streamId, user) => {
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`presence-${streamId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Transform the presence object into a simple array of user info
        const joinedViewers = Object.values(state).flat();
        setViewers(joinedViewers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            user_name: user.user_metadata?.full_name || 'Anonymous',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => channel.unsubscribe();
  }, [streamId, user]);

  return viewers;
};

export default useViewerPresence;