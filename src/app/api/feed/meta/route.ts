import { NextResponse } from 'next/server'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { gerarFeedMeta } from '@/lib/feed-meta'

export const revalidate = 3600

/**
 * GET /api/feed/meta
 *
 * Catálogo de veículos no schema do Meta (Automotive Inventory Ads), em CSV.
 *
 * O Meta busca esta URL sozinho, em horário agendado no Commerce Manager — não
 * há upload nem credencial. É só cadastrar o endereço deste endpoint como fonte
 * de dados do catálogo.
 *
 * Não confundir com `/api/feed/produtos`: aquele é o schema do OpenAI Commerce,
 * com nomes de campo incompatíveis. Apontar o Meta para ele importa zero
 * veículo.
 */
export async function GET() {
  const { vehicles } = await loadListedInventory()
  const feed = gerarFeedMeta(vehicles)

  if (feed.recusados.length > 0) {
    console.warn(
      `[feed-meta] ${feed.recusados.length} veículo(s) fora do catálogo:`,
      feed.recusados.map(r => `${r.vehicleId} ${r.campo} (${r.motivo})`).join('; '),
    )
  }

  return new NextResponse(feed.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Nome com .csv: a busca agendada do Meta usa a extensão para escolher o
      // interpretador, e sem ela um CSV pode ser lido como texto solto.
      'Content-Disposition': 'inline; filename="attra-meta-veiculos.csv"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Feed-Linhas': String(feed.linhas),
      'X-Feed-Recusados': String(feed.recusados.length),
    },
  })
}
