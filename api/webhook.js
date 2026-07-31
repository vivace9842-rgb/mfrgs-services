// 1. Registra pedido pago corretamente
const { error: orderError } = await supabase
  .from('orders')
  .insert({
    email: customerEmail,
    amount: amountTotal,
    status: 'approved',
    session_id: session.id,
    gateway: 'stripe',
    stripe_id: session.id,
    currency: session.currency || 'usd',
    metadata: {
      company: companyQuery,
      customer_name: customerName,
      stripe_session: session.id
    }
  });

if (orderError) {
  console.error('❌ Erro orders:', orderError.message);
}
