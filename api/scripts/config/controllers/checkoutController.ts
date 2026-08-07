import { checkoutAgent } from '../agents/checkoutAgent.js';
import { sentinelAgent } from '../agents/sentinelAgent.js';
import { auditAgent } from '../agents/auditAgent.js';

export class CheckoutController {
  /**
   * Processa a criação de uma sessão de Checkout do Stripe.
   */
  public async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lineItems, customerEmail, clientReferenceId, metadata } = req.body;

      // Validação de Payload da camada HTTP
      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        res.status(400).json({
          success: false,
          error: 'É necessário fornecer ao menos um item válido em lineItems.',
        });
        return;
      }

      // Verificação Anti-Duplicidade (Sentinel)
      const lockKey = `checkout_${customerEmail || 'anon'}_${sentinelAgent.generateHash(lineItems)}`;
      if (sentinelAgent.isDuplicate(lockKey, { ttlMs: 30000 })) {
        res.status(409).json({
          success: false,
          error: 'Uma requisição de checkout idêntica já está em processamento. Por favor, aguarde.',
        });
        return;
      }

      // Registro de intenção na auditoria
      await auditAgent.log(
        'CHECKOUT_SESSION_INITIATED',
        'INFO',
        { customerEmail, itemCount: lineItems.length },
        customerEmail || 'anonymous',
        clientReferenceId
      );

      // Delegação para o CheckoutAgent
      const session = await checkoutAgent.createSession({
        lineItems,
        customerEmail,
        clientReferenceId,
        metadata,
        successUrl: process.env.STRIPE_SUCCESS_URL || 'https://mfrgs.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: process.env.STRIPE_CANCEL_URL || 'https://mfrgs.com/checkout/cancel',
      });

      // Resposta ao cliente
      res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } catch (error) {
      // Libera o bloqueio em caso de falha durante a execução
      if (req.body?.customerEmail) {
        const lockKey = `checkout_${req.body.customerEmail}_${sentinelAgent.generateHash(req.body.lineItems || {})}`;
        sentinelAgent.releaseLock(lockKey);
      }

      await auditAgent.log('CHECKOUT_SESSION_FAILED', 'ERROR', {
        error: error instanceof Error ? error.message : String(error),
      });

      next(error);
    }
  }

  /**
   * Obtém os detalhes de uma sessão existente por ID.
   */
  public async getSessionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'O ID da sessão de checkout é obrigatório.',
        });
        return;
      }

      const session = await checkoutAgent.getSession(sessionId);

      res.status(200).json({
        success: true,
        data: {
          id: session.id,
          paymentStatus: session.payment_status,
          status: session.status,
          customerEmail: session.customer_details?.email || session.customer_email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const checkoutController = new CheckoutController();