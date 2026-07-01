import { sanitize, log } from "./utils";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, empresa, score, coerencia, risco } = req.body;

  log(`Gerando relatório para ${email}`);

  const report = {
    cliente: email,
    empresa,
    analise: {
      coerencia,
      risco,
      score,
    },
    gerado_em: new Date().toISOString(),
  };

  return res.status(200).json(report);
}
