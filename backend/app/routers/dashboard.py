"""Dashboard: KPIs, distribuição por tipo de visita e séries dos gráficos."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.enums import TipoVisitaEnum
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import montar_dashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def obter_dashboard(
    unidade_id: uuid.UUID | None = Query(None, description="Só tem efeito para ADMIN"),
    periodo_inicio: date | None = Query(None, description="Recorta as análises por dt_abertura"),
    periodo_fim: date | None = Query(None, description="Recorta as análises por dt_abertura"),
    tipo_visita: TipoVisitaEnum | None = Query(None),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> DashboardResponse:
    """Cada perfil vê o dashboard do seu próprio escopo de chamados —
    a mesma regra da listagem de chamados.
    """
    return await montar_dashboard(
        db,
        usuario,
        unidade_id=unidade_id,
        periodo_inicio=periodo_inicio,
        periodo_fim=periodo_fim,
        tipo_visita=tipo_visita,
    )
