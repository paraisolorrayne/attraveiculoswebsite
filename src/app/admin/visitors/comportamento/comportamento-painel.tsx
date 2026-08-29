'use client'

import { useCallback, useEffect, useState } from 'react'
import { Secao } from '../visitors-tabelas'
import { TabelaOrdenavel } from '../visitors-tabela'
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
        <TabelaOrdenavel
          colunas={[
            {
              chave: 'tipo',
              titulo: 'Tipo',
              filtro: 'opcoes',
              valor: t => NOME_DO_TIPO[t.page_type] ?? t.page_type,
              render: t => NOME_DO_TIPO[t.page_type] ?? t.page_type,
            },
            {
              chave: 'visualizacoes',
              titulo: 'Visualizações',
              filtro: 'numero',
              valor: t => t.visualizacoes,
              alinhar: 'dir',
              classe: 'tabular-nums text-foreground-secondary',
              render: t => fmtNum(t.visualizacoes),
            },
            {
              chave: 'sessoes',
              titulo: 'Sessões',
              filtro: 'numero',
              valor: t => t.sessoes,
              alinhar: 'dir',
              classe: 'tabular-nums text-foreground-secondary',
              render: t => fmtNum(t.sessoes),
            },
            {
              chave: 'tempo',
              titulo: 'Tempo mediano',
              filtro: 'numero',
              valor: t => t.tempo_mediano,
              alinhar: 'dir',
              classe: 'tabular-nums text-foreground-secondary',
              rotuloFiltro: 'Tempo em segundos',
              render: t => fmtDuracao(t.tempo_mediano),
            },
            {
              chave: 'rolagem',
              titulo: 'Rolagem',
              filtro: 'numero',
              valor: t => t.rolagem_mediana,
              alinhar: 'dir',
              classe: 'tabular-nums text-foreground-secondary',
              render: t => (t.rolagem_mediana != null ? `${t.rolagem_mediana}%` : '—'),
            },
            {
              chave: 'contato',
              titulo: 'Contato',
              filtro: 'numero',
              valor: t => taxa(t.com_whatsapp, t.visualizacoes),
              alinhar: 'dir',
              classe: 'tabular-nums font-medium',
              render: t => {
                const tx = taxa(t.com_whatsapp, t.visualizacoes)
                return <span className={corTaxa(tx, mediaWhats, t.visualizacoes)}>{fmtPct(tx)}</span>
              },
            },
          ]}
          linhas={dados.por_tipo}
          chaveLinha={t => t.page_type}
          vazio="Sem páginas no período."
        />
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
      <TabelaOrdenavel
        colunas={[
          {
            chave: 'pagina',
            titulo: 'Página',
            filtro: 'texto',
            valor: l => l.page_path,
            classe: 'max-w-[16rem]',
            render: l => (
              <>
                <span className="block truncate text-foreground" title={l.page_path}>
                  {l.page_path}
                </span>
                <span className="text-[11px] text-foreground-secondary">
                  {fmtNum(l.visualizacoes)} visualizações
                  {l.rolagem_mediana != null && ` · rolagem ${l.rolagem_mediana}%`}
                </span>
              </>
            ),
          },
          {
            chave: 'visualizacoes',
            titulo: 'Visualizações',
            filtro: 'numero',
            valor: l => l.visualizacoes,
            alinhar: 'dir',
            classe: 'tabular-nums text-foreground-secondary',
            render: l => fmtNum(l.visualizacoes),
          },
          {
            chave: 'tempo',
            titulo: 'Tempo mediano',
            filtro: 'numero',
            valor: l => l.tempo_mediano,
            alinhar: 'dir',
            classe: 'tabular-nums text-foreground-secondary',
            rotuloFiltro: 'Tempo em segundos',
            render: l => fmtDuracao(l.tempo_mediano),
          },
          {
            chave: 'contato',
            titulo: 'Contato',
            filtro: 'numero',
            valor: l => taxa(l.com_whatsapp, l.visualizacoes),
            alinhar: 'dir',
            classe: 'tabular-nums font-medium',
            render: l => {
              const tx = taxa(l.com_whatsapp, l.visualizacoes)
              return <span className={corTaxa(tx, media, l.visualizacoes)}>{fmtPct(tx)}</span>
            },
          },
        ]}
        linhas={linhas}
        chaveLinha={l => l.page_path}
        vazio="Sem páginas com volume suficiente no período."
      />
    </Secao>
  )
}
