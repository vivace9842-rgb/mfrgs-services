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
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

LANDING_PAGE = os.getenv("MFRGS_LANDING_PAGE")


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

    resposta = client.chat.completions.create(

        model="gpt-4o-mini",

        messages=[

            {
                "role":"system",
                "content":prompt
            },

            {
                "role":"user",
                "content":texto_post
            }

        ],

        temperature=0.7

    )

    return {

        "tipo":"resposta_pronta",

        "texto":resposta.choices[0].message.content

    }