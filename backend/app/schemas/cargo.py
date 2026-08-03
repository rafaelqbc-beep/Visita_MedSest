"""Schemas Pydantic para Cargos/Funções."""
import uuid

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.catalogo import codigos_epi_invalidos, codigos_risco_invalidos


def _validar_riscos(v: list[str]) -> list[str]:
    invalidos = codigos_risco_invalidos(v)
    if invalidos:
        raise ValueError(f"Códigos de risco desconhecidos: {', '.join(invalidos)}")
    return v


def _validar_epis(v: list[str]) -> list[str]:
    invalidos = codigos_epi_invalidos(v)
    if invalidos:
        raise ValueError(f"Códigos de EPI desconhecidos: {', '.join(invalidos)}")
    return v


class CargoCreate(BaseModel):
    setor_id: uuid.UUID
    nome_cargo: str
    descricao_funcao: str | None = None
    ordem: int = 0
    num_trabalhadores: int | None = None
    jornada: str | None = None
    possui_riscos: bool | None = None
    riscos: list[str] = []
    riscos_outros: str | None = None
    utiliza_epis: bool | None = None
    epis: list[str] = []
    epis_outros: str | None = None

    _v_riscos = field_validator("riscos")(_validar_riscos)
    _v_epis = field_validator("epis")(_validar_epis)


class CargoUpdate(BaseModel):
    nome_cargo: str | None = None
    descricao_funcao: str | None = None
    ordem: int | None = None
    num_trabalhadores: int | None = None
    jornada: str | None = None
    possui_riscos: bool | None = None
    riscos: list[str] | None = None
    riscos_outros: str | None = None
    utiliza_epis: bool | None = None
    epis: list[str] | None = None
    epis_outros: str | None = None

    @field_validator("riscos")
    @classmethod
    def _v_riscos(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else _validar_riscos(v)

    @field_validator("epis")
    @classmethod
    def _v_epis(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else _validar_epis(v)


class CargoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    setor_id: uuid.UUID
    nome_cargo: str
    descricao_funcao: str | None = None
    ordem: int
    num_trabalhadores: int | None = None
    jornada: str | None = None
    possui_riscos: bool | None = None
    riscos: list[str] = []
    riscos_outros: str | None = None
    utiliza_epis: bool | None = None
    epis: list[str] = []
    epis_outros: str | None = None
