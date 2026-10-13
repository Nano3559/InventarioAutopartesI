import hashlib
import json
import pytest
from autoparts_ai.model_import import validate_artifacts


@pytest.fixture
def export(tmp_path):
    # Explicit manifest fixture: no valid model weights and never used by API.
    weights = b"model-import-unit-test-fixture"
    (tmp_path / "best.pt").write_bytes(weights)
    classes = [{"id": 0, "original_name": "fixture", "training_label": "fixture", "image_counts": {"test": 5}, "metadata": {}}]
    metrics = {"split": "test", "sample_count": 5, "class_names": ["fixture"], "confusion_matrix": [[5]], "top1_accuracy": 1.0, "top5_accuracy": 1.0, "macro_precision": 1.0, "macro_recall": 1.0, "macro_f1": 1.0}
    info = {"model": "YOLO11n-cls", "task": "classification", "class_count": 1, "classes": classes, "dataset": {"slug": "gpiosenka/car-parts-40-classes"}, "weights_sha256": hashlib.sha256(weights).hexdigest(), "metrics": metrics}
    for name, value in {"model-info.json": info, "metrics.json": metrics, "dataset-summary.json": {"class_count": 1, "classes": classes}}.items():
        (tmp_path / name).write_text(json.dumps(value), encoding="utf-8")
    return tmp_path


def test_consistent_colab_metadata(export):
    info, _ = validate_artifacts(export)
    assert info["class_count"] == 1


def test_modified_weights_rejected_before_loading(export):
    (export / "best.pt").write_bytes(b"changed")
    with pytest.raises(ValueError, match="SHA-256"):
        validate_artifacts(export)


def test_matrix_must_match_reported_accuracy(export):
    for name in ("model-info.json", "metrics.json"):
        path = export / name
        value = json.loads(path.read_text())
        metrics = value["metrics"] if name == "model-info.json" else value
        metrics["top1_accuracy"] = 0.8
        path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="Top-1"):
        validate_artifacts(export)


def test_dataset_classes_must_match(export):
    path = export / "dataset-summary.json"
    value = json.loads(path.read_text())
    value["classes"][0]["id"] = 1
    path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="Clases"):
        validate_artifacts(export)


def test_macro_metrics_must_match_matrix(export):
    for name in ("model-info.json", "metrics.json"):
        path = export / name
        value = json.loads(path.read_text())
        metrics = value["metrics"] if name == "model-info.json" else value
        metrics["macro_f1"] = 0.5
        path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="macro_f1"):
        validate_artifacts(export)
