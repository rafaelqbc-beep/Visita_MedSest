"""Fotos dos setores registradas durante a visita."""
import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.foto import FotoSetor
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.foto import FotoRead, FotoUpdate
from app.services.visita import get_chamado_editavel, get_chamado_visivel
from app.utils.exceptions import AppException
from app.utils.file_handler import remover_arquivo, salvar_imagem

router = APIRouter(prefix="/api/fotos", tags=["visita: fotos"])


async def _get_setor(setor_id: uuid.UUID, db: AsyncSession) -> Setor:
    setor = await db.get(Setor, setor_id)
    if setor is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Setor não encontrado.", "SETOR_NOT_FOUND")
    return setor


async def _get_foto(foto_id: uuid.UUID, db: AsyncSession) -> FotoSetor:
    foto = await db.get(FotoSetor, foto_id)
    if foto is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Foto não encontrada.", "FOTO_NOT_FOUND")
    return foto


@router.get("", response_model=list[FotoRead])
async def listar_fotos(
    setor_id: uuid.UUID = Query(..., description="Setor cujas fotos serão listadas"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> list[FotoRead]:
    setor = await _get_setor(setor_id, db)
    await get_chamado_visivel(setor.chamado_id, usuario, db)
    fotos = (
        await db.scalars(
            select(FotoSetor).where(FotoSetor.setor_id == setor_id).order_by(FotoSetor.created_at)
        )
    ).all()
    return [FotoRead.model_validate(f) for f in fotos]


@router.post("", response_model=FotoRead, status_code=status.HTTP_201_CREATED)
async def enviar_foto(
    setor_id: uuid.UUID = Form(...),
    descricao: str | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> FotoRead:
    """Upload de uma foto do setor (multipart).

    Aceita JPG/PNG/WEBP até o limite de MAX_FILE_SIZE_MB; o conteúdo é
    validado de fato, não só pelo content-type informado.
    """
    setor = await _get_setor(setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    caminho, tamanho = await salvar_imagem(file, subdir="fotos")

    foto = FotoSetor(
        setor_id=setor_id,
        caminho_arquivo=caminho,
        nome_original=file.filename,
        descricao=descricao,
        tamanho_bytes=tamanho,
    )
    db.add(foto)
    try:
        await db.flush()
        await db.refresh(foto)
    except Exception:
        # Se o registro falhar, o arquivo já gravado não pode ficar órfão.
        remover_arquivo(caminho)
        raise
    return FotoRead.model_validate(foto)


@router.put("/{foto_id}", response_model=FotoRead)
async def atualizar_foto(
    foto_id: uuid.UUID,
    body: FotoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> FotoRead:
    foto = await _get_foto(foto_id, db)
    setor = await _get_setor(foto.setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(foto, campo, valor)
    await db.flush()
    await db.refresh(foto)
    return FotoRead.model_validate(foto)


@router.delete("/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_foto(
    foto_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> None:
    foto = await _get_foto(foto_id, db)
    setor = await _get_setor(foto.setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    caminho = foto.caminho_arquivo
    await db.delete(foto)
    await db.flush()
    remover_arquivo(caminho)
