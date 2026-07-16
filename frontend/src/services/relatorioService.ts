import axios from 'axios'
import { api } from '@/services/api'
import type { ApiError } from '@/types'

/**
 * Com `responseType: 'blob'`, um erro da API também vem como Blob — o axios
 * não sabe que aquele corpo é JSON. Sem esta conversão, `mensagemDeErro()` não
 * acharia o `detail` e o técnico veria "erro inesperado" no lugar do motivo
 * real (ex.: "O relatório só fica disponível após a visita ser finalizada").
 *
 * Relança o erro com o corpo já parseado, para o resto do app tratar igual.
 */
async function comErroLegivel(erro: unknown): Promise<never> {
  if (axios.isAxiosError(erro) && erro.response?.data instanceof Blob) {
    try {
      const texto = await erro.response.data.text()
      erro.response.data = JSON.parse(texto) as ApiError
    } catch {
      // Corpo que não é JSON (500 em HTML, por exemplo): segue com o fallback.
    }
  }
  throw erro
}

/**
 * Extrai o nome do arquivo do `Content-Disposition`.
 *
 * O backend manda `filename*=UTF-8''...` (RFC 5987) para preservar acentos,
 * mais um `filename="..."` de fallback. O `filename*` vem percent-encoded.
 */
function nomeDoHeader(disposition: string | undefined, padrao: string): string {
  if (!disposition) return padrao
  const rfc5987 = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (rfc5987) {
    try {
      return decodeURIComponent(rfc5987[1])
    } catch {
      // Header malformado não pode impedir o download.
    }
  }
  const simples = /filename="([^"]+)"/i.exec(disposition)
  return simples ? simples[1] : padrao
}

/** Dispara o "salvar como" do navegador com o blob recebido. */
function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Sem o revoke o blob fica na memória até a aba fechar — e são arquivos com
  // fotos embutidas.
  URL.revokeObjectURL(url)
}

/**
 * Baixa o .docx do relatório.
 *
 * `responseType: 'blob'` é obrigatório: a resposta é binária, e sem isso o
 * axios tentaria interpretá-la como texto e corromperia o arquivo.
 */
export async function exportarWord(chamadoId: string, numero: number): Promise<void> {
  const resposta = await api
    .get(`/chamados/${chamadoId}/exportar-word`, { responseType: 'blob' })
    .catch(comErroLegivel)
  baixar(
    resposta.data as Blob,
    nomeDoHeader(resposta.headers['content-disposition'], `visita_${numero}.docx`),
  )
}

/** Baixa o comprovante em PDF (o mesmo que o cliente recebe por e-mail). */
export async function baixarReciboPdf(chamadoId: string, numero: number): Promise<void> {
  const resposta = await api
    .get(`/chamados/${chamadoId}/recibo-pdf`, { responseType: 'blob' })
    .catch(comErroLegivel)
  baixar(
    resposta.data as Blob,
    nomeDoHeader(resposta.headers['content-disposition'], `comprovante_visita_${numero}.pdf`),
  )
}
