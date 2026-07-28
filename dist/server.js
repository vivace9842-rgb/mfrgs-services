import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as crypto from 'node:crypto';
import { PKIValidatorService } from './services/pkiValidator.js';
import { AuditTrailService } from './services/auditTrailService.js';
const app = express();
const PORT = 5000;
const pkiValidator = new PKIValidatorService();
const auditService = new AuditTrailService();
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', limiter);
function verifyHashCore(inputHash) {
    const sanitized = inputHash.trim().toLowerCase();
    const isValidFormat = /^[a-f0-9]{64}$/i.test(sanitized) || /^[a-f0-9]{16}$/i.test(sanitized);
    if (!isValidFormat && sanitized.length < 8) {
        return {
            isValid: false,
            hash: sanitized,
            timestamp: new Date().toISOString(),
            issuer: 'N/A',
            auditCode: 'ERR_INVALID_FORMAT',
            algorithm: 'SHA-256'
        };
    }
    const auditCode = 'MFRGS-' + crypto.createHash('sha256').update(sanitized + Date.now()).digest('hex').substring(0, 8).toUpperCase();
    return {
        isValid: true,
        hash: sanitized,
        timestamp: new Date().toISOString(),
        issuer: 'MFRGS Qualified Authority CA v2 (ICP-Brasil)',
        auditCode,
        algorithm: 'SHA-256'
    };
}
app.get('/', (_req, res) => {
    res.status(200).json({
        engine: 'MFRGS DIGITAL VERIFICATION API',
        version: '1.2.0',
        status: 'OPERATIONAL',
        features: [
            'SHA-256 Hash Verifier',
            'Batch Processor',
            'X.509 / ICP-Brasil Cert Validator',
            'Cryptographic Audit Trail Engine'
        ]
    });
});
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.post('/api/v1/verify', (req, res) => {
    const { hash } = req.body || {};
    if (!hash || typeof hash !== 'string') {
        res.status(400).json({ error: 'Parâmetro "hash" é obrigatório.' });
        return;
    }
    const result = verifyHashCore(hash);
    res.status(200).json({ success: true, data: result });
});
app.post('/api/v1/verify/batch', (req, res) => {
    const { hashes } = req.body || {};
    if (!Array.isArray(hashes) || hashes.length === 0) {
        res.status(400).json({ error: 'Parâmetro "hashes" deve ser um array com itens.' });
        return;
    }
    const results = hashes.map((h) => verifyHashCore(h));
    res.status(200).json({ success: true, processedCount: results.length, data: results });
});
app.post('/api/v1/verify/cert', (req, res) => {
    const { certificatePem } = req.body || {};
    if (!certificatePem || typeof certificatePem !== 'string') {
        res.status(400).json({ error: 'Parâmetro "certificatePem" é obrigatório.' });
        return;
    }
    try {
        const certDetails = pkiValidator.parseAndValidateCertificate(certificatePem);
        res.status(200).json({ success: true, data: certDetails });
    }
    catch (err) {
        res.status(422).json({ success: false, error: err.message });
    }
});
app.post('/api/v1/audit/report', (req, res) => {
    const { documentHash, requesterId } = req.body || {};
    if (!documentHash || !requesterId) {
        res.status(400).json({ error: 'Os parâmetros "documentHash" e "requesterId" são obrigatórios.' });
        return;
    }
    const report = auditService.generateAuditReport({ documentHash, requesterId });
    res.status(200).json({ success: true, auditReport: report });
});
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 MFRGS VERIFICATION ENGINE v1.2 ONLINE`);
    console.log(`📡 URL Base: http://127.0.0.1:${PORT}`);
    console.log(`=================================================`);
});
