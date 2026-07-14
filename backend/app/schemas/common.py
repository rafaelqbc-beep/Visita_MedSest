"""Schemas e utilitários comuns: paginação server-side."""
from math import ceil
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PageParams:
    """Dependency de parâmetros de paginação (?page=1&size=20)."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Página (começa em 1)"),
        size: int = Query(20, ge=1, le=100, description="Itens por página (máx. 100)"),
    ) -> None:
        self.page = page
        self.size = size
        self.offset = (page - 1) * size


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


async def paginate(
    db: AsyncSession, stmt: Select, params: PageParams
) -> tuple[list, int, int]:
    """Executa a query com LIMIT/OFFSET e retorna (rows, total, pages)."""
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    result = await db.execute(stmt.limit(params.size).offset(params.offset))
    rows = list(result.scalars().all())
    pages = ceil(total / params.size) if total else 0
    return rows, total, pages
