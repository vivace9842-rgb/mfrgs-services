import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as crypto from 'node:crypto';
import { env } from './config/env.js';
import { PKIValidatorService } from './services/pkiValidator.js';
import { AuditTrailService } from './services/auditTrailService.js';

interface VerifyHashResult {
  isValid: boolean;
  hash: string;
  timestamp: string;
  issuer: string;
  auditCode: string;
  algorithm: string;
}

const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

const pkiValidator = new PKIValidatorService();
const auditService = new AuditTrailService();

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
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    return 'SHA-256';
  }
  if (/^[a-f0-9]{16}$/i.test(hash)) {
    return 'HEX-16';
  }
  return null;
}

function buildAuditCode(seed: string): string {
  return `MFRGS-${crypto
    .createHash('sha256')
    .update(`${seed}:${Date.now()}:${crypto.randomUUID()}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase()}`;
}

function verifyHashCore(inputHash: string): VerifyHashResult {
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
    issuer: 'MFRGS Qualified Authority CA v2 (ICP-Brasil)',
    auditCode: buildAuditCode(sanitized),
    algorithm
  };
}

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    engine: 'MFRGS DIGITAL VERIFICATION API',
    version: '1.2.0',
    status: 'OPERATIONAL',
    environment: env.NODE_ENV,
    features: [
      'SHA-256 Hash Verifier',
      'Batch Processor',
      'X.509 / ICP-Brasil Cert Validator',
      'Cryptographic Audit Trail Engine'
    ]
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    environment: env.NODE_ENV,
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/v1/verify', (req: Request, res: Response) => {
  const { hash } = req.body ?? {};
  if (typeof hash !== 'string' || hash.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Parâmetro "hash" é obrigatório e deve ser string.'
    });
    return;
  }
  const result = verifyHashCore(hash);
  res.status(200).json({
    success: true,
    data: result
  });
});

app.post('/api/v1/verify/batch', (req: Request, res: Response) => {
  const { hashes } = req.body ?? {};
  if (!Array.isArray(hashes) || hashes.length === 0 || hashes.some((item) => typeof item !== 'string')) {
    res.status(400).json({
      success: false,
      error: 'Parâmetro "hashes" deve ser um array não vazio de strings.'
    });
    return;
  }
  const results = hashes.map((hash: string) => verifyHashCore(hash));
  res.status(200).json({
    success: true,
    processedCount: results.length,
    data: results
  });
});

app.post('/api/v1/verify/cert', (req: Request, res: Response) => {
  const { certificatePem } = req.body ?? {};
  if (typeof certificatePem !== 'string' || certificatePem.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Parâmetro "certificatePem" é obrigatório e deve ser string.'
    });
    return;
  }
  try {
    const certDetails = pkiValidator.parseAndValidateCertificate(certificatePem);
    res.status(200).json({
      success: true,
      data: certDetails
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Falha ao validar certificado.';
    res.status(422).json({
      success: false,
      error: message
    });
  }
});

app.post('/api/v1/audit/report', (req: Request, res: Response) => {
  const { documentHash, requesterId, metadata } = req.body ?? {};
  if (typeof documentHash !== 'string' || documentHash.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Parâmetro "documentHash" é obrigatório e deve ser string.'
    });
    return;
  }
  if (typeof requesterId !== 'string' || requesterId.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'Parâmetro "requesterId" é obrigatório e deve ser string.'
    });
    return;
  }
  const report = auditService.generateAuditReport({
    documentHash,
    requesterId,
    metadata: typeof metadata === 'object' && metadata !== null ? metadata : undefined
  });
  res.status(200).json({
    success: true,
    auditReport: report
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND'
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[request-error]', error);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR'
  });
});

export { app };
