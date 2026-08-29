'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Secao } from '../visitors-tabelas'
import { TabelaOrdenavel } from '../visitors-tabela'
import { corTaxa, fmtDuracao, fmtNum, fmtPct, larguraRelativa, nomeDoSlug, taxa } from '../visitors-metrics'

interface LinhaVeiculo {
  vehicle_slug: string
  vehicle_brand: string | null
  vehicle_model: string | null
  vehicle_price: number | null
  visualizacoes: number
  sessoes: number
  com_whatsapp: number
  tempo_mediano: number | null
}

interface Dados {
  periodo_dias: number
  total_fichas: number
  visualizacoes_com_preco: number
  minimo_para_silencio: number
  mais_vistos: LinhaVeiculo[]
  sem_contato: LinhaVeiculo[]
  faixas: { faixa: string; visualizacoes: number; em_estoque: number }[]
  cliques_whatsapp: {
    id: string
    clicked_at: string
    page_path: string | null
    vehicle_id: string | null
    correlacionado: boolean
    session_id: string | null
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_term: string
    utm_content: string
    referrer: string
    tem_gclid: boolean
    city: string
    region: string
    device_type: string
  }[]
  veiculos_no_estoque: number
}

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
]

function reais(valor: number | null): string {
  if (valor == null || !(valor > 0)) return '—'
  return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`
}

export function VeiculosPainel() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/admin/visitors/veiculos?dias=${dias}`)
      if (!r.ok) throw new Error()
      setDados(await r.json())
    } catch {
      setErro('Não foi possível carregar o interesse por veículo.')
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

  const mediaContato = taxa(
    dados.mais_vistos.reduce((s, v) => s + v.com_whatsapp, 0),
    dados.mais_vistos.reduce((s, v) => s + v.visualizacoes, 0),
  )
  const maxVis = Math.max(1, ...dados.faixas.map(f => f.visualizacoes))
  const maxEst = Math.max(1, ...dados.faixas.map(f => f.em_estoque))
  const coberturaPreco = taxa(dados.visualizacoes_com_preco, dados.total_fichas)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(p => (
          <button
            key={p.dias}
            onClick={() => setDias(p.dias)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              dias === p.dias ? 'bg-primary text-white' : 'border border-border text-foreground-secondary hover:text-foreground'
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      <Secao
        titulo="Faixa procurada x faixa disponível"
        dica="A barra escura é o que o público abre; a clara é quantos carros a loja tem naquela faixa. Descompasso persistente é decisão de curadoria, não de anúncio."
      >
        {dados.visualizacoes_com_preco === 0 ? (
          <p className="p-4 text-sm text-foreground-secondary">
            Nenhuma visualização com preço registrado no período. O preço só passou a ser gravado em
            27/07/2026 — períodos anteriores a essa data não têm essa leitura.
          </p>
        ) : (
          <>
            <div className="space-y-3 p-4">
              {dados.faixas.map(f => (
                <div key={f.faixa}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-foreground">{f.faixa}</span>
                    <span className="tabular-nums text-foreground-secondary">
                      {fmtNum(f.visualizacoes)} visitas · {f.em_estoque} no estoque
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-3 flex-1 overflow-hidden rounded bg-background">
                      <div className="h-full rounded bg-primary" style={{ width: larguraRelativa(f.visualizacoes, maxVis) }} />
                    </div>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-background">
                      <div className="h-full rounded bg-primary/30" style={{ width: larguraRelativa(f.em_estoque, maxEst) }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="border-t border-border/60 px-4 py-3 text-xs leading-snug text-foreground-secondary">
              Calculado sobre <strong className="font-medium text-foreground">{fmtNum(dados.visualizacoes_com_preco)}</strong>{' '}
              das {fmtNum(dados.total_fichas)} visualizações de ficha ({fmtPct(coberturaPreco)}) — as que têm preço
              gravado. Estoque atual: {dados.veiculos_no_estoque} veículos.
            </p>
          </>
        )}
      </Secao>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaVeiculos
          titulo="Mais vistos"
          dica="Ordenado por visualizações. A taxa compara com a média do período — verde é acima, vermelho abaixo."
          linhas={dados.mais_vistos}
          media={mediaContato}
        />
        <TabelaVeiculos
          titulo="Público, e nenhuma conversa"
          dica={`Veículos com pelo menos ${dados.minimo_para_silencio} visualizações e ZERO clique no WhatsApp. Costuma ser preço fora, foto ruim ou carro errado para o público que chega — e é o que mais rápido se corrige.`}
          linhas={dados.sem_contato}
          media={mediaContato}
          vazio="Nenhum veículo com público relevante ficou sem contato no período."
        />
      </div>

      {dados.cliques_whatsapp.length > 0 && (
        <Secao
          titulo="Cada contato pelo WhatsApp, com a origem"
          dica="Vai do contato individual até a sessão que o originou — o caminho que antes só existia por consulta no banco. Quando a campanha não vem marcada, é o termo buscado que diz o que a pessoa procurava."
        >
          <TabelaOrdenavel
            colunas={[
              {
                chave: 'quando',
                titulo: 'Quando',
                valor: c => c.clicked_at,
                classe: 'whitespace-nowrap text-foreground-secondary',
                render: c =>
                  new Date(c.clicked_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  }),
              },
              {
                chave: 'origem',
                titulo: 'Origem',
                filtro: 'texto',
                valor: c => `${c.utm_source} ${c.utm_medium} ${c.utm_campaign}`,
                render: c => (
                  <>
                    <span className="text-foreground">
                      {c.utm_source}
                      {c.utm_medium !== '-' && ` / ${c.utm_medium}`}
                    </span>
                    <span className="block text-[11px] text-foreground-secondary">
                      {c.utm_campaign}
                      {c.tem_gclid && ' · gclid'}
                    </span>
                  </>
                ),
              },
              {
                chave: 'termo',
                titulo: 'O que buscou',
                filtro: 'texto',
                valor: c => `${c.utm_term ?? ''} ${c.utm_content ?? ''}`,
                classe: 'max-w-[14rem]',
                render: c => (
                  <>
                    {c.utm_term ? (
                      <span className="block truncate text-foreground" title={c.utm_term}>
                        {c.utm_term}
                      </span>
                    ) : (
                      <span className="text-foreground-secondary">—</span>
                    )}
                    {c.utm_content && (
                      <span className="block truncate text-[11px] text-foreground-secondary" title={c.utm_content}>
                        {c.utm_content}
                      </span>
                    )}
                  </>
                ),
              },
              {
                chave: 'onde',
                titulo: 'Onde clicou',
                filtro: 'texto',
                valor: c => c.page_path,
                classe: 'max-w-[12rem]',
                render: c => (
                  <>
                    <span className="block truncate text-foreground-secondary" title={c.page_path ?? ''}>
                      {c.page_path ?? '—'}
                    </span>
                    <span className="block text-[11px] text-foreground-secondary">
                      {c.vehicle_id ? `veículo ${c.vehicle_id}` : 'sem veículo'}
                    </span>
                  </>
                ),
              },
              {
                chave: 'local',
                titulo: 'Local',
                filtro: 'texto',
                valor: c => [c.city, c.region].filter(Boolean).join(' / '),
                classe: 'whitespace-nowrap text-foreground-secondary',
                render: c => (
                  <>
                    {[c.city, c.region].filter(Boolean).join(' / ') || '—'}
                    {c.device_type && <span className="block text-[11px]">{c.device_type}</span>}
                  </>
                ),
              },
            ]}
            linhas={dados.cliques_whatsapp}
            chaveLinha={c => c.id}
            vazio="Nenhum clique no período."
          />
        </Secao>
      )}

    </div>
  )
}

function TabelaVeiculos({
  titulo,
  dica,
  linhas,
  media,
  vazio,
}: {
  titulo: string
  dica: string
  linhas: LinhaVeiculo[]
  media: number
  vazio?: string
}) {
  return (
    <Secao titulo={titulo} dica={dica}>
      <TabelaOrdenavel
        colunas={[
          {
            chave: 'veiculo',
            titulo: 'Veículo',
            filtro: 'texto',
            valor: v => [v.vehicle_brand, v.vehicle_model, v.vehicle_slug].filter(Boolean).join(' '),
            classe: 'max-w-[15rem]',
            render: v => (
              <>
                <Link
                  href={`/veiculo/${v.vehicle_slug}`}
                  target="_blank"
                  className="block truncate text-foreground hover:text-primary"
                  title={v.vehicle_slug}
                >
                  {[v.vehicle_brand, v.vehicle_model].filter(Boolean).join(' ') || nomeDoSlug(v.vehicle_slug)}
                </Link>
                <span className="text-[11px] text-foreground-secondary">
                  {reais(v.vehicle_price)} · {fmtNum(v.sessoes)} sessões
                  {v.tempo_mediano != null && ` · ${fmtDuracao(v.tempo_mediano)}`}
                </span>
              </>
            ),
          },
          {
            chave: 'preco',
            titulo: 'Preço',
            filtro: 'numero',
            valor: v => v.vehicle_price,
            alinhar: 'dir',
            classe: 'tabular-nums text-foreground-secondary',
            render: v => reais(v.vehicle_price),
          },
          {
            chave: 'visualizacoes',
            titulo: 'Visualizações',
            filtro: 'numero',
            valor: v => v.visualizacoes,
            alinhar: 'dir',
            classe: 'tabular-nums text-foreground-secondary',
            render: v => fmtNum(v.visualizacoes),
          },
          {
            chave: 'contato',
            titulo: 'Contato',
            filtro: 'numero',
            valor: v => taxa(v.com_whatsapp, v.visualizacoes),
            alinhar: 'dir',
            classe: 'tabular-nums font-medium',
            render: v => {
              const tx = taxa(v.com_whatsapp, v.visualizacoes)
              return <span className={corTaxa(tx, media, v.visualizacoes)}>{v.com_whatsapp === 0 ? '—' : fmtPct(tx)}</span>
            },
          },
        ]}
        linhas={linhas}
        chaveLinha={v => v.vehicle_slug}
        vazio={vazio ?? 'Sem dados no período.'}
      />
    </Secao>
  )
}
