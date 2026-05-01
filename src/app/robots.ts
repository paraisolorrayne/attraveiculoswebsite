import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://attraveiculos.com.br'

/**
 * Dynamic robots.txt for Attra Veículos
 * 
 * Optimized for:
 * - Maximum crawlability of public content
 * - Protection of admin and API routes
 * - Proper sitemap reference
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin/*',
          '/api/',
          '/api/*',
          '/_next/',
          '/_next/*',
          '/private/',
          '/*.json$',
          '/*?*', // Prevent crawling of query parameters (optional, can be removed if needed)
        ],
      },
      // Googlebot specific rules (more permissive)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
        ],
      },
      // Googlebot-Image for image indexing
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/images/',
          '/*.jpg$',
          '/*.jpeg$',
          '/*.png$',
          '/*.webp$',
        ],
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
      // Bingbot
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
        ],
      },
    ],
    // Index sitemap referencia os sub-sitemaps; crawlers seguem a partir dele.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

