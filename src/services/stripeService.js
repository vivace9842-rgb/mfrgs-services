const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const logger = require('../utils/logger')

module.exports = {
  async getSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      logger.stripe(`Sessão carregada: ${sessionId}`)
      return session
    } catch (error) {
      logger.error(`Erro ao buscar sessão ${sessionId}: ${error.message}`)
      throw error
    }
  },

  async getCustomer(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      logger.stripe(`Cliente carregado: ${customerId}`)
      return customer
    } catch (error) {
      logger.error(`Erro ao buscar cliente ${customerId}: ${error.message}`)
      throw error
    }
  },

  async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      logger.stripe(`Assinatura carregada: ${subscriptionId}`)
      return subscription
    } catch (error) {
      logger.error(`Erro ao buscar assinatura ${subscriptionId}: ${error.message}`)
      throw error
    }
  },

  async getInvoice(invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId)
      logger.stripe(`Fatura carregada: ${invoiceId}`)
      return invoice
    } catch (error) {
      logger.error(`Erro ao buscar fatura ${invoiceId}: ${error.message}`)
      throw error
    }
  }
}
