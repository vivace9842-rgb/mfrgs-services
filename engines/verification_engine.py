"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 04 - VERIFICATION ENGINE
Version: 1.4 - Corrigida (Indentação e Aspas)
===========================================================

Responsabilidade:

• Receber uma solicitação (via Guardian ou teste local)
• Executar o Framework MFRGS (via OpenAI ou Mock)
• Classificar o risco da empresa
• Gerar um relatório estruturado
• Devolver o resultado

Nunca envia e-mail.
Nunca gera PDF.
Nunca altera bancos de dados.
"""

import os
import json
from openai import OpenAI

# Inicialização segura do cliente OpenAI
try:
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY", "mock-key-para-teste-local")
    )
except Exception:
    client = None


def executar(evento, callback_log=None):
    """
    Verification Engine
    Recebe um payload enviado pelo Guardian, executa a análise 
    via OpenAI (ou fallback Mock) e devolve um dicionário padronizado.
    """

    def log(msg):
        if callback_log:
            callback_log("VerificationEngine", msg)
        else:
            print(f"[VerificationEngine] {msg}")

    log("Iniciando verificação da empresa...")

    empresa = evento.get("empresa", {})

    if isinstance(empresa, dict):
        nome = empresa.get("nome", "Empresa não informada")
        website = empresa.get("website", "N/A")
        registro = empresa.get("registro", "N/A")
        pais = empresa.get("pais", "N/A")
    else:
        nome = str(empresa)
        website = "N/A"
        registro = "N/A"
        pais = "N/A"

    prompt = f"""
You are the MFRGS Verification Engine.
Your mission is to execute the MFRGS Framework.

STAGE 01 — ASK: Validate the received information.
STAGE 02 — VERIFY: Analyze available public corporate information.
STAGE 03 — ANALYSE: Identify inconsistencies, structural risks, ownership issues, digital footprint, corporate history.
STAGE 04 — CLASSIFY: Choose ONLY ONE: LOW, MEDIUM, HIGH, CRITICAL.
STAGE 05 — CONCLUDE: Return ONLY a valid JSON object.

Company details:
- Name: {nome}
- Website: {website}
- Registration: {registro}
- Country: {pais}

Required JSON format:
{{
  "company": "{nome}",
  "risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "",
  "findings": [],
  "recommendation": "",
  "disclaimer": "Esta é uma análise baseada exclusivamente em dados públicos e registros digitais consolidados sob responsabilidade da MFRGS Inovações."
}}
"""

    api_key = os.getenv("OPENAI_API_KEY")
    usar_mock = api_key is None or api_key == "mock-key-para-teste-local" or client is None

    try:
        if usar_mock:
            log("[MOCK INTERNO] Executando simulação do Framework MFRGS...")
            resultado_json = {
                "company": nome,
                "risk": "LOW",
                "summary": "Verificação concluída com base em registros públicos e pegada digital padrão.",
                "findings": [
                    "Registro corporativo ativo e regular.",
                    "Domínio verificado com histórico estável.",
                    "Nenhum alerta crítico em gazetas oficiais."
                ],
                "recommendation": "Transação comercial recomendada sob diretrizes padrão.",
                "disclaimer": "Esta é uma análise baseada exclusivamente em dados públicos e registros digitais consolidados sob responsabilidade da MFRGS Inovações."
            }
        else:
            log("Consultando OpenAI GPT-4o-mini...")

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

            conteudo = resposta.choices[0].message.content.strip()

            # Remove blocos ```json ... ``` caso a IA os retorne
            if conteudo.startswith("```"):
                conteudo = (
                    conteudo
                    .replace("```json", "")
                    .replace("```", "")
                    .strip()
                )

            resultado_json = json.loads(conteudo)

        log(f"Análise concluída com sucesso para {nome}")

        return {
            "status": "sucesso",
            "tipo": "relatorio_concluido",
            "empresa": nome,
            "resultado": json.dumps(resultado_json, ensure_ascii=False)
        }

    except Exception as e:
        log(f"Erro crítico na execução: {e}")

        return {
            "status": "erro",
            "tipo": "erro",
            "empresa": nome,
            "mensagem": str(e)
        }


if __name__ == "__main__":
    print("🔍 Testando Verification Engine isoladamente...")
    exemplo = {
        "empresa": {
            "nome": "MFRGS Inovações Ltda",
            "website": "[https://mfrgs-services.vercel.app/](https://mfrgs-services.vercel.app/)",
            "registro": "BR-99999999",
            "pais": "Brasil"
        }
    }
    print(executar(exemplo))