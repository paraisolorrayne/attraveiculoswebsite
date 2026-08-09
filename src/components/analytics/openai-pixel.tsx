'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Pixel do OpenAI Ads.
 *
 * Ligado por `NEXT_PUBLIC_OPENAI_PIXEL_ID`. Sem a variável, nada é carregado —
 * mesmo padrão do GTM e do Clarity aqui do lado, e o que permite desligar a
 * medição sem deploy.
 *
 * `debug` fica ligado APENAS fora de produção. O trecho que a OpenAI entrega
 * vem com `debug:true`, o que é útil para conferir a instalação e ruim para o
 * visitante: enche o console e não tem função nenhuma no ar.
 *
 * `afterInteractive` e não `beforeInteractive`, apesar de a documentação pedir
 * "no head, perto do topo". O motivo é que o próprio trecho da OpenAI cria uma
 * FILA (`q.q.push`) antes do SDK carregar — qualquer `oaiq(...)` disparado
 * cedo fica guardado e é processado depois. Então não há evento perdido, e o
 * carregamento deixa de competir com a renderização da página.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID

type Oaiq = (...args: unknown[]) => void

declare global {
  interface Window {
    oaiq?: Oaiq
  }
}

/**
 * Dispara um evento de conversão. Seguro de chamar de qualquer lugar: se o
 * pixel não estiver configurado, vira no-op em vez de quebrar a página.
 *
 * Não engole erro em silêncio no desenvolvimento — se a chamada falhar, o
 * console avisa, senão um evento quebrado passa despercebido até alguém
 * comparar relatório de mídia com o CRM.
 */
export function medirOpenAI(
  evento: string,
  parametros: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined' || !window.oaiq) return
  try {
    window.oaiq('measure', evento, parametros)
  } catch (erro) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[OpenAI Pixel] falha ao medir', evento, erro)
    }
  }
}

/** Dispara `page_viewed` a cada rota — inclusive nas trocas sem recarregar. */
function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // O site é uma SPA: sem isto, só a primeira página da visita seria contada,
    // e quem entra pelo anúncio e navega até a ficha do carro apareceria como
    // uma visualização só.
    medirOpenAI('page_viewed', { type: 'contents' })
  }, [pathname])

  return null
}

/**
 * Mede QUALQUER clique em link de WhatsApp do site, por delegação.
 *
 * Existem 37 arquivos com link de wa.me — botão flutuante, ficha de veículo,
 * páginas de marca, guias, blog. Marcar um por um significa esquecer alguns
 * hoje e todos os que forem criados depois; a ficha de veículo sozinha tem 7
 * botões, e nenhum media até aqui.
 *
 * Um ouvinte na fase de captura resolve de uma vez e continua valendo para link
 * novo. Roda antes de qualquer handler que pare a propagação, e mede ANTES da
 * navegação — a aba do WhatsApp abre em seguida.
 *
 * O evento é o MESMO para todos os botões, de propósito: o que interessa ao
 * anúncio é aprender que "conversa iniciada" é o resultado desejado, não de qual
 * botão da página ela partiu. O contexto do veículo vai como parâmetro.
 */
function WhatsAppClickTracker() {
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Element | null
      const link = alvo?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"]')
      if (!link) return

      // Contexto do veículo, quando o clique parte de uma ficha.
      //
      // Vai o ID NUMÉRICO, não o slug: é o mesmo valor que o feed publica em
      // `sku` e o que o estoque usa como chave. Identificador precisa ser
      // idêntico no feed, na URL e na conversão — senão não dá para responder
      // QUAL veículo gerou interesse, só quantos cliques houve.
      //
      // O slug termina no id (`mercedes-gt-2025-916079`), então basta o último
      // segmento numérico. Sem ele, manda nada em vez de mandar o slug: valor
      // que não casa com o feed é pior que valor ausente.
      const naFicha = window.location.pathname.match(/^\/veiculo\/[\w-]*?(\d+)$/)

      medirOpenAI('whatsapp_click', {
        type: 'customer_action',
        amount: 0,
        currency: 'BRL',
        ...(naFicha ? { content_id: naFicha[1] } : {}),
      })
    }

    document.addEventListener('click', aoClicar, { capture: true })
    return () => document.removeEventListener('click', aoClicar, { capture: true })
  }, [])

  return null
}

export function OpenAIPixel() {
  if (!PIXEL_ID) return null

  const debug = process.env.NODE_ENV !== 'production'

  return (
    <>
      <Script id="openai-pixel" strategy="afterInteractive">
        {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:${JSON.stringify(PIXEL_ID)},debug:${debug}});`}
      </Script>
      <PageViewTracker />
      <WhatsAppClickTracker />
    </>
  )
}
