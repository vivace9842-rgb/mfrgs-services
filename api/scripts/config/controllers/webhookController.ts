import { webhookAgent } from '../agents/webhookAgent.js';
import { auditAgent } from '../agents/auditAgent.js';

export class WebhookController {
  /**
   * Endpoint POST /api/webhook/stripe
   * Processa notificações e eventos de webhook do Stripe.
   */
  public async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      await auditAgent.log('WEBHOOK_MISSING_SIGNATURE', 'WARN', {
        headers: req.headers,
      });

      res.status(400).json({
        success: false,
        error: 'Cabeçalho stripe-signature ausente.',
      });
      return;
    }

    try {
      // req.body deve conter o payload em formato Buffer/raw para validação de assinatura do Stripe
      const result = await webhookAgent.handleEvent(req.body, signature);

      await auditAgent.log(
        'WEBHOOK_PROCESSED_SUCCESS',
        'INFO',
        { eventType: result.eventType, eventId: result.eventId },
        'STRIPE_WEBHOOK',
        result.eventId
      );

      res.status(200).json({
        received: true,
        data: result,
      });
    } catch (error: any) {
      await auditAgent.log(
        'WEBHOOK_PROCESSING_FAILED',
        'ERROR',
        { error: error.message }
      );

      res.status(400).json({
        success: false,
        error: `Erro no processamento do Webhook: ${error.message}`,
      });
    }
  }
}

export const webhookController = new WebhookController();