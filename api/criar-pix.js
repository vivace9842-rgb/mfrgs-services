cat << 'EOF' > api/criar-pix.js
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Configura o Mercado Pago com o token que você vai salvar na Vercel
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(client);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, companyName, amount } = req.body;

    const body = {
      transaction_amount: Number(amount) || 39.00,
      description: `Relatório MFRGS: ${companyName}`,
      payment_method_id: 'pix',
      payer: {
        email: email,
      },
      // Salvamos os metadados para o webhook saber quem é a empresa depois
      metadata: {
        customer_email: email,
        company_name: companyName
      }
    };

    const response = await payment.create({ body });

    // Retorna os dados do Pix para o seu Frontend exibir na tela
    return res.status(200).json({
      id: response.id,
      qr_code: response.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
      status: response.status
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar o Pix', details: error.message });
  }
}
EOF