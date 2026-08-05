'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Secao } from './visitors-tabelas'
import { corTaxa, fmtNum, fmtPct, larguraRelativa } from './visitors-metrics'

type Padrao =
  | 'estabelecimento' | 'comprar_marca' | 'marca_venda'
  | 'comprar_categoria' | 'categoria_generica' | 'criativo' | 'outros'

interface LinhaTermo {
  termo: string
  padrao: Padrao
  sessoes: number
  conversoes: number
  taxa: number
  piso: number
}

interface LinhaPadrao {
  padrao: Padrao
  sessoes: number
  conversoes: number
  taxa: number
  fatia_sessoes: number
  fatia_conversoes: number
}

interface Dados {
  periodo_dias: number
  volume_minimo: number
  media_geral: number
  total_sessoes: number
  total_conversoes: number
  termos_abaixo_do_minimo: number
  termos: LinhaTermo[]
  padroes: LinhaPadrao[]
}

/** Rótulos em português: o valor cru do padrão nunca aparece na tela. */
const ROTULO: Record<Padrao, string> = {
  estabelecimento: 'Procura a LOJA ("loja de…", "onde comprar")',
  comprar_marca: 'Comprar + marca',
  marca_venda: 'Marca + "à venda"',
  comprar_categoria: 'Comprar + categoria',
  categoria_generica: 'Categoria genérica ("carros… à venda")',
  criativo: 'Criativo de rede social',
  outros: 'Outros',
}

const TH = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-secondary whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'

export function SecaoTermosDeConversao({ dias }: { dias: number }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(false)
    try {
      const r = await fetch(`/api/admin/visitors/termos?dias=${dias}`)
      if (!r.ok) throw new Error(String(r.status))
      setDados(await r.json())
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [dias])

  useEffect(() => { void carregar() }, [carregar])

  const maxSessoes = Math.max(1, ...(dados?.termos ?? []).map(t => t.sessoes))

  return (
    <Secao
      titulo="Termos que mais convertem"
      dica={
        'De cada termo de busca que trouxe gente ao site, quanto virou contato — clique de WhatsApp ou envio de formulário. ' +
        'A ordenação é pelo PISO: a taxa que o termo comprova estatisticamente, não a que a amostra sugere. ' +
        'Um termo com 3 conversões em 26 sessões mostra 11,5%, mas comprova 4%; um com 47 em 623 mostra 7,5% e comprova 5,7% — o segundo é a aposta melhor. ' +
        'Conversão aqui é contato iniciado no site, não venda fechada: o CRM chega por webhook e tem ciclo próprio.'
      }
    >
      {carregando && !dados ? (
        <div className="p-10 text-center text-foreground-secondary">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : erro ? (
        <p className="px-4 py-8 text-center text-sm text-foreground-secondary">
          Não foi possível carregar os termos.
        </p>
      ) : !dados || dados.termos.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-foreground-secondary">
          Nenhum termo com volume suficiente no período.
        </p>
      ) : (
        <>
          {/* Padrões primeiro: é o que vira decisão. A lista de termos detalha. */}
          <div className="px-4 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary mb-2">
              Por intenção de busca
            </h3>
            <div className="space-y-1.5">
              {dados.padroes.map(p => (
                <div key={p.padrao} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 truncate text-foreground" title={ROTULO[p.padrao]}>
                    {ROTULO[p.padrao]}
                  </span>
                  <span className="text-xs text-foreground-secondary tabular-nums w-28 text-right">
                    {fmtNum(p.sessoes)} sess. · {fmtNum(p.conversoes)} conv.
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums w-16 text-right ${corTaxa(p.taxa, dados.media_geral, p.sessoes)}`}
                  >
                    {fmtPct(p.taxa)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-foreground-secondary mt-2">
              Média do conjunto: <strong>{fmtPct(dados.media_geral)}</strong> ·{' '}
              {fmtNum(dados.total_conversoes)} contatos em {fmtNum(dados.total_sessoes)} sessões com termo.
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead className="bg-background-soft border-y border-border">
                <tr>
                  <th className={`${TH} text-left`}>Termo</th>
                  <th className={`${TH} text-right`}>Sessões</th>
                  <th className={`${TH} text-right`}>Contatos</th>
                  <th className={`${TH} text-right`}>Taxa</th>
                  <th className={`${TH} text-right`} title="Taxa que o termo comprova (Wilson 95%)">
                    Piso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dados.termos.map(t => (
                  <tr key={t.termo} className="hover:bg-background-soft/50">
                    <td className={`${TD} max-w-[22rem]`}>
                      <span className="block truncate" title={t.termo}>{t.termo}</span>
                      <span className="block text-[11px] text-foreground-secondary truncate">
                        {ROTULO[t.padrao]}
                      </span>
                      <span className="block mt-1 h-1 rounded-full bg-primary/25"
                            style={{ width: larguraRelativa(t.sessoes, maxSessoes) }} />
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>{fmtNum(t.sessoes)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{fmtNum(t.conversoes)}</td>
                    <td className={`${TD} text-right tabular-nums text-foreground-secondary`}>
                      {fmtPct(t.taxa)}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-semibold ${corTaxa(t.piso, dados.media_geral, t.sessoes)}`}>
                      {fmtPct(t.piso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dados.termos_abaixo_do_minimo > 0 && (
            <p className="px-4 py-3 text-[11px] text-foreground-secondary border-t border-border">
              {dados.termos_abaixo_do_minimo} termo(s) com menos de {dados.volume_minimo} sessões ficaram
              fora da tabela — abaixo disso a taxa é ruído. Eles continuam somando nos padrões acima.
            </p>
          )}
        </>
      )}
    </Secao>
  )
}
