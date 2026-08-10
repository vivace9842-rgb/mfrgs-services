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

  if (allowed.length > 0 && allowed[0]!== "*") {
    if (requestOrigin && allowed.includes(requestOrigin)) {
      return requestOrigin;
    }
    return envOrigin;
  }

  if (requestOrigin && requestOrigin.startsWith("https://")) {
    return requestOrigin;
  }
  return envOrigin;
}

export default async function handler(req: Request, res: Response) {
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

    // TESTE LIVE: serviço real existente temporariamente reduzido para R$ 0,50.
    // Restaurar o preço comercial após a validação ponta a ponta.
    const amount = 0.5;
    const serviceName = "ESSENTIAL_VERIFICATION_V1";

    console.log(`[MFRGS] Creating Checkout | TESTE LIVE R$0,50 | email=${email} | company=${company} | origin=${origin}`);

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
          test_mode: "live_0.50_delivery_validation",
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: 50,
              product_data: {
                name: `MFRGS Corporate Intelligence - ${company}`,
                description: `Official Legal Verification Report (${country || "International"}) - ${serviceName} | TESTE LIVE R$0,50`,
              },
            },
          },
        ],
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/index.html?payment=cancelled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
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