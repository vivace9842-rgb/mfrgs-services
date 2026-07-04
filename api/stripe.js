import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Erro de assinatura: ${err.message}`);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  console.log(`Evento recebido com sucesso: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log(`Sessão paga encontrada! ID: ${session.id}`);
  }

  return res.status(200).json({ received: true, status: "success" });
}
