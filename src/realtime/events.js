import { supabase } from '../services/supabaseClient';

export const liveEvents = {
  // Emit a non-persistent event (e.g., Screen Shake, Custom Sound)
  emit: (streamId, eventName, payload) => {
    supabase.channel(`events:${streamId}`).send({
      type: 'broadcast',
      event: eventName,
      payload: payload,
    });
  },

  // Listen for those events
  listen: (streamId, eventName, callback) => {
    return supabase
      .channel(`events:${streamId}`)
      .on('broadcast', { event: eventName }, ({ payload }) => {
        callback(payload);
      })
      .subscribe();
  }
};