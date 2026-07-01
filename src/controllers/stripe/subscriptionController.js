const stripeService = require('../../services/stripeService')
const logger = require('../../utils/logger')

module.exports = {
  async handleSubscriptionCreated(subscription) {
    try {
      const sub = await stripeService.getSubscription(subscription.id)
      logger.info(`Assinatura criada: ${sub.id}`)
    } catch (error) {
      logger.error(`Erro ao criar assinatura: ${error.message}`)
      throw error
    }
  },

  async handleSubscriptionCanceled(subscription) {
    try {
      const sub = await stripeService.getSubscription(subscription.id)
      logger.info(`Assinatura cancelada: ${sub.id}`)
    } catch (error) {
      logger.error(`Erro ao cancelar assinatura: ${error.message}`)
      throw error
    }
  }
}
