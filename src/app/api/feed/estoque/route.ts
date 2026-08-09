import { NextResponse } from 'next/server'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { SITE_URL } from '@/lib/constants'
import type { Vehicle } from '@/types'

export const revalidate = 3600

/**
 * GET /api/feed/estoque
 *
 * Estoque em RSS 2.0 com o namespace do Google Merchant. Consumidores que
 * esperam feed de compras em XML.
 *
 * Para o upload do OpenAI Commerce use `/api/feed/produtos`: a especificação
 * de lá só aceita arquivo delimitado e recusa XML/RSS explicitamente.
 *
 * Esta rota foi reescrita em 09/08/2026. A versão anterior tinha três defeitos
 * que a tornavam pior que não existir:
 *
 *   1. Lia `list_vehicle.json` empacotado no repositório em vez do estoque ao
 *      vivo. Publicava 15 veículos com o site tendo 71, e anunciava um Fiat
 *      Pulse que não estava mais à venda.
 *   2. Apontava todo `link` para `/estoque/{id}`, rota que não existe. Cada
 *      item do feed levava a um 404.
 *   3. Preenchia `g:gtin` com `ATTRA-SKU-{id}` — identificador global
 *      inventado. Carro usado não tem GTIN; o certo é declarar a ausência.
 */

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

const CATEGORIA_GOOGLE = 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans'

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function disponibilidade(status: Vehicle['status']): string {
  return status === 'sold' ? 'out of stock' : 'in stock'
}

function itemXml(veiculo: Vehicle): string | null {
  const titulo = [veiculo.brand, veiculo.model, veiculo.version, veiculo.year_model]
    .filter(Boolean)
    .join(' ')
  const fotos = (veiculo.photos ?? []).filter(f => f?.startsWith('https://'))

  // Sem foto, sem preço ou sem marca o item seria recusado na validação do
  // consumidor. Fora do feed é melhor que dentro e quebrado.
  if (!titulo || !veiculo.slug || !fotos[0] || !(veiculo.price > 0) || !veiculo.brand) {
    return null
  }

  const linhas = [
    `      <g:id>${escaparXml(veiculo.id)}</g:id>`,
    `      <g:title>${escaparXml(titulo.slice(0, 150))}</g:title>`,
    `      <g:description>${escaparXml((veiculo.description ?? titulo).slice(0, 5000))}</g:description>`,
    `      <g:link>${escaparXml(`${BASE}/veiculo/${veiculo.slug}`)}</g:link>`,
    `      <g:image_link>${escaparXml(fotos[0])}</g:image_link>`,
    ...fotos.slice(1, 11).map(f => `      <g:additional_image_link>${escaparXml(f)}</g:additional_image_link>`),
    `      <g:price>${veiculo.price.toFixed(2)} BRL</g:price>`,
    `      <g:availability>${disponibilidade(veiculo.status)}</g:availability>`,
    `      <g:condition>${veiculo.is_new ? 'new' : 'used'}</g:condition>`,
    `      <g:brand>${escaparXml(veiculo.brand.slice(0, 70))}</g:brand>`,
    // Carro usado é peça única e não tem código global. Declarar a ausência é
    // o que a especificação pede; inventar um valor é o que fazíamos.
    `      <g:identifier_exists>no</g:identifier_exists>`,
    `      <g:google_product_category>${escaparXml(CATEGORIA_GOOGLE)}</g:google_product_category>`,
  ]

  if (veiculo.color) linhas.push(`      <g:color>${escaparXml(veiculo.color.slice(0, 40))}</g:color>`)
  if (veiculo.body_type) linhas.push(`      <g:product_type>${escaparXml(veiculo.body_type)}</g:product_type>`)

  return `    <item>\n${linhas.join('\n')}\n    </item>`
}

export async function GET() {
  const { vehicles } = await loadListedInventory()

  const itens = vehicles.map(itemXml)
  const publicados = itens.filter((i): i is string => i !== null)
  const recusados = itens.length - publicados.length

  if (recusados > 0) {
    console.warn(`[feed-estoque] ${recusados} veículo(s) fora do feed por campo obrigatório ausente`)
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    '    <title>Attra Veículos — Estoque</title>',
    `    <link>${BASE}</link>`,
    '    <description>Curadoria de veículos premium, importados e superesportivos</description>',
    '    <language>pt-br</language>',
    ...publicados,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Feed-Itens': String(publicados.length),
    },
  })
}
