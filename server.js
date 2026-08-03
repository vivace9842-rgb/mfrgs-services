import "dotenv/config";
import express from "express";

import webhook from "./api/webhook.js";
import verify from "./api/verify.js";
import checkout from "./api/checkout.js";

const app = express();

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhook
);

app.use(express.json({ limit: "2mb" }));

app.post("/api/verify", verify);
app.post("/api/checkout", checkout);

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "MFRGS Services",
    version: "1.0.0",
    uptime: process.uptime()
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal Server Error"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.info(
    `[MFRGS] Server running on port ${PORT}`
  );
});