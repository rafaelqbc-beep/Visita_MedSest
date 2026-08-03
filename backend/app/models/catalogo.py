"""Catálogo de riscos ocupacionais e EPIs — a fonte única de verdade.

Segue o mesmo padrão de `ROTULO_TIPO_VISITA` (código → rótulo em português),
consumido pela tela de campo, pelo Word, pelo PDF e pela validação dos schemas.

Decisões (sessão #17, registradas no PROGRESS e no CATALOGO_RISCOS.md):
- **Os códigos são gravados como texto**, não como ENUM do PostgreSQL. O PG não
  remove valor de enum; mudar a lista viraria o ritual de renomear/recriar/converter
  tipo da migration 0002. Como texto validado aqui, mudar a lista é editar esta lista.
- **A categoria do risco NÃO é gravada — é derivada do agente.** Cada agente pertence
  a exatamente uma categoria (ruído é sempre físico). Guardar as duas permitiria a
  linha contraditória "ruído / ergonômico". Grava-se o agente; a categoria vem daqui.
- Versão inicial aprovada pela operação (18/07/2026) para validação; ajustável com o
  tempo — é só editar os dicionários abaixo (e, quando for o caso, o teste que
  garante rótulo para todo código).
"""
import enum


# ---------------------------------------------------------------------------
# Riscos
# ---------------------------------------------------------------------------
class CategoriaRisco(str, enum.Enum):
    FISICO = "FISICO"
    QUIMICO = "QUIMICO"
    BIOLOGICO = "BIOLOGICO"
    ERGONOMICO = "ERGONOMICO"
    ACIDENTE = "ACIDENTE"


ROTULO_CATEGORIA_RISCO: dict[CategoriaRisco, str] = {
    CategoriaRisco.FISICO: "Físico",
    CategoriaRisco.QUIMICO: "Químico",
    CategoriaRisco.BIOLOGICO: "Biológico",
    CategoriaRisco.ERGONOMICO: "Ergonômico",
    CategoriaRisco.ACIDENTE: "Acidente (mecânico)",
}

#: código do agente de risco → (rótulo, categoria). A ordem de inserção é a ordem
#: de exibição na tela; dict preserva ordem no Python 3.7+.
RISCOS: dict[str, tuple[str, CategoriaRisco]] = {
    # Físicos
    "RUIDO": ("Ruído", CategoriaRisco.FISICO),
    "VIBRACAO": ("Vibração", CategoriaRisco.FISICO),
    "CALOR": ("Calor", CategoriaRisco.FISICO),
    "FRIO": ("Frio", CategoriaRisco.FISICO),
    "UMIDADE": ("Umidade", CategoriaRisco.FISICO),
    "PRESSAO_ANORMAL": ("Pressões anormais", CategoriaRisco.FISICO),
    "RADIACAO_IONIZANTE": ("Radiação ionizante", CategoriaRisco.FISICO),
    "RADIACAO_NAO_IONIZANTE": ("Radiação não ionizante", CategoriaRisco.FISICO),
    # Químicos
    "POEIRA": ("Poeiras", CategoriaRisco.QUIMICO),
    "FUMO": ("Fumos", CategoriaRisco.QUIMICO),
    "NEVOA": ("Névoas", CategoriaRisco.QUIMICO),
    "NEBLINA": ("Neblinas", CategoriaRisco.QUIMICO),
    "GAS": ("Gases", CategoriaRisco.QUIMICO),
    "VAPOR": ("Vapores", CategoriaRisco.QUIMICO),
    "PRODUTO_QUIMICO": ("Produtos químicos em geral", CategoriaRisco.QUIMICO),
    # Biológicos
    "VIRUS": ("Vírus", CategoriaRisco.BIOLOGICO),
    "BACTERIA": ("Bactérias", CategoriaRisco.BIOLOGICO),
    "PROTOZOARIO": ("Protozoários", CategoriaRisco.BIOLOGICO),
    "FUNGO": ("Fungos", CategoriaRisco.BIOLOGICO),
    "PARASITA": ("Parasitas", CategoriaRisco.BIOLOGICO),
    "BACILO": ("Bacilos", CategoriaRisco.BIOLOGICO),
    # Ergonômicos
    "ESFORCO_FISICO": ("Esforço físico intenso", CategoriaRisco.ERGONOMICO),
    "LEVANTAMENTO_PESO": ("Levantamento e transporte manual de peso", CategoriaRisco.ERGONOMICO),
    "POSTURA_INADEQUADA": ("Exigência de postura inadequada", CategoriaRisco.ERGONOMICO),
    "CONTROLE_PRODUTIVIDADE": ("Controle rígido de produtividade", CategoriaRisco.ERGONOMICO),
    "RITMO_EXCESSIVO": ("Imposição de ritmos excessivos", CategoriaRisco.ERGONOMICO),
    "TRABALHO_TURNO_NOTURNO": ("Trabalho em turno e noturno", CategoriaRisco.ERGONOMICO),
    "JORNADA_PROLONGADA": ("Jornadas de trabalho prolongadas", CategoriaRisco.ERGONOMICO),
    "MONOTONIA_REPETITIVIDADE": ("Monotonia e repetitividade", CategoriaRisco.ERGONOMICO),
    "ESTRESSE": ("Outras situações causadoras de estresse físico e/ou psíquico", CategoriaRisco.ERGONOMICO),
    # Acidentes (mecânicos)
    "ARRANJO_FISICO": ("Arranjo físico inadequado", CategoriaRisco.ACIDENTE),
    "MAQUINA_SEM_PROTECAO": ("Máquinas e equipamentos sem proteção", CategoriaRisco.ACIDENTE),
    "FERRAMENTA_INADEQUADA": ("Ferramentas inadequadas ou defeituosas", CategoriaRisco.ACIDENTE),
    "ILUMINACAO_INADEQUADA": ("Iluminação inadequada", CategoriaRisco.ACIDENTE),
    "ELETRICIDADE": ("Eletricidade", CategoriaRisco.ACIDENTE),
    "INCENDIO_EXPLOSAO": ("Probabilidade de incêndio ou explosão", CategoriaRisco.ACIDENTE),
    "ARMAZENAMENTO_INADEQUADO": ("Armazenamento inadequado", CategoriaRisco.ACIDENTE),
    "ANIMAIS_PECONHENTOS": ("Animais peçonhentos", CategoriaRisco.ACIDENTE),
    "QUEDA_MESMO_NIVEL": ("Queda no mesmo nível", CategoriaRisco.ACIDENTE),
    "QUEDA_ALTURA": ("Queda com diferença de nível", CategoriaRisco.ACIDENTE),
    "PERFUROCORTANTE": ("Perfurocortante", CategoriaRisco.ACIDENTE),
}


# ---------------------------------------------------------------------------
# EPIs
# ---------------------------------------------------------------------------
class GrupoEPI(str, enum.Enum):
    CABECA = "CABECA"
    OLHOS_FACE = "OLHOS_FACE"
    AUDITIVA = "AUDITIVA"
    RESPIRATORIA = "RESPIRATORIA"
    TRONCO = "TRONCO"
    MEMBROS_SUPERIORES = "MEMBROS_SUPERIORES"
    MEMBROS_INFERIORES = "MEMBROS_INFERIORES"
    CORPO_INTEIRO = "CORPO_INTEIRO"
    QUEDAS = "QUEDAS"
    PELE = "PELE"


ROTULO_GRUPO_EPI: dict[GrupoEPI, str] = {
    GrupoEPI.CABECA: "Proteção da cabeça",
    GrupoEPI.OLHOS_FACE: "Proteção dos olhos e face",
    GrupoEPI.AUDITIVA: "Proteção auditiva",
    GrupoEPI.RESPIRATORIA: "Proteção respiratória",
    GrupoEPI.TRONCO: "Proteção do tronco",
    GrupoEPI.MEMBROS_SUPERIORES: "Proteção dos membros superiores",
    GrupoEPI.MEMBROS_INFERIORES: "Proteção dos membros inferiores",
    GrupoEPI.CORPO_INTEIRO: "Proteção do corpo inteiro",
    GrupoEPI.QUEDAS: "Proteção contra quedas",
    GrupoEPI.PELE: "Proteção da pele",
}

#: código do EPI → (rótulo, grupo). Ordem de inserção = ordem de exibição.
EPIS: dict[str, tuple[str, GrupoEPI]] = {
    # Cabeça
    "CAPACETE": ("Capacete", GrupoEPI.CABECA),
    "CAPUZ": ("Capuz / balaclava", GrupoEPI.CABECA),
    # Olhos e face
    "OCULOS": ("Óculos de segurança", GrupoEPI.OLHOS_FACE),
    "PROTETOR_FACIAL": ("Protetor facial", GrupoEPI.OLHOS_FACE),
    "MASCARA_SOLDA": ("Máscara de solda", GrupoEPI.OLHOS_FACE),
    # Auditiva
    "PROTETOR_AURICULAR_PLUG": ("Protetor auricular tipo plug (inserção)", GrupoEPI.AUDITIVA),
    "PROTETOR_AURICULAR_CONCHA": ("Protetor auricular tipo concha", GrupoEPI.AUDITIVA),
    # Respiratória
    "MASCARA_PFF1": ("Máscara PFF1", GrupoEPI.RESPIRATORIA),
    "MASCARA_PFF2": ("Máscara PFF2", GrupoEPI.RESPIRATORIA),
    "RESPIRADOR_SEMIFACIAL": ("Respirador semifacial", GrupoEPI.RESPIRATORIA),
    "RESPIRADOR_FACIAL_INTEIRA": ("Respirador facial inteira", GrupoEPI.RESPIRATORIA),
    # Tronco
    "AVENTAL": ("Avental", GrupoEPI.TRONCO),
    "COLETE": ("Colete", GrupoEPI.TRONCO),
    # Membros superiores
    "LUVA": ("Luva", GrupoEPI.MEMBROS_SUPERIORES),
    "MANGOTE": ("Manga / mangote", GrupoEPI.MEMBROS_SUPERIORES),
    "BRACADEIRA": ("Braçadeira", GrupoEPI.MEMBROS_SUPERIORES),
    # Membros inferiores
    "CALCADO_SEGURANCA": ("Calçado de segurança", GrupoEPI.MEMBROS_INFERIORES),
    "PERNEIRA": ("Perneira", GrupoEPI.MEMBROS_INFERIORES),
    "POLAINA": ("Polaina", GrupoEPI.MEMBROS_INFERIORES),
    # Corpo inteiro
    "MACACAO": ("Macacão", GrupoEPI.CORPO_INTEIRO),
    "VESTIMENTA_ESPECIAL": ("Vestimenta de proteção (calor / químicos)", GrupoEPI.CORPO_INTEIRO),
    # Quedas
    "CINTURAO_PARAQUEDISTA": ("Cinturão paraquedista", GrupoEPI.QUEDAS),
    "TALABARTE": ("Talabarte", GrupoEPI.QUEDAS),
    "TRAVA_QUEDAS": ("Trava-quedas", GrupoEPI.QUEDAS),
    # Pele
    "CREME_PROTETOR": ("Creme protetor", GrupoEPI.PELE),
    "PROTETOR_SOLAR": ("Protetor solar", GrupoEPI.PELE),
}


# ---------------------------------------------------------------------------
# Helpers de leitura (usados por Word/PDF/schema/endpoint)
# ---------------------------------------------------------------------------
def rotulo_risco(codigo: str) -> str:
    """Rótulo do agente de risco; devolve o próprio código se for desconhecido
    (código legado após a lista mudar não pode derrubar a exportação)."""
    entrada = RISCOS.get(codigo)
    return entrada[0] if entrada else codigo


def categoria_do_risco(codigo: str) -> CategoriaRisco | None:
    entrada = RISCOS.get(codigo)
    return entrada[1] if entrada else None


def rotulo_epi(codigo: str) -> str:
    entrada = EPIS.get(codigo)
    return entrada[0] if entrada else codigo


def codigos_risco_invalidos(codigos: list[str]) -> list[str]:
    """Códigos de risco que não existem no catálogo (para a validação do schema)."""
    return [c for c in codigos if c not in RISCOS]


def codigos_epi_invalidos(codigos: list[str]) -> list[str]:
    return [c for c in codigos if c not in EPIS]


def riscos_por_categoria() -> list[dict]:
    """Riscos agrupados por categoria, na ordem de exibição — formato do endpoint
    do catálogo consumido pelo frontend (acordeão por categoria)."""
    grupos: dict[CategoriaRisco, list[dict]] = {cat: [] for cat in CategoriaRisco}
    for codigo, (rotulo, categoria) in RISCOS.items():
        grupos[categoria].append({"codigo": codigo, "rotulo": rotulo})
    return [
        {
            "codigo": categoria.value,
            "rotulo": ROTULO_CATEGORIA_RISCO[categoria],
            "agentes": itens,
        }
        for categoria, itens in grupos.items()
    ]


def riscos_agrupados_do_cargo(codigos: list[str]) -> list[tuple[str, list[str]]]:
    """Riscos de um cargo agrupados por categoria, para o relatório:
    [(rótulo_categoria, [rótulos_agentes]), ...] — só as categorias com itens,
    na ordem canônica. Códigos fora do catálogo (lista mudou depois) caem em
    "Outros" em vez de sumir."""
    resultado: list[tuple[str, list[str]]] = []
    for categoria in CategoriaRisco:
        rotulos = [rotulo_risco(c) for c in codigos if categoria_do_risco(c) == categoria]
        if rotulos:
            resultado.append((ROTULO_CATEGORIA_RISCO[categoria], rotulos))
    desconhecidos = [rotulo_risco(c) for c in codigos if categoria_do_risco(c) is None]
    if desconhecidos:
        resultado.append(("Outros", desconhecidos))
    return resultado


def epis_do_cargo(codigos: list[str]) -> list[str]:
    """Rótulos dos EPIs de um cargo, na ordem gravada."""
    return [rotulo_epi(c) for c in codigos]


def epis_por_grupo() -> list[dict]:
    """EPIs agrupados por região do corpo, na ordem de exibição."""
    grupos: dict[GrupoEPI, list[dict]] = {g: [] for g in GrupoEPI}
    for codigo, (rotulo, grupo) in EPIS.items():
        grupos[grupo].append({"codigo": codigo, "rotulo": rotulo})
    return [
        {
            "codigo": grupo.value,
            "rotulo": ROTULO_GRUPO_EPI[grupo],
            "itens": itens,
        }
        for grupo, itens in grupos.items()
    ]
