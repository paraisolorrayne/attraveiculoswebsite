import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CinematicGallery } from '@/components/vehicles/cinematic-gallery'
import { VehicleInfo } from '@/components/vehicles/vehicle-info'
import { VehicleOptions } from '@/components/vehicles/vehicle-options'
import { VehicleContact } from '@/components/vehicles/vehicle-contact'
import { RelatedVehicles } from '@/components/vehicles/related-vehicles'
import { EngineAudioPlayer } from '@/components/vehicles/engine-audio-player'
import { AIVehicleDescription, AIVehicleDescriptionSkeleton } from '@/components/vehicles/ai-vehicle-description'
import { VehicleSectionShowcase } from '@/components/vehicles/vehicle-section-showcase'
import { RelatedVehiclesSkeleton } from '@/components/ui/skeleton'
import { VehicleContextSetter } from '@/components/vehicles/vehicle-context-setter'
import { VehicleSpecsFallback } from '@/components/vehicles/vehicle-specs-fallback'
import { BarraPrecoFicha } from '@/components/vehicles/barra-preco-ficha'
import { FAQSection } from '@/components/home'
import { getVehicleBySlug } from '@/lib/autoconf-api'
import { getCachedVehicleSections, getFallbackVehicleSections, generateAndCacheVehicleSections } from '@/lib/vehicle-sections'
import { getVehicleSoundByVehicleId } from '@/lib/vehicle-sounds-storage'
import { formatPrice, formatMileage } from '@/lib/utils'
import { buildVehiclePageSchemas, trilhaDoVeiculo } from '@/lib/vehicle-schema'
import { nomeDoVeiculo, tituloDoVeiculo } from '@/lib/identidade-do-veiculo'
import { joinNonEmpty } from '@/lib/vehicle-fallbacks'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { mensagemWhatsAppDoVeiculo } from '@/lib/mensagem-whatsapp-veiculo'
import { pageTitle } from '@/lib/seo/page-metadata'
import { formatarDataBR } from '@/lib/seo/frescor'
import { Vehicle } from '@/types'

/**
 * FAQ da ficha, montada só com o que o anúncio informa.
 *
 * Nada de ficha técnica de referência aqui. Até 20/10/2026 a FAQ completava o
 * anúncio com a tabela de `vehicle-datasheet.ts`, que tem uma versão por modelo
 * e casa por palavra-chave: o 911 Carrera GTS Cabriolet 2026 saía com "2.981 cc
 * e 385 cv" (o Carrera base da geração anterior), e o mesmo acontecia em 20
 * das 68 fichas. A FAQ vira FAQPage no JSON-LD, que é o texto que
 * buscadores e assistentes citam — dado errado ali vira resposta errada.
 * Atributo que o anúncio não traz fica de fora; não se infere pelo nome.
 */
function generateVehicleFAQs(vehicle: Vehicle) {
	const name = nomeDoVeiculo(vehicle) || 'veículo'
	const faqs: { question: string; answer: string }[] = []

	faqs.push({
		question: `Qual o preço do ${name} na Attra Veículos?`,
		answer: `O ${name} ${vehicle.year_model} está disponível por ${formatPrice(vehicle.price)} na Attra Veículos. ${vehicle.mileage === 0 ? 'Este veículo é 0 km.' : `Este veículo possui ${formatMileage(vehicle.mileage)} rodados.`} Entre em contato para condições de financiamento e formas de pagamento.`,
	})

	// Sem "garantia integral" nem prazo: o feed não informa a garantia de cada
	// carro (e importado 0 km nem sempre tem garantia de fábrica no Brasil).
	faqs.push({
		question: `O ${name} possui garantia?`,
		answer: `As condições de garantia deste ${name} são informadas pelo consultor da Attra junto com a documentação do veículo. Todos os veículos da Attra passam por curadoria técnica antes de serem disponibilizados para venda.`,
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
			answer: `O ${name} ${vehicle.year_model} possui ${specsParts}.`,
		})
	}

	faqs.push({
		question: `A Attra entrega o ${name} em todo o Brasil?`,
		answer: `Sim, a Attra Veículos realiza entrega nacional com logística especializada para veículos de alto valor. O ${name} pode ser entregue em qualquer cidade do Brasil com transporte em caminhão fechado, seguro completo e rastreamento em tempo real.`,
	})

	if (vehicle.mileage > 0) {
		faqs.push({
			question: `Qual a quilometragem do ${name}?`,
			answer: `Este ${name} ${vehicle.year_model} possui ${formatMileage(vehicle.mileage)} rodados. O veículo passou por inspeção da equipe técnica da Attra antes de ser anunciado.`,
		})
	}

	return faqs
}

interface VehiclePageProps {
	params: Promise<{ slug: string }>
}

/** Build a self-contained one-line summary used as meta description
 * and Open Graph / Twitter Card text via generateMetadata(). */
function buildVehicleSummary(vehicle: Vehicle): string {
	const name = tituloDoVeiculo(vehicle)
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
			// Sem a marca: o `title.template` do layout raiz já a acrescenta.
			title: 'Veículo não encontrado',
			description: 'O veículo solicitado não foi encontrado em nosso estoque.',
			// Explícito, além do 404: se um slug inválido já tiver sido coletado
			// antes desta correção, o noindex acelera a saída do índice.
			robots: { index: false, follow: true },
		}
	}

	const fullName = tituloDoVeiculo(vehicle)
	const summary = buildVehicleSummary(vehicle)
	const url = `${baseUrl}/veiculo/${vehicle.slug}`
	const ogImages = (vehicle.photos ?? []).slice(0, 4).map(u => ({ url: u, alt: fullName }))

	return {
		// Marca + modelo + versão + ano. O `seo_title` do feed é o mesmo texto;
		// `pageTitle` só garante que o sufixo de marca não saia duplicado.
		title: pageTitle(fullName),
		description: summary,
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

	// 404 DE VERDADE, não redirect.
	//
	// Antes isto redirecionava para /veiculos?veiculo_indisponivel=true, com um
	// toast explicando a ausência. A intenção era boa, mas o redirect acontece
	// durante o streaming e a resposta saía com HTTP 200 — logo QUALQUER slug
	// inventado (/veiculo/xxxxx) virava página válida, e o site passava a ter
	// infinitas URLs indexáveis e vazias, gastando o rastreamento que os robôs
	// de busca e de LLM dedicam ao site. O not-found.tsx deste segmento mantém
	// o visitante amparado, agora com o status certo.
	if (!slug) {
		notFound()
	}

	const vehicle = await getVehicleBySlug(slug)

	if (!vehicle) {
		notFound()
	}

	// Canonical redirect: if the URL slug differs from the regenerated canonical
	// slug (e.g. legacy "null-corvette-z06-2023-989248" → "corvette-z06-2023-989248"),
	// 308-redirect so Google consolidates ranking signals on the clean URL.
	if (vehicle.slug && vehicle.slug !== slug) {
		permanentRedirect(`/veiculo/${vehicle.slug}`)
	}

	const vehicleSound = await getVehicleSoundByVehicleId(vehicle.id)

	// Vehicle section showcase (OVERVIEW / EXTERIOR / INTERIOR) — tenta cache
	// no Supabase. Em cache miss, renderiza fallback estático (sem latência)
	// e dispara geração Gemini em background; a próxima visita pega cacheado.
	// Como o app roda em PM2 (VPS Interlivre, não serverless), fire-and-forget
	// completa mesmo após a resposta ser enviada ao cliente.
	const photoCount = vehicle.photos?.length ?? 0
	let vehicleSections = await getCachedVehicleSections(vehicle.id, photoCount)
	if (!vehicleSections) {
		vehicleSections = getFallbackVehicleSections(vehicle)
		void generateAndCacheVehicleSections(vehicle).catch((err) => {
			console.error('[vehicle-sections] background generation failed:', err)
		})
	}

	const breadcrumbItems = trilhaDoVeiculo(vehicle)

	const vehicleFaqs = generateVehicleFAQs(vehicle)

	// Frescor: a ficha é montada lendo o estoque ao vivo, então "conferido em"
	// é a data desta renderização — verdade verificável, não um carimbo fixo.
	// "Publicado em" só aparece quando a fonte informou a data (updated_at =
	// `publicacao` da AutoConf; sem ela o mapeamento cai em now(), que aqui
	// coincidiria com o dia de hoje e leria como anúncio novo sem ser).
	const conferidoEm = new Date().toISOString()
	const conferidoEmBR = formatarDataBR(conferidoEm)
	const publicadoEmBR = formatarDataBR(vehicle.updated_at)
	const mostrarPublicado = publicadoEmBR && publicadoEmBR !== conferidoEmBR

	const schemas = buildVehiclePageSchemas(vehicle, vehicleFaqs, conferidoEm)

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
					vehicleYear={vehicle.year_model}
				/>
			) : (
				<div className="h-[40vh] bg-background-soft flex items-center justify-center">
					<p className="text-foreground-secondary">Sem imagens disponíveis</p>
				</div>
			)}

			{/* Vehicle Details Section */}
			<Container className="py-8 lg:py-12">
				{/* Título e preço - visível no mobile.
				    Este é o ÚNICO h1 do documento (o título da sidebar desktop virou h2).
				    Marca, modelo, versão e ano ficam DENTRO do h1, em spans que herdam o
				    estilo que antes estava nos <p> irmãos: o texto do h1 passa a
				    identificar o veículo inteiro em vez do modelo curto ("911"), que era
				    sinal de entidade ambíguo para buscador e LLM. O Tailwind zera
				    font-size/weight de h1 no preflight, então o render fica idêntico.
				    O Googlebot renderiza em viewport mobile: é este bloco que ele lê.
				    Vem antes da trilha e da data do anúncio: no celular o preço ficava
				    na borda de baixo da primeira tela, atrás das duas. */}
				<div className="lg:hidden mb-8">
					<h1 className="mb-4">
						{vehicle.brand && (
							<span className="block text-primary text-sm font-medium uppercase tracking-wider mb-1">
								{vehicle.brand}
							</span>
						)}
						<span className="block text-3xl font-bold text-foreground mb-2">
							{vehicle.model || vehicle.brand || 'Veículo premium'}
						</span>
						<span className="block text-foreground-secondary">
							{vehicle.version && `${vehicle.version} • `}
							{vehicle.year_manufacture}/{vehicle.year_model}
						</span>
					</h1>
					<p id="preco-ficha" className="text-3xl font-bold text-foreground">
						{formatPrice(vehicle.price)}
					</p>
				</div>

				{/* Breadcrumb - afterHero because it comes after full-screen gallery */}
				<Breadcrumb items={breadcrumbItems} afterHero />

				{/* Frescor — visível para quem lê e para quem cita */}
				<p className="mt-4 text-sm text-foreground-secondary">
					{mostrarPublicado && <>Anúncio publicado em {publicadoEmBR} · </>}
					Preço e disponibilidade conferidos em {conferidoEmBR}
				</p>

				{/* Main content grid */}
				<div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Left column - Main info */}
					<div className="lg:col-span-2 space-y-8">
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

						{/* Ficha técnica só com o que o anúncio traz. A tabela de
						    referência por modelo (vehicle-datasheet.ts) dava ao 911
						    GTS as dimensões, o peso e os destaques do Carrera base;
						    ela continua só nas páginas de modelo, como referência.
						    É a única ficha: os cards de VehicleSpecs e o bloco
						    "Performance" repetiam os mesmos campos. */}
						<VehicleSpecsFallback vehicle={vehicle} />

						{/* Options */}
						{vehicle.options && vehicle.options.length > 0 && (
							<VehicleOptions options={vehicle.options} />
						)}

						{/* Contact - Mobile. O id é onde a barra fixa de preço some. */}
						<div className="lg:hidden" id="contato-ficha">
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

			{/* OVERVIEW / EXTERIOR DESIGN / INTERIOR — 3 seções editoriais
			    com foto + copy Gemini (cacheada no Supabase). Inspirado em
			    lamborghinibeverlyhills.com/temerario. */}
			{vehicle.photos && vehicle.photos.length > 0 && (
				<VehicleSectionShowcase vehicle={vehicle} sections={vehicleSections} />
			)}

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

			<BarraPrecoFicha
				titulo={joinNonEmpty([vehicle.brand, vehicle.model, vehicle.year_model]) || 'Veículo'}
				preco={formatPrice(vehicle.price)}
				whatsappUrl={getWhatsAppUrl(mensagemWhatsAppDoVeiculo(vehicle))}
			/>
		</main>
	)
}
