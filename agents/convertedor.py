/**
 * ===========================================================
 * MFRGS DIGITAL VERIFICATION
 * AGENTE 02 - CONVERTEDOR
 * Version: 2.0 (TypeScript Production-Ready)
 * ===========================================================
 *
 * Responsabilidade:
 * • Receber tarefas do Guardian
 * • Gerar respostas humanizadas via OpenAI (gpt-4o-mini)
 * • Nunca publicar diretamente
 * • Sempre devolver o resultado estruturado ao Guardian
 */

import OpenAI from 'openai';

/**
 * Interface que define o evento recebido do Guardian
 */
export interface EventoGuardian {
  texto: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface do retorno padronizado para o Guardian
 */
export interface ResultadoConvertedor {
  tipo: 'resposta_pronta' | 'erro';
  texto: string;
}

// Configuração da Landing Page via variável de ambiente
const LANDING_PAGE: string =
  process.env.MFRGS_LANDING_PAGE || 'https://mfrgs-services.vercel.app/';

/**
 * Obtém ou inicializa o cliente da OpenAI de forma segura
 */
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'mock-key-para-teste-local') {
    return null;
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Constrói o Prompt do Sistema garantindo as regras invioláveis da persona
 */
function construirSystemPrompt(): string {
  return `You are the Elite Conversion Agent of MFRGS Digital Verification.

MISSION
Help entrepreneurs worried about supplier fraud.

RULES
- Detect the language automatically.
- Reply in the same language.
- Never sound like spam.
- Show empathy.
- Give one useful practical tip.
- Present MFRGS naturally.
- Explain that we use public corporate records.
- Never claim legal authority.
- Never claim investigative authority.
- Mention accessibility.
- Finish with:

${LANDING_PAGE}`;
}

/**
 * Processa um evento recebido do Guardian e gera uma resposta padronizada.
 *
 * @param evento Objeto contendo o texto a ser analisado
 * @returns Promessa com o resultado formatado
 */
export async function executar(evento: EventoGuardian): Promise<ResultadoConvertedor> {
  // Validação estrita de entrada
  if (!evento || typeof evento.texto !== 'string' || evento.texto.trim() === '') {
    return {
      tipo: 'erro',
      texto: 'Erro: O evento fornecido não contém um texto válido para processamento.',
    };
  }

  const client = getOpenAIClient();

  // Desvio para Teste Local / Mock caso a chave não esteja presente ou seja o valor mock
  if (!client) {
    console.log('💡 [MOCK INTERNO] Simulando chamada da OpenAI API...');
    const textoMockado = `[Mock Response] Hello! I understand you are worried about supplier fraud. Tip: Always check public corporate records. You can verify options at MFRGS naturally. Accessibility is key. Visit: ${LANDING_PAGE}`;

    return {
      tipo: 'resposta_pronta',
      texto: textoMockado,
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: construirSystemPrompt(),
        },
        {
          role: 'user',
          content: evento.texto,
        },
      ],
      temperature: 0.7,
    });

    const conteudoGerado = response.choices[0]?.message?.content;

    if (!conteudoGerado) {
      throw new Error('Retorno vazio da API OpenAI.');
    }

    return {
      tipo: 'resposta_pronta',
      texto: conteudoGerado,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [MfrgsVerificationService] Erro ao chamar OpenAI API: ${errorMessage}`);

    return {
      tipo: 'erro',
      texto: `Falha ao processar solicitação no Agente Convertedor: ${errorMessage}`,
    };
  }
}

/**
 * --- BLOCO DE EXECUÇÃO E TESTE LOCAL ---
 * Permite rodar diretamente via node / ts-node / npx tsx
 */
if (require.main === module) {
  (async () => {
    console.log('🤖 Iniciando teste local do Agente Convertedor...');

    const eventoExemplo: EventoGuardian = {
      texto:
        'i am about to wire $5000 to a new factory but their address looks fake. can anyone help me verify business?',
    };

    const resultado = await executar(eventoExemplo);

    console.log('\n--- RESULTADO RETORNADO AO GUARDIAN ---');
    console.log(`Tipo: ${resultado.tipo}`);
    console.log(`Texto Gerado:\n${resultado.texto}`);
    console.log('---------------------------------------');
  })();
}