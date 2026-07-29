import { Request, Response } from 'express';
import { OSINTSimulatorService } from '../services/osintSimulatorService.js';

const osintService = new OSINTSimulatorService();

export class OSINTController {
  public static simulate(req: Request, res: Response): void {
    const { query } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Target query string is required.' });
      return;
    }
    const result = osintService.simulateScan(query);
    res.status(200).json({ success: true, data: result });
  }

  public static calculateRisk(req: Request, res: Response): void {
    const { partnerJurisdiction, transactionValue, paymentTerms, relationshipLength, hasPhysicalOffice } = req.body ?? {};

    if (!partnerJurisdiction || !paymentTerms) {
      res.status(400).json({ success: false, error: 'Invalid quiz inputs.' });
      return;
    }

    const assessment = osintService.calculateRiskExposure({
      partnerJurisdiction,
      transactionValue: Number(transactionValue) || 0,
      paymentTerms,
      relationshipLength: relationshipLength || 'NEW',
      hasPhysicalOffice: Boolean(hasPhysicalOffice)
    });

    res.status(200).json({ success: true, assessment });
  }
}
