import { NextResponse } from "next/server";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.log("Método inválido:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Erro ao validar webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("========================================");
  console.log("🔔 EVENTO RECEBIDO DO STRIPE");
  console.log("Tipo:", event.type);
  console.log("----------------------------------------");

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("📌 Dados da sessão:");
    console.log("ID da sessão:", session.id);
    console.log("ID do pagamento:", session.payment_intent);
    console.log("Valor pago (Stripe):", session.amount_total / 100);

    console.log("📌 Dados do cliente:");
    console.log("Nome:", session.customer_details?.name);
    console.log("Email:", session.customer_details?.email);
    console.log("Empresa:", session.customer_details?.business_name);

    console.log("📌 Termos buscados (metadata):");
    console.log(session.metadata);

    console.log("📌 Serviço contratado:", session.metadata.service);

    // Valores sugeridos
    if (session.metadata.service === "Standard Verification") {
      console.log("📌 Valor sugerido: US$ 49");
    }
    if (session.metadata.service === "Advanced Verification") {
      console.log("📌 Valor sugerido: US$ 89");
    }
    if (session.metadata.service === "Corporate Verification") {
      console.log("📌 Valor sugerido: US$ 149");
    }
    if (session.metadata.service === "Full Digital & Legal Scan") {
      console.log("📌 Valor sugerido: US$ 249");
    }

    console.log("📌 Status do pagamento:", session.payment_status);
  }

  console.log("========================================");

  return res.status(200).json({ received: true });
}

function getRawBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(data);
    });
  });
}
