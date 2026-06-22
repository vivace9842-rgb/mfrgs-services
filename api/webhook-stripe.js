// Configuração para a Vercel não fazer o parse do body automaticamente
module.exports.config = {
  api: { bodyParser: false },
};

// Helper para capturar o corpo bruto
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // 1. Se for GET, responde imediatamente sem exigir chaves do Stripe (evita erro 500)
  if (req.method === "GET") {
    return res.status(200).json({ 
      status: "active", 
      endpoint: "MFRGS Stripe Webhook",
      diagnostics: {
        has_stripe_key: !!process.env.STRIPE_SECRET_KEY,
        has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
        has_companies_house_key: !!process.env.COMPANIES_HOUSE_API_KEY,
        has_sendgrid_key: !!process.env.SENDGRID_API_KEY
      },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Bloqueia métodos que não sejam POST para processamento
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  // 3. Validação das variáveis de ambiente antes de inicializar as dependências
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Erro de Configuração: STRIPE_SECRET_KEY não está definida na Vercel." });
  }

  try {
    // Inicialização segura dentro do handler para evitar crash no boot do serverless
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const { searchCompany } = require("../lib/companiesHouse");
    const { generateReportBuffer } = require("../lib/pdfGenerator");
    const { sendReportEmail } = require("../lib/emailSender");

    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).json({ error: "Assinatura do Stripe ausente no cabeçalho" });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: "Erro de Configuração: STRIPE_WEBHOOK_SECRET não está definida." });
    }

    // Validação da assinatura do Stripe
    const event = stripe.webhooks.constructEvent(
      rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Processamento do evento
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const clientData = {
        client_name: session.customer_details?.name || "Cliente MFRGS",
        client_email: session.customer_details?.email,
        searched_company: session.metadata?.company_name || "",
      };

      const companyData = await searchCompany(clientData.searched_company);
      const pdfBuffer = await generateReportBuffer(companyData, clientData);
      await sendReportEmail(clientData.client_email, clientData.client_name, clientData.searched_company, pdfBuffer);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error(`❌ Erro interno no Webhook:`, err.message);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message 
    });
  }
};