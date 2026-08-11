import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

export const dynamic = "force-dynamic";

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

function buildSupabase() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function buildStripe() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
}

export async function POST(req) {
  const requestId = crypto.randomUUID();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error(`[WEBHOOK_SIGNATURE_ERROR] request=${requestId} missing stripe-signature`);
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const stripe = buildStripe();
    const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error(`[WEBHOOK_SIGNATURE_ERROR] request=${requestId}`, error);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    console.log(
      `[WEBHOOK_EVENT_RECEIVED] request=${requestId} type=${event.type} id=${event.id}`
    );

    // Stripe envia vários eventos para uma única compra.
    // O pedido/entrega é confirmado somente pelo checkout concluído.
    if (event.type !== "checkout.session.completed") {
      return new Response(
        JSON.stringify({
          received: true,
          ignored: true,
          eventType: event.type,
          eventId: event.id,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const session = event.data.object;
    const supabase = buildSupabase();

    const customerEmail =
      session.customer_details?.email || session.customer_email || null;
    const customerName = session.customer_details?.name || "Cliente";
    const company = session.metadata?.company || "Empresa Consultada";
    const service =
      session.metadata?.service || "ESSENTIAL_VERIFICATION_V1";
    const amount = Number(session.amount_total || 0) / 100;
    const currency = session.currency || "brl";

    if (!customerEmail) {
      console.error(
        `[WEBHOOK_DATA_ERROR] request=${requestId} event=${event.id} checkout=${session.id} missing customer email`
      );

      return new Response(
        JSON.stringify({
          received: true,
          processed: false,
          reason: "missing_customer_email",
          eventId: event.id,
          sessionId: session.id,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // Idempotência: Stripe pode reenviar o mesmo evento.
    const { data: existingOrder, error: lookupError } = await supabase
      .from("orders")
      .select("id, session_id, status")
      .eq("session_id", session.id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        `[SUPABASE_LOOKUP_ERROR] request=${requestId} event=${event.id} session=${session.id}`,
        lookupError
      );
      throw lookupError;
    }

    if (existingOrder) {
      console.log(
        `[SUPABASE_DUPLICATE] request=${requestId} event=${event.id} session=${session.id}`
      );

      return new Response(
        JSON.stringify({
          received: true,
          processed: true,
          duplicated: true,
          eventId: event.id,
          sessionId: session.id,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const metadata = {
      ...(session.metadata || {}),
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      stripe_session_id: session.id,
      payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      service,
      delivery_status: "payment_confirmed",
      webhook_request_id: requestId,
    };

    const order = {
      email: customerEmail,
      amount,
      status: "payment_received",
      session_id: session.id,
      stripe_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id,
      gateway: "stripe",
      currency,
      metadata,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(order)
      .select("id, session_id, email, amount, status, stripe_id, gateway, currency")
      .single();

    if (insertError) {
      console.error(
        `[SUPABASE_INSERT_ERROR] request=${requestId} event=${event.id} session=${session.id}`,
        insertError
      );

      // Uma tentativa concorrente pode ter criado o mesmo pedido.
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            received: true,
            processed: true,
            duplicated: true,
            eventId: event.id,
            sessionId: session.id,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw insertError;
    }

    console.log(
      `[SUPABASE_INSERT_SUCCESS] request=${requestId} event=${event.id} session=${session.id} order=${insertedOrder?.id}`
    );

    // O e-mail é uma etapa de entrega. Falha de e-mail não desfaz o registro da venda.
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

        console.log(
          `[DELIVERY_EMAIL_SUCCESS] request=${requestId} event=${event.id} session=${session.id} email=${customerEmail}`
        );
      } catch (emailError) {
        console.error(
          `[DELIVERY_EMAIL_ERROR] request=${requestId} event=${event.id} session=${session.id}`,
          emailError
        );
      }
    } else {
      console.warn(
        `[DELIVERY_EMAIL_SKIPPED] request=${requestId} event=${event.id} SENDGRID_API_KEY ou SENDGRID_FROM ausente`
      );
    }

    return new Response(
      JSON.stringify({
        received: true,
        processed: true,
        event: event.type,
        eventId: event.id,
        sessionId: session.id,
        orderId: insertedOrder?.id || null,
        delivery: "payment_confirmed",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error(`[WEBHOOK_INTERNAL_ERROR] request=${requestId}`, error);

    return new Response(
      JSON.stringify({
        error: "Internal webhook processing error",
        requestId,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
