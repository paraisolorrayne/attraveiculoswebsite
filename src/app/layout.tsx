import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Cormorant_Garamond, Montserrat } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { VisitorTrackingProvider } from '@/components/providers/visitor-tracking-provider'
import { AnalyticsProvider, AnalyticsNoScript } from '@/components/analytics'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/blog-schema'
import { IMAGEM_COMPARTILHAMENTO } from '@/lib/seo/page-metadata'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Serifada dos títulos de destaque (o nome do carro na home; SERIFADA em
// cabecalho-secao.tsx). O resto do site é Montserrat, desde 29/10/2026: a Geist
// e a Outfit saíram (nunca chegavam a aparecer, ver globals.css).
const cormorant = Cormorant_Garamond({
  variable: '--font-editorial',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

// viewport-fit=cover: sem ele o env(safe-area-inset-*) vale 0 no iPhone e a
// barra de abas ficava colada no indicador de início (29/10/2026). As laterais
// do celular deitado são tratadas no globals.css.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

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
  // Sem título, descrição e url aqui: a página que não declara os seus herda
  // os do próprio metadata. Com eles, /sobre, /contato e as demais saíam no
  // WhatsApp com o título e o link da home.
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Attra Veículos',
    images: [IMAGEM_COMPARTILHAMENTO],
  },
  twitter: {
    card: 'summary_large_image',
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
      <body className={`${geistMono.variable} ${cormorant.variable} ${montserrat.variable} antialiased`}>
        {/* GTM NoScript fallback for users without JavaScript */}
        <AnalyticsNoScript />
        <ThemeProvider>
          <ToastProvider>
            {/*
              SEM <Suspense> em volta de {children}.
              O VisitorTrackingProvider lia a query com useSearchParams, e esse
              hook faz o subtree do Suspense mais próximo abandonar a
              renderização estática — com o boundary aqui, as 204 rotas
              estáticas iam ao ar com o fallback (null) no lugar da página
              inteira. O hook agora vive isolado dentro do provider, no próprio
              Suspense dele, que não renderiza nada.
            */}
            <VisitorTrackingProvider>
              {children}
            </VisitorTrackingProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
