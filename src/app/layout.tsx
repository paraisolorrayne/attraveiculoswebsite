import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono, Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { VisitorTrackingProvider } from '@/components/providers/visitor-tracking-provider'
import { AnalyticsProvider, AnalyticsNoScript } from '@/components/analytics'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/blog-schema'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://attraveiculos.com.br'),
  title: {
    default: 'Attra Veículos | Supercarros e Veículos Premium no Brasil',
    template: '%s | Attra Veículos',
  },
  description:
    'Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil. Porsche, BMW, Mercedes-Benz, Audi, Land Rover e mais.',
  keywords: [
    'comprar carro de luxo brasil',
    'supercarros brasil',
    'carros premium',
    'veículos importados',
    'porsche seminovo brasil',
    'ferrari brasil',
    'bmw premium brasil',
    'mercedes amg brasil',
    'Uberlândia',
    'Porsche',
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Land Rover',
    'concessionária premium',
  ],
  authors: [{ name: 'Attra Veículos' }],
  creator: 'Attra Veículos',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://attraveiculos.com.br',
    siteName: 'Attra Veículos',
    title: 'Attra Veículos — Supercarros e Veículos Premium no Brasil',
    description:
      'Curadoria e comercialização de supercarros, importados e veículos premium com procedência verificada. Porsche, Ferrari, Lamborghini, BMW, Mercedes-Benz, McLaren e Audi. Entrega em todo o Brasil.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Attra Veículos — Supercarros e Veículos Premium no Brasil',
    description:
      'Curadoria e comercialização de supercarros, importados e veículos premium com procedência verificada. Porsche, Ferrari, Lamborghini, BMW, Mercedes-Benz, McLaren e Audi. Entrega em todo o Brasil.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Analytics scripts loaded in head for optimal tracking */}
        <AnalyticsProvider />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteSchema()) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}>
        {/* GTM NoScript fallback for users without JavaScript */}
        <AnalyticsNoScript />
        <ThemeProvider>
          <ToastProvider>
            <Suspense fallback={null}>
              <VisitorTrackingProvider>
                {children}
              </VisitorTrackingProvider>
            </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
