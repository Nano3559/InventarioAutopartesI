import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from PIL import Image
from autoparts_ai import training
from autoparts_ai.dataset import inspect_dataset, write_json


class TrainingTest(unittest.TestCase):
    def test_invalid_configuration(self):
        config = {"epochs": 15, "imgsz": 224, "patience": 4, "batch": 16}
        for change in ({"epochs": 0}, {"batch": 0}, {"model": "yolo11n.pt"}, {"split": "test"}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                training.validate_config({**config, **change})

    def test_training_never_sees_test_and_tracks_saved_best_epoch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for split_index, split in enumerate(("train", "valid", "test")):
                target = root / "original" / split / "battery"
                target.mkdir(parents=True)
                Image.new("RGB", (8, 8), (split_index * 80, 0, 0)).save(target / "fixture.png")
            manifest = inspect_dataset(root / "original")
            write_json(root / "manifest.json", manifest)
            write_json(root / "config.json", {"epochs": 1, "imgsz": 224, "patience": 1, "batch": 16, "device": "auto"})

            class MockYOLO:
                names = {0: "battery"}
                def __init__(self, *args, **kwargs):
                    self.callback = None
                def add_callback(self, event, callback):
                    self.callback = callback
                def train(self, **kwargs):
                    data = Path(kwargs["data"])
                    self.assertions(data)
                    run = root / "run"
                    (run / "weights").mkdir(parents=True)
                    (run / "weights/best.pt").write_bytes(b"mock-only-test-fixture")
                    self.trainer = SimpleNamespace(save_dir=run, fitness=0.7, best_fitness=0.7, epoch=3, metrics={"metrics/accuracy_top1": 0.6, "metrics/accuracy_top5": 0.8})
                    self.callback(self.trainer)
                    # A final epoch with lower fitness must not replace saved best epoch.
                    self.trainer.epoch = 4
                    self.trainer.fitness = 0.65
                    self.callback(self.trainer)
                @staticmethod
                def assertions(data):
                    assert (data / "train/battery").exists()
                    assert (data / "val/battery").exists()
                    assert not (data / "test").exists()

            import torch
            import ultralytics
            with patch.object(training, "ROOT", root), patch.object(torch.cuda, "is_available", return_value=False), patch.object(ultralytics, "YOLO", MockYOLO):
                info = training.train(root / "config.json", root / "manifest.json")
            self.assertEqual(info["training"]["best_epoch"], 4)
            self.assertEqual(info["training"]["parameters"]["device"], "cpu")
            self.assertEqual(info["validation_metrics"]["metrics/accuracy_top1"], 0.6)
            self.assertIsNone(info["metrics"])


if __name__ == "__main__":
    unittest.main()
