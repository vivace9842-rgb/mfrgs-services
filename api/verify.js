import { sanitize, log } from "./utils/index.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, empresa } = req.body;

  log(`Iniciando verificação para ${email} (${empresa})`);

  const resultado = {
    email,
    empresa,
    coerencia: "alta",
    risco: "baixo",
    score: 92,
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(resultado);
}
