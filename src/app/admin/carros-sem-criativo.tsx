'use client'

/**
 * "Carros sem criativo" da tela inicial: os carros novos do estoque que ainda
 * não têm peça. "Criar criativo" abre o gerador com o carro já escolhido;
 * "Já tem" tira da lista o carro cuja peça foi feita fora do gerador.
 */
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Palette } from 'lucide-react'
import type { CarroSemCriativo } from '@/lib/admin-inicio'

const real = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function haQuanto(dias: number | null): string {
	if (dias === null) return 'no estoque'
	if (dias === 0) return 'entrou hoje'
	if (dias === 1) return 'entrou ontem'
	return `há ${dias} dias no estoque`
}

export function CarrosSemCriativo({ carros }: { carros: CarroSemCriativo[] }) {
	const [fora, setFora] = useState<Set<string>>(new Set())
	const [erro, setErro] = useState<string | null>(null)

	async function jaTem(c: CarroSemCriativo) {
		setErro(null)
		setFora(f => new Set(f).add(c.id))
		try {
			const r = await fetch('/api/admin/criativos-gerados', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ autoconf_id: c.id, nome: c.nome }),
			})
			if (!r.ok) throw new Error()
		} catch {
			// Não gravou: o carro volta para a lista, com o aviso.
			setFora(f => {
				const n = new Set(f)
				n.delete(c.id)
				return n
			})
			setErro(`Não consegui marcar o ${c.nome}. Tente de novo.`)
		}
	}

	const visiveis = carros.filter(c => !fora.has(c.id))
	if (visiveis.length === 0) {
		return (
			<p className="flex items-center gap-2 rounded-xl border border-border bg-background-card px-5 py-4 text-foreground">
				<Check className="h-5 w-5 text-green-600" />
				Todos os carros novos do estoque já têm criativo.
			</p>
		)
	}

	return (
		<>
			{erro && <p role="alert" className="mb-3 text-sm text-red-500">{erro}</p>}
			<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{visiveis.map(c => (
					<li key={c.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-background-card">
						<div className="relative aspect-[16/10] bg-background">
							{c.foto && (
								<Image src={c.foto} alt={c.nome} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" />
							)}
						</div>
						<div className="flex flex-1 flex-col p-4">
							<div className="font-semibold text-foreground">{c.nome}</div>
							{c.versao && <div className="truncate text-sm text-foreground-secondary">{c.versao}</div>}
							<div className="mt-2 text-sm text-foreground-secondary">
								{c.preco ? <span className="font-medium text-foreground">{real(c.preco)}</span> : 'Sob consulta'}
								{' · '}
								{haQuanto(c.dias)}
							</div>
							<div className="mt-auto flex flex-wrap gap-2 pt-4">
								<Link
									href={`/admin/gerador-criativos?veiculo=${c.id}`}
									className="flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
								>
									<Palette className="h-4 w-4" />
									Criar criativo
								</Link>
								<button
									type="button"
									onClick={() => jaTem(c)}
									title="A peça deste carro já foi feita"
									className="min-h-11 whitespace-nowrap rounded-lg border border-border px-3 text-sm font-medium text-foreground-secondary transition-colors hover:border-foreground-secondary hover:text-foreground"
								>
									Já tem
								</button>
							</div>
						</div>
					</li>
				))}
			</ul>
		</>
	)
}
