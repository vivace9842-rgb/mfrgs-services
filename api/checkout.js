import Stripe from 'stripe';

// A chave secreta será lida direto do painel da Vercel (sem vazar no código)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Configuração básica de CORS caso precise testar localmente
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, company, number, country, priority } = req.body;

    // Definição dinâmica de preços com base na escolha do cliente
    const isPriority = priority === true || priority === 'true';
    const amount = isPriority ? 99.00 : 49.00;
    const serviceName = isPriority ? 'Priority Fast-Track Verification' : 'Standard Digital Audit';

    console.log(`[MFRGS] Creating Stripe session for ${email} - ${company} (${serviceName})`);

    // Cria a sessão de checkout na Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Aceita cartões de crédito e débito globais (Visa, Mastercard, Amex)
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd', // Faturamento internacional em Dólar Americano
            product_data: {
              name: `MFRGS Corporate Intelligence: ${company}`,
              description: `Official Legal Verification Report for ${country}. File Ref: ${number || 'N/A'}. Service level: ${serviceName}.`,
            },
            unit_amount: Math.round(amount * 100), // A Stripe processa em centavos (ex: 49.00 -> 4900)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Links de redirecionamento pós-pagamento
      success_url: `${req.headers.origin}/success.html?email=${encodeURIComponent(email || '')}&company=${encodeURIComponent(company || '')}&number=${encodeURIComponent(number || '')}&country=${encodeURIComponent(country || '')}&status=paid`,
      cancel_url: `${req.headers.origin}/index.html?payment=cancelled`,
    });

    // Retorna a URL segura do checkout da Stripe para o frontend redirecionar o cliente
    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('[MFRGS CHECKOUT ERROR]:', error.message);
    return res.status(500).json({ error: 'Failed to initialize gateway transaction.', details: error.message });
  }
}