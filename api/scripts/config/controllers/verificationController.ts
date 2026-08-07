import { verificationAgent } from '../agents/verificationAgent.js';
import { supabaseAgent } from '../agents/supabaseAgent.js';
import { auditAgent } from '../agents/auditAgent.js';

export class VerificationController {
  /**
   * Endpoint POST /api/verify/company
   * Dispara o fluxo completo de verificação de uma empresa.
   */
  public async verifyCompany(req: Request, res: Response): Promise<void> {
    try {
      const { companyNumber, customerEmail } = req.body;

      if (!companyNumber) {
        res.status(400).json({
          success: false,
          error: 'O número da empresa (companyNumber) é obrigatório.',
        });
        return;
      }

      const result = await verificationAgent.processVerification(
        companyNumber,
        customerEmail
      );

      await auditAgent.log(
        'VERIFICATION_REQUESTED',
        'INFO',
        { companyNumber, customerEmail },
        customerEmail || 'ANONYMOUS',
        companyNumber
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      await auditAgent.log(
        'VERIFICATION_REQUEST_FAILED',
        'ERROR',
        { error: error.message, body: req.body }
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao processar verificação.',
      });
    }
  }

  /**
   * Endpoint GET /api/verify/:id
   * Busca os detalhes de uma verificação realizada previamente.
   */
  public async getVerificationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'O ID da verificação é obrigatório.',
        });
        return;
      }

      const record = await supabaseAgent.getVerificationById(id);

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Verificação não encontrada.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      await auditAgent.log(
        'GET_VERIFICATION_BY_ID_FAILED',
        'ERROR',
        { error: error.message, params: req.params }
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno ao buscar registro de verificação.',
      });
    }
  }
}

export const verificationController = new VerificationController();