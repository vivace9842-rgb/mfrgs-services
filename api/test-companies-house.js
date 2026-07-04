// test-companies-house.js
require('dotenv').config(); // Carrega suas variáveis de ambiente do arquivo .env

// Insira uma chave de teste temporária se não tiver o .env configurado ainda
const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY || "SUA_API_KEY_AQUI";

/**
 * Função para buscar os dados cadastrais básicos de uma empresa pelo CRN (Company Registration Number)
 */
async function obterDadosEmpresa(companyNumber) {
    // A Companies House exige codificação em Base64 da API Key para o cabeçalho Authorization
    const credentials = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}`;

    console.log(`🔍 [MFRGS] Buscando dados cadastrais para o CRN: ${companyNumber}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na API Companies House: Status ${response.status} (${response.statusText})`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error(`❌ Erro ao consultar dados da empresa:`, error.message);
        return null;
    }
}

/**
 * Função para buscar os Oficiais/Diretores ativos da empresa (essencial para o nosso relatório)
 */
async function obterDiretoresEmpresa(companyNumber) {
    const credentials = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`;

    console.log(`🔍 [MFRGS] Buscando lista de diretores para o CRN: ${companyNumber}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar diretores: Status ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];

    } catch (error) {
        console.error(`❌ Erro ao consultar diretores:`, error.message);
        return [];
    }
}

// ==========================================
// EXECUÇÃO DO TESTE COM UMA EMPRESA REAL
// ==========================================
async function executarTeste() {
    // Usando o número de registro de uma empresa real e super conhecida no Reino Unido para o teste:
    // REVOLUT LTD -> CRN: 08804411
    const CRN_TESTE = "08804411"; 

    console.log("=== INICIANDO TESTE DE INTEGRAÇÃO MFRGS ===");
    
    // 1. Executa a busca cadastral
    const dadosCadastrais = await obterDadosEmpresa(CRN_TESTE);
    
    if (dadosCadastrais) {
        console.log("\n🟢 [SUCESSO] Dados Cadastrais Retornados:");
        console.log(`--------------------------------------------------`);
        console.log(`Nome Fantasia/Razão: ${dadosCadastrais.company_name}`);
        console.log(`Status Legal:       ${dadosCadastrais.company_status.toUpperCase()}`);
        console.log(`Data de Criação:    ${dadosCadastrais.date_of_creation}`);
        console.log(`Endereço Registrado: ${dadosCadastrais.registered_office_address?.address_line_1}, ${dadosCadastrais.registered_office_address?.locality}, ${dadosCadastrais.registered_office_address?.postal_code}`);
        console.log(`Tipo de Empresa:     ${dadosCadastrais.type}`);
        console.log(`--------------------------------------------------`);

        // 2. Executa a busca de diretores se o cadastro passou
        const diretores = await obterDiretoresEmpresa(CRN_TESTE);
        console.log(`\n🟢 [SUCESSO] Oficiais/Diretores Encontrados (${diretores.length}):`);
        
        diretores.slice(0, 3).forEach((diretor, index) => {
            console.log(`  [${index + 1}] Nome: ${diretor.name} | Cargo: ${diretor.officer_role} | Status: ${diretor.resigned_on ? '❌ Resignado' : '✅ Ativo'}`);
        });
        
        if (diretores.length > 3) console.log(`  ... e mais ${diretores.length - 3} oficiais registrados.`);

        console.log(`\n?? [CADEIA DE CUSTÓDIA]`);
        console.log(`Timestamp de Origem MFRGS: ${new Date().toISOString()}`);
        console.log(`Fonte de Origem Legítima:  Companies House API (Crown copyright)`);
        console.log("==========================================");

    } else {
        console.log("\n🔴 [FALHA] Não foi possível mapear a empresa de testes. Verifique sua API Key.");
    }
}

executarTeste();
// test-companies-house.js
require('dotenv').config(); 

// Se você já tem a chave no seu .env, ele vai puxar automático. 
// Se não tiver, pode colar sua chave direto entre as aspas abaixo:
const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY || "SUA_API_KEY_AQUI";

async function obterDadosEmpresa(companyNumber) {
    const credentials = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}`;

    console.log(`🔍 [MFRGS] Buscando dados cadastrais para o CRN: ${companyNumber}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na API: Status ${response.status} (${response.statusText})`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Erro ao consultar dados da empresa:`, error.message);
        return null;
    }
}

async function obterDiretoresEmpresa(companyNumber) {
    const credentials = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`;

    console.log(`🔍 [MFRGS] Buscando lista de diretores para o CRN: ${companyNumber}...`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Erro ao buscar diretores: Status ${response.status}`);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error(`❌ Erro ao consultar diretores:`, error.message);
        return [];
    }
}

async function executarTeste() {
    // REVOLUT LTD -> CRN: 08804411 (Empresa real do Reino Unido para teste)
    const CRN_TESTE = "08804411"; 

    console.log("\n==========================================");
    console.log("=== INICIANDO TESTE DE INTEGRAÇÃO MFRGS ===");
    console.log("==========================================\n");
    
    const dadosCadastrais = await obterDadosEmpresa(CRN_TESTE);
    
    if (dadosCadastrais) {
        console.log("\n🟢 [SUCESSO] Dados Cadastrais Retornados:");
        console.log(`--------------------------------------------------`);
        console.log(`Nome Fantasia:      ${dadosCadastrais.company_name}`);
        console.log(`Status Legal:       ${dadosCadastrais.company_status.toUpperCase()}`);
        console.log(`Data de Criação:    ${dadosCadastrais.date_of_creation}`);
        console.log(`Endereço:           ${dadosCadastrais.registered_office_address?.address_line_1}, ${dadosCadastrais.registered_office_address?.locality}`);
        console.log(`--------------------------------------------------`);

        const diretores = await obterDiretoresEmpresa(CRN_TESTE);
        console.log(`\n🟢 [SUCESSO] Oficiais/Diretores Encontrados (${diretores.length}):`);
        
        diretores.slice(0, 3).forEach((diretor, index) => {
            console.log(`  [${index + 1}] Nome: ${diretor.name} | Cargo: ${diretor.officer_role}`);
        });

        console.log(`\n🛡️ [CADEIA DE CUSTÓDIA MFRGS]`);
        console.log(`Timestamp da Consulta: ${new Date().toISOString()}`);
        console.log(`Fonte Oficial:          Companies House API`);
        console.log("==========================================\n");
    } else {
        console.log("\n🔴 [FALHA] Não foi possível mapear a empresa. Verifique se colou a API Key no arquivo ou no .env");
    }
}

executarTeste();