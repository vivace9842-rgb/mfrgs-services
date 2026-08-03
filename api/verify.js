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
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const email = sanitize(req.body?.email || "");
    const empresa = sanitize(
      req.body?.empresa ||
      req.body?.company ||
      ""
    );

    if (!email || !empresa) {
      return res.status(400).json({
        error: "email e empresa são obrigatórios",
      });
    }

    const service = ESSENTIAL_VERIFICATION.id;
    const price = ESSENTIAL_VERIFICATION.price;

    log(`Iniciando ${service}: ${email} (${empresa})`);

    const matches = await searchCompany(empresa);

    if (!matches || matches.length === 0) {
      return res.status(200).json({
        service,
        price,
        email,
        empresa,
        encontrada: false,
        risco: "Não verificável",
        score: null,
        flags: [
          "Nenhuma empresa correspondente encontrada"
        ],
        timestamp: new Date().toISOString(),
      });
    }

    const companyNumber = matches[0].company_number;

    const [
      profile,
      officers,
      psc,
    ] = await Promise.all([
      getCompanyProfile(companyNumber),
      getCompanyOfficers(companyNumber),
      getPersonsWithSignificantControl(companyNumber),
    ]);

    const {
      risco,
      score,
      flags,
    } = classifyRisk(
      profile,
      officers,
      psc
    );

    return res.status(200).json({
      success: true,

      service,
      price,

      email,

      empresa:
        profile.company_name ||
        empresa,

      company_number: companyNumber,

      encontrada: true,

      status:
        profile.company_status,

      data_registro:
        profile.date_of_creation,

      endereco:
        profile.registered_office_address ||
        {},

      diretores:
        (officers || [])
          .filter(
            (o) => !o.resigned_on
          )
          .map((o) => ({
            nome: o.name,
            cargo: o.officer_role,
            nomeado_em:
              o.appointed_on,
          })),

      ubo_declarado:
        (psc || []).length > 0,

      quantidade_psc:
        (psc || []).length,

      risco,
      score,
      flags,

      timestamp:
        new Date().toISOString(),
    });
  } catch (err) {
    logError(
      `Falha na verificação: ${err.stack || err.message}`
    );

    return res.status(502).json({
      success: false,
      error: "Falha ao consultar verificação",
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}