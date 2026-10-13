"""Validate Colab artifacts before activating local inference weights."""
import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path
from .config import ROOT, Settings
from .inference import InferenceService
from .schemas import AnalysisInfo, ClassMetadata


def validate_artifacts(source):
    source = Path(source).resolve()
    required = ("best.pt", "model-info.json", "metrics.json", "dataset-summary.json")
    for name in required:
        if not (source / name).is_file():
            raise ValueError(f"Falta el artefacto {name}")
    info = json.loads((source / "model-info.json").read_text(encoding="utf-8"))
    metrics = json.loads((source / "metrics.json").read_text(encoding="utf-8"))
    dataset = json.loads((source / "dataset-summary.json").read_text(encoding="utf-8"))
    if info.get("model") != "YOLO11n-cls" or info.get("task") != "classification":
        raise ValueError("Se requiere un modelo entrenado YOLO11n-cls de clasificación")
    digest = hashlib.sha256((source / "best.pt").read_bytes()).hexdigest()
    if digest != info.get("weights_sha256"):
        raise ValueError("El SHA-256 de los pesos no coincide con model-info.json")
    AnalysisInfo.model_validate(info)
    classes = [ClassMetadata.model_validate(c) for c in info["classes"]]
    count = info["class_count"]
    if count != len(classes) or [c.id for c in classes] != list(range(count)):
        raise ValueError("Cantidad o identificadores de clases incoherentes")
    if dataset.get("class_count") != count or dataset.get("classes") != info["classes"]:
        raise ValueError("Clases del resumen y del modelo no coinciden")
    if info.get("dataset", {}).get("slug") != "gpiosenka/car-parts-40-classes":
        raise ValueError("El modelo no registra el dataset obligatorio")
    if info["metrics"] != metrics or metrics.get("split") != "test":
        raise ValueError("Las métricas deben coincidir y corresponder al conjunto test")
    if metrics.get("class_names") != [c.training_label for c in classes]:
        raise ValueError("Orden de clases de la evaluación incompatible")
    matrix = metrics.get("confusion_matrix", [])
    if len(matrix) != count or any(len(row) != count for row in matrix):
        raise ValueError("Dimensiones de matriz de confusión incompatibles")
    if any(isinstance(n, bool) or not isinstance(n, int) or n < 0 for row in matrix for n in row):
        raise ValueError("La matriz debe contener conteos enteros no negativos")
    samples = sum(sum(row) for row in matrix)
    if not samples or samples != metrics.get("sample_count"):
        raise ValueError("Cantidad de muestras no coincide con matriz de confusión")
    if samples != sum(c.image_counts.get("test", 0) for c in classes):
        raise ValueError("Conteos por clase no corresponden a la evaluación test")
    for key in ("top1_accuracy", "top5_accuracy", "macro_precision", "macro_recall", "macro_f1"):
        value = metrics.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError(f"Métrica inválida: {key}")
    if not math.isclose(sum(matrix[i][i] for i in range(count)) / samples, metrics["top1_accuracy"], abs_tol=1e-8):
        raise ValueError("Top-1 no coincide con la matriz de confusión")
    if metrics["top5_accuracy"] < metrics["top1_accuracy"]:
        raise ValueError("Top-5 no puede ser menor que Top-1")
    precision, recall, f1 = [], [], []
    for i in range(count):
        support = sum(matrix[i])
        predicted = sum(row[i] for row in matrix)
        if support != classes[i].image_counts.get("test", 0):
            raise ValueError("La matriz no coincide con las imágenes test de cada clase")
        p = matrix[i][i] / predicted if predicted else 0
        r = matrix[i][i] / support if support else 0
        precision.append(p)
        recall.append(r)
        f1.append(2 * p * r / (p + r) if p + r else 0)
    for name, values in (("macro_precision", precision), ("macro_recall", recall), ("macro_f1", f1)):
        if not math.isclose(sum(values) / count, metrics[name], abs_tol=1e-8):
            raise ValueError(f"{name} no coincide con la matriz de confusión")
    return info, dataset


def import_model(source, destination=ROOT / "artifacts/models"):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    info, dataset = validate_artifacts(source)
    # Loading is performed only after provenance, hash and metadata validation.
    service = InferenceService(Settings(weights=source / "best.pt", model_info=source / "model-info.json", _env_file=None))
    service.load()
    service.require_model()
    destination.mkdir(parents=True, exist_ok=True)
    active = destination / "best.pt"
    if active.exists() and hashlib.sha256(active.read_bytes()).hexdigest() != info["weights_sha256"]:
        raise ValueError("Ya existe otro modelo activo. Use un destino nuevo para revisarlo antes de sustituirlo.")
    for name in ("best.pt", "model-info.json", "metrics.json", "dataset-summary.json", "translations.json", "train-config.json", "environment.txt"):
        candidate = source / name
        if candidate.is_file() and candidate != destination / name:
            shutil.copy2(candidate, destination / name)
    # Preserve the complete locally downloaded manifest. Offline installations
    # can read classes directly from the copied model-info.json.
    record = {"imported_at": datetime.now(timezone.utc).isoformat(), "weights_sha256": info["weights_sha256"], "class_count": info["class_count"], "test_sample_count": info["metrics"]["sample_count"], "model_load_verified": True}
    (destination / "import-verification.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    return record
