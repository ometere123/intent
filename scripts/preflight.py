"""Small repository preflight for the frozen INTENT contract/toolchain."""

from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "intent_guard.py"
CONFIG = ROOT / "gltest.config.yaml"
EXPECTED_RUNNER = "1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6"


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    config = CONFIG.read_text(encoding="utf-8")
    if EXPECTED_RUNNER not in source:
        raise SystemExit("preflight: contract runner header is not the stable Studionet runner")
    if "default: studionet" not in config or "https://studio.genlayer.com/api" not in config:
        raise SystemExit("preflight: gltest configuration is not Studionet 61999")
    if re.search(r"61997|studio-dev\.genlayer\.com", source + config):
        raise SystemExit("preflight: Studio-dev configuration detected")
    files = [CONTRACT, *((ROOT / "tests" / "direct").rglob("*.py"))]
    subprocess.run([sys.executable, "-m", "py_compile", *(str(p) for p in files)], cwd=ROOT, check=True)
    print(f"preflight PASS: Studionet 61999, stable runner, {len(files)} Python files compiled")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
