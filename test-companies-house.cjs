require('dotenv').config(); 

// Se você não tiver colocado no arquivo .env ainda, mude "SUA_API_KEY_AQUI" abaixo para a sua chave real
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY || "SUA_API_KEY_AQUI";

async function obterDadosEmpresa(companyNumber) {
    const credentials = Buffer.from(`${API_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}`;
    
    console.log(`🔍 [MFRGS] Buscando dados para o CRN: ${companyNumber}...`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Basic ${credentials}`, 
                'Accept': 'application/json' 
            }
        });
        
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ Erro na consulta:`, error.message);
        return null;
    }
}

async function executarTeste() {
    const CRN_TESTE = "08804411"; // Revolut Ltd
    console.log("\n==========================================");
    console.log("=== INICIANDO TESTE DE INTEGRAÇÃO MFRGS ===");
    console.log("==========================================\n");
    
    const dados = await obterDadosEmpresa(CRN_TESTE);
    if (dados) {
        console.log(`🟢 [SUCESSO] Empresa: ${dados.company_name}`);
        console.log(`🟢 Status Legal: ${dados.company_status.toUpperCase()}`);
        console.log(`🛡️ Timestamp da Consulta: ${new Date().toISOString()}`);
    } else {
        console.log("\n🔴 [FALHA] Sem resposta da API. Verifique se colocou sua chave no .env ou no código.");
    }
    console.log("==========================================\n");
}

executarTeste();
