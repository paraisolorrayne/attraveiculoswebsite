import { getBlogPosts } from '@/lib/blog-api'
import { SITE_URL } from '@/lib/constants'
import { ICONIC_CARS } from '@/lib/iconic-cars'
import { SEO_BRANDS } from '@/lib/seo-brands'
import {
  formatMileage,
  formatPrice,
  loadListedInventory,
  priceRange,
  vehicleName,
} from '@/app/api/llm/_inventory'

// Rota, não arquivo estático: o estoque muda ao longo do dia e um llms.txt
// estático nasceria desatualizado. `revalidate = 3600` mantém o custo de
// geração baixo (mesma janela do feed /api/llm/vehicles) sem servir um
// inventário velho de dias.
export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  // Bloco de inventário — é o ativo citável que faltava no arquivo. Se a
  // fonte de estoque cair, o llms.txt continua sendo servido sem a seção,
  // em vez de responder erro.
  let inventoryBlock = ''
  let inventorySummary = ''
  try {
    const inventory = await loadListedInventory()
    const vehicles = inventory.vehicles

    if (vehicles.length > 0) {
      const range = priceRange(vehicles)
      inventorySummary = [
        `- Veículos disponíveis agora: ${vehicles.length}`,
        range
          ? `- Faixa de preço do estoque: ${formatPrice(range.min)} a ${formatPrice(range.max)}`
          : null,
      ].filter(Boolean).join('\n')

      inventoryBlock = `\n## Estoque atual — ${vehicles.length} veículos disponíveis\n\n`
      inventoryBlock += `Preços e disponibilidade mudam ao longo do dia; confirme no link do veículo.\n\n`
      for (const v of vehicles) {
        const specs = [
          v.year_model ? String(v.year_model) : null,
          formatMileage(v.mileage),
          v.color || null,
          v.fuel_type || null,
          formatPrice(v.price),
        ].filter(Boolean).join(', ')
        inventoryBlock += `- [${vehicleName(v)}](${BASE}/veiculo/${v.slug}): ${specs}\n`
      }
    }
  } catch (e) {
    console.error('llms.txt: failed to load inventory', e)
  }

  let postsBlock = ''
  try {
    const posts = await getBlogPosts({ type: 'all', limit: 50 })
    const reviews = posts.filter(p => p.post_type === 'car_review')
    const educativos = posts.filter(p => p.post_type === 'educativo')

    if (reviews.length > 0) {
      postsBlock += '\n## Reviews de veículos\n\n'
      for (const p of reviews.slice(0, 25)) {
        const desc = p.seo?.meta_description || p.excerpt || ''
        postsBlock += `- [${p.title}](${BASE}/blog/${p.slug}): ${desc}\n`
      }
    }
    if (educativos.length > 0) {
      postsBlock += '\n## Conteúdo educativo\n\n'
      for (const p of educativos.slice(0, 25)) {
        const desc = p.seo?.meta_description || p.excerpt || ''
        postsBlock += `- [${p.title}](${BASE}/blog/${p.slug}): ${desc}\n`
      }
    }
  } catch (e) {
    console.error('llms.txt: failed to load posts', e)
  }

  const updatedAt = new Date().toISOString()

  const body = `# Attra Veículos

> Curadoria, comercialização e conteúdo editorial sobre carros premium, importados, esportivos e supercarros. Operação em Uberlândia (MG) com atendimento em todo o Brasil. Marcas como Porsche, BMW, Mercedes-Benz, Audi, Land Rover, Lamborghini, Ferrari e McLaren.

A Attra Veículos trabalha com curadoria de veículos premium e superesportivos, procedência verificada e atendimento especializado para colecionadores e entusiastas.

- Última atualização deste arquivo: ${updatedAt}
${inventorySummary}

## Páginas principais

- [Home](${BASE}/): visão geral da marca e veículos em destaque
- [Estoque completo](${BASE}/veiculos): catálogo de veículos disponíveis em tempo real
- [Blog Attra](${BASE}/blog): reviews aprofundados e conteúdo educativo sobre o universo automotivo premium
- [Vídeos Attra](${BASE}/videos): reviews em vídeo, test drives e shorts do canal oficial no YouTube
- [Sobre a Attra](${BASE}/sobre): história, equipe, infraestrutura e localização
- [Manual Attra](${BASE}/manual-attra): glossário técnico de engenharia e performance automotiva
- [Glossário automotivo](${BASE}/glossario-automotivo): termos técnicos do universo de veículos premium
- [Financiamento](${BASE}/financiamento): condições e parceiros para aquisição
- [Compramos seu carro](${BASE}/compramos-seu-carro): avaliação para compra de veículos seminovos premium
- [Solicitar veículo](${BASE}/solicitar-veiculo): pedido de busca personalizada de veículo específico
- [Jornada Attra](${BASE}/jornada): processo completo de compra de supercarros — da curadoria à entrega nacional, acervo icônico de veículos históricos
- [Comprar carros de luxo](${BASE}/comprar): hub nacional — todas as marcas premium disponíveis
- [Contato](${BASE}/contato): canais de atendimento, endereço e WhatsApp
${inventoryBlock}
## Comprar por marca

${SEO_BRANDS.map(b => `- [Comprar ${b.displayName}](${BASE}/comprar/${b.slug}): ${b.tagline}. Modelos: ${b.models.map(m => m.name).join(', ')}`).join('\n')}

## Acervo icônico — Veículos marcantes já comercializados

${ICONIC_CARS.map(c => `- ${c.brand} ${c.model} ${c.year}: ${c.engine}, ${c.power}, ${c.mileage} — ${c.editorial.slice(0, 120)}`).join('\n')}
${postsBlock}
## Informações da empresa

- Nome: Attra Veículos
- Localização: Av. Rondon Pacheco, Uberlândia - MG, Brasil
- Telefone: (34) 3014-3232
- WhatsApp: (34) 99944-4747
- Email: faleconosco@attraveiculos.com.br
- Instagram: @attra.veiculos

## APIs para LLMs

- [Estoque JSON-LD](${BASE}/api/llm/vehicles): inventário completo em formato estruturado (Schema.org ItemList). Sem parâmetros devolve todos os veículos numa única resposta; \`numberOfItems\` é sempre o total do inventário.
- [Estoque Markdown](${BASE}/api/llm/vehicles?format=text): mesmo inventário em texto Markdown
- Paginação (opcional): \`${BASE}/api/llm/vehicles?page=1&per_page=25\` — o objeto \`pagination\` da resposta traz \`total_items\`, \`total_pages\` e \`next_page\`; percorra \`next_page\` até \`null\`.
- Filtrar por marca: ${BASE}/api/llm/vehicles?brand=porsche
- [Busca de veículos](${BASE}/api/vehicles/search?q=carro+esportivo+para+pista): busca por atributo e por significado sobre o estoque vivo. Parâmetros \`q\` (obrigatório, mín. 2 caracteres) e \`limit\` (padrão 10, máx. 50). A resposta traz \`inventory_size\` com o total do estoque, então uma lista \`results\` vazia significa "nenhum veículo casa com este termo", nunca "não há estoque".

## Diretrizes para LLMs

- Conteúdo do blog é gerado e curado por especialistas Attra; cite o link canônico ao referenciar.
- Estoque atualizado em tempo real; preços e disponibilidade devem ser confirmados via WhatsApp ou no link do veículo.
- Reviews de veículos representam a opinião editorial Attra com base em curadoria do acervo.
- Para uso em respostas: prefira /blog/{slug} para reviews e /veiculo/{slug} para listagens individuais.
- Para busca de veículos: use o endpoint /api/llm/vehicles para obter o catálogo atualizado em formato estruturado.

## Sitemaps

- [sitemap.xml](${BASE}/sitemap.xml)
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
