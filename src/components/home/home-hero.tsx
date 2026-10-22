'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Volume2, X } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

/**
 * Vídeo do fundo do hero, escolhido pela Attra em 22/10/2026 ("Novidade na
 * Attra e Única no Brasil", McLaren GTS). Fixo de propósito: o último vídeo do
 * canal mudava o hero a cada publicação, e nem todo vídeo serve de fundo
 * (conversa com câmera, legenda gravada). A imagem inicial é um quadro dele
 * (public/images/hero-video-poster.jpg), não a capa do YouTube, que tem texto.
 */
const VIDEO_ID = 'LVX2JylkQJY'

const ROTACAO_MS = 7000

/**
 * Manifesto headline rotation — Attra é a MOLDURA, não o quadro.
 * Frases editoriais que curam, em vez de marca+modelo (que competiria
 * com Ferrari/Lambo).
 */
const MANIFESTO_LINES = [
  'Seleção,\nsem igual.',
  'Critério.\nNão estoque.',
  'O lugar\ndo extraordinário.',
] as const

function embedDeFundo(origem: string): string {
  // Mudo, em laço, sem controles; enablejsapi para saber quando começou a
  // tocar (o vídeo só aparece por cima da imagem depois disso).
  const params = new URLSearchParams({
    autoplay: '1', mute: '1', loop: '1', playlist: VIDEO_ID, controls: '0',
    disablekb: '1', playsinline: '1', rel: '0', modestbranding: '1',
    iv_load_policy: '3', fs: '0', enablejsapi: '1', origin: origem,
  })
  return `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params.toString()}`
}

function embedComSom(): string {
  const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1', modestbranding: '1' })
  return `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params.toString()}`
}

const semInscricao = () => () => {}

/**
 * Vídeo de fundo: entra depois que a página carregou (a imagem inicial é o que
 * pinta primeiro) e só aparece quando o YouTube avisa que está tocando, mais
 * um intervalo que cobre o título que o player mostra nos primeiros segundos.
 * Sem vídeo com movimento reduzido ou economia de dados: fica a imagem.
 */
function VideoDeFundo() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [carregar, setCarregar] = useState(false)
  const [tocando, setTocando] = useState(false)

  useEffect(() => {
    const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || conexao?.saveData) return
    let espera: ReturnType<typeof setTimeout>
    const comecar = () => { espera = setTimeout(() => setCarregar(true), 600) }
    if (document.readyState === 'complete') comecar()
    else window.addEventListener('load', comecar, { once: true })
    return () => { clearTimeout(espera); window.removeEventListener('load', comecar) }
  }, [])

  useEffect(() => {
    if (!carregar) return
    let mostrar: ReturnType<typeof setTimeout> | undefined
    const aoMensagem = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return
      let dados: { event?: string; info?: { playerState?: number } }
      try { dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data } catch { return }
      const estado = dados?.info?.playerState
      // 1 = tocando. Espera os controles e o título que o player mostra no
      // começo sumirem (no celular, os botões de voltar/pausar/avançar).
      if (estado === 1 && !mostrar) mostrar = setTimeout(() => setTocando(true), 4500)
      // 0 = terminou (o laço recomeça) e 3 = carregando: o player mostra a
      // própria interface por um instante; a imagem cobre até voltar a tocar.
      if (estado === 0 || estado === 3) {
        clearTimeout(mostrar)
        mostrar = undefined
        setTocando(false)
      }
    }
    window.addEventListener('message', aoMensagem)
    return () => { window.removeEventListener('message', aoMensagem); clearTimeout(mostrar) }
  }, [carregar])

  if (!carregar) return null

  return (
    <iframe
      ref={iframeRef}
      src={embedDeFundo(window.location.origin)}
      title="Vídeo de apresentação da Attra"
      aria-hidden="true"
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      onLoad={() => {
        // Pede ao player que avise as mudanças de estado (API do YouTube por postMessage).
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'hero', channel: 'widget' }), '*')
      }}
      className={`hero-video pointer-events-none absolute left-1/2 top-1/2 border-0 transition-opacity duration-[1500ms] ease-out ${tocando ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

function JanelaDoVideo({ aoFechar }: { aoFechar: () => void }) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    document.addEventListener('keydown', aoTeclar)
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = rolagem
    }
  }, [aoFechar])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vídeo da Attra com som"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <button
        type="button"
        onClick={aoFechar}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Fechar vídeo"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-black" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={embedComSom()}
          title="Attra Veículos — vídeo de apresentação"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>,
    document.body,
  )
}

/**
 * Hero da home em tela cheia, com o vídeo da Attra no fundo. Substitui o
 * vídeo enquadrado ao lado do texto, que dividia a atenção com o título e
 * mostrava a barra do YouTube ao passar o mouse.
 */
export function HomeHero() {
  const [passo, setPasso] = useState(0)
  const [comSom, setComSom] = useState(false)
  const fecharVideo = useCallback(() => setComSom(false), [setComSom])
  const montado = useSyncExternalStore(semInscricao, () => true, () => false)

  // Rotaciona o manifesto (respeitando prefers-reduced-motion).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const intervalo = setInterval(() => setPasso((p) => p + 1), ROTACAO_MS)
    return () => clearInterval(intervalo)
  }, [])

  const manifestoLine = MANIFESTO_LINES[passo % MANIFESTO_LINES.length]

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      // Altura em motion.css (.hero-tela): no celular desconta a barra de
      // abas, para nada do hero ficar atrás dela.
      className="hero-tela relative w-full overflow-hidden bg-black"
    >
      <div className="hero-fundo absolute inset-0" aria-hidden="true">
        <Image
          src="/images/hero-video-poster.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        {montado && <VideoDeFundo />}
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
            key={manifestoLine}
            data-primeira={passo === 0 || undefined}
            className="text-white font-normal tracking-tight leading-[1.02] text-[clamp(2.75rem,6.4vw,6rem)] mb-6"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {manifestoLine.split('\n').map((line, i) => (
              <span key={i} className="hero-linha" style={{ ['--d' as string]: `${i * 0.12}s` }}>
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero-entra max-w-xl text-[15px] font-light leading-relaxed tracking-wide text-white/75 sm:text-base mb-8 sm:mb-9">
            Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
            Uberlândia, entregues em todo o Brasil.
          </p>

          <div className="hero-entra flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4" style={{ ['--d' as string]: '0.1s' }}>
            <Link
              href="/veiculos"
              className="group inline-flex h-14 items-center justify-center gap-3 bg-white px-9 text-xs font-medium uppercase tracking-[0.22em] text-black transition-colors hover:bg-white/90 sm:text-sm"
            >
              Explorar estoque
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={getWhatsAppUrl(consultantWhatsAppMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-3 border border-white/40 px-8 text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:border-white hover:bg-white/10 sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Falar com consultor
            </a>
          </div>

          <button
            type="button"
            onClick={() => setComSom(true)}
            className="hero-entra mt-7 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.24em] text-white/70 transition-colors hover:text-white"
            style={{ ['--d' as string]: '0.2s' }}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Assistir com som
          </button>
        </div>
      </div>

      {montado && comSom && <JanelaDoVideo aoFechar={fecharVideo} />}
    </section>
  )
}
