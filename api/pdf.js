import { generateReportForSession } from "./report.js";

function sanitize(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[()\\]/g, (char) => `\\${char}`)
    .trim();
}

function wrap(text, max = 88) {
  const value = sanitize(text);
  if (!value) return [""];
  const words = value.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= max) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function buildPdf(report) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const top = 790;
  const lineHeight = 16;
  const bottom = 55;
  const pages = [[]];
  let y = top;

  function addLine(text = "", options = {}) {
    const lines = wrap(text, options.max || 88);
    for (const line of lines) {
      if (y < bottom) { pages.push([]); y = top; }
      pages[pages.length - 1].push({ text: line, x: left, y, size: options.size || 10, bold: Boolean(options.bold) });
      y -= options.gap || lineHeight;
    }
  }

  addLine("MFRGS DIGITAL VERIFICATION", { size: 18, bold: true, gap: 26 });
  addLine("Relatorio profissional de verificacao empresarial", { size: 11, gap: 24 });
  addLine(`Cliente: ${report.cliente || "N/A"}`);
  addLine(`Empresa: ${report.empresa || "N/A"}`);
  addLine(`Numero de registro: ${report.company_number || "N/A"}`);
  addLine(`Situacao: ${report.status || "N/A"}`);
  addLine(`Data de registro: ${report.data_registro || "N/A"}`, { gap: 24 });

  addLine("AVALIACAO DE RISCO", { size: 13, bold: true, gap: 20 });
  addLine(`Classificacao: ${report.analise?.risco || "Nao verificavel"}`, { bold: true });
  addLine(`Score: ${report.analise?.score ?? "N/A"}/100`, { gap: 22 });

  if (Array.isArray(report.analise?.flags) && report.analise.flags.length) {
    addLine("ACHADOS E ALERTAS", { size: 12, bold: true, gap: 18 });
    for (const flag of report.analise.flags) addLine(`- ${flag}`, { size: 10, gap: 15 });
    y -= 6;
  }

  if (Array.isArray(report.diretores) && report.diretores.length) {
    addLine("ADMINISTRADORES / SOCIOS IDENTIFICADOS", { size: 12, bold: true, gap: 18 });
    for (const director of report.diretores) {
      addLine(`- ${director.nome || "Nao informado"} | ${director.cargo || "Administrador/Socio"}`, { size: 10, gap: 15 });
    }
    y -= 6;
  }

  addLine(`Fonte: ${report.fonte || "Fonte oficial consultada"}`, { size: 9, gap: 14 });
  addLine(`Pedido: ${report.session_id || "N/A"}`, { size: 9, gap: 14 });
  addLine(`Gerado em: ${report.gerado_em || new Date().toISOString()}`, { size: 9, gap: 14 });
  addLine("AVISO: Este documento apresenta informacoes obtidas de fontes publicas consultadas e nao constitui parecer juridico, financeiro ou contabil.", { size: 8, bold: true, gap: 12 });

  const objects = [];
  const addObject = (body) => { objects.push(body); return objects.length; };
  const catalog = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesObject = addObject("<< /Type /Pages /Kids [] /Count 0 >>");
  const font = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFont = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageRefs = [];

  for (const pageLines of pages) {
    const content = [];
    for (const item of pageLines) {
      const fontRef = item.bold ? boldFont : font;
      content.push(`BT /F${fontRef === boldFont ? 2 : 1} ${item.size} Tf ${item.x} ${item.y} Td (${item.text}) Tj ET`);
    }
    const stream = content.join("\n");
    const contentRef = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageRef = addObject(`<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${font} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${contentRef} 0 R >>`);
    pageRefs.push(pageRef);
  }

  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function generateReportPdf(report) {
  if (!report) throw new Error("Report payload is empty.");
  return buildPdf(report);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId) return res.status(400).json({ error: "session_id é obrigatório" });

  try {
    const report = await generateReportForSession(sessionId);
    const pdfBytes = await generateReportPdf(report);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MFRGS-Verification-${report.company_number || "report"}.pdf"`);
    return res.status(200).send(pdfBytes);
  } catch (err) {
    const status = Number(err?.statusCode) || 500;
    return res.status(status).json({ error: err instanceof Error ? err.message : "PDF generation failed" });
  }
}
