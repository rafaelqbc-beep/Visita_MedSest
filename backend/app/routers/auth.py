"""Rotas de autenticação: login, refresh, logout, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, MessageResponse, TokenResponse
from app.schemas.usuario import UsuarioRead
from app.utils.exceptions import AppException
from app.utils.jwt import JWTError, create_access_token, create_refresh_token, decode_token
from app.utils.security import verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path=COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path=COOKIE_PATH)


async def _issue_tokens(response: Response, usuario: Usuario, db: AsyncSession) -> TokenResponse:
    """Gera access + refresh, persiste o refresh e seta o cookie."""
    access = create_access_token(subject=str(usuario.id), role=usuario.role.value)
    refresh, expires_at = create_refresh_token(subject=str(usuario.id))
    db.add(RefreshToken(usuario_id=usuario.id, token=refresh, expires_at=expires_at))
    await db.flush()
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=access, usuario=UsuarioRead.model_validate(usuario))


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    usuario = await db.scalar(select(Usuario).where(Usuario.email == body.email))
    if usuario is None or not verify_password(body.senha, usuario.senha_hash):
        raise AppException(
            status.HTTP_401_UNAUTHORIZED, "E-mail ou senha inválidos.", "INVALID_CREDENTIALS"
        )
    if not usuario.ativo:
        raise AppException(status.HTTP_403_FORBIDDEN, "Usuário inativo.", "USER_INACTIVE")

    return await _issue_tokens(response, usuario, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    if not refresh_token:
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Refresh token ausente.", "NO_REFRESH_TOKEN")

    # Valida assinatura/expiração do JWT
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        _clear_refresh_cookie(response)
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Refresh token inválido.", "INVALID_REFRESH_TOKEN")

    if payload.get("type") != "refresh":
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Tipo de token inválido.", "INVALID_TOKEN_TYPE")

    # Confere existência no banco (permite invalidação por logout)
    registro = await db.scalar(select(RefreshToken).where(RefreshToken.token == refresh_token))
    if registro is None:
        _clear_refresh_cookie(response)
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada.", "REFRESH_TOKEN_REVOKED")

    if registro.expires_at < datetime.now(timezone.utc):
        await db.delete(registro)
        _clear_refresh_cookie(response)
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada.", "REFRESH_TOKEN_EXPIRED")

    usuario = await db.get(Usuario, registro.usuario_id)
    if usuario is None or not usuario.ativo:
        await db.delete(registro)
        _clear_refresh_cookie(response)
        raise AppException(status.HTTP_401_UNAUTHORIZED, "Usuário indisponível.", "USER_UNAVAILABLE")

    # Rotação: invalida o token atual e emite um novo
    await db.delete(registro)
    await db.flush()
    return await _issue_tokens(response, usuario, db)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> MessageResponse:
    if refresh_token:
        await db.execute(delete(RefreshToken).where(RefreshToken.token == refresh_token))
    _clear_refresh_cookie(response)
    return MessageResponse(detail="Logout realizado com sucesso.")


@router.get("/me", response_model=UsuarioRead)
async def me(usuario: Usuario = Depends(get_current_user)) -> UsuarioRead:
    return UsuarioRead.model_validate(usuario)
