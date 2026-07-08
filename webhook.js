// /api/webhook.js
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { companyName, cnpj } = session.metadata;
    const clientEmail = session.customer_details.email;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    try {
      const { error } = await supabase.from('clients').insert([
        {
          email: clientEmail,
          company_name: companyName,
          cnpj: cnpj,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        },
      ]);

      if (error) throw error;

      console.log(`[MFRGS SUCCESS] Cliente ${companyName} inserido no Supabase.`);
    } catch (dbErr) {
      console.error('Erro ao salvar cliente no banco:', dbErr);
      return res.status(500).send('Webhook processado, mas falhou ao salvar no banco.');
    }
  }

  res.json({ received: true });
}
