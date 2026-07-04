const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Inicializa o Supabase usando as variáveis de ambiente
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ATENÇÃO: O endpoint do webhook precisa receber o body em formato Raw (Buffer) para validar a assinatura
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Valida se o evento realmente veio do Stripe e não foi forjado
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Erro na assinatura do Webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processa o evento de pagamento bem-sucedido
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // 1. Extrai os dados do cliente e da compra
        const customerEmail = session.customer_details.email;
        const customerName = session.customer_details.name || 'Cliente MFRGS';
        
        // Recupera metadados que você passará nos botões (ex: nome da empresa alvo e país)
        const { empresa_nome, empresa_pais, servico_nome } = session.metadata;

        console.log(`💰 Pagamento confirmado para o e-mail: ${customerEmail}`);

        try {
            // 2. Insere ou busca o cliente na tabela 'clientes' do Supabase
            let { data: cliente, error: clientError } = await supabase
                .from('clientes')
                .select('id')
                .eq('email', customerEmail)
                .single();

            if (!cliente) {
                const { data: newClient, error: insertClientError } = await supabase
                    .from('clientes')
                    .insert([{ nome: customerName, email: customerEmail, tipo_cliente: 'freelancer' }])
                    .select('id')
                    .single();
                
                if (insertClientError) throw insertClientError;
                cliente = newClient;
            }

            // 3. Cria o Caso na tabela 'casos' vinculando ao ID do cliente
            const { error: caseError } = await supabase
                .from('casos')
                .insert([{
                    cliente_id: cliente.id,
                    servico_solicitado: servico_nome || 'Freelancer & Client Trust Check',
                    status_caso: 'Triagem',
                    empresa_alvo_nome: empresa_nome || 'Pendente de Coleta',
                    empresa_alvo_pais: empresa_pais || 'UK'
                }]);

            if (caseError) throw caseError;

            console.log(`🚀 Caso registrado com sucesso no Supabase para ${empresa_nome}. Automação liberada.`);

        } catch (dbError) {
            console.error(`❌ Erro ao salvar dados no Supabase: ${dbError.message}`);
            return res.status(500).send('Database Error');
        }
    }

    // Responde ao Stripe que o evento foi recebido com sucesso
    res.json({ received: true });
});

module.exports = router;