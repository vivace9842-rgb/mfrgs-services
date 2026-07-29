# agents/reliability_engine.py

from pathlib import Path
import json
import os
import subprocess
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]


class ReliabilityEngine:

    def __init__(self):
        self.report = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": [],
            "warnings": [],
            "errors": []
        }

    def check_api(self):

        api = ROOT / "api"

        if api.exists():
            self.report["status"].append("API OK")
        else:
            self.report["errors"].append("API folder missing")

    def check_agents(self):

        agents = ROOT / "agents"

        required = [
            "guardian.py",
            "verification_engine.py",
            "delivery_engine.py",
            "health_monitor.py",
            "market_intelligence.py"
        ]

        for file in required:

            if not (agents / file).exists():
                self.report["errors"].append(f"{file} missing")

    def check_git(self):

        try:

            result = subprocess.run(
                ["git","status","--porcelain"],
                capture_output=True,
                text=True
            )

            if result.stdout.strip():

                self.report["warnings"].append(
                    "Repository has uncommitted changes"
                )

            else:

                self.report["status"].append(
                    "Git clean"
                )

        except:

            self.report["warnings"].append(
                "Git unavailable"
            )

    def save(self):

        reports = ROOT / "reports"

        reports.mkdir(exist_ok=True)

        file = reports / "system_health.json"

        with open(file,"w",encoding="utf8") as f:

            json.dump(
                self.report,
                f,
                indent=4,
                ensure_ascii=False
            )

    def run(self):

        self.check_api()
        self.check_agents()
        self.check_git()
        self.save()

        return self.report


if __name__ == "__main__":

    engine = ReliabilityEngine()

    print(engine.run())
    