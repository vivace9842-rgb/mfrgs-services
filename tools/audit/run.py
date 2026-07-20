import time
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from audit_env import EnvAuditor
from audit_structure import StructureAuditor

def run_full_audit():
    start_time = time.time()
    print("====================================")
    print("      MFRGS CORE AUDIT v3.0         ")
    print("====================================")

    env_result = EnvAuditor(root_dir).run()
    structure_result = StructureAuditor(root_dir).run()

    elapsed = round(time.time() - start_time, 2)

    print(f"Arquivos Python.............{structure_result['total_files']}")
    
    print("
--- CATEGORIAS ARQUITETURAIS ---")
    for cat, files in structure_result['categories'].items():
        print(f"{cat}:")
        for file in files:
            print(f"  ✓ {file}")

    if structure_result['naming_warnings']:
        print("
⚠ ALERTA DE NOMENCLATURA (Espaços/Maiúsculas):")
        for warn in structure_result['naming_warnings']:
            print(f"  ⚠ {warn} (Recomendado: snake_case)")

    print("
--- VARIÁVEIS DE AMBIENTE ---")
    print(f"✓ Total usadas no código....{len(env_result['used_envs'])}")
    print(f"❌ Obrigatórias ausentes....{len(env_result['missing_required'])}") 
    for req in env_result['missing_required']:
        print(f"   -> Ausente: {req}")
        
    print(f"⚠ Opcionais ausentes........{len(env_result['missing_optional'])}") 
    for opt in env_result['missing_optional']:
        print(f"   -> Ausente (Degradação suave): {opt}")

    print(f"
Tempo.......................{elapsed}s")
    print("====================================")
    
    status = "NÃO OPERACIONAL" if env_result['missing_required'] else "OPERACIONAL"
    print(f"STATUS: {status}")
    print("====================================")

if __name__ == '__main__':
    run_full_audit()
