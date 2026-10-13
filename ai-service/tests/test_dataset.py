"""Synthetic images are test fixtures, never served as dataset/model results."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from autoparts_ai.dataset import inspect_dataset, prepare_dataset


class DatasetTest(unittest.TestCase):
    def fixture(self, root):
        for split_index, split in enumerate(("train", "valid", "test")):
            for index, name in enumerate(("wheel", "battery")):
                directory = root / split / name
                directory.mkdir(parents=True)
                Image.new("RGB", (8, 8), (split_index * 70, index * 90, 0)).save(directory / "sample.png")

    def test_real_counts_and_split_preservation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root / "original")
            manifest = inspect_dataset(root / "original", {"wheel": "Rueda"})
            self.assertEqual(manifest["class_count"], 2)
            self.assertEqual(manifest["total_images"], 6)
            self.assertEqual(manifest["classes"][0]["original_name"], "battery")
            self.assertIsNone(manifest["source"]["license"])
            prepared = prepare_dataset(manifest, root / "prepared")
            self.assertTrue((prepared / "test/wheel/0000000.png").exists())
            self.assertEqual(prepare_dataset(manifest, prepared), prepared)

    def test_test_never_replaces_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for split in ("train", "test"):
                (root / split / "wheel").mkdir(parents=True)
                Image.new("RGB", (8, 8)).save(root / split / "wheel/image.png")
            with self.assertRaisesRegex(ValueError, "train y valid"):
                inspect_dataset(root)

    def test_invalid_image_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            (root / "train/wheel/sample.png").write_bytes(b"invalid")
            with self.assertRaises(Exception):
                inspect_dataset(root)

    def test_csv_metadata_remains_original_and_translations_marked(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            (root / "parts.csv").write_text("labels,data set,filepaths,description\nwheel,train,train/wheel/sample.png,Original description\n", encoding="utf-8")
            manifest = inspect_dataset(root, {"wheel": "Rueda"})
            wheel = next(c for c in manifest["classes"] if c["original_name"] == "wheel")
            self.assertEqual(wheel["translation_source"], "manual_reviewable_mapping")
            self.assertEqual(wheel["metadata"]["csv"][0]["fields"]["description"], ["Original description"])
            self.assertNotIn("filepaths", wheel["metadata"]["csv"][0]["fields"])
            self.assertEqual(manifest["csv_metadata"][0]["row_count"], 1)

    def test_duplicates_are_reported_without_reassigning_partitions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            (root / "test/wheel/sample.png").write_bytes((root / "train/wheel/sample.png").read_bytes())
            manifest = inspect_dataset(root)
            self.assertEqual(len(manifest["cross_split_duplicate_content"]), 1)
            self.assertEqual(manifest["splits"]["test"]["image_count"], 2)

    def test_variants_are_selected_without_mixing_splits(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root / "larger")
            for split_index, split in enumerate(("train", "valid", "test")):
                target = root / "smaller" / split / "wheel"
                target.mkdir(parents=True)
                Image.new("RGB", (8, 8), (split_index * 80, 0, 0)).save(target / "sample.png")
            manifest = inspect_dataset(root)
            self.assertEqual(manifest["class_count"], 2)
            self.assertEqual(len(manifest["source"]["variants"]), 2)
            self.assertTrue(all("larger" in part["path"] for part in manifest["splits"].values()))
            alternative = inspect_dataset(root / "smaller")
            self.assertEqual(alternative["class_count"], 1)


if __name__ == "__main__":
    unittest.main()
