import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Garante que só aceita requisições POST da Stripe
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Captura o corpo bruto da requisição para validação de segurança da Stripe
  let rawBody = '';
  if (req.readable) {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    rawBody = Buffer.concat(buffers).toString();
  } else {
    rawBody = req.body;
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`❌ Erro de Assinatura: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Quando o pagamento for concluído com sucesso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const customerEmail = session.customer_details?.email || 'Sem email';
    const customerName = session.customer_details?.name || 'Cliente';
    const amountTotal = session.amount_total ? (session.amount_total / 100) : 0;

    // Grava diretamente na sua tabela orders com o status correto para o Admin
    const { error } = await supabase.from('orders').insert({
      id: session.id,
      email: customerEmail,
      customer_name: customerName,
      amount: amountTotal,
      status: 'approved', // Bate 100% com o filtro de Aprovados do admin.html
      product_name: 'Serviço MFRGS'
    });

    if (error) {
      console.error('❌ Erro ao salvar no Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ VENDA SALVA NO SUPABASE: ${customerEmail}`);
  }

  return res.status(200).json({ received: true });
}