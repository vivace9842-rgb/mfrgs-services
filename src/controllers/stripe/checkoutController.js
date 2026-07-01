module.exports = {
  async handleSessionCompleted(session) {
    try {
      console.log('Checkout finalizado:', session.id)

      // Exemplo: salvar no banco
      // await Order.create({
      //   customerId: session.customer,
      //   amount: session.amount_total,
      //   status: 'paid'
      // })

    } catch (error) {
      console.error('Erro no checkoutController:', error)
    }
  }
}
