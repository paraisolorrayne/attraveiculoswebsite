'use client'

/**
 * A lista de boletos: o que precisa de atenção hoje, em cima, e a tabela com
 * busca e filtros embaixo. Tudo na URL, para o link poder ser mandado.
 *
 * O painel não envia mensagem a ninguém. "Lembrar" abre o WhatsApp de quem
 * está usando, com o texto pronto, e anota que o lembrete foi aberto.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bot, Check, FileSpreadsheet, Loader2, MessageCircle, Paperclip, Plus, Receipt, RefreshCw, Undo2 } from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import {
  BarraDeFiltros, BotaoSecundario, CampoBusca, EstadoErro, EstadoVazio, ResumoDosFiltros, SeletorFiltro,
} from '@/components/admin/filtros'
import { useFiltrosUrl } from '@/components/admin/filtros'
import { cn } from '@/lib/utils'
import {
  dataBR, formatarTelefone, linkDoWhatsapp, mensagemDeLembrete, prazoPorExtenso, situacaoDoBoleto, type Boleto,
} from '@/lib/boletos'
import type { ResumoDosBoletos } from '@/lib/boletos-db'
import type { EstadoDoFykos } from '@/lib/boletos-fykos'
import { BOTAO_NEUTRO, BOTAO_PRIMARIO, dinheiro, EtiquetaDaSituacao, haQuanto } from './boletos-ui'
import { FormularioBoleto } from './formulario-boleto'

const CHAVES = ['q', 'sit', 'ordem', 'lote', 'pagina'] as const

const SITUACOES = [
  { valor: 'comprovante', rotulo: 'Comprovante para conferir' },
  { valor: 'promessa', rotulo: 'Prometeram pagar' },
  { valor: 'falha', rotulo: 'Lembrete não entregue' },
  { valor: 'atraso', rotulo: 'Em atraso' },
  { valor: 'hoje', rotulo: 'Vencem hoje' },
  { valor: 'semana', rotulo: 'Próximos 7 dias' },
  { valor: 'a-vencer', rotulo: 'A vencer' },
  { valor: 'em_negociacao', rotulo: 'Em negociação' },
  { valor: 'pago', rotulo: 'Pagos' },
  { valor: 'cancelado', rotulo: 'Cancelados' },
  { valor: 'todos', rotulo: 'Todos' },
] as const

const ORDENS = [
  { valor: 'venc-desc', rotulo: 'Vencimento mais distante' },
  { valor: 'nome', rotulo: 'Nome (A a Z)' },
  { valor: 'valor', rotulo: 'Maior valor' },
  { valor: 'recentes', rotulo: 'Cadastrados por último' },
] as const

interface Resposta {
  boletos: Boleto[]
  total: number
  pagina: number
  paginas: number
  resumo: ResumoDosBoletos
  hoje: string
  fykos: EstadoDoFykos
}

function Cartao({ rotulo, quantos, valor, ativo, destaque, aoClicar }: { rotulo: string; quantos: number; valor: number; ativo: boolean; destaque?: string; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={cn(
        'rounded-xl border bg-background-card p-4 text-left transition-colors hover:border-primary/50',
        ativo ? 'border-primary' : 'border-border',
      )}
    >
      <div className={cn('text-3xl font-semibold tabular-nums tracking-tight', quantos > 0 && destaque ? destaque : 'text-foreground')}>{quantos.toLocaleString('pt-BR')}</div>
      <div className="mt-1 text-sm text-foreground-secondary">{rotulo}</div>
      {valor > 0 && <div className="mt-0.5 text-xs tabular-nums text-foreground-secondary">{dinheiro(valor)}</div>}
    </button>
  )
}

export function BoletosAdmin() {
  const router = useRouter()
  const { valores, definir, limpar } = useFiltrosUrl(CHAVES)
  const [dados, setDados] = useState<Resposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  /** O último boleto marcado como pago, para oferecer "Desfazer". */
  const [desfazer, setDesfazer] = useState<Boleto | null>(null)
  const [reenvio, setReenvio] = useState<'enviando' | string | null>(null)

  const consulta = new URLSearchParams(Object.entries(valores).filter(([, v]) => v)).toString()
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/admin/boletos?${consulta}`)
      if (r.status === 401) return router.push('/admin/login')
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.boletos) throw new Error(d?.error)
      setDados(d)
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível carregar os boletos.')
    } finally {
      setCarregando(false)
    }
  }, [consulta, router])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const filtrar = (m: Partial<Record<(typeof CHAVES)[number], string>>) => definir({ pagina: '', ...m })
  const aoBuscar = useCallback((v: string) => definir({ q: v, pagina: '' }), [definir])

  async function mudarStatus(b: Boleto, status: 'pago' | 'aberto') {
    setOcupado(b.id)
    try {
      const r = await fetch(`/api/admin/boletos/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error)
      setDesfazer(status === 'pago' ? d.boleto : null)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(null)
    }
  }

  async function reenviarAoFykos() {
    setReenvio('enviando')
    try {
      const r = await fetch('/api/admin/boletos/fykos', { method: 'POST' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error)
      setReenvio(`${d.enviados} boletos em aberto colocados na fila da Ângela.`)
      await carregar()
    } catch (e) {
      setReenvio(e instanceof Error && e.message ? e.message : 'Não foi possível reenviar.')
    }
  }

  /** O clique abre o WhatsApp pelo próprio link; aqui só fica o registro. */
  function anotarLembrete(b: Boleto) {
    fetch(`/api/admin/boletos/${b.id}/eventos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'lembrete' }) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.boleto) setDados(atual => (atual ? { ...atual, boletos: atual.boletos.map(x => (x.id === b.id ? d.boleto : x)) } : atual))
      })
      .catch(() => {})
  }

  const resumo = dados?.resumo
  const hoje = dados?.hoje ?? ''
  const filtros = [
    valores.q && { rotulo: `Busca: ${valores.q}`, aoRemover: () => filtrar({ q: '' }) },
    valores.sit && { rotulo: SITUACOES.find(s => s.valor === valores.sit)?.rotulo ?? valores.sit, aoRemover: () => filtrar({ sit: '' }) },
    valores.lote && { rotulo: 'Só a planilha importada', aoRemover: () => filtrar({ lote: '' }) },
  ].filter((f): f is { rotulo: string; aoRemover: () => void } => !!f)
  const vazioDeTudo = !!resumo && resumo.cadastrados === 0
  // A planilha do financeiro costuma vir sem valor: sem nenhum valor na página, a coluna some.
  const temValor = !!dados?.boletos.some(b => b.valor)

  return (
    <div className="min-h-screen bg-background pb-12">
      <CabecalhoPagina
        titulo="Boletos"
        descricao="Vencimentos dos clientes e lembretes pelo WhatsApp"
        acoes={
          <>
            <Link href="/admin/boletos/importar" className={BOTAO_NEUTRO}>
              <FileSpreadsheet className="h-4 w-4" />
              Enviar planilha
            </Link>
            <button type="button" className={BOTAO_PRIMARIO} onClick={() => setNovo(true)}>
              <Plus className="h-4 w-4" />
              Novo boleto
            </button>
          </>
        }
      />

      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {erro && <EstadoErro texto={erro} aoTentar={carregar} />}

        {desfazer && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-foreground">
            <span>Boleto de {desfazer.nome} marcado como pago.</span>
            <button type="button" onClick={() => void mudarStatus(desfazer, 'aberto')} className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background-card px-3 font-medium hover:border-foreground-secondary">
              <Undo2 className="h-4 w-4" />
              Desfazer
            </button>
          </div>
        )}

        {!dados && carregando ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-foreground-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando os boletos
          </div>
        ) : vazioDeTudo ? (
          <EstadoVazio
            Icon={Receipt}
            titulo="Nenhum boleto cadastrado"
            texto="Suba a planilha do financeiro com nome, vencimento e telefone, ou cadastre um boleto de cada vez."
            acao={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/admin/boletos/importar" className={BOTAO_NEUTRO}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Enviar planilha
                </Link>
                <button type="button" className={BOTAO_PRIMARIO} onClick={() => setNovo(true)}>
                  <Plus className="h-4 w-4" />
                  Novo boleto
                </button>
              </div>
            }
          />
        ) : dados && resumo ? (
          <>
            {/* Quem manda o lembrete: a Ângela (Fykos), quando a ligação está configurada, ou a pessoa, pelo botão. */}
            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm lg:flex-nowrap', dados.fykos.ultimoErro ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-background-card')}>
              <span className="flex items-start gap-2 text-foreground-secondary">
                {dados.fykos.ultimoErro ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> : <Bot className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>
                  {!dados.fykos.ligado
                    ? 'Lembretes automáticos desligados: a ligação com o Fykos não está configurada. Por enquanto o lembrete sai pelo botão Lembrar, no seu WhatsApp.'
                    : dados.fykos.ultimoErro
                      ? `A Ângela (Fykos) não está recebendo os avisos: ${dados.fykos.pendentes} na fila, último erro "${dados.fykos.ultimoErro}". O painel tenta de novo sozinho a cada minuto.`
                      : dados.fykos.pendentes > 0
                        ? `Lembretes automáticos pela Ângela (Fykos). ${dados.fykos.pendentes} avisos saindo agora.`
                        : 'Lembretes automáticos pela Ângela (Fykos): cada boleto novo, pago ou cancelado é avisado a ela, e as respostas dos clientes voltam para cá.'}
                  {typeof reenvio === 'string' && reenvio !== 'enviando' && <span className="ml-1 text-foreground">{reenvio}</span>}
                </span>
              </span>
              {dados.fykos.ligado && (
                <BotaoSecundario onClick={() => void reenviarAoFykos()} disabled={reenvio === 'enviando'} className="shrink-0 whitespace-nowrap" title="Manda à Ângela todos os boletos em aberto. Ela trata pelo id, então não repete lembrete.">
                  {reenvio === 'enviando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Reenviar os em aberto
                </BotaoSecundario>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Cartao rotulo="Em atraso" quantos={resumo.atraso.quantos} valor={resumo.atraso.valor} ativo={valores.sit === 'atraso'} destaque="text-red-600 dark:text-red-400" aoClicar={() => filtrar({ sit: valores.sit === 'atraso' ? '' : 'atraso' })} />
              <Cartao rotulo="Vencem hoje" quantos={resumo.hoje.quantos} valor={resumo.hoje.valor} ativo={valores.sit === 'hoje'} destaque="text-amber-600 dark:text-amber-400" aoClicar={() => filtrar({ sit: valores.sit === 'hoje' ? '' : 'hoje' })} />
              <Cartao rotulo="Vencem nos próximos 7 dias" quantos={resumo.semana.quantos} valor={resumo.semana.valor} ativo={valores.sit === 'semana'} aoClicar={() => filtrar({ sit: valores.sit === 'semana' ? '' : 'semana' })} />
              <Cartao rotulo="Comprovantes para conferir" quantos={resumo.comprovantes.quantos} valor={resumo.comprovantes.valor} ativo={valores.sit === 'comprovante'} destaque="text-green-600 dark:text-green-400" aoClicar={() => filtrar({ sit: valores.sit === 'comprovante' ? '' : 'comprovante' })} />
              <Cartao rotulo="Em aberto, no total" quantos={resumo.abertos.quantos} valor={resumo.abertos.valor} ativo={valores.sit === ''} aoClicar={() => filtrar({ sit: '' })} />
            </div>

            <BarraDeFiltros>
              <CampoBusca valor={valores.q} aoMudar={aoBuscar} placeholder="Buscar por nome, telefone ou descrição" />
              <SeletorFiltro rotulo="Situação" valor={valores.sit} aoMudar={v => filtrar({ sit: v })} opcoes={SITUACOES} todos="Em aberto" />
              <SeletorFiltro rotulo="Ordenar" valor={valores.ordem} aoMudar={v => filtrar({ ordem: v })} opcoes={ORDENS} todos="Vencimento mais próximo" />
              <BotaoSecundario onClick={() => void carregar()} disabled={carregando} className="ml-auto">
                <RefreshCw className={cn('h-4 w-4', carregando && 'animate-spin')} />
                Atualizar
              </BotaoSecundario>
            </BarraDeFiltros>
            <ResumoDosFiltros total={resumo.cadastrados} mostrando={dados.total} nome={['boleto', 'boletos']} filtros={filtros} aoLimpar={limpar} />

            {dados.boletos.length === 0 ? (
              <EstadoVazio
                Icon={Receipt}
                titulo={filtros.length > 0 ? 'Nenhum boleto com esses filtros' : 'Nenhum boleto em aberto'}
                texto={filtros.length > 0 ? 'Há boletos cadastrados, mas nenhum combina com a busca ou com a situação escolhida.' : 'Todos os boletos cadastrados estão pagos ou cancelados.'}
                acao={filtros.length > 0 ? <BotaoSecundario onClick={limpar}>Limpar filtros</BotaoSecundario> : <BotaoSecundario onClick={() => filtrar({ sit: 'todos' })}>Ver todos</BotaoSecundario>}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-background-card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-foreground-secondary">
                      {/* O cliente fica com a sobra da largura; as outras colunas encolhem até o conteúdo. */}
                      <th className="w-full min-w-48 px-3 py-3 font-medium">Cliente</th>
                      <th className="w-px whitespace-nowrap px-3 py-3 font-medium">Vencimento</th>
                      {temValor && <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium">Valor</th>}
                      <th className="w-px whitespace-nowrap px-3 py-3 font-medium">Situação</th>
                      <th className="w-px whitespace-nowrap px-3 py-3 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.boletos.map(b => {
                      const situacao = situacaoDoBoleto(b, hoje)
                      const aberto = b.status === 'aberto' || b.status === 'em_negociacao'
                      return (
                        <tr
                          key={b.id}
                          onClick={() => router.push(`/admin/boletos/${b.id}`)}
                          className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-background-soft/60"
                        >
                          <td className="min-w-48 px-3 py-3">
                            <Link href={`/admin/boletos/${b.id}`} onClick={e => e.stopPropagation()} className="font-medium text-foreground hover:underline">
                              {b.nome}
                            </Link>
                            <div className="whitespace-nowrap text-sm tabular-nums text-foreground-secondary">{formatarTelefone(b.telefone)}</div>
                            {b.descricao && <div className="max-w-md truncate text-sm text-foreground-secondary" title={b.descricao}>{b.descricao}</div>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="tabular-nums text-foreground">{dataBR(b.vencimento)}</div>
                            {aberto && (
                              <div className={cn('text-sm', situacao === 'atraso' ? 'text-red-600 dark:text-red-400' : situacao === 'hoje' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground-secondary')}>
                                {prazoPorExtenso(b.vencimento, hoje)}
                              </div>
                            )}
                            {b.status === 'pago' && b.pago_em && <div className="text-sm text-foreground-secondary">pago em {dataBR(b.pago_em)}</div>}

                          </td>
                          {temValor && <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">{b.valor ? dinheiro(b.valor) : <span className="text-foreground-secondary">sem valor</span>}</td>}
                          <td className="min-w-44 px-3 py-3">
                            <EtiquetaDaSituacao situacao={situacao} />
                            {/* O que o cliente respondeu à Ângela, logo abaixo da situação. */}
                            {aberto && b.promessa_em && (
                              <div className={cn('mt-1 text-sm', b.promessa_em >= hoje ? 'text-purple-700 dark:text-purple-400' : 'text-red-600 dark:text-red-400')}>
                                {b.promessa_em >= hoje ? `paga em ${dataBR(b.promessa_em)}` : `prometeu ${dataBR(b.promessa_em)} e não pagou`}
                              </div>
                            )}
                            {aberto && b.falha_envio && (
                              <div className="mt-1 flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400" title={b.falha_envio}>
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                lembrete não entregue
                              </div>
                            )}
                            {b.lembretes > 0 && b.ultimo_lembrete_em && (
                              <div className="mt-1 text-sm text-foreground-secondary">
                                {b.lembretes === 1 ? 'lembrado' : `lembrado ${b.lembretes} vezes, a última`} {haQuanto(b.ultimo_lembrete_em)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                              {aberto && b.comprovante_url && (
                                <a
                                  href={b.comprovante_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir o comprovante"
                                  aria-label="Abrir o comprovante"
                                  className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:border-foreground-secondary"
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span className="hidden 2xl:inline">Comprovante</span>
                                </a>
                              )}
                              {aberto && (
                                <>
                                  <a
                                    href={linkDoWhatsapp(b.telefone, mensagemDeLembrete(b, hoje))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => anotarLembrete(b)}
                                    title="Lembrar: abre o WhatsApp com o lembrete pronto"
                                    aria-label="Lembrar pelo WhatsApp"
                                    className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:border-foreground-secondary"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="hidden 2xl:inline">Lembrar</span>
                                  </a>
                                  <button
                                    type="button"
                                    disabled={ocupado === b.id}
                                    onClick={() => void mudarStatus(b, 'pago')}
                                    className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:border-foreground-secondary disabled:opacity-60"
                                  >
                                    {ocupado === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {situacao === 'comprovante' ? 'Confirmar pago' : 'Pago'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {dados.paginas > 1 && (
                  <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-foreground-secondary">
                    <span>Página {dados.pagina} de {dados.paginas}</span>
                    <div className="flex gap-2">
                      <button type="button" disabled={dados.pagina <= 1} onClick={() => definir({ pagina: String(dados.pagina - 1) })} className="min-h-10 rounded-lg border border-border px-3 font-medium text-foreground disabled:opacity-40">Anterior</button>
                      <button type="button" disabled={dados.pagina >= dados.paginas} onClick={() => definir({ pagina: String(dados.pagina + 1) })} className="min-h-10 rounded-lg border border-border px-3 font-medium text-foreground disabled:opacity-40">Próxima</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>

      {novo && (
        <FormularioBoleto
          aoFechar={() => setNovo(false)}
          aoSalvar={() => {
            setNovo(false)
            void carregar()
          }}
        />
      )}
    </div>
  )
}
