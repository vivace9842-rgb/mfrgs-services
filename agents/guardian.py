"""
===========================================================
MFRGS DIGITAL VERIFICATION
GUARDIAN AI ORCHESTRATOR
Version: 2.0
===========================================================

Função:
O Guardian é o cérebro operacional da MFRGS.

Ele NÃO executa tarefas específicas.
Ele apenas coordena, registra, monitora e distribui tarefas.

Todo agente conversa obrigatoriamente com o Guardian.

Arquitetura:

Agente
    ↓
Guardian
    ↓
Próximo Agente

Autor: MFRGS Digital Verification
"""

from datetime import datetime
from typing import Callable, Dict, Any


class Guardian:

    def __init__(self):

        self.version = "2.0"

        self.system_name = "Guardian"

        self.logs = []

        # Registro dinâmico dos agentes
        self.agentes: Dict[str, Callable] = {}

    ############################################################

    def registrar_log(self, origem: str, mensagem: str):

        evento = {
            "timestamp": datetime.utcnow().isoformat(),
            "origem": origem,
            "mensagem": mensagem
        }

        self.logs.append(evento)

        print(f"[GUARDIAN] [{origem}] {mensagem}")

    ############################################################

    def registrar_agente(self, nome: str, funcao: Callable):

        self.agentes[nome] = funcao

        self.registrar_log(
            "Guardian",
            f"Agente registrado: {nome}"
        )

    ############################################################

    def receber_evento(self, agente: str, evento: dict):

        self.registrar_log(

            agente,

            f"Evento recebido ({evento.get('tipo')})"

        )

        destino = self.decidir_proximo_passo(evento)

        return self.encaminhar(destino, evento)

    ############################################################

    def decidir_proximo_passo(self, evento: dict):

        tipo = evento.get("tipo")

        mapa = {

            "lead_encontrado": "convertedor",

            "cliente_pagou": "verification_engine",

            "relatorio_concluido": "delivery_engine",

            "nova_tendencia": "market_intelligence",

            "erro": "health_monitor"

        }

        destino = mapa.get(tipo, "humano")

        self.registrar_log(

            "Guardian",

            f"Destino escolhido: {destino}"

        )

        return destino

    ############################################################

    def encaminhar(self, destino: str, evento: dict):

        if destino == "humano":

            return self.solicitar_aprovacao(evento)

        if destino not in self.agentes:

            self.registrar_log(

                "Guardian",

                f"Agente '{destino}' não registrado."

            )

            return None

        self.registrar_log(

            "Guardian",

            f"Executando {destino}"

        )

        return self.agentes[destino](evento)

    ############################################################

    def solicitar_aprovacao(self, evento: dict):

        self.registrar_log(

            "Guardian",

            "Aguardando aprovação humana."

        )

        return {

            "status": "aguardando_aprovacao",

            "evento": evento

        }

    ############################################################

    def listar_agentes(self):

        return list(self.agentes.keys())

    ############################################################

    def obter_logs(self):

        return self.logs


guardian = Guardian()