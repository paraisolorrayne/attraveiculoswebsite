import type { NextConfig } from "next";

// Security headers configuration
const securityHeaders = [
  // Prevent XSS attacks by controlling resource loading
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self, inline (for Next.js), eval (for dev), and trusted CDNs
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.youtube.com https://s.ytimg.com https://connect.facebook.net https://static.hotjar.com https://script.hotjar.com https://*.clarity.ms https://clarity.ms https://www.instagram.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://www.google.com.br",
      // Styles: self and inline (required for styled-components/emotion/tailwind)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images: self, data URIs, blobs, and external sources
      "img-src 'self' data: blob: https: http:",
      // Fonts: self and Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      // Connect: API endpoints and analytics
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://region1.google-analytics.com https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com https://webhook.dexidigital.com.br https://api.resend.com https://*.clarity.ms https://clarity.ms wss://*.clarity.ms https://www.instagram.com https://graph.instagram.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://*.googleadservices.com https://www.google.com https://*.google.com https://www.google.com.br https://*.google.com.br https://*.doubleclick.net https://*.googlesyndication.com",
      // Frames: YouTube embeds, Instagram embeds, Google Ads, and same origin
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.instagram.com https://td.doubleclick.net https://www.googletagmanager.com",
      // Media: self and external sources
      "media-src 'self' https: blob:",
      // Objects: none (no Flash/plugins)
      "object-src 'none'",
      // Base URI: self only
      "base-uri 'self'",
      // Form actions: self only
      "form-action 'self'",
      // Frame ancestors: prevent clickjacking
      "frame-ancestors 'self'",
      // Upgrade insecure requests in production
      process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join('; ')
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Control browser features/APIs
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', ')
  },
  // Force HTTPS (only in production)
  ...(process.env.NODE_ENV === 'production' ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  }] : []),
  // Prevent XSS in older browsers
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Strip console.log/info/debug in production builds (keep error/warn for monitoring)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  // Powered by header removal
  poweredByHeader: false,

  // 301 Redirects for old URLs (SEO - permanent redirects)
  async redirects() {
    return [
      // Old /estoque → /veiculos (premium rebrand)
      {
        source: '/estoque',
        destination: '/veiculos',
        permanent: true,
      },
      // Old brand pages → vehicles filter
      {
        source: '/marca/:brand',
        destination: '/veiculos?marca=:brand',
        permanent: true,
      },
      // Old model pages → vehicles
      {
        source: '/modelo/:model',
        destination: '/veiculos',
        permanent: true,
      },
      // Old pagination pattern
      {
        source: '/estoque-2-2',
        destination: '/veiculos',
        permanent: true,
      },
      // Old company page → about
      {
        source: '/empresa',
        destination: '/sobre',
        permanent: true,
      },
      // Old blog posts without /blog/ prefix (specific slugs from Google Search Console)
      {
        source: '/mercedes-amg-gt63-s-e-performance-coupe-2025-a-revolucao-hibrida-da-performance',
        destination: '/blog/mercedes-amg-gt63-s-e-performance-coupe-2025-a-revolucao-hibrida-da-performance',
        permanent: true,
      },
      {
        source: '/bmw-r1300-gs-2024-a-revolucao-que-redefine-a-adventure-premium',
        destination: '/blog/bmw-r1300-gs-2024-a-revolucao-que-redefine-a-adventure-premium',
        permanent: true,
      },
      {
        source: '/lamborghini-huracan-tecnica-lp640-2-a-obra-prima-italiana-que-a-attra-veiculos-trouxe-para-o-brasil',
        destination: '/blog/lamborghini-huracan-tecnica-lp640-2-a-obra-prima-italiana-que-a-attra-veiculos-trouxe-para-o-brasil',
        permanent: true,
      },
      {
        source: '/bmw-m2-2025-a-nova-geracao-do-icone-esportivo-compacto',
        destination: '/blog/bmw-m2-2025-a-nova-geracao-do-icone-esportivo-compacto',
        permanent: true,
      },
      {
        source: '/volvo-xc90-t8-ultimate-dark-luxo-escandinavo-com-consciencia-sustentavel',
        destination: '/blog/volvo-xc90-t8-ultimate-dark-luxo-escandinavo-com-consciencia-sustentavel',
        permanent: true,
      },
      {
        source: '/mercedes-amg-gt-63-s-e-performance-2025-quando-843cv-redefinem-o-conceito-de-torque',
        destination: '/blog/mercedes-amg-gt-63-s-e-performance-2025-quando-843cv-redefinem-o-conceito-de-torque',
        permanent: true,
      },
      {
        source: '/land-rover-defender-110d-hse-lendaria-capacidade-off-road-em-versao-premium',
        destination: '/blog/land-rover-defender-110d-hse-lendaria-capacidade-off-road-em-versao-premium',
        permanent: true,
      },
      {
        source: '/audi-r8-v10-vs-ferrari-812-gts-o-duelo-dos-titas',
        destination: '/blog/audi-r8-v10-vs-ferrari-812-gts-o-duelo-dos-titas',
        permanent: true,
      },
      {
        source: '/lamborghini-aventador-roadster-a-furia-italiana-em-sua-forma-mais-pura',
        destination: '/blog/lamborghini-aventador-roadster-a-furia-italiana-em-sua-forma-mais-pura',
        permanent: true,
      },
      {
        source: '/mercedes-benz-e-300-exclusive-a-expressao-do-luxo-alemao',
        destination: '/blog/mercedes-benz-e-300-exclusive-a-expressao-do-luxo-alemao',
        permanent: true,
      },
      {
        source: '/hummer-h1-1985-um-icone-militar-para-colecionadores',
        destination: '/blog/hummer-h1-1985-um-icone-militar-para-colecionadores',
        permanent: true,
      },
      {
        source: '/duas-faces-da-liberdade-bmw-z4-30i-e-430i-cabriolet',
        destination: '/blog/duas-faces-da-liberdade-bmw-z4-30i-e-430i-cabriolet',
        permanent: true,
      },
      {
        source: '/porsche-911-targa-4-gts-a-perfeita-fusao-entre-design-iconico-e-performance-extraordinaria',
        destination: '/blog/porsche-911-targa-4-gts-a-perfeita-fusao-entre-design-iconico-e-performance-extraordinaria',
        permanent: true,
      },
      {
        source: '/bmw-m2-a-revolucao-da-nova-geracao-g87',
        destination: '/blog/bmw-m2-a-revolucao-da-nova-geracao-g87',
        permanent: true,
      },
      // Old vehicle URLs with specific slugs → vehicles (vehicles may have been sold)
      {
        source: '/veiculo/ferrari-sf90-spider-2024-0km',
        destination: '/veiculos?marca=Ferrari',
        permanent: true,
      },
      {
        source: '/veiculo/porsche-718-boxster-2023-scp-8a88',
        destination: '/veiculos?marca=Porsche',
        permanent: true,
      },
      {
        source: '/veiculo/lamborghini-aventador-roadster-2015-bsy-2122',
        destination: '/veiculos?marca=Lamborghini',
        permanent: true,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Higher quality settings for vehicle images
    qualities: [60, 75, 85, 90, 100],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for thumbnails and smaller images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Increase default quality
    minimumCacheTTL: 60 * 60 * 24, // 24 hours cache
  },
  // Block access to automations folder (N8N workflows - internal only)
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/automations/:path*',
          destination: '/404',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Extra strict headers for admin routes
        source: '/admin/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
        ],
      },
      {
        // Prevent caching of API responses with sensitive data
        source: '/api/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
