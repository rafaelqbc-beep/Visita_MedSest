/**
 * Validação de CPF — espelha `backend/app/utils/validators.py`.
 *
 * O backend valida de novo (é ele quem manda); esta cópia existe para o
 * técnico ver o erro na hora, com o cliente do lado, em vez de esperar o
 * servidor recusar.
 */

export function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '')
}

export function validarCpf(cpf: string): boolean {
  const n = somenteDigitos(cpf)
  if (n.length !== 11) return false
  // Rejeita todos iguais (111.111.111-11 passa nos dígitos verificadores).
  if (n === n[0].repeat(11)) return false

  const digito = (base: string): number => {
    const pesoInicial = base.length + 1
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const dv1 = digito(n.slice(0, 9))
  const dv2 = digito(n.slice(0, 9) + dv1)
  return n.slice(9) === `${dv1}${dv2}`
}

/** Máscara progressiva, para o técnico digitar sem se perder. */
export function mascararCpf(valor: string): string {
  const n = somenteDigitos(valor).slice(0, 11)
  if (n.length <= 3) return n
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`
}
