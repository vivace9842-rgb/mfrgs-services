import { createClient } from '@supabase/supabase-js';
import stripeLib from 'stripe';

// 1. Inicializa o Stripe
const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);

// 2. Corrige as variáveis do Supabase (sem repetição!)
const supabaseUrl = process.env.SUPABASE_URL;
// Usa a chave de serviço (permite escrita no banco)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// ✅ Inicializa o cliente Supabase que estava faltando
const supabase = createClient(supabaseUrl, supabaseKey);

// Mantém a configuração do bodyParser certa
export const config = {
  api: {
    bodyParser: false,
  },
};

// Função de raw body continua igual
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error(`❌ Erro na assinatura: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`💰 Pagamento confirmado: ${session.customer_email}`);

        // ✅ Agora o supabase existe e funciona
        const { error } = await supabase
          .from('payments')
          .insert([{ 
            email: session.customer_email, 
            status: 'paid',
            session_id: session.id
          }]);

        if (error) throw error;
      }

      // ✅ Retorno 200 garantido
      return res.status(200).json({ received: true });

    } catch (dbError) {
      console.error(`❌ Erro Supabase: ${dbError.message}`);
      return res.status(500).json({ error: dbError.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
}
