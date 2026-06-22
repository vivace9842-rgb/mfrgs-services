module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  try {
    console.log("DEBUG: Webhook iniciado com sucesso.");
    
    // Teste de variáveis de ambiente
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    console.log(`DEBUG: STRIPE_SECRET_KEY presente: ${hasStripeKey}`);

    if (req.method === "GET") {
      return res.status(200).json({ status: "OK", stripe_key: hasStripeKey });
    }

    // Se chegar aqui, é um POST
    return res.status(200).json({ status: "POST_RECEIVED" });

  } catch (err) {
    console.error("ERRO CRÍTICO:", err);
    return res.status(500).json({ error: err.message });
  }
};