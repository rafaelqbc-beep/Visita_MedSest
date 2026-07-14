"""Ponto de entrada da API MedSest Visita."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Garante que o diretório de uploads exista
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="MedSest Visita API",
    description="API de gestão de visitas técnicas de campo (insumos para PGR).",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Arquivos estáticos (uploads) ---
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health", tags=["health"])
async def health_check():
    """Verificação simples de saúde da API."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}


# --- Routers ---
# Serão registrados nas próximas sessões:
# from app.routers import auth, chamados, validacao_publica, ...
# app.include_router(auth.router)
