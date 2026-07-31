import json
import os
import sys
from datetime import datetime


# Define raiz do projeto
PROJECT_ROOT = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../"
    )
)

sys.path.insert(
    0,
    PROJECT_ROOT
)


from agents.sentinela.guardian import validate


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

REPORT_DIR = os.path.join(
    BASE_DIR,
    "reports"
)


def test_sentinela_authorized():

    result = validate({
        "project": "mfrgs-services",
        "agent": "ruflo"
    })

    return result["status"] == "APPROVED"


def test_sentinela_block():

    result = validate({
        "project": "mfrgs-services",
        "agent": "zapflow-agent"
    })

    return result["status"] == "BLOCKED"


def test_structure():

    required = [
        "agents",
        "agents/sentinela",
        "agents/ruflo",
        "agents/testador"
    ]

    return all(
        os.path.exists(
            os.path.join(PROJECT_ROOT, item)
        )
        for item in required
    )


def run():

    tests = [
        {
            "id": "TEST-001",
            "name": "Sentinela autorizado",
            "result": test_sentinela_authorized()
        },
        {
            "id": "TEST-002",
            "name": "Bloqueio de intruso",
            "result": test_sentinela_block()
        },
        {
            "id": "TEST-003",
            "name": "Integridade de estrutura",
            "result": test_structure()
        }
    ]


    results = []

    for test in tests:

        results.append(
            {
                "id": test["id"],
                "name": test["name"],
                "status": (
                    "PASS"
                    if test["result"]
                    else "FAIL"
                )
            }
        )


    os.makedirs(
        REPORT_DIR,
        exist_ok=True
    )


    report = os.path.join(
        REPORT_DIR,
        "test_report.json"
    )


    with open(
        report,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            {
                "date": str(datetime.now()),
                "results": results
            },
            file,
            indent=2,
            ensure_ascii=False
        )


    print("MFRGS TESTADOR v1.1")
    print("===================")

    for item in results:
        print(
            item["id"],
            item["status"]
        )

    print("\nRelatório:")
    print(report)


if __name__ == "__main__":
    run()
