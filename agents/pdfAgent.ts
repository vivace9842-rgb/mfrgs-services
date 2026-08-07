import { Agent } from './core';

export interface PDFGenerationPayload {
  title: string;
  referenceId: string;
  customerName?: string;
  content: Record<string, unknown>;
  issuedAt?: Date;
}

export interface GeneratedPDFResult {
  filename: string;
  buffer: Buffer;
  mimeType: 'application/pdf';
}

export class PDFAgent implements Agent {
  public readonly name = 'PDFAgent';
  public readonly version = '1.0.0';

  public async initialize(): Promise<void> {
    // Inicialização do motor de PDF e verificação de dependências
    console.log(`[${this.name}] Gerador de PDF pronto.`);
  }

  public async health(): Promise<boolean> {
    return true;
  }

  /**
   * Gera um documento PDF em buffer com base no payload fornecido.
   */
  public async generateDocument(payload: PDFGenerationPayload): Promise<GeneratedPDFResult> {
    if (!payload.referenceId) {
      throw new Error(`[${this.name}] O campo 'referenceId' é obrigatório para geração do PDF.`);
    }

    console.log(`[${this.name}] Gerando PDF para referência: ${payload.referenceId}`);

    // Construção basilar do documento (Buffer mock / estrutura pronta para biblioteca de geração como pdfkit ou puppeteer)
    const pdfContent = `
==================================================
  ${payload.title.toUpperCase()}
==================================================
  Referência: ${payload.referenceId}
  Cliente: ${payload.customerName || 'N/A'}
  Data: ${(payload.issuedAt || new Date()).toISOString()}
--------------------------------------------------
  Dados do Documento:
  ${JSON.stringify(payload.content, null, 2)}
==================================================
    `;

    const buffer = Buffer.from(pdfContent, 'utf-8');
    const filename = `report_${payload.referenceId}_${Date.now()}.pdf`;

    return {
      filename,
      buffer,
      mimeType: 'application/pdf',
    };
  }
}

export const pdfAgent = new PDFAgent();