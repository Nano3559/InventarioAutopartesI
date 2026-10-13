"""Read-only model evaluation on validation. Never train or alter test metrics."""
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.config import Settings
from autoparts_ai.dataset import ROOT, images, write_json
from autoparts_ai.inference import InferenceService
from autoparts_ai.thresholds import summarize_thresholds


def run(args):
    settings = Settings(_env_file=None, weights=args.weights, model_info=args.weights.parent / "model-info.json", dataset_metadata=args.manifest, device="cpu", torch_threads=2, confidence_threshold=0.70, high_confidence_threshold=0.90)
    service = InferenceService(settings)
    service.load()
    service.require_model()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if "val" not in manifest.get("splits", {}) or "path" not in manifest["splits"]["val"]:
        raise ValueError("Se requiere manifiesto local con ruta de validación real; no usar test.")
    validation = Path(manifest["splits"]["val"]["path"])
    if not validation.is_dir():
        raise ValueError("No existe la partición local de validación; descargar el dataset primero.")
    records = []
    image_size = service.info["training"]["parameters"].get("imgsz", 224)
    for entry in manifest["classes"]:
        class_id = entry["id"]
        if class_id not in service.classes or service.classes[class_id].training_label != entry["original_name"]:
            raise ValueError("Las clases del dataset no corresponden al modelo importado.")
        class_files = images(validation / entry["original_name"])
        for start in range(0, len(class_files), args.batch):
            outputs = service.model.predict(source=[str(path) for path in class_files[start:start + args.batch]], imgsz=image_size, device="cpu", verbose=False)
            for output in outputs:
                predicted = output.probs.top1
                records.append({"class_id": class_id, "predicted_id": predicted, "confidence": float(output.probs.data[predicted]), "correct": predicted == class_id})
    if len(records) != manifest["splits"]["val"]["image_count"]:
        raise ValueError("La cantidad real de imágenes de validación no coincide con el manifiesto.")
    thresholds = [round(0.50 + index * 0.05, 2) for index in range(10)]
    statistics = summarize_thresholds(records, thresholds, minimum_threshold=0.70, target_precision=args.target_precision, minimum_accepted=args.minimum_accepted)
    result = {
        "created_at": datetime.now(timezone.utc).isoformat(), "weights_sha256": hashlib.sha256(args.weights.read_bytes()).hexdigest(),
        "split": "val", "sample_count": len(records), "class_count": manifest["class_count"], "device": "cpu", "torch_threads": 2,
        "image_size": image_size, "current_thresholds": {"conclusive": 0.70, "high": 0.90},
        "recommendation_criteria": {"minimum_threshold": 0.70, "minimum_empirical_precision": args.target_precision, "minimum_accepted_count": args.minimum_accepted, "rule": "lowest_threshold_meeting_criteria", "reviewable": True},
        "limitations": ["Validación del mismo dataset; no mide imágenes fuera de distribución.", "El intervalo Wilson 95% refleja incertidumbre de muestreo; no garantiza precisión futura.", "Criterios de recomendación provisionales y revisables; no se modifican variables de entorno.", "Precisión entre aceptadas es proporción empírica de aciertos, no calibración de probabilidades."],
        **statistics,
    }
    write_json(args.output, result)
    print("Validación:", len(records), "imágenes | SHA-256:", result["weights_sha256"])
    print("umbral | aceptadas | cobertura | precisión entre aceptadas")
    for row in result["table"]:
        precision = row["empirical_precision_among_accepted"]
        print(f"{row['threshold']:.2f} | {row['accepted_count']} | {row['coverage']:.3f} | {precision if precision is not None else 'N/A'}")
    print("Umbral recomendado:", result["recommended_threshold"], "| Configuración sin modificar.")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=Path, default=ROOT / "artifacts/models/best.pt")
    parser.add_argument("--manifest", type=Path, default=ROOT / "artifacts/dataset.json")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/models/validation-thresholds.json")
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--target-precision", type=float, default=0.97)
    parser.add_argument("--minimum-accepted", type=int, default=50)
    args = parser.parse_args()
    if args.batch < 1 or args.minimum_accepted < 1 or not 0 < args.target_precision <= 1:
        parser.error("batch y minimum-accepted positivos; target-precision en (0,1].")
    run(args)
