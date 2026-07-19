import logging

# Configuração básica de logging para exibir as saídas no terminal durante os testes
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Guardian:
    def __init__(self):
        self.agentes = {}

    def registrar_log(self, origem, mensagem):
        logging.info(f"[{origem}] {mensagem}")

    def registrar_agente(self, nome, agente):
        self.agentes[nome] = agente
        self.registrar_log("Guardian", f"Agente registrado: {nome}")

    def listar_agentes(self):
        return list(self.agentes.keys())

    def receber_evento(self, agente, evento):
        """
        Assinatura corrigida para aceitar o remetente (agente) e os dados enviados.
        Retorna o próximo passo lógico para o Farejador exibir no print.
        """
        self.registrar_log("Guardian", f"Evento recebido do agente [{agente}]: {evento}")
        
        # Lógica de roteamento simples para o teste: direciona o lead para o Cientista
        proximo_passo = "cientista"
        return proximo_passo

    def decidir_proximo_passo(self):
        pass

    def encaminhar(self):
        pass

    def solicitar_aprovacao(self):
        pass

    def obter_logs(self):
        pass

    # --- MÉTODO ADICIONADO PARA INTEGRAÇÃO COM O MAIN.PY ---
    def initialize_operation(self):
        """
        Ponto de entrada chamado pelo main.py.
        Inicia a orquestração da MFRGS Digital Verification.
        """
        self.registrar_log("Guardian", "Sistema orquestrador Guardian iniciado.")
        
        agentes_registrados = self.listar_agentes()
        if agentes_registrados:
            self.registrar_log("Guardian", f"Agentes online: {', '.join(agentes_registrados)}")
        else:
            self.registrar_log("Guardian", "Nenhum agente registrado no momento. Aguardando conexões.")
            
        logging.info("MFRGS Digital Verification: Guardian aguardando tarefas...")

# Instância única exportada para o resto do sistema
guardian = Guardian()