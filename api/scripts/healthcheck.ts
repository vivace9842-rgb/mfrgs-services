import { webhookAgent } from '../agents/webhookAgent.js';
import { auditAgent } from '../agents/auditAgent.js';

async function runHealthcheck(): Promise<void> {
  console.log('[RUFLO] Inicializando orquestrador de agentes...');
  
  // Registra todos os agentes no core
  registerAllAgents();

  try {
    // Inicializa todos os agentes
    await agentCore.initialize();

    console.log('[RUFLO] Executando verificação de saúde (Healthcheck)...');
    const healthStatus = await agentCore.health();

    console.table(
      Object.entries(healthStatus).map(([agent, healthy]) => ({
        Agente: agent,
        Status: healthy ? '✅ OK' : '❌ ERRO',
      }))
    );

    const hasFailure = Object.values(healthStatus).some((healthy) => !healthy);

    if (hasFailure) {
      console.error('[RUFLO] Falha detectada em um ou mais agentes.');
      process.exit(1);
    }

    console.log('[RUFLO] Todos os agentes estão saudáveis e operacionais!');
    process.exit(0);
  } catch (error) {
    console.error('[RUFLO] Erro crítico ao validar saúde dos agentes:', error);
    process.exit(1);
  }
}

runHealthcheck();