export interface RiskQuizInput {
  partnerJurisdiction:
    | "HIGH_TRANSPARENCY"
    | "STANDARD"
    | "TAX_HAVEN"
    | "UNKNOWN_VIRTUAL";

  transactionValue: number;

  paymentTerms:
    | "ADVANCE"
    | "MILESTONE"
    | "DELIVERY";

  relationshipLength:
    | "NEW"
    | "EXISTING";

  hasPhysicalOffice: boolean;
}

export interface RiskQuizResult {
  score: number;

  riskLevel:
    | "LOW_RISK"
    | "MODERATE_RISK"
    | "HIGH_RISK"
    | "CRITICAL_RISK";

  recommendation: string;

  recommendedPlan:
    | "ESSENTIAL"
    | "PROFESSIONAL"
    | "ENTERPRISE";
}

export interface OSINTSimulationResult {
  query: string;
  simulatedSourcesConsulted: string[];
  demoNote: string;
}

export class OSINTSimulatorService {
  public calculateRiskExposure(
    input: RiskQuizInput
  ): RiskQuizResult {
    let score = 20;

    if (input.partnerJurisdiction === "TAX_HAVEN") {
      score += 30;
    }

    if (input.partnerJurisdiction === "UNKNOWN_VIRTUAL") {
      score += 40;
    }

    if (input.partnerJurisdiction === "STANDARD") {
      score += 10;
    }

    if (input.paymentTerms === "ADVANCE") {
      score += 25;
    }

    if (input.paymentTerms === "MILESTONE") {
      score += 10;
    }

    if (input.relationshipLength === "NEW") {
      score += 15;
    }

    if (!input.hasPhysicalOffice) {
      score += 20;
    }

    score = Math.min(score, 100);

    let riskLevel: RiskQuizResult["riskLevel"] = "LOW_RISK";

    let recommendedPlan: RiskQuizResult["recommendedPlan"] =
      "ESSENTIAL";

    let recommendation =
      "Transação de baixo risco aparente. Verificação cadastral básica recomendada.";

    if (score >= 40 && score < 65) {
      riskLevel = "MODERATE_RISK";
      recommendedPlan = "PROFESSIONAL";

      recommendation =
        "Risco moderado. Recomendada verificação de litígios e estrutura societária (UBO).";
    } else if (score >= 65 && score < 85) {
      riskLevel = "HIGH_RISK";
      recommendedPlan = "PROFESSIONAL";

      recommendation =
        "ALTO RISCO! Exige Due Diligence completa de processos judiciais e falências antes do pagamento.";
    } else if (score >= 85) {
      riskLevel = "CRITICAL_RISK";
      recommendedPlan = "ENTERPRISE";

      recommendation =
        "RISCO CRÍTICO! Sinais claros de opacidade. Não envie pagamentos antecipados sem auditoria profunda.";
    }

    return {
      score,
      riskLevel,
      recommendation,
      recommendedPlan,
    };
  }

  public simulateScan(
    targetQuery: string
  ): OSINTSimulationResult {
    return {
      query: targetQuery,

      simulatedSourcesConsulted: [
        "National Corporate Registrar / State Gazette",
        "Federal & State Tax Compliance Databases",
        "Civil, Tax & Labor Court Records",
        "Bankruptcy Gazette & Public Protest Offices",
        "OFAC & International Sanctions Lists",
        "Open-Source Business News & Digital Brand Footprint",
      ],

      demoNote:
        "This is an illustrative demo. Full service delivers a verified executive PDF dossier.",
    };
  }
}