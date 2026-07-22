import time
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from audit_env import EnvAuditor
from audit_structure import StructureAuditor


def run_full_audit():

    start = time.time()

    print("=" * 50)
    print("        MFRGS CORE AUDIT v3.2")
    print("=" * 50)

    env = EnvAuditor(ROOT_DIR).run()
    structure = StructureAuditor(ROOT_DIR).run()

    print(f"\nArquivos Python.............{structure['python_files']}")

    print("\n--- CATEGORIAS ---")

    for categoria, arquivos in structure["categorized"].items():

        print(f"\n{categoria}")

        if not arquivos:
            print("  -")

        for arq in sorted(arquivos):
            print(f"  ✓ {arq}")

    print("\n--- VARIÁVEIS DE AMBIENTE ---")

    print(f"Encontradas.................{len(env['used_envs'])}")
    print(f"Obrigatórias ausentes.......{len(env['missing_required'])}")

    if env["missing_required"]:

        print("\nFALTANDO:")

        for item in env["missing_required"]:
            print(f"  ❌ {item}")

    print(f"\nTempo.......................{round(time.time()-start,2)} s")

    print("=" * 50)

    if env["missing_required"]:
        print("STATUS: NÃO OPERACIONAL")
    else:
        print("STATUS: OPERACIONAL")

    print("=" * 50)


if __name__ == "__main__":
    run_full_audit()