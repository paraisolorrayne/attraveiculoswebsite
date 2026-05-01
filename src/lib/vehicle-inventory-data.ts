/**
 * Real Vehicle Inventory Data
 * Loads vehicle data from list_vehicle.json and maps it to our Vehicle interface
 */

import type { Vehicle } from '@/types'
import { type AutoConfVehicle, cleanVersionString } from './autoconf-api'
import inventoryData from '../../list_vehicle.json'

// Type for the JSON structure
interface InventoryResponse {
  count: number
  registros_por_pagina: string
  pagina_atual: number
  ultima_pagina: number
  veiculos: AutoConfVehicle[]
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

  if (isNew) {
    return `${vehicle.marca_nome} ${vehicle.modelopai_nome} ${vehicle.anomodelo} 0km. ${vehicle.versao_descricao || ''} Motor ${vehicle.combustivel_nome}, câmbio ${vehicle.cambio_nome}. Verifique a disponibilidade com nossos consultores.`
  }

  return `${vehicle.marca_nome} ${vehicle.modelopai_nome} ${vehicle.anomodelo} com apenas ${km} km rodados. ${vehicle.versao_descricao || ''} Motor ${vehicle.combustivel_nome}, câmbio ${vehicle.cambio_nome}. Documentação em dia, pronto para entrega.`
}

/**
 * Map AutoConf vehicle to our Vehicle interface
 */
function mapAutoConfToVehicle(autoconfVehicle: AutoConfVehicle): Vehicle {
  const slug = generateVehicleSlug(autoconfVehicle)
  const options = [
    ...(autoconfVehicle.acessorios?.map(a => a.nome) || []),
    ...(autoconfVehicle.acessorios_destaque?.map(a => a.nome) || []),
  ]
  const uniqueOptions = [...new Set(options)]

  const price = parseFloat(autoconfVehicle.valorvenda) || 0
  const category = determineCategoryFromVehicle(autoconfVehicle, price)

  const importedBrands = ['Ferrari', 'Lamborghini', 'McLaren', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Maserati']
  const brand = autoconfVehicle.marca_nome || 'Desconhecido'
  const isImported = importedBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))

  return {
    id: String(autoconfVehicle.id),
    slug,
    brand,
    model: autoconfVehicle.modelopai_nome || 'Modelo',
    version: cleanVersionString(autoconfVehicle.modelo_nome, autoconfVehicle.modelopai_nome)
      || autoconfVehicle.versao_descricao || null,
    year_manufacture: parseInt(autoconfVehicle.anofabricacao) || 0,
    year_model: parseInt(autoconfVehicle.anomodelo) || 0,
    color: autoconfVehicle.cor_nome || 'Não informado',
    mileage: autoconfVehicle.km ?? 0,
    fuel_type: autoconfVehicle.combustivel_nome || 'Não informado',
    transmission: autoconfVehicle.cambio_nome || 'Não informado',
    price,
    category,
    body_type: autoconfVehicle.carroceria_nome || 'Outros',
    location_id: '1',
    photos: autoconfVehicle.fotos?.map(f => f.url) || (autoconfVehicle.foto ? [autoconfVehicle.foto] : []),
    videos: null,
    options: uniqueOptions.length > 0 ? uniqueOptions : null,
    description: generateDescription(autoconfVehicle),
    seo_title: `${brand} ${autoconfVehicle.modelopai_nome || ''} ${autoconfVehicle.anomodelo || ''} | Attra Veículos`,
    seo_description: `${brand} ${autoconfVehicle.modelopai_nome || ''} ${autoconfVehicle.anomodelo || ''} com ${(autoconfVehicle.km ?? 0).toLocaleString('pt-BR')} km. Compre com a Attra Veículos.`,
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

// Extract vehicles from the JSON response (it's an array with one element)
const inventoryResponse = (inventoryData as InventoryResponse[])[0]
const autoconfVehicles = inventoryResponse?.veiculos || []

// Map all vehicles to our Vehicle interface
export const realInventoryVehicles: Vehicle[] = autoconfVehicles.map(mapAutoConfToVehicle)

export const inventoryCount = inventoryResponse?.count || realInventoryVehicles.length

