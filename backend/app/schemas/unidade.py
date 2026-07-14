"""Schemas Pydantic para Unidade MedSest."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.utils.validators import validar_cnpj


class UnidadeBase(BaseModel):
    nome: str
    cnpj: str
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    telefone: str | None = None
    email: EmailStr | None = None

    @field_validator("cnpj")
    @classmethod
    def _valida_cnpj(cls, v: str) -> str:
        if not validar_cnpj(v):
            raise ValueError("CNPJ inválido.")
        return v

    @field_validator("estado")
    @classmethod
    def _uf(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class UnidadeCreate(UnidadeBase):
    pass


class UnidadeUpdate(BaseModel):
    nome: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    telefone: str | None = None
    email: EmailStr | None = None
    ativo: bool | None = None

    @field_validator("estado")
    @classmethod
    def _uf(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class UnidadeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    cnpj: str
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    telefone: str | None = None
    email: str | None = None
    ativo: bool
