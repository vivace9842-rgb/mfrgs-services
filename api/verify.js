// api/verify.js
import { sanitize, log, error as logError } from "./utils/index.js";
import { ESSENTIAL_VERIFICATION } from "../services/essential/config.js";
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

  const service = ESSENTIAL_VERIFICATION.id;
  const price = ESSENTIAL_VERIFICATION.price;

  try {
    log(`Iniciando ${service}: ${email} (${empresa})`);
    const matches = await searchCompany(empresa);

    if (!matches.length) {
      return res.status(200).json({
        service,
        price,
        email,
        empresa,
        encontrada: false,
        risco: "Não verificável",
        score: null,
        flags: ["Nenhuma empresa correspondente encontrada"],
        timestamp: new Date().toISOString(),
      });
    }

    const companyNumber = matches[0].company_number;
    const [profile, officers, psc] = await Promise.all([
      getCompanyProfile(companyNumber),
      getCompanyOfficers(companyNumber),
      getPersonsWithSignificantControl(companyNumber),
    ]);

    const { risco, score, flags } = classifyRisk(profile, officers, psc);

    return res.status(200).json({
      service,
      price,
      email,
      empresa: profile.company_name,
      company_number: companyNumber,
      encontrada: true,
      status: profile.company_status,
      data_registro: profile.date_of_creation,
      endereco: profile.registered_office_address,
      diretores: officers.filter((o) => !o.resigned_on).map((o) => ({ nome: o.name, cargo: o.officer_role })),
      ubo_declarado: psc.length > 0,
      risco,
      score,
      flags,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logError(`Falha na verificação: ${err.message}`);
    return res.status(502).json({ error: "Falha ao consultar verificação", details: err.message });
  }
}
