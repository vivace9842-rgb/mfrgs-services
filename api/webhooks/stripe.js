import { createClient } from '@supabase/supabase-js';
import stripeLib from 'stripe';
import { buffer } from 'micro';
const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export const config = { api: { bodyParser: false } };
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const event = stripe.webhooks.constructEvent(buf, sig, secret);
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const { error } = await supabase.from('orders').insert([{
        email: s.customer_email || s.customer_details?.email,
        status: 'paid',
        session_id: s.id,
        amount: s.amount_total ? s.amount_total / 100 : 0,
        created_at: new Date().toISOString()
      }]);
      if(error) console.error('SUPABASE ERROR:', error);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e.message);
    return res.status(400).send(e.message);
  }
}
