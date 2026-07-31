import json
import os
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

IDENTITY = os.path.join(BASE_DIR, "identity.json")
RULES = os.path.join(BASE_DIR, "rules.json")

LOG_FILE = os.path.join(
    BASE_DIR,
    "logs",
    "security.log"
)


def load_file(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_log(event):

    os.makedirs(
        os.path.dirname(LOG_FILE),
        exist_ok=True
    )

    with open(
        LOG_FILE,
        "a",
        encoding="utf-8"
    ) as file:

        file.write(
            json.dumps(
                event,
                ensure_ascii=False
            )
            + "\n"
        )


def check_project(project):

    identity = load_file(IDENTITY)

    expected = identity["protected_project"]["repository"]

    return project == expected


def check_agent(agent):

    rules = load_file(RULES)

    for blocked in rules["blocked_project_names"]:

        if blocked.lower() in agent.lower():

            return False, blocked

    return True, None


def validate(request):

    result = {
        "timestamp": str(datetime.now()),
        "request": request
    }


    if not check_project(request["project"]):

        result["status"] = "BLOCKED"
        result["reason"] = "Projeto incompatível"

        write_log(result)

        return result


    agent_ok, blocked_name = check_agent(
        request["agent"]
    )


    if not agent_ok:

        result["status"] = "BLOCKED"
        result["reason"] = (
            f"Agente relacionado a projeto bloqueado: {blocked_name}"
        )

        write_log(result)

        return result


    result["status"] = "APPROVED"
    result["reason"] = "Execução autorizada"

    write_log(result)

    return result


if __name__ == "__main__":

    test = {
        "project": "mfrgs-services",
        "agent": "ruflo"
    }

    print(
        json.dumps(
            validate(test),
            indent=2,
            ensure_ascii=False
        )
    )
