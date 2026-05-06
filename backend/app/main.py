import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.app.config import get_settings
from backend.app.database import Base, get_engine
from backend.routers import sync, users, stats, settings, validate

# Indexes that may be missing on databases created before they were declared on
# the ORM models. `Base.metadata.create_all` only creates indexes for tables it
# is creating, not for pre-existing tables, so apply these explicitly.
_BACKFILL_INDEXES = (
    "CREATE INDEX IF NOT EXISTS ix_generations_created_at ON generations (created_at)",
    "CREATE INDEX IF NOT EXISTS ix_queue_items_created_at ON queue_items (created_at)",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    engine = get_engine(s.app_db_path)
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        for stmt in _BACKFILL_INDEXES:
            conn.execute(text(stmt))
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="InvokeAI Reports", lifespan=lifespan)
    s = get_settings()
    origins = [f"http://{s.host}:{s.port}", f"http://localhost:{s.port}"]
    if s.dev_cors:
        origins += ["http://localhost:5173", "http://127.0.0.1:5173"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(sync.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(validate.router, prefix="/api")

    frontend_dist = os.path.realpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    )
    if os.path.isdir(frontend_dist):
        # Hashed asset bundles served from /assets with cache-friendly StaticFiles.
        assets_dir = os.path.join(frontend_dist, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        index_html = os.path.join(frontend_dist, "index.html")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def spa_fallback(full_path: str):
            # API routers are registered above and take priority. A GET to an
            # unknown /api/... path should still 404, not return HTML.
            if full_path.startswith("api/"):
                raise HTTPException(status_code=404)
            # Serve real files (favicon.ico, vite.svg, etc.) if present, with
            # a path-traversal guard. Anything else falls through to index.html
            # so React Router can handle the route on the client.
            candidate = os.path.realpath(os.path.join(frontend_dist, full_path))
            if (
                full_path
                and os.path.isfile(candidate)
                and os.path.commonpath([candidate, frontend_dist]) == frontend_dist
            ):
                return FileResponse(candidate)
            return FileResponse(index_html)

    return app


app = create_app()


def run():
    import uvicorn
    s = get_settings()
    uvicorn.run("backend.app.main:app", host=s.host, port=s.port, reload=False)
