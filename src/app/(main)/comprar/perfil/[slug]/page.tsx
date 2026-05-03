import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PERFIS_COMPRADOR, findPerfil } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, User, MessageCircle } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return PERFIS_COMPRADOR.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findPerfil(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/perfil/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/perfil/${slug}`,
			type: 'website',
		},
	}
}

export default async function PerfilPage({ params }: PageProps) {
	const { slug } = await params
	const data = findPerfil(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Perfil' },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<User className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Perfil do Comprador</span>
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

			{/* Profile Description */}
			<section className="py-8 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<p className="text-foreground-secondary leading-relaxed">
							{data.profileDescription}
						</p>
					</div>
				</Container>
			</section>

			{/* Recommended Categories */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">
						Veículos Recomendados
					</h2>
					<div className="space-y-10">
						{data.recommendedCategories.map(cat => (
							<div key={cat.label}>
								<h3 className="text-xl font-bold text-foreground mb-2">{cat.label}</h3>
								<p className="text-sm text-foreground-secondary mb-4">{cat.description}</p>
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
									{cat.models.map(m => (
										<Link
											key={m.href}
											href={m.href}
											className="group p-4 bg-background-card border border-border rounded-lg hover:border-primary/40 transition-all"
										>
											<h4 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
												{m.name}
											</h4>
											<span className="text-xs text-foreground-secondary flex items-center gap-1 mt-1">
												Ver opções <ArrowRight className="w-3 h-3" />
											</span>
										</Link>
									))}
								</div>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* CTA */}
			<section className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Encontre o veículo ideal para seu perfil
						</h2>
						<p className="text-foreground-secondary mb-8">
							{data.ctaText}
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
								href={getWhatsAppUrl('Olá! Gostaria de ajuda para encontrar o veículo ideal.')}
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
						url: `${SITE_URL}/comprar/perfil/${slug}`,
						provider: { '@type': 'AutoDealer', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}
