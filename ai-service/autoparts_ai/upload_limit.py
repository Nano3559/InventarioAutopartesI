import asyncio
import hmac
from starlette.responses import JSONResponse


class UploadLimitMiddleware:
    """Bound raw multipart bytes before parsing, including chunked requests."""
    def __init__(self, app, max_bytes, api_key="", timeout=10):
        self.app, self.max_bytes, self.api_key, self.timeout = app, max_bytes, api_key, timeout
        self.active = 0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"] != "/predict" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        if self.api_key and not hmac.compare_digest(headers.get(b"x-api-key", b""), self.api_key.encode()):
            return await JSONResponse({"code": "unauthorized", "message": "Acceso no autorizado."}, status_code=401)(scope, receive, send)
        if self.active >= 2:
            return await JSONResponse({"code": "service_busy", "message": "El reconocimiento está ocupado."}, status_code=429)(scope, receive, send)
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"code": "invalid_image", "message": "Solicitud inválida."}, status_code=400)(scope, receive, send)
        if length > self.max_bytes:
            return await JSONResponse({"code": "image_too_large", "message": "La imagen supera el tamaño permitido."}, status_code=413)(scope, receive, send)
        self.active += 1
        try:
            chunks, size = [], 0
            async def read_body():
                nonlocal size
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return False
                    chunk = message.get("body", b"")
                    size += len(chunk)
                    if size > self.max_bytes:
                        return False
                    chunks.append(chunk)
                    if not message.get("more_body", False):
                        return True
            try:
                valid = await asyncio.wait_for(read_body(), self.timeout)
            except asyncio.TimeoutError:
                return await JSONResponse({"code": "upload_timeout", "message": "La carga de imagen tardó demasiado."}, status_code=408)(scope, receive, send)
            if not valid:
                return await JSONResponse({"code": "image_too_large", "message": "La imagen supera el tamaño permitido."}, status_code=413)(scope, receive, send)
            sent = False
            async def bounded_receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
                return await receive()
            await self.app(scope, bounded_receive, send)
        finally:
            self.active -= 1
