"""Seed do banco MedSest Visita — dados de teste para desenvolvimento.

Uso:
    python seed.py

Cria: 1 unidade, usuarios (admin, gestor, 2 tecnicos externos, 3 internos),
3 clientes (um de cada tipo de visita) e 5 chamados cobrindo os 4 status.

O script e idempotente por CNPJ da unidade: se ja existir, aborta para nao
duplicar. Rode em banco limpo.
"""
import asyncio
import base64
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import (
    Cargo,
    Chamado,
    Cliente,
    RoundRobinTecnico,
    Setor,
    UnidadeMedsest,
    Usuario,
)
from app.models.enums import RoleEnum, StatusChamado, TipoVisitaEnum
from app.utils.security import hash_password

SENHA_PADRAO = "Senha@123"

# PNG 1x1 transparente — placeholder para as assinaturas do seed, so para os
# caminhos no banco apontarem para arquivos que existem de fato.
_PNG_PLACEHOLDER = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def criar_assinatura_placeholder(nome_arquivo: str) -> str:
    """Grava um PNG placeholder em uploads/assinaturas e devolve o caminho relativo."""
    destino = Path(settings.UPLOAD_DIR) / "assinaturas"
    destino.mkdir(parents=True, exist_ok=True)
    (destino / nome_arquivo).write_bytes(_PNG_PLACEHOLDER)
    return f"assinaturas/{nome_arquivo}"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existe = await db.scalar(
            select(UnidadeMedsest).where(UnidadeMedsest.cnpj == "12.345.678/0001-95")
        )
        if existe:
            print("[AVISO] Seed ja aplicado (unidade principal existe). Abortando.")
            return

        # --- Unidade ---
        unidade = UnidadeMedsest(
            nome="MedSest Goiania",
            cnpj="12.345.678/0001-95",
            endereco="Av. T-63, 1000, Setor Bueno",
            cidade="Goiania",
            estado="GO",
            cep="74230-100",
            telefone="(62) 3000-0000",
            email="goiania@medsest.com.br",
        )
        db.add(unidade)
        await db.flush()

        # --- Usuarios ---
        admin = Usuario(
            nome="Administrador MedSest",
            email="admin@medsest.com.br",
            senha_hash=hash_password("Admin@123"),
            role=RoleEnum.ADMIN,
            unidade_id=unidade.id,
        )
        gestor = Usuario(
            nome="Carlos Gestor Comercial",
            email="gestor@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            telefone="(62) 99999-0001",
            whatsapp="(62) 99999-0001",
            role=RoleEnum.GESTOR_COMERCIAL,
            unidade_id=unidade.id,
        )
        tec_ext_1 = Usuario(
            nome="Ana Tecnica Externa",
            email="ana.externa@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            whatsapp="(62) 99999-0002",
            role=RoleEnum.TECNICO_EXTERNO,
            unidade_id=unidade.id,
        )
        tec_ext_2 = Usuario(
            nome="Bruno Tecnico Externo",
            email="bruno.externo@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            whatsapp="(62) 99999-0003",
            role=RoleEnum.TECNICO_EXTERNO,
            unidade_id=unidade.id,
        )
        tec_int_a = Usuario(
            nome="Tecnico Interno A",
            email="interno.a@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        tec_int_b = Usuario(
            nome="Tecnico Interno B",
            email="interno.b@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        tec_int_c = Usuario(
            nome="Tecnico Interno C",
            email="interno.c@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        db.add_all([admin, gestor, tec_ext_1, tec_ext_2, tec_int_a, tec_int_b, tec_int_c])
        await db.flush()

        # --- Round-robin inicial (ultimo = A, proximo sera B) ---
        db.add(
            RoundRobinTecnico(
                unidade_medsest_id=unidade.id,
                ultimo_tecnico_interno_id=tec_int_a.id,
            )
        )

        # --- Clientes (um de cada tipo de visita padrao) ---
        cliente_novo = Cliente(
            razao_social="Industria Alfa Ltda",
            cnpj="11.111.111/0001-91",
            nome_fantasia="Alfa",
            endereco="Rua Industrial, 100",
            cidade="Goiania",
            estado="GO",
            cep="74000-000",
            nome_contato="Joao Silva",
            celular_contato="(62) 98888-0001",
            email_contato="joao@alfa.com.br",
            tipo_visita_padrao=TipoVisitaEnum.NOVO_CLIENTE,
            gestor_comercial_id=gestor.id,
            unidade_medsest_id=unidade.id,
        )
        cliente_renov = Cliente(
            razao_social="Comercio Beta S.A.",
            cnpj="22.222.222/0001-91",
            nome_fantasia="Beta",
            endereco="Av. Comercial, 200",
            cidade="Aparecida de Goiania",
            estado="GO",
            cep="74900-000",
            nome_contato="Maria Souza",
            celular_contato="(62) 98888-0002",
            email_contato="maria@beta.com.br",
            tipo_visita_padrao=TipoVisitaEnum.RENOVACAO,
            gestor_comercial_id=gestor.id,
            unidade_medsest_id=unidade.id,
        )
        cliente_tec = Cliente(
            razao_social="Servicos Gama ME",
            cnpj="33.333.333/0001-91",
            nome_fantasia="Gama",
            endereco="Rua dos Servicos, 300",
            cidade="Goiania",
            estado="GO",
            cep="74100-000",
            nome_contato="Pedro Lima",
            celular_contato="(62) 98888-0003",
            email_contato="pedro@gama.com.br",
            tipo_visita_padrao=TipoVisitaEnum.VISITA_TECNICA,
            gestor_comercial_id=gestor.id,
            unidade_medsest_id=unidade.id,
        )
        db.add_all([cliente_novo, cliente_renov, cliente_tec])
        await db.flush()

        agora = utcnow()

        # --- Chamado 1: PENDENTE (Novo Cliente) ---
        ch1 = Chamado(
            cliente_id=cliente_novo.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_1.id,
            tecnico_interno_id=tec_int_b.id,
            tipo_visita=TipoVisitaEnum.NOVO_CLIENTE,
            recomendacoes="Primeira visita - levantar todos os setores produtivos.",
            data_proposta=date.today() + timedelta(days=3),
            status=StatusChamado.PENDENTE,
            dt_abertura=agora,
        )

        # --- Chamado 2: EM_ANDAMENTO com setores/cargos parciais (Renovacao) ---
        ch2 = Chamado(
            cliente_id=cliente_renov.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_2.id,
            tecnico_interno_id=tec_int_c.id,
            tipo_visita=TipoVisitaEnum.RENOVACAO,
            recomendacoes="Renovacao anual - conferir mudancas no layout.",
            data_proposta=date.today(),
            status=StatusChamado.EM_ANDAMENTO,
            dt_abertura=agora - timedelta(days=1),
            dt_inicio_visita=agora - timedelta(hours=2),
            geoloc_latitude=-16.68690000,
            geoloc_longitude=-49.26480000,
        )
        db.add_all([ch1, ch2])
        await db.flush()

        setor_admin = Setor(
            chamado_id=ch2.id, nome="Administrativo",
            descricao_ambiente="Escritorio climatizado, iluminacao artificial.", ordem=0,
        )
        setor_prod = Setor(
            chamado_id=ch2.id, nome="Producao",
            descricao_ambiente="Galpao com maquinas, ruido elevado.", ordem=1,
        )
        db.add_all([setor_admin, setor_prod])
        await db.flush()
        db.add_all([
            Cargo(setor_id=setor_admin.id, nome_cargo="Auxiliar Administrativo",
                  descricao_funcao="Rotinas de escritorio e atendimento.", ordem=0),
            Cargo(setor_id=setor_prod.id, nome_cargo="Operador de Maquinas",
                  descricao_funcao="Operacao de prensa e esteira.", ordem=0),
        ])

        # --- Chamado 3: FINALIZADO recem-assinado, aguardando exportacao (Novo Cliente) ---
        ch3 = Chamado(
            cliente_id=cliente_novo.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_1.id,
            tecnico_interno_id=tec_int_a.id,
            tipo_visita=TipoVisitaEnum.NOVO_CLIENTE,
            recomendacoes="Visita concluida e assinada no local.",
            data_proposta=date.today() - timedelta(days=2),
            status=StatusChamado.FINALIZADO,
            dt_abertura=agora - timedelta(days=5),
            dt_inicio_visita=agora - timedelta(days=2, hours=3),
            dt_fim_visita=agora - timedelta(days=2, hours=1),
            geoloc_latitude=-16.68690000,
            geoloc_longitude=-49.26480000,
            assinatura_cliente_caminho=criar_assinatura_placeholder("seed-ch3-cliente.png"),
            assinatura_cliente_nome="Joao Silva",
            assinatura_cliente_cpf="529.982.247-25",
            dt_assinatura_cliente=agora - timedelta(days=2, hours=1),
            assinatura_tecnico_caminho=criar_assinatura_placeholder("seed-ch3-tecnico.png"),
            dt_assinatura_tecnico=agora - timedelta(days=2, hours=1),
            geoloc_assinatura_latitude=-16.68690000,
            geoloc_assinatura_longitude=-49.26480000,
            dt_liberado_tecnico_interno=agora - timedelta(days=2, hours=1),
        )
        db.add(ch3)
        await db.flush()
        setor_ch3 = Setor(chamado_id=ch3.id, nome="Recepcao",
                          descricao_ambiente="Area de atendimento ao publico.", ordem=0)
        db.add(setor_ch3)
        await db.flush()
        db.add(Cargo(setor_id=setor_ch3.id, nome_cargo="Recepcionista",
                     descricao_funcao="Atendimento e triagem.", ordem=0))

        # --- Chamado 4: FINALIZADO e ja exportado em Word (Renovacao) ---
        ch4 = Chamado(
            cliente_id=cliente_renov.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_1.id,
            tecnico_interno_id=tec_int_c.id,
            tipo_visita=TipoVisitaEnum.RENOVACAO,
            recomendacoes="Processo concluido e exportado.",
            data_proposta=date.today() - timedelta(days=15),
            status=StatusChamado.FINALIZADO,
            dt_abertura=agora - timedelta(days=20),
            dt_inicio_visita=agora - timedelta(days=15, hours=5),
            dt_fim_visita=agora - timedelta(days=15, hours=3),
            geoloc_latitude=-16.82470000,
            geoloc_longitude=-49.24560000,
            assinatura_cliente_caminho=criar_assinatura_placeholder("seed-ch4-cliente.png"),
            assinatura_cliente_nome="Maria Souza",
            assinatura_cliente_cpf="248.438.034-80",
            dt_assinatura_cliente=agora - timedelta(days=15, hours=3),
            assinatura_tecnico_caminho=criar_assinatura_placeholder("seed-ch4-tecnico.png"),
            dt_assinatura_tecnico=agora - timedelta(days=15, hours=3),
            geoloc_assinatura_latitude=-16.82470000,
            geoloc_assinatura_longitude=-49.24560000,
            dt_liberado_tecnico_interno=agora - timedelta(days=15, hours=3),
            dt_exportacao_word=agora - timedelta(days=10),
        )
        db.add(ch4)
        await db.flush()
        setor_ch4 = Setor(chamado_id=ch4.id, nome="Escritorio Central",
                          descricao_ambiente="Area administrativa da matriz.", ordem=0)
        db.add(setor_ch4)
        await db.flush()
        db.add(Cargo(setor_id=setor_ch4.id, nome_cargo="Analista Financeiro",
                     descricao_funcao="Gestao de contas e conciliacao.", ordem=0))

        # --- Chamado 5: CANCELADO (Visita Tecnica) ---
        ch5 = Chamado(
            cliente_id=cliente_tec.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_2.id,
            tecnico_interno_id=tec_int_b.id,
            tipo_visita=TipoVisitaEnum.VISITA_TECNICA,
            recomendacoes="Cliente solicitou cancelamento da visita.",
            data_proposta=date.today() - timedelta(days=6),
            status=StatusChamado.CANCELADO,
            dt_abertura=agora - timedelta(days=8),
        )
        db.add(ch5)

        await db.commit()

    print("[OK] Seed concluido com sucesso!")
    print("   Unidade: MedSest Goiania")
    print("   Admin:   admin@medsest.com.br / Admin@123")
    print("   Demais usuarios (gestor/tecnicos): senha Senha@123")
    print("   3 clientes e 5 chamados (PENDENTE, EM_ANDAMENTO, 2x FINALIZADO, CANCELADO).")


if __name__ == "__main__":
    asyncio.run(seed())
