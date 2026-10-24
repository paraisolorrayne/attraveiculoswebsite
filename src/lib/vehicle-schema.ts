import type { Vehicle } from '@/types'
import { SITE_URL } from './constants'
import { anoDoVeiculo, tituloDoVeiculo, versaoDoVeiculo } from './identidade-do-veiculo'
import { paginasDoVeiculo } from './seo/modelos-do-estoque'

interface SchemaContext {
  baseUrl: string
}

function getContext(): SchemaContext {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL
  return { baseUrl: baseUrl.replace(/\/$/, '') }
}

// A entidade AutoDealer é declarada uma única vez, no layout raiz. Aqui só
// referenciamos por @id (ver `seller` em buildVehicleSchema/ProductSchema).
const ORGANIZATION_ID = '#organization'

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
    caption: i === 0 ? vehicleName : `${vehicleName}, foto ${i + 1}`,
  }))
}

export function buildVehicleSchema(vehicle: Vehicle) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/veiculo/${vehicle.slug}`
  // O mesmo nome do <title> (ver identidade-do-veiculo.ts).
  const fullName = tituloDoVeiculo(vehicle)
  const versao = versaoDoVeiculo(vehicle)
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
    vehicleConfiguration: versao || undefined,
    ...(vehicle.doors ? { numberOfDoors: vehicle.doors } : {}),
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT',
    },
    ...(vehicle.fuel_type ? { fuelType: vehicle.fuel_type } : {}),
    ...(vehicle.transmission ? { vehicleTransmission: vehicle.transmission } : {}),
    itemCondition: isNew ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    // A condição é `engine OU horsepower`, não só `engine`.
    //
    // O feed do estoque traz `engine` vazio nos 72 veículos e `horsepower`
    // preenchido em 7. Com a porta só em `engine`, esses 7 perdiam a marcação de
    // motor por causa de um campo que a fonte nunca preenche. `EngineSpecification`
    // é válida com apenas a potência.
    ...(vehicle.engine || vehicle.horsepower
      ? {
          vehicleEngine: {
            '@type': 'EngineSpecification',
            ...(vehicle.engine ? { name: vehicle.engine } : {}),
            ...(vehicle.horsepower
              // O feed informa cv (potência métrica), não BHP.
              ? { enginePower: { '@type': 'QuantitativeValue', value: vehicle.horsepower, unitText: 'cv' } }
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
  const name = tituloDoVeiculo(vehicle)
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

interface ItemDaTrilha {
  label: string
  /** Para onde o link visível leva. */
  href?: string
  /** O endereço que vai no BreadcrumbList, quando não é o próprio `href`. */
  canonico?: string
}

/**
 * O caminho da ficha até a marca e o modelo — o breadcrumb visível e o
 * BreadcrumbList usam esta mesma lista.
 *
 * A marca leva à listagem filtrada (`/veiculos?marca=…`), que é o que quem
 * clica espera: até 23/10/2026 levava à página de compra da marca
 * (`/comprar/mercedes-benz`), uma página de conteúdo com o estoque só depois
 * da apresentação. Para buscador nada muda: a listagem filtrada canonicaliza
 * para a página da marca, e é ela que vai no BreadcrumbList (`canonico`).
 *
 * O modelo continua na página de compra do modelo (`/comprar/porsche/911`),
 * que abre com os carros daquele modelo; antes ele não tinha link nenhum.
 */
export function trilhaDoVeiculo(vehicle: Vehicle): ItemDaTrilha[] {
  const trilha: ItemDaTrilha[] = [{ label: 'Veículos', href: '/veiculos' }]
  const paginas = paginasDoVeiculo(vehicle)
  if (paginas) {
    trilha.push({
      label: paginas.marca.nome,
      href: `/veiculos?marca=${paginas.marca.slug}`,
      canonico: `/comprar/${paginas.marca.slug}`,
    })
    if (paginas.modelo) {
      trilha.push({ label: paginas.modelo.nome, href: `/comprar/${paginas.marca.slug}/${paginas.modelo.slug}` })
    }
  } else if (vehicle.brand) {
    trilha.push({ label: vehicle.brand, href: `/veiculos?marca=${encodeURIComponent(vehicle.brand.toLowerCase())}` })
  }
  const ultimo = paginas?.modelo
    ? [versaoDoVeiculo(vehicle) || vehicle.model, anoDoVeiculo(vehicle)]
    : [vehicle.model, versaoDoVeiculo(vehicle), anoDoVeiculo(vehicle)]
  trilha.push({ label: ultimo.filter(Boolean).join(' ') || 'Detalhes' })
  return trilha
}

export function buildVehicleBreadcrumbSchema(vehicle: Vehicle) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/veiculo/${vehicle.slug}`
  const items: ItemDaTrilha[] = [{ label: 'Início', href: '/' }, ...trilhaDoVeiculo(vehicle)]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => {
      const destino = it.canonico ?? it.href
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: it.label,
        item: destino ? `${baseUrl}${destino === '/' ? '' : destino}` : url,
      }
    }),
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

/**
 * A página da ficha como CreativeWork, com as datas que Vehicle/Product não
 * têm onde declarar: `dateModified` = quando preço e disponibilidade foram
 * conferidos (a renderização lê o estoque ao vivo), `datePublished` = data de
 * publicação do anúncio na fonte. Assistentes de IA e o Google usam essas
 * datas para preferir a ficha que diz de quando é (avaliação AEO, 26/08/2026).
 */
export function buildVehicleItemPageSchema(vehicle: Vehicle, conferidoEm: string) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/veiculo/${vehicle.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': url,
    url,
    inLanguage: 'pt-BR',
    mainEntity: { '@id': `${url}#vehicle` },
    ...(vehicle.updated_at ? { datePublished: vehicle.updated_at } : {}),
    dateModified: conferidoEm,
    isPartOf: { '@id': `${baseUrl}/#website` },
  }
}

export function buildVehiclePageSchemas(
  vehicle: Vehicle,
  faqs: { question: string; answer: string }[],
  conferidoEm?: string,
) {
  return [
    buildVehicleSchema(vehicle),
    buildVehicleProductSchema(vehicle),
    buildVehicleBreadcrumbSchema(vehicle),
    buildVehicleFAQSchema(faqs),
    ...(conferidoEm ? [buildVehicleItemPageSchema(vehicle, conferidoEm)] : []),
  ].filter((s): s is NonNullable<typeof s> => s !== null)
}
