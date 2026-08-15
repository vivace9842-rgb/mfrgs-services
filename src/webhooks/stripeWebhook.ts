import { Request, Response } from "express";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";

// =============================
// TYPES
// =============================

export interface WebhookConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  sendgridApiKey?: string;
  sendgridFromEmail: string;
}

export interface OrderMetadata {
  company: string;
  customer_name: string;
  stripe_session: string;
}

export interface StripeWebhookRequest extends Request {
  rawBody?: Buffer;
}

// =============================
// UTILS
// =============================

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRawPayload(req: StripeWebhookRequest): Buffer {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }

  throw new Error("Stripe webhook raw request body is unavailable");
}

// =============================
// ENV CONFIG
// =============================

function getEnvConfig(): WebhookConfig {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeSecretKey ||
    !stripeWebhookSecret ||
    !supabaseUrl ||
    !supabaseServiceKey
  ) {
    throw new Error("[MFRGS_CONFIG_ERROR] Variáveis obrigatórias ausentes.");
  }

  return {
    stripeSecretKey,
    stripeWebhookSecret,
    supabaseUrl,
    supabaseServiceKey,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    sendgridFromEmail: process.env.SENDGRID_FROM || "noreply@mfrgs.com.br",
  };
}

// =============================
// SINGLETONS
// =============================

let stripeInstance: Stripe | null = null;
let supabaseInstance: SupabaseClient | null = null;
let sendgridInitialized = false;

function getStripeClient(secretKey: string): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeInstance;
}

function getSupabaseClient(url: string, key: string): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

function setupSendGrid(apiKey?: string): boolean {
  if (apiKey && !sendgridInitialized) {
    sgMail.setApiKey(apiKey);
    sendgridInitialized = true;
  }

  return sendgridInitialized;
}

// =============================
// STRIPE WEBHOOK HANDLER
// =============================

export async function handleStripeWebhook(
  req: StripeWebhookRequest,
  res: Response
): Promise<void> {
  let config: WebhookConfig;

  try {
    config = getEnvConfig();
  } catch (error: unknown) {
    console.error("[WEBHOOK_CONFIG_ERROR]", error);
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  const stripe = getStripeClient(config.stripeSecretKey);
  const supabase = getSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceKey
  );
  const sendGridActive = setupSendGrid(config.sendgridApiKey);

  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    res.status(400).json({ error: "Missing stripe signature" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      getRawPayload(req),
      signature,
      config.stripeWebhookSecret
    );
  } catch (error: unknown) {
    console.error("[WEBHOOK_SIGNATURE_ERROR]", error);
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  console.log(`[WEBHOOK_EVENT_RECEIVED] ${event.type} | ${event.id}`);

  if (event.type !== "checkout.session.completed") {
    res.status(200).json({
      received: true,
      ignored: true,
      eventType: event.type,
    });
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    console.warn(
      `[WEBHOOK_UNPAID_CHECKOUT_SESSION] ${session.id} | ${session.payment_status}`
    );
    res.status(200).json({
      received: true,
      ignored: true,
      reason: "payment_not_paid",
    });
    return;
  }

  try {
    const { data: existingOrder, error: lookupError } = await supabase
      .from("orders")
      .select("id")
      .eq("session_id", session.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingOrder) {
      res.status(200).json({
        received: true,
        duplicated: true,
        sessionId: session.id,
      });
      return;
    }

    const customerEmail =
      session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      throw new Error("Checkout session has no customer email");
    }

    const customerName = session.customer_details?.name || "Cliente";
    const company = session.metadata?.company || "Empresa Consultada";
    const amount = (session.amount_total || 0) / 100;

    const metadata: OrderMetadata = {
      company,
      customer_name: customerName,
      stripe_session: session.id,
    };

    const { error: insertError } = await supabase.from("orders").insert({
      email: customerEmail,
      amount,
      status: "approved",
      session_id: session.id,
      stripe_id: session.id,
      gateway: "stripe",
      currency: session.currency || "usd",
      metadata,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        res.status(200).json({ received: true, duplicated: true });
        return;
      }

      throw insertError;
    }

    console.log(`[SUPABASE_INSERT_SUCCESS] ${session.id}`);

    if (sendGridActive) {
      try {
        await sgMail.send({
          to: customerEmail,
          from: config.sendgridFromEmail,
          subject: `[MFRGS] Verificação recebida - ${company}`,
          html: `
          <h2>MFRGS INOVAÇÕES</h2>
          <p>Olá ${escapeHtml(customerName)},</p>
          <p>Seu pagamento foi confirmado.</p>
          <p>Empresa: ${escapeHtml(company)}</p>
          `,
        });
      } catch (emailError) {
        console.error("[SENDGRID_ERROR]", emailError);
      }
    }

    res.status(200).json({
      received: true,
      event: event.type,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    console.error("[WEBHOOK_INTERNAL_ERROR]", error);
    res.status(500).json({ error: "Internal webhook processing error" });
  }
}

export default handleStripeWebhook;
