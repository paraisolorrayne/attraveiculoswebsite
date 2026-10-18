'use client'

/**
 * Aviso de novidade do gerador: aparece UMA vez para cada pessoa, na primeira
 * entrada no gerador depois do deploy. Pedido da Lorrayne para o Pedro
 * (operador) saber das mudanças sem precisar de recado.
 *
 * "Já viu" fica no navegador, com o id do usuário na chave: duas pessoas no
 * mesmo computador veem cada uma o seu. Não há migration por isso; o custo é
 * que, num navegador novo, o aviso aparece de novo — uma vez.
 *
 * Para anunciar outra novidade: trocar `AVISO` e `NOVIDADE`. Um id novo faz o
 * aviso voltar para todo mundo. Histórico:
 *   - temas-2026-10-edicao-premium (16/10): Edição e Premium; saíram o
 *     Clássico, o Destaque e a Ficha;
 *   - vendido-2026-10-rota (18/10): o Story Vendido novo.
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'

const AVISO = 'vendido-2026-10-rota'
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

const NOVIDADE = {
	titulo: 'Story Vendido novo',
	resumo: 'A peça de venda concluída mudou: agora ela mostra a rota de Uberlândia até o cliente.',
	imagem: '/gerador/novidades/vendido.jpg',
	alt: 'Exemplo do Story Vendido novo: G 63 vendido para Goiânia, com o mapa do Brasil',
	texto:
		'A foto do carro e o mapa do Brasil com o arco até a cidade de entrega. No editor você escolhe a foto do estoque, a cidade, a situação (Vendido, Reservado ou Entregue) e o tema claro ou escuro: carro escuro costuma pedir o claro, e carro claro o escuro.',
	botao: 'Abrir o Story Vendido',
	rodape: 'Saíram o caminhão, o título com a ficha e o domínio do site.',
}

export function AvisoNovidades({ usuarioId, aoUsar }: { usuarioId: string; aoUsar: () => void }) {
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
		(usar?: boolean) => {
			fechadosAqui.add(chave)
			try {
				localStorage.setItem(chave, new Date().toISOString())
			} catch {
				// Se não der para guardar, o aviso volta na próxima visita.
			}
			window.dispatchEvent(new Event(EVENTO))
			if (usar) aoUsar()
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
				aria-labelledby="aviso-novidades-titulo"
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
				className="flex max-h-[88dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] border border-border bg-background-card shadow-[0_24px_80px_#00000059]"
			>
				<div className="flex items-start justify-between gap-3 border-b border-border p-5">
					<div>
						<h2 id="aviso-novidades-titulo" className="text-lg font-semibold text-foreground">
							{NOVIDADE.titulo}
						</h2>
						<p className="mt-1 text-sm text-foreground-secondary">{NOVIDADE.resumo}</p>
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

				<div className="flex gap-5 overflow-y-auto p-5">
					{/* eslint-disable-next-line @next/next/no-img-element -- miniatura fixa de 360×640, sem otimização a ganhar */}
					<img
						src={NOVIDADE.imagem}
						alt={NOVIDADE.alt}
						width={360}
						height={640}
						className="h-auto w-28 shrink-0 self-start rounded-lg border border-border sm:w-44"
					/>
					<div className="min-w-0">
						<p className="text-sm leading-relaxed text-foreground-secondary">{NOVIDADE.texto}</p>
						<button
							type="button"
							onClick={() => fechar(true)}
							className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
						>
							{NOVIDADE.botao}
						</button>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
					<p className="text-xs text-foreground-secondary">{NOVIDADE.rodape}</p>
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
