import type { Vehicle } from '@/types'
import { SITE_URL, ADDRESS, PHONE_NUMBER, EMAIL } from './constants'

interface SchemaContext {
  baseUrl: string
}

function getContext(): SchemaContext {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL
  return { baseUrl: baseUrl.replace(/\/$/, '') }
}

const ORGANIZATION_ID = '#organization'

function autoDealerNode(baseUrl: string) {
  return {
    '@type': 'AutoDealer',
    '@id': `${baseUrl}/${ORGANIZATION_ID}`,
    name: 'Attra Veículos',
    url: baseUrl,
    telephone: PHONE_NUMBER,
    email: EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      addressCountry: ADDRESS.country === 'Brasil' ? 'BR' : ADDRESS.country,
    },
  }
}

export function availabilityFromStatus(status: Vehicle['status']): string {
  switch (status) {
    case 'available':
    case 'highlight':
      return 'https://schema.org/InStock'
    case 'reserved':
      return 'https://schema.org/LimitedAvailability'
    case 'sold':
    default:
      return 'https://schema.org/OutOfStock'
  }
}

function imageObjects(photos: string[] | null | undefined, vehicleName: string) {
  if (!photos || photos.length === 0) return undefined
  return photos.slice(0, 12).map((url, i) => ({
    '@type': 'ImageObject',
    url,
    contentUrl: url,
    caption: i === 0 ? vehicleName : `${vehicleName} — foto ${i + 1}`,
  }))
}

export function buildVehicleSchema(vehicle: Vehicle) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/veiculo/${vehicle.slug}`
  const nameParts = [vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model]
    .filter(p => p != null && String(p).trim() !== '')
    .map(String)
  const fullName = nameParts.join(' ') || 'Veículo premium'
  const isNew = vehicle.is_new || vehicle.mileage === 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    '@id': `${url}#vehicle`,
    name: fullName,
    description: vehicle.description || vehicle.seo_description || `${fullName} disponível na Attra Veículos em Uberlândia/MG.`,
    url,
    ...(vehicle.brand ? { brand: { '@type': 'Brand', name: vehicle.brand } } : {}),
    ...(vehicle.brand ? { manufacturer: { '@type': 'Organization', name: vehicle.brand } } : {}),
    ...(vehicle.model ? { model: vehicle.model } : {}),
    vehicleModelDate: String(vehicle.year_model),
    productionDate: String(vehicle.year_manufacture),
    ...(vehicle.color ? { color: vehicle.color } : {}),
    ...(vehicle.body_type ? { bodyType: vehicle.body_type } : {}),
    vehicleConfiguration: vehicle.version || undefined,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT',
    },
    ...(vehicle.fuel_type ? { fuelType: vehicle.fuel_type } : {}),
    ...(vehicle.transmission ? { vehicleTransmission: vehicle.transmission } : {}),
    itemCondition: isNew ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    ...(vehicle.engine
      ? {
          vehicleEngine: {
            '@type': 'EngineSpecification',
            name: vehicle.engine,
            ...(vehicle.horsepower
              ? { enginePower: { '@type': 'QuantitativeValue', value: vehicle.horsepower, unitCode: 'BHP' } }
              : {}),
            ...(vehicle.torque
              ? { torque: { '@type': 'QuantitativeValue', value: vehicle.torque, unitCode: 'NU' } }
              : {}),
          },
        }
      : {}),
    ...(vehicle.acceleration
      ? { accelerationTime: { '@type': 'QuantitativeValue', value: vehicle.acceleration, unitText: '0-100 km/h em segundos' } }
      : {}),
    ...(vehicle.top_speed
      ? { speed: { '@type': 'QuantitativeValue', value: vehicle.top_speed, unitCode: 'KMH' } }
      : {}),
    image: imageObjects(vehicle.photos, fullName),
    offers: {
      '@type': 'Offer',
      '@id': `${url}#offer`,
      url,
      price: vehicle.price,
      priceCurrency: 'BRL',
      priceValidUntil: undefined,
      availability: availabilityFromStatus(vehicle.status),
      itemCondition: isNew ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      seller: { '@id': `${baseUrl}/${ORGANIZATION_ID}` },
      areaServed: { '@type': 'Country', name: 'Brasil' },
    },
  }
}

export function buildVehicleProductSchema(vehicle: Vehicle) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/veiculo/${vehicle.slug}`
  const nameParts = [vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model]
    .filter(p => p != null && String(p).trim() !== '')
    .map(String)
  const name = nameParts.join(' ') || 'Veículo premium'
  const isNew = vehicle.is_new || vehicle.mileage === 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description: vehicle.description || vehicle.seo_description || `${name} disponível na Attra Veículos.`,
    sku: vehicle.id,
    mpn: vehicle.id,
    image: vehicle.photos?.slice(0, 12) ?? [],
    ...(vehicle.brand ? { brand: { '@type': 'Brand', name: vehicle.brand } } : {}),
    ...(vehicle.category ? { category: vehicle.category } : {}),
    ...(vehicle.color ? { color: vehicle.color } : {}),
    itemCondition: isNew ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      price: vehicle.price,
      priceCurrency: 'BRL',
      availability: availabilityFromStatus(vehicle.status),
      seller: { '@id': `${baseUrl}/${ORGANIZATION_ID}` },
    },
  }
}

export function buildVehicleBreadcrumbSchema(vehicle: Vehicle) {
  const { baseUrl } = getContext()
  const items: { name: string; url: string }[] = [
    { name: 'Início', url: baseUrl },
    { name: 'Veículos', url: `${baseUrl}/veiculos` },
  ]
  if (vehicle.brand) {
    items.push({
      name: vehicle.brand,
      url: `${baseUrl}/veiculos?marca=${vehicle.brand.toLowerCase()}`,
    })
  }
  const lastName = [vehicle.model, vehicle.year_model]
    .filter(p => p != null && String(p).trim() !== '')
    .map(String)
    .join(' ') || 'Detalhes'
  items.push({ name: lastName, url: `${baseUrl}/veiculo/${vehicle.slug}` })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

export function buildVehicleFAQSchema(faqs: { question: string; answer: string }[]) {
  if (!faqs || faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function buildVehicleAutoDealerSchema() {
  const { baseUrl } = getContext()
  return {
    '@context': 'https://schema.org',
    ...autoDealerNode(baseUrl),
  }
}

export function buildVehiclePageSchemas(
  vehicle: Vehicle,
  faqs: { question: string; answer: string }[]
) {
  return [
    buildVehicleSchema(vehicle),
    buildVehicleProductSchema(vehicle),
    buildVehicleBreadcrumbSchema(vehicle),
    buildVehicleFAQSchema(faqs),
  ].filter((s): s is NonNullable<typeof s> => s !== null)
}
