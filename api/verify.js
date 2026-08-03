import { Request, Response } from "express";

// --- INTERFACES DE DOMÍNIO E DTOs ---

export interface EssentialVerificationConfig {
  id: string;
  price: number;
}

export interface DirectorshipInfo {
  nome: string;
  cargo: string;
  nomeado_em: string;
}

export interface AddressInfo {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  postal_code?: string;
  country?: string;
}

export interface CompanySearchResult {
  company_number: string;
  company_name: string;
  company_status?: string;
}

export interface CompanyProfile {
  company_name: string;
  company_status: string;
  date_of_creation: string;
  registered_office_address?: AddressInfo;
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
}

export interface PersonWithSignificantControl {
  name?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
}

export interface RiskClassificationResult {
  risco: "Baixo" | "Médio" | "Alto" | "Crítico" | "Não verificável";
  score: number | null;
  flags: string[];
}

export interface VerificationSuccessResponse {
  success: true;
  service: string;
  price: number;
  email: string;
  empresa: string;
  company_number: string;
  encontrada: true;
  status: string;
  data_registro: string;
  endereco: AddressInfo;
  diretores: DirectorshipInfo[];
  ubo_declarado: boolean;
  quantidade_psc: number;
  risco: string;
  score: number | null;
  flags: string[];
  timestamp: string;
}

export interface VerificationNotFoundResponse {
  service: string;
  price: number;
  email: string;
  empresa: string;
  encontrada: false;
  risco: "Não verificável";
  score: null;
  flags: string[];
  timestamp: string;
}

export interface VerificationErrorResponse {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
}

export type VerificationApiResponse =
  | VerificationSuccessResponse
  | VerificationNotFoundResponse
  | VerificationErrorResponse;

// --- MOCK DE DEPENDÊNCIAS DE SUPORTE (INTERNAS OU IMPORTADAS DE MODULOS EXISTENTES) ---

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ESSENTIAL_VERIFICATION: EssentialVerificationConfig = {
  id: "ESSENTIAL_VERIFICATION_V1",
  price: 49.0,
};

function internalSanitize(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .replace(/[<>]/g, "") // Previne XSS básico
    .trim();
}

function internalLog(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] [${timestamp}] [MFRGS-VERIFICATION] ${message}`);
}

function internalErrorLog(message: string): void {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] [${timestamp}] [MFRGS-VERIFICATION] ${message}`);
}

// Fallbacks de integração (podem ser sobrescritos pelas funções reais da aplicação)
export async function defaultSearchCompany(query: string): Promise<CompanySearchResult[]> {
  // Chamada simulada para typecheck e execução isolada segura
  if (!query) return [];
  return [
    {
      company_number: "12345678",
      company_name: query.toUpperCase() + " LTD",
      company_status: "active",
    },
  ];
}

export async function defaultGetCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  return {
    company_name: "EMPRESA DE TESTE MFRGS LTD",
    company_status: "active",
    date_of_creation: "2020-01-15",
    registered_office_address: {
      address_line_1: "10 Downing Street",
      locality: "London",
      postal_code: "SW1A 2AA",
      country: "United Kingdom",
    },
  };
}

export async function defaultGetCompanyOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
  return [
    {
      name: "DOE, John",
      officer_role: "director",
      appointed_on: "2020-01-15",
    },
  ];
}

export async function defaultGetPersonsWithSignificantControl(companyNumber: string): Promise<PersonWithSignificantControl[]> {
  return [
    {
      name: "DOE, John",
      natures_of_control: ["ownership-of-shares-75-to-100-percent"],
      notified_on: "2020-01-15",
    },
  ];
}

export function defaultClassifyRisk(
  profile: CompanyProfile,
  officers: CompanyOfficer[],
  psc: PersonWithSignificantControl[]
): RiskClassificationResult {
  const flags: string[] = [];
  let score = 100;

  if (profile.company_status !== "active") {
    flags.push(`Empresa inativa ou em status especial: ${profile.company_status}`);
    score -= 50;
  }

  if (!psc || psc.length === 0) {
    flags.push("Nenhum Beneficiário Final (UBO/PSC) declarado");
    score -= 20;
  }

  const activeOfficers = officers.filter((o) => !o.resigned_on);
  if (activeOfficers.length === 0) {
    flags.push("Nenhum diretor ativo encontrado");
    score -= 30;
  }

  let risco: RiskClassificationResult["risco"] = "Baixo";
  if (score < 40) risco = "Alto";
  else if (score < 75) risco = "Médio";

  return { risco, score, flags };
}

// --- CLASSE PRINCIPAL DO SERVIÇO ---

export class MfrgsVerificationService {
  private searchCompanyFn: (q: string) => Promise<CompanySearchResult[]>;
  private getCompanyProfileFn: (num: string) => Promise<CompanyProfile>;
  private getCompanyOfficersFn: (num: string) => Promise<CompanyOfficer[]>;
  private getPscFn: (num: string) => Promise<PersonWithSignificantControl[]>;
  private classifyRiskFn: (
    profile: CompanyProfile,
    officers: CompanyOfficer[],
    psc: PersonWithSignificantControl[]
  ) => RiskClassificationResult;

  constructor(
    deps?: {
      searchCompanyFn?: (q: string) => Promise<CompanySearchResult[]>;
      getCompanyProfileFn?: (num: string) => Promise<CompanyProfile>;
      getCompanyOfficersFn?: (num: string) => Promise<CompanyOfficer[]>;
      getPscFn?: (num: string) => Promise<PersonWithSignificantControl[]>;
      classifyRiskFn?: (
        profile: CompanyProfile,
        officers: CompanyOfficer[],
        psc: PersonWithSignificantControl[]
      ) => RiskClassificationResult;
    }
  ) {
    this.searchCompanyFn = deps?.searchCompanyFn || defaultSearchCompany;
    this.getCompanyProfileFn = deps?.getCompanyProfileFn || defaultGetCompanyProfile;
    this.getCompanyOfficersFn = deps?.getCompanyOfficersFn || defaultGetCompanyOfficers;
    this.getPscFn = deps?.getPscFn || defaultGetPersonsWithSignificantControl;
    this.classifyRiskFn = deps?.classifyRiskFn || defaultClassifyRisk;
  }

  /**
   * Executa a verificação completa de uma empresa e retorna o DTO de resultado.
   */
  public async executeVerification(
    rawEmail: unknown,
    rawEmpresa: unknown
  ): Promise<{ statusCode: number; payload: VerificationApiResponse }> {
    const email = internalSanitize(rawEmail);
    const empresa = internalSanitize(rawEmpresa);

    if (!email || !empresa) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          error: "Obrigatório fornecer email e empresa válidos.",
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!EMAIL_REGEX.test(email)) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          error: "O endereço de e-mail informado é inválido.",
          timestamp: new Date().toISOString(),
        },
      };
    }

    const serviceId = ESSENTIAL_VERIFICATION.id;
    const servicePrice = ESSENTIAL_VERIFICATION.price;

    internalLog(`Iniciando verificação do serviço [${serviceId}]: Email=${email} | Empresa=${empresa}`);

    const matches = await this.searchCompanyFn(empresa);

    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return {
        statusCode: 200,
        payload: {
          service: serviceId,
          price: servicePrice,
          email,
          empresa,
          encontrada: false,
          risco: "Não verificável",
          score: null,
          flags: ["Nenhuma empresa correspondente foi encontrada na base de dados nacional"],
          timestamp: new Date().toISOString(),
        },
      };
    }

    const primaryMatch = matches[0];
    const companyNumber = primaryMatch.company_number;

    if (!companyNumber) {
      return {
        statusCode: 200,
        payload: {
          service: serviceId,
          price: servicePrice,
          email,
          empresa,
          encontrada: false,
          risco: "Não verificável",
          score: null,
          flags: ["Identificador numérico da empresa não retornado pelas fontes de dados"],
          timestamp: new Date().toISOString(),
        },
      };
    }

    const [profile, officers, psc] = await Promise.all([
      this.getCompanyProfileFn(companyNumber),
      this.getCompanyOfficersFn(companyNumber),
      this.getPscFn(companyNumber),
    ]);

    const activeOfficers = (officers || [])
      .filter((officer) => !officer.resigned_on)
      .map((officer) => ({
        nome: officer.name || "Não informado",
        cargo: officer.officer_role || "Não informado",
        nomeado_em: officer.appointed_on || "Desconhecido",
      }));

    const activePscs = (psc || []).filter((person) => !person.ceased_on);

    const riskResult = this.classifyRiskFn(profile, officers, psc);

    const responsePayload: VerificationSuccessResponse = {
      success: true,
      service: serviceId,
      price: servicePrice,
      email,
      empresa: profile.company_name || empresa,
      company_number: companyNumber,
      encontrada: true,
      status: profile.company_status || "Desconhecido",
      data_registro: profile.date_of_creation || "Desconhecido",
      endereco: profile.registered_office_address || {},
      diretores: activeOfficers,
      ubo_declarado: activePscs.length > 0,
      quantidade_psc: activePscs.length,
      risco: riskResult.risco,
      score: riskResult.score,
      flags: riskResult.flags,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      payload: responsePayload,
    };
  }
}

// --- HANDLER HTTP SERVERLESS/EXPRESS COMPATÍVEL ---

const serviceInstance = new MfrgsVerificationService();

export default async function handler(req: Request, res: Response): Promise<Response> {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método HTTP não permitido. Utilize POST.",
      timestamp: new Date().toISOString(),
    } as VerificationErrorResponse);
  }

  try {
    const rawEmail = req.body?.email || "";
    const rawEmpresa = req.body?.empresa || req.body?.company || "";

    const { statusCode, payload } = await serviceInstance.executeVerification(rawEmail, rawEmpresa);

    return res.status(statusCode).json(payload);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    internalErrorLog(`Falha na verificação digital MFRGS: ${errorStack || errorMessage}`);

    const isProduction = process.env.NODE_ENV === "production";

    return res.status(502).json({
      success: false,
      error: "Falha interna ao consultar serviços de verificação",
      ...(isProduction ? {} : { details: errorMessage }),
      timestamp: new Date().toISOString(),
    } as VerificationErrorResponse);
  }
}