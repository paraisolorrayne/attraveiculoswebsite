'use client'

/**
 * A lista de anúncios do Marketing (15/11/2026): um card por carro anunciado,
 * em grade, até o fim da página.
 *
 * Antes era um quadro de três colunas (Publicada, Encerrada por Ganho,
 * Encerrada por Desempenho) com altura fixa. As duas colunas de encerramento
 * não eram usadas e a única que tinha cards rolava dentro de uma caixa
 * pequena. A situação virou etiqueta no card e filtro acima da lista.
 *
 * Os cards ficam em seções, uma por campanha, com o total de cada uma.
 *
 * O card que veio da Meta abre a página do anúncio, com as métricas. O card
 * digitado à mão abre a edição da campanha, como sempre.
 */
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignVehicle, CampaignWithVehicles } from '@/types/database'
import { PausarAnuncio } from './pausar-anuncio'

export type SituacaoDoAnuncio = 'no-ar' | 'pausado' | 'troca' | 'encerrado' | 'manual'

export function situacaoDoAnuncio(v: CampaignVehicle): SituacaoDoAnuncio {
  if (v.status !== 'publicada') return 'encerrado'
  if ((v.meta_ad_ids?.length ?? 0) === 0) return 'manual'
  if (v.meta_no_ar !== false) return 'no-ar'
  return v.end_reason === 'troca_criativo' ? 'troca' : 'pausado'
}

const ETIQUETA: Record<SituacaoDoAnuncio, { rotulo: string; classe: string }> = {
  'no-ar': { rotulo: 'No ar', classe: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  pausado: { rotulo: 'Pausado na Meta', classe: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  troca: { rotulo: 'Trocando o criativo', classe: 'bg-purple-500/15 text-purple-700 dark:text-purple-400' },
  encerrado: { rotulo: 'Encerrado', classe: 'bg-foreground-secondary/15 text-foreground-secondary' },
  manual: { rotulo: 'Cadastrado à mão', classe: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
}

function data(d: string | null): string | null {
  if (!d) return null
  // T12:00:00 evita que o fuso jogue a data para o dia anterior.
  return new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export interface AnuncioDaLista {
  veiculo: CampaignVehicle
  campanha: CampaignWithVehicles
}

const dinheiro = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/**
 * Uma seção por campanha (Loja Rondon, Institucional...), cada uma com o seu
 * total. A ordem dos cards dentro da seção é a que a tela escolheu; as seções
 * vêm da que mais gastou para a que menos gastou.
 */
export function AnunciosLista({ itens, aoAbrirCampanha, podeEditar, aoMudar }: { itens: AnuncioDaLista[]; aoAbrirCampanha: (c: CampaignWithVehicles) => void; podeEditar: boolean; /** Com isto, cada card da Meta ganha o botão de pausar ou reativar. */ aoMudar?: () => void }) {
  const secoes = new Map<string, { campanha: CampaignWithVehicles; itens: AnuncioDaLista[]; gasto: number; noAr: number }>()
  for (const item of itens) {
    const s = secoes.get(item.campanha.id) ?? { campanha: item.campanha, itens: [], gasto: 0, noAr: 0 }
    s.itens.push(item)
    s.gasto += Number(item.veiculo.meta_gasto_30d ?? 0)
    if (situacaoDoAnuncio(item.veiculo) === 'no-ar') s.noAr += 1
    secoes.set(item.campanha.id, s)
  }
  const ordenadas = [...secoes.values()].sort((a, b) => b.gasto - a.gasto || a.campanha.name.localeCompare(b.campanha.name, 'pt-BR'))

  return (
    <div className="space-y-8">
      {ordenadas.map(secao => (
        <section key={secao.campanha.id} aria-label={secao.campanha.name}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
              <h2 className="text-lg font-semibold text-foreground">{secao.campanha.name}</h2>
              <span className="text-sm text-foreground-secondary">
                {secao.itens.length} {secao.itens.length === 1 ? 'anúncio' : 'anúncios'}
                {secao.noAr > 0 && `, ${secao.noAr} no ar`}
                {secao.gasto > 0 && ` · ${dinheiro(secao.gasto)} nos últimos 30 dias`}
              </span>
            </div>
            {podeEditar && (
              <button type="button" onClick={() => aoAbrirCampanha(secao.campanha)} className="min-h-10 text-sm font-medium text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline">
                Editar campanha
              </button>
            )}
          </div>
          <Cards itens={secao.itens} aoAbrirCampanha={aoAbrirCampanha} aoMudar={aoMudar} />
        </section>
      ))}
    </div>
  )
}

function Cards({ itens, aoAbrirCampanha, aoMudar }: { itens: AnuncioDaLista[]; aoAbrirCampanha: (c: CampaignWithVehicles) => void; aoMudar?: () => void }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {itens.map(({ veiculo, campanha }) => {
        const situacao = situacaoDoAnuncio(veiculo)
        const daMeta = (veiculo.meta_ad_ids?.length ?? 0) > 0
        const gasto = Number(veiculo.meta_gasto_30d ?? 0)
        const quando = data(veiculo.ended_date ?? veiculo.added_date)
        const corpo = (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 font-semibold leading-snug text-foreground">{veiculo.vehicle_name}</h3>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', ETIQUETA[situacao].classe)}>
                {ETIQUETA[situacao].rotulo}
              </span>
            </div>
            {daMeta && (
              <div className="mt-3 text-sm text-foreground-secondary">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                </span>{' '}
                nos últimos 30 dias
                {(veiculo.meta_ad_ids?.length ?? 0) > 1 && ` · ${veiculo.meta_ad_ids?.length} anúncios`}
              </div>
            )}
            {veiculo.notes && <p className="mt-2 line-clamp-2 text-sm text-foreground-secondary">{veiculo.notes}</p>}
            {quando && (
              <div className="mt-auto flex items-center gap-1 border-t border-border pt-3 text-xs text-foreground-secondary">
                <Calendar className="h-3.5 w-3.5" />
                {veiculo.ended_date ? 'encerrado em' : 'desde'} {quando}
              </div>
            )}
          </>
        )
        const classe = 'flex min-h-36 w-full flex-1 flex-col gap-0 rounded-xl border border-border bg-background-card p-4 text-left transition-colors hover:border-primary/50'
        return (
          <li key={veiculo.id} className="flex flex-col gap-2">
            {daMeta ? (
              <Link href={`/admin/marketing/anuncio/${veiculo.id}`} className={classe} title="Ver o desempenho do anúncio">
                {corpo}
              </Link>
            ) : (
              <button type="button" onClick={() => aoAbrirCampanha(campanha)} className={classe} title={`Abrir "${campanha.name}" para editar`}>
                {corpo}
              </button>
            )}
            {daMeta && aoMudar && (
              <PausarAnuncio
                cardId={veiculo.id}
                carro={veiculo.vehicle_name}
                anuncios={veiculo.meta_ad_ids?.length ?? 1}
                pausado={situacao !== 'no-ar'}
                aoMudar={aoMudar}
                compacto
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
