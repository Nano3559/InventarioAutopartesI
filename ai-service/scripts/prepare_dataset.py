import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.dataset import ROOT, prepare_dataset

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=ROOT / "artifacts/dataset.json")
    parser.add_argument("--destination", type=Path, default=ROOT / "artifacts/prepared")
    args = parser.parse_args()
    print(prepare_dataset(json.loads(args.manifest.read_text(encoding="utf-8")), args.destination))
