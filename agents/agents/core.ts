export interface Agent {
  readonly name: string;
  readonly version: string;

  initialize(): Promise<void>;

  health(): Promise<boolean>;
}

export class AgentCore {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent ${agent.name} já registrado.`);
    }

    this.agents.set(agent.name, agent);
  }

  async initialize(): Promise<void> {
    for (const agent of this.agents.values()) {
      console.log(`[CORE] Inicializando ${agent.name}...`);
      await agent.initialize();
      console.log(`[CORE] ${agent.name} OK`);
    }
  }

  async health(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const agent of this.agents.values()) {
      status[agent.name] = await agent.health();
    }

    return status;
  }
}

export const agentCore = new AgentCore();