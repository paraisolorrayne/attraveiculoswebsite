'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, SlidersHorizontal, ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avisarNavegacao } from '@/lib/navegacao'

// Fixed premium brand list ordered by commercial priority
const PREMIUM_BRANDS = [
  // Grupo 1 - Superesportivos / Ultra Luxo
  'Ferrari', 'Lamborghini', 'McLaren', 'Porsche', 'Aston Martin', 'Bentley', 'Rolls-Royce', 'Maserati',
  // Grupo 2 - Premium Europeu
  'BMW', 'Mercedes-Benz', 'Audi', 'Land Rover', 'Range Rover', 'Jaguar', 'Volvo',
  // Grupo 3 - Premium Americano / Esportivos
  'Cadillac', 'Chevrolet', 'Ford', 'Dodge',
  // Grupo 4 - Seminovos Premium / Populares
  'Toyota', 'Lexus', 'Honda', 'Jeep', 'Volkswagen', 'Hyundai', 'Mitsubishi', 'Nissan', 'Kia', 'Fiat', 'Citroën',
]

const bodyStyles = ['Cupê', 'Sedan', 'SUV', 'Conversível', 'Hatch', 'Wagon', 'Picape']
const powertrains = ['Gasolina', 'Diesel', 'Híbrido', 'Elétrico', 'Flex']
const years = Array.from({ length: 10 }, (_, i) => (2025 - i).toString())
const priceRanges = [
  { label: 'Até R$ 300 mil', min: 0, max: 300000 },
  { label: 'R$ 300k - 500k', min: 300000, max: 500000 },
  { label: 'R$ 500k - 1M', min: 500000, max: 1000000 },
  { label: 'R$ 1M - 2M', min: 1000000, max: 2000000 },
  { label: 'Acima de R$ 2M', min: 2000000, max: null },
]

// Searchable Combobox Component for brands
function BrandCombobox({
  value,
  onChange,
  brands
}: {
  value: string | null
  onChange: (brand: string | null) => void
  brands: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter brands based on search
  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands
    return brands.filter(brand =>
      brand.toLowerCase().includes(search.toLowerCase())
    )
  }, [brands, search])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (brand: string) => {
    onChange(value === brand.toLowerCase() ? null : brand.toLowerCase())
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className={cn(
          'w-full px-3 py-2 text-[13px] rounded-lg border text-left flex items-center justify-between transition-colors',
          value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-foreground-secondary hover:border-primary/50'
        )}
      >
        <span className={value ? 'capitalize' : ''}>
          {value || 'Selecionar marca'}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border sticky top-0 bg-background-card">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar marca..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Brand list */}
          <div className="overflow-y-auto max-h-48">
            {filteredBrands.length === 0 ? (
              <div className="px-3 py-4 text-sm text-foreground-secondary text-center">
                Nenhuma marca encontrada
              </div>
            ) : (
              filteredBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleSelect(brand)}
                  className={cn(
                    'w-full px-3 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors',
                    value === brand.toLowerCase()
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-secondary'
                  )}
                >
                  {brand}
                  {value === brand.toLowerCase() && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FilterSection {
  title: string
  key: string
  options: string[]
  isOpen: boolean
}

export function AdvancedFilters() {
  const router = useRouter()
  const urlParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  // Filtro clicado aparece marcado na hora, antes de a página nova chegar
  // (~1 s em /veiculos). Vale só enquanto o endereço é o de quando se clicou:
  // quando o resultado chega, quem manda de novo é a URL.
  const [otimista, setOtimista] = useState<{ base: string; params: string } | null>(null)
  const searchParams = useMemo(
    () => (otimista && otimista.base === urlParams.toString() ? new URLSearchParams(otimista.params) : urlParams),
    [otimista, urlParams],
  )

  const navegar = (params: URLSearchParams) => {
    const destino = params.toString() ? `/veiculos?${params.toString()}` : '/veiculos'
    setOtimista({ base: urlParams.toString(), params: params.toString() })
    avisarNavegacao(destino)
    router.push(destino)
  }

  // Seções fechadas por padrão (a lateral fica curta); abre a que já tem filtro.
  const [sections, setSections] = useState<FilterSection[]>(() => [
    { title: 'Carroceria', key: 'carroceria', options: bodyStyles, isOpen: !!urlParams.get('carroceria') },
    { title: 'Ano', key: 'ano', options: years, isOpen: !!urlParams.get('ano') },
    { title: 'Combustível', key: 'combustivel', options: powertrains, isOpen: !!urlParams.get('combustivel') },
    { title: 'Blindagem', key: 'blindagem', options: ['Sim', 'Não'], isOpen: !!urlParams.get('blindagem') },
  ])

  // Get active filters (excluding pagination params)
  const activeFilters = Array.from(searchParams.entries()).filter(
    ([key]) => !['pagina', 'ordenar'].includes(key)
  )

  const selectedBrand = searchParams.get('marca')

  const toggleSection = (index: number) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, isOpen: !s.isOpen } : s))
  }

  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get(key)
    if (current === value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('pagina') // Reset pagination when filtering
    navegar(params)
  }

  const handleBrandChange = (brand: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (brand) {
      params.set('marca', brand)
    } else {
      params.delete('marca')
    }
    params.delete('pagina') // Reset pagination
    navegar(params)
  }

  const applyPriceRange = (min: number, max: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentMin = params.get('precoMin')
    const currentMax = params.get('precoMax')

    // Toggle off if same range is selected
    if (currentMin === min.toString() && (max === null ? !currentMax : currentMax === max.toString())) {
      params.delete('precoMin')
      params.delete('precoMax')
    } else {
      params.set('precoMin', min.toString())
      if (max) params.set('precoMax', max.toString())
      else params.delete('precoMax')
    }
    params.delete('pagina')
    navegar(params)
  }

  const clearFilters = () => {
    navegar(new URLSearchParams())
  }

  const isRangeSelected = (min: number, max: number | null) => {
    const currentMin = searchParams.get('precoMin')
    const currentMax = searchParams.get('precoMax')
    return currentMin === min.toString() && (max === null ? !currentMax : currentMax === max?.toString())
  }

  // Filtros ativos com nome de gente: a faixa de preço vira um chip só
  // ("R$ 300k - 500k"), em vez de "300000" e "500000" soltos.
  const faixaAtiva = priceRanges.find((range) => isRangeSelected(range.min, range.max))
  const rotuloDoFiltro = (key: string, value: string) => {
    if (key === 'q') return `“${value}”`
    if (key === 'precoMin') return `a partir de R$ ${Number(value).toLocaleString('pt-BR')}`
    if (key === 'precoMax') return `até R$ ${Number(value).toLocaleString('pt-BR')}`
    return value.replace(/-/g, ' ')
  }

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-background-card border border-border rounded-xl text-foreground font-medium"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
        {activeFilters.length > 0 && (
          <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{activeFilters.length}</span>
        )}
      </button>

      {/* Filter sidebar/overlay. overflow-hidden no celular: o painel fechado
          fica 320 px à direita da tela (translate-x-full) e, sem o corte,
          alargava /veiculos para 760 px num celular de 440 — a página inteira
          arrastava para o lado e a barra de abas saía cortada. */}
      <div className={cn(
        'fixed lg:relative inset-0 lg:inset-auto z-50 lg:z-auto transition-all duration-300 overflow-hidden lg:overflow-visible',
        isOpen ? 'visible' : 'invisible lg:visible'
      )}>
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/50 lg:hidden transition-opacity',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsOpen(false)}
        />

        {/* Filter panel */}
        <div className={cn(
          'absolute lg:relative right-0 top-0 bottom-0 w-80 lg:w-full bg-background lg:bg-transparent p-5 lg:p-0 overflow-y-auto transition-transform lg:transition-none',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-secondary">Filtros</h3>
            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline transition-colors"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Fechar filtros"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {faixaAtiva && (
                <button
                  onClick={() => applyPriceRange(faixaAtiva.min, faixaAtiva.max)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary text-xs font-medium rounded-md hover:bg-primary/25 transition-colors"
                >
                  {faixaAtiva.label}
                  <X className="w-3 h-3" />
                </button>
              )}
              {activeFilters
                .filter(([key]) => !(faixaAtiva && (key === 'precoMin' || key === 'precoMax')))
                .map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => applyFilter(key, value)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary text-xs font-medium rounded-md hover:bg-primary/25 transition-colors"
                  >
                    <span className={key === 'q' ? undefined : 'capitalize'}>{rotuloDoFiltro(key, value)}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
            </div>
          )}

          {/* Brand Filter - Searchable Combobox */}
          <div className="pb-4 border-b border-border/60">
            <label className="block pb-2 text-foreground font-medium text-[13px]">
              Marca
            </label>
            <BrandCombobox
              value={selectedBrand}
              onChange={handleBrandChange}
              brands={PREMIUM_BRANDS}
            />
          </div>

          {/* Faixa de preço — sempre aberta: é o filtro de quem está decidindo */}
          <div className="py-4 border-b border-border/60">
            <p className="pb-2 text-foreground font-medium text-[13px]">Faixa de preço</p>
            <div className="flex flex-wrap gap-1.5">
              {priceRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => applyPriceRange(range.min, range.max)}
                  aria-pressed={isRangeSelected(range.min, range.max)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md border transition-colors',
                    isRangeSelected(range.min, range.max)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-foreground-secondary hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Other filter sections - compact */}
          <div>
            {sections.map((section, index) => (
              <div key={section.key} className="border-b border-border/60 py-1 last:border-b-0">
                <button
                  onClick={() => toggleSection(index)}
                  aria-expanded={section.isOpen}
                  className="flex items-center justify-between w-full py-2.5 text-foreground font-medium text-[13px]"
                >
                  {section.title}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', section.isOpen && 'rotate-180')} />
                </button>

                {section.isOpen && (
                  <div className="flex flex-wrap gap-1.5 pb-3">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => applyFilter(section.key, option.toLowerCase())}
                        aria-pressed={searchParams.get(section.key) === option.toLowerCase()}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-md border transition-colors',
                          searchParams.get(section.key) === option.toLowerCase()
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border text-foreground-secondary hover:border-foreground/30 hover:text-foreground'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}

