/**
 * AutoConf API Integration
 * Handles fetching vehicle data from AutoConf API
 */

import { Vehicle } from '@/types'
import { realInventoryVehicles } from './vehicle-inventory-data'
import {
  appendVehicleToSnapshot,
  loadLatestAdsHomeSnapshot,
  loadLatestListSnapshot,
  loadLatestVehicleSnapshot,
  saveInventorySnapshot,
  InventorySnapshotSources,
} from './inventory-snapshot'

// AutoConf API Types
export interface AutoConfVehicle {
  id: number
  modelo_id: number
  modelo_nome: string
  modelo_slug: string
  modelopai_id: number
  modelopai_nome: string
  modelopai_slug: string
  marca_id: number
  marca_nome: string
  marca_slug: string
  tipo_id: number
  tipo_nome: string
  tipo_slug: string
  cor_id: number
  cor_nome: string
  cor_slug: string
  combustivel_id: number
  combustivel_nome: string
  combustivel_slug: string
  cambio_id: number
  cambio_nome: string
  cambio_slug: string
  carroceria_id: number | null
  carroceria_nome: string | null
  carroceria_slug: string | null
  anofabricacao: string
  anomodelo: string
  km: number
  potencia: number | null
  valorvenda: string
  valorpromocao: string | null
  zero_km: number
  foto: string
  fotos: Array<{ url: string }>
  versao_descricao: string | null
  acessorios: Array<{ nome: string; id: number; categoria: string | null; destaque: number; slug: string }>
  acessorios_destaque: Array<{ nome: string; id: number; categoria: string | null; destaque: number; slug: string }>
  filtro: string
  filtroTipo: string
  prioridade: number
  prioridade_veiculo: number
  status_id: number
  publicacao: string
  placa: string
  placa_completa: string
  sugestoes: number[]
  favorito: boolean
}

/**
 * Clean version string by removing model name prefix and technical specs
 * Example: "911 Turbo S Coupe 3.6/3.8 24V (991/992)" with model "911"
 * Returns: "Turbo S Coupe"
 */
export function cleanVersionString(modeloNome: string, modeloPaiNome: string): string | null {
  if (!modeloNome || modeloNome === modeloPaiNome) {
    return null
  }

  let version = modeloNome

  // Remove model name prefix if version starts with it
  const modelLower = modeloPaiNome.toLowerCase()
  const versionLower = version.toLowerCase()

  if (versionLower.startsWith(modelLower)) {
    version = version.substring(modeloPaiNome.length).trim()
  }

  // Remove technical specifications patterns
  // Engine displacement: "3.6/3.8", "2.0", "3.0" etc.
  version = version.replace(/\s*\d+\.\d+(?:\/\d+\.\d+)?\s*/g, ' ')

  // Valve configuration: "24V", "16V" etc.
  version = version.replace(/\s*\d+V\s*/gi, ' ')

  // Generation codes in parentheses: "(991/992)", "(G20)", "(F10)" etc.
  version = version.replace(/\s*\([^)]*\)\s*/g, ' ')

  // Engine codes: "TB", "TSI", "TFSI", "BiTurbo" - keep these as they're part of trim name
  // But remove standalone technical markers

  // Capacity in liters: "3.0L", "2.0L" etc.
  version = version.replace(/\s*\d+\.\d+L\s*/gi, ' ')

  // Clean up multiple spaces and trim
  version = version.replace(/\s+/g, ' ').trim()

  // If version is empty or just whitespace after cleaning, return null
  if (!version || version.length < 2) {
    return null
  }

  return version
}

export interface AutoConfResponse {
  count: number
  registros_por_pagina: string
  pagina_atual: number
  ultima_pagina: number
  veiculos: AutoConfVehicle[]
}

export interface AutoConfFilters {
  tipo?: 'carros' | 'motos' | 'caminhoes'
  pagina?: number
  registros_por_pagina?: number
  marca_id?: number
  modelo_id?: number
  ano_de?: number
  ano_ate?: number
  preco_de?: number
  preco_ate?: number
  km_de?: number
  km_ate?: number
  combustivel_id?: number
  cambio_id?: number
  cor_id?: number
  ordenar?: 'preco' | 'ano' | 'km' | 'publicacao'
  ordem?: 'asc' | 'desc'
}

const AUTOCONF_BASE_URL = 'https://api.autoconf.com.br/api/v1'
const BEARER_TOKEN = process.env.AUTOCONF_BEARER_TOKEN || ''
const DEALER_TOKEN = process.env.AUTOCONF_DEALER_TOKEN || ''

/**
 * Fetch vehicles from AutoConf API
 */
export async function fetchAutoConfVehicles(filters: AutoConfFilters = {}): Promise<AutoConfResponse> {
  const formData = new URLSearchParams()
  formData.append('token', DEALER_TOKEN)
  formData.append('tipo', filters.tipo || 'carros')
  formData.append('pagina', String(filters.pagina || 1))
  formData.append('registros_por_pagina', String(filters.registros_por_pagina || 20))

  if (filters.marca_id) formData.append('marca_id', String(filters.marca_id))
  if (filters.modelo_id) formData.append('modelo_id', String(filters.modelo_id))
  if (filters.ano_de) formData.append('ano_de', String(filters.ano_de))
  if (filters.ano_ate) formData.append('ano_ate', String(filters.ano_ate))
  if (filters.preco_de) formData.append('preco_de', String(filters.preco_de))
  if (filters.preco_ate) formData.append('preco_ate', String(filters.preco_ate))
  if (filters.km_de) formData.append('km_de', String(filters.km_de))
  if (filters.km_ate) formData.append('km_ate', String(filters.km_ate))
  if (filters.combustivel_id) formData.append('combustivel_id', String(filters.combustivel_id))
  if (filters.cambio_id) formData.append('cambio_id', String(filters.cambio_id))
  if (filters.cor_id) formData.append('cor_id', String(filters.cor_id))
  if (filters.ordenar) formData.append('ordenar', filters.ordenar)
  if (filters.ordem) formData.append('ordem', filters.ordem)

  const response = await fetch(`${AUTOCONF_BASE_URL}/veiculos`, {
    method: 'POST',
    headers: {
      'Authorization': BEARER_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error(`AutoConf API error: ${response.status} - ${text}`)
    throw new Error(`AutoConf API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as AutoConfResponse
  // Cache only the broad "first-page no-filters, large page size" response so
  // small-page-size calls (e.g. getRelatedVehicles with 5 items) don't
  // overwrite a comprehensive 100-vehicle snapshot from the listing page.
  const pageSize = filters.registros_por_pagina ?? 20
  const isBroadQuery = !filters.marca_id && !filters.modelo_id && !filters.preco_de
    && !filters.preco_ate && !filters.ano_de && !filters.ano_ate
    && !filters.km_de && !filters.km_ate && !filters.combustivel_id
    && !filters.cambio_id && !filters.cor_id
    && pageSize >= 50
  if (isBroadQuery && (data.veiculos?.length ?? 0) > 0) {
    void saveInventorySnapshot(
      InventorySnapshotSources.list,
      data,
      data.veiculos.length,
    )
  }
  return data
}

/**
 * Ads Home vehicle structure (from /ads-home endpoint)
 * Contains additional fields for featured/promotional vehicles
 */
interface AdsHomeVehicle extends AutoConfVehicle {
  veiculo_id?: number
  ordem?: number
}

/**
 * Desktop banner from /ads-home endpoint
 * Used for promotional banners configured in CRM
 */
export interface AdsDesktopBanner {
  url: string        // Image URL
  target: string     // Destination URL when clicked
  ordem?: number     // Display order (optional)
}

/**
 * Complete response structure from /ads-home endpoint
 */
export interface AdsHomeResponse {
  adsDesktop: AdsDesktopBanner[]  // Promotional banners for desktop
  adsMobile: AdsDesktopBanner[]   // Promotional banners for mobile
  destaques: AdsHomeVehicle[]     // Featured vehicles
}

/**
 * Hero slide that can be either a banner or a vehicle
 */
export interface HeroSlideData {
  type: 'banner' | 'vehicle'
  image: string
  targetUrl: string
  vehicle?: Vehicle              // Only present for vehicle slides
  ordem: number
}

/**
 * Fetch featured/promotional content from AutoConf API
 * Uses the /ads-home endpoint which returns:
 * - adsDesktop: Promotional banners (priority 1)
 * - destaques: Featured vehicles (priority 2)
 */
export async function fetchAdsHome(): Promise<AdsHomeResponse> {
  const emptyResponse: AdsHomeResponse = { adsDesktop: [], adsMobile: [], destaques: [] }
  const formData = new URLSearchParams()
  formData.append('token', DEALER_TOKEN)

  try {
    const response = await fetch(`${AUTOCONF_BASE_URL}/ads-home`, {
      method: 'POST',
      headers: {
        'Authorization': BEARER_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`AutoConf Ads Home API error: ${response.status}`)
      const cached = await loadLatestAdsHomeSnapshot<AdsHomeResponse>().catch(() => null)
      if (cached) {
        console.warn('[fetchAdsHome] Non-OK status — using Supabase snapshot fallback')
        return cached
      }
      return emptyResponse
    }

    const data = await response.json()
    console.log('[fetchAdsHome] Raw response keys:', Object.keys(data))

    // Extract adsDesktop banners
    const adsDesktop: AdsDesktopBanner[] = (data.adsDesktop || []).map((banner: { url?: string; target?: string; ordem?: number }, index: number) => ({
      url: banner.url || '',
      target: banner.target || '',
      ordem: banner.ordem ?? index,
    })).filter((b: AdsDesktopBanner) => b.url) // Filter out empty banners

    // Extract adsMobile banners
    const adsMobile: AdsDesktopBanner[] = (data.adsMobile || []).map((banner: { url?: string; target?: string; ordem?: number }, index: number) => ({
      url: banner.url || '',
      target: banner.target || '',
      ordem: banner.ordem ?? index,
    })).filter((b: AdsDesktopBanner) => b.url) // Filter out empty banners

    // Extract destaques vehicles
    const destaques: AdsHomeVehicle[] = (data.destaques || [])
      .map((vehicle: AdsHomeVehicle) => ({
        ...vehicle,
        id: vehicle.veiculo_id ?? vehicle.id,
      }))
      .sort((a: AdsHomeVehicle, b: AdsHomeVehicle) => {
        const ordemA = a.ordem ?? 999
        const ordemB = b.ordem ?? 999
        return ordemA - ordemB
      })

    console.log(`[fetchAdsHome] Found ${adsDesktop.length} desktop banners, ${adsMobile.length} mobile banners, ${destaques.length} vehicles`)

    const result: AdsHomeResponse = { adsDesktop, adsMobile, destaques }
    if (adsDesktop.length || adsMobile.length || destaques.length) {
      void saveInventorySnapshot(
        InventorySnapshotSources.adsHome,
        result,
        destaques.length,
      )
    }
    return result
  } catch (error) {
    console.error('Error fetching ads home:', error)
    const cached = await loadLatestAdsHomeSnapshot<AdsHomeResponse>().catch(() => null)
    if (cached) {
      console.warn('[fetchAdsHome] Using Supabase snapshot fallback')
      return cached
    }
    return emptyResponse
  }
}

/**
 * Fetch a single vehicle by ID from AutoConf API
 */
export async function fetchAutoConfVehicleById(vehicleId: number): Promise<AutoConfVehicle | null> {
  const formData = new URLSearchParams()
  formData.append('token', DEALER_TOKEN)
  formData.append('id', String(vehicleId))

  const response = await fetch(`${AUTOCONF_BASE_URL}/veiculo`, {
    method: 'POST',
    headers: {
      'Authorization': BEARER_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    console.error(`AutoConf API error fetching vehicle ${vehicleId}: ${response.status}`)
    return null
  }

  const data = await response.json()
  const veiculo = (data.veiculo || null) as AutoConfVehicle | null
  if (veiculo) {
    void appendVehicleToSnapshot(vehicleId, veiculo)
  }
  return veiculo
}

/**
 * Map AutoConf vehicle to our Vehicle interface
 */
export function mapAutoConfToVehicle(autoconfVehicle: AutoConfVehicle): Vehicle {
  const slug = generateVehicleSlug(autoconfVehicle)
  // Safely handle missing acessorios arrays (not always present in /ads-home endpoint)
  const acessorios = autoconfVehicle.acessorios || []
  const acessoriosDestaque = autoconfVehicle.acessorios_destaque || []
  const options = [
    ...acessorios.map(a => a.nome),
    ...acessoriosDestaque.map(a => a.nome),
  ]
  const uniqueOptions = [...new Set(options)]

  // Determine category based on price and brand
  const price = parseFloat(autoconfVehicle.valorvenda)
  const category = determineCategoryFromVehicle(autoconfVehicle, price)

  // Determine if vehicle is imported based on brand
  const importedBrands = ['Ferrari', 'Lamborghini', 'McLaren', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Maserati']
  const isImported = importedBrands.some(b => autoconfVehicle.marca_nome.toLowerCase().includes(b.toLowerCase()))

  // Safely handle potentially missing fields from /ads-home endpoint
  const km = autoconfVehicle.km ?? 0
  const kmFormatted = km.toLocaleString('pt-BR')

  return {
    id: String(autoconfVehicle.id),
    slug,
    brand: autoconfVehicle.marca_nome || 'Desconhecido',
    model: autoconfVehicle.modelopai_nome || 'Modelo',
    version: cleanVersionString(autoconfVehicle.modelo_nome, autoconfVehicle.modelopai_nome)
      || autoconfVehicle.versao_descricao || null,
    year_manufacture: parseInt(autoconfVehicle.anofabricacao) || 0,
    year_model: parseInt(autoconfVehicle.anomodelo) || 0,
    color: autoconfVehicle.cor_nome || 'Não informado',
    mileage: km,
    fuel_type: autoconfVehicle.combustivel_nome || 'Não informado',
    transmission: autoconfVehicle.cambio_nome || 'Não informado',
    price,
    category,
    body_type: autoconfVehicle.carroceria_nome || 'Outros',
    location_id: '1', // Default location
    photos: autoconfVehicle.fotos?.map(f => f.url) || (autoconfVehicle.foto ? [autoconfVehicle.foto] : []),
    videos: null,
    options: uniqueOptions.length > 0 ? uniqueOptions : null,
    description: generateDescription(autoconfVehicle),
    seo_title: `${autoconfVehicle.marca_nome || 'Veículo'} ${autoconfVehicle.modelopai_nome || ''} ${autoconfVehicle.anomodelo || ''} | Attra Veículos`,
    seo_description: `${autoconfVehicle.marca_nome || 'Veículo'} ${autoconfVehicle.modelopai_nome || ''} ${autoconfVehicle.anomodelo || ''} com ${kmFormatted} km. Compre com a Attra Veículos.`,
    status: 'available',
    is_featured: (autoconfVehicle.prioridade_veiculo ?? 0) > 0,
    is_new: autoconfVehicle.zero_km === 1,
    created_at: autoconfVehicle.publicacao || new Date().toISOString(),
    updated_at: autoconfVehicle.publicacao || new Date().toISOString(),
    crm_id: String(autoconfVehicle.id),
    horsepower: autoconfVehicle.potencia ?? null,
    torque: null,
    acceleration: null,
    top_speed: null,
    engine: null,
    origin: isImported ? 'imported' : 'national',
    audio_url: null,
  }
}

/**
 * Generate a URL-friendly slug for the vehicle
 */
function generateVehicleSlug(vehicle: AutoConfVehicle): string {
  const base = `${vehicle.marca_nome}-${vehicle.modelopai_nome}-${vehicle.anomodelo}`
  return base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + `-${vehicle.id}`
}

/**
 * Determine vehicle category based on characteristics
 */
function determineCategoryFromVehicle(vehicle: AutoConfVehicle, price: number): string {
  const brand = vehicle.marca_nome.toLowerCase()

  // Supercars/Sports
  const supercarBrands = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
  if (supercarBrands.some(b => brand.includes(b))) return 'supercar'

  // Sports cars
  const sportsBrands = ['porsche', 'aston martin', 'maserati', 'lotus']
  if (sportsBrands.some(b => brand.includes(b))) return 'sports'

  // Luxury
  const luxuryBrands = ['bentley', 'rolls-royce', 'maybach']
  if (luxuryBrands.some(b => brand.includes(b))) return 'luxury'

  // Premium
  const premiumBrands = ['bmw', 'mercedes', 'audi', 'lexus', 'land rover', 'range rover', 'jaguar', 'volvo']
  if (premiumBrands.some(b => brand.includes(b))) return 'premium'

  // SUV based on body type
  if (vehicle.carroceria_nome?.toLowerCase().includes('suv')) return 'suv'

  // Price-based fallback
  if (price >= 500000) return 'luxury'
  if (price >= 200000) return 'premium'

  return 'executive'
}

/**
 * Generate a description for the vehicle
 */
function generateDescription(vehicle: AutoConfVehicle): string {
  const isNew = vehicle.zero_km === 1
  const km = (vehicle.km ?? 0).toLocaleString('pt-BR')
  const brand = vehicle.marca_nome || 'Veículo'
  const model = vehicle.modelopai_nome || ''
  const year = vehicle.anomodelo || ''
  const fuel = vehicle.combustivel_nome || 'não informado'
  const transmission = vehicle.cambio_nome || 'não informado'
  const version = vehicle.versao_descricao || ''

  if (isNew) {
    return `${brand} ${model} ${year} 0km. ${version} Motor ${fuel}, câmbio ${transmission}. Verifique a disponibilidade com nossos consultores.`
  }

  return `${brand} ${model} ${year} com apenas ${km} km rodados. ${version} Motor ${fuel}, câmbio ${transmission}. Documentação em dia, pronto para entrega.`
}

// Use real inventory data from list_vehicle.json as fallback
// This provides realistic vehicle data when the AutoConf API is unavailable
const mockVehicles: Vehicle[] = realInventoryVehicles

/**
 * Fetch and map vehicles with error handling
 */
export async function getVehicles(filters: AutoConfFilters = {}): Promise<{
  vehicles: Vehicle[]
  total: number
  page: number
  totalPages: number
}> {
  try {
    const response = await fetchAutoConfVehicles(filters)

    return {
      vehicles: response.veiculos.map(mapAutoConfToVehicle),
      total: response.count,
      page: response.pagina_atual,
      totalPages: response.ultima_pagina,
    }
  } catch (error) {
    console.error('Error fetching vehicles from AutoConf:', error)
    const page = filters.pagina || 1
    const perPage = filters.registros_por_pagina || 20

    // Tier 1 fallback: last successful snapshot from Supabase
    const snapshot = await loadLatestListSnapshot().catch(() => null)
    if (snapshot && snapshot.veiculos?.length) {
      console.warn(`[autoconf] Using Supabase snapshot fallback (${snapshot.veiculos.length} vehicles)`)
      const start = (page - 1) * perPage
      const end = start + perPage
      return {
        vehicles: snapshot.veiculos.map(mapAutoConfToVehicle).slice(start, end),
        total: snapshot.veiculos.length,
        page,
        totalPages: Math.ceil(snapshot.veiculos.length / perPage),
      }
    }

    // Tier 2 fallback: bundled JSON (stale but always available)
    console.warn('[autoconf] Using bundled inventory fallback')
    const start = (page - 1) * perPage
    const end = start + perPage
    return {
      vehicles: mockVehicles.slice(start, end),
      total: mockVehicles.length,
      page,
      totalPages: Math.ceil(mockVehicles.length / perPage),
    }
  }
}

/**
 * Fetch a single vehicle by ID and map to our interface
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const numericId = parseInt(id)
  try {
    if (isNaN(numericId)) {
      return mockVehicles.find(v => v.id === id) || null
    }

    const autoconfVehicle = await fetchAutoConfVehicleById(numericId)
    if (autoconfVehicle) {
      return mapAutoConfToVehicle(autoconfVehicle)
    }

    // API responded but vehicle not found — try snapshot then bundled
    const snapshotVehicle = await loadLatestVehicleSnapshot(numericId).catch(() => null)
    if (snapshotVehicle) return mapAutoConfToVehicle(snapshotVehicle)

    const listSnapshot = await loadLatestListSnapshot().catch(() => null)
    const fromList = listSnapshot?.veiculos.find(v => v.id === numericId)
    if (fromList) return mapAutoConfToVehicle(fromList)

    return mockVehicles.find(v => v.id === id) || null
  } catch (error) {
    console.error('Error fetching vehicle by ID:', error)
    if (!isNaN(numericId)) {
      const snapshotVehicle = await loadLatestVehicleSnapshot(numericId).catch(() => null)
      if (snapshotVehicle) return mapAutoConfToVehicle(snapshotVehicle)
      const listSnapshot = await loadLatestListSnapshot().catch(() => null)
      const fromList = listSnapshot?.veiculos.find(v => v.id === numericId)
      if (fromList) return mapAutoConfToVehicle(fromList)
    }
    return mockVehicles.find(v => v.id === id) || null
  }
}

/**
 * Get vehicle by slug
 * Slug format: marca-modelo-ano-ID (e.g., porsche-911-carrera-2024-295110)
 */
export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  try {
    // Extract the ID from the end of the slug
    const slugParts = slug.split('-')
    const potentialId = slugParts[slugParts.length - 1]

    // If the last part is a number, try to fetch directly by ID
    if (potentialId && /^\d+$/.test(potentialId)) {
      const vehicleId = parseInt(potentialId, 10)
      const autoconfVehicle = await fetchAutoConfVehicleById(vehicleId)
      if (autoconfVehicle) {
        return mapAutoConfToVehicle(autoconfVehicle)
      }
    }

    // Fallback: search in vehicle list
    const response = await fetchAutoConfVehicles({
      tipo: 'carros',
      registros_por_pagina: 100,
    })

    const vehicle = response.veiculos.find(v => {
      const vehicleSlug = generateVehicleSlug(v)
      return vehicleSlug === slug
    })

    if (!vehicle) return null
    return mapAutoConfToVehicle(vehicle)
  } catch (error) {
    console.error('Error fetching vehicle by slug:', error)
    const slugParts = slug.split('-')
    const potentialId = slugParts[slugParts.length - 1]
    if (potentialId && /^\d+$/.test(potentialId)) {
      const vehicleId = parseInt(potentialId, 10)
      const snapshotVehicle = await loadLatestVehicleSnapshot(vehicleId).catch(() => null)
      if (snapshotVehicle) return mapAutoConfToVehicle(snapshotVehicle)
    }
    const listSnapshot = await loadLatestListSnapshot().catch(() => null)
    const fromList = listSnapshot?.veiculos.find(v => generateVehicleSlug(v) === slug)
    if (fromList) return mapAutoConfToVehicle(fromList)
    return mockVehicles.find(v => v.slug === slug) || null
  }
}

/**
 * Get related/similar vehicles using the sugestoes IDs from the current vehicle
 */
export async function getRelatedVehicles(currentId: string, brand: string, limit = 4): Promise<Vehicle[]> {
  try {
    const numericId = parseInt(currentId, 10)

    // First, get the current vehicle to access its sugestoes
    if (!isNaN(numericId)) {
      const currentVehicle = await fetchAutoConfVehicleById(numericId)

      if (currentVehicle && currentVehicle.sugestoes && currentVehicle.sugestoes.length > 0) {
        // Fetch each suggested vehicle by ID (limit to requested amount)
        const suggestedIds = currentVehicle.sugestoes.slice(0, limit)
        const suggestedVehicles = await Promise.all(
          suggestedIds.map(id => fetchAutoConfVehicleById(id))
        )

        // Filter out null results and map to Vehicle interface
        return suggestedVehicles
          .filter((v): v is AutoConfVehicle => v !== null)
          .map(mapAutoConfToVehicle)
      }
    }

    // Fallback: if no sugestoes, get random vehicles from the list
    const response = await fetchAutoConfVehicles({
      tipo: 'carros',
      registros_por_pagina: limit + 1,
    })

    const filtered = response.veiculos
      .filter(v => String(v.id) !== currentId)
      .slice(0, limit)

    return filtered.map(mapAutoConfToVehicle)
  } catch (error) {
    console.error('Error fetching related vehicles:', error)
    const listSnapshot = await loadLatestListSnapshot().catch(() => null)
    if (listSnapshot?.veiculos.length) {
      return listSnapshot.veiculos
        .filter(v => String(v.id) !== currentId)
        .slice(0, limit)
        .map(mapAutoConfToVehicle)
    }
    return mockVehicles
      .filter(v => v.id !== currentId)
      .slice(0, limit)
  }
}

/**
 * Deduplicate vehicles based on brand + model + year
 * Keeps the first occurrence (usually most expensive when sorted by price desc)
 */
function deduplicateVehicles(vehicles: AutoConfVehicle[]): AutoConfVehicle[] {
  const seen = new Set<string>()
  return vehicles.filter(vehicle => {
    const key = `${vehicle.marca_nome.toLowerCase()}-${vehicle.modelopai_nome.toLowerCase()}-${vehicle.anomodelo}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Deduplicate mapped vehicles based on brand + model + year
 */
function deduplicateMappedVehicles(vehicles: Vehicle[]): Vehicle[] {
  const seen = new Set<string>()
  return vehicles.filter(vehicle => {
    const key = `${vehicle.brand.toLowerCase()}-${vehicle.model.toLowerCase()}-${vehicle.year_model}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Get slides for the home hero banner with device-aware priority
 *
 * Priority strategy for DESKTOP:
 * 1. adsDesktop: Promotional banners from CRM
 * 2. destaques: Featured vehicles from CRM
 * 3. Fallback: Most expensive vehicles
 * 4. Final fallback: Local inventory data
 *
 * Priority strategy for MOBILE:
 * 1. adsMobile: Mobile-specific banners from CRM
 * 2. adsDesktop: Desktop banners as fallback
 * 3. destaques: Featured vehicles from CRM
 * 4. Fallback: Most expensive vehicles
 * 5. Final fallback: Local inventory data
 *
 * @param limit - Maximum number of slides to return
 * @param deviceType - 'desktop' or 'mobile' for device-specific banners
 */
export async function getHomeSlides(
  limit = 4,
  deviceType: 'desktop' | 'mobile' = 'desktop'
): Promise<HeroSlideData[]> {
  try {
    const { adsDesktop, adsMobile, destaques } = await fetchAdsHome()

    // Determine which banners to use based on device type
    let bannersToUse: AdsDesktopBanner[] = []

    if (deviceType === 'mobile') {
      // Mobile: Try adsMobile first, then adsDesktop as fallback
      if (adsMobile.length > 0) {
        bannersToUse = adsMobile
        console.log(`[getHomeSlides] Mobile: Using ${adsMobile.length} mobile-specific banners`)
      } else if (adsDesktop.length > 0) {
        bannersToUse = adsDesktop
        console.log(`[getHomeSlides] Mobile: Using ${adsDesktop.length} desktop banners as fallback`)
      }
    } else {
      // Desktop: Use adsDesktop
      if (adsDesktop.length > 0) {
        bannersToUse = adsDesktop
        console.log(`[getHomeSlides] Desktop: Using ${adsDesktop.length} desktop banners`)
      }
    }

    // Priority 1: Use banners if available
    if (bannersToUse.length > 0) {
      return bannersToUse.slice(0, limit).map((banner, index) => ({
        type: 'banner' as const,
        image: banner.url,
        targetUrl: banner.target,
        ordem: banner.ordem ?? index,
      }))
    }

    // Priority 2: Use destaques vehicles if available
    if (destaques.length > 0) {
      console.log(`[getHomeSlides] Using ${destaques.length} featured vehicles`)
      const uniqueVehicles = deduplicateVehicles(destaques as AutoConfVehicle[])
      return uniqueVehicles.slice(0, limit).map((v, index) => {
        const vehicle = mapAutoConfToVehicle(v)
        return {
          type: 'vehicle' as const,
          image: vehicle.photos?.[0] || '',
          targetUrl: `/veiculo/${vehicle.slug}`,
          vehicle,
          ordem: index,
        }
      })
    }

    // Priority 3: Fallback to most expensive vehicles
    console.log('[getHomeSlides] No ads-home content, fetching most expensive vehicles')
    const response = await fetchAutoConfVehicles({
      tipo: 'carros',
      registros_por_pagina: limit * 3,
      ordenar: 'preco',
      ordem: 'desc',
    })

    if (response.veiculos.length > 0) {
      const uniqueVehicles = deduplicateVehicles(response.veiculos)
      return uniqueVehicles.slice(0, limit).map((v, index) => {
        const vehicle = mapAutoConfToVehicle(v)
        return {
          type: 'vehicle' as const,
          image: vehicle.photos?.[0] || '',
          targetUrl: `/veiculo/${vehicle.slug}`,
          vehicle,
          ordem: index,
        }
      })
    }

    // Priority 4: Supabase snapshot (last successful AutoConf list)
    const listSnapshot = await loadLatestListSnapshot().catch(() => null)
    if (listSnapshot?.veiculos.length) {
      console.warn(`[getHomeSlides] Using Supabase snapshot (${listSnapshot.veiculos.length} vehicles)`)
      const sorted = [...listSnapshot.veiculos].sort(
        (a, b) => parseFloat(b.valorvenda) - parseFloat(a.valorvenda),
      )
      const unique = deduplicateVehicles(sorted)
      return unique.slice(0, limit).map((v, index) => {
        const vehicle = mapAutoConfToVehicle(v)
        return {
          type: 'vehicle' as const,
          image: vehicle.photos?.[0] || '',
          targetUrl: `/veiculo/${vehicle.slug}`,
          vehicle,
          ordem: index,
        }
      })
    }

    // Priority 5: Final fallback to bundled local data
    console.warn('[getHomeSlides] No snapshot, using bundled inventory')
    const sortedMock = [...mockVehicles].sort((a, b) => (b.price || 0) - (a.price || 0))
    const uniqueMock = deduplicateMappedVehicles(sortedMock)
    return uniqueMock.slice(0, limit).map((vehicle, index) => ({
      type: 'vehicle' as const,
      image: vehicle.photos?.[0] || '',
      targetUrl: `/veiculo/${vehicle.slug}`,
      vehicle,
      ordem: index,
    }))
  } catch (error) {
    console.error('[getHomeSlides] Error:', error)
    const listSnapshot = await loadLatestListSnapshot().catch(() => null)
    if (listSnapshot?.veiculos.length) {
      const sorted = [...listSnapshot.veiculos].sort(
        (a, b) => parseFloat(b.valorvenda) - parseFloat(a.valorvenda),
      )
      const unique = deduplicateVehicles(sorted)
      return unique.slice(0, limit).map((v, index) => {
        const vehicle = mapAutoConfToVehicle(v)
        return {
          type: 'vehicle' as const,
          image: vehicle.photos?.[0] || '',
          targetUrl: `/veiculo/${vehicle.slug}`,
          vehicle,
          ordem: index,
        }
      })
    }
    const sortedMock = [...mockVehicles].sort((a, b) => (b.price || 0) - (a.price || 0))
    const uniqueMock = deduplicateMappedVehicles(sortedMock)
    return uniqueMock.slice(0, limit).map((vehicle, index) => ({
      type: 'vehicle' as const,
      image: vehicle.photos?.[0] || '',
      targetUrl: `/veiculo/${vehicle.slug}`,
      vehicle,
      ordem: index,
    }))
  }
}

/**
 * @deprecated Use getHomeSlides() instead for proper banner/vehicle priority
 * Kept for backwards compatibility
 */
export async function getHomeVehicles(limit = 4): Promise<Vehicle[]> {
  const slides = await getHomeSlides(limit)
  // Filter only vehicle slides and extract vehicles
  return slides
    .filter((slide): slide is HeroSlideData & { vehicle: Vehicle } =>
      slide.type === 'vehicle' && !!slide.vehicle
    )
    .map(slide => slide.vehicle)
}
