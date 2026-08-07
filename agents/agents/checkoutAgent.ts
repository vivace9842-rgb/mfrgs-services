import Stripe from 'stripe';
import { Agent } from './core';

export interface CreateCheckoutSessionOptions {
  customerEmail?: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  successUrl: string;
  cancelUrl: string;
  clientReferenceId?: string;
  metadata?: Record<string, string>;
}

export class CheckoutAgent implements Agent {
  public readonly name = 'CheckoutAgent';
  public readonly version = '1.0.0';

  private stripeClient: Stripe | null = null;

  public async initialize(): Promise<void> {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error(`[${this.name}] Variável de ambiente STRIPE_SECRET_KEY não definida.`);
    }

    this.stripeClient = new Stripe(apiKey, {
      apiVersion: '2023-10-16', // Ajustado para versão estável compatível com Node 20
    });
  }

  public async health(): Promise<boolean> {
    if (!this.stripeClient) {
      return false;
    }

    try {
      // Faz uma chamada leve à API da Stripe para confirmar a chave e a conectividade
      await this.stripeClient.balance.retrieve();
      return true;
    } catch (error) {
      console.error(`[${this.name}] Falha na verificação de saúde:`, error);
      return false;
    }
  }

  /**
   * Cria uma sessão de Checkout na Stripe com validações e metadata padronizadas.
   */
  public async createSession(options: CreateCheckoutSessionOptions): Promise<Stripe.Checkout.Session> {
    if (!this.stripeClient) {
      throw new Error(`[${this.name}] Agente não inicializado. Verifique as chaves da Stripe.`);
    }

    if (!options.lineItems || options.lineItems.length === 0) {
      throw new Error(`[${this.name}] A sessão de Checkout exige pelo menos um item (lineItems).`);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: options.lineItems,
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      ...(options.customerEmail && { customer_email: options.customerEmail }),
      ...(options.clientReferenceId && { client_reference_id: options.clientReferenceId }),
      metadata: options.metadata || {},
    };

    return await this.stripeClient.checkout.sessions.create(sessionParams);
  }

  /**
   * Recupera os detalhes de uma sessão existente por ID.
   */
  public async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.stripeClient) {
      throw new Error(`[${this.name}] Agente não inicializado.`);
    }

    if (!sessionId) {
      throw new Error(`[${this.name}] ID da sessão não informado.`);
    }

    return await this.stripeClient.checkout.sessions.retrieve(sessionId);
  }
}

export const checkoutAgent = new CheckoutAgent();