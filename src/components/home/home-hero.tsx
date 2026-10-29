'use client'

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { getImageProps } from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Volume2, VolumeX } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

/**
 * Filme próprio da Attra para o hero (22/10/2026), 30 s com trilha, em dois
 * cortes: o do celular vem mais fechado, para o recorte em pé. O nome leva a
 * versão porque o cache é de um ano (next.config.ts): vídeo novo, nome novo.
 * A imagem inicial é o primeiro quadro de cada corte.
 */
const FILME = {
  computador: { video: '/videos/hero-computador-v1.mp4', quadro: '/images/hero-computador-v1.jpg' },
  celular: { video: '/videos/hero-celular-v1.mp4', quadro: '/images/hero-celular-v1.jpg' },
}

// Tela em pé ou estreita usa o corte do celular, no vídeo e na imagem inicial.
const MIDIA_CELULAR = '(max-width: 767px), (orientation: portrait)'

const videoDaTela = () => (window.matchMedia(MIDIA_CELULAR).matches ? FILME.celular : FILME.computador).video

/**
 * O título fixo da home. Até 29/10/2026 três frases se revezavam a cada 7 s
 * ("Seleção, sem igual", "O lugar do extraordinário"): ninguém terminava de
 * ler e o <h1> que o Google indexa mudava. A emoção fica com o vídeo.
 */
const MANIFESTO = ['Critério.', 'Não estoque.'] as const

/** Primeiro quadro do corte certo para a tela: é o que pinta antes do vídeo. */
function QuadroInicial() {
  // Os dois cortes abrem na fachada da loja.
  const comum = { alt: 'Fachada da Attra Veículos em Uberlândia', sizes: '100vw', quality: 75 }
  const { props: { srcSet: celular } } = getImageProps({ ...comum, src: FILME.celular.quadro, width: 1280, height: 720 })
  const { props: { srcSet: computador, ...img } } = getImageProps({
    ...comum, src: FILME.computador.quadro, width: 1920, height: 1080, loading: 'eager', fetchPriority: 'high',
  })
  return (
    <picture>
      <source media={MIDIA_CELULAR} srcSet={celular} sizes="100vw" />
      <source srcSet={computador} sizes="100vw" />
      <img {...img} alt={comum.alt} className="absolute inset-0 h-full w-full object-cover" />
    </picture>
  )
}

/**
 * Vídeo de fundo: entra depois que a página carregou (o quadro inicial é o que
 * pinta primeiro), aparece quando começa a tocar e pausa fora da tela ou com a
 * aba escondida. Sem vídeo com movimento reduzido ou economia de dados: fica o
 * quadro. O som é do hero (botão "Ligar som"), por isso o elemento é dele.
 */
function VideoDeFundo({ videoRef, tocando, setTocando, setComSom }: {
  videoRef: RefObject<HTMLVideoElement | null>
  tocando: boolean
  setTocando: Dispatch<SetStateAction<boolean>>
  setComSom: Dispatch<SetStateAction<boolean>>
}) {
  const [fonte, setFonte] = useState<string | null>(null)

  useEffect(() => {
    const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || conexao?.saveData) return
    let espera: ReturnType<typeof setTimeout>
    const comecar = () => { espera = setTimeout(() => setFonte(videoDaTela()), 600) }
    if (document.readyState === 'complete') comecar()
    else window.addEventListener('load', comecar, { once: true })
    return () => { clearTimeout(espera); window.removeEventListener('load', comecar) }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!fonte || !video) return
    // O autoplay só é aceito mudo; no iOS a propriedade precisa estar ligada antes do play().
    video.muted = true
    const tocar = () => video.play().catch(() => {
      // Com som, o navegador pode recusar sem um toque recente: volta ao mudo e
      // segue tocando. Mudo e recusado (modo economia do iOS), fica o quadro.
      if (video.muted) return
      video.muted = true
      setComSom(false)
      video.play().catch(() => {})
    })
    let visivel = false
    const atualizar = () => (visivel && !document.hidden ? tocar() : video.pause())
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; atualizar() })
    io.observe(video)
    document.addEventListener('visibilitychange', atualizar)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', atualizar) }
  }, [fonte, videoRef, setComSom])

  if (!fonte) return null

  return (
    <video
      ref={videoRef}
      src={fonte}
      muted
      loop
      playsInline
      // Só os dados do arquivo até o play(): o quadro inicial (AVIF/WebP pelo
      // next/image) é o que pinta enquanto isso, também na rede do celular.
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      disableRemotePlayback
      onPlaying={() => setTocando(true)}
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${tocando ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

/**
 * Hero da home em tela cheia, com o filme da Attra no fundo. Substitui o
 * vídeo do YouTube enquadrado ao lado do texto, que dividia a atenção com o
 * título e mostrava a barra do player ao passar o mouse.
 */
export function HomeHero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tocando, setTocando] = useState(false)
  const [comSom, setComSom] = useState(false)

  // No próprio clique: é o toque que autoriza o navegador a tocar com som.
  const alternarSom = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    if (video.paused) video.play().catch(() => {})
    setComSom(!video.muted)
  }

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      // Altura em motion.css (.hero-tela): no celular desconta a barra de
      // abas, para nada do hero ficar atrás dela.
      className="hero-tela relative w-full overflow-hidden bg-black"
    >
      <div className="hero-fundo absolute inset-0" aria-hidden="true">
        <QuadroInicial />
        <VideoDeFundo videoRef={videoRef} tocando={tocando} setTocando={setTocando} setComSom={setComSom} />
      </div>

      {/* Escurecimento para o texto ler bem sobre qualquer quadro do vídeo */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" aria-hidden="true" />

      <div className="hero-conteudo relative z-10 flex h-full flex-col justify-end px-6 pb-10 sm:px-10 lg:px-[10%] lg:pb-16">
        <div className="max-w-3xl">
          {/* Único <h1> da home. Cada linha sobe por trás de uma máscara; na
              primeira vez, depois da abertura (motion.css). */}
          <h1
            data-primeira
            className="text-white font-normal tracking-tight leading-[1.02] text-[clamp(2.75rem,6.4vw,6rem)] mb-6"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {MANIFESTO.map((line, i) => (
              <span key={i} className="hero-linha" style={{ ['--d' as string]: `${i * 0.12}s` }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero-entra max-w-xl text-[15px] font-light leading-relaxed tracking-wide text-white/75 sm:text-base mb-8 sm:mb-9">
            {/* Sem a lista de marcas: a faixa logo abaixo já mostra as que têm
                carro no estoque, com link (27/10/2026). */}
            Supercarros e veículos premium selecionados em Uberlândia, entregues
            em todo o Brasil.
          </p>

          <div className="hero-entra flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" style={{ ['--d' as string]: '0.1s' }}>
            <Link
              href="/veiculos"
              className="group inline-flex h-14 items-center justify-center gap-3 bg-white px-9 focus-visible:outline-white text-xs font-medium uppercase tracking-[0.22em] text-black transition-colors hover:bg-white/90 sm:text-sm"
            >
              Explorar estoque
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={getWhatsAppUrl(consultantWhatsAppMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-3 border border-white/40 px-8 focus-visible:outline-white text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:border-white hover:bg-white/10 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Falar com consultor
            </a>
          </div>

          {/* Só aparece com o vídeo tocando; o espaço fica reservado para o
              título não pular quando ele entra. */}
          <button
            type="button"
            onClick={alternarSom}
            aria-pressed={comSom}
            aria-hidden={!tocando || undefined}
            tabIndex={tocando ? undefined : -1}
            className={`alvo-toque mt-7 inline-flex items-center gap-2.5 text-[13px] uppercase tracking-[0.2em] text-white/75 transition-[color,opacity] duration-700 hover:text-white ${tocando ? 'opacity-100' : 'invisible opacity-0'}`}
          >
            {comSom ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            {comSom ? 'Desligar som' : 'Ligar som'}
          </button>
        </div>
      </div>

    </section>
  )
}
