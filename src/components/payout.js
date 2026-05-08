const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

const handlePayout = async (req, res) => {
  const { userId, amount, phoneNumber, provider } = req.body;

  try {
    // 1. Check User Balance in Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profileError || profile.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds in Mpade Universe' });
    }

    // 2. Trigger PayChangu Payout API
    const response = await axios.post(
      'https://api.paychangu.com/payouts', 
      {
        amount: amount,
        currency: 'MWK',
        mobile_money_number: phoneNumber,
        mobile_money_provider: provider, // 'airtel' or 'tnm'
        callback_url: 'https://your-api.com/webhooks/paychangu',
        reference: `MPADE-${Date.now()}`
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      // 3. Deduct balance from Supabase if API call is successful
      await supabase
        .from('profiles')
        .update({ balance: profile.balance - amount })
        .eq('id', userId);

      return res.status(200).json({ message: 'Payout initiated successfully', data: response.data });
    }

  } catch (error) {
    console.error('PayChangu Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Payout failed. Please try again later.' });
  }
};

module.exports = { handlePayout };