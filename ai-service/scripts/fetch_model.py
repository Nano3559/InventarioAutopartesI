import json
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.config import ROOT
from autoparts_ai.model_fetch import fetch_model

if __name__ == "__main__":
    try:
        result = fetch_model(os.environ.get("AUTOPARTS_MODEL_ARCHIVE_URL", ""), os.environ.get("AUTOPARTS_MODEL_SHA256", ""), ROOT / "artifacts/models")
        print(json.dumps(result))
    except Exception:
        # Never print signed URLs, tokens, exception bodies or private metadata.
        print("No se pudo preparar el modelo: verificar URL HTTPS vigente, hash y artefactos del ZIP.", file=sys.stderr)
        sys.exit(1)
