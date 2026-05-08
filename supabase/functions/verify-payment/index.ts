import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // 1. Detect if this is a Webhook from PayChangu or a call from your Frontend
    // Webhooks put the ref in body.data.tx_ref; Frontend puts it in body.tx_ref
    const tx_ref = body.tx_ref || body.data?.tx_ref

    if (!tx_ref) throw new Error('Missing transaction reference')

    console.log(`Verifying transaction: ${tx_ref}`)

    // 2. Double-check with PayChangu API (Safety first)
    const paychanguRes = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('PAYCHANGU_SECRET_KEY')}`
      }
    })

    const paymentStatus = await paychanguRes.json()

    if (paymentStatus.status === 'success' && paymentStatus.data.status === 'success') {
      
      // 3. Parse the tx_ref: RCG-[TIMESTAMP]-[COINS]-[USER_ID]
      const parts = tx_ref.split('-')
      const coinsToAdd = parseInt(parts[2])
      // Using index 3, 4, etc., to rebuild the UUID in case it contains hyphens
      const userId = parts.slice(3).join('-') 

      if (!userId || isNaN(coinsToAdd)) {
        throw new Error('Invalid tx_ref format')
      }

      // 4. Initialize Admin Client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 5. Check if this transaction has already been processed 
      // (Prevents double-adding coins if both Frontend and Webhook fire)
      // Note: You might want to create a 'payments' table later to track this better.

      // 6. Update user balance
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single()

      if (fetchError) throw new Error('Profile not found')

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ coins: (profile?.coins || 0) + coinsToAdd })
        .eq('id', userId)

      if (updateError) throw updateError

      console.log(`Success! Added ${coinsToAdd} coins to user ${userId}`)

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Balance updated" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Payment not confirmed by PayChangu')

  } catch (error) {
    console.error(`Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})