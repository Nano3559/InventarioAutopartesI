import hashlib
import io
import json
import tempfile
import unittest
import zipfile
import os
from pathlib import Path
from unittest.mock import patch
from autoparts_ai.model_fetch import download_archive, extract_archive, fetch_model


class ModelFetchTest(unittest.TestCase):
    def test_render_rejects_missing_shared_key(self):
        from autoparts_ai.api import create_app
        from autoparts_ai.config import Settings
        with patch.dict(os.environ, {"RENDER": "true"}):
            with self.assertRaisesRegex(RuntimeError, "AUTOPARTS_API_KEY"):
                create_app(Settings(_env_file=None, api_key=""))

    def archive(self, root, entries):
        target = root / "model.zip"
        with zipfile.ZipFile(target, "w") as archive:
            for name, content in entries:
                archive.writestr(name, content)
        return target

    def test_traversal_rejected_before_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = self.archive(root, [("../outside", b"secret")])
            with self.assertRaisesRegex(ValueError, "rutas"):
                extract_archive(archive, root / "stage", "a" * 64)
            self.assertFalse((root / "outside").exists())

    def test_wrong_hash_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = self.archive(root, [("best.pt", b"fixture-weights")])
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                extract_archive(archive, root / "stage", "a" * 64)

    def test_download_errors_hide_signed_url(self):
        with tempfile.TemporaryDirectory() as directory:
            url = "https://example.com/model.zip?token=secret"
            with patch("urllib.request.build_opener") as opener:
                opener.return_value.open.side_effect = RuntimeError(url)
                with self.assertRaises(RuntimeError) as raised:
                    download_archive(url, Path(directory) / "model.zip")
            self.assertNotIn("secret", str(raised.exception))
            self.assertIsNone(raised.exception.__cause__)

    def test_validated_staging_published_after_mocked_download(self):
        # Structural/hash publication test; model metadata validation has its own suite.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            weights = b"explicit-mock-weights"
            digest = hashlib.sha256(weights).hexdigest()
            archive = self.archive(root, [("best.pt", weights), ("model-info.json", b"{}")])
            def copy_download(url, target):
                Path(target).write_bytes(archive.read_bytes())
            with patch("autoparts_ai.model_fetch.download_archive", side_effect=copy_download), patch("autoparts_ai.model_fetch.validate_artifacts", return_value=({"class_count": 2}, {})):
                result = fetch_model("https://example.com/model.zip", digest, root / "models")
            self.assertEqual(result["status"], "downloaded")
            self.assertEqual((root / "models/best.pt").read_bytes(), weights)

    def test_failed_hash_leaves_active_files_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "models").mkdir()
            (root / "models/best.pt").write_bytes(b"previous")
            archive = self.archive(root, [("best.pt", b"untrusted")])
            with patch("autoparts_ai.model_fetch.download_archive", side_effect=lambda url, target: Path(target).write_bytes(archive.read_bytes())):
                with self.assertRaises(ValueError):
                    fetch_model("https://example.com/model.zip", "a" * 64, root / "models")
            self.assertEqual((root / "models/best.pt").read_bytes(), b"previous")
