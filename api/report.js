// api/report.js
import { log } from "./utils/index.js";

// Chama internamente a lógica de verificação (evita round-trip HTTP interno)
import verifyHandler from "./verify.js";

/**
 * Monta um objeto de "fake response" compatível para reusar o handler
 * de verify.js internamente sem precisar de uma segunda requisição HTTP.
 */
function callVerifyInternally(email, empresa) {
  return new Promise((resolve, reject) => {
    const fakeReq = { method: "POST", body: { email, empresa } };
    const fakeRes = {
      _status: 200,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        if (this._status >= 400) {
          reject(new Error(payload.error || "Falha na verificação"));
        } else {
          resolve(payload);
        }
        return this;
      },
    };
    verifyHandler(fakeReq, fakeRes).catch(reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, empresa } = req.body;

  if (!email || !empresa) {
    return res.status(400).json({ error: "email e empresa são obrigatórios" });
  }

  try {
    log(`Gerando relatório para ${email} — empresa: ${empresa}`);

    const verificacao = await callVerifyInternally(email, empresa);

    const report = {
      cliente: email,
      empresa: verificacao.empresa,
      company_number: verificacao.company_number || null,
      encontrada: verificacao.encontrada,
      status: verificacao.status || null,
      data_registro: verificacao.data_registro || null,
      endereco: verificacao.endereco || null,
      diretores: verificacao.diretores || [],
      ubo_declarado: verificacao.ubo_declarado ?? null,
      analise: {
        risco: verificacao.risco,
        score: verificacao.score,
        flags: verificacao.flags,
      },
      fonte: verificacao.fonte || "Companies House (UK Government Official Register)",
      gerado_em: new Date().toISOString(),
    };

    return res.status(200).json(report);
  } catch (err) {
    return res.status(502).json({
      error: "Falha ao gerar relatório",
      details: err.message,
    });
  }
}

export { callVerifyInternally };