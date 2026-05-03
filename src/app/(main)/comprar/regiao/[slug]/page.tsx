import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { REGIOES_SEO, findRegiao } from '@/lib/seo-content'
import { SITE_URL, ADDRESS, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MapPin, Truck, MessageCircle } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return REGIOES_SEO.map(r => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findRegiao(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/regiao/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/regiao/${slug}`,
			type: 'website',
		},
	}
}

export default async function RegiaoPage({ params }: PageProps) {
	const { slug } = await params
	const data = findRegiao(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: data.state },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<MapPin className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">
								{data.state}
							</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							{data.intro}
						</p>
					</div>
				</Container>
			</section>

			{/* Local Context */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-3xl space-y-8">
						<div>
							<div className="flex items-center gap-2 mb-3">
								<MapPin className="w-5 h-5 text-primary" />
								<h2 className="text-xl font-bold text-foreground">
									Attra Veículos em {data.state}
								</h2>
							</div>
							<p className="text-foreground-secondary leading-relaxed">
								{data.localContext}
							</p>
						</div>
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Truck className="w-5 h-5 text-primary" />
								<h2 className="text-xl font-bold text-foreground">
									Entrega em {data.state}
								</h2>
							</div>
							<p className="text-foreground-secondary leading-relaxed">
								{data.deliveryInfo}
							</p>
						</div>
					</div>
				</Container>
			</section>

			{/* Brands Available */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Marcas Premium Disponíveis para {data.state}
					</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
						{data.relatedBrands.map(b => (
							<Link
								key={b.href}
								href={b.href}
								className="group p-4 bg-background border border-border rounded-lg hover:border-primary/40 transition-all text-center"
							>
								<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
									{b.name}
								</h3>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* CTA */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							{data.ctaText}
						</h2>
						<p className="text-foreground-secondary mb-8">
							A Attra Veículos atende todo o estado de {data.state} com curadoria rigorosa, procedência verificada e entrega especializada porta a porta.
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo
								<ArrowRight className="w-4 h-4" />
							</Link>
							<a
								href={getWhatsAppUrl(`Olá! Estou em ${data.state} e gostaria de ver veículos disponíveis.`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Falar no WhatsApp
							</a>
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
						'@type': 'WebPage',
						name: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/comprar/regiao/${slug}`,
						about: {
							'@type': 'Place',
							name: data.state,
							address: { '@type': 'PostalAddress', addressRegion: data.state, addressCountry: 'BR' },
						},
						provider: {
							'@type': 'AutoDealer',
							name: 'Attra Veículos',
							url: SITE_URL,
							address: {
								'@type': 'PostalAddress',
								streetAddress: ADDRESS.street,
								addressLocality: ADDRESS.city,
								addressRegion: ADDRESS.state,
								addressCountry: 'BR',
							},
						},
					}),
				}}
			/>
		</main>
	)
}
