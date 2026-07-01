const express = require('express')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const logger = require('../utils/logger')

// Controllers
const checkoutController = require('../controllers/stripe/checkoutController')
const subscriptionController = require('../controllers/stripe/subscriptionController')
const invoiceController = require('../controllers/stripe/invoiceController')
const customerController = require('../controllers/stripe/customerController')

// Webhook Stripe (raw body)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature']
    let event

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      logger.stripe(`Evento recebido: ${event.type}`)
    } catch (err) {
      logger.error(`Erro no webhook: ${err.message}`)
      return res.status(400).send(`Webhook error: ${err.message}`)
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await checkoutController.handleSessionCompleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await invoiceController.handlePaymentSuccess(event.data.object)
        break

      case 'customer.subscription.created':
        await subscriptionController.handleSubscriptionCreated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await subscriptionController.handleSubscriptionCanceled(event.data.object)
        break

      case 'customer.created':
        await customerController.handleCustomerCreated(event.data.object)
        break

      default:
        logger.stripe(`Evento não tratado: ${event.type}`)
    }

    res.status(200).send('OK')
  }
)

module.exports = router
