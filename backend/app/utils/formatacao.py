"""Formatação para os relatórios (datas em pt-BR, texto seguro para PDF)."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

TZ_BR = ZoneInfo("America/Sao_Paulo")

# Caracteres comuns fora do Latin-1 e seus equivalentes seguros. As fontes
# nativas do fpdf2 são Latin-1: acento português passa, mas travessão e aspas
# curvas quebrariam.
_SUBSTITUICOES = {
    "—": "-",   # travessão —
    "–": "-",   # meia-risca –
    "‘": "'",   # aspa simples curva ‘
    "’": "'",   # aspa simples curva ’
    "“": '"',   # aspa dupla curva “
    "”": '"',   # aspa dupla curva ”
    "…": "...",  # reticências …
    " ": " ",   # espaço não separável
}


def dt_br(valor: datetime | None, com_hora: bool = True) -> str:
    """Converte um TIMESTAMPTZ (UTC) para o fuso de São Paulo e formata."""
    if valor is None:
        return "-"
    local = valor.astimezone(TZ_BR)
    return local.strftime("%d/%m/%Y %H:%M") if com_hora else local.strftime("%d/%m/%Y")


def data_br(valor: date | None) -> str:
    return valor.strftime("%d/%m/%Y") if valor else "-"


def coord_br(latitude, longitude) -> str:
    if latitude is None or longitude is None:
        return "-"
    return f"{float(latitude):.6f}, {float(longitude):.6f}"


def texto_latin1(valor: str | None) -> str:
    """Deixa o texto seguro para as fontes nativas do fpdf2 (Latin-1).

    Troca a pontuação tipográfica por equivalentes ASCII e descarta o que
    sobrar fora do Latin-1 — melhor um caractere a menos do que o PDF quebrar.
    """
    if not valor:
        return ""
    texto = valor
    for origem, destino in _SUBSTITUICOES.items():
        texto = texto.replace(origem, destino)
    return texto.encode("latin-1", errors="replace").decode("latin-1")
