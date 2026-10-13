"""Evaluate only after training, using the preserved holdout test set."""
import hashlib
import json
from pathlib import Path
from .dataset import ROOT, images, write_json


def evaluate(weights=ROOT / "artifacts/models/best.pt", manifest_path=ROOT / "artifacts/dataset.json", device="cpu"):
    from ultralytics import YOLO
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    if "test" not in manifest["splits"]:
        raise ValueError("Dataset sin test separado: no se inventan métricas de prueba.")
    model = YOLO(str(weights), task="classify")
    info_path = Path(weights).parent / "model-info.json"
    info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {"classes": manifest["classes"], "dataset": manifest["source"], "model": "YOLO11n-cls"}
    image_size = info.get("training", {}).get("parameters", {}).get("imgsz", 224)
    names = [c["original_name"] for c in manifest["classes"]]
    if [model.names[i] for i in range(len(model.names))] != names:
        raise ValueError("IDs del modelo no corresponden a las clases del manifiesto")
    truth, predictions, top5 = [], [], []
    test = Path(manifest["splits"]["test"]["path"])
    for class_id, name in enumerate(names):
        files = images(test / name)
        for start in range(0, len(files), 16):
            results = model.predict(source=[str(p) for p in files[start:start + 16]], imgsz=image_size, device=device, verbose=False)
            for result in results:
                truth.append(class_id)
                predictions.append(result.probs.top1)
                top5.append(class_id in result.probs.top5)
    precision, recall, f1, _ = precision_recall_fscore_support(truth, predictions, average="macro", zero_division=0)
    duplicates = manifest.get("cross_split_duplicate_content", [])
    metrics = {"split": "test", "sample_count": len(truth), "top1_accuracy": float(accuracy_score(truth, predictions)), "top5_accuracy": sum(top5) / len(top5), "macro_precision": float(precision), "macro_recall": float(recall), "macro_f1": float(f1), "confusion_matrix": confusion_matrix(truth, predictions, labels=list(range(len(names)))).tolist(), "class_names": names, "per_class": classification_report(truth, predictions, labels=list(range(len(names))), target_names=names, output_dict=True, zero_division=0), "data_quality": {"cross_split_duplicate_count": len(duplicates), "holdout_independence_verified": not duplicates, "warning": "Existen imágenes idénticas entre particiones: estas métricas pueden sobreestimar generalización." if duplicates else None}}
    info.update(metrics=metrics, weights_sha256=hashlib.sha256(Path(weights).read_bytes()).hexdigest())
    write_json(info_path, info)
    write_json(Path(weights).parent / "metrics.json", metrics)
    return metrics
