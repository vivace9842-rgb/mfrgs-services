from pathlib import Path


class StructureAuditor:

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir

    def run(self):

        python_files = []

        categorized = {
            "Agents": [],
            "API": [],
            "Core": [],
            "Tools": [],
            "Tests": [],
            "Other": []
        }

        ignore = {
            ".git",
            "venv",
            "__pycache__",
            "node_modules"
        }

        for file in self.root_dir.glob("**/*.py"):

            if any(part in ignore for part in file.parts):
                continue

            python_files.append(file)

            rel = file.relative_to(self.root_dir).as_posix()

            if rel.startswith("agents/"):
                categorized["Agents"].append(rel)

            elif rel.startswith("api/"):
                categorized["API"].append(rel)

            elif rel.startswith("core/"):
                categorized["Core"].append(rel)

            elif rel.startswith("tools/"):
                categorized["Tools"].append(rel)

            elif rel.startswith("tests/"):
                categorized["Tests"].append(rel)

            else:
                categorized["Other"].append(rel)

        return {
            "python_files": len(python_files),
            "categorized": categorized
        }