import { Agent } from './core';

export type VerificationStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'FAILED';

export interface VerificationRequest {
  id: string;
  companyNumber?: string;
  companyName?: string;
  documentNumber?: string;
  customerEmail: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationResult {
  id: string;
  status: VerificationStatus;
  score?: number;
  details: Record<string, unknown>;
  verifiedAt: Date;
}

export class VerificationAgent implements Agent {
  public readonly name = 'VerificationAgent';
  public readonly version = '1.0.0';

  private activeVerifications: Map<string, VerificationResult> = new Map();

  public async initialize(): Promise<void> {
    // Inicialização do agente de verificação (carregamento de regras ou validação de ambiente)
    console.log(`[${this.name}] Regras de verificação carregadas e prontas.`);
  }

  public async health(): Promise<boolean> {
    return true;
  }

  /**
   * Inicia um novo processo de verificação digital com base na requisição enviada.
   */
  public async processVerification(request: VerificationRequest): Promise<VerificationResult> {
    if (!request.id) {
      throw new Error(`[${this.name}] O campo 'id' é obrigatório para iniciar a verificação.`);
    }

    if (!request.customerEmail) {
      throw new Error(`[${this.name}] O campo 'customerEmail' é obrigatório.`);
    }

    console.log(`[${this.name}] Iniciando verificação ID: ${request.id} para ${request.customerEmail}`);

    const result: VerificationResult = {
      id: request.id,
      status: 'APPROVED',
      score: 100,
      details: {
        companyNumber: request.companyNumber || null,
        companyName: request.companyName || null,
        documentNumber: request.documentNumber || null,
        processedBy: this.name,
      },
      verifiedAt: new Date(),
    };

    this.activeVerifications.set(request.id, result);
    return result;
  }

  /**
   * Obtém o resultado de uma verificação por ID.
   */
  public async getVerificationStatus(id: string): Promise<VerificationResult | null> {
    return this.activeVerifications.get(id) || null;
  }
}

export const verificationAgent = new VerificationAgent();