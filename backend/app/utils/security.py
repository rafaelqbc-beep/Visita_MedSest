"""Utilitários de segurança: hash de senhas e geração de tokens.

Reutilizado pelo seed e pela camada de autenticação (sessões futuras).
"""
import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def gerar_token_validacao() -> str:
    """Token seguro para o link de validação enviado ao cliente."""
    return secrets.token_urlsafe(64)
