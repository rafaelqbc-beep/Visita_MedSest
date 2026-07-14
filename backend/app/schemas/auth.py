"""Schemas Pydantic para autenticação."""
from pydantic import BaseModel, EmailStr

from app.schemas.usuario import UsuarioRead


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    """Retornado no login/refresh. O refresh_token vai em cookie httpOnly."""

    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioRead


class MessageResponse(BaseModel):
    detail: str
