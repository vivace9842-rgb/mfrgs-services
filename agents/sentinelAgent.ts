import { AgentCore } from './core';

export type MonitoredService = 'stripe' | 'webhook' | 'vercel' | 'supabase';

export interface MonitoringSnapshot {
  service: MonitoredService;
  healthy: boolean;
  checkedAt: string;
  reason?: string;
}

/**
 * Sentinel is the safety observer. It does not change business data and never
 * invents a recovery path. It records the latest health state so the
 * orchestrator can decide when a responsible agent must take over.
 */
export class SentinelAgent extends AgentCore {
  public readonly name = 'SentinelAgent';
  public readonly version = '1.0.0';

  private snapshots = new Map<MonitoredService, MonitoringSnapshot>();

  public async initialize(): Promise<void> {
    console.log(`[${this.name}] Monitoramento preventivo inicializado.`);
  }

  public async health(): Promise<boolean> {
    return true;
  }

  public async monitorService(service: MonitoredService, healthy: boolean, reason?: string): Promise<MonitoringSnapshot> {
    const snapshot: MonitoringSnapshot = {
      service,
      healthy,
      checkedAt: new Date().toISOString(),
      ...(reason ? { reason } : {}),
    };

    this.snapshots.set(service, snapshot);

    if (!healthy) {
      console.error(`[${this.name}] ALERTA: ${service} requer atenção.${reason ? ` ${reason}` : ''}`);
    }

    return snapshot;
  }

  public getSnapshot(service: MonitoredService): MonitoringSnapshot | null {
    return this.snapshots.get(service) ?? null;
  }

  public getSnapshots(): MonitoringSnapshot[] {
    return Array.from(this.snapshots.values());
  }
}

export const sentinelAgent = new SentinelAgent();
