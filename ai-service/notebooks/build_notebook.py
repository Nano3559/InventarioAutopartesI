"""Rebuild the self-contained Colab notebook from the audited local ML modules."""
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def markdown(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.splitlines(keepends=True)}


def code(text):
    ast.parse(text)
    return {"cell_type": "code", "metadata": {}, "source": text.splitlines(keepends=True), "execution_count": None, "outputs": []}


embedded = {}
for relative in ("autoparts_ai/dataset.py", "autoparts_ai/training.py", "autoparts_ai/evaluation.py", "config/translations.json", "scripts/summarize_dataset.py"):
    embedded[relative] = (ROOT / relative).read_text(encoding="utf-8")
embedded["autoparts_ai/__init__.py"] = ""
config = json.loads((ROOT / "config/train.json").read_text(encoding="utf-8"))
config.update(device=0, batch=-1, workers=2)
embedded["config/train.json"] = json.dumps(config, indent=2)

cells = [
    markdown("""# Entrenar reconocimiento de autopartes en Google Colab

Notebook autocontenido: incluye los módulos auditados del proyecto. No necesita subir el repositorio ni ejecutar NestJS/FastAPI. Descarga el dataset original con KaggleHub, entrena **YOLO11n-cls** y exporta los pesos y métricas reales.

1. Abre este archivo en [Google Colab](https://colab.research.google.com/).
2. Selecciona **Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU** (T4 es suficiente como punto inicial).
3. Ejecuta las celdas en orden. La GPU gratuita depende de la disponibilidad de tu cuenta.
4. Descarga el ZIP final y compártelo para integrarlo en el servicio local.

No se incluyen resultados previos. Los valores que aparezcan se obtendrán de tu ejecución. El test se evalúa **después** de seleccionar pesos mediante validación; no ajustes parámetros mirando test. La confianza de una predicción no garantiza una identificación correcta.

Referencias: [dataset Kaggle](https://www.kaggle.com/datasets/gpiosenka/car-parts-40-classes), [clasificación Ultralytics](https://docs.ultralytics.com/tasks/classify/), [YOLO11](https://docs.ultralytics.com/models/yolo11/)."""),
    markdown("""## 1. Comprobar la GPU existente

Esta celda utiliza PyTorch preinstalado por Colab; no lo reinstala. Si no hay GPU disponible, cambia el entorno antes de continuar."""),
    code('''import subprocess
import torch

print("PyTorch:", torch.__version__)
print("CUDA PyTorch:", torch.version.cuda)
if not torch.cuda.is_available():
    raise RuntimeError("No hay GPU CUDA. En Colab selecciona Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU y vuelve a ejecutar.")
print("GPU:", torch.cuda.get_device_name(0))
print("Memoria GPU (GiB):", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2))
subprocess.run(["nvidia-smi"], check=True)
'''),
    markdown("""## 2. Instalar únicamente dependencias de entrenamiento

El resolvedor conserva torch/torchvision existentes si son compatibles. Si informa una incompatibilidad, reinicia con un entorno Colab actualizado; no continúes con un runtime parcialmente instalado."""),
    code('''import sys
from pathlib import Path
from importlib.metadata import version
constraints = Path("/content/colab-existing-torch.txt")
constraints.write_text("torch==" + version("torch") + "\\ntorchvision==" + version("torchvision") + "\\n", encoding="utf-8")
subprocess.run([sys.executable, "-m", "pip", "install", "-c", str(constraints), "ultralytics>=8.3,<9", "kagglehub>=0.3,<1", "Pillow>=11,<13", "scikit-learn>=1.5,<2"], check=True)
import torchvision
print("torchvision:", torchvision.__version__)
if not torch.cuda.is_available():
    raise RuntimeError("CUDA dejó de estar disponible: reinicia un runtime GPU y revisa las dependencias.")
'''),
    markdown("""## 3. Crear los módulos del proyecto y revisar parámetros

Se escriben los módulos embebidos en `/content/autoparts-ai`. Los parámetros iniciales son **15 épocas, 224×224, patience 4 y batch automático GPU**. Puedes cambiar `epochs`, `patience`, `imgsz` o `batch` antes de entrenar. Si falta memoria, usa un batch entero menor, por ejemplo 16, 8 o 4. `workers=2` limita procesos de carga.

Las traducciones al español son un mapa manual revisable; no son descripciones originales del dataset."""),
    code('''import json
from pathlib import Path

WORK = Path("/content/autoparts-ai")
EMBEDDED = ''' + repr(embedded) + '''
for relative, contents in EMBEDDED.items():
    target = WORK / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(contents, encoding="utf-8")
sys.path.insert(0, str(WORK))
CONFIG_PATH = WORK / "config/train.json"
TRAIN_CONFIG = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
# Edita aquí antes de entrenar, por ejemplo: TRAIN_CONFIG["batch"] = 16
CONFIG_PATH.write_text(json.dumps(TRAIN_CONFIG, indent=2), encoding="utf-8")
print(json.dumps(TRAIN_CONFIG, indent=2))
'''),
    markdown("""## 4. Descargar e inspeccionar el dataset real

KaggleHub reutiliza su caché. Si Kaggle solicita autenticación, usa `kagglehub.login()` en una celda aparte y su diálogo; nunca pegues claves en este notebook ni en los artefactos.

El código comprueba variantes, clases, imágenes, CSV y particiones. Selecciona la variante coherente con más clases sin mezclar sus conjuntos. El conteo procede de los archivos descargados, no de la URL. No publica imágenes de referencia si la licencia no está verificada."""),
    code('''from autoparts_ai.dataset import download_dataset

manifest = download_dataset()
print("Versión observable:", manifest["source"]["version"])
print("Variantes:", manifest["source"]["variants"])
print("Clases verificadas:", manifest["class_count"])
print("Imágenes por partición:", {s: d["image_count"] for s, d in manifest["splits"].items()})
print("Duplicados entre particiones:", len(manifest["cross_split_duplicate_content"]))
print("Licencia local disponible:", manifest["source"]["license"])
for entry in manifest["classes"]:
    print(entry["id"], entry["original_name"], "→", entry["spanish_name"], entry["image_counts"])
'''),
    markdown("""## 5. Entrenar con train y validación

El entrenador ve una carpeta que contiene físicamente **solo train y val**. Test permanece fuera. Se guarda `best.pt` por fitness de validación junto con la época real del checkpoint y métricas de validación.

La celda puede tardar varios minutos. Su duración depende de la GPU. No cierres Colab durante el proceso. No afirma éxito hasta comprobar que existen pesos."""),
    code('''from autoparts_ai.training import train

training_info = train(CONFIG_PATH)
WEIGHTS = WORK / "artifacts/models/best.pt"
if not WEIGHTS.is_file() or WEIGHTS.stat().st_size == 0:
    raise RuntimeError("No se generaron pesos entrenados.")
print("Mejor época:", training_info["training"]["best_epoch"])
print("Segundos de entrenamiento:", training_info["training"]["duration_seconds"])
print("Métricas validación:", training_info["validation_metrics"])
'''),
    markdown("""## 6. Evaluar una sola vez sobre test

Esta evaluación ocurre después del entrenamiento. Produce Top-1, Top-5, precision/recall/F1 macro, matriz de confusión y métricas por clase. Si hay duplicados entre particiones, registra la advertencia. No uses estos resultados para escoger parámetros; para eso está validación."""),
    code('''from autoparts_ai.evaluation import evaluate

metrics = evaluate(WEIGHTS, WORK / "artifacts/dataset.json", device=0)
print(json.dumps({k: v for k, v in metrics.items() if k not in {"confusion_matrix", "per_class"}}, indent=2, ensure_ascii=False))
subprocess.run([sys.executable, str(WORK / "scripts/summarize_dataset.py")], check=True)
'''),
    markdown("""## 7. Probar una fotografía propia (opcional)

Deja `PROBAR_FOTO = False` para omitir. Si lo activas, sube una fotografía JPG, PNG o WebP. La imagen se procesa en memoria y no se añade al ZIP. Se muestran las tres clases más probables; sus porcentajes no garantizan identificación."""),
    code('''PROBAR_FOTO = False
if PROBAR_FOTO:
    import io
    from PIL import Image
    from ultralytics import YOLO
    from google.colab import files
    uploaded = files.upload()
    if len(uploaded) != 1:
        raise ValueError("Selecciona una sola fotografía.")
    filename, content = next(iter(uploaded.items()))
    if len(content) > 10 * 1024 * 1024:
        raise ValueError("Imagen demasiado grande: máximo 10 MiB.")
    with Image.open(io.BytesIO(content)) as raw:
        if raw.format not in {"JPEG", "PNG", "WEBP"} or raw.width * raw.height > 20_000_000:
            raise ValueError("Formato o dimensiones de imagen no permitidos.")
        photo = raw.convert("RGB")
    result = YOLO(str(WEIGHTS), task="classify").predict(photo, imgsz=TRAIN_CONFIG["imgsz"], device=0, verbose=False)[0]
    translations = json.loads((WORK / "config/translations.json").read_text(encoding="utf-8"))
    for class_id in result.probs.top5[:3]:
        original = result.names[class_id]
        print(translations.get(original, original), "|", original, "|", round(float(result.probs.data[class_id]) * 100, 2), "%")
    display(photo)
    # files.upload puede crear copia temporal en el directorio Colab: excluida del ZIP.
    del uploaded, content
'''),
    markdown("""## 8. Verificar y descargar artefactos reales

El ZIP incluye únicamente pesos, información del modelo, métricas, resumen de clases, traducciones, configuración y versiones de dependencias. No incluye dataset, imágenes, caché ni claves. Se comprueba SHA-256 y la existencia de métricas test antes de permitir la exportación.

Guarda el ZIP antes de que termine la sesión: el disco Colab es temporal. Compártelo para integrar los artefactos en `ai-service/artifacts/models/`. El umbral de confianza del servicio se ajusta posteriormente usando validación; no se infiere de un porcentaje aislado."""),
    code('''import hashlib
import math
import zipfile
from google.colab import files

MODELS = WORK / "artifacts/models"
info = json.loads((MODELS / "model-info.json").read_text(encoding="utf-8"))
saved_metrics = json.loads((MODELS / "metrics.json").read_text(encoding="utf-8"))
digest = hashlib.sha256(WEIGHTS.read_bytes()).hexdigest()
if digest != info.get("weights_sha256"):
    raise RuntimeError("SHA-256 de pesos no coincide con model-info.json.")
if saved_metrics.get("split") != "test" or saved_metrics.get("sample_count", 0) <= 0 or info.get("metrics") != saved_metrics:
    raise RuntimeError("Faltan métricas test reales y consistentes.")
for key in ("top1_accuracy", "top5_accuracy", "macro_precision", "macro_recall", "macro_f1"):
    value = saved_metrics.get(key)
    if not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise RuntimeError("Métrica inválida: " + key)
environment = subprocess.run([sys.executable, "-m", "pip", "freeze"], capture_output=True, text=True, check=True).stdout
EXPORT = WORK / "autoparts-colab-artifacts.zip"
entries = {
    "best.pt": WEIGHTS,
    "model-info.json": MODELS / "model-info.json",
    "metrics.json": MODELS / "metrics.json",
    "dataset-summary.json": WORK / "config/dataset-summary.json",
    "translations.json": WORK / "config/translations.json",
    "train-config.json": CONFIG_PATH,
}
for name, path in entries.items():
    if not path.is_file() or path.stat().st_size == 0:
        raise RuntimeError("Artefacto ausente: " + name)
with zipfile.ZipFile(EXPORT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for name, path in entries.items():
        archive.write(path, arcname=name)
    archive.writestr("environment.txt", environment)
print("ZIP:", EXPORT.name, "| MiB:", round(EXPORT.stat().st_size / 1024**2, 2))
print("SHA-256 best.pt:", digest)
print("Clases:", info["class_count"], "| Top-1 test:", saved_metrics["top1_accuracy"])
files.download(str(EXPORT))
'''),
    markdown("""## 9. Copia opcional a Google Drive

Esta celda no monta Drive automáticamente. Cambia `GUARDAR_EN_DRIVE` solo si deseas guardar una copia y autorizas el acceso mediante el diálogo de Google. El ZIP ya puede descargarse sin Drive."""),
    code('''GUARDAR_EN_DRIVE = False
if GUARDAR_EN_DRIVE:
    from google.colab import drive
    import shutil
    drive.mount("/content/drive")
    target = Path("/content/drive/MyDrive/autoparts-ai")
    target.mkdir(parents=True, exist_ok=True)
    shutil.copy2(EXPORT, target / EXPORT.name)
    print("Copia guardada:", target / EXPORT.name)
'''),
]

notebook = {
    "nbformat": 4, "nbformat_minor": 5,
    "metadata": {"colab": {"name": "train_autoparts_colab.ipynb", "provenance": []}, "kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}, "accelerator": "GPU"},
    "cells": cells,
}
for index, cell in enumerate(cells):
    cell["id"] = f"autoparts-{index:02d}"
target = ROOT / "notebooks/train_autoparts_colab.ipynb"
target.write_text(json.dumps(notebook, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Notebook generado: {len(cells)} celdas, {sum(c['cell_type'] == 'code' for c in cells)} código; sintaxis validada.")
