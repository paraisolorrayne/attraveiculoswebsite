import Link from 'next/link'
import Image from 'next/image'
import { Car, ArrowRight } from 'lucide-react'
import { formatPrice, formatMileage } from '@/lib/utils'
import { tituloDoVeiculo } from '@/lib/identidade-do-veiculo'
import { AVISO_DE_PRECO, fraseDoEstoque, resumoDoEstoque } from '@/lib/seo/estoque-do-modelo'
import type { Vehicle } from '@/types'

interface EstoqueDoModeloProps {
	/** Já filtrados e ordenados por `estoqueDoModelo`. */
	veiculos: Vehicle[]
	marca: string
	modelo: string
	limite?: number
	/** Data da consulta ao estoque, "28/10/2026". */
	conferidoEm: string
}

/**
 * As unidades de um modelo à venda, montadas no servidor: preço no HTML, com
 * asterisco e o aviso de atualização embaixo. Substitui o EstoqueAoVivo, que
 * buscava o estoque no navegador (ver src/lib/seo/estoque-do-modelo.ts).
 */
export function EstoqueDoModelo({ veiculos, marca, modelo, limite = 6, conferidoEm }: EstoqueDoModeloProps) {
	const nome = `${marca} ${modelo}`
	const busca = `/veiculos?search=${encodeURIComponent(nome)}`

	if (veiculos.length === 0) {
		return (
			<div className="p-6 bg-background-card border border-border rounded-xl text-center">
				<Car className="w-8 h-8 text-foreground-secondary mx-auto mb-3" />
				<p className="text-foreground-secondary mb-4">
					Nenhum {nome} à venda na Attra em {conferidoEm}. A Attra encontra o exemplar sob encomenda.
				</p>
				<div className="flex flex-wrap justify-center gap-4">
					<Link href="/solicitar-veiculo" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
						Encomendar um {modelo} <ArrowRight className="w-4 h-4" />
					</Link>
					<Link href="/veiculos" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
						Ver estoque completo <ArrowRight className="w-4 h-4" />
					</Link>
				</div>
			</div>
		)
	}

	const frase = fraseDoEstoque(nome, resumoDoEstoque(veiculos))
	const temPreco = veiculos.some(v => v.price > 0)

	return (
		<div>
			<p className="text-sm text-foreground-secondary mb-4">
				<span className="font-semibold text-foreground">{frase}</span>, em {conferidoEm}.
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{veiculos.slice(0, limite).map(v => (
					<Link
						key={v.id}
						href={`/veiculo/${v.slug}`}
						className="group block p-3 bg-background-card border border-border rounded-xl hover:border-primary/50 transition-colors"
					>
						{v.photos?.[0] && (
							<div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-3">
								<Image
									src={v.photos[0]}
									alt={tituloDoVeiculo(v)}
									fill
									className="object-cover group-hover:scale-105 transition-transform duration-300"
									sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
								/>
								{v.is_new && (
									<span className="absolute top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
										0 km
									</span>
								)}
							</div>
						)}
						<h3 className="text-sm font-semibold text-foreground truncate">{tituloDoVeiculo(v)}</h3>
						<p className="text-xs text-foreground-secondary mt-0.5">
							{v.is_new || v.mileage === 0 ? '0 km' : formatMileage(v.mileage)}
							{v.color ? ` · ${v.color}` : ''}
						</p>
						<p className="text-base font-bold text-foreground mt-1">
							{v.price > 0 ? `${formatPrice(v.price)}*` : 'Sob consulta'}
						</p>
					</Link>
				))}
			</div>
			{temPreco && (
				<p className="mt-4 text-xs text-foreground-secondary">
					*{AVISO_DE_PRECO} Estoque conferido em {conferidoEm}; confirme o valor com um consultor.
				</p>
			)}
			<div className="mt-4 text-center">
				<Link href={busca} className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
					Ver {veiculos.length > limite ? `os ${veiculos.length} ` : ''}{nome} no estoque <ArrowRight className="w-4 h-4" />
				</Link>
			</div>
		</div>
	)
}
