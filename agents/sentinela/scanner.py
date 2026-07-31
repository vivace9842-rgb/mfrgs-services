import os
import json
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(
    os.path.join(BASE_DIR, "../../")
)

UNIVERSE_FILE = os.path.join(
    BASE_DIR,
    "universe.json"
)


def load_universe():
    with open(
        UNIVERSE_FILE,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


def scan_project():

    universe = load_universe()

    blocked = [
        item.lower()
        for item in universe["known_projects"]
        if item != universe["core_project"]
    ]

    alerts = []

    for root, dirs, files in os.walk(PROJECT_ROOT):

        for file in files:

            path = os.path.join(root, file)

            filename = file.lower()

            for project in blocked:

                if project in filename:

                    alerts.append({
                        "file": path,
                        "reason": f"Nome associado a outro projeto: {project}"
                    })


    return alerts


def run():

    print("=" * 60)
    print("MFRGS SENTINELA - SCANNER")
    print("=" * 60)

    print(
        f"Projeto analisado: {PROJECT_ROOT}"
    )

    alerts = scan_project()

    print(
        f"Data: {datetime.now()}"
    )

    if alerts:

        print("\nALERTAS ENCONTRADOS:")

        for alert in alerts:
            print("-" * 40)
            print(alert["file"])
            print(alert["reason"])

    else:

        print("\nSTATUS:")
        print("PROJETO ÍNTEGRO ✅")


if __name__ == "__main__":
    run()
