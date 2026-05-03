import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { findSEOBrand, getAllBrandSlugs, SEO_BRANDS } from '@/lib/seo-brands'
import { getVehicles } from '@/lib/autoconf-api'
import { formatPrice, formatMileage } from '@/lib/utils'
import { SITE_URL } from '@/lib/constants'
import { availabilityFromStatus } from '@/lib/vehicle-schema'
import { ArrowRight, Shield, MapPin, Calendar, Gauge } from 'lucide-react'
import { Vehicle } from '@/types'

interface BrandPageProps {
	params: Promise<{ brand: string }>
}

export async function generateStaticParams() {
	return getAllBrandSlugs().map(brand => ({ brand }))
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
	const { brand: slug } = await params
	const brand = findSEOBrand(slug)
	if (!brand) return {}

	return {
		title: brand.metaTitle,
		description: brand.metaDescription,
		keywords: brand.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/${slug}` },
		openGraph: {
			title: brand.metaTitle,
			description: brand.metaDescription,
			url: `${SITE_URL}/comprar/${slug}`,
			type: 'website',
		},
	}
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
	return (
		<Link
			href={`/veiculo/${vehicle.slug}`}
			className="group bg-background-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg"
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
					<p className="text-sm text-foreground-secondary mb-3">{vehicle.version}</p>
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
					{vehicle.fuel_type && (
						<span>{vehicle.fuel_type}</span>
					)}
				</div>
				<p className="text-lg font-bold text-primary">
					{vehicle.price > 0 ? formatPrice(vehicle.price) : 'Sob consulta'}
				</p>
			</div>
		</Link>
	)
}

export default async function BrandPage({ params }: BrandPageProps) {
	const { brand: slug } = await params
	const brand = findSEOBrand(slug)
	if (!brand) notFound()

	const { vehicles: allVehicles } = await getVehicles({
		tipo: 'carros',
		registros_por_pagina: 100,
	})

	// Filter vehicles for this brand (case-insensitive)
	const brandVehicles = allVehicles.filter(v =>
		(v.brand || '').toLowerCase() === brand.name.toLowerCase()
	)

	// Find related brands
	const relatedBrands = SEO_BRANDS.filter(b => b.slug !== slug).slice(0, 4)

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: brand.displayName },
	]

	return (
		<main>
			{/* Hero */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<p className="text-sm text-primary font-medium mb-2 uppercase tracking-wider">
							{brand.country}
						</p>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							Comprar {brand.displayName} no Brasil
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							{brand.description}
						</p>
						{brandVehicles.length > 0 && (
							<p className="mt-4 text-sm text-foreground-secondary">
								<strong className="text-foreground">{brandVehicles.length}</strong>{' '}
								{brandVehicles.length === 1 ? 'veículo disponível' : 'veículos disponíveis'} agora
							</p>
						)}
					</div>
				</Container>
			</section>

			{/* Brand Highlights */}
			<section className="py-8 border-b border-border">
				<Container>
					<div className="flex flex-wrap gap-4">
						{brand.highlights.map(h => (
							<div key={h} className="flex items-center gap-2 text-sm text-foreground-secondary">
								<Shield className="w-4 h-4 text-primary flex-shrink-0" />
								{h}
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Models */}
			{brand.models.length > 0 && (
				<section className="py-12 lg:py-16">
					<Container>
						<h2 className="text-2xl font-bold text-foreground mb-8">
							Modelos {brand.displayName}
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{brand.models.map(model => {
								const modelVehicles = brandVehicles.filter(v =>
									(v.model || '').toLowerCase().includes(model.name.toLowerCase())
								)
								return (
									<Link
										key={model.slug}
										href={`/comprar/${brand.slug}/${model.slug}`}
										className="group bg-background-card border border-border rounded-xl p-6 hover:border-primary/40 transition-all"
									>
										<div className="flex items-start justify-between mb-3">
											<div>
												<h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
													{model.fullName}
												</h3>
												<p className="text-sm text-foreground-secondary">{model.tagline}</p>
											</div>
											<ArrowRight className="w-4 h-4 text-foreground-secondary group-hover:text-primary transition-colors mt-1" />
										</div>
										<p className="text-sm text-foreground-secondary line-clamp-3 mb-4">
											{model.description}
										</p>
										<div className="flex items-center gap-2 text-xs">
											<span className="px-2 py-0.5 bg-background rounded border border-border text-foreground-secondary">
												{model.category === 'supercar' ? 'Supercarro' :
												 model.category === 'sports' ? 'Esportivo' :
												 model.category === 'luxury' ? 'Luxo' :
												 model.category === 'suv' ? 'SUV' :
												 model.category === 'sedan' ? 'Sedan' :
												 model.category === 'gt' ? 'Gran Turismo' :
												 model.category === 'coupe' ? 'Coupé' : model.category}
											</span>
											{modelVehicles.length > 0 && (
												<span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-medium">
													{modelVehicles.length} {modelVehicles.length === 1 ? 'disponível' : 'disponíveis'}
												</span>
											)}
										</div>
									</Link>
								)
							})}
						</div>
					</Container>
				</section>
			)}

			{/* Available Vehicles */}
			{brandVehicles.length > 0 && (
				<section className="py-12 lg:py-16 bg-background-card border-y border-border">
					<Container>
						<div className="flex items-center justify-between mb-8">
							<h2 className="text-2xl font-bold text-foreground">
								{brand.displayName} à Venda
							</h2>
							<Link
								href={`/veiculos?marca=${brand.name.toLowerCase()}`}
								className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
							>
								Ver todos <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{brandVehicles.slice(0, 6).map(vehicle => (
								<VehicleCard key={vehicle.id} vehicle={vehicle} />
							))}
						</div>
					</Container>
				</section>
			)}

			{/* Related Brands */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">
						Outras Marcas Premium
					</h2>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						{relatedBrands.map(rb => (
							<Link
								key={rb.slug}
								href={`/comprar/${rb.slug}`}
								className="group p-4 bg-background-card border border-border rounded-xl hover:border-primary/40 transition-all text-center"
							>
								<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
									{rb.displayName}
								</h3>
								<p className="text-xs text-foreground-secondary mt-1">{rb.tagline}</p>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* CTA */}
			<section className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="text-center max-w-xl mx-auto">
						<h2 className="text-2xl font-bold text-foreground mb-3">
							Procurando um {brand.displayName} específico?
						</h2>
						<p className="text-foreground-secondary mb-6">
							A Attra trabalha com busca personalizada e importação sob encomenda.
							Nosso estoque é atualizado diariamente.
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Link
								href={`/veiculos?marca=${brand.name.toLowerCase()}`}
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								<MapPin className="w-4 h-4" />
								Ver estoque {brand.displayName}
							</Link>
							<Link
								href="/solicitar-veiculo"
								className="inline-flex items-center gap-2 px-6 py-3 bg-background border border-border text-foreground rounded-lg font-medium hover:border-primary/40 transition-colors"
							>
								Solicitar {brand.displayName}
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: `Comprar ${brand.displayName} no Brasil`,
						description: brand.metaDescription,
						url: `${SITE_URL}/comprar/${slug}`,
						mainEntity: {
							'@type': 'ItemList',
							name: `Modelos ${brand.displayName} na Attra Veículos`,
							numberOfItems: brandVehicles.length || brand.models.length,
							itemListElement: brandVehicles.length > 0
								? brandVehicles.map((v, i) => ({
									'@type': 'ListItem',
									position: i + 1,
									item: {
										'@type': 'Vehicle',
										name: `${v.brand} ${v.model} ${v.year_model}`,
										url: `${SITE_URL}/veiculo/${v.slug}`,
										brand: { '@type': 'Brand', name: v.brand },
										modelDate: String(v.year_model),
										...(v.mileage != null && {
											mileageFromOdometer: {
												'@type': 'QuantitativeValue',
												value: v.mileage,
												unitCode: 'KMT',
											},
										}),
										offers: {
											'@type': 'Offer',
											price: v.price,
											priceCurrency: 'BRL',
											availability: availabilityFromStatus(v.status),
											seller: { '@type': 'AutoDealer', name: 'Attra Veículos', url: SITE_URL },
											itemCondition: v.is_new || v.mileage === 0 ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
										},
									},
								}))
								: brand.models.map((m, i) => ({
									'@type': 'ListItem',
									position: i + 1,
									url: `${SITE_URL}/comprar/${slug}/${m.slug}`,
									name: m.fullName,
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
