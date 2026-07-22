"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 06 - MARKET INTELLIGENCE
Version: 1.0
===========================================================

Responsabilidade:

• Monitorar o mercado continuamente
• Identificar concorrentes
• Detectar tendências
• Pesquisar novos serviços
• Encontrar oportunidades comerciais

Nunca altera o sistema automaticamente.
Sempre reporta ao Guardian.
"""

import os
import sys
import json
from openai import OpenAI

# Ajuste para garantir que o Python encontre o módulo guardian na pasta correta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.guardian import guardian

# Inicialização do cliente OpenAI com tratamento para testes locais
try:
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY", "mock-key-para-teste-local")
    )
except Exception:
    client = None


def executar(evento):

    guardian.registrar_log(
        "Market Intelligence",
        "Iniciando monitoramento de mercado."
    )

    dados = evento.get("dados", "")

    prompt = """
You are the Market Intelligence Agent of MFRGS Digital Verification.

Your objectives:

• Monitor competitors.
• Detect market opportunities.
• Detect new public verification services.
• Suggest improvements without changing the company's core mission.
• Keep recommendations practical.

Return ONLY this JSON:

{
  "market_trend":"",
  "new_competitors":[],
  "new_services":[],
  "business_opportunities":[],
  "priority":"LOW|MEDIUM|HIGH",
  "recommendation":""
}
"""

    # Desvio para simulação (Mock) caso a chave da API real não esteja configurada
    if os.getenv("OPENAI_API_KEY") is None or os.getenv("OPENAI_API_KEY") == "mock-key-para-teste-local":
        guardian.registrar_log("Market Intelligence", "[MOCK INTERNO] Simulando análise competitiva com OpenAI API...")
        mock_json = {
            "market_trend": "Expansão de APIs de verificação instantânea na América Latina.",
            "new_competitors": ["SaaSVerify Global", "CheckBiz Corp"],
            "new_services": ["Consulta unificada automatizada de certidões estaduais"],
            "business_opportunities": ["Parcerias estratégicas com plataformas de importação locais"],
            "priority": "MEDIUM",
            "recommendation": "Integrar webhooks de monitoramento contínuo para portais B2B."
        }
        
        guardian.registrar_log("Market Intelligence", "Pesquisa concluída.")
        return {
            "tipo": "mercado_analisado",
            "resultado": json.dumps(mock_json, ensure_ascii=False)
        }

    resposta = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": dados
            }
        ],
        temperature=0.2
    )

    guardian.registrar_log(
        "Market Intelligence",
        "Pesquisa concluída."
    )

    return {
        "tipo": "mercado_analisado",
        "resultado": resposta.choices[0].message.content
    }


# Auto-registro do agente no Guardian
guardian.registrar_agente(
    "market_intelligence",
    executar
)


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("📈 Iniciando teste local do Agente Market Intelligence...")
    
    evento_exemplo = {
        "dados": "Análise de movimentação de mercado Q2 2026: surgimento de ferramentas focadas em KYC para e-commerce internacional."
    }
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print(f"Resultado de Mercado (JSON):\n{resultado['resultado']}\n---------------------------------------")