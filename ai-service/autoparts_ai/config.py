from pathlib import Path
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AUTOPARTS_", env_file=ROOT / ".env", extra="ignore")
    weights: Path = ROOT / "artifacts/models/best.pt"
    model_info: Path = ROOT / "artifacts/models/model-info.json"
    dataset_metadata: Path = ROOT / "artifacts/dataset.json"
    api_key: str = ""
    confidence_threshold: float = Field(default=0.70, gt=0, lt=1)
    high_confidence_threshold: float = Field(default=0.90, gt=0, lt=1)
    max_image_bytes: int = Field(default=10485760, gt=0)
    max_image_pixels: int = Field(default=20000000, gt=0)
    inference_timeout_seconds: float = Field(default=25, gt=0)
    torch_threads: int = Field(default=2, ge=1, le=32)
    device: str = "auto"

    @model_validator(mode="after")
    def thresholds(self):
        if self.high_confidence_threshold < self.confidence_threshold:
            raise ValueError("El umbral alto debe ser mayor o igual al umbral concluyente")
        return self
