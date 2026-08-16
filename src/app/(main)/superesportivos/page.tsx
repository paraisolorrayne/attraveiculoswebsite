import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { VehicleRequestForm } from '@/components/forms/vehicle-request-form'
import { marcasPorCategoria, marcasDoHub } from '@/lib/seo-brands'
import { getVehicles } from '@/lib/autoconf-api'
import { marcaCasaCom } from '@/lib/marca-normalizacao'
import { podeAparecerNoHub } from '@/lib/estoque-superesportivo'
import { porPrecoDecrescente } from '@/lib/ordenacao-veiculos'
import { formatPrice, formatMileage } from '@/lib/utils'
import { SITE_URL } from '@/lib/constants'
import { organizationRef } from '@/lib/schema-entity'
import { ArrowRight, Calendar, Gauge } from 'lucide-react'
import { Vehicle } from '@/types'
import { MarcaAnalytics } from '@/components/analytics/marca-analytics'

/**
 * Hub da categoria — /superesportivos.
 *
 * Comercial antes de editorial, como pedem os specs: quem busca "superesportivo
 * à venda" encontra o estoque logo depois do hero, não a história da categoria.
 *
 * O estoque vem do MESMO `getVehicles` do resto do site, filtrado pelas marcas
 * classificadas como performance em SEO_BRANDS — não há segunda fonte de
 * veículos nem cadastro paralelo.
 */

export const metadata: Metadata = {
	// Sem sufixo de marca: o layout raiz aplica o template '%s | Attra Veículos'.
	// Repetir aqui produzia "... | Attra Veículos | Attra Veículos" na aba.
	title: 'Superesportivos à Venda | Supercarros no Brasil',
	description:
		'Superesportivos à venda no Brasil: Ferrari, Lamborghini, McLaren, Porsche e Aston Martin com procedência verificada. Veja o estoque ou solicite o modelo que procura.',
	keywords: [
		'superesportivo à venda',
		'supercarro à venda',
		'comprar superesportivo',
		'carro esportivo de luxo',
		'supercarro seminovo',
	],
	alternates: { canonical: `${SITE_URL}/superesportivos` },
	openGraph: {
		title: 'Superesportivos à Venda no Brasil | Attra Veículos',
		description:
			'Ferrari, Lamborghini, McLaren, Porsche e Aston Martin com procedência verificada. Veja o estoque disponível ou solicite sob encomenda.',
		url: `${SITE_URL}/superesportivos`,
		type: 'website',
	},
}

function VeiculoCard({ vehicle }: { vehicle: Vehicle }) {
	return (
		<Link
			href={`/veiculo/${vehicle.slug}`}
			// Lidos por <MarcaAnalytics> na delegação de clique.
			data-veiculo-id={vehicle.id}
			data-veiculo-marca={vehicle.brand}
			data-veiculo-modelo={vehicle.model}
			data-veiculo-slug={vehicle.slug}
			className="group bg-background-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
		>
			{vehicle.photos?.[0] && (
				<div className="relative aspect-[16/10] bg-background">
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

function BlocoDeMarcas({ titulo, descricao, marcas }: {
	titulo: string
	descricao: string
	marcas: ReturnType<typeof marcasPorCategoria>
}) {
	if (marcas.length === 0) return null
	return (
		<div>
			<h3 className="text-xl font-bold text-foreground">{titulo}</h3>
			<p className="mt-2 text-sm text-foreground-secondary max-w-2xl">{descricao}</p>
			<div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
				{marcas.map(marca => (
					<Link
						key={marca.slug}
						href={`/${marca.slug}`}
						className="rounded-xl border border-border bg-background-card p-5 text-center transition-colors hover:border-primary/40"
					>
						<span className="block font-semibold text-foreground">{marca.displayName}</span>
						<span className="mt-1 block text-xs text-foreground-secondary">{marca.country}</span>
					</Link>
				))}
			</div>
		</div>
	)
}

export default async function SuperesportivosPage() {
	const marcas = marcasDoHub()

	const { vehicles: todos } = await getVehicles({
		tipo: 'carros',
		registros_por_pagina: 100,
	})

	// Estoque da categoria. A marca é só o primeiro filtro — quem decide se o
	// carro pode ser anunciado como superesportivo é `podeAparecerNoHub`, porque
	// filtrar só por marca colocava BMW X2, Porsche Macan e Mercedes G-63
	// debaixo do H1 "Superesportivos à venda".
	//
	// A comparação de marca usa a camada de normalização, nunca o nome cru: o
	// AutoConf grava "Mercedes" onde o catálogo tem "Mercedes-Benz".
	// Ordenado ANTES do corte de seis: o hub é a vitrine da categoria, e o carro
	// mais caro não pode ficar fora dela por acidente de ordem.
	const veiculos = porPrecoDecrescente(
		todos.filter(v => {
			const marca = marcas.find(m => marcaCasaCom(v.brand, m.slug))
			return marca ? podeAparecerNoHub(v, marca.categoriaEditorial) : false
		}),
	)

	const superesportivos = marcasPorCategoria('superesportivo')
	const performance = marcasPorCategoria('performance')

	return (
		<main>
			<MarcaAnalytics tipo="categoria" categoria="superesportivo" />

			{/* Hero — linguagem comercial, não institucional.
			    O breadcrumb vai DENTRO da seção: solto acima, com padding
			    menor, ele passava por baixo do cabeçalho fixo. */}
			<section className="py-16 lg:py-24">
				<Container>
					<Breadcrumb items={[{ label: 'Superesportivos' }]} className="mb-8" />
					<div className="max-w-3xl">
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground">
							Superesportivos à venda
						</h1>
						<p className="mt-5 text-lg text-foreground-secondary">
							Ferrari, Lamborghini, McLaren, Porsche e Aston Martin com procedência
							verificada. Veja o que está disponível agora ou diga qual modelo você
							procura — a Attra localiza no Brasil e no exterior.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								href="#estoque"
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Ver disponíveis <ArrowRight className="w-4 h-4" />
							</Link>
							<Link
								href="#solicitar"
								className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background-card"
							>
								Solicitar um veículo
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* Estoque logo após o hero — quem chegou com intenção de compra não
			    deve precisar ler sobre a categoria para achar o carro. Existe
			    SEMPRE: sem estoque, o espaço vira canal de sourcing. */}
			<section id="estoque" className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="mb-8 flex items-center justify-between gap-4">
						<h2 className="text-2xl font-bold text-foreground">Disponíveis na Attra</h2>
						{veiculos.length > 0 && (
							<Link
								href="/veiculos"
								className="flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
							>
								Ver estoque completo <ArrowRight className="w-3 h-3" />
							</Link>
						)}
					</div>

					{veiculos.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{veiculos.slice(0, 6).map(v => (
								<VeiculoCard key={v.id} vehicle={v} />
							))}
						</div>
					) : (
						<div className="rounded-xl border border-border bg-background p-8 lg:p-12 text-center">
							<p className="text-lg font-medium text-foreground">
								Nenhum superesportivo disponível no estoque neste momento.
							</p>
							<p className="mx-auto mt-3 max-w-xl text-foreground-secondary">
								A Attra localiza veículos sob encomenda, com a mesma verificação de
								procedência do estoque próprio.
							</p>
							<Link
								href="#solicitar"
								className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Solicitar um veículo <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					)}
				</Container>
			</section>

			{/* Marcas — em dois blocos, não numa lista só */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Marcas</h2>
					<div className="space-y-12">
						<BlocoDeMarcas
							titulo="Superesportivos"
							descricao="Marcas cuja linha inteira é construída em torno de desempenho — carros de dois lugares, motor central ou dianteiro longitudinal, produção limitada."
							marcas={superesportivos}
						/>
						<BlocoDeMarcas
							titulo="Performance e luxo"
							descricao="Marcas generalistas com divisões de alto desempenho, e marcas de luxo com modelos esportivos. Uso mais amplo, mesma exigência de procedência."
							marcas={performance}
						/>
					</div>
				</Container>
			</section>

			{/* Conteúdo — comercial, sobre comprar, não sobre a categoria */}
			<section className="py-12 lg:py-16 border-t border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground">
							Comprar um superesportivo com a Attra
						</h2>
						<div className="mt-6 space-y-6 text-foreground-secondary">
							<div>
								<h3 className="font-semibold text-foreground">Estoque e encomenda</h3>
								<p className="mt-2">
									Nem todo superesportivo está em estoque a qualquer momento — são
									carros de produção limitada e giro baixo. Quando o modelo que você
									procura não está disponível, a Attra faz a busca: no mercado
									nacional e, quando faz sentido, no exterior.
								</p>
							</div>
							<div>
								<h3 className="font-semibold text-foreground">Procedência antes do preço</h3>
								<p className="mt-2">
									Em carros desta faixa, histórico vale mais do que quilometragem. A
									Attra verifica origem, documentação e manutenção antes de colocar
									qualquer veículo à venda — e o mesmo critério vale para os veículos
									localizados sob encomenda.
								</p>
							</div>
							<div>
								<h3 className="font-semibold text-foreground">Novo ou seminovo</h3>
								<p className="mt-2">
									Um superesportivo seminovo com procedência verificada costuma ser a
									decisão mais racional: a maior perda de valor já aconteceu, e o
									carro continua entregando a mesma experiência. Consulte-nos sobre o
									modelo específico — a resposta muda conforme o carro.
								</p>
							</div>
						</div>
					</div>
				</Container>
			</section>

			{/* Solicitação — o mesmo formulário do resto do site */}
			<section id="solicitar" className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="mx-auto max-w-2xl">
						<h2 className="text-2xl font-bold text-foreground mb-3 text-center">
							Solicite um superesportivo
						</h2>
						<p className="text-center text-foreground-secondary mb-8">
							Diga qual modelo você procura. A Attra localiza e apresenta as opções
							com procedência verificada.
						</p>
						<VehicleRequestForm origem="/superesportivos" categoria="superesportivo" />
					</div>
				</Container>
			</section>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: 'Superesportivos à venda',
						url: `${SITE_URL}/superesportivos`,
						description:
							'Superesportivos à venda no Brasil com procedência verificada, ou localizados sob encomenda pela Attra Veículos.',
						provider: organizationRef(),
						mainEntity: {
							'@type': 'ItemList',
							itemListElement: marcas.map((m, i) => ({
								'@type': 'ListItem',
								position: i + 1,
								url: `${SITE_URL}/${m.slug}`,
								name: m.displayName,
							})),
						},
					}),
				}}
			/>
		</main>
	)
}
