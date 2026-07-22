import ast
import os
from pathlib import Path
from dotenv import load_dotenv


class EnvAuditor:

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir

    def run(self):

        load_dotenv()

        used_envs = set()

        python_files = [
            f for f in self.root_dir.glob("**/*.py")
            if "venv" not in f.parts
            and ".git" not in f.parts
            and "__pycache__" not in f.parts
            and "node_modules" not in f.parts
        ]

        for file_path in python_files:

            try:
                tree = ast.parse(file_path.read_text(encoding="utf-8"))
            except Exception:
                continue

            for node in ast.walk(tree):

                if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Attribute)
                    and node.func.attr in ("getenv", "get")
                    and node.args
                    and isinstance(node.args[0], ast.Constant)
                    and isinstance(node.args[0].value, str)
                ):
                    used_envs.add(node.args[0].value)

        missing = [
            env
            for env in sorted(used_envs)
            if not os.getenv(env)
        ]

        return {
            "used_envs": sorted(used_envs),
            "missing_required": missing,
            "missing_optional": []
        }