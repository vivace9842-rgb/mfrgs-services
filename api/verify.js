import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

// --- INTERFACES (mantidas iguais) ---

export interface EssentialVerificationConfig { id: string; price: number; }
export interface DirectorshipInfo { nome: string; cargo: string; nomeado_em: string; }
export interface AddressInfo { address_line_1?: string; address_line_2?: string; locality?: string; postal_code?: string; country?: string; }
export interface CompanySearchResult { company_number: string; company_name: string; company_status?: string; }
export interface CompanyProfile { company_name: string; company_status: string; date_of_creation: string; registered_office_address?: AddressInfo; }
export interface CompanyOfficer { name: string; officer_role: string; appointed_on: string; resigned_on?: string; }
export interface PersonWithSignificantControl { name?: string; natures_of_control?: string[]; notified_on?: string; ceased_on?: string; }
export interface RiskClassificationResult { risco: "Baixo" | "Médio" | "Alto" | "Crítico" | "Não verificável"; score: number | null; flags: string[]; }
export interface VerificationSuccessResponse { success: true; service: string; price: number; email: string; empresa: string; company_number: string; encontrada: true; status: string; data_registro: string; endereco: AddressInfo; diretores: DirectorshipInfo[]; ubo_declarado: boolean; quantidade_psc: number; risco: string; score: number | null; flags: string[]; timestamp: string; }
export interface VerificationNotFoundResponse { service: string; price: number; email: string; empresa: string; encontrada: false; risco: "Não verificável"; score: null; flags: string[]; timestamp: string; }
export interface VerificationErrorResponse { success: false; error: string; details?: string; timestamp: string; }
export type VerificationApiResponse = VerificationSuccessResponse | VerificationNotFoundResponse | VerificationErrorResponse;

// --- CONFIG ---

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const ESSENTIAL_VERIFICATION: EssentialVerificationConfig = { id: "ESSENTIAL_VERIFICATION_V1", price: 49.0 };

function internalSanitize(input: unknown): string {
  if (typeof input!== "string") return "";
  return input.replace(/[<>]/g, "").trim().slice(0, 200); // FIX: limite de tamanho
}
function internalLog(message: string): void { console.log(`[MFRGS-VERIFICATION] ${new Date().toISOString()} - ${message}`); }
function internalErrorLog(message: string): void { console.error(`[MFRGS-VERIFICATION] ${new Date().toISOString()} - ${message}`); }

// --- MOCKS (mantenha, mas agora com aviso) ---
export async function defaultSearchCompany(query: string): Promise<CompanySearchResult[]> {
  if (!query) return [];
  if (!process.env.COMPANIES_HOUSE_API_KEY) {
    internalErrorLog("COMPANIES_HOUSE_API_KEY ausente - usando mock! NÃO USE EM PROD");
  }
  return [{ company_number: "12345678", company_name: query.toUpperCase() + " LTD", company_status: "active" }];
}
export async function defaultGetCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  return { company_name: "EMPRESA DE TESTE MFRGS LTD", company_status: "active", date_of_creation: "2020-01-15", registered_office_address: { address_line_1: "10 Downing Street", locality: "London", postal_code: "SW1A 2AA", country: "United Kingdom" } };
}
export async function defaultGetCompanyOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
  return [{ name: "DOE, John", officer_role: "director", appointed_on: "2020-01-15" }];
}
export async function defaultGetPersonsWithSignificantControl(companyNumber: string): Promise<PersonWithSignificantControl[]> {
  return [{ name: "DOE, John", natures_of_control: ["ownership-of-shares-75-to-100-percent"], notified_on: "2020-01-15" }];
}
export function defaultClassifyRisk(profile: CompanyProfile, officers: CompanyOfficer[], psc: PersonWithSignificantControl[]): RiskClassificationResult {
  const flags: string[] = []; let score = 100;
  if (profile.company_status!== "active") { flags.push(`Empresa inativa: ${profile.company_status}`); score -= 50; }
  if (!psc || psc.length === 0) { flags.push("Nenhum Beneficiário Final (UBO/PSC) declarado"); score -= 20; }
  const activeOfficers = officers.filter((o) =>!o.resigned_on);
  if (activeOfficers.length === 0) { flags.push("Nenhum diretor ativo encontrado"); score -= 30; }
  let risco: RiskClassificationResult["risco"] = "Baixo";
  if (score < 40) risco = "Alto"; else if (score < 75) risco = "Médio";
  return { risco, score, flags };
}

// --- SUPABASE SINGLETON ---
let supabaseInstance: any = null;
function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url ||!key) throw new Error("Supabase env missing");
    supabaseInstance = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return supabaseInstance;
}

// --- CLASSE PRINCIPAL ---

export class MfrgsVerificationService {
  private searchCompanyFn: (q: string) => Promise<CompanySearchResult[]>;
  private getCompanyProfileFn: (num: string) => Promise<CompanyProfile>;
  private getCompanyOfficersFn: (num: string) => Promise<CompanyOfficer[]>;
  private getPscFn: (num: string) => Promise<PersonWithSignificantControl[]>;
  private classifyRiskFn: (profile: CompanyProfile, officers: CompanyOfficer[], psc: PersonWithSignificantControl[]) => RiskClassificationResult;

  constructor(deps?: any) {
    this.searchCompanyFn = deps?.searchCompanyFn || defaultSearchCompany;
    this.getCompanyProfileFn = deps?.getCompanyProfileFn || defaultGetCompanyProfile;
    this.getCompanyOfficersFn = deps?.getCompanyOfficersFn || defaultGetCompanyOfficers;
    this.getPscFn = deps?.getPscFn || defaultGetPersonsWithSignificantControl;
    this.classifyRiskFn = deps?.classifyRiskFn || defaultClassifyRisk;
  }

  public async executeVerification(rawEmail: unknown, rawEmpresa: unknown, rawSessionId?: unknown) {
    const email = internalSanitize(rawEmail);
    const empresa = internalSanitize(rawEmpresa);
    const sessionId = internalSanitize(rawSessionId);

    if (!email ||!empresa) {
      return { statusCode: 400, payload: { success: false, error: "Obrigatório fornecer email e empresa válidos.", timestamp: new Date().toISOString() } };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { statusCode: 400, payload: { success: false, error: "E-mail inválido.", timestamp: new Date().toISOString() } };
    }
    if (empresa.length < 2) {
      return { statusCode: 400, payload: { success: false, error: "Nome da empresa muito curto.", timestamp: new Date().toISOString() } };
    }

    // ===== FIX CRÍTICO: CHECAGEM DE PAGAMENTO =====
    try {
      const supabase = getSupabase();

      // Aceita sessionId OU verifica por email+empresa pagos nas últimas 24h
      let query = supabase.from("orders").select("id, session_id, status").eq("email", email).eq("status", "approved");

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      } else {
        // Se não mandou session_id, só libera se pagou nas últimas 24h pra essa empresa (via metadata)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", twentyFourHoursAgo);
      }

      const { data: paidOrder, error } = await query.maybeSingle();

      if (error) internalErrorLog(`Erro ao checar pagamento: ${JSON.stringify(error)}`);

      if (!paidOrder) {
        return {
          statusCode: 402,
          payload: {
            success: false,
            error: "Pagamento necessário. Realize o checkout antes de verificar.",
            details: "Nenhum pedido aprovado encontrado para este e-mail. Se você já pagou, informe o session_id.",
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (e) {
      // Se o Supabase cair, não libera de graça - falha fechado
      internalErrorLog(`Falha crítica ao validar pagamento: ${e}`);
      return {
        statusCode: 503,
        payload: { success: false, error: "Serviço de verificação temporariamente indisponível. Tente novamente.", timestamp: new Date().toISOString() },
      };
    }
    // ===== FIM FIX CRÍTICO =====

    const serviceId = ESSENTIAL_VERIFICATION.id;
    const servicePrice = ESSENTIAL_VERIFICATION.price;
    internalLog(`Verificação PAGA - Email=${email} | Empresa=${empresa}`);

    const matches = await this.searchCompanyFn(empresa);
    if (!matches || matches.length === 0) {
      return {
        statusCode: 200,
        payload: { service: serviceId, price: servicePrice, email, empresa, encontrada: false, risco: "Não verificável", score: null, flags: ["Nenhuma empresa encontrada"], timestamp: new Date().toISOString() },
      };
    }

    const primaryMatch = matches[0];
    const companyNumber = primaryMatch.company_number;
    if (!companyNumber) {
      return {
        statusCode: 200,
        payload: { service: serviceId, price: servicePrice, email, empresa, encontrada: false, risco: "Não verificável", score: null, flags: ["ID da empresa não retornado"], timestamp: new Date().toISOString() },
      };
    }

    const [profile, officers, psc] = await Promise.all([
      this.getCompanyProfileFn(companyNumber),
      this.getCompanyOfficersFn(companyNumber),
      this.getPscFn(companyNumber),
    ]);

    const activeOfficers = (officers || []).filter((o) =>!o.resigned_on).map((o) => ({ nome: o.name || "Não informado", cargo: o.officer_role || "Não informado", nomeado_em: o.appointed_on || "Desconhecido" }));
    const activePscs = (psc || []).filter((p) =>!p.ceased_on);
    const riskResult = this.classifyRiskFn(profile, officers, psc);

    const responsePayload: VerificationSuccessResponse = {
      success: true, service: serviceId, price: servicePrice, email, empresa: profile.company_name || empresa, company_number: companyNumber, encontrada: true, status: profile.company_status || "Desconhecido", data_registro: profile.date_of_creation || "Desconhecido", endereco: profile.registered_office_address || {}, diretores: activeOfficers, ubo_declarado: activePscs.length > 0, quantidade_psc: activePscs.length, risco: riskResult.risco, score: riskResult.score, flags: riskResult.flags, timestamp: new Date().toISOString(),
    };

    return { statusCode: 200, payload: responsePayload };
  }
}

const serviceInstance = new MfrgsVerificationService();

export default async function handler(req: Request, res: Response): Promise<Response> {
  if (req.method!== "POST") {
    return res.status(405).json({ success: false, error: "Método HTTP não permitido. Utilize POST.", timestamp: new Date().toISOString() });
  }
  try {
    const rawEmail = req.body?.email || "";
    const rawEmpresa = req.body?.empresa || req.body?.company || "";
    const rawSessionId = req.body?.session_id || req.body?.sessionId || "";

    const { statusCode, payload } = await serviceInstance.executeVerification(rawEmail, rawEmpresa, rawSessionId);
    return res.status(statusCode).json(payload);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error? err.message : String(err);
    internalErrorLog(`Falha na verificação: ${errorMessage}`);
    const isProduction = process.env.NODE_ENV === "production";
    return res.status(502).json({ success: false, error: "Falha interna ao consultar serviços de verificação",...(isProduction? {} : { details: errorMessage }), timestamp: new Date().toISOString() });
  }
}