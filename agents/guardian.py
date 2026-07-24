"""
===========================================================
MFRGS DIGITAL VERIFICATION
CENTRAL BRAIN - GUARDIAN
Version: 2.3 - Pipeline Orquestrador Integrado & Opinião Técnica
===========================================================
"""

import os
import sys
from datetime import datetime
from queue import PriorityQueue
import threading
import time
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


class Guardian:

    def __init__(self):
        self.memory = {}
        self.events = []
        self.tasks = PriorityQueue()
        self.running = False
        
        # Inicialização protegida de engines com imports locais para evitar ciclos
        try:
            from engines.verification_engine import executar as executar_verification
            self.executar_verification = executar_verification
        except ImportError:
            self.executar_verification = None

        try:
            from engines.delivery_engine import executar as executar_delivery
            self.executar_delivery = executar_delivery
        except ImportError:
            self.executar_delivery = None

        try:
            from agents.market_intelligence import executar as executar_market
            self.executar_market = executar_market
        except ImportError:
            self.executar_market = None

        try:
            from agents.health_monitor import executar as executar_health
            self.executar_health = executar_health
        except ImportError:
            self.executar_health = None

    def register_event(self, event):
        log_entry = {
            "time": datetime.now(),
            "event": event
        }
        self.events.append(log_entry)
        logging.info(event)

    def log_callback(self, origem, mensagem):
        self.register_event(f"[{origem}] {mensagem}")

    def log(self, origem, mensagem):
        """Método de suporte para padronização de log do pipeline."""
        self.log_callback(origem, mensagem)

    def save_memory(self, key, value):
        self.memory[key] = value

    def load_memory(self, key):
        return self.memory.get(key)

    def dispatch(self, task, priority=5):
        """
        Enfileira uma tarefa para o Guardian processar.
        task deve ser um dicionário ex: {"id": "1", "agent": "market", "payload": {...}}
        """
        self.tasks.put((priority, task))
        self.register_event(f"Task queued -> {task.get('agent', 'unknown')}")

    def _process_task_result(self, task_type, result):
        """
        Orquestrador central do Pipeline MFRGS.
        Decide o próximo passo após a conclusão de cada agente.
        """
        if task_type == "market":
            self.log("Guardian", "Market Intelligence concluído. Disparando Verification...")
            self.dispatch({
                "id": f"pipeline-verif-{time.time()}",
                "agent": "verification",
                "payload": result
            })

        elif task_type == "verification":
            self.log("Guardian", "Verification Engine concluído. Disparando Delivery...")
            self.dispatch({
                "id": f"pipeline-deliv-{time.time()}",
                "agent": "delivery",
                "payload": result
            })

        elif task_type == "delivery":
            self.log("Guardian", "Pipeline completo! Todos os agentes executaram com sucesso.")
            self.log("Guardian", "Relatório final disponível na pasta /reports.")

    def process_tasks(self):
        while self.running:
            if self.tasks.empty():
                time.sleep(1)
                continue

            priority, task = self.tasks.get()

            agent = task.get("agent")
            payload = task.get("payload", {})
            task_id = task.get("id", str(time.time()))

            try:
                self.register_event(f"Executing {agent}")
                result = None

                if agent == "market":
                    try:
                        from agents.market_intelligence import executar as executar_market
                        result = executar_market(payload, callback_log=self.log_callback)
                    except Exception as e:
                        result = {"status": "error", "message": str(e)}
                elif agent == "health":
                    try:
                        from agents.health_monitor import executar as executar_health
                        result = executar_health(payload, callback_log=self.log_callback)
                    except Exception as e:
                        result = {"status": "error", "message": str(e)}
                elif agent == "verification":
                    try:
                        from engines.verification_engine import executar as executar_verification
                        result = executar_verification(payload, callback_log=self.log_callback)
                    except Exception as e:
                        result = {"status": "error", "message": str(e)}
                elif agent == "delivery":
                    try:
                        from engines.delivery_engine import executar as executar_delivery
                        result = executar_delivery(payload, callback_log=self.log_callback)
                    except Exception as e:
                        result = {"status": "error", "message": str(e)}
                else:
                    result = {"status": "error", "message": f"Agente '{agent}' não encontrado ou indisponível."}

                self.save_memory(task_id, result)
                self.register_event(f"{agent} completed successfully")

                # Aciona o orquestrador do pipeline
                self._process_task_result(agent, result)

            except Exception as e:
                self.register_event(f"ERROR executing {agent}: {str(e)}")

    def monitor_agents(self):
        while self.running:
            try:
                try:
                    from agents.health_monitor import executar as executar_health
                    status_report = executar_health({"comando": "check_now"}, callback_log=self.log_callback)
                    self.save_memory("latest_health", status_report)
                except ImportError:
                    pass
            except Exception as e:
                self.register_event(f"Health monitor error: {str(e)}")

            time.sleep(60)

    def daily_report(self):
        report = {
            "generated": datetime.now().isoformat(),
            "events_count": len(self.events),
            "cached_objects": len(self.memory),
            "pending_tasks": self.tasks.qsize()
        }
        return report

    def start(self):
        self.running = True

        threading.Thread(
            target=self.process_tasks,
            daemon=True
        ).start()

        threading.Thread(
            target=self.monitor_agents,
            daemon=True
        ).start()

        self.register_event("Guardian ONLINE (MFRGS INOVEÇÕES - Cérebro Ativo)")

    def stop(self):
        self.running = False
        self.register_event("Guardian OFFLINE")

    # --- MÉTODOS DE COMPATIBILIDADE RETROATIVA ---
    def receber_evento(self, agente, evento):
        """Método de compatibilidade para enfileiramento por agentes legados."""
        self.dispatch({"agent": agente, "payload": evento})
        return f"evento_enfileirado_{agente}"

    def registrar_log(self, origem, mensagem):
        """Método de compatibilidade para logs de agentes legados."""
        self.log_callback(origem, mensagem)

    def registrar_agente(self, agente, funcao):
        """Método de compatibilidade para auto-registro de agentes legados."""
        pass

    def initialize_operation(self):
        """Método de compatibilidade chamado pelo main.py"""
        self.start()
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()


# Instância global do Cérebro
guardian = Guardian()
