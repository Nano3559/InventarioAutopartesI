"""Independent autopart classification service; no database access."""
import os
from pathlib import Path

# Keep third-party caches within this independent project. Never repurpose HOME.
os.environ.setdefault("YOLO_CONFIG_DIR", str(Path(__file__).resolve().parents[1] / "artifacts/ultralytics"))
os.environ.setdefault("KAGGLEHUB_CACHE", str(Path(__file__).resolve().parents[1] / "artifacts/kaggle-cache"))
