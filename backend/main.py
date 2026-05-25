import asyncio
import base64
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from . import crud, models
from .config import settings
from .database import AsyncSessionLocal, engine
from .event_hub import hub
from .routers import admin, auth, public
from .simulator import simulator_task

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend")

ROOT = Path(__file__).resolve().parent.parent

TRANSPARENT_PNG = base64.b64decode(
    b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # --- startup ---
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await crud.init_db(db)

    sim_task = asyncio.create_task(simulator_task())
    logger.info("Application started. Simulator task running.")

    try:
        yield
    finally:
        # --- shutdown ---
        sim_task.cancel()
        try:
            await sim_task
        except (asyncio.CancelledError, Exception):
            pass
        await engine.dispose()
        logger.info("Application shutdown complete.")


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/api/stream")
async def sse_stream(request: Request):
    async def event_generator():
        q = hub.subscribe()
        try:
            while True:
                if await request.is_disconnected():
                    break
                payload = await q.get()
                yield payload
        finally:
            hub.unsubscribe(q)

    return EventSourceResponse(event_generator())


# ---------------------------------------------------------------------------
# Static assets
# ---------------------------------------------------------------------------
# The original Telekom landing page references resources with lowercase paths
# (`/js/`, `/css/`), while the actual folders on disk are uppercase (`JS/`,
# `CSS/`). Case-insensitive filesystems (Windows, macOS) make this work
# transparently; on Linux we redirect via explicit handlers below.

@app.get("/images/{file_path:path}")
def get_image(file_path: str):
    """Serve images from disk, falling back to a 1x1 transparent PNG."""
    full_path = ROOT / "images" / file_path
    if full_path.is_file():
        return FileResponse(full_path)
    return Response(content=TRANSPARENT_PNG, media_type="image/png")


@app.get("/js/{file_path:path}")
def get_js(file_path: str):
    full_path = ROOT / "JS" / file_path
    if full_path.is_file():
        return FileResponse(full_path)
    return Response(status_code=404)


@app.get("/css/{file_path:path}")
def get_css(file_path: str):
    full_path = ROOT / "CSS" / file_path
    if full_path.is_file():
        return FileResponse(full_path)
    return Response(status_code=404)


# Direct mounts under the canonical (uppercase) names — used by absolute paths
# generated server-side (e.g. font URLs in CSS).
if (ROOT / "JS").exists():
    app.mount("/JS", StaticFiles(directory=str(ROOT / "JS")), name="js")
if (ROOT / "CSS").exists():
    app.mount("/CSS", StaticFiles(directory=str(ROOT / "CSS")), name="css")
if (ROOT / "languages").exists():
    app.mount(
        "/languages", StaticFiles(directory=str(ROOT / "languages")), name="languages"
    )

# Admin SPA — explicit handler covers /admin without trailing slash; the mount
# below (with html=True) handles /admin/ and individual asset paths.
@app.get("/admin")
@app.get("/admin/")
def get_admin_index():
    return FileResponse(str(ROOT / "admin" / "index.html"))


if (ROOT / "admin").exists():
    app.mount(
        "/admin", StaticFiles(directory=str(ROOT / "admin"), html=True), name="admin"
    )


# Original Telekom landing page.
@app.get("/")
def get_index():
    return FileResponse(str(ROOT / "index.html"))


@app.get("/{file_name}")
def get_root_file(file_name: str):
    full_path = ROOT / file_name
    if full_path.is_file():
        return FileResponse(str(full_path))
    return Response(status_code=404)
