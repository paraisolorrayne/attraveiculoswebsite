import { NextResponse } from 'next/server'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { gerarFeedMetaWhatsApp, type FeedMetaWhatsAppGerado } from '@/lib/feed-meta-whatsapp'

/**
 * Sem ISR e sem o cache de 5 minutos do fetch da AutoConf. Os dois servem o
 * dado velho primeiro e só atualizam depois: o `/api/feed/meta` sai com
 * `x-nextjs-cache: STALE`, e uma busca agendada que é a única a chamar a URL
 * receberia sempre o arquivo gerado na busca anterior. Carro vendido ficaria
 * no WhatsApp por um ciclo inteiro. O teto de idade fica com o cache abaixo.
 */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** Idade máxima do arquivo servido. */
const CACHE_MS = 15 * 60 * 1000

/**
 * Último arquivo gerado, por processo. Sem ele, cada chamada desta URL pública
 * bateria na AutoConf com o mesmo token do site inteiro. Guarda a promessa, e
 * não o resultado, para chamadas simultâneas dividirem uma busca só.
 */
let cache: { em: number; feed: Promise<FeedMetaWhatsAppGerado> } | null = null

function feedAtual(agora: number) {
  if (!cache || agora - cache.em >= CACHE_MS) {
    const feed = loadListedInventory().then(({ vehicles }) => {
      const gerado = gerarFeedMetaWhatsApp(vehicles)
      if (gerado.recusados.length > 0) {
        console.warn(
          `[feed-meta-whatsapp] ${gerado.recusados.length} veículo(s) fora do catálogo:`,
          gerado.recusados.map(r => `${r.id} ${r.campo} (${r.motivo})`).join('; '),
        )
      }
      return gerado
    })
    const entrada = { em: agora, feed }
    cache = entrada
    // Falha não fica guardada por 15 minutos: a próxima chamada tenta de novo.
    feed.catch(() => {
      if (cache === entrada) cache = null
    })
    return entrada
  }
  return cache
}

/**
 * GET /api/feed/meta-whatsapp
 *
 * Os mesmos carros do `/api/feed/meta`, no schema de catálogo de produto do
 * Meta — o único que o WhatsApp aceita. Ver `src/lib/feed-meta-whatsapp.ts`.
 *
 * Como o outro, é só cadastrar a URL como fonte de dados agendada do catálogo
 * no Commerce Manager: sem upload e sem credencial.
 */
export async function GET() {
  const agora = Date.now()
  const { em, feed: promessa } = feedAtual(agora)
  const feed = await promessa
  // O que sobra dos 15 minutos: somado ao cache de quem buscou, o arquivo
  // nunca passa do teto.
  const restante = Math.max(0, Math.floor((em + CACHE_MS - agora) / 1000))

  const porCampo = new Map<string, number>()
  for (const r of feed.recusados) porCampo.set(r.campo, (porCampo.get(r.campo) ?? 0) + 1)

  return new NextResponse(feed.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Nome com .csv: a busca agendada do Meta usa a extensão para escolher o
      // interpretador.
      'Content-Disposition': 'inline; filename="attra-meta-whatsapp.csv"',
      'Cache-Control': `public, max-age=${restante}`,
      'X-Feed-Linhas': String(feed.linhas),
      'X-Feed-Recusados': String(feed.recusados.length),
      // Por que ficaram de fora, sem precisar abrir o log do servidor.
      'X-Feed-Recusados-Por-Campo': [...porCampo].map(([campo, n]) => `${campo}=${n}`).join(', '),
    },
  })
}
