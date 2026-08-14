import Stripe from "stripe";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
}

function sanitize(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}

function getSafeOrigin(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.origin;
  const fallback = process.env.MFRGS_LANDING_PAGE || "https://mfrgs-services.vercel.app";

  if (allowed.length > 0 && allowed[0] !== "*") {
    return requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : fallback;
  }

  return requestOrigin && requestOrigin.startsWith("https://") ? requestOrigin : fallback;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    // Aceita o contrato atual do EnterpriseForm e mantém compatibilidade
    // com o contrato anterior usado pelo checkout legado.
    const email = sanitize(body.email, 254);
    const company = sanitize(body.companyName || body.company, 150);
    const cnpj = sanitize(body.cnpj || body.number, 30);
    const country = sanitize(body.country, 100) || "Brazil";
    const planType = sanitize(body.planType || body.service, 80) || "enterprise";

    if (!email || !company) {
      return res.status(400).json({ error: "email e companyName são obrigatórios" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "e-mail inválido" });
    }

    if (company.length < 2) {
      return res.status(400).json({ error: "companyName muito curto" });
    }

    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const origin = getSafeOrigin(req);

    // Validação ponta a ponta em produção: R$ 0,50.
    // O valor comercial deve ser restaurado somente após a validação final.
    const amountCents = 50;
    const serviceName = "ESSENTIAL_VERIFICATION_V1";

    const idempotencyKey = `${email}:${company}:${planType}:${Date.now()}`.toLowerCase();

    console.log(
      `[MFRGS] Creating Checkout | LIVE R$0,50 | email=${email} | company=${company}`
    );

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        payment_method_types: ["card"],
        metadata: {
          email,
          company,
          companyName: company,
          cnpj,
          number: cnpj,
          country,
          planType,
          service: serviceName,
          test_mode: "live_0.50_delivery_validation",
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: amountCents,
              product_data: {
                name: `MFRGS Corporate Intelligence - ${company}`,
                description: `Official Legal Verification Report (${country}) - ${serviceName} | TESTE LIVE R$0,50`,
              },
            },
          },
        ],
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      { idempotencyKey }
    );

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("[MFRGS CHECKOUT ERROR]", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create Stripe Checkout session.",
      requestId: crypto.randomUUID(),
    });
  }
}
