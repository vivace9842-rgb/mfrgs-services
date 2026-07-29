# agents/guardian.py

from datetime import datetime
from queue import PriorityQueue
import threading
import time
import logging

from verification_engine import VerificationEngine
from delivery_engine import DeliveryEngine
from market_intelligence import MarketIntelligence
from health_monitor import HealthMonitor
from reliability_engine import ReliabilityEngine


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


class Guardian:

    def __init__(self):

        self.verification = VerificationEngine()

        self.delivery = DeliveryEngine()

        self.market = MarketIntelligence()

        self.health = HealthMonitor()

        self.reliability = ReliabilityEngine()

        self.memory = {}

        self.events = []

        self.tasks = PriorityQueue()

        self.running = False

    ######################################################

    def register_event(self, event):

        log = {
            "time": datetime.now(),
            "event": event
        }

        self.events.append(log)

        logging.info(event)

    ######################################################

    def save_memory(self, key, value):

        self.memory[key] = value

    ######################################################

    def load_memory(self, key):

        return self.memory.get(key)

    ######################################################

    def dispatch(self, task, priority=5):

        self.tasks.put((priority, task))

        self.register_event(f"Task queued -> {task}")

    ######################################################

    def process_tasks(self):

        while self.running:

            if self.tasks.empty():

                time.sleep(1)

                continue

            priority, task = self.tasks.get()

            agent = task["agent"]

            payload = task["payload"]

            try:

                self.register_event(f"Executing {agent}")

                if agent == "verification":

                    result = self.verification.run(payload)

                elif agent == "market":

                    result = self.market.run(payload)

                elif agent == "delivery":

                    result = self.delivery.run(payload)

                else:

                    result = None

                self.save_memory(task["id"], result)

                self.register_event(f"{agent} completed")

            except Exception as e:

                self.register_event(f"ERROR {agent}: {e}")

    ######################################################

    def monitor_agents(self):

        while self.running:

            try:

                status = self.health.check()

                self.register_event(status)

                reliability = self.reliability.check()

                self.register_event(reliability)

            except Exception as e:

                self.register_event(str(e))

            time.sleep(60)

    ######################################################

    def daily_report(self):

        report = {

            "generated": datetime.now(),

            "events": len(self.events),

            "cached_objects": len(self.memory),

            "pending_tasks": self.tasks.qsize()

        }

        return report

    ######################################################

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

        self.register_event("Guardian ONLINE")

    ######################################################

    def stop(self):

        self.running = False

        self.register_event("Guardian OFFLINE")