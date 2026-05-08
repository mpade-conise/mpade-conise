import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { mobile, amount, operator_id } = await req.json()

  const response = await fetch('https://api.paychangu.com/mobile-money/payouts/initialize', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('PAYCHANGU_SECRET_KEY')}`
    },
    body: JSON.stringify({
      mobile: mobile,
      amount: Number(amount),
      mobile_money_operator_ref_id: operator_id,
      charge_id: `WD-${Date.now()}`
    })
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
})