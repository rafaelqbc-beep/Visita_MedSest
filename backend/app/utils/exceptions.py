"""Exceção de aplicação e handler para o formato de erro padrão {detail, code}."""
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    """Erro de negócio com código semântico, serializado como {detail, code}."""

    def __init__(self, status_code: int, detail: str, code: str) -> None:
        self.status_code = status_code
        self.detail = detail
        self.code = code
        super().__init__(detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def _app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Mantém o formato {detail, code} mesmo para HTTPException padrão
        detail = exc.detail if isinstance(exc.detail, str) else "Erro"
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail, "code": "HTTP_ERROR"},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exception_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "Dados inválidos.",
                "code": "VALIDATION_ERROR",
                "errors": jsonable_encoder(exc.errors()),
            },
        )
