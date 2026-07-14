"""estrutura inicial do banco MedSest Visita

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# --- Definição dos ENUMs (create_type=False: criados explicitamente abaixo) ---
role_enum = postgresql.ENUM(
    "ADMIN", "GESTOR_COMERCIAL", "TECNICO_EXTERNO", "TECNICO_INTERNO",
    name="role_enum", create_type=False,
)
tipo_visita_enum = postgresql.ENUM(
    "NOVO_CLIENTE", "RENOVACAO", "VISITA_TECNICA",
    name="tipo_visita_enum", create_type=False,
)
status_chamado = postgresql.ENUM(
    "PENDENTE", "EM_ANDAMENTO", "AGUARDANDO_VALIDACAO",
    "AGUARDANDO_LIBERACAO", "FINALIZADO", "CANCELADO",
    name="status_chamado", create_type=False,
)
canal_notif = postgresql.ENUM("EMAIL", "WHATSAPP", name="canal_notif", create_type=False)
status_notif = postgresql.ENUM("ENVIADO", "FALHOU", name="status_notif", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    # Extensão para gen_random_uuid() (nativo no PG13+, pgcrypto por garantia)
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Criar os tipos ENUM
    for enum in (role_enum, tipo_visita_enum, status_chamado, canal_notif, status_notif):
        enum.create(bind, checkfirst=True)

    # Sequência para numero_chamado (equivalente ao SERIAL)
    op.execute("CREATE SEQUENCE IF NOT EXISTS chamados_numero_chamado_seq")

    # --- unidades_medsest ---
    op.create_table(
        "unidades_medsest",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=False, unique=True),
        sa.Column("endereco", sa.Text()),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.CHAR(2)),
        sa.Column("cep", sa.String(9)),
        sa.Column("telefone", sa.String(20)),
        sa.Column("email", sa.String(200)),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # --- usuarios ---
    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("email", sa.String(200), nullable=False, unique=True),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("whatsapp", sa.String(20)),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("unidade_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("unidades_medsest.id")),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"])

    # --- clientes ---
    op.create_table(
        "clientes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("razao_social", sa.String(300), nullable=False),
        sa.Column("cnpj", sa.String(18)),
        sa.Column("nome_fantasia", sa.String(200)),
        sa.Column("filial", sa.String(100)),
        sa.Column("endereco", sa.Text()),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.CHAR(2)),
        sa.Column("cep", sa.String(9)),
        sa.Column("nome_contato", sa.String(200)),
        sa.Column("celular_contato", sa.String(20)),
        sa.Column("email_contato", sa.String(200)),
        sa.Column("tipo_visita_padrao", tipo_visita_enum),
        sa.Column("gestor_comercial_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id")),
        sa.Column("unidade_medsest_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("unidades_medsest.id")),
        sa.Column("ativo", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # --- chamados ---
    op.create_table(
        "chamados",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("numero_chamado", sa.Integer(), nullable=False, unique=True,
                  server_default=sa.text("nextval('chamados_numero_chamado_seq')")),
        sa.Column("cliente_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("unidade_medsest_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("unidades_medsest.id"), nullable=False),
        sa.Column("gestor_comercial_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("tecnico_externo_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id")),
        sa.Column("tecnico_interno_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id")),
        sa.Column("tipo_visita", tipo_visita_enum, nullable=False),
        sa.Column("recomendacoes", sa.Text()),
        sa.Column("data_proposta", sa.Date()),
        sa.Column("data_visita_alterada", sa.Date()),
        sa.Column("status", status_chamado, nullable=False, server_default="PENDENTE"),
        sa.Column("dt_abertura", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("dt_inicio_visita", sa.DateTime(timezone=True)),
        sa.Column("dt_fim_visita", sa.DateTime(timezone=True)),
        sa.Column("geoloc_latitude", sa.DECIMAL(10, 8)),
        sa.Column("geoloc_longitude", sa.DECIMAL(11, 8)),
        sa.Column("dt_email_validacao_enviado", sa.DateTime(timezone=True)),
        sa.Column("dt_cliente_aprovou", sa.DateTime(timezone=True)),
        sa.Column("dt_cliente_comentou", sa.DateTime(timezone=True)),
        sa.Column("dt_liberado_tecnico_interno", sa.DateTime(timezone=True)),
        sa.Column("dt_exportacao_word", sa.DateTime(timezone=True)),
        sa.Column("rodadas_validacao", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    # Sequência pertence à coluna
    op.execute("ALTER SEQUENCE chamados_numero_chamado_seq OWNED BY chamados.numero_chamado")
    op.create_index("idx_chamados_status", "chamados", ["status"])
    op.create_index("idx_chamados_tecnico_externo", "chamados", ["tecnico_externo_id"])
    op.create_index("idx_chamados_tecnico_interno", "chamados", ["tecnico_interno_id"])
    op.create_index("idx_chamados_cliente", "chamados", ["cliente_id"])
    op.create_index("idx_chamados_tipo_visita", "chamados", ["tipo_visita"])

    # --- validacoes_cliente ---
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

    # --- setores ---
    op.create_table(
        "setores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("chamado_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chamados.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("descricao_ambiente", sa.Text()),
        sa.Column("ordem", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_setores_chamado", "setores", ["chamado_id"])

    # --- cargos ---
    op.create_table(
        "cargos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("setor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("setores.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome_cargo", sa.String(200), nullable=False),
        sa.Column("descricao_funcao", sa.Text()),
        sa.Column("ordem", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_cargos_setor", "cargos", ["setor_id"])

    # --- fotos_setor ---
    op.create_table(
        "fotos_setor",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("setor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("setores.id", ondelete="CASCADE"), nullable=False),
        sa.Column("caminho_arquivo", sa.String(500), nullable=False),
        sa.Column("nome_original", sa.String(255)),
        sa.Column("descricao", sa.String(500)),
        sa.Column("tamanho_bytes", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_fotos_setor", "fotos_setor", ["setor_id"])

    # --- notificacoes_log ---
    op.create_table(
        "notificacoes_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("chamado_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chamados.id")),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id")),
        sa.Column("email_destinatario", sa.String(200)),
        sa.Column("tipo", canal_notif, nullable=False),
        sa.Column("evento", sa.String(100), nullable=False),
        sa.Column("status", status_notif, nullable=False),
        sa.Column("detalhes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # --- round_robin_tecnico ---
    op.create_table(
        "round_robin_tecnico",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("unidade_medsest_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("unidades_medsest.id"), nullable=False, unique=True),
        sa.Column("ultimo_tecnico_interno_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # --- refresh_tokens ---
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("usuarios.id", ondelete="CASCADE")),
        sa.Column("token", sa.String(500), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("round_robin_tecnico")
    op.drop_table("notificacoes_log")
    op.drop_index("idx_fotos_setor", table_name="fotos_setor")
    op.drop_table("fotos_setor")
    op.drop_index("idx_cargos_setor", table_name="cargos")
    op.drop_table("cargos")
    op.drop_index("idx_setores_chamado", table_name="setores")
    op.drop_table("setores")
    op.drop_index("idx_validacoes_chamado", table_name="validacoes_cliente")
    op.drop_index("idx_validacoes_token", table_name="validacoes_cliente")
    op.drop_table("validacoes_cliente")
    op.drop_index("idx_chamados_tipo_visita", table_name="chamados")
    op.drop_index("idx_chamados_cliente", table_name="chamados")
    op.drop_index("idx_chamados_tecnico_interno", table_name="chamados")
    op.drop_index("idx_chamados_tecnico_externo", table_name="chamados")
    op.drop_index("idx_chamados_status", table_name="chamados")
    op.drop_table("chamados")
    op.execute("DROP SEQUENCE IF EXISTS chamados_numero_chamado_seq")
    op.drop_table("clientes")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_table("unidades_medsest")

    for enum_name in ("status_notif", "canal_notif", "status_chamado", "tipo_visita_enum", "role_enum"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
