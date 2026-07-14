"""Configuração central da aplicação — carrega variáveis de ambiente via Pydantic Settings."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Banco de dados ---
    DATABASE_URL: str = "postgresql+asyncpg://medsest_user:medsest_dev_password@localhost:5432/medsest_db"

    # --- Segurança / JWT ---
    SECRET_KEY: str = "troque-por-uma-chave-secreta-de-no-minimo-32-caracteres"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Uploads ---
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10

    # --- URLs / validação do cliente ---
    APP_BASE_URL: str = "http://localhost:5173"
    VALIDACAO_TOKEN_EXPIRE_DAYS: int = 7

    # --- E-mail (SMTP) ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "MedSest Visita"

    # --- WhatsApp (Twilio) ---
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""

    # --- Ambiente ---
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def sync_database_url(self) -> str:
        """URL síncrona para o Alembic (troca o driver asyncpg por psycopg2)."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg2")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
