import { Vehicle } from '@/types'

// Cache for generated descriptions (in-memory for development, use Redis in production)
const descriptionCache = new Map<string, { description: string; generatedAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// API timeout in milliseconds
const API_TIMEOUT = 10000

// Default city for the dealership
const DEFAULT_CITY = 'Uberlândia'

// System prompt for Gemini - uses placeholders that will be replaced with actual vehicle data
const SYSTEM_PROMPT_TEMPLATE = `Gere uma descrição curta e envolvente para a seção "Sobre este veículo" de uma loja de carros premium.

Dados do veículo:
- Marca: [MARCA]
- Modelo: [MODELO]
- Ano modelo: [ANO_MODELO]
- Ano fabricação: [ANO_FABRICACAO]
- Quilometragem: [KM]
- Combustível: [COMBUSTIVEL]
- Câmbio: [CAMBIO]
- Cor: [COR]
- Categoria: [CATEGORIA]
- Potência: [POTENCIA]
- Cidade: [CIDADE]

Instruções de estilo:
- Texto em português do Brasil
- Máximo de 3 frases, focando exclusividade e estado de conservação
- Não repita exatamente o nome completo do modelo mais de uma vez
- Evite termos genéricos como "carro impecável"; seja específico no que torna o veículo especial
- Não invente opcionais ou dados que não estão na lista
- PROIBIDO inventar especificações técnicas não fornecidas. NUNCA mencione: número de cilindros, tipo/configuração de motor (V6, V8, W12, turbo, aspirado, híbrido), cilindrada, tempo 0-100 km/h, velocidade máxima ou tração. Use apenas a potência informada acima, se houver.

Entregue APENAS o parágrafo, sem título, sem bullet points, sem aspas.`

// Category translation map
const categoryLabels: Record<string, string> = {
  sports: 'Esportivo',
  suv: 'SUV',
  sedan: 'Sedã',
  hatch: 'Hatch',
  coupe: 'Cupê',
  luxury: 'Luxo',
  pickup: 'Picape',
  convertible: 'Conversível',
}

// Build prompt with vehicle data
function buildPrompt(vehicle: Vehicle): string {
  const km = vehicle.mileage === 0 ? '0 km (zero quilômetro)' : `${vehicle.mileage.toLocaleString('pt-BR')} km`
  const potencia = vehicle.horsepower ? `${vehicle.horsepower} cv` : 'não informada'
  const categoria = categoryLabels[vehicle.category] || vehicle.category || 'Premium'
  const modelo = vehicle.model + (vehicle.version ? ` ${vehicle.version}` : '')

  return SYSTEM_PROMPT_TEMPLATE
    .replace('[MARCA]', vehicle.brand)
    .replace('[MODELO]', modelo)
    .replace('[ANO_MODELO]', String(vehicle.year_model))
    .replace('[ANO_FABRICACAO]', String(vehicle.year_manufacture))
    .replace('[KM]', km)
    .replace('[COMBUSTIVEL]', vehicle.fuel_type || 'Não informado')
    .replace('[CAMBIO]', vehicle.transmission || 'Não informado')
    .replace('[COR]', vehicle.color || 'Não informada')
    .replace('[CATEGORIA]', categoria)
    .replace('[POTENCIA]', potencia)
    .replace('[CIDADE]', DEFAULT_CITY)
}

// Check if cache is valid
function getCachedDescription(vehicleId: string): string | null {
  const cached = descriptionCache.get(vehicleId)
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return cached.description
  }
  return null
}

// Save to cache
function cacheDescription(vehicleId: string, description: string): void {
  descriptionCache.set(vehicleId, {
    description,
    generatedAt: Date.now(),
  })
}

// Result type for description generation
export interface GenerationResult {
  description: string
  source: 'ai' | 'cache' | 'fallback'
  error?: string
}

// Helper to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Generate description using Gemini API with detailed result
export async function generateVehicleDescriptionWithStatus(vehicle: Vehicle): Promise<GenerationResult> {
  // Check cache first
  const cached = getCachedDescription(vehicle.id)
  if (cached) {
    console.log(`[Gemini] Using cached description for vehicle ${vehicle.id}`)
    return { description: cached, source: 'cache' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[Gemini] API key not configured (GEMINI_API_KEY is undefined or empty)')
    return {
      description: generateFallbackDescription(vehicle),
      source: 'fallback',
      error: 'API key not configured'
    }
  }

  // Log that we have an API key (first 8 chars for debugging)
  console.log(`[Gemini] API key configured (starts with: ${apiKey.substring(0, 8)}...)`)

  try {
    const prompt = buildPrompt(vehicle)

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 750,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ]
        }),
      },
      API_TIMEOUT
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Gemini] API error: ${response.status} - ${errorText}`)
      return {
        description: generateFallbackDescription(vehicle),
        source: 'fallback',
        error: `API error ${response.status}: ${errorText.substring(0, 200)}`
      }
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText || generatedText.trim().length === 0) {
      console.error('[Gemini] No content in response:', JSON.stringify(data).substring(0, 500))
      return {
        description: generateFallbackDescription(vehicle),
        source: 'fallback',
        error: 'Empty response from Gemini'
      }
    }

    // Sanitize output
    const sanitized = sanitizeDescription(generatedText)

    // Cache the result
    cacheDescription(vehicle.id, sanitized)
    console.log(`[Gemini] Generated and cached description for vehicle ${vehicle.id}`)

    return { description: sanitized, source: 'ai' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMessage.includes('aborted') || errorMessage.includes('abort')

    console.error(`[Gemini] ${isTimeout ? 'Timeout' : 'Error'} generating description:`, errorMessage)

    return {
      description: generateFallbackDescription(vehicle),
      source: 'fallback',
      error: isTimeout ? `Timeout after ${API_TIMEOUT}ms` : errorMessage
    }
  }
}

// Generate description using Gemini API (simple wrapper for backward compatibility)
export async function generateVehicleDescription(vehicle: Vehicle): Promise<string> {
  const result = await generateVehicleDescriptionWithStatus(vehicle)
  return result.description
}

// Sanitize AI output
function sanitizeDescription(text: string): string {
  return text
    .replace(/[#*_`]/g, '') // Remove markdown
    .replace(/\n{3,}/g, '\n\n') // Max 2 line breaks
    .trim()
}

// Intelligent fallback description generator with dynamic templates
function generateFallbackDescription(vehicle: Vehicle): string {
  const km = vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage.toLocaleString('pt-BR')} km`
  const categoria = categoryLabels[vehicle.category] || vehicle.category || 'Premium'
  const modeloCurto = vehicle.model.split(' ')[0] // First word of model (e.g., "911" from "911 Carrera")
  const potencia = vehicle.horsepower ? `${vehicle.horsepower} cv` : null
  const cambio = vehicle.transmission?.toLowerCase() || 'automático'
  const combustivel = vehicle.fuel_type || 'flex'
  const cor = vehicle.color || ''
  const anoDisplay = `${vehicle.year_manufacture}/${vehicle.year_model}`

  // Choose template based on available data
  const templateIndex = Math.abs(hashCode(vehicle.id)) % 3

  switch (templateIndex) {
    case 0:
      // Template 1: Focus on performance
      if (potencia) {
        return `Este ${vehicle.brand} ${modeloCurto} ${anoDisplay} combina ${potencia} de potência com câmbio ${cambio}, entregando uma experiência de direção intensa e refinada para os mais exigentes.`
      }
      // Fallback if no horsepower
      return `Este ${vehicle.brand} ${modeloCurto} ${anoDisplay} oferece performance e acabamento premium, com câmbio ${cambio} e toda a sofisticação que você espera de um ${categoria.toLowerCase()}.`

    case 1:
      // Template 2: Focus on condition/conservation
      return `Com apenas ${km} rodados${cor ? `, na cor ${cor}` : ''} e movido a ${combustivel.toLowerCase()}, este ${categoria.toLowerCase()} se destaca pelo visual marcante e pelo cuidado no uso, pronto para quem busca exclusividade em ${DEFAULT_CITY}.`

    case 2:
    default:
      // Template 3: Universal fallback
      return `${categoria} premium em excelente estado, com ${potencia ? potencia + ' de potência, ' : ''}baixa quilometragem e conjunto mecânico ideal para quem busca desempenho e exclusividade em ${DEFAULT_CITY}.`
  }
}

// Simple hash function for consistent template selection
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

