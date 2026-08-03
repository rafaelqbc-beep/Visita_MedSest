"""Schemas Pydantic para Setores/Ambientes."""
import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.cargo import CargoRead
from app.schemas.foto import FotoRead


class SetorCreate(BaseModel):
    chamado_id: uuid.UUID
    nome: str
    descricao_ambiente: str | None = None
    ordem: int = 0
    maquinas: str | None = None
    ruido_db: Decimal | None = None
    calor_ibutg: Decimal | None = None
    iluminancia_lux: Decimal | None = None


class SetorUpdate(BaseModel):
    nome: str | None = None
    descricao_ambiente: str | None = None
    ordem: int | None = None
    maquinas: str | None = None
    ruido_db: Decimal | None = None
    calor_ibutg: Decimal | None = None
    iluminancia_lux: Decimal | None = None


class SetorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chamado_id: uuid.UUID
    nome: str
    descricao_ambiente: str | None = None
    ordem: int
    maquinas: str | None = None
    ruido_db: Decimal | None = None
    calor_ibutg: Decimal | None = None
    iluminancia_lux: Decimal | None = None


class SetorDetalhe(SetorRead):
    """Setor com cargos e fotos aninhados — é o que a tela de visita e o
    relatório consomem, evitando uma chamada por setor."""

    cargos: list[CargoRead] = []
    fotos: list[FotoRead] = []
