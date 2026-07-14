"""Geração e verificação de tokens JWT (access e refresh)."""
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

ALGORITHM = settings.ALGORITHM


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, role: str) -> str:
    """Token de acesso de curta duração (default 30 min)."""
    expire = _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),  # garante unicidade mesmo dentro do mesmo segundo
        "exp": expire,
        "iat": _now(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, datetime]:
    """Token de refresh de longa duração (default 7 dias).

    Retorna (token, expires_at) — o expires_at é persistido em refresh_tokens.
    O jti garante unicidade mesmo para o mesmo usuário/instante.
    """
    expire = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": expire,
        "iat": _now(),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def decode_token(token: str) -> dict:
    """Decodifica e valida a assinatura/expiração. Lança JWTError se inválido."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


__all__ = ["create_access_token", "create_refresh_token", "decode_token", "JWTError"]
