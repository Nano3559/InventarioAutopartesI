import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.dataset import ROOT
from autoparts_ai.training import train
from autoparts_ai.network import use_system_certificates

if __name__ == "__main__":
    use_system_certificates()
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "config/train.json")
    parser.add_argument("--manifest", type=Path, default=ROOT / "artifacts/dataset.json")
    args = parser.parse_args()
    train(args.config, args.manifest)
