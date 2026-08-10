'use client'

import { useCallback, useEffect, useState } from 'react'
import { Secao } from '../visitors-tabelas'
import {
  corTaxa,
  fmtDuracao,
  fmtNum,
  fmtPct,
  larguraRelativa,
  taxa,
} from '../visitors-metrics'

interface LinhaTipo {
  page_type: string
  visualizacoes: number
  sessoes: number
  tempo_mediano: number | null
  rolagem_mediana: number | null
  com_whatsapp: number
}

interface LinhaPagina {
  page_path: string
  visualizacoes: number
  tempo_mediano: number | null
  rolagem_mediana: number | null
  com_whatsapp: number
}

interface Dados {
  periodo_dias: number
  minimo_visualizacoes: number
  teto_leitura_segundos: number
  resumo: {
    visualizacoes: number
    sem_tempo: number
    acima_do_teto: number
    sem_rolagem: number
    tempo_mediano: number | null
    rolagem_mediana: number | null
  } | null
  por_tipo: LinhaTipo[]
  prendem: LinhaPagina[]
  perdem: LinhaPagina[]
  rolagem: { faixa: string; visualizacoes: number }[]
}

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
  { dias: 0, rotulo: 'Tudo' },
]

/** Nome legível para o tipo de página que o rastreamento grava. */
const NOME_DO_TIPO: Record<string, string> = {
  vehicle: 'Ficha de veículo',
  vehicles: 'Listagem de veículos',
  home: 'Home',
  blog: 'Blog',
  contact: 'Contato',
  about: 'Institucional',
  other: 'Outras',
}

export function ComportamentoPainel() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/admin/visitors/comportamento?dias=${dias}`)
      if (!r.ok) throw new Error('Falha ao carregar')
      setDados(await r.json())
    } catch {
      setErro('Não foi possível carregar o comportamento de navegação.')
    } finally {
      setCarregando(false)
    }
  }, [dias])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (carregando && !dados) return <p className="p-8 text-center text-foreground-secondary">Carregando…</p>
  if (erro) return <p className="p-8 text-center text-red-500">{erro}</p>
  if (!dados) return null

  const r = dados.resumo
  const totalRolagem = dados.rolagem.reduce((s, f) => s + f.visualizacoes, 0)
  const mediaWhats = taxa(
    dados.por_tipo.reduce((s, t) => s + t.com_whatsapp, 0),
    dados.por_tipo.reduce((s, t) => s + t.visualizacoes, 0),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(p => (
          <button
            key={p.dias}
            onClick={() => setDias(p.dias)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              dias === p.dias
                ? 'bg-primary text-white'
                : 'border border-border text-foreground-secondary hover:text-foreground'
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {r && (
        <Secao
          titulo="Leitura por página"
          dica="Todos os tempos são MEDIANA, não média. No histórico a média sai em 8 minutos por causa de abas esquecidas abertas — a maior registrada tem 6 dias. A mediana descreve a pessoa típica; a média descreve o outlier."
        >
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador rotulo="Visualizações" valor={fmtNum(r.visualizacoes)} />
            <Indicador rotulo="Tempo mediano na página" valor={fmtDuracao(r.tempo_mediano)} />
            <Indicador
              rotulo="Rolagem mediana"
              valor={r.rolagem_mediana != null ? `${r.rolagem_mediana}%` : '—'}
            />
            <Indicador
              rotulo="Sem tempo medido"
              valor={`${fmtPct(taxa(r.sem_tempo, r.visualizacoes))}`}
              detalhe={`${fmtNum(r.sem_tempo)} visualizações`}
            />
          </div>
          {r.acima_do_teto > 0 && (
            <p className="border-t border-border/60 px-4 py-3 text-xs leading-snug text-foreground-secondary">
              <strong className="font-medium text-foreground">{fmtNum(r.acima_do_teto)}</strong>{' '}
              visualizações passam de {Math.round(dados.teto_leitura_segundos / 60)} minutos. Não são
              leitura, são aba deixada aberta — por isso a mediana, e não a média, é o número exibido
              acima.
            </p>
          )}
        </Secao>
      )}

      <Secao
        titulo="Onde a pessoa para, por tipo de página"
        dica="Compare a taxa de contato entre os tipos: é ela que diz se a ficha de veículo está fazendo o trabalho que a listagem não faz."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-foreground-secondary">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 text-right font-medium">Visualizações</th>
                <th className="px-4 py-2 text-right font-medium">Sessões</th>
                <th className="px-4 py-2 text-right font-medium">Tempo mediano</th>
                <th className="px-4 py-2 text-right font-medium">Rolagem</th>
                <th className="px-4 py-2 text-right font-medium">Contato</th>
              </tr>
            </thead>
            <tbody>
              {dados.por_tipo.map(t => {
                const tx = taxa(t.com_whatsapp, t.visualizacoes)
                return (
                  <tr key={t.page_type} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 text-foreground">
                      {NOME_DO_TIPO[t.page_type] ?? t.page_type}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">
                      {fmtNum(t.visualizacoes)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">
                      {fmtNum(t.sessoes)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">
                      {fmtDuracao(t.tempo_mediano)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">
                      {t.rolagem_mediana != null ? `${t.rolagem_mediana}%` : '—'}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${corTaxa(tx, mediaWhats, t.visualizacoes)}`}
                    >
                      {fmtPct(tx)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Secao>

      {totalRolagem > 0 && (
        <Secao
          titulo="Até onde a pessoa desce"
          dica="O botão de contato mora no fim da ficha. Se a maior parte para antes de 50%, ele nunca é visto — e isso é problema de layout, não de interesse."
        >
          <div className="space-y-2 p-4">
            {dados.rolagem.map(f => (
              <div key={f.faixa} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm tabular-nums text-foreground-secondary">
                  {f.faixa}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded bg-background">
                  <div
                    className="h-full rounded bg-primary/60"
                    style={{ width: larguraRelativa(f.visualizacoes, totalRolagem) }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-sm tabular-nums text-foreground-secondary">
                  {fmtNum(f.visualizacoes)} ({fmtPct(taxa(f.visualizacoes, totalRolagem))})
                </span>
              </div>
            ))}
          </div>
        </Secao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ListaDePaginas
          titulo="Páginas que mais prendem"
          dica={`Ordenadas pelo tempo mediano. Só entram páginas com ao menos ${dados.minimo_visualizacoes} visualizações — sem esse piso, o topo seria sempre uma página vista três vezes por acaso.`}
          linhas={dados.prendem}
          media={mediaWhats}
        />
        <ListaDePaginas
          titulo="Páginas com público e sem atenção"
          dica="Muita visita com tempo baixo é promessa não cumprida: o título atraiu e o conteúdo não sustentou. É a lista mais acionável desta página."
          linhas={dados.perdem}
          media={mediaWhats}
        />
      </div>
    </div>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-xs text-foreground-secondary">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{valor}</p>
      {detalhe && <p className="mt-0.5 text-[11px] text-foreground-secondary">{detalhe}</p>}
    </div>
  )
}

function ListaDePaginas({
  titulo,
  dica,
  linhas,
  media,
}: {
  titulo: string
  dica: string
  linhas: LinhaPagina[]
  media: number
}) {
  return (
    <Secao titulo={titulo} dica={dica}>
      {linhas.length === 0 ? (
        <p className="p-4 text-sm text-foreground-secondary">Sem páginas com volume suficiente no período.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {linhas.map(l => {
              const tx = taxa(l.com_whatsapp, l.visualizacoes)
              return (
                <tr key={l.page_path} className="border-b border-border/60 last:border-0">
                  <td className="max-w-[16rem] px-4 py-2">
                    <span className="block truncate text-foreground" title={l.page_path}>
                      {l.page_path}
                    </span>
                    <span className="text-[11px] text-foreground-secondary">
                      {fmtNum(l.visualizacoes)} visualizações
                      {l.rolagem_mediana != null && ` · rolagem ${l.rolagem_mediana}%`}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground-secondary">
                    {fmtDuracao(l.tempo_mediano)}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums font-medium ${corTaxa(tx, media, l.visualizacoes)}`}>
                    {fmtPct(tx)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Secao>
  )
}
