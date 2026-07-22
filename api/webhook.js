import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configura a chave do SendGrid (aceita ENDGRID_API_KEY ou SENDGRID_API_KEY)
const sendgridKey = process.env.ENDGRID_API_KEY || process.env.SENDGRID_API_KEY;
if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
}

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
    const companyQuery = session.metadata?.company || session.metadata?.companyName || 'Empresa Consultada';

    // 1. Grava na tabela orders para o painel admin
    const { error: dbError } = await supabase.from('orders').insert({
      id: session.id,
      email: customerEmail,
      customer_name: customerName,
      amount: amountTotal,
      status: 'approved',
      product_name: `Verificação: ${companyQuery}`
    });

    if (dbError) {
      console.error('❌ Erro ao salvar no Supabase:', dbError.message);
      return res.status(500).json({ error: dbError.message });
    }

    console.log(`✅ VENDA SALVA NO SUPABASE: ${customerEmail} | Empresa: ${companyQuery}`);

    // 2. Dispara o e-mail de entrega via SendGrid
    if (sendgridKey) {
      try {
        const senderEmail = process.env.RESEND_FROM || process.env.SENDGRID_FROM || 'noreply@mfrgs.com.br';
        
        const msg = {
          to: customerEmail,
          from: senderEmail, // E-mail verificado no SendGrid
          subject: `[MFRGS] Relatório de Verificação — ${companyQuery}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
              <h2 style="color: #0f172a;">MFRGS INOVAÇÕES</h2>
              <p>Olá, <strong>${customerName}</strong>!</p>
              <p>Seu pagamento foi aprovado com sucesso. O relatório de inteligência e verificação para a empresa <strong>${companyQuery}</strong> foi processado.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">MFRGS DIGITAL VERIFICATION — Todos os direitos reservados.</p>
            </div>
          `,
        };

        await sgMail.send(msg);
        console.log(`📧 E-MAIL ENVIADO COM SUCESSO VIA SENDGRID PARA: ${customerEmail}`);
      } catch (emailErr) {
        console.error('❌ Erro ao enviar e-mail pelo SendGrid:', emailErr.response?.body || emailErr.message);
        // Não retorna erro 500 para a Stripe não refazer o webhook, pois o pagamento e a venda já foram salvos com sucesso no Supabase.
      }
    }
  }

  return res.status(200).json({ received: true });
}