import ast
from pathlib import Path

class StructureAuditor:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir

    def run(self):
        python_files = [f for f in self.root_dir.glob("**/*.py") if "venv" not in f.parts and ".git" not in f.parts and "tools" not in f.parts]
        
        all_modules = {f.stem for f in python_files}
        imported_modules = set()

        for file_path in python_files:
            if file_path.name in ("main.py", "__init__.py"):
                continue
            try:
                tree = ast.parse(file_path.read_text(encoding='utf-8'))
            except SyntaxError:
                continue

            for node in ast.walk(tree):
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    if isinstance(node, ast.Import):
                        for n in node.names:
                            imported_modules.add(n.name.split('.')[0])
                    elif node.module:
                        imported_modules.add(node.module.split('.')[0])

        orphans = [f.name for f in python_files if f.stem not in imported_modules and f.name not in ("main.py", "audit_mfrgs.py")]
        
        return {
            "total_files": len(python_files),
            "orphans": orphans
        }