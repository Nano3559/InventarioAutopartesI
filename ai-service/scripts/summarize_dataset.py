"""Publish a small verified manifest, excluding local paths and CSV image rows."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.dataset import ROOT, write_json

if __name__ == "__main__":
    manifest = json.loads((ROOT / "artifacts/dataset.json").read_text(encoding="utf-8"))
    source = manifest["source"]
    summary = {
        "schema_version": 1,
        "source": {key: source.get(key) for key in ("slug", "url", "version", "license", "license_files", "selection_rule", "variants")},
        "selected_variant": Path(source["selected_path"]).name,
        "class_count": manifest["class_count"], "total_images": manifest["total_images"],
        "splits": {split: {"image_count": details["image_count"]} for split, details in manifest["splits"].items()},
        "classes": manifest["classes"],
        "csv_metadata": [{key: table[key] for key in ("file", "columns", "row_count")} for table in manifest["csv_metadata"]],
        "original_files": manifest["original_files"],
        "cross_split_duplicate_count": len(manifest["cross_split_duplicate_content"]),
        "reference_images_published": False,
        "license_note": "No se encontró archivo de licencia en la descarga; pendiente verificar en Kaggle antes de redistribuir imágenes.",
        "translations_note": "Traducciones manuales revisables, externas a los metadatos originales.",
    }
    write_json(ROOT / "config/dataset-summary.json", summary)
    print(json.dumps({key: value for key, value in summary.items() if key not in {"classes"}}, ensure_ascii=False, indent=2))
