"""Controlled browser fixtures, never predictions used by the application.

Run Vite on 127.0.0.1:5178, then:
  .venv/Scripts/python.exe tests-ui/test_recognition_browser.py
Requires optional requirements-ui-test.txt and an installed Edge or Chromium.
"""
import asyncio
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "ui"
URL = os.environ.get("UI_TEST_URL", "http://127.0.0.1:5178")
USER = {"id": 900001, "nombre": "Cliente QA", "email": "qa@example.invalid", "rol": "cliente"}
PART = {"id": 0, "original_name": "test part", "training_label": "test part", "spanish_name": "Repuesto de prueba", "translation_source": "fixture", "image_counts": {"train": 12, "val": 3, "test": 2}, "metadata": {"csv": [{"source_file": "fixture.csv", "matching_row_count": 17, "fields": {"class": ["test part"]}}]}}
RESULT = {"prediction": {"class_info": PART, "confidence": 0.42}, "top_predictions": [{"class_info": {**PART, "id": n, "original_name": f"test part {n}"}, "confidence": score} for n, score in enumerate([0.42, 0.35, 0.23])], "confidence_state": "low", "conclusive": False, "thresholds": {"conclusive": 0.6, "high": 0.85}, "analysis": {"model": "YOLO11n-cls (QA fixture)", "dataset": {"slug": "fixture", "url": "https://www.kaggle.com/datasets/gpiosenka/car-parts-40-classes", "version": "fixture", "license": None}, "class_count": 3, "weights_sha256": "fixture-not-trained-weights", "metrics": {"top1_accuracy": 0.5, "sample_count": 2, "confusion_matrix": [[1, 0], [0, 1]]}}}


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    buffer = io.BytesIO()
    Image.new("RGB", (320, 240), "#64748b").save(buffer, format="PNG")
    image = {"name": "qa-part.png", "mimeType": "image/png", "buffer": buffer.getvalue()}
    checks = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        await context.add_init_script(f"localStorage.setItem('auth_token', 'explicit-qa-fixture'); localStorage.setItem('auth_user', {json.dumps(json.dumps(USER))});")
        mode = {"value": "success", "calls": 0}

        async def api(route):
            if route.request.resource_type not in {"fetch", "xhr"}:
                await route.continue_()
                return
            path = route.request.url.split("/api", 1)[-1]
            if path == "/auth/me":
                await route.fulfill(json=USER)
            elif path == "/part-recognition/predict":
                mode["calls"] += 1
                await asyncio.sleep(0.8)
                if mode["value"] == "success":
                    await route.fulfill(json=RESULT)
                elif mode["value"] == "network":
                    await route.abort("failed")
                else:
                    status, code, message = mode["value"]
                    await route.fulfill(status=status, json={"code": code, "message": message})
            else:
                await route.fulfill(json={})

        await context.route("**/api/**", api)
        page = await context.new_page()
        page.on("pageerror", lambda error: print("Browser error:", error))
        await page.goto(f"{URL}/reconocimiento")
        await expect(page.get_by_role("heading", name="Reconocimiento inteligente de autopartes")).to_be_visible()
        await expect(page.get_by_role("button", name="Identificar repuesto")).to_be_disabled()
        await page.screenshot(path=str(OUTPUT / "desktop-empty.png"), full_page=True)
        checks.append("Authenticated client loads recognition; empty action disabled")

        await page.locator('input[type="file"]').set_input_files({"name": "bad.gif", "mimeType": "image/gif", "buffer": b"GIF89a"})
        await expect(page.get_by_role("alert")).to_contain_text("JPG, PNG o WebP")
        await page.locator('input[type="file"]').set_input_files({"name": "large.png", "mimeType": "image/png", "buffer": b"x" * (10 * 1024 * 1024 + 1)})
        await expect(page.get_by_role("alert")).to_contain_text("máximo 10 MB")
        checks.append("Invalid MIME and files above 10 MB rejected before inference")

        await page.locator('input[type="file"]').set_input_files(image)
        await expect(page.get_by_alt_text("Fotografía seleccionada para reconocer el repuesto")).to_be_visible()
        await page.get_by_role("button", name="Eliminar").click()
        await expect(page.get_by_role("button", name="Identificar repuesto")).to_be_disabled()
        await page.locator('input[type="file"]').set_input_files(image)
        async with page.expect_file_chooser() as chooser:
            await page.get_by_role("button", name="Cambiar imagen").click()
        await (await chooser.value).set_files({**image, "name": "changed.png"})
        await expect(page.get_by_text("changed.png", exact=True)).to_be_visible()
        checks.append("Selection, preview, remove and change controls work")

        await page.get_by_role("button", name="Identificar repuesto").click()
        await expect(page.get_by_role("button", name="Analizando imagen...")).to_be_disabled()
        await expect(page.get_by_role("button", name="Cambiar imagen")).to_be_disabled()
        await expect(page.get_by_role("status")).to_be_visible()
        await expect(page.get_by_text("Confianza baja", exact=True)).to_be_visible()
        await expect(page.get_by_text("Identificación no concluyente.", exact=False)).to_be_visible()
        await expect(page.locator(".recognition-alternatives li")).to_have_count(3)
        await page.get_by_text("Información del análisis", exact=True).click()
        await expect(page.get_by_text("Accuracy Top-1", exact=True)).to_be_visible()
        await expect(page.get_by_text("confusion_matrix", exact=False)).to_have_count(0)
        await page.locator(".app-content").evaluate("element => element.scrollTop = 0")
        await page.screenshot(path=str(OUTPUT / "desktop-results.png"), full_page=True)
        checks.append("Loading disables duplicate requests; low confidence, top 3 and real metadata display")

        RESULT["prediction"]["confidence"] = 1.0
        RESULT["top_predictions"][0]["confidence"] = 1.0
        await page.get_by_role("button", name="Identificar repuesto").click()
        await expect(page.locator(".recognition-confidence-label strong")).to_have_text("99,9%")
        await expect(page.get_by_text("100%", exact=True)).to_have_count(0)
        checks.append("Even saturated model probability is never presented as 100% certainty")

        for scenario, message in [((503, "model_unavailable", "modelo pendiente"), "El modelo todavía no está disponible"), ((503, "service_unavailable", "servicio offline"), "está desconectado"), ((504, "timeout", "timeout"), "tardó demasiado"), ((429, "busy", "busy"), "está ocupado"), ("network", "Comprueba tu conexión")]:
            mode["value"] = scenario
            await page.get_by_role("button", name="Identificar repuesto").click()
            await expect(page.get_by_role("alert")).to_contain_text(message)
        checks.append("Controlled offline, missing model, timeout, capacity and network errors remain readable")

        await page.goto(f"{URL}/ventas")
        await expect(page).to_have_url(f"{URL}/reconocimiento")
        await expect(page.get_by_role("button", name="Notificaciones", exact=True)).to_have_count(0)
        await expect(page.get_by_role("link", name="Punto de Venta", exact=True)).to_have_count(0)
        checks.append("Client cannot enter sales or see administrative navigation and notifications")

        await page.set_viewport_size({"width": 390, "height": 844})
        await page.screenshot(path=str(OUTPUT / "mobile-empty.png"), full_page=True)
        await page.locator('input[type="file"]').set_input_files(image)
        RESULT["prediction"]["confidence"] = 0.42
        RESULT["top_predictions"][0]["confidence"] = 0.42
        mode["value"] = "success"
        await page.get_by_role("button", name="Identificar repuesto").click()
        await expect(page.get_by_text("Confianza baja", exact=True)).to_be_visible()
        await page.locator(".app-content").evaluate("element => element.scrollTop = 0")
        await page.locator(".recognition-results").evaluate("element => element.scrollIntoView({block: 'start'})")
        await page.screenshot(path=str(OUTPUT / "mobile-results.png"), full_page=False)
        overflow = await page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        assert not overflow, "Mobile viewport has horizontal overflow"
        logout = await page.get_by_role("button", name="Salir", exact=True).bounding_box()
        assert logout and logout["x"] + logout["width"] <= 390, "Mobile logout control is clipped"
        checks.append("390 px mobile empty and results layouts have no horizontal overflow")
        USER["rol"] = "admin"
        await page.goto(f"{URL}/reconocimiento")
        await expect(page).to_have_url(f"{URL}/dashboard")
        checks.append("Existing admin role is redirected from client-only recognition to its dashboard")
        await browser.close()
    report = {"fixture_only": True, "browser": "Edge / Playwright", "viewports": ["1440x1000", "390x844"], "passed": checks, "screenshots": [p.name for p in OUTPUT.glob("*.png")]}
    (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


async def main_live():
    """Live React -> isolated Nest bridge -> FastAPI -> imported trained model.

    Only auth/me is a fixture; no database or production account is accessed.
    Session file is ignored and contains a short-lived integration-only JWT.
    """
    session = json.loads((ROOT / "artifacts/live-ui-session.json").read_text(encoding="utf-8-sig"))
    nest_url = session.get("url") or session.get("nest_url")
    token = session.get("token") or session.get("jwt")
    if not nest_url or not token:
        raise ValueError("Live bridge session must contain url and token")
    manifest = json.loads((ROOT / "artifacts/dataset.json").read_text(encoding="utf-8"))
    image = sorted((Path(manifest["splits"]["test"]["path"]) / "AIR COMPRESSOR").glob("*.jpg"))[0]
    captured = {}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        user = {**USER, "rol": "cliente"}
        await context.add_init_script(f"localStorage.setItem('auth_token', 'explicit-live-bridge-fixture'); localStorage.setItem('auth_user', {json.dumps(json.dumps(user))});")

        async def forward(route):
            if route.request.resource_type not in {"fetch", "xhr"}:
                await route.continue_()
                return
            path = route.request.url.split("/api", 1)[-1]
            if path == "/auth/me":
                await route.fulfill(json=user)
                return
            if not path.startswith("/part-recognition/"):
                await route.fulfill(status=403, json={"message": "Live QA only supports recognition"})
                return
            headers = {**route.request.headers, "authorization": f"Bearer {token}"}
            headers.pop("content-length", None)
            body = route.request.post_data_buffer
            if path == "/part-recognition/predict":
                # Chromium's request inspection omits multipart file bytes.
                # Reconstitute that same selected dataset image for the real Nest upload.
                boundary = "LiveBrowserRecognitionBoundary"
                headers["content-type"] = f"multipart/form-data; boundary={boundary}"
                body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{image.name}"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + image.read_bytes() + f"\r\n--{boundary}--\r\n".encode())
            response = await route.fetch(url=f"{nest_url.rstrip('/')}{path}", method=route.request.method, headers=headers, post_data=body, timeout=90000)
            if path == "/part-recognition/predict" and response.ok:
                captured.update(await response.json())
            await route.fulfill(response=response)

        await context.route("**/api/**", forward)
        page = await context.new_page()
        await page.goto(f"{URL}/reconocimiento")
        await expect(page.get_by_role("heading", name="Reconocimiento inteligente de autopartes")).to_be_visible()
        for viewport, screenshot in [({"width": 1440, "height": 1000}, "live-desktop-results.png"), ({"width": 390, "height": 844}, "live-mobile-results.png")]:
            await page.set_viewport_size(viewport)
            await page.locator('input[type="file"]').set_input_files(str(image))
            await page.get_by_role("button", name="Identificar repuesto").click()
            await page.locator(".recognition-main h2, .recognition-error").first.wait_for(state="visible", timeout=60000)
            if await page.locator(".recognition-error").count():
                raise AssertionError(await page.locator(".recognition-error").inner_text())
            await expect(page.locator(".recognition-main h2")).to_have_text("Compresor de aire", timeout=60000)
            assert captured["prediction"]["class_info"]["original_name"] == "AIR COMPRESSOR"
            assert captured["analysis"]["class_count"] == 50
            assert captured["prediction"]["confidence"] > 0.9
            assert captured["prediction"]["class_info"]["image_counts"]["train"] == 185
            assert captured["prediction"]["class_info"]["metadata"]["csv"]
            await expect(page.locator(".recognition-alternatives li")).to_have_count(3)
            await expect(page.get_by_text("Confianza alta", exact=True)).to_be_visible()
            await page.locator(".app-content").evaluate("element => element.scrollTop = 0")
            if viewport["width"] == 390:
                await page.locator(".recognition-results").evaluate("element => element.scrollIntoView({block: 'start'})")
                await page.screenshot(path=str(OUTPUT / screenshot), full_page=False)
            else:
                await page.screenshot(path=str(OUTPUT / screenshot), full_page=True)
        await browser.close()
    report = {"fixture_only": False, "auth_fixture": True, "database_used": False, "flow": "React -> isolated Nest -> FastAPI -> trained YOLO", "class": captured["prediction"]["class_info"]["original_name"], "confidence": captured["prediction"]["confidence"], "class_count": captured["analysis"]["class_count"], "dataset": captured["analysis"]["dataset"], "viewports": ["1440x1000", "390x844"], "source_image": str(image.relative_to(ROOT)), "limitations": "Authentication is an isolated integration JWT fixture; production login and real DB users are not tested."}
    (OUTPUT / "live-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main_live() if "--live" in sys.argv else main())
