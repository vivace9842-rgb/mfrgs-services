import { Request, Response } from 'express';
import { KYBIntakeService } from '../services/kybIntakeService.js';

const kybService = new KYBIntakeService();

export class KYBController {
  public static async createCase(req: Request, res: Response): Promise<void> {
    const { companyName, country, registrationNumber, requesterEmail, plan, currency } = req.body ?? {};

    if (!companyName || !country || !registrationNumber || !requesterEmail) {
      res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios ausentes: companyName, country, registrationNumber, requesterEmail.'
      });
      return;
    }

    const kybCase = kybService.createVerificationCase({
      companyName,
      country,
      registrationNumber,
      companyWebsite: req.body.companyWebsite,
      requesterEmail,
      plan: plan || 'STANDARD_DUE_DILIGENCE',
      currency: currency || 'USD'
    });

    res.status(201).json({ success: true, kybCase });
  }
}
