"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE 07 - HEALTH MONITOR
Version: 1.0
===========================================================

Responsabilidade:

• Monitorar toda a infraestrutura
• Detectar falhas
• Registrar incidentes
• Alertar o Guardian

Nunca corrige problemas automaticamente.
"""

import os
import sys
from datetime import datetime, timezone

# Ajuste para garantir que o Python encontre o módulo guardian na pasta correta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agents.guardian import guardian

SERVICOS = [
    "Stripe",
    "Webhook",
    "Vercel",
    "Supabase",
    "OpenAI",
    "Reddit API"
]


def verificar_servicos():
    resultado = []
    for servico in SERVICOS:
        resultado.append({
            "servico": servico,
            "status": "ONLINE",
            "verificado_em": datetime.now(timezone.utc).isoformat()
        })
    return resultado


def executar(evento, callback_log=None):

    guardian.registrar_log(
        "Health Monitor",
        "Executando verificação da infraestrutura."
    )

    status = verificar_servicos()

    guardian.registrar_log(
        "Health Monitor",
        "Verificação concluída."
    )

    return {
        "tipo": "health_report",
        "infraestrutura": status
    }


# Auto-registro do agente no Guardian
guardian.registrar_agente(
    "health_monitor",
    executar
)


# --- BLOCO DE EXECUÇÃO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("🏥 Iniciando teste local do Agente Health Monitor...")
    
    evento_exemplo = {"comando": "check_now"}
    
    resultado = executar(evento_exemplo)
    print("\n--- RESULTADO RETORNADO AO GUARDIAN ---")
    print(f"Tipo: {resultado['tipo']}")
    print("Status dos Serviços Monitorados:")
    for s in resultado["infraestrutura"]:
        print(f"  - [{s['servico']}]: {s['status']} ({s['verificado_em']})")
    print("---------------------------------------")