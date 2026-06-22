import { buffer } from 'micro';
import Stripe from 'stripe';
import { getCompanyDetails } from '../lib/companiesHouse.js';
import { generatePdfReport } from '../lib/pdfGenerator.js';
import { sendEmailWithPdf } from '../lib/emailSender.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`⚠️ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const clientEmail = session.customer_details?.email;
    const companyName = session.metadata?.companyName;

    if (!clientEmail || !companyName) {
      console.error('Dados ausentes no metadata da sessão do Stripe.');
      return res.status(400).send('Missing metadata.');
    }

    try {
      const companyData = await getCompanyDetails(companyName);

      if (!companyData) {
        await sendEmailWithPdf({
          to: clientEmail,
          subject: 'MFRGS Trust Check - Empresa não localizada',
          text: `Olá,\n\nNão localizamos registros ativos para "${companyName}" na Companies House (UK).\n\nSuporte MFRGS.`,
          html: `<p>Olá,</p><p>Não localizamos registros ativos para "<strong>${companyName}</strong>" na Companies House (UK).</p><p>Suporte MFRGS.</p>`
        });
        return res.status(200).json({ status: 'not_found' });
      }

      const pdfBuffer = await generatePdfReport(companyData);

      await sendEmailWithPdf({
        to: clientEmail,
        subject: `MFRGS Trust Check Report - ${companyData.name}`,
        text: `Segue em anexo o relatório oficial de verificação para a empresa ${companyData.name}.`,
        html: `<p>Segue em anexo o relatório oficial de verificação para a empresa <strong>${companyData.name}</strong>.</p>`,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `MFRGS_Report_${companyData.number}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          }
        ]
      });

      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Erro no processamento da automação:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(200).json({ received: true });
}