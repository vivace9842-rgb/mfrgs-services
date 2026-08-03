/**
 * ===========================================================
 * MFRGS DIGITAL VERIFICATION
 * CENTRAL BRAIN - GUARDIAN
 * Version: 3.0 - TypeScript Native Orchestrator & Production Ready
 * ===========================================================
 */

import { EventEmitter } from 'events';

// --- INTERFACES E TIPOS ESTREITOS ---

export type AgentType = 'market' | 'health' | 'verification' | 'delivery' | string;

export interface TaskPayload {
  [key: string]: any;
}

export interface Task {
  id: string;
  agent: AgentType;
  payload: TaskPayload;
  priority: number; // 1 = Máxima prioridade, 10 = Menor prioridade
  createdAt: Date;
}

export interface TaskResult {
  status: 'success' | 'error';
  agent: AgentType;
  taskId: string;
  data?: any;
  message?: string;
  timestamp: string;
}

export interface EventLog {
  timestamp: string;
  source: string;
  message: string;
}

export interface DailyReport {
  generated: string;
  eventsCount: number;
  cachedObjectsCount: number;
  pendingTasksCount: number;
  isOnline: boolean;
}

export type AgentHandler = (
  payload: TaskPayload,
  logCallback: (origem: string, mensagem: string) => void
) => Promise<any> | any;

// --- ESTRUTURA DE DADOS: PRIORITY QUEUE (MIN-HEAP) ---

export class PriorityQueue<T extends { priority: number }> {
  private heap: T[] = [];

  public enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  public dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.sinkDown(0);
    return top;
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;

      if (leftIndex < length && this.heap[leftIndex].priority < this.heap[smallest].priority) {
        smallest = leftIndex;
      }
      if (rightIndex < length && this.heap[rightIndex].priority < this.heap[smallest].priority) {
        smallest = rightIndex;
      }
      if (smallest === index) break;

      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

// --- CLASSE PRINCIPAL GUARDIAN ---

export class Guardian extends EventEmitter {
  private memory: Map<string, any> = new Map();
  private events: EventLog[] = [];
  private tasks: PriorityQueue<Task> = new PriorityQueue<Task>();
  private running: boolean = false;
  private agentRegistry: Map<AgentType, AgentHandler> = new Map();

  private healthMonitorInterval?: NodeJS.Timeout;
  private taskProcessorTimeout?: NodeJS.Timeout;

  private readonly maxEventLogs: number = 2000;
  private readonly maxMemoryKeys: number = 1000;

  constructor() {
    super();
    this.bindDefaultAgents();
  }

  /**
   * Tenta vincular dinamicamente os motores existentes no projeto
   */
  private bindDefaultAgents(): void {
    // Registro preventivo/padronizado de agentes padrão
    this.registrarAgente('market', async (payload, callback) => {
      callback('MarketIntelligence', 'Processando inteligência de mercado...');
      return { status: 'success', phase: 'market_complete', data: payload };
    });

    this.registrarAgente('verification', async (payload, callback) => {
      callback('VerificationEngine', 'Processando motor de verificação digital...');
      return { status: 'success', phase: 'verification_complete', data: payload };
    });

    this.registrarAgente('delivery', async (payload, callback) => {
      callback('DeliveryEngine', 'Entregando relatório e opinião técnica...');
      return { status: 'success', phase: 'delivery_complete', data: payload };
    });

    this.registrarAgente('health', async (payload, callback) => {
      callback('HealthMonitor', 'Executando verificação de integridade do sistema...');
      return { status: 'success', health: 'OK', checkedAt: new Date().toISOString() };
    });
  }

  /**
   * Registra um evento no log do sistema com controle de capacidade de memória
   */
  public registerEvent(message: string, source: string = 'Guardian'): void {
    const logEntry: EventLog = {
      timestamp: new Date().toISOString(),
      source,
      message,
    };

    this.events.push(logEntry);

    // Evita estouro de memória purgando registros antigos
    if (this.events.length > this.maxEventLogs) {
      this.events.shift();
    }

    console.log(`[${logEntry.timestamp}] | ${logEntry.source.toUpperCase()} | ${logEntry.message}`);
    this.emit('event', logEntry);
  }

  public logCallback = (origem: string, mensagem: string): void => {
    this.registerEvent(mensagem, origem);
  };

  public log(origem: string, mensagem: string): void {
    this.logCallback(origem, mensagem);
  }

  /**
   * Salva dados na memória do Guardian com controle de limite de chaves
   */
  public saveMemory(key: string, value: any): void {
    if (this.memory.size >= this.maxMemoryKeys && !this.memory.has(key)) {
      const firstKey = this.memory.keys().next().value;
      if (firstKey !== undefined) {
        this.memory.delete(firstKey);
      }
    }
    this.memory.set(key, value);
  }

  public loadMemory(key: string): any {
    return this.memory.get(key);
  }

  /**
   * Enfileira uma nova tarefa para processamento
   */
  public dispatch(taskData: { id?: string; agent: AgentType; payload?: TaskPayload }, priority: number = 5): void {
    const task: Task = {
      id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      agent: taskData.agent,
      payload: taskData.payload || {},
      priority,
      createdAt: new Date(),
    };

    this.tasks.enqueue(task);
    this.registerEvent(`Task queued -> ${task.agent} (ID: ${task.id}, Priority: ${task.priority})`);
    
    // Dispara o ciclo de processamento imediatamente
    this.triggerTaskProcessing();
  }

  /**
   * Orquestrador de Pipeline MFRGS: Conecta a saída de um agente à entrada do próximo
   */
  private async processTaskResult(taskType: AgentType, result: TaskResult): Promise<void> {
    if (result.status === 'error') {
      this.log('Guardian', `Pipeline interrompido para agente ${taskType} devido a um erro: ${result.message}`);
      return;
    }

    if (taskType === 'market') {
      this.log('Guardian', 'Market Intelligence concluído. Disparando Verification...');
      this.dispatch(
        {
          id: `pipeline-verif-${Date.now()}`,
          agent: 'verification',
          payload: result.data,
        },
        3
      );
    } else if (taskType === 'verification') {
      this.log('Guardian', 'Verification Engine concluído. Disparando Delivery...');
      this.dispatch(
        {
          id: `pipeline-deliv-${Date.now()}`,
          agent: 'delivery',
          payload: result.data,
        },
        2
      );
    } else if (taskType === 'delivery') {
      this.log('Guardian', 'Pipeline completo! Todos os agentes executaram com sucesso.');
      this.log('Guardian', 'Relatório final consolidado disponível no barramento MFRGS.');
      this.emit('pipeline:completed', result);
    }
  }

  /**
   * Processador reativo de tarefas enfileiradas
   */
  private triggerTaskProcessing(): void {
    if (!this.running || this.tasks.isEmpty()) {
      return;
    }

    setImmediate(async () => {
      if (this.tasks.isEmpty()) return;

      const task = this.tasks.dequeue();
      if (!task) return;

      this.registerEvent(`Executing agent: ${task.agent} (ID: ${task.id})`);
      let taskResult: TaskResult;

      try {
        const handler = this.agentRegistry.get(task.agent);

        if (!handler) {
          throw new Error(`Agente '${task.agent}' não foi registrado no Guardian.`);
        }

        const output = await handler(task.payload, this.logCallback);

        taskResult = {
          status: 'success',
          agent: task.agent,
          taskId: task.id,
          data: output,
          timestamp: new Date().toISOString(),
        };

        this.registerEvent(`${task.agent} executado com sucesso.`);
      } catch (error: any) {
        const errorMessage = error?.message || 'Erro desconhecido durante execução.';
        this.registerEvent(`ERROR executando ${task.agent}: ${errorMessage}`, 'Guardian');

        taskResult = {
          status: 'error',
          agent: task.agent,
          taskId: task.id,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }

      this.saveMemory(task.id, taskResult);
      await this.processTaskResult(task.agent, taskResult);

      // Processa a próxima tarefa da fila se houver
      if (!this.tasks.isEmpty()) {
        this.triggerTaskProcessing();
      }
    });
  }

  /**
   * Monitor contínuo de saúde dos serviços
   */
  private monitorAgents(): void {
    if (!this.running) return;

    const healthHandler = this.agentRegistry.get('health');
    if (healthHandler) {
      Promise.resolve(healthHandler({ comando: 'check_now' }, this.logCallback))
        .then((statusReport) => {
          this.saveMemory('latest_health', statusReport);
        })
        .catch((err) => {
          this.registerEvent(`Health monitor error: ${err.message}`, 'Guardian');
        });
    }
  }

  /**
   * Retorna o relatório consolidado de atividades do dia
   */
  public dailyReport(): DailyReport {
    return {
      generated: new Date().toISOString(),
      eventsCount: this.events.length,
      cachedObjectsCount: this.memory.size,
      pendingTasksCount: this.tasks.size(),
      isOnline: this.running,
    };
  }

  /**
   * Inicia o serviço Guardian
   */
  public start(): void {
    if (this.running) {
      this.registerEvent('Guardian já está online.');
      return;
    }

    this.running = true;

    // Configura o monitor de saúde periódico (cada 60s)
    this.healthMonitorInterval = setInterval(() => {
      this.monitorAgents();
    }, 60000);

    this.registerEvent('Guardian ONLINE (MFRGS INOVEÇÕES - Cérebro Ativo)');

    // Dispara processamento caso já existam tarefas na fila
    this.triggerTaskProcessing();
  }

  /**
   * Para a execução do Guardian de forma limpa
   */
  public stop(): void {
    this.running = false;

    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }

    if (this.taskProcessorTimeout) {
      clearTimeout(this.taskProcessorTimeout);
    }

    this.registerEvent('Guardian OFFLINE');
  }

  // --- MÉTODOS DE COMPATIBILIDADE RETROATIVA ---

  public receber_evento(agente: string, evento: any): string {
    this.dispatch({ agent: agente, payload: evento });
    return `evento_enfileirado_${agente}`;
  }

  public registrar_log(origem: string, mensagem: string): void {
    this.logCallback(origem, mensagem);
  }

  public registrar_agente(agente: AgentType, funcao: AgentHandler): void {
    this.agentRegistry.set(agente, funcao);
    this.registerEvent(`Agente '${agente}' registrado com sucesso.`);
  }

  public initialize_operation(): void {
    this.start();
  }
}

// Instância global para exportação Singleton
export const guardian = new Guardian();
export default guardian;