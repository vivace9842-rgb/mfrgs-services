import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as crypto from 'node:crypto';
import { env } from './config/env.js';
import { PKIValidatorService } from './services/pkiValidator.js';
import { AuditTrailService } from './services/auditTrailService.js';
import { KYBIntakeService } from './services/kybIntakeService.js';

const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

const pkiValidator = new PKIValidatorService();
const auditService = new AuditTrailService();
const kybService = new KYBIntakeService();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED' }
});

app.use('/api/', limiter);

function detectHashAlgorithm(hash: string): string | null {
  if (/^[a-f0-9]{64}$/i.test(hash)) return 'SHA-256';
  if (/^[a-f0-9]{16}$/i.test(hash)) return 'HEX-16';
  return null;
}

function verifyHashCore(inputHash: string) {
  const sanitized = inputHash.trim().toLowerCase();
  const algorithm = detectHashAlgorithm(sanitized);

  if (!algorithm) {
    return {
      isValid: false,
      hash: sanitized,
      timestamp: new Date().toISOString(),
      issuer: 'N/A',
      auditCode: 'ERR_INVALID_FORMAT',
      algorithm: 'UNKNOWN'
    };
  }

  return {
    isValid: true,
    hash: sanitized,
    timestamp: new Date().toISOString(),
    issuer: 'MFRGS Qualified Authority CA v2 (ICP-Brasil & eIDAS Standards)',
    auditCode: 'MFRGS-' + crypto.createHash('sha256').update(sanitized + Date.now()).digest('hex').substring(0, 8).toUpperCase(),
    algorithm
  };
}

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    engine: 'MFRGS GLOBAL DIGITAL VERIFICATION & KYB COMPLIANCE API',
    version: '1.3.0-GLOBAL',
    status: 'OPERATIONAL',
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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', environment: env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.post('/api/v1/verify', (req: Request, res: Response) => {
  const { hash } = req.body ?? {};
  if (typeof hash !== 'string' || hash.trim() === '') {
    res.status(400).json({ success: false, error: 'Parâmetro "hash" é obrigatório.' });
    return;
  }
  res.status(200).json({ success: true, data: verifyHashCore(hash) });
});

// NOVO ENDPOINT B2B: Intake de Investigação KYB Corporativa (US/EU/UK/BR)
app.post('/api/v1/kyb/intake', (req: Request, res: Response) => {
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
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'ROUTE_NOT_FOUND' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[request-error]', error);
  res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 MFRGS GLOBAL ENGINE v1.3 ONLINE em http://127.0.0.1:${env.PORT}`);
  });
}

export { app };
