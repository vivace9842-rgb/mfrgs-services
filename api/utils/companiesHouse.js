// api/utils/companiesHouse.js
// Integração real com a Companies House API (Reino Unido)
// Docs: https://developer.company-information.service.gov.uk/

const CH_BASE_URL = "https://api.company-information.service.gov.uk";

function getAuthHeader() {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    throw new Error("COMPANIES_HOUSE_API_KEY não configurada");
  }
  // Companies House usa Basic Auth com a API key como username e senha vazia
  const encoded = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Busca empresas por nome (autocomplete-like search)
 */
export async function searchCompany(companyName) {
  const url = `${CH_BASE_URL}/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=5`;
  const res = await fetch(url, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error(`Companies House search falhou: ${res.status}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Busca detalhes completos de uma empresa pelo número de registro
 */
export async function getCompanyProfile(companyNumber) {
  const url = `${CH_BASE_URL}/company/${companyNumber}`;
  const res = await fetch(url, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error(`Companies House profile falhou: ${res.status}`);
  }

  return res.json();
}

/**
 * Busca diretores/officers de uma empresa
 */
export async function getCompanyOfficers(companyNumber) {
  const url = `${CH_BASE_URL}/company/${companyNumber}/officers`;
  const res = await fetch(url, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!res.ok) {
    throw new Error(`Companies House officers falhou: ${res.status}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Busca pessoas com controle significativo (UBO / beneficial ownership)
 */
export async function getPersonsWithSignificantControl(companyNumber) {
  const url = `${CH_BASE_URL}/company/${companyNumber}/persons-with-significant-control`;
  const res = await fetch(url, {
    headers: { Authorization: getAuthHeader() },
  });

  // Nem toda empresa tem PSC registrado — 404 aqui é esperado às vezes
  if (res.status === 404) return [];

  if (!res.ok) {
    throw new Error(`Companies House PSC falhou: ${res.status}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Calcula uma classificação de risco básica e objetiva
 * a partir de sinais reais retornados pela Companies House.
 * NÃO é opinião — são regras determinísticas sobre dados oficiais.
 */
export function classifyRisk(profile, officers, psc) {
  const flags = [];

  if (profile.company_status !== "active") {
    flags.push(`Status da empresa: ${profile.company_status} (não ativa)`);
  }

  if (profile.company_status === "dissolved") {
    flags.push("Empresa dissolvida");
  }

  const incorporatedDate = profile.date_of_creation
    ? new Date(profile.date_of_creation)
    : null;
  const ageInMonths = incorporatedDate
    ? (Date.now() - incorporatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : null;

  if (ageInMonths !== null && ageInMonths < 6) {
    flags.push("Empresa registrada há menos de 6 meses");
  }

  const activeOfficers = officers.filter((o) => !o.resigned_on);
  if (activeOfficers.length === 0) {
    flags.push("Nenhum diretor ativo encontrado");
  }

  if (psc.length === 0) {
    flags.push("Nenhum beneficiário real (PSC) declarado");
  }

  if (profile.accounts?.overdue) {
    flags.push("Contas financeiras em atraso (overdue)");
  }

  if (profile.confirmation_statement?.overdue) {
    flags.push("Confirmation statement em atraso");
  }

  let risco = "Baixo";
  if (flags.length >= 3) risco = "Crítico";
  else if (flags.length === 2) risco = "Alto";
  else if (flags.length === 1) risco = "Médio";

  // Score simples e transparente, não "mágico"
  const score = Math.max(0, 100 - flags.length * 20);

  return { risco, score, flags };
}