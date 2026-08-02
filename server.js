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

app.use(express.json());

app.post("/api/verify", verify);
app.post("/api/checkout", checkout);

app.get("/", (req, res) => {
  res.send("MFRGS Services Online");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
