const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Pagamento confirmado:", session.id);
      // Aqui você chama Companies House + PDF + Email
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Erro no webhook:", err.message);
    res.status(400).json({ error: "Webhook failed" });
  }
};
