from pathlib import Path
import sys

# ensure the project's "src" directory is on sys.path so `import src...` works in tests
src_dir = Path(__file__).resolve().parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))