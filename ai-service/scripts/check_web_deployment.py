"""Read-only verification of the published web module and its API target."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from autoparts_ai.network import use_system_certificates
import requests


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []

    def handle_starttag(self, tag, attributes):
        if tag == "script":
            source = dict(attributes).get("src")
            if source:
                self.sources.append(source)


if __name__ == "__main__":
    use_system_certificates()
    from urllib.parse import urljoin
    url = "https://frontend-vert-five-39.vercel.app"
    response = requests.get(url + "/reconocimiento", timeout=30)
    response.raise_for_status()
    parser = Scripts()
    parser.feed(response.text)
    checks = []
    for source in parser.sources:
        asset = requests.get(urljoin(url, source), timeout=30)
        asset.raise_for_status()
        checks.append({"asset_http": asset.status_code, "new_module_present": "Reconocimiento inteligente de autopartes" in asset.text, "render_api_present": "https://inventarioautopartesi.onrender.com/api" in asset.text})
    result = {"url": url, "route_http": response.status_code, "assets": checks}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    assert any(c["new_module_present"] and c["render_api_present"] for c in checks), "El bundle no confirma módulo y API de producción"
