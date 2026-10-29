/**
 * Gemini-powered long-form blog generators.
 *
 * Three flavours:
 *   - generateFromInstagram:   turns an IG caption into a short, fact-first post
 *                              (the automatic one since 28/10/2026, 3x/week)
 *   - generateReviewDoEstoque: short, fact-first review of a stock car from its
 *                              ficha; automatic while Instagram has no token,
 *                              and the manual ?strategy=review
 *   - generateComparison:      head-to-head between two cars, manual only
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
import { selecionarFotosFrontais } from './comparison-photo-selector'
import { semTravessao } from '@/lib/sem-travessao'
import { tituloDoVeiculo } from '@/lib/identidade-do-veiculo'

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

PONTUAÇÃO: nunca use travessão (—) nem meia-risca como pontuação, em nenhum
trecho (título, resumo, corpo, legendas). Use vírgula, dois-pontos, parênteses
ou ponto. É regra da marca.

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
// Comparativo (só à mão)
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
  const [fotoCapaA, fotoCapaB] = await selecionarFotosFrontais(imagesA, imagesB)
  const composedFeatured = await composeComparisonFeaturedImage(fotoCapaA, fotoCapaB, slug)

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
// Posts curtos: do Instagram ou de um carro do estoque
// ---------------------------------------------------------------------------

/**
 * Voz dos posts automáticos (28/10/2026): os do Instagram e, enquanto a Meta
 * não tem token, os reviews de carro do estoque.
 *
 * A avaliação de SEO/GEO de 28/10 achou o blog com cara de IA em escala:
 * reviews de 2.000 palavras, "Attra" a cada 48 palavras, superlativo sem
 * número, nenhum post citado pelas IAs. O citado era o contrário: texto curto,
 * caso real, número. Aqui a fonte (legenda ou ficha) manda; o texto organiza e
 * explica, não enfeita. BRAND_VOICE fica para o comparativo, que só roda à mão.
 */
const VOZ_DO_BLOG = `
Você escreve para o blog da Attra Veículos, loja de supercarros e carros premium em Uberlândia (MG) que vende para o Brasil inteiro. Quem lê tem dinheiro e entende de carro: quer fatos, não elogio.

COMO ESCREVER:
- O primeiro parágrafo responde, em 2 ou 3 frases, o que aconteceu ou o que é o carro: modelo, ano, cor e o fato principal da pauta. Nada de introdução sobre o mundo dos supercarros.
- Frases curtas e diretas. Adjetivo só quando um fato sustenta.
- Títulos de seção (h2) descritivos, do jeito que alguém pesquisaria: "O que este exemplar tem de diferente", "Para quem faz sentido", "O que olhar antes de comprar um [modelo]". Nada de subtítulo poético depois de dois-pontos.
- "Attra" no máximo 4 vezes no texto inteiro.
- Pode explicar o contexto conhecido e estável do modelo (geração, proposta, concorrentes diretos), sem número que não esteja nas fontes.
- Não afirme garantia, procedência, histórico de revisões, único dono nem laudo: isso a loja comprova com documento, não o blog.
- Não escreva preço, valor, "R$" nem faixa de preço: a página mostra ao lado do texto o preço do estoque de hoje, com aviso de atualização.
- Proibido: "obra-prima", "sinfonia", "ápice", "redefine", "verdadeira joia", "experiência única", "no universo", "perfeita harmonia", "sem precedentes", "mais pura expressão", "rugido", "carro dos sonhos", "não é apenas", "mais do que um carro", "inigualável", "incomparável", "eleva o conceito".
- Nunca use travessão (—) nem meia-risca (–) como pontuação. Use vírgula, dois-pontos ou ponto.
- Link só como âncora em prosa natural, nunca URL crua nem "Link:".
`.trim()

const FONTES_DO_INSTAGRAM = `
FONTES: a legenda do Instagram abaixo é a pauta e a fonte principal. Os dados do carro, quando houver, vêm da ficha do anúncio. Número (potência, torque, 0 a 100, quilometragem, prazo, ano) só entra se estiver na legenda ou na ficha. Se não está, não escreva.
`.trim()

const FONTES_DO_ESTOQUE = `
FONTES: a ficha do anúncio abaixo é a única fonte de número (potência, torque, 0 a 100, quilometragem, ano). Se não está na ficha, não escreva. Não há história de entrega nem de cliente: não invente viagem, prazo, dono anterior nem motivo da venda.
`.trim()

function schemaDoPost(comCarro: boolean): string {
  const camposDoCarro = comCarro
    ? `,
  "faq": [{"question": "pergunta que um comprador faz sobre este modelo", "answer": "resposta que se sustenta sozinha, só com fatos das fontes"}] (3 itens),
  "evaluation": {"summary": "2 frases sobre o exemplar, só fatos", "highlights": ["3 ou 4 fatos do exemplar"], "target_profile": "para quem faz sentido, em uma frase"}`
    : ''
  return `
Retorne APENAS JSON válido, sem markdown. Campos:
{
  "title": "até 60 caracteres: o modelo e o fato principal da pauta, sem 'Attra'",
  "slug_hint": "kebab-case do título",
  "excerpt": "até 200 caracteres, o fato principal em uma ou duas frases",
  "content_html": "HTML (h2, h3, p, ul, li, strong, a) com 700 a 1.100 palavras. Use <img src='IMAGEM_N'> (N = 0, 1, 2...) entre as seções. Sem FAQ aqui.",
  "reading_time": "ex.: '5 min'",
  "meta_title": "até 60 caracteres, sem 'Attra'",
  "meta_description": "até 155 caracteres, com o fato principal",
  "keywords": ["4 a 6 buscas reais, ex.: 'lamborghini temerário à venda'"]${camposDoCarro}
}`.trim()
}

/** Os dados do carro que o texto pode usar: cadastro + ficha do molde. */
function briefingDoCarro(v: Vehicle): string {
  const f = v.ficha
  const linhas: Array<[string, string | null | undefined]> = [
    ['Carro', tituloDoVeiculo(v)],
    ['Quilometragem', v.mileage === 0 ? '0 km' : `${v.mileage.toLocaleString('pt-BR')} km`],
    ['Cor', f?.cor ?? v.color],
    ['Interior', f?.interior],
    ['Motor', f?.motor ?? v.engine],
    ['Potência', f?.potencia ?? (v.horsepower ? `${v.horsepower} cv` : null)],
    ['Torque', f?.torque],
    ['Câmbio', f?.cambio ?? v.transmission],
    ['Tração', f?.tracao],
    ['0 a 100 km/h', f?.aceleracao_0_100],
    ['Velocidade máxima', f?.velocidade_maxima],
    ['Rodas', f?.rodas],
    ['Freios', f?.freios],
    ['Som', f?.som],
  ]
  const itens = [...(f?.diferenciais ?? []), ...(f?.opcionais ?? [])].slice(0, 12)
  return [
    ...linhas.filter(([, valor]) => valor).map(([rotulo, valor]) => `- ${rotulo}: ${valor}`),
    itens.length > 0 ? `- Itens do carro: ${itens.join('; ')}` : null,
    `- Ficha do carro no site (use como âncora em prosa): https://attraveiculos.com.br/veiculo/${v.slug}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Expressões que denunciam texto de IA (as mesmas proibidas na voz). */
export const CLICHES = [
  'obra-prima', 'sinfonia', 'ápice', 'redefine', 'verdadeira joia', 'experiência única', 'no universo',
  'perfeita harmonia', 'sem precedentes', 'mais pura expressão', 'rugido', 'carro dos sonhos', 'não é apenas',
  'mais do que um carro', 'inigualável', 'incomparável', 'eleva o conceito',
]

/**
 * O que a revisão automática cobra antes de publicar. Lista vazia = pronto.
 * Travessão e preço não entram: saem no pós-processamento.
 */
export function problemasDoTexto(r: Pick<GeminiJsonResponse, 'title' | 'content_html' | 'meta_title'>): string[] {
  const texto = (r.content_html ?? '').replace(/<[^>]+>/g, ' ')
  const problemas: string[] = []
  const cliches = CLICHES.filter(c => `${r.title} ${texto}`.toLowerCase().includes(c))
  if (cliches.length > 0) problemas.push(`expressões proibidas: ${cliches.join(', ')}`)
  const attra = (texto.match(/\bAttra\b/gi) ?? []).length
  if (attra > 5) problemas.push(`"Attra" aparece ${attra} vezes (máximo 4)`)
  const palavras = countWords(r.content_html ?? '')
  if (palavras < 650) problemas.push(`texto com ${palavras} palavras (mínimo 700)`)
  if (palavras > 1400) problemas.push(`texto com ${palavras} palavras (máximo 1.100)`)
  const titulo = r.meta_title || r.title || ''
  if (titulo.length > 65) problemas.push(`título com ${titulo.length} caracteres (máximo 60)`)
  return problemas
}

/** Gera, revisa e, se a revisão achar problema, pede uma segunda versão. Fica a melhor. */
async function gerarComRevisao(prompt: string): Promise<GeminiJsonResponse> {
  const primeira = await callGemini(prompt, 700)
  const problemas = problemasDoTexto(primeira)
  if (problemas.length === 0) return primeira

  console.warn('[gemini-blog] post voltou para revisão:', problemas)
  try {
    const segunda = await callGemini(
      `${prompt}\n\nA versão anterior saiu com estes problemas. Escreva de novo sem eles:\n- ${problemas.join('\n- ')}`,
      700
    )
    return problemasDoTexto(segunda).length < problemas.length ? segunda : primeira
  } catch (err) {
    console.warn('[gemini-blog] segunda versão falhou, fica a primeira:', err instanceof Error ? err.message : err)
    return primeira
  }
}

/** Título, resumo, texto e SEO prontos para publicar: preço, rótulo de URL e travessão saem aqui. */
function camposDoPost(raw: GeminiJsonResponse, images: string[], rodape = '') {
  const title = semTravessao(raw.title)
  return {
    title,
    slug: buildSlug(raw.slug_hint ?? '', title),
    excerpt: semTravessao(raw.excerpt),
    content: semTravessao(sanitizeUrlLabels(sanitizePrices(injectImages(raw.content_html, images)))) + rodape,
    featured_image: images[0] ?? '',
    author: { name: 'Attra Veículos', bio: 'Curadoria em superesportivos e alto padrão' },
    published_date: new Date().toISOString(),
    is_published: true,
    seo: {
      ...toSeo(raw),
      meta_title: semTravessao(raw.meta_title || raw.title),
      meta_description: semTravessao(raw.meta_description || raw.excerpt),
    },
  }
}

/** A tabela do review: só o que a ficha e o cadastro dizem; o que falta some. */
function reviewDoExemplar(v: Vehicle, raw: GeminiJsonResponse, images: string[]): CarReviewFields {
  const f = v.ficha
  return {
    vehicle_id: v.id,
    brand: v.brand,
    model: v.model,
    year: v.year_model,
    version: v.version ?? undefined,
    status: v.is_new ? '0 km' : 'Seminovo',
    color: f?.cor ?? v.color,
    specs: {
      engine: f?.motor ?? v.engine ?? '',
      power: f?.potencia ?? (v.horsepower ? `${v.horsepower} cv` : ''),
      torque: f?.torque ?? '',
      acceleration: f?.aceleracao_0_100 ?? '',
      top_speed: f?.velocidade_maxima ?? '',
      transmission: f?.cambio ?? v.transmission ?? '',
      drivetrain: f?.tracao ?? undefined,
      brakes: f?.freios ?? undefined,
    },
    gallery_images: images,
    availability: {
      in_stock: v.status === 'available' || v.status === 'highlight',
      // O preço sai ao vivo no quadro de disponibilidade, com asterisco.
      stock_url: `/veiculo/${v.slug}`,
    },
    faq: raw.faq,
    optionals: f && f.opcionais.length > 0 ? f.opcionais : undefined,
    evaluation: raw.evaluation,
  }
}

const IMAGENS_NO_TEXTO = (n: number) =>
  `Imagens disponíveis (${n}): use de 2 a 4 placeholders <img src="IMAGEM_0">, <img src="IMAGEM_1"> etc., entre as seções.`

export interface InstagramInput {
  caption: string
  permalink: string
  images: string[]
  /** Carro do estoque citado na legenda, já com a ficha do molde. */
  vehicle?: Vehicle | null
  /**
   * O carro já tem review no blog: o post sai como história (educativo),
   * sem um segundo review do mesmo exemplar.
   */
  carroJaResenhado?: boolean
}

export async function generateFromInstagram(
  input: InstagramInput
): Promise<GeneratedBlog> {
  const v = input.vehicle ?? null
  const comoReview = Boolean(v && !input.carroJaResenhado)
  const images = input.images.length > 0 ? input.images : v?.photos ?? []

  const prompt = `
${VOZ_DO_BLOG}

${FONTES_DO_INSTAGRAM}

MISSÃO: transformar o post do Instagram abaixo num artigo do blog. O artigo conta o que a legenda conta, com mais contexto e organizado para quem pesquisa o modelo no Google ou pergunta a uma IA.

LEGENDA DO INSTAGRAM:
"""
${input.caption}
"""

${v ? `DADOS DO CARRO (ficha do anúncio; use só estes números):\n${briefingDoCarro(v)}` : 'Sem carro do estoque ligado à legenda: trabalhe só com o que a legenda diz.'}

ESTRUTURA:
1. Abertura de 2 ou 3 frases com o fato principal (sem h2).
${v ? '2. Uma lista curta (ul) com os dados do carro que estão nas fontes.\n3.' : '2.'} De 2 a 4 seções h2 que expliquem o que a legenda conta e o que um comprador precisa saber.
${v ? 'Última seção: onde ver o carro, com âncora natural para a ficha do site.' : 'Última seção: como a Attra encontra um carro assim, em 2 ou 3 frases.'}

${IMAGENS_NO_TEXTO(images.length)}

${schemaDoPost(comoReview)}
`.trim()

  const raw = await gerarComRevisao(prompt)
  const fonte = `\n<p>Publicado primeiro no <a href="${input.permalink}" target="_blank" rel="noopener">Instagram da Attra</a>.</p>`
  const comum = camposDoPost(raw, images, fonte)

  if (comoReview && v) {
    return {
      strategy: 'instagram',
      post: {
        ...comum,
        post_type: 'car_review',
        featured_image_alt: tituloDoVeiculo(v),
        reading_time: raw.reading_time ?? '5 min',
        car_review: reviewDoExemplar(v, raw, images),
      },
    }
  }

  return {
    strategy: 'instagram',
    post: {
      ...comum,
      post_type: 'educativo',
      featured_image_alt: comum.title,
      reading_time: raw.reading_time ?? '4 min',
      educativo: {
        category: 'Bastidores',
        topic: comum.title,
        seo_keyword: (raw.keywords ?? [])[0] ?? comum.title,
      },
    },
  }
}

/**
 * Review curto de um carro do estoque, na mesma voz do post do Instagram e
 * com os números só da ficha do molde. É o post automático enquanto a Meta não
 * tem token (ver runDailyBlogAi) e o do disparo manual ?strategy=review. Tomou
 * o lugar do review de 2.500 palavras com "Attra" 12 a 20 vezes (28/10/2026).
 */
export async function generateReviewDoEstoque(v: Vehicle): Promise<GeneratedBlog> {
  const images = v.photos ?? []

  const prompt = `
${VOZ_DO_BLOG}

${FONTES_DO_ESTOQUE}

MISSÃO: escrever o review deste ${tituloDoVeiculo(v)} à venda na Attra, para quem pesquisa o modelo no Google ou pergunta a uma IA: o que o carro é, o que este exemplar tem de diferente (cor, interior, itens da ficha), o que os números da ficha dizem e para quem ele faz sentido.

DADOS DO CARRO (ficha do anúncio; use só estes números):
${briefingDoCarro(v)}

ESTRUTURA:
1. Abertura de 2 ou 3 frases: modelo, ano, cor, quilometragem e o que distingue este exemplar (sem h2).
2. Uma lista curta (ul) com os dados da ficha.
3. De 3 a 4 seções h2, por exemplo: o que este exemplar tem de diferente, motor e desempenho (só com números da ficha), para quem faz sentido, o que olhar antes de comprar esse modelo.
Última seção: onde ver o carro, com âncora natural para a ficha do site.

${IMAGENS_NO_TEXTO(images.length)}

${schemaDoPost(true)}
`.trim()

  const raw = await gerarComRevisao(prompt)
  return {
    strategy: 'review',
    post: {
      ...camposDoPost(raw, images),
      post_type: 'car_review',
      featured_image_alt: tituloDoVeiculo(v),
      reading_time: raw.reading_time ?? '5 min',
      car_review: reviewDoExemplar(v, raw, images),
    },
  }
}
