import { createClient } from '@supabase/supabase-js';
import stripeLib from 'stripe';

// 1. Inicializa o Stripe
const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);

// 2. Inicializa o Supabase com as variáveis padrão do seu projeto
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração necessária para a Vercel não tentar parsear o body como JSON antes do Stripe ler
export const config = {
  api: {
    bodyParser: false,
  },
};

// Função para pegar o body bruto (raw body) exigido pelo Stripe
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
      // Valida se a requisição realmente veio do Stripe
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error(`❌ Erro na assinatura do Webhook: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processa os eventos do Stripe
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        console.log(`💰 Sessão de checkout concluída para: ${session.customer_email}`);

        // Insira ou atualize o status de pagamento no seu banco de dados
        // Exemplo:
        // const { error } = await supabase
        //   .from('payments')
        //   .insert([{ email: session.customer_email, status: 'paid' }]);
        
        // if (error) throw error;
      }

      // Retorna sucesso para o Stripe
      return res.status(200).json({ received: true });

    } catch (dbError) {
      console.error(`❌ Erro ao salvar no Supabase: ${dbError.message}`);
      return res.status(500).json({ error: 'Erro interno ao salvar os dados.' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
}
