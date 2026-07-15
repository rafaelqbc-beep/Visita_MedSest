"""Schemas Pydantic para Fotos de setor."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    setor_id: uuid.UUID
    caminho_arquivo: str
    nome_original: str | None = None
    descricao: str | None = None
    tamanho_bytes: int | None = None
    created_at: datetime


class FotoUpdate(BaseModel):
    """A imagem em si não é substituída — para trocar, apague e envie outra."""

    descricao: str | None = None
