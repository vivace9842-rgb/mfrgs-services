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

// =============================
// SECURITY
// =============================

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// =============================
// CORS
// =============================

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
    ],
  })
);

// =============================
// STRIPE WEBHOOK
// MUST BE BEFORE JSON
// =============================

app.post(
  "/api/webhook",
  express.raw({
    type: "application/json",
  }),
  handleStripeWebhook
);

// =============================
// JSON BODY
// =============================

app.use(
  express.json({
    limit: "5mb",
  })
);

// =============================
// STRIPE CHECKOUT
// SINGLE ACTIVE IMPLEMENTATION
// =============================

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
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.origin;
  const fallback =
    process.env.MFRGS_LANDING_PAGE || "https://mfrgs-services.vercel.app";

  if (allowed.length > 0 && allowed[0] !== "*") {
    return requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : fallback;
  }

  return requestOrigin && requestOrigin.startsWith("https://")
    ? requestOrigin
    : fallback;
}

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
      sanitize(body.planType || body.service, 80) || "enterprise";

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

    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const origin = getSafeOrigin(req);

    // Valor de validação ponta a ponta atualmente configurado: R$ 0,50.
    const amountCents = 50;
    const serviceName = "ESSENTIAL_VERIFICATION_V1";

    const idempotencyKey =
      `${email}:${company}:${planType}:${Date.now()}`.toLowerCase();

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
                description:
                  `Official Legal Verification Report (${country}) - ${serviceName} | TESTE LIVE R$0,50`,
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
  } catch (error: unknown) {
    console.error("[MFRGS CHECKOUT ERROR]", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create Stripe Checkout session.",
      requestId: crypto.randomUUID(),
    });
  }
});

// =============================
// ROUTES
// =============================

app.use("/api/v1", osintRoutes);

// =============================
// HEALTH CHECK
// =============================

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "MFRGS Digital Verification",
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// =============================
// GLOBAL ERROR HANDLER
// =============================

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

// =============================
// LOCAL START
// =============================

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, "0.0.0.0", () => {
    console.log(`MFRGS API running on port ${port}`);
  });
}

export { app };
export default app;
