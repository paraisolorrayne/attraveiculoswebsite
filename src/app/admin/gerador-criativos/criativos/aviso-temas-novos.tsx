'use client'

/**
 * Aviso dos temas novos do gerador (16/10/2026): aparece UMA vez para cada
 * pessoa, na primeira entrada na aba Criativos depois do deploy — pedido da
 * Lorrayne para o Pedro (operador) saber da Edição e do Premium sem precisar
 * de recado.
 *
 * "Já viu" fica no navegador, com o id do usuário na chave: duas pessoas no
 * mesmo computador veem cada uma o seu. Não há migration por isso; o custo é
 * que, num navegador novo, o aviso aparece de novo — uma vez.
 *
 * Para anunciar outro tema no futuro: trocar `AVISO` e `TEMAS`. Um id novo
 * faz o aviso voltar para todo mundo.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import type { FormatoId } from '@content/admin/creative/gerador'

const AVISO = 'temas-2026-10-edicao-premium'
const EVENTO = 'attra:gerador:aviso-visto'
/** Fechados nesta aba: se o localStorage recusar a gravação, o aviso fecha mesmo assim. */
const fechadosAqui = new Set<string>()

function assinar(avisar: () => void) {
	window.addEventListener(EVENTO, avisar)
	window.addEventListener('storage', avisar)
	return () => {
		window.removeEventListener(EVENTO, avisar)
		window.removeEventListener('storage', avisar)
	}
}

const TEMAS: { id: FormatoId; nome: string; artigo: 'a' | 'o'; imagem: string; texto: string }[] = [
	{
		id: 'edicao',
		nome: 'Edição',
		artigo: 'a',
		imagem: '/gerador/novidades/edicao.jpg',
		texto:
			'Linha editorial de luxo: a foto do carro ocupa a peça inteira, com o “A” da Attra ao fundo e o modelo em serifa. Usa só a foto principal — de preferência sem tarja.',
	},
	{
		id: 'premium',
		nome: 'Premium',
		artigo: 'o',
		imagem: '/gerador/novidades/premium.jpg',
		texto:
			'Escuro, com a faixa na cor do carro, os números de desempenho no alto, a ficha em grade e uma segunda foto embaixo.',
	},
]

export function AvisoTemasNovos({ usuarioId, aoUsar }: { usuarioId: string; aoUsar: (id: FormatoId) => void }) {
	const chave = `attra:gerador:aviso:${AVISO}:${usuarioId}`
	const painel = useRef<HTMLDivElement>(null)

	// O "já viu" mora no localStorage. useSyncExternalStore, como em
	// visitors-ui.tsx: no servidor o snapshot é "fechado", então o aviso não
	// pisca para quem já viu nem diverge na hidratação. Sem armazenamento, o
	// aviso não aparece — insistir a cada visita seria pior.
	const aberto = useSyncExternalStore(
		assinar,
		() => {
			if (fechadosAqui.has(chave)) return false
			try {
				return localStorage.getItem(chave) === null
			} catch {
				return false
			}
		},
		() => false,
	)

	const fechar = useCallback(
		(usar?: FormatoId) => {
			fechadosAqui.add(chave)
			try {
				localStorage.setItem(chave, new Date().toISOString())
			} catch {
				// Se não der para guardar, o aviso volta na próxima visita.
			}
			window.dispatchEvent(new Event(EVENTO))
			if (usar) aoUsar(usar)
		},
		[chave, aoUsar],
	)

	useEffect(() => {
		if (!aberto) return
		painel.current?.querySelector<HTMLElement>('[data-principal]')?.focus()
		const tecla = (e: KeyboardEvent) => {
			if (e.key === 'Escape') fechar()
		}
		window.addEventListener('keydown', tecla)
		return () => window.removeEventListener('keydown', tecla)
	}, [aberto, fechar])

	if (!aberto) return null

	return (
		<div
			className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] sm:p-6"
			onClick={() => fechar()}
		>
			<div
				ref={painel}
				role="dialog"
				aria-modal="true"
				aria-labelledby="aviso-temas-titulo"
				onClick={e => e.stopPropagation()}
				onKeyDown={e => {
					if (e.key !== 'Tab') return
					const focaveis = Array.from(painel.current?.querySelectorAll<HTMLElement>('button') ?? [])
					const primeiro = focaveis[0]
					const ultimo = focaveis[focaveis.length - 1]
					if (e.shiftKey && document.activeElement === primeiro) {
						e.preventDefault()
						ultimo?.focus()
					}
					if (!e.shiftKey && document.activeElement === ultimo) {
						e.preventDefault()
						primeiro?.focus()
					}
				}}
				className="flex max-h-[88dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[14px] border border-border bg-background-card shadow-[0_24px_80px_#00000059]"
			>
				<div className="flex items-start justify-between gap-3 border-b border-border p-5">
					<div>
						<h2 id="aviso-temas-titulo" className="text-lg font-semibold text-foreground">
							Temas novos no gerador
						</h2>
						<p className="mt-1 text-sm text-foreground-secondary">
							Dois formatos novos para os anúncios do estoque, em Stories e Feed.
						</p>
					</div>
					<button
						type="button"
						onClick={() => fechar()}
						aria-label="Fechar"
						className="rounded-md p-1.5 text-foreground-secondary hover:bg-background hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
					{TEMAS.map(t => (
						<div key={t.id} className="flex gap-4 sm:flex-col">
							{/* eslint-disable-next-line @next/next/no-img-element -- miniatura fixa de 360×640, sem otimização a ganhar */}
							<img
								src={t.imagem}
								alt={`Exemplo do tema ${t.nome}`}
								width={360}
								height={640}
								className="h-auto w-28 shrink-0 rounded-lg border border-border sm:w-full sm:max-w-[220px] sm:self-center"
							/>
							<div className="min-w-0">
								<h3 className="font-semibold text-foreground">{t.nome}</h3>
								<p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{t.texto}</p>
								<button
									type="button"
									onClick={() => fechar(t.id)}
									className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
								>
									Usar {t.artigo} {t.nome}
								</button>
							</div>
						</div>
					))}
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
					<p className="text-xs text-foreground-secondary">
						Saíram o Clássico, o Destaque e a Ficha. O Clássico Loja e o Estoque continuam.
					</p>
					<button
						type="button"
						data-principal
						onClick={() => fechar()}
						className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
					>
						Entendi
					</button>
				</div>
			</div>
		</div>
	)
}
