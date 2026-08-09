'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const brandOptions = [
  { value: '', label: 'Todas as marcas' },
  { value: 'porsche', label: 'Porsche' },
  { value: 'bmw', label: 'BMW' },
  { value: 'mercedes-benz', label: 'Mercedes-Benz' },
  { value: 'audi', label: 'Audi' },
  { value: 'land-rover', label: 'Land Rover' },
  { value: 'cadillac', label: 'Cadillac' },
  { value: 'ferrari', label: 'Ferrari' },
  { value: 'lamborghini', label: 'Lamborghini' },
]

const fuelOptions = [
  { value: '', label: 'Todos os combustíveis' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'flex', label: 'Flex' },
]

const transmissionOptions = [
  { value: '', label: 'Todos os câmbios' },
  { value: 'automatico', label: 'Automático' },
  { value: 'manual', label: 'Manual' },
]

const bodyTypeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'suv', label: 'SUV' },
  { value: 'sedan', label: 'Sedã' },
  { value: 'hatch', label: 'Hatch' },
  { value: 'coupe', label: 'Cupê' },
  { value: 'conversivel', label: 'Conversível' },
  { value: 'perua', label: 'Perua' },
  // Faltava: 4 picapes do estoque não tinham opção correspondente.
  { value: 'picape', label: 'Picape' },
]

export function VehicleFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete('pagina') // Reset pagination on filter change
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (name: string, value: string) => {
    router.push(`${pathname}?${createQueryString(name, value)}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasActiveFilters = searchParams.toString().length > 0

  return (
    <div className="bg-background-card border border-border rounded-xl overflow-hidden">
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between p-4 font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
              Ativo
            </span>
          )}
        </span>
        <ChevronDown className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Filters content */}
      <div className={cn('lg:block', isOpen ? 'block' : 'hidden')}>
        <div className="p-4 space-y-4 border-t border-border lg:border-t-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground hidden lg:block">Filtros</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-primary hover:text-primary-hover flex items-center gap-1">
                <X className="w-4 h-4" /> Limpar
              </button>
            )}
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Marca</label>
            <Select
              options={brandOptions}
              value={searchParams.get('marca') || ''}
              onChange={(e) => handleFilterChange('marca', e.target.value)}
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Modelo</label>
            <Input
              placeholder="Ex: 911, X6, Classe E..."
              value={searchParams.get('modelo') || ''}
              onChange={(e) => handleFilterChange('modelo', e.target.value)}
            />
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ano</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="De" value={searchParams.get('ano_min') || ''} onChange={(e) => handleFilterChange('ano_min', e.target.value)} />
              <Input type="number" placeholder="Até" value={searchParams.get('ano_max') || ''} onChange={(e) => handleFilterChange('ano_max', e.target.value)} />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Valor</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Min" value={searchParams.get('preco_min') || ''} onChange={(e) => handleFilterChange('preco_min', e.target.value)} />
              <Input type="number" placeholder="Max" value={searchParams.get('preco_max') || ''} onChange={(e) => handleFilterChange('preco_max', e.target.value)} />
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Combustível</label>
            <Select options={fuelOptions} value={searchParams.get('combustivel') || ''} onChange={(e) => handleFilterChange('combustivel', e.target.value)} />
          </div>

          {/* Transmission */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Câmbio</label>
            <Select options={transmissionOptions} value={searchParams.get('cambio') || ''} onChange={(e) => handleFilterChange('cambio', e.target.value)} />
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Carroceria</label>
            <Select options={bodyTypeOptions} value={searchParams.get('carroceria') || ''} onChange={(e) => handleFilterChange('carroceria', e.target.value)} />
          </div>

          {/* Max Mileage */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Km máximo</label>
            <Input type="number" placeholder="Ex: 50000" value={searchParams.get('km_max') || ''} onChange={(e) => handleFilterChange('km_max', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}

