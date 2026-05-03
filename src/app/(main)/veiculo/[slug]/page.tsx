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
import { VehicleVideosServer, VehicleVideosSkeleton } from '@/components/vehicles/vehicle-videos'
import { VehicleDatasheetSection } from '@/components/vehicles/vehicle-datasheet'
import { FAQSection } from '@/components/home'
import { getVehicleBySlug } from '@/lib/autoconf-api'
import { getVehicleSoundByVehicleId } from '@/lib/vehicle-sounds-storage'
import { findVehicleDatasheet } from '@/lib/vehicle-datasheet'
import { formatPrice, formatMileage } from '@/lib/utils'
import { buildVehiclePageSchemas } from '@/lib/vehicle-schema'
import { joinNonEmpty } from '@/lib/vehicle-fallbacks'
import { SITE_URL } from '@/lib/constants'
import { Vehicle } from '@/types'

/** Generate dynamic FAQ items based on vehicle data for SEO */
function generateVehicleFAQs(vehicle: Vehicle) {
	const name = joinNonEmpty([vehicle.brand, vehicle.model]) || 'veículo'
	const faqs: { question: string; answer: string }[] = []

	faqs.push({
		question: `Qual o preço do ${name} na Attra Veículos?`,
		answer: `O ${name} ${vehicle.year_model} está disponível por ${formatPrice(vehicle.price)} na Attra Veículos. ${vehicle.mileage === 0 ? 'Este veículo é 0 km.' : `Este veículo possui ${formatMileage(vehicle.mileage)} rodados.`} Entre em contato para condições de financiamento e formas de pagamento.`,
	})

	faqs.push({
		question: `O ${name} possui garantia?`,
		answer: `${vehicle.is_new || vehicle.mileage === 0 ? `Sim, o ${name} 0 km possui garantia de fábrica integral.` : `Sim, o ${name} seminovo passou pela inspeção rigorosa da Attra e conta com garantia.`} Todos os veículos da Attra passam por curadoria técnica antes de serem disponibilizados para venda.`,
	})

	const specsParts = joinNonEmpty([
		vehicle.fuel_type ? `motor ${vehicle.fuel_type}` : '',
		vehicle.transmission ? `câmbio ${vehicle.transmission}` : '',
		vehicle.color ? `cor ${vehicle.color}` : '',
		vehicle.horsepower ? `${vehicle.horsepower} cv de potência` : '',
		vehicle.torque ? `${vehicle.torque} Nm de torque` : '',
	], ', ')
	if (specsParts) {
		faqs.push({
			question: `Quais as especificações do ${name} ${vehicle.year_model}?`,
			answer: `O ${name} ${vehicle.year_model} possui ${specsParts}.${vehicle.version ? ` Versão: ${vehicle.version}.` : ''}`,
		})
	}

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
	const name = joinNonEmpty([vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model])
		|| 'Veículo premium'
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

	const fullName = joinNonEmpty([vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model])
		|| 'Veículo premium'
	const summary = buildVehicleSummary(vehicle)
	const url = `${baseUrl}/veiculo/${vehicle.slug}`
	const ogImages = (vehicle.photos ?? []).slice(0, 4).map(u => ({ url: u, alt: fullName }))

	return {
		title: vehicle.seo_title || `${fullName} | Attra Veículos`,
		description: vehicle.seo_description || summary,
		keywords: [
			vehicle.brand,
			joinNonEmpty([vehicle.brand, vehicle.model]),
			fullName,
			vehicle.color,
			vehicle.body_type,
			vehicle.is_new ? 'zero quilômetro' : 'seminovo premium',
			'Attra Veículos',
			'Uberlândia',
		].filter(k => typeof k === 'string' && k.trim().length > 0) as string[],
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

	// Fetch engine sound and technical datasheet in parallel
	// (YouTube videos are fetched inside VehicleVideosServer for Suspense streaming)
	const [vehicleSound, datasheet] = await Promise.all([
		getVehicleSoundByVehicleId(vehicle.id),
		Promise.resolve(findVehicleDatasheet(vehicle.brand, vehicle.model, vehicle.version)),
	])

	// Breadcrumb: skip the brand level entirely when brand is empty (rare —
	// happens when AutoConf returns null marca_nome and we couldn't infer).
	const breadcrumbItems: { label: string; href?: string }[] = [
		{ label: 'Veículos', href: '/veiculos' },
	]
	if (vehicle.brand) {
		breadcrumbItems.push({
			label: vehicle.brand,
			href: `/veiculos?marca=${vehicle.brand.toLowerCase()}`,
		})
	}
	const lastLabel = joinNonEmpty([vehicle.model, vehicle.year_model]) || 'Detalhes'
	breadcrumbItems.push({ label: lastLabel })

	const vehicleFaqs = generateVehicleFAQs(vehicle)

	if (datasheet) {
		const dsName = joinNonEmpty([vehicle.brand, vehicle.model]) || 'veículo'
		vehicleFaqs.push({
			question: `Qual o motor do ${dsName}?`,
			answer: `O ${dsName} é equipado com motor ${datasheet.engine} de ${datasheet.displacement}, que entrega ${datasheet.power} e ${datasheet.torque}. A transmissão é ${datasheet.transmission} com ${datasheet.drivetrain.toLowerCase()}.`,
		})
		const accelValue = datasheet.acceleration.replace(/\s*\(0.100\s*km\/h\)/, '')
		vehicleFaqs.push({
			question: `Qual a aceleração e velocidade máxima do ${dsName}?`,
			answer: `O ${dsName} acelera de 0 a 100 km/h em ${accelValue} e atinge velocidade máxima de ${datasheet.topSpeed}. Peso em ordem de marcha: ${datasheet.weight}.`,
		})
		if (datasheet.brakes) {
			vehicleFaqs.push({
				question: `Quais os freios do ${dsName}?`,
				answer: `O ${dsName} utiliza ${datasheet.brakes}, garantindo frenagem de alto desempenho compatível com a potência do veículo.`,
			})
		}
	}

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
					vehicleName={joinNonEmpty([vehicle.brand, vehicle.model]) || 'Veículo'}
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
							{vehicle.brand && (
								<p className="text-primary text-sm font-medium uppercase tracking-wider mb-1">
									{vehicle.brand}
								</p>
							)}
							<h1 className="text-3xl font-bold text-foreground mb-2">
								{vehicle.model || vehicle.brand || 'Veículo premium'}
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
								vehicleName={joinNonEmpty([vehicle.brand, vehicle.model]) || 'Veículo'}
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

						{/* Full Technical Datasheet (from curated database) */}
						{datasheet && (
							<VehicleDatasheetSection datasheet={datasheet} vehicle={vehicle} />
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

			{/* YouTube Videos from Attra channel */}
			<Container className="pb-8 lg:pb-12">
				<Suspense fallback={<VehicleVideosSkeleton />}>
					<VehicleVideosServer
						brand={vehicle.brand}
						model={vehicle.model}
					/>
				</Suspense>
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
				title={`Perguntas sobre o ${joinNonEmpty([vehicle.brand, vehicle.model]) || 'veículo'}`}
				subtitle={`Dúvidas frequentes sobre este ${joinNonEmpty([vehicle.brand, vehicle.model, vehicle.year_model]) || 'veículo'}`}
				className="mt-0"
			/>
		</main>
	)
}
