import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sendgridKey =
  process.env.SENDGRID_API_KEY ||
  process.env.ENDGRID_API_KEY;

if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed'
    });
  }

  const signature = req.headers['stripe-signature'];

  let event;

  try {
    const rawBody = req.body;

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('❌ Stripe webhook signature error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email || 'sem-email';
    const customerName = session.customer_details?.name || 'Cliente';
    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    const companyQuery = session.metadata?.company || session.metadata?.companyName || 'Empresa Consultada';

    const { error: orderError } = await supabase.from('orders').insert({
      email: customerEmail,
      amount: amountTotal,
      status: 'approved',
      session_id: session.id,
      gateway: 'stripe',
      stripe_id: session.id,
      currency: session.currency || 'usd',
      metadata: { company: companyQuery, customer_name: customerName, stripe_session: session.id }
    });

    if (orderError) console.error('❌ Erro orders:', orderError.message);

    if (sendgridKey) {
      try {
        await sgMail.send({
          to: customerEmail,
          from: process.env.SENDGRID_FROM || 'noreply@mfrgs.com.br',
          subject: `[MFRGS] Verificação recebida - ${companyQuery}`,
          html: `<h2>MFRGS INOVAÇÕES</h2><p>Olá ${customerName},</p><p>Seu pagamento foi confirmado.</p>`
        });
      } catch (emailError) {
        console.error('❌ Erro email:', emailError.message);
      }
    }
  }

  return res.status(200).json({ received: true });
}
