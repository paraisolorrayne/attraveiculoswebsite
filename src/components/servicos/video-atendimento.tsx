'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { Play, Volume2, VolumeX } from 'lucide-react'

const VIDEO = '/videos/atendimento-showroom.mp4'
const QUADRO = '/images/atendimento-showroom-quadro.jpg'

const semInscricao = () => () => {}
/** Movimento reduzido ou economia de dados: nada toca sozinho. */
const semAutoplay = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

/**
 * Vídeo do atendimento no showroom (em pé, 9:16, 40 s, com narração e legenda
 * já gravada na imagem), em /servicos.
 *
 * Como o da home: o quadro inicial pinta primeiro, o arquivo (5,7 MB) só é
 * pedido perto da tela, toca mudo e em loop enquanto está à vista e pausa fora
 * dela ou com a aba escondida. A legenda gravada carrega a mensagem sem som; o
 * botão liga a narração. Com movimento reduzido ou economia de dados, não toca
 * sozinho: o quadro fica com um botão de play.
 */
export function VideoAtendimento() {
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
      setFonte(VIDEO)
    }, { rootMargin: '400px 0px' })
    io.observe(caixa)
    return () => io.disconnect()
  }, [automatico])

  // Toca à vista, pausa fora dela e com a aba escondida.
  useEffect(() => {
    const video = videoRef.current
    if (!fonte || !video || !automatico) return
    video.muted = true
    let visivel = false
    const atualizar = () => {
      if (visivel && !document.hidden) video.play().catch(() => {})
      else video.pause()
    }
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; atualizar() }, { threshold: 0.35 })
    io.observe(video)
    document.addEventListener('visibilitychange', atualizar)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
  }, [fonte, automatico])

  // No próprio clique: é o toque que autoriza o navegador a tocar com som.
  const alternarSom = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    if (video.paused) video.play().catch(() => {})
    setComSom(!video.muted)
  }

  // Sem autoplay: o play já começa com som.
  const assistir = () => {
    setFonte(VIDEO)
    requestAnimationFrame(() => {
      const video = videoRef.current
      if (!video) return
      video.muted = false
      setComSom(true)
      video.play().catch(() => {})
    })
  }

  return (
    <div
      ref={caixaRef}
      data-revelar="cortina"
      // Largura fixa no computador: a coluna do vídeo se mede pelo conteúdo, e
      // com w-full (tudo aqui dentro é absoluto) a caixa ficava com 0 px.
      className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-2xl bg-black shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)] lg:w-[380px] lg:max-w-none"
    >
      <Image
        src={QUADRO}
        alt="Atendimento no showroom da Attra Veículos, em Uberlândia"
        fill
        sizes="380px"
        className="object-cover"
      />
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
          aria-label="Assistir ao vídeo do atendimento"
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
