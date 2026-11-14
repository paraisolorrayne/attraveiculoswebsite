'use client'

/**
 * Painel lateral com as métricas da Meta de um card do quadro (14/11/2026).
 *
 * Abre no clique do card que veio da Meta. Os números são lidos na hora
 * (/api/admin/marketing/campaigns/vehicles/[id]/metricas) e não ficam no
 * banco. Um carro pode ter mais de um anúncio (vídeo e carrossel): o topo
 * soma todos e a lista embaixo mostra cada um.
 *
 * O alcance só aparece por anúncio. Somar alcance entre anúncios contaria a
 * mesma pessoa mais de uma vez, então o total não mostra esse número.
 */
import { useEffect, useState } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Metricas, MetricasDoCard, PeriodoDaMeta } from '@/lib/meta-ads'
import type { CampaignVehicle, CampaignWithVehicles } from '@/types/database'

const PERIODOS: { id: PeriodoDaMeta; rotulo: string }[] = [
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'total', rotulo: 'Desde o início' },
]

const inteiro = (n: number) => Math.round(n).toLocaleString('pt-BR')
const real = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : 'sem dado'
const custo = (gasto: number, n: number) => (n > 0 ? real(gasto / n) : 'sem dado')
const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function Numero({ valor, rotulo, nota }: { valor: string; rotulo: string; nota?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background-soft p-3">
      <div className="text-xl font-semibold tabular-nums text-foreground">{valor}</div>
      <div className="mt-0.5 text-sm text-foreground-secondary">{rotulo}</div>
      {nota && <div className="mt-0.5 text-xs text-foreground-secondary">{nota}</div>}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{titulo}</h3>
      {children}
    </section>
  )
}

function Grade({ m, alcance }: { m: Metricas; alcance?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Numero valor={real(m.gasto)} rotulo="Gasto" />
      <Numero valor={inteiro(m.conversas)} rotulo="Conversas iniciadas" nota={`${custo(m.gasto, m.conversas)} por conversa`} />
      <Numero valor={inteiro(m.cliquesNoLink)} rotulo="Cliques no link" nota={`${custo(m.gasto, m.cliquesNoLink)} por clique`} />
      <Numero valor={inteiro(m.impressoes)} rotulo="Impressões" nota={m.impressoes > 0 ? `${real((m.gasto / m.impressoes) * 1000)} por mil` : undefined} />
      <Numero valor={pct(m.cliquesNoLink, m.impressoes)} rotulo="Taxa de clique (CTR)" />
      {alcance !== undefined && (
        <Numero valor={inteiro(alcance)} rotulo="Pessoas alcançadas" nota={alcance > 0 ? `${(m.impressoes / alcance).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes por pessoa` : undefined} />
      )}
      {m.leads > 0 && <Numero valor={inteiro(m.leads)} rotulo="Leads" nota={`${custo(m.gasto, m.leads)} por lead`} />}
      {m.visitasNaPagina > 0 && <Numero valor={inteiro(m.visitasNaPagina)} rotulo="Visitas à página" />}
    </div>
  )
}

/** Barras do gasto por dia. Sem biblioteca: são no máximo algumas dezenas de dias. */
function PorDia({ dias }: { dias: MetricasDoCard['porDia'] }) {
  const maior = Math.max(...dias.map(d => d.gasto), 0)
  if (maior === 0) return <p className="text-sm text-foreground-secondary">Sem gasto no período.</p>
  // No "desde o início" podem ser muitos dias: mostra os 60 mais recentes.
  const visiveis = dias.slice(-60)
  return (
    <div>
      <div className="flex h-28 items-end gap-px" role="img" aria-label="Gasto por dia">
        {visiveis.map(d => (
          <div
            key={d.dia}
            title={`${diaCurto(d.dia)}: ${real(d.gasto)}, ${inteiro(d.conversas)} conversas`}
            className="min-w-0 flex-1 rounded-t-sm bg-primary/70 hover:bg-primary"
            style={{ height: `${Math.max(2, (d.gasto / maior) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-foreground-secondary">
        <span>{diaCurto(visiveis[0].dia)}</span>
        <span>maior dia: {real(maior)}</span>
        <span>{diaCurto(visiveis[visiveis.length - 1].dia)}</span>
      </div>
    </div>
  )
}

export function PainelAnuncio({
  veiculo,
  campanha,
  podeEditar,
  aoEditar,
  aoFechar,
}: {
  veiculo: CampaignVehicle
  campanha: CampaignWithVehicles
  podeEditar: boolean
  aoEditar: () => void
  aoFechar: () => void
}) {
  const [periodo, setPeriodo] = useState<PeriodoDaMeta>('30d')
  // A resposta guarda de qual pedido veio: enquanto não for a do período
  // escolhido, a tela mostra "lendo" em vez do número do período anterior.
  const [resposta, setResposta] = useState<{ chave: string; metricas: MetricasDoCard | null; erro: string | null } | null>(null)
  const chave = `${veiculo.id}:${periodo}`

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/marketing/campaigns/vehicles/${veiculo.id}/metricas?periodo=${periodo}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        setResposta(r.ok && d?.metricas
          ? { chave, metricas: d.metricas, erro: null }
          : { chave, metricas: null, erro: d?.error || 'Não foi possível ler as métricas agora.' })
      })
      .catch(() => vivo && setResposta({ chave, metricas: null, erro: 'Não foi possível falar com o servidor.' }))
    return () => { vivo = false }
  }, [veiculo.id, periodo, chave])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  const atual = resposta?.chave === chave ? resposta : null
  const m = atual?.metricas ?? null
  const temVideo = !!m && m.total.video.inicios > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/50" onClick={aoFechar} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Métricas de ${veiculo.vehicle_name}`}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-background-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{veiculo.vehicle_name}</h2>
            <p className="mt-0.5 truncate text-sm text-foreground-secondary">
              {campanha.name}
              {veiculo.meta_no_ar === false ? ' · pausado na Meta' : veiculo.meta_no_ar ? ' · no ar' : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {podeEditar && (
              <button type="button" onClick={aoEditar} className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:border-foreground-secondary">
                <Pencil className="h-4 w-4" />
                Editar campanha
              </button>
            )}
            <button type="button" onClick={aoFechar} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background-soft hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background-soft p-1" role="group" aria-label="Período">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                type="button"
                aria-pressed={periodo === p.id}
                onClick={() => setPeriodo(p.id)}
                className={cn(
                  'min-h-10 flex-1 rounded-md px-3 text-sm font-medium transition-colors',
                  periodo === p.id ? 'bg-primary text-white' : 'text-foreground-secondary hover:text-foreground',
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>

          {!atual ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-foreground-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Lendo a Meta
            </div>
          ) : atual.erro || !m ? (
            <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">{atual.erro}</p>
          ) : m.anuncios.length === 0 ? (
            <p className="mt-6 rounded-lg border border-border bg-background-soft p-4 text-sm text-foreground-secondary">
              A Meta não tem entrega registrada para este anúncio no período.
            </p>
          ) : (
            <>
              <Secao titulo={m.anuncios.length > 1 ? `Soma dos ${m.anuncios.length} anúncios deste carro` : 'Resultado'}>
                <Grade m={m.total} alcance={m.anuncios.length === 1 ? m.anuncios[0].alcance : undefined} />
              </Secao>

              <Secao titulo="Gasto por dia">
                <PorDia dias={m.porDia} />
              </Secao>

              {temVideo && (
                <Secao titulo="Vídeo">
                  <div className="space-y-1.5">
                    {([['Assistiram 25%', m.total.video.p25], ['Assistiram 50%', m.total.video.p50], ['Assistiram 75%', m.total.video.p75], ['Assistiram até o fim', m.total.video.p100]] as const).map(([rotulo, v]) => (
                      <div key={rotulo} className="flex items-center gap-3 text-sm">
                        <span className="w-36 shrink-0 text-foreground-secondary">{rotulo}</span>
                        <div className="h-2 min-w-0 flex-1 rounded-full bg-background-soft">
                          <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (v / m.total.video.inicios) * 100)}%` }} />
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-right tabular-nums text-foreground">{inteiro(v)} ({pct(v, m.total.video.inicios)})</span>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-foreground-secondary">{inteiro(m.total.video.inicios)} inícios de vídeo no período.</p>
                  </div>
                </Secao>
              )}

              {m.porPosicionamento.length > 0 && (
                <Secao titulo="Onde apareceu">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-foreground-secondary">
                          <th className="py-2 pr-3 font-medium">Posicionamento</th>
                          <th className="py-2 pr-3 text-right font-medium">Gasto</th>
                          <th className="py-2 pr-3 text-right font-medium">Impressões</th>
                          <th className="py-2 pr-3 text-right font-medium">Cliques</th>
                          <th className="py-2 text-right font-medium">Conversas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.porPosicionamento.map(p => (
                          <tr key={p.nome} className="border-b border-border/60">
                            <td className="py-2 pr-3 text-foreground">{p.nome}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-foreground">{real(p.gasto)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-foreground-secondary">{inteiro(p.impressoes)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-foreground-secondary">{inteiro(p.cliquesNoLink)}</td>
                            <td className="py-2 text-right tabular-nums text-foreground-secondary">{inteiro(p.conversas)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Secao>
              )}

              {m.anuncios.length > 1 && (
                <Secao titulo="Cada anúncio">
                  <div className="space-y-4">
                    {m.anuncios.map(a => (
                      <div key={a.id}>
                        <p className="mb-2 text-sm text-foreground">{a.nome || `Anúncio ${a.id}`}</p>
                        <Grade m={a} alcance={a.alcance} />
                      </div>
                    ))}
                  </div>
                </Secao>
              )}

              <p className="mt-6 text-xs text-foreground-secondary">
                Números da Meta, lidos às {new Date(m.lidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Conversa iniciada é o que a Meta conta, não o lead que chegou ao CRM.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
