'use client'

import { useState } from 'react'
import {
  Calendar,
  Megaphone,
  Trophy,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignWithVehicles, CampaignStatus, CampaignVehicle } from '@/types/database'

/**
 * O card do board é o VEÍCULO, não a campanha.
 *
 * As colunas descrevem o ciclo de vida de um anúncio — sai do ar porque vendeu
 * (ganho) ou porque não performou. Quando o card era a campanha, arrastá-lo
 * movia todos os anúncios dela de uma vez, e um card único acabava compilando
 * dezesseis veículos em estados diferentes. A campanha continua existindo como
 * agrupador: aparece como etiqueta no card e é por ela que se edita a lista.
 */
interface VeiculoNoBoard {
  veiculo: CampaignVehicle
  campanha: CampaignWithVehicles
}

interface CampaignsBoardProps {
  campaigns: CampaignWithVehicles[]
  onCampaignClick: (campaign: CampaignWithVehicles) => void
  onVehicleStatusChange: (vehicleId: string, newStatus: CampaignStatus) => void
  isAdmin: boolean
}

const COLUMNS: { id: CampaignStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'publicada', label: 'Publicada', color: 'bg-blue-500', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'encerrada_ganho', label: 'Encerrada por Ganho', color: 'bg-green-500', icon: <Trophy className="w-4 h-4" /> },
  { id: 'encerrada_desempenho', label: 'Encerrada por Desempenho', color: 'bg-orange-500', icon: <TrendingDown className="w-4 h-4" /> },
]

function formatarData(data: string | null): string | null {
  if (!data) return null
  // T12:00:00 evita que o fuso jogue a data para o dia anterior.
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function CampaignsBoard({
  campaigns,
  onCampaignClick,
  onVehicleStatusChange,
  isAdmin,
}: CampaignsBoardProps) {
  const [arrastado, setArrastado] = useState<VeiculoNoBoard | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<CampaignStatus | null>(null)

  // Achata campanhas em cards de veículo, preservando a ordem de exibição
  // definida dentro de cada campanha.
  const cards: VeiculoNoBoard[] = campaigns.flatMap(campanha =>
    (campanha.vehicles ?? []).map(veiculo => ({ veiculo, campanha })),
  )

  const handleDragStart = (item: VeiculoNoBoard) => {
    if (!isAdmin) return
    setArrastado(item)
  }

  const handleDragOver = (e: React.DragEvent, coluna: CampaignStatus) => {
    e.preventDefault()
    setColunaAlvo(coluna)
  }

  const handleDrop = (e: React.DragEvent, coluna: CampaignStatus) => {
    e.preventDefault()
    setColunaAlvo(null)
    if (arrastado && arrastado.veiculo.status !== coluna) {
      onVehicleStatusChange(arrastado.veiculo.id, coluna)
    }
    setArrastado(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
      {COLUMNS.map(column => {
        const daColuna = cards.filter(c => c.veiculo.status === column.id)

        return (
          <div
            key={column.id}
            className={cn(
              'bg-background-soft rounded-lg border border-border min-h-[400px]',
              colunaAlvo === column.id && 'ring-2 ring-primary',
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={() => setColunaAlvo(null)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', column.color)} />
                <span className="font-medium text-foreground text-sm">{column.label}</span>
              </div>
              <span className="text-sm text-foreground-secondary bg-background-card px-2 py-0.5 rounded-full">
                {daColuna.length}
              </span>
            </div>

            <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
              {daColuna.length === 0 && (
                <div className="flex items-center justify-center py-8 text-foreground-secondary text-sm">
                  Nenhum veículo
                </div>
              )}

              {daColuna.map(({ veiculo, campanha }) => (
                <div
                  key={veiculo.id}
                  draggable={isAdmin}
                  onDragStart={() => handleDragStart({ veiculo, campanha })}
                  onDragEnd={() => setArrastado(null)}
                  onClick={() => onCampaignClick(campanha)}
                  title={`Abrir "${campanha.name}" para editar`}
                  className={cn(
                    'bg-background-card border border-border rounded-lg p-3 cursor-pointer',
                    'hover:border-primary/50 hover:shadow-sm transition-all',
                    arrastado?.veiculo.id === veiculo.id && 'opacity-50',
                  )}
                >
                  <h4 className="font-semibold text-foreground text-sm leading-snug">
                    {veiculo.vehicle_name}
                  </h4>

                  {veiculo.notes && (
                    <p className="text-xs text-foreground-secondary mt-1.5 line-clamp-2">
                      {veiculo.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border">
                    <span className="text-xs text-foreground-secondary truncate" title={campanha.name}>
                      {campanha.name}
                    </span>
                    {formatarData(veiculo.ended_date ?? veiculo.added_date) && (
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary shrink-0">
                        <Calendar className="w-3 h-3" />
                        {formatarData(veiculo.ended_date ?? veiculo.added_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
