import hashlib
import io
import json
import logging
import warnings
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from .config import Settings
from .errors import ServiceError
from .schemas import AnalysisInfo, ClassMetadata, Prediction, PredictResponse

LOGGER = logging.getLogger(__name__)
FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def decode_image(content: bytes, declared_type: str, settings: Settings):
    if not content:
        raise ServiceError(400, "invalid_image", "Selecciona una imagen válida.")
    if len(content) > settings.max_image_bytes:
        raise ServiceError(413, "image_too_large", "La imagen supera el tamaño permitido.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as source:
                if source.format not in FORMATS or declared_type != FORMATS[source.format]:
                    raise ServiceError(400, "invalid_image", "Utiliza una imagen JPG, PNG o WebP válida.")
                if source.width * source.height > settings.max_image_pixels or getattr(source, "n_frames", 1) != 1:
                    raise ServiceError(400, "invalid_image", "Utiliza una fotografía estática de menor resolución.")
                source.verify()
            with Image.open(io.BytesIO(content)) as source:
                return ImageOps.exif_transpose(source).convert("RGB")
    except ServiceError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ServiceError(400, "invalid_image", "No se pudo leer la imagen seleccionada.") from exc


class InferenceService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = None
        self.info = None
        self.classes: dict[int, ClassMetadata] = {}
        self.device = "cpu"

    def load(self):
        # Never download pretrained weights or train from the API.
        if not self.settings.weights.is_file() or not self.settings.model_info.is_file():
            return
        try:
            import torch
            from ultralytics import YOLO
            torch.set_num_threads(self.settings.torch_threads)
            info = json.loads(self.settings.model_info.read_text(encoding="utf-8"))
            if info.get("task") != "classification" or info.get("model") != "YOLO11n-cls":
                raise ValueError("Modelo sin procedencia de entrenamiento compatible")
            digest = hashlib.sha256(self.settings.weights.read_bytes()).hexdigest()
            if info.get("weights_sha256") != digest:
                raise ValueError("Pesos no corresponden al manifiesto del modelo")
            model = YOLO(str(self.settings.weights), task="classify")
            classes = {c["id"]: ClassMetadata.model_validate(c) for c in info["classes"]}
            if model.task != "classify" or len(classes) != len(model.names) or any(classes[i].training_label != name for i, name in model.names.items()):
                raise ValueError("Clases del modelo no coinciden con metadatos")
            self.device = ("0" if torch.cuda.is_available() else "cpu") if self.settings.device == "auto" else self.settings.device
            self.model, self.info, self.classes = model, info, classes
        except Exception:
            LOGGER.exception("No se pudo cargar el modelo de autopartes")
            self.model = None

    def require_model(self):
        if self.model is None:
            raise ServiceError(503, "model_unavailable", "El modelo de reconocimiento todavía no está disponible.")

    def predict(self, content: bytes, content_type: str):
        self.require_model()
        image = decode_image(content, content_type, self.settings)
        try:
            results = self.model.predict(image, imgsz=self.info["training"]["parameters"].get("imgsz", 224), device=self.device, verbose=False)
            probabilities = results[0].probs.data.cpu().tolist()
            candidates = sorted(range(len(probabilities)), key=lambda i: probabilities[i], reverse=True)[:3]
            top = [Prediction(class_info=self.classes[i], confidence=probabilities[i]) for i in candidates]
            score = top[0].confidence
            state = "high" if score >= self.settings.high_confidence_threshold else "medium" if score >= self.settings.confidence_threshold else "low"
            return PredictResponse(prediction=top[0], top_predictions=top, confidence_state=state, conclusive=state != "low", thresholds={"conclusive": self.settings.confidence_threshold, "high": self.settings.high_confidence_threshold}, analysis=AnalysisInfo.model_validate(self.info))
        except ServiceError:
            raise
        except Exception as exc:
            LOGGER.exception("Falló la inferencia de autopartes")
            raise ServiceError(500, "processing_error", "No se pudo analizar la imagen. Intenta nuevamente.") from exc

    def public_info(self):
        if self.info is None:
            self.require_model()
        # Keep training paths and original cache paths internal.
        result = AnalysisInfo.model_validate(self.info).model_dump()
        result["dataset"] = {k: v for k, v in result["dataset"].items() if k in {"slug", "url", "version", "license"}}
        return result

    def dataset_classes(self):
        if self.classes:
            return list(self.classes.values())
        path: Path = self.settings.dataset_metadata
        if not path.is_file():
            raise ServiceError(503, "metadata_unavailable", "Los metadatos del dataset todavía no están disponibles.")
        try:
            return [ClassMetadata.model_validate(c) for c in json.loads(path.read_text(encoding="utf-8"))["classes"]]
        except (OSError, ValueError, KeyError) as exc:
            raise ServiceError(503, "metadata_unavailable", "Los metadatos del dataset todavía no están disponibles.") from exc
