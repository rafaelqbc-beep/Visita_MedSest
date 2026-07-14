"""Seed do banco MedSest Visita — dados de teste para desenvolvimento.

Uso:
    python seed.py

Cria: 1 unidade, usuários (admin, gestor, 2 técnicos externos, 3 internos),
3 clientes (um de cada tipo de visita) e 5 chamados em estados diferentes.

O script é idempotente por e-mail/razão social: se já existir a unidade
principal, ele aborta para não duplicar. Rode em banco limpo.
"""
import asyncio
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import (
    Cargo,
    Chamado,
    Cliente,
    RoundRobinTecnico,
    Setor,
    UnidadeMedsest,
    Usuario,
    ValidacaoCliente,
)
from app.models.enums import RoleEnum, StatusChamado, TipoVisitaEnum
from app.utils.security import gerar_token_validacao, hash_password

SENHA_PADRAO = "Senha@123"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Evita duplicar se já rodou
        existe = await db.scalar(
            select(UnidadeMedsest).where(UnidadeMedsest.cnpj == "12.345.678/0001-90")
        )
        if existe:
            print("⚠ Seed já aplicado (unidade principal existe). Abortando.")
            return

        # --- Unidade ---
        unidade = UnidadeMedsest(
            nome="MedSest Goiânia",
            cnpj="12.345.678/0001-90",
            endereco="Av. T-63, 1000, Setor Bueno",
            cidade="Goiânia",
            estado="GO",
            cep="74230-100",
            telefone="(62) 3000-0000",
            email="goiania@medsest.com.br",
        )
        db.add(unidade)
        await db.flush()

        # --- Usuários ---
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
            nome="Ana Técnica Externa",
            email="ana.externa@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            whatsapp="(62) 99999-0002",
            role=RoleEnum.TECNICO_EXTERNO,
            unidade_id=unidade.id,
        )
        tec_ext_2 = Usuario(
            nome="Bruno Técnico Externo",
            email="bruno.externo@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            whatsapp="(62) 99999-0003",
            role=RoleEnum.TECNICO_EXTERNO,
            unidade_id=unidade.id,
        )
        tec_int_a = Usuario(
            nome="Técnico Interno A",
            email="interno.a@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        tec_int_b = Usuario(
            nome="Técnico Interno B",
            email="interno.b@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        tec_int_c = Usuario(
            nome="Técnico Interno C",
            email="interno.c@medsest.com.br",
            senha_hash=hash_password(SENHA_PADRAO),
            role=RoleEnum.TECNICO_INTERNO,
            unidade_id=unidade.id,
        )
        db.add_all([admin, gestor, tec_ext_1, tec_ext_2, tec_int_a, tec_int_b, tec_int_c])
        await db.flush()

        # --- Round-robin inicial (último = A, próximo será B) ---
        db.add(
            RoundRobinTecnico(
                unidade_medsest_id=unidade.id,
                ultimo_tecnico_interno_id=tec_int_a.id,
            )
        )

        # --- Clientes (um de cada tipo de visita padrão) ---
        cliente_novo = Cliente(
            razao_social="Indústria Alfa Ltda",
            cnpj="11.111.111/0001-11",
            nome_fantasia="Alfa",
            endereco="Rua Industrial, 100",
            cidade="Goiânia",
            estado="GO",
            cep="74000-000",
            nome_contato="João Silva",
            celular_contato="(62) 98888-0001",
            email_contato="joao@alfa.com.br",
            tipo_visita_padrao=TipoVisitaEnum.NOVO_CLIENTE,
            gestor_comercial_id=gestor.id,
            unidade_medsest_id=unidade.id,
        )
        cliente_renov = Cliente(
            razao_social="Comércio Beta S.A.",
            cnpj="22.222.222/0001-22",
            nome_fantasia="Beta",
            endereco="Av. Comercial, 200",
            cidade="Aparecida de Goiânia",
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
            razao_social="Serviços Gama ME",
            cnpj="33.333.333/0001-33",
            nome_fantasia="Gama",
            endereco="Rua dos Serviços, 300",
            cidade="Goiânia",
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
            recomendacoes="Primeira visita — levantar todos os setores produtivos.",
            data_proposta=date.today() + timedelta(days=3),
            status=StatusChamado.PENDENTE,
            dt_abertura=agora,
        )

        # --- Chamado 2: EM_ANDAMENTO com setores/cargos parciais (Renovação) ---
        ch2 = Chamado(
            cliente_id=cliente_renov.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_2.id,
            tecnico_interno_id=tec_int_c.id,
            tipo_visita=TipoVisitaEnum.RENOVACAO,
            recomendacoes="Renovação anual — conferir mudanças no layout.",
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
            descricao_ambiente="Escritório climatizado, iluminação artificial.", ordem=0,
        )
        setor_prod = Setor(
            chamado_id=ch2.id, nome="Produção",
            descricao_ambiente="Galpão com máquinas, ruído elevado.", ordem=1,
        )
        db.add_all([setor_admin, setor_prod])
        await db.flush()
        db.add_all([
            Cargo(setor_id=setor_admin.id, nome_cargo="Auxiliar Administrativo",
                  descricao_funcao="Rotinas de escritório e atendimento.", ordem=0),
            Cargo(setor_id=setor_prod.id, nome_cargo="Operador de Máquinas",
                  descricao_funcao="Operação de prensa e esteira.", ordem=0),
        ])

        # --- Chamado 3: AGUARDANDO_VALIDACAO — e-mail já enviado (Novo Cliente) ---
        ch3 = Chamado(
            cliente_id=cliente_novo.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_1.id,
            tecnico_interno_id=tec_int_a.id,
            tipo_visita=TipoVisitaEnum.NOVO_CLIENTE,
            recomendacoes="Visita concluída, aguardando confirmação do cliente.",
            data_proposta=date.today() - timedelta(days=2),
            status=StatusChamado.AGUARDANDO_VALIDACAO,
            dt_abertura=agora - timedelta(days=5),
            dt_inicio_visita=agora - timedelta(days=2, hours=3),
            dt_fim_visita=agora - timedelta(days=2, hours=1),
            dt_email_validacao_enviado=agora - timedelta(days=2),
            rodadas_validacao=1,
        )
        db.add(ch3)
        await db.flush()
        setor_ch3 = Setor(chamado_id=ch3.id, nome="Recepção",
                          descricao_ambiente="Área de atendimento ao público.", ordem=0)
        db.add(setor_ch3)
        await db.flush()
        db.add(Cargo(setor_id=setor_ch3.id, nome_cargo="Recepcionista",
                     descricao_funcao="Atendimento e triagem.", ordem=0))
        db.add(ValidacaoCliente(
            chamado_id=ch3.id,
            token=gerar_token_validacao(),
            token_expires_at=agora + timedelta(days=5),
            rodada=1,
        ))

        # --- Chamado 4: AGUARDANDO_LIBERACAO — cliente comentou (Visita Técnica) ---
        ch4 = Chamado(
            cliente_id=cliente_tec.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_2.id,
            tecnico_interno_id=tec_int_b.id,
            tipo_visita=TipoVisitaEnum.VISITA_TECNICA,
            recomendacoes="Cliente solicitou ajustes no relatório.",
            data_proposta=date.today() - timedelta(days=6),
            status=StatusChamado.AGUARDANDO_LIBERACAO,
            dt_abertura=agora - timedelta(days=8),
            dt_inicio_visita=agora - timedelta(days=6, hours=4),
            dt_fim_visita=agora - timedelta(days=6, hours=2),
            dt_email_validacao_enviado=agora - timedelta(days=6),
            dt_cliente_comentou=agora - timedelta(days=4),
            rodadas_validacao=1,
        )
        db.add(ch4)
        await db.flush()
        setor_ch4 = Setor(chamado_id=ch4.id, nome="Almoxarifado",
                          descricao_ambiente="Estoque de materiais.", ordem=0)
        db.add(setor_ch4)
        await db.flush()
        db.add(Cargo(setor_id=setor_ch4.id, nome_cargo="Estoquista",
                     descricao_funcao="Controle de entrada e saída de materiais.", ordem=0))
        db.add(ValidacaoCliente(
            chamado_id=ch4.id,
            token=gerar_token_validacao(),
            token_expires_at=agora + timedelta(days=1),
            rodada=1,
            status_resposta="COMENTADO",
            comentarios="O cargo 'Estoquista' precisa incluir também a operação de "
                        "empilhadeira. Favor revisar a descrição da função.",
            dt_resposta=agora - timedelta(days=4),
            ip_resposta="200.150.100.50",
        ))

        # --- Chamado 5: FINALIZADO com exportação Word (Renovação) ---
        ch5 = Chamado(
            cliente_id=cliente_renov.id,
            unidade_medsest_id=unidade.id,
            gestor_comercial_id=gestor.id,
            tecnico_externo_id=tec_ext_1.id,
            tecnico_interno_id=tec_int_c.id,
            tipo_visita=TipoVisitaEnum.RENOVACAO,
            recomendacoes="Processo concluído e exportado.",
            data_proposta=date.today() - timedelta(days=15),
            status=StatusChamado.FINALIZADO,
            dt_abertura=agora - timedelta(days=20),
            dt_inicio_visita=agora - timedelta(days=15, hours=5),
            dt_fim_visita=agora - timedelta(days=15, hours=3),
            dt_email_validacao_enviado=agora - timedelta(days=15),
            dt_cliente_aprovou=agora - timedelta(days=13),
            dt_liberado_tecnico_interno=agora - timedelta(days=13),
            dt_exportacao_word=agora - timedelta(days=10),
            rodadas_validacao=1,
        )
        db.add(ch5)
        await db.flush()
        setor_ch5 = Setor(chamado_id=ch5.id, nome="Escritório Central",
                          descricao_ambiente="Área administrativa da matriz.", ordem=0)
        db.add(setor_ch5)
        await db.flush()
        db.add(Cargo(setor_id=setor_ch5.id, nome_cargo="Analista Financeiro",
                     descricao_funcao="Gestão de contas e conciliação.", ordem=0))
        db.add(ValidacaoCliente(
            chamado_id=ch5.id,
            token=gerar_token_validacao(),
            token_expires_at=agora - timedelta(days=8),
            rodada=1,
            status_resposta="APROVADO",
            dt_resposta=agora - timedelta(days=13),
            ip_resposta="200.150.100.51",
        ))

        await db.commit()

    print("✅ Seed concluído com sucesso!")
    print("   Unidade: MedSest Goiânia")
    print("   Admin:   admin@medsest.com.br / Admin@123")
    print("   Demais usuários (gestor/técnicos): senha Senha@123")
    print("   3 clientes e 5 chamados em estados variados criados.")


if __name__ == "__main__":
    asyncio.run(seed())
