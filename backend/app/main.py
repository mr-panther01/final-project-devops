from fastapi import FastAPI, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.database import get_db, Base, engine
from app.routes import router as tasks_router

# Database metadata is managed by Alembic in production
# and by test fixtures during pytest runs

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TaskBoard SaaS API with DevOps instrumentation"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose Prometheus /metrics endpoint
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health", tags=["system"])
def health():
    """Liveness probe endpoint: returns quick 200 if container is alive."""
    return {"status": "healthy"}

@app.get("/ready", tags=["system"])
def ready(response: Response, db: Session = Depends(get_db)):
    """Readiness probe endpoint: verifies database connectivity before serving traffic."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unready", "database": str(e)}

app.include_router(tasks_router)
