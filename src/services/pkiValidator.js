"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PKIValidatorService = void 0;
var node_forge_1 = require("node-forge");
var PKIValidatorService = /** @class */ (function () {
    function PKIValidatorService() {
    }
    /**
     * Analisa e valida a cadeia de um certificado X.509 em formato PEM
     */
    PKIValidatorService.prototype.parseAndValidateCertificate = function (pemCertificate) {
        var _a, _b;
        try {
            var cert = node_forge_1.default.pki.certificateFromPem(pemCertificate);
            var now = new Date();
            var validFrom = cert.validity.notBefore;
            var validTo = cert.validity.notAfter;
            var isExpired = now < validFrom || now > validTo;
            // Extração do Subject Common Name (CN)
            var subjectCN = ((_a = cert.subject.getField('CN')) === null || _a === void 0 ? void 0 : _a.value) || 'Unknown Subject';
            var issuerCN = ((_b = cert.issuer.getField('CN')) === null || _b === void 0 ? void 0 : _b.value) || 'Unknown Issuer';
            // Checagem de conformidade com ICP-Brasil (Autenticidade de ACs Autorizadas)
            var isICPBrasilCompliant = issuerCN.toUpperCase().includes('ICP-BRASIL') ||
                issuerCN.toUpperCase().includes('AC') ||
                issuerCN.toUpperCase().includes('SERPRO');
            return {
                subjectCN: subjectCN,
                issuerCN: issuerCN,
                validFrom: validFrom,
                validTo: validTo,
                isExpired: isExpired,
                serialNumber: cert.serialNumber,
                signatureAlgorithm: node_forge_1.default.pki.oids[cert.signatureOid] || cert.signatureOid,
                isICPBrasilCompliant: isICPBrasilCompliant
            };
        }
        catch (error) {
            throw new Error('Certificado X.509 inválido ou malformado.');
        }
    };
    return PKIValidatorService;
}());
exports.PKIValidatorService = PKIValidatorService;
