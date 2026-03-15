import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import get_settings
from backend.app.database import Base, get_engine
from backend.routers import sync, users, stats, settings, validate


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    engine = get_engine(s.app_db_path)
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="InvokeAI Reports", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(sync.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(validate.router, prefix="/api")
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    if os.path.isdir(frontend_dist):
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
    return app


app = create_app()


def run():
    import uvicorn
    s = get_settings()
    uvicorn.run("backend.app.main:app", host=s.host, port=s.port, reload=False)
