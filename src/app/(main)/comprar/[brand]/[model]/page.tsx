import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { findSEOModel, getAllModelSlugs } from '@/lib/seo-brands'
import { getVehicles } from '@/lib/autoconf-api'
import { findVehicleDatasheet } from '@/lib/vehicle-datasheet'
import { formatPrice, formatMileage } from '@/lib/utils'
import { SITE_URL } from '@/lib/constants'
import { ArrowRight, Calendar, Gauge, MapPin, Zap, RotateCw, Shield, Check } from 'lucide-react'
import { Vehicle } from '@/types'

interface ModelPageProps {
	params: Promise<{ brand: string; model: string }>
}

export async function generateStaticParams() {
	return getAllModelSlugs()
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
	const { brand: brandSlug, model: modelSlug } = await params
	const result = findSEOModel(brandSlug, modelSlug)
	if (!result) return {}

	const { model } = result
	return {
		title: model.metaTitle,
		description: model.metaDescription,
		keywords: model.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/${brandSlug}/${modelSlug}` },
		openGraph: {
			title: model.metaTitle,
			description: model.metaDescription,
			url: `${SITE_URL}/comprar/${brandSlug}/${modelSlug}`,
			type: 'website',
		},
	}
}

export default async function ModelPage({ params }: ModelPageProps) {
	const { brand: brandSlug, model: modelSlug } = await params
	const result = findSEOModel(brandSlug, modelSlug)
	if (!result) notFound()

	const { brand, model } = result

	const { vehicles: allVehicles } = await getVehicles({
		tipo: 'carros',
		registros_por_pagina: 100,
	})

	// Filter vehicles for this brand + model
	const modelVehicles = allVehicles.filter(v => {
		const vBrand = (v.brand || '').toLowerCase()
		const vModel = (v.model || '').toLowerCase()
		return vBrand === brand.name.toLowerCase() &&
			vModel.includes(model.name.toLowerCase())
	})

	// Get technical datasheet if available
	const datasheet = findVehicleDatasheet(brand.name, model.name, '')

	const categoryLabel = model.category === 'supercar' ? 'Supercarro' :
		model.category === 'sports' ? 'Esportivo' :
		model.category === 'luxury' ? 'Luxo' :
		model.category === 'suv' ? 'SUV Premium' :
		model.category === 'sedan' ? 'Sedan Esportivo' :
		model.category === 'gt' ? 'Gran Turismo' :
		model.category === 'coupe' ? 'Coupé' : model.category

	// Other models from same brand
	const otherModels = brand.models.filter(m => m.slug !== modelSlug)

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: brand.displayName, href: `/comprar/${brandSlug}` },
		{ label: model.name },
	]

	return (
		<main>
			{/* Hero */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-3 mb-3">
							<span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
								{categoryLabel}
							</span>
							<span className="text-sm text-foreground-secondary">{brand.country}</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{model.fullName} à Venda no Brasil
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							{model.description}
						</p>
						{modelVehicles.length > 0 && (
							<p className="mt-4 text-sm text-foreground-secondary">
								<strong className="text-foreground">{modelVehicles.length}</strong>{' '}
								{modelVehicles.length === 1 ? 'unidade disponível' : 'unidades disponíveis'} agora na Attra
							</p>
						)}
					</div>
				</Container>
			</section>

			{/* Model Highlights */}
			<section className="py-8 border-b border-border">
				<Container>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{model.highlights.map(h => (
							<div key={h} className="flex items-start gap-2 text-sm text-foreground-secondary">
								<Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
								{h}
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Technical Specs (from datasheet) */}
			{datasheet && (
				<section className="py-12 lg:py-16">
					<Container>
						<h2 className="text-2xl font-bold text-foreground mb-8">
							Ficha Técnica — {model.fullName}
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							{[
								{ icon: Zap, label: 'Motor', value: datasheet.engine },
								{ icon: Zap, label: 'Potência', value: datasheet.power },
								{ icon: RotateCw, label: 'Torque', value: datasheet.torque },
								{ icon: Gauge, label: '0–100 km/h', value: datasheet.acceleration.replace(/\s*\(0\s*[\u2013-]\s*100\s*km\/h\)/, '') },
								{ icon: ArrowRight, label: 'Velocidade máxima', value: datasheet.topSpeed },
								{ icon: Shield, label: 'Transmissão', value: datasheet.transmission },
								{ icon: Shield, label: 'Tração', value: datasheet.drivetrain },
								{ icon: Shield, label: 'Peso', value: datasheet.weight },
							].filter(s => s.value).map(spec => (
								<div key={spec.label} className="bg-background-card border border-border rounded-lg p-4">
									<div className="flex items-center gap-2 mb-1">
										<spec.icon className="w-4 h-4 text-primary" />
										<span className="text-xs text-foreground-secondary uppercase tracking-wider">{spec.label}</span>
									</div>
									<p className="font-semibold text-foreground">{spec.value}</p>
								</div>
							))}
						</div>
					</Container>
				</section>
			)}

			{/* Available Vehicles */}
			{modelVehicles.length > 0 ? (
				<section className="py-12 lg:py-16 bg-background-card border-y border-border">
					<Container>
						<h2 className="text-2xl font-bold text-foreground mb-8">
							{model.fullName} Disponíveis
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{modelVehicles.map(vehicle => (
								<Link
									key={vehicle.id}
									href={`/veiculo/${vehicle.slug}`}
									className="group bg-background border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg"
								>
									{vehicle.photos?.[0] && (
										<div className="relative aspect-[16/10] bg-background">
											<Image
												src={vehicle.photos[0]}
												alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year_model}`}
												fill
												className="object-cover group-hover:scale-105 transition-transform duration-500"
												sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
											/>
											{vehicle.is_new && (
												<span className="absolute top-3 left-3 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
													0 km
												</span>
											)}
										</div>
									)}
									<div className="p-5">
										<h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
											{vehicle.brand} {vehicle.model}
										</h3>
										{vehicle.version && (
											<p className="text-sm text-foreground-secondary mb-2">{vehicle.version}</p>
										)}
										<div className="flex flex-wrap gap-2 mb-3 text-xs text-foreground-secondary">
											{vehicle.year_model && (
												<span className="flex items-center gap-1">
													<Calendar className="w-3 h-3" />{vehicle.year_model}
												</span>
											)}
											{vehicle.mileage != null && (
												<span className="flex items-center gap-1">
													<Gauge className="w-3 h-3" />{formatMileage(vehicle.mileage)}
												</span>
											)}
										</div>
										<p className="text-lg font-bold text-primary">
											{vehicle.price > 0 ? formatPrice(vehicle.price) : 'Sob consulta'}
										</p>
									</div>
								</Link>
							))}
						</div>
					</Container>
				</section>
			) : (
				<section className="py-12 lg:py-16 bg-background-card border-y border-border">
					<Container>
						<div className="text-center max-w-lg mx-auto py-8">
							<h2 className="text-xl font-bold text-foreground mb-3">
								Nenhum {model.fullName} disponível no momento
							</h2>
							<p className="text-foreground-secondary mb-6">
								Nosso estoque é atualizado diariamente. Cadastre-se para ser notificado quando
								um {model.fullName} estiver disponível ou solicite uma busca personalizada.
							</p>
							<div className="flex flex-wrap justify-center gap-4">
								<Link
									href="/solicitar-veiculo"
									className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
								>
									Solicitar {model.name}
								</Link>
								<Link
									href={`/comprar/${brandSlug}`}
									className="inline-flex items-center gap-2 px-6 py-3 bg-background border border-border text-foreground rounded-lg font-medium hover:border-primary/40 transition-colors"
								>
									Ver outros {brand.displayName}
								</Link>
							</div>
						</div>
					</Container>
				</section>
			)}

			{/* FAQ */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">
						Perguntas sobre o {model.fullName}
					</h2>
					<div className="max-w-3xl space-y-6">
						<div className="border border-border rounded-lg p-5">
							<h3 className="font-semibold text-foreground mb-2">
								Qual o preço do {model.fullName} no Brasil?
							</h3>
							<p className="text-sm text-foreground-secondary">
								{modelVehicles.length > 0
									? `Temos ${modelVehicles.length} unidade(s) de ${model.fullName} disponíveis. Os preços variam de acordo com ano, quilometragem e versão. Entre em contato para valores atualizados e condições de financiamento.`
									: `O preço do ${model.fullName} varia conforme ano, versão e quilometragem. A Attra trabalha com busca personalizada — solicite o modelo desejado e enviaremos opções disponíveis.`
								}
							</p>
						</div>
						<div className="border border-border rounded-lg p-5">
							<h3 className="font-semibold text-foreground mb-2">
								A Attra entrega {model.fullName} em todo o Brasil?
							</h3>
							<p className="text-sm text-foreground-secondary">
								Sim. A Attra realiza entrega nacional com logística especializada para veículos de alto valor.
								O transporte é feito em caminhão fechado, com seguro completo e rastreamento em tempo real.
							</p>
						</div>
						<div className="border border-border rounded-lg p-5">
							<h3 className="font-semibold text-foreground mb-2">
								Os veículos da Attra possuem garantia?
							</h3>
							<p className="text-sm text-foreground-secondary">
								Todos os veículos passam por inspeção rigorosa antes de serem disponibilizados.
								Veículos 0 km possuem garantia de fábrica integral. Seminovos contam com garantia Attra
								e documentação verificada.
							</p>
						</div>
					</div>
				</Container>
			</section>

			{/* Other Models */}
			{otherModels.length > 0 && (
				<section className="py-12 lg:py-16 bg-background-card border-t border-border">
					<Container>
						<h2 className="text-xl font-bold text-foreground mb-6">
							Outros modelos {brand.displayName}
						</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
							{otherModels.map(m => (
								<Link
									key={m.slug}
									href={`/comprar/${brandSlug}/${m.slug}`}
									className="group p-4 border border-border rounded-lg hover:border-primary/40 transition-all"
								>
									<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
										{m.fullName}
									</h3>
									<p className="text-xs text-foreground-secondary mt-1">{m.tagline}</p>
								</Link>
							))}
						</div>
					</Container>
				</section>
			)}

			{/* JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebPage',
						name: `${model.fullName} à Venda no Brasil`,
						description: model.metaDescription,
						url: `${SITE_URL}/comprar/${brandSlug}/${modelSlug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, item: { '@id': `${SITE_URL}/comprar`, name: 'Comprar' } },
								{ '@type': 'ListItem', position: 2, item: { '@id': `${SITE_URL}/comprar/${brandSlug}`, name: brand.displayName } },
								{ '@type': 'ListItem', position: 3, item: { '@id': `${SITE_URL}/comprar/${brandSlug}/${modelSlug}`, name: model.name } },
							],
						},
						mainEntity: modelVehicles.length > 0 ? {
							'@type': 'ItemList',
							name: `${model.fullName} à venda na Attra`,
							numberOfItems: modelVehicles.length,
							itemListElement: modelVehicles.map((v, i) => ({
								'@type': 'ListItem',
								position: i + 1,
								item: {
									'@type': 'Vehicle',
									name: `${v.brand} ${v.model} ${v.year_model}`,
									url: `${SITE_URL}/veiculo/${v.slug}`,
									brand: { '@type': 'Brand', name: v.brand },
									modelDate: String(v.year_model),
									offers: {
										'@type': 'Offer',
										price: v.price,
										priceCurrency: 'BRL',
										availability: 'https://schema.org/InStock',
									},
								},
							})),
						} : undefined,
						about: {
							'@type': 'Vehicle',
							name: model.fullName,
							brand: { '@type': 'Brand', name: brand.name },
							...(datasheet && {
								vehicleEngine: {
									'@type': 'EngineSpecification',
									name: datasheet.engine,
								},
								driveWheelConfiguration: datasheet.drivetrain,
								vehicleTransmission: datasheet.transmission,
							}),
						},
						provider: {
							'@type': 'AutoDealer',
							name: 'Attra Veículos',
							url: SITE_URL,
						},
						// FAQ Schema
						...({
							'@graph': [{
								'@type': 'FAQPage',
								mainEntity: [
									{
										'@type': 'Question',
										name: `Qual o preço do ${model.fullName} no Brasil?`,
										acceptedAnswer: {
											'@type': 'Answer',
											text: `O preço do ${model.fullName} varia conforme ano, versão e quilometragem. A Attra Veículos oferece condições de financiamento e aceita veículos na troca.`,
										},
									},
									{
										'@type': 'Question',
										name: `A Attra entrega ${model.fullName} em todo o Brasil?`,
										acceptedAnswer: {
											'@type': 'Answer',
											text: 'Sim. A Attra realiza entrega nacional com logística especializada, transporte em caminhão fechado, seguro completo e rastreamento em tempo real.',
										},
									},
								],
							}],
						}),
					}),
				}}
			/>
		</main>
	)
}
