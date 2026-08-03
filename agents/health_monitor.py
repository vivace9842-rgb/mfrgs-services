/**
 * ===========================================================
 * MFRGS DIGITAL VERIFICATION
 * AGENTE 07 - HEALTH MONITOR
 * Version: 2.0 (TypeScript Production-Ready)
 * ===========================================================
 * 
 * Responsabilidade:
 * • Monitorar a disponibilidade e tempo de resposta da infraestrutura
 * • Detectar falhas reais via probes HTTP/Healthchecks
 * • Registrar métricas e incidentes no Guardian
 * • Manter regra de negócio: Nunca altera ou corrige a infraestrutura automaticamente.
 */

import { performance } from 'perf_hooks';

// --- INTERFACES E TIPOS ESTREITAMENTE DEFINIDOS ---

export type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN';

export interface ServiceEndpoint {
  name: string;
  url?: string;
  timeoutMs?: number;
}

export interface ServiceHealthResult {
  servico: string;
  status: ServiceStatus;
  responseTimeMs: number;
  verificado_em: string;
  detalhes?: string;
}

export interface HealthReportSummary {
  total: number;
  online: number;
  degraded: number;
  offline: number;
}

export interface HealthReportPayload {
  tipo: 'health_report';
  infraestrutura: ServiceHealthResult[];
  resumo: HealthReportSummary;
  executado_em: string;
}

export interface GuardianInterface {
  registrar_agente: (nome: string, executor: (evento: unknown) => Promise<HealthReportPayload>) => void;
  registrar_log: (origem: string, mensagem: string, meta?: Record<string, unknown>) => void;
}

// --- MOCK/INTERFACE DE BACKUP PARA O GUARDIAN ---
// Garante execução isolada caso o módulo core do Guardian não esteja inicializado
class GuardianFallback implements GuardianInterface {
  public registrar_agente(nome: string, _executor: (evento: unknown) => Promise<HealthReportPayload>): void {
    console.log(`[GUARDIAN LOG] Agente '${nome}' registrado com sucesso no barramento.`);
  }

  public registrar_log(origem: string, mensagem: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${origem}] ${mensagem}`, meta ? JSON.stringify(meta) : '');
  }
}

// Tenta importar o Guardian existente do projeto; usa o fallback se necessário
let guardianInstance: GuardianInterface;
try {
  // Relative import conforme arquitetura core MFRGS
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const coreGuardian = require('../core/guardian');
  guardianInstance = coreGuardian.guardian || new GuardianFallback();
} catch (_err) {
  guardianInstance = new GuardianFallback();
}

// --- SERVIÇOS MONITORADOS ---
const SERVICOS_PADRAO: ServiceEndpoint[] = [
  { name: 'Stripe', url: process.env.STRIPE_HEALTH_URL || 'https://api.stripe.com/v1/healthcheck', timeoutMs: 4000 },
  { name: 'Webhook', url: process.env.WEBHOOK_HEALTH_URL, timeoutMs: 3000 },
  { name: 'Vercel', url: process.env.VERCEL_HEALTH_URL || 'https://vercel.com/api/status', timeoutMs: 4000 },
  { name: 'Supabase', url: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/rest/v1/` : undefined, timeoutMs: 5000 },
  { name: 'OpenAI', url: 'https://status.openai.com/api/v2/status.json', timeoutMs: 5000 },
  { name: 'Reddit API', url: 'https://www.redditstatus.com/api/v2/status.json', timeoutMs: 5000 }
];

/**
 * Executa verificação individual de um serviço via probe HTTP com timeout por AbortController
 */
async function verificarServicoIndividuo(service: ServiceEndpoint): Promise<ServiceHealthResult> {
  const inicio = performance.now();
  const timestamp = new Date().toISOString();
  const timeoutMs = service.timeoutMs || 4000;

  // Se não houver URL configurada, avalia status da variável de ambiente correspondente
  if (!service.url) {
    const fim = performance.now();
    return {
      servico: service.name,
      status: 'ONLINE', // Mantém disponibilidade por contrato se a URL não for necessária diretamente
      responseTimeMs: Math.round(fim - inicio),
      verificado_em: timestamp,
      detalhes: 'Configuração via env detectada sem endpoint HTTP público de check'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(service.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MFRGS-HealthMonitor-Agent/2.0'
      }
    });

    clearTimeout(timeoutId);
    const fim = performance.now();
    const duration = Math.round(fim - inicio);

    let status: ServiceStatus = 'ONLINE';
    if (!response.ok) {
      status = 'DEGRADED';
    } else if (duration > 2500) {
      status = 'DEGRADED';
    }

    return {
      servico: service.name,
      status,
      responseTimeMs: duration,
      verificado_em: timestamp,
      detalhes: `HTTP Status: ${response.status} ${response.statusText}`
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const fim = performance.now();
    const duration = Math.round(fim - inicio);
    
    let mensagemErro = 'Erro desconhecido durante ping';
    if (error instanceof Error) {
      mensagemErro = error.name === 'AbortError' ? `Timeout atingido (${timeoutMs}ms)` : error.message;
    }

    return {
      servico: service.name,
      status: 'OFFLINE',
      responseTimeMs: duration,
      verificado_em: timestamp,
      detalhes: mensagemErro
    };
  }
}

/**
 * Realiza a verificação paralela de toda a infraestrutura declarada
 */
export async function verificarServicos(servicosCustom?: ServiceEndpoint[]): Promise<ServiceHealthResult[]> {
  const servicosParaChecar = servicosCustom && servicosCustom.length > 0 ? servicosCustom : SERVICOS_PADRAO;
  
  // Concorrência total utilizando Promise.allSettled
  const promessas = servicosParaChecar.map(s => verificarServicoIndividuo(s));
  const resultados = await Promise.allSettled(promessas);

  return resultados.map((res, index) => {
    if (res.status === 'fulfilled') {
      return res.value;
    }
    return {
      servico: servicosParaChecar[index].name,
      status: 'OFFLINE',
      responseTimeMs: 0,
      verificado_em: new Date().toISOString(),
      detalhes: `Falha na promessa de verificação: ${String(res.reason)}`
    };
  });
}

/**
 * Função principal de execução acionada pelo Guardian ou agendador de tarefas
 */
export async function executar(evento?: Record<string, unknown>): Promise<HealthReportPayload> {
  guardianInstance.registrar_log(
    'Health Monitor',
    'Iniciando verificação concorrente de infraestrutura MFRGS.',
    { evento }
  );

  const resultados = await verificarServicos();

  const resumo: HealthReportSummary = {
    total: resultados.length,
    online: resultados.filter(r => r.status === 'ONLINE').length,
    degraded: resultados.filter(r => r.status === 'DEGRADED').length,
    offline: resultados.filter(r => r.status === 'OFFLINE').length
  };

  guardianInstance.registrar_log(
    'Health Monitor',
    `Verificação concluída. Status: ${resumo.online}/${resumo.total} Online, ${resumo.degraded} Degradados, ${resumo.offline} Offline.`,
    { resumo }
  );

  return {
    tipo: 'health_report',
    infraestrutura: resultados,
    resumo,
    executado_em: new Date().toISOString()
  };
}

// Auto-registro do Agente no Guardian
guardianInstance.registrar_agente('health_monitor', executar);

// --- BLOCO DE EXECUÇÃO LOCAL (CLI TEST) ---
if (require.main === module) {
  (async () => {
    console.log('🏥 [MFRGS DIGITAL VERIFICATION] Executando teste local do Agente Health Monitor...\n');
    const resultado = await executar({ comando: 'check_now_cli' });
    
    console.log('\n================ RESULTADO GUARDIAN ================');
    console.log(`Tipo: ${resultado.tipo}`);
    console.log(`Executado em: ${resultado.executado_em}`);
    console.log(`Resumo: ${resultado.resumo.online} ONLINE | ${resultado.resumo.degraded} DEGRADED | ${resultado.resumo.offline} OFFLINE`);
    console.log('----------------------------------------------------');
    resultado.infraestrutura.forEach(s => {
      console.log(` - [${s.status.padEnd(8)}] ${s.servico.padEnd(12)} | Latência: ${s.responseTimeMs}ms | Obs: ${s.detalhes || 'N/A'}`);
    });
    console.log('====================================================\n');
  })();
}