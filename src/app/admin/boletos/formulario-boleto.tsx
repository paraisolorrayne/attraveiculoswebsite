'use client'

/**
 * Cadastro de UM boleto, e a correção de um já cadastrado. É a mesma janela:
 * com `boleto`, os campos vêm preenchidos e o botão salva a alteração.
 *
 * O erro de cada campo aparece embaixo dele, vindo do servidor, que usa as
 * mesmas regras da planilha (telefone com DDD, data que existe).
 */
import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { formatarTelefone, type Boleto } from '@/lib/boletos'
import { BOTAO_NEUTRO, BOTAO_PRIMARIO, CAMPO } from './boletos-ui'

type Erros = Partial<Record<'nome' | 'telefone' | 'vencimento' | 'valor' | 'email', string>>

export function FormularioBoleto({ boleto, aoFechar, aoSalvar }: { boleto?: Boleto; aoFechar: () => void; aoSalvar: (b: Boleto) => void }) {
  const [nome, setNome] = useState(boleto?.nome ?? '')
  const [telefone, setTelefone] = useState(boleto ? formatarTelefone(boleto.telefone) : '')
  const [vencimento, setVencimento] = useState(boleto?.vencimento ?? '')
  const [valor, setValor] = useState(boleto?.valor ? boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
  const [email, setEmail] = useState(boleto?.email ?? '')
  const [descricao, setDescricao] = useState(boleto?.descricao ?? '')
  const [carro, setCarro] = useState(boleto?.carro ?? '')
  const [placa, setPlaca] = useState(boleto?.placa ?? '')
  const [erros, setErros] = useState<Erros>({})
  const [erro, setErro] = useState<string | null>(null)
  const [duplicado, setDuplicado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const primeiro = useRef<HTMLInputElement>(null)

  useEffect(() => {
    primeiro.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  async function salvar(forcar: boolean) {
    setEnviando(true)
    setErro(null)
    setErros({})
    try {
      const r = await fetch(boleto ? `/api/admin/boletos/${boleto.id}` : '/api/admin/boletos', {
        method: boleto ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone, vencimento, valor, email, descricao, carro, placa, forcar }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.boleto) return aoSalvar(d.boleto)
      setDuplicado(r.status === 409 && d?.duplicado === true)
      setErros(d?.erros ?? {})
      setErro(d?.error || 'Não foi possível salvar.')
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setEnviando(false)
    }
  }

  const rotulo = 'mb-1 block text-sm font-medium text-foreground'
  const aviso = (campo: keyof Erros) => erros[campo] && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{erros[campo]}</span>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60" onClick={aoFechar} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={boleto ? 'Alterar boleto' : 'Novo boleto'}
        onSubmit={e => { e.preventDefault(); void salvar(false) }}
        className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background-card shadow-xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{boleto ? 'Alterar boleto' : 'Novo boleto'}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground-secondary hover:bg-background-soft hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={rotulo}>Nome do cliente</span>
            <input ref={primeiro} className={CAMPO} value={nome} onChange={e => setNome(e.target.value)} autoComplete="off" required />
            {aviso('nome')}
          </label>
          <label>
            <span className={rotulo}>Telefone com DDD</span>
            <input className={CAMPO} value={telefone} onChange={e => setTelefone(e.target.value)} inputMode="tel" placeholder="(34) 99999-0000" autoComplete="off" required />
            {aviso('telefone')}
          </label>
          <label>
            <span className={rotulo}>Vencimento</span>
            <input className={CAMPO} type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
            {aviso('vencimento')}
          </label>
          <label>
            <span className={rotulo}>Valor <span className="font-normal text-foreground-secondary">(opcional)</span></span>
            <input className={CAMPO} value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="1.234,56" autoComplete="off" />
            {aviso('valor')}
          </label>
          <label>
            <span className={rotulo}>E-mail <span className="font-normal text-foreground-secondary">(opcional)</span></span>
            <input className={CAMPO} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
            {aviso('email')}
          </label>
          <label>
            <span className={rotulo}>Carro <span className="font-normal text-foreground-secondary">(opcional)</span></span>
            <input className={CAMPO} value={carro} onChange={e => setCarro(e.target.value)} placeholder="Defender" maxLength={120} autoComplete="off" />
          </label>
          <label>
            <span className={rotulo}>Placa <span className="font-normal text-foreground-secondary">(opcional)</span></span>
            <input className={CAMPO} value={placa} onChange={e => setPlaca(e.target.value)} placeholder="ABC-1D23" maxLength={20} autoComplete="off" />
          </label>
          <label className="sm:col-span-2">
            <span className={rotulo}>Descrição <span className="font-normal text-foreground-secondary">(opcional)</span></span>
            <input className={CAMPO} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Observação" maxLength={500} autoComplete="off" />
          </label>

          {erro && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-foreground sm:col-span-2">
              {erro}
              {duplicado && ' Se for mesmo outro boleto, cadastre assim mesmo.'}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" className={BOTAO_NEUTRO} onClick={aoFechar} disabled={enviando}>Cancelar</button>
          {duplicado && (
            <button type="button" className={BOTAO_NEUTRO} onClick={() => void salvar(true)} disabled={enviando}>Cadastrar assim mesmo</button>
          )}
          <button type="submit" className={BOTAO_PRIMARIO} disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {boleto ? 'Salvar alteração' : 'Cadastrar boleto'}
          </button>
        </footer>
      </form>
    </div>
  )
}
