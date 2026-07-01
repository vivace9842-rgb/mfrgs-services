const stripeService = require('../../services/stripeService')
const logger = require('../../utils/logger')

module.exports = {
  async handleCustomerCreated(customer) {
    try {
      const cust = await stripeService.getCustomer(customer.id)
      logger.info(`Cliente criado: ${cust.email}`)
    } catch (error) {
      logger.error(`Erro ao criar cliente: ${error.message}`)
      throw error
    }
  }
}
