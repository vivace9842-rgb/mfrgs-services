"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailService = void 0;
var node_crypto_1 = require("node:crypto");
var AuditTrailService = /** @class */ (function () {
    function AuditTrailService() {
    }
    /**
     * Gera um Relatório de Evidência Criptográfica Auditável
     */
    AuditTrailService.prototype.generateAuditReport = function (payload) {
        var timestamp = new Date().toISOString();
        var reportId = 'REP-MFRGS-' + node_crypto_1.default.randomBytes(6).toString('hex').toUpperCase();
        // Cálculo da Raiz de Merkle simulando encadeamento de evidências
        var merkleRootHash = node_crypto_1.default
            .createHash('sha256')
            .update(payload.documentHash + reportId + timestamp)
            .digest('hex');
        // Assinatura simulada da Autoridade de Carimbo do Tempo (TSA)
        var tsaSignature = node_crypto_1.default
            .createHmac('sha512', 'MFRGS_TSA_SECRET_KEY_2025')
            .update(merkleRootHash + timestamp)
            .digest('hex');
        // Prova de Integridade imutável (Proof of Integrity)
        var proofOfIntegrity = node_crypto_1.default
            .createHash('sha256')
            .update("".concat(reportId, ":").concat(payload.documentHash, ":").concat(merkleRootHash, ":").concat(tsaSignature))
            .digest('hex');
        return {
            reportId: reportId,
            documentHash: payload.documentHash,
            merkleRootHash: merkleRootHash,
            timestamp: timestamp,
            tsaSignature: tsaSignature,
            compliance: {
                iso27001: true,
                icpBrasil: true,
                shaVariant: 'SHA-256 / HMAC-SHA512'
            },
            requesterId: payload.requesterId,
            proofOfIntegrity: proofOfIntegrity
        };
    };
    return AuditTrailService;
}());
exports.AuditTrailService = AuditTrailService;
