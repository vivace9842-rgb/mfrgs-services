import { Request, Response } from "express";
import Stripe from "stripe";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
  return new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
}

function sanitize(input: unknown, max = 200): string {
  if (typeof input!== "string") return "";
  return input.replace(/[<>]/g, "").trim().slice(0, max);
}

function getSafeOrigin(req: Request): string {
  const allowed = (process.env.ALLOWED_ORIGINS || "")
   .split(",")
   .map(s => s.trim())
   .filter(Boolean);

  const requestOrigin = req.headers.origin as string | undefined;
  const envOrigin = process.env.MFRGS_LANDING_PAGE || "https://mfrgs-services.vercel.app";

  // Se ALLOWED_ORIGINS estiver configurado, valida
  if (allowed.length > 0 && allowed[0]!== "*") {
    if (requestOrigin && allowed.includes(requestOrigin)) {
      return requestOrigin;
    }
    // Se origin não é permitido, não usa ele - usa o env
    return envOrigin;
  }

  // Se não tem allowlist, usa origin se for https, senão env
  if (requestOrigin && requestOrigin.startsWith("https://")) {
    return requestOrigin;
  }
  return envOrigin;
}

export default async function handler(req: Request, res: Response) {
  // FIX: Não setar CORS manualmente se você já usa o middleware cors() no app.ts
  // Se este arquivo roda como Vercel Function isolada, o bloco abaixo seria ok,
  // mas com allowlist, não "*"
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method!== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawEmail = req.body?.email;
    const rawCompany = req.body?.company;
    const rawNumber = req.body?.number;
    const rawCountry = req.body?.country;

    const email = sanitize(rawEmail, 254);
    const company = sanitize(rawCompany, 100);
    const number = sanitize(rawNumber, 50);
    const country = sanitize(rawCountry, 100);

    if (!email ||!company) {
      return res.status(400).json({ error: "email e company são obrigatórios" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "e-mail inválido" });
    }
    if (company.length < 2) {
      return res.status(400).json({ error: "company muito curto" });
    }

    const stripe = getStripe();
    const origin = getSafeOrigin(req);

    // FIX: Preço único - sincronizado com verify.ts
    const amount = 49; // USD - ESSENTIAL_VERIFICATION.price
    const serviceName = "ESSENTIAL_VERIFICATION_V1";

    console.log(`[MFRGS] Creating Checkout | email=${email} | company=${company} | origin=${origin}`);

    // Idempotency: evita criar 2 sessões se o usuário der duplo clique
    const idempotencyKey = `${email}:${company}:${Date.now()}`.toLowerCase();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        payment_method_types: ["card"],
        metadata: {
          email,
          company,
          companyName: company,
          number: number || "",
          country: country || "",
          service: serviceName,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amount * 100,
              product_data: {
                name: `MFRGS Corporate Intelligence - ${company}`,
                description: `Official Legal Verification Report (${country || "International"}) - ${serviceName}`,
              },
            },
          },
        ],
        // FIX: success_url com origin validado, não com header cru
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/index.html?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min pra pagar
      },
      {
        idempotencyKey,
      }
    );

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("[MFRGS CHECKOUT ERROR]", error?.message || error);
    const isProd = process.env.NODE_ENV === "production";
    return res.status(500).json({
      success: false,
      error: "Failed to create Stripe Checkout session.",
     ...(!isProd? { details: error?.message } : {}),
    });
  }
}