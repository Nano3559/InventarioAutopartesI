"""Production browser smoke test, with real login and no request interceptors.

Set UI_CLOUD_URL, UI_CLOUD_EMAIL and UI_CLOUD_PASSWORD privately, then run.
Credentials and JWTs are never printed or persisted by this script.
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts/ui"


async def main():
    url = os.environ["UI_CLOUD_URL"].rstrip("/")
    email = os.environ["UI_CLOUD_EMAIL"]
    password = os.environ["UI_CLOUD_PASSWORD"]
    manifest = json.loads((ROOT / "artifacts/dataset.json").read_text(encoding="utf-8"))
    image = sorted((Path(manifest["splits"]["test"]["path"]) / "AIR COMPRESSOR").glob("*.jpg"))[0]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        await page.goto(f"{url}/login")
        await page.get_by_label("Correo Electrónico", exact=True).fill(email)
        await page.get_by_label("Contraseña", exact=True).fill(password)
        await page.get_by_role("button", name="Ingresar al Sistema").click()
        await expect(page).to_have_url(f"{url}/reconocimiento", timeout=90000)
        await expect(page.get_by_role("heading", name="Reconocimiento inteligente de autopartes")).to_be_visible()
        await page.locator('input[type="file"]').set_input_files(str(image))
        async with page.expect_response(lambda response: response.request.method == "POST" and response.url.endswith("/part-recognition/predict"), timeout=140000) as response_event:
            await page.get_by_role("button", name="Identificar repuesto").click()
            await expect(page.get_by_role("button", name="Analizando imagen...")).to_be_disabled()
        response = await response_event.value
        result = await response.json()
        if not response.ok:
            await page.screenshot(path=str(OUTPUT / "cloud-failure.png"), full_page=False)
            raise AssertionError(f"Recognition API returned HTTP {response.status}: {result.get('message', 'controlled error')}")
        assert result["prediction"]["class_info"]["original_name"] == "AIR COMPRESSOR"
        assert result["analysis"]["class_count"] == 50
        assert result["prediction"]["confidence"] > 0.9
        await expect(page.locator(".recognition-main h2")).to_have_text("Compresor de aire")
        await expect(page.locator(".recognition-alternatives li")).to_have_count(3)
        await page.locator(".app-content").evaluate("element => element.scrollTop = 0")
        await page.screenshot(path=str(OUTPUT / "cloud-desktop-results.png"), full_page=False)
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.locator(".recognition-results").evaluate("element => element.scrollIntoView({block: 'start'})")
        await page.screenshot(path=str(OUTPUT / "cloud-mobile-results.png"), full_page=False)
        await page.get_by_role("button", name="Salir", exact=True).click()
        await expect(page).to_have_url(f"{url}/login")
        await browser.close()
    report = {"production_url": url, "real_login": True, "database_user": True, "request_interception": False, "class": result["prediction"]["class_info"]["original_name"], "confidence": result["prediction"]["confidence"], "class_count": result["analysis"]["class_count"], "viewports": ["1440x1000", "390x844"], "logout_verified": True, "limitations": "Known test image verifies integration, not generalization."}
    (OUTPUT / "cloud-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
