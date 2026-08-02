import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";

const required = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sendgridKey =
  process.env.SENDGRID_API_KEY ||
  process.env.ENDGRID_API_KEY;

if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
}

export default async function webhook(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "[WEBHOOK] Signature Error:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  console.log("[WEBHOOK] Event:", event.type);

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({
      received: true,
      ignored: true,
      event: event.type,
    });
  }

  const session = event.data.object;

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("session_id", session.id)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({
      received: true,
      duplicated: true,
      session: session.id,
    });
  }

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    "sem-email";

  const customerName =
    session.customer_details?.name ||
    "Cliente";

  const amountTotal =
    (session.amount_total || 0) / 100;

  const company =
    session.metadata?.company ||
    session.metadata?.companyName ||
    "Empresa Consultada";

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      email: customerEmail,
      amount: amountTotal,
      status: "approved",
      session_id: session.id,
      stripe_id: session.id,
      gateway: "stripe",
      currency: session.currency || "usd",
      metadata: {
        company,
        customer_name: customerName,
        stripe_session: session.id,
      },
    });

  if (orderError) {
    console.error("[SUPABASE]", orderError);

    return res.status(500).json({
      error: "Failed to save order",
    });
  }

  if (sendgridKey) {
    try {
      await Promise.race([
        sgMail.send({
          to: customerEmail,
          from:
            process.env.SENDGRID_FROM ||
            "noreply@mfrgs.com.br",
          subject: `[MFRGS] Verificação recebida - ${company}`,
          html: `
            <h2>MFRGS INOVAÇÕES</h2>
            <p>Olá ${customerName},</p>
            <p>Seu pagamento foi confirmado.</p>
            <p>Sua solicitação entrou na fila de processamento.</p>
            <p>Empresa:</p>
            <strong>${company}</strong>
          `,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Email timeout")),
            5000
          )
        ),
      ]);
    } catch (error) {
      console.error("[SENDGRID]", error);
    }
  }

  return res.status(200).json({
    received: true,
    event: event.type,
    session: session.id,
  });
}