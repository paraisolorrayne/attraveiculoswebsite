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
 * cortes. O nome leva a versão porque o cache é de um ano (next.config.ts):
 * vídeo novo, nome novo. A imagem inicial é o primeiro quadro de cada corte.
 *
 * O do celular (v2, 29/10/2026) é em pé, 1080x1920: o corte "mais fechado"
 * que veio era 16:9, e o celular em pé mostrava só o terço do meio (o ATTRA
 * da fachada saía cortado). Na v2 o quadro 16:9 inteiro fica no alto, a 220
 * px do topo (logo abaixo do cabeçalho), e o resto é o próprio vídeo
 * desfocado; os 110 px de baixo do quadro se fundem no desfoque. Montado com
 * ffmpeg a partir da v1 (mascara.png: branco, com degradê nos 110 px de baixo):
 *   [0:v]split=2[f][b];
 *   [b]scale=-2:640,crop=360:640,boxblur=24:3,scale=1080:1920,eq=brightness=-0.05:saturation=1.1[bg];
 *   [f]scale=1080:608,format=yuva420p[fg0];[1:v]format=gray[m];[fg0][m]alphamerge[fg];
 *   [bg][fg]overlay=0:220   (libx264 -crf 25, áudio copiado)
 */
const FILME = {
  computador: { video: '/videos/hero-computador-v1.mp4', quadro: '/images/hero-computador-v1.jpg' },
  celular: { video: '/videos/hero-celular-v2.mp4', quadro: '/images/hero-celular-v2.jpg' },
}

// Tela em pé ou estreita usa o corte do celular, no vídeo e na imagem inicial.
const MIDIA_CELULAR = '(max-width: 767px), (orientation: portrait)'

// No corte em pé, a sobra de altura sai de baixo (só desfoque): o quadro
// nítido fica sempre logo abaixo do cabeçalho. Mesmas condições de MIDIA_CELULAR.
const ENQUADRAMENTO = 'object-cover max-md:object-top portrait:object-top'

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
  const { props: { srcSet: celular } } = getImageProps({ ...comum, src: FILME.celular.quadro, width: 1080, height: 1920 })
  const { props: { srcSet: computador, ...img } } = getImageProps({
    ...comum, src: FILME.computador.quadro, width: 1920, height: 1080, loading: 'eager', fetchPriority: 'high',
  })
  return (
    <picture>
      <source media={MIDIA_CELULAR} srcSet={celular} sizes="100vw" />
      <source srcSet={computador} sizes="100vw" />
      <img {...img} alt={comum.alt} className={`absolute inset-0 h-full w-full ${ENQUADRAMENTO}`} />
    </picture>
  )
}

/**
 * Vídeo de fundo: entra depois que a página carregou (o quadro inicial é o que
 * pinta primeiro), aparece quando começa a tocar e pausa fora da tela ou com a
 * aba escondida. Sem vídeo com movimento reduzido, economia de dados ou rede 2G/3G: fica o
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
    const conexao = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    // Em 2G/3G o filme (MBs) disputaria a rede com as fotos dos carros: fica o quadro.
    const redeLenta = /2g|3g/.test(conexao?.effectiveType ?? '')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || conexao?.saveData || redeLenta) return
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
      className={`pointer-events-none absolute inset-0 h-full w-full ${ENQUADRAMENTO} transition-opacity duration-[1200ms] ease-out ${tocando ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

/**
 * Liga e desliga o som do filme. Só aparece com o vídeo tocando; o espaço fica
 * reservado para nada pular quando ele entra. No computador é texto, abaixo dos
 * botões; até lá (`icone`), um círculo na linha do "Explorar estoque".
 */
function BotaoSom({ tocando, comSom, alternar, icone = false }: {
  tocando: boolean
  comSom: boolean
  alternar: () => void
  icone?: boolean
}) {
  const Icone = comSom ? Volume2 : VolumeX
  const rotulo = comSom ? 'Desligar som' : 'Ligar som'
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={comSom}
      aria-label={icone ? rotulo : undefined}
      aria-hidden={!tocando || undefined}
      tabIndex={tocando ? undefined : -1}
      className={`${icone
        ? 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white/80 hover:border-white hover:text-white lg:hidden'
        : 'alvo-toque mt-7 hidden items-center gap-2.5 text-[13px] uppercase tracking-[0.2em] text-white/75 hover:text-white lg:inline-flex'
      } transition-[color,border-color,opacity] duration-700 ${tocando ? 'opacity-100' : 'invisible opacity-0'}`}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
      {!icone && rotulo}
    </button>
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

      <div className="hero-conteudo relative z-10 flex h-full flex-col justify-end px-6 pb-6 sm:px-10 sm:pb-10 lg:px-[10%] lg:pb-16">
        <div className="max-w-3xl">
          {/* Único <h1> da home. Cada linha sobe por trás de uma máscara; na
              primeira vez, depois da abertura (motion.css). */}
          <h1
            data-primeira
            className="text-white font-normal tracking-tight leading-[1.02] text-[2.25rem] mb-4 sm:text-[clamp(2.75rem,6.4vw,6rem)] sm:mb-6"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {MANIFESTO.map((line, i) => (
              <span key={i} className="hero-linha" style={{ ['--d' as string]: `${i * 0.12}s` }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero-entra max-w-xl text-sm font-light leading-relaxed tracking-wide text-white/75 sm:text-base mb-6 sm:mb-9">
            {/* Sem a lista de marcas: a faixa logo abaixo já mostra as que têm
                carro no estoque, com link (27/10/2026). */}
            Supercarros e veículos premium selecionados em Uberlândia, entregues
            em todo o Brasil.
          </p>

          {/* Até o computador: "Explorar estoque" no tamanho do texto, o som
              como ícone na mesma linha e o consultor como link. Os dois botões
              de largura cheia, o título de 44 px e a linha do "Ligar som"
              cobriam o vídeo no celular (29/10/2026); lado a lado os botões só
              cabem a partir de ~770 px, antes disso quebravam em duas linhas. */}
          <div className="hero-entra flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:gap-4" style={{ ['--d' as string]: '0.1s' }}>
            <div className="flex w-full items-center justify-between lg:contents">
            <Link
              href="/veiculos"
              className="group inline-flex h-11 items-center justify-center gap-2.5 bg-white px-5 focus-visible:outline-white text-xs font-medium uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 sm:text-[13px] lg:h-14 lg:gap-3 lg:px-9 lg:text-sm lg:tracking-[0.22em]"
            >
              Explorar estoque
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 lg:h-4 lg:w-4" />
            </Link>
            <BotaoSom tocando={tocando} comSom={comSom} alternar={alternarSom} icone />
            </div>
            <a
              href={getWhatsAppUrl(consultantWhatsAppMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="alvo-toque inline-flex items-center justify-center gap-2.5 focus-visible:outline-white text-xs font-medium uppercase tracking-[0.18em] text-white underline decoration-white/40 underline-offset-[7px] transition-colors hover:decoration-white sm:text-[13px] lg:h-14 lg:gap-3 lg:border lg:border-white/40 lg:px-8 lg:text-sm lg:tracking-[0.22em] lg:no-underline lg:hover:border-white lg:hover:bg-white/10"
            >
              <MessageCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
              Falar com consultor
            </a>
          </div>

          <BotaoSom tocando={tocando} comSom={comSom} alternar={alternarSom} />
        </div>
      </div>

    </section>
  )
}
