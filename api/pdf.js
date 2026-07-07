import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { log, error } from "./utils/index.js";

/**
 * Filtra e limpa textos para segurança de dados do relatório
 */
export function sanitize(text) {
  if (text === null || text === undefined) return "";
  return String(text).trim();
}

/**
 * Gera um PDF real (bytes) com tratamento dinâmico de quebra de página
 */
export async function generateReportPdf(report) {
  // Inicialização segura e validação do DNA do objeto
  if (!report) throw new Error("Report database payload is completely empty.");
  if (!report.analise) report.analise = { risco: "UNKNOWN", score: 0, flags: [] };
  if (!report.diretores) report.diretores = [];

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // Tamanho padrão A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const navy = rgb(0.1, 0.16, 0.29);
  const gray = rgb(0.35, 0.38, 0.42);
  const red = rgb(0.8, 0.2, 0.2);
  
  let y = 800;
  const left = 50;
  const bottomMargin = 50;

  // Função interna resiliente com monitoramento de estouro de página
  function line(text, { size = 11, f = font, color = gray, gap = 18 } = {}) {
    if (y < bottomMargin) {
      page = pdfDoc.addPage([595, 842]); // Cria nova página se estourar o limite
      y = 800; // Reseta a coordenada para o topo da nova página
    }
    page.drawText(sanitize(text), { x: left, y, size, font: f, color });
    y -= gap;
  }

  // --- Renderização do Cabeçalho e Identificação Executiva ---
  line("MFRGS Digital Verification", { size: 18, f: bold, color: navy, gap: 26 });
  line("Official Business Verification Report — Global Compliance", { size: 11, gap: 24 });
  
  line(`Client ID / Target: ${report.cliente || "N/A"}`, { size: 11 });
  line(`Company Legal Name: ${report.empresa || "N/A"}`, { size: 11 });
  line(`Company Number: ${report.company_number || "N/A"}`, { size: 11 });
  line(`Registration Status: ${report.status || "N/A"}`, { size: 11 });
  line(`Incorporation Date: ${report.data_registro || "N/A"}`, { size: 11, gap: 24 });

  // --- Bloco de Análise de Risco (Risk Assessment) ---
  line("Executive Risk Assessment", { size: 13, f: bold, color: navy, gap: 20 });
  
  const riskColor = report.analise.risco === "HIGH" ? red : navy;
  line(`Risk Level Classification: ${report.analise.risco}`, { size: 11, f: bold, color: riskColor });
  
  // Representação visual do score recomendada pela auditoria do Guardian
  const scoreVal = report.analise.score ?? 0;
  const progressBar = "█".repeat(Math.round(scoreVal / 10)) + "░".repeat(10 - Math.round(scoreVal / 10));
  line(`Compliance Score: [${progressBar}] ${scoreVal}/100`, { size: 11, gap: 22 });

  // --- Mapeamento Dinâmico de Achados/Flags ---
  if (report.analise.flags && report.analise.flags.length > 0) {
    line("Key Audit Findings & Red Flags:", { size: 12, f: bold, color: navy, gap: 18 });
    for (const flag of report.analise.flags) {
      line(`• ${flag}`, { size: 10, gap: 16 });
    }
    y -= 6;
  }

  // --- Mapeamento Dinâmico de Corpo Diretivo (Directors) ---
  if (report.diretores && report.diretores.length > 0) {
    line("Management & Active Corporate Directors:", { size: 12, f: bold, color: navy, gap: 18 });
    for (const d of report.diretores) {
      line(`• ${d.nome || "Unknown"} — Role: ${d.cargo || "Officer"}`, { size: 10, gap: 16 });
    }
    y -= 6;
  }

  // --- Rodapé de Isenção de Responsabilidade Legal ---
  line(`Source Information: ${report.fonte || "Public Registries Data Intelligence"}`, { size: 9, gap: 14 });
  line(`Data Collection Timestamp: ${report.gerado_em || new Date().toISOString()}`, { size: 9, gap: 14 });
  
  // Cláusula de proteção da MFRGS Inovações para afastar passivo jurídico
  line("LEGAL DISCLAIMER: This document is for informational purposes only.", { size: 8, f: bold, gap: 10 });
  line("MFRGS does not constitute legal, financial, or corporate accounting advice. The recipient assumes full operational risk.", { size: 7, gap: 12 });

  return pdfDoc.save(); 
}

/**
 * Handler Serverless Vercel com proteção contra quebras de método
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method execution not allowed here." });
  }

  const { report } = req.body;
  
  // Validação explícita preventiva do Guardian
  if (!report || !report.cliente || !report.empresa) {
    return res.status(400).json({ error: "Missing required report schema parameters." });
  }

  try {
    log(`Generating protected secure PDF for client: ${report.cliente}`);
    const pdfBytes = await generateReportPdf(report);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MFRGS-Compliance-Report-${report.company_number || "Overview"}.pdf"`
    );
    
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    error(`Failed to process compliance PDF execution: ${err.message}`);
    return res.status(500).json({ error: "Internal PDF processing engine failed.", details: err.message });
  }
}
