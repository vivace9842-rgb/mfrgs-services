import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      
      const { error } = await supabase.from('orders').insert({
        id: s.id,
        email: s.customer_details?.email || s.customer_email,
        amount: s.amount_total ? s.amount_total / 100 : 0,
        status: 'paid',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('SUPABASE INSERT ERROR:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log('✅ VENDA SALVA:', s.customer_details?.email, '$' + (s.amount_total / 100));
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error('WEBHOOK ERROR:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
}
