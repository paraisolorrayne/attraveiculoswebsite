import { MetadataRoute } from 'next'
import { montarRobots } from '@/lib/seo/regras-robots'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://attraveiculos.com.br'

/** robots.txt — as regras e o porquê de cada uma estão em `@/lib/seo/regras-robots`. */
export default function robots(): MetadataRoute.Robots {
  return montarRobots({ siteUrl: SITE_URL })
}
