import Stripe from "stripe";
import { Agent } from "./core.js";

export type WebhookEventHandler = (
  event: Stripe.Event
) => Promise<void>;

export class WebhookAgent implements Agent {
  public readonly name = "WebhookAgent";
  public readonly version = "1.0.0";

  private stripeClient: Stripe | null = null;
  private webhookSecret: string | null = null;

  private eventHandlers: Map<string, WebhookEventHandler[]> = new Map();

  public async initialize(): Promise<void> {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!apiKey) {
      throw new Error(
        `[${this.name}] Variável STRIPE_SECRET_KEY não definida.`
      );
    }

    if (!webhookSecret) {
      throw new Error(
        `[${this.name}] Variável STRIPE_WEBHOOK_SECRET não definida.`
      );
    }

    this.stripeClient = new Stripe(apiKey, {
      apiVersion: "2023-10-16",
    });

    this.webhookSecret = webhookSecret;
  }

  public async health(): Promise<boolean> {
    return this.stripeClient !== null && this.webhookSecret !== null;
  }

  /**
   * Registra um callback para tratar um tipo de evento específico do Stripe.
   */
  public subscribe(
    eventType: string,
    handler: WebhookEventHandler
  ): void {
    const handlers = this.eventHandlers.get(eventType) || [];

    handlers.push(handler);

    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Valida a assinatura do webhook Stripe e reconstrói o objeto de evento.
   */
  public constructEvent(
    rawBody: string | Buffer,
    signature: string
  ): Stripe.Event {
    if (!this.stripeClient || !this.webhookSecret) {
      throw new Error(
        `[${this.name}] Agente de Webhook não está devidamente inicializado.`
      );
    }

    if (!signature) {
      throw new Error(
        `[${this.name}] Assinatura do Stripe (stripe-signature) ausente no cabeçalho.`
      );
    }

    return this.stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret
    );
  }

  /**
   * Executa os manipuladores registrados para o evento recebido.
   */
  public async handleEvent(event: Stripe.Event): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];

    if (handlers.length === 0) {
      console.log(
        `[${this.name}] Nenhum handler registrado para o evento: ${event.type}`
      );
      return;
    }

    console.log(
      `[${this.name}] Processando evento '${event.type}' com ${handlers.length} handler(s)...`
    );

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[${this.name}] Erro ao executar handler para o evento '${event.type}':`,
          error
        );

        throw error;
      }
    }
  }
}

export const webhookAgent = new WebhookAgent();