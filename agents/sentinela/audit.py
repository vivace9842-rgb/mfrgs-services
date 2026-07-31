import os
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LOG_DIR = os.path.join(
    BASE_DIR,
    "logs"
)

LOG_FILE = os.path.join(
    LOG_DIR,
    "audit.log"
)


def write_log(
    agent,
    action,
    target,
    status
):

    os.makedirs(
        LOG_DIR,
        exist_ok=True
    )

    entry = f"""
========================================
DATE:
{datetime.now()}

AGENT:
{agent}

ACTION:
{action}

TARGET:
{target}

STATUS:
{status}
========================================

"""

    with open(
        LOG_FILE,
        "a",
        encoding="utf-8"
    ) as file:
        file.write(entry)


if __name__ == "__main__":

    write_log(
        "SENTINELA",
        "Teste inicial",
        "mfrgs-services",
        "SUCCESS"
    )

    print(
        "Auditoria registrada."
    )
