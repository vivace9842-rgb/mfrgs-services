import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Agent } from './core';

export class SupabaseAgent implements Agent {
  public readonly name = 'SupabaseAgent';
  public readonly version = '1.0.0';

  private client: SupabaseClient | null = null;

  public async initialize(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`[${this.name}] Variáveis SUPABASE_URL e/ou SUPABASE_KEY não foram definidas.`);
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    console.log(`[${this.name}] Cliente Supabase inicializado com sucesso.`);
  }

  public async health(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Teste simples de leitura para verificar a conexão com o banco
      const { error } = await this.client.from('verifications').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error(`[${this.name}] Falha no health check:`, error);
      return false;
    }
  }

  /**
   * Retorna a instância ativa do cliente Supabase.
   */
  public getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(`[${this.name}] Agente Supabase não foi inicializado.`);
    }
    return this.client;
  }

  /**
   * Salva um novo registro na tabela de verificações.
   */
  public async saveVerification(data: Record<string, unknown>): Promise<unknown> {
    const client = this.getClient();
    const { data: result, error } = await client.from('verifications').insert([data]).select().single();

    if (error) {
      console.error(`[${this.name}] Erro ao salvar verificação:`, error);
      throw error;
    }

    return result;
  }

  /**
   * Busca uma verificação pelo ID.
   */
  public async getVerificationById(id: string): Promise<unknown | null> {
    const client = this.getClient();
    const { data, error } = await client.from('verifications').select('*').eq('id', id).maybeSingle();

    if (error) {
      console.error(`[${this.name}] Erro ao buscar verificação por ID (${id}):`, error);
      throw error;
    }

    return data;
  }
}

export const supabaseAgent = new SupabaseAgent();