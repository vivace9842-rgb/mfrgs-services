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
from openai import OpenAI

from guardian import guardian

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def executar(evento):

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


guardian.registrar_agente(
    "cientista",
    executar
)