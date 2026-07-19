"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 04 - VERIFICATION ENGINE
Version: 1.0
===========================================================

Responsabilidade:

• Receber uma solicitação do Guardian
• Executar o Framework MFRGS
• Classificar o risco da empresa
• Gerar um relatório estruturado
• Devolver o resultado ao Guardian

Nunca envia e-mail.
Nunca gera PDF.
Nunca altera bancos de dados.
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
        "Verification Engine",
        "Iniciando análise da empresa."
    )

    empresa = evento.get("empresa", {})
    nome = empresa.get("nome", "")
    website = empresa.get("website", "")
    registro = empresa.get("registro", "")
    pais = empresa.get("pais", "")

    prompt = f"""
You are the MFRGS Verification Engine.

Your mission is to execute the MFRGS Framework.

STAGE 01 — ASK
Validate the received information.

STAGE 02 — VERIFY
Analyze the available public corporate information.

STAGE 03 — ANALYSE
Identify inconsistencies, structural risks, ownership issues,
digital footprint, corporate history and public signals.

STAGE 04 — CLASSIFY

Choose ONLY ONE:

LOW
MEDIUM
HIGH
CRITICAL

STAGE 05 — CONCLUDE

Return ONLY a JSON object.

Company:

Name: {nome}

Website: {website}

Registration: {registro}

Country: {pais}

Required JSON:

{{
  "company":"",
  "risk":"LOW|MEDIUM|HIGH|CRITICAL",
  "summary":"",
  "findings":[],
  "recommendation":"",
  "disclaimer":""
}}
"""

    # Desvio para simulação (Mock) caso a chave da API real não esteja configurada
    if os.getenv("OPENAI_API_KEY") is None or os.getenv("OPENAI_API_KEY") == "mock-key-para-teste-local":
        guardian.registrar_log("Verification Engine", "[MOCK INTERNO] Executando simulação do Framework MFRGS...")
        mock_json = {
            "company": nome if nome else "Empresa de Teste Ltda",
            "risk": "HIGH",
            "summary": "Foram identificadas sérias inconsistências entre o endereço de registro oficial e a pegada digital exposta no domínio avaliado.",
            "findings": [
                "Idade do domínio inferior a 90 dias com alto tráfego mascarado.",
                "Número de registro corporativo associado a outra entidade jurídica desativada.",
                "Ausência de canais oficiais e históricos de transações verificáveis."
            ],
            "recommendation": "Recomenda-se a suspensão de remessas financeiras internacionais até auditoria física local.",
            "disclaimer": "Esta é uma análise baseada exclusivamente em dados públicos e registros digitais consolidados."
        }
        
        guardian.registrar_log("Verification Engine", "Relatório concluído.")
        return {
            "tipo": "relatorio_concluido",
            "empresa": nome,
            "resultado": json.dumps(mock_json, ensure_ascii=False)
        }

    resposta = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    guardian.registrar_log(
        "Verification Engine",
        "Relatório concluído."
    )

    return {
        "tipo": "relatorio_concluido",
        "empresa": nome,
        "resultado": resposta.choices[0].message.content
    }


# Auto-registro do agente no Guardian
guardian.registrar_agente(
    "verification_engine",
    executar
)


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("🔍 Iniciando teste local do Agente Verification Engine...")
    
    evento_exemplo = {
        "empresa": {
            "nome": "Shenzhen Global Logistics Co.",
            "website": "https://www.shenzhen-fake-global.cc",
            "registro": "CN-98237419-X",
            "pais": "China"
        }
    }
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print(f"Empresa Analisada: {resultado['empresa']}")
    print(f"Relatório Estruturado (JSON):\n{resultado['resultado']}\n---------------------------------------")