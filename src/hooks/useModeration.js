import { supabase } from '../services/supabaseClient';

const useModeration = (streamId) => {
  
  const deleteMessage = async (messageId) => {
    const { error } = await supabase
      .from('live_comments')
      .delete()
      .eq('id', messageId);
    return { success: !error };
  };

  const banUser = async (userId, reason = "Policy Violation") => {
    const { error } = await supabase
      .from('banned_users')
      .insert([{ 
        user_id: userId, 
        stream_id: streamId, 
        reason 
      }]);
    return { success: !error };
  };

  const reportStream = async (reporterId, reason) => {
    const { error } = await supabase
      .from('stream_reports')
      .insert([{
        stream_id: streamId,
        reporter_id: reporterId,
        reason: reason,
        status: 'pending'
      }]);
    return { success: !error };
  };

  return { deleteMessage, banUser, reportStream };
};

export default useModeration;