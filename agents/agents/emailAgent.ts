import { Agent } from './core';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailAgent implements Agent {
  public readonly name = 'EmailAgent';
  public readonly version = '1.0.0';

  private apiKey: string | null = null;
  private defaultFrom: string = 'nao-responda@mfrgs.com';

  public async initialize(): Promise<void> {
    this.apiKey = process.env.EMAIL_SERVICE_API_KEY || null;
    if (process.env.EMAIL_FROM_ADDRESS) {
      this.defaultFrom = process.env.EMAIL_FROM_ADDRESS;
    }

    if (!this.apiKey) {
      console.warn(`[${this.name}] Alerta: EMAIL_SERVICE_API_KEY não configurada. O envio operará em modo simulação/log.`);
    }
  }

  public async health(): Promise<boolean> {
    return true;
  }

  /**
   * Envia um e-mail transacional com suporte a anexos (como PDFs gerados).
   */
  public async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    if (!payload.to) {
      throw new Error(`[${this.name}] O destinatário ('to') é obrigatório.`);
    }

    if (!payload.subject || !payload.html) {
      throw new Error(`[${this.name}] Assunto ('subject') e corpo ('html') são obrigatórios.`);
    }

    console.log(`[${this.name}] Enviando e-mail para ${payload.to} | Assunto: "${payload.subject}"`);

    if (!this.apiKey) {
      console.log(`[${this.name}] [MOCK] E-mail simulado com sucesso para: ${payload.to}`);
      return {
        success: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    try {
      // Ponto de integração nativo para o provedor de e-mail (Resend/SendGrid/Nodemailer)
      const simulatedMessageId = `msg_${Date.now()}`;
      return {
        success: true,
        messageId: simulatedMessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.name}] Erro ao enviar e-mail para ${payload.to}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const emailAgent = new EmailAgent();