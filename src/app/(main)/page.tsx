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
  let heroVehicle: Vehicle | null = null
  try {
    const result = await getVehicles({
      tipo: 'carros',
      registros_por_pagina: 20,
      ordenar: 'preco',
      ordem: 'desc',
      preco_de: 500000,
    })
    const premium = result.vehicles.filter((v) => v.price >= 500000)
    const sorted = [...premium].sort((a, b) => b.price - a.price)

    if (sorted.length > 0) {
      // Hero sempre mostra o veículo mais caro do estoque — estável, sem
      // competir com a Seleção Editorial logo abaixo (que já traz o top 3).
      heroVehicle = sorted[0]
      editorialVehicles = sorted.slice(0, 3)
    }
  } catch (error) {
    console.error('Failed to fetch featured vehicles:', error)
  }

  return (
    <>
      {/* 1. Hero — premium positioning + 2 CTAs + trust chips */}
      <HomeHero vehicle={heroVehicle} />

      {/* 2. Captação imediata — formulário curto + fallback WhatsApp */}
      <LeadCaptureSection />

      {/* 3. Prova de confiança compacta */}
      <TrustStrip />

      {/* 4. Seleção editorial curada — substitui a antiga grade "Destaques" */}
      <EditorialSelection vehicles={editorialVehicles} />

      {/* 5. Posicionamento — rosto da marca (Thiago) + pilares narrativos.
             Também carrega os números de autoridade (16+ / 500 / 27 / 5.0). */}
      <AboutSectionExpanded />

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
