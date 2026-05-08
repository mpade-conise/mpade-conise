import { supabase } from './supabaseClient';

export const giftService = {
  // Execute a gift transaction via SQL RPC
  sendGift: async (streamId, senderId, giftId, price) => {
    // We use RPC to ensure the transaction is atomic (all or nothing)
    const { data, error } = await supabase.rpc('process_gift_transaction', {
      p_stream_id: streamId,
      p_sender_id: senderId,
      p_gift_id: giftId,
      p_amount: price
    });
    
    return { data, error };
  },

  // Fetch user's current coin balance (for Airtel/Mpamba top-ups)
  getWalletBalance: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    return data?.coins || 0;
  }
};