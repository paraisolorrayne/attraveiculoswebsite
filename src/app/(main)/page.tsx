import type { Metadata } from 'next'
import {
  LocationSection,
  FAQSection,
  JourneyPreview,
  AboutSectionExpanded,
  HomeHero,
  LeadCaptureSection,
  EditorialSelection,
  FaixaDeMarcas,
  marcasDaFaixa,
} from '@/components/home'
import { FAQSchema } from '@/components/seo'
import { homepageFAQs } from '@/lib/faq-data'
import { getVehicles } from '@/lib/autoconf-api'
import { canonicalUrl, IMAGEM_COMPARTILHAMENTO } from '@/lib/seo/page-metadata'
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
  // Era o mesmo título de /comprar ("Comprar Carros de Luxo e Supercarros no
  // Brasil"), e as duas disputavam a mesma busca. /comprar fica com a compra;
  // a home, com a loja.
  title: { absolute: 'Attra Veículos | Loja de Supercarros e Carros de Luxo no Brasil' },
  description:
    'Supercarros, veículos premium e importados com curadoria e procedência verificada. Porsche, Ferrari, BMW, Mercedes-Benz, Lamborghini, McLaren e Audi. Entrega em todo o Brasil. Attra Veículos.',
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
  alternates: { canonical: canonicalUrl('/') },
  openGraph: {
    images: [IMAGEM_COMPARTILHAMENTO],
    url: canonicalUrl('/'),
    title: 'Attra Veículos | Loja de Supercarros e Carros de Luxo no Brasil',
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

  // Faixa de marcas: estoque inteiro (sem o piso de preço do hero), para a
  // contagem por marca bater com a página de cada marca.
  let estoque: Vehicle[] = []
  let totalEstoque: number | undefined
  try {
    const resultado = await getVehicles({ tipo: 'carros', registros_por_pagina: 100 })
    estoque = resultado.vehicles
    totalEstoque = resultado.total
  } catch (error) {
    console.error('Failed to fetch stock for the brand strip:', error)
  }

  return (
    <>
      {/* 1. Hero em tela cheia com o vídeo da Attra no fundo (fixo, escolhido
             por ela). A abertura de marca fica no layout (abertura-attra.tsx). */}
      <HomeHero />

      {/* 2. Marcas com carro no estoque — atalho para a página de cada marca. */}
      <FaixaDeMarcas marcas={marcasDaFaixa(estoque)} />

      {/* 3. Acervo: seleção editorial curada. */}
      <EditorialSelection vehicles={editorialVehicles} totalEstoque={totalEstoque} />

      {/* Ordem desde 29/10/2026: Hero, Acervo, Prova social, Formulário,
          Jornada resumida, FAQ e Localização. O "Por que confiar", o "Mais do
          que carros" e o "Um novo jeito de operar" viraram uma seção só (a 4),
          e o blog saiu da home: os títulos cortavam na segunda linha, e o
          menu (Insights) leva a ele. */}

      {/* 4. Prova social: Thiago, os três princípios e os seis fatos. */}
      <AboutSectionExpanded />

      {/* 5. Captação consultiva, logo depois da prova. */}
      <LeadCaptureSection />

      {/* 6. Jornada Attra, resumida. */}
      <JourneyPreview />

      {/* 7. FAQ */}
      <FAQSection faqs={homepageFAQs} />
      <FAQSchema faqs={homepageFAQs} />

      {/* 8. Localização e contato */}
      <LocationSection />

      {/* A entidade AutoDealer não é redeclarada aqui: o layout raiz já emite o
          nó canônico com @id em todo documento. Este bloco declarava um segundo
          AutoDealer, com endereço e coordenadas divergentes do nó canônico. */}
    </>
  )
}
