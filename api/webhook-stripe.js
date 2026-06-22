module.exports = async function handler(req, res) {
  try {
    // Retorna apenas dados básicos para testar se o arquivo compila na Vercel
    return res.status(200).json({
      status: "webhook_file_loaded",
      method: req.method,
      env_check: {
        has_stripe_key: !!process.env.STRIPE_SECRET_KEY,
        has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ 
      error: "Crash interno", 
      details: err.message 
    });
  }
};