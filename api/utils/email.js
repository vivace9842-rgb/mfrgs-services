// api/utils/email.js
import { Resend } from "resend";
import { log, error as logError } from "./index.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Ajuste para o domínio verificado no Resend (precisa verificar um domínio real,
// não dá pra usar "onmicrosoft" ou domínio não verificado em produção)
const FROM_ADDRESS = process.env.RESEND_FROM || "MFRGS Digital Verification <reports@mfrgsdigital.com>";

export async function sendReportEmail({ to, companyName, pdfBytes, riskLevel, score }) {
  log(`Enviando relatório por email para ${to}`);

  const { data, error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your MFRGS Verification Report — ${companyName}`,
    html: `
      <div style="font-family: Georgia, serif; color: #1a2a4a; max-width: 560px;">
        <h2>Your verification report is ready</h2>
        <p>Thank you for using MFRGS Digital Verification.</p>
        <p><strong>Company:</strong> ${companyName}<br/>
        <strong>Risk level:</strong> ${riskLevel}<br/>
        <strong>Score:</strong> ${score ?? "N/A"}</p>
        <p>The full report is attached as a PDF, including sources and findings.</p>
        <p style="font-size: 12px; color: #7a8a9a; margin-top: 24px;">
          This report is informational only and does not constitute legal, financial or accounting advice.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: "MFRGS-Verification-Report.pdf",
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  });

  if (sendError) {
    logError(`Falha ao enviar email: ${sendError.message}`);
    throw new Error(sendError.message);
  }

  log(`Email enviado com sucesso: ${data.id}`);
  return data;
}