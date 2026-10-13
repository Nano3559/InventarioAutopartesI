"""Inspect the original Kaggle files without inventing class information."""
import csv
import hashlib
import json
import os
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SLUG = "gpiosenka/car-parts-40-classes"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
SPLITS = {"train": ("train", "training"), "val": ("valid", "validation", "val"), "test": ("test", "testing")}


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")


def images(directory):
    return sorted(p for p in Path(directory).rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS)


def inspect_dataset(path, translations=None):
    path = Path(path).resolve()
    download_root = path
    translations = translations or {}
    candidates = []
    for train_dir in [p for p in [path, *path.rglob("*")] if p.is_dir() and p.name.lower() in SPLITS["train"]]:
        parent = train_dir.parent
        class_names = sorted(p.name for p in train_dir.iterdir() if p.is_dir() and images(p))
        partitions = {}
        coherent = bool(class_names)
        for split, aliases in SPLITS.items():
            dirs = [p for p in parent.iterdir() if p.is_dir() and p.name.lower() in aliases]
            if len(dirs) > 1:
                coherent = False
            if dirs:
                partitions[split] = dirs[0]
                if sorted(p.name for p in dirs[0].iterdir() if p.is_dir()) != class_names:
                    coherent = False
        coherent = coherent and "train" in partitions and "val" in partitions
        candidates.append({"root": parent, "class_count": len(class_names), "coherent": coherent, "splits": list(partitions)})
    valid = [c for c in candidates if c["coherent"]]
    if valid:
        largest = max(c["class_count"] for c in valid)
        selected = [c for c in valid if c["class_count"] == largest]
        if len(selected) > 1:
            raise ValueError("Variantes equivalentes ambiguas. Use --dataset-root con una carpeta concreta.")
        path = selected[0]["root"]
    split_dirs = {}
    for split, aliases in SPLITS.items():
        matches = [p for p in [path, *path.rglob("*")] if p.is_dir() and p.name.lower() in aliases and any(c.is_dir() for c in p.iterdir())]
        if len(matches) > 1:
            raise ValueError(f"Partición {split} ambigua: {matches}")
        if matches:
            split_dirs[split] = matches[0]
    if "train" not in split_dirs or "val" not in split_dirs:
        raise ValueError("Se requieren train y valid/val separados; nunca se utiliza test como validación.")
    names = sorted(p.name for p in split_dirs["train"].iterdir() if p.is_dir())
    if not names:
        raise ValueError("No se encontraron clases en train")
    splits = {}
    seen = {}
    duplicate_content = []
    for split, directory in split_dirs.items():
        actual = sorted(p.name for p in directory.iterdir() if p.is_dir())
        if actual != names:
            raise ValueError(f"Clases diferentes en {split}")
        counts = {}
        for name in names:
            files = images(directory / name)
            if not files:
                raise ValueError(f"Clase vacía: {split}/{name}")
            for file in files:
                with Image.open(file) as image:
                    image.verify()
                digest = hashlib.sha256(file.read_bytes()).hexdigest()
                if digest in seen and seen[digest][0] != split:
                    duplicate_content.append({"first": seen[digest], "second": [split, str(file.relative_to(path))]})
                seen[digest] = (split, str(file.relative_to(path)))
            counts[name] = len(files)
        splits[split] = {"path": str(directory), "image_count": sum(counts.values()), "counts": counts}
    files = [p for p in path.rglob("*") if p.is_file() and p.suffix.lower() not in EXTENSIONS]
    documents, csv_files, licenses = [], [], []
    for file in files:
        relative = str(file.relative_to(path))
        if file.suffix.lower() == ".csv":
            with file.open(encoding="utf-8-sig", newline="") as stream:
                reader = csv.DictReader(stream)
                rows = list(reader)
            csv_files.append({"file": relative, "columns": reader.fieldnames, "row_count": len(rows), "rows": rows})
        elif file.suffix.lower() in {".txt", ".md", ".json", ".yaml", ".yml"}:
            documents.append({"file": relative, "text": file.read_text(encoding="utf-8", errors="replace")[:50000]})
        if "license" in file.name.lower() or "licence" in file.name.lower():
            licenses.append(relative)
    class_metadata = {}
    for name in names:
        associated = []
        for table in csv_files:
            columns = table["columns"] or []
            label_columns = [column for column in columns if column.strip().lower() in {"label", "labels", "class", "class name", "class_name", "class names"}]
            rows = [row for row in table["rows"] if any(row.get(column) == name for column in label_columns)]
            if rows:
                # Preserve original columns and values; never treat CSV image paths as descriptions.
                fields = {}
                for column in columns:
                    if "path" in column.lower() or "file" in column.lower():
                        continue
                    values = sorted({row[column] for row in rows if row.get(column)})
                    if len(values) <= 20:
                        fields[column] = values
                associated.append({"source_file": table["file"], "matching_row_count": len(rows), "fields": fields})
        class_metadata[name] = {"csv": associated} if associated else {}
    version = next((ancestor.name for ancestor in (download_root, *download_root.parents) if ancestor.parent.name == "versions"), None)
    return {
        "schema_version": 1,
        "source": {"slug": SLUG, "url": f"https://www.kaggle.com/datasets/{SLUG}", "download_path": str(download_root), "selected_path": str(path), "selection_rule": "largest_coherent_classification_variant", "variants": [{"relative_root": str(c["root"].relative_to(download_root)), "class_count": c["class_count"], "coherent": c["coherent"], "splits": c["splits"]} for c in candidates], "version": version, "license": None, "license_files": licenses, "documents": documents},
        "splits": splits, "class_count": len(names), "total_images": sum(s["image_count"] for s in splits.values()),
        "classes": [{"id": i, "original_name": name, "training_label": name, "spanish_name": translations.get(name), "translation_source": "manual_reviewable_mapping" if translations.get(name) else None, "image_counts": {s: v["counts"][name] for s, v in splits.items()}, "metadata": class_metadata[name]} for i, name in enumerate(names)],
        "original_files": [str(p.relative_to(path)) for p in files], "csv_metadata": csv_files,
        "cross_split_duplicate_content": duplicate_content,
    }


def download_dataset(output=ROOT / "artifacts/dataset.json", dataset_root=None):
    output = Path(output)
    if dataset_root is not None:
        path = Path(dataset_root)
    elif output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))
        candidate = Path(previous["source"]["download_path"])
        if candidate.exists():
            path = candidate
        else:
            import kagglehub
            path = Path(kagglehub.dataset_download(SLUG))
    else:
        import kagglehub
        path = Path(kagglehub.dataset_download(SLUG))
    mapping = json.loads((ROOT / "config/translations.json").read_text(encoding="utf-8"))
    manifest = inspect_dataset(path, mapping)
    write_json(output, manifest)
    print(f"Dataset: {path}; clases: {manifest['class_count']}; imágenes: {manifest['total_images']}")
    return manifest


def prepare_dataset(manifest, destination=ROOT / "artifacts/prepared", splits=None):
    destination = Path(destination).resolve()
    # Fail closed: a previously prepared dataset is reused only with identical manifest.
    marker = destination / "manifest.json"
    chosen = {s: d for s, d in manifest["splits"].items() if splits is None or s in splits}
    digest = hashlib.sha256(json.dumps({"manifest": manifest, "splits": sorted(chosen)}, sort_keys=True).encode()).hexdigest()
    if destination.exists() and any(destination.iterdir()):
        if marker.exists() and json.loads(marker.read_text())["source_sha256"] == digest:
            return destination
        raise ValueError("Destino preparado contiene otros datos. Use un destino nuevo; no se sobrescribe.")
    for split, details in chosen.items():
        for name in details["counts"]:
            source = Path(details["path"]) / name
            target = destination / split / name
            target.mkdir(parents=True, exist_ok=True)
            for index, file in enumerate(images(source)):
                output = target / f"{index:07d}{file.suffix.lower()}"
                try:
                    os.link(file, output)
                except OSError:
                    shutil.copy2(file, output)
    write_json(marker, {"source_sha256": digest, "dataset": manifest})
    return destination
