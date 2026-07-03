// api/pdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { log } from "./utils/index.js";

/**
 * Gera um PDF real (bytes) a partir de um objeto de relatório.
 * Retorna um Uint8Array pronto para anexar em email ou servir como download.
 */
export async function generateReportPdf(report) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.1, 0.16, 0.29);
  const gray = rgb(0.35, 0.38, 0.42);

  let y = 800;
  const left = 50;

  function line(text, { size = 11, f = font, color = gray, gap = 18 } = {}) {
    page.drawText(text, { x: left, y, size, font: f, color });
    y -= gap;
  }

  line("MFRGS Digital Verification", { size: 18, f: bold, color: navy, gap: 26 });
  line("Official Business Verification Report", { size: 11, gap: 24 });

  line(`Client: ${report.cliente}`, { size: 11 });
  line(`Company: ${report.empresa}`, { size: 11 });
  line(`Company Number: ${report.company_number || "N/A"}`, { size: 11 });
  line(`Status: ${report.status || "N/A"}`, { size: 11 });
  line(`Registered: ${report.data_registro || "N/A"}`, { size: 11, gap: 24 });

  line("Risk Assessment", { size: 13, f: bold, color: navy, gap: 20 });
  line(`Risk level: ${report.analise.risco}`, { size: 11 });
  line(`Score: ${report.analise.score ?? "N/A"}`, { size: 11, gap: 22 });

  if (report.analise.flags?.length) {
    line("Findings:", { size: 12, f: bold, gap: 18 });
    for (const flag of report.analise.flags) {
      line(`• ${flag}`, { size: 10, gap: 16 });
    }
    y -= 6;
  }

  if (report.diretores?.length) {
    line("Directors:", { size: 12, f: bold, gap: 18 });
    for (const d of report.diretores) {
      line(`• ${d.nome} — ${d.cargo}`, { size: 10, gap: 16 });
    }
    y -= 6;
  }

  line(`Source: ${report.fonte}`, { size: 9, gap: 14 });
  line(`Generated: ${report.gerado_em}`, { size: 9, gap: 14 });
  line(
    "This report is informational only and does not constitute legal, financial or accounting advice.",
    { size: 8, gap: 12 }
  );

  return pdfDoc.save(); // Uint8Array
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { report } = req.body;
  if (!report) {
    return res.status(400).json({ error: "report é obrigatório" });
  }

  try {
    log(`Gerando PDF para ${report.cliente}`);
    const pdfBytes = await generateReportPdf(report);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MFRGS-Report-${report.company_number || "report"}.pdf"`
    );
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    return res.status(500).json({ error: "Falha ao gerar PDF", details: err.message });
  }
}