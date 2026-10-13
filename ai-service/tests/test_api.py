import io
import json
from pathlib import Path
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from autoparts_ai.api import create_app
from autoparts_ai.config import Settings
from autoparts_ai.errors import ServiceError
from autoparts_ai.inference import InferenceService, decode_image


def image_bytes(format="PNG"):
    stream = io.BytesIO()
    Image.new("RGB", (16, 16), "red").save(stream, format=format)
    return stream.getvalue()


@pytest.fixture
def settings(tmp_path):
    return Settings(weights=tmp_path / "missing.pt", model_info=tmp_path / "missing.json", dataset_metadata=tmp_path / "dataset.json", api_key="test-secret", _env_file=None)


def test_unavailable_health_and_prediction(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").status_code == 401
        assert client.get("/health", headers={"X-API-Key": "test-secret"}).json() == {"status": "model_unavailable", "model_available": False}
        response = client.post("/predict", files={"file": ("part.png", image_bytes(), "image/png")}, headers={"X-API-Key": "test-secret"})
        assert response.status_code == 503
        assert response.json()["code"] == "model_unavailable"
        assert client.get("/model/info", headers={"X-API-Key": "test-secret"}).status_code == 503


@pytest.mark.parametrize("content,mime", [(b"not-image", "image/png"), (image_bytes(), "image/jpeg"), (b"", "image/png")])
def test_invalid_images(settings, content, mime):
    with pytest.raises(ServiceError) as error:
        decode_image(content, mime, settings)
    assert error.value.status == 400


@pytest.mark.parametrize("format,mime", [("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")])
def test_supported_real_formats(settings, format, mime):
    assert decode_image(image_bytes(format), mime, settings).mode == "RGB"


def test_size_and_pixels(settings):
    settings.max_image_bytes = 4
    with pytest.raises(ServiceError) as error:
        decode_image(image_bytes(), "image/png", settings)
    assert error.value.status == 413
    settings.max_image_bytes = 10000
    settings.max_image_pixels = 10
    with pytest.raises(ServiceError):
        decode_image(image_bytes(), "image/png", settings)


def test_multipart_limit_before_parsing(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post("/predict", headers={"X-API-Key": "test-secret", "Content-Length": str(settings.max_image_bytes + 65537)}, content=b"x")
        assert response.status_code == 413


def test_dataset_metadata_without_trained_model(settings):
    metadata = {"classes": [{"id": 0, "original_name": "fixture part", "training_label": "fixture part", "image_counts": {"train": 1}}]}
    settings.dataset_metadata.write_text(json.dumps(metadata))
    with TestClient(create_app(settings)) as client:
        response = client.get("/classes", headers={"X-API-Key": "test-secret"})
        assert response.status_code == 200
        assert response.json()[0]["original_name"] == "fixture part"


def test_incompatible_checkpoint_never_becomes_available(settings):
    settings.weights.write_bytes(b"explicit invalid checkpoint fixture")
    settings.model_info.write_text(json.dumps({"task": "classification", "model": "YOLO11n-cls", "weights_sha256": "incorrect"}))
    service = InferenceService(settings)
    service.load()
    assert service.model is None
    with pytest.raises(ServiceError) as error:
        service.require_model()
    assert error.value.status == 503


def test_low_confidence_top_three_contract(settings):
    # Explicit inference double: tests the adapter, never shipped as a prediction.
    service = InferenceService(settings)
    from autoparts_ai.schemas import ClassMetadata
    service.classes = {i: ClassMetadata(id=i, original_name=f"fixture{i}", training_label=f"fixture{i}") for i in range(4)}
    service.info = {"model": "YOLO11n-cls", "class_count": 4, "dataset": {"slug": "fixture"}, "weights_sha256": "fixture-hash", "training": {"parameters": {"imgsz": 224}}}
    probabilities = Mock()
    probabilities.data.cpu.return_value.tolist.return_value = [0.4, 0.3, 0.2, 0.1]
    result = Mock(probs=probabilities)
    service.model = Mock()
    service.model.predict.return_value = [result]
    response = service.predict(image_bytes(), "image/png")
    assert response.confidence_state == "low"
    assert not response.conclusive
    assert len(response.top_predictions) == 3
    assert response.prediction.class_info.id == 0


def test_timeout_keeps_worker_busy_until_completion(settings):
    import time
    settings.inference_timeout_seconds = 0.01
    service = InferenceService(settings)
    service.load = Mock()
    service.model = Mock()
    def slow(*args):
        time.sleep(0.15)
        raise ServiceError(500, "test", "Test double")
    service.predict = slow
    with TestClient(create_app(settings, service)) as client:
        headers = {"X-API-Key": "test-secret"}
        files = {"file": ("part.png", image_bytes(), "image/png")}
        assert client.post("/predict", files=files, headers=headers).status_code == 504
        assert client.post("/predict", files=files, headers=headers).status_code == 429
        time.sleep(0.2)
        assert client.post("/predict", files=files, headers=headers).status_code == 504
