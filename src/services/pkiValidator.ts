import forge from 'node-forge';

export interface PKICertificateDetails {
  subjectCN: string;
  issuerCN: string;
  validFrom: Date;
  validTo: Date;
  isExpired: boolean;
  serialNumber: string;
  signatureAlgorithm: string;
  isICPBrasilCompliant: boolean;
}

export class PKIValidatorService {
  public parseAndValidateCertificate(pemCertificate: string): PKICertificateDetails {
    try {
      const cert = forge.pki.certificateFromPem(pemCertificate);
      const now = new Date();

      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;
      const isExpired = now < validFrom || now > validTo;

      const subjectCN = (cert.subject.getField('CN')?.value as string) || 'Unknown Subject';
      const issuerCN = (cert.issuer.getField('CN')?.value as string) || 'Unknown Issuer';

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
    } catch (error) {
      throw new Error('Certificado X.509 inválido ou malformado.');
    }
  }
}
