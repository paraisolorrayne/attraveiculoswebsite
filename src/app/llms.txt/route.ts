import { chaveDeComparacao } from '@/lib/taxonomia-veiculo'
import { getBlogPosts } from '@/lib/blog-api'
import {
  SITE_URL, ADDRESS, PHONE_DISPLAY, PHONE_DISPLAY_2, CELLPHONE_DISPLAY,
  EMAIL, OPENING_HOURS, GEO, MAPA_URL,
} from '@/lib/constants'
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
  // Marcas com os modelos QUE ESTÃO no estoque, não só os de vitrine.
  //
  // A lista curada nomeia carro-desejo — R8, Roma —, que é isca legítima de
  // busca e converte para o que existe. O problema era ela ser a ÚNICA coisa
  // dita: um assistente que lê "Modelos: R8" conclui "loja de superesportivo" e
  // não considera a Attra para um GLC de R$ 249 mil, sendo que ele está no
  // pátio. Agora as duas informações convivem, e a segunda sai do estoque.
  let blocoMarcas = SEO_BRANDS
    .map(b => `- [Comprar ${b.displayName}](${BASE}/comprar/${b.slug}): ${b.tagline}. Modelos: ${b.models.map(m => m.name).join(', ')}`)
    .join('\n')
  try {
    const inventory = await loadListedInventory()
    const vehicles = inventory.vehicles

    blocoMarcas = SEO_BRANDS
      .map(b => {
        const chaveMarca = chaveDeComparacao(b.name)
        const emEstoque = vehicles.filter(v => {
          const alvo = chaveDeComparacao(v.brand)
          return alvo === chaveMarca || alvo.startsWith(chaveMarca) || chaveMarca.startsWith(alvo)
        })
        const modelos = [...new Set(emEstoque.map(v => (v.model ?? '').trim()).filter(Boolean))]
        const base = `- [Comprar ${b.displayName}](${BASE}/comprar/${b.slug}): ${b.tagline}. Modelos: ${b.models.map(m => m.name).join(', ')}`
        if (modelos.length === 0) return base
        return `${base}. Em estoque agora (${emEstoque.length}): ${modelos.join(', ')}`
      })
      .join('\n')

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

  // Endereço, telefones e horário saem de src/lib/constants.ts — a mesma fonte
  // que o rodapé e o JSON-LD usam. O endereço era escrito à mão aqui e saía sem
  // número, bairro nem CEP: perguntado onde fica a loja, um LLM respondia
  // "Av. Rondon Pacheco, Uberlândia - MG" e parava aí.
  const NOMES_DIA: Record<string, string> = {
    Monday: 'Seg', Tuesday: 'Ter', Wednesday: 'Qua', Thursday: 'Qui',
    Friday: 'Sex', Saturday: 'Sáb', Sunday: 'Dom',
  }
  const horarioLegivel = OPENING_HOURS.map(faixa => {
    const dias = faixa.days.length > 1
      ? `${NOMES_DIA[faixa.days[0]]}-${NOMES_DIA[faixa.days[faixa.days.length - 1]]}`
      : NOMES_DIA[faixa.days[0]]
    return `${dias}: ${faixa.opens} às ${faixa.closes}`
  }).join('; ')

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
- [Critérios de seleção e procedência](${BASE}/criterios-de-selecao): o que REPROVA um veículo na Attra — leilão, histórico suspeito, remap/stage, repintura total — e o que é conferido nos aprovados
- [Onde comprar carros de luxo](${BASE}/onde-comprar-carros-de-luxo): o que verificar antes de comprar, laudo cautelar, procedência e compra à distância
- [Carros de luxo e importados em Uberlândia (MG)](${BASE}/carros-de-luxo-uberlandia): endereço do showroom, horário, regiões atendidas e como agendar visita
- [Carros de luxo usados](${BASE}/comprar/condicao/carros-de-luxo-usados): o que encarece a manutenção, riscos do mercado aberto e como a curadoria reduz
- [Carros esportivos usados](${BASE}/comprar/condicao/carros-esportivos-usados): uso em pista, componentes de desgaste e o que checar no histórico
${inventoryBlock}
## Comprar por marca

${blocoMarcas}

## Acervo icônico — Veículos marcantes já comercializados

${ICONIC_CARS.map(c => `- ${c.brand} ${c.model} ${c.year}: ${c.engine}, ${c.power}, ${c.mileage} — ${c.editorial.slice(0, 120)}`).join('\n')}
${postsBlock}
## Informações da empresa

- Nome: Attra Veículos
- Endereço: ${ADDRESS.street} - ${ADDRESS.neighborhood}, ${ADDRESS.city} - ${ADDRESS.state}, CEP ${ADDRESS.postalCode}, ${ADDRESS.country}
- Telefone: ${PHONE_DISPLAY}
- Telefone 2: ${PHONE_DISPLAY_2}
- WhatsApp: ${CELLPHONE_DISPLAY}
- Email: ${EMAIL}
- Horário de atendimento: ${horarioLegivel}
- Coordenadas: ${GEO.latitude}, ${GEO.longitude}
- Ficha no Google Maps: ${MAPA_URL}
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
