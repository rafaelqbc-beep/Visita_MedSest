"""registra o cancelamento: motivo, quando e por quem

Decisão de negócio (16/07/2026): cancelar um chamado PENDENTE/EM_ANDAMENTO é
rotina de agenda e segue com o gestor. Anular um FINALIZADO — já conferido e
assinado pelo cliente, com nome, CPF e geolocalização — é outra coisa: exige
ADMIN e um motivo registrado.

Também fecha a pendência aberta na sessão #5 (motivo do cancelamento).

Revision ID: 0003_motivo_cancelamento
Revises: 0002_assinatura_no_local
Create Date: 2026-07-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_motivo_cancelamento"
down_revision: Union[str, None] = "0002_assinatura_no_local"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chamados", sa.Column("motivo_cancelamento", sa.Text()))
    op.add_column("chamados", sa.Column("dt_cancelamento", sa.DateTime(timezone=True)))
    op.add_column(
        "chamados",
        sa.Column(
            "cancelado_por_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id"),
        ),
    )


def downgrade() -> None:
    op.drop_column("chamados", "cancelado_por_id")
    op.drop_column("chamados", "dt_cancelamento")
    op.drop_column("chamados", "motivo_cancelamento")
