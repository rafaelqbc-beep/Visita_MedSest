"""Dependências de autenticação e autorização por role."""
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.enums import RoleEnum
from app.models.usuario import Usuario
from app.utils.exceptions import AppException
from app.utils.jwt import JWTError, decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """Valida o access token do header Authorization e retorna o usuário."""
    if credentials is None or not credentials.credentials:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Não autenticado.", "NOT_AUTHENTICATED")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Token inválido ou expirado.", "INVALID_TOKEN")

    if payload.get("type") != "access":
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Tipo de token inválido.", "INVALID_TOKEN_TYPE")

    sub = payload.get("sub")
    if not sub:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Token sem sujeito.", "INVALID_TOKEN")

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Token inválido.", "INVALID_TOKEN")

    usuario = await db.get(Usuario, user_id)
    if usuario is None:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.", "USER_NOT_FOUND")
    if not usuario.ativo:
        raise AppException(status.HTTP_403_FORBIDDEN, "Usuário inativo.", "USER_INACTIVE")

    return usuario


def require_roles(*roles: RoleEnum) -> Callable[[Usuario], Awaitable[Usuario]]:
    """Factory de dependency que exige que o usuário tenha um dos roles."""

    async def _checker(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.role not in roles:
            raise AppException(
                status.HTTP_403_FORBIDDEN,
                "Você não tem permissão para acessar este recurso.",
                "FORBIDDEN",
            )
        return usuario

    return _checker
