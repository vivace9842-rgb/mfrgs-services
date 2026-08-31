import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ESSENTIAL_VERIFICATION = { id: "ESSENTIAL_VERIFICATION_V1", price: 99.0 };
let supabaseInstance = null;

function sanitize(input, max = 200) {
  if (typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").trim().slice(0, max);
}
function normalizeDigits(input) { return sanitize(input, 40).replace(/\D/g, ""); }
function log(message) { console.log(`[MFRGS-VERIFICATION] ${new Date().toISOString()} - ${message}`); }
function errorLog(message) { console.error(`[MFRGS-VERIFICATION] ${new Date().toISOString()} - ${message}`); }

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    supabaseInstance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return supabaseInstance;
}

async function fetchJson(url, options = {}, label = "external source") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(options.headers || {}) },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      const detail = data?.message || data?.error || `${response.status} ${response.statusText}`;
      throw new Error(`${label}: ${detail}`);
    }
    return data;
  } finally { clearTimeout(timeout); }
}

function classifyRisk(profile, officers, psc) {
  const flags = [];
  let score = 100;
  const status = String(profile.company_status || "").toLowerCase();
  if (!status || !["active", "ativa", "regular"].some((value) => status.includes(value))) {
    flags.push(`Situação cadastral: ${profile.company_status || "Não informada"}`);
    score -= 45;
  }
  if (!psc || psc.length === 0) {
    flags.push("Nenhum sócio/beneficiário de controle foi identificado na fonte consultada");
    score -= 20;
  }
  const activeOfficers = (officers || []).filter((officer) => !officer.resigned_on && !officer.terminated_on);
  if (activeOfficers.length === 0) {
    flags.push("Nenhum administrador/diretor ativo foi identificado na fonte consultada");
    score -= 20;
  }
  score = Math.max(0, Math.min(100, score));
  let risco = "Baixo";
  if (score < 40) risco = "Alto";
  else if (score < 75) risco = "Médio";
  return { risco, score, flags };
}

async function brazilCompanyByCnpj(cnpj) {
  const cleanCnpj = normalizeDigits(cnpj);
  if (cleanCnpj.length !== 14) return null;
  const data = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {}, "BrasilAPI CNPJ");
  const qsa = Array.isArray(data?.qsa) ? data.qsa : [];
  const officers = qsa.map((person) => ({ name: person.nome_socio || person.nome_representante_legal || "Não informado", officer_role: person.qualificacao_socio || "Sócio/Administrador", appointed_on: person.data_entrada_sociedade || "" }));
  const psc = qsa.map((person) => ({ name: person.nome_socio || person.nome_representante_legal || "Não informado", natures_of_control: [person.qualificacao_socio || "Participação societária"], notified_on: person.data_entrada_sociedade || "" }));
  return {
    profile: {
      company_name: data.razao_social || data.nome_fantasia || "Empresa não informada",
      company_status: data.descricao_situacao_cadastral || String(data.situacao_cadastral || "Não informado"),
      date_of_creation: data.data_inicio_atividade || "Não informado",
      registered_office_address: {
        address_line_1: [data.logradouro, data.numero].filter(Boolean).join(", "), address_line_2: data.complemento || undefined,
        locality: data.municipio || undefined, postal_code: data.cep || undefined, country: "Brazil",
      },
    },
    officers, psc, companyNumber: cleanCnpj, source: "BrasilAPI / dados cadastrais públicos de CNPJ",
  };
}

function companiesHouseHeaders() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) throw new Error("COMPANIES_HOUSE_API_KEY não configurada");
  return { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` };
}
async function companiesHouseRequest(path) {
  return fetchJson(`https://api.company-information.service.gov.uk${path}`, { headers: companiesHouseHeaders() }, "Companies House API");
}
async function companiesHouseCompany(query) {
  const search = await companiesHouseRequest(`/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`);
  const items = Array.isArray(search?.items) ? search.items : [];
  if (items.length === 0) return null;
  const match = items.find((item) => String(item.company_status).toLowerCase() === "active") || items[0];
  const companyNumber = match.company_number;
  if (!companyNumber) return null;
  const [profile, officersResponse, pscResponse] = await Promise.all([
    companiesHouseRequest(`/company/${encodeURIComponent(companyNumber)}`),
    companiesHouseRequest(`/company/${encodeURIComponent(companyNumber)}/officers?items_per_page=100&start_index=0`),
    companiesHouseRequest(`/company/${encodeURIComponent(companyNumber)}/persons-with-significant-control?items_per_page=100&start_index=0&register_view=true`),
  ]);
  return {
    profile: { company_name: profile.company_name || match.title || query, company_status: profile.company_status || match.company_status || "unknown", date_of_creation: profile.date_of_creation || match.date_of_creation || "", registered_office_address: profile.registered_office_address || match.address || {} },
    officers: Array.isArray(officersResponse?.items) ? officersResponse.items : [],
    psc: Array.isArray(pscResponse?.items) ? pscResponse.items : [], companyNumber, source: "Companies House Public Data API",
  };
}

async function findCompany({ empresa, cnpj, country }) {
  const cleanCnpj = normalizeDigits(cnpj);
  const normalizedCountry = String(country || "").toLowerCase();
  if (cleanCnpj.length === 14 || normalizedCountry.includes("brazil") || normalizedCountry.includes("brasil")) {
    if (cleanCnpj.length !== 14) throw new Error("Para empresas brasileiras, informe um CNPJ válido com 14 dígitos.");
    return brazilCompanyByCnpj(cleanCnpj);
  }
  return companiesHouseCompany(empresa);
}

async function assertPaidOrder({ email, sessionId, empresa }) {
  const supabase = getSupabase();
  let query = supabase.from("orders").select("id, session_id, status, email, amount, currency, metadata, created_at").eq("status", "approved");
  if (sessionId) query = query.eq("session_id", sessionId);
  else query = query.eq("email", email).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const { data, error } = await query.order("created_at", { ascending: false }).limit(5);
  if (error) throw error;
  const orders = Array.isArray(data) ? data : [];
  return orders.find((order) => {
    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata : {};
    const orderCompany = String(metadata.company || metadata.companyName || "").trim().toLowerCase();
    return !empresa || !orderCompany || orderCompany === empresa.trim().toLowerCase();
  }) || orders[0] || null;
}

export async function executeVerification({ email, empresa, cnpj = "", country = "Brazil", sessionId = "" }) {
  const cleanEmail = sanitize(email, 254), cleanEmpresa = sanitize(empresa, 150), cleanCnpj = sanitize(cnpj, 30), cleanCountry = sanitize(country, 100) || "Brazil", cleanSessionId = sanitize(sessionId, 255);
  if (!cleanEmail || !cleanEmpresa) return { statusCode: 400, payload: { success: false, error: "email e empresa são obrigatórios", timestamp: new Date().toISOString() } };
  if (!EMAIL_REGEX.test(cleanEmail)) return { statusCode: 400, payload: { success: false, error: "E-mail inválido", timestamp: new Date().toISOString() } };

  const paidOrder = await assertPaidOrder({ email: cleanEmail, sessionId: cleanSessionId, empresa: cleanEmpresa });
  if (!paidOrder) return { statusCode: 402, payload: { success: false, error: "Pagamento necessário. Nenhum pedido aprovado foi encontrado para esta solicitação.", timestamp: new Date().toISOString() } };

  const metadata = paidOrder.metadata && typeof paidOrder.metadata === "object" ? paidOrder.metadata : {};
  const targetCnpj = cleanCnpj || String(metadata.cnpj || metadata.number || ""), targetCountry = cleanCountry || String(metadata.country || "Brazil");
  log(`Verificação paga iniciada | session=${paidOrder.session_id} | empresa=${cleanEmpresa}`);

  let result;
  try { result = await findCompany({ empresa: cleanEmpresa, cnpj: targetCnpj, country: targetCountry }); }
  catch (sourceError) {
    errorLog(`Fonte externa indisponível: ${sourceError instanceof Error ? sourceError.message : String(sourceError)}`);
    return { statusCode: 503, payload: { success: false, error: "A fonte oficial de verificação está temporariamente indisponível. O pedido permanece protegido para reprocessamento.", timestamp: new Date().toISOString() } };
  }

  if (!result) return { statusCode: 200, payload: { success: true, service: ESSENTIAL_VERIFICATION.id, price: ESSENTIAL_VERIFICATION.price, email: cleanEmail, empresa: cleanEmpresa, encontrada: false, risco: "Não verificável", score: null, flags: ["Nenhuma empresa correspondente foi encontrada na fonte consultada"], fonte: "Fonte oficial consultada", session_id: paidOrder.session_id, timestamp: new Date().toISOString() } };

  const activeOfficers = result.officers.filter((officer) => !officer.resigned_on && !officer.terminated_on).map((officer) => ({ nome: officer.name || officer.nome_socio || "Não informado", cargo: officer.officer_role || officer.qualificacao_socio || "Administrador/Sócio", nomeado_em: officer.appointed_on || officer.data_entrada_sociedade || "Desconhecido" }));
  const activePscs = result.psc.filter((person) => !person.ceased_on), risk = classifyRisk(result.profile, result.officers, result.psc);

  return { statusCode: 200, payload: {
    success: true, service: ESSENTIAL_VERIFICATION.id, price: ESSENTIAL_VERIFICATION.price, email: cleanEmail, empresa: result.profile.company_name || cleanEmpresa,
    company_number: result.companyNumber, encontrada: true, status: result.profile.company_status || "Não informado", data_registro: result.profile.date_of_creation || "Não informado",
    endereco: result.profile.registered_office_address || {}, diretores: activeOfficers, ubo_declarado: activePscs.length > 0, quantidade_psc: activePscs.length,
    risco: risk.risco, score: risk.score, flags: risk.flags, fonte: result.source, session_id: paidOrder.session_id, timestamp: new Date().toISOString(),
  } };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Método HTTP não permitido. Utilize POST." });
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const result = await executeVerification({ email: body.email, empresa: body.empresa || body.company, cnpj: body.cnpj || body.number, country: body.country, sessionId: body.session_id || body.sessionId });
    return res.status(result.statusCode).json(result.payload);
  } catch (err) {
    errorLog(`Falha na verificação: ${err instanceof Error ? err.message : String(err)}`);
    return res.status(502).json({ success: false, error: "Falha interna ao consultar serviços de verificação", timestamp: new Date().toISOString() });
  }
}

export { ESSENTIAL_VERIFICATION };
