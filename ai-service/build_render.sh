#!/usr/bin/env bash
set -euo pipefail
python -m pip install --upgrade pip
python -m pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements-inference.txt
# Ultralytics declares the GUI wheel, but server inference uses headless OpenCV.
# Replace it after resolution to avoid Linux libGL dependencies.
python -m pip uninstall -y opencv-python
python -m pip install --force-reinstall --no-deps opencv-python-headless==4.13.0.92
python scripts/fetch_model.py
