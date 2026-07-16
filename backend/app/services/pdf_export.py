"""Geração do recibo em PDF enviado ao cliente após a assinatura.

É apenas um comprovante do que foi conferido e assinado no local — não pede
nenhuma ação do cliente.

Fontes nativas do fpdf2 são Latin-1: acento português passa, mas pontuação
tipográfica não. Todo texto passa por `texto_latin1()`.
"""
import uuid
from pathlib import Path

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.chamado import Chamado
from app.models.enums import ROTULO_TIPO_VISITA
from app.models.setor import Setor
from app.utils.formatacao import coord_br, dt_br, texto_latin1

AZUL = (0x1A, 0x3A, 0x5C)
CINZA = (0x6B, 0x72, 0x80)
MARGEM = 15


class _ReciboPDF(FPDF):
    def __init__(self, numero_chamado: int) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.numero_chamado = numero_chamado
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(MARGEM, MARGEM, MARGEM)

    def header(self) -> None:
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*AZUL)
        self.cell(0, 10, texto_latin1("MedSest - Comprovante de Visita Técnica"), new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*CINZA)
        self.cell(0, 5, f"Chamado #{self.numero_chamado}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*AZUL)
        self.line(MARGEM, self.get_y() + 2, 210 - MARGEM, self.get_y() + 2)
        self.ln(6)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*CINZA)
        self.cell(
            0, 4,
            texto_latin1(
                "Documento gerado automaticamente pelo MedSest Visita. "
                "Comprovante - não requer nenhuma ação."
            ),
            align="C", new_x="LMARGIN", new_y="NEXT",
        )
        self.cell(0, 4, texto_latin1(f"Página {self.page_no()}/{{nb}}"), align="C")

    def titulo_secao(self, texto: str) -> None:
        self.ln(2)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*AZUL)
        self.cell(0, 7, texto_latin1(texto), new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)

    def campo(self, rotulo: str, valor: str) -> None:
        self.set_font("Helvetica", "B", 9)
        largura = self.get_string_width(f"{rotulo}: ") + 1
        self.cell(largura, 5, texto_latin1(f"{rotulo}:"))
        self.set_font("Helvetica", "", 9)
        self.multi_cell(0, 5, texto_latin1(valor or "-"), new_x="LMARGIN", new_y="NEXT")


def _arquivo(caminho_relativo: str | None) -> Path | None:
    if not caminho_relativo:
        return None
    caminho = Path(settings.UPLOAD_DIR) / caminho_relativo
    return caminho if caminho.exists() else None


async def gerar_recibo_pdf(chamado_id: uuid.UUID, db: AsyncSession) -> tuple[bytes, str]:
    """Monta o PDF do recibo. Retorna (conteúdo, nome_do_arquivo)."""
    chamado = await db.scalar(
        select(Chamado)
        .where(Chamado.id == chamado_id)
        .options(
            selectinload(Chamado.cliente),
            selectinload(Chamado.unidade_medsest),
            selectinload(Chamado.tecnico_externo),
        )
    )
    setores = (
        await db.scalars(
            select(Setor)
            .where(Setor.chamado_id == chamado_id)
            .options(selectinload(Setor.cargos))
            .order_by(Setor.ordem, Setor.created_at)
        )
    ).all()

    cliente = chamado.cliente
    pdf = _ReciboPDF(chamado.numero_chamado)
    pdf.alias_nb_pages()
    pdf.add_page()

    # --- Introdução ---
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(
        0, 5,
        texto_latin1(
            f"Prezado(a) {cliente.nome_contato or cliente.razao_social},\n\n"
            "Segue o comprovante da visita técnica realizada em sua empresa. As "
            "informações abaixo foram conferidas no local, ao final da visita, e "
            "assinadas por você e pelo nosso técnico responsável."
        ),
        new_x="LMARGIN", new_y="NEXT",
    )
    pdf.ln(2)

    # --- Dados ---
    pdf.titulo_secao("Dados da Visita")
    pdf.campo("Empresa", cliente.razao_social)
    if cliente.cnpj:
        pdf.campo("CNPJ", cliente.cnpj)
    pdf.campo("Tipo de visita", ROTULO_TIPO_VISITA[chamado.tipo_visita])
    pdf.campo("Unidade MedSest", chamado.unidade_medsest.nome if chamado.unidade_medsest else "-")
    pdf.campo("Técnico responsável", chamado.tecnico_externo.nome if chamado.tecnico_externo else "-")
    pdf.campo("Início da visita", dt_br(chamado.dt_inicio_visita))
    pdf.campo("Fim da visita", dt_br(chamado.dt_fim_visita))

    # --- Resumo dos setores ---
    pdf.titulo_secao("Setores e Cargos Registrados")
    if not setores:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 5, "Nenhum setor registrado.", new_x="LMARGIN", new_y="NEXT")
    for indice, setor in enumerate(setores, start=1):
        pdf.set_font("Helvetica", "B", 10)
        pdf.multi_cell(0, 5, texto_latin1(f"{indice}. {setor.nome}"), new_x="LMARGIN", new_y="NEXT")
        if setor.descricao_ambiente:
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(*CINZA)
            pdf.multi_cell(0, 4, texto_latin1(setor.descricao_ambiente), new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 9)
        for cargo in setor.cargos:
            descricao = f" - {cargo.descricao_funcao}" if cargo.descricao_funcao else ""
            pdf.multi_cell(
                0, 4.5,
                texto_latin1(f"    - {cargo.nome_cargo}{descricao}"),
                new_x="LMARGIN", new_y="NEXT",
            )
        pdf.ln(1)

    # --- Assinaturas ---
    # Reserva espaço: assinatura cortada entre páginas fica ruim no comprovante.
    if pdf.get_y() > 200:
        pdf.add_page()
    pdf.titulo_secao("Assinaturas Coletadas no Local")

    y_assinaturas = pdf.get_y()
    largura_col = (210 - 2 * MARGEM) / 2

    def bloco_assinatura(x: float, rotulo: str, caminho: str | None, linhas: list[str]) -> None:
        pdf.set_xy(x, y_assinaturas)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(largura_col, 5, texto_latin1(rotulo), new_x="LMARGIN", new_y="NEXT")
        arquivo = _arquivo(caminho)
        if arquivo:
            # Altura fixa: a proporção do traço varia com o tamanho do canvas.
            pdf.image(str(arquivo), x=x, y=y_assinaturas + 6, h=18)
        pdf.set_xy(x, y_assinaturas + 26)
        pdf.set_draw_color(*CINZA)
        pdf.line(x, y_assinaturas + 26, x + largura_col - 8, y_assinaturas + 26)
        pdf.set_font("Helvetica", "", 8)
        for linha in linhas:
            pdf.set_x(x)
            pdf.cell(largura_col, 4, texto_latin1(linha), new_x="LMARGIN", new_y="NEXT")

    bloco_assinatura(
        MARGEM, "CLIENTE", chamado.assinatura_cliente_caminho,
        [
            f"Nome: {chamado.assinatura_cliente_nome or '-'}",
            f"CPF: {chamado.assinatura_cliente_cpf or '-'}",
            f"Data/hora: {dt_br(chamado.dt_assinatura_cliente)}",
        ],
    )
    bloco_assinatura(
        MARGEM + largura_col, "TÉCNICO MEDSEST", chamado.assinatura_tecnico_caminho,
        [
            f"Nome: {chamado.tecnico_externo.nome if chamado.tecnico_externo else '-'}",
            f"Data/hora: {dt_br(chamado.dt_assinatura_tecnico)}",
        ],
    )

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*CINZA)
    pdf.cell(
        0, 4,
        texto_latin1(f"Geolocalização no momento das assinaturas: {coord_br(chamado.geoloc_assinatura_latitude, chamado.geoloc_assinatura_longitude)}"),
        new_x="LMARGIN", new_y="NEXT",
    )

    conteudo = bytes(pdf.output())
    nome_arquivo = f"comprovante_visita_{chamado.numero_chamado}.pdf"
    return conteudo, nome_arquivo
