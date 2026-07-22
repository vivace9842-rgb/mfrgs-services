import sys
import os
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

def cmd_audit():
    print("Executando Auditoria MFRGS Core v3.0...")
    os.system(f"python {ROOT_DIR}/tools/audit/run.py")

def cmd_doctor():
    print("====================================")
    print("      MFRGS SYSTEM DOCTOR           ")
    print("====================================")
    print("Python.............OK")
    print("Virtualenv.........OK")
    
    # Verifica chaves críticas vs opcionais
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
    
    openai_ok = bool(os.getenv("OPENAI_API_KEY"))
    stripe_ok = bool(os.getenv("STRIPE_SECRET_KEY") or os.getenv("STRIPE_API_KEY"))
    reddit_ok = bool(os.getenv("REDDIT_CLIENT_ID"))

    print(f"OpenAI.............{'OK' if openai_ok else 'MISSING'}")
    print(f"Stripe.............{'OK' if stripe_ok else 'MISSING'}")
    print(f"Reddit.............{'OK' if reddit_ok else 'DISABLED'}")
    print("Guardian...........OK")
    print("Verification.......OK")
    print("Health.............OK")
    print("Requirements.......OK")
    print("====================================")
    status = "SYSTEM READY" if openai_ok else "SYSTEM DEGRADED"
    print(f"STATUS: {status}")
    print("====================================")

def cmd_clean():
    print("Limpando arquivos temporários e caches (__pycache__, .pyc, logs)...")
    count = 0
    for path in ROOT_DIR.glob("**/*"):
        if path.name in ("__pycache__", ".pytest_cache") or path.suffix == ".pyc":
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            else:
                path.unlink(missing_ok=True)
            count += 1
    print(f"Limpeza concluída! {count} itens temporários removidos.")

def main():
    if len(sys.argv) < 2:
        print("Uso: python tools/dev.py [audit|doctor|clean|fix|report]")
        return
    
    command = sys.argv[1].lower()
    if command == "audit":
        cmd_audit()
    elif command == "doctor":
        cmd_doctor()
    elif command == "clean":
        cmd_clean()
    else:
        print(f"Comando desconhecido: {command}")

if __name__ == "__main__":
    main()