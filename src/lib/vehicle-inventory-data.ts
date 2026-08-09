/**
 * Real Vehicle Inventory Data
 * Loads vehicle data from list_vehicle.json and maps it to our Vehicle interface
 */

import type { Vehicle } from '@/types'
import { type AutoConfVehicle, cleanVersionString } from './autoconf-api'
import { resolveBrand, nonEmpty, joinNonEmpty } from './vehicle-fallbacks'
import {
  classificarCarroceria,
  classificarCategoria,
  rotuloDeCarroceria,
} from './taxonomia-veiculo'
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
 * Generate a description for the vehicle
 */
function generateDescription(vehicle: AutoConfVehicle): string {
  const isNew = vehicle.zero_km === 1
  const km = (vehicle.km ?? 0).toLocaleString('pt-BR')
  const brand = resolveBrand(vehicle)
  const model = nonEmpty(vehicle.modelopai_nome)
  const year = vehicle.anomodelo ? String(vehicle.anomodelo) : ''
  const fuel = nonEmpty(vehicle.combustivel_nome)
  const transmission = nonEmpty(vehicle.cambio_nome)

  const namePart = joinNonEmpty([brand, model, year]) || 'Veículo premium'
  const versao = vehicle.versao_descricao ? ` ${vehicle.versao_descricao}` : ''
  const drivetrain = joinNonEmpty([
    fuel ? `Motor ${fuel}` : '',
    transmission ? `câmbio ${transmission}` : '',
  ], ', ')
  const drivetrainPart = drivetrain ? ` ${drivetrain}.` : ''

  if (isNew) {
    return `${namePart} 0km.${versao}${drivetrainPart} Verifique a disponibilidade com nossos consultores.`
  }
  return `${namePart} com apenas ${km} km rodados.${versao}${drivetrainPart} Documentação em dia, pronto para entrega.`
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
  const importedBrands = ['Ferrari', 'Lamborghini', 'McLaren', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Maserati']
  const brand = resolveBrand(autoconfVehicle)
  const carrocerias = classificarCarroceria({
    carroceria: autoconfVehicle.carroceria_nome,
    marca: brand,
    modelo: autoconfVehicle.modelopai_nome,
    versao: autoconfVehicle.modelo_nome,
    portas: autoconfVehicle.portas,
  })
  const category = classificarCategoria({ marca: brand, carrocerias, preco: price })
  const model = nonEmpty(autoconfVehicle.modelopai_nome)
  const isImported = importedBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))

  const namePart = joinNonEmpty([brand, model, autoconfVehicle.anomodelo])
  const seoBase = namePart || 'Veículo premium'
  const km = autoconfVehicle.km ?? 0

  return {
    id: String(autoconfVehicle.id),
    slug,
    brand,
    model,
    version: cleanVersionString(autoconfVehicle.modelo_nome, autoconfVehicle.modelopai_nome)
      || autoconfVehicle.versao_descricao || null,
    year_manufacture: parseInt(autoconfVehicle.anofabricacao) || 0,
    year_model: parseInt(autoconfVehicle.anomodelo) || 0,
    color: nonEmpty(autoconfVehicle.cor_nome),
    mileage: km,
    fuel_type: nonEmpty(autoconfVehicle.combustivel_nome),
    transmission: nonEmpty(autoconfVehicle.cambio_nome),
    price,
    category,
    body_type: rotuloDeCarroceria(carrocerias, autoconfVehicle.carroceria_nome),
    doors: autoconfVehicle.portas ?? null,
    location_id: '1',
    photos: autoconfVehicle.fotos?.map(f => f.url) || (autoconfVehicle.foto ? [autoconfVehicle.foto] : []),
    videos: null,
    options: uniqueOptions.length > 0 ? uniqueOptions : null,
    description: generateDescription(autoconfVehicle),
    // Sem o sufixo de marca: o `title.template` do layout raiz já
    // acrescenta ' | Attra Veículos' a todo título de página.
    seo_title: seoBase,
    seo_description: `${seoBase}${km > 0 ? ` com ${km.toLocaleString('pt-BR')} km` : ''}. Compre com a Attra Veículos.`,
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

