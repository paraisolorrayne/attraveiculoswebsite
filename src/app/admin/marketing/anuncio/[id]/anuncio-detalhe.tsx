'use client'

/**
 * A página do anúncio: os números da Meta do carro, lidos na hora.
 *
 * Um carro pode ter mais de um anúncio (vídeo e carrossel). O topo soma todos
 * e a tabela "Cada anúncio" mostra um por linha. O alcance só existe por
 * anúncio: somar entre anúncios contaria a mesma pessoa mais de uma vez.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import type { MetricasDoCard, PeriodoDaMeta } from '@/lib/meta-ads'
import { PausarAnuncio } from '../../components/pausar-anuncio'
import { custo, GradeDeNumeros, GraficoPorDia, horaDe, inteiro, Painel, pct, real, SeletorDePeriodo } from '../../components/metricas-ui'

export interface CardDoAnuncio {
  id: string
  carro: string
  campanha: string
  campanhaId: string
  encerrado: boolean
  noAr: boolean | null
  /** Pausado para trocar o criativo: o anúncio novo ainda não entrou. */
  emTroca: boolean
  anuncios: number
  desde: string | null
}

const TH = 'whitespace-nowrap py-2.5 pr-4 text-left text-sm font-medium text-foreground-secondary'
const THD = 'whitespace-nowrap py-2.5 pr-4 text-right text-sm font-medium text-foreground-secondary last:pr-0'
const TD = 'py-2.5 pr-4 text-foreground'
const TDD = 'whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-foreground last:pr-0'

export function AnuncioDetalhe({ card, periodoInicial }: { card: CardDoAnuncio; periodoInicial: PeriodoDaMeta }) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<PeriodoDaMeta>(periodoInicial)
  const [resposta, setResposta] = useState<{ periodo: PeriodoDaMeta; metricas: MetricasDoCard | null; erro: string | null } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/marketing/campaigns/vehicles/${card.id}/metricas?periodo=${periodo}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        setResposta(r.ok && d?.metricas ? { periodo, metricas: d.metricas, erro: null } : { periodo, metricas: null, erro: d?.error || 'Não foi possível ler as métricas agora.' })
      })
      .catch(() => vivo && setResposta({ periodo, metricas: null, erro: 'Não foi possível falar com o servidor.' }))
    return () => { vivo = false }
  }, [card.id, periodo])

  const mudarPeriodo = (p: PeriodoDaMeta) => {
    setPeriodo(p)
    // O período fica na URL para o link poder ser mandado para alguém.
    window.history.replaceState(null, '', `?periodo=${p}`)
  }

  const atual = resposta?.periodo === periodo ? resposta : null
  const m = atual?.metricas ?? null
  const situacao = card.encerrado ? 'Encerrado no quadro' : card.noAr === false ? (card.emTroca ? 'Trocando o criativo' : 'Pausado na Meta') : 'No ar'
  const desde = card.desde ? new Date(`${card.desde}T12:00:00`).toLocaleDateString('pt-BR') : null
  const maiorGastoPublico = m ? Math.max(...m.porPublico.map(p => p.gasto), 0) : 0

  return (
    <div className="min-h-screen bg-background pb-12">
      <CabecalhoPagina
        titulo={card.carro}
        descricao={[card.campanha, situacao, card.anuncios > 1 ? `${card.anuncios} anúncios` : null, desde ? `no ar desde ${desde}` : null].filter(Boolean).join(' · ')}
        trilha={[{ rotulo: 'Marketing', href: '/admin/marketing' }, { rotulo: 'Anúncios', href: '/admin/marketing' }]}
        acoes={<>
          <PausarAnuncio
            cardId={card.id}
            carro={card.carro}
            anuncios={card.anuncios}
            pausado={card.encerrado || card.noAr === false}
            // O estado do card vem do servidor: recarrega os dados da página.
            aoMudar={() => router.refresh()}
          />
          <Link href={`/admin/marketing?editar=${card.campanhaId}`} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background-card px-4 text-sm font-medium text-foreground hover:border-foreground-secondary">
            <Pencil className="h-4 w-4" />
            Editar campanha
          </Link>
        </>}
      />

      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SeletorDePeriodo periodo={periodo} aoMudar={mudarPeriodo} />
          {m && <span className="text-sm text-foreground-secondary">Números da Meta, lidos às {horaDe(m.lidoEm)}</span>}
        </div>

        {!atual ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-foreground-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            Lendo a Meta
          </div>
        ) : atual.erro || !m ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-foreground">{atual.erro}</p>
        ) : m.anuncios.length === 0 ? (
          <p className="rounded-xl border border-border bg-background-card p-6 text-foreground-secondary">
            A Meta não tem entrega registrada para este anúncio no período. Tente um período maior.
          </p>
        ) : (
          <>
            <GradeDeNumeros m={m.total} alcance={m.anuncios.length === 1 ? m.anuncios[0].alcance : undefined} />

            <Painel titulo="Dia a dia" nota="passe o mouse numa barra para ver o dia">
              <GraficoPorDia dias={m.porDia} />
            </Painel>

            <div className="grid gap-4 2xl:grid-cols-2">
              <Painel titulo="Onde apareceu">
                {m.porPosicionamento.length === 0 ? (
                  <p className="text-sm text-foreground-secondary">A Meta não informou os posicionamentos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className={TH}>Posicionamento</th>
                          <th className={THD}>Gasto</th>
                          <th className={THD}>Impressões</th>
                          <th className={THD}>Cliques</th>
                          <th className={THD}>Conversas</th>
                          <th className={THD}>Por conversa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.porPosicionamento.map(p => (
                          <tr key={p.nome} className="border-b border-border/60 last:border-0">
                            <td className={TD}>{p.nome}</td>
                            <td className={TDD}>{real(p.gasto)}</td>
                            <td className={TDD}>{inteiro(p.impressoes)}</td>
                            <td className={TDD}>{inteiro(p.cliquesNoLink)}</td>
                            <td className={TDD}>{inteiro(p.conversas)}</td>
                            <td className={TDD}>{custo(p.gasto, p.conversas)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Painel>

              <Painel titulo="Quem viu" nota="por idade">
                {m.porPublico.length === 0 ? (
                  <p className="text-sm text-foreground-secondary">A Meta não informou idade e gênero.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className={TH}>Idade</th>
                          <th className={`${TH} w-2/5`}>Parte do gasto</th>
                          <th className={THD}>Gasto</th>
                          <th className={THD}>Conversas</th>
                          <th className={THD}>Mulheres / Homens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.porPublico.map(p => (
                          <tr key={p.faixa} className="border-b border-border/60 last:border-0">
                            <td className={TD}>{p.faixa}</td>
                            <td className="py-2.5 pr-4">
                              <div className="h-2 rounded-full bg-background-soft">
                                <div className="h-2 rounded-full bg-primary/70" style={{ width: `${maiorGastoPublico > 0 ? (p.gasto / maiorGastoPublico) * 100 : 0}%` }} />
                              </div>
                            </td>
                            <td className={TDD}>{real(p.gasto)}</td>
                            <td className={TDD}>{inteiro(p.conversas)}</td>
                            <td className={TDD}>{pct(p.mulheres, p.gasto)} / {pct(p.homens, p.gasto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Painel>
            </div>

            {m.total.video.inicios > 0 && (
              <Painel titulo="Vídeo" nota={`${inteiro(m.total.video.inicios)} inícios de vídeo no período`}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {([['Assistiram 25%', m.total.video.p25], ['Assistiram 50%', m.total.video.p50], ['Assistiram 75%', m.total.video.p75], ['Assistiram até o fim', m.total.video.p100]] as const).map(([rotulo, v]) => (
                    <div key={rotulo}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-foreground-secondary">{rotulo}</span>
                        <span className="whitespace-nowrap tabular-nums text-foreground">{inteiro(v)} ({pct(v, m.total.video.inicios)})</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-background-soft">
                        <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.min(100, (v / m.total.video.inicios) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Painel>
            )}

            {m.anuncios.length > 1 && (
              <Painel titulo="Cada anúncio">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className={TH}>Anúncio</th>
                        <th className={THD}>Gasto</th>
                        <th className={THD}>Conversas</th>
                        <th className={THD}>Por conversa</th>
                        <th className={THD}>Cliques</th>
                        <th className={THD}>CTR</th>
                        <th className={THD}>Impressões</th>
                        <th className={THD}>Alcance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.anuncios.map(a => (
                        <tr key={a.id} className="border-b border-border/60 last:border-0">
                          <td className={TD}>{a.nome || `Anúncio ${a.id}`}</td>
                          <td className={TDD}>{real(a.gasto)}</td>
                          <td className={TDD}>{inteiro(a.conversas)}</td>
                          <td className={TDD}>{custo(a.gasto, a.conversas)}</td>
                          <td className={TDD}>{inteiro(a.cliquesNoLink)}</td>
                          <td className={TDD}>{pct(a.cliquesNoLink, a.impressoes)}</td>
                          <td className={TDD}>{inteiro(a.impressoes)}</td>
                          <td className={TDD}>{inteiro(a.alcance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>
            )}

            <p className="text-xs text-foreground-secondary">
              Conversa iniciada é a contagem da Meta, não o lead que chegou ao CRM.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
