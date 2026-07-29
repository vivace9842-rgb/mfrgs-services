"""
===========================================================
MFRGS DIGITAL VERIFICATION
AGENTE - DELIVERY ENGINE
Version: 1.2 - Ajuste de Persistência JSON e Caminho Completo
===========================================================

Responsabilidade:
• Receber o relatório validado
• Gerar o arquivo JSON executivo estruturado
• Tratar erros de gravação com segurança
• Devolver confirmação e caminho ao Guardian

Nunca executa a verificação da OpenAI.
Nunca altera o banco de dados diretamente.
"""

import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class DeliveryEngine:
    def __init__(self, output_dir=None):
        self.output_dir = output_dir or os.path.join(
            BASE_DIR,
            "reports"
        )
        os.makedirs(self.output_dir, exist_ok=True)

    def executar(self, evento, callback_log=None):
        """
        Executa o processo de entrega e salvamento do relatório estruturado.
        
        Args:
            evento (dict): Contém os dados da empresa e o resultado do relatório.
            callback_log (callable, optional): Função de log injetada pelo Guardian.
        """
        def log(origem, mensagem):
            if callback_log:
                callback_log(origem, mensagem)
            else:
                print(f"[{origem}] {mensagem}")

        log("Delivery Engine", "Iniciando processo de entrega e salvamento de relatório...")

        empresa_nome = evento.get("empresa", "Empresa Desconhecida")
        resultado_json_str = evento.get("resultado", "{}")

        # Tenta converter o resultado para dicionário se for string
        if isinstance(resultado_json_str, str):
            try:
                dados_relatorio = json.loads(resultado_json_str)
            except Exception:
                dados_relatorio = {"summary": resultado_json_str}
        else:
            dados_relatorio = resultado_json_str

        # Definição do nome do arquivo JSON e caminho absoluto seguro
        nome_arquivo_seguro = "".join(c for c in empresa_nome if c.isalnum() or c.isspace()).rstrip().replace(" ", "_")
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        json_filename = f"MFRGS_Verification_{nome_arquivo_seguro}_{timestamp_str}.json"
        json_path = os.path.join(self.output_dir, json_filename)

        log("Delivery Engine", f"Salvando relatório executivo em: {json_path}")
        
        try:
            with open(json_path, "w", encoding="utf8") as f:
                json.dump(dados_relatorio, f, indent=4, ensure_ascii=False)
        except Exception as e:
            log("Delivery Engine", str(e))

            return {
                "tipo": "erro",
                "empresa": empresa_nome,
                "status": "erro",
                "mensagem": str(e)
            }

        log("Delivery Engine", "Entrega processada com sucesso.")

        return {
            "tipo": "entrega_concluida",
            "empresa": empresa_nome,
            "status": "sucesso",
            "arquivo": json_filename,
            "caminho": json_path
        }

# Instância exportada para uso modular ou função direta
engine_instance = DeliveryEngine()

def executar(evento, callback_log=None):
    return engine_instance.executar(evento, callback_log)


# --- BLOCO DE TESTE LOCAL ---
if __name__ == "__main__":
    print("📦 Testando Delivery Engine isoladamente...")
    
    evento_teste = {
        "empresa": "Shenzhen Global Logistics Co.",
        "resultado": json.dumps({
            "company": "Shenzhen Global Logistics Co.",
            "risk": "HIGH",
            "summary": "Inconsistências críticas detectadas.",
            "findings": ["Domínio recente", "Registro divergente"]
        }, ensure_ascii=False)
    }
    
    res = executar(evento_teste)
    print("\n--- RESULTADO DA ENTREGA ---")
    print(json.dumps(res, indent=4, ensure_ascii=False))