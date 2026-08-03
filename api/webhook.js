import { Request, Response } from "express";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";

// --- INTERFACES & TIPAGENS ---

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
  rawBody?: Buffer | string;
}

// --- CONFIGURAÇÃO E CARREGAMENTO DE AMBIENTE ---

function getEnvConfig(): WebhookConfig {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
    throw new Error("[MFRGS_CONFIG_ERROR] Variáveis de ambiente obrigatórias não foram configuradas.");
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

// --- SINGLETONS DE SERVIÇO ---

let stripeInstance: Stripe | null = null;
let supabaseInstance: SupabaseClient | null = null;
let sendgridInitialized = false;

function getStripeClient(secretKey: string): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
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

// --- HANDLER PRINCIPAL ---

export async function handleStripeWebhook(
  req: StripeWebhookRequest,
  res: Response
): Promise<Response> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método Não Permitido" });
  }

  let config: WebhookConfig;
  try {
    config = getEnvConfig();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro de configuração interna";
    console.error("[WEBHOOK_INIT_ERROR]", message);
    return res.status(500).json({ error: "Erro de configuração no servidor." });
  }

  const stripe = getStripeClient(config.stripeSecretKey);
  const supabase = getSupabaseClient(config.supabaseUrl, config.supabaseServiceKey);
  const isSendGridActive = setupSendGrid(config.sendgridApiKey);

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("[WEBHOOK_MISSING_HEADER] Cabeçalho stripe-signature ausente.");
    return res.status(400).json({ error: "Requisição inválida: assinatura ausente." });
  }

  let event: Stripe.Event;

  try {
    // Nota: O corpo da requisição deve ser o buffer bruto (rawBody)
    const payload = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(payload, signature, config.stripeWebhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Assinatura inválida";
    console.error("[WEBHOOK_SIGNATURE_ERROR]", errorMessage);
    return res.status(400).json({ error: "Falha na validação da assinatura do webhook." });
  }

  console.log(`[WEBHOOK_EVENT_RECEIVED] Tipo: ${event.type} | ID: ${event.id}`);

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({
      received: true,
      ignored: true,
      eventType: event.type,
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    // 1. Verificação de Idempotência
    const { data: existingOrder, error: checkError } = await supabase
      .from("orders")
      .select("id")
      .eq("session_id", session.id)
      .maybeSingle();

    if (checkError) {
      console.error("[SUPABASE_CHECK_ERROR]", JSON.stringify(checkError, null, 2));
    }

    if (existingOrder) {
      console.log(`[WEBHOOK_DUPLICATE] Pedido já processado para a sessão: ${session.id}`);
      return res.status(200).json({
        received: true,
        duplicated: true,
        sessionId: session.id,
      });
    }

    // 2. Extração e Sanitização de Dados
    const customerEmail = session.customer_details?.email || session.customer_email || "sem-email@mfrgs.com.br";
    const customerName = session.customer_details?.name || "Cliente";
    const amountTotal = (session.amount_total || 0) / 100;
    const company = session.metadata?.company || session.metadata?.companyName || "Empresa Consultada";

    // 3. Persistência no Banco de Dados
    const metadataPayload: OrderMetadata = {
      company,
      customer_name: customerName,
      stripe_session: session.id,
    };

    const { error: insertError } = await supabase.from("orders").insert({
      email: customerEmail,
      amount: amountTotal,
      status: "approved",
      session_id: session.id,
      stripe_id: session.id,
      gateway: "stripe",
      currency: session.currency || "usd",
      metadata: metadataPayload,
    });

    if (insertError) {
      console.error("[SUPABASE_INSERT_ERROR]", JSON.stringify(insertError, null, 2));
      return res.status(500).json({
        error: "Falha ao salvar a ordem no banco de dados.",
      });
    }

    console.log(`[SUPABASE_INSERT_SUCCESS] Pedido salvo com sucesso para a sessão: ${session.id}`);

    // 4. Disparo do E-mail via SendGrid (Fail-Soft)
    if (isSendGridActive) {
      try {
        await sgMail.send({
          to: customerEmail,
          from: config.sendgridFromEmail,
          subject: `[MFRGS] Verificação recebida - ${company}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>MFRGS INOVAÇÕES DIGITAL VERIFICATION</h2>
              <p>Olá <strong>${customerName}</strong>,</p>
              <p>Seu pagamento foi confirmado com sucesso.</p>
              <p>Sua solicitação de verificação entrou na fila de processamento.</p>
              <hr />
              <p><strong>Empresa Solicitada:</strong> ${company}</p>
              <p><strong>ID da Sessão:</strong> ${session.id}</p>
            </div>
          `,
        });

        console.log(`[EMAIL_SENT_SUCCESS] Notificação enviada para: ${customerEmail}`);
      } catch (emailErr: unknown) {
        const emailMsg = emailErr instanceof Error ? emailErr.message : "Erro desconhecido";
        console.error("[SENDGRID_EXECUTION_ERROR]", emailMsg);
      }
    }

    return res.status(200).json({
      received: true,
      event: event.type,
      sessionId: session.id,
    });
  } catch (internalErr: unknown) {
    console.error("[WEBHOOK_INTERNAL_ERROR]", internalErr);
    return res.status(500).json({
      error: "Erro interno no processamento do webhook.",
    });
  }
}

export default handleStripeWebhook;