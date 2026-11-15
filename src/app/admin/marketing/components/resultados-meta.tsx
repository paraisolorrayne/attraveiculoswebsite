'use client'

/**
 * Aba Resultados do Marketing (15/11/2026): o desempenho dos anúncios na Meta,
 * por carro, no período escolhido.
 *
 * Substitui a aba Estatísticas, que mostrava as visitas ao SITE por campanha
 * (UTM). Os anúncios da Attra levam direto para o WhatsApp, sem passar pelo
 * site, então aquela tabela ficava quase vazia e não respondia o que a aba
 * promete: quanto cada carro gastou e quantas conversas trouxe. A tabela do
 * site continua em Visitantes > Origens.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { Metricas, PeriodoDaMeta } from '@/lib/meta-ads'
import type { LinhaDeResultado } from '@/app/api/admin/marketing/meta/resultados/route'
import { TabelaOrdenavel, type ColunaTabela } from '../../visitors/visitors-tabela'
import { custo, GradeDeNumeros, GraficoPorDia, horaDe, inteiro, Painel, pct, real, SeletorDePeriodo } from './metricas-ui'

interface Resposta {
  periodo: PeriodoDaMeta
  total: Metricas
  porDia: { dia: string; gasto: number; conversas: number; cliquesNoLink: number }[]
  linhas: LinhaDeResultado[]
  lidoEm: string
}

const SITUACAO = (l: LinhaDeResultado) => (l.noAr === null ? 'Fora do quadro' : l.noAr ? 'No ar' : 'Pausado')

const COLUNAS: ColunaTabela<LinhaDeResultado>[] = [
  {
    chave: 'carro',
    titulo: 'Carro',
    filtro: 'texto',
    valor: l => l.carro,
    render: l => (
      <span className="block">
        <span className="block font-medium text-foreground">{l.carro}</span>
        <span className="block text-xs text-foreground-secondary">
          {[l.campanha, l.anuncios > 1 ? `${l.anuncios} anúncios` : null].filter(Boolean).join(' · ') || 'Anúncio sem card no quadro'}
        </span>
      </span>
    ),
  },
  {
    chave: 'situacao',
    titulo: 'Situação',
    filtro: 'opcoes',
    valor: SITUACAO,
    render: l => (
      <span className={l.noAr ? 'text-green-600 dark:text-green-400' : 'text-foreground-secondary'}>{SITUACAO(l)}</span>
    ),
  },
  { chave: 'gasto', titulo: 'Gasto', filtro: 'numero', valor: l => l.gasto, alinhar: 'dir', classe: 'tabular-nums font-medium', render: l => real(l.gasto) },
  { chave: 'conversas', titulo: 'Conversas', filtro: 'numero', valor: l => l.conversas, alinhar: 'dir', classe: 'tabular-nums', render: l => inteiro(l.conversas) },
  {
    chave: 'custo_conversa',
    titulo: 'Custo por conversa',
    filtro: 'numero',
    // Sem conversa não há custo: vai para o fim ao ordenar do menor para o maior.
    valor: l => (l.conversas > 0 ? l.gasto / l.conversas : Number.MAX_SAFE_INTEGER),
    alinhar: 'dir',
    classe: 'tabular-nums',
    render: l => (l.conversas > 0 ? real(l.gasto / l.conversas) : <span className="text-foreground-secondary">sem conversa</span>),
  },
  { chave: 'cliques', titulo: 'Cliques no link', filtro: 'numero', valor: l => l.cliquesNoLink, alinhar: 'dir', classe: 'tabular-nums', render: l => inteiro(l.cliquesNoLink) },
  {
    chave: 'ctr',
    titulo: 'CTR',
    filtro: 'numero',
    valor: l => (l.impressoes > 0 ? (l.cliquesNoLink / l.impressoes) * 100 : 0),
    alinhar: 'dir',
    classe: 'tabular-nums',
    render: l => pct(l.cliquesNoLink, l.impressoes),
  },
  { chave: 'impressoes', titulo: 'Impressões', filtro: 'numero', valor: l => l.impressoes, alinhar: 'dir', classe: 'tabular-nums text-foreground-secondary', render: l => inteiro(l.impressoes) },
]

export function ResultadosMeta({ periodo, aoMudarPeriodo, comLinkDoSite }: { periodo: PeriodoDaMeta; aoMudarPeriodo: (p: PeriodoDaMeta) => void; comLinkDoSite: boolean }) {
  const router = useRouter()
  // A resposta guarda de qual período veio: trocar de período mostra "lendo",
  // não o número do período anterior.
  const [resposta, setResposta] = useState<{ periodo: PeriodoDaMeta; dados: Resposta | null; erro: string | null } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/marketing/meta/resultados?periodo=${periodo}`)
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!vivo) return
        setResposta(r.ok && d?.linhas ? { periodo, dados: d, erro: null } : { periodo, dados: null, erro: d?.error || 'Não foi possível ler os resultados agora.' })
      })
      .catch(() => vivo && setResposta({ periodo, dados: null, erro: 'Não foi possível falar com o servidor.' }))
    return () => { vivo = false }
  }, [periodo])

  const atual = resposta?.periodo === periodo ? resposta : null
  const d = atual?.dados ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SeletorDePeriodo periodo={periodo} aoMudar={aoMudarPeriodo} />
        {d && <span className="text-sm text-foreground-secondary">Números da Meta, lidos às {horaDe(d.lidoEm)}</span>}
      </div>

      {!atual ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-foreground-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Lendo a Meta
        </div>
      ) : atual.erro || !d ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">{atual.erro}</p>
      ) : d.linhas.length === 0 ? (
        <p className="rounded-xl border border-border bg-background-card p-6 text-foreground-secondary">Nenhum anúncio teve entrega neste período.</p>
      ) : (
        <>
          <GradeDeNumeros m={d.total} />
          <Painel titulo="Dia a dia da conta">
            <GraficoPorDia dias={d.porDia} />
          </Painel>
          <Painel
            titulo="Por carro"
            nota={`${inteiro(d.linhas.length)} carros com entrega · ${custo(d.total.gasto, d.total.conversas)} por conversa na média`}
            className="p-0 [&>div:first-child]:px-5 [&>div:first-child]:pt-5"
          >
            <TabelaOrdenavel
              colunas={COLUNAS}
              linhas={d.linhas}
              chaveLinha={l => l.cardId ?? `nome:${l.carro}`}
              ordemInicial={{ chave: 'gasto', direcao: 'desc' }}
              vazio="Nenhum anúncio com esses filtros."
              aoClicarLinha={l => l.cardId && router.push(`/admin/marketing/anuncio/${l.cardId}?periodo=${periodo}`)}
            />
          </Painel>
          <p className="text-xs text-foreground-secondary">
            Conversa iniciada é a contagem da Meta, não o lead que chegou ao CRM. Clique em um carro para ver o anúncio em detalhe.
            {comLinkDoSite && (
              <>
                {' '}As visitas ao site por campanha ficam em{' '}
                <Link href="/admin/visitors/origens" className="text-foreground underline underline-offset-4">Visitantes, Origens</Link>.
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
