"""Schemas Pydantic para Usuário."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import RoleEnum


class UsuarioRead(BaseModel):
    """Representação pública de um usuário (sem senha)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    email: EmailStr
    telefone: str | None = None
    whatsapp: str | None = None
    role: RoleEnum
    unidade_id: uuid.UUID | None = None
    ativo: bool


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(min_length=6, description="Senha em texto plano (será hasheada).")
    telefone: str | None = None
    whatsapp: str | None = None
    role: RoleEnum
    unidade_id: uuid.UUID | None = None


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    email: EmailStr | None = None
    senha: str | None = Field(default=None, min_length=6)
    telefone: str | None = None
    whatsapp: str | None = None
    role: RoleEnum | None = None
    unidade_id: uuid.UUID | None = None
    ativo: bool | None = None
