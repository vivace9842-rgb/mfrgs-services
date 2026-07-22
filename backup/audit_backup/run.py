import time
from pathlib import Path
from audit_imports import ImportAuditor
from audit_env import EnvAuditor
from audit_structure import StructureAuditor

def run_full_audit():
    start_time = time.time()
    root_dir = Path(__file__).resolve().parents[2] # Raiz do projeto

    print("====================================")
    print("        MFRGS CORE AUDIT            ")
    print("====================================")

    # Executa os sub-auditores
    imports_result = ImportAuditor(root_dir).run()
    env_result = EnvAuditor(root_dir).run()
    structure_result = StructureAuditor(root_dir).run()

    elapsed = round(time.time() - start_time, 2)

    # Relatório Final
    print(f"Arquivos Python.............{structure_result['total_files']}")
    print(f"Imports analisados..........{imports_result['total_imports']}")
    print(f"✓ Variáveis .env usadas.....{len(env_result['used_envs'])}")
    print(f"❌ Variáveis .env ausentes..{len(env_result['missing_envs'])}")
    if env_result['missing_envs']:
        for missing in env_result['missing_envs']:
            print(f"   -> Ausente: {missing}")
            
    print(f"Arquivos órfãos.............{len(structure_result['orphans'])}")
    if structure_result['orphans']:
        for orphan in structure_result['orphans']:
            print(f"   -> Órfão: {orphan}")

    print(f"Tempo.......................{elapsed}s")
    print("====================================")
    
    status = "NÃO OPERACIONAL" if env_result['missing_envs'] or imports_result['broken'] else "OPERACIONAL"
    print(f"STATUS: {status}")
    print("====================================")

if __name__ == "__main__":
    run_full_audit()