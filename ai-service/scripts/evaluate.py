import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.dataset import ROOT
from autoparts_ai.evaluation import evaluate

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=Path, default=ROOT / "artifacts/models/best.pt")
    parser.add_argument("--manifest", type=Path, default=ROOT / "artifacts/dataset.json")
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()
    metrics = evaluate(args.weights, args.manifest, args.device)
    print(json.dumps({k: v for k, v in metrics.items() if k not in {"confusion_matrix", "per_class"}}, indent=2))
