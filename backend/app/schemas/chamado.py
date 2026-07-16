"""Schemas Pydantic para Chamados de visita."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import StatusChamado, TipoVisitaEnum


class ChamadoCreate(BaseModel):
    """Abertura de chamado pelo gestor comercial / admin.

    `tecnico_interno_id` não entra aqui: é atribuído automaticamente por
    round-robin. `unidade_medsest_id` e `gestor_comercial_id` são derivados
    do cliente e do usuário logado.
    """

    cliente_id: uuid.UUID
    tipo_visita: TipoVisitaEnum
    tecnico_externo_id: uuid.UUID | None = None
    recomendacoes: str | None = None
    data_proposta: date | None = None
    # Só é preciso informar quando um ADMIN abre o chamado e o cliente não tem
    # gestor definido; para o gestor comercial, assume-se o próprio usuário.
    gestor_comercial_id: uuid.UUID | None = None


class ChamadoUpdate(BaseModel):
    tipo_visita: TipoVisitaEnum | None = None
    tecnico_externo_id: uuid.UUID | None = None
    tecnico_interno_id: uuid.UUID | None = None
    recomendacoes: str | None = None
    data_proposta: date | None = None


class CancelarRequest(BaseModel):
    """Motivo do cancelamento.

    Opcional para chamado PENDENTE/EM_ANDAMENTO (rotina de agenda), mas
    OBRIGATÓRIO para anular um FINALIZADO — a validação fica no router, que é
    quem conhece o status.
    """

    motivo: str | None = None


class ReagendarRequest(BaseModel):
    """Técnico externo propõe nova data para a visita."""

    nova_data: date


class IniciarVisitaRequest(BaseModel):
    """Geolocalização capturada no navegador ao iniciar a visita.

    Opcional: o técnico pode ter negado a permissão de localização, e isso não
    pode impedir a visita de começar.
    """

    latitude: float | None = None
    longitude: float | None = None


class FinalizarVisitaRequest(BaseModel):
    """Geolocalização no momento do encerramento — evidência de que a
    conferência e as assinaturas foram feitas no local. Opcional pelo mesmo
    motivo do início."""

    latitude: float | None = None
    longitude: float | None = None


class ChamadoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_chamado: int
    cliente_id: uuid.UUID
    unidade_medsest_id: uuid.UUID
    gestor_comercial_id: uuid.UUID
    tecnico_externo_id: uuid.UUID | None = None
    tecnico_interno_id: uuid.UUID | None = None
    tipo_visita: TipoVisitaEnum
    recomendacoes: str | None = None
    data_proposta: date | None = None
    data_visita_alterada: date | None = None
    status: StatusChamado

    dt_abertura: datetime | None = None
    dt_inicio_visita: datetime | None = None
    dt_fim_visita: datetime | None = None
    geoloc_latitude: float | None = None
    geoloc_longitude: float | None = None

    # Assinaturas coletadas no local ao encerrar a visita
    assinatura_cliente_caminho: str | None = None
    assinatura_cliente_nome: str | None = None
    assinatura_cliente_cpf: str | None = None
    dt_assinatura_cliente: datetime | None = None
    assinatura_tecnico_caminho: str | None = None
    dt_assinatura_tecnico: datetime | None = None
    geoloc_assinatura_latitude: float | None = None
    geoloc_assinatura_longitude: float | None = None

    dt_liberado_tecnico_interno: datetime | None = None
    dt_exportacao_word: datetime | None = None

    motivo_cancelamento: str | None = None
    dt_cancelamento: datetime | None = None
    cancelado_por_id: uuid.UUID | None = None


class ChamadoListItem(ChamadoRead):
    """Item de listagem — inclui rótulos prontos para a tela, evitando que o
    frontend precise buscar cliente e técnicos um a um."""

    cliente_razao_social: str | None = None
    cliente_cidade: str | None = None
    tecnico_externo_nome: str | None = None
    tecnico_interno_nome: str | None = None
    cancelado_por_nome: str | None = None
