/**
 * ===========================================================
 * MFRGS DIGITAL VERIFICATION
 * AGENTE 03 - CIENTISTA
 * Version: 2.0.0
 * ===========================================================
 * 
 * Responsabilidade:
 * • Monitorar tendências do mercado de verificação empresarial.
 * • Pesquisar oportunidades e identificar novos concorrentes/ameaças.
 * • Sugerir melhorias contínuas para o ecossistema MFRGS.
 * • Reportar todas as descobertas de forma auditável ao Guardian.
 * 
 * Regra: Nunca altera o sistema automaticamente. Apenas sugere e reporta.
 */

import OpenAI from 'openai';

// --- INTERFACES & TIPOS STRICTS ---

export interface EventoCientista {
  dados: string;
  origem?: string;
  metadata?: Record<string, unknown>;
}

export interface ResultadoAnaliticoCientista {
  tendencia: string;
  impacto: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA';
  sugestao: string;
  acao_recomendada: string;
}

export interface RespostaAgenteCientista {
  tipo: string;
  resultado: string; // JSON stringificado conforme especificação
}

// Interface simplificada do Guardian para garantir o contrato de registro e logs
export interface IGuardian {
  registrar_log(agente: string, mensagem: string): void;
  registrar_agente(nome: string, handler: (evento: EventoCientista) => Promise<RespostaAgenteCientista>): void;
}

// Singleton local do Guardian / Fallback para caso o módulo central ainda não tenha sido importado
class GuardianServiceFallback implements IGuardian {
  public registrar_log(agente: string, mensagem: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[GUARDIAN LOG][${timestamp}][${agente}]: ${mensagem}`);
  }

  public registrar_agente(nome: string, handler: Function): void {
    console.log(`[GUARDIAN] Agente '${nome}' registrado com sucesso na matriz de execução.`);
  }
}

// Mock de exportação do Guardian mantendo compatibilidade de importação
export const guardian: IGuardian = new GuardianServiceFallback();

// --- INICIALIZAÇÃO SEGURA DO CLIENTE OPENAI ---

const apiKey = process.env.OPENAI_API_KEY;
const isMockMode = !apiKey || apiKey === 'mock-key-para-teste-local' || process.env.NODE_ENV === 'test';

const openaiClient = !isMockMode ? new OpenAI({ apiKey, timeout: 15000 }) : null;

// --- PROMPT DE SISTEMA AUDITADO ---

const CIENTISTA_SYSTEM_PROMPT = `
Você é o Cientista da MFRGS Digital Verification.

Sua missão é analisar tendências do mercado de verificação empresarial,
compliance, due diligence e inteligência corporativa.

OBJETIVOS:
1. Detectar novas tendências.
2. Identificar oportunidades.
3. Detectar novos concorrentes.
4. Sugerir melhorias para nossos serviços.
5. Nunca sair do foco da MFRGS.
6. Nunca sugerir mudanças radicais.
7. Priorizar crescimento sustentável.

Retorne OBRIGATORIAMENTE apenas um JSON válido no seguinte formato e nada mais:
{
  "tendencia": "string",
  "impacto": "string",
  "prioridade": "BAIXA" | "MEDIA" | "ALTA",
  "sugestao": "string",
  "acao_recomendada": "string"
}
`;

// --- FUNÇÃO PRINCIPAL DO AGENTE ---

/**
 * Executa a análise analítica de mercado do Agente Cientista.
 * 
 * @param evento Objeto contendo os dados brutos para análise
 * @returns Resposta padronizada do agente com o payload JSON da tendência
 */
export async function executar(evento: EventoCientista): Promise<RespostaAgenteCientista> {
  guardian.registrar_log("Cientista", "Iniciando análise de mercado.");

  const dadosEntrada = evento?.dados ? String(evento.dados).trim() : "";

  if (!dadosEntrada) {
    guardian.registrar_log("Cientista", "ALERTA: Dados de entrada vazios ou inválidos recebidos.");
    const erroJson: ResultadoAnaliticoCientista = {
      tendencia: "Dados insuficientes para análise.",
      impacto: "Inexistente",
      prioridade: "BAIXA",
      sugestao: "Fornecer dados brutos válidos no evento de entrada.",
      acao_recomendada: "Verificar pipeline de extração de dados."
    };

    return {
      tipo: "nova_tendencia",
      resultado: JSON.stringify(erroJson)
    };
  }

  // --- MODO MOCK / TESTE LOCAL / AMBIENTE SEM CHAVE ---
  if (isMockMode || !openaiClient) {
    guardian.registrar_log("Cientista", "[MOCK INTERNO] Simulando inteligência da OpenAI API...");

    const mockResultado: ResultadoAnaliticoCientista = {
      tendencia: "Aumento de fraudes em fornecedores asiáticos usando identidades clonadas.",
      impacto: "Alto risco para importadores de e-commerce e dropshipping.",
      prioridade: "ALTA",
      sugestao: "Implementar módulo de checagem profunda de registros governamentais.",
      acao_recomendada: "Atualizar a matriz de risco da landing page para capturar este indicador."
    };

    guardian.registrar_log("Cientista", "Pesquisa concluída (Modo Simulativo).");

    return {
      tipo: "nova_tendencia",
      resultado: JSON.stringify(mockResultado)
    };
  }

  // --- CHAMADA PRODUÇÃO OPENAI ---
  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CIENTISTA_SYSTEM_PROMPT },
        { role: "user", content: dadosEntrada }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const conteudoResposta = response.choices[0]?.message?.content ?? "{}";

    // Validação estrita de parsing de JSON
    const parsedJSON = JSON.parse(conteudoResposta) as Partial<ResultadoAnaliticoCientista>;

    // Estruturação garantida com fallbacks defensivos
    const resultadoValidado: ResultadoAnaliticoCientista = {
      tendencia: parsedJSON.tendencia || "Tendência não identificada com clareza.",
      impacto: parsedJSON.impacto || "Impacto a ser avaliado.",
      prioridade: (["BAIXA", "MEDIA", "ALTA"].includes(parsedJSON.prioridade as string)
        ? parsedJSON.prioridade
        : "MEDIA") as 'BAIXA' | 'MEDIA' | 'ALTA',
      sugestao: parsedJSON.sugestao || "Manter monitoramento de rotina.",
      acao_recomendada: parsedJSON.acao_recomendada || "Nenhuma ação imediata exigida."
    };

    guardian.registrar_log("Cientista", "Pesquisa concluída com sucesso.");

    return {
      tipo: "nova_tendencia",
      resultado: JSON.stringify(resultadoValidado)
    };

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Erro desconhecido";
    guardian.registrar_log("Cientista", `ERRO na comunicação com a IA: ${errMessage}`);

    const fallbackErro: ResultadoAnaliticoCientista = {
      tendencia: "Falha na análise via IA.",
      impacto: "Atraso na identificação de inteligência de mercado.",
      prioridade: "BAIXA",
      sugestao: "Verificar conectividade com a API OpenAI e cotas.",
      acao_recomendada: "Reexecutar o agente em caso de instabilidade pontual."
    };

    return {
      tipo: "nova_tendencia",
      resultado: JSON.stringify(fallbackErro)
    };
  }
}

// --- AUTO-REGISTRO DO AGENTE NO GUARDIAN ---
guardian.registrar_agente("cientista", executar);

// --- BLOCO DE EXECUÇÃO DE TESTE LOCAL (CLI) ---
if (require.main === module) {
  (async () => {
    console.log("🧠 Iniciando teste local do Agente Cientista (Node.js/TypeScript)...");

    const eventoExemplo: EventoCientista = {
      dados: "Relatório recente indica que 15% das novas fábricas registradas em portais B2B globais apresentam inconsistências de endereço físico."
    };

    const resultado = await executar(eventoExemplo);
    console.log("\n--- RESULTADO RETORNADO AO GUARDIAN ---");
    console.log(`Tipo: ${resultado.tipo}`);
    console.log(`Resultado Analítico (JSON):\n${resultado.resultado}`);
    console.log("---------------------------------------");
  })();
}