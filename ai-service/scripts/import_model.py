import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.model_import import import_model

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verifica e importa los artefactos extraídos de Colab")
    parser.add_argument("--source-dir", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(import_model(args.source_dir), indent=2, ensure_ascii=False))
