'use client'

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { getImageProps } from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Volume2, VolumeX } from 'lucide-react'
import { anosDeMercado, getWhatsAppUrl } from '@/lib/constants'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

/**
 * Filme próprio da Attra para o hero (22/10/2026), 30 s com trilha, em dois
 * cortes. O nome leva a versão porque o cache é de um ano (next.config.ts):
 * vídeo novo, nome novo. A imagem inicial é o primeiro quadro de cada corte.
 *
 * O do celular (v3, 30/10/2026) é um filme próprio em pé, 1080x1920, 28,6 s,
 * montado só com cenas gravadas na vertical (Reels e stories da Attra) e
 * recortes dos vídeos 4K: abre no Aston Martin chegando à fachada, corta seco
 * no escapamento quando o motor ronca na trilha (a mesma do computador) e
 * segue em Ferrari e Lamborghini. Até a v2 era o quadro 16:9 no alto com o
 * próprio vídeo desfocado embaixo, e os carros ficavam pequenos no celular.
 * Recomprimido para o site (11,5 → 7,8 MB, sem diferença visível a 100%):
 *   libx264 -preset slow -crf 28 -movflags +faststart, aac 128k 48 kHz
 */
const FILME = {
  computador: { video: '/videos/hero-computador-v1.mp4', quadro: '/images/hero-computador-v1.jpg' },
  celular: { video: '/videos/hero-celular-v3.mp4', quadro: '/images/hero-celular-v3.jpg' },
}

// Tela em pé ou estreita usa o corte do celular, no vídeo e na imagem inicial.
const MIDIA_CELULAR = '(max-width: 767px), (orientation: portrait)'

// No corte em pé, se a tela for mais larga que 9:16 (tablet em pé), a sobra
// de altura sai de baixo, que fica sob o texto: o letreiro e os carros, no
// alto do quadro, continuam inteiros. Mesmas condições de MIDIA_CELULAR.
const ENQUADRAMENTO = 'object-cover max-md:object-top portrait:object-top'

const videoDaTela = () => (window.matchMedia(MIDIA_CELULAR).matches ? FILME.celular : FILME.computador).video

/**
 * Trechos do corte do celular (em segundos) em que o letreiro ATTRA da fachada
 * ocupa o alto do quadro. No celular o título fica no alto e saía por cima do
 * letreiro: nesses trechos ele e o escurecimento do alto saem de cena
 * (31/10/2026). Medidos no v3 com o scene score do ffmpeg (as duas entradas
 * são fusões); vídeo novo, medir de novo.
 */
const CENAS_DO_LETREIRO = [[1.3, 3.6], [23.0, 25.7]] as const

/**
 * As frases do título. Até 29/10/2026 as três se revezavam a cada 7 s: ninguém
 * terminava de ler e o <h1> que o Google indexa mudava. Desde 31/10/2026 só
 * trocam no celular, quando o título volta depois de sair de cima do letreiro
 * ATTRA (CENAS_DO_LETREIRO): a cada passagem, a próxima frase. A primeira é a
 * do HTML; enquanto outra estiver na tela, ela segue para o leitor de tela e o
 * Google, e a da tela fica aria-hidden. No computador o título não sai de cena
 * e fica sempre na primeira.
 *
 * "O lugar do / extraordinário." quebra assim porque "do extraordinário." dá
 * 366 px em 44 px de fonte, e a linha tem 312 px no celular de 360.
 */
const FRASES = [
  ['Critério.', 'Não estoque.'],
  ['Seleção,', 'sem igual.'],
  ['O lugar do', 'extraordinário.'],
] as const

// Os anos de mercado abrem o subtítulo, por extenso. Vêm de anosDeMercado()
// para não envelhecer; depois de "Vinte e cinco", em algarismos.
const ANOS_POR_EXTENSO = ['Dezoito', 'Dezenove', 'Vinte', 'Vinte e um', 'Vinte e dois', 'Vinte e três', 'Vinte e quatro', 'Vinte e cinco']
const anosPorExtenso = () => ANOS_POR_EXTENSO[anosDeMercado() - 18] ?? String(anosDeMercado())

/** Primeiro quadro do corte certo para a tela: é o que pinta antes do vídeo. */
function QuadroInicial() {
  // Os dois cortes abrem na loja: o do computador na fachada, o do celular
  // na avenida, com o totem da Attra ao fundo.
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
 * pinta primeiro), aparece quando dá para tocar sem travar e pausa fora da tela
 * ou com a aba escondida. Sem vídeo com movimento reduzido, economia de dados ou rede 2G/3G: fica o
 * quadro. O som é do hero (botão "Ligar som"), por isso o elemento é dele.
 */
function VideoDeFundo({ videoRef, fonte, setFonte, tocando, setTocando, setComSom }: {
  videoRef: RefObject<HTMLVideoElement | null>
  fonte: string | null
  setFonte: Dispatch<SetStateAction<string | null>>
  tocando: boolean
  setTocando: Dispatch<SetStateAction<boolean>>
  setComSom: Dispatch<SetStateAction<boolean>>
}) {
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
  }, [setFonte])

  useEffect(() => {
    const video = videoRef.current
    if (!fonte || !video) return
    // O autoplay só é aceito mudo; no iOS a propriedade precisa estar ligada antes do play().
    video.muted = true
    const tocar = () => video.play().catch(() => {
      // Com som, o navegador pode recusar sem um toque recente: volta ao mudo e
      // segue tocando. Mudo e recusado (modo economia do iOS), fica o quadro
      // com o botão de som: o toque nele é o que faz o filme tocar.
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

  // Aparece só quando dá para tocar até o fim sem travar. Antes surgia no
  // primeiro quadro baixado e, com a rede mais lenta que o filme (4G fraco,
  // 1,6 Mbps contra os ~2,2 Mbps do corte do celular), parava 5 vezes nos
  // primeiros 25 s (31/10/2026). Enquanto isso já toca escondido e mudo, porque
  // no iOS o arquivo só baixa tocando; ao aparecer, volta ao começo.
  useEffect(() => {
    const video = videoRef.current
    if (!fonte || !video || tocando) return
    const inicio = performance.now()
    const avaliar = () => {
      const { buffered, duration } = video
      if (!buffered.length || !duration) return
      const baixado = buffered.end(buffered.length - 1)
      // Segundos de filme que chegam por segundo de rede, com 20% de margem.
      // Tocando do começo, só alcança o fim do que baixou se faltar baixar
      // mais do que o ritmo cobre: precisa ter (1 - ritmo) do filme na mão.
      const ritmo = (0.8 * baixado) / ((performance.now() - inicio) / 1000)
      if (baixado < duration - 0.5 && baixado < (1 - ritmo) * duration + 1.5) return
      if (video.currentTime > 0.5) video.currentTime = 0
      setTocando(true)
    }
    const eventos = ['progress', 'timeupdate', 'playing'] as const
    eventos.forEach((e) => video.addEventListener(e, avaliar))
    return () => eventos.forEach((e) => video.removeEventListener(e, avaliar))
  }, [fonte, tocando, videoRef, setTocando])

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
      className={`pointer-events-none absolute inset-0 h-full w-full ${ENQUADRAMENTO} transition-opacity duration-[1200ms] ease-out ${tocando ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

/**
 * Liga e desliga o som do filme. Aparece assim que o vídeo existe, mesmo antes
 * de ele tocar: com o autoplay recusado (modo economia do iPhone) o filme não
 * saía do quadro e o botão nunca aparecia (31/10/2026); agora o toque nele faz
 * tocar, já com som. Sem vídeo (movimento reduzido, rede lenta), o espaço fica
 * reservado. No computador é texto, abaixo dos botões; até lá (`icone`), um
 * círculo na linha do "Explorar estoque".
 */
function BotaoSom({ visivel, comSom, alternar, icone = false }: {
  visivel: boolean
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
      aria-hidden={!visivel || undefined}
      tabIndex={visivel ? undefined : -1}
      className={`${icone
        ? 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-white/80 hover:border-white hover:text-white lg:hidden'
        : 'alvo-toque mt-7 hidden items-center gap-2.5 text-[13px] uppercase tracking-[0.2em] text-white/75 hover:text-white lg:inline-flex'
      } transition-[color,border-color,opacity] duration-700 ${visivel ? 'opacity-100' : 'invisible opacity-0'}`}
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
  const [fonte, setFonte] = useState<string | null>(null)
  const [tocando, setTocando] = useState(false)
  const [comSom, setComSom] = useState(false)
  const [naCenaDoLetreiro, setNaCenaDoLetreiro] = useState(false)
  const [frase, setFrase] = useState(0)

  // Acompanha o filme do celular para tirar o título de cima do letreiro. O
  // timeupdate chega a cada ~250 ms: sai um quarto de segundo antes da cena.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !tocando || fonte !== FILME.celular.video) return
    // A frase só troca onde o título sai de cena (max-lg); no tablet em pé
    // grande o corte é o do celular, mas o título fica, e trocaria à vista.
    const trocaFrase = window.matchMedia('(max-width: 1023.98px)').matches
    let estavaNoLetreiro = false
    const conferir = () => {
      const t = video.currentTime
      const agora = CENAS_DO_LETREIRO.some(([de, ate]) => t >= de - 0.25 && t < ate)
      // Saindo do letreiro, o título volta com a próxima frase.
      if (trocaFrase && estavaNoLetreiro && !agora) setFrase(i => (i + 1) % FRASES.length)
      estavaNoLetreiro = agora
      setNaCenaDoLetreiro(agora)
    }
    video.addEventListener('timeupdate', conferir)
    video.addEventListener('seeked', conferir)
    return () => {
      video.removeEventListener('timeupdate', conferir)
      video.removeEventListener('seeked', conferir)
    }
  }, [tocando, fonte])
  // Só no celular (max-lg): no computador o título fica embaixo, longe dele.
  const foraDoLetreiro = tocando && naCenaDoLetreiro ? 'max-lg:opacity-0' : ''

  // No próprio clique: é o toque que autoriza o navegador a tocar com som.
  const alternarSom = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    // Ainda escondido (baixando, ou com o autoplay recusado): quem pediu som
    // vê o filme na hora, do começo, onde a trilha começa.
    if (!tocando) {
      video.currentTime = 0
      setTocando(true)
    }
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
        <VideoDeFundo
          videoRef={videoRef}
          fonte={fonte}
          setFonte={setFonte}
          tocando={tocando}
          setTocando={setTocando}
          setComSom={setComSom}
        />
      </div>

      {/* Escurecimento para o texto ler bem sobre qualquer quadro do vídeo. No
          celular só onde há texto (o título no alto, a frase e os botões
          embaixo): a faixa do meio, onde passam os carros, fica limpa. */}
      <div className="absolute inset-0 hidden bg-gradient-to-r from-black/75 via-black/35 to-transparent lg:block" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/90 via-black/60 to-transparent lg:h-3/4 lg:via-black/40" aria-hidden="true" />
      <div className={`absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-black/75 via-black/40 to-transparent transition-opacity duration-500 lg:h-40 lg:from-black/60 lg:via-transparent ${foraDoLetreiro}`} aria-hidden="true" />

      {/* No celular o filme em pé (v3) ocupa o topo inteiro. Desde 31/10/2026
          o título sobe para o alto, logo abaixo do cabeçalho, e a frase e os
          botões ficam embaixo: o meio da tela é do vídeo. Com tudo junto
          embaixo, o bloco cobria do meio da tela para baixo, onde passam os
          carros. No computador segue tudo junto, embaixo à esquerda. */}
      <div className="hero-conteudo relative z-10 flex h-full flex-col justify-end px-6 pb-10 pt-24 sm:px-10 lg:px-[10%] lg:pb-16 lg:pt-0">
        <div className="max-w-3xl max-lg:flex max-lg:flex-1 max-lg:flex-col">
          {/* Único <h1> da home. Cada linha sobe por trás de uma máscara; na
              primeira vez, depois da abertura (motion.css). No celular some
              (só na tela, segue no HTML) nas cenas do letreiro ATTRA e volta
              com a próxima frase: a `key` nova faz as linhas subirem de novo. */}
          <h1
            data-primeira
            className={`text-white font-normal tracking-tight leading-[1.02] text-[clamp(2.75rem,6.4vw,6rem)] mb-6 max-lg:mb-auto transition-opacity duration-500 ${foraDoLetreiro}`}
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {frase > 0 && <span className="sr-only">{FRASES[0].join(' ')}</span>}
            {FRASES[frase].map((line, i) => (
              <span
                key={`${frase}-${i}`}
                className="hero-linha"
                aria-hidden={frase > 0 || undefined}
                style={{ ['--d' as string]: `${i * 0.12}s` }}
              >
                <span>{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero-entra max-w-xl text-[15px] font-light leading-relaxed tracking-wide text-white/85 [text-shadow:0_1px_14px_rgb(0_0_0/0.55)] sm:text-base mb-8 sm:mb-9 lg:text-white/75 lg:[text-shadow:none]">
            {/* Sem a lista de marcas: a faixa logo abaixo já mostra as que têm
                carro no estoque, com link (27/10/2026). Desde 31/10/2026, o
                caminho "garagens certas" escolhido por ela: autoridade (os
                anos), a categoria e o "Critério" do título (o carro certo para
                a pessoa certa), em 2 linhas no celular. */}
            {anosPorExtenso()} anos levando superesportivos às garagens certas
            de todo o Brasil.
          </p>

          {/* Até o computador: "Explorar estoque" no tamanho do texto, o som
              como ícone na mesma linha e o consultor como link (29/10/2026).
              Lado a lado os dois botões cheios só cabem a partir de ~770 px;
              antes disso quebravam em duas linhas. */}
          <div className="hero-entra flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:gap-4" style={{ ['--d' as string]: '0.1s' }}>
            <div className="flex w-full items-center justify-between lg:contents">
            <Link
              href="/veiculos"
              className="group inline-flex h-11 items-center justify-center gap-2.5 bg-white px-5 focus-visible:outline-white text-xs font-medium uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90 sm:text-[13px] lg:h-14 lg:gap-3 lg:px-9 lg:text-sm lg:tracking-[0.22em]"
            >
              Explorar estoque
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 lg:h-4 lg:w-4" />
            </Link>
            <BotaoSom visivel={fonte !== null} comSom={comSom} alternar={alternarSom} icone />
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

          <BotaoSom visivel={fonte !== null} comSom={comSom} alternar={alternarSom} />
        </div>
      </div>

    </section>
  )
}
