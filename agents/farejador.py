"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 01 - FAREJADOR
Version: 2.0
===========================================================

Responsabilidade:

• Monitorar comunidades estratégicas
• Detectar potenciais clientes
• Reportar TODOS os eventos ao Guardian
• Nunca responder diretamente ao usuário

"""

import os
import time
import sys

# Ajuste para garantir que o Python encontre o módulo guardian na raiz do projeto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.guardian import guardian

SUBREDDITS = [
    "Alibaba",
    "dropshipping",
    "ecommerce",
    "Fulfillment",
    "Logistics"
]

PALAVRAS_CHAVE = [
    "scam",
    "supplier legit",
    "fake supplier",
    "ghost company",
    "fake factory",
    "verify company",
    "verify business",
    "supplier fraud",
    "supplier verification"
]

def executar_producao():
    import praw
    print("🛰 Guardian iniciou o Farejador em modo de Produção (Streaming)...")
    
    reddit = praw.Reddit(
        client_id=os.getenv("REDDIT_CLIENT_ID"),
        client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        user_agent="MFRGS_Farejador_v2"
    )

    for post in reddit.subreddit("+".join(SUBREDDITS)).stream.submissions(skip_existing=True):
        texto = f"{post.title} {post.selftext}".lower()
        encontrou = any(p in texto for p in PALAVRAS_CHAVE)

        if not encontrou:
            continue

        evento = {
            "tipo": "lead_encontrado",
            "origem": "reddit",
            "titulo": post.title,
            "texto": texto,
            "url": post.url,
            "autor": str(post.author),
            "id": post.id
        }

        destino = guardian.receber_evento(
            agente="farejador",
            evento=evento
        )

        print(f"Guardian encaminhou para: {destino}")
        time.sleep(3)

def executar_teste():
    print("🛰 Guardian iniciou o Farejador em modo de TESTE LOCAL.")
    print(f"Monitorando subreddits fictícios: {SUBREDDITS}")
    
    evento_teste = {
        "tipo": "lead_encontrado",
        "origem": "reddit_mock_test",
        "titulo": "Is this Alibaba supplier a scam? Need to verify business",
        "texto": "i am about to wire $5000 to a new factory but their address looks fake. can anyone help me verify business?",
        "url": "https://reddit.com/r/dropshipping/mock_test",
        "autor": "test_buyer_123",
        "id": "mock123"
    }

    try:
        destino = guardian.receber_evento(
            agente="farejador",
            evento=evento_teste
        )
        print(f"✅ TESTE BEM-SUCEDIDO! Guardian processou e encaminhou para: {destino}")
    except Exception as e:
        print(f"❌ ERRO NA COMUNICAÇÃO COM O GUARDIAN: {e}")

if __name__ == "__main__":
    # Se houver credenciais cadastradas, roda produção, senão roda teste local automaticamente
    if os.getenv("REDDIT_CLIENT_ID") and os.getenv("REDDIT_CLIENT_SECRET"):
        executar_producao()
    else:
        executar_teste()