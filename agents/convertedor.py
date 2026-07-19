"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 02 - CONVERTEDOR
Version: 2.0
===========================================================

Responsabilidade:

• Receber tarefas do Guardian
• Gerar respostas humanizadas
• Nunca publicar diretamente
• Sempre devolver o resultado ao Guardian

"""

import os
import sys
from openai import OpenAI

# Inicialização do cliente OpenAI
# Se a chave não existir, o mock tratará a execução no bloco de teste
try:
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY", "mock-key-para-teste-local")
    )
except Exception:
    client = None

LANDING_PAGE = os.getenv("MFRGS_LANDING_PAGE", "https://mfrgs-services.vercel.app/")


def executar(evento):
    texto_post = evento["texto"]

    prompt = f"""
You are the Elite Conversion Agent of MFRGS Digital Verification.

MISSION

Help entrepreneurs worried about supplier fraud.

RULES

- Detect the language automatically.
- Reply in the same language.
- Never sound like spam.
- Show empathy.
- Give one useful practical tip.
- Present MFRGS naturally.
- Explain that we use public corporate records.
- Never claim legal authority.
- Never claim investigative authority.
- Mention accessibility.
- Finish with:

{LANDING_PAGE}

"""

    # Desvio para teste local caso a chave da API real não esteja configurada
    if os.getenv("OPENAI_API_KEY") is None or os.getenv("OPENAI_API_KEY") == "mock-key-para-teste-local":
        print("💡 [MOCK INTERNO] Simulando chamada da OpenAI API...")
        texto_mockado = f"[Mock Response] Hello! I understand you are worried about supplier fraud. Tip: Always check public corporate records. You can verify options at MFRGS naturally. Accessibility is key. Visit: {LANDING_PAGE}"
        return {
            "tipo": "resposta_pronta",
            "texto": texto_mockado
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
                "content": texto_post
            }
        ],
        temperature=0.7
    )

    return {
        "tipo": "resposta_pronta",
        "texto": resposta.choices[0].message.content
    }


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("🤖 Iniciando teste local do Agente Convertedor...")
    
    evento_exemplo = {
        "texto": "i am about to wire $5000 to a new factory but their address looks fake. can anyone help me verify business?"
    }
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print(f"Texto Gerado:\n{resultado['texto']}\n---------------------------------------")