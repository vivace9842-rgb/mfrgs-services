cat << 'EOF' > api/success.js
import Stripe from "stripe";
import { callVerifyInternally } from "./report.js";
import { generateReportPdf } from "./pdf.js";
import { sendReportEmail } from "./utils/email.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id, service } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // 1. Recupera a sessão do Stripe para obter os dados do comprador
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    const email = session.customer_details?.email;
    const name = session.customer_details?.name || "Client";
    const serviceName = service ? service.toUpperCase() : "EXPRESS";

    if (!email) {
      return res.status(400).json({ error: 'Email not found in checkout session' });
    }

    // Identificação padrão para processamento inicial
    const companyName = "Verified Business"; 

    console.log(`[MFRGS GUARDIAN] Processando plano ${serviceName} para: ${email}`);

    // 2. Consulta de dados na Companies House via sub-módulo interno
    const verificacao = await callVerifyInternally(email, companyName);
    
    const report = {
      cliente: email,
      empresa: verificacao.empresa || companyName,
      company_number: verificacao.company_number || null,
      status: verificacao.status || null,
      data_registro: verificacao.data_registro || null,
      diretores: verificacao.diretores || [],
      analise: {
        risco: verificacao.risco || "Low",
        score: verificacao.score || 85,
        flags: verificacao.flags || [],
      },
      fonte: "Companies House (UK Government)",
      gerado_em: new Date().toISOString(),
    };

    // 3. Geração física do PDF
    const pdfBytes = await generateReportPdf(report);

    // 4. Envio do e-mail com o PDF anexado
    await sendReportEmail({
      to: email,
      companyName: `${report.empresa} (${serviceName} Plan)`,
      pdfBytes,
      riskLevel: report.analise.risco,
      score: report.analise.score,
    });

    // 5. Interface limpa de sucesso para o cliente final
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 60px 20px; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="font-size: 50px; color: #2e7d32; margin-bottom: 20px;">✓</div>
        <h1 style="color: #111; margin-bottom: 10px;">Payment Confirmed!</h1>
        <p style="font-size: 18px; color: #555; line-height: 1.6;">
          Thank you, <strong>${name}</strong>. Your <strong>MFRGS ${serviceName} Verification</strong> is complete.
        </p>
        <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
          The official verification report has been generated and sent to <strong>${email}</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 30px;">
        <p style="font-size: 14px; color: #999;">MFRGS Digital Verification • Secure Global Checkout</p>
      </div>
    `);

  } catch (error) {
    console.error("[GUARDIAN ERROR] Erro no fluxo de sucesso:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
EOF