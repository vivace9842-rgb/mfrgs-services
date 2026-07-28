import * as crypto from 'node:crypto';

export interface KYBRequest {
  companyName: string;
  country: 'US' | 'UK' | 'EU' | 'BR' | 'GLOBAL';
  registrationNumber: string; // EIN, VAT, CRN, CNPJ
  companyWebsite?: string;
  requesterEmail: string;
  plan: 'STANDARD_DUE_DILIGENCE' | 'ENHANCED_COMPLIANCE' | 'EXPRESS_VERIFICATION';
  currency: 'USD' | 'EUR' | 'GBP' | 'BRL';
}

export interface KYBResponse {
  caseId: string;
  status: 'QUEUED_FOR_AUDIT' | 'PROCESSING';
  estimatedCompletionHours: number;
  cryptographicReceipt: string;
  timestamp: string;
}

export class KYBIntakeService {
  public createVerificationCase(payload: KYBRequest): KYBResponse {
    const caseId = 'CASE-MFRGS-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const timestamp = new Date().toISOString();

    const cryptographicReceipt = crypto
      .createHash('sha256')
      .update(`${caseId}:${payload.companyName}:${payload.registrationNumber}:${timestamp}`)
      .digest('hex');

    return {
      caseId,
      status: 'QUEUED_FOR_AUDIT',
      estimatedCompletionHours: payload.plan === 'EXPRESS_VERIFICATION' ? 4 : 24,
      cryptographicReceipt,
      timestamp
    };
  }
}
