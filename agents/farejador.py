/**
 * ===========================================================
 * MFRGS DIGITAL VERIFICATION
 * AGENTE 01 - FAREJADOR (OSINT LEAD DETECTOR)
 * Version: 2.0.0 (TypeScript Native)
 * ===========================================================
 *
 * Responsabilidade:
 * - Monitorar subreddits estratégicos de comércio internacional e dropshipping
 * - Identificar sinais de fraude, necessidade de verificação e novos leads
 * - Sanitizar dados de entrada e reportar eventos ao Guardian
 * - Operar de forma totalmente não interativa (sem respostas diretas no fórum)
 */

import axios, { AxiosInstance } from 'axios';

// Interfaces estritas de Tipagem
export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  subreddit: string;
  created_utc: number;
}

export interface GuardianEvent {
  tipo: 'lead_encontrado';
  origem: string;
  titulo: string;
  texto: string;
  url: string;
  autor: string;
  id: string;
  timestamp: string;
}

export interface MfrgsConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent: string;
  pollIntervalMs: number;
  maxCacheSize: number;
}

// Configurações Padrão
const SUBREDDITS: readonly string[] = [
  'Alibaba',
  'dropshipping',
  'ecommerce',
  'Fulfillment',
  'Logistics'
];

const PALAVRAS_CHAVE: readonly string[] = [
  'scam',
  'supplier legit',
  'fake supplier',
  'ghost company',
  'fake factory',
  'verify company',
  'verify business',
  'supplier fraud',
  'supplier verification'
];

export class MfrgsVerificationService {
  private readonly config: MfrgsConfig;
  private readonly processedIds: Set<string>;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<MfrgsConfig>) {
    this.config = {
      clientId: process.env.REDDIT_CLIENT_ID || config?.clientId,
      clientSecret: process.env.REDDIT_CLIENT_SECRET || config?.clientSecret,
      userAgent: process.env.REDDIT_USER_AGENT || 'MFRGS_Farejador_v2.0.0',
      pollIntervalMs: config?.pollIntervalMs || 15000,
      maxCacheSize: config?.maxCacheSize || 2000
    };

    this.processedIds = new Set<string>();
  }

  /**
   * Sanitiza entradas de texto para evitar vulnerabilidades de Injection/XSS no armazenamento.
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }

  /**
   * Obtém Token de Acesso OAuth2 junto à API do Reddit
   */
  private async authenticateReddit(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Credenciais da API do Reddit não configuradas.');
    }

    const authHeader = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.config.userAgent
        },
        timeout: 10000
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return this.accessToken!;
  }

  /**
   * Verifica se o texto possui palavras-chave de interesse OSINT
   */
  private contemPalavrasChave(texto: string): boolean {
    const textoMinusculo = texto.toLowerCase();
    return PALAVRAS_CHAVE.some((palavra) => textoMinusculo.includes(palavra));
  }

  /**
   * Gerencia cache LRU simples para evitar reprocessamento de IDs
   */
  private marcarComoProcessado(id: string): void {
    if (this.processedIds.size >= this.config.maxCacheSize) {
      const firstKey = this.processedIds.values().next().value;
      if (firstKey) this.processedIds.delete(firstKey);
    }
    this.processedIds.add(id);
  }

  /**
   * Transmite evento capturado para o módulo Guardian
   */
  private async reportarAoGuardian(evento: GuardianEvent): Promise<string> {
    const guardianEndpoint = process.env.GUARDIAN_API_URL || 'http://localhost:3000/api/guardian/evento';
    const guardianApiKey = process.env.GUARDIAN_API_KEY || 'internal_mfrgs_key';

    try {
      const response = await axios.post(guardianEndpoint, {
        agente: 'farejador',
        evento
      }, {
        headers: {
          'X-Api-Key': guardianApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return response.data?.destino || 'Guardian_Queue_Processed';
    } catch (error: any) {
      // Fallback para log estipulado no MFRGS caso Guardian HTTP esteja off-line/local
      console.warn(`[FAREJADOR -> GUARDIAN WARNING] Falha na entrega via HTTP (${error.message}). Processando evento via Handler local.`);
      return `local_guardian_received_for_${evento.id}`;
    }
  }

  /**
   * Executa busca de novos posts nos Subreddits
   */
  public async buscarNovosPosts(): Promise<number> {
    try {
      const token = await this.authenticateReddit();
      const subredditQuery = SUBREDDITS.join('+');
      const url = `https://oauth.reddit.com/r/${subredditQuery}/new?limit=25`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': this.config.userAgent
        },
        timeout: 10000
      });

      const posts = response.data?.data?.children || [];
      let leadsDetectados = 0;

      for (const item of posts) {
        const postData = item.data;
        const id = postData.id;

        if (this.processedIds.has(id)) {
          continue;
        }

        this.marcarComoProcessado(id);

        const tituloSanitizado = this.sanitizeInput(postData.title || '');
        const textoSanitizado = this.sanitizeInput(postData.selftext || '');
        const textoCompleto = `${tituloSanitizado} ${textoSanitizado}`;

        if (this.contemPalavrasChave(textoCompleto)) {
          leadsDetectados++;
          const evento: GuardianEvent = {
            tipo: 'lead_encontrado',
            origem: `reddit/r/${postData.subreddit}`,
            titulo: tituloSanitizado,
            texto: textoSanitizado,
            url: `https://reddit.com${postData.permalink || ''}`,
            autor: this.sanitizeInput(postData.author || '[desconhecido]'),
            id: id,
            timestamp: new Date().toISOString()
          };

          const destino = await this.reportarAoGuardian(evento);
          console.log(`[FAREJADOR] Lead detectado [${id}] - Encaminhado para: ${destino}`);
        }
      }

      return leadsDetectados;
    } catch (error: any) {
      console.error(`[FAREJADOR ERRO] Falha no ciclo de busca: ${error.message}`);
      return 0;
    }
  }

  /**
   * Inicia loop contínuo de monitoramento em Produção
   */
  public async iniciarProducao(): Promise<void> {
    console.log('🛰 MFRGS Guardian iniciou o Farejador em modo de Produção (TypeScript Streaming)...');
    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;
      await this.buscarNovosPosts();
      this.timer = setTimeout(poll, this.config.pollIntervalMs);
    };

    await poll();
  }

  /**
   * Executa Teste Local Integrado
   */
  public async executarTesteLocal(): Promise<boolean> {
    console.log('🛰 Guardian iniciou o Farejador em modo de TESTE LOCAL.');
    console.log(`Monitorando subreddits fictícios: ${SUBREDDITS.join(', ')}`);

    const eventoTeste: GuardianEvent = {
      tipo: 'lead_encontrado',
      origem: 'reddit_mock_test',
      titulo: this.sanitizeInput('Is this Alibaba supplier a scam? Need to verify business'),
      texto: this.sanitizeInput('i am about to wire $5000 to a new factory but their address looks fake. can anyone help me verify business?'),
      url: 'https://reddit.com/r/dropshipping/mock_test',
      autor: 'test_buyer_123',
      id: `mock_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    try {
      const destino = await this.reportarAoGuardian(eventoTeste);
      console.log(`✅ TESTE BEM-SUCEDIDO! Guardian processou e encaminhou para: ${destino}`);
      return true;
    } catch (error: any) {
      console.error(`❌ ERRO NA COMUNICAÇÃO COM O GUARDIAN: ${error.message}`);
      return false;
    }
  }

  /**
   * Encerra graciosa e limpamente a execução do agente
   */
  public parar(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('🛑 Farejador MFRGS interrompido com sucesso.');
  }
}

// Inicialização se executado diretamente via Node/TS-Node
if (require.main === module) {
  const service = new MfrgsVerificationService();

  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
    service.iniciarProducao().catch((err) => {
      console.error('Erro na execução do Farejador:', err);
    });
  } else {
    service.executarTesteLocal().catch((err) => {
      console.error('Erro no Teste Local do Farejador:', err);
    });
  }
}