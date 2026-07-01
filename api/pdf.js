export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { report } = req.body;

  const pdfContent = `
MFRGS — Relatório Digital
=========================

Cliente: ${report.cliente}
Empresa: ${report.empresa}

Coerência: ${report.analise.coerencia}
Risco: ${report.analise.risco}
Score: ${report.analise.score}

Gerado em: ${report.gerado_em}
`;

  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(pdfContent);
}
