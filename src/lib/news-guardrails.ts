/**
 * News Guardrails Service
 * Uses Gemini AI to validate if news articles are relevant for Attra's HNWI audience
 * Covers: F1, Supercars, Haute Horlogerie, High-End Finance
 */

import { GEMINI_TEXT_MODEL } from './gemini-config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = GEMINI_TEXT_MODEL
const API_TIMEOUT = 10000 // 10 seconds

interface ArticleValidation {
  isAutomotive: boolean // Mantido para compatibilidade - conceito expandido para "IsAttraRelevant"
  confidence: number // 0-100
  reason: string
  category?: 'formula1' | 'supercar' | 'luxury' | 'market' | 'other'
}

interface ArticleInput {
  title: string
  description: string
  source?: string
}

/**
 * Validate if an article is relevant for Attra's HNWI audience using Gemini AI
 */
export async function validateArticleWithAI(article: ArticleInput): Promise<ArticleValidation> {
  if (!GEMINI_API_KEY) {
    console.warn('[NewsGuardrails] No Gemini API key, skipping AI validation')
    return { isAutomotive: true, confidence: 50, reason: 'AI validation skipped - no API key' }
  }

  const prompt = `Você é o Editor Chefe da "Attra Veículos", uma concessionária de supercarros e veículos premium em Uberlândia-MG.

O feed de notícias da Attra é EXCLUSIVAMENTE sobre o MUNDO AUTOMOTIVO PREMIUM e FORMULA 1.

Analise a seguinte notícia:
Título: "${article.title}"
Descrição: "${article.description || 'Sem descrição'}"
Fonte: "${article.source || 'Desconhecida'}"

APROVAR (isAutomotive = true) SOMENTE SE:
- Notícia sobre supercarros, hypercars ou veículos de luxo (Ferrari, Porsche, Lamborghini, McLaren, Bugatti, Pagani, etc.) — lançamentos, testes, recordes, leilões de carros.
- Notícia sobre Fórmula 1 — pilotos, corridas, equipes, tecnologia, bastidores, calendário.
- Notícia sobre o mercado automotivo premium — vendas, tendências, novos modelos, fábricas, recalls de marcas premium.
- Notícia sobre eventos automotivos — salões, exposições de carros, track days, encontros de supercarros.

REJEITAR (isAutomotive = false) SE:
- Cinema, séries, filmes, atores, celebridades, carreira artística, premiações, Hollywood — MESMO que a pessoa interprete um piloto ou que o título mencione Ferrari, Senna, F1 ou alguma marca. Ex: "Gabriel Leone ganha espaço em Hollywood", "ator que viveu Senna", "filme Ferrari estreia", "série sobre a F1 na Netflix". O foco da Attra é o VEÍCULO/CORRIDA/PILOTO REAL — não produções audiovisuais nem a carreira de quem os interpreta.
- Notícia cujo SUJEITO PRINCIPAL é uma pessoa do entretenimento (ator, cantor, influencer, apresentador), ainda que ela seja associada a automobilismo.
- Colunas sociais, notas de inauguração de lojas, eventos de celebridades (mesmo que mencionem marcas como Rolex, BMW, etc. no contexto social).
- Artigos genéricos de marketing, opinião ou tendências que apenas MENCIONAM marcas de luxo como exemplo mas NÃO são sobre os produtos em si.
- Relógios, joias, moda, gastronomia — NÃO são o foco da Attra, mesmo sendo "luxo".
- Carros populares, trânsito, IPVA, multas, Uber.
- Crime, polícia, roubos, mortes, tragédias.
- Política, escândalos, fofoca.
- Notícias puramente negativas ou deprimentes.

IMPORTANTE: A Attra é uma CONCESSIONÁRIA DE CARROS. O foco é 100% automotivo (carros, corridas, pilotos reais). Pergunte-se: "o assunto central é um VEÍCULO, uma CORRIDA ou um PILOTO em atividade?". Se o assunto central for uma pessoa famosa, um filme, uma série ou luxo genérico (relógios, joias, moda) — REJEITE, mesmo que marcas automotivas apareçam no texto.

Retorne APENAS um JSON neste formato, sem markdown:
{
  "isAutomotive": boolean,
  "confidence": number (de 0 a 100, ex: 95 para alta confiança),
  "reason": "string curta explicando a decisão",
  "category": "formula1" | "supercar" | "luxury" | "market" | "other"
}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent classification
            maxOutputTokens: 200,
          },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[NewsGuardrails] Gemini API error:', response.status)
      return { isAutomotive: true, confidence: 50, reason: 'AI validation failed - API error' }
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[NewsGuardrails] Could not parse AI response:', text)
      return { isAutomotive: true, confidence: 50, reason: 'AI validation failed - parse error' }
    }

    const result = JSON.parse(jsonMatch[0]) as ArticleValidation

    // Normalize confidence: if AI returned 0-1 scale, convert to 0-100
    if (result.confidence > 0 && result.confidence <= 1) {
      result.confidence = Math.round(result.confidence * 100)
    }

    console.log(`[NewsGuardrails] "${article.title.substring(0, 50)}..." -> ${result.isAutomotive ? 'ACEITO' : 'REJEITADO'} (${result.confidence}%)`)
    
    return result
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    console.error(`[NewsGuardrails] ${isTimeout ? 'Timeout' : 'Error'}:`, error)
    return { isAutomotive: true, confidence: 50, reason: `AI validation failed - ${isTimeout ? 'timeout' : 'error'}` }
  }
}

/**
 * Batch validate multiple articles
 * Returns only the articles that pass validation
 */
export async function filterArticlesWithAI(
  articles: ArticleInput[],
  minConfidence: number = 70
): Promise<ArticleInput[]> {
  const results = await Promise.all(
    articles.map(async (article) => {
      const validation = await validateArticleWithAI(article)
      return { article, validation }
    })
  )

  return results
    .filter(({ validation }) => validation.isAutomotive && validation.confidence >= minConfidence)
    .map(({ article }) => article)
}

