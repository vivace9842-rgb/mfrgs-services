// api/stripe.js
import Stripe from "stripe";
import { log, error as logError } from "./utils/index.js";
import { callVerifyInternally } from "./report.js";
import { generateReportPdf } from "./pdf.js";
import { sendReportEmail } from "./utils/email.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// IMPORTANTE: precisa de raw body para validar a assinatura do webhook.
// Sem isso, qualquer POST forjado seria aceito como se viesse do Stripe.
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
    logError(`Assinatura do webhook inválida: ${err.message}`);
    return res.status(400).json({ error: `Webhook signature verification failed` });
  }

  log(`Evento recebido: ${event.type}`);

  // Responde 200 imediatamente pro Stripe não re-tentar,
  // mas processa de forma síncrona aqui mesmo (fluxo simples o suficiente pra isso).
  if (event.type !== "checkout.session.completed") {
    // Outros eventos (payment_intent.succeeded, charge.succeeded) são ruído
    // pra esse fluxo — checkout.session.completed já é o sinal definitivo de venda concluída.
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const session = event.data.object;

  try {
    const email = session.customer_details?.email;
    // Nome da empresa vem de um campo customizado no Payment Link.
    // Ajuste a "key" abaixo para bater com o campo criado no Stripe Dashboard.
    const companyField = session.custom_fields?.find(
      (f) => f.key === "company_name"
    );
    const empresa = companyField?.text?.value;

    if (!email || !empresa) {
      logError(
        `Sessão ${session.id} sem email ou nome de empresa. Campos customizados: ${JSON.stringify(
          session.custom_fields
        )}`
      );
      // Não dá pra processar sem esses dados — precisa de intervenção manual.
      // TODO: notificar você mesmo por email/Slack quando isso acontecer.
      return res.status(200).json({
        received: true,
        warning: "Faltam dados obrigatórios (email ou empresa) — requer atenção manual",
      });
    }

    log(`Processando pedido pago: ${email} — ${empresa} (session ${session.id})`);

    // 1. Verificação real na Companies House
    const verificacao = await callVerifyInternally(email, empresa);

    const report = {
      cliente: email,
      empresa: verificacao.empresa,
      company_number: verificacao.company_number || null,
      status: verificacao.status || null,
      data_registro: verificacao.data_registro || null,
      diretores: verificacao.diretores || [],
      analise: {
        risco: verificacao.risco,
        score: verificacao.score,
        flags: verificacao.flags,
      },
      fonte: verificacao.fonte || "Companies House (UK Government Official Register)",
      gerado_em: new Date().toISOString(),
    };

    // 2. Gerar PDF real
    const pdfBytes = await generateReportPdf(report);

    // 3. Enviar por email
    await sendReportEmail({
      to: email,
      companyName: report.empresa,
      pdfBytes,
      riskLevel: report.analise.risco,
      score: report.analise.score,
    });

    log(`Pedido concluído com sucesso: ${email} — ${report.empresa}`);
    return res.status(200).json({ received: true, processed: true });
  } catch (err) {
    // Já respondemos 200 conceitualmente, mas como ainda não enviamos a resposta,
    // registramos o erro claramente. Isso PRECISA de alerta — cliente pagou e não recebeu.
    logError(
      `FALHA CRÍTICA pós-pagamento (session ${session.id}): ${err.message} — cliente pagou e não recebeu o relatório`
    );
    // Retorna 500 propositalmente: assim o Stripe tenta reentregar o webhook automaticamente.
    return res.status(500).json({ error: "Falha ao processar pedido", details: err.message });
  }
}