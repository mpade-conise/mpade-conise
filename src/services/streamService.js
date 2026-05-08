import { supabase } from './supabaseClient';

export const streamService = {
  // Initialize a new stream entry
  createStream: async (userId, title, category) => {
    const { data, error } = await supabase
      .from('live_streams')
      .insert([{ 
        host_id: userId, 
        title, 
        category, 
        status: 'live',
        started_at: new Date().toISOString()
      }])
      .select()
      .single();
    return { data, error };
  },

  // Gracefully shut down the stream
  endStream: async (streamId) => {
    const { error } = await supabase
      .from('live_streams')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString() 
      })
      .eq('id', streamId);
    return { success: !error };
  },

  // Get active streams for Discovery page
  getLiveStreams: async () => {
    return await supabase
      .from('live_streams')
      .select('*, host:host_id(full_name, avatar_url)')
      .eq('status', 'live');
  }
};