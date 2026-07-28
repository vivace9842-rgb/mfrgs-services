import { Request, Response } from 'express';
import { AuditTrailService } from '../services/auditTrailService.js';

const auditService = new AuditTrailService();

export class AuditController {
  public static async generateReport(req: Request, res: Response): Promise<void> {
    const { documentHash, requesterId, metadata } = req.body ?? {};
    if (typeof documentHash !== 'string' || documentHash.trim() === '' ||
        typeof requesterId !== 'string' || requesterId.trim() === '') {
      res.status(400).json({ success: false, error: 'Os parâmetros "documentHash" e "requesterId" são obrigatórios.' });
      return;
    }
    const report = auditService.generateAuditReport({
      documentHash,
      requesterId,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : undefined
    });
    res.status(200).json({ success: true, auditReport: report });
  }
}
