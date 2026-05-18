import type { Metadata } from 'next'
import {
  ExperienceSection,
  LocationSection,
  FAQSection,
  FeaturedEditorial,
  JourneyPreview,
  AboutSectionExpanded,
  HomeHero,
  LeadCaptureSection,
  TrustStrip,
  EditorialSelection,
} from '@/components/home'
import { FAQSchema } from '@/components/seo'
import { homepageFAQs } from '@/lib/faq-data'
import { getVehicles } from '@/lib/autoconf-api'
import { Vehicle } from '@/types'

// Pool mínimo de R$500k. Veículos abaixo disso nunca entram no hero,
// independentemente de outros critérios.
const HERO_MIN_PRICE = 500_000

// Janela de rotação: 15 dias. A quinzena N exibe um slice diferente do pool,
// garantindo que os veículos da quinzena N-1 não reapareçam (desde que o pool
// tenha >= 6 itens elegíveis — caso contrário, a repetição é inevitável).
const BIWEEKLY_MS = 15 * 24 * 60 * 60 * 1000
// Epoch fixo: âncora a paridade das quinzenas. Mudar este valor desloca todo
// o calendário de rotação, então não altere após produção.
const ROTATION_EPOCH_MS = Date.UTC(2026, 0, 1)

function getCurrentBiweekIndex(now = Date.now()): number {
  return Math.floor((now - ROTATION_EPOCH_MS) / BIWEEKLY_MS)
}

function selectBiweeklyHeroSlice(pool: Vehicle[], count: number): Vehicle[] {
  if (pool.length === 0) return []
  if (pool.length <= count) return pool.slice(0, count)
  const startIdx = (getCurrentBiweekIndex() * count) % pool.length
  return Array.from({ length: count }, (_, i) => pool[(startIdx + i) % pool.length])
}

export const metadata: Metadata = {
  title: 'Comprar Carros de Luxo e Supercarros no Brasil',
  description:
    'Supercarros, veículos premium e importados com curadoria e procedência verificada. Porsche, Ferrari, BMW, Mercedes-Benz, Lamborghini, McLaren e Audi. Entrega em todo o Brasil — Attra Veículos.',
  keywords: [
    'comprar carro de luxo brasil',
    'comprar supercarro brasil',
    'carros de luxo à venda brasil',
    'carros importados premium brasil',
    'supercarros brasil',
    'ferrari brasil preço',
    'porsche seminovo brasil',
    'bmw premium brasil',
    'mercedes amg brasil',
    'lamborghini brasil',
    'carros exclusivos alto desempenho',
    'loja de supercarros brasil',
  ],
  openGraph: {
    title: 'Attra Veículos — Supercarros e Veículos Premium no Brasil',
    description:
      'Curadoria de supercarros e veículos premium com procedência verificada. Porsche, Ferrari, Lamborghini, BMW, Mercedes-Benz e mais. Entrega nacional.',
  },
}

export default async function Home() {
  // Featured vehicles for the editorial selection (top 3 premium, rotates daily)
  let editorialVehicles: Vehicle[] = []
  let heroVehicles: Vehicle[] = []
  try {
    const result = await getVehicles({
      tipo: 'carros',
      registros_por_pagina: 50,
      ordenar: 'preco',
      ordem: 'desc',
      preco_de: HERO_MIN_PRICE,
    })
    const premium = result.vehicles.filter((v) => v.price >= HERO_MIN_PRICE)
    const sorted = [...premium].sort((a, b) => b.price - a.price)

    if (sorted.length > 0) {
      // Hierarquia: BANNER usa o top da curadoria; EDITORIAL pega os
      // imediatamente abaixo. Garantia matemática (sort decrescente):
      // qualquer veículo no hero é mais caro que qualquer veículo na
      // editorial — banner e curadoria nunca compartilham, e o banner
      // sempre carrega o ticket mais alto.
      //
      //   Hero pool      = top 6 mais caros (rotaciona 3 por quinzena)
      //   Editorial pool = posições 7-9 (próximos 3 abaixo do hero pool)
      const heroPool = sorted.slice(0, 6)
      const editorialPool = sorted.slice(6, 9)

      heroVehicles = heroPool.length >= 3
        ? selectBiweeklyHeroSlice(heroPool, 3)
        : heroPool
      // Se não houver 9+ veículos elegíveis, a editorial degrada
      // graciosamente para o que sobrar abaixo do hero pool.
      editorialVehicles = editorialPool.length > 0
        ? editorialPool
        : sorted.slice(heroVehicles.length, heroVehicles.length + 3)
    }
  } catch (error) {
    console.error('Failed to fetch featured vehicles:', error)
  }

  return (
    <>
      {/* 1. Hero — fullscreen cinematic with rotation between top 3 */}
      <HomeHero vehicles={heroVehicles} />

      {/* 2. Prova de confiança — antes da curadoria para reforçar a marca
             antes de pedir os dados do visitante. */}
      <TrustStrip />

      {/* 3. Seleção editorial curada — substitui a antiga grade "Destaques" */}
      <EditorialSelection vehicles={editorialVehicles} />

      {/* 4. Posicionamento — rosto da marca (Thiago) + pilares narrativos.
             Também carrega os números de autoridade (16+ / 500 / 27 / 5.0). */}
      <AboutSectionExpanded />

      {/* 5. Captação consultiva — form imediatamente antes da Operação,
             quando o visitante já consumiu prova social + curadoria + marca. */}
      <LeadCaptureSection />

      {/* 6. Diferenciais da operação */}
      <ExperienceSection />

      {/* 7. Jornada Attra */}
      <JourneyPreview />

      {/* 8. Conteúdo editorial */}
      <FeaturedEditorial />

      {/* 9. FAQ */}
      <FAQSection faqs={homepageFAQs} />
      <FAQSchema faqs={homepageFAQs} />

      {/* 10. Localização e contato */}
      <LocationSection />

      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AutoDealer',
            name: 'Attra Veículos',
            description:
              'Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil.',
            url: 'https://attraveiculos.com.br',
            telephone: '+55-34-3014-3232',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Av. Rondon Pacheco, 1670',
              addressLocality: 'Uberlândia',
              addressRegion: 'MG',
              postalCode: '38408-343',
              addressCountry: 'BR',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: -18.9186,
              longitude: -48.2772,
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '08:00',
                closes: '18:00',
              },
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'Saturday',
                opens: '08:00',
                closes: '13:00',
              },
            ],
            priceRange: '$$$',
            brand: ['Porsche', 'BMW', 'Mercedes-Benz', 'Audi', 'Land Rover', 'Ferrari', 'Lamborghini'],
          }),
        }}
      />
    </>
  )
}
