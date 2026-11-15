'use client'

/**
 * Botão "Pausar na Meta" / "Reativar na Meta" de um card (15/11/2026).
 *
 * É a única ação do painel que ESCREVE na Meta, então nada acontece no
 * primeiro clique: abre uma confirmação com o nome do carro e quantos
 * anúncios serão afetados. Ao pausar, pergunta o motivo, que a Meta não
 * guarda; com motivo, o card também é encerrado no painel.
 */
import { useEffect, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { END_REASON_LABELS, type EndReason } from '@/types/database'

const MOTIVOS = Object.keys(END_REASON_LABELS) as EndReason[]

export function PausarAnuncio({
  cardId,
  carro,
  anuncios,
  pausado,
  aoMudar,
  compacto = false,
}: {
  cardId: string
  carro: string
  anuncios: number
  /** O anúncio está fora do ar (pausado na Meta ou encerrado no painel). */
  pausado: boolean
  aoMudar: () => void
  /** No card da lista: botão discreto, da largura do card. */
  compacto?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState<EndReason | ''>('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const acao = pausado ? 'reativar' : 'pausar'
  const quantos = anuncios > 1 ? `os ${anuncios} anúncios` : 'o anúncio'

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && !enviando && setAberto(false)
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto, enviando])

  async function confirmar() {
    setEnviando(true)
    setErro(null)
    try {
      const r = await fetch(`/api/admin/marketing/campaigns/vehicles/${cardId}/meta-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, motivo: motivo || undefined }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) {
        setErro(d?.error || 'Não foi possível concluir agora.')
        return
      }
      setMotivo('')
      aoMudar()
      // Deu certo, mas com ressalva (campanha pausada na Meta): mostra antes de fechar.
      if (d?.aviso) setAviso(d.aviso)
      else setAberto(false)
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setEnviando(false)
    }
  }

  const Icone = pausado ? Play : Pause
  return (
    <>
      <button
        type="button"
        onClick={() => { setErro(null); setAviso(null); setAberto(true) }}
        className={cn(
          'flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-foreground transition-colors hover:border-foreground-secondary',
          compacto ? 'w-full bg-background-card px-3' : 'bg-background-card px-4',
        )}
      >
        <Icone className="h-4 w-4" />
        {pausado ? 'Reativar na Meta' : 'Pausar na Meta'}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60" onClick={() => !enviando && setAberto(false)} />
          <div role="dialog" aria-modal="true" aria-label={pausado ? 'Reativar anúncio' : 'Pausar anúncio'} className="relative w-full max-w-lg rounded-xl border border-border bg-background-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              {pausado ? 'Reativar' : 'Pausar'} {carro}?
            </h2>
            <p className="mt-2 text-foreground-secondary">
              {pausado
                ? `Isso volta a veicular ${quantos} deste carro na Meta e reabre o card no painel.`
                : `Isso tira do ar ${quantos} deste carro na Meta. A campanha e os outros carros continuam como estão. Dá para reativar depois, aqui mesmo.`}
            </p>

            {!pausado && (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-medium text-foreground">Motivo</span>
                <select
                  value={motivo}
                  onChange={e => setMotivo(e.target.value as EndReason | '')}
                  className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
                >
                  <option value="">Só pausar por enquanto</option>
                  {MOTIVOS.map(m => (
                    <option key={m} value={m}>{END_REASON_LABELS[m]}</option>
                  ))}
                </select>
                <span className="mt-1 block text-sm text-foreground-secondary">
                  {motivo === 'troca_criativo'
                    ? 'O card continua aberto, marcado como trocando o criativo. Quando o anúncio novo deste carro entrar no ar na Meta, ele volta sozinho para No ar.'
                    : motivo
                      ? 'O card passa para Encerrado, com este motivo.'
                      : 'O card continua aberto, marcado como pausado na Meta.'}
                </span>
              </label>
            )}

            {aviso && <p role="status" className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">{aviso}</p>}
            {erro && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-foreground">{erro}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={enviando} onClick={() => setAberto(false)} className="min-h-11 rounded-lg border border-border px-4 font-medium text-foreground hover:border-foreground-secondary disabled:opacity-50">
                {aviso ? 'Fechar' : 'Cancelar'}
              </button>
              {!aviso && <button type="button" disabled={enviando} onClick={confirmar} className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                {pausado ? 'Reativar na Meta' : 'Pausar na Meta'}
              </button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
