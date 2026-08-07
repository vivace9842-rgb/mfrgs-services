import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import checkoutHandler from "../api/checkout.js";
import verifyHandler from "../api/verify.js";
import webhookHandler from "../api/webhook.js";

dotenv.config();

const app = express();

app.disable("x-powered-by");

// =========================
// MIDDLEWARES
// =========================

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "stripe-signature"
    ]
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// IMPORTANTE:
// O webhook precisa receber o BODY RAW antes do express.json()

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

// Todas as outras rotas usam JSON

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =========================
// HEALTH
// =========================

app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "MFRGS Services",
    status: "online",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =========================
// API
// =========================

app.post("/api/checkout", checkoutHandler);
app.post("/api/verify", verifyHandler);

// =========================
// 404
// =========================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// =========================
// ERROR
// =========================

app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
);

// =========================
// LOCAL
// =========================

if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, () => {
    console.log(`🚀 MFRGS rodando em http://localhost:${PORT}`);
  });
}

export default app;