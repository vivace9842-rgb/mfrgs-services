const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { searchCompany } = require("../lib/companiesHouse");
const { generateReportBuffer } = require("../lib/pdfGenerator");
const { sendReportEmail } = require("../lib/emailSender");

module.exports.config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const clientData = {
      client_name: session.customer_details?.name || "Cliente MFRGS",
      client_email: session.customer_details?.email,
      searched_company: session.metadata?.company_name || "",
    };

    try {
      const companyData = await searchCompany(clientData.searched_company);
      const pdfBuffer = await generateReportBuffer(companyData, clientData);
      await sendReportEmail(clientData.client_email, clientData.client_name, clientData.searched_company, pdfBuffer);
    } catch (err) {
      console.error("Erro na pipeline:", err.message);
    }
  }

  return res.status(200).json({ received: true });
};