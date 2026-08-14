import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import Stripe from "stripe";

import osintRoutes from "./routes/osintRoutes.js";
import handleStripeWebhook from "./webhooks/stripeWebhook.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Idempotency-Key",
    ],
  })
);

// Stripe requires the exact raw request body for signature verification.
app.post(
  "/api/webhook",
  express.raw({
    type: "application/json",
  }),
  handleStripeWebhook
);

app.use(
  express.json({
    limit: "5mb",
  })
);

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} não configurada`);
  }

  return value;
}

function sanitize(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, max);
}

function getSafeOrigin(req: express.Request): string {
  const configuredOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.MFRGS_LANDING_PAGE,
    "https://mfrgs-services.vercel.app",
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const fallback =
    process.env.MFRGS_LANDING_PAGE?.trim().replace(/\/$/, "") ||
    "https://mfrgs-services.vercel.app";

  const requestOrigin =
    typeof req.headers.origin === "string"
      ? req.headers.origin.trim().replace(/\/$/, "")
      : "";

  return requestOrigin && configuredOrigins.includes(requestOrigin)
    ? requestOrigin
    : fallback;
}

const PLAN_PRICES_USD_CENTS: Record<string, number> = {
  essential_verification: 9900,
  individual_verification: 14900,
  website_trust_audit: 17900,
  professional_due_diligence: 29900,
  supplier_verification: 34900,
  enterprise_portfolio_review: 69900,
  corporate_monitoring: 99900,
  international_due_diligence: 149900,
};

const PLAN_NAMES: Record<string, string> = {
  essential_verification: "Essential Verification",
  individual_verification: "Individual Verification",
  website_trust_audit: "Website Trust Audit",
  professional_due_diligence: "Professional Due Diligence",
  supplier_verification: "Supplier Verification",
  enterprise_portfolio_review: "Enterprise Portfolio Review",
  corporate_monitoring: "Corporate Monitoring",
  international_due_diligence: "International Due Diligence",
};

app.post("/api/checkout", async (req, res) => {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

    const email = sanitize(body.email, 254);
    const company = sanitize(
      body.companyName || body.company,
      150
    );
    const cnpj = sanitize(body.cnpj || body.number, 30);
    const country = sanitize(body.country, 100) || "Brazil";
    const planType =
      sanitize(body.planType || body.service, 80) ||
      "essential_verification";

    if (!email || !company) {
      return res
        .status(400)
        .json({ error: "email e companyName são obrigatórios" });
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({ error: "e-mail inválido" });
    }

    if (company.length < 2) {
      return res.status(400).json({ error: "companyName muito curto" });
    }

    const amountCents = PLAN_PRICES_USD_CENTS[planType];
    const planName = PLAN_NAMES[planType];

    if (!amountCents || !planName) {
      return res.status(400).json({
        error: "Plano de checkout inválido",
      });
    }

    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const origin = getSafeOrigin(req);

    // Client-generated idempotency key is preferred for safe retries.
    const requestedIdempotencyKey = req.get("Idempotency-Key")?.trim();
    const idempotencyKey = requestedIdempotencyKey
      ? requestedIdempotencyKey.slice(0, 255)
      : crypto.randomUUID();

    console.log(
      `[MFRGS] Creating LIVE Checkout | plan=${planType} | amount=USD ${(
        amountCents / 100
      ).toFixed(2)} | email=${email}`
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
          service: `MFRGS_${planType.toUpperCase()}`,
          planName,
          environment: "production",
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: `MFRGS — ${planName}`,
                description: `Professional digital verification service for ${company}.`,
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
      plan: planName,
      amount: amountCents / 100,
      currency: "usd",
    });
  } catch (error: unknown) {
    console.error("[MFRGS CHECKOUT ERROR]", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create Stripe Checkout session.",
      requestId: crypto.randomUUID(),
    });
  }
});

app.use("/api/v1", osintRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "MFRGS Digital Verification",
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[GLOBAL_ERROR]", err);

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, "0.0.0.0", () => {
    console.log(`MFRGS API running on port ${port}`);
  });
}

export { app };
export default app;
