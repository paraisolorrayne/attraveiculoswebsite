import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { SEO_BRANDS } from '@/lib/seo-brands'
import { getVehicles } from '@/lib/autoconf-api'
import { SITE_URL } from '@/lib/constants'
import { ArrowRight, Shield, Globe, Truck, Search } from 'lucide-react'

export const metadata: Metadata = {
	title: 'Comprar Carros de Luxo e Supercarros no Brasil',
	description: 'Carros de luxo e supercarros à venda no Brasil. Ferrari, Porsche, BMW, Mercedes-Benz, McLaren e mais. Curadoria premium, procedência verificada e entrega nacional. Attra Veículos — desde 2008.',
	keywords: [
		'comprar carro de luxo brasil', 'comprar supercarro brasil',
		'carros de luxo à venda brasil', 'carros importados premium brasil',
		'loja de supercarros brasil', 'carros exclusivos à venda brasil',
	],
	alternates: { canonical: `${SITE_URL}/comprar` },
	openGraph: {
		title: 'Comprar Carros de Luxo e Supercarros no Brasil',
		description: 'Carros de luxo e supercarros à venda no Brasil com procedência verificada. Ferrari, Porsche, BMW, Mercedes, McLaren e mais. Entrega nacional.',
		url: `${SITE_URL}/comprar`,
		type: 'website',
	},
}

const TRUST_SIGNALS = [
	{ icon: Shield, title: 'Procedência Verificada', description: 'Curadoria rigorosa com inspeção completa de cada veículo' },
	{ icon: Globe, title: 'Entrega Nacional', description: 'Logística especializada para todo o Brasil com seguro completo' },
	{ icon: Truck, title: 'Desde 2008', description: 'Mais de 17 anos de excelência no mercado premium brasileiro' },
	{ icon: Search, title: 'Curadoria Premium', description: 'Seleção criteriosa dos melhores exemplares do mercado' },
]

export default async function ComprarHubPage() {
	const { vehicles, total } = await getVehicles({
		tipo: 'carros',
		registros_por_pagina: 100,
	})

	// Count vehicles per brand
	const brandCounts = new Map<string, number>()
	for (const v of vehicles) {
		const brand = (v.brand || '').toLowerCase()
		brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1)
	}

	const breadcrumbItems = [
		{ label: 'Veículos', href: '/veiculos' },
		{ label: 'Comprar Carros de Luxo' },
	]

	return (
		<main>
			{/* Hero Section */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							Comprar Carros de Luxo e Supercarros no Brasil
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							A Attra Veículos reúne os melhores exemplares do mercado automotivo premium brasileiro.
							De Ferrari a Porsche, cada veículo passa por curadoria rigorosa com procedência verificada
							e entrega em todo o Brasil.
						</p>
						<div className="mt-6 flex items-center gap-3 text-sm text-foreground-secondary">
							<span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
								{total} veículos disponíveis
							</span>
							<span className="px-3 py-1 bg-background border border-border rounded-full">
								{SEO_BRANDS.length} marcas premium
							</span>
						</div>
					</div>
				</Container>
			</section>

			{/* Brands Grid */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">
						Marcas Premium Disponíveis
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{SEO_BRANDS.map(brand => {
							const count = brandCounts.get(brand.name.toLowerCase()) || 0
							const featuredVehicle = vehicles.find(v =>
								(v.brand || '').toLowerCase() === brand.name.toLowerCase()
							)
							return (
								<Link
									key={brand.slug}
									href={`/comprar/${brand.slug}`}
									className="group bg-background-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg"
								>
									{featuredVehicle?.photos?.[0] && (
										<div className="relative aspect-[16/10] bg-background">
											<Image
												src={featuredVehicle.photos[0]}
												alt={`${brand.displayName} na Attra Veículos`}
												fill
												className="object-cover group-hover:scale-105 transition-transform duration-500"
												sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
											/>
										</div>
									)}
									<div className="p-5">
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
												{brand.displayName}
											</h3>
											<ArrowRight className="w-4 h-4 text-foreground-secondary group-hover:text-primary transition-colors" />
										</div>
										<p className="text-sm text-foreground-secondary line-clamp-2 mb-3">
											{brand.tagline}
										</p>
										<div className="flex items-center gap-2 text-xs text-foreground-secondary">
											<span className="px-2 py-0.5 bg-background rounded border border-border">
												{brand.country}
											</span>
											{count > 0 && (
												<span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
													{count} {count === 1 ? 'veículo' : 'veículos'}
												</span>
											)}
											<span className="px-2 py-0.5 bg-background rounded border border-border">
												{brand.models.length} {brand.models.length === 1 ? 'modelo' : 'modelos'}
											</span>
										</div>
									</div>
								</Link>
							)
						})}
					</div>
				</Container>
			</section>

			{/* Trust Signals */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8 text-center">
						Por que comprar na Attra?
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{TRUST_SIGNALS.map(signal => (
							<div key={signal.title} className="text-center p-6">
								<signal.icon className="w-8 h-8 text-primary mx-auto mb-3" />
								<h3 className="font-semibold text-foreground mb-2">{signal.title}</h3>
								<p className="text-sm text-foreground-secondary">{signal.description}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* CTA Section */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 lg:p-12 text-center border border-primary/20">
						<h2 className="text-2xl font-bold text-foreground mb-3">
							Não encontrou o que procura?
						</h2>
						<p className="text-foreground-secondary mb-6 max-w-xl mx-auto">
							A Attra trabalha com importação sob encomenda e busca personalizada.
							Conte-nos qual veículo dos seus sonhos e nós encontramos para você.
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo
								<ArrowRight className="w-4 h-4" />
							</Link>
							<Link
								href="/solicitar-veiculo"
								className="inline-flex items-center gap-2 px-6 py-3 bg-background border border-border text-foreground rounded-lg font-medium hover:border-primary/40 transition-colors"
							>
								Solicitar veículo
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* JSON-LD Schema */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: 'Comprar Carros de Luxo e Supercarros no Brasil',
						description: 'Carros de luxo e supercarros à venda no Brasil com procedência verificada.',
						url: `${SITE_URL}/comprar`,
						mainEntity: {
							'@type': 'ItemList',
							name: 'Marcas Premium na Attra Veículos',
							numberOfItems: SEO_BRANDS.length,
							itemListElement: SEO_BRANDS.map((brand, i) => ({
								'@type': 'ListItem',
								position: i + 1,
								url: `${SITE_URL}/comprar/${brand.slug}`,
								name: `Comprar ${brand.displayName} no Brasil`,
							})),
						},
						provider: {
							'@type': 'AutoDealer',
							name: 'Attra Veículos',
							url: SITE_URL,
						},
					}),
				}}
			/>
		</main>
	)
}
