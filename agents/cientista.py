"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 03 - CIENTISTA
Version: 2.0
===========================================================

Responsabilidade:

• Monitorar tendências do mercado
• Pesquisar oportunidades
• Identificar possíveis concorrentes
• Sugerir melhorias
• Reportar tudo ao Guardian

Nunca altera o sistema automaticamente.
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

def executar(evento, callback_log=None):

    guardian.registrar_log(
        "Cientista",
        "Iniciando análise de mercado."
    )

    dados = evento.get("dados", "")

    prompt = """
Você é o Cientista da MFRGS Digital Verification.

Sua missão é analisar tendências do mercado de verificação empresarial,
compliance, due diligence e inteligência corporativa.

OBJETIVOS:

1. Detectar novas tendências.
2. Identificar oportunidades.
3. Detectar novos concorrentes.
4. Sugerir melhorias para nossos serviços.
5. Nunca sair do foco da MFRGS.
6. Nunca sugerir mudanças radicais.
7. Priorizar crescimento sustentável.

Retorne obrigatoriamente um JSON com:

{
 "tendencia":"",
 "impacto":"",
 "prioridade":"BAIXA|MEDIA|ALTA",
 "sugestao":"",
 "acao_recomendada":""
}
"""

    # Desvio para simulação (Mock) caso a chave da API real não esteja configurada
    if os.getenv("OPENAI_API_KEY") is None or os.getenv("OPENAI_API_KEY") == "mock-key-para-teste-local":
        guardian.registrar_log("Cientista", "[MOCK INTERNO] Simulando inteligência da OpenAI API...")
        mock_json = {
            "tendencia": "Aumento de fraudes em fornecedores asiáticos usando identidades clonadas.",
            "impacto": "Alto risco para importadores de e-commerce e dropshipping.",
            "prioridade": "ALTA",
            "sugestao": "Implementar módulo de checagem profunda de registros governamentais.",
            "acao_recomendada": "Atualizar a matriz de risco da landing page para capturar este indicador."
        }
        
        guardian.registrar_log("Cientista", "Pesquisa concluída.")
        return {
            "tipo": "nova_tendencia",
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
        temperature=0.3
    )

    guardian.registrar_log(
        "Cientista",
        "Pesquisa concluída."
    )

    return {
        "tipo": "nova_tendencia",
        "resultado": resposta.choices[0].message.content
    }


# Auto-registro do agente no Guardian
guardian.registrar_agente(
    "cientista",
    executar
)


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("🧠 Iniciando teste local do Agente Cientista...")
    
    evento_exemplo = {
        "dados": "Relatório recente indica que 15% das novas fábricas registradas em portais B2B globais apresentam inconsistências de endereço físico."
    }
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print(f"Resultado Analítico (JSON):\n{resultado['resultado']}\n---------------------------------------")