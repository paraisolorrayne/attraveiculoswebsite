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

import { createClient } from '@supabase/supabase-js'
import { validateArticleWithAI } from '@/lib/news-guardrails'
import { generateNewsSlug } from '@/lib/utils'

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '3fed0093c3944c90b74dd58d7110ee4e'
const GNEWS_BASE_URL = 'https://gnews.io/api/v4/search'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

/**
 * Check if an article is too similar to any existing article
 */
function isDuplicateArticle(
  newTitle: string,
  existingTitles: string[],
  threshold: number = 0.5
): boolean {
  const newTerms = extractKeyTerms(newTitle)

  for (const existingTitle of existingTitles) {
    const existingTerms = extractKeyTerms(existingTitle)
    const similarity = calculateSimilarity(newTerms, existingTerms)

    if (similarity >= threshold) {
      console.log(`[NewsIngestion] Duplicate detected (${(similarity * 100).toFixed(0)}% similar):`)
      console.log(`  - New: "${newTitle}"`)
      console.log(`  - Existing: "${existingTitle}"`)
      return true
    }
  }

  return false
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

function getWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  
  // Calculate start of week (Sunday)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  
  // Calculate end of week (Saturday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
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
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { weekStart, weekEnd } = getWeekRange()

  console.log(`[NewsIngestion] Starting for week ${weekStart} to ${weekEnd}`)

  try {
    // 1. Check if cycle already exists for this week
    const { data: existingCycle } = await supabase
      .from('news_cycles')
      .select('*')
      .eq('week_start', weekStart)
      .eq('week_end', weekEnd)
      .single()

    let newCycle = existingCycle

    if (existingCycle) {
      console.log(`[NewsIngestion] Using existing cycle ${existingCycle.id}`)
    } else {
      // Create new cycle (inactive)
      const { data: createdCycle, error: cycleError } = await supabase
        .from('news_cycles')
        .insert({ week_start: weekStart, week_end: weekEnd, is_active: false })
        .select()
        .single()

      if (cycleError) {
        throw new Error(`Failed to create cycle: ${cycleError.message}`)
      }

      newCycle = createdCycle
      console.log(`[NewsIngestion] Created cycle ${newCycle.id}`)
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

    // 3. Deduplicate by URL
    const seenUrls = new Set<string>()
    const uniqueArticles = allArticles.filter(({ article }) => {
      if (seenUrls.has(article.url)) return false
      seenUrls.add(article.url)
      return true
    })

    console.log(`[NewsIngestion] ${uniqueArticles.length} unique articles after URL deduplication`)

    // 3.5. Deduplicate by title similarity (threshold mais alto para mais rigor)
    const seenTitles: string[] = []
    const deduplicatedArticles = uniqueArticles.filter(({ article }) => {
      if (isDuplicateArticle(article.title, seenTitles, 0.5)) {
        return false
      }
      seenTitles.push(article.title)
      return true
    })

    console.log(`[NewsIngestion] ${deduplicatedArticles.length} unique articles after similarity deduplication`)

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

      const { error: insertError } = await supabase.from('news_articles').insert({
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

      if (insertError && insertError.code !== '23505') {
        errors.push(`Insert failed "${article.title}": ${insertError.message}`)
      } else if (!insertError) {
        articlesInserted++
      }
    }

    console.log(`[NewsIngestion] Inserted ${articlesInserted} articles`)

    // 6. Activate new cycle, deactivate old
    await supabase
      .from('news_cycles')
      .update({ is_active: false })
      .neq('id', newCycle.id)

    await supabase
      .from('news_cycles')
      .update({ is_active: true })
      .eq('id', newCycle.id)

    console.log(`[NewsIngestion] Activated cycle ${newCycle.id}`)

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

