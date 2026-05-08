import { supabase } from '../services/supabaseClient';

export const initPresence = (streamId, userData) => {
  const channel = supabase.channel(`room:${streamId}`, {
    config: {
      presence: {
        key: userData.id,
      },
    },
  });

  return {
    channel,
    track: () => channel.track({
      user_id: userData.id,
      name: userData.full_name,
      avatar: userData.avatar_url,
      online_at: new Date().toISOString(),
    }),
    subscribe: (onSync) => {
      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          onSync(newState);
        })
        .subscribe();
    }
  };
};