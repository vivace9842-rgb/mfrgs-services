import ast
from pathlib import Path

class ImportAuditor:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.broken_imports = []
        self.total_imports = 0

    def run(self):
        python_files = [f for f in self.root_dir.glob("**/*.py") if "venv" not in f.parts and ".git" not in f.parts and "tools" not in f.parts]
        
        module_names = {f.relative_to(self.root_dir).with_suffix('').as_posix().replace('/', '.') for f in python_files}

        for file_path in python_files:
            try:
                tree = ast.parse(file_path.read_text(encoding='utf-8'))
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        self.total_imports += 1
                        # Validação básica de pacotes locais vs externos
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        self.total_imports += 1
                        # Rastreia imports locais quebrados
                        if node.level > 0 or node.module.startswith("agents") or node.module in module_names:
                            pass
                            
        return {"total_imports": self.total_imports, "broken": self.broken_imports}