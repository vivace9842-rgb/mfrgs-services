// salvar-evidencia.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações das credenciais obtidas do arquivo .env
const COMPANIES_HOUSE_KEY = process.env.COMPANIES_HOUSE_API_KEY || "SUA_API_KEY_AQUI";
const SUPABASE_URL = process.env.SUPABASE_URL || "SUA_SUPABASE_URL_AQUI";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "SUA_SERVICE_ROLE_KEY_AQUI";

// Inicializa o cliente do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function buscarEGravarNoSupabase(companyNumber, casoId) {
    const credentials = Buffer.from(`${COMPANIES_HOUSE_KEY}:`).toString('base64');
    const url = `https://api.company-information.service.gov.uk/company/${companyNumber}`;
    
    console.log(`\n🔍 [MFRGS] Iniciando captura oficial para o CRN: ${companyNumber}...`);
    
    try {
        // 1. Coleta o dado na API do Reino Unido
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Basic ${credentials}`, 
                'Accept': 'application/json' 
            }
        });
        
        if (!response.ok) throw new Error(`Erro na API governamental: Status ${response.status}`);
        const dados = await response.json();
        
        const timestampConsulta = new Date().toISOString();
        console.log(`🟢 [COLETA OK] Empresa identificada: ${dados.company_name}`);

        // 2. Prepara o payload respeitando o Princípio de Integridade (Cadeia de Custódia)
        const evidenciaPayload = {
            caso_id: casoId, 
            campo_verificado: 'existencia_legal',
            valor_encontrado: dados.company_status.toUpperCase(),
            fonte_origem: 'Companies House API (UK Government)',
            timestamp_consulta: timestampConsulta,
            url_evidencia: `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`,
            hash_custodia: Buffer.from(`${companyNumber}-${dados.company_status}-${timestampConsulta}`).toString('hex') // Hash básico de integridade
        };

        console.log(`💾 [SUPABASE] Gravando evidência de integridade no banco de dados...`);

        // 3. Insere o registro na tabela 'evidencias' do Supabase
        const { data, error } = await supabase
            .from('evidencias')
            .insert([evidenciaPayload])
            .select();

        if (error) throw error;

        console.log(`\n==================================================`);
        console.log(`?? [SUCESSO] Prova digital persistida no Supabase!`);
        console.log(`ID da Evidência: ${data[0].id}`);
        console.log(`Hash de Custódia: ${data[0].hash_custodia}`);
        console.log(`==================================================\n`);

    } catch (error) {
        console.error(`❌ Falha crítica na esteira de dados:`, error.message);
    }
}

// =========================================================================
// EXECUÇÃO DO TESTE INTEGRADO
// Para este teste funcionar, certifique-se de que existe um Caso com esse ID 
// ou passe null se sua tabela aceitar UUIDs nulos temporariamente para testes.
// =========================================================================
const CASO_TESTE_ID = null; // Substitua por um UUID válido da sua tabela 'casos' se necessário
buscarEGravarNoSupabase("08804411", CASO_TESTE_ID);