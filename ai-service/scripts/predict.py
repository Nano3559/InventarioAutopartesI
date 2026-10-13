import argparse
import json
import mimetypes
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.config import Settings
from autoparts_ai.inference import InferenceService

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    service = InferenceService(Settings())
    service.load()
    result = service.predict(args.image.read_bytes(), mimetypes.guess_type(args.image)[0] or "")
    print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
