import { Metadata } from 'next'
import { redirect, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CinematicGallery } from '@/components/vehicles/cinematic-gallery'
import { VehicleInfo } from '@/components/vehicles/vehicle-info'
import { VehicleSpecs } from '@/components/vehicles/vehicle-specs'
import { VehicleOptions } from '@/components/vehicles/vehicle-options'
import { VehicleContact } from '@/components/vehicles/vehicle-contact'
import { RelatedVehicles } from '@/components/vehicles/related-vehicles'
import { EngineAudioPlayer } from '@/components/vehicles/engine-audio-player'
import { AIVehicleDescription, AIVehicleDescriptionSkeleton } from '@/components/vehicles/ai-vehicle-description'
import { RelatedVehiclesSkeleton } from '@/components/ui/skeleton'
import { VehicleContextSetter } from '@/components/vehicles/vehicle-context-setter'
import { FAQSection } from '@/components/home'
import { getVehicleBySlug } from '@/lib/autoconf-api'
import { getVehicleSoundByVehicleId } from '@/lib/vehicle-sounds-storage'
import { formatPrice, formatMileage } from '@/lib/utils'
import { buildVehiclePageSchemas } from '@/lib/vehicle-schema'
import { SITE_URL } from '@/lib/constants'
import { Vehicle } from '@/types'

/** Generate dynamic FAQ items based on vehicle data for SEO */
function generateVehicleFAQs(vehicle: Vehicle) {
	const name = `${vehicle.brand} ${vehicle.model}`
	const faqs: { question: string; answer: string }[] = []

	faqs.push({
		question: `Qual o preço do ${name} na Attra Veículos?`,
		answer: `O ${name} ${vehicle.year_model} está disponível por ${formatPrice(vehicle.price)} na Attra Veículos. ${vehicle.mileage === 0 ? 'Este veículo é 0 km.' : `Este veículo possui ${formatMileage(vehicle.mileage)} rodados.`} Entre em contato para condições de financiamento e formas de pagamento.`,
	})

	faqs.push({
		question: `O ${name} possui garantia?`,
		answer: `${vehicle.is_new || vehicle.mileage === 0 ? `Sim, o ${name} 0 km possui garantia de fábrica integral.` : `Sim, o ${name} seminovo passou pela inspeção rigorosa da Attra e conta com garantia.`} Todos os veículos da Attra passam por curadoria técnica antes de serem disponibilizados para venda.`,
	})

	faqs.push({
		question: `Quais as especificações do ${name} ${vehicle.year_model}?`,
		answer: `O ${name} ${vehicle.year_model} possui motor ${vehicle.fuel_type}, câmbio ${vehicle.transmission}, cor ${vehicle.color}${vehicle.horsepower ? `, ${vehicle.horsepower} cv de potência` : ''}${vehicle.torque ? ` e ${vehicle.torque} Nm de torque` : ''}. ${vehicle.version ? `Versão: ${vehicle.version}.` : ''}`,
	})

	faqs.push({
		question: `A Attra entrega o ${name} em todo o Brasil?`,
		answer: `Sim, a Attra Veículos realiza entrega nacional com logística especializada para veículos de alto valor. O ${name} pode ser entregue em qualquer cidade do Brasil com transporte em caminhão fechado, seguro completo e rastreamento em tempo real.`,
	})

	if (vehicle.mileage > 0) {
		faqs.push({
			question: `Qual a quilometragem do ${name}?`,
			answer: `Este ${name} ${vehicle.year_model} possui ${formatMileage(vehicle.mileage)} rodados. ${vehicle.mileage <= 10000 ? 'Trata-se de um veículo com baixíssima quilometragem, em excelente estado de conservação.' : 'O veículo passou por inspeção completa da equipe técnica da Attra.'}`,
		})
	}

	return faqs
}

interface VehiclePageProps {
	params: Promise<{ slug: string }>
}

/** Build a self-contained one-line summary used both as meta description and
 * as the LLMO lede (first paragraph). LLMs extract this verbatim. */
function buildVehicleSummary(vehicle: Vehicle): string {
	const name = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''} ${vehicle.year_model}`
	const condition = vehicle.is_new || vehicle.mileage === 0
		? '0 km'
		: `${vehicle.mileage.toLocaleString('pt-BR')} km`
	const colorPart = vehicle.color ? ` na cor ${vehicle.color}` : ''
	const enginePart = vehicle.engine
		? ` com motor ${vehicle.engine}`
		: vehicle.horsepower
			? ` com ${vehicle.horsepower} cv de potência`
			: ''
	return `${name}${colorPart}${enginePart}, ${condition}, disponível na Attra Veículos em Uberlândia/MG. Curadoria, procedência verificada e entrega nacional.`
}

export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
	const { slug } = await params
	const vehicle = await getVehicleBySlug(slug)
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

	if (!vehicle) {
		return {
			title: 'Veículo não encontrado | Attra Veículos',
			description: 'O veículo solicitado não foi encontrado em nosso estoque.',
		}
	}

	const fullName = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ' ' + vehicle.version : ''} ${vehicle.year_model}`
	const summary = buildVehicleSummary(vehicle)
	const url = `${baseUrl}/veiculo/${vehicle.slug}`
	const ogImages = (vehicle.photos ?? []).slice(0, 4).map(u => ({ url: u, alt: fullName }))

	return {
		title: vehicle.seo_title || `${fullName} | Attra Veículos`,
		description: vehicle.seo_description || summary,
		keywords: [
			vehicle.brand,
			`${vehicle.brand} ${vehicle.model}`,
			fullName,
			vehicle.color,
			vehicle.body_type,
			vehicle.is_new ? 'zero quilômetro' : 'seminovo premium',
			'Attra Veículos',
			'Uberlândia',
		].filter(Boolean) as string[],
		alternates: { canonical: url },
		openGraph: {
			type: 'website',
			locale: 'pt_BR',
			url,
			siteName: 'Attra Veículos',
			title: fullName,
			description: vehicle.description || summary,
			images: ogImages,
		},
		twitter: {
			card: 'summary_large_image',
			title: fullName,
			description: summary,
			images: ogImages.map(img => img.url),
		},
		other: {
			'product:price:amount': String(vehicle.price),
			'product:price:currency': 'BRL',
			'product:availability': vehicle.status === 'available' ? 'in stock' : 'out of stock',
			'product:condition': vehicle.is_new || vehicle.mileage === 0 ? 'new' : 'used',
			'product:brand': vehicle.brand,
		},
	}
}

export default async function VehiclePage({ params }: VehiclePageProps) {
	const { slug } = await params

	if (!slug) {
		redirect('/veiculos?veiculo_indisponivel=true')
	}

	const vehicle = await getVehicleBySlug(slug)

	if (!vehicle) {
		redirect('/veiculos?veiculo_indisponivel=true')
	}

	// Canonical redirect: if the URL slug differs from the regenerated canonical
	// slug (e.g. legacy "null-corvette-z06-2023-989248" → "corvette-z06-2023-989248"),
	// 308-redirect so Google consolidates ranking signals on the clean URL.
	if (vehicle.slug && vehicle.slug !== slug) {
		permanentRedirect(`/veiculo/${vehicle.slug}`)
	}

	// Fetch engine sound from admin panel database (if configured)
	const vehicleSound = await getVehicleSoundByVehicleId(vehicle.id)

	const breadcrumbItems = [
		{ label: 'Veículos', href: '/veiculos' },
		{ label: vehicle.brand, href: `/veiculos?marca=${vehicle.brand.toLowerCase()}` },
		{ label: `${vehicle.model} ${vehicle.year_model}` },
	]

	const vehicleFaqs = generateVehicleFAQs(vehicle)
	const schemas = buildVehiclePageSchemas(vehicle, vehicleFaqs)
	const summary = buildVehicleSummary(vehicle)

	return (
		<main className="min-h-screen bg-background">
			{schemas.map((schema, i) => (
				<script
					key={i}
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
				/>
			))}

			{/* Set vehicle data in global context for WhatsApp button and analytics tracking */}
			<VehicleContextSetter
				vehicleId={vehicle.id}
				vehicleBrand={vehicle.brand}
				vehicleModel={vehicle.model}
				vehicleYear={vehicle.year_model}
				vehiclePrice={vehicle.price}
				vehicleSlug={slug}
				vehicleCategory={vehicle.category}
			/>

			{/* Hero Gallery - 60-70% viewport */}
			{vehicle.photos && vehicle.photos.length > 0 ? (
				<CinematicGallery
					photos={vehicle.photos}
					vehicleName={`${vehicle.brand} ${vehicle.model}`}
				/>
			) : (
				<div className="h-[40vh] bg-background-soft flex items-center justify-center">
					<p className="text-foreground-secondary">Sem imagens disponíveis</p>
				</div>
			)}

			{/* Vehicle Details Section */}
			<Container className="py-8 lg:py-12">
				{/* Breadcrumb - afterHero because it comes after full-screen gallery */}
				<Breadcrumb items={breadcrumbItems} afterHero />

				{/* Main content grid */}
				<div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left column - Main info */}
					<div className="lg:col-span-2 space-y-8">
						{/* Title and price - mobile visible */}
						<div className="lg:hidden">
							<p className="text-primary text-sm font-medium uppercase tracking-wider mb-1">
								{vehicle.brand}
							</p>
							<h1 className="text-3xl font-bold text-foreground mb-2">
								{vehicle.model}
							</h1>
							<p className="text-foreground-secondary mb-4">
								{vehicle.version && `${vehicle.version} • `}
								{vehicle.year_manufacture}/{vehicle.year_model}
							</p>
							<p className="text-3xl font-bold text-foreground">
								{formatPrice(vehicle.price)}
							</p>
						</div>

						{/* LLMO summary — self-contained sentence that LLMs and snippets extract verbatim */}
						<p className="text-base lg:text-lg text-foreground-secondary leading-relaxed border-l-4 border-primary/30 pl-4">
							{summary}
						</p>

						{/* Engine Audio Player - shows if vehicle has sound configured in admin */}
						{vehicleSound && (
							<EngineAudioPlayer
								audioUrl={vehicleSound.sound_file_url}
								vehicleName={`${vehicle.brand} ${vehicle.model}`}
								isElectric={vehicleSound.is_electric}
							/>
						)}

						{/* AI-Generated Description */}
						<Suspense fallback={<AIVehicleDescriptionSkeleton />}>
							<AIVehicleDescription vehicle={vehicle} />
						</Suspense>

						{/* Specs */}
						<VehicleSpecs vehicle={vehicle} />

						{/* Options */}
						{vehicle.options && vehicle.options.length > 0 && (
							<VehicleOptions options={vehicle.options} />
						)}

						{/* Performance specs (if available) */}
						{(vehicle.horsepower || vehicle.torque || vehicle.acceleration || vehicle.top_speed) && (
							<div className="bg-background-card border border-border rounded-xl p-6">
								<h2 className="text-xl font-semibold text-foreground mb-6">
									Performance
								</h2>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
									{vehicle.horsepower && (
										<div className="text-center p-4 bg-background rounded-xl">
											<p className="text-3xl font-bold text-primary">{vehicle.horsepower}</p>
											<p className="text-sm text-foreground-secondary">cv</p>
										</div>
									)}
									{vehicle.torque && (
										<div className="text-center p-4 bg-background rounded-xl">
											<p className="text-3xl font-bold text-primary">{vehicle.torque}</p>
											<p className="text-sm text-foreground-secondary">Nm</p>
										</div>
									)}
									{vehicle.acceleration && (
										<div className="text-center p-4 bg-background rounded-xl">
											<p className="text-3xl font-bold text-primary">{vehicle.acceleration}</p>
											<p className="text-sm text-foreground-secondary">0-100 km/h</p>
										</div>
									)}
									{vehicle.top_speed && (
										<div className="text-center p-4 bg-background rounded-xl">
											<p className="text-3xl font-bold text-primary">{vehicle.top_speed}</p>
											<p className="text-sm text-foreground-secondary">km/h máx</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Contact - Mobile */}
						<div className="lg:hidden">
							<VehicleContact vehicle={vehicle} />
						</div>
					</div>

					{/* Right column - Sidebar */}
					<div className="hidden lg:block">
						<div className="sticky top-24 space-y-6">
							<VehicleInfo vehicle={vehicle} />
							<VehicleContact vehicle={vehicle} compact />
						</div>
					</div>
				</div>
			</Container>

			{/* Related Vehicles */}
			<Suspense fallback={<RelatedVehiclesSkeleton />}>
				<RelatedVehicles
					currentVehicleId={vehicle.id}
					brand={vehicle.brand}
					category={vehicle.category}
				/>
			</Suspense>

			{/* Vehicle FAQ — visible accordion. JSON-LD FAQ schema is rendered above. */}
			<FAQSection
				faqs={vehicleFaqs}
				title={`Perguntas sobre o ${vehicle.brand} ${vehicle.model}`}
				subtitle={`Dúvidas frequentes sobre este ${vehicle.brand} ${vehicle.model} ${vehicle.year_model}`}
				className="mt-0"
			/>
		</main>
	)
}
