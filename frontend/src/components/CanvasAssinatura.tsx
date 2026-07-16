import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface CanvasAssinaturaRef {
  /** PNG com fundo transparente, ou null se nada foi desenhado. */
  paraArquivo: (nome: string) => Promise<File | null>
  limpar: () => void
  temTraco: () => boolean
}

interface Props {
  /** Rótulo acessível (o canvas é uma imagem para quem usa leitor de tela). */
  rotulo: string
  onMudar?: (temTraco: boolean) => void
}

const COR_TRACO = '#1C1C1E'
const ESPESSURA = 2.5

/**
 * Assinatura desenhada com o dedo ou caneta.
 *
 * Não é biometria: navegador não acessa leitor de digital. Quem sabe assinar,
 * assina; quem não sabe, faz uma marca — que é justamente o caso de uso da
 * digital em papel.
 */
export const CanvasAssinatura = forwardRef<CanvasAssinaturaRef, Props>(
  function CanvasAssinatura({ rotulo, onMudar }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const desenhando = useRef(false)
    const [temTraco, setTemTraco] = useState(false)

    // O canvas precisa de resolução física, não CSS: sem isso o traço sai
    // borrado na tela retina do tablet.
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ajustar = () => {
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        // Redimensionar limpa o canvas — só faz quando o tamanho mudou de fato,
        // senão um resize da tela apagaria a assinatura já feita.
        const larguraFisica = Math.round(rect.width * dpr)
        const alturaFisica = Math.round(rect.height * dpr)
        if (canvas.width === larguraFisica && canvas.height === alturaFisica) return

        canvas.width = larguraFisica
        canvas.height = alturaFisica
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.scale(dpr, dpr)
        ctx.strokeStyle = COR_TRACO
        ctx.lineWidth = ESPESSURA
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }

      ajustar()
      const observer = new ResizeObserver(ajustar)
      observer.observe(canvas)
      return () => observer.disconnect()
    }, [])

    function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = e.currentTarget.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function comecar(e: React.PointerEvent<HTMLCanvasElement>) {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      // Captura o ponteiro: se o dedo sair do canvas e voltar, o traço continua
      // em vez de quebrar em dois.
      e.currentTarget.setPointerCapture(e.pointerId)
      desenhando.current = true
      const { x, y } = posicao(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      // Um toque simples (um ponto) também vale como marca.
      ctx.lineTo(x, y)
      ctx.stroke()
      if (!temTraco) {
        setTemTraco(true)
        onMudar?.(true)
      }
    }

    function mover(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!desenhando.current) return
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      const { x, y } = posicao(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    function terminar() {
      desenhando.current = false
    }

    function limpar() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      // Limpa em coordenadas físicas; o scale(dpr) já está aplicado no ctx.
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
      setTemTraco(false)
      onMudar?.(false)
    }

    useImperativeHandle(ref, () => ({
      limpar,
      temTraco: () => temTraco,
      paraArquivo: (nome: string) =>
        new Promise<File | null>((resolve) => {
          const canvas = canvasRef.current
          if (!canvas || !temTraco) return resolve(null)
          canvas.toBlob((blob) => {
            resolve(blob ? new File([blob], nome, { type: 'image/png' }) : null)
          }, 'image/png')
        }),
    }))

    return (
      <div>
        <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-white">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={rotulo}
            onPointerDown={comecar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerLeave={terminar}
            onPointerCancel={terminar}
            // touch-none: sem isso o dedo rola a página em vez de desenhar.
            className="h-40 w-full cursor-crosshair touch-none"
          />
          {!temTraco && (
            <p
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center
                text-content-secondary"
            >
              Assine aqui com o dedo ou a caneta
            </p>
          )}
          {/* A linha de assinatura, como no papel */}
          <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-border" />
        </div>

        <div className="mt-2 flex justify-end">
          <Button variante="secondary" onClick={limpar} disabled={!temTraco}>
            <Eraser className="h-4 w-4" aria-hidden />
            Limpar
          </Button>
        </div>
      </div>
    )
  },
)
