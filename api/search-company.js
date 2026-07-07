// api/search-company.js

export default async function handler(req, res) {
  // Trata erros de método: nossa busca só aceita requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { document } = req.query;

  // Validação estrita contra campos vazios ou formatos inválidos na entrada
  if (!document) {
    return res.status(400).json({ error: 'O parâmetro document é obrigatório.' });
  }

  const cleanDoc = document.replace(/\D/g, '');
  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    return res.status(400).json({ error: 'Documento inválido. Envie 11 dígitos para CPF ou 14 para CNPJ.' });
  }

  try {
    // Mock estruturado simulando o comportamento exato das fontes públicas
    let responseData = {
      name: "EMPRESA EXEMPLO DA MFRGS LTDA",
      country: "Brasil",
      status: "Regular / Ativa",
      registrationDate: "10/05/2019"
    };

    // Diferenciação inteligente para testes com CPF
    if (cleanDoc.length === 11) {
      responseData.name = "GILBERTO SANTOS (CONSULTA CPF)";
      responseData.status = "CPF Regular";
      responseData.registrationDate = "Cadastro Ativo";
    }

    // Retorno limpo e padronizado
    return res.status(200).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao processar a busca inteligente.' });
  }
}