"""Schemas Pydantic para Usuário."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr

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
