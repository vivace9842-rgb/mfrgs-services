import os
import importlib
import sys
from pathlib import Path
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

ROOT_DIR = Path(__file__).parent
AGENTS_DIR = ROOT_DIR / "agents"

def run_audit():
    print("========================================")
    print("       MFRGS CORE AUDIT (v1.0)          ")
    print("========================================")
    
    python_files = list(ROOT_DIR.glob("**/*.py"))
    # Ignora a própria auditoria ou pastas virtuais se houverem
    python_files = [f for f in python_files if "venv" not in f.parts and ".git" not in f.parts]
    
    total_files = len(python_files)
    ok_imports = 0
    broken_imports = []
    warnings = []
    
    # 1. Auditoria de Arquivos e Imports
    print(f"\n[1/4] Analisando {total_files} arquivos Python...")
    
    # Adiciona a raiz ao path para simular importação real
    sys.path.insert(0, str(ROOT_DIR))
    
    for file_path in python_files:
        rel_path = file_path.relative_to(ROOT_DIR)
        # Transforma o caminho do arquivo em module path (ex: agents.guardian)
        module_name = str(rel_path.with_suffix('')).replace(os.sep, '.')
        
        try:
            importlib.import_module(module_name)
            ok_imports += 1
        except Exception as e:
            broken_imports.append((module_name, str(e)))

    # 2. Auditoria do .env
    print("[2/4] Verificando variáveis de ambiente essenciais...")
    required_env = ["OPENAI_API_KEY", "STRIPE_API_KEY"]
    missing_env = [env for env in required_env if not os.getenv(env)]

    # 3. Varredura de Órfãos / Estrutura
    print("[3/4] Mapeando estrutura de pastas...")
    has_agents_dir = AGENTS_DIR.exists()
    
    # Exibição do Relatório Final
    print("\n========================================")
    print("           MFRGS CORE AUDIT             ")
    print("========================================")
    print(f"Arquivos Python analisados: {total_files}")
    print(f"✓ Imports OK: {ok_imports}")
    print(f"❌ Imports Quebrados / Erros de Init: {len(broken_imports)}")
    
    if broken_imports:
        print("\n--- DETALHES DOS ERROS DE IMPORTAÇÃO ---")
        for mod, err in broken_imports:
            print(f"❌ {mod}")
            print(f"   Motivo: {err}\n")
            
    print(f"Variáveis .env ausentes: {len(missing_env)}")
    if missing_env:
        for env in missing_env:
            print(f"⚠ Ausente: {env}")
            
    print("\n----------------------------------------")
    status = "NÃO OPERACIONAL" if broken_imports or missing_env else "OPERACIONAL"
    print(f"Status geral: {status}")
    print("========================================")

if __name__ == "__main__":
    run_audit()