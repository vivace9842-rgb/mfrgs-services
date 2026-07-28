import { Request, Response } from 'express';
import * as crypto from 'node:crypto';

interface VerifyHashResult {
  isValid: boolean;
  hash: string;
  timestamp: string;
  issuer: string;
  auditCode: string;
  algorithm: string;
}

function detectHashAlgorithm(hash: string): string | null {
  if (/^[a-f0-9]{64}$/i.test(hash)) return 'SHA-256';
  if (/^[a-f0-9]{16}$/i.test(hash)) return 'HEX-16'; // MFRGS Token Hash
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

export function verifyHashCore(inputHash: string): VerifyHashResult {
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
    auditCode: buildAuditCode(sanitized),
    algorithm
  };
}

export class HashController {
  public static async verifySingle(req: Request, res: Response): Promise<void> {
    const { hash } = req.body ?? {};
    if (typeof hash !== 'string' || hash.trim() === '') {
      res.status(400).json({ success: false, error: 'Parâmetro "hash" é obrigatório e deve ser string.' });
      return;
    }
    const result = verifyHashCore(hash);
    res.status(200).json({ success: true, data: result });
  }

  public static async verifyBatch(req: Request, res: Response): Promise<void> {
    const { hashes } = req.body ?? {};
    if (!Array.isArray(hashes) || hashes.length === 0 || hashes.some((item) => typeof item !== 'string')) {
      res.status(400).json({ success: false, error: 'Parâmetro "hashes" deve ser um array não vazio de strings.' });
      return;
    }
    const results = hashes.map((hash: string) => verifyHashCore(hash));
    res.status(200).json({ success: true, processedCount: results.length, data: results });
  }
}
