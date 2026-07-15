"""Schemas Pydantic para Cargos/Funções."""
import uuid

from pydantic import BaseModel, ConfigDict


class CargoCreate(BaseModel):
    setor_id: uuid.UUID
    nome_cargo: str
    descricao_funcao: str | None = None
    ordem: int = 0


class CargoUpdate(BaseModel):
    nome_cargo: str | None = None
    descricao_funcao: str | None = None
    ordem: int | None = None


class CargoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    setor_id: uuid.UUID
    nome_cargo: str
    descricao_funcao: str | None = None
    ordem: int
