const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { searchCompany } = require("../lib/companiesHouse");
const { generateReportBuffer } = require("../lib/pdfGenerator");
const { sendReportEmail } = require("../lib/emailSender");

// Desativa o bodyParser nativo da Vercel para podermos validar a assinatura do Stripe com o buffer bruto
module.exports.config = {
  api: { bodyParser: false },
};

// Helper para capturar o corpo bruto da requisição
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // 1. Permite requisições GET para testes e validação de endpoints
  if (req.method === "GET") {
    return res.status(200).json({ 
      status: "active", 
      endpoint: "MFRGS Stripe Webhook",
      timestamp: new Date().toISOString()
    });
  }

  // 2. Bloqueia qualquer outro método que não seja POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({ error: "Assinatura do Stripe ausente" });
    }

    // Validação de segurança Zero-Trust
    event = stripe.webhooks.constructEvent(
      rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ Erro na validação do Webhook: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // 3. Processamento do evento de pagamento aprovado
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    const clientData = {
      client_name: session.customer_details?.name || "Cliente MFRGS",
      client_email: session.customer_details?.email,
      searched_company: session.metadata?.company_name || "",
    };

    console.log(`🚀 Iniciando pipeline MFRGS para: ${clientData.searched_company}`);

    try {
      // Executa a busca na API da Companies House
      const companyData = await searchCompany(clientData.searched_company);
      
      // Gera o PDF em memória (Buffer)
      const pdfBuffer = await generateReportBuffer(companyData, clientData);
      
      // Envia o e-mail via SendGrid
      await sendReportEmail(
        clientData.client_email, 
        clientData.client_name, 
        clientData.searched_company, 
        pdfBuffer
      );
      
      console.log(`✅ Relatório enviado com sucesso para ${clientData.client_email}`);
    } catch (err) {
      console.error("❌ Erro na pipeline de processamento:", err.message);
    }
  }

  // Retorna sucesso para o Stripe
  return res.status(200).json({ received: true });
};