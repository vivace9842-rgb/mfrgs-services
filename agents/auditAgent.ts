import { Agent } from './core';

export type AuditSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AuditLogEntry {
  id?: string;
  action: string;
  severity: AuditSeverity;
  actorId?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  timestamp: Date;
}

export class AuditAgent implements Agent {
  public readonly name = 'AuditAgent';
  public readonly version = '1.0.0';

  private logsInMemory: AuditLogEntry[] = [];
  private readonly maxInMemoryLogs = 500;

  public async initialize(): Promise<void> {
    console.log(`[${this.name}] Sistema de auditoria e telemetria pronto.`);
  }

  public async health(): Promise<boolean> {
    return true;
  }

  /**
   * Registra um evento de auditoria no sistema.
   */
  public async log(
    action: string,
    severity: AuditSeverity = 'INFO',
    payload?: Record<string, unknown>,
    actorId?: string,
    resourceId?: string
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      severity,
      actorId,
      resourceId,
      payload,
      timestamp: new Date(),
    };

    // Armazena no buffer em memória mantendo o limite
    this.logsInMemory.push(entry);
    if (this.logsInMemory.length > this.maxInMemoryLogs) {
      this.logsInMemory.shift();
    }

    const formattedLog = `[AUDIT][${entry.severity}] ${entry.action} | Actor: ${entry.actorId || 'SYSTEM'} | Resource: ${entry.resourceId || 'N/A'}`;

    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(formattedLog, payload || '');
    } else if (severity === 'WARN') {
      console.warn(formattedLog, payload || '');
    } else {
      console.log(formattedLog);
    }

    return entry;
  }

  /**
   * Retorna o histórico recente de logs retidos em memória.
   */
  public getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return this.logsInMemory.slice(-limit);
  }
}

export const auditAgent = new AuditAgent();