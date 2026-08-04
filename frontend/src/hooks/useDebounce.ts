import { useEffect, useState } from 'react'

/** Devolve `valor` com atraso — usado para não disparar busca a cada tecla. */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return atrasado
}
