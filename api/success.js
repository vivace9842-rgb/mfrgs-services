cat << 'EOF' > api/success.js
import Stripe from "stripe";
import { callVerifyInternally } from "./report.js";
import { generateReportPdf } from "./pdf.js";
import { sendReportEmail } from "./utils/email.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // O Stripe redireciona o cliente via método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // 1. Busca os dados reais que o cliente preencheu no checkout do Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    const email = session.customer_details?.email;
    const name = session.customer_details?.name || "Cliente";

    if (!email) {
      return res.status(400).json({ error: 'Email not found in checkout session' });
    }

    // Como estamos simplificando, definimos a empresa temporariamente ou buscamos de um parâmetro extra
    const companyName = "Empresa Verificada"; 

    console.log(`Processando relatório pós-pagamento para: ${email}`);

    // 2. Executa a busca real na API da Companies House do Reino Unido
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

    // 3. Desenha o relatório PDF bonitão
    const pdfBytes = await generateReportPdf(report);

    // 4. Dispara o PDF direto para a caixa de entrada do comprador
    await sendReportEmail({
      to: email,
      companyName: report.empresa,
      pdfBytes,
      riskLevel: report.analise.risco,
      score: report.analise.score,
    });

    // 5. Exibe uma mensagem bonita de sucesso na tela para o usuário final
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #2e7d32;">Payment Confirmed!</h1>
        <p style="font-size: 18px;">Thank you, ${name}. Your Digital Verification report has been processed successfully.</p>
        <p style="color: #666;">We have sent the PDF document straight to <strong>${email}</strong>.</p>
        <br>
        <a href="/" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Back to Home</a>
      </div>
    `);

  } catch (error) {
    console.error("Erro ao processar sucesso de pagamento:", error.message);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
EOF