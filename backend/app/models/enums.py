"""Enums do domínio — refletem os tipos ENUM do PostgreSQL definidos no schema."""
import enum


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    GESTOR_COMERCIAL = "GESTOR_COMERCIAL"
    TECNICO_EXTERNO = "TECNICO_EXTERNO"
    TECNICO_INTERNO = "TECNICO_INTERNO"


class TipoVisitaEnum(str, enum.Enum):
    NOVO_CLIENTE = "NOVO_CLIENTE"
    RENOVACAO = "RENOVACAO"
    VISITA_TECNICA = "VISITA_TECNICA"


class StatusChamado(str, enum.Enum):
    """Fluxo: a conferência e as assinaturas acontecem no local, ao fim da visita.

    PENDENTE -> EM_ANDAMENTO -> FINALIZADO (assinado por cliente + técnico)
    Qualquer estado pode ir para CANCELADO (ADMIN).
    """

    PENDENTE = "PENDENTE"          # aguardando técnico externo iniciar
    EM_ANDAMENTO = "EM_ANDAMENTO"  # visita em execução / conferência com o cliente
    FINALIZADO = "FINALIZADO"      # assinado no local; liberado ao técnico interno
    CANCELADO = "CANCELADO"


class CanalNotif(str, enum.Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"


class StatusNotif(str, enum.Enum):
    ENVIADO = "ENVIADO"
    FALHOU = "FALHOU"
