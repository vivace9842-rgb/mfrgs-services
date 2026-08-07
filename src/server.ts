import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

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
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
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
// ROUTES
// =============================

app.use(
  "/api/v1",
  osintRoutes
);


// =============================
// HEALTH CHECK
// =============================

app.get(
  "/health",
  (_req, res) => {

    res.status(200).json({
      success: true,
      service: "MFRGS Digital Verification",
      status: "online",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });

  }
);


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

    console.error(
      "[GLOBAL_ERROR]",
      err
    );

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });

  }
);


// =============================
// LOCAL START
// =============================

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL
) {

  const port =
    Number(process.env.PORT) || 3000;


  app.listen(
    port,
    "0.0.0.0",
    () => {

      console.log(
        `MFRGS API running on port ${port}`
      );

    }
  );

}


export {
  app
};

export default app;