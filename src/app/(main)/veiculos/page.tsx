import { Suspense } from 'react'
import { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AdvancedFilters, CinematicVehicleCard, VehiclePagination, FeaturedVehicleHero, VehicleSearchBar, EditorialCategoryChips } from '@/components/vehicles'
import { SortDropdown } from '@/components/vehicles/sort-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { getVehicles, type AutoConfFilters } from '@/lib/autoconf-api'
import { getCachedHeroAsset } from '@/lib/vehicle-hero-asset'
import { Vehicle } from '@/types'
import { VehicleRequestForm } from '@/components/forms/vehicle-request-form'
import { FAQSection } from '@/components/home'
import { FAQSchema } from '@/components/seo'
import { veiculosFAQs } from '@/lib/faq-data'
import { Search, Globe, Shield, Check, ArrowRight, CalendarCheck } from 'lucide-react'
import Link from 'next/link'
import { VehicleUnavailableToast } from '@/components/vehicles/vehicle-unavailable-toast'
import { availabilityFromStatus } from '@/lib/vehicle-schema'

// Brand similarity groups for vehicle suggestions
// When a brand has no stock, vehicles from brands in the same group(s) are suggested
const BRAND_SIMILARITY_GROUPS: string[][] = [
  // Superesportivos / Ultra Luxo
  ['ferrari', 'lamborghini', 'mclaren', 'porsche', 'aston martin', 'maserati'],
  // Gran Turismo / Luxury Performance
  ['bentley', 'rolls-royce', 'aston martin', 'maserati', 'mercedes-benz'],
  // Premium Europeu
  ['bmw', 'mercedes-benz', 'audi', 'jaguar', 'volvo', 'lexus'],
  // SUV Premium
  ['land rover', 'range rover', 'porsche', 'bmw', 'volvo', 'jeep'],
  // Premium Americano / Muscle
  ['cadillac', 'chevrolet', 'ford', 'dodge'],
  // Seminovos Volume
  ['toyota', 'honda', 'volkswagen', 'hyundai', 'nissan', 'kia', 'fiat', 'citroen', 'mitsubishi'],
]

function getSimilarBrands(brand: string): string[] {
  const normalized = brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const similar = new Set<string>()
  for (const group of BRAND_SIMILARITY_GROUPS) {
    if (group.some(b => b.includes(normalized) || normalized.includes(b))) {
      group.forEach(b => similar.add(b))
    }
  }
  similar.delete(normalized)
  return Array.from(similar)
}

export const metadata: Metadata = {
  title: 'Veículos Premium | Supercarros e Veículos de Luxo em Uberlândia | Attra Veículos',
  description: 'Explore nossos veículos premium em Uberlândia. Supercarros, importados e veículos de luxo com curadoria rigorosa e entrega em todo o Brasil. Porsche, Ferrari, BMW, Mercedes-Benz, Lamborghini e mais.',
}

interface VeiculosPageProps {
  searchParams: Promise<{
    marca?: string
    anoMin?: string
    anoMax?: string
    precoMin?: string
    precoMax?: string
    ordenar?: string
    pagina?: string
    q?: string
    carroceria?: string
    combustivel?: string
    ano?: string
    blindagem?: string
    categoria?: string
  }>
}

function VehicleListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-background-card rounded-2xl overflow-hidden flex flex-col md:flex-row">
          <Skeleton className="aspect-[4/3] md:w-[55%]" />
          <div className="p-8 flex-1 space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function VeiculosPage({ searchParams }: VeiculosPageProps) {
  const params = await searchParams
  const currentPage = Number(params.pagina) || 1
  const perPage = 12

  const filters: AutoConfFilters = {
    tipo: 'carros',
    pagina: currentPage,
    registros_por_pagina: perPage,
  }

  if (params.anoMin) filters.ano_de = parseInt(params.anoMin)
  if (params.anoMax) filters.ano_ate = parseInt(params.anoMax)
  if (params.precoMin) filters.preco_de = parseInt(params.precoMin)
  if (params.precoMax) filters.preco_ate = parseInt(params.precoMax)

  // Default sort: price descending (maior preço primeiro)
  // Always apply sorting - default to preco-desc when no param
  const sortParam = params.ordenar || 'preco-desc'
  switch (sortParam) {
    case 'preco-asc': filters.ordenar = 'preco'; filters.ordem = 'asc'; break
    case 'ano-desc': filters.ordenar = 'ano'; filters.ordem = 'desc'; break
    case 'km-asc': filters.ordenar = 'km'; filters.ordem = 'asc'; break
    case 'publicacao': filters.ordenar = 'publicacao'; filters.ordem = 'desc'; break
    case 'preco-desc':
    default: filters.ordenar = 'preco'; filters.ordem = 'desc'; break
  }

  let vehicles: Vehicle[] = []
  let suggestedVehicles: Vehicle[] = []
  let featuredVehicle: Vehicle | null = null
  let total = 0
  let totalPages = 1
  let error: unknown = null
  let allVehicles: Vehicle[] = []

  // Check if we have any filter that requires client-side processing
  const searchQuery = params.q?.toLowerCase().trim()
  const brandFilter = params.marca?.toLowerCase().trim()
  const carroceriaFilter = params.carroceria?.toLowerCase().trim()
  const combustivelFilter = params.combustivel?.toLowerCase().trim()
  const anoFilter = params.ano?.toLowerCase().trim()
  const blindagemFilter = params.blindagem?.toLowerCase().trim()
  const categoriaFilter = params.categoria?.toLowerCase().trim()
  const hasPriceFilter = !!(params.precoMin || params.precoMax)
  const hasSortFilter = !!params.ordenar

  // Include all filter types that need client-side processing (including price and sorting)
  const hasClientSideFilters = !!(searchQuery || brandFilter || carroceriaFilter || combustivelFilter || anoFilter || blindagemFilter || categoriaFilter || hasPriceFilter || hasSortFilter)

  try {
    // Always fetch all vehicles so we can pick featured and filter properly
    const searchFilters = { ...filters, registros_por_pagina: 100, pagina: 1 }

    const result = await getVehicles(searchFilters)
    allVehicles = result.vehicles
    vehicles = [...allVehicles]
    total = result.total
    totalPages = result.totalPages

    // Featured vehicle: pick one of the 3 most expensive
    // Show on first page even with editorial category filters (only hide for text/brand/technical filters)
    const hasHardFilters = !!(searchQuery || brandFilter || carroceriaFilter || combustivelFilter || anoFilter || blindagemFilter || hasPriceFilter)
    if (currentPage === 1 && !hasHardFilters && allVehicles.length > 0) {
      const sorted = [...allVehicles].sort((a, b) => b.price - a.price)
      const top3 = sorted.slice(0, Math.min(3, sorted.length))
      // Deterministic pick based on day of month to vary daily
      const dayIndex = new Date().getDate() % top3.length
      featuredVehicle = top3[dayIndex]
    }

    // Helper function to normalize text for search (removes accents, hyphens, special chars and lowercases)
    // This ensures "G63" matches "G-63", "Mercedes Benz" matches "Mercedes-Benz", etc.
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[-_./]/g, '')          // Remove hyphens, underscores, dots, slashes
    }

    // Apply client-side filtering for all filter types
    // since the API may not support these filters directly
    if (hasClientSideFilters) {
      const normalizedSearchQuery = searchQuery ? normalizeText(searchQuery) : ''
      const searchTerms = normalizedSearchQuery ? normalizedSearchQuery.split(/\s+/) : []
      const minPrice = params.precoMin ? parseInt(params.precoMin) : null
      const maxPrice = params.precoMax ? parseInt(params.precoMax) : null

      vehicles = allVehicles.filter(vehicle => {
        let matchesSearch = true
        let matchesBrand = true
        let matchesPrice = true
        let matchesCarroceria = true
        let matchesCombustivel = true
        let matchesAno = true
        let matchesBlindagem = true

        if (searchTerms.length > 0) {
          // Include body_type and category in search text for category matching (e.g., "conversível")
          // Normalize vehicle text to match accented/non-accented searches
          const vehicleText = normalizeText(
            `${vehicle.brand} ${vehicle.model} ${vehicle.year_model} ${vehicle.color || ''} ${vehicle.fuel_type || ''} ${vehicle.version || ''} ${vehicle.body_type || ''} ${vehicle.category || ''}`
          )
          // ALL search terms must match (AND logic)
          matchesSearch = searchTerms.every(term => vehicleText.includes(term))
        }

        if (brandFilter) {
          const normalizedBrand = normalizeText(vehicle.brand || '')
          const normalizedFilter = normalizeText(brandFilter)
          // Bidirectional includes: "mercedes" matches "mercedes-benz" and vice versa
          matchesBrand = normalizedBrand.includes(normalizedFilter) || normalizedFilter.includes(normalizedBrand)
        }

        if (carroceriaFilter) {
          matchesCarroceria = normalizeText(vehicle.body_type || '').includes(normalizeText(carroceriaFilter))
        }

        if (combustivelFilter) {
          matchesCombustivel = normalizeText(vehicle.fuel_type || '').includes(normalizeText(combustivelFilter))
        }

        if (anoFilter) {
          matchesAno = vehicle.year_model?.toString() === anoFilter
        }

        if (blindagemFilter) {
          const hasArmor = vehicle.options?.some(opt => {
            if (!opt) return false
            const normalized = opt.toLowerCase()
            return normalized.includes('blindad') || normalized.includes('blindagem')
          }) || false
          matchesBlindagem = blindagemFilter === 'sim' ? hasArmor : !hasArmor
        }

        // Apply price filter client-side when filtering
        if (minPrice !== null && vehicle.price < minPrice) matchesPrice = false
        if (maxPrice !== null && vehicle.price > maxPrice) matchesPrice = false

        // Editorial category filter
        let matchesCategoria = true
        if (categoriaFilter) {
          const brandLower = (vehicle.brand || '').toLowerCase()
          const bodyType = (vehicle.body_type || '').toLowerCase()
          const supercarBrands = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
          const sportsBrands = ['porsche', 'aston martin', 'maserati', 'lotus']
          const luxuryBrands = ['bentley', 'rolls-royce', 'maybach']

          switch (categoriaFilter) {
            case 'performance':
              matchesCategoria = supercarBrands.some(b => brandLower.includes(b)) || sportsBrands.some(b => brandLower.includes(b)) || (vehicle.horsepower != null && vehicle.horsepower >= 400)
              break
            case 'suv-premium':
              matchesCategoria = bodyType.includes('suv')
              break
            case 'premium':
              matchesCategoria = vehicle.price >= 300000 && !supercarBrands.some(b => brandLower.includes(b))
              break
            case 'oportunidades':
              matchesCategoria = vehicle.price < 300000
              break
            default:
              matchesCategoria = true
          }
        }

        return matchesSearch && matchesBrand && matchesPrice && matchesCarroceria && matchesCombustivel && matchesAno && matchesBlindagem && matchesCategoria
      })

      // If no exact matches, find suggestions
      if (vehicles.length === 0) {
        // Text search: partial match with OR logic
        if (searchTerms.length > 0) {
          suggestedVehicles = allVehicles.filter(vehicle => {
            const vehicleText = normalizeText(
              `${vehicle.brand} ${vehicle.model} ${vehicle.year_model} ${vehicle.color || ''} ${vehicle.fuel_type || ''} ${vehicle.version || ''} ${vehicle.body_type || ''} ${vehicle.category || ''}`
            )
            return searchTerms.some(term => vehicleText.includes(term))
          }).slice(0, 6)
        }

        // Brand filter: suggest vehicles from similar/competitor brands
        if (suggestedVehicles.length === 0 && brandFilter) {
          const similarBrands = getSimilarBrands(brandFilter)
          if (similarBrands.length > 0) {
            suggestedVehicles = allVehicles
              .filter(vehicle => {
                const vBrand = normalizeText(vehicle.brand || '')
                return similarBrands.some(sb => vBrand.includes(sb) || sb.includes(vBrand))
              })
              .sort((a, b) => b.price - a.price)
              .slice(0, 6)
          }
        }

        // Fallback: if still no suggestions, show the most premium vehicles available
        if (suggestedVehicles.length === 0 && allVehicles.length > 0) {
          suggestedVehicles = [...allVehicles]
            .sort((a, b) => b.price - a.price)
            .slice(0, 6)
        }
      }

      // Always apply client-side sorting - default to price desc (premium first)
      const effectiveSort = params.ordenar || 'preco-desc'
      vehicles.sort((a, b) => {
        switch (effectiveSort) {
          case 'preco-asc':
            return a.price - b.price
          case 'ano-desc':
            return b.year_model - a.year_model
          case 'km-asc':
            return a.mileage - b.mileage
          case 'preco-desc':
          default:
            return b.price - a.price
        }
      })

      total = vehicles.length
      totalPages = Math.ceil(total / perPage) || 1

      // Apply pagination to filtered results
      const startIndex = (currentPage - 1) * perPage
      vehicles = vehicles.slice(startIndex, startIndex + perPage)
    } else {
      // Even without client-side filters, always sort by price desc to show premium first
      vehicles.sort((a, b) => b.price - a.price)
      total = vehicles.length
      totalPages = Math.ceil(total / perPage) || 1
      const startIndex = (currentPage - 1) * perPage
      vehicles = vehicles.slice(startIndex, startIndex + perPage)
    }
  } catch (e) {
    console.error('Failed to fetch vehicles:', e)
    error = e
  }

  const breadcrumbItems = [{ label: 'Veículos', href: '/veiculos' }]

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://attraveiculos.com.br'
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Veículos Premium Disponíveis na Attra Veículos',
    description: 'Catálogo de supercarros, importados e veículos premium com curadoria e procedência verificada. Entrega em todo o Brasil.',
    numberOfItems: total,
    itemListElement: vehicles.slice(0, 20).map((v, i) => {
      const vName = [v.brand, v.model, v.version, v.year_model].filter(Boolean).join(' ')
      return {
        '@type': 'ListItem',
        position: (currentPage - 1) * perPage + i + 1,
        item: {
          '@type': 'Vehicle',
          name: vName,
          url: `${baseUrl}/veiculo/${v.slug}`,
          ...(v.brand ? { brand: { '@type': 'Brand', name: v.brand } } : {}),
          ...(v.model ? { model: v.model } : {}),
          vehicleModelDate: String(v.year_model),
          mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
          offers: {
            '@type': 'Offer',
            price: v.price,
            priceCurrency: 'BRL',
            availability: availabilityFromStatus(v.status),
            itemCondition: v.is_new || v.mileage === 0 ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
          },
          image: v.photos?.[0],
        },
      }
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      {/* Toast notification for redirected users from unavailable vehicle pages */}
      <Suspense fallback={null}>
        <VehicleUnavailableToast />
      </Suspense>

      {/* Breadcrumb */}
      <section className="pt-28 pb-4 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={breadcrumbItems} />
        </Container>
      </section>

      {/* Featured vehicle hero - only on first page with no active filters.
          Tenta o cache de remove-bg pelo ID do veículo destaque; se houver
          processado, mostra o carro flutuante (PNG transparente). Cache
          miss cai pra foto original dentro de um card.
          O cron de hero:preprocess processa o top 9 (hero pool + editorial
          pool) periodicamente, então o destaque deste pool já está
          cacheado na maioria dos dias. */}
      {featuredVehicle && (
        <FeaturedVehicleHero
          vehicle={featuredVehicle}
          noBgPhotoUrl={
            featuredVehicle.photos?.[0]
              ? (await getCachedHeroAsset(featuredVehicle.id, featuredVehicle.photos[0]))?.no_bg_public_url ?? null
              : null
          }
        />
      )}

      {/* Search + Editorial Categories */}
      <section className="py-6">
        <div className="w-full lg:w-[64%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <Suspense fallback={<Skeleton className="h-12 w-full" />}>
              <VehicleSearchBar />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <EditorialCategoryChips />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Main listing: ~82% width on desktop (sidebar + cards horizontais precisam de espaço) */}
      <section className="pb-20">
        <div className="w-full lg:w-[82%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-96 xl:w-[26rem] shrink-0">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <AdvancedFilters />
              </Suspense>
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-foreground-secondary">
                  <span className="text-foreground font-medium">{total}</span> veículos
                </p>
                <SortDropdown currentSort={params.ordenar} />
              </div>

              {error ? (
                <div className="text-center py-12 bg-background-card rounded-2xl">
                  <p className="text-foreground-secondary">Erro ao carregar veículos.</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="space-y-8">
                  {/* Suggestions Section */}
                  {suggestedVehicles.length > 0 && (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Não encontramos a combinação exata, mas temos sugestões para você:
                        </h3>
                        <p className="text-foreground-secondary text-sm">
                          Encontramos {suggestedVehicles.length} veículo{suggestedVehicles.length > 1 ? 's' : ''} que pode{suggestedVehicles.length > 1 ? 'm' : ''} te interessar
                        </p>
                      </div>
                      <div className="space-y-6">
                        {suggestedVehicles.map((vehicle) => (
                          <CinematicVehicleCard key={vehicle.id} vehicle={vehicle} layout="horizontal" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Form Section */}
                  <div className="bg-background-card border border-border rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="text-center py-8 px-6 border-b border-border">
                      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {suggestedVehicles.length > 0 ? 'Quer algo mais específico?' : 'Nenhum veículo encontrado'}
                      </h3>
                      <p className="text-foreground-secondary max-w-md mx-auto">
                        {suggestedVehicles.length > 0
                          ? 'Se nenhuma das sugestões acima atende, nossa equipe busca o veículo ideal para você.'
                          : 'Não encontrou o que procura? Nossa equipe busca o veículo ideal para você em todo o Brasil.'
                        }
                      </p>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-primary/5 border-b border-border">
                      {[
                        { icon: Search, title: 'Busca Personalizada', description: 'Encontramos seu carro ideal' },
                        { icon: Globe, title: 'Rede Nacional', description: 'Buscamos em todo o Brasil' },
                        { icon: Shield, title: 'Procedência Garantida', description: 'Inspeção de 150 pontos' },
                        { icon: Check, title: 'Sem Compromisso', description: 'Serviço 100% gratuito' },
                      ].map((feature) => (
                        <div key={feature.title} className="text-center">
                          <feature.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="font-medium text-foreground text-sm">{feature.title}</p>
                          <p className="text-xs text-foreground-secondary">{feature.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Form */}
                    <div className="p-6 md:p-8">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Descreva o veículo que você procura</h4>
                      <VehicleRequestForm />
                    </div>
                  </div>
                </div>
              ) : (
                <Suspense fallback={<VehicleListSkeleton />}>
                  <div className="space-y-4">
                    {vehicles.map((vehicle) => (
                      <CinematicVehicleCard key={vehicle.id} vehicle={vehicle} layout="horizontal" />
                    ))}
                  </div>
                </Suspense>
              )}

              {totalPages > 1 && (
                <div className="mt-12">
                  <VehiclePagination currentPage={currentPage} totalPages={totalPages} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Concierge CTA */}
      <section className="py-16 bg-gradient-to-br from-primary via-primary to-primary-hover">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <CalendarCheck className="w-12 h-12 text-white/90 mx-auto mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
              Agendar Atendimento Exclusivo
            </h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Escolha o melhor horário para falar com um consultor especializado Attra sobre veículos premium e supercarros
            </p>
            <a
              href="https://wa.me/553432563200?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20um%20atendimento%20exclusivo%20com%20um%20consultor%20Attra."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
            >
              Agendar meu horário <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <FAQSection
        faqs={veiculosFAQs}
        title="Dúvidas sobre Veículos Premium e Supercarros"
        subtitle="Perguntas frequentes sobre compra de carros de luxo na Attra Veículos"
      />
      <FAQSchema faqs={veiculosFAQs} />
    </>
  )
}
