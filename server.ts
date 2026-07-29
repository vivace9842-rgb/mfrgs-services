import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '.')));

// 2. Rota de API (Retorna o JSON de compliance)
app.get(['/api', '/api/status', '/status'], (req, res) => {
  res.json({
    engine: "MFRGS GLOBAL DIGITAL VERIFICATION & KYB COMPLIANCE API",
    version: "1.3.0-GLOBAL",
    status: "OPERATIONAL",
    environment: "production",
    regions: [
      "US",
      "EU",
      "UK",
      "LATAM"
    ],
    complianceStandards: [
      "eIDAS (EU/UK)",
      "ESIGN Act (US)",
      "ISO/IEC 27001",
      "ICP-Brasil"
    ],
    features: [
      "SHA-256 Hash Verifier",
      "Batch Processor",
      "X.509 Cert Validator",
      "Audit Trail Engine",
      "B2B Corporate KYB Intake"
    ]
  });
});

// 3. Rota Principal (Raiz /) -> Serve o HTML da Landing Page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
