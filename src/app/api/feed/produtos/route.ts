import { NextResponse } from 'next/server'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { gerarFeed } from '@/lib/feed-produtos'

export const revalidate = 3600

/**
 * GET /api/feed/produtos
 *
 * Feed de produtos em TSV, no formato exigido pelo upload do OpenAI Commerce.
 * É este o arquivo que se cadastra lá — o `/api/llm/vehicles` (JSON-LD) e o
 * `/api/feed/estoque` (RSS) servem a outros consumidores e não são aceitos no
 * upload, que só recebe arquivo delimitado.
 *
 * Lê o estoque AO VIVO, pela mesma fonte do endpoint de LLM e do sitemap, para
 * as três não divergirem em contagem — foi divergência assim que fez o feed
 * anterior publicar 15 veículos enquanto o site tinha 71.
 *
 * Publica apenas o que está à venda. Anunciar carro vendido gera clique pago
 * que termina em decepção, que é pior que não anunciar.
 */
export async function GET() {
  const { vehicles } = await loadListedInventory()
  const feed = gerarFeed(vehicles)

  // Linha recusada é defeito de cadastro e precisa ser vista, não engolida:
  // sem isto o feed encolhe em silêncio e ninguém descobre até faltar carro.
  if (feed.recusados.length > 0) {
    console.warn(
      `[feed-produtos] ${feed.recusados.length} veículo(s) fora do feed:`,
      feed.recusados.map(r => `${r.itemId} ${r.campo} (${r.motivo})`).join('; '),
    )
  }
  if (feed.truncados.length > 0) {
    console.warn(
      `[feed-produtos] ${feed.truncados.length} valor(es) truncados:`,
      feed.truncados.map(t => `${t.itemId} ${t.campo} (${t.motivo})`).join('; '),
    )
  }

  return new NextResponse(feed.tsv, {
    headers: {
      // text/tab-separated-values com charset explícito: o arquivo tem acento
      // em praticamente toda linha, e sem isto o consumidor pode ler como
      // latin-1 e transformar "Sedã" em "SedÃ£".
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': 'inline; filename="attra-produtos.tsv"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      // Deixa a contagem visível sem baixar o arquivo — útil para conferir de
      // fora se o feed encolheu.
      'X-Feed-Linhas': String(feed.linhas),
      'X-Feed-Recusados': String(feed.recusados.length),
    },
  })
}
