from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routes import router
from .seed import seed_demo_data


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.auto_create_schema:
        Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        seed_demo_data()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Geospatial carbon and biodiversity portfolio API.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
assets_dir = frontend_dist / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{path:path}", include_in_schema=False, response_model=None)
def frontend(path: str) -> FileResponse | dict[str, str]:
    requested = frontend_dist / path
    if path and requested.is_file():
        return FileResponse(requested)
    index = frontend_dist / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"message": "Darukaa.Earth API", "docs": "/docs"}
