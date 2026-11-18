'use client'

/**
 * A página de um boleto: os dados, o lembrete com o texto à vista antes de
 * abrir o WhatsApp, as mudanças de situação e o histórico do que foi feito.
 *
 * O texto do lembrete pode ser ajustado aqui antes de abrir. O painel não
 * envia nada: abre o WhatsApp de quem está usando, com a mensagem escrita, e
 * anota que o lembrete foi aberto.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Loader2, Mail, MessageCircle, Paperclip, Pencil, Phone, RotateCcw, Trash2 } from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import {
  dataBR, formatarTelefone, linkDoWhatsapp, mensagemDeLembrete, prazoPorExtenso, situacaoDoBoleto, type Boleto, type EventoDoBoleto, type StatusBoleto,
} from '@/lib/boletos'
import { BOTAO_NEUTRO, BOTAO_PRIMARIO, CAMPO, dataHora, dinheiro, EtiquetaDaSituacao, ROTULO_DO_EVENTO } from '../boletos-ui'
import { FormularioBoleto } from '../formulario-boleto'

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-foreground-secondary">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-foreground">{children}</dd>
    </div>
  )
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-background-card p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

export function BoletoDetalhe({ boleto, eventos, hoje }: { boleto: Boleto; eventos: EventoDoBoleto[]; hoje: string }) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState(() => mensagemDeLembrete(boleto, hoje))
  const [pagoEm, setPagoEm] = useState(hoje)
  const [nota, setNota] = useState('')
  const [editando, setEditando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const situacao = situacaoDoBoleto(boleto, hoje)
  const aberto = boleto.status === 'aberto' || boleto.status === 'em_negociacao'

  async function pedir(chave: string, caminho: string, metodo: string, corpo?: unknown): Promise<boolean> {
    setOcupado(chave)
    setErro(null)
    try {
      const r = await fetch(caminho, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || 'Não foi possível salvar.')
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
      return false
    } finally {
      setOcupado(null)
    }
  }

  const mudarStatus = async (status: StatusBoleto) => {
    if (await pedir(status, `/api/admin/boletos/${boleto.id}`, 'PATCH', status === 'pago' ? { status, pago_em: pagoEm } : { status })) router.refresh()
  }
  const descartarComprovante = async () => {
    if (await pedir('descartar', `/api/admin/boletos/${boleto.id}`, 'PATCH', { descartar_comprovante: true })) router.refresh()
  }
  const anotarLembrete = () => {
    // O WhatsApp abre pelo próprio link; aqui só fica o registro, sem travar a tela.
    void fetch(`/api/admin/boletos/${boleto.id}/eventos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'lembrete' }) })
      .then(() => router.refresh())
      .catch(() => {})
  }
  const anotarContato = async () => {
    if (await pedir('contato', `/api/admin/boletos/${boleto.id}/eventos`, 'POST', { tipo: 'contato', descricao: nota })) {
      setNota('')
      router.refresh()
    }
  }
  const excluir = async () => {
    if (await pedir('excluir', `/api/admin/boletos/${boleto.id}`, 'DELETE')) router.push('/admin/boletos')
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <CabecalhoPagina
        titulo={boleto.nome}
        descricao={[boleto.valor ? dinheiro(boleto.valor) : null, `vencimento em ${dataBR(boleto.vencimento)}`, aberto ? prazoPorExtenso(boleto.vencimento, hoje) : null].filter(Boolean).join(' · ')}
        trilha={[{ rotulo: 'Boletos', href: '/admin/boletos' }]}
        acoes={
          <>
            <EtiquetaDaSituacao situacao={situacao} className="px-3 py-1 text-sm" />
            <button type="button" className={BOTAO_NEUTRO} onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              Alterar dados
            </button>
          </>
        }
      />

      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {erro && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-foreground">{erro}</p>}

        {aberto && boleto.comprovante_em && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-500/40 bg-green-500/10 p-5">
            <div>
              <p className="font-semibold text-foreground">O cliente mandou o comprovante em {dataHora(boleto.comprovante_em)}.</p>
              <p className="mt-1 text-sm text-foreground-secondary">Confira o pagamento antes de marcar como pago. Enquanto não for confirmado, o boleto continua em aberto.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {boleto.comprovante_url && (
                <a href={boleto.comprovante_url} target="_blank" rel="noopener noreferrer" className={BOTAO_NEUTRO}>
                  <Paperclip className="h-4 w-4" />
                  Abrir o comprovante
                </a>
              )}
              <button type="button" className={BOTAO_NEUTRO} disabled={ocupado !== null} onClick={() => void descartarComprovante()} title="O comprovante não serve: o boleto volta para a fila e a Ângela volta a lembrar">
                {ocupado === 'descartar' && <Loader2 className="h-4 w-4 animate-spin" />}
                Não confere
              </button>
              <button type="button" className={BOTAO_PRIMARIO} disabled={ocupado !== null || !pagoEm} onClick={() => void mudarStatus('pago')}>
                {ocupado === 'pago' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar pagamento
              </button>
            </div>
          </div>
        )}
        {aberto && boleto.promessa_em && (
          <p className={`rounded-xl border p-4 text-foreground ${boleto.promessa_em >= hoje ? 'border-purple-500/40 bg-purple-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
            {boleto.promessa_em >= hoje
              ? `O cliente disse que paga em ${dataBR(boleto.promessa_em)}.`
              : `O cliente disse que pagaria em ${dataBR(boleto.promessa_em)} e o pagamento não foi registrado.`}
          </p>
        )}
        {aberto && boleto.falha_envio && (
          <p className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <span>O último lembrete não foi entregue: {boleto.falha_envio}. Confira o telefone ou fale com o cliente por outro meio.</span>
          </p>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Painel titulo="Dados do boleto">
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Dado rotulo="Cliente">{boleto.nome}</Dado>
                <Dado rotulo="Telefone">
                  <a href={`tel:+55${boleto.telefone}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                    <Phone className="h-4 w-4 text-foreground-secondary" />
                    {formatarTelefone(boleto.telefone)}
                  </a>
                </Dado>
                <Dado rotulo="E-mail">
                  {boleto.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-foreground-secondary" />
                      {boleto.email}
                    </span>
                  ) : (
                    <span className="text-foreground-secondary">não informado</span>
                  )}
                </Dado>
                <Dado rotulo="Vencimento">{dataBR(boleto.vencimento)}</Dado>
                <Dado rotulo="Valor">{boleto.valor ? dinheiro(boleto.valor) : <span className="text-foreground-secondary">não informado</span>}</Dado>
                {boleto.status === 'pago' && boleto.pago_em && <Dado rotulo="Pago em">{dataBR(boleto.pago_em)}</Dado>}
                <Dado rotulo="Cadastro">
                  {boleto.origem === 'planilha' ? 'Planilha' : 'No painel'}
                  {boleto.criado_por_nome && `, por ${boleto.criado_por_nome}`}, em {dataHora(boleto.criado_em)}
                </Dado>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Dado rotulo="Descrição">{boleto.descricao || <span className="text-foreground-secondary">sem descrição</span>}</Dado>
                </div>
              </dl>
            </Painel>

            {aberto && (
              <Painel titulo="Lembrar pelo WhatsApp">
                <label className="block">
                  <span className="mb-1 block text-sm text-foreground-secondary">Lembrete manual: a mensagem abre no seu WhatsApp e você envia. Pode ajustar antes. Os lembretes automáticos são da Ângela, no Fykos.</span>
                  <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4} className={`${CAMPO} py-2.5 leading-relaxed`} />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-foreground-secondary">
                    {boleto.lembretes > 0 && boleto.ultimo_lembrete_em
                      ? `${boleto.lembretes === 1 ? '1 lembrete aberto' : `${boleto.lembretes} lembretes abertos`}, o último em ${dataHora(boleto.ultimo_lembrete_em)}.`
                      : 'Nenhum lembrete aberto até agora.'}
                  </span>
                  <a
                    href={linkDoWhatsapp(boleto.telefone, mensagem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={anotarLembrete}
                    className={BOTAO_PRIMARIO}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir no WhatsApp
                  </a>
                </div>
              </Painel>
            )}

            <Painel titulo="Histórico">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-64 flex-1">
                  <span className="mb-1 block text-sm text-foreground-secondary">Anotar um contato: ligação, conversa, o que foi combinado</span>
                  <input value={nota} onChange={e => setNota(e.target.value)} maxLength={1000} className={CAMPO} onKeyDown={e => { if (e.key === 'Enter' && nota.trim()) void anotarContato() }} />
                </label>
                <button type="button" className={BOTAO_NEUTRO} disabled={!nota.trim() || ocupado !== null} onClick={() => void anotarContato()}>
                  {ocupado === 'contato' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Anotar
                </button>
              </div>
              <ol className="mt-5 space-y-3">
                {eventos.map(e => (
                  <li key={e.id} className="flex gap-3 border-l-2 border-border pl-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground">
                        <span className="font-medium">{ROTULO_DO_EVENTO[e.tipo] ?? e.tipo}</span>
                        {e.descricao && e.descricao !== ROTULO_DO_EVENTO[e.tipo] && <span className="text-foreground-secondary">: {e.descricao}</span>}
                      </div>
                      <div className="text-sm text-foreground-secondary">
                        {dataHora(e.criado_em)}
                        {e.por_nome && ` · ${e.por_nome}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Painel>
          </div>

          <div className="space-y-4">
            <Painel titulo="Situação">
              {aberto ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm text-foreground-secondary">Data do pagamento</span>
                    <input type="date" value={pagoEm} max={hoje} onChange={e => setPagoEm(e.target.value)} className={CAMPO} />
                  </label>
                  <button type="button" className={`${BOTAO_PRIMARIO} w-full`} disabled={ocupado !== null || !pagoEm} onClick={() => void mudarStatus('pago')}>
                    {ocupado === 'pago' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Marcar como pago
                  </button>
                  {boleto.status === 'aberto' ? (
                    <button type="button" className={`${BOTAO_NEUTRO} w-full`} disabled={ocupado !== null} onClick={() => void mudarStatus('em_negociacao')}>
                      Colocar em negociação
                    </button>
                  ) : (
                    <button type="button" className={`${BOTAO_NEUTRO} w-full`} disabled={ocupado !== null} onClick={() => void mudarStatus('aberto')}>
                      Tirar da negociação
                    </button>
                  )}
                  <button type="button" className={`${BOTAO_NEUTRO} w-full`} disabled={ocupado !== null} onClick={() => void mudarStatus('cancelado')}>
                    Cancelar o boleto
                  </button>
                  <p className="text-sm text-foreground-secondary">Em negociação e cancelado saem das listas de atraso. Cancelado continua no histórico.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-foreground-secondary">
                    {boleto.status === 'pago' ? `Pago${boleto.pago_em ? ` em ${dataBR(boleto.pago_em)}` : ''}.` : 'Cancelado.'} Se foi engano, reabra.
                  </p>
                  <button type="button" className={`${BOTAO_NEUTRO} w-full`} disabled={ocupado !== null} onClick={() => void mudarStatus('aberto')}>
                    {ocupado === 'aberto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Reabrir o boleto
                  </button>
                </div>
              )}
            </Painel>

            <Painel titulo="Cadastrado por engano?">
              {confirmarExclusao ? (
                <div className="space-y-3">
                  <p className="text-foreground">Excluir apaga o boleto e o histórico dele. Não dá para desfazer.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BOTAO_NEUTRO} disabled={ocupado !== null} onClick={() => setConfirmarExclusao(false)}>Manter</button>
                    <button type="button" disabled={ocupado !== null} onClick={() => void excluir()} className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-medium text-white hover:bg-red-700 disabled:opacity-60">
                      {ocupado === 'excluir' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Excluir de vez
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className={`${BOTAO_NEUTRO} w-full`} onClick={() => setConfirmarExclusao(true)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir o boleto
                </button>
              )}
            </Painel>
          </div>
        </div>
      </main>

      {editando && (
        <FormularioBoleto
          boleto={boleto}
          aoFechar={() => setEditando(false)}
          aoSalvar={() => {
            setEditando(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
