export interface Agent {
  name: string;
  version: string;
  initialize(): Promise<void>;
  health(): Promise<boolean>;

  /** Safe, repeatable preventive check. Must not mutate business data. */
  monitor?(): Promise<boolean>;

  /** Bounded contingency hook; returns false when no safe fallback exists. */
  contingency?(reason: string): Promise<boolean>;
}

export type AgentStatus = {
  name: string;
  version: string;
  healthy: boolean;
  monitored: boolean;
  timestamp: string;
};

export abstract class AgentCore implements Agent {
  abstract readonly name: string;
  abstract readonly version: string;

  abstract initialize(): Promise<void>;
  abstract health(): Promise<boolean>;

  public async monitor(): Promise<boolean> {
    return this.health();
  }

  public async contingency(_reason: string): Promise<boolean> {
    return false;
  }

  public async status(): Promise<AgentStatus> {
    const healthy = await this.health();
    return {
      name: this.name,
      version: this.version,
      healthy,
      monitored: true,
      timestamp: new Date().toISOString(),
    };
  }
}
