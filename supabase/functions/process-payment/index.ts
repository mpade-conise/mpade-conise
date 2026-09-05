import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PACKAGES: Record<number, { amount: number; coins: number }> = {
  1: { amount: 1000, coins: 500 },
  2: { amount: 2500, coins: 1500 },
  3: { amount: 7500, coins: 5000 },
  4: { amount: 15000, coins: 12000 },
  5: { amount: 35000, coins: 30000 },
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      throw new Error("Not authenticated")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const paychanguKey =
      Deno.env.get("PAYCHANGU_SECRET_KEY")

    if (!paychanguKey) {
      throw new Error(
        "PayChangu secret key is not configured"
      )
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

    // Verify logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      throw new Error("Invalid authentication")
    }

    const body = await req.json()

    const packageId = Number(body.packageId)
    const mobileNumber = String(
      body.mobileNumber || ""
    ).trim()
    const mobileProvider = String(
      body.mobileProvider || "TNM"
    ).trim().toUpperCase()

    // Validate package
    const selectedPackage = PACKAGES[packageId]

    if (!selectedPackage) {
      throw new Error("Invalid recharge package")
    }

    if (!mobileNumber) {
      throw new Error(
        "Mobile money number is required"
      )
    }

    if (
      mobileProvider !== "TNM" &&
      mobileProvider !== "AIRTEL"
    ) {
      throw new Error(
        "Unsupported mobile money provider"
      )
    }

    const amount = selectedPackage.amount
    const coins = selectedPackage.coins

    console.log(
      `Starting payment: user=${user.id}, amount=${amount}, coins=${coins}, provider=${mobileProvider}`
    )

    /*
     * Create Direct Mobile Money payment with PayChangu.
     *
     * IMPORTANT:
     * This is the only place where the PayChangu
     * secret key is used.
     */
    const paychanguResponse = await fetch(
      "https://api.paychangu.com/mobile-money/payments/initialize",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${paychanguKey}`,
        },
        body: JSON.stringify({
          amount: amount,
          currency: "MWK",
          mobile_number: mobileNumber,
          mobile_money_operator:
            mobileProvider === "AIRTEL"
              ? "AIRTEL"
              : "TNM",
        }),
      }
    )

    const paychanguData =
      await paychanguResponse.json()

    console.log(
      "PayChangu initialization response:",
      JSON.stringify(paychanguData)
    )

    if (!paychanguResponse.ok) {
      throw new Error(
        paychanguData?.message ||
        paychanguData?.error ||
        "PayChangu payment initialization failed"
      )
    }

    /*
     * PayChangu may return the charge ID in
     * different response locations depending on
     * the API response.
     */
    const chargeId =
      paychanguData?.data?.charge_id ||
      paychanguData?.data?.chargeId ||
      paychanguData?.charge_id ||
      paychanguData?.chargeId

    if (!chargeId) {
      console.error(
        "No charge ID returned by PayChangu:",
        paychanguData
      )

      throw new Error(
        "PayChangu did not return a charge ID"
      )
    }

    // Admin client
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    // Save payment before returning to frontend
    const { error: insertError } =
      await supabaseAdmin
        .from("payments")
        .insert({
          user_id: user.id,
          charge_id: String(chargeId),
          amount,
          coins,
          provider: mobileProvider,
          mobile_number: mobileNumber,
          status: "pending",
        })

    if (insertError) {
      console.error(
        "Payment database insert error:",
        insertError
      )

      throw new Error(
        "Payment was created but could not be recorded"
      )
    }

    console.log(
      `Payment initialized successfully: ${chargeId}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        chargeId: String(chargeId),
        amount,
        coins,
        provider: mobileProvider,
        message:
          "Payment request sent. Please approve it on your phone.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    console.error(
      "Process payment error:",
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
            : "Payment initialization failed",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})
