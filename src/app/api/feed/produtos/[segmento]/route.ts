import { NextResponse } from 'next/server'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { gerarFeed } from '@/lib/feed-produtos'
import { SEGMENTOS, segmentoPorSlug } from '@/lib/feed-segmentos'

export const revalidate = 3600

/** Pré-gera os recortes conhecidos; slug fora da lista continua caindo em 404. */
export function generateStaticParams() {
  return SEGMENTOS.map(s => ({ segmento: s.slug }))
}

/**
 * GET /api/feed/produtos/<segmento>
 *
 * Recorte do feed de produtos, no mesmo formato TSV do feed completo — cada um
 * pensado para ser cadastrado como um feed próprio na plataforma de anúncio.
 *
 * Mesmas colunas e mesmas regras do feed completo, de propósito: o recorte muda
 * QUAIS veículos entram, nunca COMO eles são descritos. Um `item_id` significa
 * o mesmo veículo em todos os feeds e na conversão.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segmento: string }> },
) {
  const { segmento: slug } = await params
  const segmento = segmentoPorSlug(slug)

  if (!segmento) {
    return NextResponse.json(
      {
        erro: `Segmento desconhecido: ${slug}`,
        // Devolve os válidos em vez de só negar: quem errou o slug ao cadastrar
        // na plataforma descobre o certo sem precisar do código.
        disponiveis: SEGMENTOS.map(s => ({
          slug: s.slug,
          titulo: s.titulo,
          url: `/api/feed/produtos/${s.slug}`,
        })),
      },
      { status: 404 },
    )
  }

  const { vehicles } = await loadListedInventory()
  const selecionados = vehicles.filter(segmento.seleciona)
  const feed = gerarFeed(selecionados)

  if (feed.recusados.length > 0) {
    console.warn(
      `[feed-produtos:${segmento.slug}] ${feed.recusados.length} veículo(s) fora do feed:`,
      feed.recusados.map(r => `${r.itemId} ${r.campo} (${r.motivo})`).join('; '),
    )
  }

  // Recorte vazio é o estado mais perigoso deste endpoint: a plataforma recebe
  // um arquivo válido com zero produto e a campanha para de entregar sem erro
  // aparente. Fica no log, e o cabeçalho permite conferir de fora.
  if (feed.linhas === 0) {
    console.warn(
      `[feed-produtos:${segmento.slug}] recorte VAZIO — nenhum veículo do estoque atende ao critério`,
    )
  }

  return new NextResponse(feed.tsv, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Content-Disposition': `inline; filename="attra-${segmento.slug}.tsv"`,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Feed-Segmento': segmento.slug,
      'X-Feed-Linhas': String(feed.linhas),
      'X-Feed-Recusados': String(feed.recusados.length),
    },
  })
}
