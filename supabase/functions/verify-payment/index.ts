import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const paychanguKey = Deno.env.get('PAYCHANGU_SECRET_KEY')

    if (!paychanguKey) {
      throw new Error('PayChangu secret key is not configured')
    }

    // Client using the user's JWT
    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    const body = await req.json()

    // New Direct Mobile Money flow uses chargeId
    const chargeId = String(body.chargeId || '').trim()

    if (!chargeId) {
      throw new Error('Missing charge ID')
    }

    console.log(`Verifying payment: ${chargeId}`)

    // Admin client
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    // 1. Find the payment created by process-payment
    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('charge_id', chargeId)
        .eq('user_id', user.id)
        .single()

    if (paymentError || !payment) {
      console.error('Payment lookup error:', paymentError)
      throw new Error('Payment record not found')
    }

    // 2. Prevent double crediting
    if (payment.status === 'success') {
      console.log(`Payment ${chargeId} was already credited`)

      return new Response(
        JSON.stringify({
          success: true,
          alreadyCredited: true,
          status: 'success',
          coins: payment.coins,
          message: 'Payment has already been credited.',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      )
    }

    // 3. Verify the Direct Mobile Money payment with PayChangu
    const paychanguRes = await fetch(
      `https://api.paychangu.com/mobile-money/payments/${encodeURIComponent(chargeId)}/verify`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${paychanguKey}`,
        },
      }
    )

    const paychanguData = await paychanguRes.json()

    console.log(
      'PayChangu verification status:',
      paychanguData?.status
    )

    if (!paychanguRes.ok) {
      throw new Error(
        paychanguData?.message ||
        'PayChangu verification failed'
      )
    }

    // 4. Check transaction status
    const transaction = paychanguData?.data

    if (!transaction) {
      throw new Error('Invalid PayChangu response')
    }

    const transactionStatus = String(
      transaction.status ||
      paychanguData.status ||
      ''
    ).toLowerCase()

    if (
      transactionStatus !== 'success' &&
      transactionStatus !== 'successful'
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          status: transactionStatus || 'pending',
          message:
            'Payment has not been completed yet. Please approve the payment on your phone.',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      )
    }

    // 5. Verify amount
    const paidAmount = Number(transaction.amount)
    const expectedAmount = Number(payment.amount)

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount !== expectedAmount
    ) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('charge_id', chargeId)
        .eq('user_id', user.id)

      throw new Error('Payment amount does not match')
    }

    // 6. Verify currency
    const currency = String(
      transaction.currency || ''
    ).toUpperCase()

    if (currency !== 'MWK' && currency !== 'MK') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('charge_id', chargeId)
        .eq('user_id', user.id)

      throw new Error('Invalid payment currency')
    }

    // 7. Atomically credit the user's coins
    const { data: creditResult, error: creditError } =
      await supabaseAdmin.rpc(
        'credit_recharge',
        {
          p_charge_id: chargeId,
          p_user_id: user.id,
          p_amount: expectedAmount,
          p_coins: Number(payment.coins),
        }
      )

    if (creditError) {
      console.error(
        'Credit recharge error:',
        creditError
      )

      throw new Error(
        'Payment verified but coins could not be credited'
      )
    }

    console.log(
      `Success! Added ${payment.coins} coins to user ${user.id}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        alreadyCredited:
          creditResult?.already_credited || false,
        status: 'success',
        coins: Number(payment.coins),
        amount: expectedAmount,
        chargeId,
        message:
          'Payment verified and coins credited successfully.',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error(
      'Verify payment error:',
      error instanceof Error
        ? error.message
        : error
    )

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Payment verification failed',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})
