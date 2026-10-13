import asyncio
import hmac
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, File, Header, UploadFile
from fastapi.responses import JSONResponse
from .config import Settings
from .errors import ServiceError
from .inference import InferenceService
from .schemas import ClassMetadata, HealthResponse, PredictResponse
from .upload_limit import UploadLimitMiddleware


def create_app(settings: Settings | None = None, service: InferenceService | None = None):
    settings = settings or Settings()
    service = service or InferenceService(settings)
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="autoparts")
    gate = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(app):
        service.load()
        yield
        executor.shutdown(wait=False, cancel_futures=True)

    async def authorize(x_api_key: str | None = Header(default=None)):
        if settings.api_key and not hmac.compare_digest(x_api_key or "", settings.api_key):
            raise ServiceError(401, "unauthorized", "Acceso no autorizado.")

    app = FastAPI(title="AutoParts classification (internal)", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None, dependencies=[Depends(authorize)])
    app.state.service = service
    app.add_middleware(UploadLimitMiddleware, max_bytes=settings.max_image_bytes + 65536, api_key=settings.api_key)

    @app.exception_handler(ServiceError)
    async def service_error(request, exc):
        return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message})

    @app.exception_handler(Exception)
    async def unexpected_error(request, exc):
        logging.getLogger(__name__).error("Error interno del servicio", exc_info=exc)
        return JSONResponse(status_code=500, content={"code": "processing_error", "message": "No se pudo procesar la solicitud."})

    @app.get("/health", response_model=HealthResponse)
    def health():
        return HealthResponse(status="ok" if service.model is not None else "model_unavailable", model_available=service.model is not None)

    @app.get("/classes", response_model=list[ClassMetadata])
    def classes():
        return service.dataset_classes()

    @app.get("/model/info")
    def model_info():
        return service.public_info()

    @app.post("/predict", response_model=PredictResponse)
    async def predict(file: UploadFile = File(...)):
        service.require_model()
        if gate.locked():
            raise ServiceError(429, "service_busy", "El reconocimiento está ocupado. Intenta nuevamente.")
        await gate.acquire()
        release_on_exit = True
        try:
            content = await file.read(settings.max_image_bytes + 1)
            future = asyncio.get_running_loop().run_in_executor(executor, service.predict, content, file.content_type or "")
            try:
                result = await asyncio.wait_for(asyncio.shield(future), timeout=settings.inference_timeout_seconds)
                result.analysis.dataset = {k: v for k, v in result.analysis.dataset.items() if k in {"slug", "url", "version", "license"}}
                return result
            except (asyncio.TimeoutError, asyncio.CancelledError) as exc:
                # A native inference cannot be killed safely. Keep capacity occupied until it finishes.
                release_on_exit = False
                def finished(task):
                    if not task.cancelled():
                        task.exception()
                    gate.release()
                future.add_done_callback(finished)
                if isinstance(exc, asyncio.CancelledError):
                    raise
                raise ServiceError(504, "inference_timeout", "El análisis tardó demasiado. Intenta nuevamente.") from exc
        finally:
            await file.close()
            if release_on_exit:
                gate.release()

    return app


app = create_app()
