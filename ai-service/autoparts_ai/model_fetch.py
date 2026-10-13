"""Fetch a trusted model archive at build time, never from request handlers."""
import hashlib
import os
import re
import stat
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlsplit
from .model_import import validate_artifacts

MAX_DOWNLOAD = 20 * 1024 * 1024
MAX_UNCOMPRESSED = 30 * 1024 * 1024
ALLOWED = {"best.pt", "model-info.json", "metrics.json", "dataset-summary.json", "translations.json", "train-config.json", "environment.txt"}


def valid_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("El archivo del modelo requiere una URL HTTPS sin credenciales incrustadas.")


class HTTPSRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        valid_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download_archive(url, target):
    valid_url(url)
    opener = urllib.request.build_opener(HTTPSRedirectHandler())
    try:
        with opener.open(urllib.request.Request(url, headers={"User-Agent": "AutoParts-model-build/1"}), timeout=60) as response, Path(target).open("wb") as output:
            valid_url(response.geturl())
            size = int(response.headers.get("Content-Length", "0"))
            if size > MAX_DOWNLOAD:
                raise ValueError("Archivo del modelo demasiado grande.")
            received = 0
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                received += len(chunk)
                if received > MAX_DOWNLOAD:
                    raise ValueError("Archivo del modelo demasiado grande.")
                output.write(chunk)
    except Exception:
        # urllib exceptions can contain signed URLs. Do not chain or log them.
        raise RuntimeError("No se pudo descargar el modelo mediante HTTPS; revisar acceso y vigencia de la URL.") from None


def validate_expected_hash(value):
    if not re.fullmatch(r"[0-9a-fA-F]{64}", value or ""):
        raise ValueError("AUTOPARTS_MODEL_SHA256 debe contener el SHA-256 confiable de best.pt.")
    return value.lower()


def extract_archive(archive_path, staging, expected_hash):
    expected_hash = validate_expected_hash(expected_hash)
    staging = Path(staging)
    staging.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        members = archive.infolist()
        names = [entry.filename for entry in members]
        if len(names) != len(set(names)) or any(name not in ALLOWED for name in names):
            raise ValueError("ZIP contiene rutas, archivos no permitidos o nombres duplicados.")
        if sum(entry.file_size for entry in members) > MAX_UNCOMPRESSED or sum(entry.compress_size for entry in members) > MAX_DOWNLOAD:
            raise ValueError("ZIP supera los límites permitidos.")
        if any(entry.is_dir() or stat.S_ISLNK(entry.external_attr >> 16) for entry in members):
            raise ValueError("ZIP contiene directorios o enlaces no permitidos.")
        total = 0
        for entry in members:
            with archive.open(entry) as source, (staging / entry.filename).open("wb") as target:
                while True:
                    chunk = source.read(65536)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_UNCOMPRESSED:
                        raise ValueError("Contenido ZIP supera el límite permitido.")
                    target.write(chunk)
    weights = staging / "best.pt"
    if not weights.is_file() or hashlib.sha256(weights.read_bytes()).hexdigest() != expected_hash:
        raise ValueError("SHA-256 de best.pt no coincide con el hash confiable configurado.")
    info, _ = validate_artifacts(staging)
    return info


def fetch_model(url, expected_hash, destination):
    expected_hash = validate_expected_hash(expected_hash)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    if (destination / "best.pt").is_file():
        actual = hashlib.sha256((destination / "best.pt").read_bytes()).hexdigest()
        if actual == expected_hash:
            try:
                info, _ = validate_artifacts(destination)
                return {"status": "reused", "class_count": info["class_count"], "weights_sha256": actual}
            except (ValueError, OSError, KeyError):
                pass
    valid_url(url)
    with tempfile.TemporaryDirectory(prefix="model-build-", dir=destination.parent) as directory:
        temporary = Path(directory)
        archive = temporary / "model.zip"
        download_archive(url, archive)
        staging = temporary / "verified"
        info = extract_archive(archive, staging, expected_hash)
        # Publish only after all metadata and hash checks have passed.
        for file in staging.iterdir():
            os.replace(file, destination / file.name)
    return {"status": "downloaded", "class_count": info["class_count"], "weights_sha256": expected_hash}
