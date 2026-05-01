import type { DualBlogPost } from '@/types'
import { SITE_URL, ADDRESS, PHONE_NUMBER, EMAIL } from './constants'

interface SchemaContext {
  baseUrl: string
}

function getContext(): SchemaContext {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL
  return { baseUrl: baseUrl.replace(/\/$/, '') }
}

const ORGANIZATION_ID = '#organization'
const WEBSITE_ID = '#website'

function organization(baseUrl: string) {
  return {
    '@type': 'AutoDealer',
    '@id': `${baseUrl}/${ORGANIZATION_ID}`,
    name: 'Attra Veículos',
    url: baseUrl,
    logo: `${baseUrl}/attra-openai-icon.png`,
    image: `${baseUrl}/attra-openai-icon.png`,
    telephone: PHONE_NUMBER,
    email: EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.state,
      addressCountry: ADDRESS.country === 'Brasil' ? 'BR' : ADDRESS.country,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Brasil',
    },
    sameAs: [
      'https://www.instagram.com/attra.veiculos',
    ],
  }
}

export function buildArticleSchema(post: DualBlogPost) {
  const { baseUrl } = getContext()
  const url = `${baseUrl}/blog/${post.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': post.post_type === 'car_review' ? 'Review' : 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.seo?.meta_description || post.excerpt,
    image: post.featured_image ? [post.featured_image] : undefined,
    inLanguage: 'pt-BR',
    datePublished: post.published_date,
    dateModified: post.updated_date || post.published_date,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'Attra Veículos',
      ...(post.author?.bio ? { description: post.author.bio } : {}),
    },
    publisher: organization(baseUrl),
    keywords: post.seo?.keywords?.join(', '),
    articleSection: post.educativo?.category,
    ...(post.post_type === 'car_review' && post.car_review
      ? {
          itemReviewed: {
            '@type': 'Vehicle',
            name: `${post.car_review.brand} ${post.car_review.model} ${post.car_review.year}`,
            brand: { '@type': 'Brand', name: post.car_review.brand },
            model: post.car_review.model,
            vehicleModelDate: String(post.car_review.year),
            ...(post.car_review.color ? { color: post.car_review.color } : {}),
          },
          reviewBody: post.excerpt,
        }
      : {}),
  }
}

export function buildVehicleSchema(post: DualBlogPost) {
  if (post.post_type !== 'car_review' || !post.car_review) return null
  const { baseUrl } = getContext()
  const cr = post.car_review
  const url = `${baseUrl}/blog/${post.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    '@id': `${url}#vehicle`,
    name: `${cr.brand} ${cr.model} ${cr.year}${cr.version ? ' ' + cr.version : ''}`,
    brand: { '@type': 'Brand', name: cr.brand },
    model: cr.model,
    vehicleModelDate: String(cr.year),
    ...(cr.color ? { color: cr.color } : {}),
    ...(cr.specs?.engine ? { vehicleEngine: { '@type': 'EngineSpecification', name: cr.specs.engine } } : {}),
    ...(cr.specs?.transmission ? { vehicleTransmission: cr.specs.transmission } : {}),
    ...(cr.specs?.drivetrain ? { driveWheelConfiguration: cr.specs.drivetrain } : {}),
    ...(cr.specs?.fuel_consumption ? { fuelConsumption: cr.specs.fuel_consumption } : {}),
    ...(cr.specs?.top_speed
      ? { speed: { '@type': 'QuantitativeValue', value: cr.specs.top_speed } }
      : {}),
    ...(cr.specs?.power
      ? { vehicleEngine: { '@type': 'EngineSpecification', enginePower: cr.specs.power, name: cr.specs.engine || cr.specs.power } }
      : {}),
    image: post.featured_image ? [post.featured_image] : undefined,
    description: post.excerpt,
    offers: cr.availability?.in_stock
      ? {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          ...(cr.availability.stock_url ? { url: cr.availability.stock_url.startsWith('http') ? cr.availability.stock_url : `${baseUrl}${cr.availability.stock_url}` } : {}),
          seller: { '@id': `${baseUrl}/${ORGANIZATION_ID}` },
        }
      : undefined,
  }
}

export function buildFAQSchema(post: DualBlogPost) {
  const faqs = post.car_review?.faq
  if (!faqs || faqs.length === 0) return null
  const { baseUrl } = getContext()
  const url = `${baseUrl}/blog/${post.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function buildBreadcrumbSchema(post: DualBlogPost) {
  const { baseUrl } = getContext()
  const items: { name: string; url: string }[] = [
    { name: 'Início', url: baseUrl },
    { name: 'Blog', url: `${baseUrl}/blog` },
  ]

  if (post.post_type === 'car_review') {
    items.push({ name: 'Reviews', url: `${baseUrl}/blog?tipo=car_review` })
    if (post.car_review) {
      items.push({
        name: `${post.car_review.brand} ${post.car_review.model}`,
        url: `${baseUrl}/blog/${post.slug}`,
      })
    }
  } else if (post.educativo?.category) {
    items.push({
      name: post.educativo.category,
      url: `${baseUrl}/blog?categoria=${post.educativo.category.toLowerCase()}`,
    })
    items.push({ name: post.title, url: `${baseUrl}/blog/${post.slug}` })
  } else {
    items.push({ name: post.title, url: `${baseUrl}/blog/${post.slug}` })
  }

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

export function buildCollectionPageSchema(post: DualBlogPost) {
  if (!post.educativo?.is_pillar) return null
  const { baseUrl } = getContext()
  const url = `${baseUrl}/blog/${post.slug}`
  const children = post.educativo.pillar_children ?? []

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: post.title,
    description: post.seo?.meta_description || post.excerpt,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': `${baseUrl}/${WEBSITE_ID}` },
    publisher: { '@id': `${baseUrl}/${ORGANIZATION_ID}` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: children.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${baseUrl}/blog/${c.slug}`,
        ...(c.label ? { name: c.label } : {}),
      })),
    },
  }
}

export function buildBlogPostSchemas(post: DualBlogPost) {
  const schemas = [
    buildArticleSchema(post),
    buildBreadcrumbSchema(post),
    buildVehicleSchema(post),
    buildFAQSchema(post),
    buildCollectionPageSchema(post),
  ].filter((s): s is NonNullable<typeof s> => s !== null)
  return schemas
}

export function buildOrganizationSchema() {
  const { baseUrl } = getContext()
  return {
    '@context': 'https://schema.org',
    ...organization(baseUrl),
  }
}

export function buildWebsiteSchema() {
  const { baseUrl } = getContext()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/${WEBSITE_ID}`,
    url: baseUrl,
    name: 'Attra Veículos',
    inLanguage: 'pt-BR',
    publisher: { '@id': `${baseUrl}/${ORGANIZATION_ID}` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/veiculos?busca={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}
