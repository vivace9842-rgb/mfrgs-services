import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";

// Stripe precisa do corpo HTTP bruto para validar a assinatura.
export const config = {
  api: {
    bodyParser: false,
  },
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`[WEBHOOK_CONFIG_ERROR] ${name} não configurada`);
  return value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY não configurada");

  return createClient(requiredEnv("SUPABASE_URL"), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      console.error(`[WEBHOOK_SIGNATURE_ERROR] request=${requestId} missing stripe-signature`);
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error(`[WEBHOOK_SIGNATURE_ERROR] request=${requestId}`, error);
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    console.log(`[WEBHOOK_EVENT_RECEIVED] request=${requestId} type=${event.type} id=${event.id}`);

    if (event.type !== "checkout.session.completed") {
      return res.status(200).json({
        received: true,
        ignored: true,
        eventType: event.type,
        eventId: event.id,
      });
    }

    const session = event.data.object;
    const supabase = getSupabase();
    const customerEmail = session.customer_details?.email || session.customer_email || null;
    const customerName = session.customer_details?.name || "Cliente";
    const company = session.metadata?.company || session.metadata?.companyName || "Empresa Consultada";
    const service = session.metadata?.service || "ESSENTIAL_VERIFICATION_V1";
    const amount = Number(session.amount_total || 0) / 100;
    const currency = session.currency || "brl";

    if (!customerEmail) {
      console.error(`[WEBHOOK_DATA_ERROR] request=${requestId} event=${event.id} checkout=${session.id} missing customer email`);
      return res.status(200).json({
        received: true,
        processed: false,
        reason: "missing_customer_email",
        eventId: event.id,
        sessionId: session.id,
      });
    }

    const { data: existingOrder, error: lookupError } = await supabase
      .from("orders")
      .select("id, session_id, status")
      .eq("session_id", session.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existingOrder) {
      return res.status(200).json({
        received: true,
        processed: true,
        duplicated: true,
        eventId: event.id,
        sessionId: session.id,
      });
    }

    const metadata = {
      ...(session.metadata || {}),
      company,
      customer_name: customerName,
      stripe_session: session.id,
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_session_id: session.id,
      payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      service,
      delivery_status: "payment_confirmed",
      webhook_request_id: requestId,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert({
        email: customerEmail,
        amount,
        status: "approved",
        session_id: session.id,
        stripe_id: session.id,
        gateway: "stripe",
        currency,
        metadata,
      })
      .select("id, session_id, email, amount, status, stripe_id, gateway, currency")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(200).json({
          received: true,
          processed: true,
          duplicated: true,
          eventId: event.id,
          sessionId: session.id,
        });
      }
      throw insertError;
    }

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFrom = process.env.SENDGRID_FROM;

    if (sendgridApiKey && sendgridFrom) {
      try {
        sgMail.setApiKey(sendgridApiKey);
        await sgMail.send({
          to: customerEmail,
          from: sendgridFrom,
          subject: `[MFRGS] Verificação recebida - ${company}`,
          html: `
            <h2>MFRGS INOVAÇÕES</h2>
            <p>Olá ${escapeHtml(customerName)},</p>
            <p>Seu pagamento foi confirmado.</p>
            <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
            <p><strong>Serviço:</strong> ${escapeHtml(service)}</p>
            <p><strong>Valor:</strong> R$ ${amount.toFixed(2).replace(".", ",")}</p>
            <p>Seu pedido foi registrado e será processado para entrega.</p>
          `,
        });
      } catch (emailError) {
        console.error(`[DELIVERY_EMAIL_ERROR] request=${requestId} event=${event.id} session=${session.id}`, emailError);
      }
    }

    return res.status(200).json({
      received: true,
      processed: true,
      event: event.type,
      eventId: event.id,
      sessionId: session.id,
      orderId: insertedOrder?.id || null,
      delivery: "payment_confirmed",
    });
  } catch (error) {
    console.error(`[WEBHOOK_INTERNAL_ERROR] request=${requestId}`, error);
    return res.status(500).json({
      error: "Internal webhook processing error",
      requestId,
    });
  }
}
