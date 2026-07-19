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
import praw

from guardian import guardian


reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent="MFRGS_Farejador_v2"
)


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


print("🛰 Guardian iniciou o Farejador.")


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