// api/verify.js
import { sanitize, log, error as logError } from "./utils/index.js";
import {
  searchCompany,
  getCompanyProfile,
  getCompanyOfficers,
  getPersonsWithSignificantControl,
  classifyRisk,
} from "./utils/companiesHouse.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = sanitize(req.body.email);
  const empresa = sanitize(req.body.empresa);

  if (!email || !empresa) {
    return res.status(400).json({ error: "email e empresa são obrigatórios" });
  }

  try {
    log(`Iniciando verificação real para ${email} (${empresa})`);

    // 1. Buscar a empresa pelo nome
    const matches = await searchCompany(empresa);

    if (!matches.length) {
      // Empresa não encontrada — isso é um resultado LEGÍTIMO, não erro.
      // O relatório deve dizer isso explicitamente ao cliente.
      return res.status(200).json({
        email,
        empresa,
        encontrada: false,
        risco: "Não verificável",
        score: null,
        flags: ["Nenhuma empresa correspondente encontrada na Companies House"],
        timestamp: new Date().toISOString(),
      });
    }

    // Usa o match mais relevante (primeiro resultado)
    const best = matches[0];
    const companyNumber = best.company_number;

    // 2. Buscar dados completos em paralelo
    const [profile, officers, psc] = await Promise.all([
      getCompanyProfile(companyNumber),
      getCompanyOfficers(companyNumber),
      getPersonsWithSignificantControl(companyNumber),
    ]);

    // 3. Classificar risco com base em dados reais
    const { risco, score, flags } = classifyRisk(profile, officers, psc);

    const resultado = {
      email,
      empresa: profile.company_name,
      company_number: companyNumber,
      encontrada: true,
      status: profile.company_status,
      data_registro: profile.date_of_creation,
      endereco: profile.registered_office_address,
      diretores: officers
        .filter((o) => !o.resigned_on)
        .map((o) => ({ nome: o.name, cargo: o.officer_role })),
      ubo_declarado: psc.length > 0,
      risco,
      score,
      flags,
      fonte: "Companies House (UK Government Official Register)",
      timestamp: new Date().toISOString(),
    };

    log(`Verificação concluída: ${profile.company_name} — risco ${risco}`);
    return res.status(200).json(resultado);
  } catch (err) {
    logError(`Falha na verificação: ${err.message}`);
    return res.status(502).json({
      error: "Falha ao consultar Companies House",
      details: err.message,
    });
  }
}