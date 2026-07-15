"""Validadores de domínio (CNPJ etc.)."""
import re

_CNPJ_PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_CNPJ_PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def somente_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def validar_cnpj(cnpj: str) -> bool:
    """Valida os dígitos verificadores do CNPJ (aceita com ou sem máscara)."""
    numeros = somente_digitos(cnpj)
    if len(numeros) != 14:
        return False
    if numeros == numeros[0] * 14:  # rejeita todos iguais (ex.: 00000000000000)
        return False

    def _digito(base: str, pesos: list[int]) -> int:
        soma = sum(int(d) * p for d, p in zip(base, pesos))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    dv1 = _digito(numeros[:12], _CNPJ_PESOS_1)
    dv2 = _digito(numeros[:12] + str(dv1), _CNPJ_PESOS_2)
    return numeros[12:] == f"{dv1}{dv2}"


def formatar_cnpj(cnpj: str) -> str:
    """Formata como 00.000.000/0000-00 (retorna o original se inválido)."""
    n = somente_digitos(cnpj)
    if len(n) != 14:
        return cnpj
    return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:]}"


def validar_cpf(cpf: str) -> bool:
    """Valida os dígitos verificadores do CPF (aceita com ou sem máscara)."""
    numeros = somente_digitos(cpf)
    if len(numeros) != 11:
        return False
    if numeros == numeros[0] * 11:  # rejeita todos iguais (ex.: 111.111.111-11)
        return False

    def _digito(base: str) -> int:
        peso_inicial = len(base) + 1
        soma = sum(int(d) * (peso_inicial - i) for i, d in enumerate(base))
        resto = (soma * 10) % 11
        return 0 if resto == 10 else resto

    dv1 = _digito(numeros[:9])
    dv2 = _digito(numeros[:9] + str(dv1))
    return numeros[9:] == f"{dv1}{dv2}"


def formatar_cpf(cpf: str) -> str:
    """Formata como 000.000.000-00 (retorna o original se inválido)."""
    n = somente_digitos(cpf)
    if len(n) != 11:
        return cpf
    return f"{n[:3]}.{n[3:6]}.{n[6:9]}-{n[9:]}"
