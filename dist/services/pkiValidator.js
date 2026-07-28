import forge from 'node-forge';
export class PKIValidatorService {
    parseAndValidateCertificate(pemCertificate) {
        try {
            const cert = forge.pki.certificateFromPem(pemCertificate);
            const now = new Date();
            const validFrom = cert.validity.notBefore;
            const validTo = cert.validity.notAfter;
            const isExpired = now < validFrom || now > validTo;
            const subjectCN = cert.subject.getField('CN')?.value || 'Unknown Subject';
            const issuerCN = cert.issuer.getField('CN')?.value || 'Unknown Issuer';
            const isICPBrasilCompliant = issuerCN.toUpperCase().includes('ICP-BRASIL') ||
                issuerCN.toUpperCase().includes('AC') ||
                issuerCN.toUpperCase().includes('SERPRO');
            return {
                subjectCN,
                issuerCN,
                validFrom,
                validTo,
                isExpired,
                serialNumber: cert.serialNumber,
                signatureAlgorithm: forge.pki.oids[cert.signatureOid] || cert.signatureOid,
                isICPBrasilCompliant
            };
        }
        catch (error) {
            throw new Error('Certificado X.509 inválido ou malformado.');
        }
    }
}
