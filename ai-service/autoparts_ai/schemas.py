from typing import Any, Literal
from pydantic import BaseModel, Field


class ClassMetadata(BaseModel):
    id: int
    original_name: str
    training_label: str
    spanish_name: str | None = None
    translation_source: str | None = None
    image_counts: dict[str, int] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Prediction(BaseModel):
    class_info: ClassMetadata
    confidence: float = Field(ge=0, le=1)


class AnalysisInfo(BaseModel):
    model: str
    dataset: dict[str, Any]
    class_count: int
    created_at: str | None = None
    weights_sha256: str
    metrics: dict[str, Any] | None = None


class PredictResponse(BaseModel):
    prediction: Prediction
    top_predictions: list[Prediction]
    confidence_state: Literal["high", "medium", "low"]
    conclusive: bool
    thresholds: dict[str, float]
    analysis: AnalysisInfo


class HealthResponse(BaseModel):
    status: Literal["ok", "model_unavailable"]
    model_available: bool
