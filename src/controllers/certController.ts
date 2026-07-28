import { Request, Response } from 'express';
import { PKIValidatorService } from '../services/pkiValidator.js';

const pkiValidator = new PKIValidatorService();

export class CertController {
  public static async verifyCertificate(req: Request, res: Response): Promise<void> {
    const { certificatePem } = req.body ?? {};
    if (typeof certificatePem !== 'string' || certificatePem.trim() === '') {
      res.status(400).json({ success: false, error: 'Parâmetro "certificatePem" é obrigatório e deve ser string.' });
      return;
    }
    try {
      const certDetails = pkiValidator.parseAndValidateCertificate(certificatePem);
      res.status(200).json({ success: true, data: certDetails });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao validar certificado.';
      res.status(422).json({ success: false, error: message });
    }
  }
}
