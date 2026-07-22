/**
 * Weekly News Ingestion Job - Attra Luxury Edition
 *
 * Fetches news about F1, Supercars, Haute Horlogerie, and High-End Finance.
 * Classifies/Filters via Gemini AI and stores in Supabase.
 *
 * Run: Every Sunday at 00:00
 *
 * Usage:
 * - Supabase pg_cron (preferido) ou cron job no servidor → /api/cron/news-ingestion
 * - Manual: Call /api/cron/news-ingestion endpoint with CRON_SECRET
 */

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { validateArticleWithAI } from '@/lib/news-guardrails'
import { generateNewsSlug } from '@/lib/utils'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '3fed0093c3944c90b74dd58d7110ee4e'
const GNEWS_BASE_URL = 'https://gnews.io/api/v4/search'


interface GNewsArticle {
  title: string
  description: string
  content: string
  url: string
  image: string
  publishedAt: string
  source: {
    name: string
    url: string
  }
}

interface GNewsResponse {
  totalArticles: number
  articles: GNewsArticle[]
}

// 1. Mapeamento de Categorias
// 2 = F1/Racing, 3 = Premium/Lifestyle (Carros, Relógios, Business)
const F1_KEYWORDS = [
  'formula 1', 'f1', 'grand prix', 'gp ', 'grande prêmio',
  'verstappen', 'hamilton', 'leclerc', 'norris', 'piastri', 'bortoleto', 'colapinto',
  'ferrari f1', 'red bull racing', 'mercedes f1', 'aston martin f1', 'mclaren f1',
  'paddock', 'interlagos', 'monaco', 'adrian newey',
]

const PREMIUM_KEYWORDS = [
  // Supercars
  'ferrari', 'lamborghini', 'porsche', 'mclaren', 'aston martin', 'bugatti', 'pagani', 'koenigsegg',
  // Luxury Lifestyle (Watches)
  'rolex', 'patek philippe', 'richard mille', 'audemars piguet', 'vacheron constantin', 'cartier',
  'alta relojoaria', 'turbilhão', 'cronógrafo',
  // High-End Finance/Business
  'private banking', 'wealth management', 'gestão de patrimônio', 'family office',
  'banco safra', 'btg pactual', 'xp private', 'jpmorgan', 'goldman sachs',
  'mercado de luxo', 'investimento', 'ipo',
]

// 2. Filtros de Exclusão (Anti-Ruído e Anti-Negatividade)
const EXCLUDE_KEYWORDS = [
  // Crime/Polícia
  'roubo', 'assalto', 'furto', 'polícia', 'preso', 'prisão', 'tiro', 'baleado', 'morte', 'morre', 'tragédia', 'crime', 'quadrilha', 'golpe',
  // Popular/Massa
  'popular', 'usado', 'seminovo', 'financiamento', 'consórcio', 'uber', '99', 'taxista', 'ônibus', 'caminhão',
  'futebol', 'brasileirão', 'bbb', 'reality', 'fofoca',
  // Política Partidária/Crise
  'bolsonaro', 'lula', 'impeachment', 'cpi', 'escândalo', 'corrupção', 'lavagem de dinheiro',
  // Falsos positivos comuns
  'juju ferrari', 'banco de praça', 'banco de sangue',
]

// 3. Palavras de Confirmação (Sinais de Luxo)
const LUXURY_CONFIRM_KEYWORDS = [
  // Auto
  'v12', 'v10', 'v8', 'cavalos', '0-100', 'superesportivo', 'hypercar', 'conversível', 'coupé',
  // Relógios/Joias
  'quilates', 'ouro', 'platina', 'titânio', 'safira', 'leilão', 'sothebys', 'christies', 'colecionador', 'limitada', 'edição especial',
  // Finance/Geral
  'alta renda', 'exclusivo', 'premium', 'luxo', 'milhões', 'bilhões', 'recorde', 'performance', 'inovação',
]

function shouldExcludeArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()

  for (const keyword of EXCLUDE_KEYWORDS) {
    if (text.includes(keyword)) {
      // Se tiver confirmação FORTE de luxo, salvamos
      const hasLuxuryConfirm = LUXURY_CONFIRM_KEYWORDS.some(k => text.includes(k))
      if (!hasLuxuryConfirm) {
        return true
      }
    }
  }
  return false
}

function classifyArticle(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase()
  // F1 tem prioridade de categoria
  for (const keyword of F1_KEYWORDS) {
    if (text.includes(keyword)) return 2
  }
  // Verifica keywords premium (carros, relógios, finanças)
  for (const keyword of PREMIUM_KEYWORDS) {
    if (text.includes(keyword)) return 3
  }
  // Todo o resto cai na categoria "Premium/Lifestyle"
  return 3
}

/**
 * Extract key terms from a title for similarity comparison
 * Removes common words and normalizes the text
 */
function extractKeyTerms(title: string): Set<string> {
  const stopWords = ['a', 'o', 'e', 'de', 'da', 'do', 'em', 'no', 'na', 'para', 'com', 'por', 'que', 'um', 'uma', 'os', 'as', 'dos', 'das', 'ao', 'à', 'é', 'são', 'foi', 'será', 'após', 'entre', 'sobre', 'como', 'mais', 'seu', 'sua', 'seus', 'suas', 'novo', 'nova']

  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))

  return new Set(normalized)
}

/**
 * Calculate Jaccard similarity between two sets of terms
 */
function calculateSimilarity(terms1: Set<string>, terms2: Set<string>): number {
  const intersection = new Set([...terms1].filter(x => terms2.has(x)))
  const union = new Set([...terms1, ...terms2])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

async function fetchGNewsArticles(query: string, max: number = 15): Promise<GNewsArticle[]> {
  const params = new URLSearchParams({
    q: query,
    lang: 'pt',
    country: 'br',
    max: max.toString(),
    apikey: GNEWS_API_KEY,
  })

  const response = await fetch(`${GNEWS_BASE_URL}?${params}`)
  
  if (!response.ok) {
    throw new Error(`GNews API error: ${response.status} ${response.statusText}`)
  }

  const data: GNewsResponse = await response.json()
  return data.articles || []
}

// Format a Date as YYYY-MM-DD using its local components. Using toISOString()
// here would shift the date to UTC and, on a server ahead of UTC, roll the
// day boundary back (week_start came out a day early). Reading local parts
// keeps the stored label aligned with the window computed below.
function toLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// The cycle window is the trailing 7 days ending at the run instant — i.e. the
// week that just happened. This never points into the future (weekEnd = now)
// and works even when the job runs off-schedule (manual run on a weekday).
// startDate/endDate are the absolute boundaries used to filter article dates.
function getWeekRange(): {
  weekStart: string
  weekEnd: string
  startDate: Date
  endDate: Date
} {
  const now = new Date()

  const endDate = new Date(now)
  endDate.setHours(23, 59, 59, 999)

  const startDate = new Date(now)
  startDate.setDate(now.getDate() - 7)
  startDate.setHours(0, 0, 0, 0)

  return {
    weekStart: toLocalYmd(startDate),
    weekEnd: toLocalYmd(endDate),
    startDate,
    endDate,
  }
}

export async function runWeeklyNewsIngestion(): Promise<{
  success: boolean
  cycleId?: string
  articlesInserted: number
  errors: string[]
}> {
  const errors: string[] = []
  let articlesInserted = 0

  const { weekStart, weekEnd, startDate, endDate } = getWeekRange()

  console.log(`[NewsIngestion] Starting for week ${weekStart} to ${weekEnd}`)

  try {
    // 0. Auto-cura: o cron roda diariamente, mas só ingere quando o ciclo
    // ativo está velho (>6 dias). Semana normal → no-op de seg a sáb; se a
    // execução de domingo falhar (ex.: banco fora do ar), o dia seguinte
    // cria o ciclo da semana em vez de deixar o site defasado 7 dias.
    const activeCycle = await db.selectFrom('news_cycles')
      .select(['id', 'created_at'])
      .where('is_active', '=', true)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (activeCycle?.created_at) {
      const ageMs = Date.now() - new Date(activeCycle.created_at).getTime()
      const sixDaysMs = 6 * 24 * 60 * 60 * 1000
      if (ageMs < sixDaysMs) {
        console.log(`[NewsIngestion] Ciclo ativo tem ${(ageMs / 86_400_000).toFixed(1)} dias — nada a fazer`)
        return { success: true, cycleId: activeCycle.id, articlesInserted: 0, errors: [] }
      }
    }

    // 1. Check if cycle already exists for this week
    const existingCycle = await db.selectFrom('news_cycles').selectAll()
      .where('week_start', '=', weekStart)
      .where('week_end', '=', weekEnd)
      .executeTakeFirst()

    let newCycle = existingCycle

    if (existingCycle) {
      console.log(`[NewsIngestion] Using existing cycle ${existingCycle.id}`)
    } else {
      // Create new cycle (inactive)
      newCycle = await db.insertInto('news_cycles')
        .values({ week_start: weekStart, week_end: weekEnd, is_active: false })
        .returningAll()
        .executeTakeFirst()
      console.log(`[NewsIngestion] Created cycle ${newCycle?.id}`)
    }

    if (!newCycle) {
      throw new Error('Failed to get or create cycle')
    }

    // 2. Fetching Strategies (Queries expandidas para Público Attra)
    const ARTICLES_PER_QUERY = 12

    const queries = [
      // F1 & Racing Lifestyle
      { query: '"Fórmula 1" OR "F1" (Bortoleto OR Hamilton OR Ferrari)', category: 2 },
      { query: '"Paddock Club" OR "VIP" Interlagos F1', category: 2 },
      // Supercars & Hypercars (Sonho de consumo)
      { query: '"Ferrari" OR "Lamborghini" OR "Porsche" OR "McLaren" (lançamento OR novo OR exclusivo)', category: 3 },
      { query: 'Hypercar "Bugatti" OR "Pagani" OR "Koenigsegg"', category: 3 },
      // Haute Horlogerie (O que eles usam no pulso)
      { query: '"Rolex" OR "Patek Philippe" OR "Richard Mille" OR "Audemars Piguet" (leilão OR recorde OR novo)', category: 3 },
      // High Finance & Wealth (O dinheiro deles)
      { query: '"Private Banking" OR "Wealth Management" OR "Family Office" (tendências OR investimentos)', category: 3 },
      { query: '"Mercado de luxo" crescimento OR tendências', category: 3 },
    ]

    const allArticles: Array<{ article: GNewsArticle, category_id: number }> = []

    for (let i = 0; i < queries.length; i++) {
      const { query, category } = queries[i]
      try {
        // Delay between queries to avoid GNews API rate limiting (429)
        if (i > 0) {
          console.log(`[NewsIngestion] Waiting 2s before next query...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        const articles = await fetchGNewsArticles(query, ARTICLES_PER_QUERY)
        articles.forEach(article => {
          allArticles.push({ article, category_id: category })
        })
      } catch (err) {
        errors.push(`Query failed "${query}": ${err}`)
      }
    }

    console.log(`[NewsIngestion] Fetched ${allArticles.length} articles`)

    // 2.5. Keep only articles published inside the cycle window. GNews returns
    // whatever is most recent regardless of date, so without this the page
    // showed articles older than week_start and contradicted the "Destaques da
    // Semana" label. publishedAt is an absolute ISO timestamp; compare in ms.
    const startMs = startDate.getTime()
    const endMs = endDate.getTime()
    const inRangeArticles = allArticles.filter(({ article }) => {
      const t = new Date(article.publishedAt).getTime()
      if (Number.isNaN(t)) return false
      const inRange = t >= startMs && t <= endMs
      if (!inRange) {
        console.log(`[NewsIngestion] Out of window (${article.publishedAt}): "${article.title.substring(0, 60)}..."`)
      }
      return inRange
    })

    console.log(`[NewsIngestion] ${inRangeArticles.length} articles inside window ${weekStart}..${weekEnd}`)

    // 3. Deduplicate by URL
    const seenUrls = new Set<string>()
    const uniqueArticles = inRangeArticles.filter(({ article }) => {
      if (seenUrls.has(article.url)) return false
      seenUrls.add(article.url)
      return true
    })

    console.log(`[NewsIngestion] ${uniqueArticles.length} unique articles after URL deduplication`)

    // 3.5. Remove near-duplicates and cap how many articles cover the same
    // subject. Title similarity (Jaccard over key terms):
    //   >= HARD_DUP   → same story reworded → drop entirely
    //   >= SAME_TOPIC → same subject → keep at most MAX_PER_TOPIC of them
    // Catches exact repeats AND topic flooding (e.g. 6x "Ferrari Luce").
    const HARD_DUP = 0.4
    const SAME_TOPIC = 0.28
    const MAX_PER_TOPIC = 2
    const acceptedTerms: Set<string>[] = []
    const deduplicatedArticles = uniqueArticles.filter(({ article }) => {
      const terms = extractKeyTerms(article.title)
      let topicMatches = 0
      for (const prev of acceptedTerms) {
        const sim = calculateSimilarity(terms, prev)
        if (sim >= HARD_DUP) {
          console.log(`[NewsIngestion] Near-duplicate dropped: "${article.title.substring(0, 60)}..."`)
          return false
        }
        if (sim >= SAME_TOPIC) topicMatches++
      }
      if (topicMatches >= MAX_PER_TOPIC) {
        console.log(`[NewsIngestion] Topic cap (${MAX_PER_TOPIC}) reached, dropped: "${article.title.substring(0, 60)}..."`)
        return false
      }
      acceptedTerms.push(terms)
      return true
    })

    console.log(`[NewsIngestion] ${deduplicatedArticles.length} unique articles after dedup + topic cap`)

    // 4. Pre-filter obvious non-automotive articles (fast keyword check)
    const preFilteredArticles = deduplicatedArticles.filter(({ article }) => {
      const shouldExclude = shouldExcludeArticle(article.title, article.description)
      if (shouldExclude) {
        console.log(`[NewsIngestion] Pre-filter excluding: "${article.title.substring(0, 60)}..."`)
      }
      return !shouldExclude
    })

    console.log(`[NewsIngestion] ${preFilteredArticles.length} articles after keyword pre-filter`)

    // 5. AI Guardrails (O filtro de Ouro - Gemini como Editor Chefe)
    const filteredArticles: typeof preFilteredArticles = []
    for (const item of preFilteredArticles) {
      const validation = await validateArticleWithAI({
        title: item.article.title,
        description: item.article.description,
        source: item.article.source.name
      })

      // Aceitamos se for relevante para o público (isAutomotive = "Attra Relevant")
      if (validation.isAutomotive && validation.confidence >= 75) {
        filteredArticles.push(item)
      } else {
        console.log(`[AI Reject] ${item.article.title.substring(0, 40)}... (${validation.reason})`)
      }
    }

    console.log(`[NewsIngestion] Approved by AI: ${filteredArticles.length}`)

    // 6. Select 3 featured articles (most recent from premium category)
    const premiumArticles = filteredArticles
      .filter(a => a.category_id === 3)
      .sort((a, b) => new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime())
      .slice(0, 3)

    console.log(`[NewsIngestion] Premium articles found: ${premiumArticles.length}`)

    // 7. Insert articles
    for (const { article } of filteredArticles) {
      const isFeatured = premiumArticles.some(p => p.article.url === article.url)
      const featuredIndex = premiumArticles.findIndex(p => p.article.url === article.url)

      const articleId = crypto.randomUUID()
      const slug = generateNewsSlug(article.title, articleId)

      try {
        const inserted = await db.insertInto('news_articles')
          .values({
            id: articleId,
            slug,
            news_cycle_id: newCycle.id,
            category_id: isFeatured ? 1 : classifyArticle(article.title, article.description),
            source_id: 1,
            title: article.title,
            description: article.description,
            image_url: article.image,
            source_name: article.source.name,
            original_url: article.url,
            published_at: article.publishedAt,
            is_featured: isFeatured,
            featured_order: isFeatured ? featuredIndex + 1 : null,
          })
          // 23505 dup → ignora (idempotência)
          .onConflict((oc) => oc.doNothing())
          .returning('id')
          .executeTakeFirst()
        if (inserted) articlesInserted++
      } catch (e) {
        errors.push(`Insert failed "${article.title}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    console.log(`[NewsIngestion] Inserted ${articlesInserted} articles`)

    // 6. Activate new cycle, deactivate old
    try {
      await db.updateTable('news_cycles').set({ is_active: false })
        .where('id', '!=', newCycle.id).execute()
    } catch (e) {
      errors.push(`Failed to deactivate old cycles: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      await db.updateTable('news_cycles').set({ is_active: true })
        .where('id', '=', newCycle.id).execute()
    } catch (e) {
      // Activation is the line between /news showing this cycle and rendering
      // "No active cycle found". A silent failure here would report success
      // while the page stays empty — fail loudly instead.
      throw new Error(`Failed to activate cycle ${newCycle.id}: ${e instanceof Error ? e.message : String(e)}`)
    }

    console.log(`[NewsIngestion] Activated cycle ${newCycle.id}`)

    // Force Next.js to regenerate the static HTML of the news pages immediately,
    // otherwise the ISR cache (revalidate=3600) could serve the previous cycle's
    // articles together with the new cycle label for up to 1h.
    try {
      revalidatePath('/news')
      revalidatePath('/news/[slug]', 'page')
      console.log('[NewsIngestion] Revalidated /news and /news/[slug]')
    } catch (revalErr) {
      // Non-fatal: ISR fallback (revalidate seconds) will still pick up changes.
      errors.push(`revalidatePath failed: ${String(revalErr)}`)
      console.warn('[NewsIngestion] revalidatePath failed (non-fatal):', revalErr)
    }

    return {
      success: true,
      cycleId: newCycle.id,
      articlesInserted,
      errors,
    }
  } catch (error) {
    console.error('[NewsIngestion] Critical error:', error)
    return {
      success: false,
      articlesInserted,
      errors: [...errors, String(error)],
    }
  }
}

