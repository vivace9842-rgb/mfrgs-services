import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    engine: 'MFRGS GLOBAL DIGITAL VERIFICATION & KYB COMPLIANCE API',
    version: '1.3.0-GLOBAL',
    status: 'OPERATIONAL',
    environment: env.NODE_ENV,
    regions: ['US', 'EU', 'UK', 'LATAM'],
    complianceStandards: ['eIDAS (EU/UK)', 'ESIGN Act (US)', 'ISO/IEC 27001', 'ICP-Brasil'],
    features: [
      'SHA-256 Hash Verifier',
      'Batch Processor',
      'X.509 Cert Validator',
      'Audit Trail Engine',
      'B2B Corporate KYB Intake'
    ]
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    environment: env.NODE_ENV,
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString()
  });
});

export default router;
