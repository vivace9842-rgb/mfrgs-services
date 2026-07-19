import os
import logging
import sys
import importlib
from dotenv import load_dotenv

# Ajuste para garantir que o Python mapeie os caminhos corretamente rodando de dentro de /agents
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from guardian import guardian

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )

def validate_environment():
    required = [
        "MFRGS_LANDING_PAGE",
        "OPENAI_API_KEY",
    ]
    missing = [var for var in required if not os.getenv(var)]
    
    if missing:
        logging.warning(
            "⚠️ Variáveis de ambiente ausentes para Produção: %s", 
            ", ".join(missing)
        )
        logging.info("⚙️ Ativando variáveis temporárias para execução de MOCK LOCAL...")
        
        if "MFRGS_LANDING_PAGE" in missing:
            os.environ["MFRGS_LANDING_PAGE"] = "https://mfrgs-services.vercel.app/"
        if "OPENAI_API_KEY" in missing:
            os.environ["OPENAI_API_KEY"] = "mock-key-para-teste-local"

def load_agents():
    """
    Importa os scripts dos agentes usando importlib para lidar com nomes com espaços.
    """
    logging.info("🔌 Conectando agentes ao ecossistema...")
    
    agentes_para_carregar = [
        "farejador",
        "cientista",
        "convertedor",
        "Delivery Engine",
        "Health Monitor",
        "Verification Engine",
        "Market Intelligence"
    ]
    
    for nome in agentes_para_carregar:
        try:
            importlib.import_module(nome)
            logging.info(f"✅ Agente '{nome}' registrado com sucesso.")
        except ImportError as e:
            logging.error(f"❌ Erro ao carregar o agente '{nome}': {e}")

def start_application():
    load_dotenv()
    configure_logging()
    
    logging.info("=" * 60)
    logging.info("Starting MFRGS Digital Verification")
    logging.info("=" * 60)
    
    validate_environment()
    
    # Carrega e registra a inteligência de todos os agentes antes de iniciar
    load_agents()
    
    try:
        guardian.initialize_operation()
    except KeyboardInterrupt:
        logging.info("System stopped by user.")
    except Exception:
        logging.exception("Unexpected error during execution.")
        sys.exit(1)

if __name__ == "__main__":
    start_application()