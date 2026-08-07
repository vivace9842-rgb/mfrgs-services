import { createHash } from 'crypto';
import { Agent } from './core';

export interface DeduplicationOptions {
  ttlMs?: number; // Tempo de vida do bloqueio em milissegundos (padrão: 5 minutos)
}

export class SentinelAgent implements Agent {
  public readonly name = 'SentinelAgent';
  public readonly version = '1.0.0';

  private readonly activeLocks = new Map<string, number>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutos

  public async initialize(): Promise<void> {
    console.log(`[${this.name}] Sistema Anti-Duplicidade (Sentinel) ativado.`);
  }

  public async health(): Promise<boolean> {
    return true;
  }

  /**
   * Gera um hash único a partir de um objeto/payload de entrada.
   */
  public generateHash(data: unknown): string {
    const jsonString = JSON.stringify(data);
    return createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Verifica se a operação dada chave/hash já está sendo processada ou executada recentemente.
   * Retorna true se a operação FOR duplicada (já existir bloqueio ativo).
   */
  public isDuplicate(key: string, options?: DeduplicationOptions): boolean {
    this.cleanExpiredLocks();

    const now = Date.now();
    const lockExpiry = this.activeLocks.get(key);

    if (lockExpiry && lockExpiry > now) {
      console.warn(`[${this.name}] Operação duplicada detectada para chave: ${key}`);
      return true;
    }

    const ttl = options?.ttlMs || this.defaultTtl;
    this.activeLocks.set(key, now + ttl);
    return false;
  }

  /**
   * Libera manualmente uma chave de bloqueio.
   */
  public releaseLock(key: string): void {
    this.activeLocks.delete(key);
  }

  /**
   * Remove chaves de bloqueio que já expiraram.
   */
  private cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, expiry] of this.activeLocks.entries()) {
      if (expiry <= now) {
        this.activeLocks.delete(key);
      }
    }
  }
}

export const sentinelAgent = new SentinelAgent();