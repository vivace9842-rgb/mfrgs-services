const stripeService = require('../../services/stripeService')
const logger = require('../../utils/logger')

module.exports = {
  async handlePaymentSuccess(invoice) {
    try {
      const inv = await stripeService.getInvoice(invoice.id)
      logger.info(`Pagamento confirmado: ${inv.id}`)
    } catch (error) {
      logger.error(`Erro ao processar pagamento: ${error.message}`)
      throw error
    }
  }
}
