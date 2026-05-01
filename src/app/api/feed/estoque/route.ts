import { NextRequest, NextResponse } from 'next/server'

/**
 * Merchant Feed Endpoint (XML/RSS)
 * 
 * Serves vehicle inventory in Google Merchant Center format
 * Updated hourly via ISR (Incremental Static Regeneration)
 * 
 * URL: GET /api/feed/estoque.xml
 * Content-Type: application/rss+xml; charset=utf-8
 * 
 * Used by: ChatGPT, Google Shopping, Gemini, and other AI platforms
 */

// Types for feed generation
interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  additionalImageLinks: string[]
  price: number
  currency: string
  availability: 'in stock' | 'out of stock'
  condition: 'new' | 'used' | 'refurbished'
  brand: string
  googleProductCategory: string
  customLabels: {
    label0?: string
    label1?: string
    label2?: string
    label3?: string
    label4?: string
  }
  mpn?: string
  gtin?: string
}

/**
 * Escape XML special characters
 * Prevents XML injection and parsing errors
 * Validates input length to prevent DoS attacks
 */
function escapeXml(text: string | undefined | null, maxLength: number = 10000): string {
  if (!text) return ''
  
  // Limit input length to prevent extremely large payloads
  if (text.length > maxLength) {
    console.warn(`XML field exceeded max length of ${maxLength} chars, truncating`)
    text = text.substring(0, maxLength)
  }
  
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validate and sanitize URLs
 * Ensures URLs are properly formatted and safe to include in feed
 * Supports only http and https protocols
 */
function isValidUrl(url: string | undefined): boolean {
  if (!url) return false
  
  try {
    const parsed = new URL(url)
    // Only allow http and https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Generate ETag for cache validation
 * Allows efficient cache validation (304 Not Modified responses)
 */
function generateETag(content: string): string {
  // Simple ETag: hash of content length + first 100 chars + timestamp hour
  const hour = Math.floor(Date.now() / 3600000)
  const key = `${content.length}-${content.substring(0, 100)}-${hour}`
  
  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return `"${Math.abs(hash).toString(16)}"`
}

/**
 * Get vehicle inventory from data source
 * In production, this should:
 * - Query Supabase/PostgreSQL for vehicles
 * - Include Cloudinary image URLs
 * - Filter out unavailable vehicles
 */
interface VehicleData {
  id: string
  marca_nome: string
  modelopai_nome: string
  anomodelo: number
  valorvenda: string
  status_id: number
  km?: number
  cambio_nome?: string
  cor_nome?: string
  foto?: string
  fotos?: string[]
}

async function getVehicleInventory(): Promise<VehicleData[]> {
  try {
    // Import the real data source using dynamic import
    // This works with both development and production builds
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const { cwd } = await import('process')
    
    // Read the JSON file from the project root
    const filePath = join(cwd(), 'list_vehicle.json')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Extract vehicles from response structure
    // The API returns an array of pagination objects, we want the first one
    const response = Array.isArray(data) ? data[0] : data
    const vehicles = response?.veiculos || []
    
    // Transform to VehicleData format
    return vehicles.map((v: Record<string, unknown>) => {
      const fotos = Array.isArray(v.fotos)
        ? (v.fotos as Array<{ url?: string }>).map(f => f?.url).filter((u): u is string => !!u)
        : undefined

      return {
        id: String(v.id),
        marca_nome: String(v.marca_nome || ''),
        modelopai_nome: String(v.modelopai_nome || ''),
        anomodelo: Number(v.anomodelo) || new Date().getFullYear(),
        valorvenda: String(v.valorvenda || '0'),
        status_id: Number(v.status_id) || 0,
        km: Number(v.km) || 0,
        cambio_nome: v.cambio_nome ? String(v.cambio_nome) : undefined,
        cor_nome: v.cor_nome ? String(v.cor_nome) : undefined,
        foto: v.foto ? String(v.foto) : undefined,
        fotos,
      }
    })
  } catch (error) {
    console.error('Error loading vehicle inventory:', error)
    // Return empty array on error (feed will be empty but valid)
    return []
  }
}

/**
 * Convert vehicle to feed item format
 * Maps internal vehicle data to Google Merchant format
 */
function vehicleToFeedItem(vehicle: VehicleData): FeedItem {
  // Extract core properties
  const brand = vehicle.marca_nome || 'Unknown'
  const model = vehicle.modelopai_nome || 'Unknown'
  const year = vehicle.anomodelo || new Date().getFullYear()
  const price = parseFloat(vehicle.valorvenda) || 0
  
  // Generate unique ID
  const id = `ATTRA-${brand.toUpperCase().slice(0, 3)}-${year}-${vehicle.id || Math.random().toString(36).substr(2, 9)}`
  
  // Build title (concise)
  const title = `${brand} ${model} ${year}`
  
  // Build description with key features
  const km = vehicle.km ? `${vehicle.km.toLocaleString('pt-BR')} km` : 'Detalhes disponíveis'
  const transmission = vehicle.cambio_nome ? `câmbio ${vehicle.cambio_nome}` : ''
  const color = vehicle.cor_nome ? `cor ${vehicle.cor_nome}` : ''
  const features = [km, transmission, color].filter(Boolean).join(', ')
  
  const description = `${brand} ${model} ${year} com ${features}. Curadoria premium Attra Veículos. Veículo certificado de qualidade.`
  
  // Generate link (always valid since we control the format)
  const link = `https://attraveiculos.com.br/estoque/${encodeURIComponent(vehicle.id)}`
  
  // Get images (validate URLs for security)
  const defaultImageUrl = 'https://via.placeholder.com/500x400?text=Attra+Veiculo'
  const imageLink = isValidUrl(vehicle.foto) ? vehicle.foto : defaultImageUrl
  const additionalImageLinks = (vehicle.fotos || [])
    .filter(url => isValidUrl(url))
    .slice(0, 10)
  
  // Determine availability
  const availability = vehicle.status_id === 9 ? 'in stock' : 'out of stock'
  
  // Custom labels for AI discovery
  const customLabels: FeedItem['customLabels'] = {
    label0: 'Premium Curated', // Always
    label1: 'Pronta Entrega', // If available
    label2: vehicle.cambio_nome?.toLowerCase().includes('automático') ? 'Automático' : undefined,
    label3: (vehicle.km || 999999) <= 5000 ? 'Baixa Quilometragem' : undefined,
  }
  
  return {
    id,
    title,
    description,
    link,
    imageLink,
    additionalImageLinks,
    price,
    currency: 'BRL',
    availability,
    condition: 'used', // Attra primarily sells used vehicles
    brand,
    googleProductCategory: 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars',
    customLabels,
    mpn: `${brand.toUpperCase()}-${year}-${vehicle.id}`,
    gtin: `ATTRA-SKU-${vehicle.id}`,
  }
}

/**
 * Generate XML RSS feed
 * Builds complete Google Merchant Center compatible feed
 */
function generateXmlFeed(items: FeedItem[]): string {
  const now = new Date()
  const lastBuildDate = now.toUTCString()
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`
  xml += `  <channel>\n`
  xml += `    <title>Attra Veículos - Estoque Premium</title>\n`
  xml += `    <link>https://attraveiculos.com.br</link>\n`
  xml += `    <description>Curadoria de veículos premium e alto padrão no Brasil</description>\n`
  xml += `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n`
  xml += `    <language>pt-br</language>\n`
  xml += `    <image>\n`
  xml += `      <url>https://attraveiculos.com.br/logo.png</url>\n`
  xml += `      <title>Attra Veículos</title>\n`
  xml += `      <link>https://attraveiculos.com.br</link>\n`
  xml += `    </image>\n\n`
  
  // Add items
  for (const item of items) {
    xml += `    <item>\n`
    xml += `      <g:id>${escapeXml(item.id)}</g:id>\n`
    xml += `      <g:title>${escapeXml(item.title)}</g:title>\n`
    xml += `      <g:description>${escapeXml(item.description)}</g:description>\n`
    xml += `      <g:link>${escapeXml(item.link)}</g:link>\n`
    xml += `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>\n`
    
    // Additional images
    for (const additionalImage of item.additionalImageLinks) {
      xml += `      <g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>\n`
    }
    
    xml += `      <g:price>${item.price.toFixed(2)} ${item.currency}</g:price>\n`
    xml += `      <g:availability>${item.availability}</g:availability>\n`
    xml += `      <g:condition>${item.condition}</g:condition>\n`
    xml += `      <g:brand>${escapeXml(item.brand)}</g:brand>\n`
    xml += `      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>\n`
    
    // Custom labels (only if defined)
    if (item.customLabels.label0) {
      xml += `      <g:custom_label_0>${escapeXml(item.customLabels.label0)}</g:custom_label_0>\n`
    }
    if (item.customLabels.label1) {
      xml += `      <g:custom_label_1>${escapeXml(item.customLabels.label1)}</g:custom_label_1>\n`
    }
    if (item.customLabels.label2) {
      xml += `      <g:custom_label_2>${escapeXml(item.customLabels.label2)}</g:custom_label_2>\n`
    }
    if (item.customLabels.label3) {
      xml += `      <g:custom_label_3>${escapeXml(item.customLabels.label3)}</g:custom_label_3>\n`
    }
    if (item.customLabels.label4) {
      xml += `      <g:custom_label_4>${escapeXml(item.customLabels.label4)}</g:custom_label_4>\n`
    }
    
    if (item.mpn) {
      xml += `      <g:mpn>${escapeXml(item.mpn)}</g:mpn>\n`
    }
    if (item.gtin) {
      xml += `      <g:gtin>${escapeXml(item.gtin)}</g:gtin>\n`
    }
    
    xml += `    </item>\n\n`
  }
  
  xml += `  </channel>\n`
  xml += `</rss>`
  
  return xml
}

/**
 * Main handler for GET requests
 * Generates and serves the vehicle feed with optimized caching
 * Supports ETag validation for efficient cache hits (304 Not Modified)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const maxFeedSize = 10 * 1024 * 1024 // 10 MB max feed size (DoS protection)
  
  try {
    // Log request
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    console.log({
      timestamp: new Date().toISOString(),
      event: 'feed_request',
      userAgent: userAgent.substring(0, 100),
      client: clientIp.substring(0, 50),
    })
    
    // Get vehicle inventory
    const vehicles = await getVehicleInventory()
    
    // Convert to feed items
    const feedItems = vehicles
      .filter((v) => v && v.id) // Filter out invalid entries
      .map(vehicleToFeedItem)
    
    // Generate XML
    const xmlContent = generateXmlFeed(feedItems)
    
    // Basic XML validation
    if (!xmlContent.startsWith('<?xml')) {
      throw new Error('Invalid XML structure generated')
    }
    
    // DoS Protection: Check feed size
    if (xmlContent.length > maxFeedSize) {
      throw new Error(`Feed size exceeds maximum allowed (${xmlContent.length} > ${maxFeedSize} bytes)`)
    }
    
    // Generate cache validation headers
    const etag = generateETag(xmlContent)
    const ifNoneMatch = request.headers.get('if-none-match')
    
    // Check if client has valid cached version
    if (ifNoneMatch === etag) {
      console.log({
        timestamp: new Date().toISOString(),
        event: 'cache_hit_etag',
        itemCount: feedItems.length,
        durationMs: Date.now() - startTime,
      })
      
      // Return 304 Not Modified (browser/CDN uses cached version)
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      })
    }
    
    // Log success
    const duration = Date.now() - startTime
    console.log({
      timestamp: new Date().toISOString(),
      event: 'feed_generated',
      itemCount: feedItems.length,
      sizeBytes: xmlContent.length,
      durationMs: duration,
    })
    
    // Return response with comprehensive cache headers
    const lastModified = new Date()
    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // ISR: 1h cache + 2h stale
        'ETag': etag,
        'Last-Modified': lastModified.toUTCString(),
        'X-Generated-At': new Date().toISOString(),
        'X-Item-Count': feedItems.length.toString(),
      },
    })
  } catch (error) {
    // Log error
    console.error({
      timestamp: new Date().toISOString(),
      event: 'feed_error',
      error: error instanceof Error ? error.message : String(error),
    })
    
    // Return error feed (valid XML but with error message)
    // Note: Error feeds are NOT cached (no-cache directive)
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Attra Veículos - Feed Error</title>
    <link>https://attraveiculos.com.br</link>
    <description>Erro ao gerar o feed de estoque</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`
    
    return new NextResponse(errorXml, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
}

// Optional: HEAD request for feed status check
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
