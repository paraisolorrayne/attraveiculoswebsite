'use client'

/**
 * Enviar a planilha do financeiro. Cada planilha SOMA à lista: o painel lê,
 * pula o que já está cadastrado (mesmo telefone, vencimento e valor) e
 * acrescenta o resto. Nada do que existia é trocado ou apagado, então a mesma
 * planilha pode ser enviada de novo, e uma planilha que só cresce (com as
 * linhas antigas e as novas) entra sem duplicar.
 *
 * Não há passo de confirmação: enviou, entrou. Depois do envio a tela mostra
 * o que foi acrescentado, o que foi pulado e as linhas que ficaram de fora por
 * erro (telefone sem DDD, data que não existe), para corrigir na planilha e
 * enviar de novo. Se a planilha era a errada, "Desfazer este envio" apaga só
 * os boletos que ela criou.
 */
import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, Loader2, Undo2, Upload } from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import { cn } from '@/lib/utils'
import { dataBR, formatarTelefone, lerTexto, letraDaColuna, ROTULO_DO_CAMPO, type Campo, type Celula } from '@/lib/boletos'
import type { LinhaDaPrevia } from '@/app/api/admin/boletos/importar/route'
import { BOTAO_NEUTRO, BOTAO_PRIMARIO, dinheiro } from '../boletos-ui'

interface Resultado {
  criados: number
  lote_id: string | null
  linhas: LinhaDaPrevia[]
  resumo: { linhasDaPlanilha: number; total: number; novos: number; comErro: number; duplicados: number; vencidas: number }
  colunas: Partial<Record<Campo, number>>
  comTitulos: boolean
}

// O mesmo desenho da planilha de cobrança do financeiro.
const MODELO =
  '﻿CARRO;PLACA;VALOR PARCELA;VENCIMENTO;CLIENTE;CONTATO\r\n' +
  'DEFENDER;ABC-1D23;50.000,00;08/12/2026 A 08/07/2027;MARIA;(34) 99999-0000\r\n' +
  'CAYENNE;EFG-4H56;680.000,00;15/05/2027;JOÃO;(34) 98888-0000\r\n'

/** As células de um .xlsx, com data virando AAAA-MM-DD e o resto texto ou número. */
async function lerExcel(arquivo: File): Promise<Celula[][]> {
  const { readSheet } = await import('read-excel-file/browser')
  const linhas = (await readSheet(arquivo)) as unknown[][]
  return linhas.map(l =>
    l.map(v => {
      if (v === null || v === undefined) return null
      if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)
      return typeof v === 'number' ? v : String(v)
    }),
  )
}

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

export function ImportarPlanilha() {
  const [origem, setOrigem] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<'enviando' | 'desfazendo' | null>(null)
  const [colado, setColado] = useState('')
  const [aba, setAba] = useState<'erro' | 'duplicado' | 'vencida'>('erro')
  const [confirmarDesfazer, setConfirmarDesfazer] = useState(false)
  const [desfeito, setDesfeito] = useState<number | null>(null)
  const [sobre, setSobre] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)

  async function enviar(celulas: Celula[][], nome: string) {
    setOcupado('enviando')
    setErro(null)
    setResultado(null)
    setDesfeito(null)
    setConfirmarDesfazer(false)
    try {
      const r = await fetch('/api/admin/boletos/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ celulas, confirmar: true }) })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.linhas) throw new Error(d?.error || 'Não foi possível ler a planilha. Nada foi gravado.')
      setOrigem(nome)
      setResultado(d)
      setAba(d.resumo.comErro > 0 ? 'erro' : d.resumo.vencidas > 0 ? 'vencida' : 'duplicado')
      setColado('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha. Nada foi gravado.')
    } finally {
      setOcupado(null)
    }
  }

  async function aoEscolher(f: File | undefined) {
    if (!f) return
    setErro(null)
    const nome = f.name.toLowerCase()
    try {
      if (nome.endsWith('.xls')) throw new Error('Este é o formato antigo do Excel (.xls). Abra a planilha e use "Salvar como" para gravar em .xlsx.')
      if (f.size > 5 * 1024 * 1024) throw new Error('O arquivo passa de 5 MB. Deixe só a aba dos boletos e tente de novo.')
      await enviar(nome.endsWith('.xlsx') ? await lerExcel(f) : lerTexto(await f.text()), f.name)
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : 'Não consegui abrir este arquivo. Use .xlsx ou .csv.')
    } finally {
      if (arquivo.current) arquivo.current.value = ''
    }
  }

  async function desfazer() {
    if (!resultado?.lote_id) return
    setOcupado('desfazendo')
    setErro(null)
    try {
      const r = await fetch(`/api/admin/boletos/lote/${resultado.lote_id}`, { method: 'DELETE' })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || 'Não foi possível desfazer.')
      setDesfeito(d.apagados)
      setResultado(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível desfazer.')
    } finally {
      setOcupado(null)
      setConfirmarDesfazer(false)
    }
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([MODELO], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-boletos.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const r = resultado
  const deFora = r ? r.linhas.filter(l => (aba === 'erro' ? l.erros.length > 0 : aba === 'vencida' ? !!l.ignorada : !!l.duplicado)) : []
  // Datas sem ano: um aviso por linha da planilha, não um por parcela.
  const avisos = r ? [...new Map(r.linhas.filter(l => l.aviso).map(l => [l.linha, l])).values()] : []

  return (
    <div className="min-h-screen bg-background pb-12">
      <CabecalhoPagina
        titulo="Enviar planilha"
        descricao="Os boletos novos da planilha somam aos que já estão no painel"
        trilha={[{ rotulo: 'Boletos', href: '/admin/boletos' }]}
        acoes={
          <button type="button" className={BOTAO_NEUTRO} onClick={baixarModelo}>
            <Download className="h-4 w-4" />
            Baixar modelo
          </button>
        }
      />

      <main className="w-full space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {erro && (
          <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            {erro}
          </p>
        )}

        {desfeito !== null && (
          <p role="status" className="rounded-xl border border-border bg-background-card p-4 text-foreground">
            Envio desfeito: {plural(desfeito, 'boleto removido', 'boletos removidos')}. O que já estava no painel antes dele continua lá.
          </p>
        )}

        {r && (
          <>
            <section className={cn('rounded-xl border p-5', r.criados > 0 ? 'border-green-500/40 bg-green-500/10' : 'border-border bg-background-card')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <FileSpreadsheet className="h-4 w-4" />
                    {origem}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                    {r.criados > 0 && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />}
                    {r.criados > 0
                      ? `${plural(r.criados, 'boleto acrescentado', 'boletos acrescentados')} ao painel`
                      : r.resumo.comErro > 0
                        ? 'Nenhum boleto novo entrou'
                        : 'Nada novo: todos os boletos desta planilha já estavam no painel'}
                  </p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {plural(r.resumo.linhasDaPlanilha, 'linha lida', 'linhas lidas')}
                    {r.resumo.total > r.resumo.linhasDaPlanilha && `, que dão ${plural(r.resumo.total, 'parcela', 'parcelas')}`}
                    {r.resumo.duplicados > 0 && `, ${plural(r.resumo.duplicados, 'pulada por já estar cadastrada', 'puladas por já estarem cadastradas')}`}
                    {r.resumo.vencidas > 0 && `, ${plural(r.resumo.vencidas, 'parcela já vencida não foi criada', 'parcelas já vencidas não foram criadas')}`}
                    {r.resumo.comErro > 0 && `, ${plural(r.resumo.comErro, 'linha ficou de fora por erro', 'linhas ficaram de fora por erro')}`}
                    . Colunas: {(Object.entries(r.colunas) as [Campo, number][]).map(([c, i]) => `${ROTULO_DO_CAMPO[c]} (${letraDaColuna(i)})`).join(', ')}.
                    {!r.comTitulos && ' A planilha não tem linha de títulos, então as colunas foram identificadas pelo conteúdo: confira nos boletos se ficaram certas.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.lote_id && <Link href={`/admin/boletos?sit=todos&lote=${r.lote_id}`} className={BOTAO_PRIMARIO}>Ver os boletos acrescentados</Link>}
                  <button type="button" className={BOTAO_NEUTRO} disabled={ocupado !== null} onClick={() => setResultado(null)}>Enviar outra planilha</button>
                </div>
              </div>

              {r.lote_id && (
                <div className="mt-4 border-t border-border/60 pt-4 text-sm">
                  {confirmarDesfazer ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-foreground">Desfazer apaga os {r.criados.toLocaleString('pt-BR')} boletos que este envio criou. Os que já existiam continuam.</span>
                      <button type="button" className={BOTAO_NEUTRO} disabled={ocupado !== null} onClick={() => setConfirmarDesfazer(false)}>Manter</button>
                      <button type="button" disabled={ocupado !== null} onClick={() => void desfazer()} className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-medium text-white hover:bg-red-700 disabled:opacity-60">
                        {ocupado === 'desfazendo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                        Desfazer este envio
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmarDesfazer(true)} className="flex min-h-10 items-center gap-2 font-medium text-foreground-secondary underline-offset-4 hover:text-foreground hover:underline">
                      <Undo2 className="h-4 w-4" />
                      Era a planilha errada? Desfazer este envio
                    </button>
                  )}
                </div>
              )}
            </section>

            {avisos.length > 0 && (
              <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  Confira o ano: a planilha não diz, então foi assumido
                </h2>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {avisos.map(l => (
                    <li key={l.linha}>
                      <span className="text-foreground-secondary">Linha {l.linha}, {[l.nome, l.carro].filter(Boolean).join(', ')}:</span>{' '}
                      {l.aviso?.replace('vencimento sem ano: entendi ', '')}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-foreground-secondary">
                  Se algum estiver errado, desfaça o envio, escreva o ano na planilha (08/12/2026 A 08/07/2027) e envie de novo.
                </p>
              </section>
            )}

            {(r.resumo.comErro > 0 || r.resumo.duplicados > 0 || r.resumo.vencidas > 0) && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex gap-1 rounded-lg border border-border bg-background-card p-1" role="group" aria-label="Linhas que não entraram">
                    {([['erro', `Com erro (${r.resumo.comErro})`, r.resumo.comErro], ['vencida', `Parcelas já vencidas (${r.resumo.vencidas})`, r.resumo.vencidas], ['duplicado', `Já cadastradas (${r.resumo.duplicados})`, r.resumo.duplicados]] as const)
                      .filter(([, , n]) => n > 0)
                      .map(([valor, rotulo]) => (
                        <button
                          key={valor}
                          type="button"
                          aria-pressed={aba === valor}
                          onClick={() => setAba(valor)}
                          className={cn('min-h-10 rounded-md px-4 text-sm font-medium transition-colors', aba === valor ? 'bg-primary text-white' : 'text-foreground-secondary hover:text-foreground')}
                        >
                          {rotulo}
                        </button>
                      ))}
                  </div>
                  {aba === 'erro' && (
                    <span className="text-sm text-foreground-secondary">Corrija estas linhas na planilha e envie de novo: o que já entrou é pulado.</span>
                  )}
                  {aba === 'vencida' && (
                    <span className="text-sm text-foreground-secondary">Não dá para saber se foram pagas. Se alguma está em aberto, cadastre em Novo boleto.</span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-background-card">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-foreground-secondary">
                        <th className="px-4 py-3 font-medium">Linha</th>
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Carro</th>
                        <th className="px-4 py-3 font-medium">Telefone</th>
                        <th className="px-4 py-3 font-medium">Vencimento</th>
                        <th className="px-4 py-3 text-right font-medium">Valor</th>
                        <th className="px-4 py-3 font-medium">Por que não entrou</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deFora.map(l => {
                        const errado = (palavra: string) => l.erros.some(e => e.includes(palavra))
                        const telRuim = errado('telefone') || errado('DDD')
                        return (
                          <tr key={`${l.linha}-${l.parcela ?? 0}`} className="border-b border-border/60 last:border-0">
                            <td className="px-4 py-2.5 tabular-nums text-foreground-secondary">{l.linha}</td>
                            <td className="px-4 py-2.5 text-foreground">{l.nome || <span className="text-red-600 dark:text-red-400">vazio</span>}</td>
                            <td className="px-4 py-2.5 text-sm text-foreground-secondary">{[l.carro, l.placa, l.parcela && l.parcelas ? `parcela ${l.parcela} de ${l.parcelas}` : null].filter(Boolean).join(' · ')}</td>
                            <td className={cn('whitespace-nowrap px-4 py-2.5 tabular-nums', telRuim ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                              {telRuim ? l.telefone || 'vazio' : formatarTelefone(l.telefone)}
                            </td>
                            <td className={cn('whitespace-nowrap px-4 py-2.5 tabular-nums', errado('vencimento') ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                              {/^\d{4}-\d{2}-\d{2}$/.test(l.vencimento) ? dataBR(l.vencimento) : l.vencimento || 'vazio'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">{l.valor ? dinheiro(l.valor) : ''}</td>
                            <td className="px-4 py-2.5 text-sm">
                              {l.erros.length > 0 ? (
                                <span className="text-red-600 dark:text-red-400">{l.erros.join(', ')}</span>
                              ) : l.ignorada ? (
                                <span className="text-foreground-secondary">Já venceu, pode estar paga</span>
                              ) : (
                                <span className="text-foreground-secondary">{l.duplicado === 'planilha' ? 'Repetida nesta planilha' : 'Já estava no painel'}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {!r && (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border bg-background-card p-5">
              <h2 className="text-base font-semibold text-foreground">Enviar o arquivo</h2>
              <p className="mt-1 text-sm text-foreground-secondary">Excel (.xlsx) ou CSV. A primeira aba é a que vale.</p>
              <button
                type="button"
                onClick={() => arquivo.current?.click()}
                onDragOver={e => { e.preventDefault(); setSobre(true) }}
                onDragLeave={() => setSobre(false)}
                onDrop={e => { e.preventDefault(); setSobre(false); void aoEscolher(e.dataTransfer.files[0]) }}
                disabled={ocupado !== null}
                className={cn(
                  'mt-4 flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-colors',
                  sobre ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground-secondary',
                )}
              >
                {ocupado === 'enviando' ? <Loader2 className="h-8 w-8 animate-spin text-foreground-secondary" /> : <Upload className="h-8 w-8 text-foreground-secondary" />}
                <span className="font-medium text-foreground">{ocupado === 'enviando' ? 'Lendo e acrescentando os boletos' : 'Escolher o arquivo ou arrastar para cá'}</span>
              </button>
              <input ref={arquivo} type="file" accept=".xlsx,.xls,.csv,.txt,text/csv" hidden onChange={e => void aoEscolher(e.target.files?.[0])} />
            </section>

            <section className="rounded-xl border border-border bg-background-card p-5">
              <h2 className="text-base font-semibold text-foreground">Ou colar as células</h2>
              <p className="mt-1 text-sm text-foreground-secondary">Selecione as linhas no Excel, copie e cole aqui, com a linha de títulos junto.</p>
              <textarea
                value={colado}
                onChange={e => setColado(e.target.value)}
                placeholder={'CARRO\tPLACA\tVALOR PARCELA\tVENCIMENTO\tCLIENTE\tCONTATO\nDEFENDER\tABC-1D23\t50000\t08/12 A 08/07\tMARIA\t(34) 99999-0000'}
                className="mt-4 min-h-48 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-foreground-secondary focus:border-primary focus:outline-none"
              />
              <button type="button" className={cn(BOTAO_NEUTRO, 'mt-3')} disabled={!colado.trim() || ocupado !== null} onClick={() => void enviar(lerTexto(colado), 'células coladas')}>
                <ClipboardPaste className="h-4 w-4" />
                Acrescentar o que colei
              </button>
            </section>

            <section className="rounded-xl border border-border bg-background-card p-5 xl:col-span-2">
              <h2 className="text-base font-semibold text-foreground">Como funciona</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
                <li><span className="text-foreground">Cada planilha soma à lista.</span> O que já está no painel (mesmo telefone, vencimento e valor) é pulado; o que é novo entra. Nada é trocado nem apagado.</li>
                <li>Pode enviar sempre a mesma planilha com as linhas novas no fim: só as novas entram.</li>
                <li><span className="text-foreground">Cliente, Vencimento e Contato (o telefone)</span> são obrigatórios. Carro, Placa, Valor da parcela e Descrição são opcionais. A ordem das colunas não importa.</li>
                <li><span className="text-foreground">Parcelas:</span> escreva o vencimento como 08/12/2026 A 08/07/2027 e a linha vira uma parcela por mês, todo dia 8. Sem o ano, o painel assume e mostra para conferir.</li>
                <li>Parcela de um intervalo que já venceu não é criada, porque não dá para saber se foi paga.</li>
                <li>Telefone com DDD, do jeito que estiver escrito: (34) 99999-0000, 34999990000 ou +55 34 99999-0000. Sem DDD a linha fica de fora.</li>
                <li>Vencimento como dia/mês/ano. Data do próprio Excel também funciona.</li>
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
