'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, SlidersHorizontal, ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          'w-full px-3 py-2.5 text-sm rounded-lg border text-left flex items-center justify-between transition-all',
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
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  // Separate sections - Brand is now a combobox, not in sections
  const [sections, setSections] = useState<FilterSection[]>([
    { title: 'Ano', key: 'ano', options: years, isOpen: true },
    { title: 'Carroceria', key: 'carroceria', options: bodyStyles, isOpen: false },
    { title: 'Combustível', key: 'combustivel', options: powertrains, isOpen: false },
    { title: 'Blindagem', key: 'blindagem', options: ['Sim', 'Não'], isOpen: false },
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
    router.push(`/veiculos?${params.toString()}`)
  }

  const handleBrandChange = (brand: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (brand) {
      params.set('marca', brand)
    } else {
      params.delete('marca')
    }
    params.delete('pagina') // Reset pagination
    router.push(`/veiculos?${params.toString()}`)
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
    router.push(`/veiculos?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/veiculos')
  }

  const isRangeSelected = (min: number, max: number | null) => {
    const currentMin = searchParams.get('precoMin')
    const currentMax = searchParams.get('precoMax')
    return currentMin === min.toString() && (max === null ? !currentMax : currentMax === max?.toString())
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

      {/* Filter sidebar/overlay */}
      <div className={cn(
        'fixed lg:relative inset-0 lg:inset-auto z-50 lg:z-auto transition-all duration-300',
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
          <div className="flex items-center justify-between mb-5 lg:mb-6">
            <h3 className="text-lg font-bold text-foreground">Filtros</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="mb-5 p-3 bg-background-soft rounded-lg">
              <div className="flex flex-wrap gap-2 mb-2">
                {activeFilters.map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => applyFilter(key, value)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 text-primary text-xs font-medium rounded-full hover:bg-primary/25 transition-colors"
                  >
                    <span className="capitalize">{value}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <button
                onClick={clearFilters}
                className="text-xs text-foreground-secondary hover:text-primary transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}

          {/* Brand Filter - Searchable Combobox */}
          <div className="mb-4 pb-4 border-b border-border">
            <label className="block py-2 text-foreground font-medium text-sm">
              Marca
            </label>
            <BrandCombobox
              value={selectedBrand}
              onChange={handleBrandChange}
              brands={PREMIUM_BRANDS}
            />
          </div>

          {/* Other filter sections - compact */}
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={section.key} className="border-b border-border pb-3">
                <button
                  onClick={() => toggleSection(index)}
                  className="flex items-center justify-between w-full py-2 text-foreground font-medium text-sm"
                >
                  {section.title}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', section.isOpen && 'rotate-180')} />
                </button>

                {section.isOpen && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => applyFilter(section.key, option.toLowerCase())}
                        className={cn(
                          'px-2.5 py-1.5 text-xs rounded-md border transition-all',
                          searchParams.get(section.key) === option.toLowerCase()
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground'
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

          {/* Price range - compact */}
          <div className="mt-3 pb-4">
            <p className="py-2 text-foreground font-medium text-sm">Faixa de preço</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {priceRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => applyPriceRange(range.min, range.max)}
                  className={cn(
                    'px-2.5 py-1.5 text-xs rounded-md border transition-all',
                    isRangeSelected(range.min, range.max)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-foreground-secondary hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

