const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Teste básico de recebimento
  console.log("Webhook do Stripe acionado na Vercel!");
  
  return res.status(200).json({ 
    received: true, 
    status: "Servidor recebeu o sinal do Stripe com sucesso!" 
  });
};
