"""Registro central dos models — importar tudo aqui garante que o Alembic
e o metadata da Base enxerguem todas as tabelas."""
from app.models.cargo import Cargo
from app.models.chamado import Chamado
from app.models.cliente import Cliente
from app.models.enums import (
    CanalNotif,
    RoleEnum,
    StatusChamado,
    StatusNotif,
    StatusRespostaValidacao,
    TipoVisitaEnum,
)
from app.models.foto import FotoSetor
from app.models.notificacao import NotificacaoLog
from app.models.refresh_token import RefreshToken
from app.models.round_robin import RoundRobinTecnico
from app.models.setor import Setor
from app.models.unidade import UnidadeMedsest
from app.models.usuario import Usuario
from app.models.validacao_cliente import ValidacaoCliente

__all__ = [
    "Cargo",
    "Chamado",
    "Cliente",
    "FotoSetor",
    "NotificacaoLog",
    "RefreshToken",
    "RoundRobinTecnico",
    "Setor",
    "UnidadeMedsest",
    "Usuario",
    "ValidacaoCliente",
    "CanalNotif",
    "RoleEnum",
    "StatusChamado",
    "StatusNotif",
    "StatusRespostaValidacao",
    "TipoVisitaEnum",
]
