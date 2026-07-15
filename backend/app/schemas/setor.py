"""Schemas Pydantic para Setores/Ambientes."""
import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.cargo import CargoRead
from app.schemas.foto import FotoRead


class SetorCreate(BaseModel):
    chamado_id: uuid.UUID
    nome: str
    descricao_ambiente: str | None = None
    ordem: int = 0


class SetorUpdate(BaseModel):
    nome: str | None = None
    descricao_ambiente: str | None = None
    ordem: int | None = None


class SetorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chamado_id: uuid.UUID
    nome: str
    descricao_ambiente: str | None = None
    ordem: int


class SetorDetalhe(SetorRead):
    """Setor com cargos e fotos aninhados — é o que a tela de visita e o
    relatório consomem, evitando uma chamada por setor."""

    cargos: list[CargoRead] = []
    fotos: list[FotoRead] = []
