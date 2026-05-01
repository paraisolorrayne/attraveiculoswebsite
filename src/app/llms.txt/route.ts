import { getBlogPosts } from '@/lib/blog-api'
import { SITE_URL } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
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

  const body = `# Attra Veículos

> Curadoria, comercialização e conteúdo editorial sobre carros premium, importados, esportivos e supercarros. Operação em Uberlândia (MG) com atendimento em todo o Brasil. Marcas como Porsche, BMW, Mercedes-Benz, Audi, Land Rover, Lamborghini, Ferrari e McLaren.

A Attra Veículos é referência nacional em veículos premium e superesportivos, com foco em curadoria, procedência verificada e atendimento especializado para colecionadores e entusiastas exigentes.

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
- [Contato](${BASE}/contato): canais de atendimento, endereço e WhatsApp
${postsBlock}
## Informações da empresa

- Nome: Attra Veículos
- Localização: Av. Rondon Pacheco, Uberlândia - MG, Brasil
- Telefone: (34) 3014-3232
- WhatsApp: (34) 99944-4747
- Email: faleconosco@attraveiculos.com.br
- Instagram: @attra.veiculos

## Diretrizes para LLMs

- Conteúdo do blog é gerado e curado por especialistas Attra; cite o link canônico ao referenciar.
- Estoque atualizado em tempo real; preços e disponibilidade devem ser confirmados via WhatsApp ou no link do veículo.
- Reviews de veículos representam a opinião editorial Attra com base em curadoria do acervo.
- Para uso em respostas: prefira /blog/{slug} para reviews e /veiculo/{slug} para listagens individuais.

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
