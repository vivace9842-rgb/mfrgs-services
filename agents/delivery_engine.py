"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 05 - DELIVERY ENGINE
Version: 1.0
===========================================================

Responsabilidade:

• Receber o relatório do Guardian
• Gerar o PDF
• Enviar o e-mail ao cliente
• Registrar a entrega
• Informar o Guardian

Nunca executa análises.
Nunca consulta o Stripe.
Nunca conversa com outros agentes diretamente.
"""

import os
import sys

# Ajuste para garantir que o Python encontre o módulo guardian na pasta correta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.guardian import guardian


def gerar_pdf(relatorio):
    """
    Aqui ficará a geração do PDF.
    (Inicialmente é um placeholder.)
    """
    # Garante a criação da pasta de relatórios localmente para evitar erros de escrita
    os.makedirs("reports", exist_ok=True)
    caminho_pdf = "reports/report.pdf"
    
    # Criação de um arquivo falso apenas para fins de simulação de disco
    with open(caminho_pdf, "w", encoding="utf-8") as f:
        f.write(f"--- MFRGS DIGITAL VERIFICATION REPORT ---\n{relatorio}")

    return caminho_pdf


def enviar_email(email_cliente, pdf):
    """
    Aqui ficará a integração com o serviço
    de envio de e-mails (Resend, SendGrid etc.)
    """
    print(f"📧 Enviando relatório para {email_cliente}")
    return True


def executar(evento):

    guardian.registrar_log(
        "Delivery Engine",
        "Preparando entrega."
    )

    email = evento.get("email")
    relatorio = evento.get("resultado")
    empresa = evento.get("empresa")

    pdf = gerar_pdf(relatorio)
    enviado = enviar_email(email, pdf)

    if enviado:
        guardian.registrar_log(
            "Delivery Engine",
            f"Relatório entregue para {email}"
        )

        return {
            "tipo": "entrega_concluida",
            "empresa": empresa,
            "email": email,
            "pdf": pdf,
            "status": "SUCESSO"
        }

    guardian.registrar_log(
        "Delivery Engine",
        "Falha na entrega."
    )

    return {
        "tipo": "erro",
        "origem": "delivery_engine",
        "mensagem": "Falha ao enviar relatório."
    }


# Auto-registro do agente no Guardian
guardian.registrar_agente(
    "delivery_engine",
    executar
)


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("📦 Iniciando teste local do Agente Delivery Engine...")
    
    evento_exemplo = {
        "email": "cliente@exemplo.com",
        "empresa": "Nova Fábrica Logística",
        "resultado": "Análise Concluída: Risco Baixo. Empresa ativa no registro público."
    }
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print(f"Status Final: {resultado.get('status') or resultado.get('mensagem')}")
    print(f"Caminho do Arquivo: {resultado.get('pdf')}")
    print("---------------------------------------")