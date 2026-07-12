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
import { GEMINI_TEXT_MODEL } from '@/lib/gemini-config'
import { composeComparisonFeaturedImage } from './comparison-image'

const GEMINI_MODEL = GEMINI_TEXT_MODEL
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

const MAX_GEMINI_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract the first balanced top-level JSON object, respecting string literals
 * and escapes. Even with responseMimeType=json, Gemini occasionally appends
 * stray text after the closing brace, which makes a raw JSON.parse throw
 * "Unexpected non-whitespace character after JSON". Slicing the balanced object
 * sidesteps that without losing the (valid) object itself.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null // unbalanced → truncated, let caller retry
}

function parseGeminiJson(text: string): GeminiJsonResponse {
  try {
    return JSON.parse(text) as GeminiJsonResponse
  } catch {
    const obj = extractFirstJsonObject(text)
    if (!obj) {
      throw new Error(`Gemini returned non-JSON content: ${text.substring(0, 300)}...`)
    }
    return JSON.parse(obj) as GeminiJsonResponse
  }
}

function countWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

async function fetchGeminiOnce(
  prompt: string,
  apiKey: string
): Promise<GeminiJsonResponse> {
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

    return parseGeminiJson(text)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Calls Gemini with retries. Two failure modes are handled: (1) transient
 * API/parse errors → retry; (2) parseable-but-short generations → keep the
 * longest attempt and stop early once one clears `minWords`. Guarantees output
 * as long as at least one attempt parsed.
 */
async function callGemini(prompt: string, minWords = 1200): Promise<GeminiJsonResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  let best: GeminiJsonResponse | null = null
  let bestWords = -1
  let lastErr: unknown

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      const result = await fetchGeminiOnce(prompt, apiKey)
      const words = countWords(result.content_html ?? '')
      if (words > bestWords) {
        best = result
        bestWords = words
      }
      if (words >= minWords) return result
      console.warn(
        `[gemini-blog] attempt ${attempt}/${MAX_GEMINI_ATTEMPTS} too short (${words}w < ${minWords}w), retrying`
      )
    } catch (err) {
      lastErr = err
      console.warn(
        `[gemini-blog] attempt ${attempt}/${MAX_GEMINI_ATTEMPTS} failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    if (attempt < MAX_GEMINI_ATTEMPTS) await sleep(RETRY_BASE_DELAY_MS * attempt)
  }

  if (best) return best // never hit minWords, but publish the best we managed
  throw lastErr instanceof Error
    ? lastErr
    : new Error('Gemini generation failed after retries')
}

// ---------------------------------------------------------------------------
// Shared prompt ingredients
// ---------------------------------------------------------------------------

const BRAND_VOICE = `
Você é redator(a) sênior da Attra Veículos (https://attraveiculos.com.br) —
concessionária premium em Uberlândia/MG especializada em superesportivos e
carros de alto padrão. Sua escrita serve clientes colecionadores e entusiastas
de altíssimo poder aquisitivo.

REFERENCIAL EDITORIAL (estude o padrão antes de escrever):
- https://attraveiculos.com.br/blog/ferrari-812-gts-a-obra-prima-italiana-que-a-attra-veiculos-trouxe-para-o-brasil
- https://attraveiculos.com.br/blog/ferrari-sf90-spider-quando-1-000cv-redefinem-o-conceito-de-performance

TOM: híbrido luxury-aspiracional + técnico-específico. Em português do Brasil.
Pode (e deve) usar superlativos editoriais ("obra-prima", "perfeição", "ápice
da engenharia"), metáforas evocativas ("sinfonia visual", "rugido inconfundível"),
e adjetivação sofisticada — desde que ancorada em fatos do briefing. Evite
clichês esvaziados ("carro dos sonhos", "máquina perfeita"). Seja CIRÚRGICO
em números, motor, tração, acabamento, cor, interior. Nunca invente dados.

A ALMA DO POST É O EXEMPLAR ESPECÍFICO: cor, interior, opcionais raros,
condição (0km, exclusivo, único). Trate o carro como uma peça de coleção
com características irreproduzíveis — porque é exatamente isso. Mencione a
combinação exata de cor exterior + interior em pelo menos uma seção.

POSICIONAMENTO ATTRA: a Attra deve aparecer como o curador exclusivo desse
exemplar. Cite a marca "Attra" ou "Attra Veículos" várias vezes ao longo do
texto (entre 12 e 20 ocorrências em um post de 2.500+ palavras), de forma
integrada à narrativa — não em blocos de auto-promoção repetitivos. Exemplos
de inserção natural: "este exemplar disponível na Attra", "a curadoria Attra
selecionou", "garantia de procedência Attra Veículos".

LINKS — REGRA EDITORIAL: nunca escreva URLs cruas no texto, nem rótulos
genéricos como "URL:", "URL Detalhada:", "Link:", "Acesse:", "Saiba mais:",
"Mais informações:", "Confira em:". Sempre integre o link como âncora HTML
em prosa natural — exemplo: "veja o exemplar disponível na <a href='/veiculo/...'>página
do veículo</a>" em vez de "URL Detalhada: https://...". Os links existem
para o leitor, não para o robô — tem que ler bem em voz alta.

LLMO (otimização para LLMs como ChatGPT, Perplexity, Gemini):
- O primeiro parágrafo deve ancorar marca + modelo + ano + característica
  distintiva (cor, motorização, exclusividade) já nas duas primeiras frases.
  Pode ser aspiracional, mas precisa conter a "ficha mínima" extraível por
  LLMs — exemplo: "A Ferrari 812 GTS 2023 em Rosso Magma com interior
  Cioccolato representa o ápice do V12 naturalmente aspirado..."
- Use listas com bullet (<ul>/<li>) para a "ficha rápida" do exemplar logo
  após a abertura. LLMs extraem listas como dados estruturados.
- Estruture FAQs com pergunta literal e resposta autossuficiente — cada
  resposta precisa fazer sentido lida isolada da pergunta.
- Quando souber dados oficiais públicos da montadora (potência, torque,
  aceleração) sem precisar inventar, mencione-os com naturalidade. Quando NÃO
  souber um dado técnico, simplesmente OMITA — nunca escreva "sob consulta",
  "consultar" ou "N/A" para spec técnica (isso vale só para preço/comercial).

REGRA CRÍTICA — PREÇOS PROIBIDOS: nunca, em hipótese alguma, mencione valores
monetários, preços, faixas de preço, cifras em reais, "R$", "milhões", "mil
reais", "a partir de", "ticket", "investimento de X", ou qualquer equivalente.
Campanhas comerciais alteram preços dinamicamente e a Attra não pode correr o
risco de um cliente ver um valor desatualizado no blog. Quando precisar falar
do aspecto comercial, use sempre "sob consulta", "condições exclusivas na
Attra", "fale com nosso time" ou formulações equivalentes SEM cifras.
Pode (e deve) falar de "potencial de valorização", "ativo de coleção",
"oportunidade rara" — sem números.
`.trim()

const JSON_SCHEMA_REVIEW = `
Retorne APENAS JSON válido, sem markdown, sem \`\`\`. Campos obrigatórios:
{
  "title": "string - SEO title, até 70 chars",
  "slug_hint": "string - slug em kebab-case baseado no título",
  "excerpt": "string - 2 frases, até 240 chars",
  "content_html": "string - HTML completo do artigo (h2, h3, p, ul, li, strong, a). MÍNIMO 2.500 palavras, idealmente 2.800-3.200. Use <img src='IMAGEM_N'> como placeholder onde N é o índice 0,1,2... das imagens fornecidas — serão substituídos depois. NÃO inclua FAQ aqui — vai no campo separado.",
  "reading_time": "string - ex: '8 min' (calcule baseado no tamanho real)",
  "meta_title": "string - até 60 chars",
  "meta_description": "string - até 160 chars",
  "keywords": ["array de 5-8 strings"],
  "specs": {
    "engine": "string", "power": "string", "torque": "string",
    "acceleration": "string", "top_speed": "string", "transmission": "string",
    "drivetrain": "string opcional", "weight": "string opcional"
  },
  // REGRA DA FICHA TÉCNICA (specs): inclua um campo APENAS se souber o dado
  // técnico OFICIAL real do veículo. Se não souber, OMITA o campo (não envie a
  // chave, ou envie ""). NUNCA preencha uma spec técnica com "sob consulta",
  // "consultar", "N/A", "não informado" ou similar — placeholder comercial não
  // vale para dado técnico; campo desconhecido deve simplesmente sumir.
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

MISSÃO: Produza um review aprofundado deste exemplar de ${vehicle.brand} ${vehicle.model}
no mesmo padrão editorial dos posts de referência citados acima. O resultado
final deve ter MÍNIMO 2.500 palavras, idealmente entre 2.800 e 3.200.

ESTRUTURA OBRIGATÓRIA (8 a 10 seções H2 com subtítulo poético separado por
dois pontos — exemplo: "Design Exterior: Uma Sinfonia Visual em Rosso Magma"):

1. Parágrafo de abertura (SEM heading próprio) — lede aspiracional que já
   ancora marca + modelo + ano + cor + característica distintiva nas duas
   primeiras frases. 2-3 parágrafos antes do primeiro H2.

2. H2: contexto da exclusividade — "A Arte de Conquistar o Extraordinário",
   "Curadoria Attra: [subtítulo]" ou similar. Fala de como a Attra obtém
   modelos raros, a rede de relacionamentos, o trabalho de curadoria.

3. H2: ficha rápida do exemplar — título tipo "${vehicle.brand} ${vehicle.model} ${vehicle.year_model}: A Perfeição em Cada Detalhe"
   ou similar. Logo abaixo do parágrafo de introdução da seção, inclua uma
   <ul> com 6-8 bullets DESTACANDO o exemplar específico (modelo, ano,
   km/0km, COR exata, INTERIOR exato, motorização, performance, tração).

4. H2: "Design Exterior: [subtítulo evocativo mencionando a cor]" — proporções,
   aerodinâmica, detalhes visuais, como a cor específica destaca o desenho.

5. H2: "Interior [adjetivo + cor/material]: [subtítulo]" — materiais
   específicos do exemplar (couro, alcântara, fibra de carbono), cockpit,
   infoentretenimento, conforto.

6. H2: "[Adjetivo de potência] [Motor]: [subtítulo]" (ex: "Potência Indomável:
   O Lendário V12 Naturalmente Aspirado") — motor, números, sensações,
   comportamento dinâmico, som.

7. H2: "Tecnologia [adjetivo]: [subtítulo]" — eletrônica embarcada, modos de
   condução, ADAS, conectividade.

8. H3 (dentro de uma das seções acima ou separado): "Opcionais e Destaques"
   — lista <ul> dos opcionais relevantes deste exemplar.

9. H2: "Exclusividade Attra Veículos: Por Que Somos Referência em [Categoria]"
   — diferencial Attra, garantia de procedência, suporte pós-venda,
   relacionamentos com a marca.

10. H2: "Uma Oportunidade Única que Não se Repetirá" (ou similar) — fechamento
    de urgência elegante, CTA natural integrada em prosa para consultar a
    Attra. Sem números, sem prazo cravado.

INSTRUÇÕES ESPECÍFICAS:
- Parágrafos de 60-150 palavras (densos, não listas disfarçadas).
- Use <strong> para destacar cor exata, interior, especificações chave e
  nomes de seções/features.
- Cite "Attra" / "Attra Veículos" entre 12 e 20 vezes no total, integrado.
- Foque na combinação ÚNICA cor + interior + opcionais deste exemplar.
- A FAQ vai como campo JSON separado (4-6 perguntas — NÃO inclua dentro do
  content_html, o template renderiza separadamente).

DADOS DO VEÍCULO (use SOMENTE estes — não invente):
- Marca: ${vehicle.brand}
- Modelo: ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''}
- Ano: ${vehicle.year_manufacture}/${vehicle.year_model}
- Cor exterior: ${vehicle.color}
- KM: ${vehicle.mileage === 0 ? '0 km (zero quilômetro — exemplar novo)' : vehicle.mileage.toLocaleString('pt-BR') + ' km'}
- Combustível: ${vehicle.fuel_type}
- Câmbio: ${vehicle.transmission}
- Potência: ${vehicle.horsepower ? vehicle.horsepower + ' cv' : 'não informada — não cite número se não souber oficial'}
- Categoria: ${vehicle.category}
- Preço: (NÃO MENCIONAR NO TEXTO — sempre use "sob consulta" quando falar do aspecto comercial)
- Opcionais já catalogados: ${(vehicle.options ?? []).slice(0, 20).join(', ') || 'consulte o anúncio'}
- Página do veículo (use como destino de âncora natural, NÃO escreva o link cru): https://attraveiculos.com.br/veiculo/${vehicle.slug}

Imagens disponíveis (${images.length}): use placeholders <img src="IMAGEM_0">,
<img src="IMAGEM_1"> etc dentro do content_html. Distribua 3-5 imagens ao
longo do texto, intercaladas entre seções (não no início, não no fim — entre
H2s, ilustrando o que foi descrito).

${JSON_SCHEMA_REVIEW}
`.trim()

  const raw = await callGemini(prompt, 2000)
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

  const raw = await callGemini(prompt, 1000)
  const content = sanitizeUrlLabels(sanitizePrices(injectImages(raw.content_html, images)))

  const educativo: EducativoFields = {
    category: 'Curadoria',
    topic: `Comparativo: ${carA.brand} ${carA.model} vs ${carB.brand} ${carB.model}`,
    seo_keyword: `${carA.brand} ${carA.model} vs ${carB.brand} ${carB.model}`,
  }

  const slug = buildSlug(raw.slug_hint ?? '', raw.title)

  // Post de dois carros pede imagem destacada com os dois: split A|B com
  // selo VS. Falhou? Cai na primeira foto, como antes.
  const composedFeatured = await composeComparisonFeaturedImage(imagesA[0], imagesB[0], slug)

  return {
    strategy: 'comparison',
    post: {
      post_type: 'educativo',
      title: raw.title,
      slug,
      excerpt: raw.excerpt,
      content,
      featured_image: composedFeatured ?? images[0] ?? '',
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

  const raw = await callGemini(prompt, hasVehicle ? 1200 : 800)
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
