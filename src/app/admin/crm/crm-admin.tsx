'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, Phone, Car, ExternalLink, X } from 'lucide-react'

interface CrmCard {
  id: string
  etapa: string
  nome: string | null
  telefone: string | null
  email: string | null
  veiculo: string | null
  valor: number | null
  origem: string | null
  vendedor: string | null
  atualizado_em: string
  dados: Record<string, unknown> | null
}

// Etapas fixas do funil Fykos (contrato do backend Python), nesta ordem.
// Etapas desconhecidas não são descartadas: viram colunas extras no fim.
const ETAPAS_FUNIL: { id: string; label: string; dot: string; badge: string }[] = [
  {
    id: 'aguardando_vendedor',
    label: 'Aguardando Vendedor',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: 'em_atendimento',
    label: 'Em Atendimento',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    id: 'sem_atualizacao',
    label: 'Sem Atualização de Status',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  {
    id: 'encerrado_sucesso',
    label: 'Encerrado — Sucesso',
    dot: 'bg-green-500',
    badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  },
  {
    id: 'encerrado_perdido',
    label: 'Encerrado — Perdido',
    dot: 'bg-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  },
]

const ETAPA_DESCONHECIDA = {
  dot: 'bg-zinc-400',
  badge: 'bg-background text-foreground-secondary border-border',
}

const etapaLabel = (e: string) => {
  const fixa = ETAPAS_FUNIL.find(f => f.id === e)
  if (fixa) return fixa.label
  return e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const etapaEstilo = (e: string) =>
  ETAPAS_FUNIL.find(f => f.id === e) ?? ETAPA_DESCONHECIDA

const fmtValor = (v: number | null) =>
  v === null ? null : 'R$ ' + Number(v).toLocaleString('pt-BR')

const fmtQuando = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const fmtDataHora = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Leitura defensiva do JSONB `dados` (contrato do Fykos)
const dadoStr = (dados: Record<string, unknown> | null, chave: string): string | null => {
  const v = dados?.[chave]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

const ultimaResposta = (
  dados: Record<string, unknown> | null,
): { texto: string; em: string | null } | null => {
  const v = dados?.ultima_resposta_vendedor
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.texto !== 'string' || o.texto.trim() === '') return null
  return { texto: o.texto, em: typeof o.em === 'string' ? o.em : null }
}

export function CrmAdmin() {
  const [cards, setCards] = useState<CrmCard[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<CrmCard | null>(null)
  const [filtroVendedor, setFiltroVendedor] = useState<string>('') // '' = todos

  const load = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const r = await fetch('/api/admin/crm/cards')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setCards(d.cards || [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // o Fykos empurra mudanças a qualquer momento — atualiza a cada 60s
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  // Esc fecha o modal de detalhes
  useEffect(() => {
    if (!selecionado) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelecionado(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecionado])

  // Colunas fixas sempre visíveis, na ordem canônica; desconhecidas no fim
  const etapas: string[] = ETAPAS_FUNIL.map(f => f.id)
  for (const c of cards) if (!etapas.includes(c.etapa)) etapas.push(c.etapa)

  // Vendedores únicos (pro filtro) + cards após aplicar o filtro
  const vendedores = [...new Set(cards.map(c => c.vendedor).filter((v): v is string => !!v))].sort()
  const cardsFiltrados = filtroVendedor ? cards.filter(c => c.vendedor === filtroVendedor) : cards

  return (
    <div className="max-w-full px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Espelho do funil do Fykos — somente leitura. Para agir num lead,
            use o Fykos: as mudanças aparecem aqui automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {vendedores.length > 0 && (
            <select
              value={filtroVendedor}
              onChange={e => setFiltroVendedor(e.target.value)}
              className="px-3 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors max-w-[200px]"
              title="Filtrar por vendedor"
            >
              <option value="">Todos os vendedores</option>
              {vendedores.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/30">
          {erro} — confira se a migration <code>20260717_roles_e_crm_cards.sql</code> foi aplicada.
        </div>
      )}

      {loading && cards.length === 0 ? (
        <div className="p-12 text-center text-foreground-secondary">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : cards.length === 0 && !erro ? (
        <div className="max-w-7xl mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
          <p className="text-foreground font-medium">Nenhum lead ainda</p>
          <p className="text-sm text-foreground-secondary mt-2">
            O Fykos alimenta este painel via webhook
            (<code>POST /api/webhook/fykos-crm</code>). Assim que o primeiro
            lead for enviado, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 max-w-7xl mx-auto">
          {etapas.map(etapa => {
            const daEtapa = cardsFiltrados.filter(c => c.etapa === etapa)
            const estilo = etapaEstilo(etapa)
            return (
              <div key={etapa} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between px-1 mb-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${estilo.dot}`} />
                    {etapaLabel(etapa)}
                  </h2>
                  <span className={`text-xs border rounded-full px-2 py-0.5 ${estilo.badge}`}>
                    {daEtapa.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {daEtapa.map(c => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelecionado(c)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelecionado(c)
                        }
                      }}
                      className="p-4 bg-background-card border border-border rounded-xl cursor-pointer hover:border-foreground-secondary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">
                            {c.nome || 'Sem nome'}
                          </div>
                          <div className="text-[11px] text-foreground-secondary mt-0.5">
                            {fmtQuando(c.atualizado_em)}
                          </div>
                        </div>
                        {c.valor !== null && (
                          <span className="text-base font-semibold text-foreground whitespace-nowrap">
                            {fmtValor(c.valor)}
                          </span>
                        )}
                      </div>
                      {c.veiculo && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-secondary">
                          <Car className="w-3.5 h-3.5" />
                          {c.veiculo}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        {c.telefone ? (
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {c.telefone}
                          </a>
                        ) : <span />}
                        {c.origem && (
                          <span className="text-[10px] uppercase tracking-wide text-foreground-secondary">
                            {c.origem}
                          </span>
                        )}
                      </div>
                      {c.vendedor && (
                        <div className="mt-1.5 text-[11px] text-foreground-secondary">
                          Vendedor: {c.vendedor}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selecionado && (
        <DetalhesModal card={selecionado} onClose={() => setSelecionado(null)} />
      )}

      <p className="max-w-7xl mx-auto mt-6 text-xs text-foreground-secondary flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Fonte: Fykos (app.fykos.com.br) · atualização automática a cada 60s
      </p>
    </div>
  )
}

// Modal de detalhes — 100% somente leitura (nenhuma ação/edição)
function DetalhesModal({ card, onClose }: { card: CrmCard; onClose: () => void }) {
  const estilo = etapaEstilo(card.etapa)
  const atribuidoEm = dadoStr(card.dados, 'atribuido_em')
  const encerradoEm = dadoStr(card.dados, 'encerrado_em')
  const observacoes = dadoStr(card.dados, 'observacoes_alerta')
  const resposta = ultimaResposta(card.dados)

  const infos: { rotulo: string; valor: string | null }[] = [
    { rotulo: 'Telefone', valor: card.telefone },
    { rotulo: 'Veículo', valor: card.veiculo },
    { rotulo: 'Vendedor', valor: card.vendedor },
    { rotulo: 'Origem', valor: card.origem },
  ]

  const datas: { rotulo: string; valor: string | null }[] = [
    { rotulo: 'Atribuído em', valor: atribuidoEm ? fmtDataHora(atribuidoEm) : null },
    { rotulo: 'Atualizado em', valor: fmtDataHora(card.atualizado_em) },
    { rotulo: 'Encerrado em', valor: encerradoEm ? fmtDataHora(encerradoEm) : null },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {card.nome || 'Sem nome'}
            </h2>
            <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs border rounded-full px-2 py-0.5 ${estilo.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estilo.dot}`} />
              {etapaLabel(card.etapa)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {card.valor !== null && (
              <span className="text-xl font-semibold text-foreground whitespace-nowrap">
                {fmtValor(card.valor)}
              </span>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground-secondary" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {infos.filter(i => i.valor).map(i => (
              <div key={i.rotulo}>
                <dt className="text-[11px] uppercase tracking-wide text-foreground-secondary">
                  {i.rotulo}
                </dt>
                <dd className="text-sm text-foreground mt-0.5">{i.valor}</dd>
              </div>
            ))}
            {datas.filter(d => d.valor).map(d => (
              <div key={d.rotulo}>
                <dt className="text-[11px] uppercase tracking-wide text-foreground-secondary">
                  {d.rotulo}
                </dt>
                <dd className="text-sm text-foreground mt-0.5">{d.valor}</dd>
              </div>
            ))}
          </dl>

          {observacoes && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-foreground-secondary mb-1">
                Observações do alerta
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{observacoes}</p>
            </div>
          )}

          {resposta && (
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-foreground-secondary mb-1">
                Última resposta do vendedor
              </h3>
              <blockquote className="text-sm text-foreground border-l-2 border-border pl-3 whitespace-pre-wrap">
                {resposta.texto}
              </blockquote>
              {resposta.em && (
                <p className="text-[11px] text-foreground-secondary mt-1">
                  {fmtDataHora(resposta.em)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
