/**
 * Gemini-powered long-form blog generators.
 *
 * Three flavours:
 *   - generateFromInstagram:  expands an IG caption into a full blog post
 *   - generateReview:         single-car deep review (> R$300k)
 *   - generateComparison:     head-to-head between two cars
 *
 * All return a structured payload ready to persist in `dual_blog_posts`.
 */

import type {
  Vehicle,
  DualBlogPost,
  CarReviewFields,
  BlogPostSEO,
  EducativoFields,
} from '@/types'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const API_TIMEOUT_MS = 60_000 // long-form generation needs more time

export type BlogAiStrategy = 'instagram' | 'review' | 'comparison'

export interface GeneratedBlog {
  strategy: BlogAiStrategy
  post: Omit<DualBlogPost, 'id'>
  debug?: { rawResponse?: string }
}

interface GeminiJsonResponse {
  title: string
  slug_hint?: string
  excerpt: string
  content_html: string
  reading_time?: string
  meta_title?: string
  meta_description?: string
  keywords?: string[]
  // For reviews
  specs?: Partial<CarReviewFields['specs']>
  faq?: CarReviewFields['faq']
  highlights?: CarReviewFields['highlights']
  optionals?: string[]
  evaluation?: CarReviewFields['evaluation']
}

// ---------------------------------------------------------------------------
// Gemini helper
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<GeminiJsonResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          // gemini-2.5-flash supports up to 65536 output tokens; long-form blog
          // posts with embedded JSON easily exceed 8k.
          maxOutputTokens: 32768,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Gemini API ${res.status}: ${errText.substring(0, 300)}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned empty response')

    try {
      return JSON.parse(text) as GeminiJsonResponse
    } catch (err) {
      throw new Error(
        `Gemini returned non-JSON content: ${text.substring(0, 300)}... (${String(err)})`
      )
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ---------------------------------------------------------------------------
// Shared prompt ingredients
// ---------------------------------------------------------------------------

const BRAND_VOICE = `
Você é redator(a) sênior da Attra Veículos (https://attraveiculos.com.br) —
concessionária premium em Uberlândia/MG especializada em superesportivos e
carros de alto padrão.

Tom: sofisticado, técnico, entusiasta, em português do Brasil. Evite clichês
("carro dos sonhos", "máquina perfeita"). Seja específico em números, motor,
tração, acabamento. Nunca invente dados que não estão no briefing.

SEO: use heading hierarchy (h2, h3). Parágrafos curtos. Cite a Attra Veículos
naturalmente. Inclua uma CTA para o estoque no final do texto.

LINKS — REGRA EDITORIAL: nunca escreva URLs cruas no texto, nem rótulos
genéricos como "URL:", "URL Detalhada:", "Link:", "Acesse:", "Saiba mais:",
"Mais informações:", "Confira em:". Sempre integre o link como âncora HTML
em prosa natural — exemplo: "veja o exemplar disponível na <a href='/veiculo/...'>página
do veículo</a>" em vez de "URL Detalhada: https://...". Os links existem
para o leitor, não para o robô — tem que ler bem em voz alta.

LLMO (otimização para LLMs como ChatGPT, Perplexity, Gemini):
- O primeiro parágrafo (lede) deve responder DIRETAMENTE a pergunta principal
  do título nos primeiros 200 caracteres, em prosa autocontida (sem "neste
  artigo vamos ver") — LLMs extraem esse trecho como resposta.
- Use tabelas HTML semânticas (<table>) para specs e comparativos, não imagens
  embutidas — LLMs leem tabelas, não pixels.
- Cite fontes externas com nome explícito quando relevante (montadora, INMETRO,
  imprensa especializada). Aumenta credibilidade para LLMs e Google.
- Estruture FAQs com pergunta literal e resposta autossuficiente — cada
  resposta precisa fazer sentido lida isolada da pergunta.

REGRA CRÍTICA — PREÇOS PROIBIDOS: nunca, em hipótese alguma, mencione valores
monetários, preços, faixas de preço, cifras em reais, "R$", "milhões", "mil
reais", "a partir de", "ticket", "investimento de X", ou qualquer equivalente.
Campanhas comerciais alteram preços dinamicamente e a Attra não pode correr o
risco de um cliente ver um valor desatualizado no blog. Quando precisar falar
do aspecto comercial, use sempre "sob consulta", "condições exclusivas na
Attra", "fale com nosso time" ou formulações equivalentes SEM cifras.
`.trim()

const JSON_SCHEMA_REVIEW = `
Retorne APENAS JSON válido, sem markdown, sem \`\`\`. Campos obrigatórios:
{
  "title": "string - SEO title, até 70 chars",
  "slug_hint": "string - slug em kebab-case baseado no título",
  "excerpt": "string - 2 frases, até 240 chars",
  "content_html": "string - HTML completo do artigo (h2, h3, p, ul, li, strong). Mínimo 1500 palavras. Use <img src='IMAGEM_N'> como placeholder onde N é o índice 0,1,2... das imagens fornecidas — serão substituídos depois.",
  "reading_time": "string - ex: '8 min'",
  "meta_title": "string - até 60 chars",
  "meta_description": "string - até 160 chars",
  "keywords": ["array de 5-8 strings"],
  "specs": {
    "engine": "string", "power": "string", "torque": "string",
    "acceleration": "string", "top_speed": "string", "transmission": "string",
    "drivetrain": "string opcional", "weight": "string opcional"
  },
  "faq": [{"question": "string", "answer": "string"}] (4-6 itens),
  "highlights": [{"text": "string", "category": "performance|design|technology|exclusivity|comfort"}] (4-6 itens),
  "optionals": ["strings"] (5-10 itens quando disponíveis),
  "evaluation": {
    "summary": "2-3 frases",
    "highlights": ["3-5 bullets"],
    "target_profile": "string",
    "investment_potential": "alto|medio|estavel"
  }
}
`.trim()

const JSON_SCHEMA_EDUCATIVO = `
Retorne APENAS JSON válido, sem markdown, sem \`\`\`. Campos obrigatórios:
{
  "title": "string - SEO title, até 70 chars",
  "slug_hint": "string - slug em kebab-case",
  "excerpt": "string - 2 frases, até 240 chars",
  "content_html": "string - HTML completo (h2, h3, p, ul, li). Mínimo 1200 palavras. Use <img src='IMAGEM_N'> para imagens.",
  "reading_time": "string - ex: '7 min'",
  "meta_title": "string - até 60 chars",
  "meta_description": "string - até 160 chars",
  "keywords": ["array de 5-8 strings"]
}
`.trim()

// ---------------------------------------------------------------------------
// Utility: replace IMAGEM_N placeholders with real URLs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Utility: strip any monetary references the model might have slipped in.
// Precos mudam dinamicamente em campanhas — blog nunca pode cravar valor.
// ---------------------------------------------------------------------------

const PRICE_PATTERNS: RegExp[] = [
  // R$ 1.234.567,89 / R$1,2 milhões / R$ 500 mil
  /R\$\s*\d[\d.,]*\s*(?:mil(?:h[õã]o|h[õã]es|h[aã]o)?)?/gi,
  // "1,2 milhão de reais" / "500 mil reais" / "dois milhões de reais"
  /\b[\d.,]+\s*(?:mil|milh[õã]o|milh[õã]es)\s*(?:de\s+)?reais?\b/gi,
  /\b(?:um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s+milh[õã]es?\s*(?:de\s+)?reais?\b/gi,
  // "por R$..." já coberto acima, mas "a partir de R$" também
  /a\s+partir\s+de\s+R\$\s*[\d.,]+/gi,
]

export function sanitizePrices(html: string): string {
  let out = html
  for (const re of PRICE_PATTERNS) {
    out = out.replace(re, 'valor sob consulta')
  }
  // Clean-up em construções como "por valor sob consulta" que ficaram feias
  out = out.replace(/\bpor\s+valor\s+sob\s+consulta\b/gi, 'sob consulta')
  out = out.replace(/\bde\s+valor\s+sob\s+consulta\b/gi, 'sob consulta')
  return out
}

/**
 * Remove rótulos genéricos antes de URLs cruas e converte em âncora HTML
 * com texto natural. Cobre casos como:
 *   "URL Detalhada: https://..."
 *   "URL: https://..."
 *   "Link: https://..."
 *   "Acesse: https://..."
 *   "Saiba mais: https://..."
 *   "Mais informações: https://..."
 *   "Confira em: https://..."
 */
const URL_LABEL_PATTERNS: Array<{ re: RegExp; anchor: string }> = [
  { re: /(?:URL|Link)\s+Detalhada?\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'ver detalhes do veículo' },
  { re: /\bURL\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'ver no estoque Attra' },
  { re: /\bLink\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'ver no estoque Attra' },
  { re: /\bAcesse\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'ver no estoque Attra' },
  { re: /\bSaiba\s+mais\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'saiba mais' },
  { re: /\bMais\s+informa[çc][õo]es\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'mais informações' },
  { re: /\bConfira\s+em\s*:\s*(<a[^>]*>[^<]+<\/a>|https?:\/\/\S+)/gi, anchor: 'confira aqui' },
]

export function sanitizeUrlLabels(html: string): string {
  let out = html
  for (const { re, anchor } of URL_LABEL_PATTERNS) {
    out = out.replace(re, (_match, capture) => {
      // If the captured value is already an <a>, just keep it (drop the label)
      if (capture.startsWith('<a')) return capture
      // Otherwise wrap the bare URL in a natural anchor
      return `<a href="${capture}">${anchor}</a>`
    })
  }
  // Caso o modelo escreva "veja a URL Detalhada do veículo" sem URL: remover só o rótulo feio
  out = out.replace(/\b(?:URL|Link)\s+Detalhada?\b/gi, 'ficha completa')
  return out
}

function injectImages(html: string, images: string[]): string {
  if (images.length === 0) return html.replace(/<img[^>]*src=['"]IMAGEM_\d+['"][^>]*>/g, '')
  return html.replace(/<img([^>]*)src=['"]IMAGEM_(\d+)['"]([^>]*)>/g, (_match, pre, idx, post) => {
    const i = Math.min(parseInt(idx, 10), images.length - 1)
    const alt = (pre + post).includes('alt=') ? '' : ' alt="Attra Veículos"'
    return `<img${pre}src="${images[i]}"${post}${alt}>`
  })
}

function buildSlug(hint: string, fallback: string): string {
  const base = (hint || fallback)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80)
  const suffix = Date.now().toString(36).slice(-4)
  return `${base}-${suffix}`
}

function toSeo(r: GeminiJsonResponse): BlogPostSEO {
  return {
    meta_title: r.meta_title || r.title,
    meta_description: r.meta_description || r.excerpt,
    keywords: r.keywords ?? [],
  }
}

// ---------------------------------------------------------------------------
// Strategy 1: Review (single car > R$300k)
// ---------------------------------------------------------------------------

export async function generateReview(vehicle: Vehicle): Promise<GeneratedBlog> {
  const images = vehicle.photos ?? []

  const prompt = `
${BRAND_VOICE}

MISSÃO: Produza um review aprofundado de veículo no mesmo padrão editorial
destes exemplos:
- https://attraveiculos.com.br/blog/ferrari-sf90-spider-quando-1-000cv-redefinem-o-conceito-de-performance

Estrutura esperada (como os exemplos):
1. Parágrafo de abertura (lede) vendendo o carro
2. "Design Exterior" (h2) — proporções, aerodinâmica, detalhes visuais
3. "Motor e Performance" (h2) — números, sensações, comportamento dinâmico
4. "Interior e Tecnologia" (h2) — materiais, cockpit, infoentretenimento
5. "Por que esse ${vehicle.brand} ${vehicle.model} é especial" (h2)
6. "Disponibilidade na Attra Veículos" (h2) — CTA para consulta
7. FAQ estruturada (retorne como campo JSON separado)

DADOS DO VEÍCULO:
- Marca: ${vehicle.brand}
- Modelo: ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''}
- Ano: ${vehicle.year_manufacture}/${vehicle.year_model}
- Cor: ${vehicle.color}
- KM: ${vehicle.mileage === 0 ? '0 km (zero)' : vehicle.mileage.toLocaleString('pt-BR') + ' km'}
- Combustível: ${vehicle.fuel_type}
- Câmbio: ${vehicle.transmission}
- Potência: ${vehicle.horsepower ? vehicle.horsepower + ' cv' : 'não informada'}
- Categoria: ${vehicle.category}
- Preço: (NÃO MENCIONAR NO TEXTO — sempre use "sob consulta" quando falar do aspecto comercial)
- Opcionais já catalogados: ${(vehicle.options ?? []).slice(0, 20).join(', ') || 'consulte o anúncio'}
- Página do veículo (use como destino de âncora natural, NÃO escreva o link cru): https://attraveiculos.com.br/veiculo/${vehicle.slug}

Imagens disponíveis (${images.length}): use placeholders <img src="IMAGEM_0">,
<img src="IMAGEM_1"> etc dentro do content_html. Distribua 3-5 imagens ao
longo do texto.

${JSON_SCHEMA_REVIEW}
`.trim()

  const raw = await callGemini(prompt)
  const content = sanitizeUrlLabels(sanitizePrices(injectImages(raw.content_html, images)))

  const carReview: CarReviewFields = {
    vehicle_id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year_model,
    version: vehicle.version ?? undefined,
    status: vehicle.is_new ? '0km • Exclusivo Attra' : 'Seminovo • Exclusivo Attra',
    color: vehicle.color,
    specs: {
      engine: raw.specs?.engine ?? vehicle.engine ?? 'Consultar',
      power: raw.specs?.power ?? (vehicle.horsepower ? `${vehicle.horsepower} cv` : 'Consultar'),
      torque: raw.specs?.torque ?? vehicle.torque ?? 'Consultar',
      acceleration: raw.specs?.acceleration ?? vehicle.acceleration ?? 'Consultar',
      top_speed: raw.specs?.top_speed ?? vehicle.top_speed ?? 'Consultar',
      transmission: raw.specs?.transmission ?? vehicle.transmission ?? 'Consultar',
      drivetrain: raw.specs?.drivetrain,
      weight: raw.specs?.weight,
    },
    gallery_images: images,
    availability: {
      in_stock: vehicle.status === 'available',
      // price propositalmente omitido — campanhas alteram valores dinamicamente
      stock_url: `/veiculo/${vehicle.slug}`,
    },
    faq: raw.faq,
    highlights: raw.highlights,
    optionals: raw.optionals ?? vehicle.options ?? undefined,
    evaluation: raw.evaluation,
  }

  return {
    strategy: 'review',
    post: {
      post_type: 'car_review',
      title: raw.title,
      slug: buildSlug(raw.slug_hint ?? '', raw.title),
      excerpt: raw.excerpt,
      content,
      featured_image: images[0] ?? '',
      featured_image_alt: `${vehicle.brand} ${vehicle.model} ${vehicle.year_model}`,
      author: { name: 'Attra Veículos', bio: 'Curadoria em superesportivos e alto padrão' },
      published_date: new Date().toISOString(),
      reading_time: raw.reading_time ?? '8 min',
      is_published: true,
      car_review: carReview,
      seo: toSeo(raw),
    },
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: Comparison
// ---------------------------------------------------------------------------

function vehicleBriefing(v: Vehicle): string {
  return [
    `- Marca: ${v.brand}`,
    `- Modelo: ${v.model}${v.version ? ' ' + v.version : ''}`,
    `- Ano: ${v.year_manufacture}/${v.year_model}`,
    `- Potência: ${v.horsepower ? v.horsepower + ' cv' : 'não informada'}`,
    `- Câmbio: ${v.transmission}`,
    `- Página do veículo (destino de âncora, NÃO escreva o link cru): https://attraveiculos.com.br/veiculo/${v.slug}`,
  ].join('\n')
}

export async function generateComparison(
  carA: Vehicle,
  carB: Vehicle
): Promise<GeneratedBlog> {
  // Interleave images from both cars
  const imagesA = carA.photos ?? []
  const imagesB = carB.photos ?? []
  const images: string[] = []
  const maxLen = Math.max(imagesA.length, imagesB.length)
  for (let i = 0; i < maxLen; i++) {
    if (imagesA[i]) images.push(imagesA[i])
    if (imagesB[i]) images.push(imagesB[i])
  }

  const prompt = `
${BRAND_VOICE}

MISSÃO: Produza um comparativo editorial entre dois superesportivos no mesmo
padrão deste exemplo:
- https://attraveiculos.com.br/blog/audi-r8-v10-vs-ferrari-812-gts-o-duelo-dos-titas

Estrutura esperada:
1. Lede apresentando o duelo
2. "Ficha técnica: ${carA.brand} ${carA.model}" (h2)
3. "Ficha técnica: ${carB.brand} ${carB.model}" (h2)
4. "Design e presença" (h2) — confrontando os dois
5. "Motor, performance e dinâmica" (h2)
6. "Interior e tecnologia" (h2)
7. "Qual escolher?" (h2) — conclusão honesta com perfis de cliente
8. CTA para o estoque

CARRO A:
${vehicleBriefing(carA)}

CARRO B:
${vehicleBriefing(carB)}

Imagens disponíveis (${images.length}): use placeholders <img src="IMAGEM_0">,
<img src="IMAGEM_1"> etc. Distribua 4-6 imagens intercalando os dois carros.

Este é um comparativo (tipo "educativo/curadoria"), não um review de carro
único. Não invente specs ausentes — trabalhe com o que está no briefing.

${JSON_SCHEMA_EDUCATIVO}
`.trim()

  const raw = await callGemini(prompt)
  const content = sanitizeUrlLabels(sanitizePrices(injectImages(raw.content_html, images)))

  const educativo: EducativoFields = {
    category: 'Curadoria',
    topic: `Comparativo: ${carA.brand} ${carA.model} vs ${carB.brand} ${carB.model}`,
    seo_keyword: `${carA.brand} ${carA.model} vs ${carB.brand} ${carB.model}`,
  }

  return {
    strategy: 'comparison',
    post: {
      post_type: 'educativo',
      title: raw.title,
      slug: buildSlug(raw.slug_hint ?? '', raw.title),
      excerpt: raw.excerpt,
      content,
      featured_image: images[0] ?? '',
      featured_image_alt: `${carA.brand} ${carA.model} vs ${carB.brand} ${carB.model}`,
      author: { name: 'Attra Veículos', bio: 'Curadoria em superesportivos e alto padrão' },
      published_date: new Date().toISOString(),
      reading_time: raw.reading_time ?? '7 min',
      is_published: true,
      educativo,
      seo: toSeo(raw),
    },
  }
}

// ---------------------------------------------------------------------------
// Strategy 3: From Instagram caption + media
// ---------------------------------------------------------------------------

export interface InstagramInput {
  caption: string
  permalink: string
  images: string[]
  /** Vehicle from inventory when we could match one (video posts). */
  vehicle?: Vehicle | null
}

export async function generateFromInstagram(
  input: InstagramInput
): Promise<GeneratedBlog> {
  const hasVehicle = Boolean(input.vehicle)
  const images = input.images.length > 0
    ? input.images
    : input.vehicle?.photos ?? []

  const vehicleBlock = input.vehicle
    ? `DADOS DO VEÍCULO NO ESTOQUE:\n${vehicleBriefing(input.vehicle)}`
    : 'Sem veículo vinculado — trabalhe apenas com o que estiver na caption.'

  const prompt = `
${BRAND_VOICE}

MISSÃO: Expandir um post do Instagram da Attra Veículos em um artigo de blog
completo, mantendo a ideia original mas no formato longo e com SEO.

CAPTION ORIGINAL DO INSTAGRAM:
"""
${input.caption}
"""

Link original: ${input.permalink}

${vehicleBlock}

Estrutura esperada:
1. Lede que resgata a ideia principal da caption
2. 3-4 seções (h2) expandindo o conteúdo com profundidade editorial
3. ${hasVehicle ? 'Seção "Sobre o veículo" com specs do briefing' : 'Seção sobre o mercado/contexto'}
4. CTA para o estoque da Attra no final

Imagens disponíveis (${images.length}): use placeholders <img src="IMAGEM_0">,
<img src="IMAGEM_1"> etc. Distribua 2-4 imagens.

${hasVehicle ? JSON_SCHEMA_REVIEW : JSON_SCHEMA_EDUCATIVO}
`.trim()

  const raw = await callGemini(prompt)
  const content = sanitizeUrlLabels(sanitizePrices(injectImages(raw.content_html, images)))

  if (hasVehicle && input.vehicle) {
    const v = input.vehicle
    const carReview: CarReviewFields = {
      vehicle_id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year_model,
      version: v.version ?? undefined,
      status: v.is_new ? '0km • Exclusivo Attra' : 'Seminovo • Exclusivo Attra',
      color: v.color,
      specs: {
        engine: raw.specs?.engine ?? 'Consultar',
        power: raw.specs?.power ?? (v.horsepower ? `${v.horsepower} cv` : 'Consultar'),
        torque: raw.specs?.torque ?? 'Consultar',
        acceleration: raw.specs?.acceleration ?? 'Consultar',
        top_speed: raw.specs?.top_speed ?? 'Consultar',
        transmission: raw.specs?.transmission ?? v.transmission ?? 'Consultar',
        drivetrain: raw.specs?.drivetrain,
      },
      gallery_images: images,
      availability: {
        in_stock: v.status === 'available',
        // price propositalmente omitido — campanhas alteram valores dinamicamente
        stock_url: `/veiculo/${v.slug}`,
      },
      faq: raw.faq,
      highlights: raw.highlights,
      optionals: raw.optionals ?? v.options ?? undefined,
      evaluation: raw.evaluation,
    }

    return {
      strategy: 'instagram',
      post: {
        post_type: 'car_review',
        title: raw.title,
        slug: buildSlug(raw.slug_hint ?? '', raw.title),
        excerpt: raw.excerpt,
        content,
        featured_image: images[0] ?? '',
        featured_image_alt: `${v.brand} ${v.model} ${v.year_model}`,
        author: { name: 'Attra Veículos', bio: 'Curadoria em superesportivos e alto padrão' },
        published_date: new Date().toISOString(),
        reading_time: raw.reading_time ?? '6 min',
        is_published: true,
        car_review: carReview,
        seo: toSeo(raw),
      },
    }
  }

  return {
    strategy: 'instagram',
    post: {
      post_type: 'educativo',
      title: raw.title,
      slug: buildSlug(raw.slug_hint ?? '', raw.title),
      excerpt: raw.excerpt,
      content,
      featured_image: images[0] ?? '',
      featured_image_alt: raw.title,
      author: { name: 'Attra Veículos', bio: 'Curadoria em superesportivos e alto padrão' },
      published_date: new Date().toISOString(),
      reading_time: raw.reading_time ?? '5 min',
      is_published: true,
      educativo: {
        category: 'Lifestyle',
        topic: raw.title,
        seo_keyword: (raw.keywords ?? [])[0] ?? raw.title,
      },
      seo: toSeo(raw),
    },
  }
}
