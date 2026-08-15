'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Grid3X3, List, ArrowUpDown } from 'lucide-react'
import { VehicleCard } from './vehicle-card'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Vehicle } from '@/types'
import { useState } from 'react'
import { filtrarPorMarca } from '@/lib/marca-normalizacao'

const sortOptions = [
  { value: 'relevancia', label: 'Mais relevantes' },
  { value: 'preco_menor', label: 'Menor preço' },
  { value: 'preco_maior', label: 'Maior preço' },
  { value: 'ano_recente', label: 'Mais recentes' },
  { value: 'km_menor', label: 'Menor quilometragem' },
]

interface VehicleGridProps {
  searchParams: Record<string, string | undefined>
  vehicles: Vehicle[]
  totalCount?: number
}

export function VehicleGrid({ searchParams, vehicles, totalCount }: VehicleGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    if (value && value !== 'relevancia') {
      params.set('ordenar', value)
    } else {
      params.delete('ordenar')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Filter vehicles based on brand search params if needed
  let filteredVehicles = [...vehicles]

  if (searchParams.marca) {
    // Comparação por slug canônico (src/lib/marca-normalizacao).
    //
    // Era `includes()` com `.replace('-', ' ')`, e isso escondia 10 Mercedes:
    // o estoque grava "Mercedes", o filtro procurava "mercedes benz". O
    // `includes` também casava por substring, e o replace trocava só o
    // primeiro hífen.
    filteredVehicles = filtrarPorMarca(filteredVehicles, searchParams.marca)
  }

  const displayCount = totalCount ?? filteredVehicles.length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-background-card border border-border rounded-xl">
        <div className="text-sm text-foreground-secondary">
          <span className="font-medium text-foreground">{displayCount}</span> veículos encontrados
        </div>

        <div className="flex items-center gap-4">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-foreground-secondary" />
            <Select
              options={sortOptions}
              value={searchParams.ordenar || 'relevancia'}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-44"
            />
          </div>

          {/* View mode */}
          <div className="hidden sm:flex items-center gap-1 bg-background rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-background-card text-foreground' : 'text-foreground-secondary hover:text-foreground'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-background-card text-foreground' : 'text-foreground-secondary hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredVehicles.length > 0 ? (
        <div className={cn(
          'grid gap-6',
          viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
        )}>
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-background-card border border-border rounded-xl">
          <p className="text-foreground-secondary mb-4">Nenhum veículo encontrado com os filtros selecionados.</p>
          <button onClick={() => router.push(pathname)} className="text-primary hover:text-primary-hover font-medium">
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}

