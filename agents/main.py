import os
import logging
import sys
from dotenv import load_dotenv
from agents.guardian import guardian

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
        logging.error(
            "Missing required environment variables: %s", 
            ", ".join(missing)
        )
        sys.exit(1)

def start_application():
    load_dotenv()
    configure_logging()
    
    logging.info("=" * 60)
    logging.info("Starting MFRGS Digital Verification")
    logging.info("=" * 60)
    
    validate_environment()
    
    try:
        # Chamada corrigida: usa o objeto 'guardian' importado
        guardian.initialize_operation()
    except KeyboardInterrupt:
        logging.info("System stopped by user.")
    except Exception:
        logging.exception("Unexpected error during execution.")
        sys.exit(1)

if __name__ == "__main__":
    start_application()