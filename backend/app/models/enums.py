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
    PENDENTE = "PENDENTE"                          # aguardando técnico externo
    EM_ANDAMENTO = "EM_ANDAMENTO"                  # visita em execução
    AGUARDANDO_VALIDACAO = "AGUARDANDO_VALIDACAO"  # e-mail enviado ao cliente
    AGUARDANDO_LIBERACAO = "AGUARDANDO_LIBERACAO"  # cliente comentou, ajustes em curso
    FINALIZADO = "FINALIZADO"                      # cliente aprovou
    CANCELADO = "CANCELADO"


class CanalNotif(str, enum.Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"


class StatusNotif(str, enum.Enum):
    ENVIADO = "ENVIADO"
    FALHOU = "FALHOU"


class StatusRespostaValidacao(str, enum.Enum):
    APROVADO = "APROVADO"
    COMENTADO = "COMENTADO"
