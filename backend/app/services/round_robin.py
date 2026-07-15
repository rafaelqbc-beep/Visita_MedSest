"""Distribuição round-robin de técnicos internos por unidade.

Mantém uma sequência circular entre os técnicos internos ativos da unidade,
guardando em `round_robin_tecnico` quem foi o último sorteado.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RoleEnum
from app.models.round_robin import RoundRobinTecnico
from app.models.usuario import Usuario


async def get_proximo_tecnico_interno(
    unidade_id: uuid.UUID, db: AsyncSession
) -> uuid.UUID | None:
    """Retorna o próximo técnico interno da unidade e atualiza o controle.

    Devolve None se a unidade não tiver nenhum técnico interno ativo.

    A linha de controle é travada com SELECT ... FOR UPDATE: sem isso, dois
    chamados criados ao mesmo tempo leriam o mesmo `ultimo_tecnico_interno_id`
    e cairiam no mesmo técnico, furando o rodízio.
    """
    tecnicos = list(
        (
            await db.scalars(
                select(Usuario)
                .where(
                    Usuario.unidade_id == unidade_id,
                    Usuario.role == RoleEnum.TECNICO_INTERNO,
                    Usuario.ativo.is_(True),
                )
                # Ordem estável: garante que a sequência do rodízio não muda
                # conforme os registros são atualizados.
                .order_by(Usuario.created_at, Usuario.id)
            )
        ).all()
    )
    if not tecnicos:
        return None

    controle = await db.scalar(
        select(RoundRobinTecnico)
        .where(RoundRobinTecnico.unidade_medsest_id == unidade_id)
        .with_for_update()
    )

    ids = [t.id for t in tecnicos]
    if controle is None:
        proximo_id = ids[0]
        db.add(
            RoundRobinTecnico(
                unidade_medsest_id=unidade_id,
                ultimo_tecnico_interno_id=proximo_id,
            )
        )
    else:
        if controle.ultimo_tecnico_interno_id in ids:
            # Avança um na lista, voltando ao início ao passar do fim.
            indice = ids.index(controle.ultimo_tecnico_interno_id)
            proximo_id = ids[(indice + 1) % len(ids)]
        else:
            # Último técnico saiu, foi desativado ou mudou de unidade:
            # recomeça a sequência.
            proximo_id = ids[0]
        controle.ultimo_tecnico_interno_id = proximo_id

    await db.flush()
    return proximo_id
