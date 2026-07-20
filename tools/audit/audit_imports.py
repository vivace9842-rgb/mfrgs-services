import ast
from pathlib import Path

class ImportAuditor:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.broken_imports = []
        self.total_imports = 0

    def run(self):
        python_files = [f for f in self.root_dir.glob("**/*.py") if "venv" not in f.parts and ".git" not in f.parts and "tools" not in f.parts]
        for file_path in python_files:
            try:
                tree = ast.parse(file_path.read_text(encoding='utf-8'))
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        self.total_imports += 1
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        self.total_imports += 1
        return {"total_imports": self.total_imports, "broken": self.broken_imports}
