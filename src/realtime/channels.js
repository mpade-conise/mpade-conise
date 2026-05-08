import { supabase } from '../services/supabaseClient';

export const streamChannels = {
  // Join a specific stream's data broadcast
  joinStream: (streamId, onUpdate) => {
    return supabase
      .channel(`stream:${streamId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'live_streams', 
        filter: `id=eq.${streamId}` 
      }, payload => onUpdate(payload.new))
      .subscribe();
  },

  // Leave all channels for a specific stream
  leaveStream: (streamId) => {
    supabase.removeChannel(supabase.channel(`stream:${streamId}`));
  }
};