"""campos de PGR: riscos e EPIs no cargo, medições e máquinas no setor

Passo atrás no modelo (sessão #17, 18/07/2026): o modelo só tinha texto livre por
setor/cargo, insuficiente para o técnico interno montar o PGR. A operação confirmou
a necessidade antes mesmo da demo.

Decisões (ver PROGRESS e CATALOGO_RISCOS.md):
- Riscos e EPIs ficam no CARGO (a exposição é da função). Medições e máquinas no
  SETOR (é ambiente).
- Os códigos de risco/EPI são gravados como texto[] (ARRAY), NUNCA ENUM do Postgres:
  o PG não remove valor de enum, e mudar a lista viraria o ritual da migration 0002.
  A validação é na camada da aplicação (app/models/catalogo.py).
- `possui_riscos` / `utiliza_epis` são booleanos NULLABLE (3 estados): null = não
  informado, false = declarou que não há, true = há. Lista vazia não distingue
  "verificou e não há" de "não preencheu", e no PGR declarar a ausência é afirmação.

Revision ID: 0004_campos_pgr
Revises: 0003_motivo_cancelamento
Create Date: 2026-07-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_campos_pgr"
down_revision: Union[str, None] = "0003_motivo_cancelamento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Cargo: exposição da função ---
    op.add_column("cargos", sa.Column("num_trabalhadores", sa.Integer()))
    op.add_column("cargos", sa.Column("jornada", sa.String(200)))
    op.add_column("cargos", sa.Column("possui_riscos", sa.Boolean()))
    op.add_column(
        "cargos",
        sa.Column("riscos", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
    )
    op.add_column("cargos", sa.Column("riscos_outros", sa.Text()))
    op.add_column("cargos", sa.Column("utiliza_epis", sa.Boolean()))
    op.add_column(
        "cargos",
        sa.Column("epis", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
    )
    op.add_column("cargos", sa.Column("epis_outros", sa.Text()))

    # --- Setor: ambiente ---
    op.add_column("setores", sa.Column("maquinas", sa.Text()))
    op.add_column("setores", sa.Column("ruido_db", sa.Numeric(5, 2)))
    op.add_column("setores", sa.Column("calor_ibutg", sa.Numeric(5, 2)))
    op.add_column("setores", sa.Column("iluminancia_lux", sa.Numeric(8, 2)))


def downgrade() -> None:
    op.drop_column("setores", "iluminancia_lux")
    op.drop_column("setores", "calor_ibutg")
    op.drop_column("setores", "ruido_db")
    op.drop_column("setores", "maquinas")

    op.drop_column("cargos", "epis_outros")
    op.drop_column("cargos", "epis")
    op.drop_column("cargos", "utiliza_epis")
    op.drop_column("cargos", "riscos_outros")
    op.drop_column("cargos", "riscos")
    op.drop_column("cargos", "possui_riscos")
    op.drop_column("cargos", "jornada")
    op.drop_column("cargos", "num_trabalhadores")
