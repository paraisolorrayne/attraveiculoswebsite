import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { VehicleRequestForm } from '@/components/forms/vehicle-request-form'
import { MarcaAnalytics } from '@/components/analytics/marca-analytics'
import { findSEOBrand, marcasDoHub } from '@/lib/seo-brands'
import { editorialDaMarca } from '@/lib/seo/marcas-editorial'
import { getVehicles } from '@/lib/autoconf-api'
import { filtrarPorMarca } from '@/lib/marca-normalizacao'
import { formatPrice, formatMileage } from '@/lib/utils'
import { SITE_URL } from '@/lib/constants'
import { organizationRef } from '@/lib/schema-entity'
import { ArrowRight, Calendar, Gauge, ShieldCheck } from 'lucide-react'
import { Vehicle } from '@/types'

/**
 * Página editorial da marca — a rota /marca, na raiz.
 *
 * NÃO é a mesma página de /comprar/marca, e a diferença é o motivo de as duas
 * existirem. Decisão comercial de 15/08/2026, com anúncio pago rodando sobre
 * /comprar/*:
 *
 *   /comprar/ferrari   intenção de compra. Estoque, preço, condições. É onde o
 *                      anúncio cai, e por isso aquela URL não se mexe.
 *
 *   /ferrari           intenção informacional. Quem é a marca, o que verificar
 *                      num usado dela, perguntas frequentes — com o estoque no
 *                      MEIO do caminho, não no fim: quem chegou lendo e decidiu
 *                      comprar não deve ter que voltar ao topo.
 *
 * Antes desta página as duas rotas renderizavam o mesmo componente e o texto
 * visível diferia por uma palavra. Duas URLs iguais não somam — o buscador
 * escolhe uma e descarta a outra.
 *
 * O texto vive em `@/lib/seo/marcas-editorial` e é RASCUNHO aguardando revisão
 * da Attra. Marca sem editorial cai em /comprar/marca (ver a rota), em vez de
 * publicar uma página vazia.
 */

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
	return (
		<Link
			href={`/veiculo/${vehicle.slug}`}
			// Lidos por <MarcaAnalytics> na delegação de clique.
			data-veiculo-id={vehicle.id}
			data-veiculo-marca={vehicle.brand}
			data-veiculo-modelo={vehicle.model}
			data-veiculo-slug={vehicle.slug}
			className="group bg-background border border-border rounded-xl overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
		>
			{vehicle.photos?.[0] && (
				<div className="relative aspect-[16/10] bg-background-card">
					<Image
						src={vehicle.photos[0]}
						alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year_model}`}
						fill
						className="object-cover transition-transform duration-500 group-hover:scale-105"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					/>
				</div>
			)}
			<div className="p-5">
				<h3 className="font-semibold text-foreground">
					{vehicle.brand} {vehicle.model}
				</h3>
				<div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground-secondary">
					{vehicle.year_model && (
						<span className="flex items-center gap-1.5">
							<Calendar className="w-3.5 h-3.5" />
							{vehicle.year_model}
						</span>
					)}
					{typeof vehicle.mileage === 'number' && (
						<span className="flex items-center gap-1.5">
							<Gauge className="w-3.5 h-3.5" />
							{formatMileage(vehicle.mileage)}
						</span>
					)}
				</div>
				{vehicle.price ? (
					<p className="mt-4 text-lg font-semibold text-foreground">{formatPrice(vehicle.price)}</p>
				) : (
					<p className="mt-4 text-sm text-foreground-secondary">Sob consulta</p>
				)}
			</div>
		</Link>
	)
}

export async function BrandEditorialPage({ slug }: { slug: string }) {
	const brand = findSEOBrand(slug)
	const editorial = editorialDaMarca(slug)
	if (!brand || !editorial) return null

	const { vehicles: todos } = await getVehicles({ tipo: 'carros', registros_por_pagina: 100 })
	const veiculos = filtrarPorMarca(todos, slug)

	const outrasMarcas = marcasDoHub()
		.filter(m => m.slug !== slug)
		.slice(0, 4)

	return (
		<main>
			<MarcaAnalytics tipo="marca" marca={brand.displayName} categoria={brand.categoriaEditorial} />

			{/* Hero editorial — título informacional, não comercial. A página que
			    disputa "comprar Ferrari" é /comprar/ferrari.
			    O breadcrumb vive DENTRO da seção, com o mesmo py-16 da página
			    comercial: solto acima, com padding menor, ele passava por baixo
			    do cabeçalho fixo e colidia com o logo. */}
			<section className="py-16 lg:py-24">
				<Container>
					<Breadcrumb items={[{ label: brand.displayName }]} className="mb-8" />
					<div className="max-w-3xl">
						<p className="text-sm font-medium uppercase tracking-wider text-primary">
							{brand.country}
						</p>
						<h1 className="mt-2 text-3xl lg:text-5xl font-bold text-foreground">
							{editorial.titulo}
						</h1>
						<p className="mt-5 text-lg text-foreground-secondary">{editorial.resumo}</p>
					</div>
				</Container>
			</section>

			{/* Origem e identidade */}
			<section className="pb-12 lg:pb-16">
				<Container>
					<div className="max-w-3xl space-y-8">
						<div>
							<h2 className="text-2xl font-bold text-foreground">
								Como a {brand.displayName} nasceu
							</h2>
							<p className="mt-4 text-foreground-secondary">{editorial.origem}</p>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-foreground">
								O que define a {brand.displayName}
							</h2>
							<p className="mt-4 text-foreground-secondary">{editorial.identidade}</p>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-foreground">
								A {brand.displayName} no Brasil
							</h2>
							<p className="mt-4 text-foreground-secondary">{editorial.noBrasil}</p>
						</div>
					</div>
				</Container>
			</section>

			{/* ESTOQUE NO MEIO DA PÁGINA — pedido explícito da Attra. Quem estava
			    lendo sobre a marca e decidiu comprar encontra o carro aqui, sem
			    voltar ao topo nem sair da página. Existe sempre: sem estoque, o
			    espaço vira canal de sourcing. */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="mb-8 flex items-center justify-between gap-4">
						<h2 className="text-2xl font-bold text-foreground">
							{brand.displayName} disponíveis na Attra
						</h2>
						{veiculos.length > 0 && (
							<Link
								href={`/comprar/${slug}`}
								className="flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
							>
								Ver condições de compra <ArrowRight className="w-3 h-3" />
							</Link>
						)}
					</div>

					{veiculos.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{veiculos.slice(0, 6).map(v => (
								<VehicleCard key={v.id} vehicle={v} />
							))}
						</div>
					) : (
						<div className="rounded-xl border border-border bg-background p-8 lg:p-12 text-center">
							<p className="text-lg font-medium text-foreground">
								Nenhuma {brand.displayName} no estoque neste momento.
							</p>
							<p className="mx-auto mt-3 max-w-xl text-foreground-secondary">
								A Attra localiza veículos sob encomenda, no Brasil e no exterior, com a
								mesma verificação de procedência do estoque próprio.
							</p>
							<Link
								href="#solicitar"
								className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Solicitar uma {brand.displayName} <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					)}
				</Container>
			</section>

			{/* O que verificar — a seção que não existe em /comprar/marca e é a
			    razão de alguém citar esta página. */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground">
							O que verificar numa {brand.displayName} usada
						</h2>
						<ul className="mt-6 space-y-4">
							{editorial.oQueVerificar.map((item, i) => (
								<li key={i} className="flex gap-3 text-foreground-secondary">
									<ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
									<span>{item}</span>
								</li>
							))}
						</ul>
						<p className="mt-6 text-sm text-foreground-secondary">
							A Attra aplica esta verificação antes de colocar qualquer veículo à venda.{' '}
							<Link href="/criterios-de-selecao" className="text-primary hover:underline">
								Veja os critérios completos
							</Link>
							.
						</p>
					</div>
				</Container>
			</section>

			{/* Modelos — links para as páginas de modelo da própria família /marca */}
			{brand.models.length > 0 && (
				<section className="pb-12 lg:pb-16">
					<Container>
						<div className="max-w-3xl">
							<h2 className="text-2xl font-bold text-foreground">
								Modelos {brand.displayName}
							</h2>
							<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
								{brand.models.map(m => (
									<Link
										key={m.slug}
										href={`/${slug}/${m.slug}`}
										className="rounded-xl border border-border bg-background-card p-5 transition-colors hover:border-primary/40"
									>
										<span className="block font-semibold text-foreground">{m.name}</span>
										<span className="mt-1 block text-sm text-foreground-secondary">
											{m.tagline}
										</span>
									</Link>
								))}
							</div>
						</div>
					</Container>
				</section>
			)}

			{/* Perguntas frequentes — vira FAQPage no JSON-LD abaixo */}
			<section className="py-12 lg:py-16 border-t border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground">Perguntas frequentes</h2>
						<div className="mt-6 space-y-6">
							{editorial.perguntas.map((p, i) => (
								<div key={i}>
									<h3 className="font-semibold text-foreground">{p.pergunta}</h3>
									<p className="mt-2 text-foreground-secondary">{p.resposta}</p>
								</div>
							))}
						</div>
					</div>
				</Container>
			</section>

			{/* Ponte explícita para a página comercial. As duas se completam, e
			    dizer isso em link ajuda leitor e buscador a entender que são
			    páginas distintas e relacionadas, não cópias. */}
			<section className="pb-12 lg:pb-16">
				<Container>
					<div className="mx-auto max-w-3xl rounded-xl border border-border bg-background-card p-6 lg:p-8">
						<h2 className="text-xl font-bold text-foreground">
							Procurando comprar uma {brand.displayName}?
						</h2>
						<p className="mt-3 text-foreground-secondary">
							Esta página conta a história da marca. Para estoque, condições de compra,
							financiamento e troca, veja a página de compra.
						</p>
						<Link
							href={`/comprar/${slug}`}
							className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
						>
							Comprar {brand.displayName} <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</Container>
			</section>

			{/* Outras marcas */}
			{outrasMarcas.length > 0 && (
				<section className="pb-12 lg:pb-16">
					<Container>
						<h2 className="text-2xl font-bold text-foreground mb-6">Outras marcas</h2>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							{outrasMarcas.map(m => (
								<Link
									key={m.slug}
									href={`/${m.slug}`}
									className="group rounded-xl border border-border bg-background-card p-4 text-center transition-all hover:border-primary/40"
								>
									<h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
										{m.displayName}
									</h3>
									<p className="mt-1 text-xs text-foreground-secondary">{m.tagline}</p>
								</Link>
							))}
						</div>
					</Container>
				</section>
			)}

			{/* Solicitação */}
			<section id="solicitar" className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="mx-auto max-w-2xl">
						<h2 className="mb-3 text-center text-2xl font-bold text-foreground">
							Procura uma {brand.displayName} específica?
						</h2>
						<p className="mb-8 text-center text-foreground-secondary">
							Diga qual modelo você procura. A Attra localiza e apresenta as opções com
							procedência verificada.
						</p>
						<VehicleRequestForm
							origem={`/${slug}`}
							marcaInicial={brand.displayName}
							categoria={brand.categoriaEditorial}
						/>
					</div>
				</Container>
			</section>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify([
						{
							'@context': 'https://schema.org',
							'@type': 'Brand',
							name: brand.displayName,
							description: editorial.resumo,
							url: `${SITE_URL}/${slug}`,
						},
						{
							'@context': 'https://schema.org',
							'@type': 'FAQPage',
							mainEntity: editorial.perguntas.map(p => ({
								'@type': 'Question',
								name: p.pergunta,
								acceptedAnswer: { '@type': 'Answer', text: p.resposta },
							})),
						},
						{
							'@context': 'https://schema.org',
							'@type': 'WebPage',
							name: editorial.titulo,
							url: `${SITE_URL}/${slug}`,
							about: { '@type': 'Brand', name: brand.displayName },
							publisher: organizationRef(),
						},
					]),
				}}
			/>
		</main>
	)
}
