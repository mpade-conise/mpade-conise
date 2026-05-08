import { supabase } from './supabaseClient';

export const moderationService = {
  // Check if a user is currently banned from a specific stream
  isUserBanned: async (userId, streamId) => {
    const { data } = await supabase
      .from('banned_users')
      .select('id')
      .eq('user_id', userId)
      .eq('stream_id', streamId)
      .single();
    return !!data;
  },

  // Record a community report
  submitReport: async (reportData) => {
    return await supabase
      .from('stream_reports')
      .insert([reportData]);
  }
};