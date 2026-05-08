import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const { amountInCoins, recipientPhone, recipientName, mobileProvider, userId } = await req.json();

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Check user balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    const currentBalance = profile.coins;
    if (currentBalance < amountInCoins) {
      throw new Error('Insufficient balance');
    }

    const fee = Math.floor(amountInCoins * 0.05);
    const recipientAmount = amountInCoins - fee;

    // Deduct balance
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ coins: currentBalance - amountInCoins })
      .eq('id', userId);

    if (updateError) throw new Error('Failed to update balance');

    // Record payout
    const { error: insertError } = await supabaseAdmin
      .from('payouts')
      .insert({
        user_id: userId,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        amount: recipientAmount,
        fee: fee,
        provider: mobileProvider,
        status: 'completed'
      });

    if (insertError) {
      // Refund if recording fails
      await supabaseAdmin
        .from('profiles')
        .update({ coins: currentBalance })
        .eq('id', userId);
      throw new Error('Failed to record payout');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payout processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});