import sys
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.dataset import download_dataset
from autoparts_ai.network import use_system_certificates

if __name__ == "__main__":
    use_system_certificates()
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-root", type=Path, help="Inspeccionar variante local explícita sin descargar")
    args = parser.parse_args()
    download_dataset(dataset_root=args.dataset_root)
