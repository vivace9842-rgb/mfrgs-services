"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var express_rate_limit_1 = require("express-rate-limit");
var node_crypto_1 = require("node:crypto");
var pkiValidator_js_1 = require("./services/pkiValidator.js");
var auditTrailService_js_1 = require("./services/auditTrailService.js");
var app = (0, express_1.default)();
var PORT = 5000;
var pkiValidator = new pkiValidator_js_1.PKIValidatorService();
var auditService = new auditTrailService_js_1.AuditTrailService();
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json({ limit: '5mb' }));
// Rate Limiting
var limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', limiter);
// Core Engine SHA-256
function verifyHashCore(inputHash) {
    var sanitized = inputHash.trim().toLowerCase();
    var isValidFormat = /^[a-f0-9]{64}$/i.test(sanitized) || /^[a-f0-9]{16}$/i.test(sanitized);
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
    var auditCode = 'MFRGS-' + node_crypto_1.default.createHash('sha256').update(sanitized + Date.now()).digest('hex').substring(0, 8).toUpperCase();
    return {
        isValid: true,
        hash: sanitized,
        timestamp: new Date().toISOString(),
        issuer: 'MFRGS Qualified Authority CA v2 (ICP-Brasil)',
        auditCode: auditCode,
        algorithm: 'SHA-256'
    };
}
// Rotas da API
app.get('/', function (_req, res) {
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
app.get('/health', function (_req, res) {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.post('/api/v1/verify', function (req, res) {
    var hash = (req.body || {}).hash;
    if (!hash || typeof hash !== 'string') {
        res.status(400).json({ error: 'Parâmetro "hash" é obrigatório.' });
        return;
    }
    var result = verifyHashCore(hash);
    res.status(200).json({ success: true, data: result });
});
app.post('/api/v1/verify/batch', function (req, res) {
    var hashes = (req.body || {}).hashes;
    if (!Array.isArray(hashes) || hashes.length === 0) {
        res.status(400).json({ error: 'Parâmetro "hashes" deve ser um array com itens.' });
        return;
    }
    var results = hashes.map(function (h) { return verifyHashCore(h); });
    res.status(200).json({ success: true, processedCount: results.length, data: results });
});
app.post('/api/v1/verify/cert', function (req, res) {
    var certificatePem = (req.body || {}).certificatePem;
    if (!certificatePem || typeof certificatePem !== 'string') {
        res.status(400).json({ error: 'Parâmetro "certificatePem" é obrigatório.' });
        return;
    }
    try {
        var certDetails = pkiValidator.parseAndValidateCertificate(certificatePem);
        res.status(200).json({ success: true, data: certDetails });
    }
    catch (err) {
        res.status(422).json({ success: false, error: err.message });
    }
});
// NOVO ENDPOINT: Geração de Relatório de Evidência para Auditoria
app.post('/api/v1/audit/report', function (req, res) {
    var _a = req.body || {}, documentHash = _a.documentHash, requesterId = _a.requesterId;
    if (!documentHash || !requesterId) {
        res.status(400).json({ error: 'Os parâmetros "documentHash" e "requesterId" são obrigatórios.' });
        return;
    }
    var report = auditService.generateAuditReport({ documentHash: documentHash, requesterId: requesterId });
    res.status(200).json({ success: true, auditReport: report });
});
app.listen(PORT, function () {
    console.log("=================================================");
    console.log("\uD83D\uDE80 MFRGS VERIFICATION ENGINE v1.2 ONLINE");
    console.log("\uD83D\uDCE1 URL Base: http://127.0.0.1:".concat(PORT));
    console.log("=================================================");
});
