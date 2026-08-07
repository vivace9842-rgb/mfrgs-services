import { Agent } from './core';

export interface AnalysisPayload {
  prompt: string;
  contextData?: Record<string, unknown>;
  maxTokens?: number;
}

export interface AnalysisResult {
  text: string;
  tokensUsed?: number;
}

export class OpenAIAgent implements Agent {
  public readonly name = 'OpenAIAgent';
  public readonly version = '1.0.0';

  private apiKey: string | null = null;
  private defaultModel: string = 'gpt-4o-mini';

  public async initialize(): Promise<void> {
    this.apiKey = process.env.OPENAI_API_KEY || null;

    if (!this.apiKey) {
      console.warn(`[${this.name}] Alerta: OPENAI_API_KEY não configurada. Operações rodarão em modo simulação.`);
    }
  }

  public async health(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error(`[${this.name}] Falha no health check:`, error);
      return false;
    }
  }

  /**
   * Executa uma análise com IA para apoiar verificações e gerar resumos técnicos.
   */
  public async analyze(payload: AnalysisPayload): Promise<AnalysisResult> {
    if (!payload.prompt) {
      throw new Error(`[${this.name}] O campo 'prompt' é obrigatório.`);
    }

    if (!this.apiKey) {
      console.log(`[${this.name}] [MOCK] Análise executada em modo simulação.`);
      return {
        text: `[SIMULAÇÃO IA] Análise concluída para o prompt: "${payload.prompt.substring(0, 50)}..."`,
        tokensUsed: 0,
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em análise de dados cadastrais e verificações corporativas.',
            },
            {
              role: 'user',
              content: payload.contextData
                ? `${payload.prompt}\n\nContexto:\n${JSON.stringify(payload.contextData, null, 2)}`
                : payload.prompt,
            },
          ],
          max_tokens: payload.maxTokens || 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API OpenAI: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        text: content,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      console.error(`[${this.name}] Erro na chamada OpenAI:`, error);
      throw error;
    }
  }
}

export const openaiAgent = new OpenAIAgent();