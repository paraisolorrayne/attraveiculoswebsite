/**
 * Vehicle Description Generator
 * Generates consistent, deterministic descriptions based on structured vehicle data
 * No external API dependencies - pure data-driven approach
 */

import type { Vehicle } from '@/types'
import { expandirAbreviacoes } from '@/lib/normalizar-abreviacoes'

// Category labels in Portuguese
const categoryLabels: Record<string, string> = {
  supercar: 'superesportivo',
  sports: 'esportivo',
  luxury: 'de luxo',
  premium: 'premium',
  suv: 'SUV',
  executive: 'executivo',
  sedan: 'sedã',
  hatch: 'hatch',
  coupe: 'cupê',
  convertible: 'conversível',
  pickup: 'picape',
}

// Body type labels
const bodyTypeLabels: Record<string, string> = {
  suv: 'SUV',
  sedan: 'sedã',
  hatch: 'hatchback',
  coupe: 'cupê',
  conversivel: 'conversível',
  picape: 'picape',
  wagon: 'perua',
  minivan: 'minivan',
}

// Brand characteristics for contextual descriptions
const brandCharacteristics: Record<string, { adjective: string; strength: string }> = {
  porsche: { adjective: 'icônico', strength: 'performance lendária' },
  ferrari: { adjective: 'exclusivo', strength: 'paixão italiana' },
  lamborghini: { adjective: 'arrojado', strength: 'design radical' },
  bmw: { adjective: 'sofisticado', strength: 'prazer de dirigir' },
  mercedes: { adjective: 'elegante', strength: 'conforto e tecnologia' },
  audi: { adjective: 'refinado', strength: 'tecnologia Quattro' },
  'land rover': { adjective: 'aventureiro', strength: 'capacidade off-road' },
  'range rover': { adjective: 'imponente', strength: 'luxo e versatilidade' },
  jaguar: { adjective: 'distinto', strength: 'elegância britânica' },
  maserati: { adjective: 'apaixonante', strength: 'alma italiana' },
  bentley: { adjective: 'majestoso', strength: 'artesanato britânico' },
  'rolls-royce': { adjective: 'incomparável', strength: 'o ápice do luxo' },
  mclaren: { adjective: 'tecnológico', strength: 'engenharia de F1' },
  'aston martin': { adjective: 'sedutor', strength: 'esportividade britânica' },
  volvo: { adjective: 'seguro', strength: 'segurança e design escandinavo' },
  lexus: { adjective: 'impecável', strength: 'qualidade japonesa' },
}

/**
 * Format mileage for display
 */
function formatMileage(km: number): string {
  if (km === 0) return '0 km'
  return `${km.toLocaleString('pt-BR')} km`
}

/**
 * Get version string without duplicating model name and clean technical specs
 * This function processes the version that has already been cleaned at mapping time,
 * but also handles any remaining technical patterns for display
 */
function getCleanVersion(model: string, version: string | null): string {
  if (!version) return ''

  let cleaned = version

  // Remove the model name from version if it starts with it (redundant safety)
  const modelLower = model.toLowerCase()
  const versionLower = cleaned.toLowerCase()

  if (versionLower.startsWith(modelLower)) {
    cleaned = cleaned.substring(model.length).trim()
  }

  // Remove technical specs that might remain for cleaner display
  // Engine displacement: "3.6/3.8", "2.0", etc.
  cleaned = cleaned.replace(/\s*\d+\.\d+(?:\/\d+\.\d+)?\s*/g, ' ')
  // Valve config: "24V", "16V"
  cleaned = cleaned.replace(/\s*\d+V\s*/gi, ' ')
  // Generation codes in parentheses: "(991/992)", "(G20)"
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ')
  // Clean multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Abreviação do AutoConf por extenso — "BI-TB" vira "Bi-Turbo", "Aut." vira
  // "Automático". Fica por ÚLTIMO de propósito: as limpezas acima removem
  // cilindrada e código de geração, e expandir antes disso faria a expansão
  // ser recortada pelas regex seguintes.
  cleaned = expandirAbreviacoes(cleaned)

  return cleaned
}

/**
 * Extract engine info from version string
 */
function extractEngineInfo(version: string | null): string | null {
  if (!version) return null
  
  // Look for patterns like "2.0", "3.0 TB", "V8", "V12", etc.
  const engineMatch = version.match(/(\d+\.\d+)\s*(TB|Turbo|TSI|TFSI|BiTurbo)?/i)
  if (engineMatch) {
    const displacement = engineMatch[1]
    const turbo = engineMatch[2] ? ' turbo' : ''
    return `${displacement}${turbo}`
  }
  
  const vEngineMatch = version.match(/(V\d+)/i)
  if (vEngineMatch) {
    return vEngineMatch[1]
  }
  
  return null
}

/**
 * Get top accessories for description (max 5)
 */
function getTopAccessories(options: string[] | null): string[] {
  if (!options || options.length === 0) return []
  
  // Priority accessories to mention
  const priorityItems = [
    'teto solar', 'teto panorâmico', 'piloto automático', 'head-up display',
    'bancos elétricos', 'bancos em couro', 'câmera de ré', 'sensores',
    'ar-condicionado digital', 'multimídia', 'som premium', 'rodas',
    'airbag', 'freios abs', 'direção elétrica', 'central multimídia'
  ]
  
  const found: string[] = []
  const optionsLower = options.map(o => o.toLowerCase())
  
  for (const priority of priorityItems) {
    const match = optionsLower.find(o => o.includes(priority))
    if (match) {
      const originalIndex = optionsLower.indexOf(match)
      found.push(options[originalIndex])
      if (found.length >= 5) break
    }
  }
  
  return found
}

/**
 * Main description generator
 */
export function generateVehicleDescription(vehicle: Vehicle): string {
  const brandLower = vehicle.brand.toLowerCase()
  const brandInfo = brandCharacteristics[brandLower] || { adjective: 'premium', strength: 'qualidade e desempenho' }
  const categoryLabel = categoryLabels[vehicle.category] || 'premium'
  const bodyLabel = bodyTypeLabels[vehicle.body_type?.toLowerCase()] || ''

  // Clean version (remove model name duplication)
  const cleanVersion = getCleanVersion(vehicle.model, vehicle.version)
  const engineInfo = extractEngineInfo(vehicle.version)

  // Format values
  const kmFormatted = formatMileage(vehicle.mileage)
  const yearDisplay = vehicle.year_manufacture === vehicle.year_model
    ? String(vehicle.year_model)
    : `${vehicle.year_manufacture}/${vehicle.year_model}`

  // Get top accessories
  const topAccessories = getTopAccessories(vehicle.options)
  const accessoriesText = topAccessories.length > 0
    ? `Equipado com ${topAccessories.slice(0, 4).join(', ').toLowerCase()}.`
    : ''

  // Build power string
  const powerText = vehicle.horsepower
    ? `motor${engineInfo ? ` ${engineInfo}` : ''} de ${vehicle.horsepower} cv`
    : engineInfo
      ? `motor ${engineInfo}`
      : ''

  // Build transmission text
  const transmissionText = vehicle.transmission?.toLowerCase() || 'automático'

  // Determine template based on category and available data
  const isZeroKm = vehicle.is_new || vehicle.mileage === 0
  const hasGoodMileage = vehicle.mileage > 0 && vehicle.mileage < 50000

  // Generate description based on vehicle type
  let description: string

  if (vehicle.category === 'supercar' || vehicle.category === 'sports') {
    // Sports/Supercar template - emphasize performance
    description = buildSportsDescription(
      vehicle, brandInfo, yearDisplay, powerText, transmissionText,
      kmFormatted, isZeroKm, accessoriesText, cleanVersion
    )
  } else if (vehicle.category === 'suv' || vehicle.body_type?.toLowerCase().includes('suv')) {
    // SUV template - emphasize versatility
    description = buildSUVDescription(
      vehicle, brandInfo, yearDisplay, powerText, transmissionText,
      kmFormatted, hasGoodMileage, accessoriesText, cleanVersion, bodyLabel
    )
  } else if (vehicle.category === 'luxury') {
    // Luxury template - emphasize comfort and exclusivity
    description = buildLuxuryDescription(
      vehicle, brandInfo, yearDisplay, powerText, transmissionText,
      kmFormatted, accessoriesText, cleanVersion
    )
  } else {
    // Premium/Executive template - balanced approach
    description = buildPremiumDescription(
      vehicle, brandInfo, categoryLabel, yearDisplay, powerText, transmissionText,
      kmFormatted, hasGoodMileage, accessoriesText, cleanVersion
    )
  }

  return description
}

/**
 * Sports/Supercar description template
 */
function buildSportsDescription(
  vehicle: Vehicle,
  brandInfo: { adjective: string; strength: string },
  yearDisplay: string,
  powerText: string,
  transmissionText: string,
  kmFormatted: string,
  isZeroKm: boolean,
  accessoriesText: string,
  cleanVersion: string
): string {
  const opening = `Este ${brandInfo.adjective} ${vehicle.brand} ${vehicle.model}${cleanVersion ? ` ${cleanVersion}` : ''} ${yearDisplay}`

  const performanceSection = powerText
    ? ` entrega ${powerText} e câmbio ${transmissionText}, proporcionando performance e emoção a cada acelerada.`
    : ` oferece a ${brandInfo.strength} característica da marca.`

  const conditionSection = isZeroKm
    ? ' Unidade zero quilômetro, pronta para seu primeiro condutor.'
    : ` Com ${kmFormatted} rodados, mantém toda sua esportividade intacta.`

  const closingSection = accessoriesText
    ? ` ${accessoriesText}`
    : ''

  const signature = ` Um exemplar que combina exclusividade e ${brandInfo.strength}.`

  return opening + performanceSection + conditionSection + closingSection + signature
}

/**
 * SUV description template
 */
function buildSUVDescription(
  vehicle: Vehicle,
  brandInfo: { adjective: string; strength: string },
  yearDisplay: string,
  powerText: string,
  transmissionText: string,
  kmFormatted: string,
  hasGoodMileage: boolean,
  accessoriesText: string,
  cleanVersion: string,
  bodyLabel: string
): string {
  const opening = `Este ${vehicle.brand} ${vehicle.model}${cleanVersion ? ` ${cleanVersion}` : ''} ${yearDisplay}`

  const versatilitySection = powerText
    ? ` combina versatilidade e performance com seu ${powerText} e câmbio ${transmissionText}.`
    : ` oferece o equilíbrio perfeito entre conforto e capacidade.`

  const conditionSection = hasGoodMileage
    ? ` Com apenas ${kmFormatted} rodados, apresenta excelente estado de conservação.`
    : vehicle.mileage === 0
      ? ' Unidade zero quilômetro, pronta para novas aventuras.'
      : ` Com ${kmFormatted} rodados e bem conservado.`

  const colorSection = vehicle.color ? ` Na cor ${vehicle.color.toLowerCase()},` : ''

  const equipmentSection = accessoriesText
    ? ` ${accessoriesText}`
    : ''

  const signature = ` Um ${bodyLabel || 'SUV'} ${brandInfo.adjective} ideal para quem busca esportividade e conforto no dia a dia.`

  return opening + versatilitySection + conditionSection + colorSection + equipmentSection + signature
}

/**
 * Luxury description template
 */
function buildLuxuryDescription(
  vehicle: Vehicle,
  brandInfo: { adjective: string; strength: string },
  yearDisplay: string,
  powerText: string,
  transmissionText: string,
  kmFormatted: string,
  accessoriesText: string,
  cleanVersion: string
): string {
  const opening = `Este ${brandInfo.adjective} ${vehicle.brand} ${vehicle.model}${cleanVersion ? ` ${cleanVersion}` : ''} ${yearDisplay}`

  const luxurySection = ` representa ${brandInfo.strength} em sua forma mais pura.`

  const mechanicsSection = powerText
    ? ` Equipado com ${powerText} e transmissão ${transmissionText}, oferece refinamento em cada detalhe.`
    : ` Cada detalhe reflete o compromisso com a excelência.`

  const conditionSection = vehicle.mileage === 0
    ? ' Zero quilômetro, uma obra-prima pronta para seu novo proprietário.'
    : ` Com ${kmFormatted} rodados, preserva todo seu luxo original.`

  const equipmentSection = accessoriesText ? ` ${accessoriesText}` : ''

  return opening + luxurySection + mechanicsSection + conditionSection + equipmentSection
}

/**
 * Premium/Executive description template
 */
function buildPremiumDescription(
  vehicle: Vehicle,
  brandInfo: { adjective: string; strength: string },
  categoryLabel: string,
  yearDisplay: string,
  powerText: string,
  transmissionText: string,
  kmFormatted: string,
  hasGoodMileage: boolean,
  accessoriesText: string,
  cleanVersion: string
): string {
  const opening = `Este ${vehicle.brand} ${vehicle.model}${cleanVersion ? ` ${cleanVersion}` : ''} ${yearDisplay}`

  const mechanicsSection = powerText
    ? ` oferece ${powerText} e câmbio ${transmissionText}, aliando desempenho e sofisticação.`
    : ` entrega a ${brandInfo.strength} que você espera da marca.`

  const conditionSection = hasGoodMileage
    ? ` Com apenas ${kmFormatted} rodados, está em excelente estado.`
    : vehicle.mileage === 0
      ? ' Unidade zero quilômetro, pronta para entrega.'
      : ` Com ${kmFormatted} rodados e bem cuidado.`

  const colorSection = vehicle.color ? ` Apresenta-se na cor ${vehicle.color.toLowerCase()}` : ''
  const fuelSection = vehicle.fuel_type ? ` e motorização ${vehicle.fuel_type.toLowerCase()}.` : '.'

  const equipmentSection = accessoriesText ? ` ${accessoriesText}` : ''

  const signature = ` Um veículo ${categoryLabel} completo para quem valoriza qualidade.`

  return opening + mechanicsSection + conditionSection + colorSection + fuelSection + equipmentSection + signature
}

/**
 * Result interface for compatibility
 */
export interface DescriptionResult {
  description: string
  source: 'generated'
}

