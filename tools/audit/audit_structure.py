from pathlib import Path

class StructureAuditor:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir

    def run(self):
        python_files = [f for f in self.root_dir.glob("**/*.py") if "venv" not in f.parts and ".git" not in f.parts and "tools" not in f.parts]
        
        categories = {
            "ENTRY POINTS": [],
            "CORE": [],
            "AGENTS": [],
            "UTILS": []
        }
        
        naming_warnings = []

        for f in python_files:
            name_str = f.name
            if ' ' in name_str or any(c.isupper() for c in f.stem):
                naming_warnings.append(name_str)

            if f.name in ("main.py", "run.py"):
                categories["ENTRY POINTS"].append(name_str)
            elif "guardian" in f.name.lower():
                categories["CORE"].append(name_str)
            elif "engine" in f.name.lower() or "agent" in str(f.parent).lower() or f.stem in ("cientista", "farejador"):
                categories["AGENTS"].append(name_str)
            else:
                categories["UTILS"].append(name_str)

        return {
            "total_files": len(python_files),
            "categories": categories,
            "naming_warnings": naming_warnings
        }
