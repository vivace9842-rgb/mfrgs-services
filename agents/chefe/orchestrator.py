"""
MFRGS DIGITAL VERIFICATION
CHIEF ORCHESTRATOR

Camada superior de coordenação.
Não executa agentes.
Coordena Sentinela + Guardian.
"""

import time

from agents.guardian import guardian


class ChiefOrchestrator:

    def __init__(self):
        self.name = "Chief Orchestrator"
        self.status = "ready"

    def authorize(self, request):
        """
        Ponto de integração futuro com Sentinela.
        """
        return {
            "approved": True,
            "request": request
        }

    def submit(self, agent, payload):
        authorization = self.authorize(payload)

        if not authorization["approved"]:
            return {
                "status": "blocked",
                "reason": "Sentinela rejected request"
            }

        task = {
            "id": f"chief-{time.time()}",
            "agent": agent,
            "payload": payload
        }

        guardian.dispatch(task)

        return {
            "status": "queued",
            "task": task
        }


chief = ChiefOrchestrator()