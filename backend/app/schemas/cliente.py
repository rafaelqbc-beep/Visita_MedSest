"""Schemas Pydantic para Cliente."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.enums import TipoVisitaEnum
from app.utils.validators import validar_cnpj


def _valida_cnpj_opcional(v: str | None) -> str | None:
    if v is None or v.strip() == "":
        return None
    if not validar_cnpj(v):
        raise ValueError("CNPJ inválido.")
    return v


class ClienteBase(BaseModel):
    razao_social: str
    cnpj: str | None = None
    nome_fantasia: str | None = None
    filial: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    nome_contato: str | None = None
    celular_contato: str | None = None
    email_contato: EmailStr | None = None
    tipo_visita_padrao: TipoVisitaEnum | None = None
    gestor_comercial_id: uuid.UUID | None = None
    unidade_medsest_id: uuid.UUID | None = None

    @field_validator("cnpj")
    @classmethod
    def _cnpj(cls, v: str | None) -> str | None:
        return _valida_cnpj_opcional(v)

    @field_validator("estado")
    @classmethod
    def _uf(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    razao_social: str | None = None
    cnpj: str | None = None
    nome_fantasia: str | None = None
    filial: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    nome_contato: str | None = None
    celular_contato: str | None = None
    email_contato: EmailStr | None = None
    tipo_visita_padrao: TipoVisitaEnum | None = None
    gestor_comercial_id: uuid.UUID | None = None
    unidade_medsest_id: uuid.UUID | None = None
    ativo: bool | None = None

    @field_validator("cnpj")
    @classmethod
    def _cnpj(cls, v: str | None) -> str | None:
        return _valida_cnpj_opcional(v)

    @field_validator("estado")
    @classmethod
    def _uf(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class ClienteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    razao_social: str
    cnpj: str | None = None
    nome_fantasia: str | None = None
    filial: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    nome_contato: str | None = None
    celular_contato: str | None = None
    email_contato: str | None = None
    tipo_visita_padrao: TipoVisitaEnum | None = None
    gestor_comercial_id: uuid.UUID | None = None
    unidade_medsest_id: uuid.UUID | None = None
    ativo: bool
