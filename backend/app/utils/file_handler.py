"""Upload e remoção de arquivos enviados (fotos, assinaturas)."""
import io
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile, status
from PIL import Image

from app.config import settings
from app.utils.exceptions import AppException

# Formatos aceitos: o que o Pillow reporta -> extensão gravada em disco
FORMATOS_IMAGEM = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}
MIMES_IMAGEM = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


def _validar_imagem(conteudo: bytes) -> str:
    """Confere que os bytes são mesmo uma imagem aceita e devolve a extensão.

    O `content_type` do request é informado pelo cliente e pode ser forjado —
    por isso a checagem real é feita sobre o conteúdo, com o Pillow.
    """
    try:
        imagem = Image.open(io.BytesIO(conteudo))
        imagem.verify()
    except AppException:
        raise
    except Exception:
        # Exception aberta de propósito: aqui se está fazendo o parse de bytes
        # que vieram de fora, e QUALQUER falha significa "não é uma imagem
        # válida" — não um defeito nosso. A lista fechada que existia aqui
        # (UnidentifiedImageError, OSError, ValueError) deixava escapar o
        # `SyntaxError` que o Pillow lança para arquivo corrompido (ex.: PNG com
        # CRC quebrado), e o técnico tomava 500 em vez do aviso. Foto truncada
        # acontece: upload cortado no 3G, falha da câmera.
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Arquivo não é uma imagem válida ou está corrompido.",
            "ARQUIVO_INVALIDO",
        )

    formato = (imagem.format or "").upper()
    if formato not in FORMATOS_IMAGEM:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Formato {formato or 'desconhecido'} não aceito. Use JPG, PNG ou WEBP.",
            "FORMATO_NAO_ACEITO",
        )
    return FORMATOS_IMAGEM[formato]


async def salvar_imagem(file: UploadFile, subdir: str) -> tuple[str, int]:
    """Valida e grava a imagem em `uploads/{subdir}/`.

    Retorna (caminho_relativo, tamanho_bytes). O caminho relativo é o que vai
    para o banco e é servido em `/uploads/{caminho}`.
    """
    if file.content_type and file.content_type.lower() not in MIMES_IMAGEM:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Tipo {file.content_type} não aceito. Use JPG, PNG ou WEBP.",
            "MIME_NAO_ACEITO",
        )

    conteudo = await file.read()
    tamanho = len(conteudo)

    if tamanho == 0:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Arquivo vazio.", "ARQUIVO_VAZIO"
        )
    if tamanho > settings.max_file_size_bytes:
        raise AppException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Arquivo excede o limite de {settings.MAX_FILE_SIZE_MB}MB.",
            "ARQUIVO_MUITO_GRANDE",
        )

    extensao = _validar_imagem(conteudo)

    # Nome gerado pelo servidor: o nome original do cliente nunca compõe o
    # caminho em disco (evita path traversal e colisão).
    nome_arquivo = f"{uuid.uuid4()}{extensao}"
    destino_dir = Path(settings.UPLOAD_DIR) / subdir
    destino_dir.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(destino_dir / nome_arquivo, "wb") as saida:
        await saida.write(conteudo)

    return f"{subdir}/{nome_arquivo}", tamanho


def remover_arquivo(caminho_relativo: str | None) -> None:
    """Remove o arquivo do disco. Silencioso se já não existir."""
    if not caminho_relativo:
        return
    caminho = (Path(settings.UPLOAD_DIR) / caminho_relativo).resolve()
    raiz = Path(settings.UPLOAD_DIR).resolve()
    # Só remove dentro de UPLOAD_DIR — protege contra caminho manipulado no banco.
    if raiz not in caminho.parents:
        return
    caminho.unlink(missing_ok=True)
