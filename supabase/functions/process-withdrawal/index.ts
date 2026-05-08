import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paychanguKey = Deno.env.get('PAYCHANGU_SECRET_KEY');

    const { amountInCoins, mobileNumber, mobileProvider, userId } = await req.json()
    const withdrawalAmount = Number(amountInCoins);

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!)

    // 1. Map labels to the exact Ref IDs from your data
    const operatorMap: Record<string, string> = {
      'TNM': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
      'AIRTEL': '20be6c20-adeb-4b5b-a7ba-0769820df4fb'
    };

    const operatorRefId = operatorMap[mobileProvider.toUpperCase()];
    if (!operatorRefId) throw new Error("Unsupported mobile operator.");

    // --- NEW PRE-CHECK: PAYCHANGU WALLET BALANCE ---
    const balanceCheck = await fetch(`https://api.paychangu.com/payouts/balance`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${paychanguKey}`, 'Accept': 'application/json' }
    });
    const balanceData = await balanceCheck.json();
    
    // Calculate what we are trying to pay out in MWK
    const payoutAmountValue = Math.floor(withdrawalAmount * 0.7);

    // If API check works, ensure we have enough MWK in the wallet
    if (balanceData.status === 'success') {
       const availableMWK = Number(balanceData.data.balance);
       if (availableMWK < payoutAmountValue) {
         throw new Error(`System maintenance: Payout wallet balance is insufficient. Please contact support.`);
       }
    }

    // 2. Verification & Deduction Logic
    const { data: profile } = await supabaseAdmin.from('profiles').select('coins').eq('id', userId).single();
    if (!profile || profile.coins < withdrawalAmount) throw new Error("Insufficient coins.");

    // Deduction happens only AFTER we know the PayChangu wallet has money
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ coins: profile.coins - withdrawalAmount })
      .eq('id', userId);

    if (updateError) throw new Error("Failed to update local balance.");

    // 3. PayChangu API Call (POST /mobile-money/payouts/initialize)
    const paychanguRes = await fetch(`https://api.paychangu.com/mobile-money/payouts/initialize`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paychanguKey}`
      },
      body: JSON.stringify({
        amount: payoutAmountValue.toString(),
        mobile: mobileNumber,
        mobile_money_operator_ref_id: operatorRefId,
        charge_id: `WD-${Date.now()}-${userId.slice(0, 5)}`
      })
    });

    const payoutData = await paychanguRes.json();

    if (payoutData.status === 'success') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      // Refund on failure
      await supabaseAdmin.from('profiles').update({ coins: profile.coins }).eq('id', userId);
      throw new Error(payoutData.message || "Payout rejected by operator.");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})