'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import Image from 'next/image'
import { Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const semInscricao = () => () => {}
/** Movimento reduzido ou economia de dados: nada toca sozinho. */
const semAutoplay = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

interface VideoEmPeProps {
  /** Arquivo do vídeo em pé (9:16), com a legenda já gravada na imagem. */
  video: string
  /** O primeiro quadro do vídeo, que pinta antes do arquivo chegar. */
  quadro: string
  /** Texto alternativo do quadro. */
  alt: string
  /** Completa os rótulos dos botões: "Assistir ao vídeo {assunto}". */
  assunto: string
  /** No topo da página: o quadro carrega com prioridade e não abre em cortina. */
  noTopo?: boolean
  /** Largura (a altura sai da proporção 9:16). */
  className?: string
  style?: CSSProperties
  sizes?: string
}

/**
 * Vídeo em pé (9:16) com narração e legenda gravada na imagem: o do
 * atendimento em /servicos e o da apresentação no topo da /jornada.
 *
 * Como o da home: o quadro inicial pinta primeiro, o arquivo só é pedido perto
 * da tela, toca mudo e em loop enquanto está à vista e pausa fora dela ou com
 * a aba escondida. A legenda gravada carrega a mensagem sem som; o botão liga
 * a narração. Com movimento reduzido ou economia de dados, não toca sozinho: o
 * quadro fica com um botão de play.
 *
 * Até 26/10/2026 era só o de /servicos (VideoAtendimento).
 */
export function VideoEmPe({ video, quadro, alt, assunto, noTopo = false, className, style, sizes = '380px' }: VideoEmPeProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const [fonte, setFonte] = useState<string | null>(null)
  const automatico = !useSyncExternalStore(semInscricao, semAutoplay, () => false)
  const [tocando, setTocando] = useState(false)
  const [comSom, setComSom] = useState(false)

  // Pede o arquivo só quando a caixa chega perto da tela.
  useEffect(() => {
    if (!automatico) return
    const caixa = caixaRef.current
    if (!caixa) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      setFonte(video)
    }, { rootMargin: '400px 0px' })
    io.observe(caixa)
    return () => io.disconnect()
  }, [automatico, video])

  // Toca à vista, pausa fora dela e com a aba escondida.
  useEffect(() => {
    const el = videoRef.current
    if (!fonte || !el || !automatico) return
    el.muted = true
    let visivel = false
    const atualizar = () => {
      if (visivel && !document.hidden) el.play().catch(() => {})
      else el.pause()
    }
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; atualizar() }, { threshold: 0.35 })
    io.observe(el)
    document.addEventListener('visibilitychange', atualizar)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
  }, [fonte, automatico])

  // No próprio clique: é o toque que autoriza o navegador a tocar com som.
  const alternarSom = () => {
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    if (el.paused) el.play().catch(() => {})
    setComSom(!el.muted)
  }

  // Sem autoplay: o play já começa com som.
  const assistir = () => {
    setFonte(video)
    requestAnimationFrame(() => {
      const el = videoRef.current
      if (!el) return
      el.muted = false
      setComSom(true)
      el.play().catch(() => {})
    })
  }

  return (
    <div
      ref={caixaRef}
      data-revelar={noTopo ? undefined : 'cortina'}
      style={style}
      className={cn(
        'relative aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <Image src={quadro} alt={alt} fill priority={noTopo} sizes={sizes} className="object-cover" />
      {fonte && (
        <video
          ref={videoRef}
          src={fonte}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setTocando(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${tocando ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {!automatico && !tocando && (
        <button
          type="button"
          onClick={assistir}
          aria-label={`Assistir ao vídeo ${assunto}`}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="ml-1 h-7 w-7" />
          </span>
        </button>
      )}

      {tocando && (
        <button
          type="button"
          onClick={alternarSom}
          aria-label={comSom ? 'Desligar o som do vídeo' : 'Ligar o som do vídeo'}
          aria-pressed={comSom}
          className="absolute bottom-4 right-4 flex h-11 items-center gap-2 rounded-full bg-black/55 px-4 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          {comSom ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {comSom ? 'Som ligado' : 'Ligar som'}
        </button>
      )}
    </div>
  )
}
