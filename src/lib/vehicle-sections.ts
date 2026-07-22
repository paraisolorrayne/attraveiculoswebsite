/**
 * Vehicle Section Content — orquestra a geração e cache das 3 seções
 * editoriais (OVERVIEW / EXTERIOR DESIGN / INTERIOR) que aparecem na
 * página de detalhe do veículo (estilo Lamborghini Temerario).
 *
 * Estratégia (alinhada com a usuária):
 *   - Heurística simples pra escolher as fotos (índices 0, 5, 15 do
 *     array photos[] devolvido pela Autoconf — padrão Attra é 10
 *     fotos exterior seguidas de 10 interior, então essas posições
 *     pegam capa frontal, lateral exterior e dashboard interior).
 *   - Gemini Text gera a copy editorial de cada seção (factual,
 *     sem poetismo, baseada só nos specs do veículo).
 *   - Resultado é persistido em vehicle_section_content (Supabase) e
 *     invalidado apenas se o número de fotos mudar.
 *
 * Não usamos Gemini Vision: custo ~300x maior e os ganhos de precisão
 * de classificação não compensam dado o padrão da Attra. Se algum dia
 * precisar refinar, basta substituir pickHeuristicPhotos por uma versão
 * que chama Vision.
 */

import { Vehicle } from '@/types'
import { db } from '@/lib/db'
import { GEMINI_TEXT_MODEL } from '@/lib/gemini-config'

// Persistência migrada de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export interface VehicleSectionPart {
  photo_url: string
  copy: string | null
}

export interface VehicleSections {
  overview: VehicleSectionPart
  exterior: VehicleSectionPart
  interior: VehicleSectionPart
  /**
   * 'cache'    — veio direto do Supabase (zero IA call)
   * 'fresh'    — gerado agora com Gemini, e cacheado
   * 'fallback' — sem IA, copy null (fotos OK via heurística)
   */
  source: 'cache' | 'fresh' | 'fallback'
}

const OVERVIEW_PHOTO_INDEX = 0
const EXTERIOR_PHOTO_INDEX = 5
const INTERIOR_PHOTO_INDEX = 15
const GEMINI_TIMEOUT_MS = 10000

type SectionKind = 'overview' | 'exterior' | 'interior'

/**
 * Escolhe a foto de cada seção pelo padrão Attra (heurística por índice).
 * Cai pra photos[0] como último recurso quando o índice alvo não existe.
 */
function pickHeuristicPhoto(photos: string[], targetIndex: number): string {
  return photos[targetIndex] ?? photos[0] ?? ''
}

/**
 * vehicle.id é string no schema mas guarda número (ex: "989248"). Esta
 * conversão é segura porque o autoconf-api preserva o ID inteiro do
 * Autoconf. Se o ID não for numérico, retorna NaN — caller deve checar.
 */
function vehicleIdToNumber(id: string): number {
  return parseInt(id, 10)
}

/**
 * Lê do cache Supabase. Retorna null se não existe ou se o número de
 * fotos mudou (sinal de fotos novas/removidas no Autoconf — invalida).
 */
export async function getCachedVehicleSections(
  vehicleId: string,
  currentPhotoCount: number,
): Promise<VehicleSections | null> {
  const numericId = vehicleIdToNumber(vehicleId)
  if (Number.isNaN(numericId)) return null

  try {
    const data = await db.selectFrom('vehicle_section_content').selectAll()
      .where('vehicle_id', '=', numericId)
      .executeTakeFirst()

    if (!data) return null

    // Invalida cache se número de fotos mudou (fotos foram add/removidas)
    if (data.photo_count !== currentPhotoCount) return null

    return {
      overview: { photo_url: data.overview_photo_url, copy: data.overview_copy },
      exterior: { photo_url: data.exterior_photo_url, copy: data.exterior_copy },
      interior: { photo_url: data.interior_photo_url, copy: data.interior_copy },
      source: 'cache',
    }
  } catch (error) {
    console.error('[vehicle-sections] cache read failed:', error)
    return null
  }
}

/**
 * Fallback estático — heurística sem nenhuma chamada de IA. Usado quando
 * o cache está vazio E não dá pra esperar a geração (ex: SSR sem
 * disposição pra adicionar latência). Próxima visita pega do cache fresh.
 */
export function getFallbackVehicleSections(vehicle: Vehicle): VehicleSections {
  const photos = vehicle.photos ?? []
  return {
    overview: { photo_url: pickHeuristicPhoto(photos, OVERVIEW_PHOTO_INDEX), copy: null },
    exterior: { photo_url: pickHeuristicPhoto(photos, EXTERIOR_PHOTO_INDEX), copy: null },
    interior: { photo_url: pickHeuristicPhoto(photos, INTERIOR_PHOTO_INDEX), copy: null },
    source: 'fallback',
  }
}

/**
 * Prompt informativo (sem poetismo, sem clichês de marketing).
 * Constraints reforçados:
 *   - Use APENAS dados fornecidos
 *   - Tom técnico/factual
 *   - 2 frases curtas e COMPLETAS
 *   - Sem aspas/títulos/markdown
 *   - Output AUTÔNOMO — termine sempre com ponto final
 */
function buildSectionPrompt(vehicle: Vehicle, section: SectionKind): string {
  const sectionInstructions = {
    overview: 'Apresente o veículo em sua essência: marca, modelo, ano, quilometragem e segmento (esportivo, SUV, sedã, conversível etc.). Conecte as informações em frases fluidas, não enumere. Não detalhe especificações de motor.',
    exterior: 'Descreva o design exterior usando APENAS carroceria e cor. Conecte os elementos em uma observação visual coerente. Não cite motor, cilindros, materiais ou detalhes que não estejam nos dados.',
    interior: 'Descreva o interior usando apenas o tipo de câmbio (se informado) e linguagem genérica do segmento — ex: "interior orientado a performance" pra esportivos, "interior espaçoso" pra SUVs. NÃO invente bancos, painel, materiais ou specs de motor.',
  }

  const km = vehicle.mileage === 0
    ? '0 km (zero quilômetro)'
    : `${vehicle.mileage.toLocaleString('pt-BR')} km`
  const potencia = vehicle.horsepower ? `${vehicle.horsepower} cv` : 'não informada'
  const version = vehicle.version ? ` ${vehicle.version}` : ''

  return `Escreva exatamente 2 frases factuais e COMPLETAS para a seção "${section.toUpperCase()}" da página de um veículo premium.

${sectionInstructions[section]}

DADOS DO VEÍCULO (use APENAS estes):
- Marca: ${vehicle.brand}
- Modelo: ${vehicle.model}${version}
- Ano modelo: ${vehicle.year_model}
- Ano fabricação: ${vehicle.year_manufacture}
- Quilometragem: ${km}
- Combustível: ${vehicle.fuel_type ?? 'Não informado'}
- Câmbio: ${vehicle.transmission ?? 'Não informado'}
- Cor: ${vehicle.color ?? 'Não informada'}
- Carroceria: ${vehicle.body_type ?? 'Não informada'}
- Motor: ${vehicle.engine ?? 'Não informado'}
- Potência: ${potencia}
- Categoria: ${vehicle.category ?? 'Premium'}

REGRAS CRÍTICAS:
1. EXATAMENTE 2 frases. Ambas COMPLETAS, terminando com ponto final.
2. Total entre 25 e 45 palavras.
3. Português do Brasil.
4. Texto COESO: as 2 frases devem se conectar logicamente. Não enumere ("Tem X. Tem Y."); descreva ("Conta com X, complementado por Y.").
5. Tom técnico e objetivo. Proibido: "impressionante", "magnífico", "deslumbrante", "marcante", "extraordinário", "luxuoso", "imponente" e clichês similares.
6. Use APENAS os dados acima. NÃO INVENTE: opcionais não listados, materiais do interior, cor de banco, equipamentos não mencionados.
7. PROIBIDO inventar especificações técnicas não fornecidas. NUNCA mencione: número de cilindros, tipo/configuração de motor (V6, V8, W12, turbo, aspirado, híbrido) a menos que conste no campo "Motor" acima; cilindrada; tempo 0-100 km/h; velocidade máxima; tração (4x4/AWD/RWD). Se o campo "Motor" diz "Não informado", NÃO descreva o motor de forma alguma.
8. Se um dado não existir, omita (não escreva "informação não disponível").
9. Mencione o nome completo "marca modelo" no máximo UMA vez.

Entregue APENAS o parágrafo. Sem título, sem aspas, sem listas, sem markdown. Ambas as frases COMPLETAS.`
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Chama Gemini Text. Retorna null em qualquer falha (sem throw — o caller
 * persiste null e a UI mostra fallback estático ou texto vazio).
 */
async function generateSectionCopy(
  vehicle: Vehicle,
  section: SectionKind,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[vehicle-sections] GEMINI_API_KEY não configurada')
    return null
  }

  const prompt = buildSectionPrompt(vehicle, section)

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            topK: 32,
            topP: 0.9,
            // 600 tokens = ~450 palavras. 2 frases curtas (25-45 palavras)
            // cabem com folga >10x. Margem grande pra evitar truncamento
            // quando Gemini decide ser verbose.
            maxOutputTokens: 600,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      },
      GEMINI_TIMEOUT_MS,
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`[vehicle-sections] Gemini ${section} HTTP ${response.status}:`, errorText.substring(0, 200))
      return null
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]
    // Gemini pode retornar múltiplos parts (especialmente com thinking
    // habilitado ou outputs longos). Concatenar TODOS pra não perder
    // o final do texto.
    const parts: Array<{ text?: string }> = candidate?.content?.parts ?? []
    const generated = parts
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')

    if (!generated || generated.trim().length === 0) {
      console.error(`[vehicle-sections] Gemini ${section} retornou texto vazio`)
      return null
    }

    // Detecta truncamento por limite de tokens. Quando MAX_TOKENS, descarta
    // a saída (a frase ficou cortada) — o caller persiste null e o
    // componente cai pro fallback estático. Próxima execução do
    // preprocess vai tentar de novo (idempotente).
    const finishReason = candidate?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      console.warn(
        `[vehicle-sections] Gemini ${section} truncado (MAX_TOKENS). Descartando — fallback estático será usado.`,
      )
      return null
    }

    const sanitized = sanitizeCopy(generated)

    // Heurística adicional: se não termina com pontuação, provavelmente
    // foi cortado em algum ponto. Loga warning mas usa mesmo assim
    // (sanitize pode ter removido pontuação por engano).
    if (!/[.!?]$/.test(sanitized)) {
      console.warn(
        `[vehicle-sections] Gemini ${section} não termina com pontuação (finishReason=${finishReason}). Texto: "${sanitized.substring(0, 100)}..."`,
      )
    }

    return sanitized
  } catch (error) {
    console.error(`[vehicle-sections] Gemini ${section} falhou:`, error instanceof Error ? error.message : error)
    return null
  }
}

function sanitizeCopy(text: string): string {
  return text
    .replace(/[#*_`]/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Pipeline completo: aplica heurística pra escolher fotos + chama Gemini
 * em paralelo pras 3 copies + upsert no Supabase.
 */
export async function generateAndCacheVehicleSections(
  vehicle: Vehicle,
): Promise<VehicleSections> {
  const fallback = getFallbackVehicleSections(vehicle)

  // 3 copies em paralelo
  const [overviewCopy, exteriorCopy, interiorCopy] = await Promise.all([
    generateSectionCopy(vehicle, 'overview'),
    generateSectionCopy(vehicle, 'exterior'),
    generateSectionCopy(vehicle, 'interior'),
  ])

  const sections: VehicleSections = {
    overview: { photo_url: fallback.overview.photo_url, copy: overviewCopy },
    exterior: { photo_url: fallback.exterior.photo_url, copy: exteriorCopy },
    interior: { photo_url: fallback.interior.photo_url, copy: interiorCopy },
    source: 'fresh',
  }

  const numericId = vehicleIdToNumber(vehicle.id)
  if (Number.isNaN(numericId)) {
    console.warn(`[vehicle-sections] vehicle.id "${vehicle.id}" não é numérico, pulando cache`)
    return sections
  }

  try {
    const photoCount = vehicle.photos?.length ?? 0
    const now = new Date()
    const row = {
      vehicle_id: numericId,
      vehicle_slug: vehicle.slug,
      photo_count: photoCount,
      overview_photo_url: sections.overview.photo_url,
      exterior_photo_url: sections.exterior.photo_url,
      interior_photo_url: sections.interior.photo_url,
      overview_copy: sections.overview.copy,
      exterior_copy: sections.exterior.copy,
      interior_copy: sections.interior.copy,
      classified_at: now,
      copy_generated_at: now,
    }

    await db.insertInto('vehicle_section_content').values(row)
      .onConflict((oc) => oc.column('vehicle_id').doUpdateSet({
        vehicle_slug: row.vehicle_slug,
        photo_count: row.photo_count,
        overview_photo_url: row.overview_photo_url,
        exterior_photo_url: row.exterior_photo_url,
        interior_photo_url: row.interior_photo_url,
        overview_copy: row.overview_copy,
        exterior_copy: row.exterior_copy,
        interior_copy: row.interior_copy,
        classified_at: row.classified_at,
        copy_generated_at: row.copy_generated_at,
      }))
      .execute()
  } catch (error) {
    console.error('[vehicle-sections] upsert falhou:', error)
  }

  return sections
}

/**
 * API pública: tenta cache primeiro, se miss gera e cacheia.
 *
 * IMPORTANTE: este caminho é síncrono (aguarda Gemini se cache miss),
 * então a primeira visita ao veículo pode ter +2-4s de latência. Para
 * SSR de prod, prefira chamar `getCachedVehicleSections` direto (instant)
 * e disparar `generateAndCacheVehicleSections` em background — a UI mostra
 * fallback no primeiro load e atualiza no próximo refresh.
 */
export async function getOrGenerateVehicleSections(
  vehicle: Vehicle,
): Promise<VehicleSections> {
  const photoCount = vehicle.photos?.length ?? 0
  const cached = await getCachedVehicleSections(vehicle.id, photoCount)
  if (cached) return cached
  return generateAndCacheVehicleSections(vehicle)
}
