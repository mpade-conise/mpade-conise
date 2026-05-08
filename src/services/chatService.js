import { supabase } from './supabaseClient';

export const chatService = {
  // Clear chat for a specific stream (Admin/Mod only)
  clearChannel: async (streamId) => {
    return await supabase
      .from('live_comments')
      .delete()
      .eq('stream_id', streamId);
  },

  // Toggle slow mode or chat restrictions
  updateChatSettings: async (streamId, isLocked) => {
    return await supabase
      .from('live_streams')
      .update({ chat_locked: isLocked })
      .eq('id', streamId);
  }
};