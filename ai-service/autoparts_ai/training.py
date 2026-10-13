import csv
import hashlib
import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from .dataset import ROOT, download_dataset, prepare_dataset, write_json


def validate_config(config):
    permitted = {"model", "epochs", "patience", "imgsz", "batch", "device", "workers", "seed", "deterministic", "cache", "lr0", "optimizer", "dropout", "fraction"}
    unknown = set(config) - permitted
    if unknown:
        raise ValueError(f"Parámetros no permitidos: {sorted(unknown)}")
    for key in ("epochs", "imgsz"):
        if isinstance(config.get(key), bool) or not isinstance(config.get(key), int) or config[key] <= 0:
            raise ValueError(f"{key} debe ser entero positivo")
    if not isinstance(config.get("patience"), int) or config["patience"] < 0:
        raise ValueError("patience debe ser entero no negativo")
    batch = config.get("batch", 16)
    if isinstance(batch, bool) or not isinstance(batch, (int, float)) or not (batch == -1 or 0 < batch < 1 or isinstance(batch, int) and batch > 0):
        raise ValueError("batch debe ser entero positivo, -1 o fracción de memoria (0,1)")
    if config.get("model", "yolo11n-cls.pt") != "yolo11n-cls.pt":
        raise ValueError("Este módulo entrena YOLO11n-cls con pesos preentrenados yolo11n-cls.pt")
    return config


def train(config_path=ROOT / "config/train.json", manifest_path=ROOT / "artifacts/dataset.json"):
    import torch
    from ultralytics import YOLO
    manifest_path = Path(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else download_dataset(manifest_path)
    if "train" not in manifest["splits"] or "val" not in manifest["splits"]:
        raise ValueError("Se requieren train y val independientes; test nunca sustituye val")
    # Ultralytics only sees train/val: test is physically absent from this view.
    prepared = prepare_dataset(manifest, ROOT / "artifacts/training-data", splits={"train", "val"})
    config = validate_config(json.loads(Path(config_path).read_text(encoding="utf-8")))
    pretrained = config.pop("model", "yolo11n-cls.pt")
    if config.get("device", "auto") == "auto":
        config["device"] = 0 if torch.cuda.is_available() else "cpu"
    if config["device"] == "cpu" and (not isinstance(config.get("batch", 16), int) or config.get("batch", 16) < 1):
        config["batch"] = 16
    model = YOLO(pretrained, task="classify")
    best_snapshot = {}

    def remember_saved_best(trainer):
        # Ultralytics saves best.pt when current fitness equals best_fitness,
        # including ties. Recording that event survives checkpoint stripping.
        if trainer.fitness == trainer.best_fitness:
            best_snapshot.update(epoch=int(trainer.epoch) + 1, fitness=float(trainer.fitness), validation_metrics={key: float(value) for key, value in trainer.metrics.items()})

    model.add_callback("on_model_save", remember_saved_best)
    started = time.monotonic()
    model.train(data=str(prepared), project=str(ROOT / "artifacts/runs"), name="autoparts", **config)
    elapsed = time.monotonic() - started
    run = Path(model.trainer.save_dir)
    best = run / "weights/best.pt"
    if not best.is_file():
        raise RuntimeError("Entrenamiento terminó sin best.pt")
    best_model = YOLO(str(best), task="classify")
    names = [c["original_name"] for c in manifest["classes"]]
    if [best_model.names[i] for i in range(len(best_model.names))] != names:
        raise RuntimeError("Orden de clases del modelo no coincide con dataset")
    destination = ROOT / "artifacts/models"
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best, destination / "best.pt")
    rows = []
    if (run / "results.csv").exists():
        with (run / "results.csv").open(newline="") as stream:
            rows = [{k.strip(): v.strip() for k, v in row.items()} for row in csv.DictReader(stream)]
    info = {"model": "YOLO11n-cls", "task": "classification", "created_at": datetime.now(timezone.utc).isoformat(), "class_count": len(names), "classes": manifest["classes"], "dataset": manifest["source"], "validation_metrics": best_snapshot.get("validation_metrics"), "training": {"parameters": config, "pretrained_weights": pretrained, "duration_seconds": elapsed, "run_directory": str(run), "best_epoch": best_snapshot.get("epoch"), "best_fitness": best_snapshot.get("fitness"), "epoch_metrics": rows, "image_counts": {s: d["image_count"] for s, d in manifest["splits"].items()}, "cross_split_duplicate_count": len(manifest.get("cross_split_duplicate_content", []))}, "metrics": None, "weights_sha256": hashlib.sha256(best.read_bytes()).hexdigest()}
    write_json(destination / "model-info.json", info)
    print(f"Pesos reales guardados: {destination / 'best.pt'} ({elapsed:.1f}s). Ejecutar evaluate.py para métricas test.")
    return info
