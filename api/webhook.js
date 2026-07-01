import Stripe from "stripe";
import { log, error } from "./utils/index.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const chunks = [];

  try {
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });
  } catch (err) {
    error(`Erro ao ler o corpo da requisição: ${err}`);
    return res.status(400).send("Erro ao processar o webhook");
  }

  const rawBody = Buffer.concat(chunks);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    error(`Webhook error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  log(`Evento recebido: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const empresa =
      session.custom_fields?.[0]?.text?.value ||
      session.metadata?.empresa ||
      null;

    log(`Pagamento confirmado — Email: ${email} | Empresa: ${empresa}`);
  }

  return res.status(200).json({ received: true });
}
