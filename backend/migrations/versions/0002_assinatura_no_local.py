"""substitui validacao por e-mail por assinatura no local

Mudança de escopo: a conferência dos dados passa a ser feita pelo técnico
junto ao cliente no próprio local, encerrando com a assinatura de ambos
(no tablet). Some o fluxo de token/e-mail com aprovar/comentar.

- status_chamado: removidos AGUARDANDO_VALIDACAO e AGUARDANDO_LIBERACAO
- tabela validacoes_cliente: removida
- chamados: removidas as colunas do fluxo de e-mail; adicionadas as de assinatura

Revision ID: 0002_assinatura_no_local
Revises: 0001_initial
Create Date: 2026-07-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_assinatura_no_local"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STATUS_NOVOS = ["PENDENTE", "EM_ANDAMENTO", "FINALIZADO", "CANCELADO"]
STATUS_ANTIGOS = [
    "PENDENTE", "EM_ANDAMENTO", "AGUARDANDO_VALIDACAO",
    "AGUARDANDO_LIBERACAO", "FINALIZADO", "CANCELADO",
]


def _create_enum_sql(nome: str, valores: list[str]) -> str:
    lista = ", ".join(f"'{v}'" for v in valores)
    return f"CREATE TYPE {nome} AS ENUM ({lista})"


def upgrade() -> None:
    # 1. Tabela de validações do cliente deixa de existir
    op.drop_index("idx_validacoes_chamado", table_name="validacoes_cliente")
    op.drop_index("idx_validacoes_token", table_name="validacoes_cliente")
    op.drop_table("validacoes_cliente")

    # 2. Colunas do fluxo de e-mail saem
    op.drop_column("chamados", "dt_email_validacao_enviado")
    op.drop_column("chamados", "dt_cliente_aprovou")
    op.drop_column("chamados", "dt_cliente_comentou")
    op.drop_column("chamados", "rodadas_validacao")

    # 3. Colunas de assinatura entram
    op.add_column("chamados", sa.Column("assinatura_cliente_caminho", sa.String(500)))
    op.add_column("chamados", sa.Column("assinatura_cliente_nome", sa.String(200)))
    op.add_column("chamados", sa.Column("assinatura_cliente_cpf", sa.String(14)))
    op.add_column("chamados", sa.Column("dt_assinatura_cliente", sa.DateTime(timezone=True)))
    op.add_column("chamados", sa.Column("assinatura_tecnico_caminho", sa.String(500)))
    op.add_column("chamados", sa.Column("dt_assinatura_tecnico", sa.DateTime(timezone=True)))
    op.add_column("chamados", sa.Column("geoloc_assinatura_latitude", sa.DECIMAL(10, 8)))
    op.add_column("chamados", sa.Column("geoloc_assinatura_longitude", sa.DECIMAL(11, 8)))

    # 4. Recriar o enum sem os dois status do fluxo antigo.
    #    O PostgreSQL não remove valores de um ENUM: cria-se um tipo novo,
    #    converte-se a coluna e descarta-se o antigo.
    op.execute("ALTER TYPE status_chamado RENAME TO status_chamado_old")
    op.execute(_create_enum_sql("status_chamado", STATUS_NOVOS))
    op.execute("ALTER TABLE chamados ALTER COLUMN status DROP DEFAULT")
    # Chamados que estavam em validação voltam para EM_ANDAMENTO:
    # ainda não foram assinados, então não estão finalizados.
    op.execute(
        """
        ALTER TABLE chamados
        ALTER COLUMN status TYPE status_chamado
        USING (
            CASE status::text
                WHEN 'AGUARDANDO_VALIDACAO' THEN 'EM_ANDAMENTO'
                WHEN 'AGUARDANDO_LIBERACAO' THEN 'EM_ANDAMENTO'
                ELSE status::text
            END
        )::status_chamado
        """
    )
    op.execute("ALTER TABLE chamados ALTER COLUMN status SET DEFAULT 'PENDENTE'")
    op.execute("DROP TYPE status_chamado_old")


def downgrade() -> None:
    # Enum volta a ter os 6 valores
    op.execute("ALTER TYPE status_chamado RENAME TO status_chamado_new")
    op.execute(_create_enum_sql("status_chamado", STATUS_ANTIGOS))
    op.execute("ALTER TABLE chamados ALTER COLUMN status DROP DEFAULT")
    op.execute(
        "ALTER TABLE chamados ALTER COLUMN status TYPE status_chamado "
        "USING status::text::status_chamado"
    )
    op.execute("ALTER TABLE chamados ALTER COLUMN status SET DEFAULT 'PENDENTE'")
    op.execute("DROP TYPE status_chamado_new")

    op.drop_column("chamados", "geoloc_assinatura_longitude")
    op.drop_column("chamados", "geoloc_assinatura_latitude")
    op.drop_column("chamados", "dt_assinatura_tecnico")
    op.drop_column("chamados", "assinatura_tecnico_caminho")
    op.drop_column("chamados", "dt_assinatura_cliente")
    op.drop_column("chamados", "assinatura_cliente_cpf")
    op.drop_column("chamados", "assinatura_cliente_nome")
    op.drop_column("chamados", "assinatura_cliente_caminho")

    op.add_column("chamados", sa.Column("dt_email_validacao_enviado", sa.DateTime(timezone=True)))
    op.add_column("chamados", sa.Column("dt_cliente_aprovou", sa.DateTime(timezone=True)))
    op.add_column("chamados", sa.Column("dt_cliente_comentou", sa.DateTime(timezone=True)))
    op.add_column("chamados", sa.Column("rodadas_validacao", sa.Integer(), server_default="0"))

    op.create_table(
        "validacoes_cliente",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("chamado_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chamados.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(128), nullable=False, unique=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rodada", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status_resposta", sa.String(20)),
        sa.Column("comentarios", sa.Text()),
        sa.Column("dt_resposta", sa.DateTime(timezone=True)),
        sa.Column("ip_resposta", sa.String(45)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_validacoes_token", "validacoes_cliente", ["token"])
    op.create_index("idx_validacoes_chamado", "validacoes_cliente", ["chamado_id"])
