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

console.log(`✅ ORDER REGISTRADO: ${customerEmail} | Empresa: ${companyQuery}`);


// 2. Registra empresa verificada
const { data: companyData, error: companyError } = await supabase
  .from('companies')
  .insert({
    name: companyQuery,
    email: customerEmail,
    status: 'payment_received'
  })
  .select()
  .single();


if (companyError) {
  console.error('❌ Erro companies:', companyError.message);
}


// 3. Cria dossiê pendente
if (companyData) {

  const { error: dossierError } = await supabase
    .from('dossiers')
    .insert({
      status_emissao: 'aguardando_processamento',
      parecer_tecnico:
        `Pagamento confirmado para ${companyQuery}. Relatório em processamento.`
    });


  if (dossierError) {
    console.error('❌ Erro dossiers:', dossierError.message);
  }

}
